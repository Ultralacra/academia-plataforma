"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  FileText,
  Layers,
  Lock,
  Megaphone,
  Paperclip,
  SendHorizonal,
  Sparkles,
  Trash2,
  TvMinimalPlay,
  Video,
  X,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Textarea } from "@/components/ui/textarea";
import { getAuthToken } from "@/lib/auth";

// ─── Sub-agent definitions ────────────────────────────────────────────────────

type SubAgent = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
  suggestions: string[];
  welcome: string;
};

const SUB_AGENTS: SubAgent[] = [
  {
    id: "hotsystem",
    label: "Revisor de Fase 1",
    description: "Tu mentor personal para la escalera de valor",
    icon: Layers,
    color: "text-amber-400",
    badgeColor: "bg-amber-400/20",
    suggestions: [
      "Sube tu documento de Fase 1 para revisión completa",
      "¿Mi promesa de carnada está bien construida?",
      "¿Mi order bump cumple los criterios de HotSelling?",
    ],
    welcome: `¡Hola! Soy tu **Mentor de Fase 1** de HotSelling.

Estoy aquí para revisarte el documento de Fase 1 con los mismos criterios que se aplican en el programa, y explicarte el porqué de cada observación para que puedas mejorar, no solo corregir.

**Cómo trabajar conmigo:**
• Sube tu documento de Fase 1 (PDF o texto) para una revisión completa de las 6 tareas.
• O pega directamente el texto de cualquier tarea que quieras revisar.
• También puedes hacerme preguntas sobre los criterios del programa.

¿Qué necesitas revisar hoy?`,
  },
  {
    id: "hotwriter-vsl",
    label: "Co-escritor VSL",
    description: "Te guía para construir tu guión de Video Sales Letter",
    icon: Video,
    color: "text-violet-400",
    badgeColor: "bg-violet-400/20",
    suggestions: [
      "Necesito construir mi hook de VSL desde cero",
      "Revisa mi epifanía y mecanismo único",
      "¿Cómo estructura el bloque de alternativas fallidas?",
    ],
    welcome: `¡Hola! Soy tu **Co-escritor de VSL** de HotSelling.

Trabajamos juntos para construir o mejorar tu guión de Video Sales Letter paso a paso. Primero te pregunto lo que necesito saber y luego construimos bloque por bloque.

**Puedo ayudarte con:**
• Construir tu VSL desde cero (te guío con preguntas).
• Revisar tu guión bloque por bloque.
• Mejorar tu hook, epifanía y mecanismo único.
• Estructurar la lógica de solución y el cierre de oferta.

¿Empezamos desde cero o tienes algo que revisar?`,
  },
  {
    id: "hotwriter-mini-vsl",
    label: "Hooks y Mini VSL",
    description: "Crea variaciones de hooks y guiones cortos",
    icon: TvMinimalPlay,
    color: "text-sky-400",
    badgeColor: "bg-sky-400/20",
    suggestions: [
      "Necesito 5 variaciones de hook para mi carnada",
      "Crea un mini VSL de retargeting de 2 minutos",
      "¿Cómo agito el dolor de mi avatar en 15 segundos?",
    ],
    welcome: `¡Hola! Soy tu asistente de **Hooks y Mini VSL** de HotSelling.

Me especializo en guiones cortos y variaciones de inicio para que tus videos capturen la atención desde el primer segundo.

**Puedo ayudarte con:**
• Crear variaciones de hooks personalizados para tu nicho.
• Mini VSLs de retargeting (2-3 min).
• Clips cortos para redes sociales.
• Agitar el dolor de tu avatar en los primeros 15 segundos.

Cuéntame sobre tu carnada (avatar, dolor, promesa) y empezamos.`,
  },
  {
    id: "hotwriter-carnada",
    label: "Copy de Carnada",
    description: "Construye el copy de tu página de ventas",
    icon: FileText,
    color: "text-emerald-400",
    badgeColor: "bg-emerald-400/20",
    suggestions: [
      "Ayúdame a crear el headline de mi página de ventas",
      "¿Cómo estructuro los módulos de mi carnada?",
      "Necesito copy para el FAQ de objeciones",
    ],
    welcome: `¡Hola! Soy tu **Co-redactor de Carnada** de HotSelling.

Trabajamos juntos para crear el copy de tu página de ventas, desde el headline hasta el FAQ. Si tienes algo escrito, lo revisamos; si no, empezamos desde cero.

**Puedo ayudarte con:**
• Crear tu headline con la promesa aprobada en Fase 1.
• Estructurar los módulos con verbos de acción correctos.
• Optimizar la sección de oferta y precio.
• Crear un FAQ persuasivo que responda las objeciones de tu avatar.

¿Tienes copy para revisar o empezamos desde cero?`,
  },
  {
    id: "hotwriter-ads",
    label: "Anuncios Ads",
    description: "Crea copies para Facebook e Instagram Ads",
    icon: Megaphone,
    color: "text-rose-400",
    badgeColor: "bg-rose-400/20",
    suggestions: [
      "Necesito 3 copies de ad para tráfico frío",
      "Revisa este copy de anuncio que ya tengo",
      "¿Cómo conectar el ad con el mensaje de mi VSL?",
    ],
    welcome: `¡Hola! Soy tu **Co-creador de Anuncios** de HotSelling.

Me especializo en copy para Facebook e Instagram Ads que llevan a tu avatar directo al embudo. Primero generamos variaciones de hooks y tú eliges la dirección antes de completar el copy.

**Puedo ayudarte con:**
• Crear hooks y copies para tráfico frío.
• Variaciones para retargeting.
• Verificar coherencia entre tu ad, VSL y página.
• Optimizar el CTA y la estructura.

Cuéntame tu avatar, dolor principal y promesa de tu carnada.`,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  fileNames?: string[];
};

// ─── Markdown renderer ────────────────────────────────────────────────────────

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={key++} className="my-3 border-slate-200" />);
    } else if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={key++} className="mt-4 mb-1 text-base font-bold">
          {inlineMarkdown(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={key++} className="mt-3 mb-1 text-sm font-bold">
          {inlineMarkdown(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={key++} className="mt-2 mb-0.5 text-sm font-semibold">
          {inlineMarkdown(line.slice(4))}
        </h3>,
      );
    } else if (/^[•\-*] /.test(line)) {
      nodes.push(
        <div key={key++} className="ml-2 flex gap-2">
          <span className="mt-0.5 shrink-0 text-slate-400">•</span>
          <span>{inlineMarkdown(line.replace(/^[•\-*] /, ""))}</span>
        </div>,
      );
    } else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+)\. (.*)/);
      if (match) {
        nodes.push(
          <div key={key++} className="ml-2 flex gap-2">
            <span className="mt-0.5 w-4 shrink-0 text-right text-slate-400">
              {match[1]}.
            </span>
            <span>{inlineMarkdown(match[2])}</span>
          </div>,
        );
      }
    } else if (line.trim() === "") {
      nodes.push(<div key={key++} className="h-2" />);
    } else {
      nodes.push(
        <p key={key++} className="leading-relaxed">
          {inlineMarkdown(line)}
        </p>,
      );
    }
  }

  return nodes;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Main workspace component ─────────────────────────────────────────────────

