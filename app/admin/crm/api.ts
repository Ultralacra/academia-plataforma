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

  // Opcional: asociar el lead a una campaña/origen
  source_entity_id?: string;
  source_entity?: string;
}

// Nota: la creación ahora es POST /v1/leads (sin :codigo), el backend asigna el codigo.

export interface LeadUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  owner_codigo?: string;
}

// Detalle extendido (GET /v1/leads/:codigo)
export interface LeadDetail extends Lead {
  id?: number;
  deleted?: number | boolean;
  record_id?: number;
  record_entity?: string;
  source_entity_id?: string;
  source_entity?: string;

  instagram_user?: string | null;
  platform_call?: string | null;
  call_outcome?: string | null;
  call_result_at?: string | null;
  call_reschedule_date?: string | null;
  call_reschedule_time?: string | null;
  call_negotiation_active?: number | boolean | null;
  call_negotiation_until?: string | null;

  monthly_budget?: number | null;
  lead_disposition?: string | null;
  program?: string | null;

  payment_status?: string | null;
  payment_mode?: string | null;
  payment_platform?: string | null;
  payment_amount?: string | number | null;
  payment_has_reserve?: number | boolean | null;
  payment_reserve_amount?: string | number | null;
  next_charge_date?: string | null;

  sale_notes?: string | null;

  contract_status?: string | null;
  contract_is_company?: number | boolean | null;
  contract_third_party?: number | boolean | null;
  contract_party_address?: string | null;
  contract_party_city?: string | null;
  contract_party_country?: string | null;
  contract_company_name?: string | null;
  contract_company_tax_id?: string | null;
  contract_company_address?: string | null;
  contract_company_city?: string | null;
  contract_company_country?: string | null;

  closer?: any;
  setter?: any;
  reminders?: any[];
  reminders_actions?: any[];
  contract_parties?: any[];

  reminders_list?: any[];
  contract_parties_list?: any[];
  bonuses_list?: any[];
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
  // Consultar /v1/leads (API_HOST ya incluye /v1)
  // Respuesta esperada:
  // { code: 200, status: 'success', data: [...], total, page, pageSize, totalPages }
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.status) qs.set("status", String(params.status));
  if (params?.owner) qs.set("owner", String(params.owner));
  if (params?.search) qs.set("search", String(params.search));

  const query = qs.toString();
  const url = `/leads${query ? `?${query}` : ""}`;

  const raw = (await apiFetch<LeadsListResponse | any>(url, {
    method: "GET",
  })) as LeadsListResponse | any;

  const data =
    raw && typeof raw === "object" && Array.isArray((raw as any).data)
      ? (raw as any).data
      : Array.isArray(raw)
        ? raw
        : [];

  const leads: Lead[] = data.map(mapLead);
  const total =
    raw && typeof raw === "object" && typeof (raw as any).total === "number"
      ? (raw as any).total
      : leads.length;
  const page =
    raw && typeof raw === "object" && typeof (raw as any).page === "number"
      ? (raw as any).page
      : params?.page ?? 1;
  const pageSize =
    raw && typeof raw === "object" && typeof (raw as any).pageSize === "number"
      ? (raw as any).pageSize
      : params?.pageSize ?? leads.length;
  const totalPages =
    raw && typeof raw === "object" && typeof (raw as any).totalPages === "number"
      ? (raw as any).totalPages
      : 1;

  return {
    items: leads,
    total,
    page,
    pageSize,
    totalPages,
  } as const;
}

// Obtener un lead por código
export async function getLead(codigo: string) {
  if (!codigo) throw new Error("codigo requerido");

  // Primero: endpoint real de leads (detalle)
  try {
    const resp = await apiFetch<any>(`/leads/${encodeURIComponent(codigo)}`, {
      method: "GET",
    });
    const data = (resp as any)?.data ?? resp;
    if (data && typeof data === "object") {
      const isMetadataLike =
        "payload" in (data as any) &&
        "entity" in (data as any) &&
        ("id" in (data as any) || "entity_id" in (data as any));
      if (isMetadataLike) return data as LeadDetail;

      const base = mapLead(data);
      return { ...(data as any), ...base } as LeadDetail;
    }
  } catch {
    // seguimos con fallback a metadata
  }

  // Fallback legacy: metadata
  try {
    const one = await apiFetch<any>(`/metadata/${encodeURIComponent(codigo)}`, {
      method: "GET",
    });
    const data = (one as any)?.data ?? one;
    if (data && data.entity) return mapLead(data);
  } catch {}
  try {
    const raw = await apiFetch<any>(`/metadata`, { method: "GET" });
    const arr = raw?.data ?? [];
    const found = Array.isArray(arr)
      ? arr.find((r: any) => r?.entity_id === codigo || r?.id === codigo)
      : null;
    if (found) return mapLead(found);
  } catch {}

  throw new Error("Lead no encontrado");
}

