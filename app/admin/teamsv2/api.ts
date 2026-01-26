// app/admin/teamsv2/api.ts
// Helpers para consultas relacionadas con el módulo teamsv2 (coaches)
import { apiFetch, buildUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";

export type CoachItem = {
  id: number;
  codigo: string;
  nombre: string;
  puesto?: string | null;
  area?: string | null;
  tickets?: number | null;
  alumnos?: number | null;
  created_at?: string | null;
};

export type CoachStudent = {
  id: number;
  id_relacion: string;
  id_coach: string;
  id_alumno: string;
  alumno_nombre: string;
  coach_nombre?: string;
  puesto?: string | null;
  area?: string | null;
  fase?: string | null;
  estatus?: string | null;
  updated_at?: string;
  created_at?: string;
};

async function fetchJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  // Delegamos en apiFetch que ya adjunta el token Bearer automáticamente
  return apiFetch<T>(pathOrUrl, init);
}

// ======================
// Mutaciones de alumno (reutiliza endpoint de /client/update/client/:codigo)
// Nota: el backend espera FormData para algunas keys (compatibilidad)
// ======================

export async function updateClientEtapa(clientCode: string, etapa: string): Promise<any> {
  if (!clientCode) throw new Error("clientCode requerido");
  const url = buildUrl(`/client/update/client/${encodeURIComponent(clientCode)}`);
  const fd = new FormData();
  fd.set("etapa", String(etapa ?? ""));
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const res = await fetch(url, {
    method: "PUT",
    body: fd,
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  return await res.json().catch(() => ({}));
}

// Enviar como key: ingreso (YYYY-MM-DD o ISO). Si viene vacío, se limpia.
export async function updateClientIngreso(
  clientCode: string,
  ingreso: string | null,
): Promise<any> {
  if (!clientCode) throw new Error("clientCode requerido");
  const url = buildUrl(`/client/update/client/${encodeURIComponent(clientCode)}`);
  const fd = new FormData();
  fd.set("ingreso", String(ingreso ?? ""));
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const res = await fetch(url, {
    method: "PUT",
    body: fd,
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  return await res.json().catch(() => ({}));
}

export async function getCoaches(opts?: { page?: number; pageSize?: number; search?: string }) {
  const q = new URLSearchParams();
  if (opts?.page) q.set("page", String(opts.page));
  if (opts?.pageSize) q.set("pageSize", String(opts.pageSize));
  if (opts?.search) q.set("search", String(opts.search));
  const url = `/team/get/team?${q.toString()}`;
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    puesto: r.puesto ?? null,
    area: r.area ?? null,
    tickets: r.tickets ?? null,
    alumnos: r.alumnos ?? null,
    created_at: r.created_at ?? null,
  })) as CoachItem[];
}

export async function getCoachByCode(code: string) {
  const list = await getCoaches({ page: 1, pageSize: 10000, search: code });
  return list.find((c) => (c.codigo || "").toLowerCase() === (code || "").toLowerCase()) ?? null;
}

export async function getCoachById(id: number) {
  // Endpoint público no tiene un GET por id directo en la spec conocida, intentar buscar en la lista.
  const list = await getCoaches({ page: 1, pageSize: 10000 });
  return list.find((c) => c.id === id) ?? null;
}

export async function getCoachStudents(coachCode: string) {
  const url = `/client/get/clients-coaches?coach=${encodeURIComponent(
    coachCode
  )}`;
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => ({
    id: r.id,
    id_relacion: r.id_relacion,
    id_coach: r.id_coach,
    id_alumno: r.id_alumno,
    alumno_nombre: r.alumno_nombre,
    coach_nombre: r.coach_nombre,
    puesto: r.puesto ?? null,
    area: r.area ?? null,
    fase: r.fase ?? null,
    estatus: r.estatus ?? r.status ?? null,
    updated_at: r.updated_at ?? null,
    created_at: r.created_at ?? null,
  })) as CoachStudent[];
}

