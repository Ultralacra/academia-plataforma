import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";
import {
  applyTemplateOverrideWithVars,
  fetchMailTemplateOverride,
} from "@/app/api/brevo/_shared/template-runtime";
import {
  getContractExpirySource,
  CONTRACT_EXPIRY_TEMPLATES,
  type ContractExpiryKey,
} from "@/lib/email-templates/contract-expiry";

export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function requireStaff(token: string | null) {
  const allowNoAuth =
    String(process.env.BREVO_ALLOW_NOAUTH ?? "").toLowerCase() === "true";
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

    if (!res.ok) {
      return { ok: false as const, status: res.status, error: "No autorizado" };
    }

    const raw: any = await res.json().catch(() => null);
    const me: any = raw?.data ?? raw ?? {};
    const role = String(me?.role ?? me?.tipo ?? "").trim().toLowerCase();
    if (!["admin", "equipo", "coach", "atc"].includes(role)) {
      return { ok: false as const, status: 403, error: "Solo staff" };
    }

    return { ok: true as const, me };
  } catch {
    return { ok: false as const, status: 500, error: "Error validando sesión" };
  }
}

const VALID_KEYS = new Set<string>(CONTRACT_EXPIRY_TEMPLATES.map((t) => t.key));

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

  const apiKey = String(
    process.env.BREVO_API_KEY ?? process.env.NEXT_PUBLIC_BREVO_API_KEY ?? "",
  ).trim();
  if (!apiKey) {
    return json(
      { status: "error", message: "Falta BREVO_API_KEY / NEXT_PUBLIC_BREVO_API_KEY" },
      500,
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json({ status: "error", message: "Body inválido" }, 400);
  }

  const to = String(body?.to ?? "").trim().toLowerCase();
  if (!to || !isEmail(to)) {
    return json({ status: "error", message: "Email destino inválido" }, 400);
  }

  const templateKey = String(body?.templateKey ?? "").trim();
  if (!VALID_KEYS.has(templateKey)) {
    return json(
      {
        status: "error",
        message: `Template inválido. Valores válidos: ${Array.from(VALID_KEYS).join(", ")}`,
      },
      400,
    );
  }

  const fromEmail =
    process.env.BREVO_FROM_EMAIL ||
    process.env.NEXT_PUBLIC_BREVO_FROM_EMAIL ||
    "no-responder@sistemahotselling.com";
  const fromName =
    process.env.BREVO_FROM_NAME ||
    process.env.NEXT_PUBLIC_BREVO_FROM_NAME ||
    "Sistema Hotselling";

  const vars = {
    appName: String(body?.appName || "Hotselling").trim() || "Hotselling",
    recipientName: String(body?.recipientName || "").trim(),
    recipientEmail: to,
  };

  const baseSource = getContractExpirySource(templateKey as ContractExpiryKey);
  const override = await fetchMailTemplateOverride(token, templateKey);
  const rendered = applyTemplateOverrideWithVars(baseSource, override, vars);

  const brevoPayload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to, ...(vars.recipientName ? { name: vars.recipientName } : {}) }],
    subject: rendered.subject,
    htmlContent: rendered.html,
    textContent: rendered.text,
    tags: [templateKey, "contract_expiry"],
    trackingSettings: {
      openTracking: { enabled: true },
      clickTracking: { enabled: true },
    },
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

    const tplMeta = CONTRACT_EXPIRY_TEMPLATES.find((t) => t.key === templateKey);
    return json({
      status: "success",
      message: `Correo "${tplMeta?.name ?? templateKey}" enviado a ${to}`,
    });
  } catch (e: any) {
    return json({ status: "error", message: e?.message ?? "Error enviando" }, 500);
  }
}
