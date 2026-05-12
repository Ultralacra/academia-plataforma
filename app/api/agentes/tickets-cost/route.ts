import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/agentes/tickets-cost
 * Consulta el uso y costos de la clave OPENAI_API_KEY_TICKETS
 * directamente contra la OpenAI Organization API.
 *
 * Requiere:
 *   - OPENAI_API_KEY_TICKETS configurada en el servidor.
 *   - La clave debe tener permisos de "organization owner" o admin de proyecto
 *     para acceder a /v1/organization/usage/completions.
 *   - Si la clave es de tipo project (sk-proj-) sin permisos de org, devuelve
 *     noAccess=true para que la UI muestre el enlace al dashboard.
 *
 * Query params:
 *   - days: número de días hacia atrás (1–90, default 30)
 */

const OPENAI_BASE = "https://api.openai.com/v1";

export type OrgUsageResult = {
  object: string;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  output_reasoning_tokens: number;
  num_model_requests: number;
  model: string | null;
  project_id: string | null;
  user_id: string | null;
  api_key_id: string | null;
  batch: boolean;
};

export type OrgCostResult = {
  object: string;
  amount: { value: number; currency: string };
  line_item: string | null;
  project_id: string | null;
};

export type Bucket<T> = {
  object: string;
  start_time: number;
  end_time: number;
  results: T[];
};

export type PageResponse<T> = {
  object: string;
  data: Bucket<T>[];
  has_more: boolean;
  next_page: string | null;
};

export type TicketsCostResponse = {
  usage: PageResponse<OrgUsageResult> | null;
  costs: PageResponse<OrgCostResult> | null;
  days: number;
  startTime: number;
  endTime: number;
  error?: boolean;
  noAccess?: boolean;
  message?: string;
  status?: number;
};

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const key = process.env.OPENAI_API_KEY_TICKETS;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY_TICKETS no configurada en el servidor." },
      { status: 500 },
    );
  }

  const { searchParams } = request.nextUrl;
  const days = Math.min(
    Math.max(parseInt(searchParams.get("days") ?? "30"), 1),
    90,
  );
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - days * 86_400;

  const oaiHeaders = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  try {
    // Consultar uso de completions (con agrupación por modelo)
    const [usageRes, costsRes] = await Promise.allSettled([
      fetch(
        `${OPENAI_BASE}/organization/usage/completions?start_time=${startTime}&end_time=${now}&group_by=model&limit=30`,
        { headers: oaiHeaders, cache: "no-store" },
      ),
      fetch(
        `${OPENAI_BASE}/organization/costs?start_time=${startTime}&end_time=${now}&group_by=line_item&limit=30`,
        { headers: oaiHeaders, cache: "no-store" },
      ),
    ]);

    // Si el primero falla, devolver info de error útil (noAccess, etc.)
    if (usageRes.status === "rejected" || !usageRes.value.ok) {
      const httpStatus =
        usageRes.status === "fulfilled" ? usageRes.value.status : 0;
      const body =
        usageRes.status === "fulfilled"
          ? await usageRes.value.json().catch(() => null)
          : null;

      const response: TicketsCostResponse = {
        usage: null,
        costs: null,
        days,
        startTime,
        endTime: now,
        error: true,
        noAccess: httpStatus === 403 || httpStatus === 401,
        status: httpStatus,
        message:
          body?.error?.message ??
          "No se pudo acceder a la API de uso de OpenAI.",
      };
      return NextResponse.json(response);
    }

    const usage: PageResponse<OrgUsageResult> = await usageRes.value.json();
    const costs: PageResponse<OrgCostResult> | null =
      costsRes.status === "fulfilled" && costsRes.value.ok
        ? await costsRes.value.json()
        : null;

    const response: TicketsCostResponse = {
      usage,
      costs,
      days,
      startTime,
      endTime: now,
    };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error de red";
    return NextResponse.json(
      {
        usage: null,
        costs: null,
        days,
        startTime,
        endTime: now,
        error: true,
        message,
      } satisfies TicketsCostResponse,
      { status: 500 },
    );
  }
}
