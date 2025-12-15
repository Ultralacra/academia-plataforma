"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { usePathname } from "next/navigation";
import { playNotificationSound } from "@/lib/utils";

// Global set for deduplication across component instances/remounts
const processedMessageIds = new Set<string>();

export function GlobalChatNotifications() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const myParticipantIds = useRef<Record<string, string>>({});
  const { toast } = useToast();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Removed unused audioRef preload since we use globalAudio in utils now

  useEffect(() => {
    if (!user) return;

    // If user is coach/equipo, we use the dedicated CoachChatNotifier component
    const role = (user.role || "").toLowerCase();
    if (role === "coach" || role === "equipo") return;

    const token = getAuthToken();
    if (!token) return;

    console.log(
      "[GlobalChatNotifications] Connecting for user:",
      user.email,
      user.role,
      "Code:",
      (user as any).codigo
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
      if (user.role === "student") {
        const code = (user as any).codigo;
        if (code) {
          payload.participante_tipo = "cliente";
          payload.id_cliente = String(code);
        }
      } else if (user.role === "coach" || user.role === "equipo") {
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
      } else if (user.role === "admin") {
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
              ack.data.length
            );
            ack.data.forEach((chat: any) => {
              const cid = chat.id_chat || chat.id;
              if (cid) {
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
        // Check if this chat belongs to me (simple heuristic or just try to join)
        // We just try to join. If not allowed, backend will reject.
        socket.emit("chat.join", { id_chat: cid }, (joinAck: any) => {
          if (joinAck && joinAck.success && joinAck.data?.my_participante) {
            myParticipantIds.current[cid] = joinAck.data.my_participante;
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
      setTimeout(() => {
        processedMessageIds.delete(msgId);
      }, 10000);

      console.debug("[GlobalChatNotifications] Message received:", msg);
      const cid = msg.id_chat;
      const myPid = myParticipantIds.current[cid];
      const senderPid = msg.id_chat_participante_emisor;

      // Security/Privacy check: si NO soy participante de este chat, ignorar.
      if (!myPid) {
        return;
      }

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
        if (
          (user.role === "student" || user.role === "cliente") &&
          msgRole === "student"
        )
          isMe = true;

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
        if (!isChatView) {
          playNotificationSound();
        }
        // Snackbar deshabilitado globalmente para evitar notificaciones visuales

        // Update unread count in localStorage
        if (msg.id_chat) {
          const roleKey =
            user.role === "student"
              ? "alumno"
              : user.role === "coach" || user.role === "equipo"
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
              })
            );
          } catch (e) {}
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, toast]);

  return null;
}
