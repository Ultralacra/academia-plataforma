"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type TeamCreatedDetail } from "@/lib/data-service";
import CreatedKPIs from "./CreatedKPIs";
import CreatedCharts from "./CreatedCharts";
import CreatedResponseCharts from "./CreatedResponseCharts";
import CreatedStatusChart from "./CreatedStatusChart";
import CreatedTable from "./CreatedTable";
import type { CreatedTeamMetric } from "./metrics-created";

type Props = {
  /** Si viene precargado desde getMetrics() lo usamos tal cual */
  initialRows?: Array<{
    area: string | null;
    codigo_equipo: string;
    nombre_coach: string;
    puesto: string | null;
    tickets?: number;
    avgResponse?: number;
    avgResolution?: number | string;
    statusDist?: Record<string, number>;
  }>;
  /** NUEVO: tickets por coach desde prodByCoachV2 */
  prodByCoachV2?: Array<{ coach: string; tickets: number }>;
};

export default function CreatedMetricsContent({
  initialRows,
  prodByCoachV2,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CreatedTeamMetric[]>([]);
  const [totals, setTotals] = useState<{
    teams: number;
    coaches: number;
    tickets: number;
  }>({
    teams: 0,
    coaches: 0,
    tickets: 0,
  });

  // Mapa rápido coach -> ticketsV2
  const v2Map = useMemo(() => {
    const m = new Map<string, number>();
    (prodByCoachV2 ?? []).forEach((x) => {
      m.set(String(x.coach).trim().toLowerCase(), Number(x.tickets) || 0);
    });
    return m;
  }, [prodByCoachV2]);

  // Helper para normalizar el row a CreatedTeamMetric
  const normalize = (r: any): CreatedTeamMetric => {
    const status = r?.statusDist ?? {};
    const enProceso = status["En Proceso"] ?? status.En_Proceso ?? 0;

    // avgResolution en backend puede venir como string (horas) — lo convertimos a número
    const avgResNum = Number(r.avgResolution ?? 0) || 0;
    const avgRespNum = Number(r.avgResponse ?? 0) || 0;

    const coach = String(r.nombre_coach ?? "").trim();
    const v2 = v2Map.get(coach.toLowerCase());

    return {
      codigo_equipo: String(r.codigo_equipo ?? ""),
      nombre_coach: coach,
      puesto: (r.puesto ?? "—") as string,
      area: (r.area ?? "—") as string,
      tickets: Number(r.tickets ?? 0) || 0,
      // Tus componentes de “created” siempre han mostrado **minutos**;
      // si tu backend envía horas, podrías multiplicar por 60 aquí si lo necesitas.
      avgResponse: Math.round(avgRespNum),
      avgResolution: Math.round(avgResNum),
      statusDist: {
        Abiertos: Number(status.Abiertos ?? 0) || 0,
        Cerrados: Number(status.Cerrados ?? 0) || 0,
        "En Proceso": Number(enProceso ?? 0) || 0,
      },
      ticketsV2: typeof v2 === "number" ? v2 : undefined,
    };
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (initialRows?.length) {
          // 1) Si ya viene del endpoint de metrics, úsalo
          const mapped = initialRows.map(normalize);
          if (!alive) return;
          setRows(mapped);
          const coaches = new Set(mapped.map((m) => m.nombre_coach)).size;
          const tickets = mapped.reduce((acc, m) => acc + (m.tickets ?? 0), 0);
          setTotals({ teams: mapped.length, coaches, tickets });
        } else {
          // 2) Fallback: usar endpoints “created”
          const [total, detail] = await Promise.all([
            dataService.getTeamsCreated(),
            dataService.getTeamsCreatedDetail(),
          ]);
          if (!alive) return;

          const rawRows = (detail?.data ?? []).flatMap((cli: any) =>
            Array.isArray(cli?.equipos)
              ? cli.equipos.map((e: any) => ({
                  codigo_equipo: e.codigo_equipo,
                  nombre_coach: e.nombre_coach,
                  puesto: e.puesto,
                  area: e.area,
                  tickets: Number(cli?.cantidad_tickets ?? 0) || 0,
                  avgResponse: 0,
                  avgResolution: 0,
                  statusDist: {
                    Abiertos: 0,
                    Cerrados: Number(cli?.cantidad_tickets ?? 0) || 0,
                    "En Proceso": 0,
                  },
                }))
              : []
          );

          const mapped = rawRows.map(normalize);
          setRows(mapped);
          setTotals({
            teams:
              Number(total?.data?.total_teams ?? mapped.length) ||
              mapped.length,
            coaches: new Set(mapped.map((m) => m.nombre_coach)).size,
            tickets: mapped.reduce((acc, m) => acc + (m.tickets ?? 0), 0),
          });
        }
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setRows([]);
        setTotals({ teams: 0, coaches: 0, tickets: 0 });
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [initialRows, v2Map]);

  const kpis = useMemo(
    () => ({
      teams: totals.teams,
      coaches: totals.coaches,
      tickets: totals.tickets,
    }),
    [totals]
  );

  return (
    <div className="space-y-6">
      <CreatedKPIs
        teams={kpis.teams}
        coaches={kpis.coaches}
        tickets={kpis.tickets}
      />
      {/*  <CreatedCharts rows={rows} /> */}
      {/*  <CreatedResponseCharts rows={rows} /> */}
      <CreatedStatusChart rows={rows} />
      {/*  <CreatedTable rows={rows} loading={loading} /> */}
    </div>
  );
}
