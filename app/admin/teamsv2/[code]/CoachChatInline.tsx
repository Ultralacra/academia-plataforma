"use client";
import React from "react";
import AudioBubble from "@/app/admin/teamsv2/[code]/AudioBubble";
import VideoPlayer from "@/components/chat/VideoPlayer";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { TicketGenerationModal } from "./TicketGenerationModal";
import {
  Sender,
  Attachment,
  Message,
  SocketIOConfig,
  TicketData,
} from "./chat-types";
import {
  simpleMarkdownToHtml,
  parseAiContent,
  formatBytes as formatBytesUtil,
} from "./chat-utils";
import { getAttachmentUrl } from "./chat-attachments";
import {
  recordRecentUpload,
  hasRecentUploadMatch,
  hasRecentUploadLoose,
} from "./chat-recent-upload";
import {
  getEmitter,
  normalizeDateStr,
  normalizeTipo,
  nowLocalIso,
  formatBackendLocalLabel,
} from "./chat-core";
import { convertBlobToMp3 } from "@/lib/audio-converter";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST, apiFetch, buildUrl } from "@/lib/api-config";
import { playNotificationSound } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tipos movidos a ./chat-types

// Debug simple: imprime siempre con contexto de rol y sala
function chatDebug(): boolean {
  return true;
}
function dbg(...args: any[]) {
  try {
    // Prefijo consistente para facilitar lectura
    console.log("[Chat]", ...args);
  } catch {}
}

// Pistas de subida movidas a ./chat-recent-upload

