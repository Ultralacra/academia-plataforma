"use client";

import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { RotateCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  dataService,
  type StudentItem,
  type TeamWithCounts,
} from "@/lib/data-service";

// ID de coach especial para el administrador (actúa como "equipo")
const ADMIN_COACH_ID = "hQycZczVb77e9eLwJpxPJ";

type TargetKind = "alumno" | "coach";

export default function AdminChatPage() {
  const { user } = useAuth();
  // El admin hablará "como coach" usando ADMIN_COACH_ID
  const room = `admin:${ADMIN_COACH_ID}`;

  // Listas base
  const [teams, setTeams] = useState<TeamWithCounts[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  // Filtros
  const [searchText, setSearchText] = useState("");
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterPuesto, setFilterPuesto] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string | null>(null);

  // Selección de destino actual (uno u otro)
  const [targetKind, setTargetKind] = useState<TargetKind | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState<string>(
    "Selecciona un contacto"
  );
  const [targetSubtitle, setTargetSubtitle] = useState<string | undefined>(
    undefined
  );

  // Listado de conversaciones del admin (como equipo ADMIN_COACH_ID)
  const [adminChats, setAdminChats] = useState<any[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [listSignal, setListSignal] = useState<number>(0);
  const [selectedChatId, setSelectedChatId] = useState<string | number | null>(
    null
  );
  // Chat actualmente abierto (ya sea por chatId existente o por selección de participantes)
  const [currentOpenChatId, setCurrentOpenChatId] = useState<
    string | number | null
  >(null);
  // Bump de re-render para reflejar cambios en contadores persistentes (localStorage)
  // Bump para re-render cuando cambian lecturas (misma pestaña o entre pestañas)
  const [readsBump, setReadsBump] = useState<number>(0);

  // Cargar catálogos
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await dataService.getTeamsV2({ page: 1, pageSize: 500 });
        if (!alive) return;
        setTeams(res.data || []);
      } catch {}
    })();
    (async () => {
      try {
        const st = await dataService.getStudents({ pageSize: 1000 });
        if (!alive) return;
        setStudents(st.items ?? []);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Opciones derivadas para filtros
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.area) set.add(String(t.area));
    });
    return Array.from(set.values()).sort();
  }, [teams]);
  const puestoOptions = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.puesto) set.add(String(t.puesto));
    });
    return Array.from(set.values()).sort();
  }, [teams]);
  const stageOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.stage) set.add(String(s.stage));
    });
    return Array.from(set.values()).sort();
  }, [students]);
  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.state) set.add(String(s.state));
    });
    return Array.from(set.values()).sort();
  }, [students]);

  // Filtrar vistas
  const filteredCoaches = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return teams
      .filter((t) => (filterArea ? t.area === filterArea : true))
      .filter((t) => (filterPuesto ? t.puesto === filterPuesto : true))
      .filter((t) =>
        q
          ? [t.nombre, t.codigo, t.puesto, t.area]
              .map((x) => String(x ?? "").toLowerCase())
              .some((s) => s.includes(q))
          : true
      );
  }, [teams, searchText, filterArea, filterPuesto]);

  const filteredStudents = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return students
      .filter((s) => (filterStage ? s.stage === filterStage : true))
      .filter((s) => (filterState ? s.state === filterState : true))
      .filter((s) =>
        q
          ? [s.name, s.code, s.state, s.stage]
              .map((x) => String(x ?? "").toLowerCase())
              .some((v) => v.includes(q))
          : true
      );
  }, [students, searchText, filterStage, filterState]);

  // Construir participants e ids en función del target
  const participants = useMemo(() => {
    if (!targetKind || !targetId) return undefined;
    if (targetKind === "alumno") {
      return [
        {
          participante_tipo: "cliente",
          id_cliente: String(targetId),
          id_equipo: String(ADMIN_COACH_ID),
        },
        { participante_tipo: "equipo", id_equipo: String(ADMIN_COACH_ID) },
      ];
    }
    // coach-to-coach (admin como equipo especial)
    return [
      { participante_tipo: "equipo", id_equipo: String(ADMIN_COACH_ID) },
      { participante_tipo: "equipo", id_equipo: String(targetId) },
    ];
  }, [targetKind, targetId]);

  // Cuando conecte el socket, solicitar listado inicial
  useEffect(() => {
    if (connected) setListSignal((n) => n + 1);
  }, [connected]);

  // Escuchar eventos globales para refrescar listas cuando se creen/reciban mensajes en otros chats
  useEffect(() => {
    function onRefresh() {
      setListSignal((n) => n + 1);
    }
    window.addEventListener("chat:list-refresh", onRefresh as any);
    return () =>
      window.removeEventListener("chat:list-refresh", onRefresh as any);
  }, []);

  // Escuchar bumps de no-leídos y resets de lectura para manejar contadores
  useEffect(() => {
    function onUnreadBump(e: any) {
      try {
        const cid = e?.detail?.chatId ?? e?.detail?.id_chat ?? null;
        if (cid == null) return;
        // Si el chat está actualmente abierto, no incrementamos
        if (String(currentOpenChatId ?? "") === String(cid)) return;
        // Los contadores ahora se persisten en localStorage; forzamos re-render
        setReadsBump((n) => n + 1);
      } catch {}
    }
    function onLastReadUpdated(e: any) {
      try {
        const cid = e?.detail?.chatId ?? null;
        if (cid == null) return;
        // Reiniciar contador persistente para este chat y refrescar UI
        try {
          const key = `chatUnreadById:coach:${String(cid)}`;
          localStorage.setItem(key, "0");
        } catch {}
        // Forzar re-render para recalcular hasUnreadForItem basado en localStorage
        setReadsBump((n) => n + 1);
      } catch {}
    }
    function onStorage(ev: StorageEvent) {
      try {
        if (!ev.key) return;
        if (ev.key.startsWith("chatLastReadById:coach:")) {
          setReadsBump((n) => n + 1);
        }
        if (ev.key.startsWith("chatUnreadById:coach:")) {
          setReadsBump((n) => n + 1);
        }
      } catch {}
    }
    window.addEventListener("chat:unread-bump", onUnreadBump as any);
    window.addEventListener("chat:last-read-updated", onLastReadUpdated as any);
    window.addEventListener("storage", onStorage as any);
    return () => {
      window.removeEventListener("chat:unread-bump", onUnreadBump as any);
      window.removeEventListener(
        "chat:last-read-updated",
        onLastReadUpdated as any
      );
      window.removeEventListener("storage", onStorage as any);
    };
  }, [currentOpenChatId]);

  // Títulos de cabecera según selección
  useEffect(() => {
    if (!targetKind || !targetId) {
      setTargetTitle("Selecciona un contacto");
      setTargetSubtitle(undefined);
      return;
    }
    if (targetKind === "alumno") {
      const s = students.find(
        (x) => String(x.code ?? x.id) === String(targetId)
      );
      setTargetTitle(s?.name || String(targetId));
      setTargetSubtitle("Alumno");
    } else {
      const t = teams.find(
        (x) =>
          String(x.id) === String(targetId) ||
          String(x.codigo) === String(targetId)
      );
      setTargetTitle(t?.nombre || String(targetId));
      setTargetSubtitle(
        [t?.puesto, t?.area].filter(Boolean).join(" · ") || "Coach"
      );
    }
  }, [targetKind, targetId, students, teams]);

  // Utilidad para no leídos por chatId
  function hasUnreadForItem(it: any): boolean {
    try {
      const cid = it?.id_chat ?? it?.id ?? null;
      if (cid == null) return false;
      const key = `chatLastReadById:coach:${String(cid)}`;
      const lastRead = parseInt(localStorage.getItem(key) || "0");
      const lastAtRaw =
        it?.last_message_at ||
        it?.fecha_ultimo_mensaje ||
        it?.updated_at ||
        it?.fecha_actualizacion ||
        it?.created_at ||
        it?.fecha_creacion;
      const lastAt = Date.parse(String(lastAtRaw || "")) || 0;
      // si nunca leímos (0) pero hay actividad > 0 => no leído
      if (!lastRead && lastAt > 0) return true;
      return lastAt > lastRead;
    } catch {
      return false;
    }
  }

  // Derivar nombre y subtítulo del otro participante para la lista de conversaciones
  function labelForChatItem(it: any): { title: string; subtitle?: string } {
    const parts = it?.participants || it?.participantes || [];
    // ¿es alumno?
    const cliente = parts.find((p: any) =>
      ["cliente", "alumno", "student"].includes(
        String(p?.participante_tipo || "").toLowerCase()
      )
    );
    const equipos = parts.filter(
      (p: any) => String(p?.participante_tipo || "").toLowerCase() === "equipo"
    );
    // Si hay cliente, mostrar su nombre/código
    if (cliente) {
      const code =
        cliente?.id_cliente || cliente?.id_alumno || cliente?.client_id;
      const st = students.find((s) => String(s.code ?? s.id) === String(code));
      return { title: st?.name || String(code), subtitle: "Alumno" };
    }
    // Si es coach-to-coach: tomar el equipo distinto al ADMIN_COACH_ID
    const other = equipos.find(
      (e: any) => String(e?.id_equipo) !== String(ADMIN_COACH_ID)
    );
    if (other) {
      const t = teams.find(
        (x) =>
          String(x.codigo) === String(other.id_equipo) ||
          String(x.id) === String(other.id_equipo)
      );
      const subtitle =
        [t?.puesto, t?.area].filter(Boolean).join(" · ") || "Coach";
      return { title: t?.nombre || String(other.id_equipo), subtitle };
    }
    // Fallback
    const id = it?.id_chat ?? it?.id ?? "";
    return { title: `Chat ${id}` };
  }

  const getItemTimestamp = (it: any): number => {
    try {
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
    } catch {
      return 0;
    }
  };

  const formatListTime = (ms: number): string => {
    if (!ms || isNaN(ms)) return "";
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const initialFromText = (s: string | undefined): string => {
    const t = (s || "").trim();
    return t ? t.slice(0, 1).toUpperCase() : "?";
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="p-4 h-full min-h-0">
          <h1 className="text-lg font-semibold mb-2">Chat Administrador</h1>
          <div className="grid grid-cols-5 gap-4 h-[80vh]">
            {/* Sidebar: filtros y catálogos */}
            <div className="col-span-2 overflow-auto border rounded p-3 bg-white space-y-3">
              {/* Buscador */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar por nombre, código, área, cargo..."
                    className="w-full border rounded px-3 py-2 text-sm pl-9"
                  />
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  title="Limpiar filtros"
                  onClick={() => {
                    setSearchText("");
                    setFilterArea(null);
                    setFilterPuesto(null);
                    setFilterStage(null);
                    setFilterState(null);
                  }}
                >
                  ✕
                </Button>
              </div>

              {/* Filtros coach */}
              <div>
                <div className="text-xs font-semibold mb-1">Filtros Coach</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={filterArea ?? ""}
                    onChange={(e) => setFilterArea(e.target.value || null)}
                  >
                    <option value="">Área</option>
                    {areaOptions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={filterPuesto ?? ""}
                    onChange={(e) => setFilterPuesto(e.target.value || null)}
                  >
                    <option value="">Cargo</option>
                    {puestoOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtros alumno */}
              <div>
                <div className="text-xs font-semibold mb-1">Filtros Alumno</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={filterStage ?? ""}
                    onChange={(e) => setFilterStage(e.target.value || null)}
                  >
                    <option value="">Fase</option>
                    {stageOptions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={filterState ?? ""}
                    onChange={(e) => setFilterState(e.target.value || null)}
                  >
                    <option value="">Estatus</option>
                    {stateOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Catálogos */}
              <div className="grid grid-cols-2 gap-3 min-h-0">
                <div className="min-h-0">
                  <div className="text-sm font-semibold mb-2">Coaches</div>
                  <ul className="space-y-1 text-sm max-h-[28vh] overflow-auto pr-1">
                    {filteredCoaches.map((t) => {
                      const selected =
                        String(targetKind) === "coach" &&
                        String(targetId) === String(t.id);
                      const subtitle = [t.puesto, t.area]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li key={String(t.id)}>
                          <button
                            className={`w-full text-left rounded hover:bg-gray-50 ${
                              selected ? "bg-sky-50" : ""
                            }`}
                            title={subtitle}
                            onClick={() => {
                              setTargetKind("coach");
                              setTargetId(String(t.id));
                              setSelectedChatId(null);
                              setCurrentOpenChatId(null);
                            }}
                          >
                            <div className="flex items-center gap-3 px-2 py-2">
                              <div className="h-9 w-9 rounded-full bg-neutral-200 text-neutral-700 grid place-items-center font-semibold">
                                {initialFromText(t.nombre || t.codigo)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">
                                  {t.nombre}
                                </div>
                                {subtitle && (
                                  <div className="text-[11px] text-neutral-500 truncate">
                                    {subtitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="min-h-0">
                  <div className="text-sm font-semibold mb-2">Alumnos</div>
                  <ul className="space-y-1 text-sm max-h-[28vh] overflow-auto pr-1">
                    {filteredStudents.map((s) => {
                      const selected =
                        String(targetKind) === "alumno" &&
                        String(targetId) === String(s.code ?? s.id);
                      const subtitle = [s.state, s.stage]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li key={String(s.id)}>
                          <button
                            className={`w-full text-left rounded hover:bg-gray-50 ${
                              selected ? "bg-sky-50" : ""
                            }`}
                            onClick={() => {
                              setTargetKind("alumno");
                              setTargetId(String(s.code ?? s.id));
                              setSelectedChatId(null);
                              setCurrentOpenChatId(null);
                            }}
                            title={subtitle}
                          >
                            <div className="flex items-center gap-3 px-2 py-2">
                              <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-semibold">
                                {initialFromText(s.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">
                                  {s.name} · {s.code}
                                </div>
                                {subtitle && (
                                  <div className="text-[11px] text-neutral-500 truncate">
                                    {subtitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Mis conversaciones (admin como equipo) */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">
                    Mis conversaciones
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    title={connected ? "Actualizar" : "Conectando..."}
                    onClick={() => setListSignal((n) => n + 1)}
                    disabled={!connected}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                <ul className="space-y-1 text-sm max-h-[24vh] overflow-auto pr-1">
                  {adminChats.length === 0 && (
                    <li className="text-xs text-gray-500">
                      Sin conversaciones
                    </li>
                  )}
                  {adminChats.map((it) => {
                    const id = it?.id_chat ?? it?.id;
                    const { title, subtitle } = labelForChatItem(it);
                    const lastObj =
                      it?.last_message ?? it?.ultimo_mensaje ?? null;
                    const last = (
                      lastObj?.contenido ??
                      lastObj?.text ??
                      it?.last?.text ??
                      ""
                    ).toString();
                    // Dependemos de readsBump para re-render al cambiar lecturas
                    const _rb = readsBump; // eslint-disable-line @typescript-eslint/no-unused-vars
                    const unread = hasUnreadForItem(it);
                    // Contador persistente de no-leídos por chatId (rol coach)
                    const countKey = `chatUnreadById:coach:${String(id ?? "")}`;
                    const storedCount = parseInt(
                      (typeof window !== "undefined" &&
                        window.localStorage.getItem(countKey)) ||
                        "0",
                      10
                    );
                    const count = isNaN(storedCount) ? 0 : storedCount;
                    const isOpen =
                      id != null &&
                      String(currentOpenChatId ?? "") === String(id);
                    const lastAt = getItemTimestamp(it);
                    return (
                      <li key={String(id)}>
                        <button
                          className={`w-full text-left rounded hover:bg-gray-50 ${
                            (unread || count > 0) && !isOpen
                              ? "bg-emerald-50"
                              : ""
                          }`}
                          onClick={() => {
                            // Abrimos el chat existente sin auto-crear
                            setTargetKind(null);
                            setTargetId(null);
                            setTargetTitle(title);
                            setTargetSubtitle(subtitle);
                            setSelectedChatId(id);
                            setCurrentOpenChatId(id ?? null);
                            // Reiniciar contador persistente de este chat al abrir
                            if (id != null) {
                              try {
                                const k = `chatUnreadById:coach:${String(id)}`;
                                localStorage.setItem(k, "0");
                              } catch {}
                              setReadsBump((n) => n + 1);
                            }
                          }}
                          title={String(last || "")}
                        >
                          <div className="flex items-center gap-3 px-2 py-2">
                            <div className="h-9 w-9 rounded-full bg-neutral-200 text-neutral-700 grid place-items-center font-semibold">
                              {initialFromText(title)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate font-medium">
                                  {title}
                                </span>
                                <span className="text-[11px] text-neutral-500 flex-shrink-0">
                                  {formatListTime(lastAt)}
                                </span>
                              </div>
                              {subtitle && (
                                <div className="text-[11px] text-neutral-500 truncate">
                                  {subtitle}
                                </div>
                              )}
                              {last && (
                                <div className="text-[11px] text-neutral-600 truncate">
                                  {last}
                                </div>
                              )}
                            </div>
                            {(unread || count > 0) && (
                              <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-white text-[10px] grid place-items-center px-1">
                                {count > 0 ? count : "•"}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Panel de chat */}
            <div className="col-span-3 h-full">
              <CoachChatInline
                room={room}
                role="coach"
                title={targetTitle}
                subtitle={targetSubtitle}
                variant="card"
                className="h-[80vh] rounded-lg shadow-sm overflow-hidden"
                precreateOnParticipants
                socketio={{
                  url: "https://v001.onrender.com",
                  tokenEndpoint: "https://v001.onrender.com/v1/auth/token",
                  tokenId: `equipo:${String(ADMIN_COACH_ID)}`,
                  idEquipo: String(ADMIN_COACH_ID),
                  participants: participants,
                  autoCreate: true,
                  autoJoin: !!selectedChatId,
                  chatId: selectedChatId ?? undefined,
                }}
                onConnectionChange={setConnected}
                // Listado de mis chats (como equipo ADMIN_COACH_ID)
                requestListSignal={listSignal}
                listParams={{
                  participante_tipo: "equipo",
                  id_equipo: String(ADMIN_COACH_ID),
                }}
                onChatsList={(list) =>
                  setAdminChats(Array.isArray(list) ? list : [])
                }
                onChatInfo={(info) => {
                  setCurrentOpenChatId(info?.chatId ?? null);
                  // Limpiar contador al unirse/abrir el chat
                  if (info?.chatId != null) {
                    try {
                      const k = `chatUnreadById:coach:${String(info.chatId)}`;
                      localStorage.setItem(k, "0");
                    } catch {}
                    setReadsBump((n) => n + 1);
                  }
                  // Si abrimos por chatId y ya unimos, limpiar selección explícita para permitir crear con target
                  if (info?.chatId != null && selectedChatId != null) {
                    // mantener chat abierto; al elegir contacto se sobreescribe
                  }
                }}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
