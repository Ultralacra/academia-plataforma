import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "app",
      "admin",
      "brevo",
      "claves.json"
    );

    const raw = await fs.readFile(filePath, "utf8");

    // Algunos exports traen NaN (no es JSON válido). Lo normalizamos a null.
    const sanitized = raw.replace(/\bNaN\b/g, "null");

    const parsed = JSON.parse(sanitized) as {
      cruce_completo?: unknown;
      metadata?: unknown;
    };

    const rows = Array.isArray(parsed?.cruce_completo) ? parsed.cruce_completo : [];

    return NextResponse.json({ cruce_completo: rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: "error",
        message: e?.message ?? "No se pudo leer claves.json",
      },
      { status: 500 }
    );
  }
}
