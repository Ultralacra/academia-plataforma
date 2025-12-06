"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface StudentChatNotifierProps {
  studentCode: string;
}

export function StudentChatNotifier({ studentCode }: StudentChatNotifierProps) {
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const myParticipantIds = useRef<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Sonido de notificación suave
    audioRef.current = new Audio(
      "https://res.cloudinary.com/dzkq67qmu/video/upload/v1733326786/notification_sound_y8j3s9.mp3"
    );
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
      console.log("[Notifier] Connected to socket");
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
            console.log(
              "[Notifier] Joining existing chats:",
              response.data.length
            );
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
        }
      );
    });

    // Escuchar nuevos chats para unirse automáticamente
    socket.on("chat.created", (data: any) => {
      const cid = data?.id_chat || data?.id;
      if (cid) {
        console.log("[Notifier] New chat created, joining:", cid);
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

      let esMio = false;
      if (myPid && senderPid && String(myPid) === String(senderPid)) {
        esMio = true;
      } else {
        // Fallback por tipo si no tenemos IDs resueltos
        const tipoEmisor = (msg.participante_tipo || "").toLowerCase();
        esMio = tipoEmisor === "cliente" || tipoEmisor === "alumno";
      }

      console.log("[Notifier] Message received:", { msg, esMio });

      if (!esMio) {
        // Reproducir sonido si está en otra pestaña o minimizado (o siempre, según preferencia)
        // El usuario pidió: "por si no esta en la aplicacion o sea si esta en otra pesñaa"
        // Lo reproducimos siempre para asegurar feedback, o chequeamos visibilityState
        if (document.hidden) {
          audioRef.current?.play().catch(() => {});
        } else {
          // Opcional: reproducir también si está visible pero queremos feedback sonoro
          audioRef.current?.play().catch(() => {});
        }

        // Snackbar deshabilitado temporalmente para el alumno al recibir/enviar
        // Si deseas mostrarlo solo fuera de la vista de chat, podemos condicionarlo por pathname.
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [studentCode, toast]);

  return null;
}
