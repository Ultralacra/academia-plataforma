// teamsApi.ts
// Consulta de coachs para equipos
import { apiFetch } from "@/lib/api-config";

export type Coach = {
  id: number;
  codigo: string;
  nombre: string;
  puesto: string | null;
  area: string | null;
  tickets: number;
  alumnos: number;
  created_at: string;
};

export async function fetchCoachs(): Promise<Coach[]> {
  const json = await apiFetch<any>(
    "/team/get/team?page=1&pageSize=25"
  );
  return json.data as Coach[];
}

// ==== Alumnos por coach ====
export type RawClient = {
  id: number;
  codigo?: string | null;
  nombre: string;
  estado?: string | null; // status / state
  etapa?: string | null; // stage / phase
  ingreso?: string | null;
  ultima_actividad?: string | null;
  inactividad?: number | null;
  tickets?: number | null;
  area?: string | null;
  puesto?: string | null;
  contrato?: string | null;
  entregables?: any | null;
  aprobaciones?: any | null;
  nicho?: string | null;
  paso_f1?: number | null;
  paso_f2?: number | null;
  paso_f3?: number | null;
  paso_f4?: number | null;
  paso_f5?: number | null;
};

export async function fetchStudentsByCoach(coachCode: string): Promise<RawClient[]> {
  if (!coachCode) return [];
  const url = `/client/get/clients-coaches?coach=${encodeURIComponent(coachCode)}`;
  const json = await apiFetch<any>(url);
  // El endpoint devuelve objetos con campos: id, id_alumno, alumno_nombre, coach_nombre, puesto, area, created_at, updated_at
  // Normalizamos al shape RawClient usando:
  //  - codigo <- id_alumno
  //  - nombre <- alumno_nombre
  //  - ultima_actividad <- updated_at
  return Array.isArray(json.data)
    ? (json.data as any[]).map((r) => ({
        id: r.id,
        codigo: r.id_alumno ?? null,
        nombre: r.alumno_nombre ?? "",
        estado: r.estado ?? null, // no viene en el payload mostrado, queda null
        etapa: r.etapa ?? null, // no viene en el payload mostrado, queda null
        ultima_actividad: r.updated_at ?? null,
        inactividad: r.inactividad ?? null,
        tickets: r.tickets ?? null,
        area: r.area ?? null,
        puesto: r.puesto ?? null,
      }))
    : [];
}

export async function fetchAllStudents(
  fechaDesde?: string,
  fechaHasta?: string
): Promise<RawClient[]> {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", "1000");
  if (fechaDesde) params.set("fechaDesde", fechaDesde);
  if (fechaHasta) params.set("fechaHasta", fechaHasta);
  const qs = `?${params.toString()}`;
  const json = await apiFetch<any>(`/client/get/clients${qs}`);
  return Array.isArray(json.data) ? (json.data as RawClient[]) : [];
}

