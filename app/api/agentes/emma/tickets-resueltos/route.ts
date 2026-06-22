import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

function extraerUrls(texto: string): string[] {
  return (texto.match(/https?:\/\/[^\s]+/g) || []).filter((u) => {
    try { new URL(u); return true; } catch { return false; }
  });
}

/**
 * GET /api/agentes/emma/tickets-resueltos?alumno=XXX
 *
 * Retorna todos los tickets RESUELTO del alumno con su feedbackUrl.
 * La deduplicación se maneja en el cliente con un Set de IDs ya procesados.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const alumnoCode = (searchParams.get("alumno") || "").trim();

  if (!alumnoCode) {
    return NextResponse.json(
      { error: "alumno es requerido" },
      { status: 400 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const internalToken = process.env.INTERNAL_API_TOKEN;
  const authHeader = internalToken
    ? `Bearer ${internalToken}`
    : authorization;

  try {
    const url = buildUrl(
      `/client/get/tickets/${encodeURIComponent(alumnoCode)}?page=1&pageSize=50`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return NextResponse.json({ tickets: [], error: "API error" }, { status: 200 });
    }

    const json = (await res.json()) as any;
    let rows: any[] = [];
    if (Array.isArray(json)) rows = json;
    else if (Array.isArray(json?.data)) rows = json.data;

    const resueltos = rows
      .filter((t) => {
        const estado = String(t.estado ?? t.status ?? "").toUpperCase();
        return estado.includes("RESUELTO") || estado.includes("COMPLETO");
      });

    const ticketsConFeedback = await Promise.all(
      resueltos.map(async (t) => {
        const ticketId = String(t.id_externo ?? t.codigo ?? t.id ?? "");
        let feedbackUrl = "";

        try {
          const commentsUrl = buildUrl(
            `/ticket/get/public-comments/${encodeURIComponent(ticketId)}`,
          );
          const commentsRes = await fetch(commentsUrl, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(5_000),
          });

          if (commentsRes.ok) {
            const cJson = (await commentsRes.json()) as any;
            let comments: any[] = [];
            if (Array.isArray(cJson)) comments = cJson;
            else if (Array.isArray(cJson?.data)) comments = cJson.data;
            else if (Array.isArray(cJson?.comments)) comments = cJson.comments;

            console.log("[TICKETS-RESUELTOS] Comments for", ticketId, ":", JSON.stringify(comments).slice(0, 500));

            const allText = comments
              .map((c: any) => String(c.contenido ?? c.content ?? c.body ?? ""))
              .join(" ");

            const urls = extraerUrls(allText);
            if (urls.length > 0) feedbackUrl = urls[0];
          } else {
            console.log("[TICKETS-RESUELTOS] Comments error:", commentsRes.status, "for ticket", ticketId);
          }
        } catch {
          // continuar sin feedbackUrl
        }

        if (!feedbackUrl) {
          const nombreUrls = extraerUrls(String(t.nombre ?? ""));
          if (nombreUrls.length > 0) feedbackUrl = nombreUrls[0];
        }

        console.log("[TICKETS-RESUELTOS] Ticket:", ticketId, "nombre:", t.nombre, "feedbackUrl:", feedbackUrl);

        return {
          ticketId,
          nombre: String(t.nombre ?? t.title ?? ""),
          estado: String(t.estado ?? t.status ?? ""),
          feedbackUrl,
        };
      }),
    );

    return NextResponse.json({
      tickets: ticketsConFeedback,
      consultadoAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { tickets: [], error: "Error consultando API" },
      { status: 200 },
    );
  }
}
