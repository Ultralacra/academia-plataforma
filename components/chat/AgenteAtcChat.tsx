"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  RefreshCw,
  SendHorizonal,
  ShieldAlert,
  Square,
  Ticket,
  X,
  XCircle,
} from "lucide-react";
import { convertBlobToMp3 } from "@/lib/audio-converter";
import { getAuthToken } from "@/lib/auth";
import {
  createTicket,
  createTicketAsAgent,
  registerStudentPause,
  updateClientLastTask,
} from "@/app/admin/alumnos/api";
import { CreateTicketModal } from "@/app/admin/tickets-board/CreateTicketModal";
import { AgentTicketPreviewModal } from "@/components/chat/AgentTicketPreviewModal";
import { useAgenteAtcHistory } from "@/components/chat/useAgenteAtcHistory";

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

interface TransferAction {
  tipo: "transferir";
  motivo: string;
}

interface PausaAction {
  tipo: "pausa";
  start: string;
  end: string;
  tipo_pausa: "CONTRACTUAL" | "EXTRAORDINARIA";
  motivo: string;
}

interface TareaAction {
  tipo: "tarea";
  fase: string;
  campos: Record<string, string>;
}

type AgentAction = TicketAction | EscalateAction | TransferAction | PausaAction | TareaAction;

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

interface PendingPause {
  action: PausaAction;
  messageId: string;
  status: "pending" | "creating" | "created" | "cancelled";
  errorMsg?: string;
}

interface PendingTarea {
  action: TareaAction;
  messageId: string;
  status: "pending" | "creating" | "created" | "cancelled" | "error";
  errorMsg?: string;
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
  isAlumno = false,
}: {
  pending: PendingTicket;
  onConfirm: () => void;
  onCancel: () => void;
  isAlumno?: boolean;
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
            {isAlumno
              ? "✅ Feedback enviado exitosamente. Tu coach lo revisará pronto."
              : "✅ Ticket creado exitosamente."}
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
          <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            {isAlumno ? "Propuesta de feedback" : "Propuesta de ticket"}
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
            {isAlumno ? "Enviando feedback..." : "Creando ticket..."}
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isAlumno ? "Enviar feedback" : "Crear ticket"}
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
          <span className="text-xs font-semibold tracking-wide text-red-700 dark:text-red-300">
            Caso escalado al equipo atc
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

// ─── Transfer card ────────────────────────────────────────────────────────────

