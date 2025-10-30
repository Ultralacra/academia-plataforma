// lib/api-config.ts
import { getAuthToken, authService } from "./auth";

export const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://v001.vercel.app/v1";

// Host del servidor de chat (Socket.IO + endpoints admin). Configurable por env.
// Fallback: origen de API_HOST sin el path (si API_HOST tiene /v1, toma solo el dominio)
export const CHAT_HOST = (() => {
  const env = process.env.NEXT_PUBLIC_CHAT_HOST;
  if (env && env.trim()) return env.trim();
  // Fallback oficial: servidor Socket.IO externo (onrender)
  return "https://v001.onrender.com";
})();

export const endpoints = {
  team: {
    list: "/team/get/team",
    created: "/team/get/team-created",
    createdDetail: "/team/get/detail/team-created",
  },
  metrics: {
    get: "/metrics/get/metrics",
  },
  client: { list: "/client/get/clients" },
  ticket: { list: "/ticket/get/ticket" },
  coachClient: {
    // relaciones coach ↔ alumno; acepta ?coach=ID o ?alumno=CODIGO
    list: "/client/get/clients-coaches",
  },
} as const;

export const buildUrl = (path: string) =>
  path.startsWith("http") ? path : `${API_HOST}${path}`;

export function toQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
  });
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  // Adjuntamos token si existe
  let authHeaders: Record<string, string> = {};
  try {
    const token = typeof window !== "undefined" ? getAuthToken() : null;
    if (token) authHeaders["Authorization"] = `Bearer ${token}`;
  } catch {}

  // Evitar forzar Content-Type si el body es FormData (el navegador agrega el boundary correcto)
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const defaultHeaders: Record<string, string> = isFormData
    ? { ...authHeaders }
    : { "Content-Type": "application/json", ...authHeaders };

  const res = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    // Redirigir a login solo si NO autenticado (401). No forzar en 403.
    if (res.status === 401) {
      try {
        authService.logout();
      } catch {}
      if (typeof window !== "undefined") {
        try {
          // Evitar loops si ya estamos en /login
          const here = window.location?.pathname || "";
          if (!here.startsWith("/login")) {
            window.location.replace("/login");
          }
        } catch {}
      }
    }
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status} on ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ====== NUEVO: métricas con filtro de fechas ====== */

// Puedes pasar string "YYYY-MM-DD" o un Date nativo
export type MetricsFilters = {
  fechaDesde?: string | Date;
  fechaHasta?: string | Date;
};

// Tipos (resumen) para que tengas autocompletado útil
export interface MetricsEnvelope {
  code: number;
  status: string;
  data: { teams: TeamsMetrics };
}

export interface TeamsMetrics {
  activeByPhase: { phase: string; count: number }[];
  alumnosPorEquipo: { name: string; alumnos: number }[];
  areasCount: { area: string; cantidad: number }[];
  noTasks: { d3: string; d7: string; d15: string; d30: string }[];
  prodByCoach: { coach: string; tickets: number; sessions: number; hours: number }[];
  respByCoach: { coach: string; tickets: number; resolution: string; response: number }[];
  ticketsPer: { dia: string; semana: string; mes: string };
  ticketsSeries: {
    daily: { date: string; count: number }[];
    weekly: { week_start: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  total: {
    avgResolutionMin: string | number;
    avgResponseMin: number;
    studentsActive: number;
    studentsInactive: number;
    studentsPaused: number;
    studentsTotal: number;
    successCases: number;
    coaches: unknown[];
    teams: number;
    ticketsTotal: number;
    created: {
      rows: CreatedRow[];
      totals: { coaches: number; teams: number; tickets: number };
    };
  };
}

export interface CreatedRow {
  area: string;
  codigo_equipo: string;
  nombre_coach: string;
  puesto: string | null;
  avgResponse?: number;
  tickets?: number;
  avgResolution?: string;
  statusDist: { Abiertos: number; En_Proceso: number; Cerrados: number };
}

// Convierte Date → "YYYY-MM-DD" cuando haga falta
function toIsoDate(d?: string | Date) {
  if (!d) return undefined;
  if (typeof d === "string") return d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Llama a /metrics/get/metrics con filtros opcionales de fecha.
 * Ejemplo final: /metrics/get/metrics?fechaDesde=2025-09-01&fechaHasta=2025-09-30
 */
export async function getMetrics(
  filters: MetricsFilters = {}
): Promise<MetricsEnvelope> {
  const qs = toQuery({
    fechaDesde: toIsoDate(filters.fechaDesde),
    fechaHasta: toIsoDate(filters.fechaHasta),
  });
  return apiFetch<MetricsEnvelope>(`${endpoints.metrics.get}${qs}`);
}