// ======================
// Tickets por coach
// ======================
export type CoachTicket = {
  id: number;
  codigo: string;
  nombre: string | null;
  id_alumno: string | null;
  alumno_nombre: string | null;
  informante?: string | null;
  informante_nombre?: string | null;
  created_at: string | null;
  deadline: string | null;
  resuelto_por?: string | null;
  resuelto_por_nombre?: string | null;
  ultimo_estado?: { estatus?: string; fecha?: string } | string | null;
  estado: "PENDIENTE" | "EN_PROGRESO" | "PENDIENTE_DE_ENVIO" | "RESUELTO" | string;
  plazo_info?: {
    horas_restantes: number;
    fue_respondido: boolean;
  } | null;
};

export type CoachTicketsResponse = {
  data: CoachTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function normalizeEstado(value: any): CoachTicket["estado"] {
  const raw = String(value ?? "").trim();
  const upper = raw
    .normalize("NFD") // remove accents
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "_")
    .toUpperCase();
  if (upper === "PENDIENTE" || upper === "EN_PROGRESO" || upper === "RESUELTO")
    return upper as CoachTicket["estado"];
  if (upper === "PENDIENTE_DE_ENVIO") return "PENDIENTE_DE_ENVIO";
  // fallback to raw if unexpected
  return (upper || raw) as CoachTicket["estado"];
}

export async function getCoachTickets(params: {
  coach: string; // id/código de coach que espera el endpoint
  page?: number;
  pageSize?: number;
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string; // YYYY-MM-DD
}): Promise<CoachTicketsResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("pageSize", String(params.pageSize ?? 50));
  q.set("coach", params.coach);
  if (params.fechaDesde) q.set("fechaDesde", params.fechaDesde);
  if (params.fechaHasta) q.set("fechaHasta", params.fechaHasta);
  const url = `/ticket/get/ticket?${q.toString()}`;
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const data: CoachTicket[] = rows.map((r) => ({
    id: Number(r.id),
    codigo: String(r.codigo ?? ""),
    nombre: r.nombre ?? null,
    id_alumno: r.id_alumno ?? null,
    alumno_nombre: r.alumno_nombre ?? null,
    informante: r.informante ?? r.informado_por ?? null,
    informante_nombre: r.informante_nombre ?? null,
    created_at: r.created_at ?? null,
    deadline: r.deadline ?? null,
  ultimo_estado: r.ultimo_estado ?? null,
    resuelto_por: r.resuelto_por ?? null,
    resuelto_por_nombre: r.resuelto_por_nombre ?? null,
    estado: normalizeEstado(r.estado),
    plazo_info: r.plazo_info
      ? {
          horas_restantes: Number(r.plazo_info.horas_restantes),
          fue_respondido: Boolean(r.plazo_info.fue_respondido),
        }
      : null,
  }));
  return {
    data,
    total: Number(json?.total ?? data.length),
    page: Number(json?.page ?? (params.page ?? 1)),
    pageSize: Number(json?.pageSize ?? (params.pageSize ?? 50)),
    totalPages: Number(json?.totalPages ?? 1),
  };
}

export type CreateCoachPayload = {
  name: string;
  email: string;
  password: string;
  role: string; // e.g., "manager"
  tipo: "equipo";
  puesto?: string | null;
  area?: string | null;
};

export async function createCoach(payload: CreateCoachPayload) {
  // Nuevo endpoint de creación de usuario/coach
  const url = `/auth/register`;
  // log for debugging
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url, 'payload=', payload);
  return fetchJson<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export type UpdateCoachPayload = {
  nombre?: string;
  puesto?: string | null;
  area?: string | null;
};

export async function updateCoach(code: string, payload: UpdateCoachPayload) {
  const url = `/team/update/team/${encodeURIComponent(code)}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] PUT', url, 'payload=', payload);
  return fetchJson<any>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteCoach(code: string) {
  const url = `/team/delete/team/${encodeURIComponent(code)}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] DELETE', url);
  return fetchJson<any>(url, { method: 'DELETE' });
}

// ======================
// Sesiones (coach ↔ alumno)
// ======================

export type SessionItem = {
  id: string | number;
  codigo?: string | null;
  codigo_alumno: string;
  alumno_nombre?: string | null;
  codigo_coach: string;
  coach_nombre?: string | null;
  etapa?: string | null;
  fecha_programada?: string | null; // ISO
  duracion?: number | null; // minutos
  notas?: string | null;
  estado?: string | null; // p.ej. offered, approved, canceled
  created_at?: string | null;
  updated_at?: string | null;
};