// Config movida a ./chat-types
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
  joinSignal,
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
  joinSignal?: number;
  listParams?: any;
  onChatsList?: (list: any[]) => void;
  resolveName?: (tipo: "equipo" | "cliente" | "admin", id: string) => string;
  onBack?: () => void;
}) {
  const isMobile = useIsMobile();
  const normRoom = React.useMemo(
    () => (room || "").trim().toLowerCase(),
    [room]
  );
  const mine = React.useCallback(
    (s: Sender) => {
      const sender = String(s || "").toLowerCase();
      const r = String(role || "").toLowerCase();
      // En backend suele venir como participante_tipo: cliente/equipo/admin,
      // mientras la UI usa role: alumno/coach/admin.
      if (r === "alumno") return sender === "alumno" || sender === "cliente";
      if (r === "coach") return sender === "coach" || sender === "equipo";
      if (r === "admin") return sender === "admin" || sender === "usuario";
      return sender === r;
    },
    [role]
  );
  // Límite de tamaño por archivo: 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const [connected, setConnected] = React.useState(false);
  const [items, setItems] = React.useState<Message[]>([]);
  const itemsRef = React.useRef<Message[]>([]);
  React.useEffect(() => {
    itemsRef.current = items;
    if (!chatDebug()) return;
    if (items.length > 0) {
      console.log(
        "[CoachChatInline] Lista de horas:",
        items.map((m) => ({
          id: m.id,
          text: (m.text || "").slice(0, 20),
          at: m.at,
          dateObj: new Date(m.at),
          localTime: new Date(m.at).toLocaleTimeString(),
        }))
      );
    }
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
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingMsg, setEditingMsg] = React.useState<Message | null>(null);
  const [editText, setEditText] = React.useState<string>("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
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

  const applyEditToItems = React.useCallback(
    (idMsg: any, nuevo: string, editedAt?: string) => {
      try {
        if (!idMsg) return;
        const idStr = String(idMsg);
        const at = String(editedAt || nowLocalIso());
        setItems((prev) =>
          prev.map((m) =>
            String(m.id) === idStr
              ? ({
                  ...m,
                  text: String(nuevo ?? ""),
                  edited: true,
                  editedAt: at,
                } as Message)
              : m
          )
        );
      } catch {}
    },
    []
  );

  const openEditForMessage = React.useCallback((m: Message) => {
    try {
      setEditingMsg(m);
      setEditText(String(m?.text ?? ""));
      setEditError(null);
      setEditOpen(true);
    } catch {}
  }, []);

  const submitEdit = React.useCallback(async () => {
    if (!editingMsg) return;
    const nuevo = String(editText ?? "").trim();
    if (!nuevo) return;
    try {
      setEditError(null);
      const sio = sioRef.current;
      let cid = chatIdRef.current;
      dbg("edit:submit", {
        role,
        connected,
        hasSocket: !!sio,
        socketConnected: !!sio?.connected,
        chatId: cid,
        id_mensaje: editingMsg?.id,
      });

      if (!sio) {
        setEditError("No hay conexión con el chat (socket no inicializado).");
        dbg("edit:abort:no-socket");
        return;
      }
      if (!connected || !sio.connected) {
        setEditError(
          "No estás conectado al chat todavía. Intenta nuevamente en unos segundos."
        );
        dbg("edit:abort:not-connected", {
          connectedState: connected,
          socketConnected: !!sio?.connected,
        });
        return;
      }
      if (cid == null) {
        dbg("edit:no chatId, ensuring…", {
          participants: Array.isArray(participantsRef.current)
            ? participantsRef.current.length
            : 0,
        });
        try {
          await ensureChatReadyForSend({ onlyFind: true });
        } catch {}
        cid = chatIdRef.current;
        if (cid == null) {
          setEditError(
            "No se pudo resolver el chat (id_chat vacío). Abre el chat y vuelve a intentar."
          );
          dbg("edit:abort:still-no-chatId");
          return;
        }
      }

      const oldText = String(editingMsg.text ?? "");
      const oldEditedAt = (editingMsg as any).editedAt as string | undefined;

      setEditSaving(true);
      applyEditToItems(editingMsg.id, nuevo, nowLocalIso());

      const pid = (() => {
        const direct = myParticipantIdRef.current;
        if (direct != null) return direct;
        if (editingMsg.srcParticipantId != null)
          return editingMsg.srcParticipantId;
        try {
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
              return mine.id_chat_participante;
          } else if (role === "alumno") {
            const mineCli = parts.find(
              (p: any) =>
                normalizeTipo(p?.participante_tipo) === "cliente" &&
                (!socketio?.idCliente ||
                  String(p?.id_cliente) === String(socketio?.idCliente))
            );
            if (mineCli?.id_chat_participante != null)
              return mineCli.id_chat_participante;
          } else if (role === "admin") {
            const mineAdm = parts.find(
              (p: any) =>
                normalizeTipo(p?.participante_tipo) === "admin" &&
                (!socketio?.idAdmin ||
                  String(p?.id_admin) === String(socketio?.idAdmin))
            );
            if (mineAdm?.id_chat_participante != null)
              return mineAdm.id_chat_participante;
          }
        } catch {}
        return undefined;
      })();

      sio.emit(
        "chat.message.edit",
        {
          id_mensaje: editingMsg.id,
          id_chat: cid,
          nuevo_contenido: nuevo,
          id_chat_participante_emisor: pid,
          client_session: clientSessionRef.current,
        },
        (ack: any) => {
          try {
            dbg("edit:ack", ack);
            if (!ack || ack.success === false) {
              applyEditToItems(editingMsg.id, oldText, oldEditedAt);
              const msg =
                String(ack?.message || ack?.error || "") ||
                "El servidor rechazó la edición.";
              setEditError(msg);
              return;
            }
            const data = ack.data || {};
            const serverId = data?.id_mensaje ?? data?.id ?? editingMsg.id;
            const serverText =
              data?.nuevo_contenido ?? data?.contenido ?? data?.texto ?? nuevo;
            const serverEditedAt =
              normalizeDateStr(
                data?.fecha_edicion_local ?? data?.fecha_edicion
              ) || nowLocalIso();
            applyEditToItems(
              serverId,
              String(serverText),
              String(serverEditedAt)
            );
            try {
              window.dispatchEvent(
                new CustomEvent("chat:list-refresh", {
                  detail: { reason: "message-edited", id_chat: cid },
                })
              );
            } catch {}
          } catch {}
        }
      );

      setEditOpen(false);
      setEditingMsg(null);
    } catch {
      // best-effort
    } finally {
      setEditSaving(false);
    }
  }, [editingMsg, editText, applyEditToItems]);

  const sioRef = React.useRef<any>(null);
  const chatIdRef = React.useRef<string | number | null>(
    socketio?.chatId ?? null
  );
  const myParticipantIdRef = React.useRef<string | number | null>(null);
  const seenRef = React.useRef<Set<string>>(new Set());
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = React.useRef<boolean>(true);
  const wasPinnedToBottomRef = React.useRef<boolean>(true);
  const lastMarkedReadMsgIdRef = React.useRef<string | null>(null);
  const lastMarkReadAtRef = React.useRef<number>(0);
  const markReadRef = React.useRef<null | (() => void)>(null);
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

  // Log when parent updates participants (helpful for debugging selection)
  React.useEffect(() => {
    try {
      if (socketio?.participants) {
        console.log(
          "[CoachChatInline] socketio.participants changed (selection):",
          socketio.participants
        );
      }
    } catch {}
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
      const participantsChanged = key !== lastPartsKeyRef.current;

      if (participantsChanged) {
        lastPartsKeyRef.current = key;
        if (!precreateOnParticipants) return;

        // Si cambiaron los participantes, usamos el chatId que venga en props (si existe)
        // o reseteamos a null para buscar/crear.
        const nextChatId = socketio?.chatId ?? null;

        setChatId(nextChatId);
        chatIdRef.current = nextChatId;

        // Limpiar mensajes anteriores
        setItems([]);
        seenRef.current = new Set();
        setOtherTyping(false);
        lastJoinedChatIdRef.current = null;
        setLoadingMessages(true);
      } else {
        // Si no cambiaron participantes, pero nos llega un chatId nuevo (ej. se resolvió asíncronamente)
        if (
          socketio?.chatId &&
          String(socketio.chatId) !== String(chatIdRef.current)
        ) {
          setChatId(socketio.chatId);
          chatIdRef.current = socketio.chatId;
          // Recargar
          setItems([]);
          seenRef.current = new Set();
          setOtherTyping(false);
          lastJoinedChatIdRef.current = null;
          setLoadingMessages(true);
        }
      }
    } catch {}
  }, [socketio?.participants, precreateOnParticipants, socketio?.chatId]);

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
        const found = await ensureChatReadyForSend({ onlyFind: true });
        if (!found) {
          setLoadingMessages(false);
        }
      } catch {
        setLoadingMessages(false);
      }
    })();
  }, [connected, precreateOnParticipants, socketio?.participants]);

  // Forzar intento de unión cuando se recibe joinSignal explícito (sin crear)
  React.useEffect(() => {
    (async () => {
      try {
        if (!connected) return;
        const parts = participantsRef.current ?? socketio?.participants;
        if (!Array.isArray(parts) || parts.length === 0) return;
        // Solo buscar y unir si existe; NO crear en selección de contacto
        await ensureChatReadyForSend({ onlyFind: true });
      } catch {}
    })();
  }, [joinSignal, connected, socketio?.participants]);

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

  // Sonido sólo lo dispara el handler de realtime; evitamos sonar al cargar historial

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
    const nextPinned = distance <= threshold;
    const prevPinned = wasPinnedToBottomRef.current;
    pinnedToBottomRef.current = nextPinned;
    wasPinnedToBottomRef.current = nextPinned;
    if (nextPinned) {
      setNewMessagesCount(0);
      // Si volvimos al fondo, ahora sí marcamos como leído (best-effort)
      try {
        if (connected && chatIdRef.current != null) {
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "visible"
          ) {
            // Evitar spam si el scroll dispara muchos eventos
            const now = Date.now();
            if (!prevPinned && now - lastMarkReadAtRef.current > 800) {
              sioRef.current?.emit("chat.read.all", {
                id_chat: chatIdRef.current,
              });
              markReadRef.current?.();
              lastMarkReadAtRef.current = now;
            }
          }
        }
      } catch {}
    }
  }, [connected]);

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

  // Notificación sonora al recibir mensajes (evitar bloqueos de autoplay)
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const unlockedRef = React.useRef(false);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
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
        // Prime a tiny silent play to satisfy autoplay policies
        if (!audioElRef.current) {
          const el = document.createElement("audio");
          // Embed WAV data URI como fallback; si luego subes /sounds/notify.mp3, puedes cambiar el src.
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
      // 1) Intentar <audio> si existe fuente
      const el = audioElRef.current;
      if (el) {
        el.currentTime = 0;
        el.volume = 1.0;
        el.play().catch(() => {});
        return;
      }
      // 2) Fallback: breve beep con WebAudio
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880; // beep agudo
      gain.gain.value = 0.001; // volumen bajo
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }, []);

  // Subida de archivos al chat actual mediante FormData
  async function uploadFiles(selected: FileList | File[]) {
    try {
      setUploadError(null);
      if (!selected || ("length" in selected && selected.length === 0)) return;

      // Asegurar que exista chatId
      if (chatIdRef.current == null) {
        const ok = await ensureChatReadyForSend({ allowCreate: true });
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
          at: nowLocalIso(),
          delivered: false,
          read: false,
          srcParticipantId: myParticipantIdRef.current ?? undefined,
          attachments: [optimisticAttachment],
          uiKey: optimisticId,
        };
        // Attach client_session for robust deduplication
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
    (tipo: "equipo" | "cliente" | "admin", id: any): string => {
      try {
        const s = String(id ?? "");
        if (!s) return s;
        if (typeof resolveName === "function") {
          const n = resolveName(tipo, s);
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

  const senderReasonRank = React.useCallback((reason: any): number => {
    const r = String(reason || "");
    if (r === "byId") return 5;
    if (r === "bySession") return 4;
    if (r === "byOutbox") return 4;
    if (r === "byParticipantType") return 3;
    if (r === "byRecentUpload") return 2;
    if (r.startsWith("fallback")) return 1;
    return 0;
  }, []);

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
            String(
              normalizeDateStr(m?.fecha_envio_local ?? m?.fecha_envio) || ""
            )
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
        // Evita colisiones cuando el otro envía el mismo texto.
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

        // Nota: algunos backends propagan `client_session` del receptor en eventos realtime.
        // Para evitar misclasificar como "mío", sólo usamos session si ya hay evidencia
        // (outbox/recent) de que fue un eco de envío local, o en contexto "user".
        const senderIsBySessionRaw =
          !!m?.client_session &&
          String(m.client_session) === String(clientSessionRef.current);
        const senderIsBySession =
          (ctx === "user" || senderIsByOutbox || senderIsByRecent) &&
          senderIsBySessionRaw;

        // Tipo de participante cuando aplique.
        // Importante: preferir el tipo resuelto por `id_chat_participante_emisor`
        // (según la lista de participantes del JOIN), porque algunos eventos realtime
        // traen `participante_tipo` incorrecto/ambiguo y eso rompe la alineación.
        const tipoFromPid =
          emitter != null ? getTipoByParticipantId(emitter) : "";
        const tipoNorm = tipoFromPid
          ? tipoFromPid
          : normalizeTipo(
              m?.participante_tipo ||
                m?.emisor_tipo ||
                m?.tipo_emisor ||
                m?.remitente_tipo
            );
        const senderIsByTipoKnown =
          tipoNorm === "cliente" ||
          tipoNorm === "equipo" ||
          tipoNorm === "admin";
        const senderIsByTipo = senderIsByTipoKnown;

        let final: Sender;
        let reason = "unknown";

        if (senderIsById) {
          reason = "byId";
          final = role;
        } else {
          // Regla clave: en REALTIME, si no hay emisor por ID confiable,
          // NO asumimos "mío". Sólo aceptamos tipo explícito; si no, asumimos "otro".
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
              else final = role;
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
    [role, getTipoByParticipantId]
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
            normalizeDateStr(obj?.fecha_envio_local ?? obj?.fecha_envio) ||
              nowLocalIso()
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
        const attKeySoft = (arr?: Attachment[]) => {
          const list = arr || [];
          const cat = (m?: string) => (m || "").split("/")[0];
          const count = list.length;
          const sizeSum = list.reduce((s, a) => s + (a?.size || 0), 0);
          const cats = Array.from(new Set(list.map((a) => cat(a?.mime))))
            .sort()
            .join(",");
          return `${count}|${sizeSum}|${cats}`;
        };
        const sameAtts = attKey(m.attachments) === attKey(msg.attachments);
        const softAtts =
          attKeySoft(m.attachments) === attKeySoft(msg.attachments);

        // Si hay match por sesión, ignoramos sender/text (asumimos que es la confirmación)
        // Si no, usamos la heurística estándar
        if (sessionMatch || (near && sameSender && sameText && sameAtts)) {
          // fusionar como delivered
          const byId = (msg as any).__senderById === true;
          const preserveSender =
            !byId &&
            m.sender &&
            m.sender !== msg.sender &&
            senderReasonRank((m as any).__senderReason) >
              senderReasonRank((msg as any).__senderReason);
          next[i] = {
            ...msg,
            sender: preserveSender ? m.sender : msg.sender,
            read: m.read || msg.read,
            at: m.at, // Preservar timestamp local
          } as Message;
          return next;
        }
        // Fallback para multimedia renombrado por el servidor (nombre distinto):
        if (near && sameSender && sameText && softAtts) {
          const byId = (msg as any).__senderById === true;
          const preserveSender =
            !byId &&
            m.sender &&
            m.sender !== msg.sender &&
            senderReasonRank((m as any).__senderReason) >
              senderReasonRank((msg as any).__senderReason);
          next[i] = {
            ...msg,
            sender: preserveSender ? m.sender : msg.sender,
            read: m.read || msg.read,
            at: m.at, // Preservar timestamp local
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
              const keepOld =
                senderReasonRank((old as any).__senderReason) >
                senderReasonRank((m as any).__senderReason);
              if (keepOld) return { ...m, sender: old.sender } as Message;
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
      const one = src?.archivo ?? src?.Archivo ?? null;
      const many = src?.archivos ?? src?.Archivos ?? null;
      const list = Array.isArray(many) ? many : one ? [one] : [];
      const atts: Attachment[] = [];
      for (const it of list) {
        if (!it) continue;
        atts.push({
          id: String(
            it?.id_archivo ?? it?.id ?? `${Date.now()}-${Math.random()}`
          ),
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
      const timestamp = Date.now();
      localStorage.setItem(key, String(timestamp));
      console.log("[Chat] 📖 MARCANDO COMO LEÍDO", {
        chatId,
        role,
        timestamp: new Date(timestamp).toISOString(),
        stack: new Error().stack?.split("\n").slice(1, 4).join("\n"),
      });
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
    markReadRef.current = markRead;
  }, [markRead]);

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
          console.log("[CoachChatInline] Token de conexión:", token);
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
              transports: ["websocket"],
              timeout: 20000,
            })
          : io({
              auth: { token },
              transports: ["websocket"],
              timeout: 20000,
            });
        sioRef.current = sio;
        try {
          if (
            typeof window !== "undefined" &&
            process.env.NODE_ENV !== "production"
          ) {
            const w = window as any;
            w.__academiaChatSockets = w.__academiaChatSockets || {};
            w.__academiaChatSockets[String(role || "unknown")] = sio;
          }
        } catch {}
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
                      normalizeDateStr(
                        m?.fecha_envio_local ?? m?.fecha_envio
                      ) || nowLocalIso()
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
                // Merge incremental estable: actualizar por id y añadir nuevos al final, sin reordenar lo existente
                setItems((prev) => {
                  const byId = new Map<string, any>();
                  prev.forEach((m) => byId.set(String(m.id), m));
                  const next = [...prev];
                  // Actualizar existentes
                  for (const m of fresh) {
                    const id = String(m.id);
                    if (byId.has(id)) {
                      const idx = next.findIndex((x) => String(x.id) === id);
                      if (idx >= 0) next[idx] = { ...byId.get(id), ...m };
                    }
                  }
                  // Añadir nuevos (orden del servidor) sin tocar los existentes
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
            // Log explícito cuando el emisor es un alumno/cliente
            try {
              const tipoNormMsg = normalizeTipo(
                msg?.participante_tipo || undefined
              );
              if (tipoNormMsg === "cliente") {
                const emitter = getEmitter(msg);
                console.log("[CoachChatInline] ← Mensaje de alumno", {
                  id_chat: msg?.id_chat,
                  id_mensaje: msg?.id_mensaje ?? msg?.id,
                  texto_preview: String(
                    msg?.contenido ?? msg?.texto ?? ""
                  ).slice(0, 140),
                  participante_tipo: msg?.participante_tipo,
                  id_cliente: msg?.id_cliente,
                  id_equipo: msg?.id_equipo,
                  email_emisor: msg?.email_emisor,
                  nombre_emisor: msg?.nombre_emisor,
                  client_session: msg?.client_session,
                  emitter_participante: emitter,
                });
              }
            } catch {}
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
                const isMineBySession =
                  !!msg?.client_session &&
                  String(msg.client_session) ===
                    String(clientSessionRef.current);
                const tipoNormOther = normalizeTipo(
                  msg?.participante_tipo || undefined
                );
                const isMineByTipoOther = (() => {
                  if (role === "coach") {
                    return (
                      tipoNormOther === "equipo" &&
                      socketio?.idEquipo != null &&
                      String(msg?.id_equipo ?? "") === String(socketio.idEquipo)
                    );
                  }
                  if (role === "alumno") {
                    return (
                      tipoNormOther === "cliente" &&
                      (socketio as any)?.idCliente != null &&
                      String(msg?.id_cliente ?? "") ===
                        String((socketio as any).idCliente)
                    );
                  }
                  return false;
                })();
                if (!isMineById && !isMineBySession && !isMineByTipoOther) {
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
            const senderIsMeBySession =
              !!msg?.client_session &&
              String(msg.client_session) === String(clientSessionRef.current);
            let senderIsMeByOutbox = false;
            let matchedClientId: string | null = null;
            try {
              const txt = String(msg?.contenido ?? msg?.texto ?? "").trim();
              const tMsg = Date.parse(
                String(
                  normalizeDateStr(
                    msg?.fecha_envio_local ?? msg?.fecha_envio
                  ) || ""
                )
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
            const tipoNorm = normalizeTipo(msg?.participante_tipo || undefined);
            const senderIsMeByTipo = (() => {
              if (role === "coach") {
                return (
                  tipoNorm === "equipo" &&
                  socketio?.idEquipo != null &&
                  String(msg?.id_equipo ?? "") === String(socketio.idEquipo)
                );
              }
              if (role === "alumno") {
                return (
                  tipoNorm === "cliente" &&
                  (socketio as any)?.idCliente != null &&
                  String(msg?.id_cliente ?? "") ===
                    String((socketio as any).idCliente)
                );
              }
              return false;
            })();

            if (
              !senderIsMeById &&
              !senderIsMeBySession &&
              !senderIsMeByOutbox &&
              !senderIsMeByRecent &&
              !senderIsMeByTipo &&
              !mine(tipoNorm as unknown as Sender)
            ) {
              console.log(
                "[CoachChatInline] Playing sound for incoming message"
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
                normalizeDateStr(msg?.fecha_envio_local ?? msg?.fecha_envio) ||
                  nowLocalIso()
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
              // Evitar reorden intermitente: permitir fusiones sólo con evidencia fuerte (misma sesión)
              for (let i = next.length - 1; i >= 0; i--) {
                const mm = next[i];
                const tNew = Date.parse(newMsg.at || "");
                const tOld = Date.parse(mm.at || "");
                // Reducimos tolerancia a 15s para minimizar fusiones ambiguas
                const near =
                  !isNaN(tNew) && !isNaN(tOld) && Math.abs(tNew - tOld) < 15000;
                const sameText =
                  (mm.text || "").trim() === (newMsg.text || "").trim();
                const sameAtts =
                  attKey(mm.attachments) === attKey(newMsg.attachments);

                // Si coincide texto y adjuntos, y es reciente (o es mi sesión explícita), fusionamos
                const isMyOptimistic =
                  mm.sender === role && mm.delivered === false;
                // Sólo fusionar si es mi sesión y coincide el texto
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
            // ⚠️ COMENTADO: No marcar automáticamente como leído al recibir mensaje
            // markRead();
            console.log(
              "[Chat] ⚠️ markRead() NO ejecutado automáticamente al recibir mensaje"
            );
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

        const applyMessageEdit = (data: any) => {
          try {
            const currentChatId = chatIdRef.current;
            const idChat = data?.id_chat ?? data?.chatId ?? null;
            if (
              idChat != null &&
              currentChatId != null &&
              String(idChat) !== String(currentChatId)
            ) {
              try {
                window.dispatchEvent(
                  new CustomEvent("chat:list-refresh", {
                    detail: {
                      reason: "message-edit-other-chat",
                      id_chat: idChat,
                    },
                  })
                );
              } catch {}
              return;
            }

            const idMsg = data?.id_mensaje ?? data?.id ?? null;
            if (!idMsg) return;
            const nuevo = String(
              data?.nuevo_contenido ?? data?.contenido ?? data?.texto ?? ""
            );
            const editedAt = String(
              normalizeDateStr(
                data?.fecha_edicion_local ?? data?.fecha_edicion
              ) || nowLocalIso()
            );

            applyEditToItems(idMsg, nuevo, editedAt);

            try {
              window.dispatchEvent(
                new CustomEvent("chat:list-refresh", {
                  detail: {
                    reason: "message-edited",
                    id_chat: currentChatId,
                  },
                })
              );
            } catch {}
          } catch {}
        };
        try {
          sio.on("chat.message.edit", applyMessageEdit);
          sio.on("chat.message.edited", applyMessageEdit);
        } catch {}
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
        console.log("[Chat] 🔄 POLLING ejecutándose", {
          chatId: current,
          role,
          timeSinceLastRealtime: since,
        });
        sio.emit("chat.join", { id_chat: current }, (ack: any) => {
          try {
            if (!ack || ack.success === false) return;
            const data = ack.data || {};
            // Actualizar título con el nombre del contacto del chat actual
            try {
              const name = resolveContactNameFromChat(data);
              if (name) setDisplayTitle(name);
            } catch {}
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
                  normalizeDateStr(m?.fecha_envio_local ?? m?.fecha_envio) ||
                    nowLocalIso()
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
    const t = setTimeout(() => {
      setIsJoining(false);
      setLoadingMessages(false);
    }, 6000);
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
                normalizeDateStr(m?.fecha_envio_local ?? m?.fecha_envio) ||
                  nowLocalIso()
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

              console.log("--- [DEBUG] CONVERSACIÓN ALUMNO ---");
              console.log("Chat ID:", cid);
              console.log("Participantes:", joinedParticipantsRef.current);
              console.log("Mensajes:", mapped);
              console.log("-----------------------------------");
            } catch {}
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
      // Algunos backends limitan chat.list por defecto (ej. 50). Forzamos un tamaño alto.
      limit: base?.limit ?? 5000,
      pageSize: base?.pageSize ?? 5000,
      page: base?.page ?? 1,
      offset: base?.offset ?? 0,
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

          if (Array.isArray(ack?.data)) {
            console.log("--- LISTA DE CHATS RECIBIDA DEL SERVIDOR ---");

            // DETECTAR CONVERSACIONES DUPLICADAS
            const chatIds = new Map<string, number>();
            const duplicates: any[] = [];
            ack.data.forEach((c: any, i: number) => {
              const id = String(c?.id_chat ?? c?.id ?? "");
              if (id) {
                if (chatIds.has(id)) {
                  duplicates.push({
                    id,
                    index: i,
                    previousIndex: chatIds.get(id),
                  });
                  console.error("🚨 CONVERSACIÓN DUPLICADA DETECTADA:", {
                    id_chat: id,
                    indice_actual: i,
                    indice_previo: chatIds.get(id),
                    chat_actual: c,
                  });
                }
                chatIds.set(id, i);
              }

              // Resolver nombre del contacto desde otros_participantes / my_participante_nombre
              const arr = Array.isArray((c as any)?.otros_participantes)
                ? (c as any).otros_participantes
                : [];
              const cliente = arr.find(
                (p: any) =>
                  String(p?.participante_tipo || "").toLowerCase() === "cliente"
              );
              const equipo = arr.find(
                (p: any) =>
                  String(p?.participante_tipo || "").toLowerCase() === "equipo"
              );
              const contactName =
                cliente?.nombre_participante ||
                equipo?.nombre_participante ||
                null;
              const myName = (c as any)?.my_participante_nombre || null;
              console.log(`[${i}]`, {
                id_chat: c?.id_chat ?? c?.id ?? null,
                my_participante: c?.my_participante ?? null,
                my_participante_nombre: myName,
                otros_participantes: arr,
                resolved_contact_name: contactName,
              });
            });

            if (duplicates.length > 0) {
              console.error("🚨🚨🚨 RESUMEN DE DUPLICADOS:", {
                total_duplicados: duplicates.length,
                duplicados: duplicates,
              });
            } else {
              console.log("✅ No se detectaron conversaciones duplicadas");
            }
            console.log("--------------------------------------------");

            // Usar el nombre del contacto del chat activo (si existe); de lo contrario, el primero
            try {
              const currentId = chatIdRef.current ?? chatId ?? null;
              let target = null as any;
              if (currentId) {
                target = ack.data.find(
                  (c: any) =>
                    String(c?.id_chat ?? c?.id ?? "") === String(currentId)
                );
              }
              if (!target) target = ack.data[0];
              if (target) {
                const arr = Array.isArray((target as any)?.otros_participantes)
                  ? (target as any).otros_participantes
                  : [];
                const cliente = arr.find(
                  (p: any) =>
                    String(p?.participante_tipo || "").toLowerCase() ===
                    "cliente"
                );
                const equipo = arr.find(
                  (p: any) =>
                    String(p?.participante_tipo || "").toLowerCase() ===
                    "equipo"
                );
                const contactName =
                  cliente?.nombre_participante ||
                  equipo?.nombre_participante ||
                  null;
                if (contactName && typeof contactName === "string") {
                  setDisplayTitle(contactName);
                }
              }
            } catch {}
          }

          // Logging eliminado para optimizar rendimiento
          /*
          try {
            const baseArr = Array.isArray(ack?.data) ? ack.data : [];
            // ... logs eliminados ...
          } catch {}
          */
          if (ack && ack.success === false) return;
          const list = Array.isArray(ack?.data) ? ack.data : [];
          const baseList: any[] = Array.isArray(list) ? list : [];

          const needEnrich = baseList.some(
            (it) => !Array.isArray(it?.participants || it?.participantes)
          );

          // Enviar SIEMPRE la lista base inmediatamente para render instantáneo en UI
          try {
            onChatsList?.(baseList);
          } catch {}

          // También actualizar el título desde la lista base por si aún no se han enriquecido los participantes
          try {
            const currentId = chatIdRef.current ?? chatId ?? null;
            let target = null as any;
            if (currentId) {
              target = baseList.find(
                (c: any) =>
                  String(c?.id_chat ?? c?.id ?? "") === String(currentId)
              );
            }
            if (!target) target = baseList[0];
            if (target) {
              const arr = Array.isArray((target as any)?.otros_participantes)
                ? (target as any).otros_participantes
                : [];
              const cliente = arr.find(
                (p: any) =>
                  String(p?.participante_tipo || "").toLowerCase() === "cliente"
              );
              const equipo = arr.find(
                (p: any) =>
                  String(p?.participante_tipo || "").toLowerCase() === "equipo"
              );
              const contactName =
                cliente?.nombre_participante ||
                equipo?.nombre_participante ||
                null;
              if (contactName && typeof contactName === "string") {
                setDisplayTitle(contactName);
              }
            }
          } catch {}

          // Si hace falta enriquecer, proceder en segundo plano y reenviar luego
          if (!needEnrich) {
            return;
          }

          // Enriquecer inmediatamente sin throttle para resolver nombres rápido
          lastEnrichAtRef.current = Date.now();
          const sorted = [...baseList]
            .sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a))
            .slice(0, 50);
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
          // Logging eliminado
          /*
          try {
            const toLine3 = (it: any) => {
               // ...
            };
            // ...
          } catch {}
          */
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
        // Algunos backends limitan chat.list por defecto (ej. 50). Forzamos un tamaño alto.
        limit: base?.limit ?? 5000,
        pageSize: base?.pageSize ?? 5000,
        page: base?.page ?? 1,
        offset: base?.offset ?? 0,
        include_participants: true,
        with_participants: true,
        includeParticipants: true,
        withParticipants: true,
      } as any;
      sio.emit("chat.list", payload, async (ack: any) => {
        try {
          if (ack && ack.success === false) return;
          const list = Array.isArray(ack?.data) ? ack.data : [];
          dbg("chat.list immediate", { payload, count: list.length });

          // Optimización: Enriquecer chats prioritarios en paralelo
          try {
            const sorted = [...list].sort((a: any, b: any) => {
              const ta = new Date(
                a.last_message_at || a.updated_at || a.created_at || 0
              ).getTime();
              const tb = new Date(
                b.last_message_at || b.updated_at || b.created_at || 0
              ).getTime();
              return tb - ta;
            });

            // Tomamos los más recientes que necesiten datos
            const toEnrich = sorted.slice(0, 50).filter((c: any) => {
              const parts = c.participants || c.participantes;
              return !Array.isArray(parts) || parts.length === 0;
            });

            if (toEnrich.length > 0) {
              await Promise.all(
                toEnrich.map((chat: any) => {
                  return new Promise<void>((resolve) => {
                    const id = chat.id_chat || chat.id;
                    if (!id) return resolve();
                    sio.emit("chat.get", { id_chat: id }, (res: any) => {
                      if (res?.success && res?.data) {
                        const full = res.data;
                        // Actualizamos el objeto en memoria (referencia)
                        if (full.participants || full.participantes) {
                          chat.participants =
                            full.participants || full.participantes;
                        }
                        if (full.last_message) {
                          chat.last_message = full.last_message;
                        }
                      }
                      resolve();
                    });
                  });
                })
              );
            }
          } catch (err) {
            console.error("Error enriching chats", err);
          }

          onChatsList?.(list);
        } catch {}
      });
    } catch {}
  }, [connected, role, socketio?.idEquipo, onChatsList]);

  React.useEffect(() => {
    if (!connected || chatId == null) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    // Importante: NO marcar como le eddo si el usuario est viendo mensajes antiguos (scroll arriba)
    if (!pinnedToBottomRef.current) return;
    try {
      const last = itemsRef.current.length
        ? itemsRef.current[itemsRef.current.length - 1]
        : null;
      if (!last) return;
      const lastId = String(last.id ?? "");
      if (!lastId) return;
      if (lastMarkedReadMsgIdRef.current === lastId) return;

      sioRef.current?.emit("chat.read.all", { id_chat: chatId });
      markRead();
      lastMarkedReadMsgIdRef.current = lastId;
      lastMarkReadAtRef.current = Date.now();
    } catch {}
  }, [items.length, connected, chatId, markRead]);

  async function ensureChatReadyForSend(opts?: {
    onlyFind?: boolean;
    allowCreate?: boolean;
  }): Promise<boolean> {
    try {
      if (chatId != null) return true;
      const sio = sioRef.current;
      if (!sio) return false;
      const participants = participantsRef.current ?? socketio?.participants;
      if (!Array.isArray(participants) || participants.length === 0)
        return false;
      const baseAutoCreate =
        socketio?.autoCreate !== undefined ? socketio.autoCreate : false;
      // Política:
      // - coach/admin: respetan baseAutoCreate (por defecto false)
      // - alumno: crea SOLO cuando se llama explícitamente con allowCreate=true
      //   (ignora baseAutoCreate para evitar creaciones accidentales en join/selección)
      const autoCreate =
        role === "alumno" ? !!opts?.allowCreate : baseAutoCreate;
      dbg("ensureChatReadyForSend:start", {
        autoCreate,
        count: participants.length,
      });

      // Resolver código de equipo para alumno si falta (igual que versión previa)
      // FIX: Solo intentar resolver si NO hay ningún equipo en participants.
      // Si ya viene un equipo (aunque sea numérico), respetarlo para no sobrescribir la selección del panel.
      if (role === "alumno") {
        try {
          const hasAnyEquipo = (arr: any[]) =>
            (arr || []).some(
              (p) => normalizeTipo(p?.participante_tipo) === "equipo"
            );

          if (!hasAnyEquipo(participants) && (socketio as any)?.idCliente) {
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
            if (codeEquipo) {
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
              limit: (listPayload as any)?.limit ?? 5000,
              pageSize: (listPayload as any)?.pageSize ?? 5000,
              page: (listPayload as any)?.page ?? 1,
              offset: (listPayload as any)?.offset ?? 0,
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
        console.log("[DEBUG] Chat encontrado existente:", matched);
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
                  // Force list refresh on join existing
                  try {
                    const evt = new CustomEvent("chat:list-refresh", {
                      detail: {
                        reason: "chat-joined-existing",
                        id_chat: cid,
                      },
                    });
                    window.dispatchEvent(evt);
                  } catch {}
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
                  try {
                    const msgsSrc = Array.isArray(data.messages)
                      ? data.messages
                      : Array.isArray((data as any).mensajes)
                      ? (data as any).mensajes
                      : [];
                    const mapped: Message[] = msgsSrc.map((m: any) => {
                      const ev = evalSenderForMapping(m, cid, "join");
                      const sender: Sender = ev.sender;
                      return {
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
                          normalizeDateStr(
                            m?.fecha_envio_local ?? m?.fecha_envio
                          ) || nowLocalIso()
                        ),
                        delivered: true,
                        read: !!m?.leido,
                        srcParticipantId: getEmitter(m),
                        attachments: mapArchivoToAttachments(m),
                        uiKey: String(
                          m?.id_mensaje ?? `${Date.now()}-${Math.random()}`
                        ),
                      } as Message;
                    });
                    console.log("[CoachChatInline] JOIN OK", {
                      chatId: cid,
                      mensajes_count: mapped.length,
                    });
                    console.log("[CoachChatInline] MENSAJES (array)", mapped);
                  } catch {}
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
            try {
              console.log(
                "[CoachChatInline] Emitting create event:",
                eventName,
                "participants:",
                participants
              );
            } catch {}
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
                    // Force list refresh on creation
                    try {
                      const evt = new CustomEvent("chat:list-refresh", {
                        detail: {
                          reason: "chat-created-local",
                          id_chat: cid,
                        },
                      });
                      window.dispatchEvent(evt);
                    } catch {}
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

      console.log(
        "[DEBUG] Resultado creación chat:",
        created,
        "ChatID:",
        chatIdRef.current
      );

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
          at: nowLocalIso(),
          delivered: false,
          read: false,
          srcParticipantId: effectivePid ?? undefined,
          uiKey: clientId,
        };
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
                        normalizeDateStr(
                          m?.fecha_envio_local ?? m?.fecha_envio
                        ) || nowLocalIso()
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
    // Mostrar solo día + hora (sin conversiones de zona horaria)
    return formatBackendLocalLabel(iso, { showDate: true, showTime: true });
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

  const [displayTitle, setDisplayTitle] = React.useState<string>(title || "");
  const resolveContactNameFromChat = (chat: any): string | null => {
    try {
      const arr = Array.isArray((chat as any)?.otros_participantes)
        ? (chat as any).otros_participantes
        : [];
      const cliente = arr.find(
        (p: any) =>
          String(p?.participante_tipo || "").toLowerCase() === "cliente"
      );
      const equipo = arr.find(
        (p: any) =>
          String(p?.participante_tipo || "").toLowerCase() === "equipo"
      );
      const name =
        cliente?.nombre_participante || equipo?.nombre_participante || null;
      return typeof name === "string" && name.trim() ? name : null;
    } catch {
      return null;
    }
  };

  // Establecer el título inmediatamente desde los participantes pasados por props (sin esperar a chat.list)
  React.useEffect(() => {
    try {
      const parts = Array.isArray(socketio?.participants)
        ? socketio?.participants
        : [];
      if (parts.length > 0) {
        // Priorizar cliente; si no hay, equipo distinto al del coach
        const cliente = parts.find(
          (p: any) =>
            String(p?.participante_tipo || "").toLowerCase() === "cliente"
        );
        const equipo = parts.find(
          (p: any) =>
            String(p?.participante_tipo || "").toLowerCase() === "equipo" &&
            (socketio?.idEquipo == null ||
              String(p?.id_equipo) !== String(socketio?.idEquipo))
        );
        const name =
          cliente?.nombre_participante || equipo?.nombre_participante || null;
        if (name && typeof name === "string") {
          setDisplayTitle(name);
        }
      }
    } catch {}
  }, [socketio?.participants, socketio?.idEquipo]);

  const [dragActive, setDragActive] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  const dragHasFiles = (e: React.DragEvent) => {
    try {
      const dt = e.dataTransfer;
      if (!dt) return false;
      if (dt.files && dt.files.length > 0) return true;
      const items = Array.from(dt.items || []);
      if (items.some((it) => it.kind === "file")) return true;
      const types = Array.from((dt.types as any) || []) as string[];
      return (
        types.includes("Files") || types.includes("application/x-moz-file")
      );
    } catch {
      return false;
    }
  };

  return (
    <>
      <div
        className={`relative h-full flex flex-col w-full min-h-0 chat-root bg-[#EFEAE2] ${
          className || ""
        }`}
        onDragEnter={(e) => {
          try {
            if (dragHasFiles(e)) {
              dragCounterRef.current += 1;
              setDragActive(true);
            }
          } catch {}
        }}
        onDragOver={(e) => {
          try {
            if (dragHasFiles(e)) {
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
          // Si un hijo ya procesó el drop (p.ej. barra inferior), no duplicar.
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
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div className="rounded-xl bg-white/95 px-4 py-3 shadow-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-900">
                Suelta para adjuntar
              </div>
              <div className="text-xs text-gray-600">Máx. 50MB por archivo</div>
            </div>
          </div>
        )}
        {/* Header estilo WhatsApp Web */}
        <div
          className={`flex items-center justify-between px-4 transition-all duration-300 bg-[#F0F2F5] border-b border-[#d1d7db] z-10 flex-shrink-0 ${
            headerCollapsed ? "h-[40px] py-1" : "h-[60px] py-2.5"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {onBack && role !== "alumno" && (
              <button
                onClick={onBack}
                className="p-1 mr-1 rounded-full hover:bg-black/10 text-[#54656f] md:hidden"
                title="Volver"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            {!headerCollapsed && (
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0 overflow-hidden">
                {/* Avatar placeholder o inicial */}
                {(displayTitle || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="text-[#111b21] text-base font-normal leading-tight truncate">
                {displayTitle}
              </div>
              {!headerCollapsed &&
                (subtitle ? (
                  <div className="text-[13px] text-[#667781] truncate leading-tight">
                    {subtitle}
                  </div>
                ) : (
                  <div className="text-[13px] text-[#667781] truncate leading-tight h-4">
                    {/* Espacio reservado para estado o subtítulo */}
                  </div>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 text-[#54656f]">
            {/* Indicador de conexión discreto */}
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? "bg-green-500" : "bg-red-400"
              }`}
              title={connected ? "Conectado" : "Desconectado"}
            />

            {role !== "alumno" && (
              <button
                onClick={handleGenerateTicket}
                disabled={!(chatIdRef.current ?? chatId) || ticketLoading}
                className="p-2 rounded-full hover:bg-black/5 transition disabled:opacity-50"
                title="Generar ticket"
              >
                <Sparkles className="h-5 w-5" />
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
                className={`p-2 rounded-full hover:bg-black/5 transition ${
                  selectionMode ? "bg-[#d9fdd3]" : ""
                }`}
                title={
                  selectionMode ? "Cancelar selección" : "Seleccionar mensajes"
                }
              >
                <div className="text-xs font-bold border-2 border-current rounded px-1">
                  ✓
                </div>
              </button>
            )}

            <button
              onClick={() => setHeaderCollapsed(!headerCollapsed)}
              className="p-2 rounded-full hover:bg-black/5 transition focus:outline-none"
              title={
                headerCollapsed ? "Expandir encabezado" : "Contraer encabezado"
              }
            >
              {headerCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>

            {/* Botón eliminar chat: solo para admin */}
            {role === "admin" && (
              <AlertDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 rounded-full hover:bg-black/5 focus:outline-none"
                      title="Más opciones"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-rose-600 focus:text-rose-700">
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar chat
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
                      Se eliminarán los mensajes del chat. Esta acción no se
                      puede deshacer.
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
            )}
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScrollContainer}
          className="relative flex-1 overflow-y-auto px-4 py-2"
          style={{
            backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
            backgroundRepeat: "repeat",
            backgroundSize: "400px",
            backgroundColor: "#EFEAE2", // Fallback color
          }}
        >
          {isJoining && items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <div className="text-sm text-gray-500">Cargando mensajes…</div>
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
              const newGroup = !samePrev;

              const isSelected = selectionMode && selectedMessageIds.has(m.id);

              let radius = "rounded-lg";
              if (isMine) {
                if (newGroup) radius = "rounded-lg rounded-tr-none";
              } else {
                if (newGroup) radius = "rounded-lg rounded-tl-none";
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
                  } ${wrapperMt} group/msg`}
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
                    } w-fit max-w-[90%] md:max-w-[85%] ${
                      hasAudioOnly
                        ? "p-0 bg-transparent shadow-none"
                        : "px-2 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] " +
                          (isMine ? "bg-[#d9fdd3]" : "bg-white")
                    } ${radius} ${
                      isSelected ? "ring-2 ring-[#00a884] bg-[#d9fdd3]/80" : ""
                    }`}
                  >
                    {!selectionMode &&
                      isMine &&
                      !hasAudioOnly &&
                      !isAttachmentOnly &&
                      !!m.text?.trim() && (
                        <div className="absolute right-1 top-1 z-30 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5"
                                title="Opciones"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-gray-700" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onSelect={() => {
                                  openEditForMessage(m);
                                }}
                              >
                                Editar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    {!hasAudioOnly &&
                      newGroup &&
                      (isMine ? (
                        <span className="absolute -right-2 top-0 text-[#d9fdd3]">
                          <svg
                            viewBox="0 0 8 13"
                            height="13"
                            width="8"
                            preserveAspectRatio="xMidYMid slice"
                            version="1.1"
                            x="0px"
                            y="0px"
                            enableBackground="new 0 0 8 13"
                          >
                            <path
                              fill="currentColor"
                              d="M5.188,1H0v11.193l6.467-8.625 C7.526,2.156,6.958,1,5.188,1z"
                            ></path>
                          </svg>
                        </span>
                      ) : (
                        <span className="absolute -left-2 top-0 text-white">
                          <svg
                            viewBox="0 0 8 13"
                            height="13"
                            width="8"
                            preserveAspectRatio="xMidYMid slice"
                            version="1.1"
                            x="0px"
                            y="0px"
                            enableBackground="new 0 0 8 13"
                          >
                            <path
                              fill="currentColor"
                              d="M1.533,3.568L8,12.193V1H2.812 C1.042,1,0.474,2.156,1.533,3.568z"
                            ></path>
                          </svg>
                        </span>
                      ))}
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
                      <div className="text-[14.2px] leading-[19px] text-[#111b21] whitespace-pre-wrap break-words">
                        {renderTextWithLinks(m.text)}
                      </div>
                    ) : null}
                    {Array.isArray(m.attachments) &&
                      m.attachments.length > 0 &&
                      (hasAudioOnly ? (
                        <div className="mt-0">
                          {m.attachments
                            .filter((a) => (a.mime || "").startsWith("audio/"))
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
                                    attSelected ? "ring-2 ring-violet-500" : ""
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
                            const isVideo = (a.mime || "").startsWith("video/");
                            const isAudio = (a.mime || "").startsWith("audio/");
                            const attSelected =
                              selectionMode && selectedAttachmentIds.has(a.id);
                            if (isAudio) {
                              const timeLabel = ""; // formatTime(m.at);
                              return (
                                <div
                                  key={a.id}
                                  className={`rounded-md relative ${
                                    attSelected ? "ring-2 ring-violet-500" : ""
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
                                    attSelected ? "ring-2 ring-violet-500" : ""
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
                                    {(a.mime || "").split("/")[1] || "archivo"}
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
                        className={`float-right ml-2 mt-1 flex items-center gap-1 select-none h-[15px]`}
                      >
                        <span className="text-[11px] text-[#667781]">
                          {formatTime(m.at)}
                        </span>
                        {isMine && (
                          <span
                            className={`ml-0.5 ${
                              m.read ? "text-[#53bdeb]" : "text-[#8696a0]"
                            }`}
                          >
                            {!m.delivered ? (
                              <Loader2 className="h-3 w-3 animate-spin text-[#8696a0]" />
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

          <Dialog
            open={editOpen}
            onOpenChange={(v) => {
              setEditOpen(v);
              if (!v) {
                setEditingMsg(null);
                setEditText("");
                setEditSaving(false);
                setEditError(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar mensaje</DialogTitle>
                <DialogDescription>
                  Solo puedes editar tus mensajes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <textarea
                  className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Escribe el nuevo contenido…"
                />
                {!!editError && (
                  <div className="text-sm text-destructive">{editError}</div>
                )}
                {!connected && !editError && (
                  <div className="text-sm text-muted-foreground">
                    Conectando al chat…
                  </div>
                )}
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
                  onClick={() => setEditOpen(false)}
                  disabled={editSaving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  onClick={submitEdit}
                  disabled={editSaving || !editText.trim() || !connected}
                >
                  Guardar
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          className="sticky bottom-0 z-20 flex-shrink-0 px-4 py-2 bg-[#F0F2F5] border-t border-[#d1d7db]"
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
          {attachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mb-2 pb-2 px-2">
              {attachments.map((a, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 w-16 h-16 bg-white rounded-md border border-gray-200 overflow-hidden group shadow-sm"
                >
                  {a.preview ? (
                    a.file.type.startsWith("image/") ? (
                      <img
                        src={a.preview}
                        alt={a.file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-100 grid place-items-center text-[10px] text-gray-500 font-medium">
                        {a.file.type.startsWith("video/")
                          ? "VID"
                          : a.file.type.startsWith("audio/")
                          ? "AUD"
                          : "FILE"}
                      </div>
                    )
                  ) : (
                    <div className="h-full w-full bg-gray-100 grid place-items-center text-[10px] text-gray-500 font-medium">
                      FILE
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-0.5 right-0.5 bg-gray-800/60 text-white rounded-full p-0.5 hover:bg-gray-800 transition-colors"
                    title="Quitar adjunto"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 max-w-screen-2xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
              accept="*/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Adjuntar"
              className="p-2 text-[#54656f] hover:bg-[rgba(0,0,0,0.05)] rounded-full transition-colors flex-shrink-0 mb-1"
            >
              <Paperclip className="w-6 h-6" />
            </button>

            <div className="flex-1 bg-white rounded-lg flex items-center min-h-[42px] px-4 py-2 shadow-sm border border-white focus-within:border-white mx-1">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value.trim()) notifyTyping(true);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 100) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                    e.preventDefault();
                    send();
                  } else {
                    notifyTyping(true);
                  }
                }}
                placeholder="Escribe un mensaje"
                rows={1}
                className="w-full bg-transparent border-none focus:ring-0 text-[#111b21] placeholder:text-[#8696a0] text-[15px] max-h-[100px] overflow-y-auto resize-none outline-none"
                style={{
                  outline: "none",
                  boxShadow: "none",
                  minHeight: "24px",
                }}
              />
            </div>

            {text.trim() || attachments.length > 0 ? (
              <button
                onClick={send}
                disabled={uploading}
                className="p-2 text-[#54656f] hover:bg-[rgba(0,0,0,0.05)] rounded-full transition-colors flex-shrink-0 mb-1"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#00a884]" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    version="1.1"
                    x="0px"
                    y="0px"
                    enableBackground="new 0 0 24 24"
                  >
                    <path
                      fill="#54656f"
                      d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"
                    ></path>
                  </svg>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (recording) {
                    // Small delay to ensure the last chunk is captured
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
                    }, 500);
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
                            )}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(
                              ts.getMinutes()
                            )}${pad(ts.getSeconds())}.${ext}`;
                            // Convertir a MP3 antes de adjuntar
                            (async () => {
                              try {
                                const mp3File = await convertBlobToMp3(blob);
                                const out =
                                  mp3File ||
                                  new File([blob], fname, {
                                    type: blob.type || chosenType,
                                  });
                                if ((out.size || 0) > MAX_FILE_SIZE) {
                                  setUploadError(
                                    "El audio grabado excede el límite de 50MB y no se adjuntará."
                                  );
                                } else {
                                  addPendingAttachments([out] as any);
                                }
                              } catch (convErr) {
                                console.error(convErr);
                                const out = new File([blob], fname, {
                                  type: blob.type || chosenType,
                                });
                                if ((out.size || 0) > MAX_FILE_SIZE) {
                                  setUploadError(
                                    "El audio grabado excede el límite de 50MB y no se adjuntará."
                                  );
                                } else {
                                  addPendingAttachments([out] as any);
                                }
                              }
                            })();
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
                        // Start with 1s timeslices to ensure data availability
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
                className={`p-2 rounded-full transition-colors flex-shrink-0 mb-1 ${
                  recording
                    ? "bg-red-500 text-white animate-pulse shadow-md"
                    : "text-[#54656f] hover:bg-[rgba(0,0,0,0.05)]"
                }`}
              >
                {recording ? (
                  <Square className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            )}
          </div>
          {recording && (
            <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-white shadow-lg border border-gray-100 z-30">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-gray-700 font-mono font-medium">
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
            </div>
          )}
          {uploadError && (
            <div className="mt-2 text-xs text-rose-600 px-2">{uploadError}</div>
          )}
          {(uploading || uploadState.active) && (
            <div className="mt-1 text-[11px] text-gray-700 flex items-center gap-2 px-2">
              <span className="inline-block h-3 w-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              <span>
                Subiendo archivos {uploadState.done}/{uploadState.total}
                {uploadState.current ? ` — ${uploadState.current}` : ""}
              </span>
            </div>
          )}
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
