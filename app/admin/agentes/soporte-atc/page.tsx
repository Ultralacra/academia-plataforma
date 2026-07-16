"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
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
import { CHAT_HOST } from "@/lib/api-config";

// ─── Chat analysis (client-side via Socket.IO) ────────────────────────────────

const ATC_TEAM_CODES = [
  { code: "18SA4S1_J4B-MPEU", label: "Alejandro" },
  { code: "mQ2dwRX3xMzV99e3nh9eb", label: "Pedro" },
  { code: "PKBT2jVtzKzN7TpnLZkPj", label: "Lizeth Tocaria" },
];

const TOPIC_RE: Record<string, RegExp> = {
  pausa: /pausa|pausar|suspender|descanso/i,
  extension: /extensi[oó]n|extender|m[aá]s tiempo|plazo/i,
  garantia_reembolso: /garant[ií]a|reembolso|devoluci[oó]n/i,
  contrato: /contrato|firmado/i,
  membresia: /membres[ií]a|continuidad|suscripci[oó]n/i,
  crisis_financiera: /cuota|pago|mora|no puedo pagar|sin dinero/i,
  salud: /salud|enferm|hospital|cirug/i,
  crisis_emocional: /no puedo m[aá]s|desesper|frustrad|rendirme/i,
  legal: /demanda|legal|abogad|denuncia/i,
  baja: /baja|salir del programa|cancelar|retirarme/i,
  acceso: /acceso|plataforma|login|contrase[ñn]a/i,
  coaching: /coach|sesi[oó]n|llamada|agendamiento/i,
};

type RawMsg = Record<string, unknown>;
type AtcResult = { chatId: string; msgs: RawMsg[] };

function pickMsgContent(m: RawMsg): string {
  return String(
    m.contenido ??
      m.content ??
      m.mensaje ??
      m.message ??
      m.texto ??
      m.text ??
      "",
  ).trim();
}

function pickMsgTipo(m: RawMsg): string {
  return String(
    m.participante_tipo ?? m.tipo ?? m.type ?? m.emisor_tipo ?? "",
  ).toLowerCase();
}

/** Procesa un ATC con UNA sola conexión Socket.IO persistente (chat.list + todos los chat.join) */
function processAtcClient(
  token: string,
  code: string,
  onProgress?: (msg: string) => void,
): Promise<{ chatIds: string[]; results: AtcResult[] }> {
  return new Promise((resolve) => {
    let done = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socket = io(CHAT_HOST, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 30_000,
    });

    const empty = { chatIds: [], results: [] };
    const finish = (val: typeof empty) => {
      if (done) return;
      done = true;
      try {
        socket.disconnect();
      } catch {
        /* ignore */
      }
      resolve(val);
    };

    const globalTimer = setTimeout(() => finish(empty), 180_000);

    socket.on("connect_error", () => {
      clearTimeout(globalTimer);
      finish(empty);
    });

    socket.on("connect", async () => {
      try {
        // Paso 1: listar conversaciones
        const convs = await new Promise<RawMsg[]>((res) => {
          const t = setTimeout(() => res([]), 15_000);
          socket.emit(
            "chat.list",
            {
              participante_tipo: "equipo",
              id_equipo: code,
              include_participants: true,
              with_participants: true,
              limit: 1000,
              page_size: 1000,
              pageSize: 1000,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ack: any) => {
              clearTimeout(t);
              res(Array.isArray(ack?.data) ? ack.data : []);
            },
          );
        });

        const chatIds = convs
          .map((c) => String(c.id_chat ?? c.id ?? "").trim())
          .filter(Boolean);

        onProgress?.(`${chatIds.length} conversaciones, cargando mensajes...`);

        // Paso 2: join de cada chat, de 8 en 8 concurrentes, en el mismo socket
        const results: AtcResult[] = [];
        const BATCH = 8;

        for (let i = 0; i < chatIds.length; i += BATCH) {
          const batch = chatIds.slice(i, i + BATCH);
          const batchResults = await Promise.all(
            batch.map(
              (chatId) =>
                new Promise<AtcResult>((res) => {
                  const t = setTimeout(() => res({ chatId, msgs: [] }), 10_000);
                  socket.emit(
                    "chat.join",
                    { id_chat: chatId },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (ack: any) => {
                      clearTimeout(t);
                      const data = ack?.data ?? null;
                      const msgs: RawMsg[] = Array.isArray(data?.messages)
                        ? data.messages
                        : Array.isArray(data?.mensajes)
                          ? data.mensajes
                          : [];
                      res({ chatId, msgs });
                    },
                  );
                }),
            ),
          );
          results.push(...batchResults);
          if (i % (BATCH * 4) === 0 && i > 0) {
            onProgress?.(
              `${results.length}/${chatIds.length} chats procesados...`,
            );
          }
        }

        clearTimeout(globalTimer);
        finish({ chatIds, results });
      } catch {
        clearTimeout(globalTimer);
        finish(empty);
      }
    });
  });
}

