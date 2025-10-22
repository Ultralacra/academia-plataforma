// lib/data-service.ts
import { apiFetch, endpoints, toQuery } from "./api-config";

/* =======================
   Tipos
======================= */
export type TeamMember = { name: string; url?: string | null };

export type Team = {
  id: number;
  codigo: string;
  nombre: string;
  puesto?: string | null;
  area?: string | null;
  alumnos: TeamMember[];     // listado (cuando exista)
  nAlumnos?: number | null;  // contador
  created_at?: string;
  updated_at?: string;
};

// Extensión útil cuando solo tenemos contadores (nueva API)
export type TeamWithCounts = Team & {
  ticketsCount?: number | null;
};

export type CoachMember = TeamMember & {
  puesto?: string | null;
  area?: string | null;
};

export type CoachInfo = {
  id?: string | number | null;
  name: string;
  puesto?: string | null;
  area?: string | null;
};

export type ClientItem = {
  id: number;
  code?: string | null;
  name: string;

  // enlaces/equipo
  teamMembers: TeamMember[];

  // metadatos opcionales para filtros
  state?: string | null;
  stage?: string | null;
  joinDate?: string | null;      // YYYY-MM-DD o ISO
  lastActivity?: string | null;  // YYYY-MM-DD o ISO
  inactivityDays?: number | null;

  // otros
  contractUrl?: string | null;
  ticketsCount?: number | null;
};

// ⚠️ Alias para que StudentsContent pueda importar este tipo:
export type StudentItem = ClientItem;

export type Ticket = {
  id: number;
  id_externo?: string | null;
  nombre?: string | null;
  alumno_nombre?: string | null;
  estado?: string | null;
  tipo?: string | null;
  creacion: string;          // ISO
  deadline?: string | null;  // ISO
  equipo_urls: string[];     // URLs a cruzar con teamMembers.url
  coaches?: {
    codigo_equipo?: string | null;
    nombre?: string | null;
    puesto?: string | null;
    area?: string | null;
  }[];
  ultimo_estado?: {
    estatus?: string | null;
    fecha?: string | null; // ISO
  } | null;
};

/* =======================
   Helpers locales
======================= */
function parseTeamAlumnos(raw: string | null | undefined): TeamMember[] {
  if (!raw) return [];
  // formato esperado en API antigua: "Nombre (url), Nombre 2 (url)..."
  return raw
    .split(/,\s+/)
    .map((s) => {
      const m = s.match(/^(.+?)\s*\((https?:\/\/[^\s)]+)\)\s*$/);
      if (m) return { name: m[1].trim(), url: m[2].trim() };
      return { name: s.trim() };
    })
    .filter((x) => x.name);
}

function parseEquipoUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  // Algunas variantes llegan como string: "url1, url2, url3"
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Normaliza nombres con saltos de línea, comas o comillas sueltas */
function cleanClientName(raw: any): string {
  if (raw == null) return "—";
  let s = String(raw);
  s = s.split("\n")[0];           // primera línea
  s = s.replace(/,+.*$/, "");     // corta basura tipo ",,,..."
  s = s.replace(/^"+|"+$/g, "");  // quita comillas de borde
  s = s.replace(/\s+/g, " ").trim(); // espacios repetidos
  return s || "—";
}

