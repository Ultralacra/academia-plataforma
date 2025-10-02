"use client";

import { PieCard, BarCard, PieCardSkeleton, BarCardSkeleton } from "./charts";
import PhaseMetrics from "./phase-metrics";
import RetentionKPIs from "./retention-kpis";
import NoTasksKPIs from "./no-tasks-kpis";
import TransitionsPanel from "./transitions-panel";
import type { LifecycleItem } from "./phase-faker";

export default function ChartsSection({
  loading,
  distByState,
  distByStage,
  byJoinDate,
  phaseItems = [],
  lifecycleItems = [],
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
  onOpenList: (
    title: string,
    rows: Array<{
      code?: string | null;
      name?: string | null;
      subtitle?: string;
    }>
  ) => void;
}) {
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

      {/* Promedios por fase (usa faker de pasos) */}
      <div className="mt-2">
        <PhaseMetrics items={phaseItems} />
      </div>

      {/* Retención (usa lifecycleItems) */}
      <div className="mt-2">
        <RetentionKPIs items={lifecycleItems ?? []} />
      </div>

      {/* Sin tareas */}
      <div className="mt-2">
        <NoTasksKPIs items={lifecycleItems ?? []} onOpenList={onOpenList} />
      </div>

      {/* Transiciones con tabs y click para ver listado */}
      <div className="mt-2">
        <TransitionsPanel
          items={lifecycleItems ?? []}
          onOpenList={onOpenList}
        />
      </div>
    </>
  );
}
