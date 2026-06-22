"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  LifeBuoy,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-config";
import { PRICE_PER_MILLION, priceForModel } from "@/lib/model-pricing";

function calcCost(
  model: string | null | undefined,
  input: number,
  output: number,
) {
  const p = priceForModel(model);
  return (input / 1_000_000) * p.input + (output / 1_000_000) * p.output;
}

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatUSD(n: number) {
  if (!isFinite(n)) return "$0.00";
  if (n > 0 && n < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 1 ? 4 : 2,
  }).format(n);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
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

function toDateKey(s: string) {
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return "sin-fecha";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AtcUsagePayload = {
  agent_type: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  user_message_chars: number;
  alumno_codigo?: string;
  signals?: string[];
  user_id?: string | number | null;
  user_codigo?: string;
  user_nombre?: string;
  created_at: string;
};

type UsageRecord = {
  id: number | string;
  entity: string;
  entity_id: string;
  payload: AtcUsagePayload;
  created_at?: string;
};

type DayStats = {
  date: string;
  usos: number;
  input_tokens: number;
  output_tokens: number;
  costo_usd: number;
  models: Set<string>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function coerceList(res: any): UsageRecord[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
    const data = res.data;
    if (data && typeof data === "object") {
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.rows)) return data.rows;
    }
  }
  return [];
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
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

// ─── Main component ───────────────────────────────────────────────────────────

