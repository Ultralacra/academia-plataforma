import { NextRequest, NextResponse } from "next/server";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${API_HOST}${path}`;
}

function unwrapData(res: any) {
  if (res && typeof res === "object" && "data" in res) return (res as any).data;
  return res;
}

type MeUser = {
  id?: string | number;
  role?: string;
  tipo?: string;
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

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Seguridad: evitar que un alumno (student) cree metadata desde F12.
  // Para roles no-admin, el backend igual debe validar permisos.
  const me = await fetchMe(auth);
  if (me) {
    const role = normalizeRole(me.role, me.tipo);
    if (role === "student") {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }
  }

  const bodyText = await req.text();
  const upstream = await fetch(buildUrl("/metadata"), {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyText,
    cache: "no-store",
  });

  const text = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    return NextResponse.json(
      { error: text || `HTTP ${upstream.status}` },
      { status: upstream.status },
    );
  }

  // Devolvemos una respuesta mínima (para no exponer payload completo)
  try {
    const parsed = text ? JSON.parse(text) : null;
    const data = unwrapData(parsed);
    const id = (data as any)?.id ?? (parsed as any)?.id ?? null;
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
