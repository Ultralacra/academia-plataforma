"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-config";
import { PRICE_PER_MILLION, priceForModel } from "@/lib/model-pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

type SuperAtcPayload = {
  agent_type?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  user_message_chars?: number;
  mode?: string;
  user_codigo?: string;
  user_nombre?: string;
  alumno_codigo?: string;
  alumno_nombre?: string;
  signals?: string[];
  created_at?: string;
};

type UsageRecord = {
  id: number | string;
  entity: string;
  entity_id: string;
  payload: SuperAtcPayload;
  created_at?: string;
  updated_at?: string;
};

type UserAggregate = {
  user_key: string;
  user_nombre: string | null;
  total_usos: number;
  input_tokens: number;
  output_tokens: number;
  costo_usd: number;
  ultimo_uso: string | null;
  modesUsados: Set<string>;
  alumnosUsados: Set<string>;
  records: UsageRecord[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function coerceList(res: unknown): UsageRecord[] {
  if (Array.isArray(res)) return res as UsageRecord[];
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    if (Array.isArray(r.items)) return r.items as UsageRecord[];
    if (Array.isArray(r.data)) return r.data as UsageRecord[];
    const data = r.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      if (Array.isArray(data.items)) return data.items as UsageRecord[];
      if (Array.isArray(data.data)) return data.data as UsageRecord[];
      if (Array.isArray(data.rows)) return data.rows as UsageRecord[];
      if (Array.isArray(data.records)) return data.records as UsageRecord[];
    }
  }
  return [];
}

function extractTotal(res: unknown): number | null {
  if (!res || typeof res !== "object") return null;
  const candidates = [
    res as Record<string, unknown>,
    (res as Record<string, unknown>).data as Record<string, unknown>,
  ];
  for (const obj of candidates) {
    if (!obj || typeof obj !== "object") continue;
    for (const key of ["total", "totalCount", "total_count", "count"]) {
      if (typeof (obj as Record<string, unknown>)[key] === "number")
        return (obj as Record<string, unknown>)[key] as number;
    }
  }
  return null;
}

function formatDate(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
}

function calcCost(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
) {
  const p = priceForModel(model);
  return (
    (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
  );
}

function formatUSD(n: number) {
  if (!isFinite(n)) return "$0.00";
  if (n > 0 && n < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 1 ? 4 : 2,
  }).format(n);
}

function modelProvider(
  model: string | null | undefined,
): "anthropic" | "openai" | null {
  const m = String(model ?? "").toLowerCase();
  if (m.startsWith("claude")) return "anthropic";
  if (
    m.startsWith("gpt") ||
    m.startsWith("o3") ||
    m.startsWith("o4") ||
    m.startsWith("o1")
  )
    return "openai";
  return null;
}

function ProviderBadge({ model }: { model?: string | null }) {
  const provider = modelProvider(model);
  if (provider === "anthropic")
    return (
      <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
        Anthropic
      </span>
    );
  if (provider === "openai")
    return (
      <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
        OpenAI
      </span>
    );
  return <span className="text-slate-300 text-[10px]">{model ?? "—"}</span>;
}

