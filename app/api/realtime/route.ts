import { NextRequest } from "next/server";

type Sender = "admin" | "alumno" | "coach";
type Message = {
  id: string;
  room: string; // student code
  sender: Sender;
  text: string;
  at: string; // ISO
};

// In-memory broker (válido para desarrollo/local). En producción usar DB/Redis.
const rooms = new Map<string, Set<(data: Message) => void>>();
const history = new Map<string, Message[]>();

// Runtime EDGE: mejor compatibilidad con SSE en producción
export const runtime = "edge";

function normalizeRoom(room: string) {
  return room.toLowerCase().trim();
}

function broadcast(room: string, msg: Message) {
  if (!rooms.has(room)) return;
  for (const send of rooms.get(room)!) {
    try {
      send(msg);
    } catch {}
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomParam = (searchParams.get("room") || "").trim();
  const room = normalizeRoom(roomParam);
  if (!room) {
    return new Response("Missing room", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      function send(msg: Message) {
        const payload = `data: ${JSON.stringify(msg)}\n\n`;
        controller.enqueue(new TextEncoder().encode(payload));
      }

      // Registrar suscriptor
      let subs = rooms.get(room);
      if (!subs) {
        subs = new Set();
        rooms.set(room, subs);
      }
      subs.add(send);

      // Re-play de últimos mensajes (máx 50)
      const h = history.get(room) || [];
      h.slice(-50).forEach(send);

      // Keep-alive ping
      const ping = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch {}
      }, 15000);

      const onClose = () => {
        clearInterval(ping);
        subs?.delete(send);
      };

      // Cierre por abort del request
      // @ts-ignore - req has signal in edge/node
      const signal: AbortSignal | undefined = (req as any).signal;
      signal?.addEventListener("abort", onClose);
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const room = normalizeRoom(String(body.room || ""));
    const sender = (String(body.sender || "admin").toLowerCase() as Sender) || "admin";
    const text = String(body.text || "").trim();
    if (!room || !text) return new Response("Invalid", { status: 400 });
    const msg: Message = {
      id: Math.random().toString(36).slice(2),
      room,
      sender,
      text,
      at: new Date().toISOString(),
    };
    // Append a historial
    const arr = history.get(room) || [];
    arr.push(msg);
    // Cap historial
    if (arr.length > 200) arr.splice(0, arr.length - 200);
    history.set(room, arr);
    // Emitir a suscriptores
    broadcast(room, msg);
    return Response.json({ ok: true, msg });
  } catch (e) {
    return new Response("Bad Request", { status: 400 });
  }
}
