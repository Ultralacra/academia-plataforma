import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const oaiKey = process.env.OPENAI_API_KEY;
  if (!oaiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY no configurada" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "FormData inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof File)) {
    return new Response(JSON.stringify({ error: "Campo 'audio' requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const openai = new OpenAI({ apiKey: oaiKey });

    // Whisper soporta: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const type = audioFile.type || "";
    let ext = "mp4";
    if (type.includes("ogg")) ext = "ogg";
    else if (type.includes("webm")) ext = "webm";
    else if (type.includes("mp3") || type.includes("mpeg")) ext = "mp3";
    else if (type.includes("m4a")) ext = "m4a";
    else if (type.includes("wav")) ext = "wav";
    else if (type.includes("mp4")) ext = "mp4";

    const namedFile = new File([audioFile], `audio.${ext}`, {
      type: audioFile.type || "audio/mp4",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: namedFile,
      model: "whisper-1",
      language: "es",
    });

    return new Response(JSON.stringify({ text: transcription.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return new Response(
      JSON.stringify({ error: e.message ?? "Error de transcripción" }),
      {
        status: e.status ?? 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
