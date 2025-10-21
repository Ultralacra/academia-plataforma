"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMetrics } from "@/app/admin/teams/teamsApi";
import StudentsPhaseDonut from "@/app/admin/teams/StudentsPhaseDonut";
import CoachStudentsDistributionChart from "@/app/admin/teams/CoachStudentsDistributionChart";
import ResolutionAndRateCard from "@/app/admin/teams/ResolutionAndRateCard";
import TicketsByPeriodBar from "@/app/admin/teams/TicketsByPeriodBar";
import TicketsByStudentBar from "@/app/admin/teams/TicketsByStudentBar";
import TicketsByStudentDonut from "@/app/admin/teams/TicketsByStudentDonut";
import SlowestResponseCard from "@/app/admin/teams/SlowestResponseCard";

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

  useEffect(() => {
    let active = true;
    (async () => {
      if (!coachCode) return;
      try {
        setLoading(true);
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

  const students = useMemo(() => {
    const arr = (vm?.clientsByCoachDetail || []) as any[];
    return Array.isArray(arr)
      ? arr.map((r) => ({
          id: r.id,
          name: r.nombre,
          code: r.codigo || null,
          state: r.estado || null,
          stage: r.etapa || null,
        }))
      : [];
  }, [vm]);

  const ticketsSeries = useMemo(() => vm?.ticketsSeries?.daily ?? [], [vm]);
  const ticketsByName = useMemo(() => vm?.ticketsByName ?? [], [vm]);
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

  // Derive a small summary for ResolutionAndRateCard
  const avgResSummary = vm?.avgResolutionSummary ?? null;

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
        <div className="text-sm text-neutral-500">Cargando métricas…</div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            <StudentsPhaseDonut
              students={students}
              coachName={coachName || coachCode || "Coach"}
              aggData={aggPhase}
              details={detailsPhase}
            />
            <div className="col-span-1 md:col-span-1 lg:col-span-2">
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
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            <div className="col-span-1">
              <ResolutionAndRateCard
                avgMinutes={avgResSummary?.avg_minutes}
                avgHms={avgResSummary?.avg_time_hms}
                resolved={avgResSummary?.tickets_resueltos}
                total={vm?.ticketsTotal ?? 0}
              />
            </div>
            <div className="col-span-2">
              <TicketsByPeriodBar data={ticketsSeries} />
            </div>
          </div>

          {/* Slowest ticket + Tickets por alumno */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            <div className="col-span-1">
              {slowest ? (
                <SlowestResponseCard ticket={slowest} />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-neutral-500">
                  No hay ticket lento para el rango seleccionado.
                </div>
              )}
            </div>

            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <TicketsByStudentBar
                data={ticketsByName}
                avgResolution={avgResolutionMap}
                initialLimit={25}
                showLimiter={true}
              />

              <TicketsByStudentDonut
                data={ticketsByName.map((t: any) => ({
                  name: t.name,
                  count: t.count,
                }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
