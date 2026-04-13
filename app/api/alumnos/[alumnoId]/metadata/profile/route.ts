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
    ["atc", "support", "soporte", "atencion", "atención", "customer_support"].includes(s);
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
    headers: { Authorization: authorization, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const payload =
    json && typeof json === "object" && "data" in json
      ? (json as any).data
      : json;
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

const ENTITY = "student_profile_data";

// ── Validación del payload de encuesta ──

const VALID_EXPERIENCE = ["basico", "intermedio", "experto"];
const VALID_LEARNING = ["audio", "video", "texto"];

const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "twitter",
  "pinterest",
  "otra",
];

function sanitizeStr(v: unknown, max = 300): string {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}

function validateProfilePayload(raw: any): {
  ok: boolean;
  payload?: any;
  error?: string;
} {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Payload inválido" };
  }

  const niche = sanitizeStr(raw.niche, 200);
  const occupation = sanitizeStr(raw.occupation, 200);
  const digitalExperience = sanitizeStr(raw.digitalExperience, 20);
  const learningPreference = sanitizeStr(raw.learningPreference, 20);

  if (!niche) return { ok: false, error: "El nicho es obligatorio" };
  if (!occupation)
    return { ok: false, error: "La ocupación es obligatoria" };
  if (!VALID_EXPERIENCE.includes(digitalExperience))
    return { ok: false, error: "Nivel de experiencia inválido" };
  if (!VALID_LEARNING.includes(learningPreference))
    return { ok: false, error: "Preferencia de aprendizaje inválida" };

  // Redes sociales: array de objetos {platform, handle}
  let socialNetworks: { platform: string; handle: string }[] = [];
  if (Array.isArray(raw.socialNetworks)) {
    socialNetworks = raw.socialNetworks
      .filter(
        (s: any) =>
          s &&
          typeof s === "object" &&
          typeof s.platform === "string" &&
          typeof s.handle === "string",
      )
      .map((s: any) => ({
        platform: sanitizeStr(s.platform, 30).toLowerCase(),
        handle: sanitizeStr(s.handle, 100),
      }))
      .filter(
        (s: { platform: string; handle: string }) =>
          SOCIAL_PLATFORMS.includes(s.platform) && s.handle,
      );
  }

  return {
    ok: true,
    payload: {
      niche,
      socialNetworks,
      occupation,
      digitalExperience,
      learningPreference,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
  };
}

// ── GET: obtener profile data de un alumno ──

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ alumnoId: string }> },
) {
  const { alumnoId } = await ctx.params;
  const requested = String(alumnoId ?? "").trim();
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const me = await fetchMe(auth);
  if (!me) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = normalizeRole(me.role, me.tipo);
  const meId = String(me.id ?? "").trim();
  const meCode = String(me.codigo ?? "").trim();

  // Students solo pueden ver su propia data
  if (role === "student") {
    const okById = Boolean(meId && requested === meId);
    const okByCode = Boolean(meCode && requested === meCode);
    if (!okById && !okByCode) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }
  }

  // Buscar metadata con entity=student_profile_data
  const qs = new URLSearchParams();
  qs.set("entity", ENTITY);
  // Intentamos filtrar por entity_id del alumno
  const upstream = await fetch(buildUrl(`/metadata?${qs.toString()}`), {
    method: "GET",
    headers: { Authorization: auth, Accept: "application/json" },
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
  const items = coerceList(json);

  // Filtrar solo el registro de este alumno (por entity_id o payload.alumno_codigo)
  const match = items.find((m: any) => {
    const eid = String(m?.entity_id ?? "").trim();
    if (eid === requested) return true;
    const pc = String(m?.payload?.alumno_codigo ?? "").trim();
    if (pc && pc === requested) return true;
    return false;
  });

  return NextResponse.json({ item: match ?? null }, { status: 200 });
}

// ── POST: crear o actualizar profile data ──

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ alumnoId: string }> },
) {
  const { alumnoId } = await ctx.params;
  const requested = String(alumnoId ?? "").trim();
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const me = await fetchMe(auth);
  if (!me) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = normalizeRole(me.role, me.tipo);
  const meId = String(me.id ?? "").trim();
  const meCode = String(me.codigo ?? "").trim();

  // Students solo pueden escribir su propia data
  if (role === "student") {
    const okById = Boolean(meId && requested === meId);
    const okByCode = Boolean(meCode && requested === meCode);
    if (!okById && !okByCode) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => null)) as any;
  const validation = validateProfilePayload(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const safePayload = {
    ...validation.payload,
    alumno_codigo: requested,
  };

  // Verificar si ya existe un registro para esta entidad
  const checkQs = new URLSearchParams();
  checkQs.set("entity", ENTITY);
  const checkRes = await fetch(buildUrl(`/metadata?${checkQs.toString()}`), {
    method: "GET",
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });

  let existingId: string | number | null = null;
  if (checkRes.ok) {
    const checkJson = await checkRes.json().catch(() => null);
    const existing = coerceList(checkJson).find((m: any) => {
      const eid = String(m?.entity_id ?? "").trim();
      if (eid === requested) return true;
      const pc = String(m?.payload?.alumno_codigo ?? "").trim();
      if (pc && pc === requested) return true;
      return false;
    });
    if (existing?.id) existingId = existing.id;
  }

  if (existingId) {
    // Actualizar existente (PUT)
    const upstream = await fetch(buildUrl(`/metadata/${existingId}`), {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        entity: ENTITY,
        entity_id: requested,
        payload: safePayload,
      }),
      cache: "no-store",
    });
    const text = await upstream.text().catch(() => "");
    if (!upstream.ok) {
      return NextResponse.json(
        { error: text || `HTTP ${upstream.status}` },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ ok: true, updated: true }, { status: 200 });
  }

  // Crear nuevo (POST)
  const upstream = await fetch(buildUrl("/metadata"), {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      entity: ENTITY,
      entity_id: requested,
      payload: safePayload,
    }),
    cache: "no-store",
  });

  const text = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    return NextResponse.json(
      { error: text || `HTTP ${upstream.status}` },
      { status: upstream.status },
    );
  }

  return NextResponse.json({ ok: true, created: true }, { status: 200 });
}
