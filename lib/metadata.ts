import { apiFetch, endpoints } from "./api-config";

export interface ApiEnvelope<T> {
  code: number;
  status: string;
  data: T;
}

export interface MetadataRecord<T = any> {
  id: number | string;
  entity: string;
  entity_id: string;
  payload: T;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMetadataInput<T = any> {
  entity: string;
  entity_id: string;
  payload: T;
}

export interface ListMetadataResponse<T = any> {
  items: MetadataRecord<T>[];
}

function coerceList<T = any>(res: any): MetadataRecord<T>[] {
  // Soporta varios shapes del backend:
  // - { code, status, data: [...] }
  // - { code, status, data: { items: [...] } }
  // - { items: [...] }
  // - [...] (raw)
  if (Array.isArray(res)) return res as MetadataRecord<T>[];
  if (res && typeof res === "object") {
    if (Array.isArray((res as any).items)) return (res as any).items;
    if (Array.isArray((res as any).data)) return (res as any).data;
    const data = (res as any).data;
    if (data && typeof data === "object") {
      if (Array.isArray((data as any).items)) return (data as any).items;
      if (Array.isArray((data as any).data)) return (data as any).data;
      if (Array.isArray((data as any).rows)) return (data as any).rows;
    }
  }
  return [];
}

function unwrap<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res) return (res as ApiEnvelope<T>).data;
  return res as T;
}

export async function createMetadata<T = any>(data: CreateMetadataInput<T>): Promise<MetadataRecord<T>> {
  const res = await apiFetch<any>(endpoints.metadata.create, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrap<MetadataRecord<T>>(res);
}

export async function listMetadata<T = any>(): Promise<ListMetadataResponse<T>> {
  const res = await apiFetch<any>(endpoints.metadata.list, { method: "GET" });
  const items = coerceList<T>(res);
  if (items.length) return { items };

  // Fallback: intento previo de unwrap por compatibilidad con code/status/data
  const data = unwrap<any>(res);
  const items2 = coerceList<T>(data);
  return { items: items2 };
}

export async function getMetadata<T = any>(id: string | number): Promise<MetadataRecord<T>> {
  const res = await apiFetch<any>(endpoints.metadata.detail(id), { method: "GET" });
  return unwrap<MetadataRecord<T>>(res);
}

export async function updateMetadata<T = any>(
  id: string | number,
  data: MetadataRecord<T>,
): Promise<MetadataRecord<T>> {
  const res = await apiFetch<any>(endpoints.metadata.detail(id), {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return unwrap<MetadataRecord<T>>(res);
}
