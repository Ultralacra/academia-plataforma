import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function requireAdminOrEquipo(token: string | null) {
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
    if (!["admin", "equipo"].includes(role)) {
      return { ok: false as const, status: 403, error: "Solo admin o equipo" };
    }

    return { ok: true as const, me };
  } catch {
    return { ok: false as const, status: 500, error: "Error validando sesión" };
  }
}

function toInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function getBrevoTimeoutMs() {
  const raw = Number(process.env.BREVO_EVENTS_TIMEOUT_MS ?? 15000);
  if (!Number.isFinite(raw)) return 15000;
  return Math.min(60000, Math.max(5000, Math.trunc(raw)));
}

function canonicalEvent(value: unknown): string {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!raw) return "";

  if (["request", "requested", "requests"].includes(raw)) return "requested";
  if (["deliver", "delivered"].includes(raw)) return "delivered";
  if (["defer", "deferred"].includes(raw)) return "deferred";
  if (["open", "opened"].includes(raw)) return "opened";
  if (["click", "clicked"].includes(raw)) return "click";

  if (["hard_bounce", "hardbounce", "hard_bounces"].includes(raw)) return "hard_bounce";
  if (["soft_bounce", "softbounce", "soft_bounces"].includes(raw)) return "soft_bounce";

  if (["blocked", "block"].includes(raw)) return "blocked";
  if (["invalid", "invalid_email"].includes(raw)) return "invalid";
  if (["spam"].includes(raw)) return "spam";

  if (["unsubscribed", "unsubscribe", "unsubscription", "unsubscriptions"].includes(raw)) {
    return "unsubscribed";
  }

  if (["error", "errors"].includes(raw)) return "error";

  return raw;
}

function canonicalSubjectType(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "all") return "all";
  if (["payment_reminder", "recordatorio_pago", "recordatorio de pago"].includes(raw)) {
    return "payment_reminder";
  }
  if (["password_updated", "password_changed", "tu contraseña fue actualizada"].includes(raw)) {
    return "password_updated";
  }
  if (
    [
      "new_support_portal",
      "support_portal",
      "tu nuevo portal de soporte de hotselling",
    ].includes(raw)
  ) {
    return "new_support_portal";
  }
  if (
    [
      "access_due_reminder",
      "access_reminder",
      "recordatorio de vencimiento de accesos",
    ].includes(raw)
  ) {
    return "access_due_reminder";
  }
  return "all";
}

function normalizeText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanUpstreamErrorMessage(rawText: string, status: number): string {
  const txt = String(rawText ?? "").trim();
  if (!txt) return `Brevo HTTP ${status}`;

  const lower = txt.toLowerCase();
  if (lower.includes("<!doctype html") || lower.includes("<html")) {
    if (status === 504) return "Brevo está tardando en responder (504). Intenta de nuevo en 1 minuto.";
    return `Brevo no respondió correctamente (HTTP ${status}).`;
  }

  // Quitar tags por si llega HTML parcial
  const plain = txt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain || `Brevo HTTP ${status}`;
}

function normalizeFetchError(error: unknown): string {
  const msg = String((error as any)?.message ?? error ?? "").trim();
  const lower = msg.toLowerCase();

  if (
    lower.includes("aborted due to timeout") ||
    lower.includes("the operation was aborted") ||
    lower.includes("timeout")
  ) {
    return "Brevo tardó demasiado en responder. Intenta nuevamente en unos segundos.";
  }

  if (lower.includes("fetch failed") || lower.includes("network")) {
    return "No se pudo conectar con Brevo en este momento.";
  }

  return msg || "Error consultando Brevo";
}

function matchesSubjectType(subject: string, subjectType: string): boolean {
  const s = normalizeText(subject);
  if (subjectType === "all") return true;
  if (!s) return false;

  if (subjectType === "payment_reminder") {
    return s.includes("recordatorio de pago");
  }
  if (subjectType === "password_updated") {
    return s.includes("tu contrasena fue actualizada");
  }
  if (subjectType === "new_support_portal") {
    return s.includes("tu nuevo portal de soporte de hotselling");
  }
  if (subjectType === "access_due_reminder") {
    return s.includes("recordatorio de vencimiento de accesos");
  }
  return true;
}

function normalizeEvent(item: Record<string, unknown>) {
  const timestampRaw =
    item.ts_event ??
    item.date ??
    item.createdAt ??
    item.created_at ??
    item.time ??
    null;

  const messageId = String(
    item.messageId ?? item.messageid ?? item["message-id"] ?? item["message_id"] ?? ""
  ).trim();

  const email = String(item.email ?? item.recipient ?? item.to ?? "").trim().toLowerCase();
  const event = canonicalEvent(item.event ?? item.type ?? item.status ?? "");
  const subject = String(item.subject ?? item["email-subject"] ?? "").trim();
  const reason = String(item.reason ?? item.error ?? item["error-message"] ?? "").trim();

  return {
    timestamp: timestampRaw,
    event,
    email,
    subject,
    messageId,
    reason,
    raw: item,
  };
}

