import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── API host ────────────────────────────────────────────────────────────────

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

// ─── Señales de riesgo ───────────────────────────────────────────────────────

const RISK_SIGNALS: Record<string, RegExp> = {
  ALERTA_LEGAL:
    /demanda|legal|abogad|denuncia|consum|proteccion al consumid|tribunal|juridico/i,
  SOLICITUD_GARANTIA_REEMBOLSO:
    /reembolso|devoluci[oó]n|garant[ií]a|dinero de vuelta|reintegro/i,
  TEMA_SALUD:
    /salud|enferm|hospital|cirug|diagn[oó]s|m[eé]dic|doctor|accidente|operad/i,
  CRISIS_EMOCIONAL:
    /no puedo m[aá]s|desesper|angustia|frustrad|harto|quiero salir|rendirme|llorand/i,
  CRISIS_FINANCIERA:
    /no tengo dinero|sin dinero|cuota pendi|atras[ao]|mora|no puedo pagar|deuda/i,
  SOLICITUD_EXTENSION:
    /extensi[oó]n|extender|m[aá]s tiempo|plazo|vencimient/i,
  SOLICITUD_PAUSA:
    /pausa|pausar|suspender|descanso|detener el programa/i,
  RIESGO_BAJA:
    /salir del programa|cancelar|baja|darme de baja|retirarme|no quiero continuar/i,
  DISPUTA_PAGO:
    /paypal|disputa|chargeback|contracargo|banco bloqu/i,
};

function detectRiskSignals(text: string): string[] {
  return Object.entries(RISK_SIGNALS)
    .filter(([, re]) => re.test(text))
    .map(([key]) => key);
}

function isHighRisk(signals: string[]): boolean {
  return signals.some((s) =>
    ["ALERTA_LEGAL", "DISPUTA_PAGO", "SOLICITUD_GARANTIA_REEMBOLSO"].includes(
      s,
    ),
  );
}

// ─── System prompts ──────────────────────────────────────────────────────────

