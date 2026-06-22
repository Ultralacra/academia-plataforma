import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

const MENSAJE_TEMPLATE =
  "Hola {{nombre}} 😊\n\n¡Listo! Tu coach ya revisó tu consulta y dejó el feedback correspondiente.\n\nPuedes revisarlo aquí:\n🔗 {{link_feedback}}\n\nTe recomendamos revisar cuidadosamente las observaciones y aplicar las recomendaciones indicadas para continuar avanzando en tu implementación.\n\nSi después de revisar el feedback te surge una nueva duda o necesitas una aclaración puntual, puedes escribirnos nuevamente por este medio y con gusto te apoyaremos.\n\n¡Muchos éxitos! 🚀";

function extraerUrls(texto: string): string[] {
  const urls = texto.match(/https?:\/\/[^\s]+/g) || [];
  return urls.filter((u) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * POST /api/agentes/emma/notificar-resuelto
 *
 * Se llama cuando un ticket cambia a estado RESUELTO.
 * Notifica al alumno vía WebSocket + Push con el mensaje estándar de Emma.
 *
 * Body: { ticket_id: string, alumno_code: string }
 */
export async function POST(request: NextRequest) {
  let body: { ticket_id?: string; alumno_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const ticketId = String(body.ticket_id ?? "").trim();
  let alumnoCode = String(body.alumno_code ?? "").trim();

  if (!ticketId) {
    return NextResponse.json(
      { error: "ticket_id es requerido" },
      { status: 400 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const internalToken = process.env.INTERNAL_API_TOKEN;
  const authHeader = internalToken
    ? `Bearer ${internalToken}`
    : authorization;

  // 1. Obtener detalles del ticket
  let ticketName = "";
  let alumnoNombre = alumnoCode;
  let feedbackLink = "";

  try {
    const ticketUrl = buildUrl(
      `/ticket/get/ticket/${encodeURIComponent(ticketId)}`,
    );
    const ticketRes = await fetch(ticketUrl, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(8_000),
    });

    if (ticketRes.ok) {
      const json = (await ticketRes.json()) as any;
      const ticket = json?.data ?? json ?? {};
      ticketName = String(ticket.nombre ?? ticket.title ?? "");
      alumnoNombre = String(
        ticket.alumno_nombre ?? ticket.alumnoNombre ?? alumnoCode,
      );

      // Si no se proveyó alumno_code, extraerlo del ticket
      if (!alumnoCode) {
        alumnoCode = String(
          ticket.id_alumno ??
            ticket.alumno_codigo ??
            ticket.alumnoCodigo ??
            ticket.alumno_id ??
            "",
        ).trim();
      }
    }
  } catch {
    // continuar con lo que tengamos
  }

  if (!alumnoCode) {
    return NextResponse.json(
      { error: "No se pudo determinar el código del alumno" },
      { status: 400 },
    );
  }

  // 2. Obtener comentarios públicos para extraer el link de feedback
  try {
    const commentsUrl = buildUrl(
      `/ticket/get/public-comments/${encodeURIComponent(ticketId)}`,
    );
    const commentsRes = await fetch(commentsUrl, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(8_000),
    });

    if (commentsRes.ok) {
      const json = (await commentsRes.json()) as any;
      let comments: any[] = [];
      if (Array.isArray(json)) comments = json;
      else if (Array.isArray(json?.data)) comments = json.data;
      else if (Array.isArray(json?.comments)) comments = json.comments;

      const allText = comments
        .map((c: any) =>
          String(c.contenido ?? c.content ?? c.body ?? ""),
        )
        .join(" ");

      const urls = extraerUrls(allText);
      if (urls.length > 0) feedbackLink = urls[0];
    }
  } catch {
    // continuar
  }

  // Si no hay link en comentarios, buscar en la descripción
  if (!feedbackLink && ticketName) {
    const urls = extraerUrls(ticketName);
    if (urls.length > 0) feedbackLink = urls[0];
  }

  // Fallback: link genérico al ticket (el alumno no puede verlo, pero es mejor que nada)
  if (!feedbackLink) {
    feedbackLink = `${request.nextUrl.origin}/alumno/agente`;
  }

  // 3. Construir mensaje
  const mensaje = MENSAJE_TEMPLATE
    .replace(/\{\{nombre\}\}/g, alumnoNombre.split(" ")[0])
    .replace(/\{\{link_feedback\}\}/g, feedbackLink);

  // 4. Notificaciones
  const origin = request.nextUrl.origin;
  const results: Record<string, any> = {};

  const eventData = {
    room: `alumno:${alumnoCode}`,
    type: "ticket:resuelto",
    data: {
      ticketId,
      alumnoCode,
      alumnoNombre,
      feedbackLink,
      mensaje,
      at: new Date().toISOString(),
    },
  };

  // SSE (funciona en dev y producción)
  try {
    const sseRes = await fetch(`${origin}/api/realtime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
      cache: "no-store",
    });
    results.sse = sseRes.ok ? "ok" : "error";
  } catch {
    results.sse = "error";
  }

  // WebSocket (backup para producción)
  try {
    const wsRes = await fetch(`${origin}/api/socket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
      cache: "no-store",
    });
    results.websocket = wsRes.ok ? "ok" : "error";
  } catch {
    results.websocket = "error";
  }

  // Push notification
  try {
    const pushRes = await fetch(`${origin}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: `alumno:${alumnoCode}`,
        title: "¡Feedback de tu coach listo!",
        body: `Tu coach ya revisó "${ticketName || "tu consulta"}"`,
        url: `/alumno/agente`,
        tag: `emma-resuelto-${ticketId}`,
        data: {
          ticketId,
          feedbackLink,
          alumnoCode,
        },
      }),
      cache: "no-store",
    });
    results.push = pushRes.ok ? "ok" : "error";
  } catch {
    results.push = "error";
  }

  return NextResponse.json({
    ok: true,
    ticketId,
    alumnoCode,
    alumnoNombre,
    feedbackLink,
    mensaje,
    notificaciones: results,
  });
}
