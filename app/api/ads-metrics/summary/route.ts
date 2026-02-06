import { NextRequest, NextResponse } from "next/server";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${API_HOST}${path}`;
}

type MeUser = {
  id?: string | number;
  role?: string;
  tipo?: string;
  codigo?: string;
};

function normalizeRole(rawRole?: unknown, rawTipo?: unknown) {
  const v = String(rawRole ?? "").trim().toLowerCase();
  const t = String(rawTipo ?? "").trim().toLowerCase();

  const isAdmin = (s: string) =>
    ["admin", "administrator", "superadmin"].includes(s);
  const isEquipo = (s: string) => ["equipo", "team"].includes(s);
  const isStudent = (s: string) =>
    ["alumno", "student", "cliente", "usuario", "user"].includes(s);
  const isAtc = (s: string) =>
    [
      "atc",
      "support",
      "soporte",
      "atencion",
      "atención",
      "customer_support",
    ].includes(s);
  const isSales = (s: string) => ["sales", "ventas", "venta"].includes(s);

  if (isAdmin(v)) return "admin";
  if (isSales(v)) return "sales";
  if (isEquipo(v)) return "equipo";
  if (isAtc(v)) return "atc";
  if (isStudent(v)) return "student";
  if (v === "coach") return "coach";

  if (isAdmin(t)) return "admin";
  if (isSales(t)) return "sales";
  if (isEquipo(t)) return "equipo";
  if (isAtc(t)) return "atc";
  if (isStudent(t)) return "student";
  if (t === "coach") return "coach";

  return "equipo";
}

async function fetchMe(authorization: string): Promise<MeUser | null> {
  const res = await fetch(buildUrl("/auth/me"), {
    method: "GET",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const payload =
    json && typeof json === "object" && "data" in json ? (json as any).data : json;
  return payload as MeUser;
}

function coerceList(res: any): any[] {
  if (Array.isArray(res)) return res;
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

function parseAmount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  const cleaned = s.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  let normalized = cleaned;
  if (lastDot !== -1 && lastComma !== -1) {
    // usa como separador decimal el último que aparezca
    if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, "");
    } else {
      normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (lastComma !== -1) {
    const parts = cleaned.split(",");
    const decimals = parts[parts.length - 1] ?? "";
    if (decimals.length > 0 && decimals.length <= 2) {
      normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else {
    normalized = cleaned.replace(/,/g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

type Summary = {
  alumnoId: string;
  metaId: string | number | null;
  savedAt: string | null;
  inversion: number | null;
  facturacion: number | null;
};

function getSavedAt(meta: any): string | null {
  const p = meta?.payload;
  const raw =
    (p && typeof p === "object" && (p as any)._saved_at) ||
    meta?.updated_at ||
    meta?.created_at ||
    null;
  if (!raw) return null;
  const t = Date.parse(String(raw));
  return Number.isNaN(t) ? String(raw) : new Date(t).toISOString();
}

function pickBest(prev: Summary | undefined, cand: Summary): Summary {
  if (!prev) return cand;
  const ta = prev.savedAt ? Date.parse(prev.savedAt) : NaN;
  const tb = cand.savedAt ? Date.parse(cand.savedAt) : NaN;
  const aValid = !Number.isNaN(ta);
  const bValid = !Number.isNaN(tb);
  if (aValid && bValid) return tb >= ta ? cand : prev;
  if (!aValid && bValid) return cand;
  return prev;
}

async function fetchAdsMetricsByAlumnoId(authorization: string, alumnoId: string) {
  const qs = new URLSearchParams();
  qs.set("alumno_id", alumnoId);
  qs.set("entity", "ads_metrics");
  const res = await fetch(buildUrl(`/metadata?${qs.toString()}`), {
    method: "GET",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return coerceList(json);
}

async function fetchAllAdsMetrics(authorization: string) {
  const qs = new URLSearchParams();
  qs.set("entity", "ads_metrics");
  const res = await fetch(buildUrl(`/metadata?${qs.toString()}`), {
    method: "GET",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return coerceList(json);
}

function normalizeIds(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from(
    new Set(
      arr
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        // defensivo: este endpoint es para ids, no códigos.
        .filter((s) => /^[0-9]+$/.test(s)),
    ),
  );
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const me = await fetchMe(auth);
  if (me) {
    const role = normalizeRole(me.role, me.tipo);
    if (role === "student") {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  const alumnoIds = normalizeIds(body?.alumnoIds);
  if (alumnoIds.length === 0) {
    return NextResponse.json({ byAlumnoId: {} }, { status: 200 });
  }

  // Estrategia híbrida:
  // - Para listas pequeñas: 1 request por alumno_id.
  // - Para listas grandes: 1 request global entity=ads_metrics y filtrado server-side.
  const byAlumnoId: Record<string, Summary> = {};
  const useGlobal = alumnoIds.length > 80;

  if (useGlobal) {
    const all = await fetchAllAdsMetrics(auth);
    const wanted = new Set(alumnoIds);

    for (const m of all) {
      const payload = (m as any)?.payload;
      if (!payload || typeof payload !== "object") continue;
      const aid = payload?.alumno_id;
      if (aid == null) continue;
      const alumnoId = String(aid).trim();
      if (!wanted.has(alumnoId)) continue;

      const summary: Summary = {
        alumnoId,
        metaId: (m as any)?.id ?? null,
        savedAt: getSavedAt(m),
        inversion: parseAmount(payload?.inversion),
        facturacion: parseAmount(payload?.facturacion),
      };
      byAlumnoId[alumnoId] = pickBest(byAlumnoId[alumnoId], summary);
    }

    // asegurar keys solicitadas aunque no haya metadata
    for (const id of alumnoIds) {
      if (!byAlumnoId[id]) {
        byAlumnoId[id] = {
          alumnoId: id,
          metaId: null,
          savedAt: null,
          inversion: null,
          facturacion: null,
        };
      }
    }

    return NextResponse.json({ byAlumnoId }, { status: 200 });
  }

  // modo pequeño: per-id
  await Promise.all(
    alumnoIds.map(async (alumnoId) => {
      const items = await fetchAdsMetricsByAlumnoId(auth, alumnoId);
      let best: Summary | undefined;
      for (const m of items) {
        const payload = (m as any)?.payload;
        if (!payload || typeof payload !== "object") continue;
        const aid = payload?.alumno_id;
        if (aid == null || String(aid).trim() !== alumnoId) continue;

        const summary: Summary = {
          alumnoId,
          metaId: (m as any)?.id ?? null,
          savedAt: getSavedAt(m),
          inversion: parseAmount(payload?.inversion),
          facturacion: parseAmount(payload?.facturacion),
        };
        best = pickBest(best, summary);
      }

      byAlumnoId[alumnoId] =
        best ??
        ({
          alumnoId,
          metaId: null,
          savedAt: null,
          inversion: null,
          facturacion: null,
        } satisfies Summary);
    }),
  );

  return NextResponse.json({ byAlumnoId }, { status: 200 });
}