function buildAlumnoSystemPrompt(alumnoName: string): string {
  return `Eres el Asistente ATC de Hotselling PRO — el asistente personal de atención al cliente de ${alumnoName}.

Tu función es ayudar directamente al alumno: responder sus dudas con contexto real de su historial, guiarlo en procesos operativos y, cuando corresponda, proponer la creación de un ticket de soporte.

## PERSONALIDAD
- Cálido, cercano, empático, humano y conversacional
- Resolutivo y estratégico — no das vueltas, resuelves
- Usas el nombre del alumno de forma natural y espontánea
- NUNCA suenas robótico, corporativo ni frío
- Tono conversacional, no uses headers ni estructuras formales en tu respuesta al alumno

## LO QUE PUEDES HACER
- Responder consultas sobre contratos, membresías, pausas, extensiones, bonos, garantías, accesos, coaches, tickets y FAQs
- Explicar procesos y requisitos operativos
- Contener emocionalmente antes de dar respuestas operativas en casos sensibles
- Proponer la creación de un ticket cuando el caso lo requiere
- Escalar automáticamente casos de riesgo alto

## LO QUE NO PUEDES HACER
- Aprobar reembolsos o garantías (puedes explicar el proceso y requisitos)
- Aprobar extensiones extraordinarias (orientas sobre cómo solicitarlas)
- Negociar valores o hacer excepciones al contrato
- Modificar contratos o acuerdos

## CLASIFICACIÓN DE RIESGO Y ACCIONES

**Riesgo BAJO** — consultas operativas, FAQs, accesos, membresía, continuidad
→ Responde directamente sin proponer ticket

**Riesgo MEDIO** — inconformidad, frustración, pagos duplicados, solicitud de pausa/extensión
→ Responde con empatía. Si el caso requiere seguimiento formal, propón un ticket

**Riesgo ALTO** — amenaza legal, fraude, estafa, reembolso agresivo, disputa PayPal, crisis emocional severa
→ SIEMPRE termina con [ACCION:{"tipo":"escalar",...}] sin pedir confirmación al alumno

## CUÁNDO PROPONER UN TICKET
Propón crear un ticket cuando:
- El alumno necesita revisión de tarea o feedback del coach
- Hay un bloqueo técnico que requiere intervención especializada
- Solicita seguimiento formal (pausa, extensión, garantía con requisitos)
- La duda es compleja y requiere atención de un especialista
- Necesita comunicarse formalmente con su coach

## CUÁNDO NO CREAR TICKET
- La respuesta ya existe en FAQs o conocimiento base
- El alumno ya tiene un ticket similar abierto (verificar historial)
- La consulta es simple y operativa — la resuelves tú mismo

## LÍMITE DE TICKETS
Si el alumno ya tiene 10 o más tickets esta semana: infórmalo e invítalo a consolidar sus dudas en un solo ticket.
Si tiene entre 7-9: menciónalo sutilmente.

## FORMATO DE ACCIONES — MUY IMPORTANTE
Cuando necesites proponer un ticket, integra la propuesta de forma natural en tu mensaje y SIEMPRE termina tu respuesta con exactamente esta línea (sin nada después):
[ACCION:{"tipo":"ticket","titulo":"TÍTULO BREVE","descripcion":"DESCRIPCIÓN DETALLADA DEL CASO","categoria":"Copy","prioridad":"MEDIA"}]

Categorías válidas: Copy | Ads | Técnico | Operativo | ATC
Prioridades válidas: BAJA | MEDIA | ALTA

Cuando detectes riesgo ALTO (amenaza legal, fraude, reembolso agresivo, crisis emocional severa, disputa PayPal), termina con:
[ACCION:{"tipo":"escalar","motivo":"RAZÓN CONCRETA","nivel":"ALTO"}]

Si no se requiere ninguna acción, NO incluyas ningún bloque [ACCION] en tu respuesta.

## OBJETIVO
El alumno debe sentirse acompañado, bien atendido y resuelto. Eres su aliado operativo dentro del programa.`;
}

const SYSTEM_ATC_TEAM = `Eres el Super Agente ATC de HotSelling PRO — el copiloto experto del equipo de Atención al Cliente Front.

Tu función es ayudar al equipo ATC a gestionar consultas de estudiantes con contexto completo, precisión operativa y criterio estratégico.

IMPORTANTE: NO eres el agente que habla directamente con el alumno. Eres el copiloto del equipo de soporte.

## ROL Y OBJETIVO
1. Analizar el caso con el historial completo del alumno (tickets, contratos, membresía, emocional)
2. Clasificar el nivel de riesgo con precisión operativa
3. Sugerir la respuesta exacta para el ATC (lista para copiar/pegar)
4. Indicar la ruta de acción: qué validar, qué preguntar, si documentar, si escalar
5. Estandarizar criterios y reducir escalaciones innecesarias

## LÍMITES OPERATIVOS
- NO aprobar reembolsos o garantías sin el proceso establecido
- NO aprobar extensiones extraordinarias sin autorización del líder ATC
- NO dar excepciones al contrato ni negociar valores
- SIEMPRE proteger operativamente la empresa

## DETECCIÓN DE RIESGO
- BAJO: consultas operativas, FAQs, accesos, membresía, continuidad → Respuesta directa sugerida
- MEDIO: inconformidad, frustración, pagos duplicados, cobros erróneos → Respuesta + seguimiento sugerido
- ALTO: reembolso + amenaza, demanda, fraude, estafa, disputa PayPal, crisis reputacional → Ticket urgente + escalar al líder ATC

## FORMATO DE RESPUESTA OBLIGATORIO

---

**📋 RESPUESTA SUGERIDA PARA EL ALUMNO:**
[Texto listo para copiar/pegar. Cálido, empático, alineado al caso. Ajustable antes de enviar.]

**🎯 ANÁLISIS DEL CASO:**
- **Tema principal:** [Contrato / Membresía / Pausa / Extensión / Garantía / Cuota / Salud / Emocional / Legal / Otro]
- **Contexto del historial:** [Patrones detectados, consultas recurrentes, tickets anteriores relevantes. Si no hay historial, indicarlo.]

**🚨 RIESGO:** [BAJO / MEDIO / ALTO]
Razón: [1-2 líneas justificando el nivel]

**⚡ SEÑALES DETECTADAS:**
[Lista de señales relevantes o "Ninguna señal crítica detectada"]

**🗺️ RUTA SUGERIDA:**
[Pasos concretos: qué validar, qué preguntarle al alumno, qué registrar, si solicitar documentación]

**🔺 ESCALAR:** [SÍ / NO] → [Si sí: a quién y razón concreta]

---

Cuando el análisis indica que se debe crear un ticket, incluye al final:
[ACCION:{"tipo":"ticket","titulo":"TÍTULO","descripcion":"DESCRIPCIÓN","categoria":"Copy|Ads|Técnico|Operativo|ATC","prioridad":"BAJA|MEDIA|ALTA"}]

Cuando se debe escalar:
[ACCION:{"tipo":"escalar","motivo":"RAZÓN","nivel":"ALTO"}]

Responde siempre en español. La respuesta sugerida debe estar lista para enviar con mínimas modificaciones.`;

