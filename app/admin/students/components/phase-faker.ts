"use client";

import type { ClientItem } from "@/lib/data-service";

/** Orden de fases */
const STAGES = ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"] as const;
type Stage = typeof STAGES[number];

export type PhaseSteps = {
  code?: string | null;
  name?: string | null;
  stage?: string | null;
  ingreso?: string | null;
  paso_f1?: string | null;
  paso_f2?: string | null;
  paso_f3?: string | null;
  paso_f4?: string | null;
  paso_f5?: string | null;
};

export type LifecycleItem = {
  code?: string | null;
  name?: string | null;
  stage?: string | null;

  ingreso?: string | null;
  salida?: string | null;

  /** EN_CURSO | COMPLETADO | ABANDONO | PAUSA */
  status_sint: "EN_CURSO" | "COMPLETADO" | "ABANDONO" | "PAUSA";

  /** Permanencia en días (desde ingreso a salida o a hoy) */
  permanencia_d?: number | null;

  /** Última entrega de tarea "fake" (para métricas de 3/7/15/30d) */
  lastTaskAt?: string | null;

  /** Fechas de pasos (para transiciones) */
  pasos: {
    f1?: string | null;
    f2?: string | null;
    f3?: string | null;
    f4?: string | null;
    f5?: string | null;
  };
};

