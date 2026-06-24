import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

interface TranscribeRequest {
  downloadUrl: string;
  meetingTopic?: string;
  closerEmail?: string;
  closerName?: string;
  recordingStart?: string;
  duration?: number;
}

async function downloadFile(url: string): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error descargando archivo: ${res.status}`);
  const contentType = res.headers.get("content-type") || "audio/mp4";
  const contentDisp = res.headers.get("content-disposition") || "";
  let fileName = "recording.mp4";
  const match = contentDisp.match(/filename="?([^";\n]+)"?/);
  if (match) fileName = match[1];
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType, fileName };
}

function getExtForWhisper(contentType: string, fileName: string): string {
  const ct = contentType.toLowerCase();
  const fn = fileName.toLowerCase();
  if (ct.includes("ogg") || fn.endsWith(".ogg")) return "ogg";
  if (ct.includes("webm") || fn.endsWith(".webm")) return "webm";
  if (ct.includes("mp3") || ct.includes("mpeg") || fn.endsWith(".mp3")) return "mp3";
  if (ct.includes("m4a") || fn.endsWith(".m4a")) return "m4a";
  if (ct.includes("wav") || fn.endsWith(".wav")) return "wav";
  return "mp4";
}

interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface WhisperVerboseResult {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function transcribeWithTimestamps(
  buffer: Buffer,
  contentType: string,
  fileName: string,
): Promise<{ fullText: string; segments: WhisperSegment[] }> {
  const openai = new OpenAI();
  const ext = getExtForWhisper(contentType, fileName);
  const file = new File([buffer], `audio.${ext}`, { type: contentType || "audio/mp4" });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "es",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  }) as unknown as WhisperVerboseResult;

  return {
    fullText: result.text,
    segments: result.segments || [],
  };
}

async function analyzeWithGPT(
  fullTranscript: string,
  segments: WhisperSegment[],
  topic: string,
  closerName: string,
  recordingStart: string,
): Promise<any> {
  const openai = new OpenAI();
  const modelId = process.env.OPENAI_MODEL ?? "gpt-5";

  const segmentsWithTimestamps = segments
    .filter((s) => s.text.trim().length > 0)
    .map((s) => `[${formatTimestamp(s.start)}] ${s.text.trim()}`)
    .join("\n");

  const systemPrompt = `Eres un analista experto de llamadas de ventas de una academia de alto rendimiento que vende programas de inglés y desarrollo profesional.

Analiza la transcripción de una llamada comercial Zoom entre un closer (vendedor: ${closerName || "desconocido"}) y un prospecto (cliente potencial).

IMPORTANTE: 
- Identifica quién es el Closer (vendedor) y quién es el Prospecto basándote en el contexto de la conversación.
- Toda conclusión DEBE estar respaldada por evidencia real extraída de la conversación.
- Ningún insight debe ser inferido sin mostrar la frase específica y el minuto exacto donde fue identificado.
- Los timestamps están en formato [MM:SS] al inicio de cada segmento.
- Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones adicionales.

El JSON debe tener exactamente esta estructura:

