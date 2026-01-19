"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { usePathname } from "next/navigation";
import {
  initNotificationSound,
  playNotificationSound,
  showSystemNotification,
  sendNotificationToServiceWorker,
} from "@/lib/utils";

// Global set for deduplication across component instances/remounts
const processedMessageIds = new Set<string>();

export function GlobalChatNotifications() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const myParticipantIds = useRef<Record<string, string>>({});
  const joinedChatIds = useRef<Set<string>>(new Set());
  const [authBump, setAuthBump] = useState(0);
  const { toast } = useToast();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Removed unused audioRef preload since we use globalAudio in utils now

  // Reintentar conexión cuando cambie el auth/token (login/logout)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuthChanged = () => setAuthBump((n) => n + 1);
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

    // Preparar unlock de audio temprano
    try {
      initNotificationSound();
    } catch {}

    const role = String(user.role || "").toLowerCase();
    const isStudentRole = ["student", "alumno", "cliente"].includes(role);
    const isCoachRole = ["coach", "equipo"].includes(role);

    // If user is coach/equipo, we use the dedicated CoachChatNotifier component
    if (isCoachRole) return;

    const token = getAuthToken();
    if (!token) {
      try {
        console.debug(
          "[GlobalChatNotifications] Token aún no disponible; esperando auth:changed",
        );
      } catch {}
      return;
    }

    // Evitar sockets duplicados si el effect se re-ejecuta
    try {
      socketRef.current?.disconnect();
    } catch {}
    socketRef.current = null;
    joinedChatIds.current = new Set();
    myParticipantIds.current = {};

    console.log(
      "[GlobalChatNotifications] Connecting for user:",
      user.email,
      user.role,
      "Code:",
      (user as any).codigo,
    );

    // Connect to Socket.IO
    const socket = io(CHAT_HOST, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.debug("[GlobalChatNotifications] Connected");

      // Construct payload based on role
      const payload: any = {};
      if (isStudentRole) {
        const code = (user as any).codigo;
        if (code) {
          payload.participante_tipo = "cliente";
          payload.id_cliente = String(code);
        }
      } else if (isCoachRole) {
        const code = (user as any).codigo;
        if (code) {
          payload.participante_tipo = "equipo";
          payload.id_equipo = String(code);
        } else {
          // Fallback: try to join as user if no team code is present
          // This ensures coaches without a specific team code still get their chats
          payload.participante_tipo = "usuario";
          payload.id_usuario = String(user.id);
        }
      } else if (role === "admin") {
        // Admins might want to see everything or specific chats.
        // For now, we skip auto-subscription for admins to avoid noise,
        // unless they have a specific "equipo" code assigned.
        if ((user as any).codigo) {
          payload.participante_tipo = "equipo";
          payload.id_equipo = String((user as any).codigo);
        }
      }

      if (Object.keys(payload).length > 0) {
        socket.emit("chat.list", payload, (ack: any) => {
          if (ack && ack.success && Array.isArray(ack.data)) {
            console.debug(
              "[GlobalChatNotifications] Joining chats:",
              ack.data.length,
            );
            ack.data.forEach((chat: any) => {
              const cid = chat.id_chat || chat.id;
              if (cid) {
                try {
                  joinedChatIds.current.add(String(cid));
                } catch {}
                socket.emit("chat.join", { id_chat: cid }, (joinAck: any) => {
                  if (
                    joinAck &&
                    joinAck.success &&
                    joinAck.data?.my_participante
                  ) {
                    myParticipantIds.current[cid] =
                      joinAck.data.my_participante;
                  }
                });
              }
            });
          }
        });
      }
    });

    // Listen for new chats to join automatically
    socket.on("chat.created", (data: any) => {
      const cid = data?.id_chat || data?.id;
      if (cid) {
        try {
          joinedChatIds.current.add(String(cid));
        } catch {}
        // Check if this chat belongs to me (simple heuristic or just try to join)
        // We just try to join. If not allowed, backend will reject.
        socket.emit("chat.join", { id_chat: cid }, (joinAck: any) => {
          if (joinAck && joinAck.success && joinAck.data?.my_participante) {
            myParticipantIds.current[cid] = joinAck.data.my_participante;
          }
        });
      }
    });

    socket.on("chat.message", async (msg: any) => {
      // Deduplication
      const msgId =
        msg.id_mensaje || msg.id || `${msg.id_chat}-${msg.created_at}`;
      if (processedMessageIds.has(msgId)) {
        return;
      }
      processedMessageIds.add(msgId);
      setTimeout(() => {
        processedMessageIds.delete(msgId);
      }, 10000);

      console.debug("[GlobalChatNotifications] Message received:", msg);
      const cid = msg.id_chat;
      const myPid = myParticipantIds.current[cid];
      const senderPid = msg.id_chat_participante_emisor;

      // Security/Privacy check: si NO es uno de mis chats (según chat.list), ignorar.
      // Nota: no dependemos de my_participante porque a veces el ack no lo devuelve.
      if (!cid || !joinedChatIds.current.has(String(cid))) return;

      let isMe = false;
      if (myPid && senderPid && String(myPid) === String(senderPid)) {
        isMe = true;
      } else {
        // Fallback logic if IDs are not resolved
        const rawType = (msg.participante_tipo || "").toLowerCase();
        let msgRole = "";
        if (rawType === "cliente" || rawType === "alumno") msgRole = "student";
        else if (rawType === "equipo" || rawType === "coach") msgRole = "coach";
        else if (rawType === "admin" || rawType === "usuario")
          msgRole = "admin";

        // If I am a student, and the message is from a student, it's me (or another student, but usually me in 1:1)
        const myRole = String(user.role || "").toLowerCase();
        if (
          ["student", "cliente", "alumno"].includes(myRole) &&
          msgRole === "student"
        ) {
          isMe = true;
        }

        // If I am admin, and message is from admin, it's me
        if (user.role === "admin" && msgRole === "admin") isMe = true;

        // Extra robust check using name/email if available
        if (msg.nombre_emisor && user.name && msg.nombre_emisor === user.name) {
          isMe = true;
        }
        if (msg.email_emisor && user.email && msg.email_emisor === user.email) {
          isMe = true;
        }
      }

      if (!isMe) {
        // Play sound if not in chat view (chat components handle their own sounds)
        const currentPath = pathnameRef.current;
        const isChatView =
          currentPath?.includes("/chat") || currentPath?.includes("/teamsv2");

        const isBackground =
          typeof document !== "undefined" &&
          typeof document.hidden === "boolean" &&
          document.hidden;

        if (!isChatView) {
          try {
            // En background, el audio suele ser bloqueado; usamos notificación del sistema.
            if (!isBackground) playNotificationSound();
          } catch {}
        }

        // Snackbar/Toast para mensajes entrantes cuando no estás en una vista de chat
        if (!isChatView && !isBackground) {
          const textRaw = String(
            msg?.contenido ?? msg?.texto ?? msg?.text ?? "",
          ).trim();
          const preview = textRaw ? textRaw.slice(0, 120) : "(Adjunto)";
          const senderName = String(msg?.nombre_emisor ?? "").trim();

          try {
            toast({
              title: senderName
                ? `Nuevo mensaje: ${senderName}`
                : "Nuevo mensaje",
              description: preview,
            });
          } catch {}

          // Si es alumno, emitir snackbar "bonito" con botón (misma UX que coach)
          try {
            const myRole = String(user.role || "").toLowerCase();
            if (["student", "alumno", "cliente"].includes(myRole)) {
              const myCode = String((user as any)?.codigo ?? "").trim();
              const chatUrl = myCode
                ? `/chat/${encodeURIComponent(myCode)}`
                : "/chat";
              window.dispatchEvent(
                new CustomEvent("student-chat:snackbar", {
                  detail: {
                    title: senderName || "Nuevo mensaje",
                    preview,
                    chatUrl,
                    chatId: cid,
                  },
                }),
              );
            }
          } catch {}
        }

        // En background: lanzar notificación del sistema (si hay permisos)
        // También funciona cuando la PWA está minimizada en móviles
        if (!isChatView && isBackground) {
          try {
            const textRaw = String(
              msg?.contenido ?? msg?.texto ?? msg?.text ?? "",
            ).trim();
            const preview = textRaw ? textRaw.slice(0, 120) : "(Adjunto)";
            const senderName = String(msg?.nombre_emisor ?? "").trim();

            const myRole = String(user.role || "").toLowerCase();
            const myCode = String((user as any)?.codigo ?? "").trim();
            const chatUrl =
              ["student", "alumno", "cliente"].includes(myRole) && myCode
                ? `/chat/${encodeURIComponent(myCode)}`
                : "/chat";

            // Intentar primero vía Service Worker (más robusto en móviles/PWA)
            const swSent = await sendNotificationToServiceWorker({
              title: senderName
                ? `Academia X: ${senderName}`
                : "Academia X: Nuevo mensaje",
              body: preview,
              url: chatUrl,
              tag: `chat:${String(msg?.id_chat ?? msgId)}`,
              chatId: msg?.id_chat,
              senderName,
            });

            // Si el SW no pudo mostrarla, usar el método directo
            if (!swSent) {
              showSystemNotification({
                title: senderName
                  ? `Academia X: ${senderName}`
                  : "Academia X: Nuevo mensaje",
                body: preview,
                url: chatUrl,
                tag: `chat:${String(msg?.id_chat ?? msgId)}`,
                chatId: msg?.id_chat,
                senderName,
              });
            }
          } catch {}
        }

        // También mostrar notificación si la app está en foreground pero el usuario no está en chat
        // Esto mejora la experiencia en móviles donde el usuario puede estar en otra pantalla
        if (!isChatView && !isBackground) {
          try {
            // En móviles, también mostrar notificación del sistema aunque esté en foreground
            // para que aparezca en la barra de notificaciones
            const isMobile = /iPhone|iPad|iPod|Android/i.test(
              navigator.userAgent,
            );
            if (isMobile && Notification.permission === "granted") {
              const textRaw = String(
                msg?.contenido ?? msg?.texto ?? msg?.text ?? "",
              ).trim();
              const preview = textRaw ? textRaw.slice(0, 120) : "(Adjunto)";
              const senderName = String(msg?.nombre_emisor ?? "").trim();

              const myRole = String(user.role || "").toLowerCase();
              const myCode = String((user as any)?.codigo ?? "").trim();
              const chatUrl =
                ["student", "alumno", "cliente"].includes(myRole) && myCode
                  ? `/chat/${encodeURIComponent(myCode)}`
                  : "/chat";

              sendNotificationToServiceWorker({
                title: senderName || "Nuevo mensaje",
                body: preview,
                url: chatUrl,
                tag: `chat:${String(msg?.id_chat ?? msgId)}`,
                chatId: msg?.id_chat,
                senderName,
              });
            }
          } catch {}
        }

        // Update unread count in localStorage
        if (msg.id_chat) {
          const roleKey = isStudentRole
            ? "alumno"
            : isCoachRole
              ? "coach"
              : "admin";
          const key = `chatUnreadById:${roleKey}:${msg.id_chat}`;
          try {
            const current = parseInt(localStorage.getItem(key) || "0", 10);
            const next = (isNaN(current) ? 0 : current) + 1;
            localStorage.setItem(key, String(next));
            window.dispatchEvent(
              new CustomEvent("chat:unread-count-updated", {
                detail: { chatId: msg.id_chat, role: roleKey, count: next },
              }),
            );
          } catch (e) {}
        }
      }
    });

    return () => {
      try {
        socket.disconnect();
      } catch {}
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [user, toast, authBump]);

  return null;
}
