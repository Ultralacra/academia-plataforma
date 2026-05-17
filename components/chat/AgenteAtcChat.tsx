"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  SendHorizonal,
  ShieldAlert,
  Ticket,
  X,
  XCircle,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import { createTicket } from "@/app/admin/alumnos/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgenteMode = "alumno" | "atc_team";
export type AIProvider = "anthropic" | "openai";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TicketAction {
  tipo: "ticket";
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
}

interface EscalateAction {
  tipo: "escalar";
  motivo: string;
  nivel: string;
}

type AgentAction = TicketAction | EscalateAction;

interface AgentContextInfo {
  ticketCount: number;
  weeklyTickets: number;
  signals: string[];
  hasHighRisk: boolean;
}

interface PendingTicket {
  action: TicketAction;
  messageId: string;
  status: "pending" | "creating" | "created" | "cancelled";
  ticketId?: string;
}

// ─── Action parser ────────────────────────────────────────────────────────────

const ACTION_REGEX = /\[ACCION:(\{[^[\]]*\})\]\s*$/;

function parseActionBlock(text: string): {
  cleanText: string;
  action: AgentAction | null;
} {
  const match = ACTION_REGEX.exec(text);
  if (!match) return { cleanText: text.trimEnd(), action: null };
  try {
    const action = JSON.parse(match[1]) as AgentAction;
    const cleanText = text.slice(0, match.index).trimEnd();
    return { cleanText, action };
  } catch {
    return { cleanText: text.trimEnd(), action: null };
  }
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  mode,
}: {
  message: ChatMessage;
  mode: AgenteMode;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-[#d97757] px-4 py-3 text-sm text-white shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  if (isAssistant) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[78%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm shadow-sm">
          {mode === "atc_team" ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{
                __html: message.content
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br/>"),
              }}
            />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Ticket action card ───────────────────────────────────────────────────────

function TicketActionCard({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingTicket;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { action, status } = pending;

  const prioridadColors: Record<string, string> = {
    ALTA: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    MEDIA:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    BAJA: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  if (status === "created") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex max-w-[78%] items-center gap-2 rounded-2xl rounded-tl-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-emerald-700 dark:text-emerald-400">
            ✅ Ticket creado exitosamente. Tu coach recibirá la notificación
            pronto.
          </span>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return null;
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-teal-200/80 bg-teal-50/60 px-4 py-3.5 shadow-sm dark:border-teal-800/40 dark:bg-teal-900/20">
        <div className="mb-2.5 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Propuesta de ticket
          </span>
        </div>
        <p className="mb-1 text-sm font-medium text-foreground">
          {action.titulo}
        </p>
        <p className="mb-2.5 text-xs text-muted-foreground">
          {action.descripcion}
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-teal-200 bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:border-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
            {action.categoria}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${prioridadColors[action.prioridad] ?? prioridadColors.MEDIA}`}
          >
            {action.prioridad}
          </span>
        </div>
        {status === "creating" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Creando ticket...
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Crear ticket
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              No, gracias
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Escalation card ──────────────────────────────────────────────────────────

function EscalationCard({ motivo }: { motivo: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-sm">
        <ShieldAlert className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3.5 shadow-sm dark:border-red-800/40 dark:bg-red-900/20">
        <div className="mb-1.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
            Caso escalado al equipo ATC
          </span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300">
          Tu caso ha sido escalado. Un agente humano del equipo ATC se
          comunicará contigo a la brevedad para resolver esta situación.
        </p>
        {motivo && (
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
            Motivo: {motivo}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface AgenteAtcChatProps {
  alumnoCode: string;
  alumnoName: string;
  mode?: AgenteMode;
  provider?: AIProvider;
  welcomeMessage?: string;
  className?: string;
}

export function AgenteAtcChat({
  alumnoCode,
  alumnoName,
  mode = "alumno",
  provider = "anthropic",
  welcomeMessage,
  className = "",
}: AgenteAtcChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextInfo, setContextInfo] = useState<AgentContextInfo | null>(null);
  const [pendingTicket, setPendingTicket] = useState<PendingTicket | null>(
    null,
  );
  const [escalations, setEscalations] = useState<
    Array<{ id: string; motivo: string }>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Welcome message ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (welcomeMessage) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [welcomeMessage]);

  // ── Auto scroll ──────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingTicket, escalations]);

  // ── Textarea auto-resize ─────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    // Build messages history (exclude welcome)
    const history = [
      ...messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    try {
      const token = getAuthToken();
      abortRef.current = new AbortController();

      const res = await fetch("/api/agentes/super-atc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history,
          alumnoCode,
          alumnoName,
          mode,
          provider,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break outer;
          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            if (parsed.type === "context") {
              setContextInfo({
                ticketCount: Number(parsed.ticketCount ?? 0),
                weeklyTickets: Number(parsed.weeklyTickets ?? 0),
                signals: Array.isArray(parsed.signals)
                  ? (parsed.signals as string[])
                  : [],
                hasHighRisk: Boolean(parsed.hasHighRisk),
              });
            } else if (typeof parsed.text === "string") {
              fullText += parsed.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: fullText } : m,
                ),
              );
            } else if (typeof parsed.error === "string") {
              setError(parsed.error);
              break outer;
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Parse action block from accumulated text
      const { cleanText, action } = parseActionBlock(fullText);

      // Update message with clean text (without action block)
      if (action) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: cleanText } : m,
          ),
        );

        if (action.tipo === "ticket") {
          setPendingTicket({
            action,
            messageId: assistantMsgId,
            status: "pending",
          });
        } else if (action.tipo === "escalar") {
          // Auto-escalate: create urgent ticket and show card
          const escalateId = crypto.randomUUID();
          setEscalations((prev) => [
            ...prev,
            { id: escalateId, motivo: action.motivo },
          ]);
          // Auto-create escalation ticket
          void autoCreateEscalationTicket(
            action.motivo,
            alumnoCode,
            alumnoName,
            token,
          );
        }
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name !== "AbortError") {
        setError(e.message ?? "Error de conexión");
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      }
    } finally {
      setIsStreaming(false);
    }
  }

  async function autoCreateEscalationTicket(
    motivo: string,
    code: string,
    name: string,
    _token: string | null,
  ) {
    try {
      await createTicket({
        nombre: `[URGENTE] Escalación automática — ${name}`,
        id_alumno: code,
        tipo: "ATC",
        descripcion: `Caso escalado automáticamente por el agente IA.\n\nMotivo: ${motivo}\n\nEste ticket requiere atención inmediata del equipo ATC.`,
        estado: "EN_PROGRESO",
      });
    } catch {
      // silencioso — la card de escalado ya fue mostrada
    }
  }

  // ── Confirm ticket ────────────────────────────────────────────────────────────

  async function handleConfirmTicket() {
    if (!pendingTicket || pendingTicket.action.tipo !== "ticket") return;
    setPendingTicket((prev) => (prev ? { ...prev, status: "creating" } : null));

    try {
      await createTicket({
        nombre: pendingTicket.action.titulo,
        id_alumno: alumnoCode,
        tipo: pendingTicket.action.categoria.toUpperCase(),
        descripcion: pendingTicket.action.descripcion,
        estado: "EN_PROGRESO",
      });
      setPendingTicket((prev) =>
        prev ? { ...prev, status: "created" } : null,
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "No se pudo crear el ticket. Intenta nuevamente.");
      setPendingTicket((prev) =>
        prev ? { ...prev, status: "pending" } : null,
      );
    }
  }

  function handleCancelTicket() {
    setPendingTicket((prev) =>
      prev ? { ...prev, status: "cancelled" } : null,
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // ── Weekly ticket indicator ──────────────────────────────────────────────────

  const weeklyPct = contextInfo
    ? Math.min((contextInfo.weeklyTickets / 10) * 100, 100)
    : 0;
  const weeklyColor =
    (contextInfo?.weeklyTickets ?? 0) >= 8
      ? "bg-red-400"
      : (contextInfo?.weeklyTickets ?? 0) >= 5
        ? "bg-amber-400"
        : "bg-teal-400";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {mode === "alumno" ? "Asistente ATC" : "Super Agente ATC"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-muted-foreground">
                {isStreaming ? "Escribiendo..." : "En línea"}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly tickets indicator (alumno mode only) */}
        {mode === "alumno" && contextInfo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
            <span>{contextInfo.weeklyTickets}/10 tickets</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${weeklyColor}`}
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Risk badge (atc_team mode) */}
        {mode === "atc_team" && contextInfo?.hasHighRisk && (
          <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Riesgo alto detectado
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} mode={mode} />
        ))}

        {/* Streaming indicator */}
        {isStreaming &&
          messages.at(-1)?.role === "assistant" &&
          messages.at(-1)?.content === "" && (
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
              </div>
            </div>
          )}

        {/* Ticket action card */}
        {pendingTicket && (
          <TicketActionCard
            pending={pendingTicket}
            onConfirm={() => void handleConfirmTicket()}
            onCancel={handleCancelTicket}
          />
        )}

        {/* Escalation cards */}
        {escalations.map((esc) => (
          <EscalationCard key={esc.id} motivo={esc.motivo} />
        ))}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card/80 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-teal-400/60 focus-within:ring-2 focus-within:ring-teal-400/20 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "alumno"
                ? "Escríbeme tu consulta..."
                : "Describe el caso del alumno..."
            }
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
            style={{ maxHeight: "120px" }}
          />
          {isStreaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim()}
              className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
