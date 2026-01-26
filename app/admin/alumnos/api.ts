// app/admin/alumnos/api.ts
// Módulo API local y autocontenido para la vista de Alumnos.
// Inyecta el token Bearer en todas las consultas.
import { getAuthToken } from "@/lib/auth";
import { apiFetch, buildUrl } from "@/lib/api-config";

// Evita requests duplicadas por montajes múltiples (p.ej. React 18 StrictMode)
// y permite cachear catálogos que casi no cambian.
const inflight = new Map<string, Promise<unknown>>();

type CacheEntry<T> = { at: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

const SESSION_CACHE_PREFIX = "academia:cache:";

function sessionKey(key: string): string {
  return `${SESSION_CACHE_PREFIX}${key}`;
}

function sessionGet<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed !== "object") return null;
    const at = (parsed as any).at;
    if (typeof at !== "number" || !Number.isFinite(at)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sessionSet<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(sessionKey(key), JSON.stringify(entry));
  } catch {
    // Ignorar (quota/JSON) para no romper la app
  }
}

function sessionDeleteByPrefix(prefix: string): void {
  if (typeof window === "undefined") return;
  try {
    const fullPrefix = sessionKey(prefix);
    // sessionStorage no soporta búsqueda por prefijo; iteramos keys.
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        window.sessionStorage.removeItem(k);
      }
    }
  } catch {
    // noop
  }
}

function cacheGet<T>(key: string, ttlMs: number): T | null {
  const now = Date.now();

  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit) {
    if (now - hit.at > ttlMs) {
      cache.delete(key);
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(sessionKey(key));
        }
      } catch {}
      return null;
    }
    return hit.value;
  }

  // Fallback: sessionStorage (sobrevive recargas en la misma pestaña)
  const persisted = sessionGet<T>(key);
  if (!persisted) return null;
  if (now - persisted.at > ttlMs) {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(sessionKey(key));
      }
    } catch {}
    return null;
  }
  cache.set(key, persisted as unknown as CacheEntry<unknown>);
  return persisted.value;
}

function cacheSet<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { at: Date.now(), value };
  cache.set(key, entry as unknown as CacheEntry<unknown>);
  // Persistir en sesión para sobrevivir a recargas (mientras dure la pestaña)
  sessionSet(key, entry);
}

function formatTimeout(ms: number): string {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return `${ms}ms`;
  if (n >= 60_000) {
    const min = Math.round((n / 60_000) * 10) / 10;
    return `${min}min`;
  }
  const sec = Math.round((n / 1000) * 10) / 10;
  return `${sec}s`;
}

function cacheDeleteByPrefix(prefix: string): void {
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(prefix)) cache.delete(k);
  }

  // Mantener sessionStorage consistente con la memoria.
  sessionDeleteByPrefix(prefix);
}

function invalidateStudentsCache(): void {
  cacheDeleteByPrefix("students:");
}

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

/* =======================
   Bonos
======================= */

export type BonoMetadata = {
  tipo?: string | null;
  max_usos?: number | null;
  [k: string]: any;
};

export type Bono = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  valor?: string | number | null;
  metadata?: BonoMetadata | null;
  created_at?: string | null;
  updated_at?: string | null;
  inactivado?: number | boolean | null;
};

export type BonoAssignment = Bono & {
  bono_codigo: string;
  alumno_codigo: string;
  cantidad: number;
  fecha_asignacion?: string | null;
  fecha_vencimiento?: string | null;
  usado?: number | boolean | null;
  notas?: string | null;
};

export async function getAllBonos(params?: {
  page?: number;
  pageSize?: number;
  includeInactivos?: boolean;
}): Promise<Bono[]> {
  // OJO: buildUrl() ya agrega /v1. Aquí usamos paths sin el prefijo /v1.
  // Backend: listar todos los bonos => GET /v1/bonos/get/bono (sin params)
  // (Los params se mantienen por compatibilidad, pero este endpoint no los usa.)
  void params;
  const json = await fetchJson<any>(`/bonos/get/bono`);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows as Bono[];
}

export async function getBonoByCodigo(codigo: string): Promise<Bono | null> {
  if (!codigo) return null;
  const json = await fetchJson<any>(
    `/bonos/get/bono/${encodeURIComponent(codigo)}`
  );
  return (json?.data ?? null) as Bono | null;
}