/* ───────── RNG determinístico ───────── */
function hashString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seedStr: string) {
  let x = hashString(seedStr) || 123456789;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967295;
  };
}
function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/* ───────── fechas ───────── */
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseMaybe(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
function clamp(d: Date, min: Date, max: Date) {
  if (d < min) return new Date(min);
  if (d > max) return new Date(max);
  return d;
}

/* ───────── generador de pasos por alumno ───────── */
export function fakePhaseDatesForClient(c: ClientItem, today = new Date()) {
  const seed = (c.code || String(c.id) || c.name || "seed") + "|v2";
  const rng = makeRng(seed);

  const T = new Date(isoDay(today));
  const yearAgo = addDays(T, -365);

  let start =
    parseMaybe(c.joinDate) ||
    parseMaybe(c.lastActivity) ||
    addDays(T, -randInt(rng, 20, 330));
  if (!start) start = addDays(T, -randInt(rng, 20, 330));
  start = clamp(start, yearAgo, T);

  const stage = (c.stage || "ONBOARDING").toUpperCase() as Stage;
  const idx = Math.max(0, STAGES.indexOf(stage)); // 0..5

  // gaps realistas
  const gaps = [
    randInt(rng, 1, 7), // → F1
    randInt(rng, 5, 18), // F1→F2
    randInt(rng, 7, 21), // F2→F3
    randInt(rng, 10, 25), // F3→F4
    randInt(rng, 14, 35), // F4→F5
  ];

  const f1 = addDays(start, gaps[0]);
  const f2 = addDays(f1, gaps[1]);
  const f3 = addDays(f2, gaps[2]);
  const f4 = addDays(f3, gaps[3]);
  const f5 = addDays(f4, gaps[4]);

  const maxLimit = T;
  const steps = [f1, f2, f3, f4, f5].map((d) => clamp(d, yearAgo, maxLimit));

  return {
    ingreso: isoDay(start),
    paso_f1: idx >= 1 ? isoDay(steps[0]) : null,
    paso_f2: idx >= 2 ? isoDay(steps[1]) : null,
    paso_f3: idx >= 3 ? isoDay(steps[2]) : null,
    paso_f4: idx >= 4 ? isoDay(steps[3]) : null,
    paso_f5: idx >= 5 ? isoDay(steps[4]) : null,
  };
}

/* ───────── público: buildPhaseItems ───────── */
export function buildPhaseItems(clients: ClientItem[]): PhaseSteps[] {
  return (clients ?? []).map((c) => {
    const p = fakePhaseDatesForClient(c);
    return {
      code: c.code ?? null,
      name: c.name ?? null,
      stage: c.stage ?? null,
      ingreso: p.ingreso,
      paso_f1: p.paso_f1,
      paso_f2: p.paso_f2,
      paso_f3: p.paso_f3,
      paso_f4: p.paso_f4,
      paso_f5: p.paso_f5,
    };
  });
}

/* ───────── LifeCycle (retención/permanencia + tareas) ───────── */
export function buildLifecycleItems(clients: ClientItem[]): LifecycleItem[] {
  const today = new Date(isoDay(new Date()));
  return (clients ?? []).map((c) => {
    const p = fakePhaseDatesForClient(c, today);
    const seed = (c.code || String(c.id) || c.name || "seed") + "|lifecycle";
    const rng = makeRng(seed);

    // status sintético
    const rawState = (c.state || "").toUpperCase();
    const stage = (c.stage || "").toUpperCase();

    let status: LifecycleItem["status_sint"] = "EN_CURSO";
    // señales de pausa si llega desde API
    if (rawState.includes("PAUSA")) status = "PAUSA";
    // finaliza si ya F5 y tira una moneda a favor de "completado"
    if (stage === "F5" && rng() > 0.2) status = "COMPLETADO";
    // abandono si inactividad es alta
    if ((c.inactivityDays ?? 0) >= 60 && rng() > 0.2) status = "ABANDONO";

    // fecha salida y permanencia
    let salida: string | null = null;
    if (status === "COMPLETADO" || status === "ABANDONO") {
      const base =
        status === "COMPLETADO"
          ? p.paso_f5
            ? new Date(p.paso_f5)
            : addDays(new Date(p.ingreso!), randInt(rng, 70, 140))
          : addDays(new Date(p.ingreso!), randInt(rng, 20, 100));
      salida = isoDay(base);
    }

    const ingreso = p.ingreso ? new Date(p.ingreso) : null;
    const salidaDate = salida ? new Date(salida) : null;
    const endForStay = salidaDate ?? today;
    const permanencia =
      ingreso && endForStay
        ? Math.max(
            0,
            Math.round(
              (endForStay.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : null;

    // última entrega de tareas fake (distribución sesgada por estado)
    const lastActivity = parseMaybe(c.lastActivity) ?? today;
    const baseLast = salidaDate && salidaDate < today ? salidaDate : lastActivity;
    const maxBack =
      status === "ABANDONO" ? 120 : status === "PAUSA" ? 45 : 25 + Math.round(rng() * 40);
    const lastTaskAt = isoDay(addDays(baseLast, -randInt(rng, 0, maxBack)));

    return {
      code: c.code ?? null,
      name: c.name ?? null,
      stage: c.stage ?? null,
      ingreso: p.ingreso ?? null,
      salida,
      status_sint: status,
      permanencia_d: permanencia,
      lastTaskAt,
      pasos: {
        f1: p.paso_f1 ?? null,
        f2: p.paso_f2 ?? null,
        f3: p.paso_f3 ?? null,
        f4: p.paso_f4 ?? null,
        f5: p.paso_f5 ?? null,
      },
    };
  });
}

/* ───────── Transiciones en rango (para tarjetas de “Transiciones de fase”) ───────── */
export type TransitionKey = "toF1" | "toF2" | "toF3" | "toF4" | "toF5";
export type TransitionBucket = {
  label: string;
  count: number;
  items: Array<{ code?: string | null; name?: string | null; date?: string | null }>;
};
export function computeTransitions(
  items: LifecycleItem[],
  daysBack: number
): Record<TransitionKey, TransitionBucket> {
  const to = new Date(isoDay(new Date()));
  const from = addDays(to, -daysBack);
  const inRange = (s?: string | null) =>
    !!s && s >= isoDay(from) && s <= isoDay(to);

  const buckets: Record<TransitionKey, TransitionBucket> = {
    toF1: { label: "Ingresaron a F1", count: 0, items: [] },
    toF2: { label: "Pasaron a F2", count: 0, items: [] },
    toF3: { label: "Pasaron a F3", count: 0, items: [] },
    toF4: { label: "Pasaron a F4", count: 0, items: [] },
    toF5: { label: "Pasaron a F5", count: 0, items: [] },
  };

  items.forEach((it) => {
    if (inRange(it.pasos.f1)) {
      buckets.toF1.count++;
      buckets.toF1.items.push({ code: it.code, name: it.name, date: it.pasos.f1 });
    }
    if (inRange(it.pasos.f2)) {
      buckets.toF2.count++;
      buckets.toF2.items.push({ code: it.code, name: it.name, date: it.pasos.f2 });
    }
    if (inRange(it.pasos.f3)) {
      buckets.toF3.count++;
      buckets.toF3.items.push({ code: it.code, name: it.name, date: it.pasos.f3 });
    }
    if (inRange(it.pasos.f4)) {
      buckets.toF4.count++;
      buckets.toF4.items.push({ code: it.code, name: it.name, date: it.pasos.f4 });
    }
    if (inRange(it.pasos.f5)) {
      buckets.toF5.count++;
      buckets.toF5.items.push({ code: it.code, name: it.name, date: it.pasos.f5 });
    }
  });

  return buckets;
}

/* ───────── Helpers para “no envían tareas X días” ───────── */
export function studentsNoTasksSince(
  items: LifecycleItem[],
  minDays: number
) {
  const today = new Date(isoDay(new Date()));
  return items
    .filter((it) => {
      const last = parseMaybe(it.lastTaskAt) ?? today;
      const diff = Math.round(
        (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff >= minDays;
    })
    .map((it) => ({
      code: it.code,
      name: it.name,
      lastTaskAt: it.lastTaskAt,
    }));
}
