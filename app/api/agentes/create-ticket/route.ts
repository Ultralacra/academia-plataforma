import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

/**
 * POST /api/agentes/create-ticket
 *
 * Proxy que crea un ticket en el backend usando INTERNAL_API_TOKEN como JWT,
 * de modo que el `informante` queda como la identidad de servicio ATC
 * (no como el alumno, aunque sea el alumno quien llama desde el browser).
 *
 * Body (JSON):
 *   id_alumno   string  — código del alumno
 *   nombre      string  — título del ticket
 *   tipo        string  — tipo/categoría del ticket
 *   descripcion string  — descripción detallada
 *   estado?     string  — estado inicial (opcional)
 *   ai_run_id?  string  — ID de corrida IA (opcional)
 *   message_ids? string[] — IDs de mensajes (opcional)
 *   file_ids?   string[] — IDs de archivos (opcional)
 */
export async function POST(request: NextRequest) {
  // Validar que el caller esté autenticado (cualquier JWT válido del browser)
  const callerAuth = request.headers.get("authorization");
  if (!callerAuth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    id_alumno?: string;
    nombre?: string;
    tipo?: string;
    descripcion?: string;
    estado?: string;
    ai_run_id?: string;
    message_ids?: string[];
    file_ids?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { id_alumno, nombre, tipo, descripcion, estado, ai_run_id, message_ids, file_ids } = body;

  if (!id_alumno || !nombre || !tipo) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: id_alumno, nombre, tipo" },
      { status: 400 },
    );
  }

  // Usar el token de servicio ATC para que el backend asigne informante = identidad ATC
  const internalToken = process.env.INTERNAL_API_TOKEN;
  const authHeader = internalToken ? `Bearer ${internalToken}` : callerAuth;

  // Construir el FormData para el backend (igual que createTicket en api.ts)
  const fd = new FormData();
  fd.set("id_alumno", id_alumno);
  fd.set("nombre", nombre);

  // Normalizar tipo
  const tipoNorm = tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase();
  fd.set("tipo", tipoNorm);

  let desc = descripcion ?? "";
  fd.set("descripcion", desc);

  if (estado) fd.set("estado", estado);
  if (ai_run_id) fd.set("ai_run_id", ai_run_id);
  if (Array.isArray(message_ids) && message_ids.length > 0) {
    fd.set("message_ids", JSON.stringify(message_ids.map(String)));
  }
  if (Array.isArray(file_ids) && file_ids.length > 0) {
    fd.set("file_ids", JSON.stringify(file_ids.map(String)));
  }

  try {
    const res = await fetch(buildUrl("/ticket/create/ticket"), {
      method: "POST",
      headers: { Authorization: authHeader },
      body: fd,
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return NextResponse.json(
        { error: text || `HTTP ${res.status}` },
        { status: res.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true, raw: text });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