export type ListSessionsParams = {
  coach?: string; // codigo del coach
  alumno?: string; // codigo del alumno
  estado?: string;
  page?: number;
  pageSize?: number;
};

export async function listSessions(params: ListSessionsParams = {}): Promise<SessionItem[]> {
  const q = new URLSearchParams();
  if (params.coach) q.set('coach', params.coach);
  if (params.alumno) q.set('alumno', params.alumno);
  if (params.estado) q.set('estado', params.estado);
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  const url = `/session/` + (q.toString() ? `?${q.toString()}` : '');
  const json = await fetchJson<any>(url);
  const rows: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  return rows.map((r) => ({
    id: r.id ?? r.session_id ?? r.codigo ?? r.code,
    codigo: r.codigo ?? r.code ?? null,
    codigo_alumno: String(r.codigo_alumno ?? r.alumno ?? r.id_alumno ?? ''),
    alumno_nombre: r.alumno_nombre ?? r.nombre_alumno ?? null,
    codigo_coach: String(r.codigo_coach ?? r.coach ?? r.id_coach ?? ''),
    coach_nombre: r.coach_nombre ?? r.nombre_coach ?? null,
    etapa: r.etapa ?? r.stage ?? null,
    fecha_programada: r.fecha_programada ?? r.programada ?? r.fecha ?? null,
    duracion: r.duracion != null ? Number(r.duracion) : null,
    notas: r.notas ?? r.detalle ?? null,
    estado: r.estado ?? r.status ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  })) as SessionItem[];
}

export async function getSessionById(id: string | number): Promise<SessionItem | null> {
  const url = `/session/${encodeURIComponent(String(id))}`;
  const json = await fetchJson<any>(url);
  const r = json?.data ?? json;
  if (!r) return null;
  return {
    id: r.id ?? id,
    codigo: r.codigo ?? r.code ?? null,
    codigo_alumno: String(r.codigo_alumno ?? r.alumno ?? r.id_alumno ?? ''),
    alumno_nombre: r.alumno_nombre ?? r.nombre_alumno ?? null,
    codigo_coach: String(r.codigo_coach ?? r.coach ?? r.id_coach ?? ''),
    coach_nombre: r.coach_nombre ?? r.nombre_coach ?? null,
    etapa: r.etapa ?? r.stage ?? null,
    fecha_programada: r.fecha_programada ?? r.programada ?? r.fecha ?? null,
    duracion: r.duracion != null ? Number(r.duracion) : null,
    notas: r.notas ?? r.detalle ?? null,
    estado: r.estado ?? r.status ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  } as SessionItem;
}

export type OfferSessionPayload = {
  codigo_alumno: string;
  codigo_coach: string;
  etapa?: string | null;
  fecha_programada: string; // ISO local o UTC
  duracion?: number; // minutos (default 45)
  notas: string; // requerido
};

export async function offerSession(payload: OfferSessionPayload): Promise<any> {
  const url = `/session/offer`;
  const body = {
    codigo_alumno: payload.codigo_alumno,
    codigo_coach: payload.codigo_coach,
    etapa: payload.etapa ?? undefined,
    fecha_programada: payload.fecha_programada,
    duracion: payload.duracion ?? 45,
    notas: payload.notas,
  };
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url, 'payload=', body);
  return fetchJson<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// El alumno solicita una sesión con su coach
export type RequestSessionPayload = OfferSessionPayload;
export async function requestSession(payload: RequestSessionPayload): Promise<any> {
  const url = `/session/request`;
  const body = {
    codigo_alumno: payload.codigo_alumno,
    codigo_coach: payload.codigo_coach,
    etapa: payload.etapa ?? undefined,
    fecha_programada: payload.fecha_programada,
    duracion: payload.duracion ?? 60,
    notas: payload.notas,
  };
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url, 'payload=', body);
  return fetchJson<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export type UpdateSessionPayload = Partial<{
  fecha_programada: string;
  notas: string;
  etapa: string | null;
  estado: string; // e.g., approved, canceled, done
  duracion: number;
}>;

export async function updateSession(id: string | number, payload: UpdateSessionPayload): Promise<any> {
  const url = `/session/${encodeURIComponent(String(id))}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] PUT', url, 'payload=', payload);
  return fetchJson<any>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteSession(id: string | number): Promise<any> {
  const url = `/session/${encodeURIComponent(String(id))}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] DELETE', url);
  return fetchJson<any>(url, { method: 'DELETE' });
}

