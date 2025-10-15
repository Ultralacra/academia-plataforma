// app/admin/alumnos/api.ts
// Módulo API local y autocontenido para la vista de Alumnos.
// NO depende de lib/api-config ni de data-service.

export type TeamMember = { name: string; url?: string | null };

export type StudentRow = {
  id: number;
  code?: string | null;
  name: string;
  teamMembers: TeamMember[];
  state?: string | null;
  stage?: string | null;
  joinDate?: string | null;
  lastActivity?: string | null;
  inactivityDays?: number | null;
  contractUrl?: string | null;
  ticketsCount?: number | null;
};

export type CoachTeam = {
  id: number;
  name: string;
  codigo?: string | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

function parseTeamAlumnos(raw: unknown): TeamMember[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === 'string' ? { name: v } : v))
      .filter((x): x is TeamMember => Boolean((x as any)?.name));
  }
  const s = String(raw);
  // formato esperado en API antigua: "Nombre (url), Nombre 2 (url)..."
  return s
    .split(/,\s+/)
    .map((t) => {
      const m = t.match(/^(.+?)\s*\((https?:\/\/[^\s)]+)\)\s*$/);
      if (m) return { name: m[1].trim(), url: m[2].trim() } as TeamMember;
      return { name: t.trim() } as TeamMember;
    })
    .filter((x) => x.name);
}

