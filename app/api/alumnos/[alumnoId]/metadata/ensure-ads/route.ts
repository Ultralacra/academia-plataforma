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
  const payload =
    json && typeof json === "object" && "data" in json ? (json as any).data : json;
  return payload as MeUser;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ alumnoId: string }> },
) {
  const { alumnoId } = await ctx.params;
  const requestedAlumnoId = String(alumnoId ?? "").trim();

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

  if (role === "student") {
    const okById = Boolean(meId && requestedAlumnoId === meId);
    const okByCode = Boolean(meCode && requestedAlumnoId === meCode);
    if (!okById && !okByCode) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => null)) as any;
  const incomingPayload =
    body?.payload && typeof body.payload === "object" ? body.payload : {};

  const safePayload = {
    ...incomingPayload,
    alumno_codigo: String(incomingPayload?.alumno_codigo ?? requestedAlumnoId).trim(),
    _tag: "admin_alumnos_ads_metrics",
    _view: "/admin/alumnos/[code]/ads",
    _saved_at: new Date().toISOString(),
  };

  const createBody = {
    entity: "ads_metrics",
    entity_id: String(body?.entity_id ?? requestedAlumnoId).trim() || requestedAlumnoId,
    payload: safePayload,
  };

  const upstream = await fetch(buildUrl("/metadata"), {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(createBody),
    cache: "no-store",
  });

  const text = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    return NextResponse.json(
      { error: text || `HTTP ${upstream.status}` },
      { status: upstream.status },
    );
  }

  try {
    const parsed = text ? JSON.parse(text) : null;
    const data = parsed && typeof parsed === "object" && "data" in parsed ? (parsed as any).data : parsed;
    const id = (data as any)?.id ?? (parsed as any)?.id ?? null;
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
