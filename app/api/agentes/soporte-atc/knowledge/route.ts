import { NextRequest, NextResponse } from "next/server";
import { io as ioClient } from "socket.io-client";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — necesario para 3000 tickets

// ─── Config ───────────────────────────────────────────────────────────────────

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";
const CHAT_HOST =
  process.env.NEXT_PUBLIC_CHAT_HOST ?? "https://api-ax.valinkgroup.com";

const KNOWLEDGE_ENTITY = "soporte_atc_knowledge_base";
const KNOWLEDGE_ENTITY_ID = "v1";
const TTL_HOURS = 12; // refresco automático cada 12 h

// Códigos de equipo ATC a analizar (el mismo set que usa admin/metrics/chat)
const ATC_TEAM_CODES = [
  "18SA4S1_J4B-MPEU",      // Alejandro
  "mQ2dwRX3xMzV99e3nh9eb", // Pedro
  "PKBT2jVtzKzN7TpnLZkPj", // Lizeth Tocaria
];

// ─── Ticket patterns ──────────────────────────────────────────────────────────

const PATTERN_RE: Record<string, RegExp> = {
  pausa: /pausa|pausar|suspender|descanso/i,
  extension: /extensi[oó]n|extender|m[aá]s tiempo|plazo/i,
  garantia_reembolso: /garant[ií]a|reembolso|devoluci[oó]n|dinero de vuelta/i,
  contrato: /contrato|contratoactivo|firmado/i,
  membresia: /membres[ií]a|continuidad|suscripci[oó]n/i,
  crisis_financiera: /cuota|pago|mora|atras[ao]|no puedo pagar|sin dinero/i,
  salud: /salud|enferm|hospital|cirug|m[eé]dic|accidente/i,
  crisis_emocional: /no puedo m[aá]s|desesper|angustia|frustrad|rendirme/i,
  legal_comercial: /demanda|legal|abogad|denuncia|consum/i,
  baja: /baja|salir del programa|cancelar|retirarme/i,
  acceso_plataforma: /acceso|plataforma|entrar|login|contrase[ñn]a|link/i,
  coaching: /coach|sesi[oó]n|reuni[oó]n|llamada|agendamiento/i,
};

function detectPatterns(text: string): string[] {
  return Object.entries(PATTERN_RE)
    .filter(([, re]) => re.test(text))
    .map(([k]) => k);
}

// ─── Server-side fetchers ─────────────────────────────────────────────────────

