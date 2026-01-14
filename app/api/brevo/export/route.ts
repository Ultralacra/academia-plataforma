import * as XLSX from "xlsx";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildUrl } from "@/lib/api-config";

export const runtime = "nodejs";

function safeFilename(name: string) {
  const cleaned = String(name || "export.xlsx")
    .replace(/[\\/\r\n\t\0]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.toLowerCase().endsWith(".xlsx") ? cleaned : `${cleaned}.xlsx`;
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function requireAdmin(token: string | null) {
  if (!token) return { ok: false, status: 401, error: "No autorizado" };

  try {
    const res = await fetch(buildUrl("/auth/me"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, status: res.status, error: "No autorizado" };
    }

    const me: any = await res.json();
    const role = String(me?.role ?? "").toLowerCase();
    if (role !== "admin") {
      return { ok: false, status: 403, error: "Solo admin" };
    }

    return { ok: true as const, me };
  } catch {
    return { ok: false, status: 500, error: "Error validando sesión" };
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const tokenFromHeader = (() => {
    const v = String(authHeader ?? "").trim();
    if (!v) return null;
    const m = v.match(/^Bearer\s+(.+)$/i);
    return m?.[1]?.trim() || null;
  })();

  const tokenFromCookie = cookies().get("token")?.value ?? null;
  const token = tokenFromHeader || tokenFromCookie;

  const gate = await requireAdmin(token);
  if (!gate.ok) return json({ status: "error", message: gate.error }, gate.status);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ status: "error", message: "Body JSON inválido" }, 400);
  }

  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows || rows.length === 0) {
    return json({ status: "error", message: "No hay filas para exportar" }, 400);
  }

  const filename = safeFilename(body?.filename || "brevo_usuarios.xlsx");

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios");

  const buf: Buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as any;

  return new Response(buf as any, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
