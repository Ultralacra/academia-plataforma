"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService } from "@/lib/data-service";
import {
  buildCreatedMetrics,
  buildCreatedMetricsSample,
  type CreatedTeamMetric,
} from "./metrics-created";
import CreatedKPIs from "./CreatedKPIs";
import CreatedCharts from "./CreatedCharts";
import CreatedResponseCharts from "./CreatedResponseCharts";
import CreatedStatusChart from "./CreatedStatusChart";
import CreatedTable from "./CreatedTable";

export default function CreatedMetricsContent() {
  const [loading, setLoading] = useState(true);
  const [totalTeams, setTotalTeams] = useState(0);
  const [metrics, setMetrics] = useState<CreatedTeamMetric[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [total, detail] = await Promise.all([
          dataService.getTeamsCreated(),
          dataService.getTeamsCreatedDetail(),
        ]);
        if (!alive) return;

        const built = buildCreatedMetrics(detail);
        setMetrics(built.length ? built : buildCreatedMetricsSample());
        setTotalTeams(total?.data?.total_teams ?? (built.length || 5));
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setMetrics(buildCreatedMetricsSample());
        setTotalTeams(5);
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totals = useMemo(
    () => ({
      teams: totalTeams,
      coaches: new Set(metrics.map((m) => m.nombre_coach)).size,
      tickets: metrics.reduce((acc, m) => acc + m.tickets, 0),
    }),
    [metrics, totalTeams]
  );

  return (
    <div className="space-y-6">
      <CreatedKPIs {...totals} />
      <CreatedCharts rows={metrics} />
      <CreatedResponseCharts rows={metrics} />
      <CreatedStatusChart rows={metrics} />
      <CreatedTable rows={metrics} loading={loading} />
    </div>
  );
}
