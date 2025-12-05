"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { playNotificationSound } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";

// Global set for deduplication across component instances/remounts
const processedMessageIds = new Set<string>();

export function CoachChatNotifier() {
  const { user } = useAuth();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const myParticipantIds = useRef<Record<string, string>>({});
  const { toast } = useToast();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Preload notification sound
    audioRef.current = new Audio(
      "https://res.cloudinary.com/dzkq67qmu/video/upload/v1733326786/notification_sound_y8j3s9.mp3"
    );
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (!user) return;
    // Only for coaches or team members
    const role = (user.role || "").toLowerCase();
    if (role !== "coach" && role !== "equipo") return;

    const token = getAuthToken();
    if (!token) return;

    console.log("[CoachChatNotifier] Initializing for:", user.email);

    const socket = io(CHAT_HOST, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[CoachChatNotifier] Connected");

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
            const cid = chat.id_chat || chat.id;
            if (cid) {
              socket.emit("chat.join", { id_chat: cid }, (joinAck: any) => {
                if (
                  joinAck &&
                  joinAck.success &&
                  joinAck.data?.my_participante
                ) {
                  myParticipantIds.current[cid] = joinAck.data.my_participante;
                }
              });
            }
          });
        }
      });
    });

    // Listen for new chats
    socket.on("chat.created", (data: any) => {
      const cid = data?.id_chat || data?.id;
      if (cid) {
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
      // Cleanup ID after 10 seconds
      setTimeout(() => {
        processedMessageIds.delete(msgId);
      }, 10000);

      const cid = msg.id_chat;
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

      if (!isMe) {
        console.log(
          "[CoachChatNotifier] Notification triggered for message:",
          msg,
          "User:",
          user.email
        );

        // Play sound ALWAYS if it's not me
        playNotificationSound();

        // Show toast with specific coach styling
        const t = toast({
          title: `Nuevo mensaje de ${msg.nombre_emisor || "Alumno"}`,
          description:
            msg.contenido ||
            (msg.archivo ? "📎 Archivo adjunto" : "Nuevo mensaje"),
          duration: 5000,
          className:
            "bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-100",
        });
        console.log("[CoachChatNotifier] Toast dispatched:", t);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, toast, router]);

  return null;
}
