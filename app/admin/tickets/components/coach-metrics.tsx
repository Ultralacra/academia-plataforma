"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, endpoints, toQuery } from "@/lib/api-config";
import { dataService, type ClientItem, type Ticket } from "@/lib/data-service";
import {
  Calendar as CalendarIcon,
  Search,
  User,
  Users,
  Clock,
  Activity,
  TrendingUp,
} from "lucide-react";

/* ===================== Types ===================== */
type CoachRelation = {
  id: number;
  id_relacion: string;
  id_coach: string;
  id_alumno: string; // código CXA-xxx
  alumno_nombre: string;
  coach_nombre: string;
  puesto?: string | null;
  area?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CoachRelationsResponse = {
  code: number;
  status: string;
  data: CoachRelation[];
};

/* ===================== Utils ===================== */
const fmtDate = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtDateTime = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYYYYMMDD(s?: string | null) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function diffDays(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.max(0, Math.round((+db - +da) / 86400000));
}

// densifica serie de días (para gráfico)
function densifyDays(
  points: { date: string; count: number }[],
  windowDays = 14
) {
  if (!points?.length) return [];
  const max = points.reduce(
    (acc, p) => (p.date > acc ? p.date : acc),
    points[0].date
  );
  const maxD = parseYYYYMMDD(max) ?? new Date(max);
  const start = new Date(maxD);
  start.setDate(start.getDate() - (windowDays - 1));
  const map = new Map(points.map((p) => [p.date, p.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = yyyymmdd(d);
    out.push({ date: k, count: map.get(k) ?? 0 });
  }
  return out;
}

function ticketsByDay(tickets: Ticket[]) {
  const acc = new Map<string, number>();
  tickets.forEach((t) => {
    const d = new Date(t.creacion);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    acc.set(key, (acc.get(key) ?? 0) + 1);
  });
  return Array.from(acc, ([date, count]) => ({ date, count })).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/* ===================== KPI Chip ===================== */
function Kpi({
  icon,
  label,
  value,
  hint,
  color = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  color?: "default" | "blue" | "green" | "amber" | "red" | "violet";
}) {
  const map: Record<string, string> = {
    default: "bg-gray-50 border-gray-200",
    blue: "bg-sky-50 border-sky-100",
    green: "bg-emerald-50 border-emerald-100",
    amber: "bg-amber-50 border-amber-100",
    red: "bg-rose-50 border-rose-100",
    violet: "bg-violet-50 border-violet-100",
  };
  return (
    <div className={`rounded-xl border p-3 ${map[color]}`}>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <div className="rounded-md bg-white p-1.5 border">{icon}</div>
        <span className="font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

/* ===================== MAIN ===================== */
export default function CoachMetrics() {
  // filtros
  const [coachId, setCoachId] = useState("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // datos
  const [relations, setRelations] = useState<CoachRelation[]>([]);
  const [coachName, setCoachName] = useState<string>("");
  const [allClients, setAllClients] = useState<ClientItem[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  // carga “global” de clientes + tickets (paginación local)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const [clientsRes, ticketsRes] = await Promise.all([
          dataService.getClients({}), // hasta 1000
          dataService.getTickets({ fechaDesde, fechaHasta }),
        ]);
        setAllClients(clientsRes.items ?? []);
        setAllTickets(ticketsRes.items ?? []);
      } catch (e) {
        console.error(e);
        setAllClients([]);
        setAllTickets([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [fechaDesde, fechaHasta]);

  // cargar relaciones para un coach específico
  const loadCoach = async () => {
    if (!coachId) return;
    setLoading(true);
    try {
      const json = await apiFetch<CoachRelationsResponse>(
        `${endpoints.coachClient.list}${toQuery({ coach: coachId })}`
      );
      setRelations(json?.data ?? []);
      setCoachName(json?.data?.[0]?.coach_nombre ?? "");
    } catch (e) {
      console.error(e);
      setRelations([]);
      setCoachName("");
    } finally {
      setLoading(false);
    }
  };

  // combinar relaciones con clientes
  const students = useMemo(() => {
    if (!relations?.length) return [];
    const byCode = new Map(
      (allClients ?? []).map((c) => [(c.code ?? "").toUpperCase(), c])
    );
    return relations.map((r) => {
      const c = byCode.get((r.id_alumno ?? "").toUpperCase());
      return {
        code: r.id_alumno,
        name: r.alumno_nombre,
        state: c?.state ?? null,
        stage: c?.stage ?? null,
        joinDate: c?.joinDate ?? null,
        // fechas de paso para métricas de fase (si las agregas al backend)
        paso_f1: (c as any)?.paso_f1 ?? null,
        paso_f2: (c as any)?.paso_f2 ?? null,
        paso_f3: (c as any)?.paso_f3 ?? null,
        paso_f4: (c as any)?.paso_f4 ?? null,
        paso_f5: (c as any)?.paso_f5 ?? null,
      };
    });
  }, [relations, allClients]);

  // KPI: totales por estado
  const { totales, activos, inactivos, pausa } = useMemo(() => {
    const total = students.length;
    const get = (s: string) =>
      students.filter((x) => (x.state ?? "").toUpperCase() === s).length;
    return {
      totales: total,
      activos: get("ACTIVO"),
      inactivos: get("INACTIVO"),
      pausa: get("PAUSA") + get("EN PAUSA"),
    };
  }, [students]);

  // alumnos por fase (etapa actual)
  const alumnosPorFase = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => {
      const k = (s.stage ?? "SIN ETAPA").toUpperCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    // ordenar F1..F5..ONBOARDING..otros
    const preferred = ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"];
    const keys = [
      ...preferred.filter((k) => m.has(k)),
      ...Array.from(m.keys())
        .filter((k) => !preferred.includes(k))
        .sort(),
    ];
    return keys.map((k) => ({ stage: k, count: m.get(k) ?? 0 }));
  }, [students]);

  // tiempos promedio por fase (requiere paso_f1..paso_f5)
  const tiemposPromedio = useMemo(() => {
    function avg(arr: number[]) {
      if (!arr.length) return null;
      return (
        Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      );
    }
    const f1 = students
      .map((s) => diffDays(s.joinDate, s.paso_f1))
      .filter((x): x is number => x !== null);
    const f2 = students
      .map((s) => diffDays(s.paso_f1 as any, s.paso_f2 as any))
      .filter((x): x is number => x !== null);
    const f3 = students
      .map((s) => diffDays(s.paso_f2 as any, s.paso_f3 as any))
      .filter((x): x is number => x !== null);
    const f4 = students
      .map((s) => diffDays(s.paso_f3 as any, s.paso_f4 as any))
      .filter((x): x is number => x !== null);
    const f5 = students
      .map((s) => diffDays(s.paso_f4 as any, s.paso_f5 as any))
      .filter((x): x is number => x !== null);

    return {
      f1: avg(f1),
      f2: avg(f2),
      f3: avg(f3),
      f4: avg(f4),
      f5: avg(f5),
      base: {
        f1: f1.length,
        f2: f2.length,
        f3: f3.length,
        f4: f4.length,
        f5: f5.length,
      },
    };
  }, [students]);

  // tickets de este coach: filtramos por nombre del alumno
  const ticketsCoach = useMemo(() => {
    if (!students.length) return [];
    const names = new Set(students.map((s) => (s.name ?? "").toLowerCase()));
    return (allTickets ?? []).filter(
      (t) =>
        (t.alumno_nombre ?? "").toLowerCase() &&
        names.has((t.alumno_nombre ?? "").toLowerCase())
    );
  }, [students, allTickets]);

  const serieTickets = useMemo(() => {
    const dens = densifyDays(ticketsByDay(ticketsCoach), 14);
    // MA7
    const out: { date: string; count: number; ma7: number | null }[] = [];
    const buf: number[] = [];
    let acc = 0;
    for (const p of dens) {
      buf.push(p.count ?? 0);
      acc += p.count ?? 0;
      if (buf.length > 7) acc -= buf.shift()!;
      out.push({
        date: p.date,
        count: p.count,
        ma7: buf.length === 7 ? Math.round((acc / 7) * 100) / 100 : null,
      });
    }
    return out;
  }, [ticketsCoach]);

  const totalTickets = ticketsCoach.length;

  /* ===================== UI ===================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Métricas de Coach
        </h1>
        <p className="text-sm text-muted-foreground">
          Analítica basada en alumnos y tickets del coach seleccionado.
        </p>
      </div>

      {/* Toolbar filtros */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-12 pt-3">
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                placeholder="ID del coach (ej. mQ2dwRX3xMzV99e3nh9eb)"
                className="pl-9"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Introduce el ID del coach y presiona “Cargar”.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Desde</p>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Hasta</p>
          </div>

          <div className="md:col-span-3 flex items-end">
            <Button onClick={loadCoach} className="w-full">
              Cargar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Kpi
          icon={<Users className="h-4 w-4 text-sky-600" />}
          label="Estudiantes totales"
          value={totales}
          hint={coachName ? `Coach: ${coachName}` : undefined}
          color="blue"
        />
        <Kpi
          icon={<Activity className="h-4 w-4 text-emerald-600" />}
          label="Activos"
          value={activos}
          hint={`Basado en ${totales} estudiantes`}
          color="green"
        />
        <Kpi
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          label="En pausa"
          value={pausa}
          hint={`Basado en ${totales} estudiantes`}
          color="amber"
        />
        <Kpi
          icon={<User className="h-4 w-4 text-rose-600" />}
          label="Inactivos"
          value={inactivos}
          hint={`Basado en ${totales} estudiantes`}
          color="red"
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4 text-violet-600" />}
          label="Tickets (rango)"
          value={totalTickets}
          hint={
            fechaDesde || fechaHasta
              ? `Filtrado por fecha de creación`
              : `Últimos ${serieTickets.length || 0} días`
          }
          color="violet"
        />
      </div>

      {/* Fases + tiempos promedio */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Alumnos por fase */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              Estudiantes por fase (actual)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {alumnosPorFase.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <div className="space-y-3">
                {alumnosPorFase.map((f, i) => {
                  const pct = totales
                    ? Math.round((f.count / totales) * 100)
                    : 0;
                  const palette = [
                    "bg-indigo-500",
                    "bg-amber-500",
                    "bg-emerald-500",
                    "bg-rose-500",
                    "bg-cyan-500",
                    "bg-violet-500",
                  ];
                  const color = palette[i % palette.length];
                  return (
                    <div key={f.stage}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{f.stage}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {f.count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-2.5 w-full rounded-full bg-muted">
                        <div
                          className={`h-2.5 rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tiempos promedio por fase */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              Tiempo promedio por fase (días)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(["f1", "f2", "f3", "f4", "f5"] as const).map((k, idx) => {
                const val = (tiemposPromedio as any)[k] as number | null;
                const base = (tiemposPromedio.base as any)[k] as number;
                const labels: Record<typeof k, string> = {
                  f1: "F1",
                  f2: "F2",
                  f3: "F3",
                  f4: "F4",
                  f5: "F5",
                };
                const color: any = ["blue", "amber", "green", "violet", "red"][
                  idx
                ];
                return (
                  <div key={k} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      {labels[k]}
                    </div>
                    <div className="mt-1 text-xl font-semibold tabular-nums">
                      {val === null ? "N/D" : val}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {base
                        ? `Basado en ${base} alumnos`
                        : "Sin datos de fechas"}
                    </div>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        Promedio
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            {!Object.values(tiemposPromedio.base).some((n) => n > 0) && (
              <p className="mt-3 text-xs text-muted-foreground">
                * Para habilitar estos promedios, el backend debe enviar{" "}
                <code>paso_f1..paso_f5</code> por alumno.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tickets por día (área) */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            Tickets por día (alumnos del coach)
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Curva diaria con media móvil de 7 días. Rango:{" "}
            {fechaDesde ? fmtDate.format(new Date(fechaDesde)) : "—"} —{" "}
            {fechaHasta ? fmtDate.format(new Date(fechaHasta)) : "—"}
          </p>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          {serieTickets.length <= 1 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin suficiente información para graficar. Amplía el rango de
              fechas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={serieTickets}
                margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
              >
                <defs>
                  <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#0ea5e9"
                      stopOpacity={0.06}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis
                  allowDecimals={false}
                  width={36}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <RTooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = parseYYYYMMDD(String(label));
                    const val =
                      payload.find((p: any) => p.dataKey === "count")?.value ??
                      0;
                    const ma =
                      payload.find((p: any) => p.dataKey === "ma7")?.value ??
                      null;
                    return (
                      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow">
                        <div className="font-medium">
                          {d ? fmtDateTime.format(d) : label}
                        </div>
                        <div className="text-muted-foreground">
                          Tickets: <b>{val}</b>
                        </div>
                        {ma !== null && (
                          <div className="text-muted-foreground">
                            Media 7d: <b>{ma}</b>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0ea5e9"
                  fill="url(#gradArea)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="ma7"
                  stroke="#0284c7"
                  fillOpacity={0}
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Listado de alumnos del coach */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Alumnos del coach</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-2">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-[1] bg-white">
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Etapa</th>
                <th className="px-4 py-2">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr
                  key={`${s.code}-${i}`}
                  className="border-b hover:bg-muted/40"
                >
                  <td className="px-4 py-2 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">
                    {s.state ? <Badge variant="outline">{s.state}</Badge> : "—"}
                  </td>
                  <td className="px-4 py-2">{s.stage ?? "—"}</td>
                  <td className="px-4 py-2">
                    {s.joinDate ? fmtDate.format(new Date(s.joinDate)) : "—"}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    Sin alumnos para este coach.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Nota sobre métricas no disponibles */}
      <p className="text-xs text-muted-foreground">
        * “Tiempo de respuesta promedio por coach”, “Sesiones/horas invertidas”
        y “Casos de éxito” requieren timestamps o fuentes adicionales no
        presentes en los endpoints actuales. En cuanto tengas esos campos,
        conectamos los cálculos sobre esta misma interfaz.
      </p>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-600 border-b-transparent" />
        </div>
      )}
    </div>
  );
}
