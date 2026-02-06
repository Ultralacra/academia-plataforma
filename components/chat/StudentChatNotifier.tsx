"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import {
  initNotificationSound,
  playNotificationSound,
  showSystemNotification,
  sendNotificationToServiceWorker,
} from "@/lib/utils";

interface StudentChatNotifierProps {
  studentCode: string;
}

export function StudentChatNotifier({ studentCode }: StudentChatNotifierProps) {
  const socketRef = useRef<Socket | null>(null);
  const myParticipantIds = useRef<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Preparar unlock de audio
    try {
      initNotificationSound();
    } catch {}
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !studentCode) return;

    // Conectar como el alumno para escuchar sus mensajes
    const socket = io(CHAT_HOST, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
            /* console.log("[Notifier] Connected to socket"); */
      // Suscribirse a los mensajes del alumno
      socket.emit(
        "chat.list",
        {
          participante_tipo: "cliente",
          id_cliente: studentCode,
        },
        (response: any) => {
          // Unirse a todos los chats existentes para recibir eventos
          if (response && response.success && Array.isArray(response.data)) {
                        /* console.log(
              "[Notifier] Joining existing chats:",
              response.data.length,
            ); */
            response.data.forEach((chat: any) => {
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
        },
      );
    });

    // Escuchar nuevos chats para unirse automáticamente
    socket.on("chat.created", (data: any) => {
      const cid = data?.id_chat || data?.id;
      if (cid) {
                /* console.log("[Notifier] New chat created, joining:", cid); */
        socket.emit("chat.join", { id_chat: cid }, (joinAck: any) => {
          if (joinAck && joinAck.success && joinAck.data?.my_participante) {
            myParticipantIds.current[cid] = joinAck.data.my_participante;
          }
        });
      }
    });

    socket.on("chat.message", (msg: any) => {
      // Verificar si el mensaje es entrante (no enviado por el alumno)
      const cid = msg.id_chat;
      const myPid = myParticipantIds.current[cid];
      const senderPid = msg.id_chat_participante_emisor;

      // Privacy: si no estoy unido a este chat, ignoro el mensaje.
      if (!myPid) return;

      let esMio = false;
      if (myPid && senderPid && String(myPid) === String(senderPid)) {
        esMio = true;
      } else {
        // Fallback por tipo si no tenemos IDs resueltos
        const tipoEmisor = (msg.participante_tipo || "").toLowerCase();
        esMio = tipoEmisor === "cliente" || tipoEmisor === "alumno";
      }

            /* console.log("[Notifier] Message received:", { msg, esMio }); */

      if (!esMio) {
        const isBackground =
          typeof document !== "undefined" &&
          typeof document.hidden === "boolean" &&
          document.hidden;

        // Sonido de notificación (maneja unlock/autoplay internamente)
        try {
          if (!isBackground) playNotificationSound();
        } catch {}

        if (isBackground) {
          try {
            const textRaw = String(
              msg?.contenido ?? msg?.texto ?? msg?.text ?? "",
            ).trim();
            const preview = textRaw ? textRaw.slice(0, 120) : "(Adjunto)";
            const senderName = String(msg?.nombre_emisor ?? "").trim();
            const chatUrl = studentCode
              ? `/chat/${encodeURIComponent(studentCode)}`
              : "/chat";
            // Intentar vía SW primero (mejor para móviles/PWA)
            sendNotificationToServiceWorker({
              title: senderName || "Academia X: Nuevo mensaje",
              body: preview,
              url: chatUrl,
              tag: `chat:${String(msg?.id_chat ?? "student")}`,
              chatId: msg?.id_chat,
              senderName,
            }).then((sent) => {
              if (!sent) {
                showSystemNotification({
                  title: senderName || "Academia X: Nuevo mensaje",
                  body: preview,
                  url: chatUrl,
                  tag: `chat:${String(msg?.id_chat ?? "student")}`,
                  chatId: msg?.id_chat,
                  senderName,
                });
              }
            });
          } catch {}
        }

        // En móviles, también notificar aunque esté en foreground (aparece en barra de notis)
        if (!isBackground) {
          try {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(
              navigator.userAgent,
            );
            if (
              isMobile &&
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            ) {
              const textRaw = String(
                msg?.contenido ?? msg?.texto ?? msg?.text ?? "",
              ).trim();
              const preview = textRaw ? textRaw.slice(0, 120) : "(Adjunto)";
              const senderName = String(msg?.nombre_emisor ?? "").trim();
              const chatUrl = studentCode
                ? `/chat/${encodeURIComponent(studentCode)}`
                : "/chat";
              sendNotificationToServiceWorker({
                title: senderName || "Nuevo mensaje",
                body: preview,
                url: chatUrl,
                tag: `chat:${String(msg?.id_chat ?? "student")}`,
                chatId: msg?.id_chat,
                senderName,
              });
            }
          } catch {}
        }

        // Snackbar/Toast para mensajes entrantes (solo en foreground)
        if (!isBackground) {
          try {
            const textRaw = String(
              msg?.contenido ?? msg?.texto ?? msg?.text ?? "",
            ).trim();
            const preview = textRaw ? textRaw.slice(0, 120) : "(Adjunto)";
            toast({
              title: "Nuevo mensaje",
              description: preview,
            });
          } catch {}
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [studentCode, toast]);

  return null;
}
