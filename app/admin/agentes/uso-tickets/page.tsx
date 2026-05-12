"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Receipt,
  Sparkles,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OrgUsageResult = {
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  output_reasoning_tokens: number;
  num_model_requests: number;
  model: string | null;
};

type OrgCostResult = {
  amount: { value: number; currency: string };
  line_item: string | null;
};

type Bucket<T> = {
  start_time: number;
  end_time: number;
  results: T[];
};

type PageResponse<T> = {
  data: Bucket<T>[];
  has_more: boolean;
};

type ApiResponse = {
  usage: PageResponse<OrgUsageResult> | null;
  costs: PageResponse<OrgCostResult> | null;
  days: number;
  startTime: number;
  endTime: number;
  error?: boolean;
  noAccess?: boolean;
  message?: string;
  status?: number;
};

// ─── Tipos de agregación ──────────────────────────────────────────────────────

type ModelStats = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requests: number;
};

type DayStats = {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  requests: number;
  costUsd: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  default: { input: 2.5, output: 10 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "gpt-5": { input: 10, output: 40 },
  "gpt-4.5": { input: 75, output: 150 },
  o3: { input: 10, output: 40 },
  "o4-mini": { input: 1.1, output: 4.4 },
};

function priceFor(model: string | null | undefined) {
  const key = String(model ?? "").toLowerCase();
  for (const k of Object.keys(PRICE_PER_MILLION)) {
    if (k !== "default" && key.includes(k)) return PRICE_PER_MILLION[k];
  }
  return PRICE_PER_MILLION.default;
}

function calcCost(model: string | null, inputTok: number, outputTok: number) {
  const p = priceFor(model);
  return (inputTok / 1_000_000) * p.input + (outputTok / 1_000_000) * p.output;
}

function formatUSD(n: number) {
  if (!isFinite(n)) return "$0.00";
  if (n > 0 && n < 0.001) return "<$0.001";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 1 ? 4 : 2,
  }).format(n);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
}

