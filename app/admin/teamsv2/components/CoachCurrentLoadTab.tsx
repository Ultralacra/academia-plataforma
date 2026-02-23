"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getCoachCurrentLoad,
  getCoachTickets,
  type CoachStudent,
  type CoachTicket,
} from "../api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { Ticket } from "@/lib/data-service";
import { computeTicketMetrics } from "@/app/admin/tickets/components/metrics";
import TicketsKPIs from "@/app/admin/tickets/components/kpis";
import TicketsSummaryCard from "@/app/admin/tickets/components/tickets-summary-card";

const MAX_COACH_LOAD = 35;

function ymdLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultTicketsRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 7);
  return { from: ymdLocal(from), to: ymdLocal(to) };
}

function normalizeText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
}

function classifyPhase(
  value?: string | null,
): "ONBOARDING" | "F1" | "F2" | "OTRAS" {
  const raw = normalizeText(value);
  if (!raw) return "OTRAS";
  if (raw.includes("ONBOARD")) return "ONBOARDING";
  if (raw.startsWith("F1") || raw.includes("FASE 1") || raw.includes("FASE1"))
    return "F1";
  if (raw.startsWith("F2") || raw.includes("FASE 2") || raw.includes("FASE2"))
    return "F2";
  return "OTRAS";
}

