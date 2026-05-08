"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-config";

type AgenteUsoCoachPayload = {
  coach_id?: number | string | null;
  coach_codigo?: string;
  coach_nombre?: string;
  alumno_codigo?: string;
  alumno_nombre?: string;
  agent_type?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  user_message_chars?: number;
  created_at?: string;
};

type UsageRecord = {
  id: number | string;
  entity: string;
  entity_id: string;
  payload: AgenteUsoCoachPayload;
  created_at?: string;
  updated_at?: string;
};

const AGENT_LABEL: Record<string, string> = {
  hotsystem: "Revisor de Fase 1",
  "hotwriter-vsl": "Co-escritor VSL",
  "hotwriter-mini-vsl": "Hooks y Mini VSL",
  "hotwriter-carnada": "Copy de Carnada",
  "hotwriter-ads": "Anuncios Ads",
};

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

function formatDate(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString("es-ES", {
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

const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  default: { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-0": { input: 3, output: 15 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-5-haiku": { input: 0.8, output: 4 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  "claude-3-opus": { input: 15, output: 75 },
  "gpt-5": { input: 10, output: 40 },
  "gpt-4.5": { input: 75, output: 150 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
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

function calcCost(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
) {
  const p = priceFor(model);
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

type CoachAggregate = {
  coach_codigo: string;
  coach_nombre: string | null;
  total_usos: number;
  input_tokens: number;
  output_tokens: number;
  costo_usd: number;
  ultimo_uso: string | null;
  agentesUsados: Set<string>;
  alumnosUsados: Set<string>;
  records: UsageRecord[];
};

function AgentesUsoCoachContent() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<CoachAggregate | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>(
        "/metadata?entity=agente_uso_coach&pageSize=5000",
      );
      const items = coerceList(res).filter(
        (r) => r?.entity === "agente_uso_coach",
      );
      setRecords(items);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar el uso");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const aggregates = useMemo<CoachAggregate[]>(() => {
    const map = new Map<string, CoachAggregate>();
    for (const r of records) {
      const p = r.payload || ({} as AgenteUsoCoachPayload);
      const key =
        String(p.coach_codigo ?? "").trim() ||
        String(p.coach_id ?? r.entity_id ?? "");
      if (!key) continue;
      const existing = map.get(key);
      const created = String(p.created_at ?? r.created_at ?? "");
      const inTok = Number(p.input_tokens ?? 0);
      const outTok = Number(p.output_tokens ?? 0);
      const cost = calcCost(p.model, inTok, outTok);
      const alumnoKey = String(p.alumno_codigo ?? "").trim();
      if (existing) {
        existing.total_usos += 1;
        existing.input_tokens += inTok;
        existing.output_tokens += outTok;
        existing.costo_usd += cost;
        existing.agentesUsados.add(String(p.agent_type ?? ""));
        if (alumnoKey) existing.alumnosUsados.add(alumnoKey);
        existing.records.push(r);
        if (
          created &&
          (!existing.ultimo_uso || created > existing.ultimo_uso)
        ) {
          existing.ultimo_uso = created;
          if (!existing.coach_nombre && p.coach_nombre)
            existing.coach_nombre = p.coach_nombre;
        }
      } else {
        const alumnosSet = new Set<string>();
        if (alumnoKey) alumnosSet.add(alumnoKey);
        map.set(key, {
          coach_codigo: String(p.coach_codigo ?? key),
          coach_nombre: p.coach_nombre ?? null,
          total_usos: 1,
          input_tokens: inTok,
          output_tokens: outTok,
          costo_usd: cost,
          ultimo_uso: created || null,
          agentesUsados: new Set([String(p.agent_type ?? "")]),
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
      [a.coach_codigo, a.coach_nombre ?? ""].some((v) =>
        String(v).toLowerCase().includes(needle),
      ),
    );
  }, [aggregates, q]);

  const totals = useMemo(() => {
    return aggregates.reduce(
      (acc, a) => {
        acc.usos += a.total_usos;
        acc.input += a.input_tokens;
        acc.output += a.output_tokens;
        acc.cost += a.costo_usd;
        return acc;
      },
      { usos: 0, input: 0, output: 0, cost: 0 },
    );
  }, [aggregates]);

  return (
    <div className="space-y-6">
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
            <BarChart3 className="h-6 w-6 text-violet-500" />
            Uso del Agente Copy (coachs)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de consumo del agente por coach, agentes usados y alumnos
            en contexto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar coach..."
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

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Coachs únicos"
          value={formatNumber(aggregates.length)}
          icon={<User className="h-5 w-5 text-violet-500" />}
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Coach</th>
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
                <th className="px-4 py-3 text-left font-medium">Agentes</th>
                <th className="px-4 py-3 text-right font-medium">
                  Alumnos en contexto
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
                <tr key={a.coach_codigo} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {a.coach_nombre || "—"}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {a.coach_codigo}
                    </div>
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
                      {Array.from(a.agentesUsados).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-200"
                        >
                          {AGENT_LABEL[t] ?? t}
                        </span>
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Historial · {detail?.coach_nombre || detail?.coach_codigo}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium">Agente</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Alumno contexto
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Tokens in
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Tokens out
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Costo (USD)
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
                    .map((r) => (
                      <tr key={String(r.id)}>
                        <td className="px-3 py-2 text-slate-700">
                          {formatDate(
                            r.payload?.created_at ?? r.created_at ?? null,
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {AGENT_LABEL[r.payload?.agent_type ?? ""] ??
                            r.payload?.agent_type ??
                            "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.payload?.alumno_nombre ? (
                            <span>
                              {r.payload.alumno_nombre}
                              <span className="text-slate-400 font-mono text-[10px] ml-1">
                                {r.payload.alumno_codigo}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {formatNumber(Number(r.payload?.input_tokens ?? 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {formatNumber(Number(r.payload?.output_tokens ?? 0))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-rose-700">
                          {formatUSD(
                            calcCost(
                              r.payload?.model,
                              Number(r.payload?.input_tokens ?? 0),
                              Number(r.payload?.output_tokens ?? 0),
                            ),
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
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
        </div>
      </div>
    </div>
  );
}

export default function AgentesUsoCoachPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <AgentesUsoCoachContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
