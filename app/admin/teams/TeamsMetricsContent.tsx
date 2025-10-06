"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService } from "@/lib/data-service";
import Filters from "./Filters";
import KPIs from "./KPIs";
import TicketsSummary from "./TicketsSummary";
import TicketsSeriesChart from "./TicketsSeries";
import ResponseCharts from "./ResponseCharts";
import ProductivityCharts from "./ProductivityCharts";
import Charts from "./Charts";
import CreatedMetricsContent from "./CreatedMetricsContent";

type TicketsSeriesVM = {
  daily: Array<{ date: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
};

function RangeBadge({
  from,
  to,
  fetchedAt,
}: {
  from?: string | null;
  to?: string | null;
  fetchedAt?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs shadow-sm">
      <span className="rounded-lg bg-gray-50 px-2 py-0.5">
        Rango consultado: <b>{from ?? "—"}</b> → <b>{to ?? "—"}</b>
      </span>
      {fetchedAt && (
        <span className="text-muted-foreground">
          actualizado: {new Date(fetchedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}

export default function TeamsMetricsContent() {
  // filtros simples
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // estado de carga y modelo
  const [loading, setLoading] = useState(true);

  // “view model” ya normalizado para los componentes existentes
  const [vm, setVm] = useState<{
    meta?: {
      range?: { from?: string | null; to?: string | null };
      fetchedAt?: string;
    };
    totals: {
      teams: number;
      studentsTotal: number;
      ticketsTotal: number;
      avgResponseMin: number;
      avgResolutionMin: number;
    };
    alumnosPorEquipo: { name: string; alumnos: number }[];
    areasCount: { area: string; count: number }[];
    ticketsPer: { day: number; week: number; month: number };
    ticketsSeries: TicketsSeriesVM;
    respByCoach: {
      coach: string;
      response: number;
      resolution: number;
      tickets: number;
    }[];
    respByTeam: {
      team: string;
      response: number;
      resolution: number;
      tickets: number;
    }[];
    prodByCoach: {
      coach: string;
      tickets: number;
      sessions: number;
      hours: number;
    }[];
    createdBlock: {
      rows: Array<{
        area: string | null;
        codigo_equipo: string;
        nombre_coach: string;
        puesto: string | null;
        tickets?: number;
        avgResponse?: number;
        avgResolution?: number | string;
        statusDist?: Record<string, number>;
      }>;
      totals?: { coaches?: number; teams?: number; tickets?: number };
    } | null;
  }>({
    meta: undefined,
    totals: {
      teams: 0,
      studentsTotal: 0,
      ticketsTotal: 0,
      avgResponseMin: 0,
      avgResolutionMin: 0,
    },
    alumnosPorEquipo: [],
    areasCount: [],
    ticketsPer: { day: 0, week: 0, month: 0 },
    ticketsSeries: { daily: [], weekly: [], monthly: [] },
    respByCoach: [],
    respByTeam: [],
    prodByCoach: [],
    createdBlock: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await dataService.getMetrics({
          fechaDesde: desde || undefined,
          fechaHasta: hasta || undefined,
        });

        const root = (res?.data as any) ?? {};
        const teams = root?.teams ?? {};
        const total = root?.teams?.totals ?? root?.teams?.total ?? {};

        // Totales
        const totals = {
          teams: Number(total?.teams ?? 0) || 0,
          studentsTotal: Number(total?.studentsTotal ?? 0) || 0,
          ticketsTotal: Number(total?.ticketsTotal ?? 0) || 0,
          avgResponseMin: Number(total?.avgResponseMin ?? 0) || 0,
          avgResolutionMin: Number(total?.avgResolutionMin ?? 0) || 0,
        };

        // Top equipos por alumnos
        const alumnosPorEquipo: { name: string; alumnos: number }[] =
          Array.isArray(teams.alumnosPorEquipo)
            ? teams.alumnosPorEquipo.map((r: any) => ({
                name: String(r.name ?? r.nombre ?? r.coach ?? ""),
                alumnos: Number(r.alumnos ?? r.count ?? 0) || 0,
              }))
            : [];

        // Equipos por área
        const areasCount: { area: string; count: number }[] = Array.isArray(
          teams.areasCount
        )
          ? teams.areasCount.map((r: any) => ({
              area: String(r.area ?? "Sin área"),
              count: Number(r.count ?? r.cantidad ?? 0) || 0,
            }))
          : [];

        // Tickets per
        const ticketsPer = {
          day: Number(teams.ticketsPer?.day ?? teams.ticketsPer?.dia ?? 0) || 0,
          week:
            Number(teams.ticketsPer?.week ?? teams.ticketsPer?.semana ?? 0) ||
            0,
          month:
            Number(teams.ticketsPer?.month ?? teams.ticketsPer?.mes ?? 0) || 0,
        };

        // Series
        const ticketsSeries: TicketsSeriesVM = {
          daily: Array.isArray(teams.ticketsSeries?.daily)
            ? teams.ticketsSeries.daily.map((d: any) => ({
                date: String(d.date ?? d.day ?? d.label ?? ""),
                count: Number(d.count ?? 0) || 0,
              }))
            : [],
          weekly: Array.isArray(teams.ticketsSeries?.weekly)
            ? teams.ticketsSeries.weekly.map((d: any) => ({
                week: String(d.week_start ?? d.week ?? d.start ?? ""),
                count: Number(d.count ?? 0) || 0,
              }))
            : [],
          monthly: Array.isArray(teams.ticketsSeries?.monthly)
            ? teams.ticketsSeries.monthly.map((d: any) => ({
                month: String(d.month ?? d.mes ?? d.label ?? ""),
                count: Number(d.count ?? 0) || 0,
              }))
            : [],
        };

        // Respuesta por coach
        const respByCoach =
          Array.isArray(teams.respByCoach) && teams.respByCoach.length
            ? teams.respByCoach.map((r: any) => ({
                coach: String(r.coach ?? r.nombre ?? r.name ?? ""),
                tickets: Number(r.tickets ?? 0) || 0,
                response: Number(r.responseMin ?? r.response ?? 0) || 0,
                resolution: Number(r.resolutionMin ?? r.resolution ?? 0) || 0,
              }))
            : [];

        // Respuesta por equipo
        const respByTeam =
          Array.isArray(teams.respByTeam) && teams.respByTeam.length
            ? teams.respByTeam.map((r: any) => ({
                team: String(r.team ?? r.nombre ?? r.name ?? ""),
                tickets: Number(r.tickets ?? 0) || 0,
                response: Number(r.responseMin ?? r.response ?? 0) || 0,
                resolution: Number(r.resolutionMin ?? r.resolution ?? 0) || 0,
              }))
            : [];

        // Productividad por coach
        const prodByCoach =
          Array.isArray(teams.prodByCoach) && teams.prodByCoach.length
            ? teams.prodByCoach.map((r: any) => ({
                coach: String(r.coach ?? r.nombre ?? r.name ?? ""),
                tickets: Number(r.tickets ?? 0) || 0,
                sessions: Number(r.sessions ?? 0) || 0,
                hours: Number(r.hours ?? 0) || 0,
              }))
            : [];

        // Bloque "created"
        const createdBlock = root?.teams?.total?.created?.rows?.length
          ? {
              rows: (root.teams.total.created.rows as any[]).map((r) => ({
                area: (r.area ?? null) as string | null,
                codigo_equipo: String(r.codigo_equipo ?? ""),
                nombre_coach: String(r.nombre_coach ?? ""),
                puesto: (r.puesto ?? null) as string | null,
                tickets: Number(r.tickets ?? 0) || 0,
                avgResponse: Number(r.avgResponse ?? 0) || 0,
                avgResolution: Number(r.avgResolution ?? 0) || 0,
                statusDist: {
                  Abiertos: Number(r?.statusDist?.Abiertos ?? 0) || 0,
                  "En Proceso":
                    Number(
                      r?.statusDist?.["En_Proceso"] ??
                        r?.statusDist?.["En Proceso"] ??
                        0
                    ) || 0,
                  Cerrados: Number(r?.statusDist?.Cerrados ?? 0) || 0,
                },
              })),
              totals: {
                coaches:
                  Number(root?.teams?.total?.created?.totals?.coaches ?? 0) ||
                  0,
                teams:
                  Number(root?.teams?.total?.created?.totals?.teams ?? 0) || 0,
                tickets:
                  Number(root?.teams?.total?.created?.totals?.tickets ?? 0) ||
                  0,
              },
            }
          : null;

        // Filter client-side por search
        const matchesSearch = (s: string) =>
          (search || "").trim()
            ? s.toLowerCase().includes(search.trim().toLowerCase())
            : true;

        const alumnosPorEquipoFiltered = alumnosPorEquipo.filter((r) =>
          matchesSearch(r.name)
        );
        const respByCoachFiltered = respByCoach.filter((r) =>
          matchesSearch(r.coach)
        );
        const respByTeamFiltered = respByTeam.filter((r) =>
          matchesSearch(r.team)
        );
        const prodByCoachFiltered = prodByCoach.filter((r) =>
          matchesSearch(r.coach)
        );
        const createdBlockFiltered = createdBlock
          ? {
              ...createdBlock,
              rows: createdBlock.rows.filter(
                (r) =>
                  matchesSearch(r.nombre_coach) ||
                  matchesSearch(r.codigo_equipo) ||
                  matchesSearch(r.area ?? "")
              ),
            }
          : null;

        if (!alive) return;
        setVm({
          meta: {
            range: root?.meta?.range,
            fetchedAt: root?.meta?.fetchedAt,
          },
          totals,
          alumnosPorEquipo: alumnosPorEquipoFiltered,
          areasCount, // no filtra por search
          ticketsPer,
          ticketsSeries,
          respByCoach: respByCoachFiltered,
          respByTeam: respByTeamFiltered,
          prodByCoach: prodByCoachFiltered,
          createdBlock: createdBlockFiltered,
        });
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setVm({
          meta: undefined,
          totals: {
            teams: 0,
            studentsTotal: 0,
            ticketsTotal: 0,
            avgResponseMin: 0,
            avgResolutionMin: 0,
          },
          alumnosPorEquipo: [],
          areasCount: [],
          ticketsPer: { day: 0, week: 0, month: 0 },
          ticketsSeries: { daily: [], weekly: [], monthly: [] },
          respByCoach: [],
          respByTeam: [],
          prodByCoach: [],
          createdBlock: null,
        });
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [desde, hasta, search]);

  return (
    <div className="space-y-6">
      <Filters
        search={search}
        onSearch={setSearch}
        desde={desde}
        hasta={hasta}
        onDesde={setDesde}
        onHasta={setHasta}
      />

      <div className="flex items-center justify-between">
        <RangeBadge
          from={vm.meta?.range?.from ?? (desde || null)}
          to={vm.meta?.range?.to ?? (hasta || null)}
          fetchedAt={vm.meta?.fetchedAt}
        />
        {loading && (
          <span className="text-xs text-muted-foreground">
            Cargando métricas…
          </span>
        )}
      </div>

      {/* Aviso si no hay datos en el rango */}
      {!loading && vm.ticketsSeries.daily.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay datos para el rango seleccionado ({vm.meta?.range?.from ?? "—"}{" "}
          → {vm.meta?.range?.to ?? "—"}). Ajusta las fechas o intenta otro
          filtro.
        </div>
      )}

      {/* KPIs principales */}
      <KPIs
        totalEquipos={vm.totals.teams}
        totalAlumnos={vm.totals.studentsTotal}
        areas={new Set(vm.areasCount.map((a) => a.area)).size}
      />

      <TicketsSummary
        totals={{
          ticketsTotal: vm.totals.ticketsTotal,
          avgResponseMin: vm.totals.avgResponseMin,
          avgResolutionMin: vm.totals.avgResolutionMin,
        }}
        per={vm.ticketsPer}
      />

      <TicketsSeriesChart series={vm.ticketsSeries} />

      <ResponseCharts byCoach={vm.respByCoach} byTeam={vm.respByTeam} />

      <ProductivityCharts rows={vm.prodByCoach} />

      <Charts
        alumnosPorEquipo={vm.alumnosPorEquipo}
        areasCount={vm.areasCount}
      />

      {vm.createdBlock && (
        <CreatedMetricsContent initialRows={vm.createdBlock.rows} />
      )}
    </div>
  );
}
