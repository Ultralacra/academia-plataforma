import * as XLSX from "xlsx";

export const runtime = "nodejs";

function safeFilename(name: string) {
  const cleaned = String(name || "export.xlsx")
    .replace(/[\\/\r\n\t\0]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.toLowerCase().endsWith(".xlsx") ? cleaned : `${cleaned}.xlsx`;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows || rows.length === 0) {
    return Response.json({ error: "No hay filas para exportar" }, { status: 400 });
  }

  const filename = safeFilename(body?.filename || "login_test_ok.xlsx");

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "OK");

  // Buffer (Node.js) para responder como archivo descargable
  const buf: Buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as any;

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
