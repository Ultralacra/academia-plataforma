"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Edit, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CoachStudentsModal } from "../coach-students-modal";
import {
  getCoachByCode,
  updateCoach,
  deleteCoach,
  type CoachItem,
  getCoachStudents,
} from "../api";
import { getOptions, type OpcionItem } from "@/app/admin/opciones/api";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import TicketsPanelCoach from "../TicketsPanelCoach";
import CoachChatInline from "./CoachChatInline";
import {
  getCoaches,
  type CoachItem as CoachMini,
  offerSession,
  listAlumnoSessions,
  type SessionItem,
} from "../api";
import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PersonalMetrics from "../PersonalMetrics";
import CoachStudentsTable from "../components/CoachStudentsTable";
import { fetchMetrics } from "@/app/admin/teams/teamsApi";
import { getAllStudents } from "@/app/admin/alumnos/api";
import SessionsPanel from "../components/SessionsPanel";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_HOST } from "@/lib/api-config";
import Spinner from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

// Tipo compacto para lista de alumnos en chat (evita genérico multilínea en TSX)
type StudentMini = {
  id?: string;
  code: string;
  name: string;
  state?: string | null;
  stage?: string | null;
};

export default function CoachDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code;
  const router = useRouter();
  const chatServerUrl = (CHAT_HOST || "").replace(/\/$/, "");
  // Modo mantenimiento para chat: cuando NEXT_PUBLIC_CHAT_MAINTENANCE=1
  const chatMaintenance =
    (process.env.NEXT_PUBLIC_CHAT_MAINTENANCE || "") === "1";

  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const [coach, setCoach] = useState<CoachItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState<string | undefined>(undefined);
  const [area, setArea] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teamsList, setTeamsList] = useState<CoachMini[]>([]);
  const [targetTeamCode, setTargetTeamCode] = useState<string | null>(null);
  const [studentsList, setStudentsList] = useState<StudentMini[]>([]);
  const [allStudentsList, setAllStudentsList] = useState<StudentMini[]>([]);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(false);
  const [targetStudentCode, setTargetStudentCode] = useState<string | null>(
    null
  );
  const [targetStudentName, setTargetStudentName] = useState<string>("");
  const [chatList, setChatList] = useState<any[]>([]);
  const [requestListSignal, setRequestListSignal] = useState<
    number | undefined
  >(undefined);
  const [studentsFetchDone, setStudentsFetchDone] = useState(false);
  const [chatConnected, setChatConnected] = useState<boolean>(false);
  const [chatInfo, setChatInfo] = useState<{
    chatId: string | number | null;
    myParticipantId: string | number | null;
    participants?: any[] | null;
  }>({ chatId: null, myParticipantId: null, participants: null });
  const [chatsLoading, setChatsLoading] = useState<boolean>(true);
  const [decisionStamp, setDecisionStamp] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState<string>("");
  const [studentQuery, setStudentQuery] = useState<string>("");
  const [readsBump, setReadsBump] = useState<number>(0);
  // Bump para forzar re-render cuando cambian contadores persistentes de no leídos
  const [unreadBump, setUnreadBump] = useState<number>(0);
  // Chat abierto (por chatId) — opcional, solo informativo
  const [currentOpenChatId, setCurrentOpenChatId] = useState<
    string | number | null
  >(null);

  // Pestañas de conversaciones abiertas (solo nombres, sin IDs)
  type OpenTab = {
    key: string; // team:CODE o student:CODE
    type: "team" | "student";
    code: string;
    name: string;
  };
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeChatTab, setActiveChatTab] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Tabs control + sessions prefill
  const [activeTab, setActiveTab] = useState<string>("tickets");
  const [sessionsPrefillAlumno, setSessionsPrefillAlumno] = useState<
    string | null
  >(null);
  const [sessionsOfferSignal, setSessionsOfferSignal] = useState<number>(0);

  const [puestoOptionsApi, setPuestoOptionsApi] = useState<OpcionItem[]>([]);
  const [areaOptionsApi, setAreaOptionsApi] = useState<OpcionItem[]>([]);
  const [optsLoading, setOptsLoading] = useState(false);

  const [draftNombre, setDraftNombre] = useState("");
  const [draftPuesto, setDraftPuesto] = useState<string | undefined>(undefined);
  const [draftArea, setDraftArea] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!code) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const c = await getCoachByCode(code);
        if (!ctrl.signal.aborted) setCoach(c);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message ?? "Error al cargar coach");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    (async () => {
      try {
        setChatsLoading(true);
        const list = await getCoaches({ page: 1, pageSize: 200 });
        if (ctrl.signal.aborted) return;
        setTeamsList(
          list.filter(
            (t) => (t.codigo || "").toLowerCase() !== (code || "").toLowerCase()
          )
        );
      } catch {}
    })();
    return () => ctrl.abort();
  }, [code]);

  // Optimización: Mapas para búsqueda rápida O(1)
  const teamsMap = useMemo(() => {
    const m = new Map<string, CoachMini>();
    for (const t of teamsList) {
      if (t.codigo) m.set(t.codigo.toLowerCase(), t);
    }
    return m;
  }, [teamsList]);

  const studentsMap = useMemo(() => {
    const m = new Map<string, StudentMini>();
    for (const s of studentsList) {
      if (s.code) m.set(s.code.toLowerCase(), s);
    }
    return m;
  }, [studentsList]);

  const targetTeamName = useMemo(() => {
    if (!targetTeamCode) return "";
    const found = teamsMap.get(String(targetTeamCode).toLowerCase());
    return found?.nombre || String(targetTeamCode);
  }, [teamsMap, targetTeamCode]);

  function openContact(t: CoachMini) {
    setTargetStudentCode(null);
    setTargetStudentName("");
    setTargetTeamCode(t.codigo);
    setChatInfo({ chatId: null, myParticipantId: null });
    setChatsLoading(true);
    setRequestListSignal((n) => (n ?? 0) + 1);
    setDecisionStamp(null);
    try {
      console.log("[teamsv2] contacto seleccionado =>", {
        target: t.codigo,
        myself: code,
      });
    } catch {}
  }

  function normalizeTipo(v: any): "cliente" | "equipo" | "admin" | "" {
    const s = String(v || "")
      .trim()
      .toLowerCase();
    if (["cliente", "alumno", "student"].includes(s)) return "cliente";
    if (["equipo", "coach", "entrenador"].includes(s)) return "equipo";
    if (["admin", "administrador"].includes(s)) return "admin";
    return "";
  }
  function itemParticipants(it: any): any[] {
    const parts = it?.participants || it?.participantes || [];
    return Array.isArray(parts) ? parts : [];
  }
  function chatHasEquipoPair(it: any, a: string, b: string): boolean {
    const parts = itemParticipants(it);
    const set = new Set<string>();
    for (const p of parts) {
      if (normalizeTipo(p?.participante_tipo) === "equipo" && p?.id_equipo) {
        set.add(String(p.id_equipo).toLowerCase());
      }
    }
    return set.has(String(a).toLowerCase()) && set.has(String(b).toLowerCase());
  }
  function chatOtherTeamCode(it: any, myCode: string): string | null {
    try {
      const parts = itemParticipants(it);
      for (const p of parts) {
        if (normalizeTipo(p?.participante_tipo) !== "equipo") continue;
        const val = p?.id_equipo;
        if (!val) continue;
        const codeStr = String(val);
        if (codeStr.toLowerCase() !== String(myCode).toLowerCase())
          return codeStr;
      }
      return null;
    } catch {
      return null;
    }
  }
  function chatHasClienteEquipoPair(
    it: any,
    clienteId: string,
    equipoId: string
  ): boolean {
    try {
      const parts = itemParticipants(it);
      let okCliente = false;
      let okEquipo = false;
      for (const p of parts) {
        const tipo = normalizeTipo(p?.participante_tipo);
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

  function chatOtherStudentCode(it: any): string | null {
    try {
      // 1. Try root level properties first (faster, works without participants)
      const root =
        it?.id_cliente ?? it?.id_alumno ?? it?.client_id ?? it?.student_id;
      if (root) return String(root);

      const parts = itemParticipants(it);
      for (const p of parts) {
        if (normalizeTipo(p?.participante_tipo) !== "cliente") continue;
        const val = p?.id_cliente ?? p?.id_alumno ?? p?.client_id;
        if (val == null) continue;
        return String(val);
      }
      return null;
    } catch {
      return null;
    }
  }
  function getChatTimestamp(it: any): number {
    const fields = [
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
  }
  function getChatLastMessage(it: any): { text: string; at: number } {
    try {
      const m = it?.last_message || {};
      const text =
        String(
          m?.contenido ?? m?.Contenido ?? m?.text ?? it?.last_message_text ?? ""
        ) || "";
      const atFields = [
        m?.fecha_envio,
        it?.last_message_at,
        it?.fecha_ultimo_mensaje,
        it?.updated_at,
        it?.fecha_actualizacion,
      ];
      for (const f of atFields) {
        const t = Date.parse(String(f || ""));
        if (!isNaN(t)) return { text, at: t };
      }
      return { text, at: 0 };
    } catch {
      return { text: "", at: 0 };
    }
  }
  const formatTime = (ms: number): string => {
    if (!ms || isNaN(ms)) return "";
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  function getLastReadByChatId(chatId: any): number {
    try {
      const key = `chatLastReadById:coach:${String(chatId)}`;
      const v = localStorage.getItem(key);
      const t = v ? Number.parseInt(v, 10) : 0;
      return isNaN(t) ? 0 : t;
    } catch {
      return 0;
    }
  }
  function getUnreadCountByChatId(chatId: any): number {
    try {
      const key = `chatUnreadById:coach:${String(chatId)}`;
      const v = localStorage.getItem(key);
      const n = v ? Number.parseInt(v, 10) : 0;
      return isNaN(n) ? 0 : n;
    } catch {
      return 0;
    }
  }
  function pickExistingChatIdForTarget(
    targetCode: string
  ): string | number | null {
    const list = Array.isArray(chatList) ? chatList : [];
    const matches = list.filter((it) =>
      chatHasEquipoPair(it, code, targetCode)
    );
    if (matches.length === 0) {
      // Fallback: sometimes `chat.list` no incluye participantes; intentar empatar por id_chat === targetCode
      const byId = list.find(
        (it) => String(it?.id_chat ?? it?.id ?? "") === String(targetCode)
      );
      if (byId) return byId?.id_chat ?? byId?.id ?? null;
      return null;
    }
    matches.sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
    const top = matches[0];
    return top?.id_chat ?? top?.id ?? null;
  }

  function pickExistingChatIdForStudent(
    alumnoCode: string
  ): string | number | null {
    const list = Array.isArray(chatList) ? chatList : [];
    // Try to resolve ID
    const s =
      studentsList.find(
        (x) => (x.code || "").toLowerCase() === String(alumnoCode).toLowerCase()
      ) ||
      allStudentsList.find(
        (x) => (x.code || "").toLowerCase() === String(alumnoCode).toLowerCase()
      );
    const sId = s?.id;

    const matches = list.filter(
      (it) =>
        chatHasClienteEquipoPair(it, String(alumnoCode), String(code)) ||
        (sId && chatHasClienteEquipoPair(it, String(sId), String(code)))
    );
    if (matches.length === 0) {
      // Fallback: intentar empatar por id_chat === alumnoCode cuando falta info de participantes
      const byId = list.find(
        (it) => String(it?.id_chat ?? it?.id ?? "") === String(alumnoCode)
      );
      if (byId) return byId?.id_chat ?? byId?.id ?? null;
      return null;
    }
    matches.sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
    const top = matches[0];
    return top?.id_chat ?? top?.id ?? null;
  }

  function getParticipantNameFromChat(
    chat: any,
    type: "cliente" | "equipo",
    id: string
  ): string | null {
    try {
      const parts = itemParticipants(chat);
      for (const p of parts) {
        if (normalizeTipo(p?.participante_tipo) === type) {
          const pId =
            type === "cliente" ? p?.id_cliente ?? p?.id_alumno : p?.id_equipo;
          if (String(pId).toLowerCase() === String(id).toLowerCase()) {
            // Try to find name in nested objects
            if (p?.cliente?.nombre) return p.cliente.nombre;
            if (p?.alumno?.nombre) return p.alumno.nombre;
            if (p?.equipo?.nombre) return p.equipo.nombre;
            if (p?.nombre) return p.nombre;
            if (p?.name) return p.name;
          }
        }
      }
    } catch {}
    return null;
  }

  const chatsByContact = useMemo(() => {
    const list = Array.isArray(chatList) ? chatList : [];
    const map = new Map<string, any[]>();
    for (const it of list) {
      const target = chatOtherTeamCode(it, code);
      if (!target) continue;
      const key = String(target).toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    const arr = Array.from(map.entries()).map(([key, chats]) => {
      chats.sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
      const targetCode = chatsByKeyToOriginalCode(chats, key);
      const target = teamsList.find(
        (t) => (t.codigo || "").toLowerCase() === key
      );
      const targetName = target?.nombre ?? targetCode ?? key;
      const top = chats[0];
      const topChatId = top?.id_chat ?? top?.id ?? null;
      const lastAt = getChatTimestamp(top);
      const last = getChatLastMessage(top);
      const lastRead = topChatId != null ? getLastReadByChatId(topChatId) : 0;
      const hasUnread = lastAt > (lastRead || 0);
      return {
        key,
        targetCode: targetCode ?? key,
        targetName,
        chats,
        topChatId,
        lastAt,
        lastText: (last.text || "").trim(),
        hasUnread,
      };
    });
    arr.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    return arr;
  }, [chatList, teamsList, code, readsBump]);

  function chatsByKeyToOriginalCode(
    chats: any[],
    keyLower: string
  ): string | null {
    for (const it of chats) {
      const other = chatOtherTeamCode(it, code);
      if (other && other.toLowerCase() === keyLower) return other;
    }
    return null;
  }

  // Cache de nombre por id_chat para render inmediato y persistencia en recargas
  function getCachedContactName(chatId: any): string | null {
    try {
      const id = chatId == null ? null : String(chatId);
      if (!id) return null;
      const k = `chatContactName:${id}`;
      const v = localStorage.getItem(k);
      return v && v.trim() ? v : null;
    } catch {
      return null;
    }
  }
  function setCachedContactName(chatId: any, name: string | null | undefined) {
    try {
      const id = chatId == null ? null : String(chatId);
      if (!id) return;
      const k = `chatContactName:${id}`;
      if (name && name.trim()) localStorage.setItem(k, name.trim());
    } catch {}
  }

  const chatsByStudent = useMemo(() => {
    const list = Array.isArray(chatList) ? chatList : [];
    const map = new Map<string, any[]>();
    for (const it of list) {
      const student = chatOtherStudentCode(it);
      if (!student) continue;
      const key = String(student).toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    const arr = Array.from(map.entries()).map(([key, chats]) => {
      chats.sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
      const top = chats[0];
      const targetCode = chats.find(() => true)
        ? chatOtherStudentCode(chats[0])
        : key;

      const stu = studentsList.find(
        (s) =>
          (s.code || "").toLowerCase() === key ||
          (s.id && String(s.id).toLowerCase() === key)
      );
      let targetName = stu?.name;
      if (!targetName) {
        targetName =
          getParticipantNameFromChat(top, "cliente", key) || undefined;
      }
      targetName = targetName ?? targetCode ?? key;

      const topChatId = top?.id_chat ?? top?.id ?? null;
      const lastAt = getChatTimestamp(top);
      const last = getChatLastMessage(top);
      const lastRead = topChatId != null ? getLastReadByChatId(topChatId) : 0;
      const hasUnread = lastAt > (lastRead || 0);
      return {
        key,
        targetCode: targetCode ?? key,
        targetName,
        chats,
        topChatId,
        lastAt,
        lastText: (last.text || "").trim(),
        hasUnread,
      };
    });
    arr.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    return arr;
  }, [chatList, studentsList, readsBump]);

  const contactsWithoutChat = useMemo(() => {
    const withChat = new Set(
      chatsByContact.map((c) => c.targetCode.toLowerCase())
    );
    const list = Array.isArray(teamsList) ? teamsList : [];
    const noChat = list.filter(
      (t) => !withChat.has(String(t.codigo || "").toLowerCase())
    );
    const q = (contactQuery || "").trim().toLowerCase();
    if (!q) return noChat;
    return noChat.filter(
      (t) =>
        (t.nombre || "").toLowerCase().includes(q) ||
        (t.codigo || "").toLowerCase().includes(q)
    );
  }, [teamsList, chatsByContact, contactQuery]);

  const unifiedChatList = useMemo(() => {
    const q = (contactQuery || "").trim().toLowerCase();
    const list = Array.isArray(chatList) ? chatList : [];

    const grouped = new Map<string, any>();
    const orderedKeys: string[] = [];

    // 1. Process chatList in order (Server Order)
    list.forEach((chat) => {
      const id = chat?.id_chat ?? chat?.id;
      const otherTeam = chatOtherTeamCode(chat, code);
      const otherStudent = chatOtherStudentCode(chat);
      const hasParticipants = Array.isArray(
        chat.participants || chat.participantes
      );
      // const isLoading = !hasParticipants; // Moved down

      let type = "student";
      let targetCode = String(id);
      let key = `orphan:${id}`;
      let name = String(id); // Default to ID
      let avatarColor = "bg-gray-500";

      if (otherTeam) {
        type = "team";
        targetCode = otherTeam;
        key = `team:${otherTeam.toLowerCase()}`;
        const t = teamsMap.get(targetCode.toLowerCase());
        name = t?.nombre || targetCode;
        avatarColor = "bg-teal-500";
      } else if (otherStudent) {
        type = "student";
        targetCode = otherStudent;
        key = `student:${otherStudent.toLowerCase()}`;
        const s =
          studentsMap.get(targetCode.toLowerCase()) ||
          allStudentsList.find(
            (st) => (st.code || "").toLowerCase() === targetCode.toLowerCase()
          );
        name = s?.name || targetCode;
        if (!s?.name) {
          const fromChat = getParticipantNameFromChat(
            chat,
            "cliente",
            targetCode
          );
          if (fromChat) name = fromChat;
        }
        avatarColor = "bg-emerald-500";
      } else {
        const parts = itemParticipants(chat);
        const clientPart = parts.find(
          (p: any) => normalizeTipo(p?.participante_tipo) === "cliente"
        );
        if (clientPart) {
          const cid =
            clientPart.id_cliente ??
            clientPart.id_alumno ??
            clientPart.client_id;
          if (cid) {
            const s =
              studentsList.find(
                (st) =>
                  (st.code || "").toLowerCase() === String(cid).toLowerCase()
              ) ||
              allStudentsList.find(
                (st) =>
                  (st.code || "").toLowerCase() === String(cid).toLowerCase()
              );
            name = s?.name || String(cid);
          }
        }
      }

      // Determine if we should show skeleton
      // const isNameResolved =
      //   name &&
      //   name !== targetCode &&
      //   name !== String(id) &&
      //   name !== "(Sin nombre)";
      // const isLoading = !hasParticipants && !isNameResolved;

      if (!grouped.has(key)) {
        grouped.set(key, {
          type,
          key,
          code: targetCode,
          name,
          chats: [],
          avatarColor,
          isNew: false,
          topChatId: id,
          // isLoading,
        });
        orderedKeys.push(key);
      }

      const group = grouped.get(key);
      group.chats.push(chat);
    });

    // 2. Build result list
    const result = orderedKeys.map((key) => {
      const group = grouped.get(key);
      const top = group.chats[0];
      const topChatId = top?.id_chat ?? top?.id ?? null;
      const lastAt = getChatTimestamp(top);
      const last = getChatLastMessage(top);

      const unreadCount = group.chats.reduce((acc: number, it: any) => {
        const cid = it?.id_chat ?? it?.id;
        return acc + (cid ? getUnreadCountByChatId(cid) : 0);
      }, 0);

      const lastRead = topChatId != null ? getLastReadByChatId(topChatId) : 0;
      const hasUnread = lastAt > (lastRead || 0);

      if (topChatId && group.name && group.name !== "(Sin nombre)") {
        setCachedContactName(topChatId, group.name);
      }

      return {
        ...group,
        topChatId,
        lastAt,
        lastText: (last.text || "").trim(),
        hasUnread,
        unreadCount,
      };
    });

    // 3. Add "New" contacts (Search results)
    if (q) {
      const existingKeys = new Set(orderedKeys);

      teamsList.forEach((t) => {
        const k = `team:${(t.codigo || "").toLowerCase()}`;
        if (
          !existingKeys.has(k) &&
          ((t.nombre || "").toLowerCase().includes(q) ||
            (t.codigo || "").toLowerCase().includes(q))
        ) {
          result.push({
            type: "team",
            key: k,
            code: t.codigo,
            name: t.nombre || t.codigo,
            lastAt: 0,
            lastText: "",
            hasUnread: false,
            unreadCount: 0,
            topChatId: null,
            chats: [],
            avatarColor: "bg-teal-500",
            isNew: true,
          });
        }
      });

      const sourceList =
        allStudentsList.length > 0 ? allStudentsList : studentsList;
      sourceList.forEach((s) => {
        const k = `student:${(s.code || String(s.id)).toLowerCase()}`;
        if (
          !existingKeys.has(k) &&
          ((s.name || "").toLowerCase().includes(q) ||
            (s.code || "").toLowerCase().includes(q))
        ) {
          result.push({
            type: "student",
            key: k,
            code: s.code || String(s.id),
            name: s.name || s.code,
            lastAt: 0,
            lastText: "",
            hasUnread: false,
            unreadCount: 0,
            topChatId: null,
            chats: [],
            avatarColor: "bg-emerald-500",
            isNew: true,
          });
        }
      });
    }

    // 4. Filter by query
    let finalResult = result;
    if (q) {
      finalResult = finalResult.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(q) ||
          (item.code || "").toLowerCase().includes(q)
      );
    }

    return finalResult;
  }, [
    chatList,
    teamsList,
    studentsList,
    allStudentsList,
    contactQuery,
    readsBump,
    unreadBump,
    teamsMap,
    studentsMap,
    code,
  ]);

  // Sincroniza la pestaña activa con la selección del chat (equipo/alumno)
  useEffect(() => {
    if (!activeChatTab) return;
    const [type, ...rest] = activeChatTab.split(":");
    const codeKey = rest.join(":");
    try {
      console.log("[teamsv2] Tab activa:", activeChatTab, { type, codeKey });
    } catch {}
    if (type === "team") {
      setTargetStudentCode(null);
      setTargetStudentName("");
      setTargetTeamCode(codeKey);
      const existing = pickExistingChatIdForTarget(codeKey);
      try {
        console.log("[teamsv2] Cambiando a chat EQUIPO", {
          my: code,
          target: codeKey,
          existingChatId: existing,
        });
      } catch {}
      setChatInfo({ chatId: existing, myParticipantId: null });
      setCurrentOpenChatId(existing ?? null);
      // Si no existe aún, forzar intento de creación/union
      if (existing == null) {
        setRequestListSignal((n) => (n ?? 0) + 1);
        setSessionsOfferSignal((n) => n + 1); // reutilizamos como joinSignal
      }
    } else if (type === "student") {
      setTargetTeamCode(null);
      setTargetStudentCode(codeKey);
      const stu = studentsList.find(
        (s) => (s.code || "").toLowerCase() === codeKey.toLowerCase()
      );
      setTargetStudentName(stu?.name || codeKey);
      const existing = pickExistingChatIdForStudent(codeKey);
      try {
        console.log("[teamsv2] Cambiando a chat ALUMNO", {
          my: code,
          target: codeKey,
          existingChatId: existing,
        });
      } catch {}
      setChatInfo({ chatId: existing, myParticipantId: null });
      setCurrentOpenChatId(existing ?? null);
      if (existing == null) {
        setRequestListSignal((n) => (n ?? 0) + 1);
        setSessionsOfferSignal((n) => n + 1);
      }
    } else if (type === "chat") {
      // Soporte para pestañas creadas por id_chat directo
      const id = codeKey;
      try {
        console.log("[teamsv2] Cambiando a chat por ID", { chatId: id });
      } catch {}
      setTargetTeamCode(null);
      setTargetStudentCode(null);
      setTargetStudentName("");
      setChatInfo({ chatId: id, myParticipantId: null });
      setCurrentOpenChatId(id ?? null);
    }
  }, [activeChatTab]);

  // Cargar alumnos asignados para este coach/equipo (usando getCoachStudents para asegurar nombres)
  useEffect(() => {
    if (!code) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setStudentsLoading(true);
        // Usamos getCoachStudents que devuelve la lista oficial de alumnos asignados con nombres
        const rows = await getCoachStudents(code);

        const mapped: StudentMini[] = rows.map((r) => ({
          id: String(r.id),
          code: r.id_alumno || String(r.id), // id_alumno suele ser el código
          name: r.alumno_nombre || "(Sin nombre)",
          state: r.estatus,
          stage: r.fase,
        }));

        if (!ctrl.signal.aborted) setStudentsList(mapped);
      } catch (e) {
        console.error("Error loading students:", e);
        if (!ctrl.signal.aborted) setStudentsList([]);
      } finally {
        if (!ctrl.signal.aborted) setStudentsLoading(false);
      }
    })();

    // Also fetch all students for search if needed (in background)
    (async () => {
      try {
        const all = await getAllStudents();
        if (ctrl.signal.aborted) return;
        setAllStudentsList(
          all.map((s) => ({
            id: s.id ? String(s.id) : undefined,
            code: s.code || String(s.id),
            name: s.name,
            state: s.state,
            stage: s.stage,
          }))
        );
      } catch {
      } finally {
        if (!ctrl.signal.aborted) setStudentsFetchDone(true);
      }
    })();

    return () => ctrl.abort();
  }, [code]);

  const listRequestedRef = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    if (!chatConnected) return;
    // Esperar a que se carguen los alumnos para poder resolver nombres inmediatamente
    if (!studentsFetchDone) return;

    if (listRequestedRef.done) return;
    if (chatList.length === 0) {
      setChatsLoading(true);
      setRequestListSignal((n) => (n ?? 0) + 1);
    }
    listRequestedRef.done = true;
  }, [chatConnected, studentsFetchDone]);

  useEffect(() => {
    if (!coach) return;
    setNombre(coach.nombre ?? "");
    setPuesto(coach.puesto ?? undefined);
    setArea(coach.area ?? undefined);
  }, [coach]);

  async function handleSave() {
    if (!coach) return;
    try {
      setSaving(true);
      await updateCoach(coach.codigo, {
        nombre: nombre || undefined,
        puesto: puesto ?? undefined,
        area: area ?? undefined,
      });
      toast({ title: "Coach actualizado" });
      const c = await getCoachByCode(code);
      setCoach(c);
      setEditOpen(false);
    } catch (e: any) {
      toast({ title: e?.message ?? "Error al actualizar coach" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!coach) return;
    setDeleteOpen(true);
  }

  useEffect(() => {
    let mounted = true;
    if (!editOpen)
      return () => {
        mounted = false;
      };
    (async () => {
      try {
        setOptsLoading(true);
        const [puestosRes, areasRes] = await Promise.all([
          getOptions("puesto"),
          getOptions("area"),
        ]);
        if (!mounted) return;
        setPuestoOptionsApi(puestosRes ?? []);
        setAreaOptionsApi(areasRes ?? []);
        setDraftNombre(coach?.nombre ?? "");
        setDraftPuesto(coach?.puesto ?? undefined);
        setDraftArea(coach?.area ?? undefined);
      } catch (e) {
      } finally {
        if (mounted) setOptsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [editOpen, coach]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("chatLastReadById:coach:")) {
        setReadsBump((n) => n + 1);
      }
      if (e.key.startsWith("chatUnreadById:coach:")) {
        setUnreadBump((n) => n + 1);
      }
    };
    const onLastReadUpdated = (e: any) => {
      try {
        if (e?.detail?.role === "coach") setReadsBump((n) => n + 1);
      } catch {}
    };
    const onUnreadCountUpdated = (e: any) => {
      try {
        if (e?.detail?.role === "coach") setUnreadBump((n) => n + 1);
      } catch {}
    };
    const onListRefresh = () => {
      setChatsLoading(true);
      setRequestListSignal((n) => (n ?? 0) + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("chat:last-read-updated", onLastReadUpdated as any);
    window.addEventListener(
      "chat:unread-count-updated",
      onUnreadCountUpdated as any
    );
    window.addEventListener("chat:list-refresh", onListRefresh as any);
    // const iv = setInterval(() => {
    //   setChatsLoading(true);
    //   setRequestListSignal((n) => (n ?? 0) + 1);
    // }, 25000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "chat:last-read-updated",
        onLastReadUpdated as any
      );
      window.removeEventListener(
        "chat:unread-count-updated",
        onUnreadCountUpdated as any
      );
      window.removeEventListener("chat:list-refresh", onListRefresh as any);
      // clearInterval(iv);
    };
  }, []);

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "coach"]}>
      <DashboardLayout>
        {/* Layout flexible: alto completo con scroll interno en tabs */}
        <div className="flex flex-col h-full min-h-0 space-y-6 overflow-hidden">
          <div className="flex items-start gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-neutral-100 grid place-items-center text-2xl font-bold text-neutral-800">
                {(coach?.nombre
                  ? String(coach.nombre).slice(0, 1)
                  : String(code).slice(0, 1)
                ).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold leading-tight">
                  {coach?.nombre ?? code}
                </h2>
                <div className="text-sm text-neutral-500 flex items-center gap-3">
                  <span>
                    Código: <span className="font-mono">{code}</span>
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-700">
                    {coach?.created_at
                      ? new Date(coach.created_at).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  {coach?.puesto && (
                    <Badge
                      variant="outline"
                      className="rounded-md border-sky-200 bg-sky-50 text-sky-700"
                    >
                      {coach.puesto}
                    </Badge>
                  )}
                  {coach?.area && (
                    <Badge
                      variant="outline"
                      className="rounded-md border-neutral-200 bg-neutral-50 text-neutral-700"
                    >
                      {coach.area}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditOpen((s) => !s)}
                aria-label={editOpen ? "Cancelar" : "Editar"}
                className="p-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  className="bg-rose-100 text-rose-800 hover:bg-rose-200"
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-2 flex flex-col flex-1 min-h-0"
          >
            <TabsList>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="metricas">Métricas</TabsTrigger>
              <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
            </TabsList>

            {/* Pestaña Tickets: scroll interno, pantalla completa */}
            <TabsContent value="tickets" className="mt-0 flex-1 min-h-0">
              <div className="h-full overflow-auto rounded-lg border bg-white p-4">
                {loading ? (
                  <div>Cargando...</div>
                ) : error ? (
                  <div className="text-sm text-red-600">{error}</div>
                ) : coach ? (
                  <TicketsPanelCoach
                    student={{
                      id: 0,
                      code: coach?.codigo ?? String(code),
                      name: coach?.nombre ?? String(code),
                      teamMembers: [],
                    }}
                  />
                ) : (
                  <div className="text-sm text-neutral-500">
                    No se encontró información del coach.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="metricas" className="mt-0 flex-1 min-h-0">
              <div className="h-full overflow-auto rounded-lg border bg-white p-4">
                {loading ? (
                  <div>Cargando...</div>
                ) : error ? (
                  <div className="text-sm text-red-600">{error}</div>
                ) : coach ? (
                  <PersonalMetrics
                    coachCode={coach.codigo}
                    coachName={coach.nombre}
                  />
                ) : (
                  <div className="text-sm text-neutral-500">
                    No se encontró información del coach.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="chat" className="mt-0 flex-1 min-h-0">
              {/* Altura fija basada en viewport para evitar scroll de la pestaña */}
              <div className="h-full overflow-hidden rounded-lg border bg-white p-3">
                <div className="grid grid-cols-12 gap-4 h-full min-h-0">
                  {/* Sección: Lista unificada de chats */}
                  <div
                    className={`col-span-12 md:col-span-4 lg:col-span-3 h-full flex flex-col overflow-hidden min-h-0 border-r border-slate-200 bg-white ${
                      mobileChatOpen ? "hidden md:flex" : "flex"
                    }`}
                  >
                    {/* Header estilo WhatsApp */}
                    <div className="h-16 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 grid place-items-center text-slate-600 font-bold">
                          {(coach?.nombre
                            ? String(coach.nombre).slice(0, 1)
                            : String(code).slice(0, 1)
                          ).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-700">
                          Chats
                        </span>
                      </div>
                      <div className="flex gap-2 text-slate-500">
                        {/* Iconos de acciones si fueran necesarios */}
                      </div>
                    </div>

                    {/* Buscador estilo WhatsApp */}
                    <div className="p-2 bg-white border-b border-slate-100 flex-shrink-0">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          value={contactQuery}
                          onChange={(e) => setContactQuery(e.target.value)}
                          placeholder="Buscar o iniciar un nuevo chat"
                          className="w-full h-9 pl-9 pr-3 text-sm bg-slate-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Lista de chats */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {chatsLoading && unifiedChatList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-3">
                          <Spinner size={32} className="text-teal-600" />
                          <span className="text-sm font-medium">
                            Cargando conversaciones...
                          </span>
                        </div>
                      ) : unifiedChatList.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-slate-400 text-center flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 opacity-20" />
                          <p>No se encontraron conversaciones</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-50">
                          {unifiedChatList.map((item) => {
                            const isActive =
                              (item.type === "team" &&
                                targetTeamCode?.toLowerCase() ===
                                  item.code.toLowerCase()) ||
                              (item.type === "student" &&
                                targetStudentCode?.toLowerCase() ===
                                  item.code.toLowerCase());

                            return (
                              <li key={item.key}>
                                <button
                                  className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left transition-colors group ${
                                    isActive ? "bg-slate-100" : ""
                                  }`}
                                  onClick={() => {
                                    try {
                                      const chatIds = (item.chats || [])
                                        .map((it: any) => it?.id_chat ?? it?.id)
                                        .filter((x: any) => x != null);
                                      console.log(
                                        "[CoachDetailPage] Click en conversación",
                                        {
                                          tipo: item.type,
                                          codigo: item.code,
                                          nombre: item.name,
                                          chatIds,
                                          topChatId: item.topChatId ?? null,
                                        }
                                      );
                                    } catch {}
                                    setMobileChatOpen(true);
                                    if (item.type === "team") {
                                      setTargetStudentCode(null);
                                      setTargetStudentName("");
                                      setTargetTeamCode(item.code);
                                    } else {
                                      setTargetTeamCode(null);
                                      setTargetStudentCode(item.code);
                                      setTargetStudentName(item.name);
                                    }

                                    setChatInfo({
                                      chatId: item.topChatId,
                                      myParticipantId: null,
                                    });
                                    setCurrentOpenChatId(
                                      item.topChatId ?? null
                                    );

                                    // Add to tabs (normalizar clave a tipo:codigo)
                                    const tabKey = `${item.type}:${String(
                                      item.code
                                    )}`;
                                    setOpenTabs((prev) => {
                                      const exists = prev.some(
                                        (p) => p.key === tabKey
                                      );
                                      return exists
                                        ? prev
                                        : [
                                            ...prev,
                                            {
                                              key: tabKey,
                                              type: item.type as any,
                                              code: String(item.code),
                                              name: item.name,
                                            },
                                          ];
                                    });
                                    setActiveChatTab(tabKey);

                                    // Clear unread
                                    try {
                                      for (const it of item.chats || []) {
                                        const id = it?.id_chat ?? it?.id;
                                        if (id == null) continue;
                                        const uKey = `chatUnreadById:coach:${String(
                                          id
                                        )}`;
                                        localStorage.setItem(uKey, "0");
                                        window.dispatchEvent(
                                          new CustomEvent(
                                            "chat:unread-count-updated",
                                            {
                                              detail: {
                                                chatId: id,
                                                role: "coach",
                                                count: 0,
                                              },
                                            }
                                          )
                                        );
                                      }
                                      setUnreadBump((n) => n + 1);
                                    } catch {}
                                  }}
                                >
                                  {/* Avatar */}
                                  <div
                                    className={`h-12 w-12 rounded-full ${item.avatarColor} text-white grid place-items-center text-lg font-semibold flex-shrink-0 shadow-sm`}
                                  >
                                    {(item.name || item.code)
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </div>

                                  {/* Content */}
                                  <div className="min-w-0 flex-1 border-b border-slate-50 pb-3 group-hover:border-transparent transition-colors h-full flex flex-col justify-center">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <div className="text-[15px] font-medium truncate text-slate-900 flex items-center gap-2">
                                        <span>{item.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">
                                          {item.id}
                                        </span>
                                      </div>
                                      <div
                                        className={`text-[11px] flex-shrink-0 ${
                                          item.unreadCount > 0
                                            ? "text-teal-600 font-medium"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {item.lastAt
                                          ? formatTime(item.lastAt)
                                          : ""}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <div
                                        className={`text-[13px] truncate flex-1 ${
                                          item.unreadCount > 0
                                            ? "text-slate-800 font-medium"
                                            : "text-slate-500"
                                        }`}
                                      >
                                        {item.isNew ? (
                                          <span className="italic text-teal-600">
                                            Iniciar nueva conversación
                                          </span>
                                        ) : (
                                          item.lastText ||
                                          "Imagen o archivo adjunto"
                                        )}
                                      </div>
                                      {item.unreadCount > 0 && (
                                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex-shrink-0 animate-in zoom-in duration-200">
                                          {item.unreadCount}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div
                    className={`col-span-12 md:col-span-8 lg:col-span-9 h-full overflow-hidden flex flex-col min-h-0 ${
                      mobileChatOpen ? "flex" : "hidden md:flex"
                    }`}
                  >
                    {/* Pestañas de contactos/alumnos abiertos (ELIMINADAS POR SOLICITUD) */}

                    <CoachChatInline
                      onBack={() => setMobileChatOpen(false)}
                      key={`chat-${code}-${
                        targetTeamCode ?? targetStudentCode ?? "inbox"
                      }`}
                      room={`${code}:equipo:${
                        targetTeamCode ?? targetStudentCode ?? "inbox"
                      }`}
                      role="coach"
                      title={
                        coach?.nombre
                          ? `Equipo: ${coach?.nombre}`
                          : `Equipo ${code}`
                      }
                      subtitle={
                        targetTeamCode
                          ? `con ${targetTeamName}`
                          : targetStudentCode
                          ? `con ${targetStudentName || targetStudentCode}`
                          : undefined
                      }
                      variant="card"
                      className="h-full"
                      precreateOnParticipants
                      socketio={{
                        url: chatServerUrl,
                        idEquipo: String(code),
                        participants: targetTeamCode
                          ? [
                              {
                                participante_tipo: "equipo",
                                id_equipo: String(code),
                              },
                              {
                                participante_tipo: "equipo",
                                id_equipo: String(targetTeamCode),
                              },
                            ]
                          : targetStudentCode
                          ? [
                              {
                                participante_tipo: "equipo",
                                id_equipo: String(code),
                              },
                              {
                                participante_tipo: "cliente",
                                id_cliente: String(targetStudentCode),
                              },
                            ]
                          : undefined,
                        autoCreate: true,
                        autoJoin: chatInfo.chatId != null,
                        chatId: chatInfo.chatId ?? undefined,
                      }}
                      joinSignal={sessionsOfferSignal}
                      resolveName={(tipo, id) => {
                        const key = String(id || "").toLowerCase();
                        if (tipo === "equipo") {
                          const t = teamsMap.get(key);
                          return t?.nombre || String(id || "");
                        }
                        if (tipo === "cliente") {
                          const s = studentsMap.get(key);
                          return s?.name || String(id || "");
                        }
                        return String(id || "");
                      }}
                      onConnectionChange={setChatConnected}
                      onChatInfo={(info) => {
                        setChatInfo(info);
                        setChatsLoading(false);
                        setCurrentOpenChatId(info?.chatId ?? null);
                        if (!chatInfo.chatId && info.chatId) {
                          setChatsLoading(true);
                          setRequestListSignal((n) => (n ?? 0) + 1);
                        }
                        try {
                          const parts = Array.isArray(info.participants)
                            ? info.participants
                            : [];
                          if (targetTeamCode) {
                            const setEq = new Set<string>();
                            for (const p of parts) {
                              const tipo = String(
                                p?.participante_tipo || ""
                              ).toLowerCase();
                              if (tipo === "equipo" && p?.id_equipo)
                                setEq.add(String(p.id_equipo).toLowerCase());
                            }
                            const hasPair =
                              info.chatId != null &&
                              setEq.has(String(code).toLowerCase()) &&
                              setEq.has(String(targetTeamCode).toLowerCase());
                            if (
                              hasPair &&
                              decisionStamp !== `exist:${targetTeamCode}`
                            ) {
                              setDecisionStamp(`exist:${targetTeamCode}`);
                            }
                          } else if (targetStudentCode) {
                            let okCli = false;
                            let okEq = false;
                            for (const p of parts) {
                              const tipo = String(
                                p?.participante_tipo || ""
                              ).toLowerCase();
                              if (tipo === "cliente" && p?.id_cliente) {
                                if (
                                  String(p.id_cliente).toLowerCase() ===
                                  String(targetStudentCode).toLowerCase()
                                )
                                  okCli = true;
                              }
                              if (tipo === "equipo" && p?.id_equipo) {
                                if (
                                  String(p.id_equipo).toLowerCase() ===
                                  String(code).toLowerCase()
                                )
                                  okEq = true;
                              }
                            }
                            const hasPair =
                              info.chatId != null && okCli && okEq;
                            if (
                              hasPair &&
                              decisionStamp !== `exist-stu:${targetStudentCode}`
                            ) {
                              setDecisionStamp(
                                `exist-stu:${targetStudentCode}`
                              );
                            }
                          }
                        } catch {}
                      }}
                      requestListSignal={requestListSignal}
                      listParams={{
                        participante_tipo: "equipo",
                        id_equipo: String(code),
                        include_participants: true,
                        with_participants: true,
                      }}
                      onChatsList={(list) => {
                        try {
                          console.log("=== ON CHATS LIST (PAGE) ===");
                          console.log("Total:", list?.length);
                          console.log("ALL CHATS ARRAY:", list);
                          if (Array.isArray(list)) {
                            // Imprimir ID y nombre resuelto del contacto (equipo o alumno)
                            list.forEach((it: any, i: number) => {
                              const id = it?.id_chat ?? it?.id ?? null;
                              const otherTeam = chatOtherTeamCode(it, code);
                              const otherStudent = chatOtherStudentCode(it);
                              let contactName: string | null = null;
                              if (otherStudent) {
                                const key = String(otherStudent).toLowerCase();
                                const s =
                                  studentsMap.get(key) ||
                                  allStudentsList.find(
                                    (st) =>
                                      (st.code || "").toLowerCase() === key
                                  );
                                contactName = s?.name || String(otherStudent);
                              } else if (otherTeam) {
                                const key = String(otherTeam).toLowerCase();
                                const t = teamsMap.get(key);
                                contactName = t?.nombre || String(otherTeam);
                              }
                              console.log(`Chat ${i}:`, {
                                id,
                                contactName: contactName ?? "(sin nombre)",
                                otherTeam: otherTeam ?? null,
                                otherStudent: otherStudent ?? null,
                              });
                            });
                          }
                          console.log("[CoachDetailPage] listParams =>", {
                            participante_tipo: "equipo",
                            id_equipo: String(code),
                            include_participants: true,
                            with_participants: true,
                          });
                          const sample =
                            Array.isArray(list) && list.length > 0
                              ? list[0]
                              : null;
                          console.log("[CoachDetailPage] onChatsList", {
                            count: Array.isArray(list) ? list.length : 0,
                            sample: sample
                              ? {
                                  id: sample?.id_chat ?? sample?.id ?? null,
                                  last_message_at:
                                    sample?.last_message_at ||
                                    sample?.fecha_ultimo_mensaje ||
                                    sample?.updated_at ||
                                    sample?.fecha_actualizacion ||
                                    sample?.created_at ||
                                    sample?.fecha_creacion ||
                                    null,
                                  participants: Array.isArray(
                                    sample?.participants ||
                                      sample?.participantes
                                  )
                                    ? (
                                        sample?.participants ||
                                        sample?.participantes
                                      ).length
                                    : 0,
                                }
                              : null,
                          });
                          // Listar todas las conversaciones creadas (en español)
                          const toLine = (it: any) => {
                            const id = it?.id_chat ?? it?.id ?? null;
                            const parts =
                              it?.participants || it?.participantes || [];
                            const equipos = (Array.isArray(parts) ? parts : [])
                              .filter(
                                (p: any) =>
                                  String(
                                    p?.participante_tipo || ""
                                  ).toLowerCase() === "equipo"
                              )
                              .map((p: any) => {
                                const codeEq = String(p?.id_equipo ?? "");
                                const t = teamsList.find(
                                  (x) =>
                                    (x.codigo || "").toLowerCase() ===
                                    codeEq.toLowerCase()
                                );
                                return t?.nombre || codeEq;
                              })
                              .filter(Boolean);
                            const clientes = (Array.isArray(parts) ? parts : [])
                              .filter(
                                (p: any) =>
                                  String(
                                    p?.participante_tipo || ""
                                  ).toLowerCase() === "cliente"
                              )
                              .map((p: any) => {
                                const codeSt = String(p?.id_cliente ?? "");
                                const s = studentsList.find(
                                  (x) =>
                                    (x.code || "").toLowerCase() ===
                                    codeSt.toLowerCase()
                                );
                                return s?.name || codeSt;
                              })
                              .filter(Boolean);
                            return `id=${id} | equipos=[${equipos.join(
                              ", "
                            )}] | clientes=[${clientes.join(", ")}]`;
                          };
                          console.log(
                            "[CoachDetailPage] comversaciones del usuario — equipo:",
                            String(code),
                            "(total:",
                            Array.isArray(list) ? list.length : 0,
                            ")"
                          );
                          (Array.isArray(list) ? list : []).forEach(
                            (it: any) => {
                              console.log(" -", toLine(it));
                              const id = it?.id_chat ?? it?.id ?? null;
                              const otherTeam = chatOtherTeamCode(it, code);
                              const otherStudent = chatOtherStudentCode(it);
                              let contactName: string | null = null;
                              if (otherStudent) {
                                const key = String(otherStudent).toLowerCase();
                                const s =
                                  studentsMap.get(key) ||
                                  allStudentsList.find(
                                    (st) =>
                                      (st.code || "").toLowerCase() === key
                                  );
                                contactName = s?.name || String(otherStudent);
                              } else if (otherTeam) {
                                const key = String(otherTeam).toLowerCase();
                                const t = teamsMap.get(key);
                                contactName = t?.nombre || String(otherTeam);
                              }
                              console.log(
                                "   contacto:",
                                contactName ?? "(sin nombre)",
                                "id=",
                                id
                              );
                            }
                          );

                          // --- ANÁLISIS DE DUPLICADOS ---
                          const studentCounts = new Map<string, any[]>();
                          (Array.isArray(list) ? list : []).forEach(
                            (chat: any) => {
                              const parts =
                                chat.participants || chat.participantes || [];
                              const student = parts.find(
                                (p: any) =>
                                  String(p.participante_tipo).toLowerCase() ===
                                  "cliente"
                              );
                              if (student && student.id_cliente) {
                                const id = String(student.id_cliente);
                                if (!studentCounts.has(id))
                                  studentCounts.set(id, []);
                                studentCounts.get(id)?.push(chat);
                              }
                            }
                          );

                          // (Reporte de duplicados removido para limpiar consola)
                        } catch {}

                        // Mostrar TODAS las conversaciones tal como vienen del servidor.
                        const fullList = Array.isArray(list) ? list : [];

                        setChatList(fullList);
                        setChatsLoading(false);
                        try {
                          if (targetTeamCode) {
                            const existing =
                              pickExistingChatIdForTarget(targetTeamCode);
                            if (existing != null) {
                              if (decisionStamp !== `exist:${targetTeamCode}`) {
                                setDecisionStamp(`exist:${targetTeamCode}`);
                              }
                              setChatInfo({
                                chatId: existing,
                                myParticipantId: null,
                              });
                            }
                          } else if (targetStudentCode) {
                            const existingStu =
                              pickExistingChatIdForStudent(targetStudentCode);
                            if (existingStu != null) {
                              if (
                                decisionStamp !==
                                `exist-stu:${targetStudentCode}`
                              ) {
                                setDecisionStamp(
                                  `exist-stu:${targetStudentCode}`
                                );
                              }
                              setChatInfo({
                                chatId: existingStu,
                                myParticipantId: null,
                              });
                            }
                          }
                        } catch {}
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="alumnos" className="mt-0 flex-1 min-h-0">
              {/* Detalles: ocupar pantalla completa con scroll interno */}
              <div className="h-full">
                <div className="h-full overflow-auto p-4 bg-white border rounded-lg">
                  {loading ? (
                    <div>Cargando...</div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : coach ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Alumnos</h3>
                        <CoachStudentsInline coachCode={code} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-500">
                      No se encontró información del coach.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sesiones" className="mt-0 flex-1 min-h-0">
              <div className="h-full">
                <div className="h-full overflow-auto p-4 bg-white border rounded-lg">
                  {loading ? (
                    <div>Cargando...</div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : (
                    <SessionsPanel coachCode={code} />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <CoachStudentsModal
          open={open}
          onOpenChange={setOpen}
          coachCode={code}
          coachName={coach?.nombre ?? null}
        />
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar coach</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <div>
                <Label className="text-xs">Nombre.</Label>
                <Input
                  value={draftNombre}
                  onChange={(e) => setDraftNombre(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>

              <div>
                <Label className="text-xs">Puesto</Label>
                <select
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  value={draftPuesto ?? ""}
                  onChange={(e) => setDraftPuesto(e.target.value)}
                  disabled={optsLoading || !isAdmin}
                >
                  <option value="">-- Ninguno --</option>
                  {puestoOptionsApi.map((o) => (
                    <option key={o.opcion_key} value={o.opcion_key}>
                      {o.opcion_value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Área</Label>
                <select
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  value={draftArea ?? ""}
                  onChange={(e) => setDraftArea(e.target.value)}
                  disabled={optsLoading || !isAdmin}
                >
                  <option value="">-- Ninguno --</option>
                  {areaOptionsApi.map((o) => (
                    <option key={o.opcion_key} value={o.opcion_key}>
                      {o.opcion_value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={saving || !isAdmin}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await updateCoach(coach!.codigo, {
                        nombre: draftNombre || undefined,
                        puesto: draftPuesto ?? undefined,
                        area: draftArea ?? undefined,
                      });
                      toast({ title: "Coach actualizado" });
                      const c = await getCoachByCode(code);
                      setCoach(c);
                      setEditOpen(false);
                    } catch (err: any) {
                      toast({
                        title: err?.message ?? "Error al actualizar coach",
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Guardar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isAdmin && (
          <Dialog
            open={deleteOpen}
            onOpenChange={(o) => isAdmin && setDeleteOpen(o)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar eliminación</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <p className="text-sm text-neutral-700">
                  Vas a eliminar el coach{" "}
                  <strong>{coach?.nombre ?? code}</strong>. Revisa los datos:
                </p>
                <div className="mt-3 text-sm">
                  <div>
                    Área: <strong>{coach?.area ?? "—"}</strong>
                  </div>
                  <div>
                    Puesto: <strong>{coach?.puesto ?? "—"}</strong>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await deleteCoach(coach!.codigo);
                        toast({ title: "Coach eliminado" });
                        setDeleteOpen(false);
                        router.push("/admin/teamsv2");
                      } catch (err: any) {
                        toast({
                          title: err?.message ?? "Error al eliminar coach",
                        });
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function CoachStudentsInline({
  coachCode,
  onOfferStudent,
}: {
  coachCode: string;
  onOfferStudent?: (
    code: string | null | undefined,
    stage?: string | null,
    name?: string | null
  ) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  // Visor y resumen de sesiones por alumno
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerAlumnoCode, setViewerAlumnoCode] = useState<string>("");
  const [viewerAlumnoName, setViewerAlumnoName] = useState<string>("");
  const [viewerRows, setViewerRows] = useState<SessionItem[]>([]);

  // Quick offer modal state
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickAlumnoCode, setQuickAlumnoCode] = useState<string>("");
  const [quickAlumnoName, setQuickAlumnoName] = useState<string>("");
  const [quickEtapa, setQuickEtapa] = useState<string>("");
  const [quickFecha, setQuickFecha] = useState<string>("");
  const [quickDuracion, setQuickDuracion] = useState<number>(45);
  const [quickNotas, setQuickNotas] = useState<string>("");
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    if (!coachCode) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);
        // Traer toda la data de alumnos desde metrics-v2 (todos los alumnos del coach)
        const res = await fetchMetrics(undefined, undefined, coachCode);
        const teams = (res?.data as any)?.teams;
        const flat: any[] = Array.isArray(teams?.allClientsByCoachFlat)
          ? teams.allClientsByCoachFlat
          : [];
        const detail: any[] = Array.isArray(teams?.clientsByCoachDetail)
          ? teams.clientsByCoachDetail
          : [];
        const rows = (flat.length > 0 ? flat : detail).map((r: any) => ({
          id: r.id,
          name: r.nombre,
          code: r.codigo ?? null,
          state: r.estado ?? null,
          stage: r.etapa ?? null,
          ingreso: r.ingreso ?? null,
          lastActivity: r.ultima_actividad ?? null,
          inactividad: r.inactividad ?? null,
          tickets: r.tickets ?? null,
        }));
        if (!ctrl.signal.aborted) {
          setItems(rows);
          setTotalCount(rows.length);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message ?? "Error al cargar alumnos");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [coachCode]);

  // Progreso simulado durante carga
  useEffect(() => {
    if (!loading) {
      setProgress((p) => (p < 95 ? 100 : 100));
      const t = setTimeout(() => setProgress(0), 400);
      return () => clearTimeout(t);
    }
    setProgress(5);
    const iv = setInterval(() => {
      setProgress((p) => Math.min(90, p + 8));
    }, 180);
    return () => clearInterval(iv);
  }, [loading]);

  const statesOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of items) {
      const v = (r.state ?? "").toString().trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const stagesOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of items) {
      const v = (r.stage ?? "").toString().trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredRows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const st = (stateFilter || "").trim().toLowerCase();
    const ph = (stageFilter || "").trim().toLowerCase();
    return items.filter((r) => {
      const name = (r.name || "").toString().toLowerCase();
      const code = (r.code || "").toString().toLowerCase();
      const rs = (r.state || "").toString().toLowerCase();
      const rg = (r.stage || "").toString().toLowerCase();
      const okSearch = !q || name.includes(q) || code.includes(q);
      const okState = !st || (rs && rs === st);
      const okStage = !ph || (rg && rg === ph);
      return okSearch && okState && okStage;
    });
  }, [items, search, stateFilter, stageFilter]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código"
          className="h-9 px-3 rounded-md border text-sm"
        />
        <select
          className="h-9 px-2 rounded-md border text-sm"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          <option value="">Estado: Todos</option>
          {statesOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-9 px-2 rounded-md border text-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Fase: Todas</option>
          {stagesOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(search || stateFilter || stageFilter) && (
          <button
            className="h-9 px-3 rounded-md border text-sm bg-neutral-50"
            onClick={() => {
              setSearch("");
              setStateFilter("");
              setStageFilter("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative h-2 w-full max-w-xl overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-neutral-600">
            Cargando alumnos… {Math.round(progress)}%
          </div>
        </div>
      ) : (
        <CoachStudentsTable
          rows={filteredRows}
          title="ALUMNOS"
          onOffer={(row: any) => {
            const code = String(row.code || "").trim();
            if (!code) return;
            setQuickAlumnoCode(code);
            setQuickAlumnoName(row.name || code);
            setQuickEtapa(row.stage || "");
            setQuickFecha(toDatetimeLocal(new Date()));
            setQuickDuracion(45);
            setQuickNotas("");
            setQuickOpen(true);
          }}
          onView={async (row: any) => {
            const code = String(row.code || "").trim();
            if (!code) return;
            setViewerAlumnoCode(code);
            setViewerAlumnoName(row.name || code);
            setViewerLoading(true);
            setViewerOpen(true);
            try {
              const list = await listAlumnoSessions(code, coachCode);
              setViewerRows(list);
            } catch {
              setViewerRows([]);
            } finally {
              setViewerLoading(false);
            }
          }}
        />
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="text-xs text-neutral-500">
        Total: {totalCount} • Mostrando: {filteredRows.length}
      </div>

      {/* Quick Offer Modal (Alumnos tab) */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ofrecer sesión</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="text-sm text-neutral-600">
              Alumno: <strong>{quickAlumnoName}</strong>
            </div>
            <div>
              <Label className="text-xs">Etapa</Label>
              <Input value={quickEtapa} disabled />
            </div>
            <div>
              <Label className="text-xs">Fecha programada</Label>
              <Input
                type="datetime-local"
                value={quickFecha}
                onChange={(e) => setQuickFecha(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Duración (minutos)</Label>
              <Input
                type="number"
                min={15}
                max={180}
                value={String(quickDuracion)}
                onChange={(e) => setQuickDuracion(Number(e.target.value) || 45)}
              />
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={quickNotas}
                onChange={(e: any) => setQuickNotas(e.target.value)}
                placeholder="Detalles importantes para la sesión"
              />
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button
                disabled={
                  !quickAlumnoCode ||
                  !quickFecha ||
                  !quickNotas.trim() ||
                  quickSaving
                }
                onClick={async () => {
                  try {
                    setQuickSaving(true);
                    const d = quickFecha ? new Date(quickFecha) : new Date();
                    const iso = new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                      d.getHours(),
                      d.getMinutes(),
                      0,
                      0
                    ).toISOString();
                    const payload = {
                      codigo_alumno: quickAlumnoCode,
                      codigo_coach: coachCode,
                      etapa: quickEtapa || undefined,
                      fecha_programada: iso,
                      duracion: quickDuracion || 45,
                      notas: quickNotas.trim(),
                    } as const;
                    // eslint-disable-next-line no-console
                    console.log("[sessions] quick-offer payload", payload);
                    await offerSession(payload);
                    toast({ title: "Sesión ofrecida" });
                    setQuickOpen(false);
                  } catch (e: any) {
                    toast({ title: e?.message ?? "Error al crear sesión" });
                  } finally {
                    setQuickSaving(false);
                  }
                }}
              >
                Crear
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor de sesiones por alumno */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Sesiones de {viewerAlumnoName || viewerAlumnoCode}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-auto">
            {viewerLoading ? (
              <div className="text-sm text-neutral-600">Cargando…</div>
            ) : viewerRows.length === 0 ? (
              <div className="text-sm text-neutral-600">Sin sesiones</div>
            ) : (
              (() => {
                const groups = viewerRows.reduce<Record<string, SessionItem[]>>(
                  (acc, it) => {
                    const k = (it.etapa || "—").toString();
                    if (!acc[k]) acc[k] = [];
                    acc[k].push(it);
                    return acc;
                  },
                  {}
                );
                const order = Object.keys(groups).sort();
                const fmt = new Intl.DateTimeFormat("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });
                const badge = (estado?: string | null) => {
                  const k = String(estado || "").toLowerCase();
                  const base =
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs";
                  if (k === "requested")
                    return (
                      <span className={`${base} bg-amber-100 text-amber-800`}>
                        Solicitada
                      </span>
                    );
                  if (k === "offered")
                    return (
                      <span className={`${base} bg-sky-100 text-sky-800`}>
                        Ofrecida
                      </span>
                    );
                  if (k === "approved")
                    return (
                      <span
                        className={`${base} bg-emerald-100 text-emerald-800`}
                      >
                        Aprobada
                      </span>
                    );
                  if (k === "pending")
                    return (
                      <span
                        className={`${base} bg-neutral-100 text-neutral-700`}
                      >
                        Pendiente
                      </span>
                    );
                  if (k === "canceled")
                    return (
                      <span className={`${base} bg-rose-100 text-rose-800`}>
                        Cancelada
                      </span>
                    );
                  if (k === "done")
                    return (
                      <span className={`${base} bg-teal-100 text-teal-800`}>
                        Completada
                      </span>
                    );
                  return (
                    <span className={`${base} bg-neutral-100 text-neutral-700`}>
                      {estado || "—"}
                    </span>
                  );
                };
                return (
                  <div className="space-y-4">
                    {order.map((et) => (
                      <div key={`grp-${et}`} className="border rounded-md">
                        <div className="px-3 py-2 bg-neutral-50 border-b text-sm font-medium">
                          Etapa: {et}
                        </div>
                        <div className="divide-y">
                          {groups[et].map((s) => (
                            <div
                              key={`s-${s.id}`}
                              className="px-3 py-2 text-sm flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-neutral-800">
                                  {s.fecha_programada
                                    ? fmt.format(new Date(s.fecha_programada))
                                    : "Sin fecha"}
                                </div>
                                <div className="text-xs text-neutral-600">
                                  Duración: {s.duracion || 45} min
                                </div>
                                {s.notas && (
                                  <div className="mt-1 text-xs text-neutral-700 line-clamp-2">
                                    {s.notas}
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {badge(s.estado)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toDatetimeLocal(d?: Date): string {
  const dt = d ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
