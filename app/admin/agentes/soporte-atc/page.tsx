"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Database,
  Info,
  LifeBuoy,
  Loader2,
  RefreshCw,
  SendHorizonal,
  ShieldAlert,
  Trash2,
  User,
  Zap,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Textarea } from "@/components/ui/textarea";
import { getAuthToken } from "@/lib/auth";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  riskLevel?: "BAJO" | "MEDIO" | "ALTO" | null;
};

type KbStatus = {
  loading: boolean;
  building: boolean;
  ticketsAnalyzed: number | null;
  chatsAnalyzed: number | null;
  builtAt: string | null;
  error: string | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function extractRisk(text: string): "BAJO" | "MEDIO" | "ALTO" | null {
  const m = /🚨\s*RIESGO[:\s*]*\*?\*?\s*(BAJO|MEDIO|ALTO)/i.exec(text);
  return (m?.[1] as "BAJO" | "MEDIO" | "ALTO") ?? null;
}

const RISK_COLORS: Record<string, string> = {
  ALTO: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  MEDIO:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  BAJO: "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300",
};

const RISK_ICONS: Record<string, React.ElementType> = {
  ALTO: ShieldAlert,
  MEDIO: AlertTriangle,
  BAJO: CheckCircle2,
};

const PRESETS: { category: string; items: string[] }[] = [
  {
    category: "Contrato y membresía",
    items: [
      "¿Qué ocurre cuando termina el contrato del alumno?",
      "¿Cómo funciona la membresía de continuidad?",
      "El alumno tiene dudas sobre las cláusulas de su contrato",
      "¿Qué incluye la continuidad post-programa?",
    ],
  },
  {
    category: "Pausas y extensiones",
    items: [
      "El alumno quiere solicitar una pausa ¿cómo procedo?",
      "El alumno necesita una extensión extraordinaria del programa",
      "El alumno menciona temas de salud y no puede continuar",
    ],
  },
  {
    category: "Garantía y reembolsos",
    items: [
      "El alumno pregunta por la garantía y posible reembolso",
      "¿Cuáles son los requisitos para aplicar la garantía?",
    ],
  },
  {
    category: "Crisis financiera",
    items: [
      "El alumno tiene cuotas pendientes y no puede pagar",
      "El alumno pide un plan de pago o refinanciación de cuotas",
    ],
  },
  {
    category: "Crisis emocional",
    items: [
      "El alumno expresa frustración extrema o desesperanza",
      "El alumno dice que quiere rendirse o abandonar el programa",
    ],
  },
  {
    category: "Escalaciones y casos críticos",
    items: [
      "¿Cuándo debo escalar un caso al líder ATC?",
      "El alumno menciona acciones legales o amenazas formales",
      "El alumno quiere darse de baja definitiva del programa",
    ],
  },
  {
    category: "Análisis del historial",
    items: [
      "¿Cuáles son las consultas más frecuentes de los alumnos?",
      "¿Qué tipos de crisis son más comunes en los chats de soporte?",
      "¿Cuáles son los temas donde más escalan los casos?",
      "¿Qué tono usan los alumnos cuando expresan inconformidades?",
      "¿Qué respuestas del ATC generan mejor experiencia al estudiante?",
    ],
  },
];

// ─── Markdown renderer simple ──────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      result.push(
        <ul key={key} className="my-1 list-disc pl-5 space-y-0.5">
          {listItems.map((li, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {inlineFormat(li)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    if (/^#+\s/.test(line)) {
      flushList(`list-${i}`);
      const hText = line.replace(/^#+\s/, "");
      result.push(
        <p key={i} className="mt-3 mb-1 text-sm font-bold text-foreground">
          {inlineFormat(hText)}
        </p>,
      );
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(line.slice(2));
    } else if (line.trim() === "---") {
      flushList(`list-${i}`);
      result.push(<hr key={i} className="my-3 border-border/50" />);
    } else if (line.trim() === "") {
      flushList(`list-${i}`);
      result.push(<div key={i} className="h-2" />);
    } else {
      flushList(`list-${i}`);
      result.push(
        <p key={i} className="text-sm leading-relaxed">
          {inlineFormat(line)}
        </p>,
      );
    }
  });

  flushList("final");
  return result;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={i}
          className="rounded bg-muted px-1 py-0.5 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

// ─── Main component ────────────────────────────────────────────────────────────

function SoporteAtcWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [kbStatus, setKbStatus] = useState<KbStatus>({
    loading: false,
    building: false,
    ticketsAnalyzed: null,
    chatsAnalyzed: null,
    builtAt: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load knowledge base status on mount
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    setKbStatus((s) => ({ ...s, loading: true }));
    fetch("/api/agentes/soporte-atc/knowledge", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(
        (json: {
          knowledge?: {
            built_at?: string;
            tickets_analyzed?: number;
            chats_analyzed?: number;
          };
          error?: string;
        }) => {
          if (json.knowledge) {
            setKbStatus({
              loading: false,
              building: false,
              ticketsAnalyzed: json.knowledge.tickets_analyzed ?? null,
              chatsAnalyzed: json.knowledge.chats_analyzed ?? null,
              builtAt: json.knowledge.built_at ?? null,
              error: null,
            });
          } else {
            setKbStatus((s) => ({
              ...s,
              loading: false,
              error: json.error ?? "Sin datos",
            }));
          }
        },
      )
      .catch(() =>
        setKbStatus((s) => ({ ...s, loading: false, error: "No disponible" })),
      );
  }, []);

  const handleRefreshKb = useCallback(() => {
    const token = getAuthToken();
    if (!token) return;
    setKbStatus((s) => ({ ...s, building: true, error: null }));
    fetch("/api/agentes/soporte-atc/knowledge", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(
        (json: {
          knowledge?: {
            built_at?: string;
            tickets_analyzed?: number;
            chats_analyzed?: number;
          };
          error?: string;
        }) => {
          if (json.knowledge) {
            setKbStatus({
              loading: false,
              building: false,
              ticketsAnalyzed: json.knowledge.tickets_analyzed ?? null,
              chatsAnalyzed: json.knowledge.chats_analyzed ?? null,
              builtAt: json.knowledge.built_at ?? null,
              error: null,
            });
          } else {
            setKbStatus((s) => ({
              ...s,
              building: false,
              error: json.error ?? "Error",
            }));
          }
        },
      )
      .catch(() =>
        setKbStatus((s) => ({
          ...s,
          building: false,
          error: "Error al actualizar",
        })),
      );
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (overrideContent?: string) => {
      const content = (overrideContent ?? draft).trim();
      if (!content || isStreaming) return;

      setDraft("");

      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content,
      };
      const assistantId = makeId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        riskLevel: null,
      };

      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const authToken = getAuthToken();
        const provider =
          localStorage.getItem("agents-ai-provider") ?? "anthropic";

        const res = await fetch("/api/agentes/soporte-atc", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ messages: history, provider }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "Error desconocido");
          throw new Error(errText);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let accumulated = "";
        let rafHandle: number | null = null;

        const flushStreaming = () => {
          rafHandle = null;
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: snapshot, riskLevel: extractRisk(snapshot) }
                : m,
            ),
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            let parsed: {
              text?: string;
              error?: string;
              type?: string;
              ticketCount?: number;
              signals?: string[];
            };
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }

            if (parsed.error) throw new Error(parsed.error);
            if (parsed.type === "context") continue;

            if (parsed.text) {
              accumulated += parsed.text;
              if (rafHandle === null) {
                rafHandle = requestAnimationFrame(flushStreaming);
              }
            }
          }
        }

        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
        const finalContent = accumulated;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: finalContent,
                  streaming: false,
                  riskLevel: extractRisk(finalContent),
                }
              : m,
          ),
        );
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        if (e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content || "[Cancelado]",
                    streaming: false,
                  }
                : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `Error: ${e.message ?? "desconocido"}`,
                    streaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [draft, isStreaming, messages],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleClear() {
    abortRef.current?.abort();
    setMessages([]);
    setDraft("");
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-muted/30">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Link
            href="/admin/agentes"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Agentes
          </Link>
        </div>

        {/* Agent info */}
        <div className="flex flex-col items-center gap-3 border-b border-border px-4 py-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-teal-400 to-emerald-500 text-white shadow-md">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold">Soporte ATC</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Copiloto del equipo de atención al cliente
            </p>
          </div>
        </div>

        {/* Knowledge base status */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Database className="h-3 w-3" />
              Base de conocimiento
            </span>
            <button
              onClick={handleRefreshKb}
              disabled={kbStatus.loading || kbStatus.building}
              title="Actualizar base de conocimiento"
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3 w-3 ${kbStatus.building ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {kbStatus.loading ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
            </p>
          ) : kbStatus.building ? (
            <p className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Analizando tickets…
            </p>
          ) : kbStatus.ticketsAnalyzed !== null ? (
            <div className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {kbStatus.ticketsAnalyzed} tickets analizados
              </p>
              {kbStatus.chatsAnalyzed !== null &&
                kbStatus.chatsAnalyzed > 0 && (
                  <p className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {kbStatus.chatsAnalyzed} chats de Space
                  </p>
                )}
              {kbStatus.builtAt && (
                <p className="text-[10px] text-muted-foreground">
                  Actualizado:{" "}
                  {new Date(kbStatus.builtAt).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {kbStatus.error ?? "Sin configurar"}{" "}
              <button
                onClick={handleRefreshKb}
                className="underline hover:text-foreground"
              >
                Generar
              </button>
            </p>
          )}
        </div>

        {/* Presets */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Consultas frecuentes
          </p>
          {PRESETS.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-0.5">
                {group.category}
              </p>
              <div className="space-y-1">
                {group.items.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => void handleSend(preset)}
                    disabled={isStreaming}
                    className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-[12px] text-muted-foreground transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700 dark:hover:border-teal-800 dark:hover:bg-teal-950/20 dark:hover:text-teal-300 disabled:opacity-40"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Model indicator */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span>
              {(typeof window !== "undefined" &&
                localStorage.getItem("agents-ai-provider")) === "openai"
                ? "OpenAI · GPT"
                : "Anthropic · Claude"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-teal-500" />
            <span className="text-sm font-medium">Soporte ATC</span>
            {isStreaming && (
              <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                Generando…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Detener
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-teal-400 to-emerald-500 text-white shadow-md">
                <LifeBuoy className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Soporte ATC</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Consulta sobre políticas, procedimientos y cómo manejar
                  situaciones con alumnos: contratos, pausas, membresías,
                  garantías, escalaciones y más.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Las consultas del panel izquierdo son un buen punto de partida
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-teal-400 to-emerald-500 text-white shadow-sm mt-0.5">
                    <LifeBuoy className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-teal-600 text-white"
                      : "rounded-tl-sm border border-border bg-card"
                  }`}
                >
                  {/* Risk badge (only for assistant) */}
                  {msg.role === "assistant" && msg.riskLevel && (
                    <div
                      className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${RISK_COLORS[msg.riskLevel]}`}
                    >
                      {(() => {
                        const Icon = RISK_ICONS[msg.riskLevel];
                        return <Icon className="h-3 w-3" />;
                      })()}
                      Riesgo {msg.riskLevel}
                    </div>
                  )}

                  {msg.role === "user" ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {renderMarkdown(msg.content)}
                      {msg.streaming && msg.content === "" && (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Procesando…
                        </span>
                      )}
                      {msg.streaming && msg.content !== "" && (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-teal-500 align-text-bottom" />
                      )}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted shadow-sm mt-0.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background p-4">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre procedimientos ATC… (Enter para enviar)"
              rows={2}
              disabled={isStreaming}
              className="flex-1 resize-none text-sm"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!draft.trim() || isStreaming}
              className="flex h-full items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 px-4 text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
            >
              <SendHorizonal className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page export ───────────────────────────────────────────────────────────────

export default function SoporteAtcPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "atc"]}>
      <DashboardLayout>
        <SoporteAtcWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
