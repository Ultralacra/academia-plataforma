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
  if (Array.isArray(res)) return { items: res };
  const data = unwrap<MetadataRecord<T>[]>(res);
  if (Array.isArray(data)) return { items: data };
  return { items: [] };
}

export async function getMetadata<T = any>(id: string | number): Promise<MetadataRecord<T>> {
  const res = await apiFetch<any>(endpoints.metadata.detail(id), { method: "GET" });
  return unwrap<MetadataRecord<T>>(res);
}
