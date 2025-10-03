"use client"

import type { StudentItem } from "@/lib/data-service"

/* ===== Tipos base ===== */
export type Stage = "ONBOARDING" | "F1" | "F2" | "F3" | "F4" | "F5"
export type StatusSint = "EN_CURSO" | "COMPLETADO" | "ABANDONO" | "PAUSA"

/* ===== Fechas ===== */
export function isoDay(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}
export function parseMaybe(s?: string | null) {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}
export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
export function fmtES(iso?: string | null) {
  if (!iso) return "—"
  const d = parseMaybe(iso)
  if (!d) return "—"
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "")
}

/* ===== RNG determinístico (faker suave) ===== */
function hashString(s: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function makeRng(seedStr: string) {
  let x = hashString(seedStr) || 123456789
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return (x >>> 0) / 4294967295
  }
}

/* ===== Fases fake (coherentes) ===== */
export type Phases = {
  ingreso?: string | null
  f1?: string | null
  f2?: string | null
  f3?: string | null
  f4?: string | null
  f5?: string | null
}

export function buildPhasesFor(s: StudentItem, today = new Date()): Phases {
  const seed = (s.code || String(s.id) || s.name || "seed") + "|detail"
  const rng = makeRng(seed)
  const T = new Date(isoDay(today))
  const yearAgo = addDays(T, -365)

  let start = parseMaybe(s.joinDate) || parseMaybe(s.lastActivity) || addDays(T, -90)
  if (!start) start = addDays(T, -90)
  if (start < yearAgo) start = yearAgo
  if (start > T) start = T

  const gaps = [
    1 + Math.round(rng() * 6),
    7 + Math.round(rng() * 10),
    7 + Math.round(rng() * 14),
    10 + Math.round(rng() * 20),
    14 + Math.round(rng() * 30),
  ]
  const f1 = addDays(start, gaps[0])
  const f2 = addDays(f1, gaps[1])
  const f3 = addDays(f2, gaps[2])
  const f4 = addDays(f3, gaps[3])
  const f5 = addDays(f4, gaps[4])

  const stage = (s.stage || "ONBOARDING").toUpperCase() as Stage
  const order: Stage[] = ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"]
  const idx = Math.max(0, order.indexOf(stage))

  return {
    ingreso: isoDay(start),
    f1: idx >= 1 ? isoDay(f1) : null,
    f2: idx >= 2 ? isoDay(f2) : null,
    f3: idx >= 3 ? isoDay(f3) : null,
    f4: idx >= 4 ? isoDay(f4) : null,
    f5: idx >= 5 ? isoDay(f5) : null,
  }
}

/* ===== Lifecycle + métricas rápidas ===== */
export function buildLifecycleFor(s: StudentItem, p: Phases, today = new Date()) {
  const T = new Date(isoDay(today))
  const seed = (s.code || String(s.id) || s.name || "seed") + "|lc"
  const rng = makeRng(seed)

  let status: StatusSint = "EN_CURSO"
  const rawState = (s.state || "").toUpperCase()
  if (rawState.includes("PAUSA")) status = "PAUSA"
  if ((s.inactivityDays ?? 0) >= 60 && rng() > 0.2) status = "ABANDONO"
  if ((s.stage || "").toUpperCase() === "F5" && rng() > 0.2) status = "COMPLETADO"

  let salida: string | null = null
  if (status === "COMPLETADO" || status === "ABANDONO") {
    const base =
      status === "COMPLETADO"
        ? (parseMaybe(p.f5) ?? addDays(parseMaybe(p.ingreso) ?? addDays(T, -100), 100))
        : addDays(parseMaybe(p.ingreso) ?? addDays(T, -60), 60 + Math.round(rng() * 40))
    salida = isoDay(base)
  }

  const ingresoD = parseMaybe(p.ingreso) ?? T
  const end = salida ? parseMaybe(salida)! : T
  const permanencia = Math.max(0, diffDays(ingresoD, end))

  const lastBase = salida ? parseMaybe(salida)! : (parseMaybe(s.lastActivity) ?? T)
  const maxBack = status === "ABANDONO" ? 120 : status === "PAUSA" ? 45 : 25 + Math.round(rng() * 40)
  const lastTaskAt = isoDay(addDays(lastBase, -Math.round(rng() * maxBack)))

  return { status, salida, permanencia, lastTaskAt }
}

/* ===== Status pill (único con color) ===== */
export const STATUS_CLASSES: Record<StatusSint, string> = {
  EN_CURSO:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  COMPLETADO: "bg-emerald-600 text-white dark:bg-emerald-500",
  ABANDONO: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
  PAUSA:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
}
