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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

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
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative mx-4 w-full ${maxWidth} rounded-2xl border bg-white shadow-2xl`}
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
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
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
        className={`w-full rounded-xl border bg-white/80 px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-sky-100 ${
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
      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-violet-100"
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
      "border bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-100",
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

  // Modal
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
        // getTickets ahora devuelve { items }
        setAllTickets(tks.items ?? []);
        setPage(1); // reset paginación UI
      } catch (e) {
        console.error(e);
        setTeams([]);
        setAllTickets([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, fechaDesde, fechaHasta]);

  // Filtros “solo cliente” sobre los 10k
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

  // Modal helpers (si usas el match por equipo)
  const openTeam = (id: number) => {
    setActiveTeamId(id);
    setOpenTeamModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Título + filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-gray-500">
            Consulta 10 000 del backend y paginación local (25 por página).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Filtros"
          icon={<Filter className="h-5 w-5" />}
          right={<Badge color="blue">{metrics.total} resultados</Badge>}
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
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
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:ring-4 focus:ring-amber-100"
                  value={fechaDesde}
                  onChange={(e) => {
                    setPage(1);
                    setFechaDesde(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:ring-4 focus:ring-amber-100"
                  value={fechaHasta}
                  onChange={(e) => {
                    setPage(1);
                    setFechaHasta(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-50 p-3">
              <Users className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-semibold">{metrics.total}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pendientes</p>
              <p className="text-xl font-semibold text-amber-600">
                {metrics.pend}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">En progreso</p>
              <p className="text-xl font-semibold text-indigo-600">
                {metrics.prog}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Resueltos</p>
              <p className="text-xl font-semibold text-emerald-600">
                {metrics.res}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Tickets por día"
            subtitle="Agrupado por fecha de creación"
          />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketsPorDia}>
                <defs>
                  <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop
                      offset="100%"
                      stopColor="#0284c7"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <RTooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0284c7"
                  fill="url(#gradSky)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Distribución por estado"
            subtitle="Acumulado en la vista filtrada"
          />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: "Estados",
                    PENDIENTE: (filtered ?? []).filter(
                      (t) => (t.estado ?? "").toUpperCase() === "PENDIENTE"
                    ).length,
                    "EN PROGRESO": (filtered ?? []).filter(
                      (t) => (t.estado ?? "").toUpperCase() === "EN PROGRESO"
                    ).length,
                    RESUELTO: (filtered ?? []).filter(
                      (t) => (t.estado ?? "").toUpperCase() === "RESUELTO"
                    ).length,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Legend />
                <RTooltip />
                <Bar dataKey="PENDIENTE" fill="#f59e0b" />
                <Bar dataKey="EN PROGRESO" fill="#6366f1" />
                <Bar dataKey="RESUELTO" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Tabla tickets (paginación local) */}
      <Card>
        <CardHeader
          title="Listado de tickets"
          subtitle="Vista filtrada y paginada localmente"
        />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <th className="px-4 py-2">ID Externo</th>
                <th className="px-4 py-2">Asunto</th>
                <th className="px-4 py-2">Alumno</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Creación</th>
                <th className="px-4 py-2">Deadline</th>
                <th className="px-4 py-2"># Equipo URLs</th>
              </tr>
            </thead>
            <tbody>
              {(pageItems ?? []).map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="px-4 py-2">{t.id_externo ?? "-"}</td>
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
                    <Badge color="default">
                      {(t.tipo ?? "SIN TIPO").toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{fmtDateTime(t.creacion)}</td>
                  <td className="px-4 py-2">{fmtDateTime(t.deadline)}</td>
                  <td className="px-4 py-2">{t.equipo_urls?.length ?? 0}</td>
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
