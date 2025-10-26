// app/admin/teamsv2/api.ts
// Helpers para consultas relacionadas con el módulo teamsv2 (coaches)
import { apiFetch } from "@/lib/api-config";

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
  updated_at?: string;
  created_at?: string;
};

async function fetchJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  // Delegamos en apiFetch que ya adjunta el token Bearer automáticamente
  return apiFetch<T>(pathOrUrl, init);
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
  created_at: string | null;
  deadline: string | null;
  estado: "PENDIENTE" | "EN_PROGRESO" | "PENDIENTE_DE_ENVIO" | "RESUELTO" | string;
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
    created_at: r.created_at ?? null,
    deadline: r.deadline ?? null,
    estado: normalizeEstado(r.estado),
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
