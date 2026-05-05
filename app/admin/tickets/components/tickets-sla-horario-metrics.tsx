"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  MoonStar,
  Sun,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { Ticket } from "@/lib/data-service";

// ─── Constantes ───────────────────────────────────────────────────────────────

const HORARIO_INICIO = 8; // 08:00 hora Colombia
const HORARIO_FIN = 17; // 17:00 hora Colombia
const SLA_HORAS = 4; // deadline en horas de atención

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normEstado(v?: string | null) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Los timestamps ya vienen en hora Colombia.
 * Devuelve true si la hora está dentro del horario de atención (8:00–17:00).
 */
function isDentroHorario(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const h = d.getHours();
  const m = d.getMinutes();
  const mins = h * 60 + m;
  return mins >= HORARIO_INICIO * 60 && mins < HORARIO_FIN * 60;
}

function horaStr(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function minsToHuman(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  const days = Math.floor(h / 24);
  const hrs = h % 24;
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

/**
 * Si una fecha cae fuera del horario laboral (antes de 8:00 o después de 17:00),
 * la avanza al próximo inicio de jornada (8:00 del mismo día si es antes de las 8,
 * o 8:00 del día siguiente si es después de las 17:00).
 * Los tickets llegan a cualquier hora — el SLA empieza cuando abre la atención.
 */
function ajustarAlHorarioLaboral(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins >= HORARIO_INICIO * 60 && mins < HORARIO_FIN * 60) return dateStr; // ya dentro
  const adjusted = new Date(d);
  if (mins < HORARIO_INICIO * 60) {
    // antes de las 8 → 8:00 del mismo día
    adjusted.setHours(HORARIO_INICIO, 0, 0, 0);
  } else {
    // después de las 17 → 8:00 del día siguiente
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setHours(HORARIO_INICIO, 0, 0, 0);
  }
  return adjusted.toISOString();
}

/**
 * Calcula minutos laborales entre dos strings de fecha Colombia.
 * Solo cuenta minutos entre 8:00 y 17:00.
 */
function minutosLaboralesEntre(desdeStr: string, hastaStr: string): number {
  const desde = new Date(desdeStr);
  const hasta = new Date(hastaStr);
  if (isNaN(desde.getTime()) || isNaN(hasta.getTime()) || hasta <= desde)
    return 0;

  const diffMs = hasta.getTime() - desde.getTime();
  // Para diferencias cortas (< 72h) hacemos cálculo minuto a minuto exacto
  if (diffMs <= 72 * 3600 * 1000) {
    let mins = 0;
    let cur = desde.getTime();
    const step = 60000;
    while (cur < hasta.getTime()) {
      const d = new Date(cur);
      const minuteOfDay = d.getHours() * 60 + d.getMinutes();
      if (
        minuteOfDay >= HORARIO_INICIO * 60 &&
        minuteOfDay < HORARIO_FIN * 60
      ) {
        mins++;
      }
      cur += step;
    }
    return mins;
  }
  // Para diferencias largas: aproximación (9h laborales/día)
  const diffDays = diffMs / 86400000;
  return Math.round(diffDays * (HORARIO_FIN - HORARIO_INICIO) * 60);
}

// ─── Grupos de estados del flujo ──────────────────────────────────────────────

const ESTADOS_FASE_A = new Set([
  "PENDIENTE",
  "EN PROGRESO",
  "PAUSADO",
  "PAUSA",
  "EN PAUSA",
  "PENDIENTE DE COACH",
]);

const ESTADOS_FASE_B = new Set(["PENDIENTE DE ENVIO", "RESUELTO"]);

// ─── Lógica de cálculo usando historial de estados ────────────────────────────

function primerEntradaEstado(
  estados: Ticket["estados"],
  estadosBuscados: Set<string>,
): string | null {
  if (!estados?.length) return null;
  for (const e of estados) {
    if (estadosBuscados.has(normEstado(e.estatus_id))) {
      return e.created_at ?? null;
    }
  }
  return null;
}

function salidaDeEstados(
  estados: Ticket["estados"],
  estadosBuscados: Set<string>,
): string | null {
  if (!estados?.length) return null;
  let dentroDelGrupo = false;
  for (const e of estados) {
    const norm = normEstado(e.estatus_id);
    if (estadosBuscados.has(norm)) {
      dentroDelGrupo = true;
    } else if (dentroDelGrupo) {
      return e.created_at ?? null;
    }
  }
  return null;
}

type FaseStats = {
  label: string;
  descripcion: string;
  tickets: Ticket[];
  tiemposLab: number[];
  cumplioSLA: number;
  noSLA: number;
  sinHistorial: number; // tienen historial pero incompleto
  estimados: number; // calculados con fallback creacion→ultimo_estado
};

function calcFase(
  tickets: Ticket[],
  label: string,
  descripcion: string,
  estadosGrupo: Set<string>,
): FaseStats {
  const tiemposLab: number[] = [];
  let cumplioSLA = 0;
  let noSLA = 0;
  let sinHistorial = 0;
  let estimados = 0;

  for (const t of tickets) {
    const estados = t.estados ?? [];
    let desde: string | null = null;
    let hasta: string | null = null;
    let esEstimado = false;

    if (estados.length) {
      // Tenemos historial completo
      desde = primerEntradaEstado(estados, estadosGrupo);
      hasta =
        salidaDeEstados(estados, estadosGrupo) ??
        t.ultimo_estado?.fecha ??
        null;
    }

    // Fallback: sin historial (API de lista no lo devuelve) → usar creacion y ultimo_estado
    if (!desde || !hasta) {
      desde = t.creacion;
      hasta = t.ultimo_estado?.fecha ?? null;
      esEstimado = true;
    }

    if (!desde || !hasta) {
      sinHistorial++;
      continue;
    }

    const desdeAjustado = ajustarAlHorarioLaboral(desde);
    const minsLab = minutosLaboralesEntre(desdeAjustado, hasta);
    tiemposLab.push(minsLab);
    if (minsLab <= SLA_HORAS * 60) cumplioSLA++;
    else noSLA++;
    if (esEstimado) estimados++;
  }

  return {
    label,
    descripcion,
    tickets,
    tiemposLab,
    cumplioSLA,
    noSLA,
    sinHistorial,
    estimados,
  };
}

type SLAGlobal = {
  total: number;
  resueltos: number;
  cumplioSLA: number;
  cumplioSLAPct: number;
  noSLA: number;
  noSLAPct: number;
  avgMinsLab: number | null;
};

function calcSLA(tickets: Ticket[]): SLAGlobal {
  const resueltosList = tickets.filter(
    (t) => normEstado(t.estado) === "RESUELTO",
  );
  const diffs: number[] = [];
  let cumplioSLA = 0;
  let noSLA = 0;

  for (const t of resueltosList) {
    const estados = t.estados ?? [];
    const fechaResuelto =
      primerEntradaEstado(estados, new Set(["RESUELTO"])) ??
      t.ultimo_estado?.fecha ??
      null;
    if (!fechaResuelto) continue;

    // Si el ticket llegó fuera de horario, el SLA empieza desde el próximo 8am
    const desdeAjustado = ajustarAlHorarioLaboral(t.creacion);
    const minsLab = minutosLaboralesEntre(desdeAjustado, fechaResuelto);
    diffs.push(minsLab);
    if (minsLab <= SLA_HORAS * 60) cumplioSLA++;
    else noSLA++;
  }

  const avgMinsLab =
    diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;

  return {
    total: tickets.length,
    resueltos: resueltosList.length,
    cumplioSLA,
    cumplioSLAPct: pct(cumplioSLA, resueltosList.length),
    noSLA,
    noSLAPct: pct(noSLA, resueltosList.length),
    avgMinsLab,
  };
}

type TicketFuera = {
  ticket: Ticket;
  horaCreacion: string;
  creadoFuera: boolean;
  horaUltAct: string;
  ultActFuera: boolean;
};

function calcHorario(tickets: Ticket[]): {
  dentro: number;
  fuera: TicketFuera[];
} {
  const fuera: TicketFuera[] = [];
  let dentro = 0;

  for (const t of tickets) {
    const creadoFuera = !isDentroHorario(t.creacion);
    const ultActFecha = t.ultimo_estado?.fecha ?? t.creacion;
    const ultActFuera = !isDentroHorario(ultActFecha);

    // Un ticket se marca "fuera" solo si su ÚLTIMA ATENCIÓN superó las 17:00.
    // Los tickets creados fuera de horario son normales (el cliente puede escribir cuando quiera).
    if (ultActFuera) {
      fuera.push({
        ticket: t,
        horaCreacion: horaStr(t.creacion),
        creadoFuera,
        horaUltAct: horaStr(ultActFecha),
        ultActFuera,
      });
    } else {
      dentro++;
    }
  }

  return { dentro, fuera };
}

// ─── Sub-componentes UI ───────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "slate",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: "slate" | "emerald" | "amber" | "red" | "sky" | "violet";
}) {
  const cls = {
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${cls[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 opacity-60" />
        <span className="text-[11px] font-medium uppercase tracking-wide opacity-70">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function Bar({ pct: p, color = "emerald" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full bg-${color}-500`}
        style={{ width: `${Math.min(100, Math.max(0, p))}%` }}
      />
    </div>
  );
}

function FaseCard({ f }: { f: FaseStats }) {
  const conDatos = f.tiemposLab.length;
  const avg =
    conDatos > 0 ? f.tiemposLab.reduce((a, b) => a + b, 0) / conDatos : null;
  const slaOk = pct(f.cumplioSLA, conDatos);
  const slaColor = slaOk >= 70 ? "emerald" : slaOk >= 40 ? "amber" : "red";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-sm text-gray-800">{f.label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{f.descripcion}</div>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {f.tickets.length} tickets
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-2">
          <div className="text-xs text-gray-500 mb-0.5">Promedio laboral</div>
          <div className="text-sm font-bold text-gray-800">
            {avg != null ? minsToHuman(avg) : "—"}
          </div>
        </div>
        <div
          className={`rounded-lg border p-2 ${slaColor === "emerald" ? "bg-emerald-50 border-emerald-100" : slaColor === "amber" ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}
        >
          <div className="text-xs text-gray-500 mb-0.5">SLA ≤ {SLA_HORAS}h</div>
          <div
            className={`text-sm font-bold ${slaColor === "emerald" ? "text-emerald-700" : slaColor === "amber" ? "text-amber-700" : "text-red-700"}`}
          >
            {slaOk}%
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-2">
          <div className="text-xs text-gray-500 mb-0.5">Sin fecha</div>
          <div className="text-sm font-bold text-gray-500">
            {f.sinHistorial}
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Cumplimiento SLA</span>
          <span>
            {f.cumplioSLA} ✓ · {f.noSLA} ✗
          </span>
        </div>
        <Bar pct={slaOk} color={slaColor} />
      </div>

      {f.estimados > 0 && (
        <div className="text-[11px] text-gray-400 flex items-center gap-1">
          <span className="opacity-60">~</span>
          {f.estimados} calculados desde creación (sin historial detallado)
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TicketsSLAHorarioMetrics({
  tickets,
  onTicketClick,
}: {
  tickets: Ticket[];
  onTicketClick?: (t: Ticket) => void;
}) {
  const [showFuera, setShowFuera] = useState(false);

  const faseA = useMemo(
    () =>
      calcFase(
        tickets.filter((t) => ESTADOS_FASE_A.has(normEstado(t.estado))),
        "Fase activa",
        "Desde PENDIENTE hasta EN PROGRESO / PAUSADO / PENDIENTE DE COACH",
        ESTADOS_FASE_A,
      ),
    [tickets],
  );

  const faseB = useMemo(
    () =>
      calcFase(
        tickets.filter((t) => ESTADOS_FASE_B.has(normEstado(t.estado))),
        "Fase de cierre",
        "Desde PENDIENTE DE ENVÍO hasta RESUELTO",
        ESTADOS_FASE_B,
      ),
    [tickets],
  );

  const sla = useMemo(() => calcSLA(tickets), [tickets]);

  const { dentro, fuera } = useMemo(() => calcHorario(tickets), [tickets]);

  const slaColor =
    sla.cumplioSLAPct >= 80
      ? "emerald"
      : sla.cumplioSLAPct >= 50
        ? "amber"
        : "red";

  return (
    <div className="space-y-6">
      {/* SLA global */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Timer className="w-4 h-4 text-indigo-500" />
          SLA de resolución — deadline {SLA_HORAS}h laborales (hora Colombia)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <StatCard
            icon={CheckCircle2}
            label="Cumplieron SLA"
            value={`${sla.cumplioSLAPct}%`}
            sub={`${sla.cumplioSLA} de ${sla.resueltos} resueltos`}
            color={slaColor}
          />
          <StatCard
            icon={AlertTriangle}
            label="Excedieron SLA"
            value={`${sla.noSLAPct}%`}
            sub={`${sla.noSLA} tickets`}
            color={sla.noSLA > 0 ? "red" : "slate"}
          />
          <StatCard
            icon={Clock}
            label="Tiempo promedio"
            value={sla.avgMinsLab != null ? minsToHuman(sla.avgMinsLab) : "—"}
            sub="creación → resuelto (laboral)"
            color="sky"
          />
          <StatCard
            icon={TrendingUp}
            label="Sin resolver"
            value={String(sla.total - sla.resueltos)}
            sub={`de ${sla.total} total`}
            color={sla.total - sla.resueltos > 0 ? "amber" : "slate"}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Cumplimiento SLA global</span>
          <span className="font-medium">{sla.cumplioSLAPct}%</span>
        </div>
        <Bar pct={sla.cumplioSLAPct} color={slaColor} />
        <div className="text-[11px] text-gray-400 mt-1.5">
          Calculado con historial de estados · horario atención 8:00–17:00
          Colombia · deadline {SLA_HORAS}h laborales
        </div>
      </div>

      {/* Tiempos por fase */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          Tiempos por fase del flujo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FaseCard f={faseA} />
          <FaseCard f={faseB} />
        </div>
      </div>

      {/* Horario de atención */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          Actividad por horario (Colombia 8:00–17:00)
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">
                Atendidos en horario
              </span>
            </div>
            <div className="text-2xl font-bold text-emerald-700">{dentro}</div>
            <div className="text-xs text-emerald-500 mt-0.5">
              última acción antes de las 17:00 · {pct(dentro, tickets.length)}%
              del total
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <MoonStar className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">
                Atendidos fuera de horario
              </span>
            </div>
            <div className="text-2xl font-bold text-amber-700">
              {fuera.length}
            </div>
            <div className="text-xs text-amber-500 mt-0.5">
              última acción después de las 17:00 ·{" "}
              {pct(fuera.length, tickets.length)}% del total
            </div>
          </div>
        </div>

        {fuera.length > 0 && (
          <>
            <button
              onClick={() => setShowFuera((p) => !p)}
              className="text-xs text-amber-700 underline underline-offset-2 mb-2"
            >
              {showFuera
                ? "Ocultar"
                : `Ver ${fuera.length} tickets atendidos después de las 17:00`}
            </button>
            {showFuera && (
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-amber-800">
                        #
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-amber-800">
                        Estado
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-amber-800">
                        Alumno
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-amber-800">
                        Creado
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-amber-800">
                        Últ. act.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {fuera.map(
                      ({
                        ticket: t,
                        horaCreacion,
                        creadoFuera,
                        horaUltAct,
                        ultActFuera,
                      }) => (
                        <tr
                          key={t.id}
                          className="hover:bg-amber-50 cursor-pointer"
                          onClick={() => onTicketClick?.(t)}
                        >
                          <td className="px-3 py-2 font-mono text-gray-500">
                            #{t.id}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                              {t.estado}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-700 truncate max-w-[160px]">
                            {t.alumno_nombre ?? "—"}
                          </td>
                          <td
                            className={`px-3 py-2 ${creadoFuera ? "text-amber-700 font-semibold" : "text-gray-400"}`}
                          >
                            {horaCreacion}
                            {creadoFuera ? " ⚠" : ""}
                          </td>
                          <td
                            className={`px-3 py-2 ${ultActFuera ? "text-amber-700 font-semibold" : "text-gray-400"}`}
                          >
                            {horaUltAct}
                            {ultActFuera ? " ⚠" : ""}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
