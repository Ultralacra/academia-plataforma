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

  avgPerDay: number;   // promedio por día en el rango [from..to]
  days: number;        // tamaño del rango en días (incluyente)

  from: string | null; // YYYY-MM-DD del primer día con tickets
  to: string | null;   // YYYY-MM-DD del último día con tickets

  today: number;       // tickets hoy
  last7: number;       // suma últimos 7 días (anclado en "to" si existe, si no hoy)
  last30: number;      // suma últimos 30 días

  busiestDay: { date: string; count: number } | null;
  quietDays: number;   // días con 0 dentro del rango [from..to]
};

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
    (t) => (t.estado ?? "").toLowerCase() === "resuelto"
  ).length;
  const enProgreso = tickets.filter(
    (t) => (t.estado ?? "").toLowerCase() === "en progreso"
  ).length;
  const pendientes = tickets.filter(
    (t) => (t.estado ?? "").toLowerCase() === "pendiente"
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

  return {
    total,
    resueltos,
    enProgreso,
    pendientes,
    avgPerDay,
    days,
    from,
    to,
    today,
    last7,
    last30,
    busiestDay,
    quietDays,
  };
}
