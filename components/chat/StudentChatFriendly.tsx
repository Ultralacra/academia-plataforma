"use client";
import React from "react";
import AudioBubble from "@/app/admin/teamsv2/[code]/AudioBubble";
import VideoPlayer from "@/components/chat/VideoPlayer";
import { AttachmentPreviewModal } from "@/app/admin/teamsv2/[code]/AttachmentPreviewModal";
import { TicketGenerationModal } from "@/app/admin/teamsv2/[code]/TicketGenerationModal";
import {
  Sender,
  Attachment,
  Message,
  SocketIOConfig,
  TicketData,
} from "@/app/admin/teamsv2/[code]/chat-types";
import {
  simpleMarkdownToHtml,
  parseAiContent,
  formatBytes as formatBytesUtil,
} from "@/app/admin/teamsv2/[code]/chat-utils";
import { getAttachmentUrl } from "@/app/admin/teamsv2/[code]/chat-attachments";
import {
  recordRecentUpload,
  hasRecentUploadMatch,
  hasRecentUploadLoose,
} from "@/app/admin/teamsv2/[code]/chat-recent-upload";
import {
  getEmitter,
  normalizeDateStr,
} from "@/app/admin/teamsv2/[code]/chat-core";
import { convertBlobToMp3 } from "@/lib/audio-converter";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST, apiFetch, buildUrl } from "@/lib/api-config";
import { playNotificationSound } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Trash2,
  Paperclip,
  Mic,
  Square,
  Sparkles,
  Loader2,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  CheckCheck,
  Check,
} from "lucide-react";
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

function chatDebug(): boolean {
  return false;
}

function dbg(...args: any[]) {
  try {
    if (!chatDebug()) return;
    console.log("[Chat]", ...args);
  } catch {}
}

