"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
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
  getCoachStudents,
  updateCoach,
  deleteCoach,
  type CoachItem,
  type CoachStudent,
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
import { getCoaches, type CoachItem as CoachMini } from "../api";
import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PersonalMetrics from "../PersonalMetrics";

export default function CoachDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code;
  const router = useRouter();

  const [open, setOpen] = useState(false);
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
  const [chatList, setChatList] = useState<any[]>([]);
  const [requestListSignal, setRequestListSignal] = useState<number>(0);
  const [chatConnected, setChatConnected] = useState<boolean>(false);
  const [chatInfo, setChatInfo] = useState<{
    chatId: string | number | null;
    myParticipantId: string | number | null;
    participants?: any[] | null;
  }>({ chatId: null, myParticipantId: null, participants: null });
  const [chatsLoading, setChatsLoading] = useState<boolean>(true);
  const [decisionStamp, setDecisionStamp] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState<string>("");
  const [readsBump, setReadsBump] = useState<number>(0);
  // Bump para forzar re-render cuando cambian contadores persistentes de no leídos
  const [unreadBump, setUnreadBump] = useState<number>(0);
  // Chat abierto (por chatId) — opcional, solo informativo
  const [currentOpenChatId, setCurrentOpenChatId] = useState<
    string | number | null
  >(null);

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

  const targetTeamName = useMemo(() => {
    if (!targetTeamCode) return "";
    const found = teamsList.find(
      (t) =>
        (t.codigo || "").toLowerCase() === String(targetTeamCode).toLowerCase()
    );
    return found?.nombre || String(targetTeamCode);
  }, [teamsList, targetTeamCode]);

  const filteredTeams = useMemo(() => {
    const q = (contactQuery || "").trim().toLowerCase();
    const list = Array.isArray(teamsList) ? teamsList : [];
    if (!q) return list;
    return list.filter(
      (t) =>
        (t.nombre || "").toLowerCase().includes(q) ||
        (t.codigo || "").toLowerCase().includes(q)
    );
  }, [teamsList, contactQuery]);

  function openContact(t: CoachMini) {
    setTargetTeamCode(t.codigo);
    setChatInfo({ chatId: null, myParticipantId: null });
    setChatsLoading(true);
    setRequestListSignal((n) => n + 1);
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
    if (matches.length === 0) return null;
    matches.sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));
    const top = matches[0];
    return top?.id_chat ?? top?.id ?? null;
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

  const filteredChatsByContact = useMemo(() => {
    const q = (contactQuery || "").trim().toLowerCase();
    if (!q) return chatsByContact;
    return chatsByContact.filter(
      (c) =>
        String(c.targetName || "")
          .toLowerCase()
          .includes(q) ||
        String(c.targetCode || "")
          .toLowerCase()
          .includes(q)
    );
  }, [chatsByContact, contactQuery]);

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

  const listRequestedRef = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    if (!chatConnected) return;
    if (listRequestedRef.done) return;
    if (chatList.length === 0) {
      setChatsLoading(true);
      setRequestListSignal((n) => n + 1);
    }
    listRequestedRef.done = true;
  }, [chatConnected]);

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
      setRequestListSignal((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("chat:last-read-updated", onLastReadUpdated as any);
    window.addEventListener(
      "chat:unread-count-updated",
      onUnreadCountUpdated as any
    );
    window.addEventListener("chat:list-refresh", onListRefresh as any);
    const iv = setInterval(() => {
      setChatsLoading(true);
      setRequestListSignal((n) => n + 1);
    }, 25000);
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
      clearInterval(iv);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              className="bg-rose-100 text-rose-800 hover:bg-rose-200"
            >
              Eliminar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tickets" className="mt-2">
          <TabsList>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="detalles">Detalles</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          {/* Pestaña Tickets: scroll interno, pantalla completa */}
          <TabsContent value="tickets" className="mt-0">
            <div className="h-[calc(100vh-180px)] overflow-auto rounded-lg border bg-white p-4">
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

          <TabsContent value="metricas" className="mt-0">
            <div className="h-[calc(100vh-180px)] overflow-auto rounded-lg border bg-white p-4">
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

          <TabsContent value="chat" className="mt-0">
            <div className="h-[calc(100vh-180px)] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 h-full">
                {/* Sección: Chats creados */}
                <div className="col-span-3 h-full flex flex-col overflow-hidden">
                  <div className="rounded-lg border bg-white shadow-sm h-full flex flex-col overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b flex-shrink-0">
                      <input
                        value={contactQuery}
                        onChange={(e) => setContactQuery(e.target.value)}
                        placeholder="Buscar o iniciar un chat"
                        className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {chatsLoading && filteredChatsByContact.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Cargando…
                        </div>
                      ) : filteredChatsByContact.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Sin chats creados
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {filteredChatsByContact.map((c) => {
                            const count = (
                              Array.isArray(c.chats) ? c.chats : []
                            ).reduce((acc: number, it: any) => {
                              const id = it?.id_chat ?? it?.id;
                              if (id == null) return acc;
                              return acc + getUnreadCountByChatId(id);
                            }, 0);
                            const isActive =
                              targetTeamCode?.toLowerCase() ===
                              c.targetCode.toLowerCase();
                            const highlight =
                              (c.hasUnread || count > 0) && !isActive;
                            return (
                              <li key={`chat-${c.key}`}>
                                <button
                                  className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left transition-colors ${
                                    isActive
                                      ? "bg-slate-100"
                                      : highlight
                                      ? "bg-teal-50"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setTargetTeamCode(c.targetCode);
                                    setChatInfo({
                                      chatId: c.topChatId,
                                      myParticipantId: null,
                                    });
                                    setCurrentOpenChatId(c.topChatId ?? null);
                                    try {
                                      for (const it of c.chats || []) {
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
                                  <div className="h-11 w-11 rounded-full bg-teal-500 text-white grid place-items-center text-sm font-semibold flex-shrink-0">
                                    {(c.targetName || c.targetCode)
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <div className="text-sm font-medium truncate text-slate-900">
                                        {c.targetName}
                                      </div>
                                      <div className="text-xs text-slate-500 flex-shrink-0">
                                        {formatTime(c.lastAt)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`text-xs truncate flex-1 ${
                                          c.hasUnread || count > 0
                                            ? "text-slate-900 font-medium"
                                            : "text-slate-500"
                                        }`}
                                      >
                                        {c.lastText || c.targetCode}
                                      </div>
                                      {(c.hasUnread || count > 0) && (
                                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-teal-500 text-white text-xs font-semibold flex-shrink-0">
                                          {count > 0 ? count : "•"}
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

                      {/* Sección: Contactos sin chat */}
                      <div className="px-3 py-2 mt-2 text-xs font-semibold text-slate-600 bg-slate-50 sticky top-0 z-10">
                        CONTACTOS
                      </div>
                      {chatsLoading && contactsWithoutChat.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Cargando…
                        </div>
                      ) : contactsWithoutChat.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Sin contactos disponibles
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {contactsWithoutChat.map((t: CoachMini) => (
                            <li key={`noc-${t.codigo}`}>
                              <button
                                className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left transition-colors ${
                                  targetTeamCode === t.codigo
                                    ? "bg-slate-100"
                                    : ""
                                }`}
                                onClick={() => openContact(t)}
                              >
                                <div className="h-11 w-11 rounded-full bg-teal-500 text-white grid place-items-center text-sm font-semibold flex-shrink-0">
                                  {(t.nombre || t.codigo)
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate text-slate-900">
                                    {t.nombre}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {t.codigo}
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-9 h-full overflow-hidden">
                  <CoachChatInline
                    key={`chat-${code}-${targetTeamCode ?? "inbox"}`}
                    room={`${code}:equipo:${targetTeamCode ?? "inbox"}`}
                    role="coach"
                    title={
                      coach?.nombre
                        ? `Equipo: ${coach?.nombre}`
                        : `Equipo ${code}`
                    }
                    subtitle={
                      targetTeamCode ? `con ${targetTeamName}` : undefined
                    }
                    variant="card"
                    className="h-full"
                    precreateOnParticipants
                    socketio={{
                      url: "https://v001.onrender.com",
                      tokenEndpoint: "https://v001.onrender.com/v1/auth/token",
                      tokenId: `equipo:${String(code)}`,
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
                        : undefined,
                      autoCreate: true,
                      autoJoin: chatInfo.chatId != null,
                      chatId: chatInfo.chatId ?? undefined,
                    }}
                    onConnectionChange={setChatConnected}
                    onChatInfo={(info) => {
                      setChatInfo(info);
                      setChatsLoading(false);
                      setCurrentOpenChatId(info?.chatId ?? null);
                      if (!chatInfo.chatId && info.chatId) {
                        setChatsLoading(true);
                        setRequestListSignal((n) => n + 1);
                      }
                      try {
                        if (!targetTeamCode) return;
                        const parts = Array.isArray(info.participants)
                          ? info.participants
                          : [];
                        const set = new Set<string>();
                        for (const p of parts) {
                          const tipo = String(
                            p?.participante_tipo || ""
                          ).toLowerCase();
                          if (tipo === "equipo" && p?.id_equipo)
                            set.add(String(p.id_equipo).toLowerCase());
                        }
                        const hasPair =
                          info.chatId != null &&
                          set.has(String(code).toLowerCase()) &&
                          set.has(String(targetTeamCode).toLowerCase());
                        if (
                          hasPair &&
                          decisionStamp !== `exist:${targetTeamCode}`
                        ) {
                          setDecisionStamp(`exist:${targetTeamCode}`);
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
                      setChatList(list);
                      setChatsLoading(false);
                      try {
                        if (!targetTeamCode) return;
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
                      } catch {}
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detalles" className="mt-0">
            {/* Detalles: ocupar pantalla completa con scroll interno */}
            <div className="h-[calc(100vh-180px)] overflow-auto">
              <div className="p-4 bg-white border rounded-lg">
                {loading ? (
                  <div>Cargando...</div>
                ) : error ? (
                  <div className="text-sm text-red-600">{error}</div>
                ) : coach ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Alumnos asociados
                      </h3>
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
              <Label className="text-xs">Nombre</Label>
              <Input
                value={draftNombre}
                onChange={(e) => setDraftNombre(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Puesto</Label>
              <select
                className="w-full h-9 rounded-md border px-3 text-sm"
                value={draftPuesto ?? ""}
                onChange={(e) => setDraftPuesto(e.target.value)}
                disabled={optsLoading}
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
                disabled={optsLoading}
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
                disabled={saving}
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-neutral-700">
              Vas a eliminar el coach <strong>{coach?.nombre ?? code}</strong>.
              Revisa los datos:
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
                    toast({ title: err?.message ?? "Error al eliminar coach" });
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function CoachStudentsInline({ coachCode }: { coachCode: string }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CoachStudent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coachCode) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await getCoachStudents(coachCode);
        if (!ctrl.signal.aborted) setItems(rows);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message ?? "Error al cargar alumnos");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [coachCode]);

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <TableHead className="px-3 py-2 text-left">Nombre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-t border-gray-100">
                  <TableCell colSpan={1} className="px-3 py-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow className="border-t border-gray-100">
                <TableCell
                  colSpan={1}
                  className="px-3 py-2 text-sm text-neutral-500"
                >
                  No hay alumnos asociados.
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow
                  key={`${r.id}_${r.id_alumno}`}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <TableCell className="px-3 py-2 truncate text-gray-900">
                    {r.id_alumno ? (
                      <Link
                        href={`/admin/alumnos/${encodeURIComponent(
                          String(r.id_alumno)
                        )}`}
                        className="text-gray-900 hover:underline"
                      >
                        {r.alumno_nombre}
                      </Link>
                    ) : (
                      r.alumno_nombre
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {error && <div className="p-3 text-sm text-red-600">{error}</div>}
      <div className="p-3 text-xs text-neutral-500">Total: {items.length}</div>
    </div>
  );
}
