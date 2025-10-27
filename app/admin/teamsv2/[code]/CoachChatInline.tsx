"use client";

import React from "react";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

type Sender = "admin" | "alumno" | "coach";
type Message = {
  id: string;
  room: string;
  sender: Sender;
  text: string;
  at: string; // ISO
  delivered?: boolean;
  read?: boolean;
  srcParticipantId?: string | number | null;
};

type SocketIOConfig = {
  url?: string;
  /** Token JWT del sistema de auth; si no se pasa, se usará el de auth local */
  token?: string;
  idEquipo?: string; // para rol coach
  idCliente?: string; // no usado aquí, pero lo dejamos por compatibilidad
  participants?: any[]; // participantes deseados si no hay chatId
  autoCreate?: boolean; // default: false (crear al enviar)
  autoJoin?: boolean; // default: true si chatId
  chatId?: string | number;
};

export default function CoachChatInline({
  room,
  role = "coach",
  title = "Chat",
  subtitle,
  className,
  variant = "card",
  socketio,
  precreateOnParticipants,
  onConnectionChange,
  onChatInfo,
  requestListSignal,
  listParams,
  onChatsList,
}: {
  room: string;
  role?: Sender;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "card" | "minimal";
  socketio?: SocketIOConfig;
  precreateOnParticipants?: boolean; // si true, intenta crear/matchear chat al seleccionar participantes
  onConnectionChange?: (connected: boolean) => void;
  onChatInfo?: (info: {
    chatId: string | number | null;
    myParticipantId: string | number | null;
    participants?: any[] | null;
  }) => void;
  requestListSignal?: number;
  listParams?: any;
  onChatsList?: (list: any[]) => void;
}) {
  const normRoom = React.useMemo(
    () => (room || "").trim().toLowerCase(),
    [room]
  );

  const [connected, setConnected] = React.useState(false);
  const [items, setItems] = React.useState<Message[]>([]);
  const [text, setText] = React.useState("");
  const [isJoining, setIsJoining] = React.useState(false);
  const [chatId, setChatId] = React.useState<string | number | null>(
    socketio?.chatId ?? null
  );
  const [myParticipantId, setMyParticipantId] = React.useState<
    string | number | null
  >(null);
  const [otherTyping, setOtherTyping] = React.useState(false);
  // Estado del ticket generado por IA
  const [ticketModalOpen, setTicketModalOpen] = React.useState(false);
  const [ticketLoading, setTicketLoading] = React.useState(false);
  const [ticketError, setTicketError] = React.useState<string | null>(null);
  const [ticketData, setTicketData] = React.useState<{
    nombre?: string;
    sugerencia?: string;
    tipo?: string;
    descripcion?: string;
    archivos_cargados?: any[];
    content?: string;
    parsed?: {
      titulo?: string;
      descripcion?: string;
      prioridad?: string;
      categoria?: string;
      html?: string;
    };
  } | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  const sioRef = React.useRef<any>(null);
  const chatIdRef = React.useRef<string | number | null>(
    socketio?.chatId ?? null
  );
  const myParticipantIdRef = React.useRef<string | number | null>(null);
  const seenRef = React.useRef<Set<string>>(new Set());
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = React.useRef<boolean>(true);
  const outboxRef = React.useRef<
    { clientId: string; text: string; at: number; pid?: any }[]
  >([]);
  const typingRef = React.useRef<{ on: boolean; timer: any }>({
    on: false,
    timer: null,
  });
  const clientSessionRef = React.useRef<string>(
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const latestRequestedChatIdRef = React.useRef<any>(socketio?.chatId ?? null);
  const joinInFlightRef = React.useRef<boolean>(false);
  const lastJoinedChatIdRef = React.useRef<any>(null);
  // Controla auto-scroll inicial por chatId para evitar quedar "a la mitad"
  const autoScrolledChatRef = React.useRef<string | number | null>(null);
  const participantsRef = React.useRef<any[] | undefined>(
    socketio?.participants
  );
  const listParamsRef = React.useRef<any>(listParams);
  const lastPartsKeyRef = React.useRef<string>(
    JSON.stringify(socketio?.participants || [])
  );

  React.useEffect(() => {
    participantsRef.current = socketio?.participants;
  }, [socketio?.participants]);
  React.useEffect(() => {
    listParamsRef.current = listParams;
  }, [listParams]);
  React.useEffect(() => {
    myParticipantIdRef.current = myParticipantId;
  }, [myParticipantId]);
  React.useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  // Reset suave al cambiar participantes (para permitir abrir nuevo destino)
  React.useEffect(() => {
    try {
      const parts = participantsRef.current ?? socketio?.participants;
      const key = JSON.stringify(parts || []);
      if (key === lastPartsKeyRef.current) return;
      lastPartsKeyRef.current = key;
      if (!precreateOnParticipants) return;
      // Reiniciar estado de chat para que pueda unirse al nuevo destino
      setChatId(null);
      chatIdRef.current = null;
      setItems([]);
      seenRef.current = new Set();
      setOtherTyping(false);
      lastJoinedChatIdRef.current = null;
    } catch {}
  }, [socketio?.participants, precreateOnParticipants]);

  // Unión automática a chat existente cuando cambian los participantes (solo join, sin crear)
  React.useEffect(() => {
    (async () => {
      try {
        if (!connected) return;
        if (!precreateOnParticipants) return;
        if (chatIdRef.current != null) return;
        const parts = participantsRef.current ?? socketio?.participants;
        if (!Array.isArray(parts) || parts.length === 0) return;
        await ensureChatReadyForSend({ onlyFind: true });
      } catch {}
    })();
  }, [connected, precreateOnParticipants, socketio?.participants]);

  React.useEffect(() => {
    requestAnimationFrame(() => {
      try {
        const currentChat = chatIdRef.current ?? chatId;
        const sc = scrollRef.current;
        const br = bottomRef.current;
        // Si aún no hemos auto-scrolleado este chat, forzar ir al fondo una vez
        if (
          currentChat != null &&
          autoScrolledChatRef.current !== currentChat
        ) {
          if (sc && br) {
            br.scrollIntoView({ behavior: "auto", block: "end" });
            // También fijar manualmente por robustez
            sc.scrollTop = sc.scrollHeight;
            pinnedToBottomRef.current = true;
          }
          autoScrolledChatRef.current = currentChat;
          return;
        }
        // Comportamiento normal: si estamos "pegados" al fondo, mantenernos abajo
        if (pinnedToBottomRef.current) {
          br?.scrollIntoView({ behavior: "auto", block: "end" });
        }
      } catch {}
    });
  }, [items.length, chatId]);

  // Scroll síncrono antes de pintar cuando llegan los primeros mensajes
  React.useLayoutEffect(() => {
    try {
      const currentChat = chatIdRef.current ?? chatId;
      if (currentChat == null) return;
      if (autoScrolledChatRef.current === currentChat) return;
      const sc = scrollRef.current;
      const br = bottomRef.current;
      if (sc && br) {
        br.scrollIntoView({ behavior: "auto", block: "end" });
        sc.scrollTop = sc.scrollHeight;
        pinnedToBottomRef.current = true;
        autoScrolledChatRef.current = currentChat;
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Cuando cambia de chat, permitir nuevo auto-scroll inicial
  React.useEffect(() => {
    autoScrolledChatRef.current = null;
    // Al cambiar de chat, asumimos que deseamos iniciar abajo
    pinnedToBottomRef.current = true;
  }, [chatId]);

  // Cuando termina el join inicial, aseguremos salto al fondo si hay mensajes
  React.useEffect(() => {
    if (!isJoining) {
      requestAnimationFrame(() => {
        try {
          const sc = scrollRef.current;
          const br = bottomRef.current;
          if (sc && br) {
            br.scrollIntoView({ behavior: "auto", block: "end" });
            sc.scrollTop = sc.scrollHeight;
            pinnedToBottomRef.current = true;
          }
        } catch {}
      });
    }
  }, [isJoining]);
  const onScrollContainer = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Considerar "pegado al fondo" solo cuando realmente está al fondo (tolerancia mínima)
    const threshold = 1; // px de tolerancia para evitar falsos positivos
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distance <= threshold;
  }, []);

  // Utilidad: convierte un markdown simple a HTML seguro básico
  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function simpleMarkdownToHtml(md: string): string {
    try {
      // Escapar HTML primero
      let html = escapeHtml(md);
      // Negritas **texto**
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Quitar separadores '---' de frontmatter si vienen al inicio
      html = html.replace(/^---\s*\n/, "");
      // Saltos de línea dobles -> párrafos
      html = html
        .split(/\n\n+/)
        .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
        .join("");
      return html;
    } catch {
      return escapeHtml(md).replace(/\n/g, "<br/>");
    }
  }
  function parseAiContent(md: string): {
    titulo?: string;
    descripcion?: string;
    prioridad?: string;
    categoria?: string;
    html?: string;
  } {
    try {
      const clean = md.replace(/^---\s*\n/, "");
      const out: any = {};
      const lines = clean.split(/\n/);
      for (const ln of lines) {
        const m = ln.match(/^\*\*(.+?):\*\*\s*(.+)$/);
        if (m) {
          const key = m[1].trim().toLowerCase();
          const val = m[2].trim();
          if (key.startsWith("título") || key.startsWith("titulo"))
            out.titulo = val;
          else if (
            key.startsWith("descripción") ||
            key.startsWith("descripcion")
          )
            out.descripcion = val;
          else if (key.startsWith("prioridad")) out.prioridad = val;
          else if (key.startsWith("categor")) out.categoria = val;
        }
      }
      out.html = simpleMarkdownToHtml(md);
      return out;
    } catch {
      return { html: simpleMarkdownToHtml(md) };
    }
  }

  async function handleGenerateTicket() {
    try {
      const currentId = (chatIdRef.current ?? chatId) as any;
      try {
        console.log("[CoachChat] Generar ticket — snapshot", {
          now: new Date().toISOString(),
          room: normRoom,
          role,
          chatId_state: chatId,
          chatId_ref: chatIdRef.current,
          chosenChatId: currentId,
          lastJoinedChatId: lastJoinedChatIdRef.current,
          latestRequestedChatId: latestRequestedChatIdRef.current,
          participants: Array.isArray(joinedParticipantsRef.current)
            ? joinedParticipantsRef.current.map((p: any) => ({
                id_chat_participante: p?.id_chat_participante,
                participante_tipo: p?.participante_tipo,
                id_equipo: p?.id_equipo,
                id_cliente: p?.id_cliente,
                id_admin: p?.id_admin,
              }))
            : null,
        });
      } catch {}
      if (currentId == null) {
        setTicketModalOpen(true);
        setTicketError("No hay chat activo para generar ticket.");
        return;
      }
      setTicketModalOpen(true);
      setTicketLoading(true);
      setTicketError(null);
      setTicketData(null);

      // Intentar resolver un id "canónico" (numérico) vía join ACK (solo para log)
      let resolvedId: any = currentId;
      try {
        const sio = sioRef.current;
        if (sio && currentId != null) {
          const info: any = await new Promise((resolve) => {
            try {
              sio.emit("chat.join", { id_chat: currentId }, (ack: any) => {
                resolve(ack);
              });
            } catch {
              resolve(null);
            }
          });
          const ok = info && info.success !== false;
          const data = ok ? info.data || {} : {};
          const cid =
            data?.id_chat ??
            data?.id ??
            lastJoinedChatIdRef.current ??
            currentId;
          if (cid != null) {
            resolvedId = cid;
          }
          try {
            console.log("[CoachChat] Resolver ticket chat_id via join:", {
              chosenChatId: currentId,
              ack_success: info?.success,
              ack_id_chat: data?.id_chat,
              ack_id: data?.id,
              resolvedId,
            });
          } catch {}
        }
      } catch {}

      const baseUrl = "https://v001.vercel.app/v1/ai/compute/chat/";

      let res: Response | null = null;
      const { getAuthToken } = await import("@/lib/auth");
      const token = typeof window !== "undefined" ? getAuthToken() : null;
      const authHeaders = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;
      const sendId = String(currentId).trim();
      const urlWithParam = `${baseUrl}${encodeURIComponent(sendId)}`;
      try {
        console.log("[CoachChat] POST =>", urlWithParam, {
          sendId,
          chosenChatId: String(currentId),
          resolvedId: String(resolvedId),
        });
        res = await fetch(urlWithParam, {
          method: "POST",
          headers: authHeaders,
        });
        console.log("[CoachChat] POST resp status:", res?.status);
      } catch {}
      if (!res || !res.ok) {
        // Fallback: POST sin body, con el chat_id en la URL
        try {
          console.log("[CoachChat] POST (fallback) =>", urlWithParam);
          res = await fetch(urlWithParam, {
            method: "POST",
            headers: authHeaders,
          });
          console.log("[CoachChat] POST (fallback) resp status:", res?.status);
        } catch {}
      }
      if (!res) throw new Error("Sin respuesta del servidor");
      const json: any = await res.json().catch(() => null);
      try {
        console.log("[CoachChat] AI resp <=", json);
      } catch {}
      if (!json || (json.code && Number(json.code) !== 200)) {
        throw new Error(json?.message || "Error al generar el ticket");
      }
      const data = json.data || {};
      if (typeof data?.content === "string" && data.content.trim()) {
        const parsed = parseAiContent(data.content);
        setTicketData({
          content: data.content,
          archivos_cargados: Array.isArray(data?.archivos_cargados)
            ? data.archivos_cargados
            : [],
          parsed,
        });
      } else {
        setTicketData({
          nombre: data?.nombre ? String(data.nombre) : undefined,
          sugerencia: data?.sugerencia ? String(data.sugerencia) : undefined,
          tipo: data?.tipo ? String(data.tipo) : undefined,
          descripcion: data?.descripcion ? String(data.descripcion) : undefined,
          archivos_cargados: Array.isArray(data?.archivos_cargados)
            ? data.archivos_cargados
            : [],
        });
      }
    } catch (e: any) {
      setTicketError(e?.message || "Error inesperado al generar ticket");
    } finally {
      setTicketLoading(false);
    }
  }

  // Observa el sentinel del fondo para detectar con precisión si está visible (pegado al fondo)
  React.useEffect(() => {
    const root = scrollRef.current;
    const target = bottomRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") {
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        // Si el sentinel está prácticamente visible, estamos al fondo
        pinnedToBottomRef.current =
          e.isIntersecting && e.intersectionRatio > 0.95;
      },
      {
        root,
        threshold: [0, 0.01, 0.5, 0.95, 1],
      }
    );
    try {
      obs.observe(target);
    } catch {}
    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
  }, []);

  const normalizeTipo = (v: any): "cliente" | "equipo" | "admin" | "" => {
    const s = String(v || "")
      .trim()
      .toLowerCase();
    if (["cliente", "alumno", "student"].includes(s)) return "cliente";
    if (["equipo", "coach", "entrenador"].includes(s)) return "equipo";
    if (["admin", "administrador"].includes(s)) return "admin";
    return "";
  };

  const getTipoByParticipantId = React.useCallback(
    (pid: any): "cliente" | "equipo" | "admin" | "" => {
      try {
        const parts = Array.isArray((joinDataRef.current as any)?.participants)
          ? (joinDataRef.current as any).participants
          : [];
        for (const p of parts) {
          if (String(p?.id_chat_participante ?? "") === String(pid ?? "")) {
            return normalizeTipo(p?.participante_tipo);
          }
        }
        return "";
      } catch {
        return "";
      }
    },
    []
  );

  const joinedParticipantsRef = React.useRef<any[] | null>(null);
  const joinDataRef = React.useRef<any | null>(null);

  const getEmitter = (obj: any) =>
    obj?.id_chat_participante_emisor ?? obj?.emisor ?? obj?.id_emisor ?? null;

  const normalizeDateStr = (v: any): string | undefined => {
    if (!v) return undefined;
    const s = String(v);
    if (s.includes("T")) return s;
    if (s.includes(" ")) return s.replace(" ", "T");
    return s;
  };

  const markRead = React.useCallback(() => {
    try {
      if (chatId == null) return;
      const key = `chatLastReadById:coach:${String(chatId)}`;
      localStorage.setItem(key, String(Date.now()));
      // Reiniciar contador persistente de no leídos por chatId
      try {
        const unreadKey = `chatUnreadById:${role}:${String(chatId)}`;
        localStorage.setItem(unreadKey, "0");
        window.dispatchEvent(
          new CustomEvent("chat:unread-count-updated", {
            detail: { chatId, role, count: 0 },
          })
        );
      } catch {}
      const evt = new CustomEvent("chat:last-read-updated", {
        detail: { chatId, role: role },
      });
      window.dispatchEvent(evt);
    } catch {}
  }, [chatId, role]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = socketio?.url || undefined;
        // Obtener token JWT desde el auth local (con override opcional por props), esperando breve si aún no existe
        const resolveToken = async (): Promise<string | undefined> => {
          const override = socketio?.token;
          if (override && typeof override === "string") return override;
          const deadline = Date.now() + 4000;
          while (alive && Date.now() < deadline) {
            const t = getAuthToken();
            if (t) return t;
            await new Promise((r) => setTimeout(r, 300));
          }
          return getAuthToken() || undefined;
        };
        const token = await resolveToken();
        if (!token) {
          setConnected(false);
          onConnectionChange?.(false);
          return;
        }
        const { io } = await import("socket.io-client");
        // Autenticación estricta: solo auth.token (sin query) según requisito del servidor
        const sio = url
          ? io(url, {
              auth: { token },
              transports: ["websocket", "polling"],
              timeout: 20000,
            })
          : io({
              auth: { token },
              transports: ["websocket", "polling"],
              timeout: 20000,
            });
        sioRef.current = sio;
        sio.on("connect", () => {
          if (!alive) return;
          setConnected(true);
          onConnectionChange?.(true);
          try {
            console.log("[CoachChat] conectado", {
              room: normRoom,
              role,
              chatId: chatIdRef.current,
            });
          } catch {}
        });
        sio.on("disconnect", () => {
          if (!alive) return;
          setConnected(false);
          onConnectionChange?.(false);
          try {
            console.log("[CoachChat] desconectado", { room: normRoom, role });
          } catch {}
        });
        sio.on("connect_error", (err: any) => {
          try {
            console.error("[CoachChat] connect_error", {
              message: err?.message || String(err),
              url: socketio?.url ?? "<default>",
            });
          } catch {}
        });
        sio.on("error", (err: any) => {
          try {
            console.error("[CoachChat] error", err?.message || err);
          } catch {}
        });

        sio.on("chat.message", (msg: any) => {
          try {
            const currentChatId = chatIdRef.current;
            try {
              console.log("[CoachChat] chat.message <=", {
                id_chat: msg?.id_chat,
                id_mensaje: msg?.id_mensaje ?? msg?.id,
                texto: msg?.contenido ?? msg?.texto,
                emisor: getEmitter(msg),
                currentChatId,
              });
            } catch {}
            // Si el mensaje es de otro chat (o no hay chat unido aún), avisa para refrescar y sumar no leídos
            if (
              msg?.id_chat != null &&
              String(msg.id_chat) !== String(currentChatId ?? "")
            ) {
              try {
                // Avisar para refrescar bandejas
                const evtRefresh = new CustomEvent("chat:list-refresh", {
                  detail: {
                    reason: "message-other-chat",
                    id_chat: msg?.id_chat,
                  },
                });
                window.dispatchEvent(evtRefresh);
                // Incrementar contador local de no leídos (si no es eco propio)
                const myPidNow = myParticipantIdRef.current;
                const isMineById =
                  (myPidNow != null &&
                    String(getEmitter(msg) ?? "") === String(myPidNow)) ||
                  false;
                const isMineBySession =
                  !!msg?.client_session &&
                  String(msg.client_session) ===
                    String(clientSessionRef.current);
                if (!isMineById && !isMineBySession) {
                  const evtBump = new CustomEvent("chat:unread-bump", {
                    detail: { chatId: msg?.id_chat, role, at: Date.now() },
                  });
                  window.dispatchEvent(evtBump);
                  // Persistir incremento de no leídos por chatId
                  try {
                    const unreadKey = `chatUnreadById:${role}:${String(
                      msg?.id_chat
                    )}`;
                    const prev = Number.parseInt(
                      localStorage.getItem(unreadKey) || "0",
                      10
                    );
                    const next = (isNaN(prev) ? 0 : prev) + 1;
                    localStorage.setItem(unreadKey, String(next));
                    window.dispatchEvent(
                      new CustomEvent("chat:unread-count-updated", {
                        detail: {
                          chatId: msg?.id_chat,
                          role,
                          count: next,
                        },
                      })
                    );
                  } catch {}
                }
                console.log(
                  "[CoachChat] chat.message de otro chat -> refresh+bump",
                  { id_chat: msg?.id_chat }
                );
              } catch {}
              return;
            }
            const id = String(
              msg?.id_mensaje ?? `${Date.now()}-${Math.random()}`
            );
            if (seenRef.current.has(id)) return;
            seenRef.current.add(id);

            const myPidNow = myParticipantIdRef.current;
            const senderIsMeById =
              (myPidNow != null &&
                String(getEmitter(msg) ?? "") === String(myPidNow)) ||
              false;
            const senderIsMeBySession =
              !!msg?.client_session &&
              String(msg.client_session) === String(clientSessionRef.current);
            let senderIsMeByOutbox = false;
            try {
              const txt = String(msg?.contenido ?? msg?.texto ?? "").trim();
              const tMsg = Date.parse(
                String(normalizeDateStr(msg?.fecha_envio) || "")
              );
              for (let i = outboxRef.current.length - 1; i >= 0; i--) {
                const ob = outboxRef.current[i];
                if ((ob.text || "").trim() !== txt) continue;
                const near =
                  !isNaN(tMsg) && Math.abs(tMsg - (ob.at || 0)) < 12000;
                const nearNow = Math.abs(Date.now() - (ob.at || 0)) < 12000;
                if (near || nearNow) {
                  senderIsMeByOutbox = true;
                  break;
                }
              }
            } catch {}

            let sender: Sender;
            if (role === "coach") {
              const mineEval =
                senderIsMeById || senderIsMeBySession || senderIsMeByOutbox;
              sender = mineEval ? "coach" : "alumno";
            } else if (role === "alumno") {
              const tipoNorm = normalizeTipo(
                msg?.participante_tipo ||
                  getTipoByParticipantId(msg?.id_chat_participante_emisor)
              );
              const mineByTipo = tipoNorm === "cliente";
              sender =
                senderIsMeById ||
                senderIsMeBySession ||
                senderIsMeByOutbox ||
                mineByTipo
                  ? "alumno"
                  : "coach";
            } else {
              sender =
                senderIsMeById || senderIsMeBySession || senderIsMeByOutbox
                  ? role
                  : "alumno";
            }

            const newMsg: Message = {
              id,
              room: normRoom,
              sender,
              text: String(msg?.contenido ?? msg?.texto ?? "").trim(),
              at: String(
                normalizeDateStr(msg?.fecha_envio) || new Date().toISOString()
              ),
              delivered: true,
              read: false,
              srcParticipantId: getEmitter(msg),
            };
            setItems((prev) => {
              if (sender === role) {
                const next = [...prev];
                for (let i = next.length - 1; i >= 0; i--) {
                  const mm = next[i];
                  if (mm.sender !== role) continue;
                  if ((mm.text || "").trim() !== (newMsg.text || "").trim())
                    continue;
                  const tNew = Date.parse(newMsg.at || "");
                  const tOld = Date.parse(mm.at || "");
                  const near =
                    !isNaN(tNew) &&
                    !isNaN(tOld) &&
                    Math.abs(tNew - tOld) < 8000;
                  if (mm.delivered === false || near) {
                    next[i] = { ...newMsg, read: mm.read || false };
                    return next;
                  }
                }
              }
              return [...prev, newMsg];
            });
            // Pedir refresco de listado también cuando llega mensaje del chat actual
            try {
              const evtRefresh = new CustomEvent("chat:list-refresh", {
                detail: {
                  reason: "message-current-chat",
                  id_chat: currentChatId,
                },
              });
              window.dispatchEvent(evtRefresh);
            } catch {}
            markRead();
            try {
              console.log("[CoachChat] mensaje agregado", {
                id_local: id,
                sender,
                delivered: true,
              });
            } catch {}
            if (
              (myParticipantId == null || myParticipantId === "") &&
              sender === role &&
              msg?.id_chat_participante_emisor != null
            ) {
              setMyParticipantId(msg.id_chat_participante_emisor);
            }
          } catch {}
        });
        try {
          sio.on("chat.created", (data: any) => {
            try {
              const evt = new CustomEvent("chat:list-refresh", {
                detail: {
                  reason: "chat-created",
                  id_chat: data?.id_chat ?? data?.id,
                },
              });
              window.dispatchEvent(evt);
              console.log(
                "[CoachChat] chat.created recibido -> refresh lista",
                {
                  id_chat: data?.id_chat ?? data?.id,
                }
              );
            } catch {}
          });
        } catch {}

        sio.on("chat.message.read", (data: any) => {
          try {
            console.log("[CoachChat] chat.message.read <=", data);
            const idMsg = data?.id_mensaje ?? data?.id ?? null;
            if (!idMsg) return;
            setItems((prev) =>
              prev.map((m) =>
                String(m.id) === String(idMsg) ? { ...m, read: true } : m
              )
            );
          } catch {}
        });
        sio.on("chat.read.all", () => {
          try {
            console.log(
              "[CoachChat] chat.read.all <= (marcar todos como leídos en UI)"
            );
            setItems((prev) =>
              prev.map((m) =>
                (m.sender || "").toLowerCase() === role.toLowerCase()
                  ? { ...m, read: true }
                  : m
              )
            );
          } catch {}
        });

        sio.on("chat.typing", (data: any) => {
          try {
            const idChat = data?.id_chat ?? data?.chatId ?? null;
            if (
              idChat != null &&
              chatId != null &&
              String(idChat) !== String(chatId)
            )
              return;
            if (
              data?.client_session &&
              String(data.client_session) === String(clientSessionRef.current)
            )
              return;
            const emitter = getEmitter(data);
            const myPidNow2 = myParticipantIdRef.current;
            if (
              emitter != null &&
              myPidNow2 != null &&
              String(emitter) === String(myPidNow2)
            )
              return;
            const hasClientDiff =
              !!data?.client_session &&
              String(data.client_session) !== String(clientSessionRef.current);
            const isOtherByEmitter =
              emitter != null &&
              (myPidNow2 == null || String(emitter) !== String(myPidNow2));
            if (!hasClientDiff && !isOtherByEmitter) return;
            const isOn = data?.typing === true || data?.on === true;
            const isOff = data?.typing === false || data?.on === false;
            if (isOff) return setOtherTyping(false);
            if (!isOn) return;
            setOtherTyping(true);
            setTimeout(() => setOtherTyping(false), 1800);
          } catch {}
        });

        const newId = socketio?.chatId ?? null;
        if (newId != null && (socketio?.autoJoin ?? true)) {
          tryJoin(newId);
        }
      } catch (e) {
        setConnected(false);
        onConnectionChange?.(false);
      }
    })();
    return () => {
      alive = false;
      try {
        sioRef.current?.disconnect();
      } catch {}
      sioRef.current = null;
    };
  }, [normRoom, role, socketio?.url, socketio?.token]);

  React.useEffect(() => {
    const newId = socketio?.chatId ?? null;
    const autoJoin = socketio?.autoJoin ?? true;
    if (String(latestRequestedChatIdRef.current ?? "") === String(newId ?? ""))
      return;
    latestRequestedChatIdRef.current = newId;
    if (newId == null || !autoJoin) return setIsJoining(false);
    if (String(lastJoinedChatIdRef.current ?? "") === String(newId)) {
      setIsJoining(false);
      return;
    }
    tryJoin(newId);
  }, [socketio?.chatId, socketio?.autoJoin]);

  function tryJoin(id: any) {
    const sio = sioRef.current;
    if (!sio) return;
    if (joinInFlightRef.current) return;
    joinInFlightRef.current = true;
    setIsJoining(true);
    setItems([]);
    seenRef.current = new Set();
    setChatId(null);
    setOtherTyping(false);
    const t = setTimeout(() => setIsJoining(false), 6000);
    sio.emit("chat.join", { id_chat: id }, (ack: any) => {
      try {
        clearTimeout(t);
        joinInFlightRef.current = false;
        if (ack && ack.success) {
          const data = ack.data || {};
          const cid = data.id_chat ?? id;
          if (cid != null) {
            setChatId(cid);
            chatIdRef.current = cid;
          }
          lastJoinedChatIdRef.current = cid;
          if (data.my_participante) {
            setMyParticipantId(data.my_participante);
            myParticipantIdRef.current = data.my_participante;
          }
          try {
            console.log("[CoachChat] JOIN ok", {
              id_chat: cid,
              my_participante: data?.my_participante ?? null,
              has_participants: !!(data.participants || data.participantes),
            });
          } catch {}
          const parts = data.participants || data.participantes || [];
          joinedParticipantsRef.current = Array.isArray(parts) ? parts : [];
          joinDataRef.current = { participants: joinedParticipantsRef.current };
          if (
            !myParticipantIdRef.current &&
            role === "coach" &&
            socketio?.idEquipo != null
          ) {
            try {
              const mine = joinedParticipantsRef.current.find(
                (p: any) =>
                  String((p?.participante_tipo || "").toLowerCase()) ===
                    "equipo" &&
                  String(p?.id_equipo) === String(socketio.idEquipo) &&
                  p?.id_chat_participante != null
              );
              if (mine?.id_chat_participante != null) {
                setMyParticipantId(mine.id_chat_participante);
                myParticipantIdRef.current = mine.id_chat_participante;
              }
            } catch {}
          }
          const msgsSrc = Array.isArray(data.messages)
            ? data.messages
            : Array.isArray((data as any).mensajes)
            ? (data as any).mensajes
            : [];
          const myPidLocal =
            data?.my_participante ?? myParticipantIdRef.current;
          const mapped: Message[] = msgsSrc.map((m: any) => {
            const isMineById =
              myPidLocal != null &&
              String(getEmitter(m) ?? "") === String(myPidLocal);
            let sender: Sender;
            if (role === "coach") {
              sender = isMineById ? "coach" : "alumno";
            } else if (role === "alumno") {
              const tipoNorm = normalizeTipo(
                m?.participante_tipo ||
                  getTipoByParticipantId(m?.id_chat_participante_emisor)
              );
              const mineByTipo = tipoNorm === "cliente";
              sender = isMineById || mineByTipo ? "alumno" : "coach";
            } else {
              sender = isMineById ? role : "alumno";
            }
            return {
              id: String(m?.id_mensaje ?? `${Date.now()}-${Math.random()}`),
              room: normRoom,
              sender,
              text: String(
                m?.Contenido ?? m?.contenido ?? m?.texto ?? ""
              ).trim(),
              at: String(
                normalizeDateStr(m?.fecha_envio) || new Date().toISOString()
              ),
              delivered: true,
              read: !!m?.leido,
              srcParticipantId: getEmitter(m),
            };
          });
          setItems(mapped);
          mapped.forEach((mm) => seenRef.current.add(mm.id));
          setIsJoining(false);
          try {
            onChatInfo?.({
              chatId: cid,
              myParticipantId: data?.my_participante ?? null,
              participants: joinedParticipantsRef.current,
            });
          } catch {}
        } else {
          try {
            console.warn("[CoachChat] JOIN fallo", ack);
          } catch {}
          setIsJoining(false);
        }
      } catch {
        joinInFlightRef.current = false;
        setIsJoining(false);
      }
    });
  }

  React.useEffect(() => {
    if (!connected) return;
    if (requestListSignal == null) return;
    const sio = sioRef.current;
    if (!sio) return;
    const lastEnrichAtRef = { current: 0 } as { current: number };
    const getItemTimestamp = (it: any): number => {
      const fields = [
        it?.last_message?.fecha_envio,
        it?.last_message_at,
        it?.fecha_ultimo_mensaje,
        it?.updated_at,
        it?.fecha_actualizacion,
        it?.created_at,
        it?.fecha_creacion,
      ];
      for (const f of fields) {
        const t = Date.parse(String(f || ""));
        if (!isNaN(t)) return t;
      }
      const idNum = Number(it?.id_chat ?? it?.id ?? 0);
      return isNaN(idNum) ? 0 : idNum;
    };
    const probeJoin = async (id: any): Promise<any | null> => {
      return await new Promise((resolve) => {
        try {
          sio.emit("chat.join", { id_chat: id }, (ack: any) => {
            if (ack && ack.success) resolve(ack.data || {});
            else resolve(null);
          });
        } catch {
          resolve(null);
        }
      });
    };
    const base = (listParamsRef.current || {}) as any;
    const roleFilter: any = {};
    if (role === "coach" && socketio?.idEquipo != null) {
      roleFilter.participante_tipo = "equipo";
      roleFilter.id_equipo = String(socketio.idEquipo);
    }
    const payload = {
      ...roleFilter,
      ...base,
      include_participants: true,
      with_participants: true,
      includeParticipants: true,
      withParticipants: true,
    } as any;
    try {
      sio.emit("chat.list", payload, async (ack: any) => {
        try {
          try {
            console.log("[CoachChat] chat.list =>", {
              payload,
              success: ack?.success,
              items: Array.isArray(ack?.data) ? ack.data.length : 0,
            });
          } catch {}
          if (ack && ack.success === false) return;
          const list = Array.isArray(ack?.data) ? ack.data : [];
          const baseList: any[] = Array.isArray(list) ? list : [];
          const needEnrich = baseList.some(
            (it) => !Array.isArray(it?.participants || it?.participantes)
          );
          if (!needEnrich) {
            onChatsList?.(baseList);
            return;
          }
          const now = Date.now();
          if (now - (lastEnrichAtRef.current || 0) < 20000) {
            onChatsList?.(baseList);
            return;
          }
          lastEnrichAtRef.current = now;
          const sorted = [...baseList]
            .sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a))
            .slice(0, 10);
          const enriched: any[] = [];
          for (const it of sorted) {
            const id = it?.id_chat ?? it?.id;
            if (id == null) {
              enriched.push(it);
              continue;
            }
            const data = await probeJoin(id);
            if (data && (data.participants || data.participantes)) {
              enriched.push({
                ...it,
                participants: data.participants || data.participantes,
              });
            } else {
              enriched.push(it);
            }
          }
          const byId = new Map<string, any>();
          for (const e of enriched) {
            const id = String(e?.id_chat ?? e?.id ?? "");
            if (id) byId.set(id, e);
          }
          const merged = baseList.map((it) => {
            const id = String(it?.id_chat ?? it?.id ?? "");
            return (id && byId.get(id)) || it;
          });
          onChatsList?.(merged);
        } catch {}
      });
    } catch {}
  }, [connected, requestListSignal]);

  const refreshListNow = React.useCallback(() => {
    try {
      const sio = sioRef.current;
      if (!sio || !connected) return;
      const base = (listParamsRef.current || {}) as any;
      const roleFilter: any = {};
      if (role === "coach" && socketio?.idEquipo != null) {
        roleFilter.participante_tipo = "equipo";
        roleFilter.id_equipo = String(socketio.idEquipo);
      }
      const payload = {
        ...roleFilter,
        ...base,
        include_participants: true,
        with_participants: true,
        includeParticipants: true,
        withParticipants: true,
      } as any;
      sio.emit("chat.list", payload, (ack: any) => {
        try {
          if (ack && ack.success === false) return;
          const list = Array.isArray(ack?.data) ? ack.data : [];
          onChatsList?.(list);
          try {
            console.log("[CoachChat] refreshListNow =>", {
              items: list.length,
            });
          } catch {}
        } catch {}
      });
    } catch {}
  }, [connected, role, socketio?.idEquipo, onChatsList]);

  React.useEffect(() => {
    if (!connected || chatId == null) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    try {
      console.log("[CoachChat] EMIT chat.read.all =>", { id_chat: chatId });
      sioRef.current?.emit("chat.read.all", { id_chat: chatId });
      markRead();
    } catch {}
  }, [items.length, connected, chatId]);

  async function ensureChatReadyForSend(opts?: {
    onlyFind?: boolean;
  }): Promise<boolean> {
    try {
      if (chatId != null) return true;
      const sio = sioRef.current;
      if (!sio) return false;
      const autoCreate = socketio?.autoCreate ?? false;
      const participants = participantsRef.current ?? socketio?.participants;
      if (!Array.isArray(participants) || participants.length === 0)
        return false;
      try {
        console.log(
          "[CoachChat] ensureChatReadyForSend: sin chatId, buscar/crear",
          {
            autoCreate,
            participants,
          }
        );
      } catch {}
      const listPayload: any = {};
      if (role === "coach" && socketio?.idEquipo != null) {
        listPayload.participante_tipo = "equipo";
        listPayload.id_equipo = String(socketio.idEquipo);
      }
      const list: any[] = await new Promise((resolve) => {
        try {
          if (!listPayload.participante_tipo) return resolve([]);
          sio.emit(
            "chat.list",
            {
              ...listPayload,
              include_participants: true,
              with_participants: true,
              includeParticipants: true,
              withParticipants: true,
            },
            (ack: any) => {
              const arr = Array.isArray(ack?.data) ? ack.data : [];
              resolve(arr);
            }
          );
        } catch {
          resolve([]);
        }
      });
      try {
        console.log(
          "[CoachChat] ensureChatReadyForSend: chat.list obtuvo",
          list.length,
          "items"
        );
      } catch {}
      const buildKey = (p: any) => {
        const t = normalizeTipo(p?.participante_tipo);
        if (t === "equipo" && p?.id_equipo)
          return `equipo:${String(p.id_equipo).toLowerCase()}`;
        if (t === "cliente" && p?.id_cliente)
          return `cliente:${String(p.id_cliente).toLowerCase()}`;
        if (t === "admin" && p?.id_admin)
          return `admin:${String(p.id_admin).toLowerCase()}`;
        return null;
      };
      const desiredSet = new Set<string>();
      for (const p of participants) {
        const k = buildKey(p);
        if (k) desiredSet.add(k);
      }
      const equalSets = (a: Set<string>, b: Set<string>) =>
        a.size === b.size && [...a].every((x) => b.has(x));
      const isSubset = (a: Set<string>, b: Set<string>) =>
        [...a].every((x) => b.has(x));
      const findMatchInList = (arr: any[]): any | null => {
        let matchedLocal: any | null = null;
        let subsetMatchedLocal: any | null = null;
        for (const it of arr) {
          const parts = it?.participants || it?.participantes || [];
          const remote = new Set<string>();
          for (const p of parts) {
            const k = buildKey(p);
            if (k) remote.add(k);
          }
          if (remote.size === 0) continue;
          if (equalSets(desiredSet, remote)) {
            matchedLocal = it;
            break;
          }
          if (!subsetMatchedLocal && isSubset(desiredSet, remote))
            subsetMatchedLocal = it;
        }
        return matchedLocal || subsetMatchedLocal || null;
      };

      const matched: any | null = findMatchInList(list);

      if (matched && (matched.id_chat || matched.id)) {
        try {
          console.log(
            "[CoachChat] ensureChatReadyForSend: MATCH existente",
            matched
          );
        } catch {}
        return await new Promise<boolean>((resolve) => {
          try {
            sio.emit(
              "chat.join",
              { id_chat: matched.id_chat ?? matched.id },
              (ack: any) => {
                try {
                  if (ack && ack.success) {
                    const data = ack.data || {};
                    const cid = data.id_chat ?? matched.id_chat ?? matched.id;
                    if (cid != null) {
                      setChatId(cid);
                      chatIdRef.current = cid;
                    }
                    if (data.my_participante) {
                      setMyParticipantId(data.my_participante);
                      myParticipantIdRef.current = data.my_participante;
                    }
                    try {
                      console.log("[CoachChat] JOIN ok (match)", {
                        id_chat: cid,
                        my_participante: data?.my_participante ?? null,
                      });
                    } catch {}
                    const parts = data.participants || data.participantes || [];
                    joinedParticipantsRef.current = Array.isArray(parts)
                      ? parts
                      : [];
                    joinDataRef.current = {
                      participants: joinedParticipantsRef.current,
                    };
                    if (
                      !myParticipantIdRef.current &&
                      role === "coach" &&
                      socketio?.idEquipo != null
                    ) {
                      try {
                        const mine = joinedParticipantsRef.current.find(
                          (p: any) =>
                            String(
                              (p?.participante_tipo || "").toLowerCase()
                            ) === "equipo" &&
                            String(p?.id_equipo) ===
                              String(socketio.idEquipo) &&
                            p?.id_chat_participante != null
                        );
                        if (mine?.id_chat_participante != null) {
                          setMyParticipantId(mine.id_chat_participante);
                          myParticipantIdRef.current =
                            mine.id_chat_participante;
                        }
                      } catch {}
                    }
                    const msgsSrc = Array.isArray(data.messages)
                      ? data.messages
                      : Array.isArray((data as any).mensajes)
                      ? (data as any).mensajes
                      : [];
                    const myPidLocal2 =
                      data?.my_participante ?? myParticipantIdRef.current;
                    const mapped: Message[] = msgsSrc.map((m: any) => {
                      const isMineById =
                        myPidLocal2 != null &&
                        String(getEmitter(m) ?? "") === String(myPidLocal2);
                      let sender: Sender;
                      if (role === "coach") {
                        sender = isMineById ? "coach" : "alumno";
                      } else if (role === "alumno") {
                        const tipoNorm = normalizeTipo(
                          m?.participante_tipo ||
                            getTipoByParticipantId(
                              m?.id_chat_participante_emisor
                            )
                        );
                        const mineByTipo = tipoNorm === "cliente";
                        sender = isMineById || mineByTipo ? "alumno" : "coach";
                      } else {
                        sender = isMineById ? role : "alumno";
                      }
                      return {
                        id: String(
                          m?.id_mensaje ?? `${Date.now()}-${Math.random()}`
                        ),
                        room: normRoom,
                        sender,
                        text: String(
                          m?.Contenido ?? m?.contenido ?? m?.texto ?? ""
                        ).trim(),
                        at: String(
                          normalizeDateStr(m?.fecha_envio) ||
                            new Date().toISOString()
                        ),
                        delivered: true,
                        read: !!m?.leido,
                        srcParticipantId: getEmitter(m),
                      };
                    });
                    setItems(mapped);
                    mapped.forEach((mm) => seenRef.current.add(mm.id));
                    try {
                      onChatInfo?.({
                        chatId: cid,
                        myParticipantId: data?.my_participante ?? null,
                        participants: joinedParticipantsRef.current,
                      });
                    } catch {}
                    resolve(true);
                  } else resolve(false);
                } catch {
                  resolve(false);
                }
              }
            );
          } catch {
            resolve(false);
          }
        });
      }

      if (opts?.onlyFind === true) {
        // Solo se pidió localizar y unirse si existe
        return false;
      }

      if (!autoCreate) return false;

      return await new Promise<boolean>((resolve) => {
        try {
          sio.emit(
            "chat.create-with-participants",
            { participants },
            (ack: any) => {
              try {
                if (ack && ack.success && ack.data) {
                  const data = ack.data;
                  const cid =
                    data.id_chat ??
                    data.id ??
                    data?.chat?.id ??
                    ack?.id_chat ??
                    ack?.id ??
                    null;
                  if (cid != null) {
                    setChatId(cid);
                    chatIdRef.current = cid;
                  } else {
                    console.warn(
                      "[CoachChat] CREATE ok pero sin id_chat en ack; intentando localizar por participantes"
                    );
                  }
                  try {
                    console.log("[CoachChat] CREATE ok", {
                      id_chat: cid,
                      data,
                    });
                  } catch {}
                  const parts = data.participants || data.participantes || [];
                  joinedParticipantsRef.current = Array.isArray(parts)
                    ? parts
                    : [];
                  joinDataRef.current = {
                    participants: joinedParticipantsRef.current,
                  };
                  if (
                    !myParticipantIdRef.current &&
                    role === "coach" &&
                    socketio?.idEquipo != null
                  ) {
                    try {
                      const mine = joinedParticipantsRef.current.find(
                        (p: any) =>
                          String((p?.participante_tipo || "").toLowerCase()) ===
                            "equipo" &&
                          String(p?.id_equipo) === String(socketio.idEquipo) &&
                          p?.id_chat_participante != null
                      );
                      if (mine?.id_chat_participante != null) {
                        setMyParticipantId(mine.id_chat_participante);
                        myParticipantIdRef.current = mine.id_chat_participante;
                      }
                    } catch {}
                  }
                  try {
                    const evt = new CustomEvent("chat:list-refresh", {
                      detail: { reason: "chat-created-local", id_chat: cid },
                    });
                    window.dispatchEvent(evt);
                    console.log(
                      "[CoachChat] dispatch chat:list-refresh (created local)",
                      { id_chat: cid }
                    );
                  } catch {}
                  onChatInfo?.({
                    chatId: cid,
                    myParticipantId: null,
                    participants: joinedParticipantsRef.current,
                  });
                  const finalizeWithJoin = (finalChatId: any) => {
                    let settled = false;
                    const to = setTimeout(() => {
                      if (!settled) {
                        settled = true;
                        console.warn(
                          "[CoachChat] JOIN post-create timeout (resolviendo true sin my_participante aún)"
                        );
                        resolve(true);
                      }
                    }, 1500);
                    sio.emit(
                      "chat.join",
                      { id_chat: finalChatId },
                      (ackJoin: any) => {
                        try {
                          if (ackJoin && ackJoin.success) {
                            const dj = ackJoin.data || {};
                            if (dj.my_participante) {
                              setMyParticipantId(dj.my_participante);
                              myParticipantIdRef.current = dj.my_participante;
                            }
                            try {
                              console.log("[CoachChat] JOIN ok (post-create)", {
                                id_chat: finalChatId,
                                my_participante: dj?.my_participante ?? null,
                              });
                            } catch {}
                            const parts2 =
                              dj.participants || dj.participantes || parts;
                            joinedParticipantsRef.current = Array.isArray(
                              parts2
                            )
                              ? parts2
                              : [];
                            joinDataRef.current = {
                              participants: joinedParticipantsRef.current,
                            };
                            if (
                              !myParticipantIdRef.current &&
                              role === "coach" &&
                              socketio?.idEquipo != null
                            ) {
                              try {
                                const mine = joinedParticipantsRef.current.find(
                                  (p: any) =>
                                    String(
                                      (p?.participante_tipo || "").toLowerCase()
                                    ) === "equipo" &&
                                    String(p?.id_equipo) ===
                                      String(socketio.idEquipo) &&
                                    p?.id_chat_participante != null
                                );
                                if (mine?.id_chat_participante != null) {
                                  setMyParticipantId(mine.id_chat_participante);
                                  myParticipantIdRef.current =
                                    mine.id_chat_participante;
                                }
                              } catch {}
                            }
                          }
                        } catch {}
                        if (!settled) {
                          settled = true;
                          clearTimeout(to);
                          resolve(true);
                        }
                      }
                    );
                  };
                  if (cid != null) {
                    finalizeWithJoin(cid);
                  } else {
                    (async () => {
                      let found: any | null = null;
                      for (let i = 0; i < 3; i++) {
                        await new Promise((r) => setTimeout(r, 350));
                        const fresh: any[] = await new Promise((resolve2) => {
                          try {
                            sio.emit(
                              "chat.list",
                              {
                                ...listPayload,
                                include_participants: true,
                                with_participants: true,
                                includeParticipants: true,
                                withParticipants: true,
                              },
                              (ack2: any) => {
                                resolve2(
                                  Array.isArray(ack2?.data) ? ack2.data : []
                                );
                              }
                            );
                          } catch {
                            resolve2([]);
                          }
                        });
                        const m = findMatchInList(fresh);
                        if (m && (m.id_chat || m.id)) {
                          found = m;
                          break;
                        }
                      }
                      if (found && (found.id_chat || found.id)) {
                        const finalId = found.id_chat ?? found.id;
                        setChatId(finalId);
                        chatIdRef.current = finalId;
                        console.log(
                          "[CoachChat] CREATE fallback: localizado chatId por participantes",
                          {
                            id_chat: finalId,
                          }
                        );
                        finalizeWithJoin(finalId);
                      } else {
                        console.warn(
                          "[CoachChat] CREATE fallback: no se pudo localizar el chat recién creado"
                        );
                        resolve(false);
                      }
                    })();
                  }
                } else {
                  try {
                    console.warn("[CoachChat] CREATE fallo", ack);
                  } catch {}
                  resolve(false);
                }
              } catch {
                resolve(false);
              }
            }
          );
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }

  async function send() {
    const val = text.trim();
    if (!val) return;
    setText("");
    try {
      const sio = sioRef.current;
      if (!sio) return;
      if (chatIdRef.current == null) {
        console.log(
          "[CoachChat] send(): no chatId, intentando ensureChatReadyForSend"
        );
        const ok = await ensureChatReadyForSend();
        if (chatIdRef.current == null) {
          for (let i = 0; i < 15 && chatIdRef.current == null; i++) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        if (!ok || chatIdRef.current == null) {
          console.warn(
            "[CoachChat] send(): abortado, no hay chatId tras ensureChatReadyForSend"
          );
          return;
        }
      }
      let effectivePid: any = myParticipantId;
      if (effectivePid == null) {
        const parts = Array.isArray(joinedParticipantsRef.current)
          ? joinedParticipantsRef.current
          : [];
        if (role === "coach") {
          const mine = parts.find(
            (p: any) =>
              normalizeTipo(p?.participante_tipo) === "equipo" &&
              (!socketio?.idEquipo ||
                String(p?.id_equipo) === String(socketio?.idEquipo))
          );
          if (mine?.id_chat_participante != null)
            effectivePid = mine.id_chat_participante;
        }
      }
      if (effectivePid == null) {
        console.log("[CoachChat] send(): esperando my_participante…");
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 120));
          if (myParticipantId != null) {
            effectivePid = myParticipantId;
            break;
          }
          const parts = Array.isArray(joinedParticipantsRef.current)
            ? joinedParticipantsRef.current
            : [];
          if (role === "coach") {
            const mine = parts.find(
              (p: any) =>
                normalizeTipo(p?.participante_tipo) === "equipo" &&
                (!socketio?.idEquipo ||
                  String(p?.id_equipo) === String(socketio?.idEquipo))
            );
            if (mine?.id_chat_participante != null) {
              effectivePid = mine.id_chat_participante;
              break;
            }
          }
        }
      }
      console.log("[CoachChat] send(): preparado para enviar", {
        id_chat: chatIdRef.current,
        pid: effectivePid,
        text: val,
      });
      const clientId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimistic: Message = {
        id: clientId,
        room: normRoom,
        sender: role,
        text: val,
        at: new Date().toISOString(),
        delivered: false,
        read: false,
        srcParticipantId: effectivePid ?? undefined,
      };
      setItems((prev) => [...prev, optimistic]);
      seenRef.current.add(clientId);
      outboxRef.current.push({
        clientId,
        text: val,
        at: Date.now(),
        pid: effectivePid,
      });

      if (chatIdRef.current == null || effectivePid == null) {
        console.error("[CoachChat] send(): NO ENVÍA — faltan datos", {
          id_chat: chatIdRef.current,
          pid: effectivePid,
        });
        return;
      }
      sio.emit(
        "chat.message.send",
        {
          id_chat: chatIdRef.current,
          id_chat_participante_emisor: effectivePid,
          contenido: val,
          client_session: clientSessionRef.current,
        },
        (ack: any) => {
          try {
            console.log("[CoachChat] chat.message.send ACK <=", {
              success: ack?.success,
              id_mensaje: ack?.data?.id_mensaje ?? ack?.data?.id,
            });
            setItems((prev) => {
              const next = [...prev];
              const serverId = ack?.data?.id_mensaje ?? ack?.data?.id;
              const serverIdStr = serverId ? String(serverId) : null;
              const optimisticIdx = next.findIndex((m) => m.id === clientId);
              if (serverIdStr) {
                const existingIdx = next.findIndex(
                  (m) => String(m.id) === serverIdStr
                );
                if (existingIdx >= 0) {
                  if (optimisticIdx >= 0) next.splice(optimisticIdx, 1);
                  next[existingIdx] = {
                    ...next[existingIdx],
                    delivered: !(ack && ack.success === false),
                  };
                  seenRef.current.add(serverIdStr);
                  return next;
                }
              }
              if (optimisticIdx >= 0) {
                next[optimisticIdx] = {
                  ...next[optimisticIdx],
                  id: serverIdStr ?? next[optimisticIdx].id,
                  delivered: !(ack && ack.success === false),
                };
                if (serverIdStr) seenRef.current.add(serverIdStr);
              }
              return next;
            });
            try {
              emitTyping(false);
              if (typingRef.current.timer) {
                clearTimeout(typingRef.current.timer);
                typingRef.current.on = false;
              }
            } catch {}
          } catch {}
        }
      );
      markRead();
    } catch {}
  }

  function emitTyping(on: boolean) {
    try {
      const sio = sioRef.current;
      if (!sio || chatIdRef.current == null) return;
      const payload: any = { id_chat: chatIdRef.current, typing: !!on };
      if (myParticipantId != null)
        payload.id_chat_participante_emisor = myParticipantId;
      payload.client_session = clientSessionRef.current;
      sio.emit("chat.typing", payload);
      try {
        if (on) console.log("[CoachChat] EMIT typing:on", payload);
      } catch {}
    } catch {}
  }

  const notifyTyping = (on: boolean) => {
    try {
      const state = typingRef.current;
      if (on && !state.on) {
        emitTyping(true);
        state.on = true;
      }
      if (state.timer) {
        clearTimeout(state.timer);
      }
      state.timer = setTimeout(() => {
        try {
          emitTyping(false);
          state.on = false;
        } catch {}
      }, 1600);
    } catch {}
  };

  const mine = (s: Sender) => (s || "").toLowerCase() === role.toLowerCase();
  const formatTime = React.useCallback((iso: string | undefined) => {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  async function handleDeleteChat() {
    const id = chatIdRef.current ?? chatId;
    if (id == null) return;
    try {
      const token = getAuthToken();
      const base = (CHAT_HOST || "").replace(/\/$/, "");
      const url = `${base}/admin/flush-chats/${encodeURIComponent(String(id))}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      let res = await fetch(url, { method: "DELETE", headers });
      if (!res.ok) {
        res = await fetch(url, { method: "POST", headers });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Reset UI
      setItems([]);
      setChatId(null);
      chatIdRef.current = null;
      setConfirmDeleteOpen(false);
      try {
        window.dispatchEvent(
          new CustomEvent("chat:list-refresh", {
            detail: { reason: "chat-deleted", id_chat: id },
          })
        );
      } catch {}
    } catch (e) {
      console.error("[CoachChat] delete chat error", e);
    }
  }

  return (
    <>
      <div className={`flex flex-col w-full min-h-0 ${className || ""}`}>
        <div className="flex items-center justify-between px-4 py-3 bg-[#075E54] text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-[#128C7E] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {(title || "C").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{title}</div>
              {subtitle && (
                <div className="text-xs text-gray-200 truncate">{subtitle}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-200">
              {connected ? "en línea" : "desconectado"}
            </span>
            <button
              onClick={handleGenerateTicket}
              disabled={!(chatIdRef.current ?? chatId) || ticketLoading}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 transition disabled:opacity-60"
              title={
                chatIdRef.current ?? chatId
                  ? "Generar ticket de esta conversación"
                  : "Sin chat activo"
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generar ticket
            </button>
            {/* Menú de acciones (3 puntitos) */}
            <AlertDialog
              open={confirmDeleteOpen}
              onOpenChange={setConfirmDeleteOpen}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 focus:outline-none"
                    title="Más acciones"
                  >
                    <MoreVertical className="h-4 w-4 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-rose-600 focus:text-rose-700">
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar conversación
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ¿Eliminar esta conversación?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán los mensajes del chat{" "}
                    {String(chatIdRef.current ?? chatId ?? "")}. Esta acción no
                    se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteChat}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScrollContainer}
          className="relative flex-1 overflow-y-auto p-4 min-h-0 bg-[#ECE5DD]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23d9d9d9' fillOpacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            scrollbarGutter: "stable both-edges",
            overscrollBehavior: "contain",
            overflowAnchor: "none", // evitar saltos por scroll anchoring
            overflowY: "scroll", // mantener el espacio del scrollbar estable
          }}
        >
          {isJoining && items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-sm text-gray-500">Cargando mensajes…</div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-sm text-gray-500 bg-white/60 px-4 py-2 rounded-lg shadow-sm">
                Sin mensajes aún
              </div>
            </div>
          ) : (
            items.map((m, idx) => {
              const isMine = mine(m.sender);
              const prev = idx > 0 ? items[idx - 1] : null;
              const next = idx + 1 < items.length ? items[idx + 1] : null;
              const samePrev = prev && prev.sender === m.sender;
              const sameNext = next && next.sender === m.sender;
              const newGroup = !samePrev;
              const endGroup = !sameNext;

              let radius = "rounded-lg";
              if (isMine) {
                if (newGroup && !endGroup) radius = "rounded-lg rounded-br-sm";
                if (!newGroup && !endGroup)
                  radius =
                    "rounded-tr-sm rounded-br-sm rounded-tl-lg rounded-bl-lg";
                if (!newGroup && endGroup) radius = "rounded-lg rounded-tr-sm";
              } else {
                if (newGroup && !endGroup) radius = "rounded-lg rounded-bl-sm";
                if (!newGroup && !endGroup)
                  radius =
                    "rounded-tl-sm rounded-bl-sm rounded-tr-lg rounded-br-lg";
                if (!newGroup && endGroup) radius = "rounded-lg rounded-tl-sm";
              }

              const wrapperMt = newGroup ? "mt-2" : "mt-0.5";

              return (
                <div
                  key={m.id}
                  className={`flex ${
                    isMine ? "justify-end" : "justify-start"
                  } ${wrapperMt}`}
                >
                  <div
                    className={`w-fit max-w-[75%] px-3 py-2 shadow-sm ${radius} ${
                      isMine ? "bg-[#DCF8C6]" : "bg-white"
                    }`}
                  >
                    <div className="text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-[1.3]">
                      {m.text}
                    </div>
                    <div
                      className={`mt-1 text-[11px] flex items-center gap-1 justify-end select-none ${
                        isMine ? "text-gray-600" : "text-gray-500"
                      }`}
                    >
                      <span>{formatTime(m.at)}</span>
                      {isMine && (
                        <span
                          className={`ml-0.5 ${
                            m.read ? "text-[#53BDEB]" : "text-gray-500"
                          }`}
                        >
                          {m.read ? "✓✓" : m.delivered ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {/* Indicador de escritura como overlay absoluto para no alterar el layout */}
          <div
            className={`pointer-events-none absolute left-4 bottom-4 transition-opacity duration-150 ${
              otherTyping ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
          >
            <div className="bg-white/95 px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex gap-1 items-center">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </div>
            </div>
          </div>
          <div ref={bottomRef} />
        </div>

        <div className="px-3 py-3 bg-[#F0F0F0] border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </button>
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) notifyTyping(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                } else {
                  notifyTyping(true);
                }
              }}
              placeholder="Escribe un mensaje"
              className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2.5 text-[15px] focus:outline-none focus:border-[#128C7E] transition-colors"
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="p-2.5 rounded-full bg-[#128C7E] text-white disabled:opacity-50 disabled:bg-gray-400 hover:bg-[#075E54] transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Modal: Ticket generado por IA */}
      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-amber-400 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              Ticket sugerido por IA
            </DialogTitle>
            <DialogDescription>
              Se generó a partir de la conversación actual (chat_id:{" "}
              {String(chatIdRef.current ?? "—")}).
            </DialogDescription>
          </DialogHeader>

          {/* Contenedor scrollable para contenido largo del ticket */}
          <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto pr-1">
            {ticketLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              </div>
            ) : ticketError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
                {ticketError}
              </div>
            ) : ticketData ? (
              <div className="space-y-4">
                {ticketData.parsed?.html && (
                  <div className="rounded-md border bg-white p-3">
                    <div className="mb-2 flex items-center gap-1 text-[13px] uppercase text-gray-500">
                      Resumen IA
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 border border-amber-200">
                        <Sparkles className="h-3 w-3" /> IA
                      </span>
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-gray-900 [&_p]:my-1 [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{
                        __html: ticketData.parsed.html,
                      }}
                    />
                    {(ticketData.parsed.titulo ||
                      ticketData.parsed.prioridad ||
                      ticketData.parsed.categoria) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                        {ticketData.parsed.titulo && (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-gray-800 border">
                            Título: {ticketData.parsed.titulo}
                          </span>
                        )}
                        {ticketData.parsed.prioridad && (
                          <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-blue-800 border border-blue-200">
                            Prioridad: {ticketData.parsed.prioridad}
                          </span>
                        )}
                        {ticketData.parsed.categoria && (
                          <span className="inline-flex items-center rounded-md bg-violet-100 px-2 py-0.5 text-violet-800 border border-violet-200">
                            Categoría: {ticketData.parsed.categoria}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="rounded-md border bg-white p-3">
                  <div className="text-[13px] uppercase text-gray-500">
                    Nombre
                  </div>
                  <div className="text-[15px] font-medium text-gray-900">
                    {ticketData!.nombre || "—"}
                  </div>
                </div>
                <div className="rounded-md border bg-white p-3">
                  <div className="text-[13px] uppercase text-gray-500">
                    Sugerencia
                  </div>
                  <div className="text-[15px] text-gray-900 whitespace-pre-wrap">
                    {ticketData!.sugerencia || "—"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border bg-white p-3">
                    <div className="text-[13px] uppercase text-gray-500">
                      Tipo
                    </div>
                    <div className="text-[15px] font-medium text-gray-900">
                      {ticketData!.tipo || "—"}
                    </div>
                  </div>
                  <div className="rounded-md border bg-white p-3">
                    <div className="text-[13px] uppercase text-gray-500">
                      Archivos
                    </div>
                    <div className="text-[15px] text-gray-900">
                      {ticketData!.archivos_cargados?.length || 0}
                    </div>
                  </div>
                </div>
                <div className="rounded-md border bg-white p-3">
                  <div className="text-[13px] uppercase text-gray-500">
                    Descripción
                  </div>
                  <div className="text-[15px] text-gray-900 whitespace-pre-wrap">
                    {ticketData!.descripcion || "—"}
                  </div>
                </div>

                <div className="rounded-lg bg-gradient-to-r from-amber-100 via-fuchsia-100 to-violet-100 p-3 border text-[13px] text-gray-700">
                  ✨ Sugerido automáticamente por IA. Revisa y ajusta antes de
                  crear el ticket definitivo.
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Sin datos para mostrar.
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              className="inline-flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setTicketModalOpen(false)}
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
