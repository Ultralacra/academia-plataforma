import PizZip from "pizzip";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── XML helpers ─────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Extracts all <w:p> blocks with their full text (across multiple runs)
 * and their position in the XML string.
 */
function extractParagraphs(
  xml: string,
): Array<{ start: number; end: number; text: string }> {
  const result: Array<{ start: number; end: number; text: string }> = [];
  // Simple regex — safe because <w:p> is never nested inside another <w:p>
  const pOpen = /<w:p[ >]/g;
  let match: RegExpExecArray | null;

  while ((match = pOpen.exec(xml)) !== null) {
    const start = match.index;
    const closeIdx = xml.indexOf("</w:p>", start);
    if (closeIdx === -1) continue;
    const end = closeIdx + 6; // length of </w:p>
    const pXml = xml.slice(start, end);

    // Concatenate all <w:t> text nodes
    const tRegex = /<w:t(?:[^>]*)>([\s\S]*?)<\/w:t>/g;
    const parts: string[] = [];
    let tm: RegExpExecArray | null;
    while ((tm = tRegex.exec(pXml)) !== null) {
      parts.push(tm[1]);
    }
    result.push({ start, end, text: parts.join("") });
  }

  return result;
}

/**
 * Builds a blue-shaded block of paragraphs representing the AI feedback
 * for a specific task section.
 */
function buildObservationBlock(taskLabel: string, content: string): string {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Header paragraph (shaded background)
  let xml = `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="DBEAFE"/><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1E40AF"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Revision IA \u2014 ${escapeXml(taskLabel)}</w:t></w:r></w:p>`;

  for (const line of lines) {
    const cleaned = line
      // Remove markdown bold
      .replace(/\*\*(.*?)\*\*/g, "$1")
      // Remove markdown italic
      .replace(/\*(.*?)\*/g, "$1")
      // Keep emoji as-is (they render fine in Word)
      .trim();

    if (!cleaned) continue;

    xml += `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/><w:spacing w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:color w:val="1E40AF"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(cleaned)}</w:t></w:r></w:p>`;
  }

  // Empty separator paragraph
  xml += `<w:p><w:r><w:t></w:t></w:r></w:p>`;

  return xml;
}

// ─── Task number detection ────────────────────────────────────────────────────

/**
 * Given a paragraph index in the paragraphs array, look backwards (up to 60
 * paragraphs) to find the most recently seen TAREA number. Returns null if
 * no task marker is found.
 */
function findTaskNumberBefore(
  paragraphs: Array<{ text: string }>,
  idx: number,
): string | null {
  const look = Math.max(0, idx - 60);
  for (let i = idx; i >= look; i--) {
    const t = paragraphs[i].text;
    const m =
      t.match(/TAREA\s+(\d)/i) ??
      t.match(/Tarea\s+(\d)/) ??
      t.match(/T(\d)\s*[–\-—]/);
    if (m) return m[1];
  }
  return null;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      docxBase64,
      observations,
      reviewText,
    }: {
      docxBase64: string | null;
      observations: Record<string, string>;
      reviewText?: string;
    } = body;

    const hasObservations = Object.keys(observations ?? {}).length > 0;
    const content = hasObservations
      ? Object.entries(observations)
          .map(([k, v]) => {
            const label =
              k === "verdict"
                ? "VEREDICTO FINAL"
                : k === "context"
                  ? "CONTEXTO DEL ECOSISTEMA"
                  : `TAREA ${k.replace("t", "")}`;
            return `=== ${label} ===\n${v}`;
          })
          .join("\n\n")
      : (reviewText ?? "");

    if (!content) {
      return NextResponse.json(
        { error: "No hay contenido de revisión para exportar" },
        { status: 400 },
      );
    }

    // ── Caso PDF o sin DOCX: crear un documento Word nuevo desde cero ────────
    if (!docxBase64) {
      const reviewBlock = buildObservationBlock("REVISIÓN DEL AGENTE IA", content);
      const newXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14"><w:body>${reviewBlock}<w:sectPr/></w:body></w:document>`;

      const zip = new PizZip();
      // Minimal DOCX structure
      zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
      zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
      zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
      zip.file("word/document.xml", newXml);

      const outputBuffer: Buffer = zip.generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      }) as Buffer;

      return new Response(outputBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="revision-ia.docx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // ── Caso DOCX: abrir el original e inyectar observaciones ────────────────
    const buffer = Buffer.from(docxBase64, "base64");
    const zip = new PizZip(buffer);
    const xmlFile = zip.files["word/document.xml"];

    if (!xmlFile) {
      return NextResponse.json(
        { error: "No se encontró word/document.xml en el DOCX" },
        { status: 422 },
      );
    }

    let xml: string = xmlFile.asText();
    const paragraphs = extractParagraphs(xml);
    const injections: Array<{ afterIndex: number; block: string }> = [];

    const observacionPatterns = [
      /observaci[oó]n/i,
      /observaciones/i,
      /coach.*observ/i,
      /feedback.*coach/i,
      /notas.*coach/i,
      /revisar.*coach/i,
    ];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const isObsSection = observacionPatterns.some((rx) => rx.test(p.text));
      if (!isObsSection) continue;

      const taskNum = findTaskNumberBefore(paragraphs, i);
      if (!taskNum) continue;

      const key = `t${taskNum}`;
      const obsContent = observations[key];
      if (!obsContent) continue;

      injections.push({
        afterIndex: p.end,
        block: buildObservationBlock(`TAREA ${taskNum}`, obsContent),
      });
    }

    if (injections.length === 0) {
      const bodyClose = xml.lastIndexOf("</w:body>");
      if (bodyClose !== -1) {
        let fullBlock = buildObservationBlock("REVISIÓN DEL AGENTE IA", content);
        if (hasObservations && observations["context"]) {
          fullBlock =
            buildObservationBlock("CONTEXTO DEL ECOSISTEMA", observations["context"]) +
            fullBlock;
        }
        xml = xml.slice(0, bodyClose) + fullBlock + xml.slice(bodyClose);
      }
    } else {
      const sorted = injections.sort((a, b) => b.afterIndex - a.afterIndex);
      for (const inj of sorted) {
        xml =
          xml.slice(0, inj.afterIndex) + inj.block + xml.slice(inj.afterIndex);
      }
    }

    zip.file("word/document.xml", xml);
    const outputBuffer: Buffer = zip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    }) as Buffer;

    return new Response(outputBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="revision-hotselling.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[export-docx]", msg);
    return NextResponse.json(
      { error: `Error al generar el documento: ${msg}` },
      { status: 500 },
    );
  }
}