function TransferCard({
  motivo,
  mode = "alumno",
  alumnoCode = "",
}: {
  motivo: string;
  mode?: AgenteMode;
  alumnoCode?: string;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  const chatUrl = alumnoCode
    ? `/admin/alumnos/${encodeURIComponent(alumnoCode)}/chat`
    : "/admin/alumnos";

  if (mode !== "alumno") {
    // En modo ATC team: tarjeta informativa simple (sin confirmación)
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-teal-200 bg-teal-50 px-4 py-3.5 shadow-sm dark:border-teal-800/40 dark:bg-teal-900/20">
          <div className="mb-1.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
              Transferencia a ATC sugerida
            </span>
          </div>
          <p className="text-sm text-teal-700 dark:text-teal-300">
            El alumno solicitó ser atendido por un agente humano.
          </p>
          {motivo && (
            <p className="mt-1.5 text-xs text-teal-500 dark:text-teal-400">
              Motivo: {motivo}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 shadow-sm">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-teal-200 bg-teal-50 px-4 py-3.5 shadow-sm dark:border-teal-800/40 dark:bg-teal-900/20">
        {!confirmed ? (
          <>
            <div className="mb-1.5 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
                Conectar con tu Agente ATC
              </span>
            </div>
            <p className="mb-3 text-sm text-teal-700 dark:text-teal-300">
              ¿Quieres que te conecte con tu Agente de Atención al Cliente?
              Podrás continuar la conversación directamente en tu chat.
            </p>
            {motivo && (
              <p className="mb-3 text-xs text-teal-500 dark:text-teal-400">
                Motivo: {motivo}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmed(true)}
                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sí, conectarme
              </button>
              <button
                onClick={() => {
                  /* dismiss silencioso */
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
                No, gracias
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-1.5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
                ¡Listo! Tu ATC te espera en el chat
              </span>
            </div>
            <p className="mb-3 text-sm text-teal-700 dark:text-teal-300">
              Haz clic en el botón para abrir tu chat y continuar con tu agente.
            </p>
            <button
              onClick={() => router.push(chatUrl)}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Ir a mi chat con ATC
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Pause action card ────────────────────────────────────────────────────────

function PauseActionCard({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingPause;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { action, status, errorMsg } = pending;

  const tipoBadge =
    action.tipo_pausa === "CONTRACTUAL"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";

  if (status === "created") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex max-w-[78%] items-center gap-2 rounded-2xl rounded-tl-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-emerald-700 dark:text-emerald-400">
            ✅ Pausa registrada correctamente. Tu programa queda suspendido del{" "}
            <strong>{action.start}</strong> al <strong>{action.end}</strong>.
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
          <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            Propuesta de pausa
          </span>
        </div>
        <div className="mb-2 space-y-1 text-sm text-foreground">
          <p>
            <span className="font-medium">Desde:</span> {action.start}
          </p>
          <p>
            <span className="font-medium">Hasta:</span> {action.end}
          </p>
          <p>
            <span className="font-medium">Motivo:</span> {action.motivo}
          </p>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tipoBadge}`}
          >
            {action.tipo_pausa}
          </span>
        </div>
        {errorMsg && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
            {errorMsg}
          </p>
        )}
        {status === "creating" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Registrando pausa...
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Registrar pausa
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task action card ─────────────────────────────────────────────────────────

function TaskActionCard({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingTarea;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { action, status, errorMsg } = pending;
  const { fase, campos } = action;

  if (status === "created") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex max-w-[78%] items-center gap-2 rounded-2xl rounded-tl-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-emerald-700 dark:text-emerald-400">
            ✅ Tarea guardada correctamente. Tu coach fue notificado y revisará tu entrega de la Fase {fase} pronto.
          </span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-emerald-500 shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3.5 shadow-sm dark:border-red-800/40 dark:bg-red-900/20">
          <div className="mb-1.5 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-semibold tracking-wide text-red-700 dark:text-red-300">
              Error al guardar la tarea
            </span>
          </div>
          {errorMsg && (
            <p className="mb-2 text-sm text-red-700 dark:text-red-300">
              {errorMsg}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
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
          <Paperclip className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            Entrega de tarea — Fase {fase}
          </span>
        </div>
        <div className="mb-3 space-y-1 text-sm text-foreground">
          {Object.entries(campos).map(([key, value]) => (
            <p key={key}>
              <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
              {key === "doc_link" && value ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 underline dark:text-teal-400"
                >
                  {value}
                </a>
              ) : (
                value || "—"
              )}
            </p>
          ))}
        </div>
        {errorMsg && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
            {errorMsg}
          </p>
        )}
        {status === "creating" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Guardando tarea y notificando a tu coach...
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Guardar tarea
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
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
  onTicketCreated?: () => void;
  /** Si true, los tickets se crean vía proxy ATC (informante = servicio ATC, no el alumno) */
  createAsAgent?: boolean;
  /** Historial de chat ATC↔alumno (texto formateado) para dar contexto al AI */
  chatHistory?: string;
}

export function AgenteAtcChat({
  alumnoCode,
  alumnoName,
  mode = "alumno",
  provider = "anthropic",
  welcomeMessage,
  className = "",
  onTicketCreated,
  createAsAgent = false,
  chatHistory,
}: AgenteAtcChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextInfo, setContextInfo] = useState<AgentContextInfo | null>(null);
  const [pendingTicket, setPendingTicket] = useState<PendingTicket | null>(
    null,
  );
  const [pendingPause, setPendingPause] = useState<PendingPause | null>(null);
  const [pendingTask, setPendingTask] = useState<PendingTarea | null>(null);
  const [escalations, setEscalations] = useState<
    Array<{ id: string; motivo: string }>
  >([]);
  const [transfers, setTransfers] = useState<
    Array<{ id: string; motivo: string }>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const welcomeInitialized = useRef(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isConvertingAudio, setIsConvertingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);

  // ── Persistencia del historial en metadata ──────────────────────────────────
  // 1 sólo registro por alumno; se crea con POST la primera vez y se va
  // editando con PUT en cada cambio (debounced).
  const {
    loaded: historyLoaded,
    initialMessages: persistedMessages,
    initialContextInfo: persistedContextInfo,
    scheduleSave: schedulePersistHistory,
  } = useAgenteAtcHistory(alumnoCode);

  // ── Welcome message ──────────────────────────────────────────────────────────
  // Solo se inicializa una vez con el primer welcomeMessage no vacío.
  // Esto evita que el chat se resetee cuando authState se refresca (cambio de pestaña, etc.)
  // Si hay historial persistido, se hidrata primero y NO se muestra welcome.

  useEffect(() => {
    if (!historyLoaded || welcomeInitialized.current) return;

    if (persistedMessages.length > 0) {
      welcomeInitialized.current = true;
      setMessages(
        persistedMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        })),
      );
      if (persistedContextInfo) {
        setContextInfo(persistedContextInfo);
      }
      return;
    }

    if (welcomeMessage) {
      welcomeInitialized.current = true;
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [historyLoaded, persistedMessages, persistedContextInfo, welcomeMessage]);

  // ── Auto-guardar en metadata cuando cambia el historial ──────────────────────
  // Se ignora hasta que la carga inicial haya terminado, y se excluye el welcome.
  useEffect(() => {
    if (!historyLoaded || !alumnoCode) return;
    const persistable = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }));
    // No persistir cuando aún no hay nada que guardar y tampoco había historial.
    if (persistable.length === 0 && persistedMessages.length === 0) return;
    schedulePersistHistory({
      alumnoCode,
      alumnoName,
      messages: persistable,
      contextInfo: contextInfo,
      lastMode: mode,
      lastProvider: provider,
    });
  }, [
    messages,
    contextInfo,
    historyLoaded,
    alumnoCode,
    alumnoName,
    mode,
    provider,
    persistedMessages.length,
    schedulePersistHistory,
  ]);

  // ── Auto scroll ──────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingTicket, pendingTask, escalations]);

  // ── Auto-dismiss ticket created card ─────────────────────────────────────────

  useEffect(() => {
    if (pendingTicket?.status === "created") {
      const timer = setTimeout(() => {
        setPendingTicket(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [pendingTicket?.status]);

  // ── Auto-dismiss pause created card ──────────────────────────────────────────

  useEffect(() => {
    if (pendingPause?.status === "created") {
      const timer = setTimeout(() => {
        setPendingPause(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pendingPause?.status]);

  // ── Auto-dismiss task created card ───────────────────────────────────────────

  useEffect(() => {
    if (pendingTask?.status === "created" || pendingTask?.status === "error") {
      const timer = setTimeout(() => {
        setPendingTask(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [pendingTask?.status]);

  // ── Audio recording ──────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const options: MediaRecorderOptions = {};
      const supported = ["audio/webm", "audio/ogg"].filter((t) =>
        MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(t) : true,
      );
      if (supported.length > 0) options.mimeType = supported[0] as any;
      const mr = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];
      let recordedType = "";
      mr.ondataavailable = (ev) => {
        if (ev.data?.size) {
          chunks.push(ev.data);
          try {
            recordedType = (ev.data as Blob).type || recordedType;
          } catch {}
        }
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: recordedType || "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      };
      mediaRecorderRef.current = mr;
      mr.start(1000);
      setIsRecording(true);
    } catch (e) {
      console.error(e);
    }
  }

  function stopRecording() {
    setTimeout(() => {
      try {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.error(e);
      }
      setIsRecording(false);
    }, 500);
  }

  async function addRecordedToFiles() {
    if (!recordedBlob) return;
    setIsConvertingAudio(true);
    try {
      const mp3File = await convertBlobToMp3(recordedBlob);
      setAttachedFiles((prev) => [...prev, mp3File]);
    } catch {
      // fallback: adjuntar original
      const ext = recordedBlob.type?.includes("audio/ogg") ? "ogg" : "webm";
      const file = new File([recordedBlob], `grabacion-${Date.now()}.${ext}`, {
        type: recordedBlob.type || "audio/webm",
      });
      setAttachedFiles((prev) => [...prev, file]);
    } finally {
      setIsConvertingAudio(false);
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
      }
      setRecordedBlob(null);
    }
  }

  function discardRecording() {
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
  }

  async function transcribeAndSend() {
    if (!recordedBlob) return;
    setIsTranscribing(true);
    try {
      // 1. Convertir a MP3 para potencial adjunto al ticket
      let mp3File: File;
      try {
        mp3File = await convertBlobToMp3(recordedBlob);
      } catch {
        const ext = recordedBlob.type?.includes("ogg") ? "ogg" : "webm";
        mp3File = new File([recordedBlob], `grabacion-${Date.now()}.${ext}`, {
          type: recordedBlob.type || "audio/webm",
        });
      }

      // 2. Limpiar UI de grabación
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setRecordedBlob(null);

      // 3. Guardar como audio pendiente (se adjuntará automáticamente si se crea un ticket)
      setPendingAudioFile(mp3File);

      // 4. Transcribir con Whisper
      const fd = new FormData();
      fd.append("audio", recordedBlob, mp3File.name);
      const token = getAuthToken();
      const res = await fetch("/api/agentes/transcribir", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !json.text) {
        throw new Error(json.error ?? "Error al transcribir el audio");
      }

      // 5. Enviar texto transcrito al agente
      await handleSend(json.text);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Error de transcripción");
    } finally {
      setIsTranscribing(false);
    }
  }

  // ── Textarea auto-resize ─────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || isStreaming) return;

    if (!textOverride) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
    setError(null);

    // Build content text — include attached file names so the agent has context
    const filesSuffix =
      attachedFiles.length > 0
        ? `\n\n[Archivos adjuntos: ${attachedFiles.map((f) => f.name).join(", ")}]`
        : "";
    const contentWithFiles = text + filesSuffix;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: contentWithFiles,
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
      { role: "user" as const, content: contentWithFiles },
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
          chatHistory,
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
          // Si hay audio pendiente, auto-adjuntarlo al ticket
          if (pendingAudioFile) {
            setAttachedFiles((prev) => [...prev, pendingAudioFile]);
            setPendingAudioFile(null);
          }
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
        } else if (action.tipo === "transferir") {
          // Transfer to human ATC — no ticket, show transfer card
          const transferId = crypto.randomUUID();
          setTransfers((prev) => [
            ...prev,
            { id: transferId, motivo: action.motivo },
          ]);
        } else if (action.tipo === "pausa") {
          // Pause proposal — show confirmation card
          setPendingPause({
            action,
            messageId: assistantMsgId,
            status: "pending",
          });
        } else if (action.tipo === "tarea") {
          // Task proposal — show confirmation card
          setPendingTask({
            action,
            messageId: assistantMsgId,
            status: "pending",
          });
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
      const createFn = createAsAgent ? createTicketAsAgent : createTicket;
      await createFn({
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

  // ── Confirm ticket (abre CreateTicketModal con datos pre-rellenos) ──────────

  function handleConfirmTicket() {
    if (!pendingTicket || pendingTicket.action.tipo !== "ticket") return;
    setTicketModalOpen(true);
  }

  function handleCancelTicket() {
    setPendingTicket((prev) =>
      prev ? { ...prev, status: "cancelled" } : null,
    );
  }

  // ── Confirm / cancel pause ────────────────────────────────────────────────────

  async function handleConfirmPause() {
    if (!pendingPause || pendingPause.action.tipo !== "pausa") return;
    setPendingPause((prev) =>
      prev ? { ...prev, status: "creating", errorMsg: undefined } : null,
    );
    try {
      await registerStudentPause(alumnoCode, {
        start: pendingPause.action.start,
        end: pendingPause.action.end,
        tipo: pendingPause.action.tipo_pausa,
        motivo: pendingPause.action.motivo,
      });
      setPendingPause((prev) => (prev ? { ...prev, status: "created" } : null));
    } catch (err: unknown) {
      const msg =
        (err as { message?: string }).message ?? "Error al registrar la pausa";
      setPendingPause((prev) =>
        prev ? { ...prev, status: "pending", errorMsg: msg } : null,
      );
    }
  }

  function handleCancelPause() {
    setPendingPause((prev) => (prev ? { ...prev, status: "cancelled" } : null));
  }

  // ── Confirm / cancel task ────────────────────────────────────────────────────

  async function handleConfirmTask() {
    if (!pendingTask || pendingTask.action.tipo !== "tarea") return;
    setPendingTask((prev) =>
      prev ? { ...prev, status: "creating", errorMsg: undefined } : null,
    );

    try {
      const token = getAuthToken();
      const { fase, campos } = pendingTask.action;
      const nowIso = new Date().toISOString();

      // 1. Obtener metadata ADS existente
      const metaRes = await fetch(
        `/api/alumnos/${encodeURIComponent(alumnoCode)}/metadata?entity=${encodeURIComponent("ads_metrics")}`,
        {
          method: "GET",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: "no-store",
        },
      );

      let metadata: any = null;
      if (metaRes.ok) {
        const metaJson = await metaRes.json().catch(() => null);
        const items = Array.isArray(metaJson?.items) ? metaJson.items : [];
        metadata =
          items.find(
            (m: any) =>
              String(m?.entity_id ?? "").trim() === alumnoCode ||
              String((m?.payload as any)?.alumno_codigo ?? "").trim() ===
                alumnoCode,
          ) || items[0];
      }

      // 2. Si no existe, crear metadata base
      if (!metadata?.id) {
        const createRes = await fetch(
          `/api/alumnos/${encodeURIComponent(alumnoCode)}/metadata/ensure-ads`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              entity_id: alumnoCode,
              payload: {
                alumno_codigo: alumnoCode,
                alumno_nombre: alumnoName || "",
                auto_roas: true,
                auto_eff: true,
                pauta_activa: false,
                requiere_interv: false,
                roas: "",
                tareas: [],
                _tag: "admin_alumnos_ads_metrics",
                _view: "/admin/alumnos/[code]/ads",
                _saved_at: nowIso,
              },
            }),
          },
        );
        if (createRes.ok) {
          const createdJson = await createRes.json().catch(() => null);
          metadata = {
            id: createdJson?.id ?? null,
            entity: "ads_metrics",
            entity_id: alumnoCode,
            payload: { tareas: [] },
          };
        }
      }

      if (!metadata?.id) {
        throw new Error("No se pudo obtener ni crear metadata ADS");
      }

      // 3. Construir objeto tarea
      const tareaObj = {
        id: `tmp_tarea_${Date.now()}`,
        alumno_codigo: alumnoCode,
        alumno_nombre: alumnoName || null,
        fase_formulario: fase || null,
        estatus: "Nueva tarea creada",
        ads_metadata_id: metadata.id,
        fecha: campos.fecha ? `${campos.fecha}T12:00:00` : nowIso,
        campos: { ...campos },
        created_at: nowIso,
      };

      // 4. Actualizar metadata
      const payloadActual = metadata.payload ?? {};
      const tareasActuales = Array.isArray(payloadActual.tareas)
        ? payloadActual.tareas
        : [];
      const payloadActualizado = {
        ...payloadActual,
        tareas: [...tareasActuales, tareaObj],
        _preview_generated_at: nowIso,
      };

      const updateRes = await fetch(
        `/api/alumnos/${encodeURIComponent(alumnoCode)}/metadata/update-ads`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id: metadata.id,
            entity: metadata.entity ?? "ads_metrics",
            entity_id: alumnoCode,
            payload: payloadActualizado,
          }),
        },
      );

      if (!updateRes.ok) {
        const txt = await updateRes.text().catch(() => "");
        throw new Error(txt || `Error ${updateRes.status} al guardar tarea`);
      }

      // 5. Actualizar ultima_tarea del cliente
      await updateClientLastTask(alumnoCode, tareaObj.fecha);

      // 6. Crear ticket automático para el coach
      const createFn = createAsAgent ? createTicketAsAgent : createTicket;
      const ticketRes = await createFn({
        nombre: `Tarea entregada — Fase ${fase} — ${campos.nombre || "Sin título"}`,
        id_alumno: alumnoCode,
        tipo: "Copy",
        descripcion: `El alumno ${alumnoName || alumnoCode} ha entregado una tarea de la Fase ${fase}.\n\n**Datos de la entrega:**\n${Object.entries(campos)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}\n\nRevisar y dar feedback.`,
        estado: "NUEVO",
      });

      setPendingTask((prev) =>
        prev
          ? { ...prev, status: "created", ticketId: ticketRes?.id }
          : null,
      );

      // Refrescar tickets si hay callback
      onTicketCreated?.();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string }).message ??
        "Error al guardar la tarea";
      setPendingTask((prev) =>
        prev ? { ...prev, status: "error", errorMsg: msg } : null,
      );
    }
  }

  function handleCancelTask() {
    setPendingTask((prev) => (prev ? { ...prev, status: "cancelled" } : null));
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
          <img src="/emma-avatar.png" alt="Emma" className="h-8 w-8 rounded-full object-cover shadow-sm" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {mode === "alumno" ? "Emma · Asistente IA" : "Super Agente ATC"}
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
            <span>{contextInfo.weeklyTickets}/10 feedbacks</span>
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
            onConfirm={handleConfirmTicket}
            onCancel={handleCancelTicket}
            isAlumno={mode === "alumno"}
          />
        )}

        {/* Escalation cards */}
        {escalations.map((esc) => (
          <EscalationCard key={esc.id} motivo={esc.motivo} />
        ))}

        {/* Transfer to human ATC cards */}
        {transfers.map((t) => (
          <TransferCard
            key={t.id}
            motivo={t.motivo}
            mode={mode}
            alumnoCode={alumnoCode}
          />
        ))}

        {/* Pause action card */}
        {pendingPause && (
          <PauseActionCard
            pending={pendingPause}
            onConfirm={() => void handleConfirmPause()}
            onCancel={handleCancelPause}
          />
        )}

        {/* Task action card */}
        {pendingTask && (
          <TaskActionCard
            pending={pendingTask}
            onConfirm={() => void handleConfirmTask()}
            onCancel={handleCancelTask}
          />
        )}

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
        {/* Attached files chips */}
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachedFiles.map((f, i) => {
              const isAudio = f.type.startsWith("audio/");
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs ${
                    isAudio
                      ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-900/20 dark:text-violet-300"
                      : "border-border bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {isAudio ? (
                    <Mic className="h-3 w-3 shrink-0" />
                  ) : (
                    <Paperclip className="h-3 w-3 shrink-0" />
                  )}
                  <span className="max-w-30 truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachedFiles((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="ml-0.5 rounded hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* AUDIO FEATURES TEMPORARILY DISABLED */}
        {/* Recording in progress indicator */}
        {/* {isRecording && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span>Grabando audio...</span>
            <button
              type="button"
              onClick={discardRecording}
              className="ml-auto rounded hover:text-red-800 dark:hover:text-red-300"
              title="Descartar grabación"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )} */}

        {/* Recorded audio preview */}
        {/* {recordedBlob && recordedUrl && !isRecording && (
          <div className="mb-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800/40 dark:bg-violet-900/20">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                Audio grabado — escúchalo y envíalo
              </span>
              <button
                type="button"
                onClick={discardRecording}
                className="rounded text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                title="Descartar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <audio
              src={recordedUrl}
              controls
              className="w-full"
              style={{ minHeight: "40px" }}
            />
            <button
              type="button"
              onClick={() => void transcribeAndSend()}
              disabled={isTranscribing || isStreaming}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Transcribiendo y enviando...
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  Enviar mensaje de voz
                </>
              )}
            </button>
            <p className="mt-1.5 text-center text-[10px] text-violet-400 dark:text-violet-500">
              El agente entiende el audio · si crea un ticket, se adjuntará
              automáticamente
            </p>
          </div>
        )} */}

        {/* Pending audio file indicator */}
        {/* {pendingAudioFile && !pendingTicket && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-700 dark:border-violet-800/40 dark:bg-violet-900/20 dark:text-violet-300">
            <Mic className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">
              Audio listo — se adjuntará al ticket si se crea uno
            </span>
            <button
              type="button"
              onClick={() => setPendingAudioFile(null)}
              className="rounded hover:text-violet-900 dark:hover:text-violet-100"
              title="Descartar audio"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )} */}

        {/* Hidden file input — documentos e imágenes */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length > 0) {
              setAttachedFiles((prev) => [...prev, ...selected]);
            }
            e.target.value = "";
          }}
        />

        {/* Hidden audio input — TEMPORARILY DISABLED */}
        {/* <input
          ref={audioInputRef}
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length > 0) {
              setAttachedFiles((prev) => [...prev, ...selected]);
            }
            e.target.value = "";
          }}
        /> */}

        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-teal-400/60 focus-within:ring-2 focus-within:ring-teal-400/20 transition-all">
          {/* Attachment button — documentos */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            title="Adjuntar documentos"
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Audio button — TEMPORARILY DISABLED */}
          {/* <button
            type="button"
            onClick={() => {
              if (isRecording) stopRecording();
              else void startRecording();
            }}
            disabled={isStreaming || isConvertingAudio}
            title={isRecording ? "Detener grabación" : "Grabar audio"}
            className={`mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-40 ${
              isRecording
                ? "animate-pulse border-red-400 bg-red-50 text-red-500 dark:bg-red-900/20"
                : "border-border text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            }`}
          >
            {isRecording ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button> */}
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

      {/* Modal de ticket/feedback — preview read-only para modo alumno, completo para atc_team */}
      {pendingTicket?.action.tipo === "ticket" && mode === "alumno" && (
        <AgentTicketPreviewModal
          open={ticketModalOpen}
          onOpenChange={setTicketModalOpen}
          alumnoCode={alumnoCode}
          alumnoName={alumnoName}
          title={pendingTicket.action.titulo}
          description={pendingTicket.action.descripcion}
          category={pendingTicket.action.categoria}
          priority={pendingTicket.action.prioridad}
          files={attachedFiles}
          createFn={createAsAgent ? createTicketAsAgent : undefined}
          onSuccess={() => {
            setTicketModalOpen(false);
            setPendingTicket((prev) =>
              prev ? { ...prev, status: "created" } : null,
            );
            setAttachedFiles([]);
            setPendingAudioFile(null);
            onTicketCreated?.();
          }}
        />
      )}
      {pendingTicket?.action.tipo === "ticket" && mode !== "alumno" && (
        <CreateTicketModal
          open={ticketModalOpen}
          onOpenChange={(v) => {
            setTicketModalOpen(v);
          }}
          defaultStudentCode={alumnoCode}
          defaultTitle={pendingTicket.action.titulo}
          defaultDescription={pendingTicket.action.descripcion}
          defaultType={pendingTicket.action.categoria}
          createFn={createAsAgent ? createTicketAsAgent : undefined}
          defaultFiles={attachedFiles}
          onSuccess={() => {
            setTicketModalOpen(false);
            setPendingTicket((prev) =>
              prev ? { ...prev, status: "created" } : null,
            );
            setAttachedFiles([]);
            setPendingAudioFile(null);
          }}
        />
      )}
    </div>
  );
}
