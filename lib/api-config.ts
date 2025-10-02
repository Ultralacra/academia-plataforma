  // lib/api-config.ts
  export const API_HOST =
    process.env.NEXT_PUBLIC_API_HOST ?? "https://v001.vercel.app/v1";

  export const endpoints = {
    team: {
      list: "/team/get/team",
    },
    client: {
      list: "/client/get/clients",
    },
    ticket: {
      list: "/ticket/get/ticket", // por si luego necesitas cruzar
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
    const res = await fetch(buildUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status} on ${path}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
