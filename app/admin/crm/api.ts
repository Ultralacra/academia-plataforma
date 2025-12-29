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

// Tipos para registro de venta (sale)
export type PaymentPlatform =
  | "hotmart"
  | "paypal"
  | "binance"
  | "payoneer"
  | "zelle"
  | "bancolombia"
  | "boa"
  | "otra";

export interface SaleCreateInput {
  fullName: string;
  email: string;
  phone: string;
  program: string;
  bonuses?: string;
  paymentMode: string; // pago total / cuotas
  paymentAmount: string; // monto USD
  paymentPlatform: PaymentPlatform;
  nextChargeDate?: string; // ISO
  contractThirdParty?: boolean;
  notes?: string;
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
  const isMetadata = raw && typeof raw === "object" && "payload" in raw;
  if (isMetadata) {
    const p = raw.payload || {};
    return {
      // Usar el ID real del registro de metadata para poder consultar /v1/metadata/:id
      codigo: String(raw?.id ?? raw?.codigo ?? raw?.entity_id ?? ""),
      name: p?.name || "(Sin nombre)",
      email: p?.email ?? null,
      phone: p?.phone ?? null,
      source: p?.source ?? "metadata",
      status: p?.status ?? "new",
      owner_codigo: null,
      created_at: raw?.created_at ?? p?.created_at ?? null,
      updated_at: raw?.updated_at ?? null,
    };
  }
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
export async function listLeads(params?: { page?: number; pageSize?: number; status?: string; owner?: string; search?: string; entity?: string }) {
  // Ahora consultamos /v1/metadata en vez de /v1/leads
  // El backend envuelve en { code, status, data }
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const query = qs.toString();
  const url = `/metadata${query ? `?${query}` : ""}`;
  const raw = await apiFetch<any>(url, { method: "GET" });
  const data = raw && typeof raw === "object" && Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
  // Filtrar por entidad si se solicita (por defecto 'booking')
  const entity = params?.entity || "booking";
  const rows = data.filter((r: any) => !entity || r?.entity === entity);
  const leads: Lead[] = rows.map(mapLead);
  return {
    items: leads,
    total: leads.length,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? leads.length,
    totalPages: 1,
  } as const;
}

// Obtener un lead por código
export async function getLead(codigo: string) {
  if (!codigo) throw new Error("codigo requerido");
  // Buscar en metadata por id OR filtrar todos y encontrar entity_id
  // Primero intentamos /metadata/:id
  try {
    const one = await apiFetch<any>(`/metadata/${encodeURIComponent(codigo)}`, { method: "GET" });
    const data = (one as any)?.data ?? one;
    if (data && data.entity) return mapLead(data);
  } catch {}
  // Fallback: listar y filtrar
  try {
    const raw = await apiFetch<any>(`/metadata`, { method: "GET" });
    const arr = raw?.data ?? [];
    const found = Array.isArray(arr) ? arr.find((r: any) => r?.entity_id === codigo || r?.id === codigo) : null;
    if (found) return mapLead(found);
  } catch {}
  throw new Error("Lead/metadata no encontrado");
}

// Crear un lead
export async function createLead(input: LeadCreateInput) {
  if (!input?.name) throw new Error("name requerido");
  // Crear registro en metadata como 'booking' (o general 'lead')
  const payload = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: input.source ?? "manual_form",
    status: input.status ?? "new",
    owner_codigo: input.owner_codigo ?? null,
    created_at: new Date().toISOString(),
  };
  const entityId = (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) || `lead-${Date.now()}`;
  const raw = await apiFetch<any>(`/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity: "booking", entity_id: entityId, payload }),
  });
  const data = (raw as any)?.data ?? raw;
  return mapLead(data);
}

// Crear una venta (sale) en metadata
export async function createSale(input: SaleCreateInput) {
  const entityId = (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) || `sale-${Date.now()}`;
  const payload = {
    type: "sale",
    name: input.fullName,
    email: input.email,
    phone: input.phone,
    program: input.program,
    bonuses: input.bonuses ?? null,
    payment: {
      mode: input.paymentMode,
      amount: input.paymentAmount,
      platform: input.paymentPlatform,
      nextChargeDate: input.nextChargeDate || null,
    },
    contract: {
      thirdParty: !!input.contractThirdParty,
      status: "pending",
    },
    status: "payment_verification_pending",
    notes: input.notes ?? null,
    events: [
      {
        type: "created",
        at: new Date().toISOString(),
        trigger: "trigger#1",
        message: "Registro de venta creado. Notificar ATC y Finanzas.",
      },
    ],
    created_at: new Date().toISOString(),
  };

  const raw = await apiFetch<any>(`/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity: "sale", entity_id: entityId, payload }),
  });
  const data = (raw as any)?.data ?? raw;
  // Reusar mapLead por conveniencia, aunque no se listará en listLeads (filtra booking)
  return mapLead(data);
}

