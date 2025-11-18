"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type Ticket, type Team } from "@/lib/data-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { updateTicket } from "@/app/admin/alumnos/api";
import { buildUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { Search, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Charts } from "./charts";
import KPIs from "./kpis";
import TeamsTable from "./teams-table";
import { computeTicketMetrics, type TicketsMetrics } from "./metrics";

/* ---------------------------------------
  UI helpers lightweight (sin shadcn)
--------------------------------------- */
function Badge({
  children,
  color = "default",
}: {
  children: React.ReactNode;
  color?: "default" | "green" | "amber" | "red" | "blue";
}) {
  const map: Record<string, string> = {
    default: "bg-gray-100 text-gray-800 border-gray-200",
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    red: "bg-rose-100 text-rose-800 border-rose-200",
    blue: "bg-sky-100 text-sky-800 border-sky-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[color]}`}
    >
      {children}
    </span>
  );
}
function Card({ children, className = "" }: any) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-none ${className}`}
    >
      {children}
    </div>
  );
}
function CardBody({ children, className = "" }: any) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
function CardHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b px-5 py-4">
      <div className="flex items-center gap-3">
        {icon ? <div className="rounded-lg bg-gray-100 p-2">{icon}</div> : null}
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}
function Input({ value, onChange, placeholder, leftIcon, type = "text" }: any) {
  return (
    <div className="relative">
      {leftIcon && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {leftIcon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-sky-100 ${
          leftIcon ? "pl-9" : ""
        }`}
      />
    </div>
  );
}
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-violet-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  className = "",
}: any) {
  const variants: Record<string, string> = {
    default: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-200",
    outline:
      "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-100",
    ghost: "text-gray-700 hover:bg-gray-100",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 ${variants[variant]} ${sizes[size]} focus:outline-none focus:ring-4 transition ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------
  Utils
--------------------------------------- */
const PAGE_SIZE_UI = 25;

const fmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
function fmtDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return fmt.format(d);
}
/** Devuelve YYYY-MM-DD en hora local (para <input type="date" />) */
function todayYMDLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
/** Primer día del mes actual en YYYY-MM-DD (hora local) */
function firstDayOfMonthYMDLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/* ---------------------------------------
  TicketsContent (paginación local)
--------------------------------------- */
export default function TicketsContent() {
  // Datos
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [tipo, setTipo] = useState<string>("all");
  // Por defecto: desde el primer día del mes actual hasta hoy
  const [fechaDesde, setFechaDesde] = useState<string>(
    firstDayOfMonthYMDLocal()
  );
  const [fechaHasta, setFechaHasta] = useState<string>(todayYMDLocal());

  // Paginación UI
  const [page, setPage] = useState(1);

  // Modal de ticket para ver/editar descripción
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  // Carga del backend (hasta 10k)
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [tms, tks] = await Promise.all([
          dataService.getTeams({
            page: 1,
            pageSize: 500,
            search: "",
            fechaDesde: "",
            fechaHasta: "",
          }),
          dataService.getTickets({ search, fechaDesde, fechaHasta }),
        ]);
        setTeams(tms.data ?? []);
        setAllTickets(tks.items ?? []);
        setPage(1);
      } catch (e) {
        console.error(e);
        setTeams([]);
        setAllTickets([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, fechaDesde, fechaHasta]);

  // Filtros cliente
  const filtered: Ticket[] = useMemo(() => {
    const base = allTickets ?? [];
    let items = base;

    if (estado !== "all") {
      const e = estado.toLowerCase();
      items = items.filter((i) => (i.estado ?? "").toLowerCase() === e);
    }
    if (tipo !== "all") {
      const tp = tipo.toLowerCase();
      items = items.filter((i) => (i.tipo ?? "").toLowerCase() === tp);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) =>
        [
          i.nombre ?? "",
          i.alumno_nombre ?? "",
          i.id_externo ?? "",
          i.tipo ?? "",
          i.estado ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return items;
  }, [allTickets, estado, tipo, search]);

  // Opciones dinámicas
  const estadoOpts = useMemo(() => {
    const set = new Set<string>();
    (allTickets ?? []).forEach((t) =>
      set.add((t.estado ?? "SIN ESTADO").toLowerCase())
    );
    return ["all", ...Array.from(set)];
  }, [allTickets]);

  const tipoOpts = useMemo(() => {
    const set = new Set<string>();
    (allTickets ?? []).forEach((t) =>
      set.add((t.tipo ?? "SIN TIPO").toLowerCase())
    );
    return ["all", ...Array.from(set)];
  }, [allTickets]);

  // 📊 NUEVO: métricas completas
  const metrics: TicketsMetrics = useMemo(
    () => computeTicketMetrics(filtered ?? []),
    [filtered]
  );

  // Serie por día (para el area chart) — puedes seguir usando la de tu dataService
  const ticketsPorDia = useMemo(
    () => dataService.ticketsByDay(filtered ?? []),
    [filtered]
  );

  // Paginación local
  const total = (filtered ?? []).length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_UI));
  const pageItems = useMemo(() => {
    const arr = filtered ?? [];
    const start = (page - 1) * PAGE_SIZE_UI;
    return arr.slice(start, start + PAGE_SIZE_UI);
  }, [filtered, page]);

  // Cargar detalle del ticket cuando se abre el modal
  useEffect(() => {
    const codigo = selectedTicket?.id_externo ?? null;
    if (!ticketModalOpen || !codigo) {
      setTicketDetail(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setTicketLoading(true);
        const url = buildUrl(
          `/ticket/get/ticket/${encodeURIComponent(String(codigo))}`
        );
        const token = typeof window !== "undefined" ? getAuthToken() : null;
        const res = await fetch(url, {
          method: "GET",
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!alive) return;
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        setTicketDetail(json?.data ?? json ?? null);
      } catch (e) {
        if (!alive) return;
        setTicketDetail(null);
      } finally {
        if (alive) setTicketLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ticketModalOpen, selectedTicket?.id_externo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Hasta 10k resultados del backend · Paginación local (25 por página)
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader
          title="Filtros"
          icon={<Filter className="h-5 w-5" />}
          right={<Badge color="blue">{metrics.total} resultados</Badge>}
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <Input
                placeholder="Buscar por asunto o alumno..."
                value={search}
                onChange={(e: any) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                leftIcon={<Search className="h-4 w-4 text-gray-400" />}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                value={estado}
                onChange={(v) => {
                  setPage(1);
                  setEstado(v);
                }}
                options={estadoOpts.map((e) => ({
                  value: e,
                  label: e === "all" ? "Todos los estados" : e.toUpperCase(),
                }))}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                value={tipo}
                onChange={(v) => {
                  setPage(1);
                  setTipo(v);
                }}
                options={tipoOpts.map((t) => ({
                  value: t,
                  label: t === "all" ? "Todos los tipos" : t.toUpperCase(),
                }))}
              />
            </div>
            <div className="md:col-span-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-amber-100"
                  value={fechaDesde}
                  onChange={(e) => {
                    setPage(1);
                    setFechaDesde(e.target.value);
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Desde</p>
            </div>
            <div className="md:col-span-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-4 focus:ring-amber-100"
                  value={fechaHasta}
                  onChange={(e) => {
                    setPage(1);
                    setFechaHasta(e.target.value);
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Hasta</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* KPIs nuevas */}
      <KPIs metrics={metrics} loading={loading} />

      {/* Gráficas */}
      <Charts ticketsPorDia={ticketsPorDia} tickets={filtered} />

      {/* Tabla tickets (paginación local) */}
      <Card>
        <CardHeader
          title="Listado de tickets"
          subtitle="Vista filtrada y paginada localmente"
        />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-[1] bg-white">
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
                <th className="px-4 py-2">Asunto</th>
                <th className="px-4 py-2">Alumno</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Creación</th>
                <th className="px-4 py-2">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {(pageItems ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-b hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedTicket(t);
                    setDescEditing(false);
                    setTicketModalOpen(true);
                  }}
                >
                  <td className="px-4 py-2">{t.nombre ?? "-"}</td>
                  <td className="px-4 py-2">{t.alumno_nombre ?? "-"}</td>
                  <td className="px-4 py-2">
                    {(t.estado ?? "—").toUpperCase()}
                  </td>
                  <td className="px-4 py-2">{(t.tipo ?? "—").toUpperCase()}</td>
                  <td className="px-4 py-2">{fmtDateTime(t.creacion)}</td>
                  <td className="px-4 py-2">{fmtDateTime(t.deadline)}</td>
                </tr>
              ))}
              {!loading && (pageItems ?? []).length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500"
                    colSpan={6}
                  >
                    No hay tickets para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginación local */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p: number) => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-600 border-b-transparent" />
        </div>
      )}

      {/* Modal de Ticket: ver/editar descripción */}
      <Dialog
        open={ticketModalOpen}
        onOpenChange={(v) => {
          setTicketModalOpen(v);
          if (!v) {
            setSelectedTicket(null);
            setTicketDetail(null);
            setDescEditing(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTicket?.nombre ?? "Ticket"}
              {selectedTicket?.id_externo ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedTicket.id_externo})
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {!selectedTicket ? (
            <div className="text-sm text-muted-foreground">Sin selección</div>
          ) : ticketLoading ? (
            <div className="py-6 text-sm text-muted-foreground">
              Cargando detalle…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Alumno</div>
                    <div className="text-sm font-medium">
                      {selectedTicket.alumno_nombre ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Estado / Tipo
                    </div>
                    <div className="text-sm font-medium">
                      {(selectedTicket.estado ?? "—").toUpperCase()} ·{" "}
                      {(selectedTicket.tipo ?? "—").toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Descripción</div>
                  {!descEditing && (
                    <button
                      className="text-xs rounded-lg border px-3 py-1 hover:bg-gray-50"
                      onClick={() => {
                        setDescDraft(String(ticketDetail?.descripcion ?? ""));
                        setDescEditing(true);
                      }}
                    >
                      Editar
                    </button>
                  )}
                </div>
                {!descEditing ? (
                  <div className="whitespace-pre-wrap text-sm">
                    {String(ticketDetail?.descripcion ?? "—")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      rows={8}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      placeholder="Escribe la descripción del ticket…"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-xs rounded-lg px-3 py-1 hover:bg-gray-100"
                        onClick={() => {
                          setDescEditing(false);
                          setDescDraft("");
                        }}
                        disabled={savingDesc}
                      >
                        Cancelar
                      </button>
                      <button
                        className="text-xs rounded-lg bg-sky-600 px-3 py-1 text-white hover:bg-sky-700 disabled:opacity-60"
                        onClick={async () => {
                          if (!selectedTicket?.id_externo) return;
                          setSavingDesc(true);
                          try {
                            await updateTicket(
                              String(selectedTicket.id_externo),
                              { descripcion: (descDraft || "").trim() }
                            );
                            toast({ title: "Descripción actualizada" });
                            // recargar detalle
                            setTicketModalOpen(true); // mantener abierto
                            const url = buildUrl(
                              `/ticket/get/ticket/${encodeURIComponent(
                                String(selectedTicket.id_externo)
                              )}`
                            );
                            const token =
                              typeof window !== "undefined"
                                ? getAuthToken()
                                : null;
                            const res = await fetch(url, {
                              method: "GET",
                              cache: "no-store",
                              headers: token
                                ? { Authorization: `Bearer ${token}` }
                                : undefined,
                            });
                            const json = await res.json().catch(() => ({}));
                            setTicketDetail(json?.data ?? json ?? null);
                            setDescEditing(false);
                          } catch (e) {
                            console.error(e);
                            toast({ title: "Error al actualizar descripción" });
                          } finally {
                            setSavingDesc(false);
                          }
                        }}
                        disabled={savingDesc}
                      >
                        {savingDesc ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