function ModeBadge({ mode }: { mode?: string | null }) {
  if (mode === "atc_team")
    return (
      <span className="inline-flex rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-medium text-violet-700">
        Equipo ATC
      </span>
    );
  if (mode === "alumno")
    return (
      <span className="inline-flex rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-medium text-sky-700">
        Alumno
      </span>
    );
  return <span className="text-slate-400 text-xs">{mode ?? "—"}</span>;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </p>
        <div className="shrink-0">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function UsoSuperAtcContent() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<UserAggregate | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const allItems: UsageRecord[] = [];
      const seenIds = new Set<string | number>();
      const PAGE_SIZE = 500;
      let page = 1;
      for (let attempt = 0; attempt < 40; attempt++) {
        const res = await apiFetch<unknown>(
          `/metadata?entity=agente_uso_super_atc&page=${page}&pageSize=${PAGE_SIZE}`,
        );
        const pageItems = coerceList(res).filter(
          (r) => r?.entity === "agente_uso_super_atc" && !seenIds.has(r.id),
        );
        if (pageItems.length === 0) break;
        for (const item of pageItems) seenIds.add(item.id);
        allItems.push(...pageItems);
        const total = extractTotal(res);
        if (total !== null && allItems.length >= total) break;
        if (pageItems.length < PAGE_SIZE) break;
        page++;
      }
      setRecords(allItems);
    } catch (e: unknown) {
      setError(
        (e as { message?: string })?.message ?? "Error al cargar el uso",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const aggregates = useMemo<UserAggregate[]>(() => {
    const map = new Map<string, UserAggregate>();
    for (const r of records) {
      const p = r.payload || ({} as SuperAtcPayload);
      // Identificar al usuario ATC que hizo la solicitud
      const key =
        String(p.user_codigo ?? "").trim() ||
        String(r.entity_id ?? "").trim() ||
        "sin-usuario";
      const nombre =
        String(p.user_nombre ?? "").trim() ||
        String(p.alumno_nombre ?? "").trim() ||
        null;
      const existing = map.get(key);
      const created = String(p.created_at ?? r.created_at ?? "");
      const inTok = Number(p.input_tokens ?? 0);
      const outTok = Number(p.output_tokens ?? 0);
      const cost =
        typeof p.cost_usd === "number"
          ? p.cost_usd
          : calcCost(p.model, inTok, outTok);
      const alumnoKey = String(p.alumno_codigo ?? "").trim();
      const modeKey = String(p.mode ?? "").trim();
      if (existing) {
        existing.total_usos += 1;
        existing.input_tokens += inTok;
        existing.output_tokens += outTok;
        existing.costo_usd += cost;
        if (alumnoKey) existing.alumnosUsados.add(alumnoKey);
        if (modeKey) existing.modesUsados.add(modeKey);
        existing.records.push(r);
        if (
          created &&
          (!existing.ultimo_uso || created > existing.ultimo_uso)
        ) {
          existing.ultimo_uso = created;
          if (!existing.user_nombre && nombre) existing.user_nombre = nombre;
        }
      } else {
        const alumnosSet = new Set<string>();
        if (alumnoKey) alumnosSet.add(alumnoKey);
        const modesSet = new Set<string>();
        if (modeKey) modesSet.add(modeKey);
        map.set(key, {
          user_key: key,
          user_nombre: nombre,
          total_usos: 1,
          input_tokens: inTok,
          output_tokens: outTok,
          costo_usd: cost,
          ultimo_uso: created || null,
          modesUsados: modesSet,
          alumnosUsados: alumnosSet,
          records: [r],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.ultimo_uso && b.ultimo_uso)
        return a.ultimo_uso < b.ultimo_uso ? 1 : -1;
      return b.total_usos - a.total_usos;
    });
  }, [records]);

  const filtered = useMemo(() => {
    if (!q.trim()) return aggregates;
    const needle = q.trim().toLowerCase();
    return aggregates.filter((a) =>
      [a.user_key, a.user_nombre ?? ""].some((v) =>
        String(v).toLowerCase().includes(needle),
      ),
    );
  }, [aggregates, q]);

  const totals = useMemo(
    () =>
      aggregates.reduce(
        (acc, a) => {
          acc.usos += a.total_usos;
          acc.input += a.input_tokens;
          acc.output += a.output_tokens;
          acc.cost += a.costo_usd;
          return acc;
        },
        { usos: 0, input: 0, output: 0, cost: 0 },
      ),
    [aggregates],
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
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
            <Bot className="h-6 w-6 text-indigo-500" />
            Uso de Emma IA
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de consumo de Emma IA por usuario del equipo, modos y
            alumnos consultados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar usuario ATC..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-64 pl-8"
            />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Usuarios ATC"
          value={formatNumber(aggregates.length)}
          icon={<User className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="Mensajes totales"
          value={formatNumber(totals.usos)}
          icon={<Sparkles className="h-5 w-5 text-amber-500" />}
        />
        <KpiCard
          label="Tokens entrada"
          value={formatNumber(totals.input)}
          icon={<BarChart3 className="h-5 w-5 text-sky-500" />}
        />
        <KpiCard
          label="Tokens salida"
          value={formatNumber(totals.output)}
          icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Costo total (USD)"
          value={formatUSD(totals.cost)}
          icon={<BarChart3 className="h-5 w-5 text-rose-500" />}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ── Tabla ──────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Usuario ATC</th>
                <th className="px-4 py-3 text-right font-medium">Mensajes</th>
                <th className="px-4 py-3 text-right font-medium">
                  Tokens entrada
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Tokens salida
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Costo (USD)
                </th>
                <th className="px-4 py-3 text-left font-medium">Modo</th>
                <th className="px-4 py-3 text-right font-medium">
                  Alumnos atendidos
                </th>
                <th className="px-4 py-3 text-left font-medium">Último uso</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No hay registros de uso aún.
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr key={a.user_key} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {a.user_nombre ||
                        (a.user_key === "sin-usuario" ? (
                          <span className="text-slate-400 italic">
                            Sin usuario
                          </span>
                        ) : (
                          a.user_key
                        ))}
                    </div>
                    {a.user_key !== "sin-usuario" && (
                      <div className="text-xs text-slate-400 font-mono">
                        {a.user_key}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatNumber(a.total_usos)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatNumber(a.input_tokens)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatNumber(a.output_tokens)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-700">
                    {formatUSD(a.costo_usd)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(a.modesUsados).map((m) => (
                        <ModeBadge key={m} mode={m} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {a.alumnosUsados.size > 0 ? (
                      <span title={Array.from(a.alumnosUsados).join(", ")}>
                        {a.alumnosUsados.size}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(a.ultimo_uso)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetail(a)}
                    >
                      Detalle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal de detalle ────────────────────────────────────────────── */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="relative flex flex-col w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Historial · {detail.user_nombre || detail.user_key}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {detail.total_usos} mensajes ·{" "}
                  <span className="font-medium text-rose-600">
                    {formatUSD(detail.costo_usd)}
                  </span>{" "}
                  costo total · {detail.alumnosUsados.size} alumno
                  {detail.alumnosUsados.size !== 1 ? "s" : ""} atendido
                  {detail.alumnosUsados.size !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap border-b border-slate-200">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap border-b border-slate-200">
                      Modo
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap border-b border-slate-200">
                      Alumno
                    </th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap border-b border-slate-200">
                      Tokens in
                    </th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap border-b border-slate-200">
                      Tokens out
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap border-b border-slate-200">
                      Modelo
                    </th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap border-b border-slate-200">
                      Costo (USD)
                    </th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap border-b border-slate-200">
                      Señales
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...detail.records]
                    .sort((a, b) => {
                      const da = String(
                        a.payload?.created_at ?? a.created_at ?? "",
                      );
                      const db = String(
                        b.payload?.created_at ?? b.created_at ?? "",
                      );
                      return da < db ? 1 : -1;
                    })
                    .map((r) => {
                      const p = r.payload ?? ({} as SuperAtcPayload);
                      const inTok = Number(p.input_tokens ?? 0);
                      const outTok = Number(p.output_tokens ?? 0);
                      const cost =
                        typeof p.cost_usd === "number"
                          ? p.cost_usd
                          : calcCost(p.model, inTok, outTok);
                      return (
                        <tr
                          key={String(r.id)}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-xs">
                            {formatDate(p.created_at ?? r.created_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ModeBadge mode={p.mode} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.alumno_nombre ? (
                              <div>
                                <div className="font-medium text-slate-800">
                                  {p.alumno_nombre}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {p.alumno_codigo}
                                </div>
                              </div>
                            ) : p.alumno_codigo ? (
                              <span className="font-mono text-xs text-slate-500">
                                {p.alumno_codigo}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                            {formatNumber(inTok)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                            {formatNumber(outTok)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ProviderBadge model={p.model} />
                            {p.model && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {p.model}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-700 whitespace-nowrap">
                            {cost > 0 ? formatUSD(cost) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {p.signals && p.signals.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.signals.map((s) => (
                                  <span
                                    key={s}
                                    className="inline-flex rounded-full bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-medium text-rose-700"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsoSuperAtcPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <UsoSuperAtcContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
