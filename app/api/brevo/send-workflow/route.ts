import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";
import {
  applyTemplateOverrideWithVars,
  fetchMailTemplateOverride,
} from "@/app/api/brevo/_shared/template-runtime";
import {
  getOnboardingWorkflowSource,
  ONBOARDING_WORKFLOW_TEMPLATES,
  type OnboardingStep,
} from "@/lib/email-templates/onboarding-workflow";
import {
  getStarterWorkflowSource,
  STARTER_WORKFLOW_TEMPLATES,
  type StarterStep,
} from "@/lib/email-templates/starter-workflow";

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
    if (!["admin", "equipo", "sales", "coach"].includes(role)) {
      return { ok: false as const, status: 403, error: "Solo staff" };
    }

    return { ok: true as const, me };
  } catch {
    return { ok: false as const, status: 500, error: "Error validando sesión" };
  }
}

type WorkflowKind = "onboarding" | "starter";

const ONBOARDING_STEPS = ONBOARDING_WORKFLOW_TEMPLATES.map(
  (item) => item.step,
) as OnboardingStep[];
const STARTER_STEPS = STARTER_WORKFLOW_TEMPLATES.map(
  (item) => item.step,
) as StarterStep[];

function getWorkflowEntries(kind: WorkflowKind) {
  if (kind === "onboarding") {
    return ONBOARDING_STEPS.map((step, index) => {
      const meta = ONBOARDING_WORKFLOW_TEMPLATES[index];
      return {
        key: meta.key,
        name: meta.name,
        source: getOnboardingWorkflowSource(step),
      };
    });
  }

  return STARTER_STEPS.map((step, index) => {
    const meta = STARTER_WORKFLOW_TEMPLATES[index];
    return {
      key: meta.key,
      name: meta.name,
      source: getStarterWorkflowSource(step),
    };
  });
}

function getWorkflowEntryByKey(kind: WorkflowKind, templateKey: string) {
  return getWorkflowEntries(kind).find((entry) => entry.key === templateKey) ?? null;
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

  const workflow = String(body?.workflow ?? "").trim().toLowerCase() as WorkflowKind;
  if (workflow !== "onboarding" && workflow !== "starter") {
    return json({ status: "error", message: "Workflow no soportado" }, 400);
  }
  const templateKey = String(body?.templateKey ?? "").trim();

  const to = String(body?.to ?? "").trim().toLowerCase();
  if (!to || !isEmail(to)) {
    return json({ status: "error", message: "Email destino inválido" }, 400);
  }

  const fromEmail =
    process.env.BREVO_FROM_EMAIL ||
    process.env.NEXT_PUBLIC_BREVO_FROM_EMAIL ||
    "no-responder@sistemahotselling.com";
  const fromName =
    process.env.BREVO_FROM_NAME ||
    process.env.NEXT_PUBLIC_BREVO_FROM_NAME ||
    "Sistema Hotselling";
  const origin = String(
    body?.origin ||
      process.env.NEXT_PUBLIC_APP_ORIGIN ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://academia.valinkgroup.com",
  ).trim().replace(/\/$/, "");
  const portalLink = String(body?.portalLink || `${origin}/login`).trim();

  const vars = {
    appName: String(body?.appName || "Hotselling").trim() || "Hotselling",
    recipientName: String(body?.recipientName || "").trim(),
    recipientEmail: to,
    recipientUsername: String(body?.recipientUsername || to).trim(),
    recipientPassword: String(body?.recipientPassword || "").trim(),
    coachName: String(body?.coachName || "").trim(),
    coachEmail: String(body?.coachEmail || "").trim(),
    skoolLink: String(body?.skoolLink || "").trim(),
    notionLink: String(body?.notionLink || "").trim(),
    portalLink,
    origin,
  };

  const entries = templateKey
    ? (() => {
        const entry = getWorkflowEntryByKey(workflow, templateKey);
        return entry ? [entry] : [];
      })()
    : getWorkflowEntries(workflow);
  if (entries.length === 0) {
    return json({ status: "error", message: "Correo de workflow no soportado" }, 400);
  }
  const results: Array<{ key: string; name: string; ok: boolean; message?: string }> = [];

  for (const entry of entries) {
    const override = await fetchMailTemplateOverride(token, entry.key);
    const rendered = applyTemplateOverrideWithVars(entry.source, override, vars);

    const brevoPayload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to, ...(vars.recipientName ? { name: vars.recipientName } : {}) }],
      subject: rendered.subject,
      htmlContent: rendered.html,
      textContent: rendered.text,
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
      } catch {}

      if (!res.ok) {
        const message =
          String(parsed?.message ?? "").trim() ||
          String(parsed?.error ?? "").trim() ||
          raw ||
          `Brevo HTTP ${res.status}`;
        results.push({ key: entry.key, name: entry.name, ok: false, message });
        continue;
      }

      results.push({ key: entry.key, name: entry.name, ok: true });
    } catch (error: any) {
      results.push({
        key: entry.key,
        name: entry.name,
        ok: false,
        message: error?.message ?? "Error enviando correo",
      });
    }
  }

  const failed = results.filter((item) => !item.ok);
  if (failed.length > 0) {
    return json(
      {
        status: "error",
        message: failed[0]?.message ?? "No se pudo enviar el correo",
        workflow,
        results,
      },
      502,
    );
  }

  return json({
    status: "success",
    message: templateKey
      ? "Correo enviado correctamente"
      : "Serie de correos enviada correctamente",
    workflow,
    results,
  });
}