/* =======================
   TEAMS (versión ORIGINAL + compat flat {data:[...]})
======================= */
export async function getTeams(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  const q = toQuery({
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 25,
    search: opts.search ?? "",
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
  });

  const json = await apiFetch<{
    code: number;
    status: string;
    // formato nuevo:
    data?: any[];
    // formato antiguo:
    getTeam?: {
      data: any[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(`${endpoints.team.list}${q}`);

  /* ── NUEVO: { code, status, data: [...] } ───────────────── */
  if (Array.isArray((json as any).data)) {
    const rows = (json as any).data as any[];

    const data: Team[] = rows.map((r: any) => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      puesto: r.puesto ?? null,
      area: r.area ?? null,
      alumnos: [], // sin detalle en este endpoint
      nAlumnos:
        typeof r.alumnos === "number"
          ? r.alumnos
          : r.n_alumnos ?? r.nAlumnos ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    // paginación local amigable para que las vistas no cambien
    const total = data.length;
    const pageSize = (opts.pageSize ?? total) || 25;
    const page = opts.page ?? 1;
    const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      data: data.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /* ── ANTIGUO: { getTeam: { data, ... } } ─────────────────── */
  const payload = json.getTeam ?? {
    data: [] as any[],
    total: 0,
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 25,
    totalPages: 1,
  };

  const data: Team[] =
    (payload.data ?? []).map((r: any) => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      puesto: r.puesto ?? null,
      area: r.area ?? null,
      alumnos: parseTeamAlumnos(
        typeof r.alumnos === "string" ? r.alumnos : null
      ),
      nAlumnos: r.n_alumnos ?? r.nAlumnos ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })) ?? [];

  return {
    data,
    total: payload.total ?? data.length,
    page: payload.page ?? (opts.page ?? 1),
    pageSize: payload.pageSize ?? (opts.pageSize ?? data.length),
    totalPages: payload.totalPages ?? 1,
  };
}

/* =======================
   TEAMS V2 (lee { code, status, data: [...] })
======================= */
export async function getTeamsV2(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  const q = toQuery({
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 25,
    search: opts.search ?? "",
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
  });

  const json = await apiFetch<{
    code: number;
    status: string;
    data: any[];
  }>(`${endpoints.team.list}${q}`);

  const rows = json.data ?? [];

  const data: TeamWithCounts[] = rows.map((r: any) => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    puesto: r.puesto ?? null,
    area: r.area ?? null,
    alumnos: [],
    nAlumnos: r.alumnos ?? null,
    ticketsCount: r.tickets ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  // Meta “friendly” + paginación local
  const total = data.length;
  const pageSize = (opts.pageSize ?? total) || 25;
  const page = opts.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedData = data.slice(start, end);

  return {
    data: pagedData,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/* =======================
   CLIENTS (Alumnos) — consulta hasta 1000, paginación local
======================= */
export async function getClients(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  // Pedimos un máximo de 1000 al servidor (paginación local en el front)
  const q = toQuery({
    page: 1,
    pageSize: opts.pageSize ?? 1000,
    search: opts.search ?? "",
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
  });

  const json = await apiFetch<{
    code: number;
    status: string;
    // NUEVO formato
    data?: any[];
    // formatos antiguos
    clients?: {
      data: any[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
    getClients?: {
      data: any[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(`${endpoints.client.list}${q}`);

  // 1) NUEVO: payload plano { data: [...] }
  if (Array.isArray((json as any).data)) {
    const rows = (json as any).data as any[];

    const items: ClientItem[] = rows.map((r: any) => ({
      id: r.id,
      code: r.codigo ?? r.code ?? null,
      name: cleanClientName(r.nombre ?? r.name),
      // la nueva API ya no manda equipo; mantenemos compatibilidad
      teamMembers: Array.isArray(r.teamMembers)
        ? r.teamMembers
        : parseTeamAlumnos(r.equipo ?? r.alumnos ?? null),

      state: r.estado ?? r.state ?? null,
      stage: r.etapa ?? r.stage ?? null,
      // puede venir ISO con tiempo; el UI ya lo formatea
      joinDate: r.ingreso ?? r.joinDate ?? null,
      lastActivity: r.ultima_actividad ?? r.lastActivity ?? null,
      // algunos backends envían 'dias_inactividad' o 'inactividad'
      inactivityDays:
        r.dias_inactividad ??
        r.diasInactividad ??
        r.inactividad ??
        r.inactivityDays ??
        null,

      contractUrl: r.contrato ?? r.contractUrl ?? null,
      ticketsCount: r.tickets ?? r.ticketsCount ?? null,
    }));

    return {
      items,
      total: items.length,
    };
  }

  // 2) LEGADO: { clients: {...} } o { getClients: {...} }
  const payload =
    json.clients ??
    json.getClients ??
    ({
      data: [],
      total: 0,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    } as const);

  const items: ClientItem[] = (payload.data ?? []).map((r: any) => ({
    id: r.id,
    code: r.codigo ?? r.code ?? null,
    name: cleanClientName(r.nombre ?? r.name),
    teamMembers: Array.isArray(r.teamMembers)
      ? r.teamMembers
      : parseTeamAlumnos(r.equipo ?? r.alumnos ?? null),

    state: r.state ?? r.estado ?? null,
    stage: r.stage ?? r.etapa ?? null,
    joinDate: r.ingreso ?? r.joinDate ?? null,
    lastActivity: r.lastActivity ?? r.ultima_actividad ?? null,
    // compatibilidad con múltiples nombres de campo
    inactivityDays:
      r.dias_inactividad ??
      r.diasInactividad ??
      r.inactividad ??
      r.inactivityDays ??
      null,

    contractUrl: r.contrato ?? r.contractUrl ?? null,
    ticketsCount: r.ticketsCount ?? r.tickets ?? null,
  }));

  return {
    items,
    total: items.length,
  };
}

/* ============  Alias para Students  =========== */
export async function getStudents(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  return getClients(opts);
}

/* =======================
   TICKETS — consulta **todo el rango** con paginación
======================= */

type RawTicketsResponse = {
  code?: number;
  status?: string;
  data?: any[];         // NUEVO
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  tickets?: { data: any[]; total?: number };
  getTickets?: { data: any[]; total?: number };
};

/** Descarga todas las páginas del rango dado, respetando un límite de seguridad. */
async function fetchAllTicketsInRange(opts: {
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
  estado?: string;
  tipo?: string;
  pageSize?: number; // sugerencia al server
  hardLimit?: number; // límite de seguridad en el cliente
}) {
  const pageSize = Math.max(1, Math.min(1000, opts.pageSize ?? 500));
  const hardLimit = Math.max(1, Math.min(20000, opts.hardLimit ?? 5000));

  let page = 1;
  let collected: any[] = [];
  let total = 0;
  let totalPages = 1;

  while (collected.length < hardLimit && page <= totalPages) {
    const q = toQuery({
      page,
      pageSize,
      fechaDesde: opts.fechaDesde ?? "",
      fechaHasta: opts.fechaHasta ?? "",
      search: opts.search ?? "",
      estado: opts.estado ?? "",
      tipo: opts.tipo ?? "",
    });

    const json = await apiFetch<RawTicketsResponse>(
      `${endpoints.ticket.list}${q}`
    );

    const rows =
      (json as any)?.data ??
      (json as any)?.getTickets?.data ??
      (json as any)?.tickets?.data ??
      [];

    const thisTotal =
      (json as any)?.total ??
      (json as any)?.getTickets?.total ??
      (json as any)?.tickets?.total ??
      rows.length;

    total = Number(thisTotal) || total;
    totalPages = Number((json as any)?.totalPages) || totalPages || 1;

    collected = collected.concat(rows);
    page += 1;

    // Si el endpoint “miente” con totalPages pero ya juntamos todo:
    if (collected.length >= total && total > 0) break;

    // Si el endpoint devuelve menos que pageSize y no informa totalPages bien:
    if (rows.length < pageSize && totalPages === 1 && page > 1) break;
  }

  if (collected.length > hardLimit) {
    collected = collected.slice(0, hardLimit);
  }

  return {
    rawItems: collected,
    total,
    totalPages,
    hardLimited: collected.length < total,
  };
}

export async function getTickets(opts: {
  // estos params se respetan para compatibilidad
  page?: number;
  pageSize?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  const { rawItems, total } = await fetchAllTicketsInRange({
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
    search: opts.search ?? "",
    // forward pageSize if provided
    pageSize: opts.pageSize ?? 500,
    hardLimit: 10000, // seguridad
  });

  const items: Ticket[] = rawItems.map((r: any) => ({
    id: r.id,
    id_externo: r.id_externo ?? r.external_id ?? r.codigo ?? null,
    nombre: r.nombre ?? r.subject ?? null,
    alumno_nombre: r.alumno_nombre ?? r.client_name ?? null,
    estado: r.estado ?? r.status ?? null,
    tipo: r.tipo ?? r.type ?? null,
    creacion: r.creacion ?? r.created_at ?? r.createdAt,
    deadline: r.deadline ?? null,
    equipo_urls: parseEquipoUrls(r.equipo_urls ?? r.equipo ?? r.team_urls),
    coaches: Array.isArray(r.coaches)
      ? r.coaches.map((c: any) => ({
          codigo_equipo: c.codigo_equipo ?? null,
          nombre: c.nombre ?? null,
          puesto: c.puesto ?? null,
          area: c.area ?? null,
        }))
      : [],
    ultimo_estado: r.ultimo_estado
      ? {
          estatus: r.ultimo_estado.estatus ?? r.ultimo_estado.estado ?? null,
          fecha: r.ultimo_estado.fecha ?? r.ultimo_estado.created_at ?? null,
        }
      : null,
  }));

  return {
    items,
    total: typeof total === "number" ? total : items.length,
    page: 1,
    pageSize: items.length,
    totalPages: 1,
  };
}

/* =======================
   Utilidades para Tickets
======================= */
export function groupTicketsByTeam(teams: Team[], tickets: Ticket[]) {
  type Bucket = {
    team: Team;
    tickets: Ticket[];
    membersHit: Record<string, number>;
    countByEstado: Record<string, number>;
  };
  const map = new Map<number, Bucket>();
  const urlIndex = new Map<string, number>(); // url -> teamId

  teams.forEach((t) => {
    t.alumnos.forEach((m) => {
      if (m.url) urlIndex.set(m.url, t.id);
    });
    map.set(t.id, {
      team: t,
      tickets: [],
      membersHit: {},
      countByEstado: {},
    });
  });

  tickets.forEach((tk) => {
    const hitIds = new Set<number>();
    (tk.equipo_urls ?? []).forEach((u) => {
      const id = urlIndex.get(u);
      if (id) hitIds.add(id);
    });
    if (hitIds.size === 0) return;
    hitIds.forEach((id) => {
      const b = map.get(id)!;
      b.tickets.push(tk);
      // contar hits por URL de miembro
      (tk.equipo_urls ?? []).forEach((u) => {
        b.membersHit[u] = (b.membersHit[u] ?? 0) + 1;
      });
      const est = (tk.estado ?? "SIN ESTADO").toUpperCase();
      b.countByEstado[est] = (b.countByEstado[est] ?? 0) + 1;
    });
  });

  return map;
}

export function ticketsByDay(tickets: Ticket[]) {
  const acc = new Map<string, number>();
  tickets.forEach((t) => {
    const d = new Date(t.creacion);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    acc.set(key, (acc.get(key) ?? 0) + 1);
  });
  return Array.from(acc, ([date, count]) => ({ date, count })).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/* =======================
   CLIENT ↔ COACH
======================= */
export async function getClientCoaches(alumnoCode: string): Promise<{
  alumno: string;
  alumno_nombre: string;
  coaches: CoachMember[];
}> {
  const q = toQuery({ alumno: alumnoCode });

  const json = await apiFetch<{
    code: number;
    status: "success" | string;
    data: Array<{
      id: number;
      id_relacion: string;
      id_coach: string;
      id_alumno: string;
      updated_at: string;
      created_at: string;
      alumno_nombre: string;
      coach_nombre: string;
      puesto: string | null;
      area: string | null;
    }>;
  }>(`${endpoints.coachClient.list}${q}`);

  const rows = Array.isArray(json.data) ? json.data : [];
  const alumno_nombre = rows[0]?.alumno_nombre ?? alumnoCode;

  const coaches: CoachMember[] = rows.map((r) => ({
    name: r.coach_nombre,
    puesto: r.puesto ?? null,
    area: r.area ?? null,
  }));

  return { alumno: alumnoCode, alumno_nombre, coaches };
}

/**
 * Lista "maestra" de coaches disponibles basada en el endpoint de relaciones
 * /client/get/clients-coaches. Si el backend devuelve relaciones, tomamos los
 * nombres únicos. Sirve para poblar filtros globales.
 */
export async function getCoaches(): Promise<CoachInfo[]> {
  const json = await apiFetch<{
    code: number;
    status: string;
    data: Array<{
      id?: number;
      id_relacion?: string;
      id_coach?: string | number;
      coach_nombre?: string;
      puesto?: string | null;
      area?: string | null;
    }>;
  }>(`${endpoints.coachClient.list}`);

  const rows = Array.isArray((json as any)?.data) ? (json as any).data : [];
  const map = new Map<string, CoachInfo>();
  rows.forEach((r: any) => {
    const name = (r.coach_nombre ?? "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: r.id_coach ?? r.id ?? null,
        name,
        puesto: r.puesto ?? null,
        area: r.area ?? null,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Devuelve los alumnos asociados a un coach (por id) usando el endpoint de relaciones */
export async function getCoachStudents(coachId: string | number): Promise<{
  alumno: string; // código del alumno
  nombre: string; // nombre del alumno
}[]> {
  const q = toQuery({ coach: String(coachId) });
  const json = await apiFetch<{
    code: number;
    status: string;
    data: Array<{
      id?: number;
      id_relacion?: string;
      id_coach?: string | number;
      id_alumno?: string;
      alumno_nombre?: string;
    }>;
  }>(`${endpoints.coachClient.list}${q}`);

  const rows = Array.isArray((json as any)?.data) ? (json as any).data : [];
  const map = new Map<string, { alumno: string; nombre: string }>();
  rows.forEach((r: any) => {
    const code = (r.id_alumno ?? "").trim();
    if (!code) return;
    if (!map.has(code)) {
      map.set(code, { alumno: code, nombre: (r.alumno_nombre ?? code).trim() });
    }
  });
  return Array.from(map.values());
}

/* =======================
   TEAMS CREATED (nueva API)
======================= */
export type TeamCreatedTotal = {
  code: number;
  status: string;
  data: { total_teams: number };
};

export type TeamCreatedDetailItem = {
  codigo_cliente: string;
  nombre_cliente: string;
  cantidad_tickets: number;
  equipos: {
    codigo_equipo: string;
    nombre_coach: string;
    puesto: string;
    area: string;
  }[];
};

export type TeamCreatedDetail = {
  code: number;
  status: string;
  data: TeamCreatedDetailItem[];
};

/* =======================
   METRICS (endpoint único) — con unidad y meta de rango
======================= */

export type RawMetricsResponse = {
  code: number;
  status: string;
  data: any;
};

export async function getMetrics(opts: {
  fechaDesde?: string;
  fechaHasta?: string;
  // unidad a convertir: 'hours' | 'days' (si se omite se devuelve en horas)
  unit?: "hours" | "days";
}) {
  const q = toQuery({
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
  });

  const json = await apiFetch<RawMetricsResponse>(`${endpoints.metrics.get}${q}`);

  const unit = opts.unit ?? "hours";

  // Helper: convierte minutes -> hours or days
  const convert = (v: any) => {
    const n = Number(v);
    if (isNaN(n)) return null;
    if (unit === "hours") return Math.round((n / 60) * 100) / 100; // 2 decimales
    return Math.round((n / 60 / 24) * 100000) / 100000; // días, 5 decimales
  };

  const raw = (json as any)?.data ?? {};

  // ============== Tickets del rango (paginando) ==============
  let ticketsPayload: {
    items: {
      id: number;
      codigo?: string | null;
      nombre?: string | null;
      id_alumno?: string | null;
      alumno_nombre?: string | null;
      created_at?: string | null;
      deadline?: string | null;
      estado?: string | null;
    }[];
    total: number;
  } | null = null;

  try {
    const { rawItems, total } = await fetchAllTicketsInRange({
      fechaDesde: opts.fechaDesde ?? "",
      fechaHasta: opts.fechaHasta ?? "",
      pageSize: 500,
      hardLimit: 10000,
    });

    const items = rawItems.map((r: any) => ({
      id: r.id,
      codigo: r.codigo ?? r.id_externo ?? r.external_id ?? null,
      nombre: r.nombre ?? r.subject ?? null,
      id_alumno: r.id_alumno ?? r.alumno_id ?? r.client_id ?? null,
      alumno_nombre: r.alumno_nombre ?? r.client_name ?? r.client ?? null,
      created_at: r.created_at ?? r.creacion ?? r.createdAt ?? null,
      deadline: r.deadline ?? null,
      estado: r.estado ?? r.status ?? null,
    }));

    ticketsPayload = { items, total: Number(total) || items.length };
  } catch (e) {
    ticketsPayload = null;
  }

  // ============== Normalización de métricas ==============
  const norm: any = { ...raw };
  norm.teams = norm.teams ?? {};

  // Totales: puede venir en teams.total
  const totalsSrc = norm.teams.total ?? norm.teams.totals ?? norm.total ?? {};
  const nestedTotals = totalsSrc.totals ?? totalsSrc.total ?? {};
  const ticketsFromNested = nestedTotals.tickets ?? nestedTotals.ticketsTotal;
  const ticketsFromTop = totalsSrc.tickets ?? totalsSrc.ticketsTotal;

  const toNumSafe = (v: any, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  const totals: any = {
    teams: toNumSafe(totalsSrc.teams ?? nestedTotals.teams),
    studentsTotal: toNumSafe(totalsSrc.studentsTotal ?? nestedTotals.studentsTotal),
    ticketsTotal: toNumSafe(ticketsFromTop ?? ticketsFromNested),
    avgResponseMin: toNumSafe(totalsSrc.avgResponseMin ?? nestedTotals.avgResponseMin),
    avgResolutionMin: toNumSafe(totalsSrc.avgResolutionMin ?? nestedTotals.avgResolutionMin),
    ...totalsSrc,
  };

  // Si "created.totals.tickets" existe, úsalo como tickets del periodo:
  try {
    const createdTotals =
      (totalsSrc?.created?.totals) ??
      (norm?.teams?.total?.created?.totals) ??
      (norm?.total?.created?.totals) ??
      null;
    const createdTickets = createdTotals?.tickets ?? createdTotals?.ticketsTotal ?? null;
    if (createdTickets !== null && createdTickets !== undefined) {
      totals.ticketsTotal = toNumSafe(createdTickets, totals.ticketsTotal);
    }
  } catch {}

  norm.teams.totals = totals;

  // Tickets series: asegurar shape
  const tsSrc =
    norm.teams.ticketsSeries ??
    norm.teams.total?.ticketsSeries ??
    norm.ticketsSeries ??
    {};

  const dailyArr = Array.isArray(tsSrc.daily) ? tsSrc.daily : Array.isArray(tsSrc) ? tsSrc : [];
  const weeklyArr = Array.isArray(tsSrc.weekly) ? tsSrc.weekly : [];
  const monthlyArr = Array.isArray(tsSrc.monthly) ? tsSrc.monthly : [];

  norm.teams.ticketsSeries = {
    daily: dailyArr.map((d: any) => ({
      date: d.date ?? d.day ?? d.label ?? "",
      count: toNumSafe(d.count ?? d.value, 0),
    })),
    weekly: weeklyArr.map((d: any) => ({
      week_start: d.week_start ?? d.week ?? d.start ?? "",
      count: toNumSafe(d.count ?? d.value, 0),
    })),
    monthly: monthlyArr.map((d: any) => ({
      month: d.month ?? d.mes ?? d.label ?? "",
      count: toNumSafe(d.count ?? d.value, 0),
    })),
  };

  // Tickets per (por día/semana/mes) — normalizar desde varias keys posibles
  const ticketsPerSrc =
    norm.teams.ticketsPer ?? norm.teams.per ?? norm.ticketsPer ?? {};
  norm.teams.ticketsPer = {
    day: toNumSafe(ticketsPerSrc.day ?? ticketsPerSrc.dia ?? ticketsPerSrc.today ?? ticketsPerSrc.todayCount, 0),
    week: toNumSafe(ticketsPerSrc.week ?? ticketsPerSrc.semana ?? ticketsPerSrc.weekly, 0),
    month: toNumSafe(ticketsPerSrc.month ?? ticketsPerSrc.mes ?? ticketsPerSrc.monthly ?? ticketsPerSrc.last30, 0),
  };

  // Asegurar respByCoach / respByTeam
  const mapResp = (arr: any[], xKey: string) =>
    (Array.isArray(arr) ? arr : []).map((r: any) => ({
      [xKey]: r[xKey] ?? r.nombre ?? r.name,
      tickets: toNumSafe(r.tickets, 0),
      responseMin: toNumSafe(r.response ?? r.responseMin, 0),
      resolutionMin: toNumSafe(r.resolution ?? r.resolutionMin, 0),
      response: convert(r.response ?? r.responseMin ?? null),
      resolution: convert(r.resolution ?? r.resolutionMin ?? null),
    }));

  norm.teams.respByCoach = mapResp(norm.teams.respByCoach, "coach");
  norm.teams.respByTeam = mapResp(norm.teams.respByTeam, "team");

  // Adjuntar tickets del rango a la respuesta normalizada
  if (ticketsPayload) {
    norm.tickets = ticketsPayload.items;
    norm.tickets_meta = {
      total: ticketsPayload.total,
      page: 1,
      pageSize: ticketsPayload.items.length,
      totalPages: 1,
    };
    // Si los totales no tienen tickets, usa el total del rango
    if (!norm.teams.totals?.ticketsTotal) {
      norm.teams.totals = norm.teams.totals ?? {};
      norm.teams.totals.ticketsTotal = toNumSafe(ticketsPayload.total, norm.tickets?.length ?? 0);
    }
  }

  // Meta de rango + timestamp para la UI
  const fromStr = opts.fechaDesde ?? null;
  const toStr = opts.fechaHasta ?? null;
  norm.meta = {
    ...(norm.meta ?? {}),
    range: {
      from: typeof fromStr === "string" ? fromStr : (fromStr ? new Date(fromStr).toISOString().slice(0, 10) : null),
      to: typeof toStr === "string" ? toStr : (toStr ? new Date(toStr).toISOString().slice(0, 10) : null),
    },
    fetchedAt: new Date().toISOString(),
  };

  return {
    raw: json,
    data: norm,
    unit,
  } as const;
}

/* =======================
   TEAMS CREATED ENDPOINTS
======================= */
export async function getTeamsCreated() {
  const json = await apiFetch<TeamCreatedTotal>(endpoints.team.created);
  return json; // { code, status, data: { total_teams } }
}

export async function getTeamsCreatedDetail() {
  const json = await apiFetch<TeamCreatedDetail>(endpoints.team.createdDetail);
  return json; // { code, status, data: [...] }
}

/* =======================
   Export
======================= */
export const dataService = {
  // Teams
  getTeams,
  getTeamsV2,

  // Clients / Students
  getClients,
  getStudents,

  // Tickets
  getTickets,
  getClientCoaches,
  getCoaches,
  getCoachStudents,

  // Utils
  groupTicketsByTeam,
  ticketsByDay,

  // Teams created
  getTeamsCreated,
  getTeamsCreatedDetail,

  // Metrics
  getMetrics,
};
