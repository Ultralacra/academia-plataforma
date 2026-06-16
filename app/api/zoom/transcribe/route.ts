import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface TranscribeRequest {
  downloadUrl: string;
  meetingTopic?: string;
  analyze?: boolean;
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

async function transcribeAudio(buffer: Buffer, contentType: string, fileName: string): Promise<string> {
  const openai = new OpenAI();
  const ext = getExtForWhisper(contentType, fileName);
  const file = new File([buffer], `audio.${ext}`, { type: contentType || "audio/mp4" });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "es",
  });
  return result.text;
}

async function analyzeTranscription(text: string, topic: string): Promise<string> {
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `Eres un analista de reuniones de una academia de inglés. Analiza la transcripción de una llamada de Zoom y genera un reporte conciso en español que incluya:

1. **Resumen**: Qué se discutió en la llamada (2-3 oraciones)
2. **Temas principales**: Lista de puntos clave tratados
3. **Acuerdos y compromisos**: Cualquier tarea o seguimiento mencionado
4. **Observaciones**: Notas relevantes sobre el estudiante, su progreso, o áreas de mejora
5. **Sugerencias**: Recomendaciones para la siguiente sesión

Sé directo y práctico. El reporte debe ser fácil de leer rápido.`,
      },
      {
        role: "user",
        content: `Tema de la reunión: ${topic}\n\nTranscripción:\n${text}`,
      },
    ],
  });
  return response.choices[0]?.message?.content || "No se pudo generar el análisis.";
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

  const { downloadUrl, meetingTopic, analyze = true } = body;
  if (!downloadUrl) {
    return Response.json({ error: "downloadUrl requerido" }, { status: 400 });
  }

  try {
    // 1. Download
    const { buffer, contentType, fileName } = await downloadFile(downloadUrl);

    // 2. Transcribe
    const transcription = await transcribeAudio(buffer, contentType, fileName);

    // 3. Analyze (optional)
    let analysis: string | null = null;
    if (analyze && transcription.length > 50) {
      analysis = await analyzeTranscription(transcription, meetingTopic || "Reunión Zoom");
    }

    return Response.json({ transcription, analysis });
  } catch (err: any) {
    return Response.json({ error: err.message || "Error en el pipeline de transcripción" }, { status: 500 });
  }
}