{
  "won": true/false,
  "closeProbability": 0-100,
  "leadTemperature": "Frío" | "Tibio" | "Caliente",
  "reasonWon": "razón principal por la que se ganó o string vacío si se perdió",
  "reasonLost": "razón principal por la que se perdió o string vacío si se ganó",
  "nextAction": "próxima acción recomendada concreta",
  "idealFollowUpDate": "fecha ideal de seguimiento en formato YYYY-MM-DD o null",
  "executiveSummary": "resumen ejecutivo de 3-5 oraciones de la conversación completa",

  "talkRatio": {
    "closer": 45,
    "prospect": 55,
    "alert": null o "Closer habló más del 65% del tiempo"
  },

  "discovery": {
    "score": 0-10,
    "problemIdentification": true/false,
    "painDeepening": true/false,
    "consequences": true/false,
    "economicImpact": true/false,
    "emotionalImpact": true/false,
    "urgency": true/false,
    "previousAttempts": true/false,
    "objectives": true/false,
    "realMotivators": true/false,
    "decisionCapacity": true/false,
    "strengths": ["fortaleza 1", "fortaleza 2"],
    "improvements": ["oportunidad 1", "oportunidad 2"]
  },

  "questions": {
    "openEnded": 0,
    "closed": 0,
    "deepening": 0,
    "diagnostic": 0
  },

  "valueBuilding": {
    "score": 0-10,
    "personalization": true/false,
    "problemSolutionConnection": true/false,
    "methodClarity": true/false,
    "programClarity": true/false,
    "expectedResultsClarity": true/false
  },

  "offer": {
    "score": 0-10,
    "offerClarity": true/false,
    "priceClarity": true/false,
    "conditionsClarity": true/false,
    "nextStepsClarity": true/false,
    "expectationsClarity": true/false
  },

  "objections": [
    {
      "type": "Precio | Tiempo | Pareja | Confianza | Prioridad | Momento | Financiamiento | Experiencias negativas previas",
      "minute": "MM:SS",
      "response": "respuesta del closer a la objeción",
      "result": "Resuelta | Parcialmente resuelta | No resuelta",
      "evidence": "frase textual del prospecto con minuto"
    }
  ],
  "objectionScore": 0-10,

  "processCompliance": {
    "opening": 0-100,
    "rapport": 0-100,
    "discovery": 0-100,
    "diagnosis": 0-100,
    "presentation": 0-100,
    "offer": 0-100,
    "close": 0-100,
    "followUp": 0-100
  },

  "prospectProfile": {
    "name": "nombre del prospecto o 'No identificado'",
    "profession": "profesión",
    "niche": "nicho de mercado",
    "experienceLevel": "Principiante | Intermedio | Avanzado | Experto",
    "currentRevenue": "facturación actual aproximada",
    "targetRevenue": "facturación objetivo",
    "mainPain": "dolor principal declarado",
    "programOfInterest": "programa que le interesa",
    "consciousnessLevel": "No consciente | Consciente del problema | Consciente de la solución | Consciente del programa | Totalmente consciente",
    "mainProblem": "problema principal identificado",
    "currentConsequences": ["consecuencia 1", "consecuencia 2"],
    "objectives": {
      "shortTerm": "objetivo a corto plazo",
      "longTerm": "objetivo a largo plazo"
    },
    "previousAttempts": ["intento previo 1"],
    "emotionalMotivators": ["Más tiempo con la familia", "Libertad financiera", "Reconocimiento", "Crecimiento profesional", "Seguridad económica", "Legado"],
    "behavioralProfile": "Analítico | Dominante | Relacional | Impulsivo",
    "behavioralProfileExplanation": "explicación de por qué se clasificó así"
  },

  "deliverySummary": {
    "whyBought": "por qué compró (si aplica)",
    "desiredResult": "resultado que desea conseguir",
    "programExpectation": "expectativa del programa",
    "concerns": ["preocupación 1"],
    "currentLimitations": ["limitación actual 1"],
    "resources": ["recurso que posee 1"],
    "commitmentLevel": "Alto | Medio | Bajo",
    "identifiedRisks": ["riesgo identificado 1"],
    "supportNeeded": "tipo de acompañamiento que necesitará",
    "promisesUnderstood": ["promesa que entendió 1"],
    "believesWillReceive": "lo que cree que va a recibir"
  },

  "expectationMatchScore": 0-100,

  "coaching": {
    "strengths": ["fortaleza principal 1", "fortaleza principal 2", "fortaleza principal 3"],
    "opportunities": ["oportunidad de mejora 1", "oportunidad de mejora 2", "oportunidad de mejora 3"],
    "actionPlan": ["acción concreta 1", "acción concreta 2"]
  },

  "alerts": [
    {
      "type": "Discovery Score < 7 | Value Score < 7 | Offer Score < 7 | Talk Ratio > 65% | Riesgo > 60 | Expectation Match < 80 | Objeción crítica sin resolver | Posible venta mal calificada",
      "severity": "warning | critical",
      "detail": "detalle específico"
    }
  ],

  "risks": ["riesgo 1", "riesgo 2"],
  "salesRecommendations": ["recomendación para ventas 1"],
  "deliveryRecommendations": ["recomendación para delivery 1"],

  "evidence": [
    {
      "insight": "descripción del insight detectado",
      "phrase": "frase textual exacta del transcript",
      "minute": "MM:SS"
    }
  ]
}`;

  const userPrompt = `DATOS DE LA LLAMADA:
- Fecha: ${recordingStart || "Desconocida"}
- Closer (vendedor): ${closerName || "No especificado"}
- Tema: ${topic || "Llamada de ventas"}

TRANSCRIPCIÓN COMPLETA CON TIMESTAMPS:

${segmentsWithTimestamps}

Analiza esta transcripción de ventas y genera el JSON completo según la estructura especificada. Asegúrate de incluir evidencia real (frases textuales + minutos) para cada insight.`;

  const response = await openai.chat.completions.create({
    model: modelId,
    temperature: 0.2,
    max_tokens: 16000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    throw new Error("No se pudo parsear la respuesta JSON del análisis");
  }
}

export async function POST(request: NextRequest) {
  const oaiKey = process.env.OPENAI_API_KEY;
  if (!oaiKey) {
    return Response.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  let body: TranscribeRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { downloadUrl, meetingTopic, closerEmail, closerName, recordingStart, duration } = body;
  if (!downloadUrl) {
    return Response.json({ error: "downloadUrl requerido" }, { status: 400 });
  }

  try {
    // 1. Download audio
    const { buffer, contentType, fileName } = await downloadFile(downloadUrl);

    // 2. Transcribe with timestamps
    const { fullText, segments } = await transcribeWithTimestamps(buffer, contentType, fileName);

    // 3. Analyze with GPT
    const analysis = await analyzeWithGPT(
      fullText,
      segments,
      meetingTopic || "Llamada de ventas",
      closerName || closerEmail || "",
      recordingStart || "",
    );

    return Response.json({
      transcription: fullText,
      segments: segments.map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      analysis,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Error en el pipeline de análisis de ventas" }, { status: 500 });
  }
}
