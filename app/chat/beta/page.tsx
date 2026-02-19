"use client";

import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCw, Search, X, MessageCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function prettifyMetaText(value: string | undefined | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
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
    "Selecciona un contacto",
  );
  const [targetSubtitle, setTargetSubtitle] = useState<string | undefined>(
    undefined,
  );

  // Listado de conversaciones del admin (como equipo ADMIN_COACH_ID)
  const [adminChats, setAdminChats] = useState<any[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [listSignal, setListSignal] = useState<number>(0);
  const [selectedChatId, setSelectedChatId] = useState<string | number | null>(
    null,
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
  const chatViewerRef = useRef<HTMLDivElement | null>(null);
  const listSocketRef = useRef<any>(null);
  const switchOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [listSocketConnected, setListSocketConnected] = useState(false);
  const [chatListLoading, setChatListLoading] = useState(false);
  const [isContextSwitching, setIsContextSwitching] = useState(false);
  const [switchingToLabel, setSwitchingToLabel] = useState<string>("");

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
          : true,
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
          : true,
      );
  }, [students, searchText, filterStage, filterState]);

  // Helpers para indicadores de no-leídos en pestañas "Coaches" y "Alumnos"
  function chatHasEquipoPair(it: any, a: string, b: string): boolean {
    try {
      const parts = it?.participants || it?.participantes || [];
      const set = new Set<string>();
      for (const p of parts) {
        const tipo = String(p?.participante_tipo || "").toLowerCase();
        if (tipo === "equipo" && p?.id_equipo)
          set.add(String(p.id_equipo).toLowerCase());
      }
      return (
        set.has(String(a).toLowerCase()) && set.has(String(b).toLowerCase())
      );
    } catch {
      return false;
    }
  }

  function chatHasClienteEquipoPair(
    it: any,
    clienteId: string,
    equipoId: string,
  ): boolean {
    try {
      const parts = it?.participants || it?.participantes || [];
      let okCliente = false;
      let okEquipo = false;
      for (const p of parts) {
        const tipo = String(p?.participante_tipo || "").toLowerCase();
        if (tipo === "cliente" && p?.id_cliente != null) {
          if (String(p.id_cliente) === String(clienteId)) okCliente = true;
        }
        if (tipo === "equipo" && p?.id_equipo != null) {
          if (String(p.id_equipo) === String(equipoId)) okEquipo = true;
        }
      }
      return okCliente && okEquipo;
    } catch {
      return false;
    }
  }

  function chatHasEquipoId(it: any, equipoId: string): boolean {
    try {
      const wanted = String(equipoId || "")
        .trim()
        .toLowerCase();
      if (!wanted) return false;
      const parts = it?.participants || it?.participantes || [];
      return parts.some((p: any) => {
        const tipo = String(
          p?.participante_tipo ?? p?.tipo ?? p?.participant_type ?? "",
        ).toLowerCase();
        if (!tipo.includes("equipo") && !tipo.includes("coach")) return false;

        const candidates = [
          p?.id_equipo,
          p?.equipo_id,
          p?.id_coach,
          p?.coach_id,
          p?.id_usuario,
          p?.user_id,
          p?.codigo,
          p?.code,
          p?.id,
        ]
          .filter((v: any) => v !== null && v !== undefined)
          .map((v: any) => String(v).trim().toLowerCase());

        return candidates.includes(wanted);
      });
    } catch {
      return false;
    }
  }

  function chatHasClienteId(it: any, clienteId: string): boolean {
    try {
      const wanted = String(clienteId || "")
        .trim()
        .toLowerCase();
      if (!wanted) return false;
      const parts = it?.participants || it?.participantes || [];
      return parts.some((p: any) => {
        const tipo = String(
          p?.participante_tipo ?? p?.tipo ?? p?.participant_type ?? "",
        ).toLowerCase();
        if (
          !tipo.includes("cliente") &&
          !tipo.includes("alumno") &&
          !tipo.includes("student")
        ) {
          return false;
        }

        const candidates = [
          p?.id_cliente,
          p?.cliente_id,
          p?.id_alumno,
          p?.alumno_id,
          p?.client_id,
          p?.student_id,
          p?.codigo,
          p?.code,
          p?.id,
        ]
          .filter((v: any) => v !== null && v !== undefined)
          .map((v: any) => String(v).trim().toLowerCase());

        return candidates.includes(wanted);
      });
    } catch {
      return false;
    }
  }

  function getUnreadCountByChatIdLocal(chatId: any): number {
    try {
      const key = `chatUnreadById:coach:${String(chatId)}`;
      const raw =
        (typeof window !== "undefined" && localStorage.getItem(key)) || "0";
      const n = parseInt(raw, 10);
      return isNaN(n) ? 0 : n;
    } catch {
      return 0;
    }
  }

  function unreadForCoachTarget(target: TeamWithCounts): number {
    try {
      // Buscar chat por id_equipo = ADMIN_COACH_ID y el otro equipo = target.id o target.codigo
      const match = (adminChats || []).find(
        (it) =>
          chatHasEquipoPair(
            it,
            String(ADMIN_COACH_ID),
            // Aceptar coincidencia por id o por código
            String(target.id),
          ) ||
          chatHasEquipoPair(it, String(ADMIN_COACH_ID), String(target.codigo)),
      );
      if (!match) return 0;
      const id = match?.id_chat ?? match?.id;
      if (id == null) return 0;
      return getUnreadCountByChatIdLocal(id);
    } catch {
      return 0;
    }
  }

  function unreadForStudentTarget(target: StudentItem): number {
    try {
      const match = (adminChats || []).find((it) =>
        chatHasClienteEquipoPair(
          it,
          String(target.code ?? target.id),
          String(ADMIN_COACH_ID),
        ),
      );
      if (!match) return 0;
      const id = match?.id_chat ?? match?.id;
      if (id == null) return 0;
      return getUnreadCountByChatIdLocal(id);
    } catch {
      return 0;
    }
  }

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
        onLastReadUpdated as any,
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
        (x) => String(x.code ?? x.id) === String(targetId),
      );
      setTargetTitle(s?.name || String(targetId));
      setTargetSubtitle("Alumno");
    } else {
      const t = teams.find(
        (x) =>
          String(x.id) === String(targetId) ||
          String(x.codigo) === String(targetId),
      );
      setTargetTitle(t?.nombre || String(targetId));
      setTargetSubtitle(
        [t?.puesto, t?.area].filter(Boolean).join(" · ") || "Coach",
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
    const otros = Array.isArray(it?.otros_participantes)
      ? it.otros_participantes
      : [];

    const getNombreParticipante = (arr: any[]): string | null => {
      try {
        const hit = arr.find(
          (p: any) =>
            String(p?.id_equipo ?? "") !== String(ADMIN_COACH_ID) &&
            String(p?.nombre_participante ?? "").trim(),
        );
        const nombre = String(hit?.nombre_participante ?? "").trim();
        return nombre || null;
      } catch {
        return null;
      }
    };

    const nombreDesdeOtros = getNombreParticipante(otros);
    const nombreDesdeParts = getNombreParticipante(parts);
    const nombreParticipante = nombreDesdeOtros || nombreDesdeParts;

    // ¿es alumno?
    const cliente = parts.find((p: any) =>
      ["cliente", "alumno", "student"].includes(
        String(p?.participante_tipo || "").toLowerCase(),
      ),
    );
    const clienteDesdeOtros = otros.find((p: any) =>
      ["cliente", "alumno", "student"].includes(
        String(p?.participante_tipo || "").toLowerCase(),
      ),
    );
    const equipos = parts.filter(
      (p: any) => String(p?.participante_tipo || "").toLowerCase() === "equipo",
    );
    // Si hay cliente, mostrar su nombre/código
    if (cliente || clienteDesdeOtros) {
      const code =
        cliente?.id_cliente ||
        cliente?.id_alumno ||
        cliente?.client_id ||
        clienteDesdeOtros?.id_cliente ||
        clienteDesdeOtros?.id_alumno ||
        clienteDesdeOtros?.client_id;
      const st = students.find((s) => String(s.code ?? s.id) === String(code));
      return {
        title: nombreParticipante || st?.name || String(code),
        subtitle: "Alumno",
      };
    }

    // Si no llegó participants pero sí otros_participantes con nombre, mostrarlo igualmente
    if (nombreParticipante) {
      return { title: nombreParticipante, subtitle: "Alumno" };
    }
    // Si es coach-to-coach: tomar el equipo distinto al ADMIN_COACH_ID
    const other = equipos.find(
      (e: any) => String(e?.id_equipo) !== String(ADMIN_COACH_ID),
    );
    if (other) {
      const t = teams.find(
        (x) =>
          String(x.codigo) === String(other.id_equipo) ||
          String(x.id) === String(other.id_equipo),
      );
      const subtitle =
        [t?.puesto, t?.area].filter(Boolean).join(" · ") || "Coach";
      return {
        title: nombreParticipante || t?.nombre || String(other.id_equipo),
        subtitle,
      };
    }
    // Fallback
    const id = it?.id_chat ?? it?.id ?? "";
    return { title: `Chat ${id}` };
  }

  function getReadStatusByRole(it: any): {
    coachUnread: number | null;
    alumnoUnread: number | null;
  } {
    try {
      const unreadBy = Array.isArray(it?.unread_by_participants)
        ? it.unread_by_participants
        : [];
      const myParticipante = String(it?.my_participante ?? "").trim();

      if (!unreadBy.length) {
        return { coachUnread: null, alumnoUnread: null };
      }

      const myEntry = unreadBy.find(
        (u: any) => String(u?.id_chat_participante ?? "") === myParticipante,
      );
      const otherEntry = unreadBy.find(
        (u: any) => String(u?.id_chat_participante ?? "") !== myParticipante,
      );

      const myUnread = Number(myEntry?.unread ?? 0);
      const otherUnread = Number(otherEntry?.unread ?? 0);

      const parts = it?.participants || it?.participantes || [];
      const otros = Array.isArray(it?.otros_participantes)
        ? it.otros_participantes
        : [];
      const allParts = [...parts, ...otros];

      const hasAlumno = allParts.some((p: any) => {
        const tipo = String(p?.participante_tipo ?? "").toLowerCase();
        return tipo === "cliente" || tipo === "alumno" || tipo === "student";
      });

      if (hasAlumno) {
        return {
          coachUnread: isNaN(myUnread) ? 0 : myUnread,
          alumnoUnread: isNaN(otherUnread) ? 0 : otherUnread,
        };
      }

      return {
        coachUnread: isNaN(myUnread) ? 0 : myUnread,
        alumnoUnread: null,
      };
    } catch {
      return { coachUnread: null, alumnoUnread: null };
    }
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
          }),
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

  const visibleChats = useMemo(() => {
    return [...adminChats].sort(
      (a, b) => getItemTimestamp(b) - getItemTimestamp(a),
    );
  }, [adminChats]);

  const selectedCoachCode = useMemo(() => {
    if (targetKind !== "coach" || !targetId) return null;
    const t = teams.find(
      (x) =>
        String(x.id) === String(targetId) ||
        String(x.codigo) === String(targetId),
    );
    const code = String(t?.codigo ?? targetId).trim();
    return code || null;
  }, [targetId, targetKind, teams]);

  const selectedStudentCode = useMemo(() => {
    if (targetKind !== "alumno" || !targetId) return null;
    const s = students.find((x) => String(x.code ?? x.id) === String(targetId));
    const code = String(s?.code ?? targetId).trim();
    return code || null;
  }, [students, targetId, targetKind]);

  const chatListParams = useMemo(() => {
    if (targetKind === "coach" && selectedCoachCode) {
      return {
        participante_tipo: "equipo",
        id_equipo: selectedCoachCode,
        include_participants: true,
        with_participants: true,
      };
    }
    if (targetKind === "alumno" && selectedStudentCode) {
      return {
        participante_tipo: "cliente",
        id_cliente: selectedStudentCode,
        include_participants: true,
        with_participants: true,
      };
    }
    return {};
  }, [selectedCoachCode, selectedStudentCode, targetKind]);

  const requestChatsBySocket = useCallback(() => {
    const socket = listSocketRef.current;

    const finishContextSwitch = () => {
      if (switchOverlayTimerRef.current) {
        clearTimeout(switchOverlayTimerRef.current);
      }
      switchOverlayTimerRef.current = setTimeout(() => {
        setIsContextSwitching(false);
      }, 220);
    };

    if (!socket || !socket.connected) {
      setChatListLoading(false);
      finishContextSwitch();
      return;
    }

    // No listar si no hay usuario seleccionado en beta
    if (!targetKind) {
      setChatListLoading(false);
      finishContextSwitch();
      return;
    }

    setChatListLoading(true);

    const payload: Record<string, any> = {
      ...chatListParams,
      limit: 1000,
    };

    const participanteTipo = String(payload?.participante_tipo ?? "").trim();
    const idEquipo = String(payload?.id_equipo ?? "").trim();
    const idCliente = String(payload?.id_cliente ?? "").trim();
    const hasValidPayload =
      !!participanteTipo &&
      ((participanteTipo === "equipo" && !!idEquipo) ||
        (participanteTipo === "cliente" && !!idCliente));

    if (!hasValidPayload) {
      try {
        console.warn("[chat-beta][chat.list][skip-invalid-payload]", {
          targetKind,
          targetId,
          payload,
        });
      } catch {}
      setChatListLoading(false);
      finishContextSwitch();
      return;
    }

    try {
      console.log("[chat-beta][chat.list][send]", {
        participante_tipo: payload?.participante_tipo ?? null,
        id_equipo: payload?.id_equipo ?? null,
        id_cliente: payload?.id_cliente ?? null,
        limit: payload?.limit ?? null,
        targetKind,
        targetId,
      });
    } catch {}

    const applyAckList = (ack: any): any[] => {
      try {
        const data = ack?.data ?? ack ?? {};
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.chats)) return data.chats;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.rows)) return data.rows;
        return [];
      } catch {
        return [];
      }
    };

    socket.emit("chat.list", payload, (ack: any) => {
      const list = applyAckList(ack);

      try {
        console.log("[chat-beta][chat.list][ack]", {
          participante_tipo: payload?.participante_tipo ?? null,
          id_equipo: payload?.id_equipo ?? null,
          id_cliente: payload?.id_cliente ?? null,
          total: Array.isArray(list) ? list.length : 0,
          conversations: list,
          rawAck: ack,
        });
      } catch {}

      if (
        list.length === 0 &&
        targetKind === "coach" &&
        String(targetId ?? "").trim() &&
        String(payload?.id_equipo ?? "")
          .trim()
          .toLowerCase() !==
          String(targetId ?? "")
            .trim()
            .toLowerCase()
      ) {
        const retryPayload: Record<string, any> = {
          ...payload,
          id_equipo: String(targetId).trim(),
        };
        try {
          console.log("[chat-beta][chat.list][retry-send]", {
            participante_tipo: retryPayload?.participante_tipo ?? null,
            id_equipo: retryPayload?.id_equipo ?? null,
            id_cliente: retryPayload?.id_cliente ?? null,
            limit: retryPayload?.limit ?? null,
            reason: "empty-first-list",
          });
        } catch {}
        socket.emit("chat.list", retryPayload, (ack2: any) => {
          const retryList = applyAckList(ack2);
          try {
            console.log("[chat-beta][chat.list][retry-ack]", {
              participante_tipo: retryPayload?.participante_tipo ?? null,
              id_equipo: retryPayload?.id_equipo ?? null,
              id_cliente: retryPayload?.id_cliente ?? null,
              total: Array.isArray(retryList) ? retryList.length : 0,
              conversations: retryList,
              rawAck: ack2,
            });
          } catch {}
          setAdminChats(Array.isArray(retryList) ? retryList : []);
          setChatListLoading(false);
          finishContextSwitch();
        });
        return;
      }

      setAdminChats(Array.isArray(list) ? list : []);
      setChatListLoading(false);
      finishContextSwitch();
    });
  }, [chatListParams, targetId, targetKind]);

  useEffect(() => {
    let mounted = true;
    let socket: any = null;

    (async () => {
      try {
        const { io } = await import("socket.io-client");

        const resolveToken = async (): Promise<string | undefined> => {
          const deadline = Date.now() + 4000;
          while (mounted && Date.now() < deadline) {
            const t = getAuthToken();
            if (t) return t;
            await new Promise((r) => setTimeout(r, 250));
          }
          return getAuthToken() || undefined;
        };

        const token = await resolveToken();
        if (!mounted || !token) return;

        socket = SOCKET_URL
          ? io(SOCKET_URL, {
              auth: { token },
              transports: ["websocket"],
              timeout: 20000,
            })
          : io({
              auth: { token },
              transports: ["websocket"],
              timeout: 20000,
            });

        listSocketRef.current = socket;

        socket.on("connect", () => {
          if (!mounted) return;
          setListSocketConnected(true);
          setListSignal((n) => n + 1);
        });

        socket.on("disconnect", () => {
          if (!mounted) return;
          setListSocketConnected(false);
          setChatListLoading(false);
          setIsContextSwitching(false);
        });
      } catch {
        if (mounted) setListSocketConnected(false);
      }
    })();

    return () => {
      mounted = false;
      try {
        if (listSocketRef.current) {
          listSocketRef.current.disconnect();
        }
      } catch {}
      listSocketRef.current = null;
      setListSocketConnected(false);
    };
  }, [SOCKET_URL]);

  useEffect(() => {
    if (!listSocketConnected) return;
    requestChatsBySocket();
  }, [listSignal, listSocketConnected, requestChatsBySocket]);

  useEffect(() => {
    if (!listSocketConnected) return;
    requestChatsBySocket();
  }, [chatListParams, listSocketConnected, requestChatsBySocket]);

  useEffect(() => {
    const root = chatViewerRef.current;
    if (!root) return;

    const applyReadOnlyLock = () => {
      try {
        const controls = root.querySelectorAll<HTMLElement>(
          "textarea, input, button, select, [contenteditable='true']",
        );
        controls.forEach((el) => {
          const tag = el.tagName.toLowerCase();

          if (tag === "textarea") {
            const txt = el as HTMLTextAreaElement;
            txt.readOnly = true;
            txt.disabled = true;
            txt.tabIndex = -1;
            if (
              String(txt.placeholder || "")
                .toLowerCase()
                .includes("escribe")
            ) {
              txt.placeholder = "Modo solo lectura";
            }
            return;
          }

          if (tag === "input" || tag === "button" || tag === "select") {
            const anyEl = el as
              | HTMLInputElement
              | HTMLButtonElement
              | HTMLSelectElement;
            anyEl.disabled = true;
            anyEl.tabIndex = -1;
            return;
          }

          if (el.getAttribute("contenteditable") === "true") {
            el.setAttribute("contenteditable", "false");
            el.tabIndex = -1;
          }
        });
      } catch {}
    };

    applyReadOnlyLock();
    const observer = new MutationObserver(() => applyReadOnlyLock());
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selectedChatId]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="flex flex-col h-screen overflow-hidden bg-[#f0f2f5]">
          <div className="bg-[#008069] text-white px-6 py-4 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6" />
              <h1 className="text-xl font-medium">Chat Administrador</h1>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="w-1/4 flex flex-col min-h-0 bg-white border-r border-gray-200 shadow-sm">
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
                    {/*
                    <TabsTrigger value="advanced" className="text-xs">
                      Filtros Avanzados
                    </TabsTrigger>
                    */}
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

                  {/*
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
                  */}
                </Tabs>
              </div>

              <div className="flex-1 min-h-0 flex flex-col px-4 py-3">
                <Tabs
                  value={contactTab}
                  onValueChange={(v) => setContactTab(v as any)}
                  className="flex flex-col h-full"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-[#f0f2f5] mb-3 flex-shrink-0">
                    <TabsTrigger value="coaches" className="text-xs">
                      Coaches
                    </TabsTrigger>
                    <TabsTrigger
                      value="students"
                      className="text-xs opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Alumnos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="coaches" className="flex-1 min-h-0 mt-0">
                    <ul className="space-y-0 text-sm h-full overflow-auto">
                      {filteredCoaches.map((t) => {
                        const selected =
                          String(targetKind) === "coach" &&
                          String(targetId) === String(t.id);
                        const _rb = readsBump; // re-render en bumps
                        const unread = unreadForCoachTarget(t);
                        const subtitle = [
                          prettifyMetaText(t.puesto),
                          prettifyMetaText(t.area),
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <li key={String(t.id)}>
                            <button
                              className={`w-full text-left hover:bg-[#f5f6f6] transition-colors ${
                                selected
                                  ? "bg-[#e7f3ff]"
                                  : unread > 0
                                    ? "bg-emerald-50"
                                    : ""
                              }`}
                              onClick={() => {
                                setTargetKind("coach");
                                setTargetId(String(t.codigo ?? t.id));
                                setSelectedChatId(null);
                                setCurrentOpenChatId(null);
                                setContactTab("conversations");
                                setChatListLoading(true);
                                setIsContextSwitching(true);
                                setSwitchingToLabel(t.nombre);
                                setTargetTitle(`Conversaciones de ${t.nombre}`);
                                setTargetSubtitle(
                                  [t.puesto, t.area]
                                    .filter(Boolean)
                                    .join(" · ") || "Coach",
                                );
                                // Si existe chat con este coach, limpiar contador
                                try {
                                  const match = (adminChats || []).find(
                                    (it) =>
                                      chatHasEquipoPair(
                                        it,
                                        String(ADMIN_COACH_ID),
                                        String(t.id),
                                      ) ||
                                      chatHasEquipoPair(
                                        it,
                                        String(ADMIN_COACH_ID),
                                        String(t.codigo),
                                      ),
                                  );
                                  const id = match?.id_chat ?? match?.id;
                                  if (id != null) {
                                    const k = `chatUnreadById:coach:${String(
                                      id,
                                    )}`;
                                    localStorage.setItem(k, "0");
                                    setReadsBump((n) => n + 1);
                                  }
                                } catch {}
                              }}
                            >
                              <div
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg border mb-1 transition-colors ${
                                  selected
                                    ? "border-[#bfdeff] bg-[#e7f3ff]"
                                    : "border-transparent hover:border-gray-200"
                                }`}
                              >
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#d9fdd3] to-[#25d366] text-[#075e54] grid place-items-center font-semibold text-sm shrink-0 shadow-sm">
                                  {initialFromText(t.nombre || t.codigo)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold text-[15px] text-gray-900 leading-tight">
                                    {t.nombre}
                                  </div>
                                  {subtitle && (
                                    <div className="text-[12px] text-gray-500 truncate mt-1 uppercase tracking-wide">
                                      {subtitle}
                                    </div>
                                  )}
                                </div>
                                {unread > 0 && (
                                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[#25d366] text-white text-[10px] font-semibold grid place-items-center px-1">
                                    {unread > 99 ? "99+" : unread}
                                  </span>
                                )}
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
                        const _rb = readsBump; // re-render en bumps
                        const unread = unreadForStudentTarget(s);
                        return (
                          <li key={String(s.id)}>
                            <button
                              className={`w-full text-left hover:bg-[#f5f6f6] transition-colors ${
                                selected
                                  ? "bg-[#f0f2f5]"
                                  : unread > 0
                                    ? "bg-emerald-50"
                                    : ""
                              }`}
                              onClick={() => {
                                setTargetKind("alumno");
                                setTargetId(String(s.code ?? s.id));
                                setSelectedChatId(null);
                                setCurrentOpenChatId(null);
                                setContactTab("conversations");
                                setChatListLoading(true);
                                setIsContextSwitching(true);
                                setSwitchingToLabel(s.name);
                                setTargetTitle(`Conversaciones de ${s.name}`);
                                setTargetSubtitle("Alumno");
                                // Si existe chat con este alumno, limpiar contador
                                try {
                                  const match = (adminChats || []).find((it) =>
                                    chatHasClienteEquipoPair(
                                      it,
                                      String(s.code ?? s.id),
                                      String(ADMIN_COACH_ID),
                                    ),
                                  );
                                  const id = match?.id_chat ?? match?.id;
                                  if (id != null) {
                                    const k = `chatUnreadById:coach:${String(
                                      id,
                                    )}`;
                                    localStorage.setItem(k, "0");
                                    setReadsBump((n) => n + 1);
                                  }
                                } catch {}
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
                                          s.stage,
                                        )}`}
                                      >
                                        {s.stage}
                                      </Badge>
                                    )}
                                    {s.state && (
                                      <Badge
                                        className={`text-[10px] px-2 py-0 h-4 font-medium border ${getStateColor(
                                          s.state,
                                        )}`}
                                      >
                                        {s.state}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {unread > 0 && (
                                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[#25d366] text-white text-[10px] font-semibold grid place-items-center px-1">
                                    {unread > 99 ? "99+" : unread}
                                  </span>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </TabsContent>

                  <TabsContent
                    value="conversations"
                    className="flex-1 min-h-0 mt-0 flex flex-col relative"
                  >
                    {isContextSwitching && (
                      <div className="absolute inset-0 z-30 bg-white/55 backdrop-blur-[2px] grid place-items-center pointer-events-none">
                        <div className="rounded-lg bg-black/70 text-white px-3 py-1.5 text-xs font-medium shadow">
                          Cambiando a:{" "}
                          {switchingToLabel || targetTitle || "Coach"}...
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {targetKind
                            ? `Coach seleccionado: ${targetTitle}`
                            : "Conversaciones activas"}
                        </div>
                        {targetKind && (
                          <div className="text-xs text-gray-500">
                            {targetSubtitle ||
                              (targetKind === "coach" ? "Coach" : "Alumno")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {targetKind && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setTargetKind(null);
                              setTargetId(null);
                              setSelectedChatId(null);
                              setCurrentOpenChatId(null);
                              setTargetTitle("Selecciona un contacto");
                              setTargetSubtitle(undefined);
                            }}
                          >
                            Ver todos
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={
                            listSocketConnected ? "Actualizar" : "Conectando..."
                          }
                          onClick={() => setListSignal((n) => n + 1)}
                          disabled={!listSocketConnected}
                          className="h-9 w-9 rounded-full hover:bg-gray-100"
                        >
                          <RotateCw
                            className={`w-4 h-4 ${
                              listSocketConnected
                                ? "text-[#008069]"
                                : "text-gray-400"
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                    <ul className="space-y-0 text-sm flex-1 overflow-auto">
                      {chatListLoading && (
                        <li className="text-[13px] text-gray-500 text-center py-8 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cargando conversaciones...
                        </li>
                      )}
                      {!chatListLoading && visibleChats.length === 0 && (
                        <li className="text-[13px] text-gray-500 text-center py-8">
                          {targetKind
                            ? "Este usuario no tiene conversaciones"
                            : "Sin conversaciones activas"}
                        </li>
                      )}
                      {visibleChats.map((it) => {
                        const id = it?.id_chat ?? it?.id;
                        const { title, subtitle } = labelForChatItem(it);
                        const { coachUnread, alumnoUnread } =
                          getReadStatusByRole(it);
                        const lastObj =
                          it?.last_message ?? it?.ultimo_mensaje ?? null;
                        let last = (
                          lastObj?.contenido ??
                          lastObj?.text ??
                          it?.last?.text ??
                          ""
                        ).toString();

                        // Si no hay texto, verificar si hay archivos adjuntos
                        if (!last.trim()) {
                          const archivos =
                            lastObj?.archivos ??
                            lastObj?.Archivos ??
                            lastObj?.archivos_cargados ??
                            lastObj?.attachments ??
                            [];
                          if (Array.isArray(archivos) && archivos.length > 0) {
                            const firstFile = archivos[0];
                            const mime = String(
                              firstFile?.mime ??
                                firstFile?.tipo_mime ??
                                firstFile?.type ??
                                "",
                            ).toLowerCase();

                            if (mime.startsWith("audio/")) {
                              last = "🎤 Mensaje de voz";
                            } else if (mime.startsWith("image/")) {
                              last = "📷 Imagen";
                            } else if (mime.startsWith("video/")) {
                              last = "🎬 Video";
                            } else if (mime.includes("pdf")) {
                              last = "📄 Documento PDF";
                            } else if (
                              mime.includes("word") ||
                              mime.includes("document")
                            ) {
                              last = "📝 Documento";
                            } else if (
                              mime.includes("sheet") ||
                              mime.includes("excel")
                            ) {
                              last = "📊 Hoja de cálculo";
                            } else {
                              last = "📎 Archivo adjunto";
                            }

                            if (archivos.length > 1) {
                              last += ` (+${archivos.length - 1})`;
                            }
                          }
                        }
                        // Dependemos de readsBump para re-render al cambiar lecturas
                        const _rb = readsBump; // eslint-disable-line @typescript-eslint/no-unused-vars
                        const unread = hasUnreadForItem(it);
                        // Contador persistente de no-leídos por chatId (rol coach)
                        const countKey = `chatUnreadById:coach:${String(
                          id ?? "",
                        )}`;
                        const storedCount = Number.parseInt(
                          (typeof window !== "undefined" &&
                            window.localStorage.getItem(countKey)) ||
                            "0",
                          10,
                        );
                        // Prefer server-provided unread count if present, otherwise fallback to persistent localStorage count
                        const count =
                          it?.unread != null
                            ? Number(it.unread) || 0
                            : isNaN(storedCount)
                              ? 0
                              : storedCount;
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
                                if (!targetKind) {
                                  setTargetTitle(title);
                                  setTargetSubtitle(subtitle);
                                }
                                setSelectedChatId(id);
                                setCurrentOpenChatId(id ?? null);
                                // Reiniciar contador persistente de este chat al abrir
                                if (id != null) {
                                  try {
                                    const k = `chatUnreadById:coach:${String(
                                      id,
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
                                  {(coachUnread !== null ||
                                    alumnoUnread !== null) && (
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {coachUnread !== null && (
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            coachUnread > 0
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          }`}
                                        >
                                          {coachUnread > 0
                                            ? `Coach: ${coachUnread} por ver`
                                            : "Coach: vio todo"}
                                        </span>
                                      )}
                                      {alumnoUnread !== null && (
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            alumnoUnread > 0
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          }`}
                                        >
                                          {alumnoUnread > 0
                                            ? `Alumno: ${alumnoUnread} por ver`
                                            : "Alumno: vio todo"}
                                        </span>
                                      )}
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

            <div
              ref={chatViewerRef}
              className="flex-1 bg-[#efeae2] relative flex flex-col min-h-0 overflow-hidden"
            >
              {isContextSwitching && (
                <div className="absolute inset-0 z-40 bg-white/30 backdrop-blur-[2px] grid place-items-center pointer-events-none">
                  <div className="rounded-xl bg-black/70 text-white px-4 py-2 text-sm font-medium shadow-lg">
                    Cambiando a: {switchingToLabel || targetTitle || "Coach"}...
                  </div>
                </div>
              )}
              <div className="absolute top-2 right-3 z-30 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">
                Solo lectura
              </div>
              {/* Vista global: listar TODAS las conversaciones sin filtrar por equipo del admin */}
              <CoachChatInline
                room={room}
                role="coach"
                title={targetTitle}
                subtitle={targetSubtitle}
                variant="card"
                className="h-full min-h-0 shadow-none border-0"
                socketio={{
                  url: SOCKET_URL || undefined,
                  idEquipo: selectedCoachCode ?? undefined,
                  idCliente: selectedStudentCode ?? undefined,
                  // Modo solo lectura: no crear chats nuevos desde beta.
                  autoCreate: false,
                  autoJoin: !!selectedChatId,
                  chatId: selectedChatId ?? undefined,
                }}
                onConnectionChange={setConnected}
                requestListSignal={listSignal}
                // Igual al flujo de coach: filtrar por participante seleccionado.
                listParams={chatListParams}
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
