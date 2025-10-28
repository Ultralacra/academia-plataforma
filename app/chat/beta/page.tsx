"use client";

import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCw, Search, X, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  dataService,
  type StudentItem,
  type TeamWithCounts,
} from "@/lib/data-service";
import { getAuthToken } from "@/lib/auth";
import { CHAT_HOST } from "@/lib/api-config";

// ID de coach especial para el administrador (actúa como "equipo")
const ADMIN_COACH_ID = "hQycZczVb77e9eLwJpxPJ";

type TargetKind = "alumno" | "coach";

const STAGE_COLORS: Record<string, string> = {
  Prospecto: "bg-blue-50 text-blue-700 border-blue-200",
  Lead: "bg-purple-50 text-purple-700 border-purple-200",
  Oportunidad: "bg-amber-50 text-amber-700 border-amber-200",
  Negociación: "bg-orange-50 text-orange-700 border-orange-200",
  Cierre: "bg-teal-50 text-teal-700 border-teal-200",
  Cliente: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATE_COLORS: Record<string, string> = {
  Activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactivo: "bg-gray-50 text-gray-600 border-gray-200",
  Pendiente: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Suspendido: "bg-red-50 text-red-700 border-red-200",
  Completado: "bg-blue-50 text-blue-700 border-blue-200",
};

function getStageColor(stage: string | undefined): string {
  if (!stage) return "bg-gray-50 text-gray-600 border-gray-200";
  return STAGE_COLORS[stage] || "bg-gray-50 text-gray-600 border-gray-200";
}

function getStateColor(state: string | undefined): string {
  if (!state) return "bg-gray-50 text-gray-600 border-gray-200";
  return STATE_COLORS[state] || "bg-gray-50 text-gray-600 border-gray-200";
}

export default function AdminChatPage() {
  // Base URL del servidor de chat (socket.io + endpoints admin)
  const SOCKET_URL = (CHAT_HOST || "").replace(/\/$/, "");
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Bump de re-render para reflejar cambios en contadores persistentes (localStorage)
  // Bump para re-render cuando cambian lecturas (misma pestaña o entre pestañas)
  const [readsBump, setReadsBump] = useState<number>(0);

  const [contactTab, setContactTab] = useState<
    "coaches" | "students" | "conversations"
  >("coaches");
  const [filterTab, setFilterTab] = useState<"general" | "advanced">("general");

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
      const lastRead = Number.parseInt(localStorage.getItem(key) || "0");
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

  const clearAllFilters = () => {
    setSearchText("");
    setFilterArea(null);
    setFilterPuesto(null);
    setFilterStage(null);
    setFilterState(null);
  };

  async function handleDeleteCurrentChat() {
    const id = currentOpenChatId;
    if (id == null) return;
    try {
      // Usar el endpoint del servidor de chat (onrender) para borrar
      const token = getAuthToken();
      const base = (SOCKET_URL || CHAT_HOST || "").replace(/\/$/, "");
      const url = `${base}/admin/flush-chats/${encodeURIComponent(String(id))}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      let res = await fetch(url, { method: "DELETE", headers });
      if (!res.ok) {
        res = await fetch(url, { method: "POST", headers });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Resetear selección y refrescar listas
      setSelectedChatId(null);
      setCurrentOpenChatId(null);
      setConfirmDeleteOpen(false);
      setListSignal((n) => n + 1);
      try {
        window.dispatchEvent(
          new CustomEvent("chat:list-refresh", {
            detail: { reason: "chat-deleted", id_chat: id },
          })
        );
      } catch {}
    } catch (err) {
      console.error("Error al eliminar chat", err);
      // Mantener modal abierto para que el usuario reintente o cancele
    }
  }

  const activeFiltersCount = [
    searchText,
    filterArea,
    filterPuesto,
    filterStage,
    filterState,
  ].filter(Boolean).length;

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="flex flex-col h-screen bg-[#f0f2f5]">
          <div className="bg-[#008069] text-white px-6 py-4 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6" />
              <h1 className="text-xl font-medium">Chat Administrador</h1>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div className="w-1/4 flex flex-col bg-white border-r border-gray-200 shadow-sm">
              <div className="flex-shrink-0 bg-white z-10 border-b border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Buscar o empezar un chat nuevo"
                      className="w-full border-0 bg-[#f0f2f5] rounded-lg px-4 py-2.5 text-sm pl-11 focus:outline-none focus:bg-white focus:shadow-sm transition-all"
                    />
                  </div>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Limpiar filtros"
                      onClick={clearAllFilters}
                      className="shrink-0 h-10 w-10 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {activeFiltersCount > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filterArea && (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 cursor-pointer hover:bg-gray-200 bg-gray-100 text-gray-700 border-0 rounded-full px-3 py-1"
                        onClick={() => setFilterArea(null)}
                      >
                        {filterArea}
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                    {filterPuesto && (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 cursor-pointer hover:bg-gray-200 bg-gray-100 text-gray-700 border-0 rounded-full px-3 py-1"
                        onClick={() => setFilterPuesto(null)}
                      >
                        {filterPuesto}
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                    {filterStage && (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 cursor-pointer hover:bg-gray-200 bg-gray-100 text-gray-700 border-0 rounded-full px-3 py-1"
                        onClick={() => setFilterStage(null)}
                      >
                        {filterStage}
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                    {filterState && (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 cursor-pointer hover:bg-gray-200 bg-gray-100 text-gray-700 border-0 rounded-full px-3 py-1"
                        onClick={() => setFilterState(null)}
                      >
                        {filterState}
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                )}

                <Tabs
                  value={filterTab}
                  onValueChange={(v) => setFilterTab(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-[#f0f2f5]">
                    <TabsTrigger value="general" className="text-xs">
                      Filtros Básicos
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="text-xs">
                      Filtros Avanzados
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="border-0 bg-[#f0f2f5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white focus:shadow-sm transition-all text-gray-700"
                        value={filterArea ?? ""}
                        onChange={(e) => setFilterArea(e.target.value || null)}
                      >
                        <option value="">Todas las áreas</option>
                        {areaOptions.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      <select
                        className="border-0 bg-[#f0f2f5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white focus:shadow-sm transition-all text-gray-700"
                        value={filterPuesto ?? ""}
                        onChange={(e) =>
                          setFilterPuesto(e.target.value || null)
                        }
                      >
                        <option value="">Todos los cargos</option>
                        {puestoOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="border-0 bg-[#f0f2f5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white focus:shadow-sm transition-all text-gray-700"
                        value={filterStage ?? ""}
                        onChange={(e) => setFilterStage(e.target.value || null)}
                      >
                        <option value="">Todas las fases</option>
                        {stageOptions.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      <select
                        className="border-0 bg-[#f0f2f5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white focus:shadow-sm transition-all text-gray-700"
                        value={filterState ?? ""}
                        onChange={(e) => setFilterState(e.target.value || null)}
                      >
                        <option value="">Todos los estatus</option>
                        {stateOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex-1 min-h-0 flex flex-col px-4 py-3">
                <Tabs
                  value={contactTab}
                  onValueChange={(v) => setContactTab(v as any)}
                  className="flex flex-col h-full"
                >
                  <TabsList className="grid w-full grid-cols-3 bg-[#f0f2f5] mb-3 flex-shrink-0">
                    <TabsTrigger value="coaches" className="text-xs">
                      Coaches
                    </TabsTrigger>
                    <TabsTrigger value="students" className="text-xs">
                      Alumnos
                    </TabsTrigger>
                    <TabsTrigger
                      value="conversations"
                      className="text-xs relative"
                    >
                      Chats
                      {adminChats.length > 0 && (
                        <span className="ml-1.5 min-w-[18px] h-[18px] rounded-full bg-[#25d366] text-white text-[10px] font-semibold grid place-items-center px-1">
                          {adminChats.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="coaches" className="flex-1 min-h-0 mt-0">
                    <ul className="space-y-0 text-sm h-full overflow-auto">
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
                              className={`w-full text-left hover:bg-[#f5f6f6] transition-colors ${
                                selected ? "bg-[#f0f2f5]" : ""
                              }`}
                              title={subtitle}
                              onClick={() => {
                                setTargetKind("coach");
                                setTargetId(String(t.id));
                                setSelectedChatId(null);
                                setCurrentOpenChatId(null);
                              }}
                            >
                              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-50">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#d9fdd3] to-[#25d366] text-[#075e54] grid place-items-center font-semibold text-sm shrink-0">
                                  {initialFromText(t.nombre || t.codigo)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-[15px] text-gray-900">
                                    {t.nombre}
                                  </div>
                                  {subtitle && (
                                    <div className="text-[13px] text-gray-500 truncate mt-0.5">
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
                  </TabsContent>

                  <TabsContent value="students" className="flex-1 min-h-0 mt-0">
                    <ul className="space-y-0 text-sm h-full overflow-auto">
                      {filteredStudents.map((s) => {
                        const selected =
                          String(targetKind) === "alumno" &&
                          String(targetId) === String(s.code ?? s.id);
                        return (
                          <li key={String(s.id)}>
                            <button
                              className={`w-full text-left hover:bg-[#f5f6f6] transition-colors ${
                                selected ? "bg-[#f0f2f5]" : ""
                              }`}
                              onClick={() => {
                                setTargetKind("alumno");
                                setTargetId(String(s.code ?? s.id));
                                setSelectedChatId(null);
                                setCurrentOpenChatId(null);
                              }}
                            >
                              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-50">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#d9fdd3] to-[#25d366] text-[#075e54] grid place-items-center font-semibold text-sm shrink-0">
                                  {initialFromText(s.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-[15px] text-gray-900">
                                    {s.name}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {s.stage && (
                                      <Badge
                                        className={`text-[10px] px-2 py-0 h-4 font-medium border ${getStageColor(
                                          s.stage
                                        )}`}
                                      >
                                        {s.stage}
                                      </Badge>
                                    )}
                                    {s.state && (
                                      <Badge
                                        className={`text-[10px] px-2 py-0 h-4 font-medium border ${getStateColor(
                                          s.state
                                        )}`}
                                      >
                                        {s.state}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </TabsContent>

                  <TabsContent
                    value="conversations"
                    className="flex-1 min-h-0 mt-0 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-900">
                        Conversaciones activas
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={connected ? "Actualizar" : "Conectando..."}
                        onClick={() => setListSignal((n) => n + 1)}
                        disabled={!connected}
                        className="h-9 w-9 rounded-full hover:bg-gray-100"
                      >
                        <RotateCw
                          className={`w-4 h-4 ${
                            connected ? "text-[#008069]" : "text-gray-400"
                          }`}
                        />
                      </Button>
                    </div>
                    <ul className="space-y-0 text-sm flex-1 overflow-auto">
                      {adminChats.length === 0 && (
                        <li className="text-[13px] text-gray-500 text-center py-8">
                          Sin conversaciones activas
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
                        const countKey = `chatUnreadById:coach:${String(
                          id ?? ""
                        )}`;
                        const storedCount = Number.parseInt(
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
                              className={`w-full text-left hover:bg-[#f5f6f6] transition-colors ${
                                (unread || count > 0) && !isOpen
                                  ? "bg-white"
                                  : ""
                              } ${isOpen ? "bg-[#f0f2f5]" : ""}`}
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
                                    const k = `chatUnreadById:coach:${String(
                                      id
                                    )}`;
                                    localStorage.setItem(k, "0");
                                  } catch {}
                                  setReadsBump((n) => n + 1);
                                }
                              }}
                              title={String(last || "")}
                            >
                              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-50">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 grid place-items-center font-semibold text-sm shrink-0">
                                  {initialFromText(title)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3 mb-0.5">
                                    <span
                                      className={`truncate text-[15px] ${
                                        (unread || count > 0) && !isOpen
                                          ? "font-semibold text-gray-900"
                                          : "font-normal text-gray-900"
                                      }`}
                                    >
                                      {title}
                                    </span>
                                    <span className="text-[12px] text-gray-500 flex-shrink-0">
                                      {formatListTime(lastAt)}
                                    </span>
                                  </div>
                                  {subtitle && (
                                    <div className="text-[13px] text-gray-500 truncate">
                                      {subtitle}
                                    </div>
                                  )}
                                  {last && (
                                    <div
                                      className={`text-[13px] truncate mt-0.5 flex items-center gap-2 ${
                                        (unread || count > 0) && !isOpen
                                          ? "text-gray-600"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      <span className="truncate">{last}</span>
                                      {count > 0 && !isOpen && (
                                        <span className="min-w-[16px] h-4 rounded-full bg-[#25d366] text-white text-[10px] font-semibold grid place-items-center px-1 shrink-0">
                                          {count > 99 ? "99+" : count}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="flex-1 bg-[#efeae2] relative">
              <CoachChatInline
                room={room}
                role="coach"
                title={targetTitle}
                subtitle={targetSubtitle}
                variant="card"
                className="h-full shadow-none border-0"
                precreateOnParticipants
                socketio={{
                  url: SOCKET_URL || undefined,
                  idEquipo: String(ADMIN_COACH_ID),
                  participants: participants,
                  autoCreate: true,
                  autoJoin: !!selectedChatId,
                  chatId: selectedChatId ?? undefined,
                }}
                onConnectionChange={setConnected}
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
                  if (info?.chatId != null) {
                    try {
                      const k = `chatUnreadById:coach:${String(info.chatId)}`;
                      localStorage.setItem(k, "0");
                    } catch {}
                    setReadsBump((n) => n + 1);
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