function cleanClientName(raw: any): string {
  if (raw == null) return '—';
  let s = String(raw);
  s = s.split('\n')[0];
  s = s.replace(/,+.*$/, '');
  s = s.replace(/^"+|"+$/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s || '—';
}

// 1) Alumnos — usa el endpoint directo con page=1&pageSize=1000
export async function getAllStudents(): Promise<StudentRow[]> {
  const url = 'https://v001.vercel.app/v1/client/get/clients?page=1&pageSize=1000';
  const json = await fetchJson<any>(url);

  // Puede venir como { data: [...] } o { clients: { data: [...] } } o { getClients: { data: [...] } }
  const rows: any[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.clients?.data)
    ? json.clients.data
    : Array.isArray(json?.getClients?.data)
    ? json.getClients.data
    : [];

  const items: StudentRow[] = rows.map((r) => ({
    id: r.id,
    code: r.codigo ?? r.code ?? null,
    name: cleanClientName(r.nombre ?? r.name),
    teamMembers: Array.isArray(r.teamMembers)
      ? r.teamMembers
      : parseTeamAlumnos(r.equipo ?? r.alumnos ?? null),

    state: r.estado ?? r.state ?? null,
    stage: r.etapa ?? r.stage ?? null,
    joinDate: r.ingreso ?? r.joinDate ?? null,
    lastActivity: r.ultima_actividad ?? r.lastActivity ?? null,
    inactivityDays: r.inactividad ?? r.inactivityDays ?? null,

    contractUrl: r.contrato ?? r.contractUrl ?? null,
    ticketsCount: r.tickets ?? r.ticketsCount ?? null,
  }));

  return items;
}

// 2) Coaches (desde equipos)
export async function getAllCoachesFromTeams(): Promise<CoachTeam[]> {
  const url = 'https://v001.vercel.app/v1/team/get/team?page=1&pageSize=10000';
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const coaches: CoachTeam[] = rows.map((r) => ({ id: r.id, name: r.nombre, codigo: r.codigo ?? null }));
  // dedupe por nombre (por si acaso)
  const seen = new Set<string>();
  return coaches.filter((c) => {
    const k = c.name?.toLowerCase?.() ?? '';
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// 3) (Siguiente paso) alumnos de un coach por ID de coach
export async function getCoachStudentsByCoachId(coachId: string): Promise<{ alumno: string; nombre: string }[]> {
  const url = `https://v001.vercel.app/v1/client/get/clients-coaches?coach=${encodeURIComponent(coachId)}`;
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const map = new Map<string, { alumno: string; nombre: string }>();
  rows.forEach((r) => {
    const code = String(r.id_alumno ?? '').trim();
    if (!code) return;
    if (!map.has(code)) map.set(code, { alumno: code, nombre: String(r.alumno_nombre ?? code) });
  });
  return Array.from(map.values());
}

// 4) Tickets por alumno (con soporte de filtro de estados opcional)
export type StudentTicket = {
  id: string;
  codigo?: string | null; // UUID del ticket para endpoints de archivos
  id_externo?: string | null; // codigo
  nombre?: string | null;
  tipo?: string | null;
  estado?: string | null;
  creacion: string;
  deadline?: string | null;
  id_alumno?: string | null;
  alumno_nombre?: string | null;
};

export async function getStudentTickets(
  alumnoCode: string,
  estados?: string[]
): Promise<StudentTicket[]> {
  const qs = new URLSearchParams();
  qs.set('alumno', alumnoCode);
  if (estados && estados.length > 0) qs.set('estado', estados.join(','));
  const url = `https://v001.vercel.app/v1/client/get/tickets/${encodeURIComponent(
    alumnoCode
  )}?${qs.toString()}`;
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => ({
    id: String(r.id),
    codigo: r.codigo ?? null,
    id_externo: r.codigo ?? null,
    nombre: r.nombre ?? null,
    tipo: r.tipo ?? null,
    estado: r.estado ?? null,
    creacion: r.creacion ?? r.created_at ?? r.createdAt,
    deadline: r.deadline ?? null,
    id_alumno: r.id_alumno ?? null,
    alumno_nombre: r.alumno_nombre ?? null,
  }));
}

// 5) Crear ticket (multipart/form-data). Campos esperados: nombre, id_alumno, tipo, archivos[]
export type CreateTicketForm = {
  nombre: string;
  id_alumno: string; // código del alumno
  tipo: string; // debe venir de opciones "tipo_ticket"
  archivos?: File[];
};

export async function createTicket(form: CreateTicketForm): Promise<any> {
  const url = 'https://v001.vercel.app/v1/ticket/create/ticket';
  const fd = new FormData();
  fd.set('nombre', form.nombre);
  fd.set('id_alumno', form.id_alumno);
  fd.set('tipo', form.tipo);
  (form.archivos ?? []).forEach((file) => fd.append('archivos', file));

  const res = await fetch(url, { method: 'POST', body: fd, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  return await res.json().catch(() => ({}));
}

// 6) Actualizar ticket por ID (JSON). No enviar alumno_url ni equipo en el body.
export type TicketUpdatePayload = Partial<{
  deadline: string | null;
  estado: string;
  id_externo: string | null;
  informante: string | null;
  plazo: number | null;
  prioridad: string | null;
  resolucion: string | null;
  restante: number | null;
  resuelto_por: string | null;
  revision: string | null;
  tarea: string | null;
}>;

export async function updateTicket(ticketId: string, payload: TicketUpdatePayload): Promise<any> {
  const url = `https://v001.vercel.app/v1/ticket/update/ticket/${encodeURIComponent(ticketId)}`;
  // Filtrar campos prohibidos y construir body limpio
  const rest: Record<string, any> = { ...(payload as any) };
  delete rest.alumno_url;
  delete rest.equipo;

  return await fetchJson<any>(url, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

// 7) Opciones
export type OpcionItem = {
  id: string;
  key: string; // opcion_key
  value: string; // opcion_value (label)
  group?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function getOpciones(opcion: string): Promise<OpcionItem[]> {
  const url = `https://v001.vercel.app/v1/opcion/get/opciones?opcion=${encodeURIComponent(opcion)}`;
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => {
    const id = String(r.opcion_id ?? r.id ?? r.valor ?? r.clave ?? r.key ?? r.nombre ?? "");
    const key = String(r.opcion_key ?? r.clave ?? r.key ?? r.valor ?? "");
    const value = String(r.opcion_value ?? r.valor ?? r.nombre ?? r.key ?? "");
    return {
      id,
      key,
      value,
      group: r.opcion_grupo ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
    } as OpcionItem;
  });
}

// 8) Archivos de ticket
export type TicketFile = {
  id: string;
  nombre_archivo: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  created_at: string | null;
};

export async function getTicketFiles(ticketId: string): Promise<TicketFile[]> {
  const url = `https://v001.vercel.app/v1/ticket/get/archivos/${encodeURIComponent(ticketId)}`;
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => ({
    id: String(r.id),
    nombre_archivo: r.nombre_archivo,
    mime_type: r.mime_type ?? null,
    tamano_bytes: r.tamano_bytes ?? null,
    created_at: r.created_at ?? null,
  }));
}

export async function getTicketFile(fileId: string): Promise<{
  id: string;
  ticket_id: string;
  nombre_archivo: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  contenido_base64: string;
  created_at: string | null;
}> {
  const url = `https://v001.vercel.app/v1/ticket/get/archivo/${encodeURIComponent(fileId)}`;
  const json = await fetchJson<any>(url);
  const d = json?.data ?? {};
  return {
    id: String(d.id ?? fileId),
    ticket_id: String(d.ticket_id ?? ''),
    nombre_archivo: d.nombre_archivo ?? 'archivo',
    mime_type: d.mime_type ?? null,
    tamano_bytes: d.tamano_bytes ?? null,
    contenido_base64: d.contenido_base64 ?? '',
    created_at: d.created_at ?? null,
  };
}