// ==== Metrics directas (sin dataService) ====
export async function fetchMetrics(
  fechaDesde?: string,
  fechaHasta?: string,
  coachCode?: string
) {
  // Nuevo endpoint v2 con soporte de coach
  const params = new URLSearchParams();
  if (fechaDesde) params.set("fechaDesde", fechaDesde);
  if (fechaHasta) params.set("fechaHasta", fechaHasta);
  if (coachCode) params.set("coach", coachCode);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const url = `/metrics/get/metrics-v2${qs}`;
  const json = await apiFetch<any>(url);

  // Mapear al shape esperado por TeamsMetricsContent (root.data.teams....)
  const d = (json?.data as any) || {};
  const ticketsByDay: Array<{ day: string; tickets: number }> = Array.isArray(
    d.ticketsByDay
  )
    ? d.ticketsByDay
    : [];
  const daily = ticketsByDay.map((r) => ({
    date: new Date(r.day).toISOString().slice(0, 10),
    count: Number(r.tickets || 0) || 0,
  }));
  // Agregar series semanales y mensuales agregadas desde daily
  const weeklyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();
  daily.forEach((p) => {
    const dDate = new Date(p.date + "T00:00:00Z");
    if (isNaN(dDate.getTime())) return;
    // Semana ISO: obtener lunes de esa semana como clave
    const tmp = new Date(Date.UTC(dDate.getUTCFullYear(), dDate.getUTCMonth(), dDate.getUTCDate()));
    const dayNum = (tmp.getUTCDay() + 6) % 7; // 0 = lunes
    tmp.setUTCDate(tmp.getUTCDate() - dayNum);
    const weekKey = tmp.toISOString().slice(0, 10); // YYYY-MM-DD (lunes de la semana)
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + p.count);
    // Mensual
    const monthKey = `${dDate.getUTCFullYear()}-${String(dDate.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + p.count);
  });
  const weekly = Array.from(weeklyMap, ([week, count]) => ({ week, count })).sort(
    (a, b) => a.week.localeCompare(b.week)
  );
  const monthly = Array.from(monthlyMap, ([month, count]) => ({ month, count })).sort(
    (a, b) => a.month.localeCompare(b.month)
  );
  const ticketsTotal = daily.reduce((a, c) => a + (c.count || 0), 0);
  // Derivar per a partir de los últimos 1/7/30 día
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const weekCut = new Date(now);
  weekCut.setUTCDate(now.getUTCDate() - 6);
  const monthCut = new Date(now);
  monthCut.setUTCDate(now.getUTCDate() - 29);
  let perDay = 0,
    perWeek = 0,
    perMonth = 0;
  daily.forEach((p) => {
    const dDate = new Date(p.date);
    if (p.date === dayKey) perDay += p.count;
    if (dDate >= weekCut) perWeek += p.count;
    if (dDate >= monthCut) perMonth += p.count;
  });

  const teams = {
    totals: {
      teams: 0,
      studentsTotal: 0,
      ticketsTotal,
      avgResponseMin: 0,
      avgResolutionMin: 0,
    },
    ticketsPer: { day: perDay, week: perWeek, month: perMonth },
    ticketsSeries: {
      daily,
      weekly,
      monthly,
    },
    // Agregados por fase y por estado
    clientsByPhaseAgg: Array.isArray(d.clientsByPhase)
      ? d.clientsByPhase.reduce((acc: any[], it: any) => {
          const name = String(it.etapa ?? "Sin fase");
          const value = Number(it.cantidad ?? 0) || 0;
          const found = acc.find((x) => x.name === name);
          if (found) found.value += value;
          else acc.push({ name, value });
          return acc;
        }, [])
      : [],
    clientsByStateAgg: Array.isArray(d.clientsByState)
      ? d.clientsByState.reduce((acc: any[], it: any) => {
          const name = String(it.estado ?? "Sin estado");
          const value = Number(it.cantidad ?? 0) || 0;
          const found = acc.find((x) => x.name === name);
          if (found) found.value += value;
          else acc.push({ name, value });
          return acc;
        }, [])
      : [],
    // Detalle con nombres por fase y estado (para acordeón)
    clientsByPhaseDetails: Array.isArray(d.clientsByPhase)
      ? (() => {
          const map = new Map<string, { name: string; value: number; students: string[] }>();
          (d.clientsByPhase as any[]).forEach((it) => {
            const name = String(it.etapa ?? "Sin fase");
            const value = Number(it.cantidad ?? 0) || 0;
            const namesStr = String(it.nombre ?? "");
            const students = namesStr
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            const prev = map.get(name);
            if (prev) {
              prev.value += value;
              // concatenar y de-duplicar
              const set = new Set<string>([...prev.students, ...students]);
              prev.students = Array.from(set);
            } else {
              map.set(name, { name, value, students });
            }
          });
          return Array.from(map.values());
        })()
      : [],
    clientsByStateDetails: Array.isArray(d.clientsByState)
      ? (() => {
          const map = new Map<string, { name: string; value: number; students: string[] }>();
          (d.clientsByState as any[]).forEach((it) => {
            const name = String(it.estado ?? "Sin estado");
            const value = Number(it.cantidad ?? 0) || 0;
            const namesStr = String(it.nombre ?? "");
            const students = namesStr
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            const prev = map.get(name);
            if (prev) {
              prev.value += value;
              const set = new Set<string>([...prev.students, ...students]);
              prev.students = Array.from(set);
            } else {
              map.set(name, { name, value, students });
            }
          });
          return Array.from(map.values());
        })()
      : [],
    // Detalle de alumnos del coach directamente desde metrics-v2
    clientsByCoachDetail: Array.isArray(d.clientsByCoachDetail)
      ? (d.clientsByCoachDetail as any[]).map((it) => ({
          id: Number(it.id),
          codigo: it.codigo ?? null,
          nombre: String(it.nombre ?? ""),
          estado: it.estado ?? null,
          etapa: it.etapa ?? null,
          ingreso: it.ingreso ?? null,
          ultima_actividad: it.ultima_actividad ?? null,
          // El backend puede enviar dias_inactividad o inactividad
          inactividad: (it.dias_inactividad ?? it.inactividad) ?? null,
          tickets: it.tickets ?? null,
          area: it.area ?? null,
          puesto: it.puesto ?? null,
          contrato: it.contrato ?? null,
          entregables: it.entregables ?? null,
          aprobaciones: it.aprobaciones ?? null,
          nicho: it.nicho ?? null,
          paso_f1: it.paso_f1 ?? null,
          paso_f2: it.paso_f2 ?? null,
          paso_f3: it.paso_f3 ?? null,
          paso_f4: it.paso_f4 ?? null,
          paso_f5: it.paso_f5 ?? null,
        }))
      : [],
    ticketsByName: Array.isArray(d.ticketsByName) ? d.ticketsByName : [],
    avgResolutionSummary: d?.avgResolutionByCoach?.resumen
      ? {
          tickets_resueltos:
            Number(d.avgResolutionByCoach.resumen.tickets_resueltos ?? 0) || 0,
          avg_seconds: String(d.avgResolutionByCoach.resumen.avg_seconds ?? ""),
          avg_minutes:
            d.avgResolutionByCoach.resumen.avg_minutes != null
              ? Number(d.avgResolutionByCoach.resumen.avg_minutes)
              : null,
          avg_hours:
            d.avgResolutionByCoach.resumen.avg_hours != null
              ? Number(d.avgResolutionByCoach.resumen.avg_hours)
              : null,
          avg_time_hms: String(
            d.avgResolutionByCoach.resumen.avg_time_hms ?? ""
          ),
        }
      : null,
    ticketsByEstado: Array.isArray(d.ticketsByEstado)
      ? (d.ticketsByEstado as any[]).map((it) => ({
          estado: String(it.estado ?? ""),
          cantidad: Number(it.cantidad ?? 0) || 0,
        }))
      : [],
    // Distribución por tipo de ticket
    ticketsByType: Array.isArray(d.ticketsByType)
      ? (d.ticketsByType as any[]).map((it) => ({
          tipo: String(it.tipo ?? "SIN_TIPO"),
          cantidad: Number(it.cantidad ?? 0) || 0,
        }))
      : [],
    // Ticket con respuesta más lenta
    slowestResponseTicket: d?.slowestResponseTickets
      ? {
          ticket_id: Number(d.slowestResponseTickets.ticket_id ?? 0) || 0,
          codigo_alumno: String(d.slowestResponseTickets.codigo_alumno ?? ""),
          nombre_alumno: String(d.slowestResponseTickets.nombre_alumno ?? ""),
          asunto_ticket: String(d.slowestResponseTickets.asunto_ticket ?? ""),
          tipo_ticket: String(d.slowestResponseTickets.tipo_ticket ?? ""),
          estado_ticket: String(d.slowestResponseTickets.estado_ticket ?? ""),
          fecha_creacion: String(d.slowestResponseTickets.fecha_creacion ?? ""),
          fecha_respuesta: String(d.slowestResponseTickets.fecha_respuesta ?? ""),
          minutos_respuesta:
            Number(d.slowestResponseTickets.minutos_respuesta ?? 0) || 0,
          horas_respuesta:
            Number(d.slowestResponseTickets.horas_respuesta ?? 0) || 0,
          dias_respuesta:
            Number(d.slowestResponseTickets.dias_respuesta ?? 0) || 0,
        }
      : null,
    // Promedios de resolución por alumno (incluye segundos, minutos y horas)
    avgResolutionByStudent: Array.isArray(d?.avgResolutionByCoach?.detalle)
      ? (d.avgResolutionByCoach.detalle as any[]).map((it) => {
          const avg_seconds =
            it.avg_seconds != null ? Number(it.avg_seconds) : null;
          const avg_minutes =
            it.avg_minutes != null
              ? Number(it.avg_minutes)
              : avg_seconds != null
              ? avg_seconds / 60
              : null;
          const avg_hours =
            it.avg_hours != null
              ? Number(it.avg_hours)
              : avg_minutes != null
              ? avg_minutes / 60
              : avg_seconds != null
              ? avg_seconds / 3600
              : null;
          return {
            code: String(it.codigo ?? it.codigo_alumno ?? ""),
            name: String(it.nombre ?? it.alumno ?? ""),
            tickets_resueltos: Number(it.tickets_resueltos ?? 0) || 0,
            avg_seconds,
            avg_minutes,
            avg_hours,
            avg_time_hms: String(it.avg_time_hms ?? ""),
          };
        })
      : [],
    // allClientsByCoach: puede venir como grupos por coach o como lista plana (para coach seleccionado)
    allClientsByCoach: Array.isArray(d.allClientsByCoach) && (d.allClientsByCoach as any[])[0]?.students
      ? (d.allClientsByCoach as any[]).map((group) => ({
          coach: String(group.coach ?? group.nombre_coach ?? group.name ?? "Sin coach"),
          coach_code: group.coach_code ?? group.codigo_coach ?? group.code ?? null,
          students: Array.isArray(group.students)
            ? (group.students as any[]).map((it) => ({
                id: Number(it.id),
                codigo: it.codigo ?? null,
                nombre: String(it.nombre ?? ""),
                estado: it.estado ?? null,
                etapa: it.etapa ?? null,
                ingreso: it.ingreso ?? null,
                ultima_actividad: it.ultima_actividad ?? null,
                inactividad: (it.dias_inactividad ?? it.inactividad) ?? null,
                tickets: it.tickets ?? null,
                area: it.area ?? null,
                puesto: it.puesto ?? null,
                contrato: it.contrato ?? null,
                entregables: it.entregables ?? null,
                aprobaciones: it.aprobaciones ?? null,
                nicho: it.nicho ?? null,
                paso_f1: it.paso_f1 ?? null,
                paso_f2: it.paso_f2 ?? null,
                paso_f3: it.paso_f3 ?? null,
                paso_f4: it.paso_f4 ?? null,
                paso_f5: it.paso_f5 ?? null,
              }))
            : [],
        }))
      : [],
    allClientsByCoachFlat: Array.isArray(d.allClientsByCoach) && !(d.allClientsByCoach as any[])[0]?.students
      ? (d.allClientsByCoach as any[]).map((it) => ({
          id: Number(it.id),
          codigo: it.codigo ?? null,
          nombre: String(it.nombre ?? ""),
          estado: it.estado ?? null,
          etapa: it.etapa ?? null,
          ingreso: it.ingreso ?? null,
          ultima_actividad: it.ultima_actividad ?? null,
          inactividad: (it.dias_inactividad ?? it.inactividad) ?? null,
          tickets: it.tickets ?? null,
          area: it.area ?? null,
          puesto: it.puesto ?? null,
          contrato: it.contrato ?? null,
          entregables: it.entregables ?? null,
          aprobaciones: it.aprobaciones ?? null,
          nicho: it.nicho ?? null,
          paso_f1: it.paso_f1 ?? null,
          paso_f2: it.paso_f2 ?? null,
          paso_f3: it.paso_f3 ?? null,
          paso_f4: it.paso_f4 ?? null,
          paso_f5: it.paso_f5 ?? null,
        }))
      : [],
    // Campos no provistos por v2: dejamos vacíos para no romper UI
    respByCoach: [] as any[],
    respByTeam: [] as any[],
    prodByCoach: [] as any[],
    prodByCoachV2: [] as any[],
    alumnosPorEquipo: [] as any[],
    areasCount: [] as any[],
    createdBlock: null,
    ticketsByTeam: [] as any[],
  };

  return { code: json?.code ?? 200, status: json?.status ?? "success", data: { teams } };
}
