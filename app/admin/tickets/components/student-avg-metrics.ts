import type { Ticket } from "@/lib/data-service";

export type StudentAvgEntry = {
  id_alumno: string;
  nombre: string;
  totalTickets: number;
  /** Promedio de tickets por mes calendario dentro del rango */
  avgPerMonth: number;
  /** Desglose por mes "YYYY-MM" → cantidad */
  monthlyBreakdown: Record<string, number>;
};

/**
 * Calcula el promedio mensual de tickets por alumno.
 *
 * El denominador es el número de meses calendario distintos comprendidos entre
 * `fechaDesde` y `fechaHasta` (ambos inclusive), de modo que los meses sin
 * actividad de un alumno sí penalizan su promedio.
 */
export function computeStudentMonthlyAvg(
  tickets: Ticket[],
  fechaDesde: string,
  fechaHasta: string,
): StudentAvgEntry[] {
  // ── 1. Calcular los meses calendario del rango ─────────────────────────────
  const totalMonths = countCalendarMonths(fechaDesde, fechaHasta);

  // ── 2. Agrupar tickets por alumno ──────────────────────────────────────────
  type Acc = {
    nombre: string;
    monthlyBreakdown: Record<string, number>;
    total: number;
  };
  const map = new Map<string, Acc>();

  for (const t of tickets ?? []) {
    const key = String(t.id_alumno ?? "").trim();
    if (!key) continue;

    const d = new Date(t.creacion);
    if (isNaN(d.getTime())) continue;

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!map.has(key)) {
      map.set(key, {
        nombre: String(t.alumno_nombre ?? key).trim(),
        monthlyBreakdown: {},
        total: 0,
      });
    }
    const acc = map.get(key)!;
    acc.total += 1;
    acc.monthlyBreakdown[monthKey] = (acc.monthlyBreakdown[monthKey] ?? 0) + 1;
    // Actualiza nombre si el actual es vacío o igual al id
    if (!acc.nombre || acc.nombre === key) {
      acc.nombre = String(t.alumno_nombre ?? key).trim();
    }
  }

  // ── 3. Construir resultado ─────────────────────────────────────────────────
  const denom = Math.max(totalMonths, 1);

  const result: StudentAvgEntry[] = Array.from(map.entries()).map(
    ([id_alumno, acc]) => ({
      id_alumno,
      nombre: acc.nombre,
      totalTickets: acc.total,
      avgPerMonth: Math.round((acc.total / denom) * 100) / 100,
      monthlyBreakdown: acc.monthlyBreakdown,
    }),
  );

  // Ordenar desc por promedio, luego por total
  result.sort(
    (a, b) =>
      b.avgPerMonth - a.avgPerMonth || b.totalTickets - a.totalTickets,
  );

  return result;
}

/**
 * Devuelve los meses calendario "YYYY-MM" entre `from` y `to` inclusive.
 * Ej.: from="2026-01-15" to="2026-03-20" → ["2026-01","2026-02","2026-03"]
 */
export function getMonthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  if (!from || !to) return months;

  const start = parseYMD(from);
  const end = parseYMD(to);
  if (!start || !end || start > end) return months;

  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cur <= endMonth) {
    months.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
    );
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function countCalendarMonths(from: string, to: string): number {
  return Math.max(getMonthsInRange(from, to).length, 1);
}

function parseYMD(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