function phaseBadgeClass(value?: string | null) {
  const phase = classifyPhase(value);
  if (phase === "ONBOARDING") {
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200";
  }
  if (phase === "F1") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  if (phase === "F2") {
    return "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200";
}

function classifyStatus(value?: string | null): "ACTIVO" | "INACTIVO" | "OTRO" {
  const raw = normalizeText(value);
  if (!raw) return "OTRO";
  if (raw.includes("INACTIVO")) return "INACTIVO";
  if (raw.includes("ACTIVO")) return "ACTIVO";
  return "OTRO";
}

function isCapacityPhase(value?: string | null) {
  const raw = normalizeText(value);
  if (!raw) return false;

  const normalized = raw.replace(/\s+/g, "");

  const allowed = new Set([
    "ONBOARDING",
    "F1",
    "FASE1",
    "F2",
    "FASE2",
    "F2_VSL",
    "F2/VSL",
    "F2-VSL",
    "F2PAGINAS",
    "F2_PAGINAS",
    "F2/PAGINAS",
    "F2-PAGINAS",
  ]);

  return allowed.has(normalized);
}

function statusBadgeClass(value?: string | null) {
  const kind = classifyStatus(value);
  if (kind === "ACTIVO") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  if (kind === "INACTIVO") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200";
}

function rowStudentKey(row: CoachStudent) {
  const byAlumno = String(row.id_alumno || "").trim();
  if (byAlumno) return `alumno:${byAlumno.toLowerCase()}`;
  const byId = String(row.id || "").trim();
  if (byId) return `id:${byId}`;
  const byName = normalizeText(row.alumno_nombre || "");
  return byName ? `name:${byName}` : "unknown";
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatDateEs(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calculateInactiveDays(value?: string | null) {
  if (!value) return null;
  const lastActivity = new Date(value);
  if (Number.isNaN(lastActivity.getTime())) return null;

  const today = new Date();
  const todayAtMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const lastAtMidnight = new Date(
    lastActivity.getFullYear(),
    lastActivity.getMonth(),
    lastActivity.getDate(),
  );

  const diffMs = todayAtMidnight.getTime() - lastAtMidnight.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

export default function CoachCurrentLoadTab({
  coachCode,
  coachName,
  enabled,
}: {
  coachCode: string;
  coachName?: string | null;
  enabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CoachStudent[]>([]);
  const [phaseFilter, setPhaseFilter] = useState<string>("__ALL__");
  const [statusFilter, setStatusFilter] = useState<string>("__ALL__");
  const [activityWindowFilter, setActivityWindowFilter] = useState<
    "__ALL__" | "INACTIVE_30_PLUS" | "ACTIVE_RECENT"
  >("__ALL__");
  const [useTotalsForCapacity, setUseTotalsForCapacity] =
    useState<boolean>(false);
  const [subtractInactive30ForCapacity, setSubtractInactive30ForCapacity] =
    useState<boolean>(false);
  const [includedPhases, setIncludedPhases] = useState<Record<string, boolean>>(
    {},
  );
  const [ticketFrom, setTicketFrom] = useState<string>(
    defaultTicketsRange().from,
  );
  const [ticketTo, setTicketTo] = useState<string>(defaultTicketsRange().to);
  const [ticketRows, setTicketRows] = useState<CoachTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  useEffect(() => {
    if (!coachCode || !enabled) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCoachCurrentLoad(coachCode, 100);
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
        console.log("[teamsv2][carga] alumnos del coach", {
          coachCode,
          endpoint: `/client/get/clients?page=1&pageSize=100&coach=${encodeURIComponent(coachCode)}`,
          total: Array.isArray(data) ? data.length : 0,
          alumnos: data,
        });
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "No se pudo cargar la carga actual");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coachCode, enabled]);

  useEffect(() => {
    if (!coachCode || !enabled || !ticketFrom || !ticketTo) return;

    let cancelled = false;
    (async () => {
      try {
        setTicketsLoading(true);
        setTicketsError(null);

        const pageSize = 100;
        let page = 1;
        let totalPages = 1;
        const all: CoachTicket[] = [];

        while (!cancelled && page <= totalPages && page <= 50) {
          const res = await getCoachTickets({
            coach: coachCode,
            page,
            pageSize,
            fechaDesde: ticketFrom,
            fechaHasta: ticketTo,
          });

          all.push(...(Array.isArray(res.data) ? res.data : []));
          totalPages = Number(res.totalPages ?? 1) || 1;
          page += 1;
        }

        if (cancelled) return;
        setTicketRows(all);
      } catch (err: any) {
        if (cancelled) return;
        setTicketsError(
          err?.message ?? "No se pudieron cargar métricas de tickets",
        );
        setTicketRows([]);
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coachCode, enabled, ticketFrom, ticketTo]);

  const ticketsForMetrics = useMemo<Ticket[]>(() => {
    return ticketRows.map((t) => {
      const estadoNormalizado = String(t.estado ?? "")
        .replace(/_/g, " ")
        .toUpperCase();

      const ultimoEstadoObj =
        t.ultimo_estado && typeof t.ultimo_estado === "object"
          ? {
              estatus:
                String((t.ultimo_estado as any).estatus ?? "").replace(
                  /_/g,
                  " ",
                ) || null,
              fecha: (t.ultimo_estado as any).fecha ?? null,
            }
          : null;

      return {
        id: Number(t.id),
        id_externo: t.codigo ?? null,
        nombre: t.nombre ?? null,
        alumno_nombre: t.alumno_nombre ?? null,
        informante: t.informante ?? null,
        informante_nombre: t.informante_nombre ?? null,
        estado: estadoNormalizado || null,
        tipo: t.tipo ?? null,
        creacion: t.created_at ?? new Date().toISOString(),
        deadline: t.deadline ?? null,
        equipo_urls: [],
        coaches: [
          {
            codigo_equipo: coachCode,
            nombre: coachName ?? null,
            puesto: null,
            area: null,
          },
        ],
        ultimo_estado: ultimoEstadoObj,
      } as Ticket;
    });
  }, [ticketRows, coachCode, coachName]);

  const ticketMetrics = useMemo(
    () => computeTicketMetrics(ticketsForMetrics),
    [ticketsForMetrics],
  );

  const dedupedRows = useMemo(() => {
    const map = new Map<string, CoachStudent>();
    for (const row of rows) {
      const key = rowStudentKey(row);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, row);
        continue;
      }

      const prevTs = toTimestamp(prev.updated_at || prev.created_at);
      const nextTs = toTimestamp(row.updated_at || row.created_at);

      if (nextTs >= prevTs) {
        map.set(key, row);
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const statusCounts = useMemo(() => {
    let activos = 0;
    let inactivos = 0;
    let otros = 0;
    for (const row of dedupedRows) {
      const kind = classifyStatus(row.estatus);
      if (kind === "ACTIVO") activos += 1;
      else if (kind === "INACTIVO") inactivos += 1;
      else otros += 1;
    }
    return { activos, inactivos, otros };
  }, [dedupedRows]);

  const allPhaseBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        fase: string;
        total: number;
        activos: number;
        inactivos: number;
        otros: number;
      }
    >();

    for (const row of dedupedRows) {
      const fase = String(row.fase || "Sin fase").trim() || "Sin fase";
      const status = classifyStatus(row.estatus);
      const prev = map.get(fase) ?? {
        fase,
        total: 0,
        activos: 0,
        inactivos: 0,
        otros: 0,
      };
      prev.total += 1;
      if (status === "ACTIVO") prev.activos += 1;
      else if (status === "INACTIVO") prev.inactivos += 1;
      else prev.otros += 1;
      map.set(fase, prev);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.total - a.total || a.fase.localeCompare(b.fase),
    );
  }, [dedupedRows]);

  useEffect(() => {
    const phaseStatusArray = allPhaseBreakdown.map((item) => ({
      fase: item.fase,
      activos: item.activos,
      inactivos: item.inactivos,
    }));
    console.log(
      "[teamsv2][carga] activos/inactivos por fase",
      phaseStatusArray,
    );
  }, [allPhaseBreakdown]);

  useEffect(() => {
    setIncludedPhases((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const item of allPhaseBreakdown) {
        if (typeof next[item.fase] === "undefined") {
          next[item.fase] = isCapacityPhase(item.fase);
        }
      }
      return next;
    });
  }, [allPhaseBreakdown]);

  const trackedLoad = useMemo(() => {
    const acc = {
      ONBOARDING: 0,
      F1: 0,
      F2: 0,
      OTRAS: 0,
    };

    for (const item of allPhaseBreakdown) {
      if (!includedPhases[item.fase]) continue;
      const key = classifyPhase(item.fase);
      const amount = useTotalsForCapacity ? item.total : item.activos;
      acc[key] += amount;
    }

    return acc;
  }, [allPhaseBreakdown, includedPhases, useTotalsForCapacity]);

  const phaseFilterOptions = useMemo(
    () => allPhaseBreakdown.map((p) => p.fase),
    [allPhaseBreakdown],
  );

  const filteredRows = useMemo(() => {
    const base = dedupedRows.filter((row) => {
      const fase = String(row.fase || "Sin fase").trim() || "Sin fase";
      const status = classifyStatus(row.estatus);
      const inactiveDays = calculateInactiveDays(row.ultima_actividad);
      const phaseOk = phaseFilter === "__ALL__" || fase === phaseFilter;
      const statusOk = statusFilter === "__ALL__" || status === statusFilter;
      const activityOk =
        activityWindowFilter === "__ALL__"
          ? true
          : activityWindowFilter === "INACTIVE_30_PLUS"
            ? inactiveDays != null && Number(inactiveDays) >= 30
            : inactiveDays != null && Number(inactiveDays) < 30;
      return phaseOk && statusOk && activityOk;
    });

    return base.sort((a, b) => {
      const faseA = String(a.fase || "Sin fase").trim() || "Sin fase";
      const faseB = String(b.fase || "Sin fase").trim() || "Sin fase";
      const cmpFase = faseA.localeCompare(faseB, "es", { sensitivity: "base" });
      if (cmpFase !== 0) return cmpFase;

      const nombreA = String(a.alumno_nombre || "").trim();
      const nombreB = String(b.alumno_nombre || "").trim();
      return nombreA.localeCompare(nombreB, "es", { sensitivity: "base" });
    });
  }, [dedupedRows, phaseFilter, statusFilter, activityWindowFilter]);

  const inactive30PlusCount = useMemo(
    () =>
      dedupedRows.filter((row) => {
        const days = calculateInactiveDays(row.ultima_actividad);
        return days != null && days >= 30;
      }).length,
    [dedupedRows],
  );

  const activeRecentCount = useMemo(
    () =>
      dedupedRows.filter((row) => {
        const days = calculateInactiveDays(row.ultima_actividad);
        return days != null && days < 30;
      }).length,
    [dedupedRows],
  );

  const trackedTotal =
    trackedLoad.ONBOARDING +
    trackedLoad.F1 +
    trackedLoad.F2 +
    trackedLoad.OTRAS;
  const effectiveTrackedTotal = Math.max(
    trackedTotal - (subtractInactive30ForCapacity ? inactive30PlusCount : 0),
    0,
  );
  const availableSlots = Math.max(MAX_COACH_LOAD - effectiveTrackedTotal, 0);
  const isFull = effectiveTrackedTotal >= MAX_COACH_LOAD;
  const loadPct = Math.min(100, (effectiveTrackedTotal / MAX_COACH_LOAD) * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          Carga actual de {coachName || coachCode}
        </h3>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          Total alumnos únicos: {dedupedRows.length}
        </span>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
          Cargando carga actual...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">
                Meta de carga por coach
              </h4>
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  isFull
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                }`}
              >
                {isFull
                  ? `Carga llena (${effectiveTrackedTotal}/${MAX_COACH_LOAD})`
                  : `Carga disponible (${availableSlots} cupos)`}
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  isFull ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${loadPct}%` }}
              />
            </div>

            <div className="text-xs text-slate-600">
              Fases consideradas para capacidad: <strong>Onboarding</strong>,{" "}
              <strong>F1</strong>, <strong>F2</strong>. En F2 se agrupan
              variantes como <strong>F2_VSL</strong>, <strong>F2/VSL</strong> y{" "}
              <strong>F2/PÁGINAS</strong>.
            </div>

            <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Carga actual calculada según modo, fases incluidas y ajustes
              activos.
            </div>

            <div className="rounded-md border bg-white px-3 py-2 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                Calcular carga con totales
                <div className="text-[11px] text-slate-500">
                  {useTotalsForCapacity
                    ? "Modo: totales (activos + inactivos + otros)"
                    : "Modo: solo activos"}
                </div>
              </div>
              <Switch
                checked={useTotalsForCapacity}
                onCheckedChange={(checked) =>
                  setUseTotalsForCapacity(Boolean(checked))
                }
                aria-label="Calcular carga con totales"
              />
            </div>

            <div className="rounded-md border bg-white px-3 py-2 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                Restar alumnos con inactividad 30+ días en carga actual
                <div className="text-[11px] text-slate-500">
                  {subtractInactive30ForCapacity
                    ? `Se restan ${inactive30PlusCount} alumno(s) con inactividad de 30+ días`
                    : "No se resta inactividad 30+ días"}
                </div>
              </div>
              <Switch
                checked={subtractInactive30ForCapacity}
                onCheckedChange={(checked) =>
                  setSubtractInactive30ForCapacity(Boolean(checked))
                }
                aria-label="Restar inactividad 30+ días en carga actual"
              />
            </div>

            {rows.length !== dedupedRows.length && (
              <div className="rounded-md border bg-amber-50 border-amber-200 px-3 py-2 text-xs text-amber-800">
                Se deduplicaron {rows.length - dedupedRows.length} registro(s)
                repetidos para calcular la carga correctamente.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200 px-2 py-1 text-xs font-semibold">
                Activos: {statusCounts.activos}
              </span>
              <span className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200 px-2 py-1 text-xs font-semibold">
                Inactivos: {statusCounts.inactivos}
              </span>
              {statusCounts.otros > 0 && (
                <span className="rounded-md border border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200 px-2 py-1 text-xs font-semibold">
                  Otros: {statusCounts.otros}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {allPhaseBreakdown.map((item) => (
              <div
                key={item.fase}
                className={`rounded-md border px-3 py-3 ${
                  includedPhases[item.fase]
                    ? "bg-cyan-50 border-cyan-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="text-xs text-slate-600 truncate"
                    title={item.fase}
                  >
                    {item.fase}
                  </div>
                  <Switch
                    checked={Boolean(includedPhases[item.fase])}
                    onCheckedChange={(checked) =>
                      setIncludedPhases((prev) => ({
                        ...prev,
                        [item.fase]: Boolean(checked),
                      }))
                    }
                    aria-label={`Incluir fase ${item.fase} en carga`}
                  />
                </div>

                <div className="mt-1 text-[11px] text-slate-500">
                  {includedPhases[item.fase]
                    ? "Incluida en carga"
                    : "No incluida en carga"}
                </div>

                <div className="text-xl font-semibold text-slate-900">
                  {useTotalsForCapacity ? item.total : item.activos}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
                    Activos {item.activos}
                  </span>
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800">
                    Inactivos {item.inactivos}
                  </span>
                  {item.otros > 0 && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                      Otros {item.otros}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-white p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Filtrar por fase
                </label>
                <select
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value)}
                  className="h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="__ALL__">Todas las fases</option>
                  {phaseFilterOptions.map((fase) => (
                    <option key={fase} value={fase}>
                      {fase}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Filtrar por estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="__ALL__">Todos los estados</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="INACTIVO">Inactivos</option>
                  <option value="OTRO">Otros</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Resultados
                </label>
                <div className="h-9 rounded-md border px-3 text-sm flex items-center text-slate-700">
                  {filteredRows.length} alumno(s)
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-md border bg-slate-50 px-3 py-2 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                Switch estado rápido
                <div className="text-[11px] text-slate-500">
                  {statusFilter === "INACTIVO"
                    ? "Mostrando inactivos"
                    : "Mostrando activos"}
                </div>
              </div>
              <Switch
                checked={statusFilter === "INACTIVO"}
                onCheckedChange={(checked) =>
                  setStatusFilter(checked ? "INACTIVO" : "ACTIVO")
                }
                aria-label="Cambiar entre activos e inactivos"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActivityWindowFilter((prev) =>
                    prev === "INACTIVE_30_PLUS"
                      ? "__ALL__"
                      : "INACTIVE_30_PLUS",
                  )
                }
                className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${
                  activityWindowFilter === "INACTIVE_30_PLUS"
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {activityWindowFilter === "INACTIVE_30_PLUS"
                  ? "Mostrando inactividad 30+ días"
                  : "Ver inactividad 30+ días"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setActivityWindowFilter((prev) =>
                    prev === "ACTIVE_RECENT" ? "__ALL__" : "ACTIVE_RECENT",
                  )
                }
                className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${
                  activityWindowFilter === "ACTIVE_RECENT"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {activityWindowFilter === "ACTIVE_RECENT"
                  ? "Mostrando activos (<30 días)"
                  : "Ver activos (<30 días)"}
              </button>
              <span className="text-xs text-slate-600">
                Alumnos con 30+ días: <strong>{inactive30PlusCount}</strong>
              </span>
              <span className="text-xs text-slate-600">
                Alumnos activos (&lt;30 días):{" "}
                <strong>{activeRecentCount}</strong>
              </span>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Métricas de tickets del coach
                </h4>
                <p className="text-xs text-slate-500">
                  Mismo resumen de tickets, integrado en la carga actual.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600">Desde</label>
                  <input
                    type="date"
                    value={ticketFrom}
                    onChange={(e) => setTicketFrom(e.target.value)}
                    className="h-9 rounded-md border px-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600">Hasta</label>
                  <input
                    type="date"
                    value={ticketTo}
                    onChange={(e) => setTicketTo(e.target.value)}
                    className="h-9 rounded-md border px-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {ticketsLoading ? (
              <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Cargando métricas de tickets...
              </div>
            ) : ticketsError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {ticketsError}
              </div>
            ) : (
              <>
                <TicketsKPIs metrics={ticketMetrics} loading={ticketsLoading} />
                <TicketsSummaryCard
                  tickets={ticketsForMetrics}
                  metrics={ticketMetrics}
                />
              </>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Alumno</th>
                    <th className="px-3 py-2 text-left font-medium">Fase</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Última actividad
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Inactividad (días)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No hay resultados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={`${row.id}-${row.id_alumno}`}
                        className="border-t"
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-slate-900">
                            {row.alumno_nombre || "Sin nombre"}
                          </div>
                          {row.id_alumno ? (
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                            >
                              <Link
                                href={`/admin/alumnos/${encodeURIComponent(String(row.id_alumno))}/perfil`}
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                Ver alumno
                              </Link>
                            </Button>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${phaseBadgeClass(row.fase)}`}
                          >
                            {row.fase || "Sin fase"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.estatus)}`}
                          >
                            {row.estatus || "Sin estado"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatDateEs(row.ultima_actividad)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {calculateInactiveDays(row.ultima_actividad) == null
                            ? "—"
                            : Number(
                                calculateInactiveDays(row.ultima_actividad),
                              ).toLocaleString("es-ES")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
