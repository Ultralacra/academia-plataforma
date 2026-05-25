import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, areaName } = body as { title?: string; areaName?: string };

    if (!title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const prompt = `Eres un experto en OKRs y gestión de equipos de alto rendimiento. Analiza el siguiente Key Result y genera una sugerencia estructurada para medirlo objetivamente.

Área: ${areaName?.trim() || "General"}
KR: "${title.trim()}"

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones adicionales, solo el JSON):
{
  "description": "descripción clara de qué mide este KR y por qué es importante para el equipo (máximo 2 oraciones)",
  "measurementType": "numeric",
  "unit": "unidad de medida (ejemplos: $, USD, clientes, leads, contratos, horas, %, puntos). Elige la más apropiada.",
  "targetSuggestion": 0,
  "formula": "descripción simple de cómo calcular el avance (ej: '(valor actual / meta) × 100 = % de avance')",
  "reasoning": "por qué este tipo de medición es el más adecuado para este KR (1 oración)"
}

Reglas para measurementType:
- "numeric": cuando hay un valor numérico claro (ventas, ingresos, cantidad de clientes, leads, contratos, etc.)
- "percentage": cuando ya se mide directamente en porcentaje
- "boolean": cuando es un hito binario (completado/no completado)
- "manual": cuando no hay forma objetiva de medirlo numéricamente

Para targetSuggestion: infiere un valor numérico razonable del enunciado del KR. Si no hay número explícito, pon null.
Para unit: sé específico y conciso (máximo 10 caracteres).`;

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Extract JSON even if wrapped in code blocks
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "invalid model response" },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      description: String(parsed.description ?? ""),
      measurementType: ["numeric", "percentage", "boolean", "manual"].includes(
        parsed.measurementType,
      )
        ? parsed.measurementType
        : "manual",
      unit: String(parsed.unit ?? ""),
      targetSuggestion:
        typeof parsed.targetSuggestion === "number"
          ? parsed.targetSuggestion
          : null,
      formula: String(parsed.formula ?? ""),
      reasoning: String(parsed.reasoning ?? ""),
    });
  } catch (err) {
    console.error("[kr-ai-suggest]", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
