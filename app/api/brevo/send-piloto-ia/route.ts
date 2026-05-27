import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";
import { listMetadata, createMetadata, updateMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

const PILOTO_ENTITY = "piloto_ia_v1";
const PILOTO_ENTITY_ID = "datos";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function requireAdmin(token: string | null) {
  const allowNoAuth =
    String(process.env.BREVO_ALLOW_NOAUTH ?? "").toLowerCase() === "true";
  if (!token) {
    if (allowNoAuth || process.env.NODE_ENV !== "production") {
      return { ok: true as const, me: { email: "local@dev", role: "admin" } };
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

    if (!res.ok)
      return { ok: false as const, status: res.status, error: "No autorizado" };

    const raw: any = await res.json().catch(() => null);
    const me: any = raw?.data ?? raw ?? {};
    const role = String(me?.role ?? me?.tipo ?? "")
      .trim()
      .toLowerCase();
    if (!["admin"].includes(role)) {
      return {
        ok: false as const,
        status: 403,
        error: "Solo administradores",
      };
    }
    return { ok: true as const, me };
  } catch {
    return { ok: false as const, status: 500, error: "Error validando sesión" };
  }
}

function buildInvitationEmail(opts: {
  nombre: string;
  email: string;
  consentUrl: string;
  fromName: string;
}) {
  const { nombre, consentUrl, fromName } = opts;
  const displayName = nombre || "Participante";

  const subject = "✅ Invitación al Piloto Privado — Agente IA de Soporte ATC";

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 36px 40px 28px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.3px; }
    .header p { color: #a1a1aa; font-size: 13px; margin: 0; }
    .badge { display: inline-block; background: #7c3aed; color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px; margin-top: 12px; }
    .content { padding: 36px 40px; color: #18181b; }
    .content p { font-size: 15px; line-height: 1.65; margin: 0 0 16px; }
    .content p.greeting { font-size: 16px; font-weight: 600; }
    .bullets { background: #f9f9fb; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .bullets ul { margin: 0; padding-left: 20px; }
    .bullets li { font-size: 14px; line-height: 1.7; color: #3f3f46; }
    .warning { background: #fef9c3; border-left: 4px solid #eab308; border-radius: 8px; padding: 14px 18px; margin: 20px 0; }
    .warning p { font-size: 13px; color: #713f12; margin: 0; }
    .cta { text-align: center; margin: 28px 0 12px; }
    .cta a { display: inline-block; background: #7c3aed; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; letter-spacing: 0.2px; }
    .cta a:hover { background: #6d28d9; }
    .footer { background: #f4f4f5; padding: 20px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #71717a; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Hotselling PRO</h1>
      <p>Piloto privado · Agente IA de Soporte ATC</p>
      <span class="badge">VOLUNTARIO SELECCIONADO</span>
    </div>

    <div class="content">
      <p class="greeting">Hola ${displayName},</p>
      <p>¡Gracias por sumarte como voluntario(a) al piloto privado de nuestro nuevo <strong>Agente IA de Soporte ATC</strong> para Hotselling PRO!</p>
      <p>Durante los próximos <strong>5 días</strong> tendrás acceso anticipado a esta nueva herramienta, diseñada para ayudarte a:</p>

      <div class="bullets">
        <ul>
          <li>Resolver dudas operativas frecuentes</li>
          <li>Solicitar ayuda de manera más rápida</li>
          <li>Levantar tickets de soporte directamente desde el agente</li>
          <li>Escalar conversaciones a un humano cuando sea necesario</li>
          <li>Facilitar la gestión y seguimiento de solicitudes dentro del ecosistema Hotselling</li>
        </ul>
      </div>

      <div class="warning">
        <p><strong>⚠️ Importante:</strong> Este agente se encuentra actualmente en fase de prueba y optimización, por lo que algunas respuestas, automatizaciones o flujos podrían presentar errores, inconsistencias o comportamientos inesperados. Precisamente por eso, <strong>tu participación y feedback serán clave</strong> para ayudarnos a mejorar la experiencia antes del lanzamiento oficial.</p>
      </div>

      <p><strong>¿Qué necesitaremos de ti durante estos 5 días?</strong></p>
      <div class="bullets">
        <ul>
          <li>Utilizar activamente el agente</li>
          <li>Probar diferentes tipos de solicitudes y preguntas</li>
          <li>Reportar errores, fricciones o respuestas confusas</li>
          <li>Compartir sugerencias de mejora</li>
          <li>Completar el formulario de feedback que te enviaremos durante y al finalizar la prueba</li>
        </ul>
      </div>

      <div class="cta">
        <a href="${consentUrl}" target="_blank" rel="noopener noreferrer">
          👉 Formulario de consentimiento y activación
        </a>
      </div>

      <p style="font-size:13px;color:#71717a;text-align:center;">Una vez completes la aceptación, habilitaremos tu acceso al piloto.</p>
      <p>Gracias nuevamente por ayudarnos a construir una mejor experiencia de soporte para toda la comunidad Hotselling.</p>
      <p><strong>Equipo Hotselling</strong></p>
    </div>

    <div class="footer">
      <p>© Hotselling · MHF GROUP LLC</p>
      <p style="margin-top:4px;">Si recibiste este correo por error, puedes ignorarlo.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hola ${displayName},

¡Gracias por sumarte como voluntario(a) al piloto privado de nuestro nuevo Agente IA de Soporte ATC para Hotselling PRO!

Durante los próximos 5 días tendrás acceso anticipado a esta herramienta.

Para activar tu participación, acepta el consentimiento informado aquí:
${consentUrl}

Gracias,
Equipo Hotselling`;

  return { subject, html, text };
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
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

  // ── Config Brevo ──────────────────────────────────────────────────────
  const apiKey = String(
    process.env.BREVO_API_KEY ?? process.env.NEXT_PUBLIC_BREVO_API_KEY ?? "",
  ).trim();
  if (!apiKey) {
    return json(
      { status: "error", message: "Falta BREVO_API_KEY" },
      500,
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

  // ── Body ──────────────────────────────────────────────────────────────
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json({ status: "error", message: "Body inválido" }, 400);
  }

  const rawAlumnos: { email?: unknown; nombre?: unknown }[] = Array.isArray(
    body?.alumnos,
  )
    ? body.alumnos
    : [];

  const alumnos = rawAlumnos
    .map((a) => ({
      email: String(a.email ?? "").trim().toLowerCase(),
      nombre: String(a.nombre ?? "").trim(),
    }))
    .filter((a) => isEmail(a.email));

  if (alumnos.length === 0) {
    return json({ status: "error", message: "No hay destinatarios válidos" }, 400);
  }

  // ── Build consent URL ─────────────────────────────────────────────────
  const origin =
    String(body?.origin ?? "").trim() ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://academia.valinkgroup.com";
  const consentUrl = `${origin.replace(/\/$/, "")}/consentimiento-piloto`;

  // ── Send emails ───────────────────────────────────────────────────────
  async function sendOne(alumno: { email: string; nombre: string }) {
    const emailContent = buildInvitationEmail({
      nombre: alumno.nombre,
      email: alumno.email,
      consentUrl,
      fromName,
    });

    const brevoPayload = {
      sender: { name: fromName, email: fromEmail },
      to: [
        {
          email: alumno.email,
          ...(alumno.nombre ? { name: alumno.nombre } : {}),
        },
      ],
      subject: emailContent.subject,
      htmlContent: emailContent.html,
      textContent: emailContent.text,
      tags: ["piloto-ia-voluntario"],
      trackingSettings: {
        openTracking: { enabled: true },
        clickTracking: { enabled: true },
      },
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
        `Brevo HTTP ${res.status}`;
      return {
        ok: false as const,
        email: alumno.email,
        message,
        brevo: parsed ?? { raw: text },
      };
    }
    return { ok: true as const, email: alumno.email };
  }

  const results: Array<any> = [];
  const concurrency = 5;
  for (let i = 0; i < alumnos.length; i += concurrency) {
    const batch = alumnos.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(sendOne));
    results.push(...batchResults);
  }

  const failed = results.filter((r) => !r.ok);
  const okCount = results.length - failed.length;

  // ── Update metadata: add to invitados ─────────────────────────────────
  try {
    const metaRes = await listMetadata<any>();
    const allItems = metaRes.items || [];
    const record = allItems.find(
      (item: any) =>
        String(item?.entity ?? "") === PILOTO_ENTITY &&
        String(item?.entity_id ?? "") === PILOTO_ENTITY_ID,
    );

    const now = new Date().toISOString();
    const sentEmails = new Set(results.filter((r) => r.ok).map((r) => r.email));

    if (record) {
      const current = record.payload ?? { version: 1, invitados: [], aceptados: [] };
      const existingEmails = new Set(
        (current.invitados ?? []).map((i: any) => String(i.email ?? "").toLowerCase()),
      );
      const newInvitados = alumnos
        .filter((a) => sentEmails.has(a.email) && !existingEmails.has(a.email))
        .map((a) => ({ email: a.email, nombre: a.nombre, invitado_en: now }));

      await updateMetadata(record.id, {
        id: record.id,
        entity: PILOTO_ENTITY,
        entity_id: PILOTO_ENTITY_ID,
        payload: {
          ...current,
          invitados: [...(current.invitados ?? []), ...newInvitados],
        },
      } as any);
    } else {
      const invitados = alumnos
        .filter((a) => sentEmails.has(a.email))
        .map((a) => ({ email: a.email, nombre: a.nombre, invitado_en: now }));

      await createMetadata({
        entity: PILOTO_ENTITY,
        entity_id: PILOTO_ENTITY_ID,
        payload: { version: 1, invitados, aceptados: [] },
      });
    }
  } catch (metaErr: any) {
    console.error("[send-piloto-ia] Error actualizando metadata:", metaErr);
    // No bloquear la respuesta; los correos ya se enviaron
  }

  if (failed.length > 0 && okCount === 0) {
    return json(
      {
        status: "error",
        message: failed[0]?.message ?? "Error enviando",
        toCount: alumnos.length,
        okCount,
        failedCount: failed.length,
        failed: failed.slice(0, 10),
      },
      502,
    );
  }

  return json({
    status: "success",
    message: `${okCount} invitación${okCount !== 1 ? "es" : ""} enviada${okCount !== 1 ? "s" : ""} correctamente.`,
    toCount: alumnos.length,
    okCount,
    failedCount: failed.length,
    failed: failed.slice(0, 10),
  });
}
