import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";

export type BonoSolicitud = {
  id: number;
  bono_codigo: string;
  student_code: string;
  correo_entrega?: string | null;
  nombre_solicitante?: string | null;
  estado?: string | null;
  data?: any;
  descripcion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  alumno_nombre?: string | null;
  alumno_fase?: string | null;
};

export type BonoSolicitudesListResponse = {
  code: number;
  status: string;
  message?: string;
  data: BonoSolicitud[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

export type BonoSolicitudDetailResponse = {
  code: number;
  status: string;
  message?: string;
  data: BonoSolicitud;
};

export type BonoSolicitudDeleteResponse = {
  code: number;
  status: string;
  message?: string;
  data?: any;
};

export async function getBonoSolicitudes(params?: {
  page?: number;
  pageSize?: number;
}): Promise<BonoSolicitudesListResponse> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 25;
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return await fetchJson<BonoSolicitudesListResponse>(
    `/bonos-solicitudes/get/solicitud?${qs.toString()}`
  );
}

// Detalle por id: GET /v1/bonos-solicitudes/get/solicitud/:codigo
// Nota: aunque el backend lo llame :codigo, aquí se envía el id numérico.
export async function getBonoSolicitudById(
  id: number | string
): Promise<BonoSolicitudDetailResponse> {
  if (id === null || id === undefined || String(id).trim() === "") {
    throw new Error("ID inválido");
  }
  return await fetchJson<BonoSolicitudDetailResponse>(
    `/bonos-solicitudes/get/solicitud/${encodeURIComponent(String(id))}`
  );
}

// Borrado por id: DELETE /v1/bonos-solicitudes/delete/solicitud/:id
export async function deleteBonoSolicitudById(
  id: number | string
): Promise<BonoSolicitudDeleteResponse> {
  if (id === null || id === undefined || String(id).trim() === "") {
    throw new Error("ID inválido");
  }
  return await fetchJson<BonoSolicitudDeleteResponse>(
    `/bonos-solicitudes/delete/solicitud/${encodeURIComponent(String(id))}`,
    { method: "DELETE" }
  );
}

async function fetchJson<T>(pathOrUrl: string, init?: RequestInit, timeoutMs = 12000): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : buildUrl(pathOrUrl);
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1000, timeoutMs));

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(init?.headers as any),
      },
      cache: "no-store",
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status} on ${url}`);
    }

    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`Timeout ${timeoutMs}ms on ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