export async function createBono(payload: {
  codigo: string;
  nombre: string;
  descripcion?: string;
  valor?: number;
  metadata?: BonoMetadata;
}): Promise<{ id: number; codigo: string } | null> {
  const json = await fetchJson<any>(`/bonos/create/bono`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (json?.data ?? null) as { id: number; codigo: string } | null;
}

export async function updateBono(
  codigo: string,
  payload: Partial<{
    nombre: string;
    valor: number;
    descripcion: string;
    metadata: BonoMetadata;
    inactivado: number | boolean;
  }>
): Promise<Bono | null> {
  if (!codigo) return null;
  const json = await fetchJson<any>(
    `/bonos/update/bono/${encodeURIComponent(codigo)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  return (json?.data ?? null) as Bono | null;
}

export async function deleteBono(codigo: string): Promise<boolean> {
  if (!codigo) return false;
  await fetchJson<any>(`/bonos/delete/bono/${encodeURIComponent(codigo)}`,
    { method: "DELETE" }
  );
  return true;
}

// Desasignar un bono de un alumno.
// Nota: el backend expuso esta operación en DELETE /v1/bonos/delete/bono/:codigo
// (buildUrl() ya agrega /v1, por eso aquí no se incluye).
export async function unassignBonoFromAlumno(codigo: string): Promise<boolean> {
  if (!codigo) return false;
  await fetchJson<any>(`/bonos/delete/bono/${encodeURIComponent(codigo)}`,
    { method: "DELETE" }
  );
  return true;
}

// Desasignar un bono de un alumno (endpoint correcto por body).
// Backend: DELETE /v1/bonos/unassign/bono (con body JSON)
export async function unassignBonoFromAlumnoByBody(payload: {
  bono_codigo: string;
  alumno_codigo: string;
}): Promise<any> {
  const bonoCodigo = String(payload?.bono_codigo ?? "").trim();
  const alumnoCodigo = String(payload?.alumno_codigo ?? "").trim();
  if (!bonoCodigo || !alumnoCodigo) {
    throw new Error("Faltan datos: bono_codigo y alumno_codigo");
  }
  return await fetchJson<any>(`/bonos/unassign/bono`, {
    method: "DELETE",
    body: JSON.stringify({ bono_codigo: bonoCodigo, alumno_codigo: alumnoCodigo }),
  });
}

export async function assignBonoToAlumno(payload: {
  bono_codigo: string;
  alumno_codigo: string;
  cantidad: number;
  fecha_vencimiento: string;
  notas: string;
}): Promise<any> {
  const json = await fetchJson<any>(`/bonos/assign/bono`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json;
}

export async function getBonoAssignmentsByAlumnoCodigo(
  alumnoCodigo: string,
  params?: { page?: number; pageSize?: number }
): Promise<BonoAssignment[]> {
  if (!alumnoCodigo) return [];
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 1000;
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const json = await fetchJson<any>(
    `/bonos/get/assignments/${encodeURIComponent(alumnoCodigo)}?${qs.toString()}`
  );
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows as BonoAssignment[];
}

async function fetchJson<T>(pathOrUrl: string, init?: RequestInit, timeoutMs = 60_000): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : buildUrl(pathOrUrl);
  const method = String(init?.method ?? "GET").toUpperCase();
  const isGet = method === "GET" && !init?.body;
  const inflightKey = isGet ? `GET ${url}` : null;

  if (inflightKey) {
    const existing = inflight.get(inflightKey) as Promise<T> | undefined;
    if (existing) return existing;
  }

  const exec = (async () => {
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
        throw new Error(`Timeout ${formatTimeout(timeoutMs)} on ${url}`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  })();

  if (inflightKey) {
    inflight.set(inflightKey, exec as Promise<unknown>);
    exec.finally(() => inflight.delete(inflightKey));
  }
  return exec;
}

function parseTeamAlumnos(raw: unknown): TeamMember[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => {
        if (typeof v === 'string') {
          const name = v.trim();
          return name ? ({ name } as TeamMember) : null;
        }
        if (v && typeof v === 'object') {
          const anyV: any = v as any;
          const name = String(anyV.name ?? anyV.nombre ?? '').trim();
          const url = (anyV.url ?? anyV.link ?? anyV.href ?? null) as string | null;
          return name ? ({ name, url } as TeamMember) : null;
        }
        return null;
      })
      .filter((x): x is TeamMember => Boolean(x?.name));
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

// 1) Alumnos — endpoint con soporte de paginación y búsqueda
export type StudentsPagedResult = {
  items: StudentRow[];
  total: number | null;
  page: number;
  pageSize: number;
  totalPages: number | null;
};

export async function getAllStudentsPaged(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string;
}): Promise<StudentsPagedResult> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 1000;
  const search = String(params?.search ?? "").trim();
  const estado = String(params?.estado ?? "").trim();

  const cacheKey = `students:${page}:${pageSize}:${encodeURIComponent(search)}:${encodeURIComponent(estado)}`;
  const cached = cacheGet<StudentsPagedResult>(cacheKey, 30_000);
  if (cached) return cached;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  if (search) qs.set("search", search);
  if (estado) qs.set("estado", estado);

  const path = `/client/get/clients?${qs.toString()}`;
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
      ? parseTeamAlumnos(r.teamMembers)
      : parseTeamAlumnos(
          r.equipo ??
            r.alumnos ??
            r.coaches ??
            r.coachs ??
            r.coach ??
            r.coach_nombre ??
            r.coachNombre ??
            null,
        ),

    state: r.estado ?? r.state ?? null,
    stage: r.etapa ?? r.stage ?? null,
    joinDate: r.ingreso ?? r.joinDate ?? null,
    lastActivity: r.ultima_actividad ?? r.lastActivity ?? null,
    inactivityDays:
      r.dias_inactividad ?? r.inactividad ?? r.inactivityDays ?? null,

    contractUrl: r.contrato ?? r.contractUrl ?? null,
    ticketsCount: r.tickets ?? r.ticketsCount ?? null,
  }));

  const toNumOrNull = (v: any): number | null => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const result: StudentsPagedResult = {
    items,
    total: toNumOrNull(json?.total ?? json?.clients?.total ?? json?.getClients?.total),
    page: toNumOrNull(json?.page) ?? page,
    pageSize: toNumOrNull(json?.pageSize) ?? pageSize,
    totalPages: toNumOrNull(json?.totalPages),
  };

  cacheSet(cacheKey, result);
  return result;
}

export async function getAllStudents(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<StudentRow[]> {
  const res = await getAllStudentsPaged(params);
  return res.items;
}

// 2) Coaches (desde equipos)
export async function getAllCoachesFromTeams(): Promise<CoachTeam[]> {
  const cached = cacheGet<CoachTeam[]>("coachesFromTeams", 5 * 60_000);
  if (cached) return cached;

  const path = '/team/get/team?page=1&pageSize=10000';
  const json = await fetchJson<any>(path);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const coaches: CoachTeam[] = rows.map((r) => ({ id: r.id, name: r.nombre, codigo: r.codigo ?? null }));
  // dedupe por nombre (por si acaso)
  const seen = new Set<string>();
  const deduped = coaches.filter((c) => {
    const k = c.name?.toLowerCase?.() ?? '';
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  cacheSet("coachesFromTeams", deduped);
  return deduped;
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

  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
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
  file_ids?: string[]; // IDs de archivos (array)
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
  if (Array.isArray(form.file_ids) && form.file_ids.length > 0) {
    const arr = form.file_ids.map(String);
    // ÚNICO campo file_ids como JSON (requerimiento):
    // ej: ["file1","file2",...]
    fd.set('file_ids', JSON.stringify(arr));
  }
  if (descripcion) fd.set('descripcion', descripcion);
  (form.archivos ?? []).forEach((file) => fd.append('archivos', file));
  // Log diagnóstico para confirmar qué se está enviando (FormData no es serializable)
  try {
    const entries = Array.from(fd.entries());
    // eslint-disable-next-line no-console
    console.debug('[createTicket] POST', url);
    // eslint-disable-next-line no-console
    console.debug('[createTicket] Enviando FormData (debug):', entries);
    // eslint-disable-next-line no-console
    console.log('[createTicket] Enviando FormData (log):', entries);
  } catch {}
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const res = await fetch(url, { method: 'POST', body: fd, cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    try {
      // eslint-disable-next-line no-console
      console.error('[createTicket] ERROR', res.status, url, text);
    } catch {}
    throw new Error(text || `HTTP ${res.status} on ${url}`);
  }
  const json = await res.json().catch(() => ({}));
  try {
    // eslint-disable-next-line no-console
    console.log('[createTicket] OK response:', json);
  } catch {}
  return json;
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
  const safe = String(opcion ?? "").trim().toLowerCase();
  const cached = cacheGet<OpcionItem[]>(`opciones:${safe}`, 10 * 60_000);
  if (cached) return cached;

  const path = `/opcion/get/opciones?opcion=${encodeURIComponent(opcion)}`;
  const json = await fetchJson<any>(path);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const mapped = rows.map((r) => {
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

  cacheSet(`opciones:${safe}`, mapped);
  return mapped;
}

// 8) Archivos de ticket
export type TicketFile = {
  id: string;
  nombre_archivo: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  created_at: string | null;
  url?: string | null;
  has_base64?: boolean | null;
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
    url: r.url ?? null,
    has_base64: r.has_base64 ?? null,
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
  const res = await fetchJson<any>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
  return res;
}

// Actualizar solo la etapa del cliente (usa FormData por compatibilidad con backend)
export async function updateClientEtapa(clientCode: string, etapa: string): Promise<any> {
  if (!clientCode) throw new Error('clientCode requerido');
  const url = buildUrl(`/client/update/client/${encodeURIComponent(clientCode)}`);
  const fd = new FormData();
  fd.set('etapa', String(etapa));
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
  const json = await res.json().catch(() => ({}));
  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
  return json;
}

// Actualizar fecha de ingreso del cliente (usa FormData por compatibilidad con backend)
// Enviar como key: ingreso (YYYY-MM-DD o ISO). Si viene vacío, se limpia.
export async function updateClientIngreso(clientCode: string, ingreso: string | null): Promise<any> {
  if (!clientCode) throw new Error('clientCode requerido');
  const url = buildUrl(`/client/update/client/${encodeURIComponent(clientCode)}`);
  const fd = new FormData();
  fd.set('ingreso', String(ingreso ?? ''));
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
  const json = await res.json().catch(() => ({}));
  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
  return json;
}

// Actualizar nombre del cliente (usa FormData por compatibilidad con backend)
// Enviar como key: nombre (string). Si viene vacío, no se envía.
export async function updateClientNombre(clientCode: string, nombre: string): Promise<any> {
  if (!clientCode) throw new Error('clientCode requerido');
  const name = String(nombre ?? '').trim();
  if (!name) throw new Error('nombre requerido');
  const url = buildUrl(`/client/update/client/${encodeURIComponent(clientCode)}`);
  const fd = new FormData();
  fd.set('nombre', name);
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
  const json = await res.json().catch(() => ({}));
  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
  return json;
}

// 12) Historial de tareas del cliente
export type ClienteTareaHist = {
  id: number | string;
  codigo_cliente?: string | null;
  descripcion?: string | null;
  created_at: string;
};

export async function getClienteTareas(alumnoCode: string): Promise<ClienteTareaHist[]> {
  if (!alumnoCode) return [];
  const key = String(alumnoCode);
  const path = `/client/get/cliente-tareas/${encodeURIComponent(key)}`;
  const json = await fetchJson<any>(path);
  const rows: any[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.data?.data)
    ? json.data.data
    : Array.isArray(json?.rows)
    ? json.rows
    : Array.isArray(json)
    ? json
    : [];
  const mapped = rows.map((r) => ({
    id: r.id ?? r.tarea_id ?? `${key}-${r.created_at ?? ''}`,
    codigo_cliente: r.codigo_cliente ?? r.alumno ?? null,
    descripcion: r.descripcion ?? r.tarea ?? null,
    created_at: r.created_at ?? r.fecha ?? r.updated_at ?? new Date().toISOString(),
  }));

  // Asegurar que la última actualización quede primero, aunque el backend devuelva desordenado.
  const toTime = (iso: string) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
  };
  mapped.sort((a, b) => {
    const dt = toTime(b.created_at) - toTime(a.created_at);
    if (dt !== 0) return dt;
    // desempate estable por id (si ambos son numéricos)
    const ai = typeof a.id === 'number' ? a.id : Number(a.id);
    const bi = typeof b.id === 'number' ? b.id : Number(b.id);
    if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
    return String(b.id).localeCompare(String(a.id));
  });

  return mapped;
}

// 13) Historial de estatus del cliente
export type ClienteEstatusHist = {
  id: number | string;
  codigo_cliente?: string | null;
  estado_id: string;
  created_at: string;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  tipo?: string | null;
  motivo?: string | null;
};

export async function getClienteEstatus(alumnoCode: string): Promise<ClienteEstatusHist[]> {
  const path = `/client/get/cliente-estatus/${encodeURIComponent(alumnoCode)}`;
  const json = await fetchJson<any>(path);
  const rows: any[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.data?.data)
    ? json.data.data
    : Array.isArray(json?.rows)
    ? json.rows
    : Array.isArray(json)
    ? json
    : [];
  return rows.map((r) => ({
    id: r.id ?? r.estatus_id ?? `${alumnoCode}-${r.created_at ?? ''}`,
    codigo_cliente: r.codigo_cliente ?? r.alumno ?? null,
    // El API devuelve 'estatus_id' (MEMBRESIA, PAUSADO, etc). Priorizar ese campo.
    estado_id: String(r.estatus_id ?? r.estado_id ?? r.estado ?? r.status ?? ''),
    created_at: r.created_at ?? r.fecha ?? r.updated_at ?? new Date().toISOString(),
    fecha_desde: r.fecha_desde ?? null,
    fecha_hasta: r.fecha_hasta ?? null,
    tipo: r.tipo ?? null,
    motivo: r.motivo ?? r.razon ?? r.motivation ?? r.comentario ?? null,
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
  const json = await res.json().catch(() => ({}));
  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
  return json;
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
  const json = await res.json().catch(() => ({}));
  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
  return json;
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
  const res = await apiFetch<any>(
    `/client/delete/client/${encodeURIComponent(clientCode)}`,
    { method: 'DELETE' }
  );

  // Mutación: invalidar cache de alumnos
  invalidateStudentsCache();
  return res;
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
