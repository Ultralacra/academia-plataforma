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
    pageSize: 1000,
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
      inactivityDays: r.inactividad ?? r.inactivityDays ?? null,

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
    inactivityDays: r.inactivityDays ?? r.inactividad ?? null,

    contractUrl: r.contrato ?? r.contractUrl ?? null,
    ticketsCount: r.ticketsCount ?? r.tickets ?? null,
  }));

  return {
    items,
    total: items.length,
  };
}

/* ============
   Alias para Students
   (para que StudentsContent use dataService.getStudents y StudentItem)
=========== */
export async function getStudents(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  // Simplemente reutilizamos la normalización de getClients
  return getClients(opts);
}

/* =======================
   TICKETS — consulta hasta 10 000, paginación local
======================= */
export async function getTickets(opts: {
  // page y pageSize ya no afectan al servidor; se pagina en cliente
  page?: number;
  pageSize?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  const q = toQuery({
    page: 1,
    pageSize: 10000, // seguimos pidiendo mucho y paginamos localmente
    search: opts.search ?? "",
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
  });

  // Soportar NUEVA respuesta plana { code, status, data: [...] }
  // y también las envolturas antiguas { getTickets: { data, total, ... } } o { tickets: { ... } }
  const json = await apiFetch<{
    code?: number;
    status?: string;
    // nueva
    data?: any[];
    // antiguas
    tickets?: { data: any[]; total?: number };
    getTickets?: { data: any[]; total?: number };
  }>(`${endpoints.ticket.list}${q}`);

  const rows: any[] =
    (json as any)?.data ??
    (json as any)?.getTickets?.data ??
    (json as any)?.tickets?.data ??
    [];

  const items: Ticket[] = rows.map((r: any) => ({
    id: r.id,
    // en la nueva viene "codigo" (uuid). Lo mapeamos a id_externo para mantener compat.
    id_externo: r.id_externo ?? r.external_id ?? r.codigo ?? null,
    nombre: r.nombre ?? r.subject ?? null,
    alumno_nombre: r.alumno_nombre ?? r.client_name ?? null,
    estado: r.estado ?? r.status ?? null,
    tipo: r.tipo ?? r.type ?? null,
    // la nueva usa "created_at"
    creacion: r.creacion ?? r.created_at ?? r.createdAt,
    deadline: r.deadline ?? null,
    // ahora no llega el equipo; dejamos array vacío si no existe
    equipo_urls: parseEquipoUrls(r.equipo_urls ?? r.equipo ?? r.team_urls),
  }));

  const totalAntiguo =
    (json as any)?.getTickets?.total ?? (json as any)?.tickets?.total;

  return {
    items,
    total: typeof totalAntiguo === "number" ? totalAntiguo : items.length,
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


// lib/data-service.ts
export async function getClientCoaches(alumnoCode: string): Promise<{
  alumno: string;
  alumno_nombre: string;
  coaches: CoachMember[];
}> {
  const q = toQuery({ alumno: alumnoCode });

  // 👈 usar el endpoint correcto
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


/* =======================
   Export
======================= */
export const dataService = {
  // Teams
  getTeams,     // versión original (soporta {data} y {getTeam})
  getTeamsV2,   // versión nueva (lee { data: [...] })

  // Clients / Students
  getClients,   // consulta 1000 por defecto (paginación local)
  getStudents,  // ⟵ alias usado por StudentsContent
                //     (devuelve el mismo shape que getClients)

  // Tickets
  getTickets,   // consulta 10 000 por defecto (paginación local)
  getClientCoaches, // ⟵ añade esta línea

  // Utils
  groupTicketsByTeam,
  ticketsByDay,
};
