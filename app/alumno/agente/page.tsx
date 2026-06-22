"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  User2,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { authService, getAuthToken } from "@/lib/auth";
import { trackUnreadReceived, trackUnreadRead } from "@/lib/unread-metrics";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createMetadata } from "@/lib/metadata";
import {
  AgenteAtcChat,
  type AIProvider,
} from "@/components/chat/AgenteAtcChat";
import { emitirTicketResuelto } from "@/components/chat/TicketResueltoNotifier";
import { getStudentTickets } from "@/app/admin/alumnos/api";
import { AI_PROVIDER_KEY } from "@/app/admin/agentes/page";
import { io } from "socket.io-client";

const CHAT_HOST =
  process.env.NEXT_PUBLIC_CHAT_HOST ?? "https://api-ax.valinkgroup.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentTicket {
  id: string | number;
  codigo?: string;
  nombre?: string;
  tipo?: string;
  estado?: string;
  creacion?: string;
}

const ESTADO_STYLES: Record<
  string,
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  EN_PROGRESO: {
    label: "En progreso",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  RESUELTO: {
    label: "Resuelto",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle2,
  },
  PENDIENTE: {
    label: "Pendiente",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: AlertCircle,
  },
  CERRADO: {
    label: "Cerrado",
    color: "bg-muted text-muted-foreground",
    icon: CheckCircle2,
  },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function StudentSidebar({
  nombre,
  codigo,
  tickets,
  loadingTickets,
  onRefreshTickets,
  nuevosResueltos = 0,
}: {
  nombre: string;
  codigo: string;
  tickets: StudentTicket[];
  loadingTickets: boolean;
  onRefreshTickets: () => void;
  nuevosResueltos?: number;
}) {
  function formatDate(dateStr?: string) {
    if (!dateStr) return null;
    try {
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
      }).format(new Date(dateStr));
    } catch {
      return null;
    }
  }

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
      {/* Student info card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Gradient header */}
        <div className="h-1.5 w-full bg-linear-to-r from-[#2d9eea] to-[#7aaad7]" />
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-[#2d9eea] to-[#7aaad7] shadow-sm">
              <User2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{nombre}</p>
              <p className="text-xs text-muted-foreground">{codigo}</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 rounded-xl bg-[#83d79e]/10 px-3 py-2 dark:bg-[#83d79e]/10">
            <span className="h-2 w-2 rounded-full bg-[#83d79e]" />
            <span className="text-xs font-medium text-[#83d79e] dark:text-[#83d79e]">
              Programa activo
            </span>
          </div>
        </div>
      </div>

      {/* Agent info card */}
      <div className="overflow-hidden rounded-2xl border border-[#2d9eea]/30 bg-linear-to-br from-[#2d9eea]/5 to-[#7aaad7]/5 shadow-sm dark:border-[#2d9eea]/20 dark:from-[#2d9eea]/10 dark:to-[#7aaad7]/5">
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <img src="/emma-avatar.png" alt="Emma" className="h-4 w-4 rounded-full object-cover" />
            <p className="text-sm font-semibold text-[#2d9eea] dark:text-[#7aaad7]">
              Emma · Asistente IA
            </p>
          </div>
          <p className="text-xs leading-relaxed text-[#2d9eea]/80 dark:text-[#7aaad7]/70">
            Puedo ayudarte con membresías, contratos, pausas, extensiones,
            bonos, garantías y más. Cuando sea necesario, crearé un ticket de
            soporte para tu coach.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
            {[
              "Membresías",
              "Contratos",
              "Pausas",
              "Extensiones",
              "Bonos",
              "Garantías",
            ].map((topic) => (
              <span
                key={topic}
                className="rounded-lg bg-[#2d9eea]/10 px-2 py-0.5 text-center text-[#2d9eea] dark:bg-[#2d9eea]/20 dark:text-[#7aaad7]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent feedbacks */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Mis feedbacks</span>
              {nuevosResueltos > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dd4970] px-1.5 text-[10px] font-bold text-white">
                  {nuevosResueltos}
                </span>
              )}
            </div>
            <button
              onClick={onRefreshTickets}
              disabled={loadingTickets}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingTickets ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {loadingTickets ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.filter(
              (t) =>
                !["ELIMINADO", "CANCELADO", "ANULADO", "DELETED"].includes(
                  String(t.estado ?? "").toUpperCase(),
                ),
            ).length === 0 ? (
            <div className="px-4 py-5 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                No tienes feedbacks aún
              </p>
            </div>
          ) : (
            tickets
              .filter(
                (t) =>
                  !["ELIMINADO", "CANCELADO", "ANULADO", "DELETED"].includes(
                    String(t.estado ?? "").toUpperCase(),
                  ),
              )
              .slice(0, 5)
              .map((ticket) => {
                const estado = String(
                  ticket.estado ?? "PENDIENTE",
                ).toUpperCase();
                const style = ESTADO_STYLES[estado] ?? ESTADO_STYLES.PENDIENTE;
                const StatusIcon = style.icon;
                const fecha = formatDate(ticket.creacion);

                return (
                  <div key={ticket.id} className="px-4 py-3">
                    <p className="mb-1 line-clamp-1 text-xs font-medium text-foreground">
                      {ticket.nombre ?? `Feedback #${ticket.id}`}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.color}`}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {style.label}
                      </span>
                      {fecha && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-2.5 w-2.5" />
                          {fecha}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
          {tickets.filter(
            (t) =>
              !["ELIMINADO", "CANCELADO", "ANULADO", "DELETED"].includes(
                String(t.estado ?? "").toUpperCase(),
              ),
          ).length > 5 && (
            <div className="px-4 py-2.5 text-center">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition">
                Ver todos
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Feedback Modal ──────────────────────────────────────────────────────────

function FeedbackModal({
  open,
  onClose,
  alumnoNombre,
  alumnoCodigo,
}: {
  open: boolean;
  onClose: () => void;
  alumnoNombre: string;
  alumnoCodigo: string;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function handleClose() {
    if (sending) return;
    setText("");
    setSent(false);
    onClose();
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await createMetadata({
        entity: "feedback_super_atc",
        entity_id: `${alumnoCodigo}_${Date.now()}`,
        payload: {
          nombre: alumnoNombre,
          codigo: alumnoCodigo,
          feedback: trimmed,
          fecha: new Date().toISOString(),
        },
      });
      setSent(true);
      setText("");
    } catch {
      // silencioso
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#dd4970] to-[#dd4970] shadow-sm">
              <MessageSquarePlus className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-lg">¿Qué podemos mejorar?</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Tu opinión ayuda a mejorar a Emma para todos los alumnos.
          </p>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#83d79e]/20 dark:bg-[#83d79e]/20">
              <CheckCircle2 className="h-7 w-7 text-[#83d79e]" />
            </div>
            <p className="font-semibold text-foreground">
              ¡Gracias por tu feedback!
            </p>
            <p className="text-sm text-muted-foreground">
              Lo revisaremos para seguir mejorando el agente.
            </p>
            <button
              onClick={handleClose}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Textarea
                placeholder="Contanos qué mejorarías, qué te faltó o qué no funcionó como esperabas..."
                className="min-h-30 resize-none text-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                disabled={sending}
              />
              <p className="text-right text-xs text-muted-foreground">
                {text.length}/1000
              </p>
            </div>
            <DialogFooter>
              <button
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                disabled={sending}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || sending}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#dd4970] to-[#dd4970] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar feedback
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function AgentePageContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [tickets, setTickets] = useState<StudentTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("anthropic");
  const [chatHistory, setChatHistory] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  // Si el user no tiene codigo (datos incompletos de localStorage), forzar refetch
  const [retryedCode, setRetryedCode] = useState<string | null>(null);
  const retryRef = useRef(false);

  // ── Unread message tracking ──────────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);
  const originalTitleRef = useRef("Emma · Asistente IA");

  const handleUnreadChange = useCallback(
    (count: number) => {
      setUnreadCount((prev) => {
        if (count > prev) {
          trackUnreadReceived(count - prev);
        } else if (prev > 0 && count === 0) {
          trackUnreadRead(prev);
        }
        return count;
      });
    },
    [],
  );

  useEffect(() => {
    if (unreadCount > 0 && document.visibilityState !== "visible") {
      document.title = `🔴 (${unreadCount}) ${originalTitleRef.current}`;
    } else {
      document.title = originalTitleRef.current;
    }
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [unreadCount]);

  const alumnoCode = (user as any)?.codigo ?? retryedCode ?? "";
  const alumnoName = user?.name ?? alumnoCode;

  // Si después de cargar el codigo sigue vacío, forzar un refetch fresco de /auth/me
  useEffect(() => {
    if (
      !isLoading &&
      !(user as any)?.codigo &&
      isAuthenticated &&
      !retryRef.current
    ) {
      retryRef.current = true;
      authService
        .me()
        .then((u) => {
          if (u.codigo) setRetryedCode(u.codigo);
        })
        .catch(() => {
          /* se mostrará el banner de error */
        });
    }
  }, [isLoading, user, isAuthenticated]);

  // Load provider preference
  useEffect(() => {
    const saved = localStorage.getItem(AI_PROVIDER_KEY) as AIProvider | null;
    if (saved === "openai" || saved === "anthropic") setProvider(saved);
  }, []);

  // Fetch ATC<->student chat history via socket.io
  useEffect(() => {
    if (!alumnoCode) return;
    const token = getAuthToken();
    if (!token) return;

    const socket = io(CHAT_HOST, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 20_000,
    });

    socket.on("connect", () => {
      void (async () => {
        try {
          const convs = await new Promise<Record<string, unknown>[]>((res) => {
            const t = setTimeout(() => res([]), 10_000);
            socket.emit(
              "chat.list",
              {
                participante_tipo: "cliente",
                id_cliente: alumnoCode,
                limit: 100,
                page_size: 100,
              },
              (ack: unknown) => {
                clearTimeout(t);
                const a = ack as Record<string, unknown>;
                res(
                  Array.isArray(a?.data)
                    ? (a.data as Record<string, unknown>[])
                    : [],
                );
              },
            );
          });

          const chatIds = convs
            .map((c) => String(c.id_chat ?? c.id ?? ""))
            .filter(Boolean)
            .slice(0, 5);

          const results = await Promise.all(
            chatIds.map(
              (chatId) =>
                new Promise<{
                  chatId: string;
                  msgs: Record<string, unknown>[];
                }>((res) => {
                  const t = setTimeout(() => res({ chatId, msgs: [] }), 8_000);
                  socket.emit(
                    "chat.join",
                    { id_chat: chatId },
                    (ack: unknown) => {
                      clearTimeout(t);
                      const a = ack as Record<string, unknown>;
                      const data = a?.data as
                        | Record<string, unknown>
                        | undefined;
                      const msgs = Array.isArray(data?.messages)
                        ? (data.messages as Record<string, unknown>[])
                        : Array.isArray(data?.mensajes)
                          ? (data.mensajes as Record<string, unknown>[])
                          : [];
                      res({ chatId, msgs });
                    },
                  );
                }),
            ),
          );

          const lines: string[] = [];
          for (const { chatId, msgs } of results) {
            if (msgs.length === 0) continue;
            lines.push(`### Conversación ${chatId}`);
            for (const m of msgs.slice(-20)) {
              const tipo = String(
                m.participante_tipo ?? m.tipo ?? m.type ?? m.emisor_tipo ?? "",
              ).toLowerCase();
              const label = tipo.includes("cliente")
                ? "Alumno"
                : tipo.includes("equipo") || tipo.includes("coach")
                  ? "ATC"
                  : "Sistema";
              const content = String(
                m.contenido ??
                  m.content ??
                  m.mensaje ??
                  m.message ??
                  m.texto ??
                  m.text ??
                  "",
              ).trim();
              const at = String(m.created_at ?? m.at ?? m.fecha ?? "").slice(
                0,
                16,
              );
              if (content) lines.push(`[${at}] ${label}: ${content}`);
            }
            lines.push("");
          }
          setChatHistory(lines.join("\n"));
        } catch {
          // silencioso
        } finally {
          try {
            socket.disconnect();
          } catch {
            /* silencioso */
          }
        }
      })();
    });

    socket.on("connect_error", () => {
      try {
        socket.disconnect();
      } catch {
        /* silencioso */
      }
    });

    return () => {
      try {
        socket.disconnect();
      } catch {
        /* silencioso */
      }
    };
  }, [alumnoCode]);

  // Fetch recent tickets
  const refreshTickets = useCallback(() => {
    if (!alumnoCode) return;
    setLoadingTickets(true);
    getStudentTickets(alumnoCode)
      .then((data) => setTickets(data as StudentTicket[]))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [alumnoCode]);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // ── Polling de tickets resueltos ─────────────────────────────────────────
  const yaProcesadosRef = useRef<Set<string>>(new Set());
  const primeraConsultaRef = useRef(true);
  const [nuevosResueltos, setNuevosResueltos] = useState(0);
  useEffect(() => {
    if (!alumnoCode) return;
    let cancelled = false;
    const POLL_INTERVAL = 10_000;

    async function verificarTicketsResueltos() {
      if (cancelled) return;
      try {
        const token = getAuthToken();
        const isFirstPoll = primeraConsultaRef.current;
        primeraConsultaRef.current = false;
        const url = `/api/agentes/emma/tickets-resueltos?alumno=${encodeURIComponent(alumnoCode)}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });

        if (!res.ok) return;
        const data = await res.json();
        const ticketsResueltos: any[] = data.tickets || [];

        for (const ticket of ticketsResueltos) {
          if (yaProcesadosRef.current.has(ticket.ticketId)) continue;
          yaProcesadosRef.current.add(ticket.ticketId);

          if (isFirstPoll) continue;

          setNuevosResueltos((n) => n + 1);

          const mensaje = `Hola ${alumnoName.split(" ")[0]} 😊\n\n¡Listo! Tu coach ya revisó tu consulta y dejó el feedback correspondiente.\n\nTe recomendamos revisar cuidadosamente las observaciones y aplicar las recomendaciones indicadas para continuar avanzando en tu implementación.\n\nSi después de revisar el feedback te surge una nueva duda o necesitas una aclaración puntual, puedes escribirnos nuevamente por este medio y con gusto te apoyaremos.\n\n¡Muchos éxitos! 🚀`;

          emitirTicketResuelto(
            {
              id: `emma-resuelto-${ticket.ticketId}`,
              content: mensaje,
              feedbackLink: ticket.feedbackUrl || ticket.nombre || "",
              feedbackUrl: ticket.feedbackUrl || "",
            },
            ticket.ticketId,
          );
        }

        refreshTickets();
      } catch {
        // silencioso
      }
    }

    const interval = setInterval(verificarTicketsResueltos, POLL_INTERVAL);
    verificarTicketsResueltos();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [alumnoCode, alumnoName, refreshTickets]);

  const welcomeMessage = alumnoName
    ? `¡Hola ${alumnoName.split(" ")[0]}! 👋 Me llamo Emma, soy tu Asistente IA de Hotselling PRO. Estoy aquí para ayudarte con cualquier consulta sobre tu programa: membresías, contratos, pausas, extensiones, bonos, garantías y mucho más.\n\n¿En qué te puedo ayudar hoy?`
    : "¡Hola! 👋 Soy Emma, tu Asistente IA. ¿En qué te puedo ayudar hoy?";

  if (
    isLoading ||
    (!(user as any)?.codigo &&
      !retryedCode &&
      isAuthenticated &&
      !retryRef.current)
  ) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!alumnoCode) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
        <strong>No se pudo identificar tu código de alumno.</strong> Por favor
        recarga la página. Si el problema persiste, contacta a soporte técnico.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Page header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/emma-avatar.png" alt="Emma" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Emma · Asistente IA
              </h1>
              <p className="text-sm text-muted-foreground">
                Tu asistente personal de atención al cliente
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFeedback(true)}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-[#dd4970] to-[#dd4970] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#dd4970]/30 transition hover:shadow-lg hover:shadow-[#dd4970]/40 hover:brightness-110 active:scale-95"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
            <MessageSquarePlus className="h-4 w-4" />
            💬 ¿Qué podemos mejorar?
          </button>
        </div>
      </div>

      <FeedbackModal
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        alumnoNombre={alumnoName}
        alumnoCodigo={alumnoCode}
      />

      {/* Layout */}
      <div className="flex flex-1 flex-col gap-5 overflow-hidden lg:flex-row">
        {/* Sidebar */}
        <StudentSidebar
          nombre={alumnoName}
          codigo={alumnoCode}
          tickets={tickets}
          loadingTickets={loadingTickets}
          onRefreshTickets={() => {
            setNuevosResueltos(0);
            refreshTickets();
          }}
          nuevosResueltos={nuevosResueltos}
        />

        {/* Chat */}
        <div className="relative flex-1 overflow-hidden" style={{ minHeight: "520px" }}>
          <AgenteAtcChat
            alumnoCode={alumnoCode}
            alumnoName={alumnoName}
            mode="alumno"
            provider={provider}
            welcomeMessage={welcomeMessage}
            className="h-full"
            onTicketCreated={refreshTickets}
            createAsAgent={true}
            chatHistory={chatHistory}
            onUnreadChange={handleUnreadChange}
          />
          {unreadCount > 0 && (
            <div className="absolute bottom-20 left-1/2 z-50 -translate-x-1/2 animate-bounce">
              <div className="flex items-center gap-2 rounded-full bg-[#dd4970] px-4 py-2 text-xs font-semibold text-white shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                {unreadCount} {unreadCount === 1 ? "mensaje nuevo" : "mensajes nuevos"} sin leer
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AlumnoAgentePage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <DashboardLayout>
        <AgentePageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