// ─── Ticket helpers ───────────────────────────────────────────────────────────

async function fetchStudentTickets(
  authorization: string,
  alumnoCode: string,
): Promise<Record<string, unknown>[]> {
  try {
    const url = buildUrl(
      `/client/get/tickets/${encodeURIComponent(alumnoCode)}?page=1&pageSize=20`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (Array.isArray(json))
      return json.filter(
        (t): t is Record<string, unknown> => !!t && typeof t === "object",
      );
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      for (const key of ["items", "data"]) {
        if (Array.isArray(j[key]))
          return (j[key] as unknown[]).filter(
            (t): t is Record<string, unknown> => !!t && typeof t === "object",
          );
      }
      if (j.data && typeof j.data === "object" && !Array.isArray(j.data)) {
        const d = j.data as Record<string, unknown>;
        if (Array.isArray(d.items))
          return (d.items as unknown[]).filter(
            (t): t is Record<string, unknown> => !!t && typeof t === "object",
          );
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchTicketDetail(
  authorization: string,
  codigo: string,
): Promise<Record<string, unknown> | null> {
  try {
    const url = buildUrl(`/ticket/get/ticket/${encodeURIComponent(codigo)}`);
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (j.data && typeof j.data === "object" && !Array.isArray(j.data))
        return j.data as Record<string, unknown>;
      return j;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchPublicComments(
  authorization: string,
  codigo: string,
): Promise<{ contenido: string; user_nombre?: string }[]> {
  try {
    const url = buildUrl(
      `/ticket/get/public-comments/${encodeURIComponent(codigo)}`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    let list: unknown[] = [];
    if (Array.isArray(json)) list = json;
    else if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (Array.isArray(j.data)) list = j.data;
      else if (Array.isArray(j.comments)) list = j.comments;
    }
    return list
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .map((c) => ({
        contenido: String(c.contenido ?? c.content ?? c.body ?? "").slice(
          0,
          600,
        ),
        user_nombre: c.user_nombre ? String(c.user_nombre) : undefined,
      }))
      .filter((c) => c.contenido);
  } catch {
    return [];
  }
}

function countWeeklyTickets(tickets: Record<string, unknown>[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return tickets.filter((t) => {
    const fecha = String(t.creacion ?? t.created_at ?? "");
    if (!fecha) return false;
    try {
      return new Date(fecha) >= sevenDaysAgo;
    } catch {
      return false;
    }
  }).length;
}

interface AtcContext {
  block: string;
  ticketCount: number;
  weeklyTickets: number;
  signals: string[];
}

async function buildAtcContext(
  authorization: string,
  alumnoCode: string,
  alumnoName: string,
): Promise<AtcContext> {
  const signals: string[] = [];
  const rawTickets = await fetchStudentTickets(authorization, alumnoCode);
  const weeklyTickets = countWeeklyTickets(rawTickets);

  const tickets = rawTickets
    .map((t) => ({
      codigo: String(t.id_externo ?? t.codigo ?? t.id ?? ""),
      fecha: String(t.creacion ?? t.created_at ?? ""),
    }))
    .filter((x) => x.codigo)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 8);

  const details = await Promise.all(
    tickets.map(async ({ codigo }) => {
      const [detail, comments] = await Promise.all([
        fetchTicketDetail(authorization, codigo),
        fetchPublicComments(authorization, codigo),
      ]);
      return { codigo, detail, comments };
    }),
  );

  const lines: string[] = [];
  lines.push(
    `## HISTORIAL DEL ALUMNO: ${alumnoName} (código: ${alumnoCode})\n`,
  );
  lines.push(
    "Usa este historial para entender el contexto del caso actual. Identifica patrones, consultas recurrentes y tono de las interacciones.\n",
  );

  for (const { codigo, detail, comments } of details) {
    const t = detail ?? {};
    const nombre = String(
      t.nombre ?? t.subject ?? t.asunto ?? `Ticket ${codigo}`,
    );
    const tipo = String(t.tipo ?? t.type ?? "");
    const estado = String(t.estado ?? t.status ?? "");
    const fecha = String(t.creacion ?? t.created_at ?? "");
    const desc = String(
      t.descripcion ?? t.description ?? t.body ?? "",
    ).slice(0, 800);
    const commentsText = comments
      .map(
        (c) =>
          `${c.user_nombre ? `[${c.user_nombre}]` : "[ATC]"}: ${c.contenido}`,
      )
      .join("\n")
      .slice(0, 2_000);

    const meta = [tipo, estado, fecha].filter(Boolean).join(" · ");
    lines.push(`### [${codigo}] ${nombre}${meta ? ` (${meta})` : ""}`);
    if (desc) lines.push(`Consulta: ${desc}`);
    if (commentsText) lines.push(`Respuestas ATC:\n${commentsText}`);
    lines.push("");

    signals.push(...detectRiskSignals(`${desc} ${commentsText}`));
  }

  const uniqueSignals = Array.from(new Set(signals));
  if (uniqueSignals.length > 0) {
    lines.push(
      `## SEÑALES DETECTADAS EN HISTORIAL\n${uniqueSignals.join(", ")}\n`,
    );
  }

  return {
    block: lines.join("\n"),
    ticketCount: tickets.length,
    weeklyTickets,
    signals: uniqueSignals,
  };
}

// ─── Knowledge base ───────────────────────────────────────────────────────────

const SUPER_ATC_KB_ENTITY = "super_atc_knowledge_base";
const SUPER_ATC_KB_ENTITY_ID = "v1";

interface KbSecciones {
  protocolos?: string;
  contratos?: string;
  faqs?: string;
  casos_historicos?: string;
  limitaciones?: string;
}

async function loadSuperAtcKnowledgeBase(
  authorization: string,
): Promise<string | null> {
  try {
    const url = buildUrl("/metadata");
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    let items: Record<string, unknown>[] = [];
    if (Array.isArray(json)) items = json as Record<string, unknown>[];
    else if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (Array.isArray(j.data)) items = j.data as Record<string, unknown>[];
      else if (j.data && typeof j.data === "object") {
        const d = j.data as Record<string, unknown>;
        if (Array.isArray(d.items))
          items = d.items as Record<string, unknown>[];
      }
    }
    const found = items.find(
      (i) =>
        i.entity === SUPER_ATC_KB_ENTITY &&
        i.entity_id === SUPER_ATC_KB_ENTITY_ID,
    );
    if (!found?.payload) return null;
    const payload = found.payload as Record<string, unknown>;
    const secciones = payload.secciones as KbSecciones | undefined;
    if (!secciones) return null;

    const parts: string[] = ["## BASE DE CONOCIMIENTO OPERATIVA ATC\n"];
    if (secciones.protocolos?.trim())
      parts.push(`### PROTOCOLOS\n${secciones.protocolos}\n`);
    if (secciones.contratos?.trim())
      parts.push(`### CONTRATOS\n${secciones.contratos}\n`);
    if (secciones.faqs?.trim())
      parts.push(`### FAQS OPERATIVAS\n${secciones.faqs}\n`);
    if (secciones.casos_historicos?.trim())
      parts.push(`### CASOS HISTÓRICOS\n${secciones.casos_historicos}\n`);
    if (secciones.limitaciones?.trim())
      parts.push(`### LIMITACIONES DEL AGENTE\n${secciones.limitaciones}\n`);

    return parts.length > 1 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

// ─── Usage logging ────────────────────────────────────────────────────────────

async function logAgentUsage(
  authorization: string,
  data: {
    agent_type: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    user_message_chars: number;
    mode: string;
    alumno_codigo?: string;
    signals?: string[];
    created_at: string;
  },
) {
  const internalToken = process.env.INTERNAL_API_TOKEN;
  const authHeader = internalToken ? `Bearer ${internalToken}` : authorization;
  try {
    await fetch(buildUrl("/metadata"), {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity: "agente_uso_super_atc",
        entity_id: data.alumno_codigo ?? "general",
        payload: data,
      }),
      cache: "no-store",
    });
  } catch {
    // silencioso
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: {
    messages?: unknown;
    provider?: string;
    alumnoCode?: string;
    alumnoName?: string;
    mode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const provider = body.provider === "openai" ? "openai" : "anthropic";
  const alumnoCode =
    typeof body.alumnoCode === "string" ? body.alumnoCode.trim() : "";
  const alumnoName =
    typeof body.alumnoName === "string" ? body.alumnoName.trim() : alumnoCode;
  const mode = body.mode === "atc_team" ? "atc_team" : "alumno";

  const authorization = request.headers.get("authorization") ?? "";
  const typedMessages = messages as Array<{ role: string; content: string }>;
  const userMsg = String(typedMessages.at(-1)?.content ?? "");
  const currentSignals = detectRiskSignals(userMsg);

  // Build context
  let ctx: AtcContext = {
    block: "",
    ticketCount: 0,
    weeklyTickets: 0,
    signals: currentSignals,
  };

  if (alumnoCode && authorization) {
    try {
      const built = await buildAtcContext(authorization, alumnoCode, alumnoName);
      ctx = {
        ...built,
        signals: Array.from(new Set([...built.signals, ...currentSignals])),
      };
    } catch {
      // continuar sin contexto
    }
  }

  // Load knowledge base
  let knowledgeBlock = "";
  if (authorization) {
    try {
      const kb = await loadSuperAtcKnowledgeBase(authorization);
      if (kb) knowledgeBlock = kb;
    } catch {
      // silencioso
    }
  }

  const signalBlock =
    ctx.signals.length > 0
      ? `\n\n[SEÑALES DETECTADAS]: ${ctx.signals.join(", ")}. Asegúrate de reflejar estas señales en tu análisis de riesgo.`
      : "";

  const weeklyLimitBlock =
    mode === "alumno" && ctx.weeklyTickets >= 10
      ? `\n\n[LÍMITE DE TICKETS]: El alumno ya tiene ${ctx.weeklyTickets} tickets esta semana (límite: 10). NO propongas crear un ticket nuevo. Infórmale e invítale a consolidar.`
      : "";

  const baseSystem =
    mode === "alumno" ? buildAlumnoSystemPrompt(alumnoName) : SYSTEM_ATC_TEAM;

  const systemPrompt = [
    baseSystem,
    knowledgeBlock ? `\n\n${knowledgeBlock}` : "",
    ctx.block ? `\n\n${ctx.block}` : "",
    signalBlock,
    weeklyLimitBlock,
  ]
    .filter(Boolean)
    .join("");

  const encoder = new TextEncoder();

  // Determine risk level for escalation hint
  const hasHighRisk = isHighRisk(ctx.signals);

  const emitContext = (controller: ReadableStreamDefaultController) => {
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "context",
          ticketCount: ctx.ticketCount,
          weeklyTickets: ctx.weeklyTickets,
          signals: ctx.signals,
          hasHighRisk,
        })}\n\n`,
      ),
    );
  };

  // ── Anthropic ───────────────────────────────────────────────────────────────

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const modelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          emitContext(controller);

          const anthropic = new Anthropic({ apiKey });
          const sdkStream = await anthropic.messages.create({
            model: modelId,
            max_tokens: 4_000,
            stream: true,
            system: systemPrompt,
            messages: typedMessages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: String(m.content ?? ""),
            })),
          });

          let inputTokens = 0;
          let outputTokens = 0;

          for await (const event of sdkStream) {
            if (
              event.type === "message_start" &&
              (event as { message?: { usage?: { input_tokens?: number } } })
                .message?.usage
            ) {
              inputTokens =
                (
                  event as {
                    message: { usage: { input_tokens: number } };
                  }
                ).message.usage.input_tokens ?? 0;
            }
            if (
              event.type === "message_delta" &&
              (event as { usage?: { output_tokens?: number } }).usage
            ) {
              outputTokens =
                (event as { usage: { output_tokens: number } }).usage
                  .output_tokens ?? 0;
            }
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                );
              }
            }
          }

          void logAgentUsage(authorization, {
            agent_type: "super-atc",
            model: modelId,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            user_message_chars: userMsg.length,
            mode,
            alumno_codigo: alumnoCode || undefined,
            signals: ctx.signals,
            created_at: new Date().toISOString(),
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: unknown) {
          const e = err as { status?: number; message?: string };
          let msg = e.message ?? "Error desconocido (Anthropic)";
          if (e.status === 401) msg = "API key de Anthropic inválida (401).";
          else if (e.status === 429) msg = "Rate limit en Anthropic (429).";
          else if (e.status === 404)
            msg = "Modelo no encontrado en Anthropic (404).";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ── OpenAI fallback ──────────────────────────────────────────────────────────

  const oaiKey = process.env.OPENAI_API_KEY;
  const oaiModel = process.env.OPENAI_MODEL ?? "gpt-4o";
  if (!oaiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY no configurada" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        emitContext(controller);

        const client = new OpenAI({ apiKey: oaiKey });
        const completion = await client.chat.completions.create({
          model: oaiModel,
          messages: [
            { role: "system", content: systemPrompt },
            ...typedMessages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: String(m.content ?? ""),
            })),
          ],
          stream: true,
          stream_options: { include_usage: true },
          max_completion_tokens: 4_000,
        });

        let inputTokens = 0;
        let outputTokens = 0;

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
            );
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0;
            outputTokens = chunk.usage.completion_tokens ?? 0;
          }
        }

        void logAgentUsage(authorization, {
          agent_type: "super-atc",
          model: oaiModel,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          user_message_chars: userMsg.length,
          mode,
          alumno_codigo: alumnoCode || undefined,
          signals: ctx.signals,
          created_at: new Date().toISOString(),
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        let msg = e.message ?? "Error desconocido (OpenAI)";
        if (e.status === 401) msg = "API key de OpenAI inválida (401).";
        else if (e.status === 429) msg = "Rate limit en OpenAI (429).";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
