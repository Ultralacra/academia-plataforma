"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import {
  type InternalNote,
  getInternalNotes,
  getTickets,
  type TicketBoardItem,
  getNoteEtiquetasMeta,
  type NoteEtiquetaEntry,
} from "../api";
import {
  getEtiquetasTickets,
  type EtiquetaTicket,
} from "@/app/admin/opciones/api";
import {
  Calendar,
  ExternalLink,
  Filter,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Tag,
  User,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";

function formatDate(date?: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function normalizeText(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function statusLabel(raw?: string | null) {
  const value = String(raw ?? "").trim();
  if (!value) return "Sin estado";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ticketTitle(ticket: TicketBoardItem) {
  const fromName = String(ticket.nombre ?? "").trim();
  if (fromName) return fromName;
  return "Ticket sin título";
}

function buildDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function InternalNotesViewContent() {
  const [tickets, setTickets] = useState<TicketBoardItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedTicketCode, setSelectedTicketCode] = useState("");

  // Etiquetas
  const [etiquetasCatalog, setEtiquetasCatalog] = useState<EtiquetaTicket[]>(
    [],
  );
  const [noteEtiquetasMap, setNoteEtiquetasMap] = useState<
    Map<string, NoteEtiquetaEntry>
  >(new Map());
  const [etiquetaFiltro, setEtiquetaFiltro] = useState<string>("");

  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const notesCacheRef = useRef<Record<string, InternalNote[]>>({});
  const etiquetasMapCacheRef = useRef<
    Record<string, Map<string, NoteEtiquetaEntry>>
  >({});

  // Rango de fechas — por defecto últimos 30 días
  const todayStr = buildDateStr(new Date());
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = buildDateStr(thirtyDaysAgo);

  const [fechaDesde, setFechaDesde] = useState(thirtyDaysAgoStr);
  const [fechaHasta, setFechaHasta] = useState(todayStr);
  // Versión «aplicada» que dispara la carga efectiva
  const [appliedDesde, setAppliedDesde] = useState(thirtyDaysAgoStr);
  const [appliedHasta, setAppliedHasta] = useState(todayStr);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketsError(null);
    notesCacheRef.current = {}; // limpiar caché al cambiar rango
    etiquetasMapCacheRef.current = {};
    try {
      const res = await getTickets({
        page: 1,
        pageSize: 350,
        fechaDesde: appliedDesde,
        fechaHasta: appliedHasta,
      });
      const ticketRows = (res.items ?? [])
        .filter((ticket) => String(ticket.codigo ?? "").trim().length > 0)
        .sort((a, b) => {
          const aDate = new Date(a.created_at ?? 0).getTime();
          const bDate = new Date(b.created_at ?? 0).getTime();
          return bDate - aDate;
        });

      const checks = await Promise.all(
        ticketRows.map(async (ticket) => {
          const code = String(ticket.codigo ?? "").trim();
          if (!code) return { ticket, code, notes: [] as InternalNote[] };
          try {
            const internal = await getInternalNotes(code);
            return {
              ticket,
              code,
              notes: Array.isArray(internal)
                ? internal
                : ([] as InternalNote[]),
            };
          } catch {
            return { ticket, code, notes: [] as InternalNote[] };
          }
        }),
      );

      const cache: Record<string, InternalNote[]> = {};
      checks.forEach(({ code, notes }) => {
        if (code) cache[code] = notes;
      });
      notesCacheRef.current = cache;

      const rows = checks
        .filter(({ notes }) => notes.length > 0)
        .map(({ ticket }) => ticket);

      setTickets(rows);
      setSelectedTicketCode((prev) => {
        if (prev && rows.some((ticket) => String(ticket.codigo) === prev)) {
          return prev;
        }
        return String(rows[0]?.codigo ?? "");
      });
    } catch (e: any) {
      setTicketsError(e?.message || "No se pudieron cargar los tickets.");
    } finally {
      setTicketsLoading(false);
    }
  }, [appliedDesde, appliedHasta]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  // Cargar catálogo de etiquetas una sola vez
  useEffect(() => {
    (async () => {
      try {
        const res = await getEtiquetasTickets(1, 200);
        setEtiquetasCatalog(Array.isArray(res?.data) ? res.data : []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!selectedTicketCode) {
      setNotes([]);
      setNoteEtiquetasMap(new Map());
      return;
    }

    // Limpiar map inmediatamente para no mostrar chips del ticket anterior
    setNoteEtiquetasMap(new Map());

    let isCancelled = false;

    const loadNotes = async () => {
      const cachedNotes = notesCacheRef.current[selectedTicketCode];
      let sorted: InternalNote[];

      if (cachedNotes) {
        sorted = [...cachedNotes].sort((a, b) => {
          const aDate = new Date(a.created_at ?? 0).getTime();
          const bDate = new Date(b.created_at ?? 0).getTime();
          return bDate - aDate;
        });
        if (!isCancelled) {
          setNotes(sorted);
          setNotesLoading(false);
        }
      } else {
        setNotesLoading(true);
        try {
          const internal = await getInternalNotes(selectedTicketCode);
          if (isCancelled) return;
          notesCacheRef.current[selectedTicketCode] = internal;
          sorted = [...internal].sort((a, b) => {
            const aDate = new Date(a.created_at ?? 0).getTime();
            const bDate = new Date(b.created_at ?? 0).getTime();
            return bDate - aDate;
          });
          setNotes(sorted);
        } catch {
          if (!isCancelled) setNotes([]);
          setNotesLoading(false);
          return;
        } finally {
          if (!isCancelled) setNotesLoading(false);
        }
      }

      // Cargar mapa de etiquetas (con caché)
      const cachedMap = etiquetasMapCacheRef.current[selectedTicketCode];
      if (cachedMap) {
        if (!isCancelled) setNoteEtiquetasMap(cachedMap);
        return;
      }
      const ids = sorted!.map((n) => String(n.id)).filter(Boolean);
      if (!ids.length) return;
      try {
        const etMap = await getNoteEtiquetasMeta(ids);
        if (!isCancelled) {
          etiquetasMapCacheRef.current[selectedTicketCode] = etMap;
          setNoteEtiquetasMap(etMap);
        }
      } catch {}
    };

    void loadNotes();

    return () => {
      isCancelled = true;
    };
  }, [selectedTicketCode]);

  const filteredTickets = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return tickets;

    return tickets.filter((ticket) => {
      const haystack = [
        ticket.codigo,
        ticket.nombre,
        ticket.alumno_nombre,
        ticket.id_alumno,
        ticket.estado,
        ticket.tipo,
      ]
        .map((value) => normalizeText(value))
        .join(" ");
      return haystack.includes(q);
    });
  }, [search, tickets]);

  // Notas filtradas por etiqueta seleccionada
  const filteredNotes = useMemo(() => {
    if (!etiquetaFiltro) return notes;
    return notes.filter((note) => {
      const entry = noteEtiquetasMap.get(String(note.id));
      return entry?.etiqueta_codigos?.includes(etiquetaFiltro) ?? false;
    });
  }, [notes, noteEtiquetasMap, etiquetaFiltro]);

  const selectedTicket = useMemo(() => {
    return tickets.find(
      (ticket) => String(ticket.codigo ?? "") === selectedTicketCode,
    );
  }, [selectedTicketCode, tickets]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notas internas de tickets
          </h1>
          <p className="text-sm text-muted-foreground">
            Vista detallada y privada de notas internas por ticket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void loadTickets()}
            disabled={ticketsLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
          <Link href="/admin/tickets-board">
            <Button variant="secondary">Volver a Tickets</Button>
          </Link>
        </div>
      </div>

      {/* Filtro por fechas */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Filter className="h-4 w-4 text-slate-500 self-end mb-1 shrink-0" />
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-600">Desde</Label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-600">Hasta</Label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button
          onClick={() => {
            setAppliedDesde(fechaDesde);
            setAppliedHasta(fechaHasta);
          }}
          disabled={ticketsLoading || !fechaDesde || !fechaHasta}
          className="h-9"
        >
          <Search className="h-4 w-4 mr-2" />
          Aplicar
        </Button>
        <p className="self-end mb-1 text-xs text-slate-400">
          Solo se listan tickets que tienen al menos una nota interna en el
          rango seleccionado.
        </p>
      </div>

      {ticketsError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {ticketsError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tickets</CardTitle>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Buscar por código, alumno o estado"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4 mr-2" />
                Cargando tickets con notas internas...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay tickets con notas internas que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-2 max-h-[66vh] overflow-y-auto pr-1">
                {filteredTickets.map((ticket) => {
                  const code = String(ticket.codigo ?? "");
                  const isSelected = code === selectedTicketCode;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedTicketCode(code)}
                      className={[
                        "w-full rounded-md border p-3 text-left transition",
                        isSelected
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium">
                          {ticketTitle(ticket)}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {statusLabel(ticket.estado)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 space-y-1">
                        <p>Código: {code}</p>
                        <p>Alumno: {ticket.alumno_nombre || "-"}</p>
                        <p>Creado: {formatDate(ticket.created_at)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                  <Lock className="h-4 w-4" />
                  Notas internas (Privado)
                </CardTitle>
                {selectedTicket ? (
                  <p className="mt-1 text-xs text-amber-700">
                    {ticketTitle(selectedTicket)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-700">
                    No hay tickets con notas internas para mostrar.
                  </p>
                )}
              </div>

              {selectedTicketCode ? (
                <Link
                  href={`/admin/tickets-board/${encodeURIComponent(selectedTicketCode)}`}
                  target="_blank"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir ticket
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!selectedTicketCode ? (
              <div className="rounded-md border border-dashed border-amber-300 bg-white/70 p-4 text-sm text-amber-800">
                Selecciona un ticket en la columna izquierda para ver su
                historial de notas internas.
              </div>
            ) : (
              <>
                {/* ── Filtro por etiqueta ─────────────────────── */}
                {etiquetasCatalog.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Filtrar:
                    </span>
                    {etiquetasCatalog.map((et) => {
                      const cod = String(et.codigo ?? "");
                      const active = etiquetaFiltro === cod;
                      return (
                        <button
                          key={cod}
                          type="button"
                          onClick={() =>
                            setEtiquetaFiltro((prev) =>
                              prev === cod ? "" : cod,
                            )
                          }
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium transition-opacity"
                          style={{
                            backgroundColor: active
                              ? `${et.color}33`
                              : `${et.color}11`,
                            color: et.color ?? undefined,
                            border: `1px solid ${
                              active ? et.color : `${et.color}55`
                            }`,
                            opacity: active ? 1 : 0.6,
                          }}
                        >
                          {et.nombre ?? cod}
                        </button>
                      );
                    })}
                    {etiquetaFiltro && (
                      <button
                        type="button"
                        onClick={() => setEtiquetaFiltro("")}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                      >
                        <X className="h-3 w-3" /> Quitar filtro
                      </button>
                    )}
                  </div>
                )}

                {/* ── Notas internas ─────────────────────────── */}
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Notas internas (
                  {filteredNotes.length}
                  {etiquetaFiltro ? ` de ${notes.length}` : ""})
                </p>

                {notesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Spinner className="h-4 w-4" />
                    Cargando notas internas...
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="rounded-md border border-dashed border-amber-300 bg-white/70 p-4 text-sm text-amber-800">
                    {etiquetaFiltro
                      ? "No hay notas con la etiqueta seleccionada."
                      : "Este ticket no tiene notas internas todavía."}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredNotes.map((note) => {
                      const entry = noteEtiquetasMap.get(String(note.id));
                      const noteCodigos = entry?.etiqueta_codigos ?? [];
                      return (
                        <article
                          key={note.id}
                          className="rounded-lg border border-amber-200 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {note.user_nombre || "Usuario"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(note.created_at)}
                            </span>
                          </div>
                          {/* Chips de etiquetas */}
                          {noteCodigos.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {noteCodigos.map((cod) => {
                                const et = etiquetasCatalog.find(
                                  (e) => e.codigo === cod,
                                );
                                if (!et) return null;
                                return (
                                  <span
                                    key={cod}
                                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                                    style={{
                                      backgroundColor: `${et.color}22`,
                                      color: et.color ?? undefined,
                                      border: `1px solid ${et.color}55`,
                                    }}
                                  >
                                    {et.nombre ?? cod}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                            {note.contenido || "-"}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5" />
        {selectedTicketCode
          ? `Mostrando ${filteredNotes.length} nota(s) del ticket ${selectedTicketCode}.`
          : "No hay tickets con notas internas disponibles."}
      </div>
    </div>
  );
}

export default function InternalNotesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "coach", "sales"]}>
      <DashboardLayout>
        <InternalNotesViewContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