// Crear un lead
export async function createLead(input: LeadCreateInput) {
  if (!input?.name) throw new Error("name requerido");
  const body = {
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source ?? "manual_form",
    status: input.status ?? "new",
    owner_codigo: input.owner_codigo ?? null,
    ...(input.source_entity_id ? { source_entity_id: input.source_entity_id } : {}),
    ...(input.source_entity ? { source_entity: input.source_entity } : {}),
  };

  // Crear lead "plano" en /v1/leads (el backend crea el codigo)
  const resp = await apiFetch<any>(`/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (resp as any)?.data ?? resp;
  const base = mapLead(data);
  return { ...(data as any), ...base } as LeadDetail;
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

// PUT /v1/leads/:codigo (se espera enviar el body completo del lead)
export async function updateLeadFull(codigo: string, body: Partial<LeadDetail> & Record<string, any>) {
  if (!codigo) throw new Error("codigo requerido");
  try {
      // Removed debug log to avoid printing sensitive bodies
  } catch {}
  const resp = await apiFetch<any>(`/leads/${encodeURIComponent(codigo)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (resp as any)?.data ?? resp;
  if (data && typeof data === "object") {
    const isMetadataLike =
      "payload" in (data as any) &&
      "entity" in (data as any) &&
      ("id" in (data as any) || "entity_id" in (data as any));
    if (isMetadataLike) return data as LeadDetail;
  }
  const base = mapLead(data);
  return { ...(data as any), ...base } as LeadDetail;
}

// Helper para actualizar campos dentro de `payload` (formato booking/metadata) usando PUT /v1/leads/:codigo
export async function updateLeadPayloadPatch(
  codigo: string,
  payloadPatch: Record<string, any>
) {
  if (!codigo) throw new Error("codigo requerido");
  const current = await getLead(codigo);
  const now = new Date().toISOString();

  if (current && typeof current === "object" && "payload" in (current as any)) {
    const currPayload = (current as any)?.payload ?? {};
    const fullBody = {
      ...(current as any),
      payload: {
        ...currPayload,
        ...payloadPatch,
        updated_at: now,
      },
    };

    // Algunos backends requieren source_entity_id para ubicar el record base (booking).
    // Lo preservamos / inferimos desde el recurso actual si existe.
    const inferredSourceEntityId =
      (current as any)?.source_entity_id ??
      (current as any)?.payload?.source_entity_id ??
      (current as any)?.entity_id ??
      (current as any)?.payload?.entity_id;
    if ((fullBody as any).source_entity_id === undefined && inferredSourceEntityId) {
      (fullBody as any).source_entity_id = String(inferredSourceEntityId);
    }
    if ((fullBody as any).source_entity === undefined && (current as any)?.source_entity) {
      (fullBody as any).source_entity = (current as any).source_entity;
    }

    return await updateLeadFull(codigo, fullBody);
  }

  // Si no hay payload, hacemos merge plano (best-effort)
  const fullBody = {
    ...(current as any),
    ...payloadPatch,
    codigo: (current as any)?.codigo ?? codigo,
    updated_at: now,
  };
  return await updateLeadFull(codigo, fullBody);
}

// Helper para actualizar campos en el lead "plano" (sin payload) usando PUT /v1/leads/:codigo
// El backend pide enviar el body completo; aquí hacemos read+merge y mandamos el objeto completo.
export async function updateLeadPatch(
  codigo: string,
  patch: Record<string, any>,
  currentOverride?: any
) {
  if (!codigo) throw new Error("codigo requerido");
  const current = currentOverride ?? (await getLead(codigo));
  const now = new Date().toISOString();

  const fullBody = {
    ...(current as any),
    ...(patch ?? {}),
    codigo: (current as any)?.codigo ?? codigo,
    updated_at: now,
  };

  // Preservar / inferir source_entity_id para que el backend pueda editar correctamente.
  const inferredSourceEntityId =
    (current as any)?.source_entity_id ??
    (current as any)?.payload?.source_entity_id ??
    (current as any)?.entity_id ??
    (current as any)?.payload?.entity_id;
  if ((fullBody as any).source_entity_id === undefined && inferredSourceEntityId) {
    (fullBody as any).source_entity_id = String(inferredSourceEntityId);
  }
  if ((fullBody as any).source_entity === undefined && (current as any)?.source_entity) {
    (fullBody as any).source_entity = (current as any).source_entity;
  }

  return await updateLeadFull(codigo, fullBody);
}

// Actualizar un lead
export async function updateLead(
  codigo: string,
  input: LeadUpdateInput,
  currentOverride?: any
) {
  if (!codigo) throw new Error("codigo requerido");

  // Preferimos el endpoint real: PUT /v1/leads/:codigo, enviando body completo.
  // Como la UI a veces manda sólo un patch (ej. {status}), hacemos read+merge.
  const current = currentOverride ?? (await getLead(codigo));
  const now = new Date().toISOString();

  // Si el recurso viene en formato metadata (booking), los campos a actualizar viven en payload.
  if (current && typeof current === "object" && "payload" in (current as any)) {
    const currPayload = (current as any)?.payload ?? {};
    const payloadPatch = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.owner_codigo !== undefined ? { owner_codigo: input.owner_codigo } : {}),
      updated_at: now,
    };
    const fullBody = {
      ...(current as any),
      payload: {
        ...currPayload,
        ...payloadPatch,
      },
    };

    const inferredSourceEntityId =
      (current as any)?.source_entity_id ??
      (current as any)?.payload?.source_entity_id ??
      (current as any)?.entity_id ??
      (current as any)?.payload?.entity_id;
    if ((fullBody as any).source_entity_id === undefined && inferredSourceEntityId) {
      (fullBody as any).source_entity_id = String(inferredSourceEntityId);
    }
    if ((fullBody as any).source_entity === undefined && (current as any)?.source_entity) {
      (fullBody as any).source_entity = (current as any).source_entity;
    }

    return await updateLeadFull(codigo, fullBody);
  }

  // Si es un lead "plano" (sin payload), hacemos merge en raíz.
  const fullBody = {
    ...(current as any),
    ...(input ?? {}),
    codigo: (current as any)?.codigo ?? codigo,
    updated_at: now,
  };

  const inferredSourceEntityId =
    (current as any)?.source_entity_id ??
    (current as any)?.payload?.source_entity_id ??
    (current as any)?.entity_id ??
    (current as any)?.payload?.entity_id;
  if ((fullBody as any).source_entity_id === undefined && inferredSourceEntityId) {
    (fullBody as any).source_entity_id = String(inferredSourceEntityId);
  }
  if ((fullBody as any).source_entity === undefined && (current as any)?.source_entity) {
    (fullBody as any).source_entity = (current as any).source_entity;
  }
  return await updateLeadFull(codigo, fullBody);
}

