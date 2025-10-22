"use client";

import React from "react";

type Sender = "admin" | "alumno" | "coach";
type Message = {
  id: string;
  room: string;
  sender: Sender;
  text: string;
  at: string; // ISO
};

export default function StudentChatMinimal({
  room,
  role = "alumno",
  title = "Chat",
  subtitle,
  className,
}: {
  room: string;
  role?: Sender;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const normRoom = React.useMemo(
    () => (room || "").trim().toLowerCase(),
    [room]
  );
  const [items, setItems] = React.useState<Message[]>([]);
  const [text, setText] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const srcRef = React.useRef<EventSource | null>(null);

  React.useEffect(() => {
    if (!normRoom) return;
    const url = `/api/realtime?room=${encodeURIComponent(normRoom)}`;
    const es = new EventSource(url, { withCredentials: false });
    srcRef.current = es;
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as Message;
        setItems((prev) => [...prev, msg]);
      } catch {}
    };
    es.onerror = () => {
      // silencioso, el navegador reintenta
    };
    return () => {
      try {
        es.close();
      } catch {}
      srcRef.current = null;
    };
  }, [normRoom]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  async function send() {
    const val = text.trim();
    if (!val) return;
    setText("");
    try {
      await fetch(`/api/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: normRoom, sender: role, text: val }),
      });
    } catch {}
  }

  const mine = (s: Sender) => (s || "").toLowerCase() === role.toLowerCase();

  return (
    <div className={`flex flex-col w-full min-h-0 bg-white ${className || ""}`}>
      {/* Header minimal */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 bg-gray-50">
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-xs text-muted-foreground">Sin mensajes</div>
          </div>
        )}
        {items.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              mine(m.sender) ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                mine(m.sender)
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-900 border border-gray-200"
              }`}
            >
              {!mine(m.sender) && (
                <div className="text-[10px] opacity-70 mb-0.5">
                  {m.sender.charAt(0).toUpperCase() + m.sender.slice(1)}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
              <div
                className={`mt-1 text-[10px] ${
                  mine(m.sender) ? "text-white/80" : "text-gray-500"
                } text-right select-none`}
              >
                {new Date(m.at).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escribe un mensaje"
            className="flex-1 border rounded-full px-3 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="px-3 py-2 rounded-full bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
