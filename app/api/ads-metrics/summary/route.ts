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
  fase: string | null;
  subfase: string | null;
  color: string | null;
  trascendencia: string | null;
};

function asText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function normalizeSubfase(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return asText(value);
  if (typeof value === "object") {
    const v = value as any;
    return (
      asText(v?.nombre) ??
      asText(v?.name) ??
      asText(v?.label) ??
      asText(v?.value) ??
      null
    );
  }
  return asText(value);
}

function pickColor(payload: any): string | null {
  return (
    asText(payload?.subfase_color) ??
    asText(payload?.color) ??
    asText(payload?.subfase?.color) ??
    null
  );
}

function pickTrascendencia(payload: any): string | null {
  return (
    asText(payload?.trascendencia) ??
    asText(payload?.subfase_color) ??
    asText(payload?.subfase?.color) ??
    null
  );
}

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
  const newer = aValid && bValid ? (tb >= ta ? cand : prev) : !aValid && bValid ? cand : prev;
  const older = newer === cand ? prev : cand;

  return {
    ...newer,
    fase: newer.fase ?? older.fase ?? null,
    subfase: newer.subfase ?? older.subfase ?? null,
    color: newer.color ?? older.color ?? null,
    trascendencia: newer.trascendencia ?? older.trascendencia ?? null,
  };
}

async function fetchAdsMetricsByAlumnoId(authorization: string, alumnoId: string) {
  const qs = new URLSearchParams();
  // Soportar tanto id interno numérico como alumno_codigo.
  if (/^[0-9]+$/.test(String(alumnoId))) {
    qs.set("alumno_id", alumnoId);
  } else {
    qs.set("alumno_codigo", alumnoId);
  }
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
  // IMPORTANTE: /metadata suele venir paginado. Si no paginamos, solo llega la 1ra página.
  const pageSize = 1000;
  const items: any[] = [];
  let page = 1;
  let safety = 0;

  while (true) {
    safety += 1;
    if (safety > 100) break;

    const qs = new URLSearchParams();
    qs.set("entity", "ads_metrics");
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));

    const res = await fetch(buildUrl(`/metadata?${qs.toString()}`), {
      method: "GET",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) break;

    const json = await res.json().catch(() => null);
    const pageItems = coerceList(json);
    if (pageItems.length === 0) break;
    items.push(...pageItems);

    // si el backend soporta totalPages, salir cuando se alcance
    const totalPages =
      json && typeof json === "object"
        ? ((json as any).totalPages ?? (json as any)?.data?.totalPages)
        : null;
    if (typeof totalPages === "number" && Number.isFinite(totalPages)) {
      if (page >= totalPages) break;
    } else {
      // heurística: si vino menos que pageSize, ya no hay más páginas
      if (pageItems.length < pageSize) break;
    }

    page += 1;
  }

  return items;
}

function normalizeIds(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from(
    new Set(
      arr
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
    ),
  );
}

