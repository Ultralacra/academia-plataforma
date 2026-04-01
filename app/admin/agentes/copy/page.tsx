"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Loader2,
  SendHorizonal,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { getOptions, type OpcionItem } from "../../opciones/api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  assistantBubbleClassName: string;
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
    assistantBubbleClassName:
      "border border-slate-200 bg-white text-slate-900 shadow-sm",
    suggestions: [
      "Dame 3 aperturas para WhatsApp",
      "Necesito un mensaje corto para reactivar conversación",
      "Propón un texto con tono cercano y claro",
    ],
  },
  {
    model: "Copy Focus",
    assistantBubbleClassName:
      "border border-slate-200 bg-white text-slate-900 shadow-sm",
    suggestions: [
      "Quiero un mensaje que detecte dolor sin sonar vendedor",
      "Escríbeme una respuesta para una objeción suave",
      "Ayúdame con un cierre natural y sin presión",
    ],
  },
  {
    model: "Copy Close",
    assistantBubbleClassName:
      "border border-slate-200 bg-white text-slate-900 shadow-sm",
    suggestions: [
      "Redáctame un copy con urgencia real",
      "Necesito una versión más premium y segura",
      "Hazme una respuesta breve para cerrar hoy",
    ],
  },
  {
    model: "Copy Follow-up",
    assistantBubbleClassName:
      "border border-slate-200 bg-white text-slate-900 shadow-sm",
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
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
    const viewport = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (viewport instanceof HTMLElement) {
      viewport.scrollTop = viewport.scrollHeight;
    }
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
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-5 w-5 text-slate-500" />
                <h1 className="text-3xl font-semibold tracking-tight">
                  Agente Copy
                </h1>
              </div>
              <p className="max-w-3xl text-sm text-slate-600">
                Esta vista ahora funciona como chat. La fase activa se toma
                desde Opciones y el agente responde en modo conversacional
                dentro de una interfaz más limpia, sin paneles de prompt ni
                configuración pesada.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="bg-white">
            <Link
              href="/admin/agentes"
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a agentes
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Fases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingStages ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando fases reales...
              </div>
            ) : null}

            {loadError ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                {loadError}
              </div>
            ) : null}

            <div className="space-y-2">
              {stages.map((stage, index) => {
                const isActive = stage.id === selectedStageId;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${isActive ? "text-white" : "text-slate-900"}`}
                    >
                      {stage.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div>
                  <CardTitle className="text-2xl">Chat del agente</CardTitle>
                  <CardDescription>{selectedStage.label}</CardDescription>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Modelo
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {selectedVisual.model}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea
              ref={scrollRef}
              className="h-[560px] bg-white px-6 py-8"
            >
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-2">
                {messages.map((message) => {
                  const isAssistant = message.role === "assistant";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-[26px] px-5 py-4 text-sm leading-7 ${
                          isAssistant
                            ? selectedVisual.assistantBubbleClassName
                            : "bg-slate-900 text-white shadow-sm"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] opacity-50">
                          {isAssistant ? (
                            <Bot className="h-3.5 w-3.5" />
                          ) : (
                            <WandSparkles className="h-3.5 w-3.5" />
                          )}
                          {isAssistant ? selectedVisual.model : "Tu mensaje"}
                        </div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  );
                })}

                {isThinking ? (
                  <div className="flex justify-start">
                    <div
                      className={`rounded-[26px] px-5 py-4 ${selectedVisual.assistantBubbleClassName}`}
                    >
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        El agente está escribiendo...
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>

            <div className="border-t border-slate-200 bg-white p-5">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {selectedVisual.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSend(suggestion)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-3">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={`Escribe aquí qué copy necesitas para ${selectedStage.label}...`}
                    className="min-h-[104px] resize-none border-0 bg-transparent px-2 py-2 text-sm leading-7 shadow-none focus-visible:ring-0"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                  />

                  <div className="mt-3 flex items-center justify-between gap-3 px-2">
                    <div className="text-xs text-slate-500">
                      Enter envía. Shift + Enter hace salto de línea.
                    </div>

                    <Button
                      onClick={() => handleSend()}
                      disabled={!draft.trim() || isThinking}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 text-white hover:bg-slate-800"
                    >
                      <SendHorizonal className="h-4 w-4" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