async function serverFetch(
  path: string,
  authorization: string,
  timeoutMs = 15_000,
) {
  const url = path.startsWith("http") ? path : `${API_HOST}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: authorization },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function fetchTicketPage(
  authorization: string,
  page: number,
  pageSize: number,
) {
  const json = await serverFetch(
    `/ticket/get/ticket?page=${page}&pageSize=${pageSize}`,
    authorization,
  );
  if (!json) return { rows: [], total: 0, totalPages: 1 };
  const rows: Record<string, unknown>[] =
    (json as Record<string, unknown>)?.data as Record<string, unknown>[] ??
    (json as Record<string, unknown>)?.getTickets?.data as Record<string, unknown>[] ??
    (json as Record<string, unknown>)?.tickets?.data as Record<string, unknown>[] ??
    [];
  const total = Number(
    (json as Record<string, unknown>)?.total ??
      (json as Record<string, unknown>)?.getTickets?.total ??
      0,
  );
  const totalPages = Number(
    (json as Record<string, unknown>)?.totalPages ?? 1,
  ) || 1;
  return { rows, total, totalPages };
}

async function fetchPublicComments(
  authorization: string,
  codigo: string,
): Promise<string> {
  const json = await serverFetch(
    `/ticket/get/public-comments/${encodeURIComponent(codigo)}`,
    authorization,
    8_000,
  );
  if (!json) return "";
  let list: Array<Record<string, unknown>> = [];
  if (Array.isArray(json)) list = json as Array<Record<string, unknown>>;
  else if (json && typeof json === "object") {
    const j = json as Record<string, unknown>;
    if (Array.isArray(j.data)) list = j.data as Array<Record<string, unknown>>;
    else if (Array.isArray(j.comments)) list = j.comments as Array<Record<string, unknown>>;
  }
  return list
    .map((c) => String((c as Record<string, unknown>).contenido ?? (c as Record<string, unknown>).content ?? "").slice(0, 300))
    .filter(Boolean)
    .join(" | ")
    .slice(0, 1_200);
}

// ─── Metadata: save / load ────────────────────────────────────────────────────

async function saveKnowledge(
  authorization: string,
  payload: Record<string, unknown>,
) {
  try {
    // First check if it already exists (to update vs create)
    const listJson = await serverFetch("/metadata", authorization, 10_000);
    let existingId: string | number | null = null;
    if (listJson) {
      const items: Array<Record<string, unknown>> = Array.isArray(listJson)
        ? listJson as Array<Record<string, unknown>>
        : Array.isArray((listJson as Record<string, unknown>).data)
          ? (listJson as Record<string, unknown>).data as Array<Record<string, unknown>>
          : Array.isArray((listJson as Record<string, unknown>)?.data?.items)
            ? (listJson as Record<string, unknown>)?.data?.items as Array<Record<string, unknown>>
            : [];

      const existing = items.find(
        (i) =>
          i.entity === KNOWLEDGE_ENTITY && i.entity_id === KNOWLEDGE_ENTITY_ID,
      );
      if (existing) existingId = existing.id as string | number;
    }

    const body = JSON.stringify({
      entity: KNOWLEDGE_ENTITY,
      entity_id: KNOWLEDGE_ENTITY_ID,
      payload,
    });

    const url = existingId
      ? `${API_HOST}/metadata/${existingId}`
      : `${API_HOST}/metadata`;

    await fetch(url, {
      method: existingId ? "PUT" : "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch {
    // silencioso — no bloquear la respuesta
  }
}

async function loadKnowledge(
  authorization: string,
): Promise<Record<string, unknown> | null> {
  try {
    const listJson = await serverFetch("/metadata", authorization, 10_000);
    if (!listJson) return null;
    const items: Array<Record<string, unknown>> = Array.isArray(listJson)
      ? listJson as Array<Record<string, unknown>>
      : Array.isArray((listJson as Record<string, unknown>).data)
        ? (listJson as Record<string, unknown>).data as Array<Record<string, unknown>>
        : Array.isArray((listJson as Record<string, unknown>)?.data?.items)
          ? (listJson as Record<string, unknown>)?.data?.items as Array<Record<string, unknown>>
          : [];

    const found = items.find(
      (i) =>
        i.entity === KNOWLEDGE_ENTITY && i.entity_id === KNOWLEDGE_ENTITY_ID,
    );
    return (found?.payload as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

// ─── Bulk ticket fetcher (hasta 3000 tickets en lotes concurrentes) ─────────

function getTicketMonth(t: Record<string, unknown>): string {
  const raw =
    t.created_at ??
    t.createdAt ??
    t.fecha_creacion ??
    t.fechaCreacion ??
    t.fecha ??
    t.date;
  if (!raw) return "sin-fecha";
  const d = new Date(String(raw));
  if (isNaN(d.getTime())) return "sin-fecha";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function fetchAllTickets(
  authorization: string,
): Promise<Record<string, unknown>[]> {
  const PAGE_SIZE = 300;
  const MAX_TICKETS = 3_000;
  const BATCH_SIZE = 3; // páginas concurrentes por lote

  const first = await fetchTicketPage(authorization, 1, PAGE_SIZE);
  const allRows: Record<string, unknown>[] = [...first.rows];

  if (first.totalPages <= 1 || allRows.length >= MAX_TICKETS) return allRows;

  const maxPage = Math.min(
    first.totalPages,
    Math.ceil(MAX_TICKETS / PAGE_SIZE),
  );

  const remainingPages: number[] = [];
  for (let p = 2; p <= maxPage; p++) remainingPages.push(p);

  for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((p) => fetchTicketPage(authorization, p, PAGE_SIZE)),
    );
    for (const r of results) {
      if (r.status === "fulfilled") allRows.push(...r.value.rows);
    }
    if (allRows.length >= MAX_TICKETS) break;
  }

  return allRows.slice(0, MAX_TICKETS);
}

// ─── Knowledge builder ────────────────────────────────────────────────────────

export type KnowledgeBase = {
  built_at: string;
  tickets_analyzed: number;
  chats_analyzed: number;
  patterns: Record<string, number>;
  top_types: Array<{ label: string; count: number }>;
  top_statuses: Array<{ label: string; count: number }>;
  top_subjects: string[];
  keywords: string[];
  sample_comments: Array<{
    subject: string;
    tipo: string;
    comments: string;
  }>;
  monthly_stats: Record<string, { count: number; patterns: Record<string, number> }>;
  chat_data: ChatKnowledge | null;
  summary_text: string;
};

async function buildKnowledge(
  authorization: string,
): Promise<KnowledgeBase> {
  // 1. Fetch hasta 3000 tickets con paginación concurrente
  const allRows = await fetchAllTickets(authorization);

  // 2. Pattern counting + agrupación mensual
  const patternCounts: Record<string, number> = Object.fromEntries(
    Object.keys(PATTERN_RE).map((k) => [k, 0]),
  );

  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const wordFreq: Record<string, number> = {};
  const subjects: string[] = [];

  // Agrupación mes a mes: { "2025-03": { count, patterns } }
  const monthlyStats: Record<string, {
    count: number;
    patterns: Record<string, number>;
  }> = {};

  for (const t of allRows) {
    const text = [
      String(t.nombre ?? t.subject ?? ""),
      String(t.descripcion ?? t.description ?? ""),
    ]
      .join(" ")
      .toLowerCase();

    // Mes
    const month = getTicketMonth(t);
    if (!monthlyStats[month]) {
      monthlyStats[month] = {
        count: 0,
        patterns: Object.fromEntries(Object.keys(PATTERN_RE).map((k) => [k, 0])),
      };
    }
    monthlyStats[month].count += 1;

    const ticketPatterns = detectPatterns(text);
    for (const pat of ticketPatterns) {
      monthlyStats[month].patterns[pat] = (monthlyStats[month].patterns[pat] ?? 0) + 1;
    }

    // Type
    const tipo = String(t.tipo ?? t.type ?? "sin tipo");
    typeCounts[tipo] = (typeCounts[tipo] ?? 0) + 1;

    // Status
    const estado = String(t.estado ?? t.status ?? "sin estado");
    statusCounts[estado] = (statusCounts[estado] ?? 0) + 1;

    // Subject
    const sub = String(t.nombre ?? t.subject ?? "").trim();
    if (sub && sub.length > 3) subjects.push(sub);

    // Patterns (global)
    for (const pat of ticketPatterns) {
      patternCounts[pat] = (patternCounts[pat] ?? 0) + 1;
    }

    // Word frequency (keywords)
    const words = text
      .replace(/[^a-záéíóúüñ\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4);
    for (const w of words) {
      wordFreq[w] = (wordFreq[w] ?? 0) + 1;
    }
  }

  // 3. Top types, statuses, keywords
  const top_types = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));

  const top_statuses = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  const STOPWORDS = new Set([
    "quiero", "tengo", "tiene", "porque", "sobre", "estoy", "como",
    "pero", "para", "desde", "hasta", "puede", "poder", "favor",
    "hola", "buenas", "gracias", "ayuda", "saber", "hacer",
  ]);
  const keywords = Object.entries(wordFreq)
    .filter(([w]) => !STOPWORDS.has(w))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 40)
    .map(([w]) => w);

  // Top unique subjects
  const subjectFreq: Record<string, number> = {};
  for (const s of subjects) {
    const key = s.slice(0, 60).toLowerCase();
    subjectFreq[key] = (subjectFreq[key] ?? 0) + 1;
  }
  const top_subjects = Object.entries(subjectFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([s]) => s);

  // 4. Sample comments from top tickets (up to 20)
  const sampleTickets = allRows
    .filter((t) => {
      const text = String(t.nombre ?? t.subject ?? "").toLowerCase();
      return detectPatterns(text).length > 0;
    })
    .slice(0, 20);

  const sample_comments: Array<{ subject: string; tipo: string; comments: string }> = [];

  await Promise.allSettled(
    sampleTickets.map(async (t) => {
      const codigo = String(t.id_externo ?? t.codigo ?? t.id ?? "");
      if (!codigo) return;
      const comments = await fetchPublicComments(authorization, codigo);
      if (comments) {
        sample_comments.push({
          subject: String(t.nombre ?? t.subject ?? "").slice(0, 80),
          tipo: String(t.tipo ?? t.type ?? ""),
          comments,
        });
      }
    }),
  );

  // 5. Build chat knowledge (via Socket.IO)
  // Extract the bearer token from authorization header for socket auth
  const socketToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : authorization;

  let chatData: ChatKnowledge | null = null;
  try {
    chatData = await buildChatKnowledge(socketToken);
  } catch {
    // Chat analysis is optional — don't block ticket analysis
  }

  // 6. Build compressed summary text for LLM
  const total = allRows.length;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const lines: string[] = [
    `## BASE DE CONOCIMIENTO ATC`,
    `Actualizado: ${new Date().toLocaleDateString("es-ES")} | Tickets analizados: ${total} | Chats analizados: ${chatData?.chats_analyzed ?? 0}`,
    "",
    "### TICKETS DE SOPORTE",
    "",
    "#### Distribución por tipo de ticket",
    ...top_types.map((t) => `- ${t.label}: ${t.count} tickets`),
    "",
    "#### Distribución por estado",
    ...top_statuses.map((s) => `- ${s.label}: ${s.count} tickets`),
    "",
    "#### Patrones detectados en tickets",
    ...Object.entries(patternCounts)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => `- ${k}: ${v} casos (${pct(v)}% del total)`),
    "",
    "#### Temas más frecuentes en tickets (por nombre/asunto)",
    ...top_subjects.slice(0, 15).map((s) => `- "${s}"`),
    "",
    "#### Palabras clave más frecuentes en tickets",
    keywords.slice(0, 30).join(", "),
    "",
    "#### Muestra de interacciones reales en tickets",
    ...sample_comments.slice(0, 8).map(
      (c, i) =>
        `${i + 1}. [${c.tipo}] ${c.subject}\n   ATC respondió: ${c.comments.slice(0, 250)}`,
    ),
    "",
    "#### Evolución mes a mes (últimos 12 meses)",
    ...Object.entries(monthlyStats)
      .filter(([month]) => month !== "sin-fecha")
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .map(([month, stats]) => {
        const topPats = Object.entries(stats.patterns)
          .filter(([, v]) => v > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([k, v]) => `${k}(${v})`)
          .join(", ");
        return `- ${month}: ${stats.count} tickets${topPats ? ` | top: ${topPats}` : ""}`;
      }),
    "",
    ...(chatData ? [chatData.chat_summary_text] : [
      "### ANÁLISIS DE CHATS",
      "No se pudo conectar al sistema de chat en esta actualización.",
    ]),
  ];

  const summary_text = lines.join("\n");

  return {
    built_at: new Date().toISOString(),
    tickets_analyzed: total,
    chats_analyzed: chatData?.chats_analyzed ?? 0,
    patterns: patternCounts,
    top_types,
    top_statuses,
    top_subjects,
    keywords,
    sample_comments,
    monthly_stats: monthlyStats,
    chat_data: chatData,
    summary_text,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cached = await loadKnowledge(authorization);

  if (cached) {
    const builtAt = new Date(String(cached.built_at ?? ""));
    const ageHours = (Date.now() - builtAt.getTime()) / 3_600_000;
    if (ageHours < TTL_HOURS) {
      return NextResponse.json({ knowledge: cached, fresh: false });
    }
  }

  // Build fresh
  try {
    const knowledge = await buildKnowledge(authorization);
    void saveKnowledge(authorization, knowledge as unknown as Record<string, unknown>);
    return NextResponse.json({ knowledge, fresh: true });
  } catch (err) {
    const e = err as { message?: string };
    if (cached) return NextResponse.json({ knowledge: cached, fresh: false, warning: e.message });
    return NextResponse.json({ error: e.message ?? "Error construyendo base de conocimiento" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const knowledge = await buildKnowledge(authorization);
    void saveKnowledge(authorization, knowledge as unknown as Record<string, unknown>);
    return NextResponse.json({ knowledge, fresh: true });
  } catch (err) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "Error construyendo base de conocimiento" },
      { status: 500 },
    );
  }
}
