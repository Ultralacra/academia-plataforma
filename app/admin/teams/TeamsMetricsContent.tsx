"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dataService,
  type Team,
  type ClientItem,
  type Ticket,
} from "@/lib/data-service";
import Filters from "./Filters";
import KPIs from "./KPIs";
import Charts from "./Charts";
import TeamsTable from "./TeamsTable";
import StudentsModal from "./StudentsModal";
import { PhaseAverages, PhaseActives } from "./PhaseTimes";
import TicketsSummary from "./TicketsSummary";
import CoachTable from "./CoachTable";
import { buildTeamsMetrics, type TeamsMetrics } from "./metrics-faker";
import TicketsSeriesChart from "./TicketsSeries";
import ResponseCharts from "./ResponseCharts";
import ProductivityCharts from "./ProductivityCharts";

export default function TeamsMetricsContent() {
  // filtros simples
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // data
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<ClientItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // modal listados
  const [modalOpen, setModalOpen] = useState(false);
  const [teamSel, setTeamSel] = useState<Team | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [t, s, tk] = await Promise.all([
          dataService.getTeamsV2({ page: 1, pageSize: 1000, search }),
          dataService.getClients({ page: 1, pageSize: 1000, search }),
          dataService.getTickets({ page: 1, pageSize: 10000, search }),
        ]);

        if (!alive) return;

        // Filtrado por fecha (rango) aplicado en cliente sobre fechas de creación / ingreso
        const teamsData = t.data ?? [];
        const studentsData = (s.items ?? []).filter((x) => {
          if (!desde && !hasta) return true;
          const d = x.joinDate ? new Date(x.joinDate) : null;
          if (!d) return false;
          const okFrom = !desde || x.joinDate! >= desde;
          const okTo = !hasta || x.joinDate! <= hasta;
          return okFrom && okTo;
        });
        const ticketsData = (tk.items ?? []).filter((x) => {
          if (!desde && !hasta) return true;
          const k = x.creacion.slice(0, 10);
          const okFrom = !desde || k >= desde;
          const okTo = !hasta || k <= hasta;
          return okFrom && okTo;
        });

        setTeams(teamsData);
        setStudents(studentsData);
        setTickets(ticketsData);
      } catch (e) {
        console.error(e);
        setTeams([]);
        setStudents([]);
        setTickets([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [search, desde, hasta]);

  // modelo de métricas (con faker determinístico)
  const model: TeamsMetrics = useMemo(
    () => buildTeamsMetrics({ teams, students, tickets }),
    [teams, students, tickets]
  );

  // tabla paginada local
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const total = teams.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return teams.slice(start, start + pageSize);
  }, [teams, page, pageSize]);

  const openAlumnos = (t: Team) => {
    setTeamSel(t);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Filters
        search={search}
        onSearch={setSearch}
        desde={desde}
        hasta={hasta}
        onDesde={setDesde}
        onHasta={setHasta}
      />
      {/* KPIs principales */}
      <KPIs
        totalEquipos={model.totals.teams}
        totalAlumnos={model.totals.studentsTotal}
        areas={new Set(teams.map((t) => t.area || "Sin área")).size}
      />
      {/* Tickets (respuesta, resolución, actividad) */}
      <TicketsSummary
        totals={{
          ticketsTotal: model.totals.ticketsTotal,
          avgResponseMin: model.totals.avgResponseMin,
          avgResolutionMin: model.totals.avgResolutionMin,
        }}
        per={model.ticketsPer}
      />
      {/* Fases: promedios y activos */}
      <PhaseAverages data={model.avgPhaseDays} />
      <PhaseActives data={model.activeByPhase} />
      {/* Charts existentes */}
      <Charts
        alumnosPorEquipo={model.alumnosPorEquipo}
        areasCount={model.areasCount}
      />
      {/* Métricas por coach */}
      <CoachTable rows={model.coaches} />
      {/* Tabla de equipos */}
      <TeamsTable
        data={pageData}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        onOpenAlumnos={openAlumnos}
        loading={loading}
      />
      {/* Modal de alumnos del equipo */}
      <StudentsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        team={teamSel}
      />
      // SERIE DE TICKETS por día/semana/mes
      <TicketsSeriesChart series={model.ticketsSeries} />
      // RESPUESTA por coach / equipo
      <ResponseCharts byCoach={model.respByCoach} byTeam={model.respByTeam} />
      // PRODUCTIVIDAD por coach (tickets, sesiones, horas)
      <ProductivityCharts rows={model.prodByCoach} />
    </div>
  );
}
