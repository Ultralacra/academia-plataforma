import { NextRequest, NextResponse } from "next/server";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

function normalizeRole(rawRole?: unknown, rawTipo?: unknown) {
  const v = String(rawRole ?? "").trim().toLowerCase();
  const t = String(rawTipo ?? "").trim().toLowerCase();
  const isStudent = (s: string) =>
    ["alumno", "student", "cliente", "usuario", "user"].includes(s);
  if (isStudent(v) || isStudent(t)) return "student";
  return "other";
}

const ALLOWED_CODES = ["GtfjYj1aZINQoNsw"];

async function fetchMe(authorization: string) {
  const res = await fetch(buildUrl("/auth/me"), {
    headers: { Authorization: authorization, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const payload =
    json && typeof json === "object" && "data" in json
      ? (json as any).data
      : json;
  return payload as {
    id?: string | number;
    role?: string;
    tipo?: string;
    codigo?: string;
  } | null;
}

/**
 * GET /api/agentes/copy-alumno/check-access
 *
 * Verifica si el alumno autenticado tiene acceso al agente HotSelling.
 * Requisito: role = student AND codigo = GtfjYj1aZINQoNsw
 *
 * Response: { allowed: boolean, reason?: string }
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json(
      { allowed: false, reason: "No autenticado" },
      { status: 401 },
    );
  }

  const me = await fetchMe(auth);
  if (!me) {
    return NextResponse.json(
      { allowed: false, reason: "Token inválido" },
      { status: 401 },
    );
  }

  const role = normalizeRole(me.role, me.tipo);
  if (role !== "student") {
    return NextResponse.json({
      allowed: false,
      reason: "Solo disponible para alumnos",
    });
  }

  const codigo = String(me.codigo ?? me.id ?? "");
  if (!codigo) {
    return NextResponse.json({
      allowed: false,
      reason: "Sin código de alumno",
    });
  }

  const allowed = ALLOWED_CODES.includes(codigo);

  return NextResponse.json({
    allowed,
    reason: allowed
      ? undefined
      : "Acceso exclusivo restringido",
  });
}
