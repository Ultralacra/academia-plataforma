"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type Ticket, type Team } from "@/lib/data-service";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { Charts } from "./charts";
import KPIs from "./kpis";
import TeamsTable from "./teams-table";

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

function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative mx-4 w-full ${maxWidth} rounded-2xl border border-gray-200 bg-white shadow-none`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
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
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-violet-100"
    >
      {placeholder ? (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      ) : null}
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
  type = "button",
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
      type={type}
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

/* ---------------------------------------
   TicketsContent (paginación local)
--------------------------------------- */
export default function TicketsContent() {
  // Datos “completos” (hasta 10k desde el server)
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros cliente
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [tipo, setTipo] = useState<string>("all");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // Paginación UI local
  const [page, setPage] = useState(1);

  // Modal (si luego conectas con groupTicketsByTeam)
  const [openTeamModal, setOpenTeamModal] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);

  // Cargar (hasta 10k) cuando cambian filtros que van al servidor
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

  // Métricas
  const metrics = useMemo(() => {
    const total = (filtered ?? []).length;
    const pend = (filtered ?? []).filter(
      (t) => (t.estado ?? "").toLowerCase() === "pendiente"
    ).length;
    const prog = (filtered ?? []).filter(
      (t) => (t.estado ?? "").toLowerCase() === "en progreso"
    ).length;
    const res = (filtered ?? []).filter(
      (t) => (t.estado ?? "").toLowerCase() === "resuelto"
    ).length;
    return { total, pend, prog, res };
  }, [filtered]);

  // Chart data (tickets por día) sobre filtrados
  const ticketsPorDia = useMemo(
    () => dataService.ticketsByDay(filtered ?? []),
    [filtered]
  );

  // paginación local segura
  const total = (filtered ?? []).length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_UI));
  const pageItems = useMemo(() => {
    const arr = filtered ?? [];
    const start = (page - 1) * PAGE_SIZE_UI;
    return arr.slice(start, start + PAGE_SIZE_UI);
  }, [filtered, page]);

  const openTeam = (id: number) => {
    setActiveTeamId(id);
    setOpenTeamModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header de página (Notion-like) */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Hasta 10k resultados del backend · Paginación local (25 por página)
        </p>
      </div>

      {/* Filtros en “toolbar” */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-none">
        <CardHeader
          title="Filtros"
          icon={<Filter className="h-5 w-5" />}
          right={<Badge color="blue">{metrics.total} resultados</Badge>}
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <Input
                placeholder="Buscar por asunto, alumno, id externo..."
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

      {/* KPIs compactos (Notion vibes) */}
      <KPIs metrics={metrics} loading={loading} />

      {/* Gráficas */}
      <Charts ticketsPorDia={ticketsPorDia} tickets={filtered} />

      {/* Tabla tickets (paginación local) */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-none">
        <CardHeader
          title="Listado de tickets"
          subtitle="Vista filtrada y paginada localmente"
        />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-[1] bg-white">
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
                <th className="px-4 py-2">ID Externo</th>
                <th className="px-4 py-2">Asunto</th>
                <th className="px-4 py-2">Alumno</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Creación</th>
                <th className="px-4 py-2">Deadline</th>
                <th className="px-4 py-2 text-right"># URLs</th>
              </tr>
            </thead>
            <tbody>
              {(pageItems ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-b hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-2 font-mono text-xs">
                    {t.id_externo ?? "-"}
                  </td>
                  <td className="px-4 py-2">{t.nombre ?? "-"}</td>
                  <td className="px-4 py-2">{t.alumno_nombre ?? "-"}</td>
                  <td className="px-4 py-2">
                    {(() => {
                      const est = (t.estado ?? "").toUpperCase();
                      if (est === "RESUELTO")
                        return <Badge color="green">RESUELTO</Badge>;
                      if (est === "EN PROGRESO")
                        return <Badge color="blue">EN PROGRESO</Badge>;
                      if (est === "PENDIENTE")
                        return <Badge color="amber">PENDIENTE</Badge>;
                      return <Badge>{est || "SIN ESTADO"}</Badge>;
                    })()}
                  </td>
                  <td className="px-4 py-2">
                    <Badge>{(t.tipo ?? "SIN TIPO").toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-2">{fmtDateTime(t.creacion)}</td>
                  <td className="px-4 py-2">{fmtDateTime(t.deadline)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t.equipo_urls?.length ?? 0}
                  </td>
                </tr>
              ))}
              {!loading && (pageItems ?? []).length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500"
                    colSpan={8}
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

      {/* (Opcional) Modal de equipo si lo conectas con groupTicketsByTeam */}
      <Modal
        open={openTeamModal}
        onClose={() => setOpenTeamModal(false)}
        title="Equipo"
        maxWidth="max-w-3xl"
      >
        <div className="text-sm text-gray-500">
          Conecta aquí tu detalle por equipo si lo necesitas.
        </div>
      </Modal>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-600 border-b-transparent" />
        </div>
      )}
    </div>
  );
}
