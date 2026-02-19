"use client";

import { useEffect, useMemo, useState } from "react";
import { getCoachCurrentLoad, type CoachStudent } from "../api";
import { Switch } from "@/components/ui/switch";

const MAX_COACH_LOAD = 35;

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
  const [useTotalsForCapacity, setUseTotalsForCapacity] =
    useState<boolean>(false);
  const [includedPhases, setIncludedPhases] = useState<Record<string, boolean>>(
    {},
  );

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
    return dedupedRows.filter((row) => {
      const fase = String(row.fase || "Sin fase").trim() || "Sin fase";
      const status = classifyStatus(row.estatus);
      const phaseOk = phaseFilter === "__ALL__" || fase === phaseFilter;
      const statusOk = statusFilter === "__ALL__" || status === statusFilter;
      return phaseOk && statusOk;
    });
  }, [dedupedRows, phaseFilter, statusFilter]);

  const trackedTotal =
    trackedLoad.ONBOARDING + trackedLoad.F1 + trackedLoad.F2 + trackedLoad.OTRAS;
  const availableSlots = Math.max(MAX_COACH_LOAD - trackedTotal, 0);
  const isFull = trackedTotal >= MAX_COACH_LOAD;
  const loadPct = Math.min(100, (trackedTotal / MAX_COACH_LOAD) * 100);

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
                  ? `Carga llena (${trackedTotal}/${MAX_COACH_LOAD})`
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
              Carga actual calculada según modo y fases incluidas.
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
                  <div className="text-xs text-slate-600 truncate" title={item.fase}>
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
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Alumno</th>
                    <th className="px-3 py-2 text-left font-medium">Fase</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
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
                        <td className="px-3 py-2">
                          {row.alumno_nombre || "Sin nombre"}
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