// Aprobar una sesión solicitada por el alumno
export async function approveSession(id: string | number): Promise<any> {
  const url = `/session/approve/${encodeURIComponent(String(id))}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url);
  return fetchJson<any>(url, { method: 'POST' });
}

// El alumno acepta una sesión ofrecida por el coach
export async function acceptSession(id: string | number): Promise<any> {
  const url = `/session/accept/${encodeURIComponent(String(id))}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url);
  return fetchJson<any>(url, { method: 'POST' });
}

// Traer sesión por código (cuando el backend trata código y id distinto)
export async function getSessionByCode(codigo: string): Promise<SessionItem | null> {
  const url = `/session/${encodeURIComponent(String(codigo))}`;
  const json = await fetchJson<any>(url);
  const r = json?.data ?? json;
  if (!r) return null;
  return {
    id: r.id ?? r.session_id ?? r.codigo ?? codigo,
    codigo: r.codigo ?? r.code ?? String(codigo),
    codigo_alumno: String(r.codigo_alumno ?? r.alumno ?? r.id_alumno ?? ''),
    alumno_nombre: r.alumno_nombre ?? r.nombre_alumno ?? null,
    codigo_coach: String(r.codigo_coach ?? r.coach ?? r.id_coach ?? ''),
    coach_nombre: r.coach_nombre ?? r.nombre_coach ?? null,
    etapa: r.etapa ?? r.stage ?? null,
    fecha_programada: r.fecha_programada ?? r.programada ?? r.fecha ?? null,
    duracion: r.duracion != null ? Number(r.duracion) : null,
    notas: r.notas ?? r.detalle ?? null,
    estado: r.estado ?? r.status ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  } as SessionItem;
}

// Listar historial de sesiones de un alumno (y opcionalmente por coach)
// Asunción: el backend acepta una ruta tipo `/session/:codigoAlumno?codigo_alumno=...&codigo_coach=...`
// Si no, caemos a `/session/?alumno=...&coach=...` como fallback.
export async function listAlumnoSessions(codigoAlumno: string, codigoCoach?: string): Promise<SessionItem[]> {
  // El backend NO acepta el segmento /:codigo_alumno en la ruta; se debe usar solo query params.
  try {
    const q = new URLSearchParams();
    if (codigoAlumno) q.set('codigo_alumno', codigoAlumno);
    if (codigoCoach) q.set('codigo_coach', codigoCoach);
    const url = `/session?${q.toString()}`;
    const json = await fetchJson<any>(url);
    const rows: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    return rows.map((r) => ({
      id: r.id ?? r.session_id ?? r.codigo ?? r.code,
      codigo: r.codigo ?? r.code ?? null,
      codigo_alumno: String(r.codigo_alumno ?? r.alumno ?? r.id_alumno ?? codigoAlumno),
      alumno_nombre: r.alumno_nombre ?? r.nombre_alumno ?? null,
      codigo_coach: String(r.codigo_coach ?? r.coach ?? r.id_coach ?? codigoCoach ?? ''),
      coach_nombre: r.coach_nombre ?? r.nombre_coach ?? null,
      etapa: r.etapa ?? r.stage ?? null,
      fecha_programada: r.fecha_programada ?? r.programada ?? r.fecha ?? null,
      duracion: r.duracion != null ? Number(r.duracion) : null,
      notas: r.notas ?? r.detalle ?? null,
      estado: r.estado ?? r.status ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
    })) as SessionItem[];
  } catch (e) {
    // Fallback a la lista estándar con filtros por alumno/coach (nombres genéricos)
    return listSessions({ alumno: codigoAlumno, coach: codigoCoach });
  }
}

// ===== Acciones rápidas de sesión =====
export async function cancelSession(id: string | number): Promise<any> {
  const url = `/session/cancel/${encodeURIComponent(String(id))}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url);
  return fetchJson<any>(url, { method: 'POST' });
}

export type RescheduleSessionPayload = {
  fecha_programada: string; // ISO
  notas?: string;
};

export async function rescheduleSession(id: string | number, payload: RescheduleSessionPayload): Promise<any> {
  const url = `/session/reschedule/${encodeURIComponent(String(id))}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url, 'payload=', payload);
  return fetchJson<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function completeSession(id: string | number): Promise<any> {
  const url = `/session/complete/${encodeURIComponent(String(id))}`;
  // eslint-disable-next-line no-console
  console.debug('[teamsv2 api] POST', url);
  return fetchJson<any>(url, { method: 'POST' });
}

