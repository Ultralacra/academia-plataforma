"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService } from "@/lib/data-service";
import { fetchCoachs, fetchMetrics, Coach, RawClient } from "./teamsApi";
import Filters from "./Filters";
import TicketsByStudentBar from "./TicketsByStudentBar";
import TicketsByStudentDonut from "./TicketsByStudentDonut";
import TicketsByPeriodBar from "./TicketsByPeriodBar";
import TicketsByInformanteBar from "./TicketsByInformanteBar";
import ProductivityCharts from "./ProductivityCharts";
// import Charts from "./Charts"; // oculto para vista individual
import CreatedMetricsContent from "./CreatedMetricsContent";
import TicketsByTeamTable, { TicketsByTeamApiRow } from "./TicketsByTeamTable";
import LoadingOverlay from "./LoadingOverlay";
import StudentsByCoachTable from "./StudentsByCoachTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import AllStudentsTable from "./AllStudentsTable"; // ocultado según petición
import CoachStudentsDistributionChart from "./CoachStudentsDistributionChart";
import StudentsPhaseDonut from "./StudentsPhaseDonut";
import SlowestResponseCard from "./SlowestResponseCard";
import ResolutionAndRateCard from "./ResolutionAndRateCard";
import AdsKpis from "./AdsKpis";
import { ADS_STATIC_METRICS } from "./ads-static";
import AdsStudentsTable from "./AdsStudentsTable";
import AdsPhaseMetrics from "./AdsPhaseMetrics";
import SessionsMetrics from "@/app/admin/teamsv2/components/SessionsMetrics";

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
  // Eliminado applySeq: las consultas se disparan automáticamente al cambiar fechas/coach

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
  // Eliminado: no usaremos clients-coaches ni clients
  const [loadingCoachStudents] = useState(false);
  const [loadingAllStudents] = useState(false);
  const [studentsChartMode, setStudentsChartMode] = useState<"estado" | "fase">(
    "estado"
  );
  const [tab, setTab] = useState<"general" | "ads">("general");
  const [adsFase3, setAdsFase3] = useState<any[]>([]);
  const [adsFase4, setAdsFase4] = useState<any[]>([]);
  const [loadingAdsStudents, setLoadingAdsStudents] = useState(false);

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

    ads?: {
      roas: number | null;
      inversion: number | null;
      facturacion: number | null;
      alcance: number | null;
      clics: number | null;
      visitas: number | null;
      pagos_iniciados: number | null;
      efectividad_ads: number | null;
      efectividad_pago_iniciado: number | null;
      efectividad_compra: number | null;
      pauta_activa: boolean | null;
    } | null;
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
    clientsByPhaseAgg?: { name: string; value: number }[];
    clientsByStateAgg?: { name: string; value: number }[];
    clientsByPhaseDetails?: {
      name: string;
      value: number;
      students: string[];
    }[];
    clientsByStateDetails?: {
      name: string;
      value: number;
      students: string[];
    }[];
    ticketsByName?: { name: string; count: number }[];
    ticketsByInformante?: Array<{
      informante?: string | null;
      cantidad?: number;
    }>;

    ticketsByInformanteByDay?: Array<{
      created_at: string; // YYYY-MM-DD o ISO
      informante: string; // nombre del informante
      cantidad: number; // tickets ese día para ese informante
    }>;

    avgResolutionByStudent?: Array<{
      code: string;
      name: string;
      tickets_resueltos: number;
      avg_seconds: number | null;
      avg_minutes: number | null;
      avg_hours: number | null;
      avg_time_hms: string;
    }>;
    avgResolutionSummary?: {
      tickets_resueltos: number;
      avg_seconds: string;
      avg_minutes: number | null;
      avg_hours: number | null;
      avg_time_hms: string;
    } | null;
    ticketsByEstado?: Array<{ estado: string; cantidad: number }>;
    ticketsByType?: Array<{ tipo: string; cantidad: number }>;
    slowestResponseTicket?: {
      ticket_id: number;
      codigo_alumno: string;
      nombre_alumno: string;
      asunto_ticket: string;
      tipo_ticket: string;
      estado_ticket: string;
      fecha_creacion: string;
      fecha_respuesta: string;
      minutos_respuesta: number;
      horas_respuesta: number;
      dias_respuesta: number;
    } | null;
    clientsByCoachDetail?: RawClient[];
    allClientsByCoach?: Array<{
      coach: string;
      coach_code?: string | null;
      students: RawClient[];
    }>;
    allClientsByCoachFlat?: RawClient[];
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
    // Sesiones
    sessionsOverview?: Array<{ estado: string; cantidad: number }>;
    sessionsByCoach?: Array<{
      coach_codigo?: string | null;
      coach_nombre?: string | null;
      solicitadas?: number;
      ofrecidas?: number;
      aprobadas?: number;
      aceptadas?: number;
      completadas?: number;
      promedio_min?: number | null;
    }>;
    sessionsByAlumno?: Array<{
      alumno_codigo?: string | null;
      alumno_nombre?: string | null;
      solicitadas?: number;
      ofrecidas?: number;
      aprobadas?: number;
      aceptadas?: number;
      completadas?: number;
    }>;
    sessionsTrends?: Array<{ day: string; total: number }>;
    sessionsConversion?: {
      requested: number;
      offered: number;
      approved: number;
      accepted: number;
      completed: number;
      total: number;
      pct?: number | null;
    } | null;
    sessionsTopCoaches?: Array<{
      coach: string;
      solicitadas?: number;
      ofrecidas?: number;
      aprobadas?: number;
      aceptadas?: number;
      completadas?: number;
    }>;
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
    clientsByPhaseAgg: [],
    clientsByStateAgg: [],
    clientsByPhaseDetails: [],
    clientsByStateDetails: [],
    ticketsByName: [],
    ticketsByInformante: [],
    // ✅ Nuevo: estado inicial
    ticketsByInformanteByDay: [],
    avgResolutionByStudent: [],
    avgResolutionSummary: null,
    ticketsByEstado: [],
    ticketsByType: [],
    slowestResponseTicket: null,
    createdBlock: null,
    ticketsByTeam: [],
    clientsByCoachDetail: [],
    allClientsByCoach: [],
    allClientsByCoachFlat: [],
    sessionsOverview: [],
    sessionsByCoach: [],
    sessionsByAlumno: [],
    sessionsTrends: [],
    sessionsConversion: null,
    sessionsTopCoaches: [],
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

  // Al entrar en la pestaña ADS, si no hay coach seleccionado, escoger Johan o primer coach ADS
  useEffect(() => {
    if (tab !== "ads") return;
    if (!coachs.length) return;
    const isAds = (c: Coach) => /ads/i.test(String(c.area || c.puesto || ""));
    const isJohan = (c: Coach) => /johan/i.test(String(c.nombre || ""));
    const preferred = coachs.find(isJohan) || coachs.find(isAds) || null;
    const current = coachs.find((c) => c.codigo === coach) || null;
    const currentIsAds = current ? isAds(current) || isJohan(current) : false;
    if ((!coach || !currentIsAds) && preferred?.codigo) {
      setCoach(preferred.codigo);
    }
  }, [tab, coachs, coach]);

  // Cargar CSVs estáticos de Fase 3 y Fase 4 al entrar a pestaña ADS
  useEffect(() => {
    if (tab !== "ads") return;
    let alive = true;
    async function fetchCsv(url: string): Promise<string> {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    }
    function parseCSV(text: string): any[] {
      // CSV robusto con comillas dobles, comas y saltos de línea en campos
      const rows: string[][] = [];
      let field = "";
      let row: string[] = [];
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (ch === '"') {
          if (inQuotes && next === '"') {
            field += '"'; // escape de comillas
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }
        if (!inQuotes && ch === ",") {
          row.push(field);
          field = "";
          continue;
        }
        if (!inQuotes && ch === "\n") {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
          continue;
        }
        if (!inQuotes && ch === "\r") {
          continue; // ignorar CR
        }
        field += ch;
      }
      // último campo
      row.push(field);
      rows.push(row);
      // mapear a objetos por header
      const header = rows.shift() || [];
      const out = rows
        .filter((r) => r.some((c) => (c || "").trim().length > 0))
        .map((r) => {
          const obj: Record<string, string> = {};
          for (let i = 0; i < header.length; i++) {
            obj[header[i]] = r[i] ?? "";
          }
          return obj;
        });
      return out;
    }
    setLoadingAdsStudents(true);
    Promise.all([
      fetchCsv("/data/fase3.csv").then(parseCSV),
      fetchCsv("/data/fase4.csv").then(parseCSV),
    ])
      .then(([f3, f4]) => {
        if (!alive) return;
        setAdsFase3(f3);
        setAdsFase4(f4);
      })
      .catch((e) => console.error("Error cargando CSV Ads", e))
      .finally(() => alive && setLoadingAdsStudents(false));
    return () => {
      alive = false;
    };
  }, [tab]);

  useEffect(() => {
    let alive = true;

    // si solo hay una fecha, no consultamos
    if (!bothSet) {
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      try {
        // 1) Métricas (endpoint directo)
        const res = await fetchMetrics(desde, hasta, coach || undefined);
        // Estructura esperada: { code, status, data: { teams: { ... } } }
        const root = (res?.data as any) ?? {};
        const teams = root?.teams ?? {};
        const total = root?.teams?.totals ?? root?.teams?.total ?? {};

        const totals = {
          teams: Number(total?.teams ?? 0) || 0,
          ads: null,
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

        // ticketsByInformante: lista de { informante, cantidad }
        let rawInformanteSrc: any = [];

        if (Array.isArray(teams.ticketsByInformante))
          rawInformanteSrc = teams.ticketsByInformante;
        else if (Array.isArray(teams.byInformante))
          rawInformanteSrc = teams.byInformante;
        else if (Array.isArray(teams.informantes))
          rawInformanteSrc = teams.informantes;
        else if (Array.isArray(teams.tickets_by_informante))
          rawInformanteSrc = teams.tickets_by_informante;
        else if (Array.isArray(teams.ticketsByInformer))
          rawInformanteSrc = teams.ticketsByInformer;
        else if (
          teams.ticketsByInformante &&
          typeof teams.ticketsByInformante === "object"
        )
          rawInformanteSrc = teams.ticketsByInformante; // could be an object map

        let ticketsByInformante: Array<{
          informante?: string | null;
          cantidad?: number;
        }> = [];

        if (Array.isArray(rawInformanteSrc) && rawInformanteSrc.length) {
          ticketsByInformante = rawInformanteSrc.map((r: any) => ({
            informante:
              r.informante ?? r.name ?? r.informante_nombre ?? r.nombre ?? null,
            cantidad:
              Number(
                r.cantidad ?? r.count ?? r.tickets ?? r.cantidad_tickets ?? 0
              ) || 0,
          }));
        } else if (rawInformanteSrc && typeof rawInformanteSrc === "object") {
          // object map: { "Nombre": 12 }
          ticketsByInformante = Object.keys(rawInformanteSrc).map((k) => ({
            informante: k,
            cantidad: Number((rawInformanteSrc as any)[k]) || 0,
          }));
        } else {
          ticketsByInformante = [];
        }

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

        // ticketsByName (v2): agrupar por nombre y sumar
        const ticketsByName: { name: string; count: number }[] = Array.isArray(
          teams.ticketsByName
        )
          ? (() => {
              const map = new Map<string, number>();
              (teams.ticketsByName as any[]).forEach((r) => {
                const name = String(
                  r.alumno ?? r.nombre ?? r.name ?? "Sin Alumno"
                );
                const val =
                  Number(r.cantidad ?? r.tickets ?? r.count ?? 0) || 0;
                map.set(name, (map.get(name) ?? 0) + val);
              });
              return Array.from(map, ([name, count]) => ({ name, count })).sort(
                (a, b) => b.count - a.count
              );
            })()
          : [];

        // KPI tickets totales: suma de ticketsByName
        const kpiTicketsTotal = ticketsByName.reduce((a, c) => a + c.count, 0);
        totals.ticketsTotal = kpiTicketsTotal;

        const clientsByPhaseAgg: { name: string; value: number }[] =
          Array.isArray(teams.clientsByPhaseAgg)
            ? teams.clientsByPhaseAgg.map((r: any) => ({
                name: String(r.name ?? r.fase ?? r.label ?? "Sin fase"),
                value: Number(r.value ?? r.count ?? 0) || 0,
              }))
            : [];

        const clientsByStateAgg: { name: string; value: number }[] =
          Array.isArray(teams.clientsByStateAgg)
            ? teams.clientsByStateAgg.map((r: any) => ({
                name: String(r.name ?? r.estado ?? r.label ?? "Sin estado"),
                value: Number(r.value ?? r.count ?? 0) || 0,
              }))
            : [];

        const clientsByPhaseDetails = Array.isArray(
          (teams as any).clientsByPhaseDetails
        )
          ? (teams as any).clientsByPhaseDetails.map((r: any) => ({
              name: String(r.name ?? r.etapa ?? "Sin fase"),
              value: Number(r.value ?? r.cantidad ?? 0) || 0,
              students: Array.isArray(r.students)
                ? r.students
                : String(r.nombre ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0),
            }))
          : [];

        const clientsByStateDetails = Array.isArray(
          (teams as any).clientsByStateDetails
        )
          ? (teams as any).clientsByStateDetails.map((r: any) => ({
              name: String(r.name ?? r.estado ?? "Sin estado"),
              value: Number(r.value ?? r.cantidad ?? 0) || 0,
              students: Array.isArray(r.students)
                ? r.students
                : String(r.nombre ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0),
            }))
          : [];

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

        if (!alive) return;
        setVm({
          meta: {
            range: root?.meta?.range,
            fetchedAt: root?.meta?.fetchedAt,
          },
          totals,
          ads: (teams as any).ads ?? null,
          alumnosPorEquipo,
          areasCount,
          ticketsPer,
          ticketsSeries,
          respByCoach,
          respByTeam,
          prodByCoach,
          prodByCoachV2,
          clientsByPhaseAgg,
          clientsByStateAgg,
          clientsByPhaseDetails,
          clientsByStateDetails,
          ticketsByName,
          ticketsByInformante,
          // ✅ Nuevo: se copia desde el payload normalizado
          ticketsByInformanteByDay: Array.isArray(
            (teams as any).ticketsByInformanteByDay
          )
            ? (teams as any).ticketsByInformanteByDay
            : Array.isArray((teams as any).tickets_by_informante_by_day)
            ? (teams as any).tickets_by_informante_by_day
            : [],
          avgResolutionByStudent: Array.isArray(
            (teams as any).avgResolutionByStudent
          )
            ? (teams as any).avgResolutionByStudent
            : [],
          avgResolutionSummary: (teams as any).avgResolutionSummary ?? null,
          ticketsByEstado: Array.isArray((teams as any).ticketsByEstado)
            ? (teams as any).ticketsByEstado
            : [],
          ticketsByType: Array.isArray((teams as any).ticketsByType)
            ? (teams as any).ticketsByType
            : [],
          clientsByCoachDetail: Array.isArray(
            (teams as any).clientsByCoachDetail
          )
            ? (teams as any).clientsByCoachDetail
            : [],
          allClientsByCoach: Array.isArray((teams as any).allClientsByCoach)
            ? (teams as any).allClientsByCoach
            : [],
          allClientsByCoachFlat: Array.isArray(
            (teams as any).allClientsByCoachFlat
          )
            ? (teams as any).allClientsByCoachFlat
            : [],
          slowestResponseTicket: (teams as any).slowestResponseTicket ?? null,
          createdBlock,
          ticketsByTeam: ticketsByTeamApi,
          // Sesiones (desde payload normalizado en teamsApi)
          sessionsOverview: Array.isArray((teams as any).sessionsOverview)
            ? (teams as any).sessionsOverview
            : Array.isArray((teams as any).sessions_overview)
            ? (teams as any).sessions_overview
            : [],
          sessionsByCoach: Array.isArray((teams as any).sessionsByCoach)
            ? (teams as any).sessionsByCoach
            : Array.isArray((teams as any).sessions_by_coach)
            ? (teams as any).sessions_by_coach
            : [],
          sessionsByAlumno: Array.isArray((teams as any).sessionsByAlumno)
            ? (teams as any).sessionsByAlumno
            : Array.isArray((teams as any).sessions_by_alumno)
            ? (teams as any).sessions_by_alumno
            : [],
          sessionsTrends: Array.isArray((teams as any).sessionsTrends)
            ? (teams as any).sessionsTrends
            : Array.isArray((teams as any).sessions_trends)
            ? (teams as any).sessions_trends
            : [],
          sessionsConversion:
            (teams as any).sessionsConversion ??
            (teams as any).sessions_conversion ??
            null,
          sessionsTopCoaches: Array.isArray((teams as any).sessionsTopCoaches)
            ? (teams as any).sessionsTopCoaches
            : Array.isArray((teams as any).sessions_top_coaches)
            ? (teams as any).sessions_top_coaches
            : [],
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
          ads: null,
          alumnosPorEquipo: [],
          areasCount: [],
          ticketsPer: { day: 0, week: 0, month: 0 },
          ticketsSeries: { daily: [], weekly: [], monthly: [] },
          respByCoach: [],
          respByTeam: [],
          prodByCoach: [],
          prodByCoachV2: [],
          clientsByPhaseAgg: [],
          clientsByStateAgg: [],
          clientsByPhaseDetails: [],
          clientsByStateDetails: [],
          ticketsByName: [],
          ticketsByInformante: [],
          // ✅ Nuevo: catch vacío
          ticketsByInformanteByDay: [],
          avgResolutionByStudent: [],
          avgResolutionSummary: null,
          ticketsByEstado: [],
          ticketsByType: [],
          slowestResponseTicket: null,
          clientsByCoachDetail: [],
          allClientsByCoach: [],
          allClientsByCoachFlat: [],
          createdBlock: null,
          ticketsByTeam: [],
          sessionsOverview: [],
          sessionsByCoach: [],
          sessionsByAlumno: [],
          sessionsTrends: [],
          sessionsConversion: null,
          sessionsTopCoaches: [],
        });
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [desde, hasta, coach, bothSet]);

  // Consultar datos base de alumnos/tickets genéricos (para fallback de métricas derivadas)
  useEffect(() => {
    let alive = true;
    setLoadingCoachData(true);
    if (!bothSet) {
      setLoadingCoachData(false);
      return () => {
        alive = false;
      };
    }
    dataService
      .getStudents({
        fechaDesde: desde,
        fechaHasta: hasta,
      })
      .then((studentsRes) => {
        if (!alive) return;
        setStudents(studentsRes.items);
      })
      .catch((e) => console.error("Error datos base alumnos", e))
      .finally(() => alive && setLoadingCoachData(false));
    return () => {
      alive = false;
    };
  }, [desde, hasta, bothSet]);

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
    // Setear siempre el rango del mes actual al seleccionar coach si faltan
    setDesde(first);
    setHasta(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach]);

  // Eliminado: no usamos fetchAllStudents ni fetchStudentsByCoach

  // Derivar métricas filtradas por coach si hay selección
  const filteredVm = useMemo(() => {
    if (!coach) return vm;

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

    const studentsOfCoach = (vm.clientsByCoachDetail || []).map((r) => ({
      id: r.id,
      name: r.nombre,
      code: r.codigo ?? null,
      state: r.estado ?? null,
      stage: r.etapa ?? null,
    }));

    const studentNames = new Set(
      studentsOfCoach.map((s: any) => s.name?.toLowerCase())
    );

    const ticketsSeries: TicketsSeriesVM = vm.ticketsSeries;

    const ticketsPer = vm.ticketsPer;

    const alumnosPorEquipo = [
      { name: targetName, alumnos: studentsOfCoach.length },
    ];

    const areaMap = new Map<string, number>();
    (vm.clientsByCoachDetail || []).forEach((s) => {
      const area = (s as any).area ? String((s as any).area) : "Sin área";
      areaMap.set(area, (areaMap.get(area) ?? 0) + 1);
    });
    const areasCount = Array.from(areaMap, ([area, count]) => ({
      area,
      count,
    }));

    const respEntry = baseRespByCoach[0];
    const createdRow = createdBlock?.rows?.[0];
    const totals = {
      ...vm.totals,
      teams: createdBlock
        ? new Set(createdBlock.rows.map((r) => r.codigo_equipo)).size || 1
        : 1,
      studentsTotal: studentsOfCoach.length,
      ticketsTotal: vm.totals.ticketsTotal,
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
              tickets:
                Number(createdRow.tickets ?? vm.totals.ticketsTotal) || 0,
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
  }, [coach, coachName, vm, students]);

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

  // Alumnos del coach (únicamente desde metrics-v2 detalle)
  const coachStudentsEnriched = useMemo(() => {
    return (vm.clientsByCoachDetail || []) as RawClient[];
  }, [vm.clientsByCoachDetail]);

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
      {/* Tabs para alternar vista general y nuevas métricas */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ads">Nuevas métricas</TabsTrigger>
        </TabsList>
      </Tabs>
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

      {(() => {
        const list = coachs.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          area: c.area ?? null,
        }));
        const onlyAds = list.filter(
          (c) =>
            /ads/i.test(String(c.area || "")) ||
            /johan/i.test(String(c.nombre || ""))
        );
        const filtered =
          tab === "ads" ? (onlyAds.length ? onlyAds : list) : list;
        return (
          <Filters
            coaches={filtered}
            coach={coach}
            loadingCoaches={loadingCoachs}
            onCoach={setCoach}
            desde={desde}
            hasta={hasta}
            onDesde={setDesde}
            onHasta={setHasta}
          />
        );
      })()}

      <div className="flex items-center justify-between gap-3">
        <RangeBadge
          from={displayVm.meta?.range?.from ?? (desde || null)}
          to={displayVm.meta?.range?.to ?? (hasta || null)}
          fetchedAt={displayVm.meta?.fetchedAt}
        />
        <div className="flex items-center gap-2" />
      </div>

      {tab === "general" &&
        !loading &&
        displayVm.ticketsSeries.daily.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No hay datos para el rango seleccionado (
            {displayVm.meta?.range?.from ?? "—"} →{" "}
            {displayVm.meta?.range?.to ?? "—"}). Ajusta las fechas o intenta
            otro filtro.
          </div>
        )}

      {/* Donas primero (solo en General) */}
      {tab === "general" && coach && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StudentsPhaseDonut
            students={coachStudentsEnriched.map((r) => ({
              id: r.id,
              name: r.nombre,
              code: r.codigo ?? null,
              state: (r as any).estado ?? null,
              stage: r.etapa ?? null,
            }))}
            aggData={displayVm.clientsByPhaseAgg}
            coachName={coachName || coach}
            details={displayVm.clientsByPhaseDetails}
          />
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
            aggState={displayVm.clientsByStateAgg}
            aggPhase={displayVm.clientsByPhaseAgg}
            detailsState={displayVm.clientsByStateDetails}
            detailsPhase={displayVm.clientsByPhaseDetails}
          />
        </div>
      )}

      {/* KPIs específicos de ADS */}
      {coach &&
        !loading &&
        (() => {
          const selected = coachs.find((c) => c.codigo === coach);
          const isAds =
            /ads/i.test(String(selected?.area || selected?.puesto || "")) ||
            /johan/i.test(String(selected?.nombre || ""));
          if (tab !== "ads" && (!isAds || !displayVm.ads)) return null;
          return (
            <div className="mt-2">
              <AdsKpis
                metrics={
                  tab === "ads"
                    ? (ADS_STATIC_METRICS as any)
                    : (displayVm.ads as any)
                }
              />
            </div>
          );
        })()}

      {tab === "ads" && (
        <AdsPhaseMetrics fase3={adsFase3 as any} fase4={adsFase4 as any} />
      )}

      {tab === "ads" && (
        <AdsStudentsTable
          fase3={adsFase3 as any}
          fase4={adsFase4 as any}
          loading={loadingAdsStudents}
        />
      )}

      {/* Vista agregada cuando NO hay coach */}
      {tab === "general" && !coach && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <StudentsPhaseDonut
            students={[]}
            coachName="Todos"
            title="ALUMNOS POR FASE (GLOBAL)"
            aggData={displayVm.clientsByPhaseAgg}
            details={displayVm.clientsByPhaseDetails}
          />
          <StudentsPhaseDonut
            students={[]}
            coachName="Todos"
            title="ALUMNOS POR ESTADO (GLOBAL)"
            aggData={displayVm.clientsByStateAgg}
            details={displayVm.clientsByStateDetails}
          />
          <TicketsByStudentDonut
            data={(displayVm.ticketsByType || []).map((t) => ({
              name: t.tipo,
              count: t.cantidad,
            }))}
            title="TICKETS POR TIPO"
          />
          <TicketsByStudentDonut
            data={(displayVm.ticketsByEstado || []).map((t) => ({
              name: t.estado,
              count: t.cantidad,
            }))}
            title="TICKETS POR ESTADO"
          />
        </div>
      )}

      {/* Fila de KPIs General */}
      {tab === "general" && !loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ResolutionAndRateCard
            avgMinutes={displayVm.avgResolutionSummary?.avg_minutes}
            avgHms={displayVm.avgResolutionSummary?.avg_time_hms}
            resolved={displayVm.avgResolutionSummary?.tickets_resueltos}
            total={
              displayVm.ticketsByName?.reduce(
                (a, c) => a + (c.count || 0),
                0
              ) ?? 0
            }
          />
          {vm.slowestResponseTicket && (
            <SlowestResponseCard ticket={vm.slowestResponseTicket as any} />
          )}
        </div>
      )}

      {/* Grid General: izquierda Tickets por alumno, derecha periodos + informante */}
      {tab === "general" && !loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <TicketsByStudentBar
              data={displayVm.ticketsByName || []}
              avgResolution={(() => {
                const map = new Map<
                  string,
                  { minutes: number | null; hours: number | null; hms: string }
                >();
                for (const r of displayVm.avgResolutionByStudent || []) {
                  const key = String(r.name || "");
                  map.set(key, {
                    minutes: r.avg_minutes,
                    hours: r.avg_hours,
                    hms: r.avg_time_hms,
                  });
                }
                return map;
              })()}
              initialLimit={!coach ? 25 : undefined}
              showLimiter={!coach}
            />
          </div>
          <div className="space-y-3">
            <TicketsByPeriodBar data={displayVm.ticketsSeries.daily} />
            <TicketsByInformanteBar
              data={{
                ticketsByInformante: displayVm.ticketsByInformante ?? [],
                ticketsByInformanteByDay:
                  displayVm.ticketsByInformanteByDay ?? [],
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonBlock h={360} />
          <SkeletonBlock h={360} />
        </div>
      )}

      {/* Sesiones: KPIs y tendencias (general/coach) */}
      {tab === "general" && !loading && (
        <div className="grid grid-cols-1 gap-6">
          <SessionsMetrics
            overview={displayVm.sessionsOverview}
            trends={displayVm.sessionsTrends}
            byCoach={displayVm.sessionsByCoach}
            byAlumno={displayVm.sessionsByAlumno}
            conversion={displayVm.sessionsConversion}
            topCoaches={displayVm.sessionsTopCoaches}
            titleText={
              coach ? `Sesiones (${coachName || coach})` : "Sesiones (general)"
            }
          />
        </div>
      )}

      {/* Tabla por coach */}
      {tab === "general" && coach && !loading && (
        <StudentsByCoachTable
          coach={coachName || coach}
          loadingFiltered={loading}
          datasets={[
            {
              key: "range",
              label: "En rango",
              rows: (vm.clientsByCoachDetail || []).map((r) => ({
                id: r.id,
                name: r.nombre,
                code: r.codigo ?? null,
                state: r.estado ?? null,
                stage: r.etapa ?? null,
                ingreso: r.ingreso ?? null,
                lastActivity: r.ultima_actividad ?? null,
                inactivityDays: r.inactividad ?? null,
                ticketsCount: r.tickets ?? null,
                contrato: r.contrato ?? null,
                nicho: r.nicho ?? null,
                paso_f1: r.paso_f1 ?? null,
                paso_f2: r.paso_f2 ?? null,
                paso_f3: r.paso_f3 ?? null,
                paso_f4: r.paso_f4 ?? null,
                paso_f5: r.paso_f5 ?? null,
              })),
            },
            {
              key: "all",
              label: "Todos",
              rows: (vm.allClientsByCoachFlat || []).map((r) => ({
                id: r.id,
                name: r.nombre,
                code: r.codigo ?? null,
                state: r.estado ?? null,
                stage: r.etapa ?? null,
                ingreso: r.ingreso ?? null,
                lastActivity: r.ultima_actividad ?? null,
                inactivityDays: r.inactividad ?? null,
                ticketsCount: r.tickets ?? null,
                contrato: r.contrato ?? null,
                nicho: r.nicho ?? null,
                paso_f1: r.paso_f1 ?? null,
                paso_f2: r.paso_f2 ?? null,
                paso_f3: r.paso_f3 ?? null,
                paso_f4: r.paso_f4 ?? null,
                paso_f5: r.paso_f5 ?? null,
              })),
            },
          ]}
          defaultDatasetKey="range"
        />
      )}

      {/* Tabla global al final cuando NO hay coach */}
      {tab === "general" && !coach && (
        <StudentsByCoachTable
          coach="Todos"
          loadingFiltered={loading}
          filtered={(vm.allClientsByCoachFlat || []).map((r) => ({
            id: r.id,
            name: r.nombre,
            code: r.codigo ?? null,
            state: r.estado ?? null,
            stage: r.etapa ?? null,
            ingreso: r.ingreso ?? null,
            lastActivity: r.ultima_actividad ?? null,
            inactivityDays: r.inactividad ?? null,
            ticketsCount: r.tickets ?? null,
            contrato: r.contrato ?? null,
            nicho: r.nicho ?? null,
            paso_f1: r.paso_f1 ?? null,
            paso_f2: r.paso_f2 ?? null,
            paso_f3: r.paso_f3 ?? null,
            paso_f4: r.paso_f4 ?? null,
            paso_f5: r.paso_f5 ?? null,
          }))}
        />
      )}
    </div>
  );
}
