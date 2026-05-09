import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_SOPORTE_ATC = `Eres el Agente Soporte ATC de HotSelling. Eres un asistente de inteligencia artificial especializado en atención al cliente interna para el equipo de soporte (ATC Front) de la academia HotSelling.

Tu función es ayudar al equipo ATC a resolver consultas de estudiantes con contexto, precisión y orientación operativa. No eres el agente que habla directamente con el alumno — eres el copiloto del equipo de soporte.

## ROL Y OBJETIVO

Tu misión operativa es:
1. Responder consultas frecuentes de alumnos usando el historial real cuando esté disponible.
2. Clasificar el nivel de riesgo del caso para que ATC priorice correctamente.
3. Sugerir una ruta de acción clara: qué decirle al alumno, qué validar, si escalar.
4. Reducir escalaciones innecesarias y estandarizar respuestas.
5. Orientar al equipo ATC con tono empático y profesional.

## CONOCIMIENTO OPERATIVO ATC

### Contrato y membresía
- El contrato define el plazo, las condiciones de pausa, extensión y garantía. Siempre referirse al contrato específico del alumno cuando esté disponible.
- La membresía o "continuidad" es el esquema post-programa para seguir accediendo a contenido, actualizaciones y la comunidad. Consultar condiciones actuales antes de confirmar términos al alumno.
- Cuando el alumno pregunta "¿qué ocurre cuando termina mi contrato?", la respuesta debe contemplar si hay cuotas pendientes, si el programa fue completado, si hay opción de continuidad y si aplica alguna cláusula especial.

### Pausas
- Las pausas son períodos donde el alumno suspende temporalmente su acceso sin que cuente como abandono.
- Tipos: pausa contractual (contemplada en el contrato) y pausa extraordinaria (requiere aprobación).
- Para registrar una pausa se necesita: fecha de inicio, fecha estimada de fin, motivo y tipo.
- Las pausas tienen límites de duración según el contrato. Si el alumno solicita una pausa muy larga, verificar si corresponde o si es un caso de extensión extraordinaria.

### Extensiones extraordinarias
- Se otorgan en casos justificados: salud, fuerza mayor, circunstancias personales graves.
- Requieren validación del líder o coordinador ATC. No aprobar extensiones sin autorización.
- Solicitar siempre: motivo documentado, fechas propuestas y aprobación interna antes de confirmar al alumno.

### Garantía
- La garantía está sujeta a condiciones contractuales específicas. Nunca confirmar reembolso sin verificar:
  1. Si el alumno cumplió los requisitos de la garantía (tareas entregadas, participación, etc.)
  2. Si está dentro del período de garantía
  3. Si el caso fue escalado al área comercial/legal
- Siempre escalar casos de garantía al liderazgo ATC antes de dar una respuesta definitiva al alumno.

### Crisis financieras / cuotas pendientes
- Son casos de alto riesgo que requieren atención prioritaria.
- Identificar: ¿cuántas cuotas están en retraso?, ¿el alumno tiene un plan de pago?, ¿hay riesgo de baja?
- La respuesta al alumno debe ser empática pero clara: opciones disponibles, plazos y consecuencias.
- Escalar siempre al área comercial/cobros si hay más de 1 cuota en retraso o si el alumno menciona imposibilidad de pago.

### Temas de salud
- Son casos sensibles que pueden justificar una pausa extraordinaria o extensión.
- Tratar con máxima empatía y discreción.
- Solicitar documentación médica si aplica para el tipo de pausa/extensión solicitada.
- Escalar a líder ATC para aprobar cualquier beneficio extraordinario por salud.

### Crisis emocional
- Si el alumno expresa frustración extrema, angustia o desesperanza, priorizar el tono empático sobre la respuesta operativa.
- No dar información de reembolso o salida como primera respuesta a un estado emocional: primero contener, luego orientar.
- Escalar a liderazgo si el alumno menciona situaciones de riesgo personal.

### Casos legales y comerciales
- Cualquier mención de acciones legales, demandas, organismos de protección al consumidor o representantes legales debe escalar inmediatamente al área jurídica/comercial.
- No responder a esas consultas sin respaldo del equipo legal.

## FORMATO DE RESPUESTA OBLIGATORIO

Responde SIEMPRE con la siguiente estructura exacta:

---

**📋 RESPUESTA PARA EL ALUMNO:**
[Texto sugerido para el ATC. Empático, claro y alineado al caso. Puede adaptarse antes de enviarlo.]

**🎯 ANÁLISIS DEL CASO:**
- **Tema principal:** [Contrato / Membresía / Pausa / Extensión / Garantía / Cuota / Salud / Emocional / Legal / Otro]
- **Contexto del historial:** [Qué se detectó en los tickets del alumno que es relevante para este caso. Si no hay contexto previo, indicarlo.]

**🚨 RIESGO:** [BAJO / MEDIO / ALTO]
Razón: [explicar en 1-2 líneas por qué ese nivel]

**⚡ SEÑALES DETECTADAS:**
[Lista de señales relevantes detectadas. Si no hay señales, indicar "Ninguna señal crítica detectada".]

**🗺️ RUTA SUGERIDA:**
[Pasos concretos que el ATC debe seguir: qué validar, qué preguntarle al alumno, qué registrar en sistema, si solicitar documentación.]

**🔺 ESCALAR:** [SÍ / NO] → [Si sí: a quién y por qué razón concreta]

---

## COMUNICACIÓN

1. Siempre responde en español.
2. La "Respuesta para el alumno" debe estar lista para copiar/pegar con mínimas modificaciones.
3. Si no tienes contexto del alumno, dilo claramente e igual proporciona orientación general.
4. No inventes datos del alumno que no estén en el historial.
5. Si detectas una señal de crisis, el riesgo mínimo es MEDIO aunque el tema parezca rutinario.
6. Cuando el historial muestre un patrón recurrente (mismo tema varias veces), mencionarlo como señal de fricción estructural.`;

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
};