// ======================
// Reasignación de tickets
// ======================

export async function reassignTicket(
  ticketId: string,
  codigoEquipo: string
) {
  if (!ticketId) throw new Error("ticketId requerido");
  if (!codigoEquipo) throw new Error("codigoEquipo requerido");
  const path = `/ticket/reassign/ticket/${encodeURIComponent(ticketId)}`;
  return fetchJson<any>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo_equipo: codigoEquipo }),
  });
}

// ======================
// Comentarios / Observaciones
// ======================

export type TicketComment = {
  id: string;
  ticket_id: string;
  user_codigo?: string;
  user_nombre?: string;
  contenido: string;
  created_at: string;
  updated_at?: string;
};

export async function getTicketComments(ticketCode: string) {
  if (!ticketCode) return [];
  const path = `/ticket/get/public-comments/${encodeURIComponent(ticketCode)}`;
  const res = await fetchJson<any>(path);
  const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  return list as TicketComment[];
}

export async function createTicketComment(ticketCode: string, contenido: string) {
  if (!ticketCode) throw new Error("Código de ticket requerido");
  if (!contenido) throw new Error("Contenido requerido");
  const path = `/ticket/create/public-comment/${encodeURIComponent(ticketCode)}`;
  return fetchJson<any>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contenido }),
  });
}

export async function updateTicketComment(commentId: number | string, contenido: string) {
  if (!commentId) throw new Error("ID de comentario requerido");
  const path = `/ticket/update/comment/${encodeURIComponent(commentId)}`;
  return fetchJson<any>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contenido }),
  });
}

export async function deleteTicketComment(commentId: number | string) {
  if (!commentId) throw new Error("ID de comentario requerido");
  const path = `/ticket/delete/public-comment/${encodeURIComponent(commentId)}`;
  return fetchJson<any>(path, {
    method: "DELETE",
  });
}

// ======================
// Notas Internas (Internal Notes)
// ======================

export type InternalNote = {
  id: string;
  ticket_id: string;
  user_codigo?: string;
  user_nombre?: string;
  contenido: string;
  created_at: string;
  updated_at?: string;
};

export async function getInternalNotes(ticketCode: string) {
  if (!ticketCode) return [];
  const path = `/ticket/get/comments/${encodeURIComponent(ticketCode)}`;
  const res = await fetchJson<any>(path);
  const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  return list as InternalNote[];
}

export async function createInternalNote(ticketCode: string, contenido: string) {
  if (!ticketCode) throw new Error("Código de ticket requerido");
  if (!contenido) throw new Error("Contenido requerido");
  const path = `/ticket/create/comment/${encodeURIComponent(ticketCode)}`;
  return fetchJson<any>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contenido }),
  });
}

export async function updateInternalNote(noteId: number | string, contenido: string) {
  if (!noteId) throw new Error("ID de nota requerido");
  const path = `/ticket/update/comment/${encodeURIComponent(noteId)}`;
  return fetchJson<any>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contenido }),
  });
}

export async function deleteInternalNote(noteId: number | string) {
  if (!noteId) throw new Error("ID de nota requerido");
  const path = `/ticket/delete/comment/${encodeURIComponent(noteId)}`;
  return fetchJson<any>(path, {
    method: "DELETE",
  });
}

// ======================
// Tareas (Links asociados al ticket)
// ======================

export async function deleteTicketLink(linkId: number | string) {
  if (!linkId) throw new Error("ID de link requerido");
  const path = `/ticket/delete/link/${encodeURIComponent(linkId)}`;
  return fetchJson<any>(path, {
    method: "DELETE",
  });
}

export async function createTicketLink(
  ticketCode: string,
  payload: { url: string; title?: string }
) {
  if (!ticketCode) throw new Error("Código de ticket requerido");
  const path = `/ticket/create/link/${encodeURIComponent(ticketCode)}`;
  return fetchJson<any>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: payload.url, title: payload.title }),
  });
}
