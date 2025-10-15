"use client";

import React from "react";
import { toast } from "@/components/ui/use-toast";
import {
  Smile,
  Paperclip,
  Send,
  MoreVertical,
  ArrowLeft,
  Filter,
  Zap,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

type Sender = "admin" | "alumno" | "coach";

type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  data_base64: string; // opcional en render, presente al enviar
};

type Message = {
  id: string;
  room: string;
  sender: Sender;
  text: string;
  at: string;
  attachments?: Attachment[];
  status?: string;
  phase?: string;
};

type Transport = "ws" | "local";

export default function ChatRealtime({
  room,
  role = "admin",
  title = "Chat",
  subtitle,
  showRoleSwitch = false,
  variant = "card",
  className,
  transport = "ws",
  onBack,
}: {
  room: string;
  role?: Sender;
  title?: string;
  subtitle?: string;
  showRoleSwitch?: boolean;
  variant?: "card" | "fullscreen";
  className?: string;
  transport?: Transport;
  onBack?: () => void;
}) {
  // ...existing code...
  // Normalizar el nombre de la sala (room)
  const normRoom = React.useMemo(
    () => (room || "").trim().toLowerCase(),
    [room]
  );
  // Rol actual y setter
  const [currentRole, setCurrentRole] = React.useState<Sender>(role);
  const [items, setItems] = React.useState<Message[]>([]);
  const [text, setText] = React.useState("");
  // Filtros de estatus y fase
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = React.useState<string | null>(null);
  // Opciones de ejemplo (ajusta según tus datos reales)
  const statusOptions = ["EN_CURSO", "COMPLETADO", "ABANDONO", "PAUSA"];
  const phaseOptions = ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"];
  // Filtrar mensajes según estatus y fase (si existen en el mensaje)
  const filteredItems = React.useMemo(() => {
    return items.filter((m) => {
      let ok = true;
      if (statusFilter && m.status) {
        ok = ok && m.status === statusFilter;
      }
      if (phaseFilter && m.phase) {
        ok = ok && m.phase === phaseFilter;
      }
      return ok;
    });
  }, [items, statusFilter, phaseFilter]);
  // Refs y estados necesarios para la lógica de transporte y UI
  const wsRef = React.useRef<WebSocket | null>(null);
  const bcRef = React.useRef<BroadcastChannel | null>(null);
  const pendingRef = React.useRef<any[]>([]);
  const seenRef = React.useRef<Set<string>>(new Set());
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [connected, setConnected] = React.useState(false);
  // Constante para comparar readyState
  const WS_OPEN = typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1;
  // ...existing code...
  const storageKey = React.useMemo(() => `localChat:${normRoom}`, [normRoom]);
  const lastReadKey = React.useMemo(
    () => `chatLastRead:${normRoom}:${currentRole}`,
    [normRoom, currentRole]
  );

  const markRead = React.useCallback(() => {
    try {
      localStorage.setItem(lastReadKey, Date.now().toString());
      localStorage.setItem(
        "chatLastReadPing",
        `${normRoom}:${currentRole}:${Date.now()}`
      );
    } catch {}
  }, [lastReadKey, normRoom, currentRole]);

  // Mantener sincronizado el rol si cambia desde props
  React.useEffect(() => setCurrentRole(role), [role]);

  // Detectar móvil para forzar fullscreen
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // WebSocket hacia app/api/socket
  React.useEffect(() => {
    if (transport !== "ws") return;
    if (!normRoom) return;
    const proto =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss"
        : "ws";
    const url = `${proto}://${
      window.location.host
    }/api/socket?room=${encodeURIComponent(normRoom)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    let alive = true;

    ws.onopen = () => {
      setConnected(true);
      try {
        while (pendingRef.current.length > 0 && ws.readyState === WS_OPEN) {
          const p = pendingRef.current.shift()!;
          ws.send(JSON.stringify(p));
        }
      } catch {}
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data));
        if (payload?.type === "history" && Array.isArray(payload.data)) {
          if (!alive) return;
          setItems(payload.data as Message[]);
          for (const m of payload.data as Message[]) seenRef.current.add(m.id);
        } else if (payload?.type === "message" && payload.data) {
          const msg = payload.data as Message;
          if (!alive) return;
          if (!seenRef.current.has(msg.id)) {
            seenRef.current.add(msg.id);
            setItems((prev) => [...prev, msg]);
            const mine =
              (msg.sender || "").toLowerCase() ===
              (currentRole || "").toLowerCase();
            if (!mine)
              toast({
                title: `Nuevo mensaje de ${msg.sender}`,
                description: msg.text,
              });
          }
        }
      } catch {}
    };

    return () => {
      alive = false;
      try {
        ws.close();
      } catch {}
      wsRef.current = null;
    };
  }, [transport, normRoom, currentRole]);

  // Local transport
  React.useEffect(() => {
    if (transport !== "local") return;
    if (!normRoom) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const list = JSON.parse(raw) as Message[];
        setItems(list);
        for (const m of list) seenRef.current.add(m.id);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
    setConnected(true);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`chat:${normRoom}`);
      bcRef.current = bc;
      bc.onmessage = (ev: MessageEvent) => {
        const data = ev.data;
        if (data?.type === "message" && data.msg) {
          const msg = data.msg as Message;
          if (seenRef.current.has(msg.id)) return;
          seenRef.current.add(msg.id);
          setItems((prev) => {
            const next = [...prev, msg];
            try {
              localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {}
            return next;
          });
          const mine =
            (msg.sender || "").toLowerCase() ===
            (currentRole || "").toLowerCase();
          if (!mine)
            toast({
              title: `Nuevo mensaje de ${msg.sender}`,
              description: msg.text,
            });
        }
      };
    } catch {
      bcRef.current = null;
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey || !e.newValue) return;
      try {
        const list = JSON.parse(e.newValue) as Message[];
        const news: Message[] = [];
        for (const m of list)
          if (!seenRef.current.has(m.id)) {
            seenRef.current.add(m.id);
            news.push(m);
          }
        if (news.length) setItems((prev) => [...prev, ...news]);
      } catch {}
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        bc?.close();
      } catch {}
      bcRef.current = null;
    };
  }, [transport, normRoom, storageKey, currentRole]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  function autoSize() {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(200, ta.scrollHeight) + "px";
  }

  async function readFilesAsBase64(
    files: FileList | File[] | null
  ): Promise<Attachment[]> {
    if (!files || ("length" in files && files.length === 0)) return [];
    const arr = Array.isArray(files) ? files : Array.from(files);
    const enc = async (file: File): Promise<Attachment> => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        data_base64: b64,
      };
    };
    const out: Attachment[] = [];
    for (const f of arr) out.push(await enc(f));
    return out;
  }

  // Archivos pendientes de enviar (antes de enviar el mensaje)
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = React.useState<
    { url: string; name: string; type: string; size: number }[]
  >([]);

  React.useEffect(() => {
    const urls = pendingFiles.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      type: f.type,
      size: f.size,
    }));
    setPendingPreviews(urls);
    return () => {
      urls.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [pendingFiles]);

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setPendingFiles((prev) => prev.concat(list).slice(0, 10));
    // permitir volver a elegir los mismos archivos luego
    e.currentTarget.value = "";
  }

  // Generar ticket automático: leer últimos 30 minutos, crear sugerencia y despachar para revisión
  async function generateTicketFromRecent() {
    try {
      const now = Date.now();
      const cutoff = now - 30 * 60 * 1000; // 30 minutos
      const recent = items.filter((m) => {
        const t = Date.parse(m.at || "");
        return !isNaN(t) && t >= cutoff;
      });
      if (!recent || recent.length === 0) {
        toast({ title: "No hay mensajes en los últimos 30 minutos" });
        return;
      }

      // generar título sugerido: tomar el último mensaje de alumno con texto o concatenar varios
      let suggested = "Ticket desde chat";
      const fromAlumno = [...recent]
        .reverse()
        .find((m) => m.sender === "alumno" && (m.text || "").trim());
      if (fromAlumno && fromAlumno.text) {
        suggested = String(fromAlumno.text).trim().slice(0, 120);
      } else {
        const joined = recent
          .map((m) => (m.text || "").trim())
          .filter(Boolean)
          .slice(-3)
          .join(" — ");
        if (joined) suggested = joined.slice(0, 120);
      }

      // recopilar adjuntos
      const atts: Attachment[] = [];
      for (const m of recent) {
        const aList = Array.isArray(m.attachments) ? m.attachments : [];
        for (const a of aList) {
          if (!a) continue;
          atts.push(a);
        }
      }

      const files: File[] = [];
      for (const a of atts.slice(0, 10)) {
        const f = fileFromAttachment(a);
        if (f) files.push(f);
      }

      const detail = {
        room: normRoom,
        selected: recent,
        files,
        attachments: atts,
        attachmentIds: atts.map((a) => a.id),
        final: false,
        overrideNombre: suggested,
        autoGenerated: true,
      } as any;

      window.dispatchEvent(new CustomEvent("chat:create-ticket", { detail }));
      toast({ title: "Generando propuesta de ticket para revisión" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error al generar propuesta" });
    }
  }

  function removePendingAt(i: number) {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function send() {
    const val = text.trim();
    if (!val && pendingFiles.length === 0) return;

    try {
      const attachments = await readFilesAsBase64(pendingFiles);

      // Crear mensaje optimista
      const clientId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const localMsg: Message = {
        id: clientId,
        room: normRoom,
        sender: currentRole,
        text: val,
        at: new Date().toISOString(),
        attachments,
      };

      // limpiar UI
      setText("");
      if (inputRef.current) {
        inputRef.current.value = "";
        autoSize();
      }
      if (fileRef.current) fileRef.current.value = "";
      setPendingFiles([]);

      if (transport === "local") {
        setItems((prev) => {
          const next = [...prev, localMsg];
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {}
          return next;
        });
        seenRef.current.add(clientId);
        try {
          bcRef.current?.postMessage({ type: "message", msg: localMsg });
        } catch {}
        markRead();
        return;
      }

      // Modo WS: pintar optimista y enviar
      setItems((prev) => [...prev, localMsg]);
      seenRef.current.add(clientId);
      const ws = wsRef.current;
      const payload = {
        type: "message" as const,
        id: clientId,
        room: normRoom,
        sender: currentRole,
        text: val,
        attachments,
      };
      if (!ws || ws.readyState !== WS_OPEN) {
        pendingRef.current.push({ ...payload });
        if (!connected)
          toast({
            title: "Conectando…",
            description: "Tu mensaje se enviará al reconectarse.",
          });
        return;
      }
      ws.send(JSON.stringify(payload));
      markRead();
    } catch {
      toast({ title: "No se pudo enviar el mensaje" });
    }
  }

  function onPickFiles() {
    fileRef.current?.click();
  }

  function fileFromAttachment(a: Attachment): File | null {
    try {
      const binary = atob(a.data_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: a.mime || "application/octet-stream",
      });
      return new File([blob], a.name || "archivo", {
        type: a.mime || "application/octet-stream",
      });
    } catch {
      return null;
    }
  }

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const enhanced = React.useMemo(() => {
    const out: Array<{
      key: string;
      type: "day" | "msg";
      day?: string;
      msg?: Message;
    }> = [];
    let lastDate: Date | null = null;
    for (const m of filteredItems) {
      const d = new Date(m.at);
      if (!lastDate || !sameDay(lastDate, d)) {
        out.push({
          key: `day-${d.toDateString()}`,
          type: "day",
          day: d.toLocaleDateString("es-ES"),
        });
        lastDate = d;
      }
      out.push({ key: m.id, type: "msg", msg: m });
    }
    return out;
  }, [filteredItems]);

  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  // selección granular de adjuntos
  const [selectedAttachmentIds, setSelectedAttachmentIds] = React.useState<
    Set<string>
  >(new Set());
  // preview removed: we delegate creation to the page modal
  function toggleSelectAttachment(id: string) {
    setSelectedAttachmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const useFullscreen = isMobile || variant === "fullscreen";
  const containerBase = useFullscreen
    ? "flex flex-col w-full min-h-0 bg-[#efeae2]"
    : "rounded-lg border border-gray-300 bg-white overflow-hidden flex flex-col shadow-lg w-full";

  const bgPatternStyle: React.CSSProperties = {
    backgroundColor: "#efeae2",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23d9d9d9' fillOpacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  };

  return (
    <div
      className={`${containerBase} ${className ?? ""}`}
      style={useFullscreen ? { height: "100dvh" } : undefined}
    >
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-4 py-3 bg-[#075e54] text-white shadow"
        style={{
          paddingTop: useFullscreen
            ? "max(env(safe-area-inset-top), 12px)"
            : "12px",
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && useFullscreen && (
            <button
              onClick={onBack}
              className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 active:scale-95"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-white font-semibold text-sm border-2 border-white/20">
              {title.charAt(0).toUpperCase()}
            </div>
            {connected && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#25d366] border-2 border-[#075e54]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white truncate">
              {title}
            </h3>
            <p className="text-xs text-white/80 truncate">
              {subtitle || (connected ? "en línea" : "desconectado")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón IA: Generar ticket */}
          <button
            title="Generar ticket (IA)"
            onClick={generateTicketFromRecent}
            className="p-2 rounded-full hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">
              Generar ticket
            </span>
          </button>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Filtrar"
              >
                <Filter className="w-5 h-5" />
                {(statusFilter || phaseFilter) && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4">
              <div className="mb-2 text-sm font-semibold">Filtrar mensajes</div>
              <div className="mb-2">
                <div className="text-xs mb-1">Estatus</div>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map((s) => (
                    <Badge
                      key={s}
                      variant={statusFilter === s ? "default" : "secondary"}
                      onClick={() =>
                        setStatusFilter(statusFilter === s ? null : s)
                      }
                      className="cursor-pointer"
                    >
                      {s.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1">Fase</div>
                <div className="flex flex-wrap gap-1">
                  {phaseOptions.map((f) => (
                    <Badge
                      key={f}
                      variant={phaseFilter === f ? "default" : "secondary"}
                      onClick={() =>
                        setPhaseFilter(phaseFilter === f ? null : f)
                      }
                      className="cursor-pointer"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
              {(statusFilter || phaseFilter) && (
                <button
                  className="mt-4 w-full text-xs text-sky-600 underline"
                  onClick={() => {
                    setStatusFilter(null);
                    setPhaseFilter(null);
                    setFilterOpen(false);
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </PopoverContent>
          </Popover>
          {selectMode ? (
            <button
              onClick={() => {
                setSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="px-2 py-1 rounded bg-white/10 text-xs"
            >
              Cancelar
            </button>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="px-2 py-1 rounded bg-white/10 text-xs"
              title="Seleccionar mensajes"
            >
              Seleccionar
            </button>
          )}
          {showRoleSwitch && (
            <select
              className="text-xs border border-white/30 rounded-md px-2 py-1 bg-white/10 text-white backdrop-blur-sm"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as Sender)}
            >
              <option value="admin" className="text-gray-900">
                Admin
              </option>
              <option value="alumno" className="text-gray-900">
                Alumno
              </option>
              <option value="coach" className="text-gray-900">
                Coach
              </option>
            </select>
          )}
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
        style={bgPatternStyle}
      >
        {enhanced.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/50 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Sin mensajes aún
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {statusFilter || phaseFilter
                  ? "No hay mensajes que coincidan con el filtro."
                  : "Envía un mensaje para comenzar"}
              </p>
            </div>
          </div>
        )}
        {enhanced.map((e) => {
          if (e.type === "day") {
            return (
              <div
                key={e.key}
                className="flex items-center justify-center my-4"
              >
                <span className="text-xs px-3 py-1.5 rounded-lg bg-white/90 shadow-sm text-gray-600 font-medium">
                  {e.day}
                </span>
              </div>
            );
          }
          const m = e.msg!;
          const mine =
            (m.sender || "").toLowerCase() ===
            (currentRole || "").toLowerCase();
          return (
            <div
              key={e.key}
              className={`flex ${mine ? "justify-end" : "justify-start"} mb-1`}
            >
              <div
                onClick={() => selectMode && toggleSelect(m.id)}
                style={
                  selectMode
                    ? {
                        outline: selectedIds.has(m.id)
                          ? "2px solid #0ea5e9"
                          : "1px dashed #94a3b8",
                      }
                    : undefined
                }
                className={`relative max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                  mine
                    ? "bg-[#d9fdd3] text-gray-900 rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none"
                }`}
              >
                {!mine && (
                  <div className="text-xs font-semibold text-[#075e54] mb-0.5">
                    {m.sender.charAt(0).toUpperCase() + m.sender.slice(1)}
                  </div>
                )}
                {m.text && (
                  <div
                    className="text-sm whitespace-pre-wrap break-words leading-relaxed pb-2"
                    style={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                )}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {m.attachments.map((a) => {
                      const url = `data:${a.mime};base64,${a.data_base64}`;
                      const selected = selectedAttachmentIds.has(a.id);
                      const commonWrapCls = `relative group rounded-md overflow-hidden ${
                        selectMode && selected ? "ring-2 ring-sky-500" : ""
                      }`;
                      const overlay = selectMode ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelectAttachment(a.id);
                          }}
                          className={`absolute top-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-xs ${
                            selected ? "bg-sky-600" : "bg-black/50"
                          }`}
                          title={selected ? "Quitar" : "Seleccionar"}
                        >
                          {selected ? "✓" : "+"}
                        </button>
                      ) : null;

                      if ((a.mime || "").startsWith("image/")) {
                        return (
                          <div key={a.id} className={commonWrapCls}>
                            {overlay}
                            {selectMode ? (
                              <img
                                src={url}
                                alt={a.name}
                                className="max-h-40 w-full object-cover"
                                onClick={() => toggleSelectAttachment(a.id)}
                              />
                            ) : (
                              <a href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={a.name}
                                  className="max-h-40 w-full object-cover"
                                />
                              </a>
                            )}
                          </div>
                        );
                      }
                      if ((a.mime || "").startsWith("video/")) {
                        return (
                          <div key={a.id} className={commonWrapCls}>
                            {overlay}
                            {selectMode ? (
                              <video
                                src={url}
                                className="max-h-40 w-full"
                                onClick={() => toggleSelectAttachment(a.id)}
                              />
                            ) : (
                              <video
                                src={url}
                                controls
                                className="max-h-40 w-full"
                              />
                            )}
                          </div>
                        );
                      }
                      if ((a.mime || "").startsWith("audio/")) {
                        return (
                          <div key={a.id} className={commonWrapCls}>
                            {overlay}
                            <audio src={url} controls className="w-full" />
                          </div>
                        );
                      }
                      return (
                        <div
                          key={a.id}
                          className={`${commonWrapCls} p-2 bg-white`}
                        >
                          {overlay}
                          {selectMode ? (
                            <div
                              className="text-xs underline break-all cursor-pointer"
                              onClick={() => toggleSelectAttachment(a.id)}
                              title={a.name}
                            >
                              {a.name}
                            </div>
                          ) : (
                            <a
                              href={url}
                              download={a.name}
                              className="text-xs underline break-all block"
                              title={a.name}
                            >
                              {a.name}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500 select-none justify-end">
                  <span>
                    {new Date(m.at).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {mine && (
                    <svg
                      className="w-4 h-4 text-[#53bdeb]"
                      viewBox="0 0 16 15"
                      fill="none"
                    >
                      <path
                        d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div
        className="sticky bottom-0 z-10 p-2 bg-[#f0f0f0] border-t border-gray-200"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="flex items-end gap-2">
          <button
            className="p-2.5 rounded-full hover:bg-gray-200 transition-colors active:scale-95"
            title="Emoji"
          >
            <Smile className="w-6 h-6 text-gray-600" />
          </button>
          <button
            onClick={onPickFiles}
            className="p-2.5 rounded-full hover:bg-gray-200 transition-colors active:scale-95"
            title="Adjuntar"
          >
            <Paperclip className="w-6 h-6 text-gray-600" />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFileInputChange}
          />
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              onInput={autoSize}
              placeholder="Escribe un mensaje"
              rows={1}
              className="w-full border-none rounded-3xl px-4 py-2.5 text-sm resize-none focus:outline-none bg-white shadow-sm max-h-40"
              style={{ minHeight: "42px" }}
            />
          </div>
          <button
            onClick={send}
            disabled={!text.trim() && pendingFiles.length === 0}
            className="p-2.5 rounded-full bg-[#25d366] text-white hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
            title="Enviar"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {pendingPreviews.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {pendingPreviews.map((p, i) => (
              <div key={`${p.url}-${i}`} className="relative group">
                {p.type.startsWith("image/") ? (
                  <img
                    src={p.url}
                    alt={p.name}
                    className="rounded-md max-h-32 object-cover w-full"
                  />
                ) : p.type.startsWith("video/") ? (
                  <video
                    src={p.url}
                    className="rounded-md max-h-32 w-full"
                    controls
                  />
                ) : p.type.startsWith("audio/") ? (
                  <audio src={p.url} className="w-full" controls />
                ) : (
                  <a
                    href={p.url}
                    download={p.name}
                    className="text-xs underline break-all block p-2 bg-white rounded"
                  >
                    {p.name}
                  </a>
                )}
                <button
                  onClick={() => removePendingAt(i)}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-6 h-6 text-xs opacity-80 group-hover:opacity-100"
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {/* preview removed: creation handled by page modal */}
        {selectMode && selectedIds.size > 0 && (
          <div className="mt-2 flex justify-end">
            <button
              className="px-3 py-1.5 rounded bg-[#0ea5e9] text-white text-xs shadow hover:bg-[#0284c7] active:scale-95"
              onClick={() => {
                const selected = items.filter((m) => selectedIds.has(m.id));
                const pickAttachments = () => {
                  const list: Attachment[] = [];
                  const hasGranular = selectedAttachmentIds.size > 0;
                  selected.forEach((m) => {
                    (m.attachments ?? []).forEach((a) => {
                      if (!hasGranular || selectedAttachmentIds.has(a.id)) {
                        list.push(a);
                      }
                    });
                  });
                  return list;
                };
                const atts = pickAttachments();
                const files: File[] = [];
                atts.forEach((a) => {
                  const f = fileFromAttachment(a);
                  if (f) files.push(f);
                });
                const detail = {
                  room: normRoom,
                  selected,
                  files,
                  attachments: atts,
                  attachmentIds: Array.from(selectedAttachmentIds),
                } as any;

                // Dispatch non-final event so the page opens the modal for review
                window.dispatchEvent(
                  new CustomEvent("chat:create-ticket", { detail })
                );

                // reset selection mode
                setSelectMode(false);
                setSelectedIds(new Set());
                setSelectedAttachmentIds(new Set());
              }}
            >
              Crear ticket con selección
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
