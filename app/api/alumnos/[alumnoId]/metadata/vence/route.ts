import { NextRequest, NextResponse } from "next/server";

type MetadataRecord<T = any> = {
  id: number | string;
  entity: string;
  entity_id: string;
  payload: T;
  created_at?: string;
  updated_at?: string;
};

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

  const isAdmin = (s: string) => ["admin", "administrator", "superadmin"].includes(s);
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
  const payload = (json && typeof json === "object" && "data" in json) ? (json as any).data : json;
  return payload as MeUser;
}

function coerceList<T = any>(res: any): MetadataRecord<T>[] {
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

function pickLatest(list: any[]) {
  const sorted = [...list].sort((a: any, b: any) => {
    const ta = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const tb = new Date(b?.updated_at || b?.created_at || 0).getTime();
    if (tb !== ta) return tb - ta;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
  return sorted[0] ?? null;
}

function safePayloadForVence(p: any) {
  const payload = p && typeof p === "object" ? p : {};
  return {
    alumno_id: payload.alumno_id ?? null,
    alumno_codigo: payload.alumno_codigo ?? null,
    alumno_nombre: payload.alumno_nombre ?? null,
    creado_por_id: payload.creado_por_id ?? null,
    creado_por_codigo: payload.creado_por_codigo ?? null,
    creado_por_nombre: payload.creado_por_nombre ?? null,
    meses_extra: payload.meses_extra ?? null,
    vence_estimado: payload.vence_estimado ?? null,
    vence_tipo: payload.vence_tipo ?? null,
    vence_motivo: payload.vence_motivo ?? null,
    historial: Array.isArray(payload.historial) ? payload.historial : [],
    ultimo_cambio_at: payload.ultimo_cambio_at ?? null,
    ultimo_cambio_por: payload.ultimo_cambio_por ?? null,
  };
}

function safePayloadForMembresia(p: any) {
  const payload = p && typeof p === "object" ? p : {};
  return {
    alumno_id: payload.alumno_id ?? null,
    alumno_codigo: payload.alumno_codigo ?? null,
    alumno_nombre: payload.alumno_nombre ?? null,
    meses: payload.meses ?? payload.meses_extra ?? null,
    motivo: payload.motivo ?? null,
    created_at: payload.created_at ?? null,
    changed_by: payload.changed_by ?? null,
    anulado: payload.anulado ?? false,
    anulado_at: payload.anulado_at ?? null,
    anulado_by: payload.anulado_by ?? null,
    anulado_motivo: payload.anulado_motivo ?? null,
    updated_at: payload.updated_at ?? null,
    updated_by: payload.updated_by ?? null,
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ alumnoId: string }> },
) {
  const { alumnoId } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Seguridad: si es un alumno (student), solo puede consultar su propio alumnoId.
  // Para otros roles, delegamos el control fino al backend.
  const me = await fetchMe(auth);
  if (me) {
    const role = normalizeRole(me.role, me.tipo);
    if (role === "student") {
      const meId = me.id != null ? String(me.id) : "";
      if (meId && String(alumnoId) !== meId) {
        return NextResponse.json({ error: "Prohibido" }, { status: 403 });
      }
    }
  }

  const id = String(alumnoId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { venceMeta: null, membresiaExts: [] },
      { status: 200 },
    );
  }

  const upstream = await fetch(buildUrl("/metadata"), {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: text || `HTTP ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const json = await upstream.json().catch(() => null);
  const items = coerceList<any>(json);

  const matchesBase = items.filter((m: any) => {
    if (!m) return false;
    if (m.entity !== "alumno_acceso_vence_estimado") return false;
    if (String(m.entity_id) !== id) return false;
    const pid = (m as any)?.payload?.alumno_id;
    if (pid !== undefined && pid !== null && String(pid) !== id) return false;
    return true;
  });

  const matchesMembresia = items.filter((m: any) => {
    if (!m) return false;
    if (m.entity !== "alumno_acceso_extension_membresia") return false;
    if (String(m.entity_id) !== id) return false;
    const pid = (m as any)?.payload?.alumno_id;
    if (pid !== undefined && pid !== null && String(pid) !== id) return false;
    return true;
  });

  const picked = pickLatest(matchesBase);

  const venceMeta: MetadataRecord<any> | null = picked
    ? {
        id: picked.id,
        entity: picked.entity,
        entity_id: String(picked.entity_id ?? ""),
        created_at: picked.created_at ?? null,
        updated_at: picked.updated_at ?? null,
        payload: safePayloadForVence((picked as any).payload),
      }
    : null;

  const membresiaExts: MetadataRecord<any>[] = [...matchesMembresia]
    .sort((a: any, b: any) => {
      const ta = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const tb = new Date(b?.updated_at || b?.created_at || 0).getTime();
      if (tb !== ta) return tb - ta;
      return Number(b?.id || 0) - Number(a?.id || 0);
    })
    .map((m: any) => ({
      id: m.id,
      entity: m.entity,
      entity_id: String(m.entity_id ?? ""),
      created_at: m.created_at ?? null,
      updated_at: m.updated_at ?? null,
      payload: safePayloadForMembresia(m.payload),
    }));

  return NextResponse.json(
    {
      venceMeta,
      membresiaExts,
    },
    { status: 200 },
  );
}
