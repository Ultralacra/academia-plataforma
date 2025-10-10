// teamsApi.ts
// Consulta de coachs para equipos (sin usar api-config ni data-service)

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
  const res = await fetch("https://v001.vercel.app/v1/team/get/team?page=1&pageSize=25");
  if (!res.ok) throw new Error("Error al consultar coachs");
  const json = await res.json();
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
};

export async function fetchStudentsByCoach(coachCode: string): Promise<RawClient[]> {
  if (!coachCode) return [];
  const url = `https://v001.vercel.app/v1/client/get/clients-coaches?coach=${encodeURIComponent(coachCode)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al consultar alumnos del coach");
  const json = await res.json();
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

export async function fetchAllStudents(): Promise<RawClient[]> {
  const res = await fetch("https://v001.vercel.app/v1/client/get/clients?page=1&pageSize=1000");
  if (!res.ok) throw new Error("Error al consultar todos los alumnos");
  const json = await res.json();
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
  const url = `https://v001.vercel.app/v1/metrics/get/metrics-v2${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al consultar métricas v2");
  const json = await res.json();

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
  // Derivar per a partir de los últimos 1/7/30 días
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
    ticketsByName: Array.isArray(d.ticketsByName) ? d.ticketsByName : [],
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