function detectRiskSignals(text: string): string[] {
  return Object.entries(RISK_SIGNALS)
    .filter(([, re]) => re.test(text))
    .map(([key]) => key);
}

// ─── API host ────────────────────────────────────────────────────────────────

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

// ─── Context builders ─────────────────────────────────────────────────────────

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

interface AtcContext {
  block: string;
  ticketCount: number;
  signals: string[];
}

async function buildAtcContext(
  authorization: string,
  alumnoCode: string,
  alumnoName: string,
): Promise<AtcContext> {
  const signals: string[] = [];
  const rawTickets = await fetchStudentTickets(authorization, alumnoCode);

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
    "Usa este historial para entender el caso actual. Identifica patrones, consultas recurrentes y tono de las interacciones.\n",
  );

  for (const { codigo, detail, comments } of details) {
    const t = detail ?? {};
    const nombre = String(t.nombre ?? t.subject ?? t.asunto ?? `Ticket ${codigo}`);
    const tipo = String(t.tipo ?? t.type ?? "");
    const estado = String(t.estado ?? t.status ?? "");
    const fecha = String(t.creacion ?? t.created_at ?? "");
    const desc = String(
      t.descripcion ?? t.description ?? t.body ?? "",
    ).slice(0, 800);
    const commentsText = comments
      .map((c) => `${c.user_nombre ? `[${c.user_nombre}]` : "[ATC]"}: ${c.contenido}`)
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
      `## SEÑALES DETECTADAS AUTOMÁTICAMENTE\n${uniqueSignals.join(", ")}\n`,
    );
    lines.push(
      "Estas señales fueron detectadas por heurísticas antes de procesar. Respétalas en tu análisis de riesgo.\n",
    );
  }

  return { block: lines.join("\n"), ticketCount: tickets.length, signals: uniqueSignals };
}

