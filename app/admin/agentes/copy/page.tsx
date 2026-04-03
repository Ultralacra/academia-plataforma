"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, SendHorizonal, Sparkles } from "lucide-react";

import { getOptions, type OpcionItem } from "../../opciones/api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Textarea } from "@/components/ui/textarea";

type StageOption = {
  id: string;
  key: string;
  label: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type StageVisual = {
  model: string;
  suggestions: string[];
};

const fallbackStages: StageOption[] = [
  {
    id: "fase-cimentacion",
    key: "fase-cimentacion",
    label: "Fase I: Cimentación",
  },
  {
    id: "fase-crecimiento",
    key: "fase-crecimiento",
    label: "Fase II: Crecimiento",
  },
  {
    id: "fase-optimizacion",
    key: "fase-optimizacion",
    label: "Fase III: Optimización",
  },
];

const stageVisuals: StageVisual[] = [
  {
    model: "Copy Base",
    suggestions: [
      "Dame 3 aperturas para WhatsApp",
      "Necesito un mensaje corto para reactivar conversación",
      "Propón un texto con tono cercano y claro",
    ],
  },
  {
    model: "Copy Focus",
    suggestions: [
      "Quiero un mensaje que detecte dolor sin sonar vendedor",
      "Escríbeme una respuesta para una objeción suave",
      "Ayúdame con un cierre natural y sin presión",
    ],
  },
  {
    model: "Copy Close",
    suggestions: [
      "Redáctame un copy con urgencia real",
      "Necesito una versión más premium y segura",
      "Hazme una respuesta breve para cerrar hoy",
    ],
  },
  {
    model: "Copy Follow-up",
    suggestions: [
      "Necesito seguimiento sin sonar insistente",
      "Reescribe esto con más claridad comercial",
      "Haz una versión más corta para chat",
    ],
  },
];

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStageVisual(index: number) {
  return stageVisuals[index % stageVisuals.length];
}

function createWelcomeMessage(stage: StageOption) {
  return `Estoy listo para trabajar el copy de ${stage.label}. Cuéntame qué necesitas y te responderé como un agente conversacional centrado en esta fase. Si quieres, puedo empezar con aperturas, seguimiento, objeciones o cierres.`;
}

function createAssistantReply(
  input: string,
  stage: StageOption,
  visual: StageVisual,
) {
  return [
    `${visual.model} activo para ${stage.label}.`,
    `Tomaría tu pedido como base: "${input}".`,
    `Te devolvería una primera propuesta clara, más una variación con otro ángulo y una recomendación de tono para esta fase.`,
    `Si quieres, en el siguiente mensaje te la desarrollo directamente como copy final.`,
  ].join("\n\n");
}

function CopyAgentWorkspace() {
  const [stages, setStages] = useState<StageOption[]>(fallbackStages);
  const [selectedStageId, setSelectedStageId] = useState(fallbackStages[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingStages, setLoadingStages] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStages() {
      try {
        setLoadingStages(true);
        setLoadError(null);
        const rows = await getOptions("etapa");
        if (cancelled) return;

        const normalized = rows
          .map((row: OpcionItem) => ({
            id: String(row.codigo ?? row.opcion_key ?? row.opcion_value),
            key: row.opcion_key,
            label: row.opcion_value,
          }))
          .filter((row) => row.id && row.label);

        if (normalized.length > 0) {
          setStages(normalized);
          setSelectedStageId((current) =>
            normalized.some((item) => item.id === current)
              ? current
              : normalized[0].id,
          );
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "No se pudieron cargar las fases desde Opciones. Se muestran fases de respaldo.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStages(false);
        }
      }
    }

    loadStages();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStageIndex = useMemo(
    () =>
      Math.max(
        stages.findIndex((stage) => stage.id === selectedStageId),
        0,
      ),
    [selectedStageId, stages],
  );

  const selectedStage = stages[selectedStageIndex] ?? fallbackStages[0];
  const selectedVisual = getStageVisual(selectedStageIndex);

  useEffect(() => {
    setMessages([
      {
        id: makeId("assistant"),
        role: "assistant",
        content: createWelcomeMessage(selectedStage),
      },
    ]);
    setDraft("");
    setIsThinking(false);

    if (thinkingTimerRef.current) {
      window.clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }, [selectedStage]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) {
        window.clearTimeout(thinkingTimerRef.current);
      }
    };
  }, []);

  const handleSend = (preset?: string) => {
    const value = (preset ?? draft).trim();
    if (!value || isThinking) return;

    const userMessage: ChatMessage = {
      id: makeId("user"),
      role: "user",
      content: value,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsThinking(true);

    thinkingTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: makeId("assistant"),
          role: "assistant",
          content: createAssistantReply(value, selectedStage, selectedVisual),
        },
      ]);
      setIsThinking(false);
      thinkingTimerRef.current = null;
    }, 550);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 shadow-md">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div className="flex w-60 shrink-0 flex-col bg-[#0f0f0f] text-white">
        {/* Back link */}
        <div className="border-b border-white/10 px-4 py-4">
          <Link
            href="/admin/agentes"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Agentes
          </Link>
        </div>

        {/* Title + model badge */}
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm font-semibold">Agente Copy</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {selectedVisual.model}
          </div>
        </div>

        {/* Phase list */}
        <div className="flex-1 overflow-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-white/30">
            Tipo de agente
          </p>

          {loadingStages ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando...
            </div>
          ) : null}

          {loadError ? (
            <div className="mb-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/40">
              {loadError}
            </div>
          ) : null}

          <div className="space-y-0.5">
            {stages.map((stage) => {
              const isActive = stage.id === selectedStageId;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/55 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Chat panel ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-[#f7f7f8]">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
            <Bot className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {selectedVisual.model}
            </p>
            <p className="text-xs text-slate-500">{selectedStage.label}</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isAssistant ? "" : "justify-end"}`}
                >
                  {isAssistant && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <Bot className="h-4 w-4 text-amber-600" />
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-white text-slate-900 shadow-sm"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })}

            {isThinking ? (
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <Bot className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3.5 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            ) : null}
            <div ref={bottomAnchorRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-3xl">
            {/* Suggestions */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {selectedVisual.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Textarea + send */}
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors focus-within:border-slate-400 focus-within:bg-white">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Mensaje al ${selectedVisual.model}…`}
                className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!draft.trim() || isThinking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Enter envía · Shift + Enter = nueva línea
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CopyAgentPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <CopyAgentWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