export default function StudentChatFriendly({
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
  resolveName,
  onBack,
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
  resolveName?: (tipo: "equipo" | "cliente" | "admin", id: string) => string;
  onBack?: () => void;
}) {
  const isMobile = useIsMobile();
  const [convList, setConvList] = React.useState<any[]>([]);
  const convListRef = React.useRef<any[]>([]);

  const chatListsEqual = React.useCallback((a: any[], b: any[]) => {
    try {
      if (a === b) return true;
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        const ai = a[i];
        const bi = b[i];
        const idA = String(ai?.id_chat ?? ai?.id ?? "");
        const idB = String(bi?.id_chat ?? bi?.id ?? "");
        if (idA !== idB) return false;
        const atA = String(
          ai?.last_message_at ??
            ai?.fecha_ultimo_mensaje ??
            ai?.updated_at ??
            ai?.created_at ??
            ""
        );
        const atB = String(
          bi?.last_message_at ??
            bi?.fecha_ultimo_mensaje ??
            bi?.updated_at ??
            bi?.created_at ??
            ""
        );
        if (atA !== atB) return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const [contacts, setContacts] = React.useState<
    Array<{ codigo_equipo: string; area?: string }>
  >([]);
  const normRoom = React.useMemo(
    () => (room || "").trim().toLowerCase(),
    [room]
  );
  const mine = React.useCallback(
    (s: Sender) => (s || "").toLowerCase() === role.toLowerCase(),
    [role]
  );
  // Límite de tamaño por archivo: 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const [connected, setConnected] = React.useState(false);
  const [items, setItems] = React.useState<Message[]>([]);
  const itemsRef = React.useRef<Message[]>([]);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  // Debug opcional: imprimir un resumen solo si chatDebug=1
  // React.useEffect(() => {
  //   if (!chatDebug()) return;
  //   try {
  //     const summary = items.map((m) => ({
  //       id: m.id,
  //       sender: m.sender,
  //       textLen: (m.text || "").length,
  //       at: m.at,
  //       attCount: Array.isArray(m.attachments) ? m.attachments.length : 0,
  //     }));
  //     dbg("[CoachChat] items updated =>", summary);
  //   } catch {}
  // }, [items]);
  const [text, setText] = React.useState("");
  const [isJoining, setIsJoining] = React.useState(false);
  // Estado de carga de mensajes (evita parpadeos al hacer join/refrescar)
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const loadingMessagesRef = React.useRef(false);
  React.useEffect(() => {
    loadingMessagesRef.current = loadingMessages;
  }, [loadingMessages]);
  const [chatId, setChatId] = React.useState<string | number | null>(
    socketio?.chatId ?? null
  );
  const [myParticipantId, setMyParticipantId] = React.useState<
    string | number | null
  >(null);
  const [otherTyping, setOtherTyping] = React.useState(false);
  // Estado creación manual de chat
  const [creatingChat, setCreatingChat] = React.useState(false);
  // Estado del ticket generado por IA
  const [ticketModalOpen, setTicketModalOpen] = React.useState(false);
  const [ticketLoading, setTicketLoading] = React.useState(false);
  const [ticketError, setTicketError] = React.useState<string | null>(null);
  const [ticketData, setTicketData] = React.useState<TicketData | null>(null);
  // --- Selección manual para creación de ticket ---
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = React.useState<
    Set<string>
  >(new Set());
  const [selectedAttachmentIds, setSelectedAttachmentIds] = React.useState<
    Set<string>
  >(new Set());

  // Log selection changes
  React.useEffect(() => {
    if (selectedMessageIds.size > 0 || selectedAttachmentIds.size > 0) {
      console.log(
        JSON.stringify(
          {
            message_ids: Array.from(selectedMessageIds),
            file_ids: Array.from(selectedAttachmentIds),
          },
          null,
          3
        )
      );
    }
  }, [selectedMessageIds, selectedAttachmentIds]);

  const toggleMessageSelection = React.useCallback((id: string) => {
    // console.log("[Chat] toggleMessageSelection", {
    //   chatId: chatIdRef.current,
    //   messageId: id,
    //   action: "toggle",
    // });
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleAttachmentSelection = React.useCallback((id: string) => {
    // console.log("[Chat] toggleAttachmentSelection", {
    //   chatId: chatIdRef.current,
    //   attachmentId: id,
    //   action: "toggle",
    // });
    setSelectedAttachmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  // Progreso de subida
  const [uploadState, setUploadState] = React.useState<{
    active: boolean;
    total: number;
    done: number;
    current?: string;
  }>({ active: false, total: 0, done: 0 });
  // Grabación de audio
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<BlobPart[]>([]);
  const [recording, setRecording] = React.useState(false);
  const [recordStartAt, setRecordStartAt] = React.useState<number | null>(null);
  const recordTimerRef = React.useRef<any>(null);
  const [recordTick, setRecordTick] = React.useState<number>(0);
  const [attachments, setAttachments] = React.useState<
    { file: File; preview?: string }[]
  >([]);
  // Vista previa de adjuntos
  const [previewAttachment, setPreviewAttachment] =
    React.useState<Attachment | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [fullImageSrc, setFullImageSrc] = React.useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false);

  // Detectar URLs en texto y envolverlas en <a>
  const renderTextWithLinks = React.useCallback((value?: string) => {
    const text = (value || "").trim();
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }
      let href = match[0];
      if (!/^https?:\/\//i.test(href)) {
        href = `https://${href}`;
      }
      parts.push(
        <a
          key={`${href}-${start}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline text-sky-700 hover:text-sky-900 break-all"
        >
          {match[0]}
        </a>
      );
      lastIndex = end;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  }, []);

  const sioRef = React.useRef<any>(null);
  const chatIdRef = React.useRef<string | number | null>(
    socketio?.chatId ?? null
  );
  const myParticipantIdRef = React.useRef<string | number | null>(null);
  const seenRef = React.useRef<Set<string>>(new Set());
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = React.useRef<boolean>(true);
  const [newMessagesCount, setNewMessagesCount] = React.useState<number>(0);
  const lastRealtimeAtRef = React.useRef<number>(Date.now());
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
      // Solo limpiar mensajes si aún no se ha unido a un chat o no hay items.
      // Evita parpadeo cuando ya hay conversación activa y cambia referencia mínima de participantes.
      const hasActiveChat = chatIdRef.current != null;
      const hasMessages = (itemsRef.current?.length || 0) > 0;
      setChatId(null);
      chatIdRef.current = null;
      if (!hasActiveChat || !hasMessages) {
        setItems([]);
        seenRef.current = new Set();
      }
      setOtherTyping(false);
      lastJoinedChatIdRef.current = null;
      setLoadingMessages(true);
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
        // Alumno: solo localizar y hacer join si existe (no crear aquí)
        await ensureChatReadyForSend({ onlyFind: true });
      } catch {}
    })();
  }, [connected, precreateOnParticipants, socketio?.participants]);

  const getDistanceFromBottom = React.useCallback((): number => {
    try {
      const sc = scrollRef.current;
      if (!sc) return Number.POSITIVE_INFINITY;
      return sc.scrollHeight - sc.scrollTop - sc.clientHeight;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }, []);

  React.useEffect(() => {
    // Mantenernos abajo si:
    // - estamos pegados al fondo (pinnedToBottom), o
    // - estamos cerca del fondo (<120px), o
    // - el último mensaje es mío (para no perder el contexto al enviar)
    const distance = getDistanceFromBottom();
    const last = items.length > 0 ? items[items.length - 1] : null;
    const lastIsMine = last ? mine(last.sender) : false;
    const shouldStick =
      pinnedToBottomRef.current || distance < 120 || lastIsMine;
    if (!shouldStick) return;

    requestAnimationFrame(() => {
      try {
        const sc = scrollRef.current;
        const br = bottomRef.current;
        if (!sc) return;
        // Forzar al fondo de forma inmediata para evitar parpadeos
        sc.scrollTop = sc.scrollHeight;
        if (br) br.scrollIntoView({ behavior: "auto", block: "end" });
      } catch {}
    });
  }, [items.length, getDistanceFromBottom]);

  // Scroll síncrono antes de pintar cuando llegan los primeros mensajes
  React.useLayoutEffect(() => {
    try {
      const currentChat = chatIdRef.current ?? chatId;
      if (currentChat == null) return;
      if (autoScrolledChatRef.current === currentChat) return;

      const sc = scrollRef.current;
      const br = bottomRef.current;
      if (sc && br) {
        // Forzar scroll inmediato sin animación para el primer render
        sc.scrollTop = sc.scrollHeight;
        pinnedToBottomRef.current = true;
        autoScrolledChatRef.current = currentChat;
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, items.length]);

  // Cuando cambia de chat, permitir nuevo auto-scroll inicial
  React.useEffect(() => {
    autoScrolledChatRef.current = null;
    // Al cambiar de chat, asumimos que deseamos iniciar abajo
    pinnedToBottomRef.current = true;
    setNewMessagesCount(0);
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
            setNewMessagesCount(0);
          }
        } catch {}
      });
    }
  }, [isJoining]);
  const onScrollContainer = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 120; // más tolerante con pequeños offsets
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distance <= threshold;
    if (pinnedToBottomRef.current) {
      setNewMessagesCount(0);
    }
  }, []);

  // Markdown y parseo movidos a ./chat-utils

  // Helpers de adjuntos y formato movidos a ./chat-attachments y ./chat-utils
  const formatBytes = (bytes?: number) => formatBytesUtil(bytes);
  const getAttachmentUrlCb = React.useCallback(
    (a: Attachment) => getAttachmentUrl(a),
    []
  );
  const openPreview = (a: Attachment) => {
    setPreviewAttachment(a);
    setPreviewOpen(true);
  };

  // Sonido de notificación (similar al Inline)
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
  const unlockedRef = React.useRef(false);
  React.useEffect(() => {
    function unlock() {
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = Ctx ? new Ctx() : null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        if (!audioElRef.current) {
          const el = document.createElement("audio");
          // Fallback embebido: pequeño WAV en data URI
          el.src =
            "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YYQAAACAgICAgICAgP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA";
          el.preload = "auto";
          el.volume = 0.0;
          document.body.appendChild(el);
          audioElRef.current = el;
          el.play().catch(() => {});
          setTimeout(() => {
            el.pause();
            el.volume = 1.0;
          }, 200);
        }
        unlockedRef.current = true;
      } catch {}
    }
    const onClick = () => unlock();
    const onKey = () => unlock();
    try {
      window.addEventListener("click", onClick, { once: true });
      window.addEventListener("keydown", onKey, { once: true });
    } catch {}
    return () => {
      try {
        window.removeEventListener("click", onClick);
        window.removeEventListener("keydown", onKey);
      } catch {}
    };
  }, []);

  const playNotification = React.useCallback(() => {
    try {
      const el = audioElRef.current;
      if (el) {
        el.currentTime = 0;
        el.volume = 1.0;
        el.play().catch(() => {});
        return;
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      if (items.length === 0) return;
      const last = items[items.length - 1];
      const isMine = mine(last.sender);
      if (!isMine) playNotificationSound();
    } catch {}
  }, [items.length]);

  // Componente AudioBubble extraído a './AudioBubble'

  async function handleGenerateTicket() {
    try {
      // Log de selección manual antes de cualquier acción IA
      try {
        const mensajes = Array.from(selectedMessageIds);
        const adjuntos = Array.from(selectedAttachmentIds);
        console.log("[Chat] selección para ticket", {
          mensajes,
          adjuntos,
          vacio: mensajes.length === 0 && adjuntos.length === 0,
        });
      } catch {}

      if (selectedMessageIds.size === 0 && selectedAttachmentIds.size === 0) {
        setTicketModalOpen(true);
        setTicketError(
          "Debes seleccionar al menos un mensaje o archivo para generar el ticket."
        );
        return;
      }

      const currentId = (chatIdRef.current ?? chatId) as any;
      // logging eliminado
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
          // logging eliminado
        }
      } catch {}

      let res: Response | null = null;
      const { getAuthToken } = await import("@/lib/auth");
      const token = typeof window !== "undefined" ? getAuthToken() : null;
      const authHeaders: Record<string, string> = token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" };

      const payload = {
        message_ids: Array.from(selectedMessageIds),
        file_ids: Array.from(selectedAttachmentIds),
      };

      // Log solicitado: agrupación de IDs para el ticket
      // console.log({
      //   message_ids: payload.message_ids,
      //   file_ids: payload.file_ids,
      // });

      const sendId = String(currentId).trim();
      const urlWithParam = buildUrl(
        `/ai/compute/chat/by-ids/${encodeURIComponent(sendId)}`
      );
      // logging eliminado
      res = await fetch(urlWithParam, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res || !res.ok) {
        // Fallback: POST sin body, con el chat_id en la URL

        res = await fetch(urlWithParam, {
          method: "POST",
          headers: authHeaders,
        });
      }
      if (!res) throw new Error("Sin respuesta del servidor");
      const json: any = await res.json().catch(() => null);

      if (!json || (json.code && Number(json.code) !== 200)) {
        throw new Error(json?.message || "Error al generar el ticket");
      }
      const data = json.data || {};
      if (typeof data?.content === "string" && data.content.trim()) {
        const parsed = parseAiContent(data.content);
        const rawMessages = Array.isArray((data as any)?.messages)
          ? (data as any).messages
          : Array.isArray((data as any)?.mensajes)
          ? (data as any).mensajes
          : Array.isArray((data as any)?.original_messages)
          ? (data as any).original_messages
          : [];
        const mappedMessages = rawMessages.map((m: any) => ({
          fecha: String(m?.fecha || m?.date || ""),
          mensaje: String(m?.mensaje || m?.message || "").trim(),
        }));
        setTicketData({
          content: data.content,
          archivos_cargados: Array.isArray(data?.archivos_cargados)
            ? data.archivos_cargados
            : [],
          ai_run_id: data?.ai_run_id ? String(data.ai_run_id) : undefined,
          message_ids: Array.isArray(data?.message_ids)
            ? (data.message_ids as any[]).map((s) => String(s))
            : undefined,
          messages: mappedMessages,
          parsed,
        });
      } else {
        const rawMessages = Array.isArray((data as any)?.messages)
          ? (data as any).messages
          : Array.isArray((data as any)?.mensajes)
          ? (data as any).mensajes
          : Array.isArray((data as any)?.original_messages)
          ? (data as any).original_messages
          : [];
        const mappedMessages = rawMessages.map((m: any) => ({
          fecha: String(m?.fecha || m?.date || ""),
          mensaje: String(m?.mensaje || m?.message || "").trim(),
        }));
        setTicketData({
          nombre: data?.nombre ? String(data.nombre) : undefined,
          sugerencia: data?.sugerencia ? String(data.sugerencia) : undefined,
          tipo: data?.tipo ? String(data.tipo) : undefined,
          descripcion: data?.descripcion ? String(data.descripcion) : undefined,
          archivos_cargados: Array.isArray(data?.archivos_cargados)
            ? data.archivos_cargados
            : [],
          ai_run_id: data?.ai_run_id ? String(data.ai_run_id) : undefined,
          message_ids: Array.isArray(data?.message_ids)
            ? (data.message_ids as any[]).map((s) => String(s))
            : undefined,
          messages: mappedMessages,
        });
      }
    } catch (e: any) {
      setTicketError(e?.message || "Error inesperado al generar ticket");
    } finally {
      setTicketLoading(false);
    }
  }

  // Subida de archivos al chat actual mediante FormData
  async function uploadFiles(selected: FileList | File[]) {
    try {
      setUploadError(null);
      if (!selected || ("length" in selected && selected.length === 0)) return;

      // Asegurar que exista chatId
      if (chatIdRef.current == null) {
        const ok = await ensureChatReadyForSend();
        if (!ok || chatIdRef.current == null) {
          setUploadError("No hay chat activo para subir archivos.");
          return;
        }
      }

      const id = String(chatIdRef.current);
      setUploading(true);
      let arr = Array.from(selected as FileList | File[]);
      // Filtrar archivos que exceden el límite y reportar
      const tooBig = arr.filter((f) => (f?.size || 0) > MAX_FILE_SIZE);
      if (tooBig.length) {
        const names = tooBig
          .map((f) => f.name)
          .slice(0, 3)
          .join(", ");
        const more = tooBig.length > 3 ? ` y ${tooBig.length - 3} más` : "";
        setUploadError(
          `Se omitieron ${tooBig.length} archivo(s) por exceder 50MB: ${names}${more}.`
        );
        arr = arr.filter((f) => (f?.size || 0) <= MAX_FILE_SIZE);
      }
      if (arr.length === 0) {
        setUploading(false);
        setUploadState({
          active: false,
          total: 0,
          done: 0,
          current: undefined,
        });
        return;
      }
      setUploadState({
        active: true,
        total: arr.length,
        done: 0,
        current: undefined,
      });

      // 1) Prepare all optimistic messages
      const tasks = arr.map((file) => {
        const optimisticId = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const optimisticAttachment = {
          id: `${optimisticId}-att`,
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          data_base64: "",
          url: URL.createObjectURL(file),
        } as Attachment;
        const optimisticMsg: Message = {
          id: optimisticId,
          room: normRoom,
          sender: role,
          text: "",
          at: new Date().toISOString(),
          delivered: false,
          read: false,
          srcParticipantId: myParticipantIdRef.current ?? undefined,
          attachments: [optimisticAttachment],
          uiKey: optimisticId,
        };
        // Asignar client_session para deduplicación robusta
        (optimisticMsg as any).client_session = clientSessionRef.current;
        return { file, optimisticMsg, optimisticId };
      });

      // Add all to UI immediately
      setItems((prev) => [...prev, ...tasks.map((t) => t.optimisticMsg)]);

      // Register recent uploads
      tasks.forEach((t) => {
        try {
          recordRecentUpload(role, id, t.file);
        } catch {}
      });

      // 2) Upload one by one
      for (const { file, optimisticId } of tasks) {
        const fd = new FormData();
        fd.append("file", file, file.name);
        // Intentar enviar client_session si el backend lo soporta
        fd.append("client_session", clientSessionRef.current);

        try {
          setUploadState((s) => ({ ...s, current: file.name }));

          // Subir al servidor (intenta primero en CHAT_HOST, luego en API_HOST)
          const token = getAuthToken();
          const headers: Record<string, string> = token
            ? { Authorization: `Bearer ${token}` }
            : {};
          let ok = false;
          // try CHAT_HOST usando el endpoint /v1/ai/upload-file/
          try {
            const base = (CHAT_HOST || "").replace(/\/$/, "");
            const url = `${base}/v1/ai/upload-file/${encodeURIComponent(id)}`;
            const res = await fetch(url, { method: "POST", headers, body: fd });
            ok = res.ok;
          } catch {}
          // fallback a API host con el mismo endpoint /v1/ai/upload-file/
          if (!ok) {
            try {
              const fallbackUrl = buildUrl(
                `/v1/ai/upload-file/${encodeURIComponent(id)}`
              );
              const h2: Record<string, string> = {
                ...headers,
                // no fijamos Content-Type explícito para FormData
              };
              const res2 = await fetch(fallbackUrl, {
                method: "POST",
                headers: h2,
                body: fd,
              });
              ok = res2.ok;
            } catch {}
          }

          // 3) Marcar optimista como entregado o mostrar error
          setItems((prev) =>
            prev.map((m) =>
              m.id === optimisticId ? { ...m, delivered: ok } : m
            )
          );

          // 4) Disparar refresh de listas y confiar en el evento socket del servidor
          try {
            const evt = new CustomEvent("chat:list-refresh", {
              detail: { reason: "file-upload", id_chat: id },
            });
            window.dispatchEvent(evt);
          } catch {}
          setUploadState((s) => ({
            ...s,
            done: Math.min(s.total, s.done + 1),
          }));
        } catch (e: any) {
          // logging eliminado
          setUploadError(e?.message || "Error al subir archivo");
          setUploadState((s) => ({
            ...s,
            done: Math.min(s.total, s.done + 1),
          }));
        }
      }
    } finally {
      setUploading(false);
      setUploadState((s) => ({ ...s, active: false, current: undefined }));
    }
  }

  const addPendingAttachments = (files: FileList | File[]) => {
    setUploadError(null);
    const arr = Array.from(files as FileList | File[]);
    if (!arr.length) return;
    const valid = arr.filter((f) => (f?.size || 0) <= MAX_FILE_SIZE);
    const rejected = arr.filter((f) => (f?.size || 0) > MAX_FILE_SIZE);
    if (rejected.length) {
      const names = rejected
        .map((f) => f.name)
        .slice(0, 3)
        .join(", ");
      const more = rejected.length > 3 ? ` y ${rejected.length - 3} más` : "";
      setUploadError(
        `No se pueden adjuntar archivos mayores a 50MB. Se omitieron: ${names}${more}.`
      );
    }
    if (!valid.length) return;
    const mapped = valid.map((f) => ({
      file: f,
      preview:
        f.type.startsWith("image/") ||
        f.type.startsWith("video/") ||
        f.type.startsWith("audio/")
          ? URL.createObjectURL(f)
          : undefined,
    }));
    setAttachments((prev) => [...prev, ...mapped]);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (files && files.length > 0) {
        addPendingAttachments(files);
      }
    } finally {
      try {
        if (e.target) e.target.value = "";
      } catch {}
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      const [rm] = next.splice(idx, 1);
      try {
        if (rm?.preview) URL.revokeObjectURL(rm.preview);
      } catch {}
      return next;
    });
  };

  const clearAttachments = () => {
    setAttachments((prev) => {
      for (const a of prev) {
        try {
          if (a.preview) URL.revokeObjectURL(a.preview);
        } catch {}
      }
      return [];
    });
  };

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
        // Consideramos "pegado" con que el sentinel sea visible (más permisivo)
        pinnedToBottomRef.current = !!e.isIntersecting;
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

  const nameOf = React.useCallback(
    (tipo: any, id: any): string => {
      try {
        const s = String(id ?? "");
        if (!s) return s;
        const t =
          tipo === "equipo" || tipo === "cliente" || tipo === "admin"
            ? (tipo as "equipo" | "cliente" | "admin")
            : normalizeTipo(tipo);
        if (typeof resolveName === "function" && t) {
          const n = resolveName(t as any, s);
          if (n && typeof n === "string") return n;
        }
        return s;
      } catch {
        return String(id ?? "");
      }
    },
    [resolveName]
  );
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
  const isTwoPartyAlumnoCoachRef = React.useRef<boolean>(false);

  // getEmitter/normalizeDateStr movidos a ./chat-core

  // Determinación consistente del lado del mensaje: preferir emisor/id cuando está disponible.
  // Solo usar heurísticas (tipo de participante o pistas recientes de subida) si faltan IDs.
  type SenderEval = { sender: Sender; byId: boolean; reason: string };

  const evalSenderForMapping = React.useCallback(
    (
      m: any,
      cid: any,
      ctx?: "realtime" | "user" | "join" | "poll"
    ): SenderEval => {
      try {
        const myPid = myParticipantIdRef.current;
        const emitter = getEmitter(m);
        const senderIsById =
          myPid != null && emitter != null && String(emitter) === String(myPid);
        const atts = mapArchivoToAttachments(m);
        // Recent-upload es un "heurístico de eco" para mis propias subidas.
        // En realtime, `hasRecentUploadLoose` puede dar falsos positivos (mismo tipo+size)
        // y termina mostrando adjuntos entrantes como si fueran míos.
        const senderIsByRecentStrict = hasRecentUploadMatch(role, cid, atts);
        const senderIsByRecentLoose = hasRecentUploadLoose(role, cid, atts);
        const senderIsByRecent =
          ctx === "realtime"
            ? senderIsByRecentStrict
            : senderIsByRecentStrict || senderIsByRecentLoose;
        // Outbox heuristic: el texto + timestamp comparable con envíos locales
        let senderIsByOutbox = false;
        let matchedOutboxClientId: string | null = null;
        try {
          const txt = String(m?.contenido ?? m?.texto ?? "").trim();
          const tMsg = Date.parse(
            String(normalizeDateStr(m?.fecha_envio) || "")
          );
          for (let i = outboxRef.current.length - 1; i >= 0; i--) {
            const ob = outboxRef.current[i];
            if ((ob.text || "").trim() !== txt) continue;
            const near = !isNaN(tMsg) && Math.abs(tMsg - (ob.at || 0)) < 12000;
            const nearNow = Math.abs(Date.now() - (ob.at || 0)) < 12000;
            if (near || nearNow) {
              senderIsByOutbox = true;
              matchedOutboxClientId = ob.clientId;
              break;
            }
          }
        } catch {}

        // Endurecer outbox: sólo si hay un optimista local correspondiente.
        // Esto evita colisiones cuando el otro envía el mismo texto ("ok", "si", etc.)
        // y el backend incluye `client_session` del receptor.
        if (senderIsByOutbox) {
          try {
            const clientId = matchedOutboxClientId;
            const prev = itemsRef.current || [];
            const hasOptimistic = !!clientId
              ? prev.some(
                  (x) =>
                    String(x?.id) === String(clientId) &&
                    x?.delivered === false &&
                    String(x?.sender || "").toLowerCase() ===
                      String(role || "").toLowerCase()
                )
              : false;
            if (!hasOptimistic) {
              senderIsByOutbox = false;
              matchedOutboxClientId = null;
            }
          } catch {
            senderIsByOutbox = false;
            matchedOutboxClientId = null;
          }
        }

        // Nota: algunos backends propagan `client_session` del receptor en eventos realtime
        // (especialmente de adjuntos). Para evitar misclasificar como "mío", sólo usamos
        // session como pista fuerte en contextos no-realtime, o cuando ya hay evidencia
        // (outbox/recent) de que fue un eco de envío local.
        const senderIsBySessionRaw =
          !!m?.client_session &&
          String(m.client_session) === String(clientSessionRef.current);
        const senderIsBySession =
          (ctx === "user" || senderIsByOutbox || senderIsByRecent) &&
          senderIsBySessionRaw;

        // Tipo de participante cuando aplique
        const tipoNorm = normalizeTipo(
          m?.participante_tipo ||
            m?.emisor_tipo ||
            m?.tipo_emisor ||
            m?.remitente_tipo ||
            getTipoByParticipantId(m?.id_chat_participante_emisor ?? emitter)
        );
        const senderIsByTipoKnown =
          tipoNorm === "cliente" ||
          tipoNorm === "equipo" ||
          tipoNorm === "admin";

        // Priorizar identificación por id (emitter) cuando esté disponible.
        let final: Sender;
        let reason = "unknown";
        if (senderIsById) {
          reason = "byId";
          const isMine = true;
          if (role === "alumno") final = isMine ? "alumno" : "coach";
          else if (role === "coach") final = isMine ? "coach" : "alumno";
          else final = isMine ? role : "alumno";
        } else {
          // Regla clave: en REALTIME, si el backend no entrega el emisor de forma confiable,
          // NO asumimos "mío". Sólo aceptamos tipo explícito; si no, asumimos "otro".
          // Esto evita que todo se renderice a la derecha. Los ecos propios se siguen
          // reconciliando por los merges (optimistas/client_session) sin depender de esto.
          if (ctx === "realtime") {
            if (senderIsByTipoKnown) {
              reason = "realtime-byParticipantType";
              if (tipoNorm === "cliente") final = "alumno";
              else if (tipoNorm === "equipo") final = "coach";
              else final = role;
            } else {
              reason = "realtime-assume-other";
              final =
                role === "alumno"
                  ? "coach"
                  : role === "coach"
                  ? "alumno"
                  : "alumno";
            }
          } else {
            // En no-realtime sí usamos heurísticas para reconciliar ecos propios.
            // Orden: outbox -> recent -> session -> tipo
            if (senderIsByOutbox) {
              reason = "byOutbox";
              final = role;
            } else if (senderIsByRecent) {
              reason = "byRecentUpload";
              final = role;
            } else if (senderIsBySession) {
              reason = "bySession";
              final = role;
            } else if (senderIsByTipoKnown) {
              reason = "byParticipantType";
              if (tipoNorm === "cliente") final = "alumno";
              else if (tipoNorm === "equipo") final = "coach";
              else final = role; // admin u otros
            } else {
              reason = "fallback-other";
              const hasAtts = Array.isArray(atts) && atts.length > 0;
              const twoParty = !!isTwoPartyAlumnoCoachRef.current;
              if (hasAtts && twoParty) {
                final =
                  role === "alumno"
                    ? "coach"
                    : role === "coach"
                    ? "alumno"
                    : "alumno";
                reason = "fallback-twoParty-attachments-other";
              } else {
                final =
                  role === "alumno"
                    ? "coach"
                    : role === "coach"
                    ? "alumno"
                    : "alumno";
              }
            }
          }
        }
        if (chatDebug() && (ctx === "realtime" || ctx === "user")) {
          // dbg("[CoachChat] evalSenderForMapping", {
          //   cid,
          //   emitter,
          //   myPid,
          //   role,
          //   ctx,
          //   reason,
          //   senderIsById,
          //   senderIsBySession,
          //   senderIsByOutbox,
          //   senderIsByRecent,
          //   senderIsByTipo,
          //   final,
          // });
        }
        return { sender: final, byId: senderIsById, reason };
      } catch {
        const fallback: Sender =
          role === "alumno" ? "coach" : role === "coach" ? "alumno" : "alumno";
        return { sender: fallback, byId: false, reason: "error-fallback" };
      }
    },
    [role]
  );

  // Construir un mensaje desde un payload genérico (incluyendo eventos de archivo)
  const buildMessageFromPayload = React.useCallback(
    (obj: any, ctx?: "realtime" | "user" | "join" | "poll"): Message | null => {
      try {
        const currentChatId = chatIdRef.current ?? chatId;
        const cid = obj?.id_chat ?? obj?.chatId ?? currentChatId;
        if (cid == null) return null;
        const atts = mapArchivoToAttachments(obj) || [];
        const txt = String(obj?.contenido ?? obj?.texto ?? "").trim();
        if (!txt && atts.length === 0) return null;
        const id = String(
          obj?.id_mensaje ??
            obj?.id ??
            obj?.id_archivo ??
            `${Date.now()}-${Math.random()}`
        );
        // Unificar determinación de remitente (isMine) utilizando
        // la función centralizada evalSenderForMapping para evitar
        // desincronías entre join/realtime/pushIncomingMessage.
        const evalR = evalSenderForMapping(obj, cid, ctx);
        const sender: Sender = evalR.sender;
        const msg: Message = {
          id,
          room: normRoom,
          sender,
          text: txt,
          at: String(
            normalizeDateStr(obj?.fecha_envio) || new Date().toISOString()
          ),
          delivered: true,
          read: false,
          srcParticipantId: getEmitter(obj),
          attachments: atts,
          uiKey: id,
        };
        (msg as any).__senderById = !!evalR.byId;
        (msg as any).__senderReason = evalR.reason;
        if (obj?.client_session)
          (msg as any).client_session = obj.client_session;
        return msg;
      } catch {
        return null;
      }
    },
    [role, normRoom, chatId]
  );

  const pushIncomingMessage = React.useCallback((msg: Message) => {
    // Asegurar clave de UI estable
    if (!msg.uiKey) msg.uiKey = msg.id;
    setItems((prev) => {
      // dedupe por id
      if (prev.some((m) => String(m.id) === String(msg.id))) return prev;
      const next = [...prev];
      // dedupe por cercanía temporal + contenido
      for (let i = next.length - 1; i >= 0; i--) {
        const m = next[i];
        const t1 = Date.parse(m.at || "");
        const t2 = Date.parse(msg.at || "");
        const near = !isNaN(t1) && !isNaN(t2) && Math.abs(t1 - t2) < 8000;
        const sameSender = (m.sender || "") === (msg.sender || "");
        const sameText = (m.text || "").trim() === (msg.text || "").trim();

        // Match por client_session (muy confiable)
        const sessionMatch =
          (m as any).client_session &&
          (msg as any).client_session &&
          String((m as any).client_session) ===
            String((msg as any).client_session);

        const attKey = (arr?: Attachment[]) =>
          (arr || [])
            .map((a) => `${a.name}:${a.size}:${a.mime}`)
            .sort()
            .join("|");

        // Comparación relajada para adjuntos (especialmente audio)
        const attKeyRelaxed = (arr?: Attachment[]) => {
          return (arr || [])
            .map((a) => {
              // Si es audio, ignoramos el nombre exacto ya que el servidor puede renombrarlo
              if ((a.mime || "").startsWith("audio/")) {
                return `AUDIO:${Math.round((a.size || 0) / 1000)}k`; // Tolerancia de tamaño
              }
              return `${a.name}:${a.size}`;
            })
            .sort()
            .join("|");
        };

        const sameAtts = attKey(m.attachments) === attKey(msg.attachments);
        const sameAttsRelaxed =
          attKeyRelaxed(m.attachments) === attKeyRelaxed(msg.attachments);

        // Si hay match por sesión, ignoramos sender/text (asumimos que es la confirmación)
        // Si no, usamos la heurística estándar
        if (
          sessionMatch ||
          (near && sameSender && sameText && (sameAtts || sameAttsRelaxed))
        ) {
          // fusionar como delivered
          const byId = (msg as any).__senderById === true;
          const preserveSender = !byId && m.sender && m.sender !== msg.sender;
          next[i] = {
            ...msg,
            sender: preserveSender ? m.sender : msg.sender,
            read: m.read || msg.read,
            at: m.at, // Preservar timestamp local
            // Preservar client_session si el nuevo no lo trae
            client_session:
              (msg as any).client_session || (m as any).client_session,
          } as Message;
          return next;
        }
      }
      return [...next, msg];
    });
    try {
      seenRef.current.add(String(msg.id));
    } catch {}
  }, []);

  // Reconciliar mensajes mapeados desde servidor con los existentes en UI,
  // preservando el lado previo salvo que el nuevo venga respaldado "byId".
  const reconcilePreserveSender = React.useCallback(
    (mapped: Message[]): Message[] => {
      try {
        const prev = itemsRef.current || [];
        if (!prev.length) return mapped;
        const prevById = new Map<string, Message>(
          prev.map((p) => [String(p.id), p])
        );
        return mapped.map((m) => {
          const old = prevById.get(String(m.id));
          if (old && old.sender !== m.sender) {
            const byId = (m as any).__senderById === true;
            if (!byId) {
              return { ...m, sender: old.sender } as Message;
            }
          }
          return m;
        });
      } catch {
        return mapped;
      }
    },
    []
  );

  // Unir mensajes del servidor con optimistas locales para que no desaparezcan tras un refresh
  const mergePreservingOptimistics = React.useCallback(
    (serverMapped: Message[]): Message[] => {
      try {
        const prev = itemsRef.current || [];
        if (!prev.length) return serverMapped;
        const now = Date.now();
        const toTs = (iso?: string) => {
          const t = Date.parse(String(iso || ""));
          return isNaN(t) ? 0 : t;
        };
        const softKey = (m: Message) => {
          const txt = (m.text || "").trim();
          const list = m.attachments || [];
          const cat = (mm?: string) => (mm || "").split("/")[0];
          const count = list.length;
          const sizeSum = list.reduce((s, a) => s + (a?.size || 0), 0);
          const cats = Array.from(new Set(list.map((a) => cat(a?.mime))))
            .sort()
            .join(",");
          return `${txt}|${count}|${sizeSum}|${cats}`;
        };

        // Mapa para búsqueda rápida por clave "soft"
        const serverBySoft = new Map<string, Message>();
        for (const m of serverMapped) serverBySoft.set(softKey(m), m);

        // Mapa para búsqueda por client_session (si existe)
        const serverBySession = new Map<string, Message>();
        for (const m of serverMapped) {
          if ((m as any).client_session) {
            serverBySession.set(String((m as any).client_session), m);
          }
        }

        // Identificar optimistas recientes
        const optimistic = prev.filter((m) => {
          const isMine = (m.sender || "").toLowerCase() === role.toLowerCase();
          const isOptimistic = m.delivered === false;
          const recent = now - toTs(m.at) < 60000; // 60s ventana
          return isMine && isOptimistic && recent;
        });

        // Recorrer los mensajes del servidor y ver si alguno matchea con un optimista
        // Si matchea, preservamos el 'at' y 'sender' del optimista para evitar saltos.
        const merged = serverMapped.map((srv) => {
          // Intentar encontrar el optimista correspondiente
          const match = optimistic.find((opt) => {
            // 1. Por client_session
            if ((opt as any).client_session && (srv as any).client_session) {
              return (
                String((opt as any).client_session) ===
                String((srv as any).client_session)
              );
            }
            // 2. Por soft key (texto + adjuntos)
            return softKey(opt) === softKey(srv);
          });

          if (match) {
            // Si encontramos match, usamos el mensaje del servidor pero preservamos
            // timestamp y sender del optimista para estabilidad visual.
            const byId = (srv as any).__senderById === true;
            const keepSender = !byId ? match.sender : srv.sender;
            return {
              ...srv,
              sender: keepSender,
              at: match.at, // IMPORTANTE: mantener timestamp local
              read: match.read || srv.read,
            };
          }
          return srv;
        });

        // Finalmente, añadir los optimistas que NO se encontraron en el servidor
        for (const om of optimistic) {
          // Verificar si ya está en merged (por id o por match previo)
          const alreadyIn = merged.some((m) => String(m.id) === String(om.id));

          // Verificar si ya fue matcheado por softKey o session (aunque tenga ID distinto)
          const key = softKey(om);
          const srvMatch = serverBySoft.get(key);
          const sessionMatch = (om as any).client_session
            ? serverBySession.get(String((om as any).client_session))
            : null;

          if (!alreadyIn && !srvMatch && !sessionMatch) {
            merged.push(om);
          }
        }

        // No forzar orden por fecha para evitar que adjuntos con timestamps inconsistentes
        // aparezcan arriba. Mantenemos el orden del servidor y añadimos optimistas al final.
        return merged;
      } catch {
        return serverMapped;
      }
    },
    [role]
  );

  // Mapear archivo/archivos del backend a adjuntos del UI
  function mapArchivoToAttachments(src: any): Attachment[] | undefined {
    try {
      const looksLikeFile = (it: any) => {
        if (!it) return false;
        return (
          it?.id_archivo != null ||
          it?.nombre_archivo != null ||
          it?.mime_type != null ||
          it?.contenido_base64 != null ||
          it?.url != null
        );
      };

      const candidates: any[] = [];
      const push = (v: any) => {
        if (!v) return;
        if (Array.isArray(v)) candidates.push(...v);
        else candidates.push(v);
      };

      // Formatos comunes del backend
      push(src?.archivo ?? src?.Archivo);
      push(src?.archivos ?? src?.Archivos);

      // Wrappers típicos en eventos/socket
      push(src?.data?.archivo ?? src?.data?.Archivo);
      push(src?.data?.archivos ?? src?.data?.Archivos);
      push(src?.payload?.archivo ?? src?.payload?.Archivo);
      push(src?.payload?.archivos ?? src?.payload?.Archivos);

      // A veces el payload *es* el archivo
      if (looksLikeFile(src)) candidates.push(src);
      if (looksLikeFile(src?.data)) candidates.push(src.data);
      if (looksLikeFile(src?.payload)) candidates.push(src.payload);

      const atts: Attachment[] = [];
      const seen = new Set<string>();
      for (const it of candidates) {
        if (!it) continue;
        if (!looksLikeFile(it)) continue;
        const id = String(it?.id_archivo ?? it?.id ?? "");
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        atts.push({
          id: id || String(`${Date.now()}-${Math.random()}`),
          name: String(it?.nombre_archivo ?? it?.nombre ?? "archivo"),
          mime: String(it?.mime_type ?? it?.mime ?? "application/octet-stream"),
          size: Number(it?.tamano_bytes ?? it?.size ?? 0),
          data_base64: String(it?.contenido_base64 ?? ""),
          url: it?.url ?? undefined,
          created_at: it?.created_at ?? it?.fecha_creacion ?? undefined,
        });
      }
      return atts.length ? atts : undefined;
    } catch {
      return undefined;
    }
  }

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
        // Log explícito del token cuando inicia el chat (coach/alumno/admin)
        try {
          if (chatDebug()) {
            // dbg("auth token", token);
          }
        } catch {}
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
        // Utilidad: recargar mensajes del chat actual desde el servidor (sin resetear estado ni flicker)
        const refreshMessagesFromServer = (cid: any) => {
          try {
            if (cid == null) return;
            sio.emit("chat.join", { id_chat: cid }, (ack: any) => {
              try {
                if (!ack || ack.success === false) return;
                const data = ack.data || {};
                const msgsSrc = Array.isArray(data.messages)
                  ? data.messages
                  : Array.isArray((data as any).mensajes)
                  ? (data as any).mensajes
                  : [];
                const myPidLocal =
                  data?.my_participante ?? myParticipantIdRef.current;
                const mapped: Message[] = msgsSrc.map((m: any) => {
                  const ev = evalSenderForMapping(m, cid, "join");
                  const sender: Sender = ev.sender;
                  const msg: Message = {
                    id: String(
                      m?.id_mensaje ??
                        m?.id_archivo ??
                        `${Date.now()}-${Math.random()}`
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
                    attachments: mapArchivoToAttachments(m),
                    uiKey: String(
                      m?.id_mensaje ?? `${Date.now()}-${Math.random()}`
                    ),
                  } as Message;
                  (msg as any).__senderById = !!ev.byId;
                  (msg as any).__senderReason = ev.reason;
                  return msg;
                });
                const reconciled = reconcilePreserveSender(mapped);
                const fresh = mergePreservingOptimistics(reconciled);
                // Merge incremental estable: actualizar por id y añadir nuevos al final
                setItems((prev) => {
                  const byId = new Map<string, any>();
                  prev.forEach((m) => byId.set(String(m.id), m));
                  const next = [...prev];
                  for (const m of fresh) {
                    const id = String(m.id);
                    if (byId.has(id)) {
                      const idx = next.findIndex((x) => String(x.id) === id);
                      if (idx >= 0) next[idx] = { ...byId.get(id), ...m };
                    }
                  }
                  for (const m of fresh) {
                    const id = String(m.id);
                    if (!byId.has(id)) next.push(m);
                  }
                  return next;
                });
                try {
                  fresh.forEach((mm) => seenRef.current.add(mm.id));
                } catch {}
              } catch {}
            });
          } catch {}
        };

        sio.on("connect", () => {
          if (!alive) return;
          setConnected(true);
          onConnectionChange?.(true);
          // dbg("connect ok", { socketId: sio.id });
        });
        // Fallback: algunos backends emiten eventos distintos al subir archivos.
        // Escuchamos cualquier evento y si parece relacionado a archivos/subidas del chat actual,
        // refrescamos rápidamente los mensajes desde el servidor.
        try {
          const handleFileLike = (payload: any) => {
            try {
              const pid = payload?.id_chat ?? payload?.chatId ?? null;
              const sameChat =
                pid != null &&
                chatIdRef.current != null &&
                String(pid) === String(chatIdRef.current);
              const msg = buildMessageFromPayload(payload, "realtime");
              if (sameChat && msg) {
                pushIncomingMessage(msg);
                lastRealtimeAtRef.current = Date.now();
                return true;
              }
              return false;
            } catch {
              return false;
            }
          };
          // Genérico: cualquier evento que parezca file/upload
          sio.onAny((event: string, payload: any) => {
            try {
              const ev = String(event || "").toLowerCase();
              const looksLikeUpload =
                ev.includes("upload") ||
                ev.includes("file") ||
                ev.includes("archivo") ||
                ev.includes("adjunto");
              if (looksLikeUpload && handleFileLike(payload)) return;
              // Si parece file pero no pudimos construir mensaje, refrescar
              if (looksLikeUpload) {
                refreshMessagesFromServer(chatIdRef.current);
              }
            } catch {}
          });
          // Eventos comunes específicos
          const names = [
            "chat.attachment",
            "chat.attachment.created",
            "chat.file",
            "chat.file.uploaded",
            "archivo.creado",
            "archivo.subido",
            "adjunto.creado",
          ];
          for (const n of names) {
            try {
              sio.on(n, (payload: any) => {
                if (!handleFileLike(payload)) {
                  refreshMessagesFromServer(chatIdRef.current);
                }
              });
            } catch {}
          }
        } catch {}
        sio.on("disconnect", () => {
          if (!alive) return;
          setConnected(false);
          onConnectionChange?.(false);
          // dbg("disconnect");
        });
        sio.on("connect_error", (err: any) => {
          try {
            // dbg("connect_error", { message: err?.message, name: err?.name });
          } catch {}
        });
        sio.on("error", (err: any) => {
          try {
            // dbg("socket error", err);
          } catch {}
        });

        sio.on("chat.message", (msg: any) => {
          try {
            lastRealtimeAtRef.current = Date.now();
            const currentChatId = chatIdRef.current;
            // dbg("event chat.message", {
            //   id_chat: msg?.id_chat,
            //   id_mensaje: msg?.id_mensaje ?? msg?.id,
            //   texto: (msg?.contenido ?? msg?.texto ?? "").slice(0, 140),
            //   emitter: getEmitter(msg),
            //   currentChatId,
            // });
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
                // Para evitar falsos positivos (backends que reflejan session del receptor),
                // sólo consideramos session si hay evidencia (outbox/recent) de eco propio.
                let isMineByOutbox = false;
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
                      isMineByOutbox = true;
                      break;
                    }
                  }
                } catch {}
                const attsOther = mapArchivoToAttachments(msg);
                const isMineByRecent =
                  hasRecentUploadMatch(role, msg?.id_chat, attsOther) ||
                  hasRecentUploadLoose(role, msg?.id_chat, attsOther);
                const isMineBySessionRaw =
                  !!msg?.client_session &&
                  String(msg.client_session) ===
                    String(clientSessionRef.current);
                const isMineBySession =
                  isMineBySessionRaw && (isMineByOutbox || isMineByRecent);

                if (!isMineById && !isMineBySession) {
                  playNotificationSound();
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
                // dbg("message for other chat → refresh + bump unread", {
                //   target: msg?.id_chat,
                // });
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
            let senderIsMeByOutbox = false;
            let matchedClientId: string | null = null;
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
                  matchedClientId = ob.clientId;
                  break;
                }
              }
            } catch {}

            const attsLive = mapArchivoToAttachments(msg);
            // logging eliminado
            const senderIsMeByRecent = hasRecentUploadMatch(
              role,
              currentChatId,
              attsLive
            );

            const senderIsMeBySessionRaw =
              !!msg?.client_session &&
              String(msg.client_session) === String(clientSessionRef.current);
            const senderIsMeBySession =
              senderIsMeBySessionRaw &&
              (senderIsMeByOutbox || senderIsMeByRecent);

            if (
              !senderIsMeById &&
              !senderIsMeBySession &&
              !senderIsMeByOutbox &&
              !senderIsMeByRecent
            ) {
              console.log(
                "[StudentChatFriendly] Playing sound for incoming message"
              );
              playNotificationSound();
            }

            // logging eliminado
            // Determinar remitente de forma consistente usando el helper central
            // evalSenderForMapping para evitar discrepancias entre join/poll/realtime.
            const evalR = evalSenderForMapping(msg, currentChatId, "realtime");
            const sender: Sender = evalR.sender;

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
              uiKey: id,
            };
            if (attsLive && attsLive.length) newMsg.attachments = attsLive;
            setItems((prev) => {
              const next = [...prev];

              // 1. Intentar coincidencia exacta por ID optimista (si lo encontramos en outbox)
              if (matchedClientId) {
                const idx = next.findIndex((m) => m.id === matchedClientId);
                if (idx >= 0) {
                  const mm = next[idx];
                  const keepSender = !evalR.byId ? mm.sender : sender;
                  next[idx] = {
                    ...newMsg,
                    sender: keepSender,
                    at: mm.at, // Preservar timestamp local
                    read: mm.read || false,
                  } as Message;
                  return next;
                }
              }

              const attKey = (arr?: Attachment[]) =>
                (arr || [])
                  .map((a) => `${a.name}:${a.size}:${a.mime}`)
                  .sort()
                  .join("|");
              // Evitar reorden intermitente: fusiones sólo con evidencia fuerte (misma sesión)
              for (let i = next.length - 1; i >= 0; i--) {
                const mm = next[i];
                const tNew = Date.parse(newMsg.at || "");
                const tOld = Date.parse(mm.at || "");
                const near =
                  !isNaN(tNew) && !isNaN(tOld) && Math.abs(tNew - tOld) < 15000;
                const sameText =
                  (mm.text || "").trim() === (newMsg.text || "").trim();
                const sameAtts =
                  attKey(mm.attachments) === attKey(newMsg.attachments);

                // Si coincide texto y adjuntos, y es reciente (o es mi sesión explícita), fusionamos
                const isMyOptimistic =
                  mm.sender === role && mm.delivered === false;
                // Sólo fusionar si es mi sesión y coincide el texto (para evitar colisiones por adjuntos sin texto)
                const match = senderIsMeBySession && sameText && isMyOptimistic;

                if (match) {
                  const keepSender = !evalR.byId ? mm.sender : sender;
                  next[i] = {
                    ...newMsg,
                    sender: keepSender,
                    at: mm.at, // Preservar timestamp local para evitar saltos
                    read: mm.read || false,
                  } as Message;
                  return next;
                }
              }
              return [...prev, newMsg];
            });
            // Si el usuario no está al fondo y el mensaje no es mío, mostrar contador de nuevos
            try {
              const isMineNow =
                (sender || "").toLowerCase() === role.toLowerCase();
              if (!pinnedToBottomRef.current && !isMineNow) {
                setNewMessagesCount((n) => n + 1);
              }
            } catch {}
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
            // dbg("mapped incoming", {
            //   id: newMsg.id,
            //   sender,
            //   at: newMsg.at,
            //   textLen: (newMsg.text || "").length,
            //   atts: (newMsg.attachments || []).length,
            // });
            // No actualizamos myParticipantId a partir de eventos entrantes para evitar desincronización;
            // se establece de forma confiable en JOIN o al ENVIAR un mensaje.
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
              // dbg("event chat.created", data);
            } catch {}
          });
        } catch {}

        sio.on("chat.message.read", (data: any) => {
          try {
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

  // Polling ligero como salvavidas: si no hay eventos en tiempo real recientes,
  // solicitamos mensajes del chat actual cada ~1.8s cuando la pestaña está visible.
  React.useEffect(() => {
    if (!connected) return;
    if (chatId == null) return;
    if (typeof document === "undefined") return;
    // Ajustar frecuencia según rol para reducir presión y parpadeo en alumno
    const intervalMs = role === "alumno" ? 4000 : 1800;
    const timer = setInterval(() => {
      try {
        if (document.visibilityState !== "visible") return;
        const since = Date.now() - (lastRealtimeAtRef.current || 0);
        if (since < 1500) return; // hay eventos RT recientes
        const sio = sioRef.current;
        const current = chatIdRef.current ?? chatId;
        if (!sio || current == null) return;
        sio.emit("chat.join", { id_chat: current }, (ack: any) => {
          try {
            if (!ack || ack.success === false) return;
            const data = ack.data || {};
            const msgsSrc = Array.isArray(data.messages)
              ? data.messages
              : Array.isArray((data as any).mensajes)
              ? (data as any).mensajes
              : [];
            const myPidLocal =
              data?.my_participante ?? myParticipantIdRef.current;
            const mapped: Message[] = msgsSrc.map((m: any) => {
              const ev = evalSenderForMapping(m, current, "poll");
              const sender: Sender = ev.sender;
              const msg: Message = {
                id: String(
                  m?.id_mensaje ??
                    m?.id_archivo ??
                    `${Date.now()}-${Math.random()}`
                ),
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
                attachments: mapArchivoToAttachments(m),
                uiKey: String(
                  m?.id_mensaje ?? `${Date.now()}-${Math.random()}`
                ),
              } as Message;
              (msg as any).__senderById = !!ev.byId;
              (msg as any).__senderReason = ev.reason;
              return msg;
            });
            const reconciled = reconcilePreserveSender(mapped);
            const merged = mergePreservingOptimistics(reconciled);
            // Solo actualizar si cambió algo (evitar flicker)
            const prev = itemsRef.current || [];
            const lastPrev = prev[prev.length - 1];
            const lastNew = merged[merged.length - 1];
            const changed =
              prev.length !== merged.length ||
              (lastPrev &&
                lastNew &&
                String(lastPrev.id) !== String(lastNew.id));
            if (changed) {
              setItems(merged);
              try {
                merged.forEach((mm) => seenRef.current.add(mm.id));
              } catch {}
            }
          } catch {}
        });
      } catch {}
    }, intervalMs);
    return () => clearInterval(timer);
  }, [connected, chatId, role]);

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
    // Evitar limpiar mensajes si ya hay alguno para reducir parpadeo.
    if (itemsRef.current.length === 0) {
      setItems([]);
      seenRef.current = new Set();
    }
    setChatId(null); // chatId transitorio hasta éxito de JOIN
    setOtherTyping(false);
    setLoadingMessages(true);
    const t = setTimeout(() => setIsJoining(false), 6000);
    sio.emit("chat.join", { id_chat: id }, (ack: any) => {
      try {
        clearTimeout(t);
        joinInFlightRef.current = false;
        if (ack && ack.success) {
          const data = ack.data || {};
          const cid = data.id_chat ?? id;
          // dbg("JOIN ok", {
          //   requested: id,
          //   cid,
          //   parts: Array.isArray(data?.participants || data?.participantes)
          //     ? (data?.participants || data?.participantes).length
          //     : 0,
          //   my_participante: data?.my_participante ?? null,
          //   msgs: Array.isArray(data?.messages || (data as any)?.mensajes)
          //     ? (data?.messages || (data as any)?.mensajes).length
          //     : 0,
          // });
          if (cid != null) {
            setChatId(cid);
            chatIdRef.current = cid;
          }
          lastJoinedChatIdRef.current = cid;
          if (data.my_participante) {
            setMyParticipantId(data.my_participante);
            myParticipantIdRef.current = data.my_participante;
          }
          // dbg("JOIN participants resolved", {
          //   myParticipantId: myParticipantIdRef.current,
          // });
          const parts = data.participants || data.participantes || [];
          joinedParticipantsRef.current = Array.isArray(parts) ? parts : [];
          joinDataRef.current = { participants: joinedParticipantsRef.current };
          try {
            const arr = Array.isArray(joinedParticipantsRef.current)
              ? joinedParticipantsRef.current
              : [];
            const tipos = arr.map((p: any) =>
              normalizeTipo(p?.participante_tipo)
            );
            const clientes = tipos.filter((t) => t === "cliente").length;
            const equipos = tipos.filter((t) => t === "equipo").length;
            isTwoPartyAlumnoCoachRef.current =
              clientes >= 1 && equipos >= 1 && arr.length <= 3;
          } catch {}
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
          if (
            !myParticipantIdRef.current &&
            role === "alumno" &&
            socketio?.idCliente != null
          ) {
            try {
              const mineCli = joinedParticipantsRef.current.find(
                (p: any) =>
                  String((p?.participante_tipo || "").toLowerCase()) ===
                    "cliente" &&
                  String(p?.id_cliente) === String(socketio.idCliente) &&
                  p?.id_chat_participante != null
              );
              if (mineCli?.id_chat_participante != null) {
                setMyParticipantId(mineCli.id_chat_participante);
                myParticipantIdRef.current = mineCli.id_chat_participante;
              }
            } catch {}
          }
          if (
            !myParticipantIdRef.current &&
            role === "admin" &&
            socketio?.idAdmin != null
          ) {
            try {
              const mineAdm = joinedParticipantsRef.current.find(
                (p: any) =>
                  String((p?.participante_tipo || "").toLowerCase()) ===
                    "admin" &&
                  String(p?.id_admin) === String(socketio.idAdmin) &&
                  p?.id_chat_participante != null
              );
              if (mineAdm?.id_chat_participante != null) {
                setMyParticipantId(mineAdm.id_chat_participante);
                myParticipantIdRef.current = mineAdm.id_chat_participante;
              }
            } catch {}
          }
          if (
            !myParticipantIdRef.current &&
            role === "alumno" &&
            socketio?.idCliente != null
          ) {
            try {
              const mineCli = joinedParticipantsRef.current.find(
                (p: any) =>
                  String((p?.participante_tipo || "").toLowerCase()) ===
                    "cliente" &&
                  String(p?.id_cliente) === String(socketio.idCliente) &&
                  p?.id_chat_participante != null
              );
              if (mineCli?.id_chat_participante != null) {
                setMyParticipantId(mineCli.id_chat_participante);
                myParticipantIdRef.current = mineCli.id_chat_participante;
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
            const ev = evalSenderForMapping(m, cid, "join");
            const sender: Sender = ev.sender;
            const msg: Message = {
              id: String(
                m?.id_mensaje ??
                  m?.id_archivo ??
                  `${Date.now()}-${Math.random()}`
              ),
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
              attachments: mapArchivoToAttachments(m),
              uiKey: String(m?.id_mensaje ?? `${Date.now()}-${Math.random()}`),
            } as Message;
            (msg as any).__senderById = !!ev.byId;
            (msg as any).__senderReason = ev.reason;
            return msg;
          });

          // Log: IDs de mensajes al hacer JOIN (server y mapeados)
          try {
            // const idsServer = (Array.isArray(msgsSrc) ? msgsSrc : []).map(
            //   (m: any) => String(m?.id_mensaje ?? m?.id ?? "")
            // );
            // const idsMapped = mapped.map((mm) => String(mm.id));
            // console.log("[Chat] JOIN message ids (server)", idsServer);
            // console.log("[Chat] JOIN message ids (mapped)", idsMapped);
            // console.log("[Chat] JOIN messages count", mapped.length);
            // Log completo solicitado: imprimir todos los mensajes de la conversación al hacer JOIN
            try {
              // console.log("[Chat] JOIN full messages", mapped);
              console.log(
                "[Chat] JOIN messages IDs & Attachments",
                mapped.map((m) => ({
                  id: m.id,
                  attachment_ids: Array.isArray(m.attachments)
                    ? m.attachments.map((a) => a.id)
                    : [],
                }))
              );
            } catch {}
          } catch {}

          // Log específico para alumno: conversación activa y mensajes como array sencillo
          try {
            const conversationInfo = {
              chatId: cid,
              participants: Array.isArray(joinedParticipantsRef.current)
                ? joinedParticipantsRef.current
                : [],
            };
            const messagesArray = mapped.map((m) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
              at: m.at,
              attachments: Array.isArray(m.attachments)
                ? m.attachments.map((a) => ({
                    id: a.id,
                    name: a.name,
                    mime: a.mime,
                    size: a.size,
                  }))
                : [],
            }));
            console.log("[Alumno] Conversación activa", conversationInfo);
            console.log("[Alumno] Mensajes (array)", messagesArray);
          } catch {}

          {
            const reconciled = reconcilePreserveSender(mapped);
            const merged = mergePreservingOptimistics(reconciled);
            setItems(merged);
          }
          mapped.forEach((mm) => seenRef.current.add(mm.id));
          setIsJoining(false);
          setLoadingMessages(false);
          try {
            onChatInfo?.({
              chatId: cid,
              myParticipantId: data?.my_participante ?? null,
              participants: joinedParticipantsRef.current,
            });
          } catch {}
        } else {
          // dbg("JOIN fail", ack);
          setIsJoining(false);
          setLoadingMessages(false);
        }
      } catch {
        joinInFlightRef.current = false;
        setIsJoining(false);
        setLoadingMessages(false);
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
    } else if (role === "alumno" && (socketio as any)?.idCliente != null) {
      roleFilter.participante_tipo = "cliente";
      // @ts-ignore
      roleFilter.id_cliente = String((socketio as any).idCliente);
    } else if (role === "admin" && socketio?.idAdmin != null) {
      roleFilter.participante_tipo = "admin";
      roleFilter.id_admin = String(socketio.idAdmin);
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
          dbg("chat.list ack", {
            payload,
            success: !(ack && ack.success === false),
            count: Array.isArray(ack?.data) ? ack.data.length : 0,
          });
          try {
            const baseArr = Array.isArray(ack?.data) ? ack.data : [];
            const toLine = (it: any) => {
              const id = it?.id_chat ?? it?.id ?? null;
              const parts = it?.participants || it?.participantes || [];
              const equipos = (Array.isArray(parts) ? parts : [])
                .filter(
                  (p: any) => normalizeTipo(p?.participante_tipo) === "equipo"
                )
                .map((p: any) => nameOf("equipo", p?.id_equipo))
                .filter(Boolean);
              const clientes = (Array.isArray(parts) ? parts : [])
                .filter(
                  (p: any) => normalizeTipo(p?.participante_tipo) === "cliente"
                )
                .map((p: any) => nameOf("cliente", p?.id_cliente))
                .filter(Boolean);
              return `id=${id} | equipos=[${equipos.join(
                ", "
              )}] | clientes=[${clientes.join(", ")}]`;
            };
            const meLabel =
              role === "alumno"
                ? "cliente"
                : role === "coach"
                ? "equipo"
                : role;
            const meId =
              role === "alumno"
                ? (socketio as any)?.idCliente
                : role === "coach"
                ? socketio?.idEquipo
                : (socketio as any)?.idAdmin;
            const meName =
              meLabel === "cliente"
                ? nameOf("cliente", meId)
                : meLabel === "equipo"
                ? nameOf("equipo", meId)
                : String(meId ?? "");
            console.log(
              "[Chat] comversaciones del usuario —",
              meLabel + ":",
              meName,
              "(total:",
              baseArr.length,
              ")"
            );
            baseArr.forEach((it: any) => console.log(" -", toLine(it)));
          } catch {}
          if (ack && ack.success === false) return;
          const list = Array.isArray(ack?.data) ? ack.data : [];
          const baseList: any[] = Array.isArray(list) ? list : [];
          const needEnrich = baseList.some(
            (it) => !Array.isArray(it?.participants || it?.participantes)
          );
          if (!needEnrich) {
            onChatsList?.(baseList);
            if (!chatListsEqual(convListRef.current, baseList)) {
              convListRef.current = baseList;
              setConvList(baseList);
            }
            try {
              const toLine2 = (it: any) => {
                const id = it?.id_chat ?? it?.id ?? null;
                const parts = it?.participants || it?.participantes || [];
                const equipos = (Array.isArray(parts) ? parts : [])
                  .filter(
                    (p: any) => normalizeTipo(p?.participante_tipo) === "equipo"
                  )
                  .map((p: any) => nameOf("equipo", p?.id_equipo))
                  .filter(Boolean);
                const clientes = (Array.isArray(parts) ? parts : [])
                  .filter(
                    (p: any) =>
                      normalizeTipo(p?.participante_tipo) === "cliente"
                  )
                  .map((p: any) => nameOf("cliente", p?.id_cliente))
                  .filter(Boolean);
                return `id=${id} | equipos=[${equipos.join(
                  ", "
                )}] | clientes=[${clientes.join(", ")}]`;
              };
              console.log(
                "[Chat] comversaciones del usuario — equipo:",
                String(socketio?.idEquipo ?? ""),
                "(enriquecido, total:",
                baseList.length,
                ")"
              );
              baseList.forEach((it: any) => console.log(" -", toLine2(it)));
              const sample = baseList.length > 0 ? baseList[0] : null;
              const sampleObj = sample
                ? {
                    id: sample?.id_chat ?? sample?.id ?? null,
                    last_message_at:
                      sample?.last_message_at ||
                      sample?.fecha_ultimo_mensaje ||
                      sample?.updated_at ||
                      sample?.fecha_actualizacion ||
                      sample?.created_at ||
                      sample?.fecha_creacion ||
                      null,
                    participants: Array.isArray(
                      sample?.participants || sample?.participantes
                    )
                      ? (sample?.participants || sample?.participantes).length
                      : 0,
                  }
                : null;
              console.log(
                "[Chat] resumen listado",
                JSON.stringify(
                  { count: baseList.length, sample: sampleObj },
                  null,
                  2
                )
              );
            } catch {}
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
          try {
            const toLine3 = (it: any) => {
              const id = it?.id_chat ?? it?.id ?? null;
              const parts = it?.participants || it?.participantes || [];
              const equipos = (Array.isArray(parts) ? parts : [])
                .filter(
                  (p: any) => normalizeTipo(p?.participante_tipo) === "equipo"
                )
                .map((p: any) => nameOf("equipo", p?.id_equipo))
                .filter(Boolean);
              const clientes = (Array.isArray(parts) ? parts : [])
                .filter(
                  (p: any) => normalizeTipo(p?.participante_tipo) === "cliente"
                )
                .map((p: any) => nameOf("cliente", p?.id_cliente))
                .filter(Boolean);
              return `id=${id} | equipos=[${equipos.join(
                ", "
              )}] | clientes=[${clientes.join(", ")}]`;
            };
            console.log(
              "[Chat] comversaciones del usuario — equipo:",
              String(socketio?.idEquipo ?? ""),
              "(enriquecido, total:",
              merged.length,
              ")"
            );
            merged.forEach((it: any) => console.log(" -", toLine3(it)));
            const sample = merged.length > 0 ? merged[0] : null;
            const sampleObj = sample
              ? {
                  id: sample?.id_chat ?? sample?.id ?? null,
                  last_message_at:
                    sample?.last_message_at ||
                    sample?.fecha_ultimo_mensaje ||
                    sample?.updated_at ||
                    sample?.fecha_actualizacion ||
                    sample?.created_at ||
                    sample?.fecha_creacion ||
                    null,
                  participants: Array.isArray(
                    sample?.participants || sample?.participantes
                  )
                    ? (sample?.participants || sample?.participantes).length
                    : 0,
                }
              : null;
            console.log(
              "[Chat] resumen listado",
              JSON.stringify(
                { count: merged.length, sample: sampleObj },
                null,
                2
              )
            );
          } catch {}
          onChatsList?.(merged);
          if (!chatListsEqual(convListRef.current, merged)) {
            convListRef.current = merged;
            setConvList(merged);
          }
        } catch {}
      });
    } catch {}
  }, [connected, requestListSignal]);

  // Cargar contactos asignados del alumno (coach de Atención al Cliente preferido)
  React.useEffect(() => {
    (async () => {
      try {
        if (role !== "alumno") return;
        const alumnoCode = (socketio as any)?.idCliente
          ? String((socketio as any).idCliente)
          : null;
        if (!alumnoCode) return;
        const j = await apiFetch<any>(
          `/client/get/clients-coaches?alumno=${encodeURIComponent(alumnoCode)}`
        );
        const rows: any[] = Array.isArray(j?.data) ? j.data : [];
        const list = rows
          .map((r) => ({
            codigo_equipo: String(
              r.codigo_equipo ?? r.codigo_coach ?? r.codigo ?? ""
            ),
            area: r.area || undefined,
          }))
          .filter((x) => !!x.codigo_equipo);
        setContacts(list);
      } catch {}
    })();
  }, [role, (socketio as any)?.idCliente]);

  const refreshListNow = React.useCallback(() => {
    try {
      const sio = sioRef.current;
      if (!sio || !connected) return;
      const base = (listParamsRef.current || {}) as any;
      const roleFilter: any = {};
      if (role === "coach" && socketio?.idEquipo != null) {
        roleFilter.participante_tipo = "equipo";
        roleFilter.id_equipo = String(socketio.idEquipo);
      } else if (role === "alumno" && (socketio as any)?.idCliente != null) {
        roleFilter.participante_tipo = "cliente";
        // @ts-ignore
        roleFilter.id_cliente = String((socketio as any).idCliente);
      } else if (role === "admin" && socketio?.idAdmin != null) {
        roleFilter.participante_tipo = "admin";
        roleFilter.id_admin = String(socketio.idAdmin);
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
          dbg("chat.list immediate", { payload, count: list.length });
          try {
            const toLine = (it: any) => {
              const id = it?.id_chat ?? it?.id ?? null;
              const parts = it?.participants || it?.participantes || [];
              const equipos = (Array.isArray(parts) ? parts : [])
                .filter(
                  (p: any) => normalizeTipo(p?.participante_tipo) === "equipo"
                )
                .map((p: any) => String(p?.id_equipo ?? ""))
                .filter(Boolean);
              const clientes = (Array.isArray(parts) ? parts : [])
                .filter(
                  (p: any) => normalizeTipo(p?.participante_tipo) === "cliente"
                )
                .map((p: any) => String(p?.id_cliente ?? ""))
                .filter(Boolean);
              return `id=${id} | equipos=[${equipos.join(
                ", "
              )}] | clientes=[${clientes.join(", ")}]`;
            };
            console.log(
              "[Chat] comversaciones del usuario — equipo:",
              String(socketio?.idEquipo ?? ""),
              "(total:",
              list.length,
              ")"
            );
            (list || []).forEach((it: any) => console.log(" -", toLine(it)));
          } catch {}
          onChatsList?.(list);
          if (!chatListsEqual(convListRef.current, list)) {
            convListRef.current = list;
            setConvList(list);
          }
        } catch {}
      });
    } catch {}
  }, [connected, role, socketio?.idEquipo, onChatsList]);

  React.useEffect(() => {
    if (!connected || chatId == null) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    try {
      sioRef.current?.emit("chat.read.all", { id_chat: chatId });
      markRead();
    } catch {}
  }, [items.length, connected, chatId]);

  // Evitar creación automática en recarga para alumno: solo buscar y unir si existe
  React.useEffect(() => {
    (async () => {
      try {
        if (!connected) return;
        if (chatIdRef.current != null) return;
        const parts = participantsRef.current ?? socketio?.participants;
        if (!Array.isArray(parts) || parts.length === 0) return;
        // Solo localizar y hacer join si existe (no crear aquí)
        const found = await ensureChatReadyForSend({ onlyFind: true });
        if (!found) {
          // No crear automáticamente; esperar acción del usuario
        }
      } catch {}
    })();
  }, [connected, socketio?.participants]);

  async function ensureChatReadyForSend(opts?: {
    onlyFind?: boolean;
    allowCreate?: boolean;
  }): Promise<boolean> {
    try {
      if (chatIdRef.current != null) return true;
      const sio = sioRef.current;
      if (!sio) return false;
      const participants = participantsRef.current ?? socketio?.participants;
      if (!Array.isArray(participants) || participants.length === 0)
        return false;
      const autoCreate = (() => {
        const base =
          socketio?.autoCreate !== undefined
            ? socketio.autoCreate
            : role !== "alumno";
        // Permitir creación solo si se pasa allowCreate explícito (p. ej., al enviar el primer mensaje)
        if (role === "alumno") return !!opts?.allowCreate && !!base;
        return base;
      })();
      dbg("ensureChatReadyForSend:start", {
        autoCreate,
        count: participants.length,
      });

      // Resolver código de equipo para alumno si falta (igual que versión previa)
      if (role === "alumno") {
        try {
          const hasEquipoCode = (arr: any[]) =>
            (arr || []).some(
              (p) =>
                normalizeTipo(p?.participante_tipo) === "equipo" &&
                /[^0-9]/.test(String(p?.id_equipo || ""))
            );
          if (!hasEquipoCode(participants) && (socketio as any)?.idCliente) {
            const alumnoCode = String((socketio as any).idCliente);
            const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
              alumnoCode
            )}`;
            const j = await apiFetch<any>(url);
            const rows: any[] = Array.isArray(j?.data) ? j.data : [];
            const norm = (s?: string | null) =>
              String(s || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase();
            const isAC = (area?: string | null) =>
              norm(area).includes("ATENCION AL CLIENTE");
            const assigned = rows
              .map((r) => ({
                codigo: r.codigo_equipo ?? r.codigo_coach ?? r.codigo ?? null,
                area: r.area ?? null,
              }))
              .filter((x) => x.codigo);
            const preferred = assigned.find((x) => isAC(x.area)) || assigned[0];
            const codeEquipo = preferred?.codigo
              ? String(preferred.codigo)
              : null;
            if (codeEquipo && /[^0-9]/.test(codeEquipo)) {
              (socketio as any).idEquipo = codeEquipo;
              participantsRef.current = [
                {
                  participante_tipo: "cliente",
                  id_cliente: String((socketio as any).idCliente),
                },
                { participante_tipo: "equipo", id_equipo: codeEquipo },
              ];
              dbg("ensureChatReadyForSend:resolvedEquipoAlumno", {
                codeEquipo,
              });
            }
          }
        } catch {}
      }

      // Construir payload para listar
      const listPayload: any = {};
      if (role === "coach" && socketio?.idEquipo != null) {
        listPayload.participante_tipo = "equipo";
        listPayload.id_equipo = String(socketio.idEquipo);
      } else if (role === "alumno" && socketio?.idCliente != null) {
        listPayload.participante_tipo = "cliente";
        listPayload.id_cliente = String(socketio.idCliente);
        if (
          socketio?.idEquipo != null &&
          /[^0-9]/.test(String(socketio.idEquipo))
        )
          listPayload.id_equipo = String(socketio.idEquipo);
      } else if (role === "admin" && socketio?.idAdmin != null) {
        listPayload.participante_tipo = "admin";
        listPayload.id_admin = String(socketio.idAdmin);
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
              try {
                resolve(Array.isArray(ack?.data) ? ack.data : []);
              } catch {
                resolve([]);
              }
            }
          );
        } catch {
          resolve([]);
        }
      });

      const buildKey = (p: any) => {
        const t = normalizeTipo(p?.participante_tipo || p?.tipo || p?.type);
        if (t === "equipo" && p?.id_equipo)
          return `equipo:${String(p.id_equipo).toLowerCase()}`;
        if (t === "cliente" && p?.id_cliente)
          return `cliente:${String(p.id_cliente).toLowerCase()}`;
        if (t === "admin" && p?.id_admin)
          return `admin:${String(p.id_admin).toLowerCase()}`;
        return null;
      };
      const desired = new Set<string>();
      for (const p of participantsRef.current ?? participants) {
        const k = buildKey(p);
        if (k) desired.add(k);
      }
      const equalSets = (a: Set<string>, b: Set<string>) =>
        a.size === b.size && [...a].every((x) => b.has(x));
      const isSubset = (a: Set<string>, b: Set<string>) =>
        [...a].every((x) => b.has(x));
      const findMatch = (arr: any[]): any | null => {
        let full: any | null = null;
        let subset: any | null = null;
        for (const it of arr) {
          const remote = new Set<string>();
          for (const rp of it?.participants || it?.participantes || []) {
            const k = buildKey(rp);
            if (k) remote.add(k);
          }
          if (remote.size === 0) continue;
          if (equalSets(desired, remote)) {
            full = it;
            break;
          }
          if (!subset && isSubset(desired, remote)) subset = it;
        }
        return full || subset || null;
      };
      const matched = findMatch(list);
      if (matched && (matched.id_chat || matched.id)) {
        const idToJoin = matched.id_chat ?? matched.id;
        const ok = await new Promise<boolean>((resolve) => {
          try {
            sio.emit("chat.join", { id_chat: idToJoin }, (ack: any) => {
              try {
                if (ack && ack.success) {
                  const data = ack.data || {};
                  const cid = data.id_chat ?? idToJoin;
                  setChatId(cid);
                  chatIdRef.current = cid;
                  if (data.my_participante) {
                    setMyParticipantId(data.my_participante);
                    myParticipantIdRef.current = data.my_participante;
                  }
                  joinedParticipantsRef.current = Array.isArray(
                    data.participants || data.participantes
                  )
                    ? data.participants || data.participantes
                    : [];
                  joinDataRef.current = {
                    participants: joinedParticipantsRef.current,
                  };
                  resolve(true);
                } else resolve(false);
              } catch {
                resolve(false);
              }
            });
          } catch {
            resolve(false);
          }
        });
        return ok;
      }

      if (opts?.onlyFind) return false;
      if (!autoCreate) return false;

      // Intento de creación (evento legacy y fallback)
      const tryCreate = async (eventName: string): Promise<boolean> => {
        return await new Promise<boolean>((resolve) => {
          try {
            sio.emit(eventName, { participants }, (ack: any) => {
              try {
                if (ack && ack.success && ack.data) {
                  const data = ack.data;
                  const cid =
                    data.id_chat ??
                    data.id ??
                    data?.chat?.id ??
                    ack?.id_chat ??
                    ack?.id;
                  if (cid != null) {
                    setChatId(cid);
                    chatIdRef.current = cid;
                  }
                  joinedParticipantsRef.current = Array.isArray(
                    data.participants || data.participantes
                  )
                    ? data.participants || data.participantes
                    : [];
                  joinDataRef.current = {
                    participants: joinedParticipantsRef.current,
                  };
                  resolve(true);
                } else resolve(false);
              } catch {
                resolve(false);
              }
            });
          } catch {
            resolve(false);
          }
        });
      };

      const created =
        (await tryCreate("chat.create-with-participants")) ||
        (await tryCreate("chat.create"));
      if (!created || chatIdRef.current == null) return false;

      // Hacer join para obtener my_participante confiable
      await new Promise<void>((resolve) => {
        try {
          sio.emit("chat.join", { id_chat: chatIdRef.current }, (ack: any) => {
            try {
              if (ack && ack.success) {
                const data = ack.data || {};
                if (data.my_participante) {
                  setMyParticipantId(data.my_participante);
                  myParticipantIdRef.current = data.my_participante;
                }
                joinedParticipantsRef.current = Array.isArray(
                  data.participants || data.participantes
                )
                  ? data.participants || data.participantes
                  : joinedParticipantsRef.current;
                joinDataRef.current = {
                  participants: joinedParticipantsRef.current,
                };
              }
            } catch {}
            resolve();
          });
        } catch {
          resolve();
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------
  // Memoized chat list component
  // -------------------------
  type ChatListProps = {
    list: any[];
    nameOf: (tipo: string, id: any) => string;
    tryJoin: (id: any) => void;
    activeChatId: any;
  };

  const ChatListItem = React.memo(
    function ChatListItem({ it, nameOf, tryJoin, activeChatId }: any) {
      const id = it?.id_chat ?? it?.id;
      const parts = it?.participants || it?.participantes || [];
      const equipos = (Array.isArray(parts) ? parts : [])
        .filter((p: any) => normalizeTipo(p?.participante_tipo) === "equipo")
        .map((p: any) => nameOf("equipo", p?.id_equipo))
        .filter(Boolean);
      const clientes = (Array.isArray(parts) ? parts : [])
        .filter((p: any) => normalizeTipo(p?.participante_tipo) === "cliente")
        .map((p: any) => nameOf("cliente", p?.id_cliente))
        .filter(Boolean);
      const title = equipos.length ? equipos.join(", ") : clientes.join(", ");
      const lastAt =
        it?.last_message_at ||
        it?.fecha_ultimo_mensaje ||
        it?.updated_at ||
        it?.fecha_actualizacion ||
        it?.created_at ||
        it?.fecha_creacion;
      const lastLabel = lastAt ? formatTime(String(lastAt)) : "";
      let unread = 0;
      try {
        const key = `chatUnreadById:alumno:${String(id)}`;
        unread = parseInt(localStorage.getItem(key) || "0", 10);
        if (isNaN(unread)) unread = 0;
      } catch {}
      const active =
        activeChatId != null && String(activeChatId) === String(id);

      return (
        <button
          key={String(id)}
          type="button"
          onClick={() => {
            if (id != null) tryJoin(id);
          }}
          className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 transition ${
            active ? "bg-gray-100" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium truncate text-gray-800">
              {title || `Chat ${String(id)}`}
            </div>
            {unread > 0 && (
              <span className="ml-2 inline-flex min-w-[18px] h-[18px] rounded-full bg-[#25d366] text-white text-[11px] items-center justify-center px-1">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
          {lastLabel && (
            <div className="text-[11px] text-gray-500">{lastLabel}</div>
          )}
        </button>
      );
    },
    (prev, next) => {
      // shallow compare important props to avoid unnecessary rerenders
      try {
        const ida = String(prev.it?.id_chat ?? prev.it?.id ?? "");
        const idb = String(next.it?.id_chat ?? next.it?.id ?? "");
        if (ida !== idb) return false;
        const atA = String(
          prev.it?.last_message_at ?? prev.it?.updated_at ?? ""
        );
        const atB = String(
          next.it?.last_message_at ?? next.it?.updated_at ?? ""
        );
        if (atA !== atB) return false;
        return true;
      } catch {
        return false;
      }
    }
  );

  const ChatList = React.memo(function ChatList({
    list,
    nameOf,
    tryJoin,
    activeChatId,
  }: ChatListProps) {
    return (
      <>
        {list.map((it) => (
          <ChatListItem
            key={String(it?.id_chat ?? it?.id ?? Math.random())}
            it={it}
            nameOf={nameOf}
            tryJoin={tryJoin}
            activeChatId={activeChatId}
          />
        ))}
      </>
    );
  });

  async function send() {
    const val = text.trim();
    const hasAttachments = attachments.length > 0;
    if (!val && !hasAttachments) return;
    setText("");
    try {
      const sio = sioRef.current;
      if (!sio) return;
      if (chatIdRef.current == null) {
        dbg("send: no chatId, ensuring…", {
          hasAttachments,
          textLen: val.length,
        });
        // Para alumno, permitir crear únicamente al momento de enviar su primer mensaje
        const ok = await ensureChatReadyForSend({ allowCreate: true });
        if (chatIdRef.current == null) {
          for (let i = 0; i < 15 && chatIdRef.current == null; i++) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        if (!ok || chatIdRef.current == null) {
          dbg("send: still no chatId → abort");
          return;
        }
      }
      // 1) Enviar primero el mensaje de texto (si hay)
      if (val) {
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
          } else if (role === "alumno") {
            const mineCli = parts.find(
              (p: any) =>
                normalizeTipo(p?.participante_tipo) === "cliente" &&
                (!socketio?.idCliente ||
                  String(p?.id_cliente) === String(socketio?.idCliente))
            );
            if (mineCli?.id_chat_participante != null)
              effectivePid = mineCli.id_chat_participante;
          } else if (role === "admin") {
            const mineAdm = parts.find(
              (p: any) =>
                normalizeTipo(p?.participante_tipo) === "admin" &&
                (!socketio?.idAdmin ||
                  String(p?.id_admin) === String(socketio?.idAdmin))
            );
            if (mineAdm?.id_chat_participante != null)
              effectivePid = mineAdm.id_chat_participante;
          }
        }
        if (effectivePid == null) {
          dbg("send: resolving myParticipantId…");
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
            } else if (role === "alumno") {
              const mineCli = parts.find(
                (p: any) =>
                  normalizeTipo(p?.participante_tipo) === "cliente" &&
                  (!socketio?.idCliente ||
                    String(p?.id_cliente) === String(socketio?.idCliente))
              );
              if (mineCli?.id_chat_participante != null) {
                effectivePid = mineCli.id_chat_participante;
                break;
              }
            } else if (role === "admin") {
              const mineAdm = parts.find(
                (p: any) =>
                  normalizeTipo(p?.participante_tipo) === "admin" &&
                  (!socketio?.idAdmin ||
                    String(p?.id_admin) === String(socketio?.idAdmin))
              );
              if (mineAdm?.id_chat_participante != null) {
                effectivePid = mineAdm.id_chat_participante;
                break;
              }
            }
          }
        }
        dbg("emit chat.message.send", {
          id_chat: chatIdRef.current,
          pid: effectivePid,
          textLen: val.length,
        });
        // Fijar myParticipantId si aún no está establecido
        if (myParticipantId == null && effectivePid != null) {
          setMyParticipantId(effectivePid);
          myParticipantIdRef.current = effectivePid;
        }
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
          uiKey: clientId,
        };
        // Asignar client_session al optimista
        (optimistic as any).client_session = clientSessionRef.current;

        setItems((prev) => [...prev, optimistic]);
        seenRef.current.add(clientId);
        outboxRef.current.push({
          clientId,
          text: val,
          at: Date.now(),
          pid: effectivePid,
        });

        // Forzar permanencia al fondo al enviar (experiencia de chat)
        try {
          const sc = scrollRef.current;
          const br = bottomRef.current;
          if (sc) {
            sc.scrollTop = sc.scrollHeight;
          }
          if (br) br.scrollIntoView({ behavior: "auto", block: "end" });
          pinnedToBottomRef.current = true;
          setNewMessagesCount(0);
        } catch {}

        if (chatIdRef.current == null || effectivePid == null) {
          // logging eliminado
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
              dbg("send ack", {
                success: !(ack && ack.success === false),
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
                // Asegurar scroll al fondo tras ACK
                try {
                  const sc = scrollRef.current;
                  const br = bottomRef.current;
                  if (sc) sc.scrollTop = sc.scrollHeight;
                  if (br) br.scrollIntoView({ behavior: "auto", block: "end" });
                  pinnedToBottomRef.current = true;
                  setNewMessagesCount(0);
                } catch {}
              } catch {}
            } catch {}
          }
        );
        markRead();
      }

      // 2) Enviar adjuntos después del mensaje
      if (hasAttachments) {
        setUploadError(null);
        try {
          await uploadFiles(attachments.map((a) => a.file));
          clearAttachments();
          // Fallback: refrescar mensajes del chat por si el servidor no emitió 'chat.message' para adjuntos
          try {
            const current = chatIdRef.current;
            if (current != null) {
              const sio = sioRef.current;
              sio?.emit("chat.join", { id_chat: current }, (ack: any) => {
                try {
                  if (!ack || ack.success === false) return;
                  const data = ack.data || {};
                  const msgsSrc = Array.isArray(data.messages)
                    ? data.messages
                    : Array.isArray((data as any).mensajes)
                    ? (data as any).mensajes
                    : [];
                  const myPidLocal =
                    data?.my_participante ?? myParticipantIdRef.current;
                  const mapped: Message[] = msgsSrc.map((m: any) => {
                    const ev = evalSenderForMapping(m, current, "join");
                    const sender: Sender = ev.sender;
                    const msg: Message = {
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
                      attachments: mapArchivoToAttachments(m),
                      uiKey: String(
                        m?.id_mensaje ?? `${Date.now()}-${Math.random()}`
                      ),
                    } as Message;
                    (msg as any).__senderById = !!ev.byId;
                    (msg as any).__senderReason = ev.reason;
                    return msg;
                  });
                  const reconciled = reconcilePreserveSender(mapped);
                  const merged = mergePreservingOptimistics(reconciled);
                  setItems(merged);
                  try {
                    merged.forEach((mm) => seenRef.current.add(mm.id));
                  } catch {}
                } catch {}
              });
            }
          } catch {}
        } catch (e: any) {
          setUploadError(e?.message || "Error al subir adjuntos");
        }
      }
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
      // logging eliminado
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

  // mine definition moved to top
  const formatTime = React.useCallback((iso: string | undefined) => {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString("es-ES", {
        timeZone: "UTC",
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
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
      // errores silenciados por política: no imprimir en consola
    }
  }

  const [dragActive, setDragActive] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  return (
    <>
      <div
        className={`relative h-full flex ${
          role === "alumno" ? "flex-row" : "flex-col"
        } w-full min-h-0 chat-root ${className || ""}`}
        onDragEnter={(e) => {
          try {
            if (e.dataTransfer?.types?.includes("Files")) {
              dragCounterRef.current += 1;
              setDragActive(true);
            }
          } catch {}
        }}
        onDragOver={(e) => {
          try {
            if (e.dataTransfer?.types?.includes("Files")) {
              e.preventDefault();
              setDragActive(true);
            }
          } catch {}
        }}
        onDragLeave={() => {
          dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
          if (dragCounterRef.current === 0) setDragActive(false);
        }}
        onDrop={(e) => {
          // Evitar doble manejo si el drop ocurre sobre un hijo que ya lo procesó (p.ej. la barra inferior)
          if (e.defaultPrevented) {
            dragCounterRef.current = 0;
            setDragActive(false);
            return;
          }
          try {
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
              e.preventDefault();
              addPendingAttachments(e.dataTransfer.files);
            }
          } catch {}
          dragCounterRef.current = 0;
          setDragActive(false);
        }}
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <div className="rounded-xl bg-background/95 px-4 py-3 shadow-lg border">
              <div className="text-sm font-medium">Suelta para adjuntar</div>
              <div className="text-xs text-muted-foreground">
                Máx. 50MB por archivo
              </div>
            </div>
          </div>
        )}
        {role === "alumno" && (
          <div
            className={`${
              isMobile && chatId ? "hidden" : "flex"
            } md:flex flex-col w-[280px] flex-shrink-0 border-r border-gray-200 bg-white`}
          >
            <div className="px-3 py-2 border-b bg-gray-50 text-xs text-gray-600">
              Conversaciones
            </div>
            <div className="flex-1 overflow-y-auto">
              {convList.length === 0 ? (
                <div className="p-3 text-xs text-gray-700">
                  <div className="mb-2 text-xs text-gray-500">
                    Sin conversaciones. Contactos asignados:
                  </div>
                  {contacts.length === 0 ? (
                    <div className="text-xs text-gray-400">Sin contactos</div>
                  ) : (
                    contacts.map((c, idx) => (
                      <button
                        key={`${c.codigo_equipo}-${idx}`}
                        type="button"
                        className="w-full text-left px-3 py-2 border-b hover:bg-gray-50 transition"
                        onClick={() => {
                          setChatId(null);
                          chatIdRef.current = null;
                          // Seleccionar participantes: alumno + equipo; NO crear aún.
                          participantsRef.current = [
                            {
                              participante_tipo: "cliente",
                              id_cliente: String(
                                (socketio as any)?.idCliente || ""
                              ),
                            },
                            {
                              participante_tipo: "equipo",
                              id_equipo: String(c.codigo_equipo),
                            },
                          ];
                          // Intentar unir si ya existe; si no, esperar a envío.
                          ensureChatReadyForSend({ onlyFind: true });
                        }}
                      >
                        <div className="text-sm font-medium truncate text-gray-800">
                          {nameOf("equipo", c.codigo_equipo)}
                        </div>
                        {c.area && (
                          <div className="text-[11px] text-gray-500">
                            {c.area}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <ChatList
                  list={convList}
                  nameOf={nameOf}
                  tryJoin={tryJoin}
                  activeChatId={chatIdRef.current ?? chatId}
                />
              )}
            </div>
          </div>
        )}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            isMobile && !chatId ? "hidden" : "flex"
          }`}
        >
          <div
            className={`flex items-center justify-between px-3 transition-all duration-300 bg-[#075E54] text-white ${
              headerCollapsed ? "py-1.5" : "py-2 md:px-4 md:py-3"
            }`}
          >
            {!headerCollapsed ? (
              <>
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 mr-2">
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="p-1 mr-1 rounded-full hover:bg-white/10 text-white md:hidden"
                      title="Volver"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-[#128C7E] flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0">
                    {(title || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate leading-tight">
                      {title}
                    </div>
                    {subtitle && (
                      <div className="text-[10px] md:text-xs text-gray-200 truncate leading-tight">
                        {subtitle}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  <div
                    className="flex items-center gap-1.5"
                    title={connected ? "Conectado" : "Desconectado"}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        connected ? "bg-green-400" : "bg-white/30"
                      }`}
                    />
                    <span className="text-xs text-gray-200 hidden sm:inline">
                      {connected ? "en línea" : "offline"}
                    </span>
                  </div>
                  {/* Botón para crear chat manual si aún no existe */}
                  {/*  {!chatIdRef.current && !chatId && (
              <button
                onClick={async () => {
                  if (creatingChat) return;
                  setCreatingChat(true);
                  try {
                    await ensureChatReadyForSend();
                  } catch {}
                  setCreatingChat(false);
                }}
                disabled={creatingChat}
                className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 transition disabled:opacity-60 whitespace-nowrap"
                title="Crear conversación"
              >
                {creatingChat ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>}
                <span className="hidden sm:inline">{creatingChat ? "Creando…" : "Crear chat"}</span>
                <span className="sm:hidden">Crear</span>
              </button>
            )} */}
                  {role !== "alumno" && (
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
                  )}
                  {role !== "alumno" && (
                    <button
                      onClick={() => {
                        if (selectionMode) {
                          setSelectionMode(false);
                          setSelectedMessageIds(new Set());
                          setSelectedAttachmentIds(new Set());
                        } else {
                          setSelectionMode(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 transition"
                      title={
                        selectionMode
                          ? "Cancelar selección"
                          : "Activar selección de mensajes y archivos"
                      }
                    >
                      {selectionMode ? "Cancelar" : "Seleccionar"}
                    </button>
                  )}
                  {selectionMode && (
                    <span className="text-[11px] px-2 py-1 rounded bg-white/10 text-white">
                      {selectedMessageIds.size} msg /{" "}
                      {selectedAttachmentIds.size} adj
                    </span>
                  )}
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
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                            conversación
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
                          {String(chatIdRef.current ?? chatId ?? "")}. Esta
                          acción no se puede deshacer.
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
                  <button
                    onClick={() => setHeaderCollapsed(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 focus:outline-none"
                    title="Contraer encabezado"
                  >
                    <ChevronUp className="h-4 w-4 text-white" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="p-1 rounded-full hover:bg-white/10 text-white md:hidden"
                      title="Volver"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="h-6 w-6 rounded-full bg-[#128C7E] flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                    {(title || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs font-medium truncate">{title}</div>
                </div>
                <button
                  onClick={() => setHeaderCollapsed(false)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 focus:outline-none"
                  title="Expandir encabezado"
                >
                  <ChevronDown className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </div>

          <div
            ref={scrollRef}
            onScroll={onScrollContainer}
            className="relative flex-1 overflow-y-auto px-4 py-2 bg-[#ECE5DD]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23d9d9d9' fillOpacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              scrollbarGutter: "stable both-edges",
              overscrollBehavior: "contain",
              overflowY: "scroll",
            }}
          >
            {isJoining && items.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <div className="text-sm text-gray-500">
                    Cargando mensajes…
                  </div>
                </div>
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
                const isSelected =
                  selectionMode && selectedMessageIds.has(m.id);

                let radius = "rounded-lg";
                if (isMine) {
                  if (newGroup && !endGroup)
                    radius = "rounded-lg rounded-br-sm";
                  if (!newGroup && !endGroup)
                    radius =
                      "rounded-tr-sm rounded-br-sm rounded-tl-lg rounded-bl-lg";
                  if (!newGroup && endGroup)
                    radius = "rounded-lg rounded-tr-sm";
                } else {
                  if (newGroup && !endGroup)
                    radius = "rounded-lg rounded-bl-sm";
                  if (!newGroup && !endGroup)
                    radius =
                      "rounded-tl-sm rounded-bl-sm rounded-tr-lg rounded-br-lg";
                }

                const wrapperMt = newGroup ? "mt-1" : "mt-0.5";

                const hasAudioOnly =
                  Array.isArray(m.attachments) &&
                  m.attachments.some((a) =>
                    (a.mime || "").startsWith("audio/")
                  ) &&
                  (!m.text || m.text.trim() === "");

                const isAttachmentOnly =
                  Array.isArray(m.attachments) &&
                  m.attachments.length > 0 &&
                  (!m.text || m.text.trim() === "");

                return (
                  <div
                    key={m.uiKey || m.id}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    } ${wrapperMt}`}
                  >
                    <div
                      onClick={() => {
                        if (selectionMode && !isAttachmentOnly)
                          toggleMessageSelection(m.id);
                      }}
                      className={`relative ${
                        selectionMode && !isAttachmentOnly
                          ? "cursor-pointer"
                          : "cursor-default"
                      } w-fit ${
                        hasAudioOnly
                          ? "p-0 bg-transparent shadow-none"
                          : "max-w-[90%] md:max-w-[85%] px-2.5 py-1.5 md:px-3 md:py-2 shadow-sm " +
                            (isMine ? "bg-[#DCF8C6]" : "bg-white")
                      } ${radius} ${
                        isSelected ? "ring-2 ring-violet-500" : ""
                      }`}
                    >
                      {selectionMode && !isAttachmentOnly && (
                        <>
                          <div className="absolute inset-0 z-10 bg-transparent" />
                          <span
                            className={`absolute -top-2 -left-2 h-5 w-5 rounded-full text-[11px] grid place-items-center z-20 ${
                              isSelected
                                ? "bg-violet-600 text-white"
                                : "bg-gray-300 text-gray-700"
                            }`}
                          >
                            {isSelected ? "✓" : "+"}
                          </span>
                        </>
                      )}
                      {m.text?.trim() ? (
                        <div className="text-sm md:text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-[1.3]">
                          {renderTextWithLinks(m.text)}
                        </div>
                      ) : null}
                      {Array.isArray(m.attachments) &&
                        m.attachments.length > 0 &&
                        (hasAudioOnly ? (
                          <div className="mt-0">
                            {m.attachments
                              .filter((a) =>
                                (a.mime || "").startsWith("audio/")
                              )
                              .map((a) => {
                                const url = getAttachmentUrl(a);
                                const timeLabel = ""; // formatTime(m.at);
                                const attSelected =
                                  selectionMode &&
                                  selectedAttachmentIds.has(a.id);
                                return (
                                  <div
                                    key={a.id}
                                    className={`rounded-md relative ${
                                      attSelected
                                        ? "ring-2 ring-violet-500"
                                        : ""
                                    }`}
                                    onClick={(e) => {
                                      if (selectionMode) {
                                        e.stopPropagation();
                                        toggleAttachmentSelection(a.id);
                                      }
                                    }}
                                  >
                                    <AudioBubble
                                      src={url}
                                      isMine={isMine}
                                      timeLabel={timeLabel}
                                    />
                                    {selectionMode && (
                                      <span
                                        className={`absolute -top-2 -left-2 h-5 w-5 rounded-full text-[11px] grid place-items-center z-20 ${
                                          attSelected
                                            ? "bg-violet-600 text-white"
                                            : "bg-gray-300 text-gray-700"
                                        }`}
                                      >
                                        {attSelected ? "✓" : "+"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div
                            className={`mt-2 grid ${
                              (m.attachments?.length || 0) === 1
                                ? "grid-cols-1"
                                : "grid-cols-2"
                            } gap-2 w-fit`}
                          >
                            {m.attachments.map((a) => {
                              const url = getAttachmentUrl(a);
                              const isImg = (a.mime || "").startsWith("image/");
                              const isVideo = (a.mime || "").startsWith(
                                "video/"
                              );
                              const isAudio = (a.mime || "").startsWith(
                                "audio/"
                              );
                              const attSelected =
                                selectionMode &&
                                selectedAttachmentIds.has(a.id);
                              if (isAudio) {
                                const timeLabel = ""; // formatTime(m.at);
                                return (
                                  <div
                                    key={a.id}
                                    className={`rounded-md relative ${
                                      attSelected
                                        ? "ring-2 ring-violet-500"
                                        : ""
                                    }`}
                                    onClick={(e) => {
                                      if (selectionMode) {
                                        e.stopPropagation();
                                        toggleAttachmentSelection(a.id);
                                      }
                                    }}
                                  >
                                    <AudioBubble
                                      src={url}
                                      isMine={isMine}
                                      timeLabel={timeLabel}
                                    />
                                    {selectionMode && (
                                      <span
                                        className={`absolute -top-2 -left-2 h-5 w-5 rounded-full text-[11px] grid place-items-center z-20 ${
                                          attSelected
                                            ? "bg-violet-600 text-white"
                                            : "bg-gray-300 text-gray-700"
                                        }`}
                                      >
                                        {attSelected ? "✓" : "+"}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              if (isVideo) {
                                return (
                                  <div
                                    key={a.id}
                                    onClick={(e) => {
                                      if (selectionMode) {
                                        e.stopPropagation();
                                        toggleAttachmentSelection(a.id);
                                      }
                                    }}
                                    className={`rounded-md overflow-hidden bg-white/60 relative ${
                                      selectionMode ? "cursor-pointer" : ""
                                    } ${
                                      attSelected
                                        ? "ring-2 ring-violet-500"
                                        : ""
                                    }`}
                                  >
                                    <VideoPlayer
                                      src={url}
                                      className="h-full w-full max-h-40"
                                      selectMode={selectionMode}
                                      onSelect={() =>
                                        toggleAttachmentSelection(a.id)
                                      }
                                    />
                                    {selectionMode && (
                                      <span
                                        className={`absolute top-1 left-1 h-5 w-5 rounded-full text-[11px] grid place-items-center ${
                                          attSelected
                                            ? "bg-violet-600 text-white"
                                            : "bg-gray-300 text-gray-700"
                                        }`}
                                      >
                                        {attSelected ? "✓" : "+"}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={(e) => {
                                    if (selectionMode) {
                                      e.stopPropagation();
                                      toggleAttachmentSelection(a.id);
                                    } else if (isImg && url) {
                                      setFullImageSrc(url);
                                    } else {
                                      openPreview(a);
                                    }
                                  }}
                                  className={`relative rounded-md bg-white/60 text-left px-2 py-2 flex items-center gap-2 border border-gray-200 shadow-sm ${
                                    selectionMode
                                      ? "cursor-pointer"
                                      : "cursor-default"
                                  } ${
                                    attSelected ? "ring-2 ring-violet-500" : ""
                                  }`}
                                  title={a.name}
                                  style={{ width: 220 }}
                                >
                                  {isImg ? (
                                    <img
                                      src={url || "/placeholder.svg"}
                                      alt={a.name}
                                      className="h-9 w-9 rounded object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded bg-gray-200 grid place-items-center text-[10px] font-medium text-gray-700 flex-shrink-0">
                                      DOC
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-medium text-gray-800 truncate">
                                      {a.name}
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate">
                                      {(a.mime || "").split("/")[1] ||
                                        "archivo"}
                                    </div>
                                  </div>
                                  {selectionMode && (
                                    <span
                                      className={`absolute top-1 left-1 h-5 w-5 rounded-full text-[11px] grid place-items-center ${
                                        attSelected
                                          ? "bg-violet-600 text-white"
                                          : "bg-gray-300 text-gray-700"
                                      }`}
                                    >
                                      {attSelected ? "✓" : "+"}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      {!hasAudioOnly && (
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
                              {!m.delivered ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : m.read ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCheck className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {loadingMessages && items.length > 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-4 bg-transparent">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow">
                  <Loader2 className="h-3 w-3 animate-spin text-gray-600" />
                  <span className="text-xs text-gray-600">Actualizando…</span>
                </div>
              </div>
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
            {/* Indicador de nuevos mensajes (flotante) */}
            {newMessagesCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  try {
                    const sc = scrollRef.current;
                    if (sc) {
                      sc.scrollTop = sc.scrollHeight;
                      pinnedToBottomRef.current = true;
                    }
                  } catch {}
                  setNewMessagesCount(0);
                }}
                className="fixed md:absolute right-4 md:right-4 bottom-20 md:bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#25d366] text-white shadow-md px-3 py-1.5 text-sm hover:bg-[#1ebe57] transition"
                title={`${newMessagesCount} nuevo${
                  newMessagesCount === 1 ? "" : "s"
                }`}
              >
                <span className="min-w-[18px] h-[18px] rounded-full bg-white/20 grid place-items-center text-[11px] font-semibold px-1">
                  {newMessagesCount > 99 ? "99+" : newMessagesCount}
                </span>
                Nuevos mensajes
              </button>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            className="sticky bottom-0 z-20 flex-shrink-0 px-2 py-2 md:px-3 md:py-3 bg-[#F0F0F0] border-t border-gray-200 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
            onDragOver={(e) => {
              try {
                if (e.dataTransfer?.types?.includes("Files")) {
                  e.preventDefault();
                }
              } catch {}
            }}
            onDrop={(e) => {
              try {
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  e.preventDefault();
                  addPendingAttachments(e.dataTransfer.files);
                }
              } catch {}
            }}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
                // Permitimos todos los tipos; el backend decidirá cómo manejarlos
                accept="*/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title={uploading ? "Subiendo archivos…" : "Adjuntar archivos"}
                className="p-1.5 md:p-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Paperclip className="w-5 h-5 md:w-5 md:h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  // Toggle grabación de audio
                  if (recording) {
                    // Pequeño delay para asegurar que el último chunk se capture
                    setTimeout(() => {
                      try {
                        mediaRecorderRef.current?.stop();
                      } catch {}
                      setRecording(false);
                      try {
                        if (recordTimerRef.current) {
                          clearInterval(recordTimerRef.current);
                          recordTimerRef.current = null;
                        }
                        setRecordStartAt(null);
                      } catch {}
                    }, 500); // 500ms de buffer final
                  } else {
                    (async () => {
                      try {
                        if (
                          typeof navigator === "undefined" ||
                          !navigator.mediaDevices?.getUserMedia
                        ) {
                          setUploadError(
                            "Grabación no soportada en este navegador."
                          );
                          return;
                        }
                        // Estrategia robusta de getUserMedia
                        // 1) { audio: true } (deja que el navegador elija)
                        // 2) Si falla, { audio: { echoCancellation, noiseSuppression } }
                        // 3) Si aún falla, detecta un deviceId disponible y úsalo
                        let stream: MediaStream | null = null;
                        let firstErr: any = null;
                        try {
                          stream = await navigator.mediaDevices.getUserMedia({
                            audio: true,
                          });
                        } catch (e1: any) {
                          firstErr = e1;
                          try {
                            stream = await navigator.mediaDevices.getUserMedia({
                              audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                              } as any,
                            });
                          } catch (e2: any) {
                            try {
                              const devices =
                                await navigator.mediaDevices.enumerateDevices();
                              const mics = devices.filter(
                                (d) => d.kind === "audioinput"
                              );
                              if (mics.length > 0 && mics[0].deviceId) {
                                stream =
                                  await navigator.mediaDevices.getUserMedia({
                                    audio: {
                                      deviceId: { exact: mics[0].deviceId },
                                    } as any,
                                  });
                              } else {
                                throw e2;
                              }
                            } catch (e3: any) {
                              throw firstErr || e2 || e3;
                            }
                          }
                        }
                        recordedChunksRef.current = [];
                        const mimes = [
                          "audio/webm;codecs=opus",
                          "audio/webm",
                          "audio/ogg;codecs=opus",
                          "audio/ogg",
                          "audio/mp4",
                          "audio/aac",
                        ];
                        let mimeType: string | undefined = undefined;
                        for (const c of mimes) {
                          if (
                            (window as any).MediaRecorder?.isTypeSupported?.(c)
                          ) {
                            mimeType = c;
                            break;
                          }
                        }
                        const mr = new MediaRecorder(
                          stream,
                          mimeType ? { mimeType } : undefined
                        );
                        mediaRecorderRef.current = mr;
                        mr.ondataavailable = (ev) => {
                          if (ev.data && ev.data.size > 0)
                            recordedChunksRef.current.push(ev.data);
                        };
                        mr.onstop = () => {
                          try {
                            const chosenType =
                              mr.mimeType || mimeType || "audio/webm";
                            const blob = new Blob(recordedChunksRef.current, {
                              type: chosenType,
                            });
                            // Validar que haya datos
                            if (blob.size === 0) {
                              console.warn("Audio grabado vacío");
                              return;
                            }

                            // Convertir a MP3
                            convertBlobToMp3(blob)
                              .then((mp3File) => {
                                if ((mp3File.size || 0) > MAX_FILE_SIZE) {
                                  setUploadError(
                                    "El audio grabado excede el límite de 50MB y no se adjuntará."
                                  );
                                } else {
                                  addPendingAttachments([mp3File] as any);
                                }
                              })
                              .catch((err) => {
                                console.error(
                                  "Error convirtiendo a MP3, usando original",
                                  err
                                );
                                const ts = new Date();
                                const pad = (n: number) =>
                                  String(n).padStart(2, "0");
                                const ext = (() => {
                                  const t = (blob.type || "").toLowerCase();
                                  if (t.includes("ogg")) return "ogg";
                                  if (t.includes("mp4") || t.includes("aac"))
                                    return "m4a";
                                  return "webm";
                                })();
                                const fname = `grabacion-${ts.getFullYear()}${pad(
                                  ts.getMonth() + 1
                                )}${pad(ts.getDate())}-${pad(
                                  ts.getHours()
                                )}${pad(ts.getMinutes())}${pad(
                                  ts.getSeconds()
                                )}.${ext}`;
                                const file = new File([blob], fname, {
                                  type: blob.type || chosenType,
                                });
                                if ((file.size || 0) > MAX_FILE_SIZE) {
                                  setUploadError(
                                    "El audio grabado excede el límite de 50MB y no se adjuntará."
                                  );
                                } else {
                                  addPendingAttachments([file] as any);
                                }
                              });
                          } catch {
                            setUploadError(
                              "No se pudo procesar el audio grabado."
                            );
                          }
                          try {
                            stream.getTracks().forEach((t) => t.stop());
                          } catch {}
                          try {
                            if (recordTimerRef.current) {
                              clearInterval(recordTimerRef.current);
                              recordTimerRef.current = null;
                            }
                            setRecordStartAt(null);
                          } catch {}
                        };
                        // Usar timeslice de 1000ms para asegurar chunks periódicos
                        mr.start(1000);
                        setRecording(true);
                        try {
                          setRecordStartAt(Date.now());
                          recordTimerRef.current = setInterval(
                            () => setRecordTick(Date.now()),
                            250
                          );
                        } catch {}
                      } catch (err: any) {
                        const name = err?.name || "";
                        if (
                          name === "NotFoundError" ||
                          name === "DevicesNotFoundError"
                        ) {
                          setUploadError(
                            "No se encontró un micrófono. Conecta uno y revisa los permisos del navegador."
                          );
                        } else if (
                          name === "NotAllowedError" ||
                          name === "PermissionDeniedError"
                        ) {
                          setUploadError(
                            "Permiso de micrófono denegado. Habilítalo en el navegador para grabar audio."
                          );
                        } else if (name === "NotReadableError") {
                          setUploadError(
                            "El micrófono está siendo usado por otra aplicación o no es accesible."
                          );
                        } else {
                          setUploadError(
                            (err?.message ||
                              "No se pudo iniciar la grabación") +
                              " (" +
                              (name || "error") +
                              ")"
                          );
                        }
                      }
                    })();
                  }
                }}
                title={recording ? "Detener grabación" : "Grabar audio"}
                className={`p-1.5 md:p-2 rounded-md transition-colors flex-shrink-0 ${
                  recording
                    ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {recording ? (
                  <Square className="w-4 h-4 md:w-4 md:h-4" />
                ) : (
                  <Mic className="w-5 h-5 md:w-5 md:h-5" />
                )}
              </button>
              {recording && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  <span>
                    {(() => {
                      const ms = Math.max(
                        0,
                        recordStartAt ? recordTick - recordStartAt : 0
                      );
                      const s = Math.floor(ms / 1000);
                      const mm = Math.floor(s / 60);
                      const ss = String(s % 60).padStart(2, "0");
                      return `${mm}:${ss}`;
                    })()}
                  </span>
                  <span className="opacity-70">Grabando…</span>
                </div>
              )}
              {attachments.length > 0 && (
                <div className="flex-1 overflow-x-auto">
                  <div className="flex items-center gap-2">
                    {attachments.map((a, i) => (
                      <div
                        key={i}
                        className="group relative flex items-center gap-2 rounded-md border bg-white px-2 py-1 text-xs text-gray-700"
                      >
                        {a.preview ? (
                          // Pequeña miniatura si es imagen/video
                          a.file.type.startsWith("image/") ? (
                            <img
                              src={a.preview}
                              alt={a.file.name}
                              className="h-6 w-6 rounded object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded bg-gray-200 grid place-items-center text-[10px]">
                              {a.file.type.startsWith("video/")
                                ? "VID"
                                : a.file.type.startsWith("audio/")
                                ? "AUD"
                                : "FILE"}
                            </div>
                          )
                        ) : (
                          <div className="h-6 w-6 rounded bg-gray-200 grid place-items-center text-[10px]">
                            FILE
                          </div>
                        )}
                        <div className="max-w-[160px] truncate">
                          {a.file.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="ml-1 rounded px-1 text-gray-500 hover:text-gray-800"
                          title="Quitar adjunto"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value.trim()) notifyTyping(true);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                    e.preventDefault();
                    send();
                  } else {
                    notifyTyping(true);
                  }
                }}
                placeholder="Mensaje"
                rows={1}
                className="flex-1 bg-white border border-gray-300 rounded-3xl px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-[15px] focus:outline-none focus:border-[#128C7E] transition-colors shadow-sm min-w-0 resize-none overflow-y-auto"
                style={{ minHeight: "42px", maxHeight: "120px" }}
              />
              <button
                onClick={send}
                disabled={
                  uploading || (!text.trim() && attachments.length === 0)
                }
                className="p-2 md:p-2.5 rounded-full bg-[#128C7E] text-white disabled:opacity-50 disabled:bg-gray-400 hover:bg-[#075E54] transition-colors shadow flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
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
                )}
              </button>
            </div>
            {uploadError && (
              <div className="mt-2 text-xs text-rose-600">{uploadError}</div>
            )}
            {(uploading || uploadState.active) && (
              <div className="mt-1 text-[11px] text-gray-700 flex items-center gap-2">
                <span className="inline-block h-3 w-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                <span>
                  Subiendo archivos {uploadState.done}/{uploadState.total}
                  {uploadState.current ? ` — ${uploadState.current}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal: Vista previa de adjuntos (extraído) */}
      <AttachmentPreviewModal
        open={previewOpen}
        onOpenChange={(o: boolean) => {
          setPreviewOpen(o);
          if (!o) setPreviewAttachment(null);
        }}
        attachment={previewAttachment}
        getAttachmentUrl={getAttachmentUrl}
        formatBytes={formatBytes}
      />
      {/* Vista a pantalla completa solo para imágenes */}
      {fullImageSrc && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setFullImageSrc(null)}
        >
          <img
            src={fullImageSrc}
            alt="Imagen adjunta"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
      {/* Modal: Ticket generado por IA (extraído) */}
      <TicketGenerationModal
        open={ticketModalOpen}
        onOpenChange={setTicketModalOpen}
        loading={ticketLoading}
        error={ticketError}
        data={ticketData}
        onConfirm={() => setTicketModalOpen(false)}
      />
    </>
  );
}
