"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService } from "@/lib/data-service";
import {
  fetchCoachs,
  fetchStudentsByCoach,
  fetchAllStudents,
  fetchMetrics,
  type Coach,
  type RawClient,
} from "./teamsApi";
import Filters from "./Filters";
import KPIs from "./KPIs";
import TicketsSummary from "./TicketsSummary";
import TicketsSeriesChart from "./TicketsSeries";
import ResponseCharts from "./ResponseCharts";
import ProductivityCharts from "./ProductivityCharts";
// import Charts from "./Charts"; // oculto para vista individual
import CreatedMetricsContent from "./CreatedMetricsContent";
import TicketsByTeamTable, { TicketsByTeamApiRow } from "./TicketsByTeamTable";
import LoadingOverlay from "./LoadingOverlay";
import StudentsByCoachTable from "./StudentsByCoachTable";
// import AllStudentsTable from "./AllStudentsTable"; // ocultado según petición
import CoachStudentsDistributionChart from "./CoachStudentsDistributionChart";
import StudentsPhaseDonut from "./StudentsPhaseDonut";

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
  // Eliminado search (filtro de texto) para simplificar UI
  // Inicializamos rango en el mes actual (primer día -> hoy) o desde localStorage
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
  const persistedDesde =
    typeof window !== "undefined" ? localStorage.getItem("teams_desde") : null;
  const persistedHasta =
    typeof window !== "undefined" ? localStorage.getItem("teams_hasta") : null;
  const initialRange = currentMonthRange();
  const [desde, setDesde] = useState(persistedDesde || initialRange.first);
  const [hasta, setHasta] = useState(persistedHasta || initialRange.today);

  // Persistencia de fechas cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem("teams_desde", desde || "");
      localStorage.setItem("teams_hasta", hasta || "");
    } catch {}
  }, [desde, hasta]);

  // coachs
  const [coachs, setCoachs] = useState<Coach[]>([]);
  const [coach, setCoach] = useState<string>(""); // codigo del coach seleccionado
  const [coachName, setCoachName] = useState<string>(""); // nombre (para UI y filtrados)
  const [loadingCoachs, setLoadingCoachs] = useState(false);
  const [loadingCoachData, setLoadingCoachData] = useState(false);
  const [students, setStudents] = useState<any[]>([]); // alumnos (legacy derivado de dataService si existiera)
  const [tickets, setTickets] = useState<any[]>([]); // tickets completos del rango
  const [coachStudents, setCoachStudents] = useState<RawClient[]>([]); // alumnos del coach via endpoint directo
  const [allStudents, setAllStudents] = useState<RawClient[]>([]); // todos los alumnos (endpoint directo)
  const [loadingCoachStudents, setLoadingCoachStudents] = useState(false);
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);
  const [studentsChartMode, setStudentsChartMode] = useState<"estado" | "fase">(
    "estado"
  );

  // gating de consulta por fechas
  const bothEmpty = !desde && !hasta; // ahora normalmente será false
  const bothSet = Boolean(desde && hasta); // normalmente true
  const shouldFetch = bothEmpty || bothSet; // mantiene lógica existente

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

  // Cargar coachs una sola vez
  useEffect(() => {
    let alive = true;
    setLoadingCoachs(true);
    fetchCoachs()
      .then((rows) => {
        if (!alive) return;
        setCoachs(rows);
      })
      .catch((e) => console.error("Error cargando coachs", e))
      .finally(() => alive && setLoadingCoachs(false));
    return () => {
      alive = false;
    };
  }, []);

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
        // 1) Métricas (endpoint directo)
        const res = await fetchMetrics(
          bothEmpty ? undefined : desde,
          bothEmpty ? undefined : hasta
        );
        // Estructura esperada: { code, status, data: { teams: { ... } } }
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
        // Filtro de búsqueda eliminado

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
  }, [desde, hasta, bothEmpty, bothSet, shouldFetch]);

  // Cuando se selecciona un coach, descargar (en paralelo) alumnos y tickets del rango (si no los tenemos para este rango)
  // Consultar datos de alumnos/tickets genéricos (para fallback de métricas derivadas)
  useEffect(() => {
    let alive = true;
    setLoadingCoachData(true);
    Promise.all([
      dataService.getStudents({
        fechaDesde: bothEmpty ? undefined : desde,
        fechaHasta: bothEmpty ? undefined : hasta,
      }),
      dataService.getTickets({
        fechaDesde: bothEmpty ? undefined : desde,
        fechaHasta: bothEmpty ? undefined : hasta,
      }),
    ])
      .then(([studentsRes, ticketsRes]) => {
        if (!alive) return;
        setStudents(studentsRes.items);
        setTickets((ticketsRes as any).items ?? []);
      })
      .catch((e) => console.error("Error datos base alumnos/tickets", e))
      .finally(() => alive && setLoadingCoachData(false));
    return () => {
      alive = false;
    };
  }, [desde, hasta, bothEmpty]);

  // Cargar alumnos del coach y todos los alumnos cuando cambia coach (y aún no cargados globales)
  useEffect(() => {
    let alive = true;
    if (!coach) return; // sólo cuando se elige un coach (codigo)
    setLoadingCoachStudents(true);
    fetchStudentsByCoach(coach)
      .then((rows) => {
        if (!alive) return;
        setCoachStudents(rows);
      })
      .catch((e) => console.error("Error alumnos del coach", e))
      .finally(() => alive && setLoadingCoachStudents(false));
    return () => {
      alive = false;
    };
  }, [coach]);

  // Sincronizar coachName cuando cambia el código seleccionado
  useEffect(() => {
    if (!coach) {
      setCoachName("");
      return;
    }
    const c = coachs.find((c) => c.codigo === coach);
    setCoachName(c?.nombre ?? "");
  }, [coach, coachs]);

  // Si al seleccionar un coach falta alguna fecha, auto-restablecer al mes actual
  useEffect(() => {
    if (!coach) return; // sólo aplica cuando hay selección
    if (desde && hasta) return; // ya están ambas
    const { first, today } = currentMonthRange();
    // Sólo setea las que falten o ambas si están vacías
    if (!desde) setDesde(first);
    if (!hasta) setHasta(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach]);

  // Cargar todos los alumnos (una vez, o si quieres podrías ligarlo al rango)
  useEffect(() => {
    if (allStudents.length > 0) return;
    let alive = true;
    setLoadingAllStudents(true);
    fetchAllStudents()
      .then((rows) => {
        if (!alive) return;
        setAllStudents(rows);
      })
      .catch((e) => console.error("Error todos los alumnos", e))
      .finally(() => alive && setLoadingAllStudents(false));
    return () => {
      alive = false;
    };
  }, [allStudents.length]);

  // Derivar métricas filtradas por coach si hay selección
  const filteredVm = useMemo(() => {
    if (!coach) return vm;

    // Filtrar arrays por coach
    // Filtramos por nombre si podemos resolverlo
    const targetName = coachName || coach;
    const baseRespByCoach = vm.respByCoach.filter(
      (r) => r.coach === targetName
    );
    const prodByCoach = vm.prodByCoach.filter((r) => r.coach === targetName);
    const prodByCoachV2 = vm.prodByCoachV2.filter(
      (r) => r.coach === targetName
    );
    const createdBlock = vm.createdBlock
      ? {
          ...vm.createdBlock,
          rows: vm.createdBlock.rows.filter(
            (r) => r.nombre_coach === targetName
          ),
        }
      : null;

    // Alumnos del coach (por name match en teamMembers)
    // Intentar usar endpoint directo; si está vacío, fallback al heurístico
    const studentsOfCoach = coachStudents.length
      ? coachStudents.map((r) => ({
          id: r.id,
          name: r.nombre,
          code: r.codigo ?? null,
          state: r.estado ?? r.estado ?? null,
          stage: r.etapa ?? null,
        }))
      : students.filter((al) =>
          Array.isArray(al.teamMembers)
            ? al.teamMembers.some(
                (m: any) => m.name?.toLowerCase() === coach.toLowerCase()
              )
            : false
        );

    // Tickets del coach: aquellos cuyo alumno pertenece a studentsOfCoach
    const studentNames = new Set(
      studentsOfCoach.map((s: any) => s.name?.toLowerCase())
    );
    const ticketsOfCoach = tickets.filter((t: any) =>
      t.alumno_nombre
        ? studentNames.has(String(t.alumno_nombre).toLowerCase())
        : false
    );

    // Agrupar tickets para series (daily/weekly/monthly) sólo del coach
    const dailyMap = new Map<string, number>();
    const weeklyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    ticketsOfCoach.forEach((tk: any) => {
      const d = new Date(tk.creacion ?? tk.created_at ?? tk.createdAt);
      if (isNaN(d.getTime())) return;
      const dayKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + 1);
      // weekKey: ISO week Monday-based (simplificado: year-weekNumber)
      const tmp = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      );
      const dayNum = (tmp.getUTCDay() + 6) % 7; // 0=lunes
      tmp.setUTCDate(tmp.getUTCDate() - dayNum);
      const weekKey = `${tmp.getUTCFullYear()}-W${String(
        Math.ceil((tmp.getUTCMonth() * 32 + tmp.getUTCDate()) / 7)
      )}`;
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + 1);
      const monthKey = `${d.getUTCFullYear()}-${String(
        d.getUTCMonth() + 1
      ).padStart(2, "0")}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
    });

    const ticketsSeries: TicketsSeriesVM = {
      daily: Array.from(dailyMap, ([date, count]) => ({ date, count })).sort(
        (a, b) => a.date.localeCompare(b.date)
      ),
      weekly: Array.from(weeklyMap, ([week, count]) => ({ week, count })).sort(
        (a, b) => a.week.localeCompare(b.week)
      ),
      monthly: Array.from(monthlyMap, ([month, count]) => ({
        month,
        count,
      })).sort((a, b) => a.month.localeCompare(b.month)),
    };

    // ticketsPer derivado (último día, últimos 7 y 30 días)
    const now = new Date();
    const dayCut = new Date(now);
    dayCut.setUTCDate(now.getUTCDate() - 0);
    const weekCut = new Date(now);
    weekCut.setUTCDate(now.getUTCDate() - 6);
    const monthCut = new Date(now);
    monthCut.setUTCDate(now.getUTCDate() - 29);
    let dayCount = 0,
      weekCount = 0,
      monthCount = 0;
    ticketsOfCoach.forEach((tk: any) => {
      const d = new Date(tk.creacion ?? tk.created_at ?? tk.createdAt);
      if (isNaN(d.getTime())) return;
      if (d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10))
        dayCount++;
      if (d >= weekCut) weekCount++;
      if (d >= monthCut) monthCount++;
    });
    const ticketsPer = { day: dayCount, week: weekCount, month: monthCount };

    // alumnosPorEquipo: un solo coach
    const alumnosPorEquipo = [
      { name: targetName, alumnos: studentsOfCoach.length },
    ];
    // areasCount agrupando área de alumnos del coach (si la tuviera)
    const areaMap = new Map<string, number>();
    coachStudents.forEach((s) => {
      const area = (s as any).area ? String((s as any).area) : "Sin área";
      areaMap.set(area, (areaMap.get(area) ?? 0) + 1);
    });
    const areasCount = Array.from(areaMap, ([area, count]) => ({
      area,
      count,
    }));

    // Totales derivados
    const respEntry = baseRespByCoach[0];
    const createdRow = createdBlock?.rows?.[0];
    const totals = {
      ...vm.totals,
      teams: createdBlock
        ? new Set(createdBlock.rows.map((r) => r.codigo_equipo)).size || 1
        : 1,
      studentsTotal: studentsOfCoach.length,
      ticketsTotal:
        createdRow?.tickets != null
          ? Number(createdRow.tickets) || ticketsOfCoach.length
          : ticketsOfCoach.length,
      avgResponseMin:
        createdRow?.avgResponse != null
          ? Number(createdRow.avgResponse) || 0
          : respEntry
          ? respEntry.response ?? vm.totals.avgResponseMin
          : vm.totals.avgResponseMin,
      avgResolutionMin:
        createdRow?.avgResolution != null
          ? Number(createdRow.avgResolution) || 0
          : respEntry
          ? respEntry.resolution ?? vm.totals.avgResolutionMin
          : vm.totals.avgResolutionMin,
    } as typeof vm.totals;

    return {
      ...vm,
      totals,
      respByCoach: baseRespByCoach.length
        ? baseRespByCoach
        : createdRow
        ? [
            {
              coach: targetName,
              tickets: Number(createdRow.tickets ?? ticketsOfCoach.length) || 0,
              response: Number(createdRow.avgResponse ?? 0) || 0,
              resolution: Number(createdRow.avgResolution ?? 0) || 0,
            },
          ]
        : baseRespByCoach,
      prodByCoach,
      prodByCoachV2,
      createdBlock,
      ticketsSeries,
      ticketsPer,
      alumnosPorEquipo,
      areasCount,
    };
  }, [coach, vm, students, tickets]);

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

  const displayVm = filteredVm; // alias para claridad

  // Enriquecer alumnos del coach con estado y etapa provenientes del dataset global (allStudents)
  const coachStudentsEnriched = useMemo(() => {
    if (!coachStudents.length) return [] as typeof coachStudents;
    if (!allStudents.length) return coachStudents; // aún no cargado global

    // Crear índice por código y por nombre (fallback) para búsquedas rápidas
    const byCode = new Map<string, RawClient>();
    const byName = new Map<string, RawClient>();
    for (const s of allStudents) {
      if (s.codigo) byCode.set(String(s.codigo).toLowerCase(), s);
      byName.set(s.nombre.toLowerCase(), s);
    }

    return coachStudents.map((c) => {
      const codeKey = c.codigo ? String(c.codigo).toLowerCase() : null;
      const match =
        (codeKey && byCode.get(codeKey)) || byName.get(c.nombre.toLowerCase());
      if (!match) return c;
      return {
        ...c,
        estado: match.estado ?? c.estado ?? null,
        etapa: match.etapa ?? c.etapa ?? null,
      } as RawClient;
    });
  }, [coachStudents, allStudents]);

  // StatusDist para KPIs extendidos
  const coachStatusDist = useMemo(() => {
    if (!coach) return null;
    const row = displayVm.createdBlock?.rows?.find(
      (r) => r.nombre_coach === (coachName || coach)
    );
    if (!row?.statusDist) return null;
    const abiertos = row.statusDist.Abiertos ?? 0;
    const enProceso =
      row.statusDist["En Proceso"] ?? row.statusDist["En_Proceso"] ?? 0;
    const cerrados = row.statusDist.Cerrados ?? 0;
    const total = abiertos + enProceso + cerrados;
    const tasa = total > 0 ? cerrados / total : null;
    return { abiertos, enProceso, cerrados, tasa };
  }, [coach, coachName, displayVm.createdBlock]);

  // Construir JSON exportable con toda la data visible bajo los filtros actuales
  function buildMetricsExport() {
    const filters = {
      desde,
      hasta,
      coachCode: coach || null,
      coachName: coach ? coachName || coach : null,
    };

    // Distribución de alumnos del coach (si aplica)
    const stateDist: Record<string, number> = {};
    const stageDist: Record<string, number> = {};
    if (coach && coachStudentsEnriched.length) {
      for (const s of coachStudentsEnriched as any[]) {
        const st = String(s.estado ?? "Sin estado");
        const ph = String(s.etapa ?? "Sin fase");
        stateDist[st] = (stateDist[st] ?? 0) + 1;
        stageDist[ph] = (stageDist[ph] ?? 0) + 1;
      }
    }

    const payload = {
      meta: {
        filters,
        generatedAt: new Date().toISOString(),
      },
      kpis: {
        studentsTotal: displayVm.totals.studentsTotal,
        ticketsTotal: displayVm.totals.ticketsTotal,
        avgResponseMin: displayVm.totals.avgResponseMin,
        avgResolutionMin: displayVm.totals.avgResolutionMin,
        coachStatus: coach
          ? {
              abiertos: coachStatusDist?.abiertos ?? 0,
              enProceso: coachStatusDist?.enProceso ?? 0,
              cerrados: coachStatusDist?.cerrados ?? 0,
              tasaResolucion: coachStatusDist?.tasa ?? 0,
            }
          : null,
      },
      charts: {
        ticketsSummary: {
          totals: {
            ticketsTotal: displayVm.totals.ticketsTotal,
            avgResponseMin: displayVm.totals.avgResponseMin,
            avgResolutionMin: displayVm.totals.avgResolutionMin,
          },
          per: displayVm.ticketsPer,
        },
        ticketsSeries: displayVm.ticketsSeries,
        responseByCoach: displayVm.respByCoach,
        responseByTeam: displayVm.respByTeam,
        productivity: rowsForProductivity,
      },
      createdBlock: displayVm.createdBlock,
      ticketsByTeam: displayVm.ticketsByTeam,
      students: coach
        ? {
            list: coachStudentsEnriched.map((r) => ({
              id: r.id,
              name: r.nombre,
              code: r.codigo ?? null,
              state: (r as any).estado ?? null,
              stage: r.etapa ?? null,
              area: (r as any).area ?? null,
              lastActivity: (r as any).ultima_actividad ?? null,
              inactivityDays: (r as any).inactividad ?? null,
              ticketsCount: (r as any).tickets ?? null,
            })),
            distribution: { stateDist, stageDist },
          }
        : null,
    };
    return payload;
  }

  function handleCopyJSON() {
    try {
      const payload = buildMetricsExport();
      const txt = JSON.stringify(payload, null, 2);
      navigator.clipboard?.writeText(txt);
      // opcional: toast si existiera hook
      console.log("JSON copiado al portapapeles");
    } catch (e) {
      console.error("No se pudo copiar el JSON", e);
    }
  }

  function handleDownloadJSON() {
    try {
      const payload = buildMetricsExport();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const coachSlug = coach
        ? (coachName || coach).replace(/\s+/g, "_")
        : "todos";
      a.href = url;
      a.download = `metrics_${desde || "x"}_${hasta || "y"}_${coachSlug}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("No se pudo descargar el JSON", e);
    }
  }

  const SkeletonBlock = ({ h }: { h: number }) => (
    <div
      className="w-full rounded-2xl border border-gray-200 bg-gray-50 relative overflow-hidden"
      style={{ height: h }}
    >
      <div className="absolute inset-0 animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      {/* Overlay deshabilitado en favor de skeletons */}
      {false && (
        <LoadingOverlay
          active={loading || loadingCoachData}
          label={
            loadingCoachData
              ? "Cargando datos del coach…"
              : "Cargando métricas…"
          }
        />
      )}

      {/* aviso si sólo hay una fecha */}
      {!bothEmpty && !bothSet && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
          Selecciona <b>desde</b> y <b>hasta</b> para aplicar el filtro por
          fechas.
        </div>
      )}
      {bothSet && (
        <div className="text-[11px] text-gray-500">
          Rango activo: {desde} → {hasta}
        </div>
      )}

      <Filters
        coaches={coachs.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
        }))}
        coach={coach}
        loadingCoaches={loadingCoachs}
        onCoach={setCoach}
        desde={desde}
        hasta={hasta}
        onDesde={setDesde}
        onHasta={setHasta}
      />

      <div className="flex items-center justify-between gap-3">
        <RangeBadge
          from={displayVm.meta?.range?.from ?? (desde || null)}
          to={displayVm.meta?.range?.to ?? (hasta || null)}
          fetchedAt={displayVm.meta?.fetchedAt}
        />
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-muted-foreground">
              Cargando métricas…
            </span>
          )}
          {!loading && (
            <>
              <button
                type="button"
                onClick={handleCopyJSON}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                title="Copiar JSON"
              >
                Copiar JSON
              </button>
              <button
                type="button"
                onClick={handleDownloadJSON}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-500"
                title="Descargar JSON"
              >
                Descargar JSON
              </button>
            </>
          )}
        </div>
      </div>

      {!loading && displayVm.ticketsSeries.daily.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay datos para el rango seleccionado (
          {displayVm.meta?.range?.from ?? "—"} →{" "}
          {displayVm.meta?.range?.to ?? "—"}). Ajusta las fechas o intenta otro
          filtro.
        </div>
      )}

      <KPIs
        totalAlumnos={displayVm.totals.studentsTotal}
        areaCoach={
          coach ? (coachStudentsEnriched[0] as any)?.area ?? null : null
        }
        abiertos={coachStatusDist?.abiertos ?? null}
        enProceso={coachStatusDist?.enProceso ?? null}
        cerrados={coachStatusDist?.cerrados ?? null}
        tasaResolucion={coachStatusDist?.tasa ?? null}
        loading={loading}
      />

      {loading ? (
        <SkeletonBlock h={180} />
      ) : (
        <TicketsSummary
          totals={{
            ticketsTotal: displayVm.totals.ticketsTotal,
            avgResponseMin: displayVm.totals.avgResponseMin,
            avgResolutionMin: displayVm.totals.avgResolutionMin,
          }}
          per={displayVm.ticketsPer}
        />
      )}

      {loading ? (
        <SkeletonBlock h={320} />
      ) : (
        <TicketsSeriesChart series={displayVm.ticketsSeries} />
      )}
      {loading ? (
        <SkeletonBlock h={320} />
      ) : (
        <ResponseCharts
          byCoach={displayVm.respByCoach}
          byTeam={displayVm.respByTeam}
          showTeamChart={false}
        />
      )}

      {/* Bloque de productividad (sesiones / tiempo invertido) ocultado temporalmente a petición */}
      {/* Para reactivar, restaurar el render de <ProductivityCharts /> */}

      {/* Tabla de tickets por equipo ocultada a petición */}
      {false && displayVm.ticketsByTeam.length > 0 && (
        <TicketsByTeamTable rows={displayVm.ticketsByTeam} loading={loading} />
      )}

      {/* Gráfico "Distribución de estatus de tickets" eliminado temporalmente a petición */}

      {coach && !loading && (
        <StudentsByCoachTable
          coach={coachName || coach}
          students={coachStudentsEnriched.map((r) => ({
            id: r.id,
            name: r.nombre, // ya normalizado del endpoint alumno_nombre
            code: r.codigo ?? null, // id_alumno
            state: (r as any).estado ?? null,
            stage: r.etapa ?? null,
            lastActivity: (r as any).ultima_actividad ?? null,
            inactivityDays: (r as any).inactividad ?? null,
            ticketsCount: (r as any).tickets ?? null,
          }))}
          loading={loadingCoachStudents}
        />
      )}

      {coach && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nueva dona por fase, visible siempre */}
          <StudentsPhaseDonut
            students={coachStudentsEnriched.map((r) => ({
              id: r.id,
              name: r.nombre,
              code: r.codigo ?? null,
              state: (r as any).estado ?? null,
              stage: r.etapa ?? null,
            }))}
            coachName={coachName || coach}
          />

          {/* Distribución existente con selector (puede ocultarse si no quieres el switch) */}
          <CoachStudentsDistributionChart
            students={coachStudentsEnriched.map((r) => ({
              id: r.id,
              name: r.nombre,
              code: r.codigo ?? null,
              state: (r as any).estado ?? null,
              stage: r.etapa ?? null,
              lastActivity: (r as any).ultima_actividad ?? null,
              inactivityDays: (r as any).inactividad ?? null,
              ticketsCount: (r as any).tickets ?? null,
            }))}
            mode={studentsChartMode}
            onModeChange={setStudentsChartMode}
            coachName={coachName || coach}
            showToggle={false}
          />
        </div>
      )}
    </div>
  );
}
