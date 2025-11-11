// app/admin/crm/api.ts
// Endpoints CRUD para Leads del CRM
// Se asume existencia de apiFetch (configurado con baseURL y Bearer token)

import { apiFetch } from "@/lib/api-config";

// Tipos básicos de Lead según los campos provistos y algunos adicionales comunes
export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost" | string;

export interface Lead {
  codigo: string; // identificador único (UUID / código)
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null; // canal de origen (web_form, referral, ads, etc.)
  status?: LeadStatus; // estado del lead en el embudo
  owner_codigo?: string | null; // asignado a (closer / vendedor)
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LeadCreateInput {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  owner_codigo?: string; // requerido para asignar dueño
}

export interface LeadUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  owner_codigo?: string;
}

// Respuesta genérica de listado (adaptable al backend real)
export interface LeadsListResponse {
  code?: number;
  status?: string;
  data: any[]; // backend shape original
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

// Normaliza el objeto raw del backend al tipo Lead
function mapLead(raw: any): Lead {
  return {
    codigo: raw?.codigo || raw?.id || "",
    name: raw?.name || raw?.nombre || "(Sin nombre)",
    email: raw?.email ?? null,
    phone: raw?.phone ?? raw?.telefono ?? null,
    source: raw?.source ?? raw?.canal ?? null,
    status: raw?.status ?? raw?.estado ?? "new",
    owner_codigo: raw?.owner_codigo ?? raw?.owner ?? raw?.vendedor ?? null,
    created_at: raw?.created_at ?? raw?.creado_at ?? null,
    updated_at: raw?.updated_at ?? raw?.actualizado_at ?? null,
  };
}

// Listar todos los leads
export async function listLeads(params?: { page?: number; pageSize?: number; status?: string; owner?: string; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.status) qs.set("status", params.status);
  if (params?.owner) qs.set("owner", params.owner);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  const url = `/leads${query ? `?${query}` : ""}`;
  const json = await apiFetch<LeadsListResponse>(url, { method: "GET" });
  const rows = Array.isArray(json?.data) ? json.data : [];
  const leads: Lead[] = rows.map(mapLead);
  return {
    items: leads,
    total: json.total ?? leads.length,
    page: json.page ?? 1,
    pageSize: json.pageSize ?? leads.length,
    totalPages: json.totalPages ?? 1,
  } as const;
}

// Obtener un lead por código
export async function getLead(codigo: string) {
  if (!codigo) throw new Error("codigo requerido");
  const url = `/leads/${encodeURIComponent(codigo)}`;
  const raw = await apiFetch<any>(url, { method: "GET" });
  // El backend podría devolver { data: {...} } o directamente el objeto
  const data = (raw as any)?.data ?? raw;
  return mapLead(data);
}

// Crear un lead
export async function createLead(input: LeadCreateInput) {
  if (!input?.name) throw new Error("name requerido");
  const body = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: input.source,
    status: input.status ?? "new",
    owner_codigo: input.owner_codigo,
  };
  const url = `/leads`;
  const raw = await apiFetch<any>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (raw as any)?.data ?? raw;
  return mapLead(data);
}

// Actualizar un lead
export async function updateLead(codigo: string, input: LeadUpdateInput) {
  if (!codigo) throw new Error("codigo requerido");
  const body: Record<string, any> = {};
  if (typeof input.name !== "undefined") body.name = input.name;
  if (typeof input.email !== "undefined") body.email = input.email;
  if (typeof input.phone !== "undefined") body.phone = input.phone;
  if (typeof input.source !== "undefined") body.source = input.source;
  if (typeof input.status !== "undefined") body.status = input.status;
  if (typeof input.owner_codigo !== "undefined") body.owner_codigo = input.owner_codigo;
  const url = `/leads/${encodeURIComponent(codigo)}`;
  const raw = await apiFetch<any>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (raw as any)?.data ?? raw;
  return mapLead(data);
}

// Eliminar un lead
export async function deleteLead(codigo: string) {
  if (!codigo) throw new Error("codigo requerido");
  const url = `/leads/${encodeURIComponent(codigo)}`;
  await apiFetch<any>(url, { method: "DELETE" });
  return { ok: true } as const;
}

// Helpers para mutaciones optimistas (opcional)
export function optimisticAddLead(list: Lead[], lead: Lead) {
  return [lead, ...list];
}
export function optimisticUpdateLead(list: Lead[], updated: Lead) {
  return list.map((l) => (l.codigo === updated.codigo ? updated : l));
}
export function optimisticDeleteLead(list: Lead[], codigo: string) {
  return list.filter((l) => l.codigo !== codigo);
}
