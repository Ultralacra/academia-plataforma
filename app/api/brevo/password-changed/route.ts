import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { buildPasswordChangedEmail } from "@/lib/email-templates/password-changed";

export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function requireStaff(token: string | null) {
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
    if (!["admin", "coach", "equipo"].includes(role)) {
      return { ok: false as const, status: 403, error: "Solo staff" };
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

  const gate = await requireStaff(token);
  if (!gate.ok) return json({ status: "error", message: gate.error }, gate.status);

  const apiKey = String(process.env.BREVO_API_KEY ?? "").trim();
  if (!apiKey) return json({ status: "error", message: "Falta BREVO_API_KEY" }, 500);

  const fromEmail = process.env.BREVO_FROM_EMAIL || "no-responder@sistemahotselling.com";
  const fromName = process.env.BREVO_FROM_NAME || "Sistema Hotselling";

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json({ status: "error", message: "Body inválido" }, 400);
  }

  const email = String(body?.email ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const username = String(body?.username ?? "").trim();
  const newPassword = String(body?.newPassword ?? body?.password ?? "").trim();
  const appName = String(body?.appName ?? "Hotselling").trim();
  const origin = String(body?.origin ?? "").trim() || getPublicAppOrigin();
  const portalLink = String(body?.portalLink ?? "").trim() || `${origin.replace(/\/$/, "")}/login`;

  if (!email || !isEmail(email)) {
    return json({ status: "error", message: "Email inválido" }, 400);
  }
  if (!newPassword) {
    return json({ status: "error", message: "Falta newPassword" }, 400);
  }

  const emailTpl = buildPasswordChangedEmail({
    appName,
    origin,
    portalLink,
    recipientName: name || null,
    recipientEmail: email,
    recipientUsername: username || null,
    newPassword,
  });

  const subjectOverride = String(body?.subject ?? "").trim();
  const subject = subjectOverride || emailTpl.subject;

  const brevoPayload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email, ...(name ? { name } : {}) }],
    subject,
    htmlContent: emailTpl.html,
    textContent: emailTpl.text,
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

    const text = await res.text().catch(() => "");
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const message =
        String(parsed?.message ?? "").trim() ||
        String(parsed?.error ?? "").trim() ||
        text ||
        `Brevo HTTP ${res.status}`;

      return json(
        {
          status: "error",
          message,
        },
        502
      );
    }

    return json({ status: "success", message: "Correo enviado" });
  } catch (e: any) {
    return json({ status: "error", message: e?.message ?? "Error enviando" }, 500);
  }
}
