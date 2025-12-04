"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import { toast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { usePathname } from "next/navigation";

export function GlobalChatNotifications() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    console.log("[GlobalChatNotifications] Checking user...", user);
    if (!user) return;

    const token = getAuthToken();
    console.log("[GlobalChatNotifications] Token found?", !!token, token);
    if (!token) return;

    console.log("[GlobalChatNotifications] Connecting with token:", token);

    // Connect to Socket.IO
    // Use the same configuration as ChatRealtime to ensure compatibility
    const socket = io(CHAT_HOST, {
      auth: { token },
      transports: ["websocket", "polling"],
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.debug("[GlobalChatNotifications] Connected");

      // Subscribe to user's chats by listing them (server-side subscription pattern)
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
        }
      } else if (user.role === "admin") {
        // Admin might not need specific subscription or subscribes to all?
        // Usually admins have a dashboard that lists everything.
        // For now, we try to list without params or with admin type if supported.
        // payload.participante_tipo = "admin"
      }

      if (Object.keys(payload).length > 0) {
        socket.emit("chat.list", payload, (ack: any) => {
          // We don't need the list, just the subscription side-effect
          console.debug(
            "[GlobalChatNotifications] Subscribed via chat.list",
            ack
          );
        });
      }
    });

    socket.on("chat.message", (msg: any) => {
      // Determine if the message is from the current user
      let isMe = false;
      const myRole = user.role; // "admin", "student", "coach", "equipo"

      // Normalize msg role from backend
      let msgRole = "";
      const rawType = (msg.participante_tipo || "").toLowerCase();

      if (rawType === "cliente" || rawType === "alumno") msgRole = "student";
      else if (rawType === "equipo" || rawType === "coach") msgRole = "coach";
      else if (rawType === "admin") msgRole = "admin";

      // Heuristic: if the sender role matches my role, assume it's me.
      // Map myRole to msgRole format for comparison
      let myMappedRole = "";
      if (myRole === "student") myMappedRole = "student";
      else if (myRole === "coach" || myRole === "equipo")
        myMappedRole = "coach";
      else if (myRole === "admin") myMappedRole = "admin";

      if (msgRole === myMappedRole) {
        // Double check: if I am a student, and the sender is ALSO a student (me), ignore.
        // But if I am a coach, and another coach sends a message?
        // Usually we only want to ignore messages sent by THIS session/user.
        // But we don't have session ID here easily.
        // For now, assuming role match is enough to filter "my own messages"
        // (since students don't chat with students, and coaches don't chat with coaches in this context usually).
        isMe = true;
      }

      // Special case: If I am admin, I might see messages from other admins?
      // If I am admin, I want to see messages from Students and Coaches.
      // If msgRole is 'admin', it's likely me or another admin.

      // Refined logic:
      // If I am Student, I want messages from Coach or Admin.
      // If I am Coach, I want messages from Student or Admin.
      // If I am Admin, I want messages from Student or Coach.

      if (myRole === "student" && msgRole === "student") isMe = true;
      if ((myRole === "coach" || myRole === "equipo") && msgRole === "coach")
        isMe = true;
      if (myRole === "admin" && msgRole === "admin") isMe = true;

      if (!isMe) {
        // Show toast
        toast({
          title: `Nuevo mensaje de ${msg.nombre_emisor || "Usuario"}`,
          description:
            msg.contenido ||
            (msg.archivo ? "📎 Archivo adjunto" : "Nuevo mensaje"),
          duration: 5000,
        });

        // Update unread count in localStorage for AppSidebar
        if (msg.id_chat) {
          // Map role for localStorage key (matches AppSidebar logic)
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

            // Dispatch event for AppSidebar to pick up
            window.dispatchEvent(
              new CustomEvent("chat:unread-count-updated", {
                detail: { chatId: msg.id_chat, role: roleKey, count: next },
              })
            );
          } catch (e) {
            console.error("Error updating unread count", e);
          }
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]); // Re-connect if user changes (login/logout)

  return null;
}
