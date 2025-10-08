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
export async function fetchMetrics(fechaDesde?: string, fechaHasta?: string) {
  const params = new URLSearchParams();
  if (fechaDesde) params.set("fechaDesde", fechaDesde);
  if (fechaHasta) params.set("fechaHasta", fechaHasta);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const url = `https://v001.vercel.app/v1/metrics/get/metrics${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al consultar métricas");
  const json = await res.json();
  return json; // devuelve { code,status,data }
}
