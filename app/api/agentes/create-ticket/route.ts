import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

/**
 * Dispara notificaciones (WebSocket room + Web Push) en background tras crear un ticket.
 * No bloquea la respuesta al alumno.
 */
async function dispatchTicketCreatedNotifications(opts: {
  origin: string;
  ticketId: string;
  alumnoCode: string;
  alumnoNombre: string;
  titulo: string;
  categoria: string;
  authHeader: string;
}) {
  const { origin, ticketId, alumnoCode, alumnoNombre, titulo, categoria, authHeader } = opts;

  const eventData = {
    ticketId,
    alumnoCode,
    alumnoNombre,
    titulo,
    categoria,
    at: new Date().toISOString(),
  };

  // 1. Broadcast al room "tickets" via WebSocket (in-app, tiempo real)
  const socketPromise = fetch(`${origin}/api/socket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: "tickets", type: "ticket:agent_created", data: eventData }),
    cache: "no-store",
  }).catch(() => {});

  // 2. Web Push a topic "atc-coaches" (notificación nativa del SO)
  const pushPromise = fetch(`${origin}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "atc-coaches",
      title: "Ticket creado por Emma",
      body: `${alumnoNombre} · ${titulo}`,
      url: `/admin/alumnos/${alumnoCode}/chat`,
      tag: `emma-ticket-${ticketId}`,
      data: eventData,
    }),
    cache: "no-store",
  }).catch(() => {});

  // 3. Intentar obtener coaches del alumno y enviarles push personalizado
  const coachPushPromise = (async () => {
    try {
      const res = await fetch(buildUrl(`/client/get/clients-coaches?alumno=${encodeURIComponent(alumnoCode)}`), {
        headers: { Authorization: authHeader },
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      const rows: Array<{ id_coach?: string | number }> = Array.isArray(json?.data) ? json.data : [];
      await Promise.allSettled(
        rows.map((r) => {
          const coachId = String(r.id_coach ?? "").trim();
          if (!coachId) return Promise.resolve();
          return fetch(`${origin}/api/push/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: `atc-coach:${coachId}`,
              title: "Ticket creado por Emma",
              body: `${alumnoNombre} · ${titulo}`,
              url: `/admin/alumnos/${alumnoCode}/chat`,
              tag: `emma-ticket-${ticketId}`,
              data: eventData,
            }),
            cache: "no-store",
          }).catch(() => {});
        })
      );
    } catch {}
  })();

  await Promise.allSettled([socketPromise, pushPromise, coachPushPromise]);
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
 *   urls?       string[] — URLs adjuntas (opcional)
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
    urls?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { id_alumno, nombre, tipo, descripcion, estado, ai_run_id, message_ids, file_ids, urls } = body;

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
  if (Array.isArray(urls) && urls.length > 0) {
    const unique = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
    const urlsComma = unique.join(', ');
    desc = desc ? `${desc}\nURLs: ${urlsComma}` : urlsComma;
    fd.set("urls", JSON.stringify(unique));
  }
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

    let ticketData: Record<string, any> | null = null;
    try {
      ticketData = JSON.parse(text);
    } catch {}

    // Disparar notificaciones en background (no bloquear la respuesta al alumno)
    const origin = new URL(request.url).origin;
    const ticketId = String(
      ticketData?.id ?? ticketData?.data?.id ?? ticketData?.id_ticket ?? ""
    );
    const alumnoNombre = String(
      ticketData?.alumno_nombre ?? ticketData?.data?.alumno_nombre ?? id_alumno
    );
    dispatchTicketCreatedNotifications({
      origin,
      ticketId,
      alumnoCode: id_alumno,
      alumnoNombre,
      titulo: nombre,
      categoria: tipoNorm,
      authHeader,
    }).catch(() => {});

    return ticketData
      ? NextResponse.json(ticketData)
      : NextResponse.json({ ok: true, raw: text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
