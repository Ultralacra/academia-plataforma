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

/**
 * Lista metadata para un alumno.
 * - Siempre filtra por alumno_id en el upstream (si el backend lo soporta).
 * - Si el usuario es rol student: solo permite su propio alumnoId.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ alumnoId: string }> },
) {
  const { alumnoId } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const me = await fetchMe(auth);
  if (me) {
    const role = normalizeRole(me.role, me.tipo);
    if (role === "student") {
      const meId = me.id != null ? String(me.id) : "";
      const meCodigo = me.codigo != null ? String(me.codigo) : "";
      const requested = String(alumnoId);
      const okById = meId && requested === meId;
      const okByCodigo = meCodigo && requested === meCodigo;
      if (!okById && !okByCodigo) {
        return NextResponse.json({ error: "Prohibido" }, { status: 403 });
      }
    }
  }

  const id = String(alumnoId ?? "").trim();
  if (!id) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  // Propagar filtros opcionales (ej: ticket_codigo) pero siempre con alumno_id
  const url = new URL(req.url);
  const ticketCodigo = url.searchParams.get("ticket_codigo");
  const entity = url.searchParams.get("entity");
  const qs = new URLSearchParams();
  qs.set("alumno_id", id);
  if (ticketCodigo) qs.set("ticket_codigo", ticketCodigo);
  if (entity) qs.set("entity", entity);

  const upstream = await fetch(buildUrl(`/metadata?${qs.toString()}`), {
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
  const items = coerceList(json);

  // Defensa extra: aunque el backend ignore filtros, NUNCA devolvemos metadata de otros alumnos.
  // Permitimos match por:
  // - payload.alumno_id == :alumnoId
  // - payload.alumno_codigo == :alumnoId (cuando el param es el código)
  // - entity_id == :alumnoId (algunas entidades guardan el id/código ahí)
  const idNorm = id.trim();
  const idLower = idNorm.toLowerCase();
  const filtered = items.filter((m: any) => {
    if (!m || typeof m !== "object") return false;

    const entityId = String((m as any)?.entity_id ?? "").trim();
    if (entityId && entityId === idNorm) return true;

    const payload = (m as any)?.payload;
    if (!payload || typeof payload !== "object") return false;

    const pid = payload?.alumno_id;
    if (pid != null && String(pid).trim() === idNorm) return true;

    const pc = payload?.alumno_codigo;
    if (pc != null && String(pc).trim().toLowerCase() === idLower) return true;

    return false;
  });

  // No intentamos recortar payload acá (endpoint genérico). Si se quiere “mínimo”,
  // es mejor endpoints por feature como /metadata/vence.
  return NextResponse.json({ items: filtered }, { status: 200 });
}
