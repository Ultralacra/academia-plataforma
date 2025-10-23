"use client";

import React from "react";

type Sender = "admin" | "alumno" | "coach";
type Message = {
  id: string;
  room: string;
  sender: Sender;
  text: string;
  at: string; // ISO
  delivered?: boolean;
  read?: boolean;
  srcParticipantId?: string | number | null;
};

type SocketIOConfig = {
  url?: string;
  tokenEndpoint?: string;
  tokenId?: string;
  idEquipo?: string; // para rol coach
  idCliente?: string; // no usado aquí, pero lo dejamos por compatibilidad
  participants?: any[]; // participantes deseados si no hay chatId
  autoCreate?: boolean; // default: false (crear al enviar)
  autoJoin?: boolean; // default: true si chatId
  chatId?: string | number;
};

export default function CoachChatInline({
  room,
  role = "coach",
  title = "Chat",
  subtitle,
  className,
  variant = "card",
  socketio,
  onConnectionChange,
  onChatInfo,
  requestListSignal,
  listParams,
  onChatsList,
}: {
  room: string;
  role?: Sender;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "card" | "minimal";
  socketio?: SocketIOConfig;
  onConnectionChange?: (connected: boolean) => void;
  onChatInfo?: (info: {
    chatId: string | number | null;
    myParticipantId: string | number | null;
    participants?: any[] | null;
  }) => void;
  requestListSignal?: number;
  listParams?: any;
  onChatsList?: (list: any[]) => void;
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

  const sioRef = React.useRef<any>(null);
  const chatIdRef = React.useRef<string | number | null>(socketio?.chatId ?? null);
  const myParticipantIdRef = React.useRef<string | number | null>(null);
  const seenRef = React.useRef<Set<string>>(new Set());
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = React.useRef<boolean>(true);
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
  const participantsRef = React.useRef<any[] | undefined>(
    socketio?.participants
  );
  const listParamsRef = React.useRef<any>(listParams);

  React.useEffect(() => {
    participantsRef.current = socketio?.participants;
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

  // Auto-scroll solo cuando el usuario está abajo
  React.useEffect(() => {
    requestAnimationFrame(() => {
      try {
        if (pinnedToBottomRef.current) {
          bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        }
      } catch {}
    });
  }, [items.length]);
  const onScrollContainer = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distance <= threshold;
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

  const getEmitter = (obj: any) =>
    obj?.id_chat_participante_emisor ?? obj?.emisor ?? obj?.id_emisor ?? null;

  const normalizeDateStr = (v: any): string | undefined => {
    if (!v) return undefined;
    const s = String(v);
    if (s.includes("T")) return s;
    if (s.includes(" ")) return s.replace(" ", "T");
    return s;
  };

  const markRead = React.useCallback(() => {
    try {
      if (chatId == null) return;
      const key = `chatLastReadById:coach:${String(chatId)}`;
      localStorage.setItem(key, String(Date.now()));
      const evt = new CustomEvent("chat:last-read-updated", {
        detail: { chatId, role: role },
      });
      window.dispatchEvent(evt);
    } catch {}
  }, [chatId, role]);

  // Conectar a Socket.IO
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = socketio?.url || undefined;
        const tokenEndpoint =
          socketio?.tokenEndpoint || "https://v001.onrender.com/v1/auth/token";
        const tokenId = socketio?.tokenId || `${role}:${normRoom}`;
        const res = await fetch(tokenEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tokenId }),
        });
        const json = await res.json().catch(() => ({}));
        const token = json?.token as string | undefined;
        if (!token) throw new Error("No se pudo obtener token de chat");
        const { io } = await import("socket.io-client");
        const sio = url
          ? io(url, {
              auth: { token },
              transports: ["websocket", "polling"],
              timeout: 20000,
            })
          : io({
              auth: { token },
              transports: ["websocket", "polling"],
              timeout: 20000,
            });
        sioRef.current = sio;
        sio.on("connect", () => {
          if (!alive) return;
          setConnected(true);
          onConnectionChange?.(true);
          try {
            console.log("[CoachChat] conectado", {
              room: normRoom,
              role,
              chatId: chatIdRef.current,
            });
          } catch {}
        });
        sio.on("disconnect", () => {
          if (!alive) return;
          setConnected(false);
          onConnectionChange?.(false);
          try {
            console.log("[CoachChat] desconectado", { room: normRoom, role });
          } catch {}
        });

  // Mensajes entrantes
        sio.on("chat.message", (msg: any) => {
          try {
            const currentChatId = chatIdRef.current;
            try {
              console.log("[CoachChat] chat.message <=", {
                id_chat: msg?.id_chat,
                id_mensaje: msg?.id_mensaje ?? msg?.id,
                texto: msg?.contenido ?? msg?.texto,
                emisor: getEmitter(msg),
                currentChatId,
              });
            } catch {}
            if (
              currentChatId != null &&
              msg?.id_chat != null &&
              String(msg.id_chat) !== String(currentChatId)
            ) {
              // de otro chat: disparar refresh de lista (no abrir)
              try {
                const evt = new CustomEvent("chat:list-refresh", {
                  detail: { reason: "message-other-chat", id_chat: msg?.id_chat },
                });
                window.dispatchEvent(evt);
                console.log("[CoachChat] chat.message de otro chat -> refresh lista", {
                  id_chat: msg?.id_chat,
                });
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
            // Fallback adicional: comparar con outbox (texto y tiempo cercanos)
            let senderIsMeByOutbox = false;
            try {
              const txt = String(msg?.contenido ?? msg?.texto ?? "").trim();
              const tMsg = Date.parse(
                String(normalizeDateStr(msg?.fecha_envio) || "")
              );
              for (let i = outboxRef.current.length - 1; i >= 0; i--) {
                const ob = outboxRef.current[i];
                if ((ob.text || "").trim() !== txt) continue;
                const near =
                  !isNaN(tMsg) && Math.abs(tMsg - (ob.at || 0)) < 12000;
                const nearNow = Math.abs(Date.now() - (ob.at || 0)) < 12000;
                if (near || nearNow) {
                  senderIsMeByOutbox = true;
                  break;
                }
              }
            } catch {}

            // Clasificación conservadora para evitar que coach↔coach marque ambos lados como "míos"
            let sender: Sender;
            if (role === "coach") {
              const mineEval =
                senderIsMeById || senderIsMeBySession || senderIsMeByOutbox;
              sender = mineEval ? "coach" : "alumno"; // el otro lado no es mío => alinear a la izquierda
            } else if (role === "alumno") {
              const tipoNorm = normalizeTipo(
                msg?.participante_tipo ||
                  getTipoByParticipantId(msg?.id_chat_participante_emisor)
              );
              const mineByTipo = tipoNorm === "cliente";
              sender =
                senderIsMeById ||
                senderIsMeBySession ||
                senderIsMeByOutbox ||
                mineByTipo
                  ? "alumno"
                  : "coach";
            } else {
              sender =
                senderIsMeById || senderIsMeBySession || senderIsMeByOutbox
                  ? role
                  : "alumno";
            }

            const newMsg: Message = {
              id,
              room: normRoom,
              sender,
              text: String(msg?.contenido ?? msg?.texto ?? "").trim(),
              at: String(
                normalizeDateStr(msg?.fecha_envio) || new Date().toISOString()
              ),
              delivered: true,
              read: false,
              srcParticipantId: getEmitter(msg),
            };
            setItems((prev) => {
              if (sender === role) {
                const next = [...prev];
                // Reconciliar con el último mensaje mío con el mismo texto
                for (let i = next.length - 1; i >= 0; i--) {
                  const mm = next[i];
                  if (mm.sender !== role) continue;
                  if ((mm.text || "").trim() !== (newMsg.text || "").trim())
                    continue;
                  // Si es optimista o está muy cerca en el tiempo, reemplazar
                  const tNew = Date.parse(newMsg.at || "");
                  const tOld = Date.parse(mm.at || "");
                  const near =
                    !isNaN(tNew) &&
                    !isNaN(tOld) &&
                    Math.abs(tNew - tOld) < 8000;
                  if (mm.delivered === false || near) {
                    next[i] = { ...newMsg, read: mm.read || false };
                    return next;
                  }
                }
              }
              return [...prev, newMsg];
            });
            markRead();
            try {
              console.log("[CoachChat] mensaje agregado", {
                id_local: id,
                sender,
                delivered: true,
              });
            } catch {}
            if (
              (myParticipantId == null || myParticipantId === "") &&
              sender === role &&
              msg?.id_chat_participante_emisor != null
            ) {
              setMyParticipantId(msg.id_chat_participante_emisor);
            }
          } catch {}
        });
        // Conversación creada en tiempo real (desde otro cliente): refrescar lista
        try {
          sio.on("chat.created", (data: any) => {
            try {
              const evt = new CustomEvent("chat:list-refresh", {
                detail: { reason: "chat-created", id_chat: data?.id_chat ?? data?.id },
              });
              window.dispatchEvent(evt);
              console.log("[CoachChat] chat.created recibido -> refresh lista", {
                id_chat: data?.id_chat ?? data?.id,
              });
            } catch {}
          });
        } catch {}

        sio.on("chat.message.read", (data: any) => {
          try {
            console.log("[CoachChat] chat.message.read <=", data);
            const idMsg = data?.id_mensaje ?? data?.id ?? null;
            if (!idMsg) return;
            setItems((prev) =>
              prev.map((m) =>
                String(m.id) === String(idMsg) ? { ...m, read: true } : m
              )
            );
          } catch {}
        });
        sio.on("chat.read.all", () => {
          try {
            console.log("[CoachChat] chat.read.all <= (marcar todos como leídos en UI)");
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
            // Ignorar eventos de mi misma sesión cliente (evita eco local al escribir)
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
              return; // mi propio typing
            // Mostrar si: client_session es distinta o el emisor está presente (y no es mío)
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
            // Mostrar sólo si es del otro lado
            setOtherTyping(true);
            setTimeout(() => setOtherTyping(false), 1800);
          } catch {}
        });

        // Auto-join si tenemos chatId y se permite
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    normRoom,
    role,
    socketio?.url,
    socketio?.tokenEndpoint,
    socketio?.tokenId,
  ]);

  // Join cuando cambia chatId pedido
  React.useEffect(() => {
    const newId = socketio?.chatId ?? null;
    const autoJoin = socketio?.autoJoin ?? true;
    if (String(latestRequestedChatIdRef.current ?? "") === String(newId ?? ""))
      return;
    latestRequestedChatIdRef.current = newId;
    if (newId == null || !autoJoin) return setIsJoining(false);
    // evitar rejoin duplicado
    if (String(lastJoinedChatIdRef.current ?? "") === String(newId)) {
      setIsJoining(false);
      return;
    }
    tryJoin(newId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketio?.chatId, socketio?.autoJoin]);

  function tryJoin(id: any) {
    const sio = sioRef.current;
    if (!sio) return;
    if (joinInFlightRef.current) return;
    joinInFlightRef.current = true;
    setIsJoining(true);
    setItems([]);
    seenRef.current = new Set();
    setChatId(null);
    setOtherTyping(false);
    const t = setTimeout(() => setIsJoining(false), 6000);
    sio.emit("chat.join", { id_chat: id }, (ack: any) => {
      try {
        clearTimeout(t);
        joinInFlightRef.current = false;
        if (ack && ack.success) {
          const data = ack.data || {};
          const cid = data.id_chat ?? id;
          if (cid != null) {
            setChatId(cid);
            chatIdRef.current = cid;
          }
          lastJoinedChatIdRef.current = cid;
          if (data.my_participante) {
            setMyParticipantId(data.my_participante);
            myParticipantIdRef.current = data.my_participante;
          }
          try {
            console.log("[CoachChat] JOIN ok", {
              id_chat: cid,
              my_participante: data?.my_participante ?? null,
              has_participants: !!(data.participants || data.participantes),
            });
          } catch {}
          const parts = data.participants || data.participantes || [];
          joinedParticipantsRef.current = Array.isArray(parts) ? parts : [];
          joinDataRef.current = { participants: joinedParticipantsRef.current };
          // Inferir my_participante por participantes si no vino explícito
          if (!myParticipantIdRef.current && role === "coach" && socketio?.idEquipo != null) {
            try {
              const mine = joinedParticipantsRef.current.find(
                (p: any) =>
                  String((p?.participante_tipo || "").toLowerCase()) === "equipo" &&
                  String(p?.id_equipo) === String(socketio.idEquipo) &&
                  p?.id_chat_participante != null
              );
              if (mine?.id_chat_participante != null) {
                setMyParticipantId(mine.id_chat_participante);
                myParticipantIdRef.current = mine.id_chat_participante;
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
            const isMineById =
              myPidLocal != null &&
              String(getEmitter(m) ?? "") === String(myPidLocal);
            let sender: Sender;
            if (role === "coach") {
              sender = isMineById ? "coach" : "alumno";
            } else if (role === "alumno") {
              const tipoNorm = normalizeTipo(
                m?.participante_tipo ||
                  getTipoByParticipantId(m?.id_chat_participante_emisor)
              );
              const mineByTipo = tipoNorm === "cliente";
              sender = isMineById || mineByTipo ? "alumno" : "coach";
            } else {
              sender = isMineById ? role : "alumno";
            }
            return {
              id: String(m?.id_mensaje ?? `${Date.now()}-${Math.random()}`),
              room: normRoom,
              sender,
              text: String(
                m?.Contenido ?? m?.contenido ?? m?.texto ?? ""
              ).trim(),
              at: String(
                normalizeDateStr(m?.fecha_envio) || new Date().toISOString()
              ),
              delivered: true,
              read: !!m?.leido,
              srcParticipantId: getEmitter(m),
            };
          });
          setItems(mapped);
          mapped.forEach((mm) => seenRef.current.add(mm.id));
          setIsJoining(false);
          try {
            onChatInfo?.({
              chatId: cid,
              myParticipantId: data?.my_participante ?? null,
              participants: joinedParticipantsRef.current,
            });
          } catch {}
        } else {
          try {
            console.warn("[CoachChat] JOIN fallo", ack);
          } catch {}
          setIsJoining(false);
        }
      } catch {
        joinInFlightRef.current = false;
        setIsJoining(false);
      }
    });
  }

  // Listar conversaciones cuando se pida
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
    }
    const payload = {
      ...roleFilter,
      ...base,
      include_participants: true,
      with_participants: true,
      includeParticipants: true,
      withParticipants: true,
    } as any;
    try {
      sio.emit("chat.list", payload, async (ack: any) => {
        try {
          try {
            console.log("[CoachChat] chat.list =>", { payload, success: ack?.success, items: Array.isArray(ack?.data) ? ack.data.length : 0 });
          } catch {}
          if (ack && ack.success === false) return; // no sobrescribir en error
          const list = Array.isArray(ack?.data) ? ack.data : [];
          const baseList: any[] = Array.isArray(list) ? list : [];
          const needEnrich = baseList.some(
            (it) => !Array.isArray(it?.participants || it?.participantes)
          );
          if (!needEnrich) {
            onChatsList?.(baseList);
            return;
          }
          const now = Date.now();
          if (now - (lastEnrichAtRef.current || 0) < 20000) {
            // throttle: entregar base si enriquecimiento fue reciente
            onChatsList?.(baseList);
            return;
          }
          lastEnrichAtRef.current = now;
          const sorted = [...baseList]
            .sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a))
            .slice(0, 10);
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
          onChatsList?.(merged);
        } catch {}
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, requestListSignal]);

  // Helper: refrescar listado inmediatamente (para subir el chat tras primer mensaje)
  const refreshListNow = React.useCallback(() => {
    try {
      const sio = sioRef.current;
      if (!sio || !connected) return;
      const base = (listParamsRef.current || {}) as any;
      const roleFilter: any = {};
      if (role === "coach" && socketio?.idEquipo != null) {
        roleFilter.participante_tipo = "equipo";
        roleFilter.id_equipo = String(socketio.idEquipo);
      }
      const payload = {
        ...roleFilter,
        ...base,
        include_participants: true,
        with_participants: true,
        includeParticipants: true,
        withParticipants: true,
      } as any;
      sio.emit("chat.list", payload, (ack: any) => {
        try {
          if (ack && ack.success === false) return;
          const list = Array.isArray(ack?.data) ? ack.data : [];
          onChatsList?.(list);
          try {
            console.log("[CoachChat] refreshListNow =>", { items: list.length });
          } catch {}
        } catch {}
      });
    } catch {}
  }, [connected, role, socketio?.idEquipo, onChatsList]);

  // Emitir read all cuando llegan mensajes y la ventana está visible
  React.useEffect(() => {
    if (!connected || chatId == null) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    try {
      console.log("[CoachChat] EMIT chat.read.all =>", { id_chat: chatId });
      sioRef.current?.emit("chat.read.all", { id_chat: chatId });
      markRead();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, connected, chatId]);

  async function ensureChatReadyForSend(): Promise<boolean> {
    try {
      if (chatId != null) return true;
      const sio = sioRef.current;
      if (!sio) return false;
      const autoCreate = socketio?.autoCreate ?? false;
      const participants = participantsRef.current ?? socketio?.participants;
      if (!Array.isArray(participants) || participants.length === 0)
        return false;
      try {
        console.log("[CoachChat] ensureChatReadyForSend: sin chatId, buscar/crear", {
          autoCreate,
          participants,
        });
      } catch {}
      // Primero intentamos listar y buscar coincidencia por participantes
      const listPayload: any = {};
      if (role === "coach" && socketio?.idEquipo != null) {
        listPayload.participante_tipo = "equipo";
        listPayload.id_equipo = String(socketio.idEquipo);
      }
      const list: any[] = await new Promise((resolve) => {
        try {
          if (!listPayload.participante_tipo) return resolve([]);
          sio.emit(
            "chat.list",
            {
              ...listPayload,
              include_participants: true,
              with_participants: true,
              includeParticipants: true,
              withParticipants: true,
            },
            (ack: any) => {
              const arr = Array.isArray(ack?.data) ? ack.data : [];
              resolve(arr);
            }
          );
        } catch {
          resolve([]);
        }
      });
      try { console.log("[CoachChat] ensureChatReadyForSend: chat.list obtuvo", list.length, "items"); } catch {}
      const buildKey = (p: any) => {
        const t = normalizeTipo(p?.participante_tipo);
        if (t === "equipo" && p?.id_equipo)
          return `equipo:${String(p.id_equipo).toLowerCase()}`;
        if (t === "cliente" && p?.id_cliente)
          return `cliente:${String(p.id_cliente).toLowerCase()}`;
        if (t === "admin" && p?.id_admin)
          return `admin:${String(p.id_admin).toLowerCase()}`;
        return null;
      };
      const desiredSet = new Set<string>();
      for (const p of participants) {
        const k = buildKey(p);
        if (k) desiredSet.add(k);
      }
      const equalSets = (a: Set<string>, b: Set<string>) =>
        a.size === b.size && [...a].every((x) => b.has(x));
      const isSubset = (a: Set<string>, b: Set<string>) =>
        [...a].every((x) => b.has(x));
      const findMatchInList = (arr: any[]): any | null => {
        let matchedLocal: any | null = null;
        let subsetMatchedLocal: any | null = null;
        for (const it of arr) {
          const parts = it?.participants || it?.participantes || [];
          const remote = new Set<string>();
          for (const p of parts) {
            const k = buildKey(p);
            if (k) remote.add(k);
          }
          if (remote.size === 0) continue;
          if (equalSets(desiredSet, remote)) {
            matchedLocal = it;
            break;
          }
          if (!subsetMatchedLocal && isSubset(desiredSet, remote))
            subsetMatchedLocal = it;
        }
        return matchedLocal || subsetMatchedLocal || null;
      };

      let matched: any | null = findMatchInList(list);

      if (matched && (matched.id_chat || matched.id)) {
        try { console.log("[CoachChat] ensureChatReadyForSend: MATCH existente", matched); } catch {}
        return await new Promise<boolean>((resolve) => {
          try {
            sio.emit(
              "chat.join",
              { id_chat: matched.id_chat ?? matched.id },
              (ack: any) => {
                try {
                  if (ack && ack.success) {
                    const data = ack.data || {};
                    const cid = data.id_chat ?? matched.id_chat ?? matched.id;
                    if (cid != null) {
                      setChatId(cid);
                      chatIdRef.current = cid;
                    }
                    if (data.my_participante) {
                      setMyParticipantId(data.my_participante);
                      myParticipantIdRef.current = data.my_participante;
                    }
                    try {
                      console.log("[CoachChat] JOIN ok (match)", {
                        id_chat: cid,
                        my_participante: data?.my_participante ?? null,
                      });
                    } catch {}
                    const parts = data.participants || data.participantes || [];
                    joinedParticipantsRef.current = Array.isArray(parts)
                      ? parts
                      : [];
                    joinDataRef.current = {
                      participants: joinedParticipantsRef.current,
                    };
                    // Inferir my_participante si no vino explícito
                    if (!myParticipantIdRef.current && role === "coach" && socketio?.idEquipo != null) {
                      try {
                        const mine = joinedParticipantsRef.current.find(
                          (p: any) =>
                            String((p?.participante_tipo || "").toLowerCase()) === "equipo" &&
                            String(p?.id_equipo) === String(socketio.idEquipo) &&
                            p?.id_chat_participante != null
                        );
                        if (mine?.id_chat_participante != null) {
                          setMyParticipantId(mine.id_chat_participante);
                          myParticipantIdRef.current = mine.id_chat_participante;
                        }
                      } catch {}
                    }
                    // mapear mensajes iniciales
                    const msgsSrc = Array.isArray(data.messages)
                      ? data.messages
                      : Array.isArray((data as any).mensajes)
                      ? (data as any).mensajes
                      : [];
                    const myPidLocal2 =
                      data?.my_participante ?? myParticipantIdRef.current;
                    const mapped: Message[] = msgsSrc.map((m: any) => {
                      const isMineById =
                        myPidLocal2 != null &&
                        String(getEmitter(m) ?? "") === String(myPidLocal2);
                      let sender: Sender;
                      if (role === "coach") {
                        sender = isMineById ? "coach" : "alumno";
                      } else if (role === "alumno") {
                        const tipoNorm = normalizeTipo(
                          m?.participante_tipo ||
                            getTipoByParticipantId(
                              m?.id_chat_participante_emisor
                            )
                        );
                        const mineByTipo = tipoNorm === "cliente";
                        sender = isMineById || mineByTipo ? "alumno" : "coach";
                      } else {
                        sender = isMineById ? role : "alumno";
                      }
                      return {
                        id: String(
                          m?.id_mensaje ?? `${Date.now()}-${Math.random()}`
                        ),
                        room: normRoom,
                        sender,
                        text: String(
                          m?.Contenido ?? m?.contenido ?? m?.texto ?? ""
                        ).trim(),
                        at: String(
                          normalizeDateStr(m?.fecha_envio) ||
                            new Date().toISOString()
                        ),
                        delivered: true,
                        read: !!m?.leido,
                        srcParticipantId: getEmitter(m),
                      };
                    });
                    setItems(mapped);
                    mapped.forEach((mm) => seenRef.current.add(mm.id));
                    try {
                      onChatInfo?.({
                        chatId: cid,
                        myParticipantId: data?.my_participante ?? null,
                        participants: joinedParticipantsRef.current,
                      });
                    } catch {}
                    resolve(true);
                  } else resolve(false);
                } catch {
                  resolve(false);
                }
              }
            );
          } catch {
            resolve(false);
          }
        });
      }

      if (!autoCreate) return false;

      // Crear si está permitido
      return await new Promise<boolean>((resolve) => {
        try {
          sio.emit(
            "chat.create-with-participants",
            { participants },
            (ack: any) => {
              try {
                if (ack && ack.success && ack.data) {
                  const data = ack.data;
                  // Intentar extraer id_chat con varios posibles formatos
                  let cid = data.id_chat ?? data.id ?? data?.chat?.id ?? ack?.id_chat ?? ack?.id ?? null;
                  if (cid != null) {
                    setChatId(cid);
                    chatIdRef.current = cid;
                  } else {
                    console.warn("[CoachChat] CREATE ok pero sin id_chat en ack; intentando localizar por participantes");
                  }
                  try {
                    console.log("[CoachChat] CREATE ok", { id_chat: cid, data });
                  } catch {}
                  const parts = data.participants || data.participantes || [];
                  joinedParticipantsRef.current = Array.isArray(parts)
                    ? parts
                    : [];
                  joinDataRef.current = {
                    participants: joinedParticipantsRef.current,
                  };
                  // Intentar fijar my_participante de inmediato por participantes
                  if (!myParticipantIdRef.current && role === "coach" && socketio?.idEquipo != null) {
                    try {
                      const mine = joinedParticipantsRef.current.find(
                        (p: any) =>
                          String((p?.participante_tipo || "").toLowerCase()) === "equipo" &&
                          String(p?.id_equipo) === String(socketio.idEquipo) &&
                          p?.id_chat_participante != null
                      );
                      if (mine?.id_chat_participante != null) {
                        setMyParticipantId(mine.id_chat_participante);
                        myParticipantIdRef.current = mine.id_chat_participante;
                      }
                    } catch {}
                  }
                  // Notificar a la vista local para refrescar lista
                  try {
                    const evt = new CustomEvent("chat:list-refresh", {
                      detail: { reason: "chat-created-local", id_chat: cid },
                    });
                    window.dispatchEvent(evt);
                    console.log("[CoachChat] dispatch chat:list-refresh (created local)", { id_chat: cid });
                  } catch {}
                  onChatInfo?.({
                    chatId: cid,
                    myParticipantId: null,
                    participants: joinedParticipantsRef.current,
                  });
                  // Resolver chatId si no vino en el ack (buscar por participantes)
                  const finalizeWithJoin = (finalChatId: any) => {
                    // join para asegurar my_participante y mensajes, y resolver sólo cuando lo tengamos
                    let settled = false;
                    const to = setTimeout(() => {
                      if (!settled) {
                        settled = true;
                        console.warn("[CoachChat] JOIN post-create timeout (resolviendo true sin my_participante aún)");
                        resolve(true);
                      }
                    }, 1500);
                    sio.emit("chat.join", { id_chat: finalChatId }, (ackJoin: any) => {
                      try {
                        if (ackJoin && ackJoin.success) {
                          const dj = ackJoin.data || {};
                          if (dj.my_participante) {
                            setMyParticipantId(dj.my_participante);
                            myParticipantIdRef.current = dj.my_participante;
                          }
                          try {
                            console.log("[CoachChat] JOIN ok (post-create)", {
                              id_chat: finalChatId,
                              my_participante: dj?.my_participante ?? null,
                            });
                          } catch {}
                          const parts2 =
                            dj.participants || dj.participantes || parts;
                          joinedParticipantsRef.current = Array.isArray(parts2)
                            ? parts2
                            : [];
                          joinDataRef.current = {
                            participants: joinedParticipantsRef.current,
                          };
                          // Reforzar inferencia por participantes
                          if (!myParticipantIdRef.current && role === "coach" && socketio?.idEquipo != null) {
                            try {
                              const mine = joinedParticipantsRef.current.find(
                                (p: any) =>
                                  String((p?.participante_tipo || "").toLowerCase()) === "equipo" &&
                                  String(p?.id_equipo) === String(socketio.idEquipo) &&
                                  p?.id_chat_participante != null
                              );
                              if (mine?.id_chat_participante != null) {
                                setMyParticipantId(mine.id_chat_participante);
                                myParticipantIdRef.current = mine.id_chat_participante;
                              }
                            } catch {}
                          }
                        }
                      } catch {}
                      if (!settled) {
                        settled = true;
                        clearTimeout(to);
                        resolve(true);
                      }
                    });
                  };
                  if (cid != null) {
                    finalizeWithJoin(cid);
                  } else {
                    // Buscar el chat recién creado por participantes (hasta 3 intentos)
                    (async () => {
                      let found: any | null = null;
                      for (let i = 0; i < 3; i++) {
                        await new Promise((r) => setTimeout(r, 350));
                        const fresh: any[] = await new Promise((resolve2) => {
                          try {
                            sio.emit(
                              "chat.list",
                              {
                                ...listPayload,
                                include_participants: true,
                                with_participants: true,
                                includeParticipants: true,
                                withParticipants: true,
                              },
                              (ack2: any) => {
                                resolve2(Array.isArray(ack2?.data) ? ack2.data : []);
                              }
                            );
                          } catch {
                            resolve2([]);
                          }
                        });
                        const m = findMatchInList(fresh);
                        if (m && (m.id_chat || m.id)) {
                          found = m;
                          break;
                        }
                      }
                      if (found && (found.id_chat || found.id)) {
                        const finalId = found.id_chat ?? found.id;
                        setChatId(finalId);
                        chatIdRef.current = finalId;
                        console.log("[CoachChat] CREATE fallback: localizado chatId por participantes", { id_chat: finalId });
                        finalizeWithJoin(finalId);
                      } else {
                        console.warn("[CoachChat] CREATE fallback: no se pudo localizar el chat recién creado");
                        resolve(false);
                      }
                    })();
                  }
                } else {
                  try {
                    console.warn("[CoachChat] CREATE fallo", ack);
                  } catch {}
                  resolve(false);
                }
              } catch {
                resolve(false);
              }
            }
          );
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }

  async function send() {
    const val = text.trim();
    if (!val) return;
    setText("");
    try {
      const sio = sioRef.current;
      if (!sio) return;
      if (chatIdRef.current == null) {
        console.log("[CoachChat] send(): no chatId, intentando ensureChatReadyForSend");
        const ok = await ensureChatReadyForSend();
        if (chatIdRef.current == null) {
          // Pequeña espera adicional por si el join terminó de forma ligeramente tardía
          for (let i = 0; i < 15 && chatIdRef.current == null; i++) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        if (!ok || chatIdRef.current == null) {
          console.warn("[CoachChat] send(): abortado, no hay chatId tras ensureChatReadyForSend");
          return;
        }
      }
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
        }
      }
      // Espera corta si aún no tenemos pid (join puede demorar)
      if (effectivePid == null) {
        console.log("[CoachChat] send(): esperando my_participante…");
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
          }
        }
      }
      console.log("[CoachChat] send(): preparado para enviar", {
        id_chat: chatIdRef.current,
        pid: effectivePid,
        text: val,
      });
      const clientId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimistic: Message = {
        id: clientId,
        room: normRoom,
        sender: role,
        text: val,
        at: new Date().toISOString(),
        delivered: false,
        read: false,
        srcParticipantId: effectivePid ?? undefined,
      };
      setItems((prev) => [...prev, optimistic]);
      seenRef.current.add(clientId);
      outboxRef.current.push({
        clientId,
        text: val,
        at: Date.now(),
        pid: effectivePid,
      });

      if (chatIdRef.current == null || effectivePid == null) {
        console.error("[CoachChat] send(): NO ENVÍA — faltan datos", {
          id_chat: chatIdRef.current,
          pid: effectivePid,
        });
        return; // safety: no enviar sin contexto
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
            console.log("[CoachChat] chat.message.send ACK <=", {
              success: ack?.success,
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
                  // Ya llegó el mensaje del servidor (por evento) antes del ack; eliminar el optimista
                  if (optimisticIdx >= 0) next.splice(optimisticIdx, 1);
                  // Asegurar delivered en el existente
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
            // Nota: ya no refrescamos la lista en cada envío. La lista
            // se refresca cuando se crea una nueva conversación vía onChatInfo.
            try {
              // tras enviar, apagar "escribiendo"
              emitTyping(false);
              if (typingRef.current.timer) {
                clearTimeout(typingRef.current.timer);
                typingRef.current.on = false;
              }
            } catch {}
          } catch {}
        }
      );
      markRead();
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
      try {
        if (on) console.log("[CoachChat] EMIT typing:on", payload);
      } catch {}
    } catch {}
  }

  const notifyTyping = (on: boolean) => {
    try {
      const state = typingRef.current;
      if (on && !state.on) {
        emitTyping(true);
        state.on = true;
      }
      // reiniciar temporizador para enviar "false" tras inactividad
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

  const mine = (s: Sender) => (s || "").toLowerCase() === role.toLowerCase();
  const formatTime = React.useCallback((iso: string | undefined) => {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  return (
    <div className={`flex flex-col w-full min-h-0 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate">
              {subtitle}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {connected ? "Conectado" : "Desconectado"}
        </div>
      </div>

      {/* Mensajes */}
      <div
        ref={scrollRef}
        onScroll={onScrollContainer}
        className="flex-1 overflow-y-auto p-3 min-h-0 bg-[#efeae2]"
      >
        {isJoining && items.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-xs text-muted-foreground">Cargando…</div>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-xs text-muted-foreground">Sin mensajes</div>
          </div>
        ) : (
          items.map((m, idx) => {
            const isMine = mine(m.sender);
            const prev = idx > 0 ? items[idx - 1] : null;
            const next = idx + 1 < items.length ? items[idx + 1] : null;
            const samePrev = prev && prev.sender === m.sender;
            const sameNext = next && next.sender === m.sender;
            const newGroup = !samePrev;
            const endGroup = !sameNext;

            // Bordes estilo WhatsApp (agrupación)
            let radius = "rounded-2xl";
            if (isMine) {
              if (newGroup && !endGroup) radius += " rounded-br-sm";
              if (!newGroup && !endGroup)
                radius += " rounded-tr-sm rounded-br-sm";
              if (!newGroup && endGroup) radius += " rounded-tr-sm";
            } else {
              if (newGroup && !endGroup) radius += " rounded-bl-sm";
              if (!newGroup && !endGroup)
                radius += " rounded-tl-sm rounded-bl-sm";
              if (!newGroup && endGroup) radius += " rounded-tl-sm";
            }

            const wrapperMt = newGroup ? "mt-2.5" : "mt-1";

            return (
              <div
                key={m.id}
                className={`flex ${
                  isMine ? "justify-end" : "justify-start"
                } ${wrapperMt}`}
              >
                <div
                  className={`w-fit max-w-[75%] px-3 py-2 text-sm shadow ${radius} ${
                    isMine
                      ? "bg-[#dcf8c6] text-gray-900"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words leading-[1.15]">
                    {m.text}
                  </div>
                  <div
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-gray-600" : "text-gray-500"
                    } flex items-center gap-1 justify-end select-none`}
                  >
                    {formatTime(m.at)}
                    {isMine && (
                      <span
                        className={`ml-0.5 ${
                          m.read ? "text-sky-600" : "text-gray-500"
                        }`}
                      >
                        {m.read ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {otherTyping && (
          <div className="text-xs text-muted-foreground px-2">Escribiendo…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) notifyTyping(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              } else {
                notifyTyping(true);
              }
            }}
            placeholder="Escribe un mensaje"
            className="flex-1 border rounded-full px-3 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="px-3 py-2 rounded-full bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
