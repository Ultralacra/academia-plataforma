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

// ── Helpers para calcular días pausados (mismos que el perfil del alumno) ───
function parseMaybeDate(raw?: string | null): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const v = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(v.getTime()) ? null : v;
  }
  const isoStart = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoStart) {
    const [, y, m, d] = isoStart;
    const v = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(v.getTime()) ? null : v;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toDayDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function daysBetweenInclusive(a: Date, b: Date) {
  const start = toDayDate(a);
  const end = toDayDate(b);
  if (end.getTime() < start.getTime()) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// Convención: la fecha "Hasta" de la pausa es el día de regreso → exclusive end.
async function fetchPausedCalendarDaysTotal(
  alumnoCode: string,
  authorization: string,
): Promise<number> {
  try {
    const res = await fetch(
      buildUrl(`/client/get/cliente-estatus/${encodeURIComponent(alumnoCode)}`),
      {
        method: "GET",
        headers: { Authorization: authorization, Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) return 0;
    const json = await res.json().catch(() => null);
    const rows: any[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.data?.data)
        ? json.data.data
        : Array.isArray(json?.rows)
          ? json.rows
          : Array.isArray(json)
            ? json
            : [];
    const ranges: Array<{ start: Date; end: Date }> = [];
    for (const r of rows) {
      const estado = String(r?.estatus_id ?? r?.estado_id ?? r?.estado ?? "")
        .toUpperCase();
      const isPaused = estado.includes("PAUSADO") || estado.includes("PAUSA");
      if (!isPaused) continue;
      const s = parseMaybeDate(r?.fecha_desde ?? null);
      const e = parseMaybeDate(r?.fecha_hasta ?? null);
      if (!s || !e) continue;
      ranges.push({ start: toDayDate(s), end: toDayDate(e) });
    }
    if (ranges.length === 0) return 0;
    ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: Array<{ start: Date; end: Date }> = [];
    const oneDay = 86400000;
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push({ start: r.start, end: r.end });
        continue;
      }
      if (r.start.getTime() <= last.end.getTime() + oneDay) {
        if (r.end.getTime() > last.end.getTime()) last.end = r.end;
      } else {
        merged.push({ start: r.start, end: r.end });
      }
    }
    let total = 0;
    for (const r of merged) {
      if (r.end.getTime() > r.start.getTime()) {
        total += Math.max(0, daysBetweenInclusive(r.start, r.end) - 1);
      }
    }
    return total;
  } catch {
    return 0;
  }
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
    programa_meses: payload.programa_meses ?? null,
    meses_extra: payload.meses_extra ?? null,
    vence_estimado: payload.vence_estimado ?? null,
    vence_tipo: payload.vence_tipo ?? null,
    vence_motivo: payload.vence_motivo ?? null,
    extensiones: Array.isArray(payload.extensiones)
      ? payload.extensiones.map((ext: any) => ({
          id: ext?.id ?? null,
          tipo: ext?.tipo ?? null,
          fecha_desde: ext?.fecha_desde ?? null,
          fecha_hasta: ext?.fecha_hasta ?? null,
          motivo: ext?.motivo ?? null,
          paused_calendar_days_at_creation: ext?.paused_calendar_days_at_creation ?? null,
          created_at: ext?.created_at ?? null,
          changed_by: ext?.changed_by ?? null,
        }))
      : [],
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
    numero_membresia: payload.numero_membresia ?? null,
    meses: payload.meses ?? payload.meses_extra ?? null,
    fecha_desde: payload.fecha_desde ?? null,
    fecha_hasta: payload.fecha_hasta ?? null,
    paused_calendar_days_at_creation: payload.paused_calendar_days_at_creation ?? null,
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
      {
        venceMeta: null,
        membresiaExts: [],
        joinDate: null,
        pausedCalendarDaysTotal: 0,
      },
      { status: 200 },
    );
  }

  // alumnoCode opcional (código del alumno) para poder buscar joinDate en paralelo
  const alumnoCode = req.nextUrl.searchParams.get("alumnoCode")?.trim() || null;

  // Fetch metadata y (si tenemos código) datos del alumno en paralelo
  const clientSearchUrl = alumnoCode
    ? buildUrl(`/client/get/clients?pageSize=10&search=${encodeURIComponent(alumnoCode)}`)
    : null;

  const [upstream, clientRes] = await Promise.all([
    fetch(buildUrl("/metadata"), {
      method: "GET",
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    }),
    clientSearchUrl
      ? fetch(clientSearchUrl, {
          method: "GET",
          headers: { Authorization: auth, Accept: "application/json" },
          cache: "no-store",
        })
      : Promise.resolve(null),
  ]);

  // Extraer joinDate del resultado de clientes
  let joinDate: string | null = null;
  if (clientRes && clientRes.ok) {
    const clientJson = await clientRes.json().catch(() => null);
    const clientRows = coerceList(clientJson);
    const found = clientRows.find(
      (r: any) =>
        String(r.codigo ?? r.id_alumno ?? r.code ?? "").trim() ===
        alumnoCode,
    ) as any;
    joinDate = found?.ingreso ?? found?.fecha_ingreso ?? found?.joinDate ?? null;
  }

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

  // Si no teníamos alumnoCode en los query params, intentar obtenerlo del payload del venceMeta
  if (!joinDate && venceMeta?.payload?.alumno_codigo) {
    try {
      const code = String(venceMeta.payload.alumno_codigo).trim();
      const fallbackRes = await fetch(
        buildUrl(
          `/client/get/clients?pageSize=10&search=${encodeURIComponent(code)}`,
        ),
        {
          method: "GET",
          headers: { Authorization: auth, Accept: "application/json" },
          cache: "no-store",
        },
      );
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json().catch(() => null);
        const fallbackRows = coerceList(fallbackJson);
        const found = fallbackRows.find(
          (r: any) =>
            String(r.codigo ?? r.id_alumno ?? r.code ?? "").trim() === code,
        ) as any;
        joinDate =
          found?.ingreso ?? found?.fecha_ingreso ?? found?.joinDate ?? null;
      }
    } catch {
      // silencioso
    }
  }

  // Calcular días totales de pausa (idéntico al perfil del alumno).
  const effectiveCode =
    alumnoCode ||
    (venceMeta?.payload?.alumno_codigo
      ? String(venceMeta.payload.alumno_codigo).trim()
      : null);
  const pausedCalendarDaysTotal = effectiveCode
    ? await fetchPausedCalendarDaysTotal(effectiveCode, auth)
    : 0;

  return NextResponse.json(
    {
      venceMeta,
      membresiaExts,
      joinDate,
      pausedCalendarDaysTotal,
    },
    { status: 200 },
  );
}
