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
import TicketsByTeamTable, { TicketsByTeamApiRow } from "./TicketsByTeamTable";
import LoadingOverlay from "./LoadingOverlay";

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
  // filtros
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // gating de consulta por fechas
  const bothEmpty = !desde && !hasta;
  const bothSet = Boolean(desde && hasta);
  const shouldFetch = bothEmpty || bothSet;

  const [loading, setLoading] = useState(true);

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
    prodByCoachV2: { coach: string; tickets: number }[];
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
    ticketsByTeam: TicketsByTeamApiRow[];
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
    prodByCoachV2: [],
    createdBlock: null,
    ticketsByTeam: [],
  });

  useEffect(() => {
    let alive = true;

    // si solo hay una fecha, no consultamos
    if (!shouldFetch) {
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      try {
        // 1) Métricas
        const res = await dataService.getMetrics({
          fechaDesde: bothEmpty ? undefined : desde,
          fechaHasta: bothEmpty ? undefined : hasta,
        });

        // El backend envía { code, status, data: { teams: {...} } }
        const root = (res?.data as any) ?? {};
        const teams = root?.teams ?? {};
        const total = root?.teams?.totals ?? root?.teams?.total ?? {};

        const totals = {
          teams: Number(total?.teams ?? 0) || 0,
          studentsTotal: Number(total?.studentsTotal ?? 0) || 0,
          ticketsTotal: Number(total?.ticketsTotal ?? 0) || 0,
          avgResponseMin: Number(total?.avgResponseMin ?? 0) || 0,
          avgResolutionMin: Number(total?.avgResolutionMin ?? 0) || 0,
        };

        const alumnosPorEquipo: { name: string; alumnos: number }[] =
          Array.isArray(teams.alumnosPorEquipo)
            ? teams.alumnosPorEquipo.map((r: any) => ({
                name: String(r.name ?? r.nombre ?? r.coach ?? ""),
                alumnos: Number(r.alumnos ?? r.count ?? 0) || 0,
              }))
            : [];

        const areasCount: { area: string; count: number }[] = Array.isArray(
          teams.areasCount
        )
          ? teams.areasCount.map((r: any) => ({
              area: String(r.area ?? "Sin área"),
              count: Number(r.count ?? r.cantidad ?? 0) || 0,
            }))
          : [];

        const ticketsPer = {
          day: Number(teams.ticketsPer?.day ?? teams.ticketsPer?.dia ?? 0) || 0,
          week:
            Number(teams.ticketsPer?.week ?? teams.ticketsPer?.semana ?? 0) ||
            0,
          month:
            Number(teams.ticketsPer?.month ?? teams.ticketsPer?.mes ?? 0) || 0,
        };

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

        const respByCoach =
          Array.isArray(teams.respByCoach) && teams.respByCoach.length
            ? teams.respByCoach.map((r: any) => ({
                coach: String(r.coach ?? r.nombre ?? r.name ?? ""),
                tickets: Number(r.tickets ?? 0) || 0,
                response: Number(r.responseMin ?? r.response ?? 0) || 0,
                resolution: Number(r.resolutionMin ?? r.resolution ?? 0) || 0,
              }))
            : [];

        const respByTeam =
          Array.isArray(teams.respByTeam) && teams.respByTeam.length
            ? teams.respByTeam.map((r: any) => ({
                team: String(r.team ?? r.nombre ?? r.name ?? ""),
                tickets: Number(r.tickets ?? 0) || 0,
                response: Number(r.responseMin ?? r.response ?? 0) || 0,
                resolution: Number(r.resolutionMin ?? r.resolution ?? 0) || 0,
              }))
            : [];

        const prodByCoach =
          Array.isArray(teams.prodByCoach) && teams.prodByCoach.length
            ? teams.prodByCoach.map((r: any) => ({
                coach: String(r.coach ?? r.nombre ?? r.name ?? ""),
                tickets: Number(r.tickets ?? 0) || 0,
                sessions: Number(r.sessions ?? 0) || 0,
                hours: Number(r.hours ?? 0) || 0,
              }))
            : [];

        const prodByCoachV2 =
          Array.isArray(teams.prodByCoachV2) && teams.prodByCoachV2.length
            ? teams.prodByCoachV2.map((r: any) => ({
                coach: String(r.coach ?? r.nombre ?? r.name ?? ""),
                tickets: Number(r.tickets ?? 0) || 0,
              }))
            : [];

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

        // 2) Tickets por equipo — Tomar DIRECTO del API
        let ticketsByTeamApi: TicketsByTeamApiRow[] = Array.isArray(
          teams.ticketsByTeam
        )
          ? teams.ticketsByTeam.map((r: any) => ({
              etiqueta: String(r.etiqueta ?? r.team ?? "—"),
              team_signature: String(r.team_signature ?? ""),
              miembros: String(r.miembros ?? ""),
              clientes: String(r.clientes ?? ""),
              tickets_creados: Number(r.tickets_creados ?? 0) || 0,
              tickets_resueltos: Number(r.tickets_resueltos ?? 0) || 0,
              horas_promedio_resolucion:
                Number(r.horas_promedio_resolucion ?? 0) || 0,
              tasa_resolucion: Number(r.tasa_resolucion ?? 0) || 0, // 0..1
            }))
          : [];

        // Filtrado por búsqueda (etiqueta, firma, miembros, clientes)
        const q = search.trim().toLowerCase();
        if (q) {
          ticketsByTeamApi = ticketsByTeamApi.filter(
            (r) =>
              r.etiqueta.toLowerCase().includes(q) ||
              r.team_signature.toLowerCase().includes(q) ||
              r.miembros.toLowerCase().includes(q) ||
              r.clientes.toLowerCase().includes(q)
          );
        }

        if (!alive) return;
        setVm({
          meta: {
            range: root?.meta?.range,
            fetchedAt: root?.meta?.fetchedAt,
          },
          totals,
          alumnosPorEquipo,
          areasCount,
          ticketsPer,
          ticketsSeries,
          respByCoach,
          respByTeam,
          prodByCoach,
          prodByCoachV2,
          createdBlock,
          ticketsByTeam: ticketsByTeamApi,
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
          prodByCoachV2: [],
          createdBlock: null,
          ticketsByTeam: [],
        });
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [desde, hasta, search, bothEmpty, bothSet, shouldFetch]);

  // priorizamos prodByCoachV2 para el gráfico “Tickets por coach”.
  const rowsForProductivity = useMemo(
    () =>
      vm.prodByCoachV2.length
        ? vm.prodByCoachV2.map((r) => ({
            coach: r.coach,
            tickets: r.tickets,
            sessions: 0,
            hours: 0,
          }))
        : vm.prodByCoach,
    [vm.prodByCoachV2, vm.prodByCoach]
  );

  return (
    <div className="space-y-6 relative">
      {/* loading overlay a pantalla completa del bloque */}
      <LoadingOverlay active={loading} label="Cargando métricas…" />

      {/* aviso si sólo hay una fecha */}
      {!bothEmpty && !bothSet && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
          Selecciona <b>desde</b> y <b>hasta</b> para aplicar el filtro por
          fechas.
        </div>
      )}

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

      {!loading && vm.ticketsSeries.daily.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay datos para el rango seleccionado ({vm.meta?.range?.from ?? "—"}{" "}
          → {vm.meta?.range?.to ?? "—"}). Ajusta las fechas o intenta otro
          filtro.
        </div>
      )}

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

      <ProductivityCharts rows={rowsForProductivity} />

      <Charts
        alumnosPorEquipo={vm.alumnosPorEquipo}
        areasCount={vm.areasCount}
      />

      {vm.ticketsByTeam.length > 0 && (
        <TicketsByTeamTable rows={vm.ticketsByTeam} loading={loading} />
      )}

      {vm.createdBlock && (
        <CreatedMetricsContent
          initialRows={vm.createdBlock.rows}
          prodByCoachV2={vm.prodByCoachV2}
          totalTicketsForStatus={
            vm.createdBlock?.totals?.tickets ?? vm.totals.ticketsTotal
          }
        />
      )}
    </div>
  );
}
