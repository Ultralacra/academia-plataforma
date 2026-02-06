// app/admin/opciones/api.ts
import { apiFetch, buildUrl } from "@/lib/api-config";
export type OpcionItem = {
  id?: number | null;
  codigo?: string | null; // cuando la API devuelve uuid
  opcion_key: string;
  opcion_value: string;
  opcion_grupo: string;
  created_at?: string | null;
  updated_at?: string | null;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  // apiFetch ya adjunta Bearer y Content-Type por defecto
  return apiFetch<T>(path, init);
}

// Obtener todas las opciones de un grupo (o por key)
export async function getOptions(groupOrKey?: string) {
  const q = groupOrKey ? `?opcion=${encodeURIComponent(groupOrKey)}` : "";
  const json = await fetchJson<any>(`/opcion/get/opciones${q}`);
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map((r) => ({
    codigo: r.opcion_id ?? r.codigo ?? r.id ?? null,
    opcion_key: r.opcion_key ?? r.key ?? "",
    opcion_value: r.opcion_value ?? r.value ?? "",
    opcion_grupo: r.opcion_grupo ?? r.grupo ?? "",
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  })) as OpcionItem[];
}

// Obtener una opción por codigo/uuid
export async function getOptionByCode(code: string) {
  const json = await fetchJson<any>(`/opcion/get/opcion/${encodeURIComponent(code)}`);
  const r = json?.data ?? null;
  if (!r) return null;
  return {
    codigo: r.opcion_id ?? r.codigo ?? r.id ?? null,
    opcion_key: r.opcion_key ?? r.key ?? "",
    opcion_value: r.opcion_value ?? r.value ?? "",
    opcion_grupo: r.opcion_grupo ?? r.grupo ?? "",
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  } as OpcionItem;
}

// Crear una nueva opción
export async function createOption(payload: { opcion_key: string; opcion_value: string; opcion_grupo: string }) {
  const path = `/opcion/create/opcion`;
  const fullUrl = buildUrl(path);
    /* console.log('[opciones api] POST', fullUrl, 'payload=', payload); */
  const json = await fetchJson<any>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json;
}

// Actualizar una opción por codigo/uuid
export async function updateOption(code: string, payload: { opcion_key?: string; opcion_value?: string; opcion_grupo?: string }) {
  const path = `/opcion/update/opcion/${encodeURIComponent(code)}`;
  const fullUrl = buildUrl(path);
    /* console.log('[opciones api] PUT', fullUrl, 'codigo=', code, 'payload=', payload); */
  const json = await fetchJson<any>(path, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return json;
}

// Intento de eliminar: la spec no mostró endpoint DELETE explícito.
// Si existe un endpoint de eliminación, reemplazar la ruta aquí.
export async function deleteOption(code: string) {
  const path = `/opcion/delete/opcion/${encodeURIComponent(code)}`;
  const fullUrl = buildUrl(path);
    /* console.log('[opciones api] DELETE', fullUrl, 'codigo=', code); */
  const json = await fetchJson<any>(path, { method: "DELETE" });
    /* console.log('[opciones api] DELETE response:', json); */
  return json;
}
