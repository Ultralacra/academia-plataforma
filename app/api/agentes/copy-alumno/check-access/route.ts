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

/**
 * Normaliza el tag quitando acentos, espacios extra y pasando a lowercase.
 * "Hotselling Pro" → "hotselling pro"
 * "HotSelling pro" → "hotselling pro"
 */
function normalizeTag(tag?: string | null): string {
  return String(tag ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const ALLOWED_TAG = "hotselling pro";

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

async function fetchStudentTag(
  authorization: string,
  codigo: string,
): Promise<string | null> {
  const res = await fetch(
    buildUrl(
      `/client/get/clients?page=1&pageSize=5&search=${encodeURIComponent(codigo)}`,
    ),
    {
      headers: { Authorization: authorization, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const rows: any[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.clients?.data)
      ? json.clients.data
      : Array.isArray(json?.getClients?.data)
        ? json.getClients.data
        : [];
  if (rows.length === 0) return null;
  const student =
    rows.find(
      (r) =>
        String(r.codigo ?? "").toLowerCase() === codigo.toLowerCase(),
    ) ?? rows[0];
  return (
    String(
      student?.tag ?? student?.etiqueta ?? student?.tags ?? "",
    ).trim() || null
  );
}

/**
 * GET /api/agentes/copy-alumno/check-access
 *
 * Verifica si el alumno autenticado tiene acceso al agente HotSelling.
 * Requisito: role = student AND tag normalizado = "hotselling pro"
 *
 * Response: { allowed: boolean, tag: string | null, reason?: string }
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json(
      { allowed: false, tag: null, reason: "No autenticado" },
      { status: 401 },
    );
  }

  const me = await fetchMe(auth);
  if (!me) {
    return NextResponse.json(
      { allowed: false, tag: null, reason: "Token inválido" },
      { status: 401 },
    );
  }

  const role = normalizeRole(me.role, me.tipo);
  if (role !== "student") {
    return NextResponse.json({
      allowed: false,
      tag: null,
      reason: "Solo disponible para alumnos",
    });
  }

  const codigo = String(me.codigo ?? me.id ?? "");
  if (!codigo) {
    return NextResponse.json({
      allowed: false,
      tag: null,
      reason: "Sin código de alumno",
    });
  }

  const rawTag = await fetchStudentTag(auth, codigo);
  const allowed = normalizeTag(rawTag) === ALLOWED_TAG;

  return NextResponse.json({
    allowed,
    tag: rawTag,
    reason: allowed
      ? undefined
      : "Acceso exclusivo para alumnos HotSelling Pro",
  });
}
