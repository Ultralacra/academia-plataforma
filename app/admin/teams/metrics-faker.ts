"use client";

import type { Team, ClientItem, Ticket } from "@/lib/data-service";

/* ──────────────────────────────────────────────────────────────
   Helpers de fecha
────────────────────────────────────────────────────────────── */
function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function parseMaybe(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/* ──────────────────────────────────────────────────────────────
   RNG determinístico (para datos fake repetibles)
────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   Tipos adicionales para métricas y series
────────────────────────────────────────────────────────────── */
export type TicketsSeries = {
  daily: Array<{ date: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
};

export type RespByCoach = {
  coach: string;
  response: number;   // minutos
  resolution: number; // minutos
  tickets: number;
};
export type RespByTeam = {
  team: string;
  response: number;
  resolution: number;
  tickets: number;
};
export type ProdByCoach = {
  coach: string;
  tickets: number;
  sessions: number;
  hours: number;
};

export type CoachAgg = {
  name: string;
  puesto?: string | null;
  area?: string | null;
  studentsTotal: number;
  studentsActive: number;
  studentsInactive: number;
  studentsPaused: number;
  tickets: number;
  avgResponseMin: number;
  avgResolutionMin: number;
  sessions: number;
  hours: number;
  phaseCounts: Record<"F1" | "F2" | "F3" | "F4" | "F5", number>;
  avgPhaseDays: Record<"F1" | "F2" | "F3" | "F4" | "F5", number>;
};

export type TeamsMetrics = {
  totals: {
    teams: number;
    studentsTotal: number;
    studentsActive: number;
    studentsInactive: number;
    studentsPaused: number;
    successCases: number;
    ticketsTotal: number;
    avgResponseMin: number;
    avgResolutionMin: number;
  };

  alumnosPorEquipo: { name: string; alumnos: number }[];
  areasCount: { area: string; count: number }[];

  avgPhaseDays: { phase: string; days: number }[];
  activeByPhase: { phase: string; count: number }[];

  noTasks: { d3: number; d7: number; d15: number; d30: number };
  transitions(daysBack: number): Record<
    "toF1" | "toF2" | "toF3" | "toF4" | "toF5",
    number
  >;

  ticketsPer: { day: number; week: number; month: number };

  // NUEVO
  ticketsSeries: TicketsSeries;
  respByCoach: RespByCoach[];
  respByTeam: RespByTeam[];
  prodByCoach: ProdByCoach[];

  coaches: CoachAgg[];
};

/* ──────────────────────────────────────────────────────────────
   Ciclo de vida "fake" por estudiante
────────────────────────────────────────────────────────────── */
const STAGES = ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"] as const;
type Stage = (typeof STAGES)[number];

type FakeLifecycle = {
  ingreso?: string | null;
  lastTaskAt?: string | null;
  pasos: {
    f1?: string | null;
    f2?: string | null;
    f3?: string | null;
    f4?: string | null;
    f5?: string | null;
  };
};

function fakeLifecycleForStudent(
  s: ClientItem,
  today = new Date(isoDay(new Date()))
): FakeLifecycle {
  const seed = (s.code || String(s.id) || s.name || "seed") + "|teams/lc";
  const rng = makeRng(seed);
  const T = new Date(isoDay(today));
  const yearAgo = addDays(T, -365);

  // ingreso base
  let start =
    parseMaybe(s.joinDate) ||
    parseMaybe(s.lastActivity) ||
    addDays(T, -randInt(rng, 30, 300));
  if (!start) start = addDays(T, -randInt(rng, 30, 300));
  // clamp
  if (start < yearAgo) start = yearAgo;
  if (start > T) start = T;

  // gaps entre fases
  const gaps = [
    randInt(rng, 1, 7),   // → F1
    randInt(rng, 6, 18),  // F1→F2
    randInt(rng, 7, 21),  // F2→F3
    randInt(rng, 10, 25), // F3→F4
    randInt(rng, 14, 35), // F4→F5
  ];
  const f1 = addDays(start, gaps[0]);
  const f2 = addDays(f1, gaps[1]);
  const f3 = addDays(f2, gaps[2]);
  const f4 = addDays(f3, gaps[3]);
  const f5 = addDays(f4, gaps[4]);

  const stage = (s.stage || "ONBOARDING").toUpperCase() as Stage;
  const idx = Math.max(0, STAGES.indexOf(stage));

  // última entrega de tareas falsa (sesgada por inactividad/estado)
  const inactivity = s.inactivityDays ?? 0;
  const rawState = (s.state || "").toUpperCase();
  const lastBase = parseMaybe(s.lastActivity) ?? T;
  const maxBack =
    rawState.includes("ABANDONO") || inactivity >= 60
      ? 150
      : rawState.includes("PAUSA")
      ? 45
      : 25 + Math.round(rng() * 40);
  const lastTaskAt = isoDay(addDays(lastBase, -randInt(rng, 0, maxBack)));

  return {
    ingreso: isoDay(start),
    lastTaskAt,
    pasos: {
      f1: idx >= 1 ? isoDay(f1) : null,
      f2: idx >= 2 ? isoDay(f2) : null,
      f3: idx >= 3 ? isoDay(f3) : null,
      f4: idx >= 4 ? isoDay(f4) : null,
      f5: idx >= 5 ? isoDay(f5) : null,
    },
  };
}

/* ──────────────────────────────────────────────────────────────
   Clasificación simple del alumno (ACTIVO/INACTIVO/PAUSA)
────────────────────────────────────────────────────────────── */
type Clase = "ACTIVO" | "INACTIVO" | "PAUSA";
function classifyStudent(s: ClientItem): Clase {
  const rawState = (s.state || "").toUpperCase();
  if (rawState.includes("PAUSA")) return "PAUSA";
  const inact = s.inactivityDays ?? 0;
  if (inact >= 60) return "INACTIVO";
  return "ACTIVO";
}

/* ──────────────────────────────────────────────────────────────
   MÉTRICAS PRINCIPALES
────────────────────────────────────────────────────────────── */
export function buildTeamsMetrics({
  teams,
  students,
  tickets,
}: {
  teams: Team[];
  students: ClientItem[];
  tickets: Ticket[];
}): TeamsMetrics {
  const today = new Date(isoDay(new Date()));

  /* ── Índices de coach & URL ───────────────────────────── */
  const coachAgg = new Map<
    string,
    CoachAgg & {
      _sumResp: number;
      _sumReso: number;
      _tCount: number;
      _pSum: Record<string, number>;
    }
  >();
  const coachByUrl = new Map<string, string>();
  const coachList: string[] = [];

  students.forEach((s) => {
    (s.teamMembers || []).forEach((m) => {
      const name = (m.name || "").trim();
      if (!name) return;
      if (!coachAgg.has(name)) {
        coachAgg.set(name, {
          name,
          puesto: (m as any).puesto ?? null,
          area: (m as any).area ?? null,
          studentsTotal: 0,
          studentsActive: 0,
          studentsInactive: 0,
          studentsPaused: 0,
          tickets: 0,
          avgResponseMin: 0,
          avgResolutionMin: 0,
          sessions: 0,
          hours: 0,
          phaseCounts: { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 },
          avgPhaseDays: { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 },
          _sumResp: 0,
          _sumReso: 0,
          _tCount: 0,
          _pSum: { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 },
        });
        coachList.push(name);
      }
      if (m.url) coachByUrl.set(m.url, name);

      const c = coachAgg.get(name)!;
      c.studentsTotal += 1;
      const cls = classifyStudent(s);
      if (cls === "ACTIVO") c.studentsActive += 1;
      if (cls === "INACTIVO") c.studentsInactive += 1;
      if (cls === "PAUSA") c.studentsPaused += 1;
    });
  });

  /* ── Promedios por fase, activos por fase, no-tareas, éxito ─ */
  const phaseTimeSums = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 };
  const phaseTimeN = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 };
  const phaseActive = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 };

  let noTasks3 = 0,
    noTasks7 = 0,
    noTasks15 = 0,
    noTasks30 = 0,
    successCases = 0;

  const transitionsCounter = (daysBack: number) => {
    const from = addDays(today, -daysBack);
    const inRange = (s?: string | null) =>
      !!s && s >= isoDay(from) && s <= isoDay(today);
    const obj = {
      toF1: 0,
      toF2: 0,
      toF3: 0,
      toF4: 0,
      toF5: 0,
    } as Record<"toF1" | "toF2" | "toF3" | "toF4" | "toF5", number>;

    students.forEach((st) => {
      const lc = fakeLifecycleForStudent(st);
      if (inRange(lc.pasos.f1)) obj.toF1++;
      if (inRange(lc.pasos.f2)) obj.toF2++;
      if (inRange(lc.pasos.f3)) obj.toF3++;
      if (inRange(lc.pasos.f4)) obj.toF4++;
      if (inRange(lc.pasos.f5)) obj.toF5++;
    });
    return obj;
  };

  students.forEach((s) => {
    const lc = fakeLifecycleForStudent(s);

    // no-tareas
    const last = parseMaybe(lc.lastTaskAt) ?? today;
    const diff = Math.max(0, diffDays(last, today));
    if (diff >= 3) noTasks3++;
    if (diff >= 7) noTasks7++;
    if (diff >= 15) noTasks15++;
    if (diff >= 30) noTasks30++;

    // fase actual
    const stg =
      lc.pasos.f5
        ? "F5"
        : lc.pasos.f4
        ? "F4"
        : lc.pasos.f3
        ? "F3"
        : lc.pasos.f2
        ? "F2"
        : "F1";
    // @ts-ignore
    phaseActive[stg]++;

    // tiempos por fase
    const p = lc.pasos;
    const d1 =
      p.f1 && lc.ingreso
        ? diffDays(new Date(lc.ingreso), new Date(p.f1))
        : null;
    const d2 = p.f2 && p.f1 ? diffDays(new Date(p.f1), new Date(p.f2)) : null;
    const d3 = p.f3 && p.f2 ? diffDays(new Date(p.f2), new Date(p.f3)) : null;
    const d4 = p.f4 && p.f3 ? diffDays(new Date(p.f3), new Date(p.f4)) : null;
    const d5 = p.f5 && p.f4 ? diffDays(new Date(p.f4), new Date(p.f5)) : null;

    (
      [
        ["F1", d1],
        ["F2", d2],
        ["F3", d3],
        ["F4", d4],
        ["F5", d5],
      ] as const
    ).forEach(([k, v]) => {
      if (v != null) {
        // @ts-ignore
        phaseTimeSums[k] += v;
        // @ts-ignore
        phaseTimeN[k] += 1;
      }
    });

    if (p.f5) successCases++;

    // acumulados por coach (promedios de fase)
    const firstCoach = (s.teamMembers?.[0]?.name || "").trim();
    if (firstCoach && coachAgg.has(firstCoach)) {
      const c = coachAgg.get(firstCoach)!;
      if (d1 != null) c._pSum.F1 += d1;
      if (d2 != null) c._pSum.F2 += d2;
      if (d3 != null) c._pSum.F3 += d3;
      if (d4 != null) c._pSum.F4 += d4;
      if (d5 != null) c._pSum.F5 += d5;
      // @ts-ignore
      c.phaseCounts[stg] += 1;
    }
  });

  /* ── Tickets: respuesta/resolución global + por coach y equipo ─ */
  let sumResp = 0,
    sumReso = 0,
    tCount = 0;
  const rngTkt = makeRng("tickets|teams");

  // url → equipo
  const urlTeam = new Map<string, string>();
  teams.forEach((t) =>
    (t.alumnos || []).forEach((m) => m.url && urlTeam.set(m.url, t.nombre))
  );

  const teamAgg = new Map<string, { resp: number; reso: number; n: number }>();

  tickets.forEach((tk) => {
    const seed =
      (tk.id_externo || String(tk.id) || tk.nombre || "t") + "|tkt-metrics";
    const rng = makeRng(seed);
    const responseMin = randInt(rng, 10, 240);
    const resolutionMin = responseMin + randInt(rng, 60, 2880);

    sumResp += responseMin;
    sumReso += resolutionMin;
    tCount++;

    // asignar a coach
    const coach = (() => {
      for (const u of tk.equipo_urls || []) {
        const c = coachByUrl.get(u);
        if (c) return c;
      }
      if (coachList.length === 0) return null;
      return coachList[Math.floor(rngTkt() * coachList.length)];
    })();
    if (coach && coachAgg.has(coach)) {
      const c = coachAgg.get(coach)!;
      c._sumResp += responseMin;
      c._sumReso += resolutionMin;
      c._tCount += 1;
      c.tickets += 1;
    }

    // asignar a equipo
    const teamsHit = new Set<string>();
    (tk.equipo_urls || []).forEach((u) => {
      const team = urlTeam.get(u);
      if (team) teamsHit.add(team);
    });
    teamsHit.forEach((name) => {
      const b = teamAgg.get(name) || { resp: 0, reso: 0, n: 0 };
      b.resp += responseMin;
      b.reso += resolutionMin;
      b.n += 1;
      teamAgg.set(name, b);
    });
  });

  const avgResponseMin = tCount ? Math.round(sumResp / tCount) : 0;
  const avgResolutionMin = tCount ? Math.round(sumReso / tCount) : 0;

  // cerrar agregados por coach
  coachAgg.forEach((c, k) => {
    c.avgResponseMin = c._tCount ? Math.round(c._sumResp / c._tCount) : 0;
    c.avgResolutionMin = c._tCount ? Math.round(c._sumReso / c._tCount) : 0;

    // sesiones y horas fake
    const rng = makeRng("sessions|" + k);
    c.sessions = randInt(rng, 4, 28);
    c.hours = Math.round((c.sessions * (0.8 + rng() * 0.9)) * 10) / 10;

    (["F1", "F2", "F3", "F4", "F5"] as const).forEach((ph) => {
      const n = c.phaseCounts[ph] || 0;
      c.avgPhaseDays[ph] = n ? Math.round(c._pSum[ph] / n) : 0;
    });

    // limpiar internos
    // @ts-ignore
    delete c._sumResp;
    // @ts-ignore
    delete c._sumReso;
    // @ts-ignore
    delete c._tCount;
    // @ts-ignore
    delete c._pSum;
  });

  /* ── Alumnos por equipo & conteo por área ─ */
  const alumnosPorEquipo = teams
    .map((t) => ({ name: t.nombre, alumnos: t.nAlumnos ?? t.alumnos.length }))
    .sort((a, b) => b.alumnos - a.alumnos)
    .slice(0, 12);

  const areaCountMap = new Map<string, number>();
  teams.forEach((t) =>
    areaCountMap.set(
      t.area || "Sin área",
      (areaCountMap.get(t.area || "Sin área") ?? 0) + 1
    )
  );
  const areasCount = Array.from(areaCountMap, ([area, count]) => ({
    area,
    count,
  })).sort((a, b) => a.area.localeCompare(b.area));

  /* ── Promedios globales por fase ─ */
  const avgPhaseDays = (["F1", "F2", "F3", "F4", "F5"] as const).map((ph) => ({
    phase: ph,
    days: phaseTimeN[ph]
      ? Math.round(phaseTimeSums[ph] / phaseTimeN[ph])
      : 0,
  }));

  /* ── Tickets por periodo (día / semana / mes) ─ */
  const perDay = new Map<string, number>();
  tickets.forEach((t) => {
    const d = new Date(t.creacion);
    if (!isNaN(d.getTime())) {
      const k = d.toISOString().slice(0, 10);
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
  });
  const todayISO = isoDay(today);
  const last7 = Array.from({ length: 7 }).map((_, i) =>
    isoDay(addDays(today, -i))
  );
  const last30 = Array.from({ length: 30 }).map((_, i) =>
    isoDay(addDays(today, -i))
  );
  const sumArr = (arr: string[]) =>
    arr.reduce((acc, d) => acc + (perDay.get(d) ?? 0), 0);
  let ticketsPer = {
    day: perDay.get(todayISO) ?? 0,
    week: sumArr(last7),
    month: sumArr(last30),
  };

  /* ── Series: daily (60d), weekly (26w), monthly (12m) ─ */
  // Daily
  const allDays = Array.from({ length: 60 }).map((_, i) =>
    isoDay(addDays(today, -59 + i))
  );
  let daily: TicketsSeries["daily"] = allDays.map((d) => ({
    date: d,
    count: perDay.get(d) ?? 0,
  }));

  // Weekly (semana empieza lunes)
  const weekKey = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay() || 7; // 1..7 (lunes..domingo)
    if (day !== 1) x.setDate(x.getDate() - (day - 1));
    return isoDay(x);
  };
  const perWeek = new Map<string, number>();
  tickets.forEach((t) => {
    const d = new Date(t.creacion);
    if (isNaN(d.getTime())) return;
    const wk = weekKey(d);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  });
  let weekly: TicketsSeries["weekly"] = Array.from({ length: 26 }).map(
    (_, i) => {
      const monday = addDays(today, -7 * (25 - i));
      const wk = weekKey(monday);
      return { week: wk, count: perWeek.get(wk) ?? 0 };
    }
  );

  // Monthly
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const perMonth = new Map<string, number>();
  tickets.forEach((t) => {
    const d = new Date(t.creacion);
    if (isNaN(d.getTime())) return;
    const mk = monthKey(d);
    perMonth.set(mk, (perMonth.get(mk) ?? 0) + 1);
  });
  let monthly: TicketsSeries["monthly"] = Array.from({ length: 12 }).map(
    (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
      const mk = monthKey(d);
      return { month: mk, count: perMonth.get(mk) ?? 0 };
    }
  );

  /* ── Respuesta por coach / equipo y productividad por coach ─ */
  let respByCoach: RespByCoach[] = Array.from(coachAgg.values())
    .map((c) => ({
      coach: c.name,
      response: c.avgResponseMin,
      resolution: c.avgResolutionMin,
      tickets: c.tickets,
    }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 14);

  let respByTeam: RespByTeam[] = Array.from(teamAgg, ([team, v]) => ({
    team,
    response: v.n ? Math.round(v.resp / v.n) : 0,
    resolution: v.n ? Math.round(v.reso / v.n) : 0,
    tickets: v.n,
  }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 14);

  let prodByCoach: ProdByCoach[] = Array.from(coachAgg.values())
    .map((c) => ({
      coach: c.name,
      tickets: c.tickets,
      sessions: c.sessions,
      hours: c.hours,
    }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 14);

  /* ──────────────────────────────────────────────────────────────
     DEV FALLBACK: si no hay data → inyecta datos fake determinísticos
  ────────────────────────────────────────────────────────────── */
  if (respByCoach.length === 0 || respByTeam.length === 0 || prodByCoach.length === 0) {
    const rng = makeRng("dev-fake|teams");

    // 1) Coaches fake si hace falta
    if (respByCoach.length === 0 || prodByCoach.length === 0) {
      const coachNames = ["Klever","Matias","Johan","Pedro","Vanessa","Alma","Camila","Diego"];
      const tmpCoach: RespByCoach[] = [];
      const tmpProd: ProdByCoach[] = [];
      coachNames.forEach((name) => {
        const baseTickets = 8 + Math.floor(rng() * 25);     // 8..32
        const resp = 10 + Math.floor(rng() * 180);          // 10..190 min
        const reso = resp + 60 + Math.floor(rng() * 1200);  // +1h..+21h
        const sessions = 4 + Math.floor(rng() * 20);
        const hours = Math.round((sessions * (0.8 + rng() * 1.2)) * 10) / 10;

        tmpCoach.push({ coach: name, response: resp, resolution: reso, tickets: baseTickets });
        tmpProd.push({ coach: name, tickets: baseTickets, sessions, hours });
      });

      respByCoach = tmpCoach;
      prodByCoach = tmpProd;
    }

    // 2) Equipos fake si hace falta
    if (respByTeam.length === 0) {
      const teamNames =
        teams.length > 0 ? teams.map(t => t.nombre).slice(0, 8)
                         : ["Equipo A","Equipo B","Equipo C","Equipo D","Equipo E","Equipo F","Equipo G","Equipo H"];
      respByTeam = teamNames.map((team) => {
        const r = makeRng("dev-fake|" + team);
        const resp = 12 + Math.floor(r() * 160);
        const reso = resp + 80 + Math.floor(r() * 900);
        const tks = 6 + Math.floor(r() * 20);
        return { team, response: resp, resolution: reso, tickets: tks };
      });
    }

    // 3) Series fake si no hubo tickets
    const noTickets = (tickets?.length ?? 0) === 0;
    if (noTickets) {
      const start = addDays(today, -59);
      daily = Array.from({ length: 60 }, (_, i) => {
        const d = addDays(start, i);
        const r = makeRng("dev-fake|day|" + i);
        return { date: isoDay(d), count: Math.floor(r() * 18) }; // 0..17
      });

      const weekKeyLocal = (d: Date) => {
        const x = new Date(d);
        const day = x.getDay() || 7;
        if (day !== 1) x.setDate(x.getDate() - (day - 1));
        return isoDay(x);
      };
      weekly = Array.from({ length: 26 }, (_, i) => {
        const monday = addDays(today, -7 * (25 - i));
        const r = makeRng("dev-fake|week|" + i);
        return { week: weekKeyLocal(monday), count: 10 + Math.floor(r() * 40) };
      });

      monthly = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
        const r = makeRng("dev-fake|month|" + i);
        return { month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`, count: 40 + Math.floor(r() * 140) };
      });

      ticketsPer = {
        day: daily[daily.length - 1]?.count ?? 0,
        week: weekly.slice(-1)[0]?.count ?? 0,
        month: monthly.reduce((a, b) => a + b.count, 0),
      };
    }
  }

  /* ── Totales y salida ─ */
  const totals = {
    teams: teams.length,
    studentsTotal: students.length,
    studentsActive: students.filter((s) => classifyStudent(s) === "ACTIVO").length,
    studentsInactive: students.filter((s) => classifyStudent(s) === "INACTIVO").length,
    studentsPaused: students.filter((s) => classifyStudent(s) === "PAUSA").length,
    successCases,
    ticketsTotal: tickets.length,
    avgResponseMin,
    avgResolutionMin,
  };

  const activeByPhase = (["F1", "F2", "F3", "F4", "F5"] as const).map((ph) => ({
    phase: ph,
    // @ts-ignore
    count: phaseActive[ph],
  }));

  return {
    totals,
    alumnosPorEquipo,
    areasCount,
    avgPhaseDays,
    activeByPhase,
    noTasks: { d3: noTasks3, d7: noTasks7, d15: noTasks15, d30: noTasks30 },
    transitions: (daysBack: number) => transitionsCounter(daysBack),
    ticketsPer,
    ticketsSeries: { daily, weekly, monthly },
    respByCoach,
    respByTeam,
    prodByCoach,
    coaches: Array.from(coachAgg.values()).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
