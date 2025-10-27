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
// Tabla completa se deja en pestaña Detalles; no se muestra en Métricas

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const today = `${y}-${String(m + 1).padStart(2, "0")}-${String(
    now.getDate()
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
        setLoading(true);
        setProgress(0);
        const res = await fetchMetrics(desde, hasta, coachCode);
        if (!active) return;
        setVm((res?.data as any)?.teams ?? null);
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

  const ticketsSeries = useMemo(() => vm?.ticketsSeries?.daily ?? [], [vm]);
  const ticketsByNameRaw = useMemo(() => vm?.ticketsByName ?? [], [vm]);
  const avgResolutionByStudent = useMemo(
    () => vm?.avgResolutionByStudent ?? [],
    [vm]
  );
  // Normalized tickets array: { name, count }
  const normalizedTicketsByName = useMemo(() => {
    const raw = vm?.ticketsByName ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      name:
        String(
          t.name ?? t.alumno ?? t.nombre ?? t.codigo_alumno ?? t.codigo ?? ""
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
        r.code ?? r.codigo ?? r.codigo_alumno ?? r.codigo_alumno ?? ""
      ).trim();
      const minutes =
        r.avg_minutes != null ? Number(r.avg_minutes) : r.avg_minutes ?? null;
      const hours =
        r.avg_hours != null ? Number(r.avg_hours) : r.avg_hours ?? null;
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

  // Derive summary for ResolutionAndRateCard and correct total for rate
  const avgResSummary = vm?.avgResolutionSummary ?? null;
  const totalTicketsForStatus = useMemo(() => {
    const byStatus = Array.isArray(vm?.ticketsByEstado)
      ? (vm.ticketsByEstado as any[])
      : [];
    const sum = byStatus.reduce(
      (acc, it) => acc + (Number(it.cantidad ?? 0) || 0),
      0
    );
    const fallback = Number(vm?.ticketsTotal ?? 0) || 0;
    return sum > 0 ? sum : fallback;
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
                resolved={avgResSummary?.tickets_resueltos}
                total={totalTicketsForStatus}
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
        </>
      )}
    </div>
  );
}
