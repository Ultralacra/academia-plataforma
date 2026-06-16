"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Ticket,
  User,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import {
  SUPER_ATC_HISTORY_ENTITY,
  type PersistedChatMessage,
  type AgenteAtcHistoryPayload,
} from "@/components/chat/useAgenteAtcHistory";

interface EmmaChatViewerProps {
  alumnoCode: string;
  alumnoName: string;
  alumnoStage?: string | null;
  alumnoState?: string | null;
}

interface AgentAction {
  tipo: string;
  titulo?: string;
  descripcion?: string;
  categoria?: string;
  prioridad?: string;
  motivo?: string;
  nivel?: string;
  start?: string;
  end?: string;
  tipo_pausa?: string;
  fase?: string;
  campos?: Record<string, string>;
}

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

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDateDivider(isoString: string): string {
  try {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";

    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function shouldShowDateDivider(
  currentMsg: PersistedChatMessage,
  prevMsg: PersistedChatMessage | null,
): boolean {
  if (!prevMsg) return true;
  const currentDate = new Date(currentMsg.timestamp).toDateString();
  const prevDate = new Date(prevMsg.timestamp).toDateString();
  return currentDate !== prevDate;
}

function ActionCard({ action }: { action: AgentAction }) {
  const prioridadColors: Record<string, string> = {
    ALTA: "bg-red-100 text-red-700 border-red-200",
    MEDIA: "bg-amber-100 text-amber-700 border-amber-200",
    BAJA: "bg-green-100 text-green-700 border-green-200",
  };

  if (action.tipo === "ticket") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2d9eea] to-[#7aaad7] shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#2d9eea]/30 bg-[#2d9eea]/5 px-4 py-3.5 shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <Ticket className="h-4 w-4 text-[#2d9eea]" />
            <span className="text-xs font-semibold tracking-wide text-[#2d9eea]">
              Ticket propuesto
            </span>
          </div>
          <p className="mb-1 text-sm font-medium text-gray-900">
            {action.titulo}
          </p>
          <p className="mb-2.5 text-xs text-gray-600">{action.descripcion}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#2d9eea]/30 bg-[#2d9eea]/10 px-2 py-0.5 text-[11px] font-medium text-[#2d9eea]">
              {action.categoria}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${prioridadColors[action.prioridad ?? "MEDIA"] ?? prioridadColors.MEDIA}`}
            >
              {action.prioridad}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (action.tipo === "escalar") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-sm">
          <ShieldAlert className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3.5 shadow-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-semibold tracking-wide text-red-700">
              Caso escalado
            </span>
          </div>
          <p className="text-sm text-red-700">
            Caso escalado al equipo ATC para atención prioritaria.
          </p>
          {action.motivo && (
            <p className="mt-1.5 text-xs text-red-500">
              Motivo: {action.motivo}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (action.tipo === "transferir") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2d9eea] shadow-sm">
          <MessageSquare className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#2d9eea]/30 bg-[#2d9eea]/5 px-4 py-3.5 shadow-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#2d9eea]" />
            <span className="text-xs font-semibold tracking-wide text-[#2d9eea]">
              Transferencia a ATC
            </span>
          </div>
          <p className="text-sm text-[#2d9eea]">
            El alumno solicitó ser atendido por un agente humano.
          </p>
          {action.motivo && (
            <p className="mt-1.5 text-xs text-[#2d9eea]/70">
              Motivo: {action.motivo}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (action.tipo === "pausa") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2d9eea] to-[#7aaad7] shadow-sm">
          <Calendar className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#2d9eea]/30 bg-[#2d9eea]/5 px-4 py-3.5 shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#2d9eea]" />
            <span className="text-xs font-semibold tracking-wide text-[#2d9eea]">
              Pausa registrada
            </span>
          </div>
          <div className="space-y-1 text-sm text-gray-900">
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#2d9eea]/30 bg-[#2d9eea]/10 px-2 py-0.5 text-[11px] font-medium text-[#2d9eea]">
              {action.tipo_pausa}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (action.tipo === "tarea") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2d9eea] to-[#7aaad7] shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#2d9eea]/30 bg-[#2d9eea]/5 px-4 py-3.5 shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#2d9eea]" />
            <span className="text-xs font-semibold tracking-wide text-[#2d9eea]">
              Tarea registrada - Fase {action.fase}
            </span>
          </div>
          {action.campos && (
            <div className="space-y-1 text-xs text-gray-600">
              {Object.entries(action.campos).map(([key, value]) => (
                <p key={key}>
                  <span className="font-medium capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>{" "}
                  {value}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export function EmmaChatViewer({
  alumnoCode,
  alumnoName,
  alumnoStage,
  alumnoState,
}: EmmaChatViewerProps) {
  const [messages, setMessages] = useState<PersistedChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const loadHistory = async (isInitial = false) => {
    try {
      const token = getAuthToken();
      const url = `/api/metadata?entity=${encodeURIComponent(SUPER_ATC_HISTORY_ENTITY)}&entity_id=${encodeURIComponent(alumnoCode)}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        if (isInitial) setError("No se pudo cargar el historial");
        return;
      }

      const json = await res.json().catch(() => null);
      const items: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.items)
            ? json.items
            : json
              ? [json]
              : [];

      const found = items.find(
        (m: any) =>
          m?.entity === SUPER_ATC_HISTORY_ENTITY &&
          String(m?.entity_id ?? "") === String(alumnoCode),
      );

      if (found) {
        const payload = (found.payload ?? {}) as Partial<AgenteAtcHistoryPayload>;
        const msgs = Array.isArray(payload.messages)
          ? payload.messages.filter((m) => m && typeof m.content === "string")
          : [];
        setMessages(msgs);
        setLastUpdate(new Date());
      } else {
        setMessages([]);
      }

      if (isInitial) setLoading(false);
    } catch (err) {
      console.error("[EmmaChatViewer] load failed", err);
      if (isInitial) {
        setError("Error al cargar el historial");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessages([]);
    prevMessageCountRef.current = 0;
    loadHistory(true);
  }, [alumnoCode]);

  useEffect(() => {
    if (!alumnoCode) return;

    const interval = setInterval(() => {
      loadHistory(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [alumnoCode]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current && !loading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2d9eea]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm">{error}</p>
        <button
          onClick={() => loadHistory(true)}
          className="flex items-center gap-2 rounded-lg bg-[#2d9eea] px-4 py-2 text-sm text-white hover:bg-[#2589d1]"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
        <Bot className="h-12 w-12 text-gray-300" />
        <p className="text-sm">
          Este alumno aún no ha interactuado con Emma
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src="/emma-avatar.png"
            alt="Emma"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Emma</span>
              <span className="rounded-full bg-[#2d9eea]/10 px-2 py-0.5 text-[10px] font-medium text-[#2d9eea]">
                IA
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Conversación con {alumnoName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500">En vivo</span>
          </div>
          {lastUpdate && (
            <span className="text-[10px] text-gray-400">
              {lastUpdate.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
        <User className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs text-gray-600">{alumnoName}</span>
        {alumnoStage && (
          <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-medium text-purple-700">
            {alumnoStage}
          </span>
        )}
        {alumnoState && (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            {alumnoState}
          </span>
        )}
        <span className="ml-auto text-[10px] text-gray-400 font-mono">
          {alumnoCode}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-[#efeae2] px-4 py-4"
      >
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDate = shouldShowDateDivider(msg, prevMsg);
            const isUser = msg.role === "user";
            const { cleanText, action } = parseActionBlock(msg.content);

            return (
              <div key={msg.id || idx}>
                {showDate && (
                  <div className="my-4 flex items-center justify-center">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
                      {formatDateDivider(msg.timestamp)}
                    </span>
                  </div>
                )}

                {isUser ? (
                  <div className="flex justify-end">
                    <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-[#dcf8c6] px-4 py-3 text-sm text-gray-900 shadow-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {cleanText}
                      </p>
                      <p className="mt-1 text-right text-[10px] text-gray-500">
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <img
                        src="/emma-avatar.png"
                        alt="Emma"
                        className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover shadow-sm"
                      />
                      <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-gray-900 shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {cleanText}
                        </p>
                        <p className="mt-1 text-right text-[10px] text-gray-500">
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                    {action && (
                      <div className="ml-9 mt-1">
                        <ActionCard action={action} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          <span>Solo lectura · Conversación entre {alumnoName} y Emma IA</span>
        </div>
      </div>
    </div>
  );
}
