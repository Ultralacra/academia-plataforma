"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Activity,
  CalendarDays,
  Loader2,
  Table as TableIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import { dataService, type StudentItem, type Ticket } from "@/lib/data-service";

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fmtDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthsFromYearStartTo(date: Date): string[] {
  const out: string[] = [];
  const year = date.getFullYear();
  const lastMonth = date.getMonth() + 1;
  for (let m = 1; m <= lastMonth; m += 1) {
    out.push(`${year}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
}

function statusBadgeClass(status: unknown): string {
  const s = normalizeText(status);
  if (s.includes("resuelto") || s.includes("cerrado")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("progreso")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (s.includes("pendiente")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-gray-50 text-gray-700 border-gray-200";
}

export default function MetricasNuevaPage() {
  const today = useMemo(() => new Date(), []);
  const fechaDesde = useMemo(() => `${today.getFullYear()}-01-01`, [today]);
  const fechaHasta = useMemo(() => ymd(today), [today]);
  const monthsYtd = useMemo(() => monthsFromYearStartTo(today), [today]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const ticketsByAlumno = useMemo(() => {
    const map = new Map<string, { alumno: string; items: Ticket[] }>();

    for (const t of tickets) {
      const alumno =
        String(t.alumno_nombre ?? "Sin alumno").trim() || "Sin alumno";
      const key = alumno.toLowerCase();
      const bucket = map.get(key);
      if (bucket) {
        bucket.items.push(t);
      } else {
        map.set(key, { alumno, items: [t] });
      }
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        items: [...g.items].sort((a, b) => {
          const da = new Date(String(a.creacion ?? 0)).getTime();
          const db = new Date(String(b.creacion ?? 0)).getTime();
          return db - da;
        }),
      }))
      .sort((a, b) =>
        a.alumno.localeCompare(b.alumno, "es", { sensitivity: "base" }),
      );
  }, [tickets]);

  const metrics = useMemo(() => {
    const displayNameByNorm = new Map<string, string>();
    const stageByStudentName = new Map<string, string>();
    students.forEach((s) => {
      const key = normalizeText(s.name);
      if (!key) return;
      displayNameByNorm.set(key, String(s.name ?? "").trim());
      stageByStudentName.set(key, String(s.stage ?? "Sin fase"));
    });

    const activeSetByMonth = new Map<string, Set<string>>();
    for (const m of monthsYtd) activeSetByMonth.set(m, new Set<string>());

    const ticketsByMonth = new Map<string, number>();
    for (const m of monthsYtd) ticketsByMonth.set(m, 0);

    for (const t of tickets) {
      const created = new Date(String(t.creacion ?? ""));
      if (Number.isNaN(created.getTime())) continue;
      const m = monthKey(created);
      if (!activeSetByMonth.has(m)) continue;

      ticketsByMonth.set(m, (ticketsByMonth.get(m) ?? 0) + 1);

      const alumnoNorm = normalizeText(t.alumno_nombre ?? "");
      if (alumnoNorm) {
        activeSetByMonth.get(m)?.add(alumnoNorm);
        if (!displayNameByNorm.has(alumnoNorm)) {
          displayNameByNorm.set(
            alumnoNorm,
            String(t.alumno_nombre ?? "Sin alumno").trim() || "Sin alumno",
          );
        }
      }
    }

    const monthlyRows = monthsYtd.map((m) => ({
      month: m,
      activeStudents: activeSetByMonth.get(m)?.size ?? 0,
      tickets: ticketsByMonth.get(m) ?? 0,
      students: Array.from(activeSetByMonth.get(m) ?? [])
        .map((nameKey) => ({
          name: displayNameByNorm.get(nameKey) ?? nameKey,
          stage: stageByStudentName.get(nameKey) ?? "Sin fase",
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
        ),
    }));

    const totalActiveByMonth = monthlyRows.reduce(
      (acc, r) => acc + r.activeStudents,
      0,
    );
    const totalTicketsByMonth = monthlyRows.reduce(
      (acc, r) => acc + r.tickets,
      0,
    );
    const monthsCount = Math.max(monthlyRows.length, 1);
    const avgActiveStudentsPerMonth = totalActiveByMonth / monthsCount;
    const avgTicketsPerMonth = totalTicketsByMonth / monthsCount;

    const ytdActiveStudentSet = new Set<string>();
    monthlyRows.forEach((r) => {
      const s = activeSetByMonth.get(r.month);
      if (!s) return;
      s.forEach((name) => ytdActiveStudentSet.add(name));
    });

    const stageCounts = new Map<string, number>();
    const stageStudents = new Map<string, string[]>();
    ytdActiveStudentSet.forEach((nameKey) => {
      const stage = stageByStudentName.get(nameKey) || "Sin fase";
      stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
      const current = stageStudents.get(stage) ?? [];
      current.push(displayNameByNorm.get(nameKey) ?? nameKey);
      stageStudents.set(stage, current);
    });

    const stages = Array.from(stageCounts.entries())
      .map(([stage, count]) => ({
        stage,
        count,
        students: (stageStudents.get(stage) ?? []).sort((a, b) =>
          a.localeCompare(b, "es", { sensitivity: "base" }),
        ),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      monthlyRows,
      avgActiveStudentsPerMonth,
      avgTicketsPerMonth,
      ytdActiveStudents: ytdActiveStudentSet.size,
      stages,
    };
  }, [monthsYtd, students, tickets]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [ticketsResp, studentsResp] = await Promise.all([
          dataService.getTickets({
            fechaDesde,
            fechaHasta,
            pageSize: 1000,
          }),
          dataService.getStudents({ pageSize: 10000 }),
        ]);
        if (!active) return;
        const rows = Array.isArray(ticketsResp?.items) ? ticketsResp.items : [];
        const studentsRows = Array.isArray(studentsResp?.items)
          ? studentsResp.items
          : [];
        setTickets(rows.slice(0, 10000));
        setStudents(studentsRows.slice(0, 10000));
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "No se pudieron cargar los tickets");
        setTickets([]);
        setStudents([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fechaDesde, fechaHasta]);

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Métrica Nueva
              </h1>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100">
                Nueva
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl mt-2">
              Tickets consultados desde <strong>{fechaDesde}</strong> hasta
              <strong> {fechaHasta}</strong>. Se muestran hasta 10000 registros.
            </p>
          </div>

          <Card className="p-5 border-border/60">
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Métricas de actividad (YTD)
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Actividad mensual calculada por tickets creados en cada mes.
              Referencia de fase obtenida desde /admin/alumnos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="text-xs text-emerald-700/80 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Promedio tickets por mes
                </div>
                <div className="text-2xl font-semibold mt-1 text-emerald-800">
                  {metrics.avgTicketsPerMonth.toFixed(1)}
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                <div className="text-xs text-blue-700/80 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Estudiantes activos promedio por mes
                </div>
                <div className="text-2xl font-semibold mt-1 text-blue-800">
                  {metrics.avgActiveStudentsPerMonth.toFixed(1)}
                </div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                <div className="text-xs text-violet-700/80 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Estudiantes activos únicos (año)
                </div>
                <div className="text-2xl font-semibold mt-1 text-violet-800">
                  {metrics.ytdActiveStudents}
                </div>
              </div>
            </div>

            {!loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-sm font-semibold mb-2">
                    Meses activos y tickets
                  </div>
                  <div className="overflow-auto rounded-lg border">
                    <table className="w-full text-sm min-w-[360px]">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-2 font-medium">Mes</th>
                          <th className="text-left p-2 font-medium">Activos</th>
                          <th className="text-left p-2 font-medium">Tickets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.monthlyRows.map((r, idx) => (
                          <tr
                            key={r.month}
                            className={`border-t hover:bg-muted/30 ${
                              idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                            }`}
                          >
                            <td className="p-2 font-medium">
                              {formatMonth(r.month)}
                            </td>
                            <td className="p-2">{r.activeStudents}</td>
                            <td className="p-2">{r.tickets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Accordion type="multiple" className="mt-3 w-full">
                    {metrics.monthlyRows.map((r) => (
                      <AccordionItem
                        key={`month-${r.month}`}
                        value={`month-${r.month}`}
                      >
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium">
                              {formatMonth(r.month)}
                            </span>
                            <Badge variant="secondary">
                              {r.students.length} alumnos
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="rounded-lg border bg-muted/10">
                            {r.students.length > 0 ? (
                              <ul className="max-h-64 overflow-auto divide-y">
                                {r.students.map((s, idx) => (
                                  <li
                                    key={`${r.month}-${s.name}-${idx}`}
                                    className="px-3 py-2 flex items-center justify-between gap-3"
                                  >
                                    <span className="text-sm text-foreground truncate">
                                      {s.name}
                                    </span>
                                    <span className="text-xs rounded-full border bg-background px-2 py-0.5 text-muted-foreground whitespace-nowrap">
                                      {s.stage}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Sin alumnos activos en este mes.
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="rounded-xl border bg-card p-3">
                  <div className="text-sm font-semibold mb-2">
                    Alumnos activos por fase
                  </div>
                  <div className="overflow-auto rounded-lg border">
                    <table className="w-full text-sm min-w-[360px]">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-2 font-medium">Fase</th>
                          <th className="text-left p-2 font-medium">
                            Alumnos activos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.stages.map((r, idx) => (
                          <tr
                            key={r.stage}
                            className={`border-t hover:bg-muted/30 ${
                              idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                            }`}
                          >
                            <td className="p-2">{r.stage}</td>
                            <td className="p-2">{r.count}</td>
                          </tr>
                        ))}
                        {metrics.stages.length === 0 && (
                          <tr>
                            <td
                              colSpan={2}
                              className="p-3 text-muted-foreground"
                            >
                              Sin fases detectadas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <Accordion type="multiple" className="mt-3 w-full">
                    {metrics.stages.map((r) => (
                      <AccordionItem
                        key={`stage-${r.stage}`}
                        value={`stage-${r.stage}`}
                      >
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium">{r.stage}</span>
                            <Badge variant="secondary">
                              {r.students.length} alumnos
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="rounded-lg border bg-muted/10">
                            {r.students.length > 0 ? (
                              <ul className="max-h-64 overflow-auto divide-y">
                                {r.students.map((name, idx) => (
                                  <li
                                    key={`${r.stage}-${name}-${idx}`}
                                    className="px-3 py-2 text-sm text-foreground"
                                  >
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Sin alumnos en esta fase.
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <TableIcon className="h-4 w-4 text-cyan-700" />
              <h2 className="font-medium">Tickets por usuario</h2>
              <Badge variant="outline">{tickets.length} tickets</Badge>
              <Badge variant="secondary">
                {ticketsByAlumno.length} alumnos
              </Badge>
            </div>

            {loading && (
              <div className="text-sm text-muted-foreground py-8 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando tickets...
              </div>
            )}

            {!loading && error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {!loading && !error && tickets.length === 0 && (
              <div className="p-4 text-center text-muted-foreground border rounded-md">
                No hay tickets para el rango seleccionado.
              </div>
            )}

            {!loading && !error && tickets.length > 0 && (
              <Accordion
                type="multiple"
                className="w-full border rounded-xl px-3 bg-card"
              >
                {ticketsByAlumno.map((group) => (
                  <AccordionItem key={group.alumno} value={group.alumno}>
                    <AccordionTrigger className="hover:no-underline hover:bg-muted/20 px-1 rounded-md">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-medium">{group.alumno}</span>
                        <Badge className="bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-50">
                          {group.items.length} tickets
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-auto rounded-xl border bg-background">
                        <table className="w-full min-w-[950px] text-sm">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="text-left p-2 font-medium">ID</th>
                              <th className="text-left p-2 font-medium">
                                Código
                              </th>
                              <th className="text-left p-2 font-medium">
                                Nombre
                              </th>
                              <th className="text-left p-2 font-medium">
                                Estado
                              </th>
                              <th className="text-left p-2 font-medium">
                                Tipo
                              </th>
                              <th className="text-left p-2 font-medium">
                                Informante
                              </th>
                              <th className="text-left p-2 font-medium">
                                Creación
                              </th>
                              <th className="text-left p-2 font-medium">
                                Deadline
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((t, idx) => (
                              <tr
                                key={String(t.id)}
                                className={`border-t hover:bg-muted/30 ${
                                  idx % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/10"
                                }`}
                              >
                                <td className="p-2">{String(t.id ?? "-")}</td>
                                <td className="p-2">
                                  {String(t.id_externo ?? "-")}
                                </td>
                                <td className="p-2">
                                  {String(t.nombre ?? "-")}
                                </td>
                                <td className="p-2">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
                                      t.estado,
                                    )}`}
                                  >
                                    {String(t.estado ?? "-")}
                                  </span>
                                </td>
                                <td className="p-2">{String(t.tipo ?? "-")}</td>
                                <td className="p-2">
                                  {String(
                                    t.informante_nombre ?? t.informante ?? "-",
                                  )}
                                </td>
                                <td className="p-2">{fmtDate(t.creacion)}</td>
                                <td className="p-2">{fmtDate(t.deadline)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
