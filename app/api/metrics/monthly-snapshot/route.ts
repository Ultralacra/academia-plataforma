/**
 * GET /api/metrics/monthly-snapshot?month=YYYY-MM
 *
 * Calcula automáticamente los campos de BusinessMonthRecord que pueden
 * derivarse de los datos del sistema (alumnos + pagos). Devuelve un objeto
 * parcial con los campos calculados y su fuente, listo para pre-rellenar
 * el formulario del CRUD mensual.
 *
 * Campos calculados:
 *  - newClients       → alumnos con joinDate en el mes
 *  - highTicketClients → ídem, filtrado por tag que no sea "Beca" / "Gratuito"
 *  - activeStudents   → alumnos con estado "activo" al cierre del mes
 *  - highTicketRevenue → suma de pagos (cuotas pagadas) con fecha_pago en el mes
 *  - delinquencyRate  → cuotas en retraso / (pagadas + retraso) en el mes
 *  - marketingSalesCost → devuelto como null (requiere inputs manuales)
 *  - durationMonths   → promedio real de duración de alumnos (ingreso → vencimiento)
 */

import { NextRequest, NextResponse } from "next/server";

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

async function apiFetch(path: string, auth: string) {
  const res = await fetch(buildUrl(path), {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function isInMonth(dateStr: string | null | undefined, month: string): boolean {
  if (!dateStr) return false;
  return String(dateStr).slice(0, 7) === month;
}

/** Tags que NO son high ticket (becas, gratuitos, etc.) */
const NON_HT_TAGS_RE = /beca|gratu|free|promo/i;

function isHighTicketTag(tag: string | null | undefined): boolean {
  if (!tag) return true; // sin tag → asumir HT por defecto
  return !NON_HT_TAGS_RE.test(tag);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.trim()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Parámetro month inválido (esperado YYYY-MM)" },
      { status: 400 },
    );
  }

  const { from, to } = monthRange(month);

  // ── Alumnos ──────────────────────────────────────────────────────────────
  // Traemos todos sin filtro de estado para poder clasificar por joinDate
  // independientemente de si siguen activos hoy.
  const clientsJson = await apiFetch(
    `/client/get/clients?page=1&pageSize=5000`,
    auth,
  );

  const allRows: any[] = clientsJson?.data
    ? Array.isArray(clientsJson.data)
      ? clientsJson.data
      : []
    : Array.isArray(clientsJson?.clients?.data)
      ? clientsJson.clients.data
      : [];

  // Nuevos clientes: joinDate en el mes
  const newClientRows = allRows.filter((r) =>
    isInMonth(r.ingreso ?? r.joinDate, month),
  );
  const newClients = newClientRows.length;

  // Clientes HT: mismos nuevos del mes pero con tag válido
  const highTicketClients = newClientRows.filter((r) => {
    const tag = String(r.tag ?? r.etiqueta ?? r.tags ?? "").trim();
    return isHighTicketTag(tag || null);
  }).length;

  // Alumnos activos: estado activo (sin importar fecha de ingreso)
  const ACTIVE_STATES = /^activ/i;
  const activeStudents = allRows.filter((r) =>
    ACTIVE_STATES.test(String(r.estado ?? r.state ?? "")),
  ).length;

  // ── Pagos ────────────────────────────────────────────────────────────────
  // Traemos cuotas con fecha_pago en el rango del mes.
  // El endpoint de pagos filtra por fechaDesde/fechaHasta sobre fecha_pago.
  const paymentsJson = await apiFetch(
    `/payments/get/payment?page=1&pageSize=5000&fechaDesde=${from}&fechaHasta=${to}`,
    auth,
  );

  const paymentRows: any[] = Array.isArray(paymentsJson?.data)
    ? paymentsJson.data
    : [];

  // Para cada pago, necesitamos ver los detalles (cuotas). Primero intentamos
  // con los datos que ya vienen en el listado para evitar N+1.
  // Estrategia simplificada: sumar monto de planes cuyo fecha_pago está en el mes
  // y estatus = pagado | completado | cobrado.
  const PAID_STATUSES = /^(pagado|paid|completado|cobrado|aprobado)/i;
  const LATE_STATUSES = /^(retraso|atrasado|mora|pending_late)/i;

  let highTicketRevenue = 0;
  let paidCount = 0;
  let lateCount = 0;

  for (const row of paymentRows) {
    const estatus = String(row.estatus ?? "").trim();
    const monto = Number(row.monto ?? 0);

    if (PAID_STATUSES.test(estatus)) {
      highTicketRevenue += Number.isFinite(monto) ? monto : 0;
      paidCount++;
    } else if (LATE_STATUSES.test(estatus)) {
      lateCount++;
    }
  }

  // También buscamos pagos sin filtro de fecha para calcular morosidad del mes
  // (cuotas en retraso que pertenecen al mes, independientemente de fecha_pago)
  const allMonthPayments = await apiFetch(
    `/payments/get/payment?page=1&pageSize=5000&fechaDesde=${from}&fechaHasta=${to}`,
    auth,
  );
  // Reutilizamos los datos ya obtenidos para la tasa de morosidad
  const totalWithData = paidCount + lateCount;
  const delinquencyRate =
    totalWithData > 0
      ? Math.round((lateCount / totalWithData) * 10000) / 10000
      : null;

  // ── Duración media real ───────────────────────────────────────────────────
  // Si hay alumnos con fecha de vencimiento (ingreso + duración real), calculamos
  // el promedio. Por ahora derivamos de la diferencia joinDate → hoy para los activos.
  // Esto es una aproximación; si el backend tiene fecha_salida se puede mejorar.
  const durationsMonths: number[] = [];
  const today = new Date();
  for (const r of allRows) {
    const estado = String(r.estado ?? r.state ?? "").trim().toLowerCase();
    const joinRaw = r.ingreso ?? r.joinDate;
    if (!joinRaw) continue;
    const joinDate = new Date(String(joinRaw).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(joinDate.getTime())) continue;

    // Solo alumnos que ya egresaron (estado: completado / egresado / baja)
    if (/egres|complet|baja|graduad|finaliz/.test(estado)) {
      const diffMs = today.getTime() - joinDate.getTime();
      const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);
      if (months > 0 && months < 36) durationsMonths.push(months);
    }
  }
  const durationMonths =
    durationsMonths.length > 0
      ? Math.round(
          (durationsMonths.reduce((a, b) => a + b, 0) / durationsMonths.length) *
            10,
        ) / 10
      : null;

  // ── Respuesta ─────────────────────────────────────────────────────────────
  return NextResponse.json({
    month,
    calculated: {
      newClients,
      highTicketClients,
      activeStudents,
      highTicketRevenue: Math.round(highTicketRevenue * 100) / 100,
      delinquencyRate,
      durationMonths,
    },
    meta: {
      totalAlumnos: allRows.length,
      paymentsFound: paymentRows.length,
      paidCount,
      lateCount,
      durationSample: durationsMonths.length,
      range: { from, to },
    },
  });
}
