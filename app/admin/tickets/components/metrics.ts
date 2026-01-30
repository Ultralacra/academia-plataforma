"use client";

import type { Ticket } from "@/lib/data-service";

/** util: YYYY-MM-DD */
function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISODateKey(s: string) {
  // "YYYY-MM-DD"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function diffDays(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export type TicketsMetrics = {
  total: number;
  resueltos: number;
  enProgreso: number;
  pendientes: number;
  pendientesDeEnvio: number;
  pausados: number;

  avgPerDay: number;   // promedio por día en el rango [from..to]
  days: number;        // tamaño del rango en días (incluyente)

  from: string | null; // YYYY-MM-DD del primer día con tickets
  to: string | null;   // YYYY-MM-DD del último día con tickets

  today: number;       // tickets hoy
  last7: number;       // suma últimos 7 días (anclado en "to" si existe, si no hoy)
  last30: number;      // suma últimos 30 días

  busiestDay: { date: string; count: number } | null;
  quietDays: number;   // días con 0 dentro del rango [from..to]
  // Métricas de tiempo de respuesta de los informantes
  informanteRespondedCount: number; // tickets con primera respuesta registrada
  informanteRespondedPct: number; // porcentaje sobre el total
  avgInformanteResponseMs: number | null; // promedio en ms
  medianInformanteResponseMs: number | null; // mediana en ms
};

function normalizeEstadoKey(estado: string | null | undefined) {
  return String(estado ?? "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function isPausadoKey(k: string) {
  return k === "PAUSADO" || k === "PAUSA" || k === "EN PAUSA";
}

/** Agrupa por día (iso) los tickets */
export function ticketsByDayLocal(tickets: Ticket[]) {
  const map = new Map<string, number>();
  for (const t of tickets ?? []) {
    const d = new Date(t.creacion);
    if (isNaN(d.getTime())) continue;
    const k = d.toISOString().slice(0, 10);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function computeTicketMetrics(tickets: Ticket[]): TicketsMetrics {
  const total = tickets.length;
  const resueltos = tickets.filter(
    (t) => normalizeEstadoKey(t.estado) === "RESUELTO"
  ).length;
  const enProgreso = tickets.filter(
    (t) => normalizeEstadoKey(t.estado) === "EN PROGRESO"
  ).length;
  const pendientes = tickets.filter(
    (t) => normalizeEstadoKey(t.estado) === "PENDIENTE"
  ).length;
  const pendientesDeEnvio = tickets.filter(
    (t) => normalizeEstadoKey(t.estado) === "PENDIENTE DE ENVIO"
  ).length;
  const pausados = tickets.filter((t) =>
    isPausadoKey(normalizeEstadoKey(t.estado))
  ).length;

  const perDay = ticketsByDayLocal(tickets);
  const keys = Array.from(perDay.keys()).sort();
  const from = keys[0] ?? null;
  const to = keys[keys.length - 1] ?? null;

  let days = 0;
  let avgPerDay = 0;
  let quietDays = 0;
  let busiestDay: TicketsMetrics["busiestDay"] = null;

  if (from && to) {
    const a = parseISODateKey(from)!;
    const b = parseISODateKey(to)!;
    days = diffDays(a, b) + 1;

    // contar días sin actividad dentro del rango y obtener pico
    const start = new Date(a);
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = yyyymmdd(d);
      const v = perDay.get(k) ?? 0;
      if (v === 0) quietDays++;
      if (!busiestDay || v > busiestDay.count) busiestDay = { date: k, count: v };
    }

    avgPerDay = days ? Math.round((total / days) * 100) / 100 : 0;
  }

  // hoy / últimos 7 / 30 (anclados a "to" si existe)
  const anchor = to ? parseISODateKey(to)! : new Date();
  const todayKey = yyyymmdd(new Date());
  const today = perDay.get(todayKey) ?? 0;

  const sumBack = (n: number) => {
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() - i);
      const k = yyyymmdd(d);
      acc += perDay.get(k) ?? 0;
    }
    return acc;
  };

  const last7 = sumBack(7);
  const last30 = sumBack(30);

  // --- métricas de tiempo de respuesta del informante (heurísticas) ---
  const respDiffs: number[] = [];
  const respKeyRe = /RESPUE|RESPOND|RESPONDI|RESPUEST|INFORMAD|INFORMA|PRIMERA RESPUESTA|FUE RESPUESTA|FIRST RESPONSE|FIRST_RESPONSE/i;

  for (const t of tickets ?? []) {
    try {
      const cre = new Date(t.creacion);
      if (isNaN(cre.getTime())) continue;

      // posibles campos que indican la primera respuesta
      const maybe =
        (t as any)?.plazo_info?.fecha_primera_respuesta ??
        (t as any)?.fecha_primera_respuesta ??
        (t as any)?.first_response_at ??
        (t as any)?.first_response_date ??
        null;

      let cand: string | null = maybe ?? null;

      // si no hay campo explícito, intentar usar ultimo_estado si tiene palabra clave
      if (!cand && t.ultimo_estado?.fecha) {
        const est = String(t.ultimo_estado?.estatus ?? "");
        if (respKeyRe.test(est)) cand = t.ultimo_estado?.fecha ?? null;
      }

      if (!cand) continue;
      const d = new Date(cand);
      if (isNaN(d.getTime())) continue;
      const diff = d.getTime() - cre.getTime();
      if (diff >= 0) respDiffs.push(diff);
    } catch (e) {
      // ignore single ticket errors
    }
  }

  const informanteCount = respDiffs.length;
  const informantePct = total ? Math.round((informanteCount / total) * 1000) / 10 : 0; // 1 decimal

  const avgInformante =
    informanteCount > 0
      ? Math.round((respDiffs.reduce((a, b) => a + b, 0) / informanteCount) || 0)
      : null;

  let medianInformante: number | null = null;
  if (informanteCount > 0) {
    respDiffs.sort((a, b) => a - b);
    const mid = Math.floor(informanteCount / 2);
    medianInformante =
      informanteCount % 2 === 1
        ? respDiffs[mid]
        : Math.round((respDiffs[mid - 1] + respDiffs[mid]) / 2);
  }

  return {
    total,
    resueltos,
    enProgreso,
    pendientes,
    pendientesDeEnvio,
    pausados,
    avgPerDay,
    days,
    from,
    to,
    today,
    last7,
    last30,
    busiestDay,
    quietDays,
    informanteRespondedCount: informanteCount,
    informanteRespondedPct: informantePct,
    avgInformanteResponseMs: avgInformante,
    medianInformanteResponseMs: medianInformante,
  };
}