// Actualizar un lead
export async function updateLead(codigo: string, input: LeadUpdateInput) {
  if (!codigo) throw new Error("codigo requerido");
  // Hacemos read-modify-write contra /v1/metadata/:codigo
  // 1) Traer registro actual (raw) para conocer entity, entity_id y payload
  const detailResp = await apiFetch<any>(`/metadata/${encodeURIComponent(codigo)}`, { method: "GET" });
  const curr = (detailResp as any)?.data ?? detailResp;
  if (!curr || !curr.id) throw new Error("No existe metadata para actualizar");

  const currPayload = (curr as any)?.payload ?? {};
  const mergedPayload = {
    ...currPayload,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.source !== undefined ? { source: input.source } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.owner_codigo !== undefined ? { owner_codigo: input.owner_codigo } : {}),
    updated_at: new Date().toISOString(),
  };

  // 2) Enviar PUT a /metadata/:codigo con entity y entity_id para mantener consistencia
  const body = {
    entity: curr.entity,
    entity_id: curr.entity_id,
    payload: mergedPayload,
  };

  const updateResp = await apiFetch<any>(`/metadata/${encodeURIComponent(codigo)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const updated = (updateResp as any)?.data ?? updateResp;
  return mapLead(updated);
}

// Eliminar un lead
export async function deleteLead(codigo: string) {
  // No se define delete en metadata; dejar notificación.
  throw new Error("Eliminar metadata no soportado aún");
}

// Actualizar payload arbitrario de metadata (helper genérico)
export async function updateMetadataPayload(
  id: string | number,
  patch: Record<string, any>
) {
  const detailResp = await apiFetch<any>(`/metadata/${encodeURIComponent(String(id))}`, { method: "GET" });
  const curr = (detailResp as any)?.data ?? detailResp;
  if (!curr || !curr.id) throw new Error("No existe metadata para actualizar");
  const mergedPayload = { ...(curr as any).payload, ...patch, updated_at: new Date().toISOString() };
  const body = { entity: curr.entity, entity_id: curr.entity_id, payload: mergedPayload };
  const updateResp = await apiFetch<any>(`/metadata/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (updateResp as any)?.data ?? updateResp;
}

export type CrmLeadSnapshotEntity = "crm_lead_snapshot";

export interface LeadDetailSnapshotV1 {
  schema_version: 1;
  captured_at: string; // ISO
  captured_by?: {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  source: {
    record_id: string | number;
    entity: string;
    entity_id: string;
  };
  route?: {
    pathname?: string;
    url?: string;
    user_agent?: string;
  };
  // "Lo que se muestra": payload entero + valores calculados y opciones.
  record: {
    id: string | number;
    entity: string;
    entity_id: string;
    created_at?: string;
    updated_at?: string;
  };
  payload_current: any;
  computed?: Record<string, any>;
  options?: Record<string, any>;
  draft?: any;
}

export interface CreateLeadSnapshotInput {
  source: {
    record_id: string | number;
    entity: string;
    entity_id: string;
  };
  snapshot: LeadDetailSnapshotV1;
}

export async function createLeadSnapshot(input: CreateLeadSnapshotInput) {
  if (!input?.source?.record_id) throw new Error("record_id requerido");
  if (!input?.source?.entity) throw new Error("entity requerido");
  if (!input?.source?.entity_id) throw new Error("entity_id requerido");
  if (!input?.snapshot) throw new Error("snapshot requerido");

  const entity: CrmLeadSnapshotEntity = "crm_lead_snapshot";
  const capturedAt = input.snapshot.captured_at || new Date().toISOString();
  const entityId = `${String(input.source.entity)}:${String(input.source.record_id)}:${capturedAt}`;

  const payload = {
    ...input.snapshot,
    schema_version: 1 as const,
    captured_at: capturedAt,
    source: {
      record_id: input.source.record_id,
      entity: input.source.entity,
      entity_id: input.source.entity_id,
    },
  } satisfies LeadDetailSnapshotV1;

  const raw = await apiFetch<any>(`/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, entity_id: entityId, payload }),
  });
  return (raw as any)?.data ?? raw;
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
