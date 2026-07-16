import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, areaName, description } = body as {
      title?: string;
      areaName?: string;
      description?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const userDescription = (description ?? "").trim();

    const prompt = `Eres un experto en OKRs y gestión de equipos de alto rendimiento. El usuario está creando un Key Result y ya escribió un nombre y una descripción inicial. Tu rol NO es reescribir su descripción, sino PROPONER MEJORAS para que el KR sea más claro, medible y accionable, respetando la intención original del usuario.

Área: ${areaName?.trim() || "General"}
Nombre del KR: "${title.trim()}"
Descripción del usuario: ${userDescription ? `"${userDescription}"` : "(no proporcionada)"}

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones adicionales, solo el JSON):
{
  "improvedDescription": "versión MEJORADA y enriquecida de la descripción del usuario (manteniendo su intención original). Si el usuario no proporcionó descripción, redacta una breve a partir del nombre. Máximo 2 oraciones.",
  "improvementNotes": "lista breve (1-3 puntos, separados por ' • ') de qué se mejoró o sugerencias concretas para que el usuario haga el KR más medible/accionable",
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

    const apiKey = process.env.XACADEMY_KR_AI_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "XACADEMY_KR_AI_API_KEY no configurada" }, { status: 500 });
    }
    const modelId = process.env.XACADEMY_KR_AI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o";
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: modelId,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const rawText = completion.choices[0]?.message?.content?.trim() || "";

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
      improvedDescription: String(parsed.improvedDescription ?? ""),
      improvementNotes: String(parsed.improvementNotes ?? ""),
      // Se mantiene `description` por retrocompatibilidad (clientes antiguos).
      description: String(parsed.improvedDescription ?? ""),
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
