import { type NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// pdf-parse v1: import dinámico para evitar el bug del bundler que ejecuta su debug script
// Nota: pdf-parse@1 expone una función callable por default
async function parsePdf(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const fn = (mod as any).default ?? (mod as any);
  const result = await fn(buffer);
  return result.text as string;
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let text = "";

    if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      text = await parsePdf(buffer);
    } else {
      return NextResponse.json({ error: "Formato no soportado. Solo .docx y .pdf." }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "El archivo no tiene texto legible. Puede estar protegido o ser solo imágenes." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[parse-file] Error:", msg);
    return NextResponse.json({ error: `Error al procesar el archivo: ${msg}` }, { status: 500 });
  }
}
