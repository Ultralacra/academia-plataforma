"use client";

import React from "react";
import io from "socket.io-client";
import { CHAT_HOST } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import {
  Sender,
  Message,
  SocketIOConfig,
  Attachment,
  ChatInfo,
} from "./chat-types";

export function useChatSocket({
  normRoom,
  role,
  socketio,
  setConnected,
  setItems,
  setChatId,
  setMyParticipantId,
  setIsJoining,
  setOtherTyping,
  onChatInfo,
  onChatsList,
  refreshListNow,
}: {
  normRoom: string;
  role: Sender;
  socketio?: SocketIOConfig;
  setConnected: (c: boolean) => void;
  setItems: (items: Message[]) => void;
  setChatId: (id: string | number | null) => void;
  setMyParticipantId: (id: string | number | null) => void;
  setIsJoining: (j: boolean) => void;
  setOtherTyping: (t: boolean) => void;
  onChatInfo?: (info: ChatInfo) => void;
  onChatsList?: (list: any[]) => void;
  refreshListNow: () => void;
}) {
  const sioRef = React.useRef<any>(null);
  const clientSessionRef = React.useRef<string>(
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const token = socketio?.token ?? getAuthToken();
      const url = socketio?.url || CHAT_HOST || "http://localhost:3001";
      try {
        // Imprimir en consola el token usado para la conexión del chat
        // (útil para debugging en cliente)
        console.log("[useChatSocket] chat connection token:", token);
      } catch {}
      const sio = io(url, {
        auth: { token },
        transports: ["websocket"],
      });
      sioRef.current = sio;

      sio.on("connect", () => {
        if (alive) setConnected(true);
      });
      sio.on("disconnect", () => {
        if (alive) setConnected(false);
      });

      sio.on("chat.message", (data: any) => {
        // Lógica para manejar mensajes entrantes
      });

      sio.on("chat.typing", (data: any) => {
        if (data.client_session === clientSessionRef.current) return;
        setOtherTyping(data.typing);
      });

      sio.on("chat.join.success", (data: any) => {
        // Lógica para manejar éxito en join
      });
      
      sio.on("chat.join.error", (data: any) => {
        // Lógica para manejar error en join
      });

    })();

    return () => {
      alive = false;
      sioRef.current?.disconnect();
      sioRef.current = null;
    };
  }, [normRoom, role, socketio?.url, socketio?.token]);

  const emit = (event: string, ...args: any[]) => {
    sioRef.current?.emit(event, ...args);
  };

  return { sio: sioRef.current, emit, clientSessionId: clientSessionRef.current };
}
