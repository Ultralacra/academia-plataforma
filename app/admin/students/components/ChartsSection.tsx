"use client";

import { PieCard, BarCard, PieCardSkeleton, BarCardSkeleton } from "./charts";
import PhaseMetrics from "./phase-metrics";
import RetentionKPIs from "./retention-kpis";
import StagesBreakdown from "./stages-breakdown";
import TasksMetrics from "./tasks-metrics";

export default function ChartsSection({
  loading,
  distByState,
  distByStage,
  byJoinDate,
  fechaDesde,
  fechaHasta,
}: {
  loading: boolean;
  distByState: Array<{ name: string; value: number }>;
  distByStage: Array<{ name: string; value: number }>;
  byJoinDate: Array<{ date: string; count: number }>;
  fechaDesde?: string;
  fechaHasta?: string;
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

      {/* Promedios por fase (desde API metrics-retention) */}
      <div className="mt-2">
        <PhaseMetrics fechaDesde={fechaDesde} fechaHasta={fechaHasta} />
      </div>

      {/* Retención / permanencia (desde API metrics-retention) */}
      <div className="mt-2">
        <RetentionKPIs fechaDesde={fechaDesde} fechaHasta={fechaHasta} />
      </div>

      {/* Desglose por etapas: byEtapa, lastPerClient, transiciones */}
      <div className="mt-2">
        <StagesBreakdown fechaDesde={fechaDesde} fechaHasta={fechaHasta} />
      </div>

      {/* Métricas de tareas: ticket más lento, ultimas_tareas_resumen, estados_resumen */}
      <div className="mt-2">
        <TasksMetrics fechaDesde={fechaDesde} fechaHasta={fechaHasta} />
      </div>
    </>
  );
}