function extractKeysFromMeta(meta: any): { alumnoId: string | null; alumnoCodigo: string | null } {
  const p = meta?.payload && typeof meta.payload === "object" ? meta.payload : null;
  const idRaw = (p as any)?.alumno_id ?? meta?.alumno_id ?? null;
  const codigoRaw =
    (p as any)?.alumno_codigo ??
    (p as any)?.alumno_code ??
    meta?.alumno_codigo ??
    meta?.alumno_code ??
    null;

  const alumnoId = idRaw == null ? null : String(idRaw).trim() || null;
  const alumnoCodigo = codigoRaw == null ? null : String(codigoRaw).trim() || null;
  return { alumnoId, alumnoCodigo };
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
  const debugMetadata = Boolean(body?.debugMetadata);
  const debugEntityOnly = Boolean(body?.debugEntityOnly);

  // Debug pedido: consultar metadata por entity y loguearla completa, sin depender de match.
  if (debugEntityOnly) {
    const all = await fetchAllAdsMetrics(auth);
    const debugRows = all.map((m: any) => {
      const p = m?.payload && typeof m.payload === "object" ? m.payload : {};
      return {
        id: m?.id ?? null,
        entity: m?.entity ?? null,
        created_at: m?.created_at ?? null,
        updated_at: m?.updated_at ?? null,
        alumno_id: p?.alumno_id ?? null,
        alumno_codigo: p?.alumno_codigo ?? p?.alumno_code ?? null,
        alumno_nombre: p?.alumno_nombre ?? p?.alumno_name ?? null,
        inversion: p?.inversion ?? null,
        facturacion: p?.facturacion ?? null,
        _saved_at: p?._saved_at ?? null,
        payload: p,
      };
    });

    // Nota: esto puede ser MUY grande; lo imprimimos igual para debug.
    console.log("[DEBUG metadata ads_metrics] rows (FULL):", debugRows);
    console.log("[DEBUG metadata ads_metrics] count:", debugRows.length);

    return NextResponse.json(
      { ok: true, entity: "ads_metrics", count: debugRows.length, items: debugRows },
      { status: 200 },
    );
  }

  const alumnoIds = normalizeIds(body?.alumnoIds);
  if (alumnoIds.length === 0) {
    return NextResponse.json({ byAlumnoId: {} }, { status: 200 });
  }

  // Estrategia híbrida:
  // - Para listas pequeñas: 1 request por alumno_id.
  // - Para listas grandes: 1 request global entity=ads_metrics y filtrado server-side.
  const byAlumnoId: Record<string, Summary> = {};
  const useGlobal = alumnoIds.length > 80 || alumnoIds.some((k) => !/^[0-9]+$/.test(k));

  if (useGlobal) {
    const all = await fetchAllAdsMetrics(auth);

    if (debugMetadata) {
      // Debug pedido: imprimir TODOS los registros ads_metrics recibidos (sin filtrar por match).
      // Lo hacemos “simplificado” para que sea legible pero completo en cantidad.
      const debugRows = all.map((m: any) => {
        const p = m?.payload && typeof m.payload === "object" ? m.payload : {};
        return {
          id: m?.id ?? null,
          entity: m?.entity ?? null,
          created_at: m?.created_at ?? null,
          updated_at: m?.updated_at ?? null,
          alumno_id: p?.alumno_id ?? null,
          alumno_codigo: p?.alumno_codigo ?? p?.alumno_code ?? null,
          alumno_nombre: p?.alumno_nombre ?? p?.alumno_name ?? null,
          inversion: p?.inversion ?? null,
          facturacion: p?.facturacion ?? null,
          _saved_at: p?._saved_at ?? null,
        };
      });
      console.log("[DEBUG metadata ads_metrics] rows:", debugRows);
      console.log("[DEBUG metadata ads_metrics] count:", debugRows.length);
    }

    const wanted = new Set(alumnoIds);

    for (const m of all) {
      const payload = (m as any)?.payload;
      if (!payload || typeof payload !== "object") continue;
      const keys = extractKeysFromMeta(m);

      // Elegir el key que el caller pidió (prioriza alumno_codigo si está en el set).
      const matchKey =
        (keys.alumnoCodigo && wanted.has(keys.alumnoCodigo) && keys.alumnoCodigo) ||
        (keys.alumnoId && wanted.has(keys.alumnoId) && keys.alumnoId) ||
        null;
      if (!matchKey) continue;

      const summary: Summary = {
        alumnoId: matchKey,
        metaId: (m as any)?.id ?? null,
        savedAt: getSavedAt(m),
        inversion: parseAmount(payload?.inversion),
        facturacion: parseAmount(payload?.facturacion),
        fase: asText(payload?.fase),
        subfase: normalizeSubfase(payload?.subfase),
        color: pickColor(payload),
        trascendencia: pickTrascendencia(payload),
      };
      byAlumnoId[matchKey] = pickBest(byAlumnoId[matchKey], summary);
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
          fase: null,
          subfase: null,
          color: null,
          trascendencia: null,
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
        const keys = extractKeysFromMeta(m);
        if (keys.alumnoCodigo && keys.alumnoCodigo === alumnoId) {
          // ok
        } else if (keys.alumnoId && keys.alumnoId === alumnoId) {
          // ok
        } else {
          continue;
        }

        const summary: Summary = {
          alumnoId,
          metaId: (m as any)?.id ?? null,
          savedAt: getSavedAt(m),
          inversion: parseAmount(payload?.inversion),
          facturacion: parseAmount(payload?.facturacion),
          fase: asText(payload?.fase),
          subfase: normalizeSubfase(payload?.subfase),
          color: pickColor(payload),
          trascendencia: pickTrascendencia(payload),
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
          fase: null,
          subfase: null,
          color: null,
          trascendencia: null,
        } satisfies Summary);
    }),
  );

  return NextResponse.json({ byAlumnoId }, { status: 200 });
}
