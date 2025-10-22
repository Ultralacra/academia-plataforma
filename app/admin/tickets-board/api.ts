// app/admin/tickets-board/api.ts
// API local para el tablero de tickets (consulta directa al endpoint)

export type TicketBoardItem = {
  id: number;
  codigo?: string | null; // UUID para actualizar/archivos
  nombre?: string | null;
  id_alumno?: string | null;
  alumno_nombre?: string | null;
  created_at?: string | null;
  deadline?: string | null;
  estado?: string | null;
  tipo?: string | null;
  plazo?: string | null;
  coaches: {
    codigo_equipo?: string | null;
    nombre?: string | null;
    puesto?: string | null;
    area?: string | null;
  }[];
  ultimo_estado?: {
    estatus?: string | null;
    fecha?: string | null;
  } | null;
};

export type TicketBoardResponse = {
  code: number;
  status: string;
  data: any[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

function toQuery(params: Record<string, any>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (s.length === 0) return;
    qs.set(k, s);
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export async function getTickets(opts: {
  page?: number;
  pageSize?: number;
  search?: string; // si el backend lo soporta
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  tipo?: string;
  coach?: string; // código/id de coach para filtrar por equipo
}) {
  const q = toQuery({
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 500,
    search: opts.search ?? "",
    fechaDesde: opts.fechaDesde ?? "",
    fechaHasta: opts.fechaHasta ?? "",
    estado: opts.estado ?? "",
    tipo: opts.tipo ?? "",
    coach: opts.coach ?? "",
  });
  const url = `https://v001.vercel.app/v1/ticket/get/ticket${q}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status} on ${url}`);
  }
  const json = (await res.json()) as TicketBoardResponse;
  const rows = Array.isArray(json?.data) ? json.data : [];

  const items: TicketBoardItem[] = rows.map((r: any) => ({
    id: Number(r.id),
    codigo: r.codigo ?? null,
    nombre: r.nombre ?? null,
    id_alumno: r.id_alumno ?? null,
    alumno_nombre: r.alumno_nombre ?? null,
    created_at: r.created_at ?? r.creacion ?? null,
    deadline: r.deadline ?? null,
    estado: r.estado ?? null,
    tipo: r.tipo ?? null,
    plazo: r.plazo ?? null,
    coaches: Array.isArray(r.coaches)
      ? r.coaches.map((c: any) => ({
          codigo_equipo: c.codigo_equipo ?? null,
          nombre: c.nombre ?? null,
          puesto: c.puesto ?? null,
          area: c.area ?? null,
        }))
      : [],
    ultimo_estado: r.ultimo_estado
      ? {
          estatus: r.ultimo_estado.estatus ?? r.ultimo_estado.estado ?? null,
          fecha: r.ultimo_estado.fecha ?? r.ultimo_estado.created_at ?? null,
        }
      : null,
  }));

  return {
    items,
    total: json.total ?? items.length,
    page: json.page ?? 1,
    pageSize: json.pageSize ?? items.length,
    totalPages: json.totalPages ?? 1,
  } as const;
}
