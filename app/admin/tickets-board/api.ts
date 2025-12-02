// app/admin/tickets-board/api.ts
// API local para el tablero de tickets (usa apiFetch con Bearer)
import { apiFetch } from "@/lib/api-config";

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
  // nuevos campos devueltos por la API
  resuelto_por?: string | null;
  resuelto_por_nombre?: string | null;
  informante?: string | null;
  informante_nombre?: string | null;
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
  const url = `/ticket/get/ticket${q}`;
  const json = (await apiFetch<TicketBoardResponse>(url)) as TicketBoardResponse;
  let rows = Array.isArray(json?.data) ? json.data : [];

  // Ocultar tickets eliminados a nivel de API (no se devuelven al tablero)
  const isDeleted = (r: any): boolean => {
    try {
      const estado = String(r?.estado ?? r?.status ?? r?.estatus ?? "").toUpperCase();
      if (/(ELIMINAD|BORRADO|DELETED)/.test(estado)) return true;
      if (r?.eliminado === true || r?.deleted === true) return true;
      if (r?.deleted_at || r?.eliminado_at) return true;
      if (typeof r?.activo !== "undefined" && r?.activo === false) return true;
    } catch {}
    return false;
  };
  rows = rows.filter((r) => !isDeleted(r));

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
      resuelto_por: r.resuelto_por ?? null,
      resuelto_por_nombre: r.resuelto_por_nombre ?? null,
      informante: r.informante ?? null,
      informante_nombre: r.informante_nombre ?? null,
  }));

  return {
    items,
    total: json.total ?? items.length,
    page: json.page ?? 1,
    pageSize: json.pageSize ?? items.length,
    totalPages: json.totalPages ?? 1,
  } as const;
}

  // Reasignar ticket a un coach/equipo
  // PUT /v1/ticket/reassign/ticket/:idticket
  // Body: { "codigo_equipo": "equipo" }
  export async function reassignTicket(
    ticketId: string,
    codigoEquipo: string
  ) {
    if (!ticketId) throw new Error("ticketId requerido");
    if (!codigoEquipo) throw new Error("codigoEquipo requerido");
    const path = `/ticket/reassign/ticket/${encodeURIComponent(ticketId)}`;
    return apiFetch<any>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo_equipo: codigoEquipo }),
    });
  }

  // --- Comentarios / Observaciones ---

  export type TicketComment = {
    id: number;
    ticket_id: string;
    contenido: string;
    created_at: string;
    updated_at?: string;
    created_by?: string;
    created_by_name?: string;
  };

  export async function getTicketComments(ticketCode: string) {
    if (!ticketCode) return [];
    const path = `/tickets/get/public-comments/${encodeURIComponent(ticketCode)}`;
    const res = await apiFetch<any>(path);
    // Asumimos que devuelve { data: [...] } o directamente [...]
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list as TicketComment[];
  }

  export async function createTicketComment(ticketCode: string, contenido: string) {
    if (!ticketCode) throw new Error("Código de ticket requerido");
    if (!contenido) throw new Error("Contenido requerido");
    const path = `/tickets/create/public-comment/${encodeURIComponent(ticketCode)}`;
    return apiFetch<any>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    });
  }

  export async function updateTicketComment(commentId: number | string, contenido: string) {
    if (!commentId) throw new Error("ID de comentario requerido");
    const path = `/ticket/update/comment/${encodeURIComponent(commentId)}`;
    return apiFetch<any>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    });
  }

  export async function deleteTicketComment(commentId: number | string) {
    if (!commentId) throw new Error("ID de comentario requerido");
    const path = `/tickets/delete/public-comment/${encodeURIComponent(commentId)}`;
    return apiFetch<any>(path, {
      method: "DELETE",
    });
  }

  // --- Notas Internas (Internal Notes) ---

  export type InternalNote = {
    id: string;
    ticket_id: string;
    user_codigo?: string;
    user_nombre?: string;
    contenido: string;
    created_at: string;
    updated_at?: string;
  };

  export async function getInternalNotes(ticketCode: string) {
    if (!ticketCode) return [];
    const path = `/ticket/get/comments/${encodeURIComponent(ticketCode)}`;
    const res = await apiFetch<any>(path);
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list as InternalNote[];
  }

  export async function createInternalNote(ticketCode: string, contenido: string) {
    if (!ticketCode) throw new Error("Código de ticket requerido");
    if (!contenido) throw new Error("Contenido requerido");
    const path = `/ticket/create/comment/${encodeURIComponent(ticketCode)}`;
    return apiFetch<any>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    });
  }

  export async function updateInternalNote(noteId: number | string, contenido: string) {
    if (!noteId) throw new Error("ID de nota requerido");
    const path = `/ticket/update/comment/${encodeURIComponent(noteId)}`;
    return apiFetch<any>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    });
  }

  export async function deleteInternalNote(noteId: number | string) {
    if (!noteId) throw new Error("ID de nota requerido");
    // Asumimos delete estándar
    const path = `/ticket/delete/comment/${encodeURIComponent(noteId)}`;
    return apiFetch<any>(path, {
      method: "DELETE",
    });
  }
