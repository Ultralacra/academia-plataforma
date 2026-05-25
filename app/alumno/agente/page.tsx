"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  User2,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { authService, getAuthToken } from "@/lib/auth";
import {
  AgenteAtcChat,
  type AIProvider,
} from "@/components/chat/AgenteAtcChat";
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
}: {
  nombre: string;
  codigo: string;
  tickets: StudentTicket[];
  loadingTickets: boolean;
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
        <div className="h-1.5 w-full bg-linear-to-r from-teal-400 to-emerald-500" />
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
              <User2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{nombre}</p>
              <p className="text-xs text-muted-foreground">{codigo}</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50/60 px-3 py-2 dark:bg-emerald-900/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Programa activo
            </span>
          </div>
        </div>
      </div>

      {/* Agent info card */}
      <div className="overflow-hidden rounded-2xl border border-teal-200/60 bg-linear-to-br from-teal-50/60 to-emerald-50/40 shadow-sm dark:border-teal-800/40 dark:from-teal-900/20 dark:to-emerald-900/10">
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">
              Tu Asistente ATC
            </p>
          </div>
          <p className="text-xs leading-relaxed text-teal-700/80 dark:text-teal-300/70">
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
                className="rounded-lg bg-teal-100/80 px-2 py-0.5 text-center text-teal-700 dark:bg-teal-800/40 dark:text-teal-300"
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
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Mis feedbacks</span>
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

// ─── Page content ─────────────────────────────────────────────────────────────

function AgentePageContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [tickets, setTickets] = useState<StudentTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("anthropic");
  const [chatHistory, setChatHistory] = useState("");
  // Si el user no tiene codigo (datos incompletos de localStorage), forzar refetch
  const [retryedCode, setRetryedCode] = useState<string | null>(null);
  const retryRef = useRef(false);

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

  const welcomeMessage = alumnoName
    ? `¡Hola ${alumnoName.split(" ")[0]}! 👋 Soy tu Asistente ATC de Hotselling PRO. Estoy aquí para ayudarte con cualquier consulta sobre tu programa: membresías, contratos, pausas, extensiones, bonos, garantías y mucho más.\n\n¿En qué te puedo ayudar hoy?`
    : "¡Hola! 👋 Soy tu Asistente ATC. ¿En qué te puedo ayudar hoy?";

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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Asistente ATC</h1>
            <p className="text-sm text-muted-foreground">
              Tu asistente personal de atención al cliente
            </p>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="flex flex-1 flex-col gap-5 overflow-hidden lg:flex-row">
        {/* Sidebar */}
        <StudentSidebar
          nombre={alumnoName}
          codigo={alumnoCode}
          tickets={tickets}
          loadingTickets={loadingTickets}
        />

        {/* Chat */}
        <div className="flex-1 overflow-hidden" style={{ minHeight: "520px" }}>
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
          />
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
