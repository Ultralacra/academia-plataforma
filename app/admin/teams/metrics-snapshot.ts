"use client";

// TeamsMetrics structure comes from the metrics endpoint; use a generic any type here
type TeamsMetrics = any;
import type { CreatedTeamMetric } from "./metrics-created";

export type TeamsMetricsSnapshot = {
  version: "teams-metrics@1";
  generatedAt: string;
  data: {
    teams: TeamsMetrics;
    created: {
      totals: { teams: number; coaches: number; tickets: number };
      rows: CreatedTeamMetric[];
    };
  };
};

/**
 * Construye el JSON único que queremos imprimir/compartir con el backend.
 * - `teams`: todas las métricas de la vista principal (Tickets, KPIs, series, tiempos, coaches, etc.)
 * - `created`: métricas de "Equipos conformados" (tablas y charts de created*)
 */
export function buildMetricsSnapshot(args: {
  teamsModel: TeamsMetrics;
  createdRows: CreatedTeamMetric[];
}): TeamsMetricsSnapshot {
  const totals = {
    teams: args.createdRows.length,
    coaches: new Set(args.createdRows.map((r) => r.nombre_coach)).size,
    tickets: args.createdRows.reduce((acc, r) => acc + r.tickets, 0),
  };

  return {
    version: "teams-metrics@1",
    generatedAt: new Date().toISOString(),
    data: {
      teams: args.teamsModel,
      created: {
        totals,
        rows: args.createdRows,
      },
    },
  };
}
