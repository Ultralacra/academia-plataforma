// app/admin/tickets-board/api.ts
// API local para el tablero de tickets (usa apiFetch con Bearer)
import { apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";

async function internalFetchJson<T = any>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(url, {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  const json = await res.json().catch(() => null);
  return json as T;
}

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
  alumno_coaches?: {
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
  plazo_info?: {
    horas_restantes: number;
    fue_respondido: boolean;
    fecha_primera_respuesta: string | null;
    estado_plazo: string;
  } | null;
  coaches_override?: Array<
    | string
    | {
        codigo_equipo?: string | null;
        nombre?: string | null;
        puesto?: string | null;
        area?: string | null;
      }
  > | null;
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
  studentCode?: string;
}) {
  // Ocultar tickets eliminados aunque el backend los devuelva
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

  if (opts.studentCode) {
    const url = `/client/get/tickets/${encodeURIComponent(opts.studentCode)}`;
    const json = await apiFetch<any>(url);
    let rows: any[] = Array.isArray(json?.data) ? json.data : [];
    rows = rows.filter((r) => !isDeleted(r));

    const items: TicketBoardItem[] = rows.map((r: any) => ({
      id: Number(r.id),
      codigo: r.codigo ?? null,
      nombre: r.nombre ?? null,
      id_alumno: r.id_alumno ?? null,
      alumno_nombre: r.alumno_nombre ?? null,
      created_at: r.creacion ?? r.created_at ?? r.createdAt,
      deadline: r.deadline ?? null,
      estado: r.estado ?? null,
      tipo: r.tipo ?? null,
      plazo: null,
      coaches: [],
      ultimo_estado: null,
      resuelto_por: null,
      resuelto_por_nombre: null,
      informante: null,
      informante_nombre: null,
      plazo_info: null,
      coaches_override: null,
    }));

    // Deduplicar por id para evitar keys duplicadas en React
    const seen = new Set<number>();
    const unique = items.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    return {
      items: unique,
      total: unique.length,
      page: 1,
      pageSize: unique.length,
      totalPages: 1,
    };
  }

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
    // Mapeo tolerante de coaches: acepta distintas claves y normaliza propiedades
    coaches: (() => {
      const raw = Array.isArray(r.coaches)
        ? r.coaches
        : Array.isArray((r as any)?.equipos)
        ? (r as any).equipos
        : Array.isArray((r as any)?.coaches_asignados)
        ? (r as any).coaches_asignados
        : [];
      return raw.map((c: any) => ({
        codigo_equipo:
          (c?.codigo_equipo ?? c?.codigo ?? c?.id ?? c?.id_equipo ?? null) &&
          String(c?.codigo_equipo ?? c?.codigo ?? c?.id ?? c?.id_equipo).trim(),
        nombre: (c?.nombre ?? null) && String(c?.nombre).trim(),
        puesto: (c?.puesto ?? c?.rol ?? null) && String(c?.puesto ?? c?.rol).trim(),
        area:
          (c?.area ?? c?.departamento ?? null) &&
          String(c?.area ?? c?.departamento).trim(),
      }));
    })(),
    alumno_coaches: (() => {
      const raw = Array.isArray((r as any)?.alumno_coaches)
        ? (r as any).alumno_coaches
        : Array.isArray((r as any)?.coaches_alumno)
        ? (r as any).coaches_alumno
        : [];
      return raw.map((c: any) => ({
        codigo_equipo:
          (c?.codigo_equipo ?? c?.codigo ?? c?.id ?? c?.id_equipo ?? null) &&
          String(c?.codigo_equipo ?? c?.codigo ?? c?.id ?? c?.id_equipo).trim(),
        nombre: (c?.nombre ?? null) && String(c?.nombre).trim(),
        puesto: (c?.puesto ?? c?.rol ?? null) && String(c?.puesto ?? c?.rol).trim(),
        area:
          (c?.area ?? c?.departamento ?? null) &&
          String(c?.area ?? c?.departamento).trim(),
      }));
    })(),
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
      plazo_info: r.plazo_info ?? null,
      // Acepta variantes de clave para override; puede venir como array de ids o de objetos coach
      coaches_override: (() => {
        const raw =
          (r as any)?.coaches_override ??
          (r as any)?.coach_override ??
          (r as any)?.override_coaches ??
          (r as any)?.asignado_a ??
          [];
        if (!Array.isArray(raw)) {
          if (raw == null) return [];
          return [raw];
        }
        // Si los elementos son objetos, normalizarlos; si son strings/ids, trim
        return raw.map((x: any) => {
          if (x && typeof x === "object") {
            return {
              codigo_equipo:
                (x.codigo_equipo ?? x.codigo ?? x.id ?? null) &&
                String(x.codigo_equipo ?? x.codigo ?? x.id).trim(),
              nombre: x.nombre ?? null,
              puesto: x.puesto ?? x.rol ?? null,
              area: x.area ?? x.departamento ?? null,
            };
          }
          return String(x).trim();
        });
      })(),
  }));

  // Deduplicar por id para evitar keys duplicadas en React
  const seen = new Set<number>();
  const unique = items.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  return {
    items: unique,
    total: json.total ?? unique.length,
    page: json.page ?? 1,
    pageSize: json.pageSize ?? unique.length,
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
    id: string;
    ticket_id: string;
    user_codigo?: string;
    user_nombre?: string;
    contenido: string;
    created_at: string;
    updated_at?: string;
  };

  export async function getTicketComments(ticketCode: string) {
    if (!ticketCode) return [];
    const path = `/ticket/get/public-comments/${encodeURIComponent(ticketCode)}`;
    const res = await apiFetch<any>(path);
    // Asumimos que devuelve { data: [...] } o directamente [...]
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list as TicketComment[];
  }

  export async function createTicketComment(ticketCode: string, contenido: string) {
    if (!ticketCode) throw new Error("Código de ticket requerido");
    if (!contenido) throw new Error("Contenido requerido");
    const path = `/ticket/create/public-comment/${encodeURIComponent(ticketCode)}`;
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
    const path = `/ticket/delete/public-comment/${encodeURIComponent(commentId)}`;
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

  // --- Tareas (Links asociados al ticket) ---

  /**
   * Elimina un link/tarea por ID.
   * Endpoint: DELETE /v1/ticket/delete/link/:id
   */
  export async function deleteTicketLink(linkId: number | string) {
    if (!linkId) throw new Error("ID de link requerido");
    const path = `/ticket/delete/link/${encodeURIComponent(linkId)}`;
    return apiFetch<any>(path, {
      method: "DELETE",
    });
  }

  /**
   * Crea un link/tarea asociado a un ticket por código.
   * Endpoint sugerido: POST /v1/ticket/create/link/:ticketCode
   * Body: { url: string, title?: string }
   */
  export async function createTicketLink(
    ticketCode: string,
    payload: { url: string; title?: string }
  ) {
    if (!ticketCode) throw new Error("Código de ticket requerido");
    const path = `/ticket/create/link/${encodeURIComponent(ticketCode)}`;
    return apiFetch<any>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: payload.url, title: payload.title }),
    });
  }

  // --- Observaciones 2.3 (Metadata/Tareas) ---

  export type Observacion = {
    id: number;
    entity?: string | null;
    entity_id?: string | null;
    payload: {
      fecha: string;
      recomendacion: string;
      area: string;
      estado: boolean; // DEPRECATED: usar 'realizada' en su lugar
      realizada?: boolean; // Nueva propiedad para marcar como completada (NO elimina del modal)
      constancia: string; // JSON con {text?: string, files?: string[]}
      constancia_texto?: string; // Texto de notas
      creado_por_id: string;
      creado_por_nombre?: string;
      alumno_id: string;
      alumno_nombre?: string;
      ticket_codigo: string;
      deleted?: boolean; // SOLO para eliminar del modal (soft delete)
    };
    created_at: string;
  };

  /**
   * Obtiene las observaciones (metadata) de un ticket filtradas por alumno
   * Endpoint: GET /v1/metadata?ticket_codigo=:ticketCode&alumno_id=:alumnoId
   * NOTA: Solo filtra por 'deleted', las observaciones 'realizadas' se siguen mostrando
   */
  export async function getObservaciones(ticketCode: string, alumnoId?: string): Promise<Observacion[]> {
    if (!ticketCode) return [];
    // En UI de alumno, si no tenemos alumnoId, NO consultamos (evita traer demasiado)
    if (!alumnoId) return [];

    // Proxy interno: evita exponer /metadata real en Network.
    const json = await internalFetchJson<{ items: any[] }>(
      `/api/alumnos/${encodeURIComponent(
        String(alumnoId),
      )}/metadata?ticket_codigo=${encodeURIComponent(ticketCode)}`,
      { method: "GET" },
    );
    const list = Array.isArray(json?.items) ? json.items : [];
    
    // Filtrar SOLO las eliminadas con 'deleted: true'
    // Las observaciones con 'realizada: true' se siguen mostrando (en verde)
    return list.filter((obs: Observacion) => {
      // No mostrar las marcadas como deleted (eliminadas del modal)
      if (obs.payload?.deleted === true) return false;
      
      // Solo mostrar observaciones que tengan los campos necesarios para ser observaciones válidas
      // (esto filtra las que quedaron solo con estado por actualizaciones parciales del backend)
      if (!obs.payload?.recomendacion || !obs.payload?.area) return false;
      
      // Filtrar por alumno_id si está disponible
      if (alumnoId && obs.payload?.alumno_id !== alumnoId) return false;
      
      return true;
    }) as Observacion[];
  }

  /**
   * Crea una nueva observación (metadata)
   * Endpoint: POST /v1/metadata
   * Body: { fecha, recomendacion, area, estado, constancia, creado_por_id, alumno_id, ticket_codigo }
   */
  export async function createObservacion(payload: {
    fecha: string;
    recomendacion: string;
    area: string;
    estado: boolean;
    constancia: string;
    constancia_texto?: string;
    creado_por_id: string;
    alumno_id: string;
    ticket_codigo: string;
    ads_metadata_id?: string | number | null;
    ads_metadata_snapshot?: any;
  }) {
    return internalFetchJson<any>("/api/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        realizada: false, // Por defecto no está realizada
        deleted: false, // Por defecto no está eliminada
      }),
    });
  }

  /**
   * Actualiza una observación existente
   * Endpoint: PUT /v1/metadata/:id
   */
  export async function updateObservacion(
    id: number,
    payload: Partial<{
      fecha: string;
      recomendacion: string;
      area: string;
      estado: boolean;
      realizada?: boolean; // Nueva propiedad para marcar como completada
      constancia: string;
      constancia_texto?: string;
      creado_por_id?: string;
      creado_por_nombre?: string;
      alumno_id?: string;
      alumno_nombre?: string;
      ticket_codigo?: string;
      deleted?: boolean;
      ads_metadata_id?: string | number | null;
      ads_metadata_snapshot?: any;
    }>
  ) {
    if (!id) throw new Error("ID de observación requerido");
    return internalFetchJson<any>(
      `/api/metadata/${encodeURIComponent(String(id))}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          // Asegurarnos de que deleted sea false al actualizar (a menos que se especifique)
          deleted: payload.deleted !== undefined ? payload.deleted : false,
        }),
      },
    );
  }

  /**
   * Marca una observación como eliminada (soft delete)
   * Endpoint: PUT /v1/metadata/:id
   */
  export async function deleteObservacion(id: number) {
    if (!id) throw new Error("ID de observación requerido");
    return internalFetchJson<any>(
      `/api/metadata/${encodeURIComponent(String(id))}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: true }),
      },
    );
  }
