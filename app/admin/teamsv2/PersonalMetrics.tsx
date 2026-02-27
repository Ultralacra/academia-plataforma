"use client";

import { useEffect, useMemo, useState } from "react";
import CircularProgress from "@/components/ui/CircularProgress";
import { fetchMetrics } from "@/app/admin/teams/teamsApi";
import StudentsPhaseDonut from "./components/StudentsPhaseDonut";
import CoachStudentsDistributionChart from "./components/CoachStudentsDistributionChart";
import ResolutionAndRateCard from "./components/ResolutionAndRateCard";
import TicketsByPeriodBar from "./components/TicketsByPeriodBar";
import TicketsByStudentBar from "./components/TicketsByStudentBar";
import TicketsByStudentDonut from "./components/TicketsByStudentDonut";
import SlowestResponseCard from "./components/SlowestResponseCard";
import TicketsByInformanteBar from "@/app/admin/teams/TicketsByInformanteBar";
import SessionsMetrics from "./components/SessionsMetrics";
// Tabla completa se deja en pestaña Detalles; no se muestra en Métricas

const METRICS_CACHE_TTL_MS = 1000 * 60 * 10;

function getMetricsCacheKey(coachCode: string, desde: string, hasta: string) {
  return `teamsv2:metrics:${coachCode}:${desde}:${hasta}`;
}

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const today = `${y}-${String(m + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return { first, today };
}

export default function PersonalMetrics({
  coachCode,
  coachName,
}: {
  coachCode?: string | null;
  coachName?: string | null;
}) {
  const [desde, setDesde] = useState<string>(currentMonthRange().first);
  const [hasta, setHasta] = useState<string>(currentMonthRange().today);
  const [loading, setLoading] = useState(false);
  const [vm, setVm] = useState<any | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!coachCode) return;
      try {
        const cacheKey = getMetricsCacheKey(coachCode, desde, hasta);
        let hasFreshCache = false;

        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as {
              savedAt: number;
              data: any;
            };
            const age = Date.now() - Number(cached?.savedAt ?? 0);
            if (cached?.data) {
              setVm(cached.data);
              hasFreshCache = age >= 0 && age <= METRICS_CACHE_TTL_MS;
            }
          }
        } catch {}

        if (hasFreshCache) {
          console.log("[PersonalMetrics] 📦 Usando datos de CACHE para", coachCode, "desde:", desde, "hasta:", hasta);
          setLoading(false);
          setProgress(0);
          return;
        }

        setLoading(true);
        setProgress(0);
        console.log("[PersonalMetrics] 🔄 Fetching métricas para", coachCode, "desde:", desde, "hasta:", hasta);
        const res = await fetchMetrics(desde, hasta, coachCode);
        if (!active) return;
        const nextVm = (res?.data as any)?.teams ?? null;
        console.log("[PersonalMetrics] 📊 ViewModel recibido:", nextVm);
        setVm(nextVm);
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              savedAt: Date.now(),
              data: nextVm,
            }),
          );
        } catch {}
      } catch (e) {
        console.error(e);
        if (active) setVm(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [coachCode, desde, hasta]);

  // Simulación de progreso mientras carga (0→90%) y finalizar en 100%
  useEffect(() => {
    if (!loading) {
      // completar a 100 y resetear luego de un breve tiempo
      setProgress((p) => (p < 95 ? 100 : 100));
      const t = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(t);
    }
    setProgress(5);
    const iv = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 7 + 3; // 3..10
        return Math.min(90, next);
      });
    }, 200);
    return () => clearInterval(iv);
  }, [loading]);

  const students = useMemo(() => {
    const arr = (vm?.clientsByCoachDetail || []) as any[];
    return Array.isArray(arr)
      ? arr.map((r) => ({
          id: r.id,
          name: r.nombre,
          code: r.codigo || null,
          state: r.estado || null,
          stage: r.etapa || null,
          tickets: r.tickets ?? null,
          ultima_actividad: r.ultima_actividad ?? null,
        }))
      : [];
  }, [vm]);

  useEffect(() => {
    if (!coachCode) return;
    if (!Array.isArray(students) || students.length === 0) {
      console.log("[teamsv2][metricas] sin alumnos para coach", coachCode);
      return;
    }

    const byStageMap = new Map<string, number>();
    for (const student of students) {
      const stage = String(student.stage || "Sin fase").trim() || "Sin fase";
      byStageMap.set(stage, (byStageMap.get(stage) ?? 0) + 1);
    }

    const byStage = Array.from(byStageMap.entries())
      .map(([fase, total]) => ({ fase, total }))
      .sort((a, b) => b.total - a.total || a.fase.localeCompare(b.fase));

    console.groupCollapsed(`[teamsv2][metricas] alumnos coach ${coachCode}`);
    console.log("alumnos", students);
    console.table(byStage);
    console.groupEnd();
  }, [coachCode, students]);

  const ticketsSeries = useMemo(() => vm?.ticketsSeries?.daily ?? [], [vm]);
  const ticketsByNameRaw = useMemo(() => vm?.ticketsByName ?? [], [vm]);
  const avgResolutionByStudent = useMemo(
    () => vm?.avgResolutionByStudent ?? [],
    [vm],
  );
  const ticketsByInformante = useMemo(
    () => vm?.ticketsByInformante ?? [],
    [vm],
  );
  const ticketsByInformanteByDay = useMemo(
    () => vm?.ticketsByInformanteByDay ?? [],
    [vm],
  );
  // Normalized tickets array: { name, count }
  const normalizedTicketsByName = useMemo(() => {
    const raw = vm?.ticketsByName ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      name:
        String(
          t.name ?? t.alumno ?? t.nombre ?? t.codigo_alumno ?? t.codigo ?? "",
        ).trim() || "Sin Alumno",
      count: Number(t.count ?? t.cantidad ?? t.tickets ?? 0) || 0,
    }));
  }, [vm]);

  // Build avgResolution map keyed by name and code
  const avgResolutionMap = useMemo(() => {
    const m = new Map<
      string,
      { minutes: number | null; hours: number | null; hms: string }
    >();
    const arr =
      vm?.avgResolutionByStudent ?? vm?.avgResolutionByCoach?.detalle ?? [];
    for (const r of arr || []) {
      const name = String(r.name ?? r.nombre ?? "").trim();
      const code = String(
        r.code ?? r.codigo ?? r.codigo_alumno ?? r.codigo_alumno ?? "",
      ).trim();
      const minutes =
        r.avg_minutes != null ? Number(r.avg_minutes) : (r.avg_minutes ?? null);
      const hours =
        r.avg_hours != null ? Number(r.avg_hours) : (r.avg_hours ?? null);
      const hms = r.avg_time_hms ?? r.avg_time_hms ?? "";
      if (name) m.set(name, { minutes, hours, hms });
      if (code) m.set(code, { minutes, hours, hms });
    }
    return m;
  }, [vm]);
  const slowest = useMemo(() => vm?.slowestResponseTicket ?? null, [vm]);

  const aggPhase = useMemo(() => vm?.clientsByPhaseAgg ?? [], [vm]);
  const detailsPhase = useMemo(() => vm?.clientsByPhaseDetails ?? [], [vm]);
  const aggState = useMemo(() => vm?.clientsByStateAgg ?? [], [vm]);
  const detailsState = useMemo(() => vm?.clientsByStateDetails ?? [], [vm]);

  // Derive summary for ResolutionAndRateCard from ticketsByEstado (source of truth)
  const avgResSummary = vm?.avgResolutionSummary ?? null;
  const resolutionBreakdown = useMemo(() => {
    const byStatus: Array<{ estado: string; cantidad: number }> = Array.isArray(vm?.ticketsByEstado)
      ? (vm.ticketsByEstado as any[])
      : [];
    const resolved = byStatus
      .filter((it) => it.estado === "RESUELTO")
      .reduce((acc, it) => acc + (Number(it.cantidad ?? 0) || 0), 0);
    const eliminated = byStatus
      .filter((it) => it.estado === "ELIMINADO")
      .reduce((acc, it) => acc + (Number(it.cantidad ?? 0) || 0), 0);
    const inProgress = byStatus
      .filter((it) => it.estado === "EN_PROGRESO")
      .reduce((acc, it) => acc + (Number(it.cantidad ?? 0) || 0), 0);
    const pendingDeEnvio = byStatus
      .filter((it) => it.estado === "PENDIENTE_DE_ENVIO")
      .reduce((acc, it) => acc + (Number(it.cantidad ?? 0) || 0), 0);
    // Total excluye ELIMINADO para calcular la tasa de resolución real
    const totalForRate = resolved + inProgress + pendingDeEnvio;

    console.log("[PersonalMetrics] 🔶 ResolutionAndRateCard inputs:", {
      avgResSummary: vm?.avgResolutionSummary,
      ticketsByEstado: byStatus,
      resolved,
      inProgress,
      pendingDeEnvio,
      eliminated,
      totalForRate,
    });

    return { resolved, eliminated, inProgress, pendingDeEnvio, totalForRate };
  }, [vm]);

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-3">
        <div className="flex-1 text-sm text-neutral-600">
          Rango: <strong>{desde}</strong> → <strong>{hasta}</strong>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {loading && (
        <div className="relative">
          <div className="flex items-center justify-center py-16">
            <CircularProgress value={progress} />
          </div>
          <div className="text-center text-sm text-neutral-500">
            Cargando métricas… {Math.round(progress)}%
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Donas en 3 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            <StudentsPhaseDonut
              students={students}
              coachName={coachName || coachCode || "Coach"}
              aggData={aggPhase}
              details={detailsPhase}
            />
            <CoachStudentsDistributionChart
              students={students.map((s) => ({ ...s, ticketsCount: null }))}
              mode="fase"
              onModeChange={() => {}}
              coachName={coachName || coachCode || "Coach"}
              showToggle={false}
              aggState={aggState}
              aggPhase={aggPhase}
              detailsState={detailsState}
              detailsPhase={detailsPhase}
            />
            <TicketsByStudentDonut data={normalizedTicketsByName} />
          </div>

          {/* KPI de resolución y abajo el ticket más lento; a la derecha la serie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            <div className="col-span-1 space-y-6">
              <ResolutionAndRateCard
                avgMinutes={avgResSummary?.avg_minutes}
                avgHms={avgResSummary?.avg_time_hms}
                resolved={resolutionBreakdown.resolved}
                total={resolutionBreakdown.totalForRate}
                inProgress={resolutionBreakdown.inProgress}
                pendingDeEnvio={resolutionBreakdown.pendingDeEnvio}
              />
              {slowest ? (
                <SlowestResponseCard ticket={slowest} />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-neutral-500">
                  No hay ticket lento para el rango seleccionado.
                </div>
              )}
            </div>
            <div className="col-span-1 lg:col-span-2">
              <TicketsByPeriodBar data={ticketsSeries} />
            </div>
          </div>

          {/* Tickets por alumno (barra) */}
          <div className="grid grid-cols-1 gap-6 w-full">
            <TicketsByStudentBar
              data={normalizedTicketsByName}
              avgResolution={avgResolutionMap}
              initialLimit={25}
              showLimiter={true}
            />
          </div>

          {/* Informantes y Sesiones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <div className="space-y-3">
              <TicketsByInformanteBar
                data={{
                  ticketsByInformante,
                  ticketsByInformanteByDay,
                }}
              />
            </div>
            <div className="space-y-3">
              <SessionsMetrics
                overview={vm?.sessionsOverview}
                trends={vm?.sessionsTrends}
                byCoach={vm?.sessionsByCoach}
                byAlumno={vm?.sessionsByAlumno}
                conversion={vm?.sessionsConversion}
                topCoaches={vm?.sessionsTopCoaches}
                titleText="Sesiones (coach)"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
