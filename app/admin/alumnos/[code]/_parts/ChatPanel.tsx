"use client";

import React from "react";

type Sender = "admin" | "alumno";

type ChatMessage = {
  id: string;
  sender: Sender;
  text: string;
  at: string; // ISO
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("es-ES")} ${d
      .toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
      .replace(/^24/, "00")}`;
  } catch {
    return iso;
  }
}

export default function ChatPanel({
  code,
  studentName,
}: {
  code: string;
  studentName?: string | null;
}) {
  const storageKey = React.useMemo(() => `chat:${code}`, [code]);
  const [sender, setSender] = React.useState<Sender>("admin");
  const [text, setText] = React.useState("");
  const [items, setItems] = React.useState<ChatMessage[]>([]);

  // Load from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw) as ChatMessage[];
        setItems(arr);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  // Listen for cross-tab updates
  React.useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== storageKey) return;
      try {
        const arr = e.newValue ? (JSON.parse(e.newValue) as ChatMessage[]) : [];
        setItems(arr);
      } catch {}
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  function persist(next: ChatMessage[]) {
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  function onSend() {
    const val = text.trim();
    if (!val) return;
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      sender,
      text: val,
      at: new Date().toISOString(),
    };
    persist([...items, msg]);
    setText("");
  }

  function onClear() {
    if (!confirm("¿Borrar conversación local?")) return;
    persist([]);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900">Chat local</h3>
          <p className="text-xs text-gray-500">
            {studentName ? `Alumno: ${studentName}` : "Por alumno"} • Solo en
            este navegador
          </p>
        </div>
        <button
          className="text-xs px-2 py-1 rounded-md border bg-white hover:bg-gray-50"
          onClick={onClear}
        >
          Limpiar
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 max-h-[360px] overflow-y-auto">
        {items.length === 0 && (
          <div className="text-xs text-gray-500">Sin mensajes.</div>
        )}
        {items.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.sender === "admin" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm border ${
                m.sender === "admin"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 text-gray-900 border-gray-200"
              }`}
            >
              <div className="text-[10px] opacity-80 mb-0.5">
                {m.sender === "admin" ? "Admin" : "Alumno"} • {formatTime(m.at)}
              </div>
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100 flex items-center gap-2">
        <select
          value={sender}
          onChange={(e) => setSender(e.target.value as Sender)}
          className="text-xs border rounded-md px-2 py-1 bg-white"
        >
          <option value="admin">Admin</option>
          <option value="alumno">Alumno</option>
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Escribe un mensaje…"
          className="flex-1 border rounded-md px-3 py-2 text-sm"
        />
        <button
          onClick={onSend}
          className="text-sm px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
