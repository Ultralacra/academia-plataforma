"use client";

import React from "react";
import {
  Sender,
  Attachment,
  Message,
  SocketIOConfig,
  TicketData,
  PendingAttachment,
} from "./chat-types";

export function useChatState({
  room,
  role,
  socketio,
  precreateOnParticipants,
  listParams,
}: {
  room: string;
  role: Sender;
  socketio?: SocketIOConfig;
  precreateOnParticipants?: boolean;
  listParams?: any;
}) {
  const normRoom = React.useMemo(
    () => (room || "").trim().toLowerCase(),
    [room]
  );

  const [connected, setConnected] = React.useState(false);
  const [items, setItems] = React.useState<Message[]>([]);
  const [text, setText] = React.useState("");
  const [isJoining, setIsJoining] = React.useState(false);
  const [chatId, setChatId] = React.useState<string | number | null>(
    socketio?.chatId ?? null
  );
  const [myParticipantId, setMyParticipantId] = React.useState<
    string | number | null
  >(null);
  const [otherTyping, setOtherTyping] = React.useState(false);
  
  const [ticketModalOpen, setTicketModalOpen] = React.useState(false);
  const [ticketLoading, setTicketLoading] = React.useState(false);
  const [ticketError, setTicketError] = React.useState<string | null>(null);
  const [ticketData, setTicketData] = React.useState<TicketData | null>(null);

  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  
  const [uploadState, setUploadState] = React.useState<{
    active: boolean;
    total: number;
    done: number;
    current?: string;
  }>({ active: false, total: 0, done: 0 });

  const [recording, setRecording] = React.useState(false);
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  
  const [previewAttachment, setPreviewAttachment] = React.useState<Attachment | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = React.useRef<boolean>(true);

  // Reset suave al cambiar participantes
  React.useEffect(() => {
    if (!precreateOnParticipants) return;
    setChatId(null);
    setItems([]);
    setOtherTyping(false);
  }, [socketio?.participants, precreateOnParticipants]);

  // Auto-scroll
  React.useEffect(() => {
    if (!pinnedToBottomRef.current) return;
    requestAnimationFrame(() => {
      try {
        const sc = scrollRef.current;
        if (sc) {
          sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
        }
      } catch {}
    });
  }, [items.length]);

  const onScrollContainer = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 50;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distance <= threshold;
  }, []);

  return {
    normRoom,
    connected, setConnected,
    items, setItems,
    text, setText,
    isJoining, setIsJoining,
    chatId, setChatId,
    myParticipantId, setMyParticipantId,
    otherTyping, setOtherTyping,
    ticketModalOpen, setTicketModalOpen,
    ticketLoading, setTicketLoading,
    ticketError, setTicketError,
    ticketData, setTicketData,
    uploading, setUploading,
    uploadError, setUploadError,
    uploadState, setUploadState,
    recording, setRecording,
    attachments, setAttachments,
    previewAttachment, setPreviewAttachment,
    previewOpen, setPreviewOpen,
    bottomRef,
    scrollRef,
    pinnedToBottomRef,
    onScrollContainer,
  };
}
