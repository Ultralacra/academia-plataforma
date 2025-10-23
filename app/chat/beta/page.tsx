"use client";

import ChatRealtime from "@/components/chat/ChatRealtime";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dataService,
  type StudentItem,
  type TeamWithCounts,
} from "@/lib/data-service";

export default function ChatBetaPage() {
  const { user } = useAuth();
  const userIdent = (user as any)?.id ?? (user as any)?.email ?? "anonymous";
  const room = user?.role === "student" ? String(userIdent) : "global";
  const [currentRoom, setCurrentRoom] = useState<string>(room);
  const [teams, setTeams] = useState<TeamWithCounts[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedCoachCode, setSelectedCoachCode] = useState<string | null>(
    null
  );
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | number | null
  >(null);
  const [connectedLeft, setConnectedLeft] = useState<boolean>(false);
  const [connectedRight, setConnectedRight] = useState<boolean>(false);
  const [chatLeftInfo, setChatLeftInfo] = useState<{
    chatId: string | number | null;
    myParticipantId: string | number | null;
  }>({ chatId: null, myParticipantId: null });
  const [chatRightInfo, setChatRightInfo] = useState<{
    chatId: string | number | null;
    myParticipantId: string | number | null;
  }>({ chatId: null, myParticipantId: null });
  const [sharedChatId, setSharedChatId] = useState<string | number | null>(
    null
  );
  const [openTarget, setOpenTarget] = useState<"alumno" | "coach" | null>(null);
  const [chatsLeft, setChatsLeft] = useState<any[]>([]);
  const [chatsRight, setChatsRight] = useState<any[]>([]);
  const [leftListSignal, setLeftListSignal] = useState<number>(0);
  const [rightListSignal, setRightListSignal] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Cargar coaches desde TEAMS (v2) como pidió el endpoint
        const res = await dataService.getTeamsV2({ page: 1, pageSize: 50 });
        if (!alive) return;
        setTeams(res.data || []);
        try {
          console.debug("[beta] teams cargados:", (res.data || []).length);
        } catch {}
      } catch {}
    })();
    (async () => {
      try {
        const st = await dataService.getStudents({ pageSize: 1000 });
        if (!alive) return;
        setStudents(st.items ?? []);
        try {
          console.debug("[beta] students cargados:", (st.items || []).length);
        } catch {}
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Derivar sala y participantes cuando haya selección
  const composedRoom = useMemo(() => {
    if (selectedCoachId && selectedStudentId)
      return `${selectedCoachId}:${selectedStudentId}`;
    return currentRoom;
  }, [selectedCoachId, selectedStudentId, currentRoom]);

  const participants = useMemo(() => {
    if (!selectedCoachId || !selectedStudentId) return undefined;
    const p = [
      {
        participante_tipo: "cliente",
        id_cliente: String(selectedStudentId),
        id_equipo: String(selectedCoachId),
      },
      { participante_tipo: "equipo", id_equipo: String(selectedCoachId) },
    ];
    try {
      console.debug("[beta] participants calculados =>", p);
    } catch {}
    return p;
  }, [selectedCoachId, selectedStudentId]);

  // Al cambiar la selección, refrescar listas sin limpiar el chat compartido.
  // Evita perder el chatId recién creado antes de que el otro panel haga join.
  // Nota: desactivamos el auto-refresh; el usuario actualizará con el botón.
  useEffect(() => {
    try {
      console.debug("[beta] selección cambiada =>", {
        coachId: selectedCoachId,
        studentId: selectedStudentId,
      });
    } catch {}
  }, [selectedCoachId, selectedStudentId]);

  // Importante: cuando cambiamos el código del equipo (usado para listar por coach),
  // también disparamos actualización de las listas del lado coach y alumno para evitar tener que pulsar "Actualizar".
  // Nota: desactivamos el auto-refresh al cambiar el código del coach.
  useEffect(() => {
    if (selectedCoachCode) {
      try {
        console.debug("[beta] coach code actualizado =>", selectedCoachCode);
      } catch {}
    }
  }, [selectedCoachCode]);

  // Auto-seleccionar conversación existente (no crear) en cuanto haya selección y listas cargadas.
  // Si hay ambos seleccionados, tomamos la más reciente; si solo uno, auto-abrimos desde ese lado.
  // Desactivamos el auto-abrir conversaciones: se creará al enviar si no existe
  // y se abrirá sólo al hacer clic en una existente.
  useEffect(() => {
    // Intencionalmente vacío
  }, [selectedCoachId, selectedStudentId, chatsLeft, chatsRight, sharedChatId]);

  const roleForChat =
    user?.role === "student"
      ? "alumno"
      : user?.role === "coach"
      ? "coach"
      : "admin";

  const coachName = useMemo(() => {
    if (!selectedCoachId) return "";
    const found = teams.find((t) => String(t.id) === String(selectedCoachId));
    return found?.nombre || String(selectedCoachId);
  }, [teams, selectedCoachId]);

  const studentName = useMemo(() => {
    if (!selectedStudentId) return "";
    const found = students.find(
      (s) => String(s.code ?? s.id) === String(selectedStudentId)
    );
    return found?.name || String(selectedStudentId);
  }, [students, selectedStudentId]);

  const handleLeftChatInfo = useCallback(
    (info: {
      chatId: string | number | null;
      myParticipantId: string | number | null;
      participants?: any[] | null;
    }) => {
      setChatLeftInfo(info);
      try {
        console.debug("[beta] onChatInfo (alumno) <=", info);
      } catch {}
      try {
        // Solo sincronizamos selección desde onChatInfo si corresponde al chat actualmente abierto.
        if (
          sharedChatId != null &&
          info.chatId != null &&
          String(info.chatId) === String(sharedChatId)
        ) {
          const parts = Array.isArray(info.participants)
            ? info.participants
            : [];
          if (parts.length) {
            const tipo = (t: any) => String(t ?? "").toLowerCase();
            const norm = (v: any) => String(v ?? "").trim();
            const pCliente = parts.find((p: any) =>
              ["cliente", "alumno", "student"].includes(
                tipo(p?.participante_tipo)
              )
            );
            const pEquipo = parts.find((p: any) =>
              ["equipo", "coach"].includes(tipo(p?.participante_tipo))
            );
            const idCliente =
              norm(pCliente?.id_cliente) || norm(pCliente?.id_alumno);
            const idEquipo = norm(pEquipo?.id_equipo);
            if (idCliente) setSelectedStudentId(idCliente);
            if (idEquipo) {
              // Solo actualizamos el código; NO sobre-escribimos selectedCoachId (que es el id numérico)
              setSelectedCoachCode(idEquipo);
            }
          }
        }
      } catch {}
    },
    [sharedChatId]
  );

  const handleRightChatInfo = useCallback(
    (info: {
      chatId: string | number | null;
      myParticipantId: string | number | null;
      participants?: any[] | null;
    }) => {
      setChatRightInfo(info);
      try {
        console.debug("[beta] onChatInfo (coach) <=", info);
      } catch {}
      try {
        if (
          sharedChatId != null &&
          info.chatId != null &&
          String(info.chatId) === String(sharedChatId)
        ) {
          const parts = Array.isArray(info.participants)
            ? info.participants
            : [];
          if (parts.length) {
            const tipo = (t: any) => String(t ?? "").toLowerCase();
            const norm = (v: any) => String(v ?? "").trim();
            const pCliente = parts.find((p: any) =>
              ["cliente", "alumno", "student"].includes(
                tipo(p?.participante_tipo)
              )
            );
            const pEquipo = parts.find((p: any) =>
              ["equipo", "coach"].includes(tipo(p?.participante_tipo))
            );
            const idCliente =
              norm(pCliente?.id_cliente) || norm(pCliente?.id_alumno);
            const idEquipo = norm(pEquipo?.id_equipo);
            if (idCliente) setSelectedStudentId(idCliente);
            if (idEquipo) {
              // Solo actualizamos el código; NO sobre-escribimos selectedCoachId (que es el id numérico)
              setSelectedCoachCode(idEquipo);
            }
          }
        }
      } catch {}
    },
    [sharedChatId]
  );

  // Lista de conversaciones (UI)
  function ChatsList({
    list,
    emptyText,
    onPick,
  }: {
    itemsKey?: string;
    list: any[];
    emptyText: string;
    // Pasamos también el item completo para poder extraer alumno/equipo al seleccionar
    onPick: (chatId: string | number, item: any) => void;
  }) {
    const items = Array.isArray(list) ? list : [];
    if (items.length === 0)
      return (
        <div className="text-xs text-gray-500 border rounded p-2 bg-gray-50">
          {emptyText}
        </div>
      );
    return (
      <ul className="space-y-1 text-sm">
        {items.map((c: any, i: number) => {
          const id = c?.id_chat ?? c?.id ?? c?.chatId ?? String(i);
          const last = c?.last_message ?? c?.ultimo_mensaje ?? c?.last?.text;
          const title = c?.title ?? c?.titulo ?? c?.name ?? `Chat ${id}`;
          return (
            <li key={String(id)} className="py-0.5">
              <button
                className="w-full text-left hover:underline"
                onClick={() => onPick(id, c)}
                title={String(last || "")}
              >
                {title}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student"]}>
      <DashboardLayout>
        <div className="p-4 h-full min-h-0">
          <h1 className="text-lg font-semibold mb-2">Chat Beta</h1>
          <div className="grid grid-cols-5 gap-4 h-[80vh]">
            <div className="col-span-1 overflow-auto border rounded p-2 bg-white">
              <h2 className="text-sm font-semibold mb-2">Coachs (Equipo)</h2>
              <ul className="space-y-1 text-sm">
                {teams.map((t) => (
                  <li key={String(t.id)} className="py-1">
                    <button
                      className={`w-full text-left text-sm hover:underline ${
                        String(selectedCoachId) === String(t.id)
                          ? "text-sky-700 font-medium"
                          : ""
                      }`}
                      onClick={() => {
                        try {
                          console.debug("[beta] coach seleccionado =>", t);
                        } catch {}
                        setSelectedCoachId(String(t.id));
                        setSelectedCoachCode(t.codigo || String(t.id));
                        // Al cambiar de coach, limpiamos el chat compartido para ver en blanco
                        setSharedChatId(null);
                      }}
                      title={`${t.puesto || ""}${t.area ? " · " + t.area : ""}`}
                    >
                      {t.nombre}
                    </button>
                  </li>
                ))}
              </ul>
              <h2 className="text-sm font-semibold mt-4 mb-2">Alumnos</h2>
              <ul className="space-y-1 text-sm">
                {students.map((s) => (
                  <li key={String(s.id)} className="py-1">
                    <button
                      className={`w-full text-left text-sm hover:underline ${
                        String(selectedStudentId) === String(s.code ?? s.id)
                          ? "text-sky-700 font-medium"
                          : ""
                      }`}
                      onClick={() => {
                        try {
                          console.debug("[beta] alumno seleccionado =>", s);
                        } catch {}
                        setSelectedStudentId(String(s.code ?? s.id));
                        // Al cambiar de alumno, limpiamos el chat compartido para ver en blanco
                        setSharedChatId(null);
                      }}
                    >
                      {s.name} · {s.code}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-2 text-xs text-gray-600 bg-gray-50 border rounded">
                <div className="font-semibold mb-1">Configuración actual</div>
                <div>
                  Coach (equipo): {selectedCoachId ?? "—"}
                  {selectedCoachCode ? ` · código ${selectedCoachCode}` : ""}
                </div>
                <div>Alumno (cliente): {selectedStudentId ?? "—"}</div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] w-14">Alumno:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                        connectedLeft
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {connectedLeft ? "Conectado" : "Desconectado"}
                    </span>
                    {chatLeftInfo.chatId != null && (
                      <span className="text-[11px]">
                        chatId: {String(chatLeftInfo.chatId)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] w-14">Coach:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                        connectedRight
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {connectedRight ? "Conectado" : "Desconectado"}
                    </span>
                    {chatRightInfo.chatId != null && (
                      <span className="text-[11px]">
                        chatId: {String(chatRightInfo.chatId)}
                      </span>
                    )}
                  </div>
                </div>
                {selectedCoachId && selectedStudentId && (
                  <div className="mt-2">
                    <div className="text-[11px] font-semibold mb-1">
                      Payload participantes
                    </div>
                    <pre className="text-[11px] bg-white border rounded p-2 overflow-auto">
                      {`[
  { "participante_tipo": "cliente", "id_cliente": "${String(
    selectedStudentId
  )}", "id_equipo": "${String(selectedCoachId)}" },
  { "participante_tipo": "equipo",  "id_equipo": "${String(selectedCoachId)}" }
]`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            {/* Columna de conversaciones abiertas */}
            <div className="col-span-1 overflow-auto border rounded p-2 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Conversaciones Alumno</h2>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={
                    !selectedStudentId
                      ? "Selecciona un alumno para listar"
                      : !connectedLeft
                      ? "Conectando..."
                      : "Actualizar"
                  }
                  onClick={() => {
                    try {
                      if (selectedStudentId) {
                        console.debug("[beta] refresh alumno -> payload", {
                          participante_tipo: "cliente",
                          id_cliente: String(selectedStudentId),
                        });
                      }
                    } catch {}
                    setLeftListSignal((n) => n + 1);
                  }}
                  disabled={!connectedLeft || !selectedStudentId}
                  aria-label="Actualizar conversaciones de alumno"
                >
                  <RotateCw className="size-4" />
                </Button>
              </div>
              <ChatsList
                list={chatsLeft}
                emptyText="Sin conversaciones abiertas (alumno)"
                onPick={(cid, item) => {
                  console.debug("[chat.list pick] alumno -> abrir chat", cid);
                  try {
                    console.debug("[beta] abrir chat existente (alumno)", {
                      cid,
                      item,
                    });
                  } catch {}
                  // Extraer ids desde el item seleccionado para refrescar encabezados
                  try {
                    const parts =
                      item?.participants || item?.participantes || [];
                    const norm = (v: any) => String(v ?? "").trim();
                    const tipo = (t: any) => String(t ?? "").toLowerCase();
                    const pCliente = parts.find((p: any) =>
                      ["cliente", "alumno", "student"].includes(
                        tipo(p?.participante_tipo)
                      )
                    );
                    const pEquipo = parts.find((p: any) =>
                      ["equipo", "coach"].includes(tipo(p?.participante_tipo))
                    );
                    const idCliente =
                      norm(pCliente?.id_cliente) ||
                      norm(pCliente?.id_alumno) ||
                      norm(pCliente?.client_id);
                    const idEquipo =
                      norm(pEquipo?.id_equipo) ||
                      norm(item?.id_equipo) ||
                      norm(item?.equipo);
                    if (idCliente) setSelectedStudentId(idCliente);
                    if (idEquipo) {
                      setSelectedCoachCode(idEquipo);
                      setSelectedCoachId(idEquipo);
                    }
                  } catch {}
                  setSharedChatId(cid);
                  setOpenTarget("alumno");
                }}
              />
              {/* Auto-refresh con selección; botón de actualizar eliminado */}

              <div className="flex items-center justify-between mt-4 mb-2">
                <h2 className="text-sm font-semibold">Conversaciones Coach</h2>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={
                    !selectedCoachId
                      ? "Selecciona un coach para listar"
                      : !connectedRight
                      ? "Conectando..."
                      : "Actualizar"
                  }
                  onClick={() => {
                    try {
                      if (selectedCoachId || selectedCoachCode) {
                        console.debug("[beta] refresh coach -> payload", {
                          participante_tipo: "equipo",
                          id_equipo: String(
                            selectedCoachCode ?? selectedCoachId
                          ),
                        });
                      }
                    } catch {}
                    setRightListSignal((n) => n + 1);
                  }}
                  disabled={!connectedRight || !selectedCoachId}
                  aria-label="Actualizar conversaciones de coach"
                >
                  <RotateCw className="size-4" />
                </Button>
              </div>
              <ChatsList
                list={chatsRight}
                emptyText="Sin conversaciones abiertas (coach)"
                onPick={(cid, item) => {
                  console.debug("[chat.list pick] coach -> abrir chat", cid);
                  try {
                    console.debug("[beta] abrir chat existente (coach)", {
                      cid,
                      item,
                    });
                  } catch {}
                  try {
                    const parts =
                      item?.participants || item?.participantes || [];
                    const norm = (v: any) => String(v ?? "").trim();
                    const tipo = (t: any) => String(t ?? "").toLowerCase();
                    const pCliente = parts.find((p: any) =>
                      ["cliente", "alumno", "student"].includes(
                        tipo(p?.participante_tipo)
                      )
                    );
                    const pEquipo = parts.find((p: any) =>
                      ["equipo", "coach"].includes(tipo(p?.participante_tipo))
                    );
                    const idCliente =
                      norm(pCliente?.id_cliente) ||
                      norm(pCliente?.id_alumno) ||
                      norm(pCliente?.client_id);
                    const idEquipo =
                      norm(pEquipo?.id_equipo) ||
                      norm(item?.id_equipo) ||
                      norm(item?.equipo);
                    if (idCliente) setSelectedStudentId(idCliente);
                    if (idEquipo) {
                      setSelectedCoachCode(idEquipo);
                      setSelectedCoachId(idEquipo);
                    }
                  } catch {}
                  setSharedChatId(cid);
                  setOpenTarget("coach");
                }}
              />
              {/* Auto-refresh con selección; botón de actualizar eliminado */}
            </div>

            <div className="col-span-3 h-full grid grid-cols-2 gap-4">
              {/* Lado Alumno */}
              <div className="h-full">
                <div className="text-xs text-gray-600 mb-1">Vista Alumno</div>
                {(() => {
                  // Si hay sharedChatId, ambos paneles deben unirse para ver los mensajes en tiempo real
                  const joiningExisting = !!sharedChatId;
                  return (
                    <ChatRealtime
                      key={`left:${String(selectedCoachId ?? "-")}:${String(
                        selectedStudentId ?? "-"
                      )}:${String(sharedChatId ?? "none")}`}
                      room={`${composedRoom}:alumno`}
                      role="alumno"
                      title={studentName || "Alumno"}
                      subtitle={coachName ? `con ${coachName}` : undefined}
                      variant="fullscreen"
                      transport="socketio"
                      className="h-full"
                      showGenerateTicket={false}
                      socketio={{
                        url: "https://v001.onrender.com",
                        tokenEndpoint:
                          "https://v001.onrender.com/v1/auth/token",
                        tokenId: selectedStudentId
                          ? `alumno:${String(selectedStudentId)}`
                          : String(userIdent),
                        participants: participants,
                        idCliente:
                          selectedStudentId != null
                            ? String(selectedStudentId)
                            : undefined,
                        idEquipo:
                          selectedCoachId != null
                            ? String(selectedCoachId)
                            : undefined,
                        autoCreate: false,
                        autoJoin: !!sharedChatId,
                        chatId: sharedChatId ?? undefined,
                      }}
                      onConnectionChange={setConnectedLeft}
                      onChatInfo={handleLeftChatInfo}
                      listOnConnect={false}
                      requestListSignal={leftListSignal}
                      listParams={(() => {
                        // Listar TODAS las conversaciones del alumno seleccionado
                        if (!selectedStudentId) return undefined;
                        return {
                          participante_tipo: "cliente",
                          id_cliente: String(selectedStudentId),
                        };
                      })()}
                      onChatsList={(list) => {
                        console.debug("[chat.list] (alumno) =>", list);
                        setChatsLeft(list);
                      }}
                    />
                  );
                })()}
              </div>
              {/* Lado Coach */}
              <div className="h-full">
                <div className="text-xs text-gray-600 mb-1">Vista Coach</div>
                <ChatRealtime
                  key={`right:${String(selectedCoachId ?? "-")}:${String(
                    selectedStudentId ?? "-"
                  )}:${String(sharedChatId ?? "none")}`}
                  room={`${composedRoom}:coach`}
                  role="coach"
                  title={coachName || "Coach"}
                  subtitle={studentName ? `con ${studentName}` : undefined}
                  variant="fullscreen"
                  transport="socketio"
                  className="h-full"
                  showGenerateTicket={false}
                  socketio={{
                    url: "https://v001.onrender.com",
                    tokenEndpoint: "https://v001.onrender.com/v1/auth/token",
                    tokenId: selectedCoachId
                      ? `equipo:${String(selectedCoachId)}`
                      : String(userIdent),
                    participants: participants,
                    idCliente:
                      selectedStudentId != null
                        ? String(selectedStudentId)
                        : undefined,
                    idEquipo:
                      selectedCoachId != null
                        ? String(selectedCoachId)
                        : undefined,
                    autoCreate: false,
                    autoJoin: !!sharedChatId,
                    chatId: sharedChatId ?? undefined,
                  }}
                  onConnectionChange={setConnectedRight}
                  onChatInfo={handleRightChatInfo}
                  listOnConnect={false}
                  requestListSignal={rightListSignal}
                  listParams={(() => {
                    // Listar TODAS las conversaciones del coach seleccionado
                    if (!selectedCoachId && !selectedCoachCode)
                      return undefined;
                    return {
                      participante_tipo: "equipo",
                      id_equipo: String(selectedCoachCode ?? selectedCoachId),
                    };
                  })()}
                  onChatsList={(list) => {
                    console.debug("[chat.list] (coach) =>", list);
                    setChatsRight(list);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