const STORAGE_KEY = "hotselling-alumno-chat-v1";

function loadStoredMessages(): Record<string, ChatMessage[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
  } catch {
    return {};
  }
}

function saveStoredMessages(data: Record<string, ChatMessage[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded o modo privado — ignorar silenciosamente
  }
}

function CopyAlumnoWorkspace() {
  const [accessChecked, setAccessChecked] = useState<
    "loading" | "allowed" | "denied"
  >("loading");
  const [selectedAgentId, setSelectedAgentId] = useState(SUB_AGENTS[0].id);
  const [messagesByAgent, setMessagesByAgent] = useState<
    Record<string, ChatMessage[]>
  >(() => loadStoredMessages());
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ name: string; content: string }>
  >([]);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedAgent = SUB_AGENTS.find((a) => a.id === selectedAgentId)!;

  const messages: ChatMessage[] = messagesByAgent[selectedAgentId] ?? [
    { id: makeId(), role: "assistant", content: selectedAgent.welcome },
  ];

  // ─── Access check ──────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const token = getAuthToken();
      if (!token) {
        setAccessChecked("denied");
        return;
      }
      try {
        const res = await fetch("/api/agentes/copy-alumno/check-access", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        setAccessChecked(json?.allowed ? "allowed" : "denied");
      } catch {
        setAccessChecked("denied");
      }
    };
    check();
  }, []);

  useEffect(() => {
    saveStoredMessages(messagesByAgent);
  }, [messagesByAgent]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleAgentChange = (agentId: string) => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setSelectedAgentId(agentId);
    setDraft("");
    setAttachedFiles([]);
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setIsUploadingFile(true);

    const PARSEABLE_EXTS = /\.(docx|pdf)$/i;
    const UNSUPPORTED_EXTS = /\.(xlsx?|pptx?|doc)$/i;

    const results: Array<{ name: string; content: string }> = [];
    for (const file of files) {
      if (UNSUPPORTED_EXTS.test(file.name)) {
        results.push({
          name: file.name,
          content: `[⚠️ Formato no soportado: ${file.name}. Usa .docx, .pdf o copia el texto directamente.]`,
        });
        continue;
      }

      if (PARSEABLE_EXTS.test(file.name)) {
        if (file.size > 50 * 1024 * 1024) {
          results.push({
            name: file.name,
            content: `[⚠️ El archivo "${file.name}" es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). El límite es 50 MB. Intenta comprimir el PDF o copia el texto directamente.]`,
          });
          continue;
        }
        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/agentes/copy/parse-file", {
            method: "POST",
            body: form,
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            results.push({
              name: file.name,
              content: `[⚠️ No se pudo extraer el texto de "${file.name}": ${json.error ?? "Error desconocido"}]`,
            });
          } else {
            results.push({ name: file.name, content: json.text });
          }
        } catch {
          results.push({
            name: file.name,
            content: `[⚠️ Error al procesar "${file.name}". Intenta copiar el texto directamente.]`,
          });
        }
        continue;
      }

      try {
        const text = await file.text();
        if (!text.trim()) {
          results.push({
            name: file.name,
            content: `[⚠️ El archivo "${file.name}" está vacío o no tiene texto legible.]`,
          });
        } else {
          results.push({ name: file.name, content: text });
        }
      } catch {
        results.push({
          name: file.name,
          content: `[No se pudo leer: ${file.name}]`,
        });
      }
    }

    setAttachedFiles((prev) => [...prev, ...results]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploadingFile(false);
  };

  const handleSend = useCallback(
    async (preset?: string) => {
      const text = (preset ?? draft).trim();
      if ((!text && attachedFiles.length === 0) || isStreaming) return;

      let userContent = text;
      const fileNames: string[] = [];

      if (attachedFiles.length > 0) {
        const fileBlocks = attachedFiles.map((f) => {
          fileNames.push(f.name);
          return `\n\n--- ARCHIVO: ${f.name} ---\n${f.content}`;
        });
        userContent = (text || "Revisa este documento:") + fileBlocks.join("");
      }

      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content: text || `Archivo(s) adjunto(s): ${fileNames.join(", ")}`,
        fileNames: fileNames.length > 0 ? fileNames : undefined,
      };

      const updatedMessages = [...messages, userMsg];

      setMessagesByAgent((prev) => ({
        ...prev,
        [selectedAgentId]: updatedMessages,
      }));
      setDraft("");
      setAttachedFiles([]);
      setIsStreaming(true);

      const history = updatedMessages.map((m) => ({
        role: m.role,
        content: m.id === userMsg.id ? userContent : m.content,
      }));

      const assistantId = makeId();
      let accumulated = "";
      let rafHandle: ReturnType<typeof requestAnimationFrame> | null = null;

      const flushStreaming = () => {
        const snap = accumulated;
        setMessagesByAgent((prev) => {
          const current = prev[selectedAgentId] ?? [];
          return {
            ...prev,
            [selectedAgentId]: current.map((m) =>
              m.id === assistantId ? { ...m, content: snap } : m,
            ),
          };
        });
        rafHandle = null;
      };

      setMessagesByAgent((prev) => ({
        ...prev,
        [selectedAgentId]: [
          ...updatedMessages,
          { id: assistantId, role: "assistant", content: "" },
        ],
      }));

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const token = getAuthToken();
        const res = await fetch("/api/agentes/copy-alumno", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: history,
            agentType: selectedAgentId,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "Error desconocido");
          throw new Error(errText);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            let parsed: { text?: string; error?: string };
            try {
              parsed = JSON.parse(data) as { text?: string; error?: string };
            } catch {
              continue;
            }
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              if (rafHandle === null) {
                rafHandle = requestAnimationFrame(flushStreaming);
              }
            }
          }
        }

        if (rafHandle !== null) {
          cancelAnimationFrame(rafHandle);
          rafHandle = null;
        }
        flushStreaming();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const errorMsg =
          err instanceof Error
            ? err.message
            : "No se pudo conectar con el agente.";
        setMessagesByAgent((prev) => {
          const current = prev[selectedAgentId] ?? [];
          return {
            ...prev,
            [selectedAgentId]: current.map((m) =>
              m.id === assistantId
                ? { ...m, content: `⚠️ Error: ${errorMsg}` }
                : m,
            ),
          };
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [draft, attachedFiles, isStreaming, messages, selectedAgentId],
  );

  const AgentIcon = selectedAgent.icon;

  // ─── Access gate ───────────────────────────────────────────────────────────
  if (accessChecked === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg
          className="h-6 w-6 animate-spin text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    );
  }

  if (accessChecked === "denied") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
          <Lock className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Acceso exclusivo HotSelling Foundation / Starter
        </h2>
        <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Este agente está disponible solo para alumnos HotSelling Foundation o
          HotSelling Starter. Contacta a soporte si crees que esto es un error.
        </p>
        <Link
          href="/alumno/agentes"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Agentes
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 shadow-md">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div className="flex w-64 shrink-0 flex-col bg-[#0f0f0f] text-white">
        <div className="border-b border-white/10 px-4 py-4">
          <Link
            href="/alumno/agentes"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Agentes
          </Link>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                Tu Asistente HotSelling
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-white/30">
            Selecciona el agente
          </p>
          <div className="space-y-1">
            {SUB_AGENTS.map((agent) => {
              const Icon = agent.icon;
              const isActive = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => handleAgentChange(agent.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/55 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${agent.badgeColor}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${agent.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-medium ${isActive ? "text-white" : ""}`}
                      >
                        {agent.label}
                      </div>
                      <div className="truncate text-[10px] text-white/40">
                        {agent.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="text-center text-[10px] text-white/30">
            HotSelling Starter
          </div>
        </div>
      </div>

      {/* ── Chat panel ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-[#f7f7f8]">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${selectedAgent.badgeColor}`}
          >
            <AgentIcon className={`h-4 w-4 ${selectedAgent.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {selectedAgent.label}
            </p>
            <p className="text-xs text-slate-500">
              {selectedAgent.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Analizando…
              </div>
            )}
            <button
              type="button"
              title="Limpiar conversación"
              disabled={isStreaming}
              onClick={() => {
                abortRef.current?.abort();
                setIsStreaming(false);
                setMessagesByAgent((prev) => {
                  const next = { ...prev };
                  delete next[selectedAgentId];
                  return next;
                });
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
            {messages.map((message, idx) => {
              const isAssistant = message.role === "assistant";
              const isLast = idx === messages.length - 1;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isAssistant ? "" : "justify-end"}`}
                >
                  {isAssistant && (
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selectedAgent.badgeColor}`}
                    >
                      <Bot className={`h-4 w-4 ${selectedAgent.color}`} />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
                      isAssistant
                        ? "bg-white text-slate-900 shadow-sm"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    {message.fileNames && message.fileNames.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {message.fileNames.map((fn) => (
                          <span
                            key={fn}
                            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px]"
                          >
                            <FileText className="h-3 w-3" />
                            {fn}
                          </span>
                        ))}
                      </div>
                    )}
                    {isAssistant ? (
                      <div className="space-y-0.5">
                        {message.content ? (
                          renderMarkdown(message.content)
                        ) : isStreaming && isLast ? (
                          <div className="flex items-center gap-1.5 py-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomAnchorRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-3xl">
            {messages.length <= 1 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selectedAgent.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    disabled={isStreaming}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {isUploadingFile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                <svg
                  className="h-3.5 w-3.5 animate-spin text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Subiendo archivo…
              </div>
            )}

            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="max-w-50 truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedFiles((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="ml-0.5 rounded hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors focus-within:border-slate-400 focus-within:bg-white">
              <button
                type="button"
                title="Adjuntar documento"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isUploadingFile}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
              >
                {isUploadingFile ? (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.html,.json,.docx,.pdf"
                multiple
                className="hidden"
                onChange={handleFileAttach}
              />

              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  attachedFiles.length > 0
                    ? "Añade instrucciones sobre el archivo…"
                    : `Escribe al ${selectedAgent.label}…`
                }
                disabled={isStreaming}
                className="max-h-40 min-h-11 flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0 disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={
                  (!draft.trim() && attachedFiles.length === 0) || isStreaming
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Enter envía · Shift + Enter = nueva línea · Adjunta .txt, .md,
              .docx o .pdf
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CopyAlumnoPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <DashboardLayout>
        <CopyAlumnoWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