// Eliminar un lead
export async function deleteLead(codigo: string) {
  if (!codigo) throw new Error("codigo requerido");
  const resp = await apiFetch<any>(`/leads/${encodeURIComponent(codigo)}`, {
    method: "DELETE",
  });
  return (resp as any)?.data ?? resp;
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
  // Código del lead (crm lead). Algunos backends lo requieren para asociar el snapshot.
  // En la UI normalmente es el param :id de /admin/crm/booking/:id
  codigo?: string;
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

  // Nuevo endpoint: /v1/leads/snapshot (apiFetch ya apunta a /v1)
  // Body esperado (tal cual): { entity, entity_id, payload }
  // Nota: algunos backends también aceptan/requieren `codigo` (lead).
  const body: Record<string, any> = { entity, entity_id: entityId, payload };
  const leadCodigo = String((input as any)?.codigo ?? "").trim();
  if (leadCodigo) body.codigo = leadCodigo;
  const raw = await apiFetch<any>(`/leads/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (raw as any)?.data ?? raw;
}

// ===================== Lead Form (público) =====================

export interface LeadFormInput {
  origen?: string;
  event_codigo: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  nombre: string;
  name: string;
  email: string;
  necesita_consulta: boolean;
  whatsapp: string;
  instagram: string;
  meta_facturacion: number | null;
  obstaculo: string;
  compromiso: boolean;
  confirmado: boolean;
  enviar_mensajes: boolean;
}

export async function createLeadFromForm(input: LeadFormInput) {
  if (!input?.event_codigo) throw new Error("event_codigo requerido");
  if (!input?.fecha) throw new Error("fecha requerida");
  if (!input?.hora) throw new Error("hora requerida");

  const raw = await apiFetch<any>(`/leads/form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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

// ===================== Eventos / Orígenes de Leads =====================

export interface LeadOrigin {
  id?: string | number;
  codigo: string;
  name?: string | null;
  description?: string | null;
  event_codigo?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  config?: any;
  created_at?: string | null;
  updated_at?: string | null;
}

function unwrapData<T>(raw: any): T {
  return (raw && typeof raw === "object" && "data" in raw ? (raw as any).data : raw) as T;
}

export async function listLeadOrigins() {
  const raw = await apiFetch<any>(`/leads/origins`, { method: "GET" });
  const data = unwrapData<any>(raw);
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items as LeadOrigin[];
}

export async function getLeadOrigin(codigo: string) {
  if (!codigo) throw new Error("codigo requerido");
  const raw = await apiFetch<any>(`/leads/origins/${encodeURIComponent(codigo)}`, {
    method: "GET",
  });
  return unwrapData<LeadOrigin>(raw);
}

export async function createLeadOrigin(input: Partial<LeadOrigin>) {
  const raw = await apiFetch<any>(`/leads/origins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  return unwrapData<LeadOrigin>(raw);
}

export async function updateLeadOrigin(codigo: string, input: Partial<LeadOrigin>) {
  if (!codigo) throw new Error("codigo requerido");
  const raw = await apiFetch<any>(`/leads/origins/${encodeURIComponent(codigo)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  return unwrapData<LeadOrigin>(raw);
}
