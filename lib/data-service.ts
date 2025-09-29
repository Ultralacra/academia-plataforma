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
  alumnos: TeamMember[];
  nAlumnos?: number | null;
  created_at?: string;
  updated_at?: string;
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
  joinDate?: string | null;      // YYYY-MM-DD
  lastActivity?: string | null;  // YYYY-MM-DD
  inactivityDays?: number | null;

  // otros
  contractUrl?: string | null;
  ticketsCount?: number | null;
};

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
  // formato: "Nombre (url), Nombre 2 (url)..."
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
  // La API te llega como string: "url1, url2, url3"
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* =======================
   TEAMS
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
    getTeam: {
      data: any[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(`${endpoints.team.list}${q}`);

  const data: Team[] =
    json.getTeam?.data?.map((r: any) => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      puesto: r.puesto ?? null,
      area: r.area ?? null,
      alumnos: parseTeamAlumnos(r.alumnos),
      nAlumnos: r.n_alumnos ?? r.nAlumnos ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })) ?? [];

  return {
    data,
    total: json.getTeam?.total ?? data.length,
    page: json.getTeam?.page ?? 1,
    pageSize: json.getTeam?.pageSize ?? data.length,
    totalPages: json.getTeam?.totalPages ?? 1,
  };
}

/* =======================
   CLIENTS (Alumnos) — consulta hasta 1000, paginación local
======================= */
export async function getClients(opts: {
  page?: number;            // ignorado para server; útil si quisieras logs
  pageSize?: number;        // ignorado para server; usamos 1000 fijo por defecto
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  // Pedimos un máximo de 1000 al servidor
  const q = toQuery({
    page: 1,
    pageSize: 1000, // <— como pediste
    search: opts.search ?? "",
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
  });

  const json = await apiFetch<{
    code: number;
    status: string;
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

  const payload = json.clients ?? json.getClients ?? {
    data: [],
    total: 0,
    page: 1,
    pageSize: 1000,
    totalPages: 1,
  };

  const items: ClientItem[] = (payload.data ?? []).map((r: any) => ({
    id: r.id,
    code: r.codigo ?? r.code ?? null,
    name: r.nombre ?? r.name ?? "—",
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
    pageSize: 10000, // <— como pediste
    search: opts.search ?? "",
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
  });

  const json = await apiFetch<{
    code: number;
    status: string;
    tickets?: {
      data: any[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
    getTickets?: {
      data: any[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(`${endpoints.ticket.list}${q}`);

  // Soportar ambas envolturas: "getTickets" (tu API) o "tickets"
  const payload =
    json.getTickets ??
    json.tickets ?? {
      data: [],
      total: 0,
      page: 1,
      pageSize: 10000,
      totalPages: 1,
    };

  const items: Ticket[] =
    (payload.data ?? []).map((r: any) => ({
      id: r.id,
      id_externo: r.id_externo ?? r.external_id ?? null,
      nombre: r.nombre ?? r.subject ?? null,
      alumno_nombre: r.alumno_nombre ?? r.client_name ?? null,
      estado: r.estado ?? r.status ?? null,
      tipo: r.tipo ?? r.type ?? null,
      creacion: r.creacion ?? r.created_at ?? r.createdAt,
      deadline: r.deadline ?? null,
      // tu API manda "equipo" (string con comas); también soportamos "equipo_urls"
      equipo_urls: parseEquipoUrls(r.equipo_urls ?? r.equipo ?? r.team_urls),
    })) ?? [];

  // Devolvemos items + metadatos neutros para paginar localmente
  return {
    items,
    total: payload.total ?? items.length,
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
   Export
======================= */
export const dataService = {
  getTeams,
  getClients,     // <- consulta 1000 por defecto (paginación local)
  getTickets,     // <- consulta 10 000 por defecto (paginación local)
  groupTicketsByTeam,
  ticketsByDay,
};
