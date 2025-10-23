"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
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
  // Estado para chat de equipo (equipo ↔ equipo)
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
  // Marca de decisión por contacto (evita logs/decisiones repetidas)
  const [decisionStamp, setDecisionStamp] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState<string>("");
  const [readsBump, setReadsBump] = useState<number>(0);

  // opciones API for puesto/area (use opcion_key/opcion_value)
  const [puestoOptionsApi, setPuestoOptionsApi] = useState<OpcionItem[]>([]);
  const [areaOptionsApi, setAreaOptionsApi] = useState<OpcionItem[]>([]);
  const [optsLoading, setOptsLoading] = useState(false);

  // edit draft fields separate from coach state
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
    // Cargar lista de equipos para iniciar chats internos
    (async () => {
      try {
        setChatsLoading(true);
        const list = await getCoaches({ page: 1, pageSize: 200 });
        if (ctrl.signal.aborted) return;
        // Excluir el propio equipo
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
    // reiniciar para que ChatRealtime cree o reutilice según corresponda
    setChatInfo({ chatId: null, myParticipantId: null });
    // refrescar listado de chats propios por si hay existentes
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

  // Helpers para encontrar conversación existente equipo↔equipo y evitar duplicados visuales
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
    // Fallback: usar id numérico si aplica, o 0
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
      const t = v ? parseInt(v, 10) : 0;
      return isNaN(t) ? 0 : t;
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

  // Agrupar chats por contacto (equipo destino) y preparar listas para la UI
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
    // Construir arreglo con metadata útil
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
      // Si nunca se abrió (lastRead=0) pero hay mensajes (lastAt>0), contar como no leído
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
    // Ordenar por actividad (más reciente primero)
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

  // Eliminado: la decisión se toma exclusivamente en onChatsList y onChatInfo para evitar bucles

  // Hacer una primera carga cuando el chat se conecta (una vez)
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
    // open confirmation dialog
    setDeleteOpen(true);
  }

  // fetch opciones when edit modal opens
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
        // populate draft fields from current coach
        setDraftNombre(coach?.nombre ?? "");
        setDraftPuesto(coach?.puesto ?? undefined);
        setDraftArea(coach?.area ?? undefined);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setOptsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [editOpen, coach]);

  // Mantener la lista actualizada y badges de no leído
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("chatLastReadById:coach:")) {
        setReadsBump((n) => n + 1);
      }
    };
    const onCustom = (e: any) => {
      try {
        if (e?.detail?.role === "coach") setReadsBump((n) => n + 1);
      } catch {}
    };
    const onListRefresh = () => {
      setChatsLoading(true);
      setRequestListSignal((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("chat:last-read-updated", onCustom as any);
    window.addEventListener("chat:list-refresh", onListRefresh as any);
    const iv = setInterval(() => {
      setChatsLoading(true);
      setRequestListSignal((n) => n + 1);
    }, 25000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("chat:last-read-updated", onCustom as any);
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

        <div className="grid grid-cols-1 gap-6">
          <div className="p-4 bg-white border rounded-lg">
            {loading ? (
              <div>Cargando...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : coach ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white"
                    style={{ background: "#0ea5e9" }}
                  >
                    {coach.puesto ?? "—"}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-neutral-700 bg-neutral-100">
                    {coach.area ?? "—"}
                  </span>
                  <span className="ml-auto text-sm text-neutral-500">
                    Alumnos:{" "}
                    <strong className="text-neutral-900">
                      {coach.alumnos ?? 0}
                    </strong>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Alumnos asociados
                  </h3>
                  <CoachStudentsInline coachCode={code} />
                </div>
                {/* Tickets panel para coach (sin endpoint aún) */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Tickets (coach)</h3>
                  <TicketsPanelCoach
                    student={{
                      id: 0,
                      code: coach?.codigo ?? String(code),
                      name: coach?.nombre ?? String(code),
                      teamMembers: [],
                    }}
                  />
                </div>
                {/* Chat de equipo (equipo ↔ equipo) */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Chat de equipo</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {/* Contactos estilo WhatsApp */}
                    <div className="col-span-2">
                      <div className="rounded border bg-white">
                        <div className="p-2 border-b">
                          <input
                            value={contactQuery}
                            onChange={(e) => setContactQuery(e.target.value)}
                            placeholder="Buscar equipos..."
                            className="w-full h-8 px-2 text-sm border rounded"
                          />
                        </div>
                        <div className="max-h-[40vh] overflow-auto">
                          {/* Sección: Chats creados */}
                          <div className="p-2 pb-1 text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">
                            Chats
                          </div>
                          {chatsLoading &&
                          filteredChatsByContact.length === 0 ? (
                            <div className="px-3 pb-2 text-xs text-neutral-500">
                              Cargando…
                            </div>
                          ) : filteredChatsByContact.length === 0 ? (
                            <div className="px-3 pb-2 text-xs text-neutral-500">
                              Sin chats creados
                            </div>
                          ) : (
                            <ul className="divide-y">
                              {filteredChatsByContact.map((c) => (
                                <li key={`chat-${c.key}`}>
                                  <button
                                    className={`w-full flex items-center gap-3 p-2 hover:bg-neutral-50 text-left ${
                                      targetTeamCode?.toLowerCase() ===
                                      c.targetCode.toLowerCase()
                                        ? "bg-neutral-50"
                                        : c.hasUnread
                                        ? "bg-amber-50"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      setTargetTeamCode(c.targetCode);
                                      setChatInfo({
                                        chatId: c.topChatId,
                                        myParticipantId: null,
                                      });
                                      try {
                                        console.log(
                                          "[teamsv2] abrir chat existente",
                                          {
                                            target: c.targetCode,
                                            chatId: c.topChatId,
                                          }
                                        );
                                      } catch {}
                                    }}
                                  >
                                    <div className="h-8 w-8 rounded-full bg-sky-600 text-white grid place-items-center text-sm font-semibold">
                                      {(c.targetName || c.targetCode)
                                        .slice(0, 1)
                                        .toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-2">
                                        <div className="text-sm font-medium truncate">
                                          {c.targetName}
                                        </div>
                                        <div className="ml-auto text-[11px] text-neutral-500">
                                          {formatTime(c.lastAt)}
                                        </div>
                                      </div>
                                      <div
                                        className={`text-[12px] truncate ${
                                          c.hasUnread
                                            ? "text-neutral-900 font-medium"
                                            : "text-neutral-500"
                                        }`}
                                      >
                                        {c.lastText || c.targetCode}
                                      </div>
                                    </div>
                                    {c.hasUnread && (
                                      <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full bg-emerald-600 text-white text-[10px] font-semibold">
                                        1
                                      </span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Sección: Contactos sin chat */}
                          <div className="p-2 pb-1 mt-3 text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">
                            Contactos sin chat
                          </div>
                          {chatsLoading && contactsWithoutChat.length === 0 ? (
                            <div className="px-3 pb-2 text-xs text-neutral-500">
                              Cargando…
                            </div>
                          ) : contactsWithoutChat.length === 0 ? (
                            <div className="px-3 pb-2 text-xs text-neutral-500">
                              Sin contactos disponibles
                            </div>
                          ) : (
                            <ul className="divide-y">
                              {contactsWithoutChat.map((t: CoachMini) => (
                                <li key={`noc-${t.codigo}`}>
                                  <button
                                    className={`w-full flex items-center gap-3 p-2 hover:bg-neutral-50 text-left ${
                                      targetTeamCode === t.codigo
                                        ? "bg-neutral-50"
                                        : ""
                                    }`}
                                    onClick={() => openContact(t)}
                                  >
                                    <div className="h-8 w-8 rounded-full bg-sky-600 text-white grid place-items-center text-sm font-semibold">
                                      {(t.nombre || t.codigo)
                                        .slice(0, 1)
                                        .toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium truncate">
                                        {t.nombre}
                                      </div>
                                      <div className="text-[11px] text-neutral-500">
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
                    {/* Panel de conversación */}
                    <div className="col-span-3">
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
                        className="h-[45vh]"
                        socketio={{
                          url: "https://v001.onrender.com",
                          tokenEndpoint:
                            "https://v001.onrender.com/v1/auth/token",
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
                          // Crear conversación al enviar el primer mensaje
                          autoCreate: true,
                          autoJoin: chatInfo.chatId != null,
                          chatId: chatInfo.chatId ?? undefined,
                        }}
                        onConnectionChange={setChatConnected}
                        onChatInfo={(info) => {
                          // Guardar info cruda
                          setChatInfo(info);
                          // Al confirmar chat, ya no estamos cargando lista por selección
                          setChatsLoading(false);
                          // Si antes no había chat y ahora sí, refrescar la lista inmediatamente
                          if (!chatInfo.chatId && info.chatId) {
                            setChatsLoading(true);
                            setRequestListSignal((n) => n + 1);
                          }
                          // Si ya confirma el par (yo↔target), cerrar decisión como EXISTE
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
                              if (tipo === "equipo" && p?.id_equipo) {
                                set.add(String(p.id_equipo).toLowerCase());
                              }
                            }
                            const hasPair =
                              info.chatId != null &&
                              set.has(String(code).toLowerCase()) &&
                              set.has(String(targetTeamCode).toLowerCase());
                            if (
                              hasPair &&
                              decisionStamp !== `exist:${targetTeamCode}`
                            ) {
                              console.log(
                                "[teamsv2] chat (chatInfo) EXISTE — continuar",
                                {
                                  target: targetTeamCode,
                                  chatId: info.chatId,
                                }
                              );
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
                          try {
                            console.log("[teamsv2] chat.list <=", list);
                          } catch {}
                          setChatList(list);
                          setChatsLoading(false);
                          // Tomar decisión directa con el listado (una sola vez)
                          try {
                            if (!targetTeamCode) return;
                            const existing =
                              pickExistingChatIdForTarget(targetTeamCode);
                            if (existing != null) {
                              if (decisionStamp !== `exist:${targetTeamCode}`) {
                                console.log(
                                  "[teamsv2] Decisión de chat: EXISTE — continuar",
                                  {
                                    target: targetTeamCode,
                                    chatId: existing,
                                  }
                                );
                                setDecisionStamp(`exist:${targetTeamCode}`);
                              }
                              setChatInfo({
                                chatId: existing,
                                myParticipantId: null,
                              });
                            } else {
                              // Si el listado no contiene participantes fiables no concluimos "NO existe" aquí.
                              // El componente interno detectará/creará al enviar si no existe.
                            }
                          } catch {}
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Tabs removed per UI simplification request */}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">
                No se encontró información del coach.
              </div>
            )}
          </div>

          {/* Resumen lateral eliminado a petición */}
        </div>
      </div>
      <CoachStudentsModal
        open={open}
        onOpenChange={setOpen}
        coachCode={code}
        coachName={coach?.nombre ?? null}
      />
      {/* Edit Coach Dialog */}
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

      {/* Delete confirmation dialog */}
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
              <TableHead className="px-3 py-2 text-left">ID Alumno</TableHead>
              <TableHead className="px-3 py-2 text-left">Nombre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-t border-gray-100">
                  <TableCell colSpan={2} className="px-3 py-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow className="border-t border-gray-100">
                <TableCell
                  colSpan={2}
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
                  <TableCell className="px-3 py-2 font-mono text-gray-700">
                    {r.id_alumno ? (
                      <Link
                        href={`/admin/alumnos/${encodeURIComponent(
                          String(r.id_alumno)
                        )}`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.id_alumno}
                      </Link>
                    ) : (
                      r.id_alumno
                    )}
                  </TableCell>
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
