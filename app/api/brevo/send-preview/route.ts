import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function requireAdmin(token: string | null) {
  const allowNoAuth = String(process.env.BREVO_ALLOW_NOAUTH ?? "").toLowerCase() === "true";
  if (!token) {
    if (allowNoAuth || process.env.NODE_ENV !== "production") {
      return { ok: true as const, me: { email: "local@dev", role: "admin (dev)" } };
    }
    return { ok: false as const, status: 401, error: "No autorizado" };
  }

  try {
    const res = await fetch(buildUrl("/auth/me"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return { ok: false as const, status: res.status, error: "No autorizado" };
    const me: any = await res.json();
    const role = String(me?.role ?? "").toLowerCase();
    if (role !== "admin") {
      return { ok: false as const, status: 403, error: "Solo admin" };
    }

    return { ok: true as const, me };
  } catch {
    return { ok: false as const, status: 500, error: "Error validando sesión" };
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

  const apiKey = String(process.env.BREVO_API_KEY ?? "").trim();
  if (!apiKey) return json({ status: "error", message: "Falta BREVO_API_KEY" }, 500);

  const fromEmail = process.env.BREVO_FROM_EMAIL || "no-responder@sistemahotselling.com";
  const fromName = process.env.BREVO_FROM_NAME || "Sistema Hotselling";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ status: "error", message: "Body inválido" }, 400);
  }

  const to = String(body?.to ?? "").trim().toLowerCase();
  const subject = String(body?.subject ?? "").trim();
  const html = String(body?.html ?? "").trim();
  const text = String(body?.text ?? "").trim();

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json({ status: "error", message: "Email destino inválido" }, 400);
  }
  if (!subject) {
    return json({ status: "error", message: "Falta subject" }, 400);
  }
  if (!html && !text) {
    return json({ status: "error", message: "Falta contenido (html o text)" }, 400);
  }

  const brevoPayload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(brevoPayload),
    });

    const raw = await res.text().catch(() => "");
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const message =
        String(parsed?.message ?? "").trim() ||
        String(parsed?.error ?? "").trim() ||
        raw ||
        `Brevo HTTP ${res.status}`;
      return json({ status: "error", message }, 502);
    }

    return json({ status: "success", message: "Correo de prueba enviado" });
  } catch (e: any) {
    return json({ status: "error", message: e?.message ?? "Error enviando" }, 500);
  }
}
