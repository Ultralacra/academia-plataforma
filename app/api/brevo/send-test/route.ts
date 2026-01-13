import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";
import { buildWelcomeEmail } from "@/lib/email-templates/welcome";

export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function isEmail(s: string) {
  // Simple y suficiente para filtrar basura (Brevo hará validación estricta)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

type RecipientInput = string | { email?: unknown; name?: unknown; password?: unknown };
type RecipientInputV2 =
  | string
  | { email?: unknown; name?: unknown; password?: unknown; username?: unknown };
type Recipient = { email: string; name?: string; password?: string; username?: string };

function normalizeRecipients(value: unknown): Recipient[] {
  const arr: RecipientInputV2[] = Array.isArray(value) ? (value as RecipientInputV2[]) : [];
  const out: Recipient[] = [];

  for (const item of arr) {
    if (typeof item === "string") {
      const email = item.trim();
      if (email && isEmail(email)) out.push({ email });
      continue;
    }
    if (item && typeof item === "object") {
      const email = String((item as any).email ?? "").trim();
      const name = String((item as any).name ?? "").trim();
      const password = String((item as any).password ?? "").trim();
      const username = String((item as any).username ?? "").trim();
      if (email && isEmail(email)) {
        out.push({
          email,
          ...(name ? { name } : {}),
          ...(password ? { password } : {}),
          ...(username ? { username } : {}),
        });
      }
    }
  }

  // dedupe por email (merge: completa name/username/password si faltan)
  const map = new Map<string, Recipient>();
  for (const r of out) {
    const existing = map.get(r.email);
    if (!existing) {
      map.set(r.email, r);
      continue;
    }
    map.set(r.email, {
      email: existing.email,
      name: existing.name || r.name,
      username: existing.username || r.username,
      password: existing.password || r.password,
    });
  }
  return Array.from(map.values());
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
  const apiKey = String(process.env.BREVO_API_KEY ?? "").trim();

  const fromEmail = process.env.BREVO_FROM_EMAIL || "no-responder@sistemahotselling.com";
  const fromName = process.env.BREVO_FROM_NAME || "Sistema Hotselling";

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json({ status: "error", message: "Body inválido" }, 400);
  }

  const recipients = normalizeRecipients(body?.recipients);

  const appName = String(body?.appName ?? "Hotselling");
  const subjectOverride = String(body?.subject ?? "").trim();
  const origin = String(body?.origin ?? "").trim();
  const portalLink = String(body?.portalLink ?? "").trim();
  const defaultPassword = String(body?.password ?? "").trim();

  const template = String(body?.template ?? "welcome");
  if (template !== "welcome") {
    return json({ status: "error", message: "Template no soportada" }, 400);
  }

  if (recipients.length === 0) {
    return json({ status: "error", message: "No hay destinatarios válidos" }, 400);
  }

  const renderSubject = (name?: string) => {
    const n = String(name ?? "").trim();
    if (!subjectOverride) return "";
    // Soporta placeholder opcional
    return subjectOverride.includes("{{name}}")
      ? subjectOverride.replace(/\{\{name\}\}/g, n)
      : subjectOverride;
  };

  if (!apiKey) {
    return json({ status: "error", message: "Falta BREVO_API_KEY" }, 500);
  }

  async function sendOne(r: Recipient) {
    const resolvedPassword = String(r.password ?? defaultPassword ?? "").trim();
    const resolvedPortalLink = String(portalLink ?? "").trim();
    const resolvedUsername = String(r.username ?? "").trim();

    const email = buildWelcomeEmail({
      appName,
      origin,
      recipientName: r.name ?? null,
      recipientEmail: r.email,
      recipientUsername: resolvedUsername || null,
      recipientPassword: resolvedPassword || null,
      portalLink: resolvedPortalLink || null,
    });
    const resolvedSubject = renderSubject(r.name) || email.subject;

    const brevoPayload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: r.email, ...(r.name ? { name: r.name } : {}) }],
      subject: resolvedSubject,
      htmlContent: email.html,
      textContent: email.text,
    };

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
      return { ok: false as const, email: r.email, message, brevo: parsed ?? { raw: text } };
    }

    return { ok: true as const, email: r.email, brevo: parsed ?? { raw: text } };
  }

  // Envío real (con concurrencia moderada)
  try {
    const concurrency = 5;
    const results: Array<any> = [];

    for (let i = 0; i < recipients.length; i += concurrency) {
      const batch = recipients.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((r) => sendOne(r)));
      results.push(...batchResults);
    }

    const failed = results.filter((r) => !r.ok);
    const okCount = results.length - failed.length;

    if (failed.length > 0) {
      return json(
        {
          status: "error",
          message: failed[0]?.message ?? "Error enviando",
          toCount: recipients.length,
          okCount,
          failedCount: failed.length,
          failed: failed.slice(0, 10),
        },
        502
      );
    }

    return json({
      status: "success",
      message: "Correo enviado correctamente.",
      toCount: recipients.length,
      okCount,
    });
  } catch (e: any) {
    console.error("[Brevo] Exception:", e);
    return json({ status: "error", message: e?.message ?? "Error enviando" }, 500);
  }
}