function tsToDateKey(ts: number) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function dateKeyLabel(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  color = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: "slate" | "rose" | "sky" | "emerald" | "teal";
}) {
  const bg: Record<string, string> = {
    slate: "bg-slate-50",
    rose: "bg-rose-50",
    sky: "bg-sky-50",
    emerald: "bg-emerald-50",
    teal: "bg-teal-50",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg[color]}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="text-xl font-semibold text-slate-800">{value}</div>
          {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Selector de rango ────────────────────────────────────────────────────────

const RANGES = [
  { label: "7 días", value: 7 },
  { label: "30 días", value: 30 },
  { label: "90 días", value: 90 },
];

// ─── Contenido principal ──────────────────────────────────────────────────────

function UsoTicketsContent() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/agentes/tickets-cost?days=${d}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar el uso");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  // ── Agregar por modelo ───────────────────────────────────────────────────────
  const modelStats = useMemo<ModelStats[]>(() => {
    if (!data?.usage?.data) return [];
    const map = new Map<string, ModelStats>();
    for (const bucket of data.usage.data) {
      for (const r of bucket.results) {
        const key = r.model ?? "desconocido";
        const ex = map.get(key);
        if (ex) {
          ex.inputTokens += r.input_tokens ?? 0;
          ex.outputTokens += r.output_tokens ?? 0;
          ex.cachedTokens += r.input_cached_tokens ?? 0;
          ex.requests += r.num_model_requests ?? 0;
        } else {
          map.set(key, {
            model: key,
            inputTokens: r.input_tokens ?? 0,
            outputTokens: r.output_tokens ?? 0,
            cachedTokens: r.input_cached_tokens ?? 0,
            requests: r.num_model_requests ?? 0,
          });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens),
    );
  }, [data]);

  // ── Agregar por día ──────────────────────────────────────────────────────────
  const dayStats = useMemo<DayStats[]>(() => {
    if (!data?.usage?.data) return [];
    const map = new Map<string, DayStats>();
    for (const bucket of data.usage.data) {
      const dateKey = tsToDateKey(bucket.start_time);
      let dayEntry = map.get(dateKey);
      if (!dayEntry) {
        dayEntry = {
          date: dateKey,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0,
          costUsd: 0,
        };
        map.set(dateKey, dayEntry);
      }
      for (const r of bucket.results) {
        dayEntry.inputTokens += r.input_tokens ?? 0;
        dayEntry.outputTokens += r.output_tokens ?? 0;
        dayEntry.requests += r.num_model_requests ?? 0;
        dayEntry.costUsd += calcCost(
          r.model,
          r.input_tokens ?? 0,
          r.output_tokens ?? 0,
        );
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data]);

  // ── Totales desde la API de costos (más preciso) o estimado desde tokens ───
  const totalCostFromApi = useMemo(() => {
    if (!data?.costs?.data) return null;
    let sum = 0;
    for (const bucket of data.costs.data) {
      for (const r of bucket.results) {
        sum += r.amount?.value ?? 0;
      }
    }
    return sum;
  }, [data]);

  const totals = useMemo(() => {
    const inputTokens = modelStats.reduce((s, m) => s + m.inputTokens, 0);
    const outputTokens = modelStats.reduce((s, m) => s + m.outputTokens, 0);
    const requests = modelStats.reduce((s, m) => s + m.requests, 0);
    const estimatedCost = modelStats.reduce(
      (s, m) => s + calcCost(m.model, m.inputTokens, m.outputTokens),
      0,
    );
    return {
      inputTokens,
      outputTokens,
      requests,
      cost: totalCostFromApi ?? estimatedCost,
      costIsEstimated: totalCostFromApi === null,
    };
  }, [modelStats, totalCostFromApi]);

  // ── Casos de error / sin acceso ──────────────────────────────────────────────
  const showNoAccess = data?.noAccess === true;
  const showApiError = data?.error === true && !showNoAccess;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/agentes"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Agentes
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-teal-500" />
            Uso Agente Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consumo y costos de la clave{" "}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              OPENAI_API_KEY_TICKETS
            </code>{" "}
            vía OpenAI Organization API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de rango */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  days === r.value
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(days)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Error de red */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Sin acceso a la org API → mostrar enlace al dashboard */}
      {showNoAccess && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-800">
              La clave no tiene permisos para consultar el uso de la
              organización
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Las claves de tipo{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                sk-proj-
              </code>{" "}
              (project key) solo pueden hacer llamadas a la API, no consultar
              métricas de uso. Para ver el consumo real, necesitas iniciar
              sesión en el dashboard de OpenAI con la cuenta propietaria de la
              organización.
            </p>
            <p className="text-xs text-amber-700">
              Mensaje de la API: <em>{data?.message}</em>
            </p>
            <a
              href="https://platform.openai.com/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 mt-1"
            >
              Abrir dashboard de uso en OpenAI
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Error genérico de la API */}
      {showApiError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Error al consultar la OpenAI API: {data?.message}
        </div>
      )}

      {/* Loading inicial */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      )}

      {/* Contenido cuando hay datos */}
      {!showNoAccess && !showApiError && data && !data.error && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={`Costo total${totals.costIsEstimated ? " (est.)" : ""}`}
              value={formatUSD(totals.cost)}
              sub={
                totals.costIsEstimated
                  ? "Estimado por tokens"
                  : "Dato de OpenAI"
              }
              icon={<Receipt className="h-5 w-5 text-teal-500" />}
              color="teal"
            />
            <KpiCard
              label="Tokens entrada"
              value={formatNumber(totals.inputTokens)}
              icon={<BarChart3 className="h-5 w-5 text-sky-500" />}
              color="sky"
            />
            <KpiCard
              label="Tokens salida"
              value={formatNumber(totals.outputTokens)}
              icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
              color="emerald"
            />
            <KpiCard
              label="Peticiones"
              value={formatNumber(totals.requests)}
              icon={<Sparkles className="h-5 w-5 text-slate-500" />}
              color="slate"
            />
          </div>

          {/* Sin datos */}
          {modelStats.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Sin uso registrado en los últimos {days} días.
            </div>
          )}

          {/* Tabla por modelo */}
          {modelStats.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-semibold text-slate-700">
                  Uso por modelo
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">
                        Modelo
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Peticiones
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Tokens entrada
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Tokens salida
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Costo est. (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modelStats.map((m) => (
                      <tr key={m.model} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {m.model}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(m.requests)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(m.inputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(m.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-700">
                          {formatUSD(
                            calcCost(m.model, m.inputTokens, m.outputTokens),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla por día */}
          {dayStats.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-semibold text-slate-700">
                  Uso por día
                </span>
              </div>
              <div className="overflow-x-auto max-h-100 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Fecha</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Peticiones
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Tokens entrada
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Tokens salida
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Costo est. (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayStats.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          {dateKeyLabel(d.date)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(d.requests)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(d.inputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(d.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-700">
                          {formatUSD(d.costUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nota sobre costos estimados */}
          {totals.costIsEstimated && modelStats.length > 0 && (
            <p className="text-xs text-slate-400 text-right">
              * El costo es una estimación calculada con los precios publicados
              de OpenAI según el modelo. Para datos oficiales de facturación,
              consulta{" "}
              <a
                href="https://platform.openai.com/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-600"
              >
                platform.openai.com/usage
              </a>
              .
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function UsoTicketsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <UsoTicketsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
