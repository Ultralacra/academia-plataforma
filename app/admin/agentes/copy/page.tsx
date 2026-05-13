"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  FileText,
  Layers,
  Megaphone,
  Paperclip,
  Search,
  SendHorizonal,
  Sparkles,
  Trash2,
  TvMinimalPlay,
  User,
  Video,
  X,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";

// ─── Sub-agent definitions ────────────────────────────────────────────────────

type SubAgent = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
  phase: 1 | 2;
  suggestions: string[];
  welcome: string;
};

const SUB_AGENTS: SubAgent[] = [
  {
    id: "hotsystem",
    label: "Hotsystem",
    description: "Revisor de Fase 1 – Escalera de valor",
    icon: Layers,
    color: "text-amber-400",
    badgeColor: "bg-amber-400/20",
    phase: 2,
    suggestions: [
      "Subir documento de Fase 1 para revisión completa",
      "Revisa mi promesa de carnada",
      "¿Mi order bump cumple los criterios de HotSelling?",
    ],
    welcome: `¡Hola! Soy el **Agente Revisor de Fase 1** de HotSelling — tu guardián de calidad estratégico.

Mi función es revisar tu documento de Fase 1 aplicando los criterios y estándares de la metodología HotSelling, para asegurar que tu ecosistema tenga los cimientos sólidos necesarios antes de avanzar a Fase 2.

**Cómo trabajar conmigo:**
• Sube tu documento de Fase 1 (PDF o texto) para una revisión completa de las 6 tareas.
• O pega directamente el texto de cualquier tarea que quieras revisar.
• También puedes hacerme preguntas específicas sobre los criterios del programa.

¿Qué necesitas revisar hoy?`,
  },
  {
    id: "hotwriter-vsl",
    label: "Hotwriter VSL",
    description: "Script de VSL Long Form",
    icon: Video,
    color: "text-violet-400",
    badgeColor: "bg-violet-400/20",
    phase: 2,
    suggestions: [
      "Revisa mi hook y epifanía",
      "¿Mi mecanismo único está bien construido?",
      "Ayúdame a estructurar el bloque de alternativas fallidas",
    ],
    welcome: `¡Hola! Soy el **Agente Hotwriter VSL** de HotSelling.

Estoy especializado en la creación y revisión de guiones de Video Sales Letter de formato largo para tu embudo de ventas.

**Puedo ayudarte con:**
• Revisar tu guión VSL completo (pégalo o sube el archivo).
• Estructurar el mecanismo único del problema.
• Construir hooks y variaciones de inicio.
• Optimizar la epifanía y la historia del experto.
• Asegurar la lógica de solución y el cierre de oferta.

¿En qué parte de tu VSL estás trabajando?`,
  },
  {
    id: "hotwriter-vsl-largo",
    label: "Revisor VSL Largo",
    description: "Revisión completa VSL Fase 2 (hasta 18 min)",
    icon: Clapperboard,
    color: "text-purple-400",
    badgeColor: "bg-purple-400/20",
    phase: 2,
    suggestions: [
      "Revisa mi VSL completo de Fase 2",
      "¿Mi Hook cumple los criterios?",
      "Revisa el MUP y MUS de mi guión",
    ],
    welcome: `¡Hola! Soy el **Agente Revisor de VSL Largo** de HotSelling.

Mi función es revisar cada bloque de tu guión de VSL largo (Fase 2) verificando que cada sección cumple su objetivo estratégico dentro de la metodología HotSelling.

**Para iniciar la revisión necesito:**
• Tu documento de **Fase 1 aprobado** (escalera de valor, promesa, mecanismo, alternativas del MUP).
• El **guión completo** de tu VSL (o la sección que quieras revisar).
• Si tu formato es **EN VIVO o PREGRABADO**.

**Puedo ayudarte con:**
• Revisar los 6 bloques: Hook, Background Story, MUP, MUS, Construcción del producto y Close.
• Verificar tiempos y extensión (el VSL completo debe durar máximo 18 minutos).
• Detectar open loops sin cerrar e incoherencias narrativas.
• Señalar qué resumir si el VSL es muy extenso (sin sacrificar los mecanismos).

Comparte tu guión y empezamos bloque por bloque.`,
  },
  {
    id: "hotwriter-vsl-corto",
    label: "Revisor VSL Corto",
    description: "Revisión completa VSL Corto Fase 2",
    icon: Clapperboard,
    color: "text-fuchsia-400",
    badgeColor: "bg-fuchsia-400/20",
    phase: 2,
    suggestions: [
      "Revisa mi VSL corto de Fase 2",
      "¿Mi Hook cumple los criterios del VSL corto?",
      "Revisa el MUP y MUS de mi guión corto",
    ],
    welcome: `¡Hola! Soy el **Agente Revisor de VSL Corto** de HotSelling.

Mi función es revisar cada bloque de tu guión de VSL Corto (Fase 2) con sus partes y subpartes, verificando que cada sección cumple su objetivo estratégico dentro de la metodología HotSelling.

**Para iniciar la revisión necesito:**
• Tu documento de **Fase 1 aprobado** (escalera de valor, promesa, mecanismo, alternativas del MUP).
• Tu documento de **Fase 2 con el VSL** (guión completo o sección a revisar).
• Si el evento será **EN VIVO o PREGRABADO**.

**Reviso los 5 bloques del VSL Corto:**
• Hook / Lead — generar curiosidad y vender el video.
• Background Story — identificación y vínculo emocional.
• MUP — mecanismo único del problema.
• MUS — mecanismo único de la solución.
• Close / Oferta + FAQs — escasez, urgencia y oferta irresistible.

**También verifico:** tiempos por bloque, coherencia global, cierre de open loops, tono conversacional y dónde resumir sin sacrificar MUP/MUS.

Comparte tus documentos y empezamos bloque por bloque.`,
  },
  {
    id: "hotwriter-mini-vsl",
    label: "Hotwriter Mini VSL",
    description: "Script de Mini VSL y Hooks",
    icon: TvMinimalPlay,
    color: "text-sky-400",
    badgeColor: "bg-sky-400/20",
    phase: 2,
    suggestions: [
      "Necesito 5 variaciones de hook para mi carnada",
      "Revisa este mini VSL de 2 minutos",
      "¿Cómo agitar el dolor en solo 30 segundos?",
    ],
    welcome: `¡Hola! Soy el **Agente Hotwriter Mini VSL** de HotSelling.

Estoy especializado en guiones cortos, hooks de alto impacto y variaciones de inicio para tus videos.

**Puedo ayudarte con:**
• Crear variaciones de hooks para tu VSL principal.
• Estructurar mini VSLs de retargeting (2-3 min).
• Clips cortos para redes sociales.
• Agitar el dolor del avatar en los primeros 15 segundos.

Comparte el contexto de tu carnada (avatar, dolor, promesa) y empezamos.`,
  },
  {
    id: "hotwriter-carnada",
    label: "Hotwriter Carnada",
    description: "Copy de página del carnada",
    icon: FileText,
    color: "text-emerald-400",
    badgeColor: "bg-emerald-400/20",
    phase: 2,
    suggestions: [
      "Revisa el headline de mi página de ventas",
      "¿Mi sección de módulos está bien estructurada?",
      "Necesito copy para el FAQ de objeciones",
    ],
    welcome: `¡Hola! Soy el **Agente Hotwriter Carnada** de HotSelling.

Estoy especializado en el copy de páginas de venta del producto carnada (low ticket), desde el headline hasta el FAQ.

**Puedo ayudarte con:**
• Revisar o crear el headline y subheadline de tu página.
• Estructurar los módulos con verbos de acción correctos.
• Optimizar la sección de oferta y anclaje de precio.
• Crear un FAQ persuasivo que derrumbe objeciones.
• Verificar la coherencia con tu promesa aprobada en Fase 1.

Sube tu página o comparte el contenido para empezar.`,
  },
  {
    id: "hotwriter-ads",
    label: "Hotwriter Ads",
    description: "Scripts para anuncios",
    icon: Megaphone,
    color: "text-rose-400",
    badgeColor: "bg-rose-400/20",
    phase: 2,
    suggestions: [
      "Necesito 3 copies de ad para tráfico frío",
      "Revisa este copy de ad que ya tengo",
      "¿Cómo conectar el ad con el mensaje del VSL?",
    ],
    welcome: `¡Hola! Soy el **Agente Hotwriter Ads** de HotSelling.

Estoy especializado en copy para anuncios de Facebook e Instagram Ads que llevan al avatar directo al embudo de ventas.

**Puedo ayudarte con:**
• Generar hooks y copies de ads para tráfico frío.
• Crear variaciones para campañas de retargeting.
• Verificar la coherencia de mensaje entre el ad, el VSL y la página.
• Optimizar el CTA y la estructura del copy.

Dime el avatar, el dolor principal y la promesa de tu carnada, y generamos los primeros ads.`,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  fileNames?: string[];
  context?: {
    ticketCount: number;
    loomCount: number;
    ticketIds: string[];
    previews?: Array<{
      codigo: string;
      nombre: string;
      fecha: string;
      estado: string;
      consulta: string;
      respuestaCoach: string;
      looms: Array<{ id: string; transcript: string | null }>;
    }>;
  };
};

// ─── Ticket citation badge ────────────────────────────────────────────────────

function TicketCitationBadge({ codigo }: { codigo: string }) {
  return (
    <span className="group relative inline-block align-middle mx-0.5">
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-mono font-medium text-amber-700 cursor-default select-none">
        📋 {codigo}
      </span>
      <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-50 w-56 scale-95 rounded-xl bg-slate-800 text-white text-[11px] px-3 py-2.5 shadow-xl opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
        <span className="font-semibold text-white block">
          Ticket referenciado
        </span>
        <span className="text-slate-300 font-mono block mt-0.5">{codigo}</span>
        <span className="text-slate-400 block mt-1 text-[10px]">
          Este fragmento se basó en el historial del alumno
        </span>
      </span>
    </span>
  );
}

// ─── Student picker popover ───────────────────────────────────────────────────

type StudentOption = { code: string; name: string };

function StudentPickerPopover({
  onSelect,
  onClose,
}: {
  onSelect: (s: StudentOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    apiFetch<any>(
      `/client/get/clients?search=${encodeURIComponent(query)}&pageSize=20`,
    )
      .then((res) => {
        const items: any[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.data?.items)
                ? res.data.items
                : [];
        setResults(
          items.map((c) => ({
            code: String(c.codigo ?? c.id ?? ""),
            name: String(c.nombre ?? c.name ?? c.email ?? c.codigo ?? ""),
          })),
        );
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, doSearch]);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar alumno por nombre o código..."
          className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        />
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {loading && (
          <div className="px-3 py-2 text-sm text-slate-400">Buscando...</div>
        )}
        {!loading && q.trim() && results.length === 0 && (
          <div className="px-3 py-2 text-sm text-slate-400">Sin resultados</div>
        )}
        {!loading && !q.trim() && (
          <div className="px-3 py-2 text-sm text-slate-400">
            Escribe para buscar alumnos
          </div>
        )}
        {results.map((r) => (
          <button
            key={r.code}
            type="button"
            onClick={() => onSelect(r)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
          >
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800 flex-1 truncate">
              {r.name}
            </span>
            <span className="text-xs text-slate-400 font-mono shrink-0">
              {r.code}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[TICKET:[^\]]+\])/g,
  );
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
    const ticketMatch = part.match(/^\[TICKET:([^\]]+)\]$/);
    if (ticketMatch) {
      return <TicketCitationBadge key={i} codigo={ticketMatch[1]} />;
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

const STORAGE_KEY = "hotselling-chat-v1";

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
    // quota exceeded or private mode — silently ignore
  }
}

function CopyAgentWorkspace() {
  const [selectedAgentId, setSelectedAgentId] = useState(SUB_AGENTS[0].id);
  const [expandedPhases, setExpandedPhases] = useState<Record<1 | 2, boolean>>({
    1: true,
    2: true,
  });
  const [messagesByAgent, setMessagesByAgent] = useState<
    Record<string, ChatMessage[]>
  >(() => loadStoredMessages());
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ name: string; content: string }>
  >([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    null,
  );
  const [studentCmdOpen, setStudentCmdOpen] = useState(false);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedAgent = SUB_AGENTS.find((a) => a.id === selectedAgentId)!;

  const messages: ChatMessage[] = messagesByAgent[selectedAgentId] ?? [
    { id: makeId(), role: "assistant", content: selectedAgent.welcome },
  ];

  // Persist every time messages change
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
      // rAF batching: actualizar React máximo a 60fps en lugar de por cada token
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

        const authToken = getAuthToken();
        const res = await fetch("/api/agentes/copy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            messages: history,
            agentType: selectedAgentId,
            provider: localStorage.getItem("agents-ai-provider") ?? "openai",
            alumnoCode: selectedStudent?.code,
            alumnoName: selectedStudent?.name,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "Error desconocido");
          throw new Error(errText);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          // Eventos SSE están separados por línea en blanco (\n\n).
          // Pero también soportamos línea por línea cuando hay un único campo data.
          // Procesamos líneas completas (terminadas en \n) y dejamos el resto en el buffer.
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? ""; // última línea posiblemente incompleta

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            let parsed: {
              text?: string;
              error?: string;
              type?: string;
              ticketCount?: number;
              loomCount?: number;
              ticketIds?: string[];
              previews?: unknown;
            };
            try {
              parsed = JSON.parse(data);
            } catch (parseErr) {
              console.warn(
                "[copy-agent][sse] línea JSON malformada (descartada):",
                parseErr,
                "data preview:",
                data.slice(0, 200),
              );
              continue;
            }
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.type === "context") {
              const ctx = {
                ticketCount: Number(parsed.ticketCount ?? 0),
                loomCount: Number(parsed.loomCount ?? 0),
                ticketIds: Array.isArray(parsed.ticketIds)
                  ? parsed.ticketIds.map((x) => String(x))
                  : [],
                previews: Array.isArray(parsed.previews)
                  ? (parsed.previews as NonNullable<
                      ChatMessage["context"]
                    >["previews"])
                  : [],
              };
              console.log("[copy-agent][context] recibido:", {
                ticketCount: ctx.ticketCount,
                loomCount: ctx.loomCount,
                ticketIds: ctx.ticketIds,
                previewsCount: ctx.previews?.length ?? 0,
              });
              if (ctx.previews && ctx.previews.length > 0) {
                console.log(
                  "[copy-agent][context] previews detallados:",
                  ctx.previews,
                );
              }
              setMessagesByAgent((prev) => {
                const current = prev[selectedAgentId] ?? [];
                return {
                  ...prev,
                  [selectedAgentId]: current.map((m) =>
                    m.id === assistantId ? { ...m, context: ctx } : m,
                  ),
                };
              });
              continue;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              // Programar flush solo si no hay uno pendiente
              if (rafHandle === null) {
                rafHandle = requestAnimationFrame(flushStreaming);
              }
            }
          }
        }
        // Cancelar rAF pendiente y hacer flush final con texto completo
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

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 shadow-md">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div className="flex w-64 shrink-0 flex-col bg-[#0f0f0f] text-white">
        <div className="border-b border-white/10 px-4 py-4">
          <Link
            href="/admin/agentes"
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
              <div className="text-sm font-semibold">Agentes HotSelling</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-white/30">
            Selecciona el agente
          </p>
          <div className="space-y-3">
            {([1, 2] as const).map((phase) => {
              const phaseAgents = SUB_AGENTS.filter((a) => a.phase === phase);
              if (phaseAgents.length === 0) return null;
              const isOpen = expandedPhases[phase];
              return (
                <div key={phase}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPhases((prev) => ({
                        ...prev,
                        [phase]: !prev[phase],
                      }))
                    }
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex items-center gap-1.5">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      Fase {phase}
                    </span>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/60">
                      {phaseAgents.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-1 space-y-1">
                      {phaseAgents.map((agent) => {
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
                                <Icon
                                  className={`h-3.5 w-3.5 ${agent.color}`}
                                />
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
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="text-center text-[10px] text-white/30">
            claude-sonnet-4-5 · HotSelling
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
            {selectedStudent && (
              <div className="flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[11px] text-violet-700">
                <User className="h-3 w-3 shrink-0" />
                <span className="max-w-[120px] truncate font-medium">
                  {selectedStudent.name}
                </span>
                <span className="text-violet-400 font-mono text-[10px]">
                  {selectedStudent.code}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="ml-0.5 text-violet-400 hover:text-violet-600"
                  title="Quitar contexto de alumno"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {isStreaming && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Analizando...
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
                    {isAssistant &&
                      message.context &&
                      (message.context.ticketCount > 0 ||
                        message.context.loomCount > 0) && (
                        <details className="mb-2 rounded-lg border border-violet-200 bg-violet-50 group/ctx">
                          <summary className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 cursor-pointer list-none select-none">
                            <span className="text-xs font-medium text-violet-700">
                              🧠 Contexto del alumno analizado
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-200">
                              📋 {message.context.ticketCount} ticket
                              {message.context.ticketCount === 1 ? "" : "s"}
                            </span>
                            {message.context.loomCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-200">
                                🎬 {message.context.loomCount} Loom
                                {message.context.loomCount === 1
                                  ? ""
                                  : "s"}{" "}
                                transcrito
                                {message.context.loomCount === 1 ? "" : "s"}
                              </span>
                            )}
                            <span className="ml-auto text-[10px] text-violet-600 font-medium">
                              <span className="group-open/ctx:hidden">
                                ▸ ver detalle
                              </span>
                              <span className="hidden group-open/ctx:inline">
                                ▾ ocultar
                              </span>
                            </span>
                          </summary>
                          {Array.isArray(message.context.previews) &&
                            message.context.previews.length > 0 && (
                              <div className="border-t border-violet-200 px-2.5 py-2 space-y-3 max-h-96 overflow-y-auto bg-white/60">
                                {message.context.previews.map((p, idx) => (
                                  <div
                                    key={`${p.codigo}-${idx}`}
                                    className="rounded-md border border-violet-200 bg-white p-2 text-[11px] text-slate-700 space-y-1.5"
                                  >
                                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-1">
                                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-700">
                                        📋 {p.codigo}
                                      </span>
                                      <span className="font-semibold text-slate-800 truncate max-w-50">
                                        {p.nombre}
                                      </span>
                                      {p.estado && (
                                        <span className="text-[10px] rounded bg-slate-100 px-1 py-0.5 text-slate-600">
                                          {p.estado}
                                        </span>
                                      )}
                                      {p.fecha && (
                                        <span className="text-[10px] text-slate-400">
                                          {p.fecha}
                                        </span>
                                      )}
                                    </div>
                                    {p.consulta && (
                                      <div>
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                          Consulta del alumno
                                        </span>
                                        <p className="text-slate-700 whitespace-pre-wrap leading-snug mt-0.5">
                                          {p.consulta}
                                        </p>
                                      </div>
                                    )}
                                    {p.respuestaCoach && (
                                      <div className="rounded bg-emerald-50 border border-emerald-200 px-2 py-1.5">
                                        <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                                          ✓ Respuesta Coach
                                        </span>
                                        <p className="text-slate-800 whitespace-pre-wrap leading-snug mt-0.5">
                                          {p.respuestaCoach}
                                        </p>
                                      </div>
                                    )}
                                    {Array.isArray(p.looms) &&
                                      p.looms.length > 0 && (
                                        <div className="space-y-1">
                                          {p.looms.map((l, j) => (
                                            <div
                                              key={`${l.id}-${j}`}
                                              className={`rounded px-2 py-1.5 border ${
                                                l.transcript
                                                  ? "bg-violet-50 border-violet-200"
                                                  : "bg-slate-50 border-slate-200"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                                                <span
                                                  className={
                                                    l.transcript
                                                      ? "text-violet-700"
                                                      : "text-slate-500"
                                                  }
                                                >
                                                  🎬 Loom del coach
                                                </span>
                                                <a
                                                  href={`https://www.loom.com/share/${l.id}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-violet-600 hover:underline font-mono normal-case"
                                                >
                                                  {l.id.slice(0, 8)}…
                                                </a>
                                                {!l.transcript && (
                                                  <span className="text-[9px] text-slate-500 normal-case">
                                                    (sin transcripción
                                                    disponible)
                                                  </span>
                                                )}
                                              </div>
                                              {l.transcript && (
                                                <p className="text-slate-700 leading-snug mt-1 whitespace-pre-wrap">
                                                  {l.transcript.length > 800
                                                    ? `${l.transcript.slice(0, 800)}…`
                                                    : l.transcript}
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                ))}
                              </div>
                            )}
                        </details>
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
                Subiendo archivo...
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
                    <span className="max-w-[200px] truncate">{f.name}</span>
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

            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors focus-within:border-slate-400 focus-within:bg-white relative">
              {studentCmdOpen && (
                <StudentPickerPopover
                  onSelect={(s) => {
                    setSelectedStudent(s);
                    setStudentCmdOpen(false);
                    setDraft((prev) => prev.replace(/\/alumno/gi, "").trim());
                  }}
                  onClose={() => {
                    setStudentCmdOpen(false);
                    setDraft((prev) => prev.replace(/\/alumno/gi, "").trim());
                  }}
                />
              )}
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
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft(val);
                  if (val.includes("/alumno") && !studentCmdOpen) {
                    setStudentCmdOpen(true);
                  }
                }}
                placeholder={
                  attachedFiles.length > 0
                    ? "Añade instrucciones sobre el archivo…"
                    : `Escribe al ${selectedAgent.label}… (tip: escribe /alumno para añadir contexto)`
                }
                disabled={isStreaming}
                className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0 disabled:opacity-60"
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
              Enter envía · Shift + Enter = nueva línea · Adjunta .txt, .md u
              otros archivos de texto
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CopyAgentPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "coach"]}>
      <DashboardLayout>
        <CopyAgentWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
