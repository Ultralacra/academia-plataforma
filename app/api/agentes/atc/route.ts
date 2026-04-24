import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Eres un agente de ATC Administrativo para una academia online. Tu misión es ayudar al equipo de admin a asignar el MEJOR equipo de coaches a un alumno nuevo, basándote siempre en datos reales.

Tienes acceso a un objeto JSON "analysis" con:
- "coaches": lista ya filtrada (Copy y ATC vienen restringidos por whitelist; Ads, Mentalidad y Técnico traen a todos los disponibles). Para cada coach incluye:
  * alumnos_total, alumnos_activos_7d, alumnos_activos_30d, alumnos_inactivos_30d_mas, alumnos_sin_actividad_registrada
  * prom_dias_inactividad (promedio de días desde la última actividad de sus alumnos; null si no hay datos)
  * alumnos_muy_activos (muestra de alumnos con <= 3 días de inactividad)
  * tickets_totales_historicos, tickets_ultimos_7d, tickets_ultimos_30d
  * tickets_por_alumno_30d, tickets_por_dia_promedio_30d
  * score_carga (menor = mejor candidato). Ya combina alumnos + 1.5*tickets_7d + 0.5*tickets_30d + 0.25*alumnos_activos_7d - 0.1*inactivos_30d
- "resumen_por_area": totales y promedios por área.
- "whitelists": listas blancas que ya están aplicadas.
- "top_informantes": alumnos que más tickets han creado en los últimos 30 días.

REGLAS para recomendar equipo a un alumno nuevo:
1. El equipo completo tiene un coach por área: ATC, Ads, Copy, Mentalidad y Técnico. Si alguna área no tiene coaches disponibles, indícalo claramente y no inventes.
2. Dentro de cada área elige al coach con MENOR "score_carga". Ante empates: menos tickets_ultimos_7d → menos alumnos_total → menos tickets_ultimos_30d → alfabético.
3. Si un coach tiene muchos alumnos_muy_activos o tickets_por_alumno_30d alto, penalízalo en tu justificación aunque su score sea similar al otro candidato: significa que su carga diaria es intensa.
4. Nunca inventes nombres ni códigos; usa solo los que estén en "analysis.coaches".

FORMATO DE RESPUESTA cuando el usuario pida el equipo sugerido:
- Primero, una tabla Markdown clara:
  | Área | Coach sugerido | Alumnos | Activos 7d | Tickets 7d | Tickets 30d | Score |
- Después, un **análisis profundo** en párrafo (4-6 líneas) que justifique la decisión citando números concretos: cuántos alumnos lleva cada coach, qué tan activos son sus alumnos, cuántos tickets crearon en los últimos 7 y 30 días, y qué tan cargado está respecto al promedio del área. Termina comparando el equipo propuesto con el promedio por área.
- Si hay top_informantes relevantes (alumnos con muchos tickets) y alguno ya pertenece al coach sugerido, menciónalo como advertencia de "carga diaria extra".

Para otras preguntas, responde con tablas y bullets en español, usando SIEMPRE los datos del analysis.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada en el servidor." },
        { status: 500 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: InMessage[];
      analysis?: unknown;
      top_informantes?: unknown;
      // compat con versión anterior
      coaches?: unknown;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un mensaje." },
        { status: 400 },
      );
    }

    const contextParts: string[] = [SYSTEM_PROMPT, ""];

    if (body.analysis) {
      contextParts.push(
        "=== CONTEXTO: ANALYSIS (JSON) ===",
        JSON.stringify(body.analysis).slice(0, 60_000),
        "=== FIN ANALYSIS ===",
        "",
      );
    } else if (body.coaches) {
      // compat
      contextParts.push(
        "=== CONTEXTO: LISTADO DE COACHES (JSON) ===",
        JSON.stringify(body.coaches).slice(0, 40_000),
        "=== FIN CONTEXTO ===",
        "",
      );
    }

    if (body.top_informantes) {
      contextParts.push(
        "=== TOP INFORMANTES (últimos 30 días) ===",
        JSON.stringify(body.top_informantes).slice(0, 10_000),
        "=== FIN TOP INFORMANTES ===",
      );
    }

    const systemWithContext = contextParts.join("\n");
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-5";

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemWithContext,
        messages: messages.map((m) => ({
          role: m.role,
          content: String(m.content ?? ""),
        })),
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Anthropic API error ${apiRes.status}`,
          details: errText.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await apiRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text =
      data.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n")
        .trim() || "";

    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error desconocido" },
      { status: 500 },
    );
  }
}