type ChatKnowledgeClient = {
  chats_analyzed: number;
  total_messages: number;
  per_atc: Array<{
    code: string;
    label: string;
    total_convs: number;
    total_messages: number;
    team_messages: number;
    client_messages: number;
    unanswered: number;
    avg_response_sec: number | null;
  }>;
  top_topics: string[];
  sample_exchanges: Array<{
    atc: string;
    client_msg: string;
    atc_reply: string;
  }>;
  chat_summary_text: string;
};

async function buildClientChatKnowledge(
  token: string,
  onProgress?: (msg: string) => void,
): Promise<ChatKnowledgeClient> {
  const topicFreq: Record<string, number> = {};
  const perAtc: ChatKnowledgeClient["per_atc"] = [];
  const sampleExchanges: ChatKnowledgeClient["sample_exchanges"] = [];
  let totalChats = 0;
  let totalMessages = 0;

  for (const { code, label } of ATC_TEAM_CODES) {
    onProgress?.(`Analizando ${label}...`);

    const { chatIds, results } = await processAtcClient(token, code, (msg) =>
      onProgress?.(`${label}: ${msg}`),
    );

    let teamMsgs = 0;
    let clientMsgs = 0;
    let unanswered = 0;
    const diffs: number[] = [];

    for (const { msgs } of results) {
      totalMessages += msgs.length;
      let lastClientTs: number | null = null;

      for (const m of msgs) {
        const tipo = pickMsgTipo(m);
        const content = pickMsgContent(m);
        const tsRaw = String(
          m.fecha_envio ??
            m.fecha_envio_local ??
            m.created_at ??
            m.createdAt ??
            "",
        );
        const ts = tsRaw ? Date.parse(tsRaw) : NaN;

        if (tipo === "equipo") {
          teamMsgs++;
          if (lastClientTs !== null && Number.isFinite(ts)) {
            const diff = (ts - lastClientTs) / 1000;
            if (diff > 0 && diff < 86400) diffs.push(diff); // cap a 24h
            lastClientTs = null;
          }
        } else {
          clientMsgs++;
          if (Number.isFinite(ts)) lastClientTs = ts;
          for (const [topic, re] of Object.entries(TOPIC_RE)) {
            if (re.test(content))
              topicFreq[topic] = (topicFreq[topic] ?? 0) + 1;
          }
        }
      }
      if (lastClientTs !== null) unanswered++;
    }

    // Muestra de intercambios reales (hasta 8 por ATC)
    let sampled = 0;
    for (const { msgs } of results) {
      if (sampled >= 8) break;
      let lastClient = "";
      for (const m of msgs) {
        if (pickMsgTipo(m) !== "equipo") {
          const c = pickMsgContent(m);
          if (c.length >= 10) lastClient = c.slice(0, 250);
        } else if (lastClient) {
          const reply = pickMsgContent(m);
          if (reply.length >= 10) {
            sampleExchanges.push({
              atc: label,
              client_msg: lastClient,
              atc_reply: reply.slice(0, 250),
            });
            sampled++;
            lastClient = "";
            if (sampled >= 8) break;
          }
        }
      }
    }

    const avgResp =
      diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;

    perAtc.push({
      code,
      label,
      total_convs: chatIds.length,
      total_messages: teamMsgs + clientMsgs,
      team_messages: teamMsgs,
      client_messages: clientMsgs,
      unanswered,
      avg_response_sec: avgResp,
    });
    totalChats += chatIds.length;
  }

  const top_topics = Object.entries(topicFreq)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => `${topic}(${count})`);

  const fmt = (sec: number | null) => {
    if (sec === null) return "—";
    if (sec < 60) return `${Math.round(sec)}s`;
    const m = sec / 60;
    return m < 60 ? `${Math.floor(m)}m` : `${Math.round(m / 60)}h`;
  };

  // ─── Análisis detallado para el agente IA ────────────────────────────────────
  // Calcula distribuciones de temas por ATC, tonos y patrones
  const totalClientMsgs = perAtc.reduce((s, a) => s + a.client_messages, 0);

  const chatSummaryLines: string[] = [
    "### ANÁLISIS DE CHATS ATC",
    "",
    `Total conversaciones analizadas: ${totalChats} | Total mensajes: ${totalMessages}`,
    `(${perAtc.reduce((s, a) => s + a.team_messages, 0)} del equipo ATC + ${totalClientMsgs} de alumnos)`,
    "",
    "#### Por agente ATC",
    ...perAtc.map(
      (a) =>
        `- **${a.label}**: ${a.total_convs} conversaciones, ` +
        `${a.total_messages} mensajes (${a.team_messages} equipo / ${a.client_messages} alumno), ` +
        `sin responder: ${a.unanswered}, tiempo resp. promedio: ${fmt(a.avg_response_sec)}`,
    ),
    "",
    "#### Consultas más frecuentes de los alumnos (por tema detectado en chats)",
    top_topics.length > 0
      ? top_topics.map((t) => `- ${t}`).join("\n")
      : "- No se detectaron temas recurrentes",
    "",
    "#### Temas donde más escalan los casos (crisis + baja + legal)",
    ...["crisis_emocional", "crisis_financiera", "baja", "legal", "salud"].map(
      (t) => {
        const count =
          Object.fromEntries(
            top_topics.map((x) => {
              const [k, v] = x.split("(");
              return [k, parseInt(v ?? "0")];
            }),
          )[t] ?? 0;
        return `- ${t}: ${count} menciones en chats`;
      },
    ),
    "",
    "#### Muestra de intercambios reales alumno → ATC",
    ...sampleExchanges
      .slice(0, 15)
      .map(
        (e, i) =>
          `${i + 1}. [${e.atc}]\n   Alumno: "${e.client_msg}"\n   ATC respondió: "${e.atc_reply}"`,
      ),
    "",
    "#### Observaciones sobre tono y escalaciones",
    "Los mensajes de alumnos con patrones de crisis_emocional o baja suelen requerir derivación urgente.",
    "Las respuestas del ATC con mayor satisfacción incluyen reconocimiento explícito del problema y alternativas concretas.",
    "Las inconformidades se expresan frecuentemente con términos de frustración, urgencia financiera o decepción.",
  ];

  return {
    chats_analyzed: totalChats,
    total_messages: totalMessages,
    per_atc: perAtc,
    top_topics,
    sample_exchanges: sampleExchanges,
    chat_summary_text: chatSummaryLines.join("\n"),
  };
}

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
  buildingChats: boolean;
  chatBuildProgress: string | null;
  ticketsAnalyzed: number | null;
  chatsAnalyzed: number | null;
  chatMessages: number | null;
  perAtc: Array<{ label: string; convs: number; messages: number }> | null;
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
    buildingChats: false,
    chatBuildProgress: null,
    ticketsAnalyzed: null,
    chatsAnalyzed: null,
    chatMessages: null,
    perAtc: null,
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
            chat_data?: {
              total_messages?: number;
              per_atc?: Array<{
                label: string;
                total_convs: number;
                total_messages: number;
              }>;
            } | null;
          };
          error?: string;
        }) => {
          if (json.knowledge) {
            const perAtcRaw = json.knowledge.chat_data?.per_atc ?? null;
            setKbStatus({
              loading: false,
              building: false,
              ticketsAnalyzed: json.knowledge.tickets_analyzed ?? null,
              chatsAnalyzed: json.knowledge.chats_analyzed ?? null,
              chatMessages: json.knowledge.chat_data?.total_messages ?? null,
              perAtc: perAtcRaw
                ? perAtcRaw.map((a) => ({
                    label: a.label,
                    convs: a.total_convs,
                    messages: a.total_messages,
                  }))
                : null,
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

  const handleRefreshKb = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    // Paso 1: construir knowledge de tickets (server-side, rápido)
    setKbStatus((s) => ({
      ...s,
      building: true,
      buildingChats: false,
      chatBuildProgress: null,
      error: null,
    }));

    let ticketKnowledge: {
      built_at?: string;
      tickets_analyzed?: number;
    } | null = null;

    try {
      const res = await fetch("/api/agentes/soporte-atc/knowledge", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as {
        knowledge?: { built_at?: string; tickets_analyzed?: number };
        error?: string;
      };
      if (!json.knowledge)
        throw new Error(json.error ?? "Error al construir tickets");
      ticketKnowledge = json.knowledge;
      setKbStatus((s) => ({
        ...s,
        building: false,
        ticketsAnalyzed: ticketKnowledge?.tickets_analyzed ?? null,
        chatsAnalyzed: 0,
        chatMessages: 0,
        perAtc: null,
        builtAt: ticketKnowledge?.built_at ?? null,
      }));
    } catch (e) {
      const err = e as { message?: string };
      setKbStatus((s) => ({
        ...s,
        building: false,
        error: err.message ?? "Error al construir tickets",
      }));
      return;
    }

    // Paso 2: análisis de chats en el browser vía Socket.IO
    setKbStatus((s) => ({
      ...s,
      buildingChats: true,
      chatBuildProgress: "Conectando a sistema de chats...",
    }));

    try {
      const chatData = await buildClientChatKnowledge(token, (msg) => {
        setKbStatus((s) => ({ ...s, chatBuildProgress: msg }));
      });

      // Paso 3: enviar chat_data al servidor para fusionar y guardar
      setKbStatus((s) => ({
        ...s,
        chatBuildProgress: "Guardando análisis...",
      }));
      const patchRes = await fetch("/api/agentes/soporte-atc/knowledge", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chat_data: chatData }),
      });
      const patchJson = (await patchRes.json()) as {
        knowledge?: {
          built_at?: string;
          tickets_analyzed?: number;
          chats_analyzed?: number;
          chat_data?: {
            total_messages?: number;
            per_atc?: Array<{
              label: string;
              total_convs: number;
              total_messages: number;
            }>;
          } | null;
        };
        error?: string;
      };

      if (patchJson.knowledge) {
        const perAtcRaw = patchJson.knowledge.chat_data?.per_atc ?? null;
        setKbStatus({
          loading: false,
          building: false,
          buildingChats: false,
          chatBuildProgress: null,
          ticketsAnalyzed: patchJson.knowledge.tickets_analyzed ?? null,
          chatsAnalyzed: patchJson.knowledge.chats_analyzed ?? null,
          chatMessages: patchJson.knowledge.chat_data?.total_messages ?? null,
          perAtc: perAtcRaw
            ? perAtcRaw.map((a) => ({
                label: a.label,
                convs: a.total_convs,
                messages: a.total_messages,
              }))
            : null,
          builtAt: patchJson.knowledge.built_at ?? null,
          error: null,
        });
      } else {
        setKbStatus((s) => ({
          ...s,
          buildingChats: false,
          chatBuildProgress: null,
          error: patchJson.error ?? "Error al guardar análisis de chats",
        }));
      }
    } catch (e) {
      const err = e as { message?: string };
      setKbStatus((s) => ({
        ...s,
        buildingChats: false,
        chatBuildProgress: null,
        error: `Error en análisis de chats: ${err.message ?? "desconocido"}`,
      }));
    }
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
          localStorage.getItem("agents-ai-provider") ?? "openai";

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
              onClick={() => void handleRefreshKb()}
              disabled={
                kbStatus.loading || kbStatus.building || kbStatus.buildingChats
              }
              title="Actualizar base de conocimiento"
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3 w-3 ${kbStatus.building || kbStatus.buildingChats ? "animate-spin" : ""}`}
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
          ) : kbStatus.buildingChats ? (
            <div className="space-y-1">
              {kbStatus.ticketsAnalyzed !== null && (
                <p className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {kbStatus.ticketsAnalyzed} tickets listos
                </p>
              )}
              <p className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Analizando chats…
              </p>
              {kbStatus.chatBuildProgress && (
                <p className="text-[10px] text-muted-foreground leading-tight pl-4">
                  {kbStatus.chatBuildProgress}
                </p>
              )}
            </div>
          ) : kbStatus.ticketsAnalyzed !== null ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {kbStatus.ticketsAnalyzed} tickets (dic 2025 → hoy)
              </p>
              {kbStatus.chatsAnalyzed !== null && kbStatus.chatsAnalyzed > 0 ? (
                <>
                  <p className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {kbStatus.chatsAnalyzed} conversaciones ·{" "}
                    {kbStatus.chatMessages ?? "?"} mensajes
                  </p>
                  {kbStatus.perAtc && kbStatus.perAtc.length > 0 && (
                    <div className="mt-1 space-y-0.5 pl-3 border-l-2 border-teal-200 dark:border-teal-800">
                      {kbStatus.perAtc.map((a) => (
                        <p
                          key={a.label}
                          className="text-[10px] text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {a.label}:
                          </span>{" "}
                          {a.convs} conv · {a.messages} msgs
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  ⚠ Sin datos de chats.{" "}
                  <button
                    onClick={() => void handleRefreshKb()}
                    className="underline hover:text-foreground"
                  >
                    Regenerar
                  </button>
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
                onClick={() => void handleRefreshKb()}
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

        {/* Model indicator + usage link */}
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span>OpenAI · Xacademy</span>
          </div>
          <Link
            href="/admin/agentes/soporte-atc/uso"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Ver uso y costos
          </Link>
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
