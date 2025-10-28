"use client";

import { PieCard, BarCard, PieCardSkeleton, BarCardSkeleton } from "./charts";
import PhaseMetrics from "./phase-metrics";
import RetentionKPIs from "./retention-kpis";
import NoTasksKPIs from "./no-tasks-kpis";
import TransitionsPanel from "./transitions-panel";
import type { LifecycleItem } from "./phase-faker";
import type { ClientItem } from "@/lib/data-service";

export default function ChartsSection({
  loading,
  distByState,
  distByStage,
  byJoinDate,
  phaseItems = [],
  lifecycleItems = [],
  students = [], // <-- DEFAULT
  onOpenList,
}: {
  loading: boolean;
  distByState: Array<{ name: string; value: number }>;
  distByStage: Array<{ name: string; value: number }>;
  byJoinDate: Array<{ date: string; count: number }>;
  phaseItems: Array<{
    ingreso?: string | null;
    paso_f1?: string | null;
    paso_f2?: string | null;
    paso_f3?: string | null;
    paso_f4?: string | null;
    paso_f5?: string | null;
  }>;
  lifecycleItems?: LifecycleItem[];
  students?: ClientItem[]; // <-- NUEVO
  onOpenList: (
    title: string,
    rows: Array<{
      code?: string | null;
      name?: string | null;
      subtitle?: string;
    }>
  ) => void;
}) {
  // Fecha de corte específica solicitada para "Sin enviar tareas": 26 oct 2025
  // Formato ISO YYYY-MM-DD
  const NO_TASKS_TO_DATE = "2025-10-26";

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PieCardSkeleton />
          <PieCardSkeleton />
          <BarCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PieCard title="Distribución por Estado" data={distByState} />
          <PieCard title="Distribución por Etapa" data={distByStage} />
          <BarCard title="Clientes por día de ingreso" data={byJoinDate} />
        </div>
      )}

      {/* Promedios por fase */}
      <div className="mt-2">
        <PhaseMetrics items={phaseItems} loading={loading} />
      </div>

      {/* Retención / permanencia */}
      <div className="mt-2">
        <RetentionKPIs items={lifecycleItems ?? []} loading={loading} />
      </div>

      {/* Sin tareas (pasa lifecycle + students) */}
      <div className="mt-2">
        <NoTasksKPIs
          items={lifecycleItems ?? []}
          students={students} // <-- IMPORTANTE
          toDateISO={NO_TASKS_TO_DATE}
          onOpenList={onOpenList}
        />
      </div>

      {/* Transiciones (desde API clientes_etapas) */}
      <div className="mt-2">
        <TransitionsPanel onOpenList={onOpenList} />
      </div>
    </>
  );
}
