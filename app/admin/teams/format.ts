"use client"

/** Asegura número desde string/number/null/undefined */
export function toNum(v: unknown, d = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/**
 * Formatea minutos a una cadena amigable:
 *  - < 60  → "Xm"
 *  - < 1440 (1 día) → "H h M min" (ej. "2 h 10 min")
 *  - ≥ 1440 → "D d H h" (ej. "1 d 3 h")
 */
export function formatDuration(mins: number): string {
  const m = Math.max(0, Math.round(toNum(mins)))
  if (m < 60) return `${m} min`
  if (m < 1440) {
    const h = Math.floor(m / 60)
    const r = m % 60
    return r ? `${h} h ${r} min` : `${h} h`
  }
  const d = Math.floor(m / 1440)
  const rem = m % 1440
  const h = Math.floor(rem / 60)
  return h ? `${d} d ${h} h` : `${d} d`
}

/**
 * Versión corta para ticks de ejes:
 *  - < 60  → "Xm"
 *  - < 1440 → "Xh"
 *  - ≥ 1440 → "Xd"
 */
export function shortDuration(mins: number): string {
  const m = Math.max(0, Math.round(toNum(mins)))
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.round(m / 60)}h`
  return `${Math.round(m / 1440)}d`
}
