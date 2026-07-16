"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type Ticket, type Team } from "@/lib/data-service";
import type { ClientItem } from "@/lib/data-service";
import { getCoaches, type CoachItem } from "@/app/admin/teamsv2/api";
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
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  ChevronDown,
  FileSpreadsheet,
  Check,
  ChevronsUpDown,
  FileText,
  History,
  Pencil,
  Users,
  Paperclip,
  ExternalLink,
  Clock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Charts } from "./charts";
import KPIs from "./kpis";
import TeamsTable from "./teams-table";
import { computeTicketMetrics, type TicketsMetrics } from "./metrics";
import TicketsSummaryCard from "./tickets-summary-card";
import PersonalMetrics from "@/app/admin/teamsv2/PersonalMetrics";
import { exportTicketsDashboardExcel } from "./export-tickets-dashboard";
import TicketsByPhase from "./tickets-by-phase";
import TicketsResolutionMetrics from "./tickets-resolution-metrics";
import TicketsStatusDuration from "./tickets-status-duration";
import TicketsSLAHorarioMetrics from "./tickets-sla-horario-metrics";
import StudentTicketsAvg from "./student-tickets-avg";

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
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/70 px-3 pr-9 text-sm outline-none transition hover:bg-white focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function areaChipClass(area?: string | null) {
  const key = normText(area);
  if (key.includes("copy")) {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  }
  if (key.includes("tecnico") || key.includes("tecnico")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (key.includes("ads")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (key.includes("atencion") || key.includes("cliente")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusBadgeClass(status?: string | null) {
  const key = normText(status);
  if (key.includes("resuelto")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (key.includes("progreso") || key.includes("proceso")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (key.includes("envio")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (key.includes("paus")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (key.includes("pend")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function FancySelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 px-3 text-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100">
          <span className="truncate text-left">
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{option.label}</span>
                  <Check
                    className={`h-4 w-4 ${
                      option.value === value ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FancyMultiSelect({
  values,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  allValue = "all",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  allValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const isAll =
    values.length === 0 || (values.length === 1 && values[0] === allValue);
  const selectedLabels = options
    .filter((o) => o.value !== allValue && values.includes(o.value))
    .map((o) => o.label);

  const displayText = isAll
    ? placeholder
    : selectedLabels.length <= 2
      ? selectedLabels.join(", ")
      : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  function toggle(val: string) {
    if (val === allValue) {
      onChange([allValue]);
      return;
    }
    const current = values.filter((v) => v !== allValue);
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange(next.length === 0 ? [allValue] : next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 px-3 text-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100">
          <span className="truncate text-left">{displayText}</span>
          <div className="flex items-center gap-1.5">
            {!isAll && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-100 px-1.5 text-[11px] font-semibold text-violet-700">
                {selectedLabels.length}
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const checked =
                  option.value === allValue
                    ? isAll
                    : values.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => toggle(option.value)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{option.label}</span>
                    <Check
                      className={`h-4 w-4 ${checked ? "opacity-100" : "opacity-0"}`}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CoachMultiSelect({
  values,
  onChange,
  coaches,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  coaches: CoachItem[];
}) {
  const [open, setOpen] = useState(false);
  const isAll =
    values.length === 0 || (values.length === 1 && values[0] === "all");
  const selectedCoaches = coaches.filter((c) => values.includes(c.codigo));
  const grouped = coaches.reduce<Record<string, CoachItem[]>>((acc, coach) => {
    const area = String(coach.area || coach.puesto || "Sin area").trim();
    if (!acc[area]) acc[area] = [];
    acc[area].push(coach);
    return acc;
  }, {});

  const sortedAreas = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );

  const displayText = isAll
    ? "Todos los coaches"
    : selectedCoaches.length <= 2
      ? selectedCoaches.map((c) => c.nombre).join(", ")
      : `${selectedCoaches
          .slice(0, 2)
          .map((c) => c.nombre)
          .join(", ")} +${selectedCoaches.length - 2}`;

  function toggle(codigo: string) {
    if (codigo === "all") {
      onChange(["all"]);
      return;
    }
    const current = values.filter((v) => v !== "all");
    const next = current.includes(codigo)
      ? current.filter((v) => v !== codigo)
      : [...current, codigo];
    onChange(next.length === 0 ? ["all"] : next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-r from-white to-slate-50 px-3 text-sm transition hover:border-sky-200 hover:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100">
          <div className="flex min-w-0 items-center gap-2">
            {!isAll &&
            selectedCoaches.length === 1 &&
            selectedCoaches[0]?.area ? (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${areaChipClass(
                  selectedCoaches[0].area,
                )}`}
              >
                {selectedCoaches[0].area}
              </span>
            ) : null}
            <span className="truncate text-left">{displayText}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isAll && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-100 px-1.5 text-[11px] font-semibold text-sky-700">
                {selectedCoaches.length}
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[420px] max-w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar coach o area..." />
          <CommandList>
            <CommandEmpty>No se encontraron coaches.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Todos los coaches"
                onSelect={() => toggle("all")}
                className="flex items-center justify-between gap-2"
              >
                <span>Todos los coaches</span>
                <Check
                  className={`h-4 w-4 ${isAll ? "opacity-100" : "opacity-0"}`}
                />
              </CommandItem>
            </CommandGroup>
            {sortedAreas.map((area) => (
              <CommandGroup key={area} heading={area}>
                {grouped[area]
                  .slice()
                  .sort((a, b) =>
                    String(a.nombre || "").localeCompare(
                      String(b.nombre || ""),
                      "es",
                      {
                        sensitivity: "base",
                      },
                    ),
                  )
                  .map((coach) => (
                    <CommandItem
                      key={coach.codigo}
                      value={`${coach.nombre} ${coach.puesto || ""} ${coach.area || ""} ${coach.codigo}`}
                      onSelect={() => toggle(coach.codigo)}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${areaChipClass(
                            coach.area || area,
                          )}`}
                        >
                          {coach.area || area}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {coach.nombre}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {coach.puesto || "Coach"}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={`h-4 w-4 ${
                          values.includes(coach.codigo)
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  className = "",
  disabled = false,
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
      disabled={disabled}
      className={`inline-flex items-center gap-2 ${variants[variant]} ${sizes[size]} focus:outline-none focus:ring-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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

function stampNow() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

function normText(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
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
export default function TicketsContent({
  preFilter,
  title = "Tickets",
}: {
  preFilter?: (t: Ticket) => boolean;
  title?: string;
} = {}) {
  // Datos
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  // Alumnos para mapear ticket -> etapa (se usa en TicketsByPhase)
  const [students, setStudents] = useState<ClientItem[]>([]);

  // Filtros
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [tipo, setTipo] = useState<string[]>(["all"]);
  const [coachFiltro, setCoachFiltro] = useState<string[]>(["all"]);
  const [informanteFiltro, setInformanteFiltro] = useState<string[]>(["all"]);
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  // Por defecto: desde el primer día del mes actual hasta hoy
  const [fechaDesde, setFechaDesde] = useState<string>(
    firstDayOfMonthYMDLocal(),
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
  const [exportingFormat, setExportingFormat] = useState<"xlsx" | null>(null);

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
        // Filtrar tickets eliminados (misma lógica que tickets-board)
        const raw = tks.items ?? [];
        const active = raw.filter((r: any) => {
          try {
            const estado = String(r?.estado ?? r?.status ?? r?.estatus ?? "").toUpperCase();
            if (/(ELIMINAD|BORRADO|DELETED)/.test(estado)) return false;
            if (r?.eliminado === true || r?.deleted === true) return false;
            if (r?.deleted_at || r?.eliminado_at) return false;
            if (typeof r?.activo !== "undefined" && r?.activo === false) return false;
          } catch {}
          return true;
        });
        setAllTickets(active);
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

  // Cargar lista de coaches
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getCoaches({ page: 1, pageSize: 10000 });
        if (mounted) setCoaches(list);
      } catch {
        if (mounted) setCoaches([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Cargar alumnos (una sola vez) para mapear ticket -> etapa
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await dataService.getClients({ pageSize: 1000 });
        if (mounted) setStudents(res.items ?? []);
      } catch (e) {
        console.error("[tickets] getClients error", e);
        if (mounted) setStudents([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Filtros cliente
  const isCoachAll =
    coachFiltro.length === 0 ||
    (coachFiltro.length === 1 && coachFiltro[0] === "all");
  const isTipoAll =
    tipo.length === 0 || (tipo.length === 1 && tipo[0] === "all");
  const isInfAll =
    informanteFiltro.length === 0 ||
    (informanteFiltro.length === 1 && informanteFiltro[0] === "all");

  const filtered: Ticket[] = useMemo(() => {
    const base = preFilter
      ? (allTickets ?? []).filter(preFilter)
      : (allTickets ?? []);
    let items = base;

    if (estado !== "all") {
      const e = estado.toLowerCase();
      items = items.filter((i) => (i.estado ?? "").toLowerCase() === e);
    }
    if (!isTipoAll) {
      const tipoSet = new Set(
        tipo.filter((t) => t !== "all").map((t) => t.toLowerCase()),
      );
      items = items.filter((i) => tipoSet.has((i.tipo ?? "").toLowerCase()));
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
          .includes(q),
      );
    }
    if (!isCoachAll) {
      const coachCodigos = new Set(coachFiltro.filter((v) => v !== "all"));
      const coachNames = new Set(
        coaches
          .filter((c) => coachCodigos.has(c.codigo))
          .map((c) => normText(c.nombre))
          .filter(Boolean),
      );
      items = items.filter((i) => {
        const coachesArr = Array.isArray(i.coaches) ? i.coaches : [];
        const hasCoachAssigned = coachesArr.some((c) =>
          coachCodigos.has(String(c.codigo_equipo ?? "").trim()),
        );

        if (hasCoachAssigned) return true;

        const infCode = String(i.informante ?? "").trim();
        const infName = normText(i.informante_nombre);
        const byInformanteCode = coachCodigos.has(infCode);
        const byInformanteName = coachNames.has(infName);

        return byInformanteCode || byInformanteName;
      });
    }

    if (!isInfAll) {
      const infValues = informanteFiltro.filter((v) => v !== "all");
      const infCodes = new Set(
        infValues.filter((v) => v.startsWith("code:")).map((v) => v.slice(5)),
      );
      const infNames = new Set(
        infValues.filter((v) => v.startsWith("name:")).map((v) => v.slice(5)),
      );
      items = items.filter((i) => {
        if (
          infCodes.size > 0 &&
          infCodes.has(String(i.informante ?? "").trim())
        )
          return true;
        if (infNames.size > 0 && infNames.has(normText(i.informante_nombre)))
          return true;
        if (infCodes.size > 0 || infNames.size > 0) {
          const coachesArr = Array.isArray(i.coaches) ? i.coaches : [];
          const hasCoachMatch = coachesArr.some((c) => {
            if (
              infCodes.size > 0 &&
              c.codigo_equipo &&
              infCodes.has(String(c.codigo_equipo).trim())
            )
              return true;
            if (
              infNames.size > 0 &&
              c.nombre &&
              infNames.has(normText(c.nombre))
            )
              return true;
            return false;
          });
          if (hasCoachMatch) return true;
        }
        return false;
      });
    }

    return items;
  }, [
    allTickets,
    preFilter,
    estado,
    tipo,
    isTipoAll,
    search,
    coachFiltro,
    isCoachAll,
    coaches,
    informanteFiltro,
    isInfAll,
  ]);

  // Opciones dinámicas
  const ticketsForOpts = useMemo(
    () =>
      preFilter ? (allTickets ?? []).filter(preFilter) : (allTickets ?? []),
    [allTickets, preFilter],
  );

  const estadoOpts = useMemo(() => {
    const set = new Set<string>();
    ticketsForOpts.forEach((t) =>
      set.add((t.estado ?? "SIN ESTADO").toLowerCase()),
    );
    return ["all", ...Array.from(set)];
  }, [ticketsForOpts]);

  const tipoOpts = useMemo(() => {
    const set = new Set<string>();
    ticketsForOpts.forEach((t) =>
      set.add((t.tipo ?? "SIN TIPO").toLowerCase()),
    );
    return ["all", ...Array.from(set)];
  }, [ticketsForOpts]);

  const informanteOpts = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    for (const t of ticketsForOpts) {
      const infCode = String(t.informante ?? "").trim();
      const infNameRaw = String(t.informante_nombre ?? "").trim();
      const infNameNorm = normText(infNameRaw);

      if (infCode) {
        const key = `code:${infCode}`;
        map.set(key, {
          value: key,
          label: infNameRaw || "Informante",
        });
        continue;
      }

      if (infNameNorm) {
        const key = `name:${infNameNorm}`;
        map.set(key, {
          value: key,
          label: infNameRaw,
        });
      }
    }

    return [
      { value: "all", label: "Todos los informantes" },
      ...Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
      ),
    ];
  }, [ticketsForOpts]);

  const selectedCoach = useMemo(
    () =>
      !isCoachAll && coachFiltro.length === 1
        ? (coaches.find((c) => c.codigo === coachFiltro[0]) ?? null)
        : null,
    [coaches, coachFiltro, isCoachAll],
  );

  // 📊 NUEVO: métricas completas
  const metrics: TicketsMetrics = useMemo(
    () => computeTicketMetrics(filtered ?? [], coaches),
    [filtered, coaches],
  );

  // Serie por día (para el area chart) — puedes seguir usando la de tu dataService
  const ticketsPorDia = useMemo(
    () => dataService.ticketsByDay(filtered ?? []),
    [filtered],
  );

  const exportEstadoRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered ?? []) {
      const key =
        String(t.estado ?? "SIN ESTADO")
          .toUpperCase()
          .trim() || "SIN ESTADO";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([estadoKey, cantidad]) => ({
        etiqueta: estadoKey,
        cantidad,
        porcentaje: metrics.total
          ? `${Math.round((cantidad / metrics.total) * 100)}%`
          : "0%",
      }));
  }, [filtered, metrics.total]);

  const exportTipoRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered ?? []) {
      const key =
        String(t.tipo ?? "SIN TIPO")
          .toUpperCase()
          .trim() || "SIN TIPO";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tipoKey, cantidad]) => ({
        etiqueta: tipoKey,
        cantidad,
        porcentaje: metrics.total
          ? `${Math.round((cantidad / metrics.total) * 100)}%`
          : "0%",
      }));
  }, [filtered, metrics.total]);

  const exportTopAlumnosRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered ?? []) {
      const key =
        String(t.alumno_nombre ?? "SIN ALUMNO").trim() || "SIN ALUMNO";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([etiqueta, cantidad]) => ({
        etiqueta,
        cantidad,
        porcentaje: metrics.total
          ? `${Math.round((cantidad / metrics.total) * 100)}%`
          : "0%",
      }));
  }, [filtered, metrics.total]);

  const exportTopInformantesRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered ?? []) {
      const key =
        String(
          t.informante_nombre ?? t.informante ?? "SIN INFORMANTE",
        ).trim() || "SIN INFORMANTE";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([etiqueta, cantidad]) => ({
        etiqueta,
        cantidad,
        porcentaje: metrics.total
          ? `${Math.round((cantidad / metrics.total) * 100)}%`
          : "0%",
      }));
  }, [filtered, metrics.total]);

  const exportDiaRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered ?? []) {
      const d = new Date(t.creacion);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, tickets]) => ({ fecha, tickets }));
  }, [filtered]);

  const exportConfigRows = useMemo(
    () => [
      { filtro: "Busqueda", valor: search || "(vacio)" },
      {
        filtro: "Estado",
        valor: estado === "all" ? "Todos" : estado.toUpperCase(),
      },
      {
        filtro: "Tipo",
        valor: isTipoAll
          ? "Todos"
          : tipo
              .filter((t) => t !== "all")
              .map((t) => t.toUpperCase())
              .join(", "),
      },
      {
        filtro: "Coach",
        valor: isCoachAll
          ? "Todos"
          : coachFiltro.filter((v) => v !== "all").join(", "),
      },
      {
        filtro: "Informante",
        valor: isInfAll
          ? "Todos"
          : informanteFiltro.filter((v) => v !== "all").join(", "),
      },
      { filtro: "Fecha desde", valor: fechaDesde || "-" },
      { filtro: "Fecha hasta", valor: fechaHasta || "-" },
      { filtro: "Generado", valor: new Date().toLocaleString("es-ES") },
      { filtro: "Total tickets en vista", valor: metrics.total },
    ],
    [
      search,
      estado,
      tipo,
      coachFiltro,
      informanteFiltro,
      fechaDesde,
      fechaHasta,
      metrics.total,
    ],
  );

  const exportSummaryRows = useMemo(
    () => [
      { metrica: "Total tickets", valor: metrics.total },
      { metrica: "Resueltos", valor: metrics.resueltos },
      { metrica: "En progreso", valor: metrics.enProgreso },
      { metrica: "Pendientes", valor: metrics.pendientes },
      { metrica: "Pendientes de envio", valor: metrics.pendientesDeEnvio },
      { metrica: "Pausados", valor: metrics.pausados },
      { metrica: "Tickets hoy", valor: metrics.today },
      { metrica: "Ultimos 7 dias", valor: metrics.last7 },
      { metrica: "Ultimos 30 dias", valor: metrics.last30 },
      {
        metrica: "Promedio por dia",
        valor: Number(metrics.avgPerDay || 0).toFixed(2),
      },
      {
        metrica: "Rango",
        valor:
          metrics.from && metrics.to
            ? `${metrics.from} a ${metrics.to} (${metrics.days} dias)`
            : "Sin rango",
      },
      {
        metrica: "Dia mas cargado",
        valor: metrics.busiestDay
          ? `${metrics.busiestDay.date} (${metrics.busiestDay.count})`
          : "Sin datos",
      },
      { metrica: "Dias sin tickets", valor: metrics.quietDays },
      {
        metrica: "Informantes con respuesta",
        valor: `${metrics.informanteRespondedCount} (${Math.round(
          metrics.informanteRespondedPct || 0,
        )}%)`,
      },
    ],
    [metrics],
  );

  const handleExportExcel = async () => {
    try {
      setExportingFormat("xlsx");
      await exportTicketsDashboardExcel({
        summaryRows: exportSummaryRows,
        estadoRows: exportEstadoRows,
        tipoRows: exportTipoRows,
        topAlumnosRows: exportTopAlumnosRows,
        topInformantesRows: exportTopInformantesRows,
        diaRows: exportDiaRows,
        filterRows: exportConfigRows,
        fileName: `tickets-dashboard-${stampNow()}.xlsx`,
      });
      toast({
        title: "Excel generado",
        description:
          "Se descargo el dashboard en una hoja con Top alumnos, Top informantes, estados y tipos acumulado.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "No se pudo generar el Excel",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setExportingFormat(null);
    }
  };

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
          `/ticket/get/ticket/${encodeURIComponent(String(codigo))}`,
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Hasta 10k resultados del backend · Paginación local (25 por página)
          </p>
          <div className="mt-3 flex flex-wrap gap-2" data-export-ignore="true">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading || exportingFormat !== null || total === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exportingFormat === "xlsx"
                ? "Generando Excel..."
                : "Descargar Excel"}
            </Button>
            {/*
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={loading || exportingFormat !== null || total === 0}
            >
              <FileText className="h-4 w-4" />
              {exportingFormat === "pdf" ? "Generando PDF..." : "Descargar PDF"}
            </Button>
            */}
          </div>
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
              <div className="md:col-span-4">
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
                <FancySelect
                  value={estado}
                  onChange={(v) => {
                    setPage(1);
                    setEstado(v);
                  }}
                  options={estadoOpts.map((e) => ({
                    value: e,
                    label: e === "all" ? "Todos los estados" : e.toUpperCase(),
                  }))}
                  placeholder="Todos los estados"
                  searchPlaceholder="Buscar estado..."
                  emptyLabel="No se encontraron estados"
                />
              </div>
              <div className="md:col-span-2">
                <FancyMultiSelect
                  values={tipo}
                  onChange={(v) => {
                    setPage(1);
                    setTipo(v);
                  }}
                  options={tipoOpts.map((t) => ({
                    value: t,
                    label: t === "all" ? "Todos los tipos" : t.toUpperCase(),
                  }))}
                  placeholder="Todos los tipos"
                  searchPlaceholder="Buscar tipo..."
                  emptyLabel="No se encontraron tipos"
                />
              </div>
              <div className="md:col-span-2">
                <CoachMultiSelect
                  values={coachFiltro}
                  onChange={(v) => {
                    setPage(1);
                    setCoachFiltro(v);
                  }}
                  coaches={coaches}
                />
              </div>
              <div className="md:col-span-2">
                <FancyMultiSelect
                  values={informanteFiltro}
                  onChange={(v) => {
                    setPage(1);
                    setInformanteFiltro(v);
                  }}
                  options={informanteOpts}
                  placeholder="Todos los informantes"
                  searchPlaceholder="Buscar informante..."
                  emptyLabel="No se encontraron informantes"
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

        {/* Métricas de resolución: general + por área */}
        <TicketsResolutionMetrics tickets={filtered} loading={loading} />

        {/* Tiempo en cada estado */}
        <TicketsStatusDuration
          tickets={filtered}
          loading={loading}
          onTicketClick={(t) => {
            setSelectedTicket(t);
            setDescEditing(false);
            setTicketModalOpen(true);
          }}
        />

        {/* SLA · Horario Colombia · Tiempos por fase */}
        <Card>
          <CardHeader
            title="SLA y horario de atención"
            subtitle="Tiempos por fase · deadline 4h laborales · Colombia 8:00–17:00"
          />
          <CardBody>
            <TicketsSLAHorarioMetrics
              tickets={filtered}
              onTicketClick={(t) => {
                setSelectedTicket(t);
                setDescEditing(false);
                setTicketModalOpen(true);
              }}
            />
          </CardBody>
        </Card>

        {/* Métricas completas por coach (solo cuando se filtra un coach específico) */}
        {!isCoachAll && selectedCoach && (
          <Card>
            <CardHeader
              title={`Métricas completas · ${selectedCoach.nombre}`}
              subtitle="Resumen ampliado por coach seleccionado"
            />
            <CardBody>
              <PersonalMetrics
                coachCode={selectedCoach.codigo}
                coachName={selectedCoach.nombre}
                externalDesde={fechaDesde}
                externalHasta={fechaHasta}
                hideDateControls
              />
            </CardBody>
          </Card>
        )}

        {/* Resumen adicional (por alumno/tipo) */}
        <TicketsSummaryCard tickets={filtered} metrics={metrics} />

        {/* Promedio mensual de tickets por alumno */}
        <StudentTicketsAvg
          tickets={filtered}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          loading={loading}
        />

        {/* Tickets por fase (usa alumnos para mapear etapa) */}
        <TicketsByPhase
          tickets={filtered}
          students={students}
          loading={loading}
        />

        {/* Gráficas */}
        <Charts ticketsPorDia={ticketsPorDia} tickets={filtered} />
      </div>

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
        <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-hidden p-0 gap-0">
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-gray-100 bg-white px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
                    ticketDetail?.estado ?? selectedTicket?.estado,
                  )}`}
                >
                  {String(
                    ticketDetail?.estado ?? selectedTicket?.estado ?? "—",
                  ).toUpperCase()}
                </span>
                {selectedTicket?.id_externo && (
                  <span className="font-mono text-xs text-gray-400">
                    #{selectedTicket.id_externo}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {String(
                    ticketDetail?.tipo ?? selectedTicket?.tipo ?? "—",
                  ).toUpperCase()}
                </span>
                {ticketDetail?.plazo_info?.estado_plazo && (
                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                    {String(ticketDetail.plazo_info.estado_plazo).toUpperCase()}
                  </span>
                )}
              </div>
              <DialogTitle className="text-base font-semibold leading-snug text-gray-900">
                {ticketDetail?.nombre ?? selectedTicket?.nombre ?? "Ticket"}
              </DialogTitle>
            </div>
          </div>

          {!selectedTicket ? (
            <div className="px-6 py-8 text-sm text-gray-400">Sin selección</div>
          ) : ticketLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-gray-400">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-sky-500" />
              Cargando detalle…
            </div>
          ) : (
            <div className="max-h-[calc(92vh-72px)] overflow-y-auto">
              {/* Metadata strip */}
              <div className="grid grid-cols-2 gap-px border-b border-gray-100 bg-gray-100 sm:grid-cols-3 lg:grid-cols-6">
                {(
                  [
                    {
                      label: "Alumno",
                      value:
                        ticketDetail?.alumno_nombre ??
                        selectedTicket?.alumno_nombre ??
                        "—",
                    },
                    {
                      label: "Informante",
                      value: ticketDetail?.informante_nombre ?? "—",
                    },
                    {
                      label: "Creado",
                      value: fmtDateTime(
                        ticketDetail?.created_at ?? selectedTicket?.creacion,
                      ),
                    },
                    {
                      label: "Deadline",
                      value: fmtDateTime(
                        ticketDetail?.deadline ?? selectedTicket?.deadline,
                      ),
                    },
                    {
                      label: "Resuelto por",
                      value: ticketDetail?.resuelto_por_nombre ?? "—",
                    },
                    {
                      label: "Último cambio",
                      value: fmtDateTime(ticketDetail?.ultimo_estado?.fecha),
                    },
                  ] as { label: string; value: string }[]
                ).map(({ label, value }) => (
                  <div key={label} className="bg-white px-4 py-3">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {label}
                    </div>
                    <div className="truncate text-sm font-medium text-gray-800">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Main grid */}
              <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
                {/* Left column */}
                <div className="space-y-4">
                  {/* Descripción */}
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        Descripción
                      </span>
                      {ticketDetail?.descripcion && (
                        <span className="ml-1 text-[11px] text-gray-400">
                          {String(ticketDetail.descripcion).length} car.
                        </span>
                      )}
                      {!descEditing && (
                        <button
                          className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                          onClick={() => {
                            setDescDraft(
                              String(ticketDetail?.descripcion ?? ""),
                            );
                            setDescEditing(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                      )}
                    </div>
                    <div className="p-4">
                      {!descEditing ? (
                        <div className="min-h-15 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                          {ticketDetail?.descripcion ? (
                            String(ticketDetail.descripcion)
                          ) : (
                            <span className="italic text-gray-400">
                              Sin descripción
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            rows={12}
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            placeholder="Escribe la descripción del ticket…"
                            className="resize-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                              onClick={() => {
                                setDescEditing(false);
                                setDescDraft("");
                              }}
                              disabled={savingDesc}
                            >
                              Cancelar
                            </button>
                            <button
                              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                              onClick={async () => {
                                if (!selectedTicket?.id_externo) return;
                                setSavingDesc(true);
                                try {
                                  await updateTicket(
                                    String(selectedTicket.id_externo),
                                    { descripcion: (descDraft || "").trim() },
                                  );
                                  toast({ title: "Descripción actualizada" });
                                  const url = buildUrl(
                                    `/ticket/get/ticket/${encodeURIComponent(
                                      String(selectedTicket.id_externo),
                                    )}`,
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
                                  const json = await res
                                    .json()
                                    .catch(() => ({}));
                                  setTicketDetail(json?.data ?? json ?? null);
                                  setDescEditing(false);
                                } catch (e) {
                                  console.error(e);
                                  toast({
                                    title: "Error al actualizar descripción",
                                  });
                                } finally {
                                  setSavingDesc(false);
                                }
                              }}
                              disabled={savingDesc}
                            >
                              {savingDesc ? "Guardando…" : "Guardar cambios"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Historial timeline */}
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                      <History className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        Historial de estados
                      </span>
                      {Array.isArray(ticketDetail?.estados) &&
                        ticketDetail.estados.length > 0 && (
                          <span className="ml-auto text-xs text-gray-400">
                            {ticketDetail.estados.length} cambios
                          </span>
                        )}
                    </div>
                    <div className="p-4">
                      {Array.isArray(ticketDetail?.estados) &&
                      ticketDetail.estados.length > 0 ? (
                        <div className="relative pl-6">
                          <div className="absolute left-1.75 top-3 h-[calc(100%-28px)] w-px bg-linear-to-b from-gray-200 to-transparent" />
                          <div className="space-y-3.5">
                            {ticketDetail.estados.map(
                              (estadoItem: any, idx: number) => (
                                <div
                                  key={estadoItem.id ?? idx}
                                  className="relative flex items-start gap-3"
                                >
                                  <div
                                    className={`absolute -left-5.5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ring-2 ${
                                      idx === 0
                                        ? "ring-sky-400 bg-sky-400"
                                        : "ring-gray-300 bg-white"
                                    }`}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
                                        estadoItem?.estatus_id,
                                      )}`}
                                    >
                                      {String(
                                        estadoItem?.estatus_id ?? "—",
                                      ).replaceAll("_", " ")}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {fmtDateTime(estadoItem?.created_at)}
                                    </span>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="italic text-sm text-gray-400">
                          Sin historial de estados.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  {/* SLA */}
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        SLA
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 p-4">
                      <DetailItem
                        label="Horas restantes"
                        value={ticketDetail?.plazo_info?.horas_restantes ?? "—"}
                      />
                      <DetailItem
                        label="Respondido"
                        value={
                          ticketDetail?.plazo_info?.fue_respondido ? "Sí" : "No"
                        }
                      />
                      <DetailItem
                        label="Primera respuesta"
                        value={fmtDateTime(
                          ticketDetail?.plazo_info?.fecha_primera_respuesta,
                        )}
                      />
                    </div>
                  </div>

                  {/* Coaches */}
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        Coaches
                      </span>
                    </div>
                    <div className="p-3">
                      {Array.isArray(ticketDetail?.coaches) &&
                      ticketDetail.coaches.length > 0 ? (
                        <div className="space-y-2">
                          {ticketDetail.coaches.map((coach: any) => (
                            <div
                              key={String(
                                coach?.codigo_equipo ??
                                  coach?.nombre ??
                                  Math.random(),
                              )}
                              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-indigo-100 text-sm font-semibold text-sky-700">
                                {String(coach?.nombre ?? "?")
                                  .trim()
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900">
                                  {coach?.nombre ?? "Coach"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {coach?.puesto ?? "—"}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${areaChipClass(coach?.area)}`}
                              >
                                {coach?.area ?? "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-1 italic text-sm text-gray-400">
                          Sin coaches asociados.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Archivos */}
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        Archivos adjuntos
                      </span>
                    </div>
                    <div className="p-3">
                      {Array.isArray(ticketDetail?.archivos) &&
                      ticketDetail.archivos.length > 0 ? (
                        <div className="space-y-2">
                          {ticketDetail.archivos.map((file: any) => (
                            <a
                              key={file?.id}
                              href={file?.url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 transition hover:border-sky-200 hover:bg-sky-50"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                                <Paperclip className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900">
                                  {file?.nombre_archivo ?? "Archivo"}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {file?.mime_type ?? "—"}
                                  {file?.tamano_bytes
                                    ? ` · ${Math.round(Number(file.tamano_bytes) / 1024)} KB`
                                    : ""}
                                </div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="px-1 italic text-sm text-gray-400">
                          Sin archivos adjuntos.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
