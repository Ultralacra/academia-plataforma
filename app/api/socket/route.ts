export const runtime = "edge";

type Sender = "admin" | "alumno" | "coach";
type Message = {
  id: string;
  room: string;
  sender: Sender;
  text: string;
  at: string; // ISO
  attachments?: Array<{
    id: string;
    name: string;
    mime: string;
    size: number;
    data_base64: string; // sin cabecera data:
  }>;
};

const rooms = new Map<string, Set<WebSocket>>();
const history = new Map<string, Message[]>();

function normalizeRoom(room: string) {
  return String(room || "").toLowerCase().trim();
}

function broadcast(room: string, data: any) {
  const set = rooms.get(room);
  if (!set) return;
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  for (const ws of Array.from(set)) {
    try {
      ws.send(payload);
    } catch {}
  }
}

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomParam = normalizeRoom(searchParams.get("room") || "");

  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  // @ts-ignore
  const { 0: client, 1: server } = new (globalThis as any).WebSocketPair();

  server.accept();

  const room = roomParam;
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(server);

  // Enviar historial (últimos 50)
  const h = history.get(room) || [];
  server.send(JSON.stringify({ type: "history", data: h.slice(-50) }));

  server.addEventListener("message", (event: MessageEvent) => {
    try {
      const payload = JSON.parse(String(event.data || "{}"));
      // Allow clients to send either chat messages (type === 'message') which
      // follow the old Message shape, or arbitrary event payloads such as
      // { type: 'ticket:status_changed', room: 'tickets', data: {...} }.
      const roomIn = normalizeRoom(String(payload.room || room));
      if (!roomIn) return;

      if (payload && payload.type === "message") {
        const text = String(payload.text || "").trim();
        const sender = (String(payload.sender || "admin").toLowerCase() as Sender) || "admin";
        const attachments = Array.isArray(payload.attachments)
          ? ((payload.attachments as NonNullable<Message["attachments"]>) || []).filter(
              (a) => a && a.name && a.data_base64
            )
          : undefined;
        if (!text && !(attachments && attachments.length)) return;
        // Límite sencillo: max 25MB por mensaje
        const totalSize = (attachments || []).reduce((acc, a) => acc + (a.size || 0), 0);
        if (totalSize > 25 * 1024 * 1024) return;
        const msg: Message & { client_session?: string } = {
          id: String(payload.id || Math.random().toString(36).slice(2)),
          room: roomIn,
          sender,
          text,
          at: new Date().toISOString(),
          attachments,
        };
        if (payload.client_session) {
            msg.client_session = String(payload.client_session);
        }
        const arr = history.get(roomIn) || [];
        arr.push(msg);
        if (arr.length > 200) arr.splice(0, arr.length - 200);
        history.set(roomIn, arr);
        broadcast(roomIn, JSON.stringify({ type: "message", data: msg }));
        // Además, emitir un evento compacto global para notificaciones
        try {
          const compact = {
            type: "chat:new",
            data: {
              id: msg.id,
              room: msg.room,
              sender: msg.sender,
              text: msg.text?.slice(0, 280) || "",
              at: msg.at,
              // no adjuntamos blobs para notificaciones
            },
          };
          broadcast("chat:all", JSON.stringify(compact));
        } catch {}
        return;
      }

      // For any other payload type, broadcast it as-is to the room. Ensure
      // we attach an id and timestamp so clients can store history consistently.
      if (payload && payload.type) {
        const ev = {
          ...(payload as any),
          id: String(payload.id || Math.random().toString(36).slice(2)),
          at: payload.at || new Date().toISOString(),
          room: roomIn,
        };
        const arr = history.get(roomIn) || [];
        arr.push(ev as any);
        if (arr.length > 200) arr.splice(0, arr.length - 200);
        history.set(roomIn, arr);
        broadcast(roomIn, JSON.stringify(ev));
        return;
      }
    } catch {}
  });

  server.addEventListener("close", () => {
    const set = rooms.get(room);
    set?.delete(server);
    if (set && set.size === 0) rooms.delete(room);
  });

  // TS no reconoce 'webSocket' en ResponseInit, casteamos a any
  return new Response(null, { status: 101, webSocket: client } as any);
}