type NormalizedEvent = ReturnType<typeof normalizeEvent>;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const tokenFromHeader = (() => {
    const v = String(authHeader ?? "").trim();
    if (!v) return null;
    const m = v.match(/^Bearer\s+(.+)$/i);
    return m?.[1]?.trim() || null;
  })();

  const tokenFromCookie = cookies().get("token")?.value ?? null;
  const token = tokenFromHeader || tokenFromCookie;

  const gate = await requireAdminOrEquipo(token);
  if (!gate.ok) return json({ status: "error", message: gate.error }, gate.status);

  const apiKey = String(process.env.BREVO_API_KEY ?? "").trim();
  if (!apiKey) return json({ status: "error", message: "Falta BREVO_API_KEY" }, 500);

  const url = new URL(req.url);
  const limit = toInt(url.searchParams.get("limit"), 50, 1, 100);
  const offset = toInt(url.searchParams.get("offset"), 0, 0, 10_000);
  const days = toInt(url.searchParams.get("days"), 7, 1, 90);
  const email = String(url.searchParams.get("email") ?? "").trim();
  const event = canonicalEvent(url.searchParams.get("event") ?? "");
  const subjectType = canonicalSubjectType(url.searchParams.get("subjectType") ?? "all");
  const timeoutMs = getBrevoTimeoutMs();

  const buildBrevoUrl = (queryLimit: number, queryOffset: number) => {
    const brevoUrl = new URL("https://api.brevo.com/v3/smtp/statistics/events");
    brevoUrl.searchParams.set("limit", String(queryLimit));
    brevoUrl.searchParams.set("offset", String(queryOffset));
    brevoUrl.searchParams.set("days", String(days));
    brevoUrl.searchParams.set("sort", "desc");
    if (email) brevoUrl.searchParams.set("email", email);
    return brevoUrl;
  };

  const fetchBrevoPage = async (queryLimit: number, queryOffset: number) => {
    const retryableStatuses = new Set([408, 429, 500, 502, 503, 504, 522, 524]);
    const maxAttempts = 3;

    let lastErrorMessage = "Error consultando Brevo";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch(buildBrevoUrl(queryLimit, queryOffset).toString(), {
          method: "GET",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(timeoutMs),
        });

        const text = await res.text().catch(() => "");
        let parsed: any = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = null;
        }

        if (res.ok) {
          const eventsRaw = Array.isArray(parsed?.events)
            ? parsed.events
            : Array.isArray(parsed?.data)
            ? parsed.data
            : [];

          const normalizedEvents: NormalizedEvent[] = eventsRaw
            .filter((item: unknown) => item && typeof item === "object")
            .map((item: Record<string, unknown>) => normalizeEvent(item));

          return {
            normalizedEvents,
            batchSize: eventsRaw.length,
          };
        }

        const upstreamMsg =
          String(parsed?.message ?? "").trim() ||
          String(parsed?.error ?? "").trim() ||
          cleanUpstreamErrorMessage(text, res.status);

        lastErrorMessage = upstreamMsg;

        if (!retryableStatuses.has(res.status) || attempt === maxAttempts) {
          throw new Error(lastErrorMessage);
        }

        await sleep(attempt * 500);
      } catch (error) {
        lastErrorMessage = normalizeFetchError(error);
        if (attempt === maxAttempts) {
          throw new Error(lastErrorMessage);
        }
        await sleep(attempt * 500);
      }
    }

    throw new Error(lastErrorMessage);
  };

  try {
    const hasStrongFilter = Boolean(
      (event && event !== "all") || email || (subjectType && subjectType !== "all")
    );

    let filteredAll: NormalizedEvent[] = [];

    if (!hasStrongFilter) {
      const { normalizedEvents } = await fetchBrevoPage(limit, offset);
      filteredAll = normalizedEvents;
    } else {
      const chunkSize = 100;
      const maxScanned = 500;
      let scanned = 0;
      let cursor = 0;
      let done = false;

      while (!done && scanned < maxScanned) {
        const { normalizedEvents, batchSize } = await fetchBrevoPage(chunkSize, cursor);

        const matched = normalizedEvents.filter((row) => {
          if (event && event !== "all" && row.event !== event) return false;
          if (email && row.email && row.email !== email.toLowerCase()) return false;
          if (!matchesSubjectType(row.subject, subjectType)) return false;
          return true;
        });

        filteredAll.push(...matched);

        scanned += batchSize;
        cursor += chunkSize;
        if (batchSize < chunkSize) done = true;
      }
    }

    const events = filteredAll.slice(offset, offset + limit);

    return json({
      status: "success",
      events,
      count: filteredAll.length,
      limit,
      offset,
      days,
      subjectType,
      source: "brevo",
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "Error consultando Brevo");
    const isUpstreamTimeout = msg.toLowerCase().includes("brevo") || msg.includes("504");
    return json({ status: "error", message: msg }, isUpstreamTimeout ? 502 : 500);
  }
}