function AtcUsoContent() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiFetch<any>(
        "/metadata?entity=agente_uso_soporte_atc&pageSize=5000",
      );
      const items = coerceList(res).filter(
        (r) => r?.entity === "agente_uso_soporte_atc",
      );
      setRecords(items);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Error al cargar el uso");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Totals ───────────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    return records.reduce(
      (acc, r) => {
        const p = r.payload || ({} as AtcUsagePayload);
        const inTok = Number(p.input_tokens ?? 0);
        const outTok = Number(p.output_tokens ?? 0);
        acc.usos += 1;
        acc.input += inTok;
        acc.output += outTok;
        acc.cost += calcCost(p.model, inTok, outTok);
        return acc;
      },
      { usos: 0, input: 0, output: 0, cost: 0 },
    );
  }, [records]);

  // ── By day ───────────────────────────────────────────────────────────────────

  const byDay = useMemo<DayStats[]>(() => {
    const map = new Map<string, DayStats>();
    for (const r of records) {
      const p = r.payload || ({} as AtcUsagePayload);
      const created = String(p.created_at ?? r.created_at ?? "");
      const date = toDateKey(created);
      const inTok = Number(p.input_tokens ?? 0);
      const outTok = Number(p.output_tokens ?? 0);
      const cost = calcCost(p.model, inTok, outTok);

      const existing = map.get(date);
      if (existing) {
        existing.usos += 1;
        existing.input_tokens += inTok;
        existing.output_tokens += outTok;
        existing.costo_usd += cost;
        if (p.model) existing.models.add(p.model);
      } else {
        map.set(date, {
          date,
          usos: 1,
          input_tokens: inTok,
          output_tokens: outTok,
          costo_usd: cost,
          models: new Set(p.model ? [p.model] : []),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [records]);

  // ── By user ──────────────────────────────────────────────────────────────────

  const byUser = useMemo<
    Array<{ codigo: string; nombre: string; usos: number; costo_usd: number }>
  >(() => {
    const map = new Map<
      string,
      { codigo: string; nombre: string; usos: number; costo_usd: number }
    >();
    for (const r of records) {
      const p = r.payload || ({} as AtcUsagePayload);
      const codigo = p.user_codigo ?? r.entity_id ?? "—";
      const nombre = p.user_nombre ?? codigo;
      const inTok = Number(p.input_tokens ?? 0);
      const outTok = Number(p.output_tokens ?? 0);
      const cost = calcCost(p.model, inTok, outTok);
      const existing = map.get(codigo);
      if (existing) {
        existing.usos += 1;
        existing.costo_usd += cost;
        if (existing.nombre === codigo && nombre !== codigo)
          existing.nombre = nombre;
      } else {
        map.set(codigo, { codigo, nombre, usos: 1, costo_usd: cost });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.usos - a.usos);
  }, [records]);

  // ── Signal frequency ─────────────────────────────────────────────────────────

  const signalFreq = useMemo<Array<{ signal: string; count: number }>>(() => {
    const freq: Record<string, number> = {};
    for (const r of records) {
      const sigs = r.payload?.signals ?? [];
      for (const s of sigs) {
        freq[s] = (freq[s] ?? 0) + 1;
      }
    }
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .map(([signal, count]) => ({ signal, count }));
  }, [records]);

  // ── Recent records ───────────────────────────────────────────────────────────

  const recent = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        const da = String(a.payload?.created_at ?? a.created_at ?? "");
        const db = String(b.payload?.created_at ?? b.created_at ?? "");
        return da < db ? 1 : -1;
      })
      .slice(0, 50);
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/agentes/soporte-atc"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Soporte ATC
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-teal-500" />
            Uso del Agente Soporte ATC
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de consumo de tokens y costo estimado por consulta del
            equipo ATC.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {loading ? "Cargando…" : "Actualizar"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Consultas totales"
          value={formatNumber(totals.usos)}
          icon={<BarChart3 className="h-5 w-5 text-teal-500" />}
        />
        <KpiCard
          label="Tokens entrada"
          value={formatNumber(totals.input)}
          sub="contexto + sistema"
          icon={<BarChart3 className="h-5 w-5 text-sky-500" />}
        />
        <KpiCard
          label="Tokens salida"
          value={formatNumber(totals.output)}
          sub="respuesta generada"
          icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Costo total (USD)"
          value={formatUSD(totals.cost)}
          sub="estimado según tarifa del modelo"
          icon={<BarChart3 className="h-5 w-5 text-rose-500" />}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Señales detectadas */}
        {signalFreq.length > 0 && (
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Señales de riesgo detectadas
            </h2>
            <div className="space-y-2">
              {signalFreq.slice(0, 12).map(({ signal, count }) => (
                <div
                  key={signal}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-xs text-slate-600 capitalize">
                    {signal.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{
                        width: `${Math.max(8, (count / (signalFreq[0]?.count ?? 1)) * 80)}px`,
                      }}
                    />
                    <span className="text-xs font-semibold text-slate-700 w-6 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Por día */}
        <div
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${signalFreq.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}
        >
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Uso por día
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Consultas
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Tokens entrada
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Tokens salida
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Costo (USD)
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Modelos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && byDay.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                    </td>
                  </tr>
                )}
                {!loading && byDay.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No hay registros de uso aún.
                    </td>
                  </tr>
                )}
                {byDay.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {d.date}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {formatNumber(d.usos)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {formatNumber(d.input_tokens)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {formatNumber(d.output_tokens)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                      {formatUSD(d.costo_usd)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(d.models).map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-medium text-teal-700"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Uso por usuario */}
      {byUser.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              Uso por usuario
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Usuario</th>
                  <th className="px-4 py-2 text-left font-medium">Código</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Consultas
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Costo total (USD)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byUser.map((u) => (
                  <tr key={u.codigo} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800 font-medium">
                      {u.nombre}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">
                      {u.codigo}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {formatNumber(u.usos)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                      {formatUSD(u.costo_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Últimas 50 consultas */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Últimas 50 consultas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Fecha</th>
                <th className="px-4 py-2 text-left font-medium">Usuario</th>
                <th className="px-4 py-2 text-left font-medium">Modelo</th>
                <th className="px-4 py-2 text-right font-medium">Tokens in</th>
                <th className="px-4 py-2 text-right font-medium">Tokens out</th>
                <th className="px-4 py-2 text-right font-medium">
                  Costo (USD)
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  Señales detectadas
                </th>
                <th className="px-4 py-2 text-left font-medium">Alumno ctx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Sin registros.
                  </td>
                </tr>
              )}
              {recent.map((r) => {
                const p = r.payload || ({} as AtcUsagePayload);
                const inTok = Number(p.input_tokens ?? 0);
                const outTok = Number(p.output_tokens ?? 0);
                const cost = calcCost(p.model, inTok, outTok);
                const signals = p.signals ?? [];
                return (
                  <tr key={String(r.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 text-xs whitespace-nowrap">
                      {formatDate(p.created_at ?? r.created_at ?? null)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-700">
                          {p.user_nombre || p.user_codigo || "—"}
                        </span>
                        {p.user_codigo &&
                          p.user_nombre &&
                          p.user_codigo !== p.user_nombre && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.user_codigo}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                        {p.model || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {formatNumber(inTok)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {formatNumber(outTok)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-rose-700">
                      {formatUSD(cost)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {signals.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          signals.slice(0, 4).map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700"
                            >
                              {s.replace(/_/g, " ")}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">
                      {p.alumno_codigo || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AtcUsoPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <AtcUsoContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
