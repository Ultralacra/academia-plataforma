// app/admin/alumnos/api.ts
// Módulo API local y autocontenido para la vista de Alumnos.
// Inyecta el token Bearer en todas las consultas.
import { getAuthToken } from "@/lib/auth";
import { apiFetch, buildUrl } from "@/lib/api-config";

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

async function fetchJson<T>(pathOrUrl: string, init?: RequestInit, timeoutMs = 12000): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : buildUrl(pathOrUrl);
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1000, timeoutMs));
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...(init?.headers as any) },
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status} on ${url}`);
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`Timeout ${timeoutMs}ms on ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
  const path = '/client/get/clients?page=1&pageSize=1000';
  const json = await fetchJson<any>(path);

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
    inactivityDays:
      r.dias_inactividad ?? r.inactividad ?? r.inactivityDays ?? null,

    contractUrl: r.contrato ?? r.contractUrl ?? null,
    ticketsCount: r.tickets ?? r.ticketsCount ?? null,
  }));

  return items;
}

// 2) Coaches (desde equipos)
export async function getAllCoachesFromTeams(): Promise<CoachTeam[]> {
  const path = '/team/get/team?page=1&pageSize=10000';
  const json = await fetchJson<any>(path);
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

// Crear alumno (multipart/form-data). Campos: nombre (obligatorio), contrato (opcional)
export async function createStudent(payload: {
  name: string;
  email: string;
  password: string;
  // role is always 'user' for alumnos
  // tipo is always 'cliente' for alumnos
}): Promise<{ id: number | string; codigo?: string | null; nombre: string }> {
  // Nuevo endpoint unificado de usuarios
  const url = buildUrl('/users');
  const body = {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role: 'alumno' as const,
    tipo: 'cliente' as const,
  };
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  const json = await res.json().catch(() => ({}));
  const d = (json?.data ?? json ?? {}) as any;
  return {
    id: d.id ?? d.user_id ?? d.codigo ?? payload.email,
    codigo: d.codigo ?? d.code ?? null,
    nombre: d.name ?? payload.name,
  };
}

// 3) (Siguiente paso) alumnos de un coach por ID de coach
export async function getCoachStudentsByCoachId(coachId: string): Promise<{ alumno: string; nombre: string }[]> {
  const path = `/client/get/clients-coaches?coach=${encodeURIComponent(coachId)}`;
  const json = await fetchJson<any>(path);
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
  const query = qs.toString();
  const path = `/client/get/tickets/${encodeURIComponent(alumnoCode)}${
    query ? `?${query}` : ''
  }`;
  const json = await fetchJson<any>(path);
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
  descripcion?: string;
  archivos?: File[];
  urls?: string[]; // enlaces opcionales asociados al ticket (separadas por coma en descripcion y/o campo urls)
  ai_run_id?: string; // ID de la corrida de IA
  message_ids?: string[]; // IDs de mensajes (array)
  estado?: string; // estado inicial opcional (ej: EN_PROGRESO)
};

export async function createTicket(form: CreateTicketForm): Promise<any> {
  const url = buildUrl('/ticket/create/ticket');
  const fd = new FormData();
  fd.set('nombre', form.nombre);
  fd.set('id_alumno', form.id_alumno);
  fd.set('tipo', form.tipo);
  if (form.estado) {
    try { fd.set('estado', form.estado); } catch {}
  }
  // Si vienen URLs, agregarlas a la descripcion en formato separado por comas
  let descripcion = form.descripcion || '';
  if (form.urls && form.urls.length > 0) {
    const unique = Array.from(new Set(form.urls.map((u) => u.trim()).filter(Boolean)));
    const urlsComma = unique.join(', ');
    descripcion = descripcion
      ? `${descripcion}\nURLs: ${urlsComma}`
      : urlsComma; // si el backend espera la URL en descripcion
    // También enviar el campo 'urls' si el backend lo soporta
    try {
      fd.set('urls', JSON.stringify(unique));
    } catch {}
  }
  // Nuevos campos para trazabilidad de IA
  if (form.ai_run_id) fd.set('ai_run_id', String(form.ai_run_id));
  if (Array.isArray(form.message_ids) && form.message_ids.length > 0) {
    const arr = form.message_ids.map(String);
    // ÚNICO campo message_ids como JSON (requerimiento):
    // ej: ["id1","id2",...]
    fd.set('message_ids', JSON.stringify(arr));
  }
  if (descripcion) fd.set('descripcion', descripcion);
  (form.archivos ?? []).forEach((file) => fd.append('archivos', file));
  // Log de depuración (solo en desarrollo) para verificar que realmente se envían los campos
  // Log diagnóstico SIEMPRE para confirmar qué se está enviando (puedes quitarlo cuando verifiques)
  try {
    const entries = Array.from(fd.entries());
    // eslint-disable-next-line no-console
    console.debug('[createTicket] Enviando FormData (debug):', entries);
    // eslint-disable-next-line no-console
    console.log('[createTicket] Enviando FormData (log):', entries);
  } catch {}
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const res = await fetch(url, { method: 'POST', body: fd, cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
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
  descripcion: string | null;
}>;

export async function updateTicket(ticketId: string, payload: TicketUpdatePayload): Promise<any> {
  // El endpoint documentado usa PUT para actualizar un ticket
  const path = `/ticket/update/ticket/${encodeURIComponent(ticketId)}`;
  // Filtrar campos prohibidos y construir body limpio
  const rest: Record<string, any> = { ...(payload as any) };
  delete rest.alumno_url;
  delete rest.equipo;

  return await fetchJson<any>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
  const path = `/opcion/get/opciones?opcion=${encodeURIComponent(opcion)}`;
  const json = await fetchJson<any>(path);
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
  const path = `/ticket/get/archivos/${encodeURIComponent(ticketId)}`;
  const json = await fetchJson<any>(path);
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
  const path = `/ticket/get/archivo/${encodeURIComponent(fileId)}`;
  const json = await fetchJson<any>(path);
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

// 10) Subir archivos a un ticket (form-data, key: 'archivos' = files[])
export async function uploadTicketFiles(ticketId: string, files: File[], urls?: string[]): Promise<any> {
  // Use apiFetch so buildUrl + auth headers are applied consistently
  const fd = new FormData();
  (files || []).forEach((f) => fd.append('archivos', f));
  if (urls && urls.length > 0) {
    // Enviar como un solo campo 'urls' en formato JSON para soportar múltiples URLs
    // Ej.: ["https://...","https://..."]
    fd.set('urls', JSON.stringify(urls));
  }
  return await apiFetch<any>(`/ticket/create/archivo/${encodeURIComponent(ticketId)}`, {
    method: 'POST',
    body: fd,
  });
}

// 10-bis) Adjuntar archivos existentes por ID (JSON { ids: [...] })
export async function attachTicketFilesByIds(ticketId: string, ids: string[]): Promise<any> {
  if (!ticketId) throw new Error('ticketId requerido');
  const clean = Array.from(new Set((ids || []).map(String).map((s) => s.trim()).filter(Boolean)));
  // Endpoint para duplicar/adjuntar archivos existentes por IDs al ticket creado
  // Corrección: solo un slash después de 'ticket'
  return await apiFetch<any>(`/ticket/duplicate/archivos/${encodeURIComponent(ticketId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: clean }),
  });
}

// 11) Eliminar archivo de ticket (asumimos endpoint DELETE)
// Nota: el endpoint real puede variar; se asume DELETE /v1/ticket/delete/archivo/{fileId}
export async function deleteTicketFile(fileId: string): Promise<any> {
  // Use apiFetch to ensure correct host and auth headers
  return await apiFetch<any>(`/ticket/delete/archivo/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
}

// 12-bis) Eliminar ticket por codigo (DELETE /v1/ticket/delete/ticket/:codigo)
export async function deleteTicket(ticketCodigo: string): Promise<any> {
  if (!ticketCodigo) throw new Error('ticketCodigo requerido');
  return await apiFetch<any>(
    `/ticket/delete/ticket/${encodeURIComponent(ticketCodigo)}`,
    { method: 'DELETE' }
  );
}

// 9) Actualizar cliente (etapa / estado / nicho)
export async function updateClient(clientCode: string, payload: Record<string, any>): Promise<any> {
  const path = `/client/update/client/${encodeURIComponent(clientCode)}`;
  return await fetchJson<any>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// 12) Historial de tareas del cliente
export type ClienteTareaHist = {
  id: number | string;
  codigo_cliente?: string | null;
  descripcion?: string | null;
  created_at: string;
};

export async function getClienteTareas(alumnoIdOrCode: string | number): Promise<ClienteTareaHist[]> {
  const key = String(alumnoIdOrCode);
  const path = `/client/get/cliente-tareas/${encodeURIComponent(key)}`;
  const json = await fetchJson<any>(path);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => ({
    id: r.id ?? r.tarea_id ?? `${key}-${r.created_at ?? ''}`,
    codigo_cliente: r.codigo_cliente ?? r.alumno ?? null,
    descripcion: r.descripcion ?? r.tarea ?? null,
    created_at: r.created_at ?? r.fecha ?? r.updated_at ?? new Date().toISOString(),
  }));
}

// 13) Historial de estatus del cliente
export type ClienteEstatusHist = {
  id: number | string;
  codigo_cliente?: string | null;
  estado_id: string;
  created_at: string;
};

export async function getClienteEstatus(alumnoCode: string): Promise<ClienteEstatusHist[]> {
  const path = `/client/get/cliente-estatus/${encodeURIComponent(alumnoCode)}`;
  const json = await fetchJson<any>(path);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => ({
    id: r.id ?? r.estatus_id ?? `${alumnoCode}-${r.created_at ?? ''}`,
    codigo_cliente: r.codigo_cliente ?? r.alumno ?? null,
    // El API devuelve 'estatus_id' (MEMBRESIA, PAUSADO, etc). Priorizar ese campo.
    estado_id: String(r.estatus_id ?? r.estado_id ?? r.estado ?? r.status ?? ''),
    created_at: r.created_at ?? r.fecha ?? r.updated_at ?? new Date().toISOString(),
  }));
}

// 14) Actualizar última tarea del cliente (form-data: ultima_tarea ISO)
export async function updateClientLastTask(clientCode: string, isoDate: string): Promise<any> {
  const url = buildUrl(`/client/update/client/${encodeURIComponent(clientCode)}`);
  const fd = new FormData();
  // Se espera una fecha en formato ISO (UTC)
  fd.set('ultima_tarea', isoDate);
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const res = await fetch(url, {
    method: 'PUT',
    body: fd,
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  return await res.json().catch(() => ({}));
}

// Subir contrato (multipart/form-data) para un cliente
export async function uploadClientContract(
  clientCode: string,
  contrato: File
): Promise<any> {
  const url = buildUrl(`/client/update/client/${encodeURIComponent(clientCode)}`);
  const fd = new FormData();
  fd.set('contrato', contrato);
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const res = await fetch(url, { method: 'PUT', body: fd, cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  return await res.json().catch(() => ({}));
}

// Descargar contrato (blob) por código de cliente
export async function downloadClientContractBlob(clientCode: string): Promise<{
  blob: Blob;
  filename?: string;
  contentType?: string | null;
}> {
  const url = buildUrl(`/client/download/contrato/${encodeURIComponent(clientCode)}`);
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const res = await fetch(url, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  const contentType = res.headers.get('Content-Type');
  const cd = res.headers.get('Content-Disposition') || '';
  let filename: string | undefined = undefined;
  try {
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    filename = decodeURIComponent((m?.[1] || m?.[2] || '').trim());
  } catch {}
  const blob = await res.blob();
  return { blob, filename, contentType };
}

// Eliminar alumno por código (DELETE /v1/client/delete/client/:codigo)
export async function deleteStudent(clientCode: string): Promise<any> {
  if (!clientCode) throw new Error('clientCode requerido');
  return await apiFetch<any>(
    `/client/delete/client/${encodeURIComponent(clientCode)}`,
    { method: 'DELETE' }
  );
}

// ===== ADS METRICS =====
// Tipos y helpers para CRUD básico de métricas de ADS

export type AdsMetricPayload = {
  estudiante: { codigo: string; nombre: string };
  periodo: { inicio: string | null; asignacion: string | null; fin: string | null };
  rendimiento: { inversion: number | null; facturacion: number | null; roas: number | null; roas_auto: boolean };
  embudo: { alcance: number | null; clics: number | null; visitas: number | null; pagos: number | null; carga_pagina: number | null };
  efectividades: { ads: number | null; pago: number | null; compra: number | null; auto: boolean };
  compras: { carnada: number | null; bump1: number | null; bump2: number | null; oto1: number | null; oto2: number | null; downsell: number | null };
  estado: { pauta_activa: boolean; requiere_interv: boolean; fase: string | null };
  coaches: { copy: string | null; plataformas: string | null };
  notas: { observaciones: string | null; intervencion_sugerida: string | null };
  metrics_raw: { auto_roas: boolean; auto_eff: boolean; pauta_activa: boolean; requiere_interv: boolean };
  calculados: { roas: number | null; eff_ads: number | null; eff_pago: number | null };
  meta: { generado_en: string; version: number };
};

export async function createAdsMetric(payload: AdsMetricPayload): Promise<any> {
  return await apiFetch<any>(`/ads-metrics/create/ads-metric`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getAdsMetrics(): Promise<any[]> {
  const json = await apiFetch<any>(`/ads-metrics/get/ads-metrics`);
  const rows: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? (json as any[]) : [];
  return rows;
}

// Nota: el endpoint /get/ads-metric/:codigo recibe el ID de la métrica, NO el código del alumno.
export async function getAdsMetricById(metricId: string): Promise<any | null> {
  if (!metricId) return null;
  const json = await apiFetch<any>(`/ads-metrics/get/ads-metric/${encodeURIComponent(metricId)}`);
  return (json?.data ?? json) || null;
}

export async function getAdsMetricByStudentCode(studentCode: string): Promise<any | null> {
  if (!studentCode) return null;
  const all = await getAdsMetrics();
  // Buscar por estudiante.codigo en la lista
  const found = (all || []).find((m: any) => (m?.estudiante?.codigo ?? m?.estudiante_codigo) === studentCode) || null;
  return found;
}

// saveAdsMetric: por ahora usamos el endpoint de create como upsert (si el backend ya soporta update, cambiar aquí)
export async function saveAdsMetric(payload: AdsMetricPayload): Promise<any> {
  return await createAdsMetric(payload);
}

export async function updateAdsMetric(metricId: string, payload: AdsMetricPayload): Promise<any> {
  if (!metricId) throw new Error('metricId requerido');
  return await apiFetch<any>(`/ads-metrics/update/ads-metric/${encodeURIComponent(metricId)}` ,{
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