// ─── Knowledge base loader ────────────────────────────────────────────────────

const KNOWLEDGE_ENTITY = "soporte_atc_knowledge_base";
const KNOWLEDGE_ENTITY_ID = "v1";

async function loadKnowledgeBase(authorization: string): Promise<string | null> {
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
        if (Array.isArray(d.items)) items = d.items as Record<string, unknown>[];
      }
    }
    const found = items.find(
      (i) => i.entity === KNOWLEDGE_ENTITY && i.entity_id === KNOWLEDGE_ENTITY_ID,
    );
    if (!found?.payload) return null;
    const payload = found.payload as Record<string, unknown>;
    return typeof payload.summary_text === "string" ? payload.summary_text : null;
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
    alumno_codigo?: string;
    signals?: string[];
    created_at: string;
  },
) {
  try {
    await fetch(buildUrl("/metadata"), {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity: "agente_uso_soporte_atc",
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

  const authorization = request.headers.get("authorization") ?? "";
  const typedMessages = messages as Array<{ role: string; content: string }>;
  const userMsg = String(typedMessages.at(-1)?.content ?? "");
  const currentSignals = detectRiskSignals(userMsg);

  let atcCtx: AtcContext = {
    block: "",
    ticketCount: 0,
    signals: currentSignals,
  };

  if (alumnoCode && authorization) {
    try {
      const ctx = await buildAtcContext(authorization, alumnoCode, alumnoName);
      atcCtx = {
        ...ctx,
        signals: Array.from(new Set([...ctx.signals, ...currentSignals])),
      };
    } catch {
      // continuar sin contexto
    }
  }

  // Load collective knowledge base from metadata (if available)
  let knowledgeBlock = "";
  if (authorization) {
    try {
      const kb = await loadKnowledgeBase(authorization);
      if (kb) knowledgeBlock = kb;
    } catch {
      // silencioso — el agente funciona sin base de conocimiento
    }
  }

  const signalBlock =
    atcCtx.signals.length > 0
      ? `\n\n[SEÑALES CRÍTICAS DETECTADAS]: ${atcCtx.signals.join(", ")}. Asegúrate de reflejar estas señales en tu análisis de riesgo y en la recomendación de escalación.`
      : "";

  const systemPrompt = [
    SYSTEM_SOPORTE_ATC,
    knowledgeBlock ? `\n\n${knowledgeBlock}` : "",
    atcCtx.block ? `\n\n${atcCtx.block}` : "",
    signalBlock,
  ]
    .filter(Boolean)
    .join("");

  const encoder = new TextEncoder();

  const emitContext = (controller: ReadableStreamDefaultController) => {
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "context",
          ticketCount: atcCtx.ticketCount,
          signals: atcCtx.signals,
        })}\n\n`,
      ),
    );
  };

  // ── Anthropic (default) ─────────────────────────────────────────────────────

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

          if (authorization) {
            void logAgentUsage(authorization, {
              agent_type: "soporte-atc",
              model: modelId,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              user_message_chars: userMsg.length,
              alumno_codigo: alumnoCode || undefined,
              signals: atcCtx.signals,
              created_at: new Date().toISOString(),
            });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: unknown) {
          const e = err as { status?: number; message?: string };
          let msg = e.message ?? "Error desconocido (Anthropic)";
          if (e.status === 401) msg = "API key de Anthropic inválida (401).";
          else if (e.status === 429) msg = "Rate limit en Anthropic (429).";
          else if (e.status === 404) msg = "Modelo no encontrado en Anthropic (404).";
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

        if (authorization) {
          void logAgentUsage(authorization, {
            agent_type: "soporte-atc",
            model: oaiModel,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            user_message_chars: userMsg.length,
            alumno_codigo: alumnoCode || undefined,
            signals: atcCtx.signals,
            created_at: new Date().toISOString(),
          });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        let msg = e.message ?? "Error desconocido";
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
