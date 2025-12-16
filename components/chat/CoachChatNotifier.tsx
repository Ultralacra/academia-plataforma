"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import { useAuth } from "@/hooks/use-auth";
import { initNotificationSound, playNotificationSound } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";

// Global set for deduplication across component instances/remounts
const processedMessageIds = new Set<string>();

function toChatId(v: any): string {
  const s = v == null ? "" : String(v);
  return s.trim();
}

function normalizeTipo(v: any): "cliente" | "equipo" | "admin" | "" {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (["cliente", "alumno", "student"].includes(s)) return "cliente";
  if (["equipo", "coach", "entrenador"].includes(s)) return "equipo";
  if (["admin", "administrador", "usuario"].includes(s)) return "admin";
  return "";
}

function getCachedContactName(chatId: any): string | null {
  try {
    const id = chatId == null ? "" : String(chatId);
    if (!id) return null;
    const v = localStorage.getItem(`chatContactName:${id}`);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function setCachedContactName(chatId: any, name: any) {
  try {
    const id = chatId == null ? "" : String(chatId);
    const n = String(name ?? "").trim();
    if (!id || !n) return;
    localStorage.setItem(`chatContactName:${id}`, n);
  } catch {}
}

function extractAlumnoNameFromChat(chat: any): string | null {
  try {
    const arr = Array.isArray(chat?.otros_participantes)
      ? chat.otros_participantes
      : [];
    const fromOtros = arr.find(
      (p: any) => normalizeTipo(p?.participante_tipo) === "cliente"
    );
    const n1 =
      fromOtros?.nombre_participante ||
      fromOtros?.alumno?.nombre ||
      fromOtros?.cliente?.nombre ||
      fromOtros?.nombre ||
      fromOtros?.name;
    if (n1 && String(n1).trim()) return String(n1).trim();

    const parts = Array.isArray(chat?.participants || chat?.participantes)
      ? chat?.participants || chat?.participantes
      : [];
    const fromParts = parts.find(
      (p: any) => normalizeTipo(p?.participante_tipo) === "cliente"
    );
    const n2 =
      fromParts?.nombre_participante ||
      fromParts?.alumno?.nombre ||
      fromParts?.cliente?.nombre ||
      fromParts?.nombre ||
      fromParts?.name;
    if (n2 && String(n2).trim()) return String(n2).trim();
  } catch {}
  return null;
}

function extractAlumnoNameFromMsg(msg: any): string | null {
  try {
    const rawType = normalizeTipo(msg?.participante_tipo);
    // Si el mensaje viene de alumno/cliente, priorizar nombre del emisor.
    const candidate =
      msg?.nombre_emisor ||
      msg?.nombre_alumno ||
      msg?.alumno_nombre ||
      msg?.nombre_cliente ||
      msg?.cliente_nombre ||
      msg?.nombre_participante ||
      msg?.cliente?.nombre ||
      msg?.alumno?.nombre ||
      msg?.nombre ||
      msg?.name;
    if (rawType === "cliente" && candidate && String(candidate).trim()) {
      return String(candidate).trim();
    }
    // Fallback: aunque el tipo no venga bien, usar el primer nombre disponible.
    if (candidate && String(candidate).trim()) return String(candidate).trim();
  } catch {}
  return null;
}

export function CoachChatNotifier() {
  const { user } = useAuth();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const myParticipantIds = useRef<Record<string, string>>({});
  const joinedChatIds = useRef<Set<string>>(new Set());
  const [authBump, setAuthBump] = useState(0);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Removed unused audioRef preload since we use globalAudio in utils now

  // Reintentar conexión cuando cambie el auth/token (login/logout)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuthChanged = () => {
      setAuthBump((n) => n + 1);
    };
    try {
      window.addEventListener("auth:changed", onAuthChanged as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener("auth:changed", onAuthChanged as any);
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    // Only for coaches or team members
    const role = (user.role || "").toLowerCase();
    if (role !== "coach" && role !== "equipo") return;

    // Preparar unlock de audio temprano
    try {
      initNotificationSound();
    } catch {}

    const token = getAuthToken();
    if (!token) {
      try {
        console.debug("[CoachChatNotifier] Token aún no disponible; esperando auth:changed");
      } catch {}
      return;
    }

    // Evitar sockets duplicados si el effect se re-ejecuta
    try {
      socketRef.current?.disconnect();
    } catch {}
    socketRef.current = null;

    console.log("[CoachChatNotifier] Initializing for:", user.email);

    const socket = io(CHAT_HOST, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[CoachChatNotifier] Connected");

      // Reset local membership caches on each fresh connection
      joinedChatIds.current = new Set();
      myParticipantIds.current = {};

      const payload: any = {};
      const code = (user as any).codigo;

      if (code) {
        payload.participante_tipo = "equipo";
        payload.id_equipo = String(code);
      } else {
        // Fallback if no team code
        payload.participante_tipo = "usuario";
        payload.id_usuario = String(user.id);
      }

      // List chats to join them
      socket.emit("chat.list", payload, (ack: any) => {
        if (ack && ack.success && Array.isArray(ack.data)) {
          console.log("[CoachChatNotifier] Joining chats:", ack.data.length);
          ack.data.forEach((chat: any) => {
            const cid = toChatId(chat?.id_chat ?? chat?.id);
            if (cid) {
              joinedChatIds.current.add(cid);
              try {
                const name = extractAlumnoNameFromChat(chat);
                if (name) setCachedContactName(cid, name);
              } catch {}
              socket.emit("chat.join", { id_chat: cid }, (joinAck: any) => {
                if (
                  joinAck &&
                  joinAck.success &&
                  joinAck.data?.my_participante
                ) {
                  myParticipantIds.current[cid] = String(
                    joinAck.data.my_participante
                  );
                  try {
                    const name = extractAlumnoNameFromChat(joinAck.data);
                    if (name) setCachedContactName(cid, name);
                  } catch {}
                }
              });
            }
          });
        }
      });
    });

    // Listen for new chats
    socket.on("chat.created", (data: any) => {
      const cid = toChatId(data?.id_chat ?? data?.id);
      if (cid) {
        joinedChatIds.current.add(cid);
        socket.emit("chat.join", { id_chat: cid }, (joinAck: any) => {
          if (joinAck && joinAck.success && joinAck.data?.my_participante) {
            myParticipantIds.current[cid] = String(joinAck.data.my_participante);
            try {
              const name =
                extractAlumnoNameFromChat(joinAck.data) ||
                extractAlumnoNameFromChat(data);
              if (name) setCachedContactName(cid, name);
            } catch {}
            try {
              const evt = new CustomEvent("chat:list-refresh", {
                detail: { reason: "chat-created", id_chat: cid },
              });
              window.dispatchEvent(evt);
            } catch {}
          }
        });
      }
    });

    socket.on("chat.message", (msg: any) => {
      // Deduplication
      const msgId =
        msg.id_mensaje || msg.id || `${msg.id_chat}-${msg.created_at}`;
      if (processedMessageIds.has(msgId)) {
        return;
      }
      processedMessageIds.add(msgId);
      // Cleanup ID after 10 seconds
      setTimeout(() => {
        processedMessageIds.delete(msgId);
      }, 10000);

      const cid = toChatId(msg?.id_chat);
      if (!cid) return;

      // Privacy: si NO es uno de mis chats (según chat.list), ignorar.
      if (!joinedChatIds.current.has(cid)) {
        return;
      }

      const myPid = myParticipantIds.current[cid];
      const senderPid = msg.id_chat_participante_emisor;

      let isMe = false;

      // 1. Check by participant ID (most reliable if we have it)
      if (myPid && senderPid && String(myPid) === String(senderPid)) {
        isMe = true;
      }

      // 2. Check by email (very reliable)
      if (
        !isMe &&
        msg.email_emisor &&
        user.email &&
        msg.email_emisor === user.email
      ) {
        isMe = true;
      }

      // 3. Check by name (fallback)
      if (
        !isMe &&
        msg.nombre_emisor &&
        user.name &&
        msg.nombre_emisor === user.name
      ) {
        isMe = true;
      }

      // 4. Fallback por tipo/id (cuando el backend no manda senderPid)
      if (!isMe) {
        try {
          const myRole = String(user.role || "").toLowerCase();
          const myCode = String((user as any)?.codigo ?? "").trim();
          const rawType = String(msg?.participante_tipo || "").toLowerCase();
          const msgTeamId = String(msg?.id_equipo ?? "").trim();
          const msgUserId = String(msg?.id_usuario ?? "").trim();

          const msgIsTeam = rawType === "equipo" || rawType === "coach";
          const msgIsUser = rawType === "usuario" || rawType === "admin";

          if ((myRole === "coach" || myRole === "equipo") && msgIsTeam) {
            // Si tengo código de equipo y el mensaje viene del mismo equipo, soy yo
            if (myCode && msgTeamId && myCode === msgTeamId) isMe = true;
          }
          if (!isMe && msgIsUser) {
            if (msgUserId && String(user.id) === msgUserId) isMe = true;
          }
        } catch {}
      }

      if (!isMe) {
        // Log explícito si el emisor es alumno/cliente
        try {
          const rawType = String(msg?.participante_tipo || "").toLowerCase();
          const isAlumno = rawType === "cliente" || rawType === "alumno";
          if (isAlumno) {
            const preview = String(msg?.contenido ?? msg?.texto ?? "").slice(
              0,
              140
            );
            console.log("[CoachChatNotifier] ← Mensaje de alumno", {
              id_chat: msg?.id_chat,
              id_mensaje: msg?.id_mensaje ?? msg?.id,
              texto_preview: preview,
              participante_tipo: msg?.participante_tipo,
              id_cliente: msg?.id_cliente,
              id_equipo: msg?.id_equipo,
              email_emisor: msg?.email_emisor,
              nombre_emisor: msg?.nombre_emisor,
              client_session: msg?.client_session,
            });
          }
        } catch {}
        console.log(
          "[CoachChatNotifier] Notification triggered for message:",
          msg,
          "User:",
          user.email
        );

        const currentPath = pathnameRef.current;
        const isCoachChatView =
          !!currentPath &&
          currentPath.includes("/admin/teamsv2/") &&
          currentPath.includes("/chat");

        // Sonido + snackbar solo fuera del chat del coach (evita dobles con la UI)
        if (!isCoachChatView) {
          try {
            playNotificationSound();
          } catch {}

          try {
            const rawType = String(msg?.participante_tipo || "").toLowerCase();
            const isAlumno = rawType === "cliente" || rawType === "alumno";
            const cachedName = getCachedContactName(msg?.id_chat);
            const msgName = extractAlumnoNameFromMsg(msg);
            const senderName = msgName || cachedName || "";

            const title = isAlumno
              ? senderName || "Nuevo mensaje de alumno"
              : senderName || "Nuevo mensaje";

            const textRaw = String(
              msg?.contenido ?? msg?.texto ?? msg?.text ?? ""
            ).trim();
            const preview = (() => {
              const collapsed = textRaw.replace(/\s+/g, " ").trim();
              if (!collapsed) return "(Adjunto)";
              const max = 110;
              if (collapsed.length <= max) return collapsed;
              return collapsed.slice(0, max - 1).trimEnd() + "…";
            })();

            const myCode = (user as any)?.codigo;
            const chatUrl = myCode
              ? `/admin/teamsv2/${String(myCode)}/chat`
              : "/admin/teamsv2";

            window.dispatchEvent(
              new CustomEvent("coach-chat:snackbar", {
                detail: {
                  title,
                  studentName: isAlumno ? senderName || undefined : undefined,
                  preview,
                  chatUrl,
                  chatId: msg?.id_chat,
                },
              })
            );
          } catch {}
        }

        // Incrementar contador de no leídos global (para badges en listas)
        if (msg?.id_chat) {
          try {
            const key = `chatUnreadById:coach:${String(msg.id_chat)}`;
            const current = parseInt(localStorage.getItem(key) || "0", 10);
            const next = (isNaN(current) ? 0 : current) + 1;
            localStorage.setItem(key, String(next));
            window.dispatchEvent(
              new CustomEvent("chat:unread-count-updated", {
                detail: { chatId: msg.id_chat, role: "coach", count: next },
              })
            );
          } catch {}
        }
      }
    });

    return () => {
      try {
        socket.disconnect();
      } catch {}
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [user, router, authBump]);

  return null;
}
