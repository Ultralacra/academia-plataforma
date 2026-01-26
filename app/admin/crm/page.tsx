"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  Phone,
  PieChart,
  Search,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { crmAutomations } from "@/lib/crm-service";
import { apiFetch } from "@/lib/api-config";

import {
  type Lead,
  type LeadOrigin,
  listLeadOrigins,
  listLeads,
  updateLead,
} from "./api";
import { CrmTabsLayout } from "./components/TabsLayout";
import { CreateLeadDialog } from "./components/CreateLeadDialog";
import { DeleteLeadConfirmDialog } from "./components/DeleteLeadConfirmDialog";
import { EventsOriginsManager } from "./components/EventsOriginsManager";
import { MetricsOverview } from "./components/MetricsOverview";
import { MetricsTabs } from "./components/MetricsTabs";
import { ProspectFilters } from "./components/ProspectFilters";
import { ProspectKanban } from "./components/ProspectKanban";
import { SalesPersonalMetrics } from "./components/SalesPersonalMetrics";
import { SellerMetricsTable } from "./components/SellerMetricsTable";
import { StageBadge } from "./components/StageBadge";

type ProspectStage =
  | "Nuevo"
  | "Contactado"
  | "Calificado"
  | "Ganado"
  | "Perdido";

interface Prospect {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  canal: string | null;
  etapa: ProspectStage;
  ownerCodigo: string | null;
  saleStatus: string | null;
  pais: string | null;
  ciudad: string | null;
  creado: string | null;
  actualizado: string | null;
  remote?: boolean;
}

interface CalendarAvailability {
  google_email: string;
  busy: Array<{ start: string; end: string }>;
}

interface CalendarStatus {
  connected: boolean;
  google_email?: string;
  loading: boolean;
}

interface QuickStat {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
}

interface SellerMetricsRow {
  ownerId: string | null;
  ownerNombre: string;
  total: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
}

interface SellerMetricsResult {
  rows: SellerMetricsRow[];
  totalOwners: number;
}

interface CrmGlobalMetrics {
  totalProspects: number;
  byStage: {
    nuevo: number;
    contactado: number;
    calificado: number;
    propuesta: number;
    ganado: number;
    perdido: number;
  };
  won: number;
  lost: number;
  contacted: number;
  conversionRate: number;
}

interface UserSummary {
  codigo: string;
  name: string;
  email: string;
  role?: string | null;
}

const PIPELINE_STAGES: ProspectStage[] = [
  "Nuevo",
  "Contactado",
  "Calificado",
  "Ganado",
  "Perdido",
];

const gradients = [
  "from-indigo-500 to-sky-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-purple-500 to-violet-500",
  "from-slate-500 to-slate-700",
];

const HOURS = Array.from({ length: 17 }, (_, idx) => 6 + idx);

const mapLeadStatusToEtapa = (status?: string | null): ProspectStage => {
  switch (String(status ?? "").toLowerCase()) {
    case "contacted":
      return "Contactado";
    case "qualified":
      return "Calificado";
    case "won":
      return "Ganado";
    case "lost":
      return "Perdido";
    default:
      return "Nuevo";
  }
};

const mapEtapaToLeadStatus = (etapa: ProspectStage): string => {
  switch (etapa) {
    case "Contactado":
      return "contacted";
    case "Calificado":
      return "qualified";
    case "Ganado":
      return "won";
    case "Perdido":
      return "lost";
    default:
      return "new";
  }
};

const mapLeadToProspect = (lead: Lead): Prospect => ({
  id: String(lead.codigo ?? lead.id ?? ""),
  nombre: lead.name || "(Sin nombre)",
  email: lead.email ?? null,
  telefono: lead.phone ?? null,
  canal: lead.source ?? null,
  etapa: mapLeadStatusToEtapa(lead.status),
  ownerCodigo: lead.owner_codigo ?? null,
  saleStatus: lead.status ?? null,
  pais: (lead as any)?.country ?? null,
  ciudad: (lead as any)?.city ?? null,
  creado: lead.created_at ?? null,
  actualizado: lead.updated_at ?? null,
  remote: Boolean((lead as any)?.remote),
});

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .padEnd(2, "·");

const getAvatarGradient = (name: string) => {
  if (!name) return gradients[0];
  const code = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[code % gradients.length];
};

function mapUsersPayload(raw: any): UserSummary[] {
  const source = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
      ? raw
      : [];
  return source
    .map((item) => ({
      codigo: String(item?.codigo ?? item?.id ?? ""),
      name:
        String(
          item?.name ?? item?.nombre ?? item?.email ?? "(Sin nombre)",
        ).trim() || "(Sin nombre)",
      email: String(item?.email ?? "sin-email@academia.com"),
      role: item?.role ?? item?.rol ?? null,
    }))
    .filter((user) => user.codigo);
}

function formatHourLabel(date: Date) {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CrmContent() {
  const router = useRouter();
  const authState = useAuth();
  const { toast } = useToast();

  const isAdmin = authState?.user?.role === "admin";
  const isSalesUser = ["sales", "equipo"].includes(
    String(authState?.user?.role ?? ""),
  );
  const userCodigo = authState?.user?.codigo ?? "";

  const ownerFilterRef = useRef<string>("");

  const [rows, setRows] = useState<Prospect[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [stageUpdatingId, setStageUpdatingId] = useState<string | null>(null);

  const [leadOrigins, setLeadOrigins] = useState<LeadOrigin[]>([]);
  const [selectedCampaignForMetrics, setSelectedCampaignForMetrics] =
    useState<string>("all");

  const [salesUsers, setSalesUsers] = useState<UserSummary[]>([]);
  const [salesUsersLoading, setSalesUsersLoading] = useState(false);
  const [selectedSalesUserFilter, setSelectedSalesUserFilter] =
    useState<string>("");

  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<{
    codigo: string;
    nombre: string;
  } | null>(null);
  const [selectedUserForAssign, setSelectedUserForAssign] =
    useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availability, setAvailability] = useState<CalendarAvailability | null>(
    null,
  );
  const [availabilityDay, setAvailabilityDay] = useState<Date>(new Date());

  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    connected: false,
    loading: true,
  });
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  const [q, setQ] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("all");
  const [canalFiltro, setCanalFiltro] = useState<string>("all");
  const [ownerFiltro, setOwnerFiltro] = useState<string>("all");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("pipeline");

  const showingMyLeads =
    Boolean(userCodigo) && ownerFilterRef.current === userCodigo;

  const fetchUsers = useCallback(async (): Promise<UserSummary[]> => {
    try {
      const raw = await apiFetch<any>("/users", { method: "GET" });
      return mapUsersPayload(raw);
    } catch (error) {
      console.error("Error al cargar usuarios", error);
      toast({
        title: "Error al cargar usuarios",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const loadSalesUsers = useCallback(async () => {
    setSalesUsersLoading(true);
    try {
      const users = await fetchUsers();
      const filtered = users.filter((user) =>
        ["sales", "equipo", "admin"].includes(String(user.role ?? "")),
      );
      setSalesUsers(filtered);
    } finally {
      setSalesUsersLoading(false);
    }
  }, [fetchUsers]);

  const loadAllUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const users = await fetchUsers();
      setAllUsers(users);
    } finally {
      setUsersLoading(false);
    }
  }, [fetchUsers]);

  const loadOrigins = useCallback(async () => {
    try {
      const origins = await listLeadOrigins();
      setLeadOrigins(origins);
    } catch (error) {
      console.error("Error al cargar campañas", error);
      toast({
        title: "No se pudieron cargar campañas",
        variant: "destructive",
      });
    }
  }, [toast]);

  const reload = useCallback(
    async (owner?: string) => {
      const ownerCode = owner ?? ownerFilterRef.current ?? "";
      ownerFilterRef.current = ownerCode || "";
      setLoadingLeads(true);
      try {
        const response = await listLeads({
          owner: ownerCode ? String(ownerCode) : undefined,
          pageSize: 500,
        });
        const items = response.items ?? [];
        setRows(items.map(mapLeadToProspect));
      } catch (error) {
        console.error("Error al cargar leads", error);
        toast({
          title: "No se pudieron cargar leads",
          variant: "destructive",
        });
      } finally {
        setLoadingLeads(false);
      }
    },
    [toast],
  );

  const handleAssignLead = useCallback(async () => {
    if (!leadToAssign?.codigo || !selectedUserForAssign) return;
    setAssigning(true);
    try {
      await apiFetch(
        `/leads/${encodeURIComponent(leadToAssign.codigo)}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner_codigo: selectedUserForAssign }),
        },
      );
      toast({
        title: "Lead asignado",
        description: `${leadToAssign.nombre} asignado correctamente`,
      });
      setAssignModalOpen(false);
      setLeadToAssign(null);
      setSelectedUserForAssign("");
      setUserSearchQuery("");
      reload(ownerFilterRef.current || undefined);
    } catch (error: any) {
      toast({
        title: "Error al asignar",
        description:
          error?.message ?? "No se pudo asignar el lead. Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  }, [leadToAssign, reload, selectedUserForAssign, toast]);

  useEffect(() => {
    reload();
    loadOrigins();
    if (isAdmin) {
      loadSalesUsers();
    }
  }, [isAdmin, loadOrigins, loadSalesUsers, reload]);

  useEffect(() => {
    const fetchCalendarStatus = async () => {
      try {
        const response = await apiFetch<{
          connected: boolean;
          google_email?: string;
        }>("/calendar/status");
        setCalendarStatus({
          connected: response.connected,
          google_email: response.google_email,
          loading: false,
        });
      } catch (error) {
        console.error("Estado de calendario", error);
        setCalendarStatus({ connected: false, loading: false });
      }
    };

    fetchCalendarStatus();
    const interval = setInterval(fetchCalendarStatus, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncCalendar = async () => {
    try {
      setSyncingCalendar(true);
      const response = await apiFetch<{ url: string }>("/calendar/auth");
      if (response.url) {
        window.location.href = response.url;
      } else {
        toast({
          title: "No se pudo iniciar la sincronización",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error al sincronizar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setSyncingCalendar(false);
    }
  };

  const loadAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const response = await apiFetch<{
        success: boolean;
        google_email: string;
        busy: Array<{ start: string; end: string }>;
      }>("/calendar/availability");
      setAvailability({
        google_email: response.google_email,
        busy: response.busy,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "No se pudo cargar la disponibilidad",
        variant: "destructive",
      });
    } finally {
      setAvailabilityLoading(false);
    }
  }, [toast]);

  const handleViewAvailability = () => {
    setAvailabilityDay(new Date());
    setAvailabilityOpen(true);
    void loadAvailability();
  };

  const getDayRange = useCallback((day: Date) => {
    const start = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }, []);

  const renderCalendar = useCallback(() => {
    if (!availability) return null;

    const now = new Date();
    const selectedDay = availabilityDay || now;
    const isToday = selectedDay.toDateString() === now.toDateString();

    const goToPrevDay = () => {
      const prev = new Date(selectedDay);
      prev.setDate(prev.getDate() - 1);
      setAvailabilityDay(prev);
    };

    const goToNextDay = () => {
      const next = new Date(selectedDay);
      next.setDate(next.getDate() + 1);
      setAvailabilityDay(next);
    };

    const goToToday = () => {
      setAvailabilityDay(new Date());
    };

    const { start: dayStart, end: dayEnd } = getDayRange(selectedDay);

    const busyForDay = availability.busy
      .map((slot) => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
      }))
      .filter(
        (slot) =>
          !Number.isNaN(slot.start.getTime()) &&
          !Number.isNaN(slot.end.getTime()) &&
          slot.end >= dayStart &&
          slot.start <= dayEnd,
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const isHourBusy = (hour: number) => {
      const hourStart = new Date(selectedDay);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(selectedDay);
      hourEnd.setHours(hour, 59, 59, 999);
      return busyForDay.some(
        (slot) => slot.start < hourEnd && slot.end > hourStart,
      );
    };

    const getBusyEventsForHour = (hour: number) => {
      const hourStart = new Date(selectedDay);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(selectedDay);
      hourEnd.setHours(hour + 1, 0, 0, 0);
      return busyForDay.filter(
        (slot) => slot.start < hourEnd && slot.end > hourStart,
      );
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevDay}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium text-slate-700">
              {selectedDay.toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Badge variant={isToday ? "default" : "outline"}>
              {isToday ? "Hoy" : "Otro día"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <div>
            Disponibilidad de:{" "}
            <span className="font-medium text-slate-700">
              {availability.google_email || "Google Calendar"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-blue-500" /> Ocupado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
              Libre
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg">
          {HOURS.map((hour) => {
            const events = getBusyEventsForHour(hour);
            const busy = isHourBusy(hour);
            return (
              <div
                key={hour}
                className="flex border-b last:border-b-0 min-h-[48px]"
              >
                <div className="w-16 flex-shrink-0 px-2 py-1 text-xs text-slate-500 border-r bg-slate-50 flex items-start justify-end">
                  {`${hour.toString().padStart(2, "0")}:00`}
                </div>
                <div className="relative flex-1">
                  <div
                    className={`h-12 border-l-2 ${
                      busy
                        ? "border-blue-400 bg-blue-50/60"
                        : "border-transparent"
                    }`}
                  />
                  {events.map((slot, idx) => {
                    const startMinutes =
                      slot.start.getHours() * 60 + slot.start.getMinutes();
                    const endMinutes =
                      slot.end.getHours() * 60 + slot.end.getMinutes();
                    const hourStart = hour * 60;
                    const hourEnd = (hour + 1) * 60;
                    const effectiveStart = Math.max(startMinutes, hourStart);
                    const effectiveEnd = Math.min(endMinutes, hourEnd);
                    const top = ((effectiveStart - hourStart) / 60) * 100;
                    const height = Math.max(
                      6,
                      ((effectiveEnd - effectiveStart) / 60) * 100,
                    );
                    return (
                      <div
                        key={`${slot.start.toISOString()}-${idx}`}
                        className="absolute left-0 right-2 bg-blue-500/80 text-white text-[10px] rounded-md px-2 py-1 shadow"
                        style={{ top: `${top}%`, height: `${height}%` }}
                      >
                        Ocupado
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Horas bloqueadas:{" "}
              <span className="font-semibold">{busyForDay.length}</span>
            </span>
            {busyForDay.length > 0 && (
              <div className="text-xs text-slate-500">
                {busyForDay.map((slot, idx) => (
                  <span key={`${slot.start.toISOString()}-${idx}`}>
                    {idx > 0 ? ", " : ""}
                    {formatHourLabel(slot.start)} - {formatHourLabel(slot.end)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [availability, availabilityDay, getDayRange]);

  const filtrados = useMemo(() => {
    return rows.filter((prospect) => {
      const matchesSearch = q.trim()
        ? [prospect.nombre, prospect.email, prospect.telefono]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(q.trim().toLowerCase()),
            )
        : true;
      const matchesStage =
        etapaFiltro === "all" || prospect.etapa === etapaFiltro;
      const matchesChannel =
        canalFiltro === "all" || prospect.canal === canalFiltro;
      const matchesOwner =
        ownerFiltro === "all" || (prospect.ownerCodigo ?? "") === ownerFiltro;

      const createdAt = prospect.creado ? new Date(prospect.creado) : null;
      const from = createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;
      const to = createdTo ? new Date(`${createdTo}T23:59:59`) : null;
      const matchesDate =
        !from && !to
          ? true
          : createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
            ? (!from || createdAt >= from) && (!to || createdAt <= to)
            : false;

      return (
        matchesSearch &&
        matchesStage &&
        matchesChannel &&
        matchesOwner &&
        matchesDate
      );
    });
  }, [rows, q, etapaFiltro, canalFiltro, ownerFiltro, createdFrom, createdTo]);

  const gmFromRows = useMemo<CrmGlobalMetrics>(() => {
    const byStage: CrmGlobalMetrics["byStage"] = {
      nuevo: 0,
      contactado: 0,
      calificado: 0,
      propuesta: 0,
      ganado: 0,
      perdido: 0,
    };
    rows.forEach((row) => {
      switch (row.etapa) {
        case "Contactado":
          byStage.contactado += 1;
          break;
        case "Calificado":
          byStage.calificado += 1;
          break;
        case "Ganado":
          byStage.ganado += 1;
          break;
        case "Perdido":
          byStage.perdido += 1;
          break;
        default:
          byStage.nuevo += 1;
      }
    });
    const total = rows.length || 1;
    const won = byStage.ganado;
    const contacted =
      byStage.contactado +
      byStage.calificado +
      byStage.propuesta +
      byStage.ganado +
      byStage.perdido;
    const lost = byStage.perdido;
    const conversionRate = total > 0 ? won / total : 0;
    return {
      totalProspects: rows.length,
      byStage,
      won,
      lost,
      contacted,
      conversionRate,
    };
  }, [rows]);

  const sellerMetrics = useMemo<SellerMetricsResult>(() => {
    const store = new Map<
      string,
      {
        ownerId: string | null;
        ownerNombre: string;
        total: number;
        contacted: number;
        qualified: number;
        won: number;
        lost: number;
      }
    >();
    rows.forEach((row) => {
      const key = row.ownerCodigo || "(Sin owner)";
      if (!store.has(key)) {
        store.set(key, {
          ownerId: row.ownerCodigo ?? null,
          ownerNombre: row.ownerCodigo ?? "(Sin owner)",
          total: 0,
          contacted: 0,
          qualified: 0,
          won: 0,
          lost: 0,
        });
      }
      const bucket = store.get(key)!;
      bucket.total += 1;
      if (row.etapa !== "Nuevo") bucket.contacted += 1;
      if (row.etapa === "Calificado") bucket.qualified += 1;
      if (row.etapa === "Ganado") bucket.won += 1;
      if (row.etapa === "Perdido") bucket.lost += 1;
    });
    return {
      rows: Array.from(store.values()),
      totalOwners: store.size,
    };
  }, [rows]);

  const canales = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      if (row.canal) set.add(row.canal);
    });
    return Array.from(set.values());
  }, [rows]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    salesUsers.forEach((user) => {
      if (user.codigo)
        map.set(user.codigo, user.name || user.email || user.codigo);
    });
    rows.forEach((row) => {
      const codigo = row.ownerCodigo ?? "";
      if (!codigo) return;
      if (!map.has(codigo)) map.set(codigo, codigo);
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [salesUsers, rows]);

  const quickStats = useMemo<QuickStat[]>(() => {
    return [
      {
        label: "Leads activos",
        value: rows.length.toString(),
        icon: Users,
        accent: "from-indigo-500 to-sky-500",
      },
      {
        label: "Conversión",
        value: `${(gmFromRows.conversionRate * 100).toFixed(1)}%`,
        icon: PieChart,
        accent: "from-amber-500 to-orange-500",
      },
      {
        label: "Contactados",
        value: (
          gmFromRows.byStage.contactado +
          gmFromRows.byStage.calificado +
          gmFromRows.byStage.propuesta +
          gmFromRows.byStage.ganado +
          gmFromRows.byStage.perdido
        ).toString(),
        icon: Activity,
        accent: "from-cyan-500 to-teal-500",
      },
      {
        label: "Ganados",
        value: gmFromRows.byStage.ganado.toString(),
        icon: CheckCircle2,
        accent: "from-emerald-500 to-emerald-600",
      },
    ];
  }, [rows.length, gmFromRows]);

  const getOriginName = useCallback(
    (originId?: string | null) => {
      if (!originId) return "—";
      const found = leadOrigins.find((origin) => origin.codigo === originId);
      return found?.name || originId;
    },
    [leadOrigins],
  );

  const campaignSummary = useMemo(() => {
    const filtered =
      selectedCampaignForMetrics === "all"
        ? rows
        : rows.filter((row) => row.canal === selectedCampaignForMetrics);
    const byStage = filtered.reduce(
      (acc, row) => {
        acc[row.etapa] = (acc[row.etapa] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      total: filtered.length,
      byStage,
      label:
        selectedCampaignForMetrics === "all"
          ? "Todas las campañas"
          : getOriginName(selectedCampaignForMetrics),
    };
  }, [rows, selectedCampaignForMetrics, getOriginName]);

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-slate-50">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(129,140,248,0.18),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 -z-10 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl"
        aria-hidden
      />

      <div className="relative border-b px-6 py-6 bg-gradient-to-r from-white via-indigo-50 to-sky-50 overflow-hidden">
        <div
          className="absolute -top-24 -right-10 h-56 w-56 rounded-full bg-indigo-300/30 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-indigo-500 shadow-inner ring-1 ring-white/60">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  CRM Comercial
                </h1>
                <p className="text-sm text-slate-600">
                  Gestiona tus leads, agenda y métricas en un tablero vibrante.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAdmin ? (
                <div className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1.5 shadow-sm">
                  <select
                    className="h-8 rounded-full border-0 bg-transparent px-1 text-sm text-slate-700 focus:outline-none"
                    value={selectedSalesUserFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedSalesUserFilter(value);
                      ownerFilterRef.current = value;
                      void reload(value || undefined);
                    }}
                    disabled={salesUsersLoading}
                  >
                    <option value="">
                      {salesUsersLoading ? "Cargando..." : "Todos los Leads"}
                    </option>
                    {salesUsers.map((user) => (
                      <option key={user.codigo} value={user.codigo}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                  {selectedSalesUserFilter ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSalesUserFilter("");
                        ownerFilterRef.current = "";
                        void reload("");
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                      aria-label="Limpiar filtro de usuarios"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isSalesUser && userCodigo ? (
                <div className="flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/60 px-3 py-1.5 text-sm text-indigo-700 shadow-sm">
                  <span className="font-medium">
                    {showingMyLeads ? "Mis leads" : "Todos los leads"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (showingMyLeads) {
                        ownerFilterRef.current = "";
                        void reload("");
                      } else {
                        ownerFilterRef.current = userCodigo;
                        void reload(userCodigo);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-indigo-500"
                  >
                    {showingMyLeads ? (
                      <>
                        <List className="h-3.5 w-3.5" />
                        Ver todos
                      </>
                    ) : (
                      <>
                        <User className="h-3.5 w-3.5" />
                        Ver mis leads
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              {calendarStatus.loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando calendario...</span>
                </div>
              ) : calendarStatus.connected ? (
                <>
                  <div
                    className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700"
                    title={`Sincronizado con ${
                      calendarStatus.google_email || "Google Calendar"
                    }`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Calendar sincronizado</span>
                    {calendarStatus.google_email ? (
                      <span className="text-xs opacity-75">
                        ({calendarStatus.google_email})
                      </span>
                    ) : null}
                  </div>
                  <Button
                    onClick={handleViewAvailability}
                    variant="outline"
                    size="sm"
                    className="w-fit gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Ver mis horas disponibles
                  </Button>
                </>
              ) : (
                <button
                  onClick={handleSyncCalendar}
                  disabled={syncingCalendar}
                  className="group inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Sincronizar con Google Calendar"
                >
                  {syncingCalendar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5 transition-transform group-hover:scale-110"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span className="font-semibold">
                        Sincronizar Calendar
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            {leadOrigins.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Métricas por campaña
                </span>
                <Select
                  value={selectedCampaignForMetrics}
                  onValueChange={setSelectedCampaignForMetrics}
                >
                  <SelectTrigger className="w-60 rounded-full bg-white/80">
                    <SelectValue placeholder="Seleccionar campaña" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {leadOrigins.map((origin) => (
                      <SelectItem key={origin.codigo} value={origin.codigo}>
                        {origin.name || origin.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">
                    {campaignSummary.label}:
                  </span>
                  <span>Total {campaignSummary.total}</span>
                  {Object.entries(campaignSummary.byStage).map(
                    ([key, value]) => (
                      <span key={key}>
                        {key}: <span className="font-semibold">{value}</span>
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <CreateLeadDialog
              onCreated={() => {
                void reload(ownerFilterRef.current || undefined);
              }}
            />
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-lg"
              >
                <div
                  className={`absolute -top-10 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${stat.accent} opacity-40 blur-2xl group-hover:opacity-60`}
                  aria-hidden
                />
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-white shadow`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stat.label}
                </div>
                <div className="text-2xl font-semibold text-slate-900">
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-100/80">
        <CrmTabsLayout
          value={activeTab}
          onValueChange={setActiveTab}
          pipeline={
            <div className="flex flex-col gap-4 h-full">
              <ProspectFilters
                q={q}
                setQ={setQ}
                etapa={etapaFiltro}
                setEtapa={setEtapaFiltro}
                canal={canalFiltro}
                setCanal={setCanalFiltro}
                owner={ownerFiltro}
                setOwner={setOwnerFiltro}
                createdFrom={createdFrom}
                setCreatedFrom={setCreatedFrom}
                createdTo={createdTo}
                setCreatedTo={setCreatedTo}
                etapas={PIPELINE_STAGES}
                canales={canales}
                owners={owners}
                onClear={() => {
                  setQ("");
                  setEtapaFiltro("all");
                  setCanalFiltro("all");
                  setOwnerFiltro("all");
                  setCreatedFrom("");
                  setCreatedTo("");
                }}
              />

              <div className="flex items-center justify-end -mt-2">
                <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setView("lista")}
                    className={`px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 ${
                      view === "lista"
                        ? "bg-blue-600 text-white hover:bg-blue-600"
                        : ""
                    }`}
                    title="Vista de lista"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("kanban")}
                    className={`px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 border-l border-slate-200 ${
                      view === "kanban"
                        ? "bg-blue-600 text-white hover:bg-blue-600"
                        : ""
                    }`}
                    title="Vista Kanban"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {view === "lista" ? (
                <div className="rounded-xl border border-slate-200/70 bg-white/90 shadow-sm">
                  <div className="grid grid-cols-11 gap-2 px-4 py-2 text-xs font-semibold text-slate-600 border-b bg-gradient-to-r from-slate-50 via-blue-50/60 to-slate-50 uppercase tracking-wide">
                    <div className="col-span-3">Prospecto</div>
                    <div className="col-span-2">Contacto</div>
                    <div className="col-span-2">Canal</div>
                    <div className="col-span-2">Etapa</div>
                    <div className="col-span-2 text-right">Acción</div>
                  </div>
                  <div>
                    {loadingLeads ? (
                      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando leads...
                      </div>
                    ) : filtrados.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        No hay leads para mostrar
                      </div>
                    ) : (
                      filtrados.map((prospect) => (
                        <div
                          key={prospect.id}
                          className="grid grid-cols-11 gap-2 px-4 py-3 border-b last:border-b-0 bg-white/80 even:bg-slate-50/70 hover:bg-blue-50/50 transition-colors"
                        >
                          <div className="col-span-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`hidden sm:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(prospect.nombre)} text-xs font-semibold text-white shadow`}
                                aria-hidden
                              >
                                {getInitials(prospect.nombre)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="font-semibold truncate text-slate-800"
                                    title={prospect.nombre}
                                  >
                                    {prospect.nombre}
                                  </span>
                                  {prospect.remote ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-indigo-50 text-indigo-600 border-indigo-200"
                                    >
                                      Sync
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {[prospect.pais, prospect.ciudad]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2 min-w-0 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 truncate text-slate-600">
                              <Mail className="h-3.5 w-3.5 text-indigo-400" />
                              <span className="truncate">
                                {prospect.email || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate text-slate-600">
                              <Phone className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="truncate">
                                {prospect.telefono || "—"}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-2 text-xs flex items-center">
                            <Badge
                              variant="outline"
                              className="max-w-full truncate bg-sky-50 text-sky-700 border-sky-200"
                              title={getOriginName(prospect.canal)}
                            >
                              {getOriginName(prospect.canal)}
                            </Badge>
                          </div>

                          <div className="col-span-2">
                            <div className="flex flex-col gap-1.5">
                              <StageBadge stage={prospect.etapa} />
                              <Select
                                value={prospect.etapa}
                                onValueChange={async (nextStage) => {
                                  const originalStage = prospect.etapa;
                                  setStageUpdatingId(prospect.id);
                                  setRows((prev) =>
                                    prev.map((row) =>
                                      row.id === prospect.id
                                        ? {
                                            ...row,
                                            etapa: nextStage as ProspectStage,
                                          }
                                        : row,
                                    ),
                                  );
                                  try {
                                    await updateLead(prospect.id, {
                                      status: mapEtapaToLeadStatus(
                                        nextStage as ProspectStage,
                                      ),
                                    });
                                    toast({
                                      title: "Etapa actualizada",
                                      description: nextStage,
                                    });
                                  } catch {
                                    setRows((prev) =>
                                      prev.map((row) =>
                                        row.id === prospect.id
                                          ? { ...row, etapa: originalStage }
                                          : row,
                                      ),
                                    );
                                    toast({
                                      title: "Error",
                                      description:
                                        "No se pudo actualizar la etapa",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setStageUpdatingId(null);
                                  }
                                }}
                                disabled={stageUpdatingId === prospect.id}
                              >
                                <SelectTrigger className="h-8 w-full rounded-md border border-indigo-200 bg-white/80 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1">
                                  <SelectValue placeholder="Etapa" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                  {PIPELINE_STAGES.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                      {stage}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="col-span-2 flex items-center justify-end">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Asignar lead ${prospect.nombre}`}
                                title="Asignar a usuario"
                                onClick={() => {
                                  setLeadToAssign({
                                    codigo: prospect.id,
                                    nombre: prospect.nombre,
                                  });
                                  setAssignModalOpen(true);
                                  void loadAllUsers();
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                              <Link
                                href={`/admin/crm/booking/${encodeURIComponent(prospect.id)}`}
                                aria-label={`Ver detalle de ${prospect.nombre}`}
                                title="Ver detalle"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                aria-label={`Eliminar lead ${prospect.nombre}`}
                                title="Eliminar lead"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: prospect.id,
                                    nombre: prospect.nombre,
                                  })
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <ProspectKanban
                  items={filtrados.map((p) => ({
                    id: p.id,
                    nombre: p.nombre,
                    email: p.email,
                    telefono: p.telefono,
                    canalFuente: p.canal,
                    ownerNombre: undefined,
                    etapa: p.etapa,
                    saleStatus: p.saleStatus,
                  }))}
                  onOpenDetail={(p) =>
                    router.push(
                      `/admin/crm/booking/${encodeURIComponent(p.id)}`,
                    )
                  }
                  onMoved={() => reload(ownerFilterRef.current || undefined)}
                  onStageChange={async (id, newStage) => {
                    const statusMap: Record<string, string> = {
                      nuevo: "new",
                      contactado: "contacted",
                      calificado: "qualified",
                      ganado: "won",
                      perdido: "lost",
                    };
                    const newStatus = statusMap[newStage] || "new";
                    try {
                      const row = rows.find((r) => r.id === id);
                      await updateLead(id, { status: newStatus });
                      toast({
                        title: "Etapa actualizada",
                        description: `${row?.nombre || id} → ${newStage}`,
                      });
                      reload(ownerFilterRef.current || undefined);
                    } catch {
                      toast({
                        title: "Error",
                        description: "No se pudo actualizar la etapa",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              )}
            </div>
          }
          metrics={
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Panel de métricas</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    crmAutomations.runAutomationsDaily();
                    reload(ownerFilterRef.current || undefined);
                  }}
                >
                  Ejecutar automatizaciones
                </Button>
              </div>
              <MetricsOverview gm={gmFromRows} />
              <SellerMetricsTable data={sellerMetrics} />
              <MetricsTabs
                items={rows.map((p) => ({
                  id: p.id,
                  nombre: p.nombre,
                  email: p.email || null,
                  telefono: p.telefono || null,
                  canalFuente: p.canal || null,
                  etapaPipeline:
                    p.etapa === "Nuevo"
                      ? "nuevo"
                      : p.etapa === "Contactado"
                        ? "contactado"
                        : p.etapa === "Calificado"
                          ? "calificado"
                          : p.etapa === "Ganado"
                            ? "ganado"
                            : "perdido",
                  ownerId: p.ownerCodigo,
                  ownerNombre: p.ownerCodigo ?? "(Sin owner)",
                  pais: p.pais,
                  ciudad: p.ciudad,
                  tags: [],
                  score: null,
                  notasResumen: null,
                  creadoAt: p.creado || new Date().toISOString(),
                  actualizadoAt:
                    p.actualizado || p.creado || new Date().toISOString(),
                  nextActionAt: null,
                  origenCampaignId: null,
                  convertedStudentId: null,
                  fechaConversion: null,
                }))}
              />
              <SalesPersonalMetrics />
            </div>
          }
          campanas={
            <div className="h-full">
              <EventsOriginsManager />
            </div>
          }
        />
      </div>

      <DeleteLeadConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        leadCodigo={deleteTarget?.id || ""}
        leadName={deleteTarget?.nombre || ""}
        onDeleted={() => reload(ownerFilterRef.current || undefined)}
      />

      <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Disponibilidad del Calendario</DialogTitle>
            <DialogDescription>
              {availability?.google_email &&
                `Mostrando disponibilidad de ${availability.google_email}`}
            </DialogDescription>
          </DialogHeader>
          {availabilityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : availability ? (
            renderCalendar()
          ) : (
            <div className="text-center py-12 text-slate-500">
              No se pudo cargar la disponibilidad del calendario
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Asignar Lead a Usuario</DialogTitle>
            <DialogDescription>
              {leadToAssign && `Asignando: ${leadToAssign.nombre}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="divide-y">
                  {allUsers
                    .filter((user) => user.role === "sales")
                    .filter((user) => {
                      const query = userSearchQuery.toLowerCase();
                      return (
                        user.name.toLowerCase().includes(query) ||
                        user.email.toLowerCase().includes(query)
                      );
                    })
                    .map((user) => (
                      <button
                        key={user.codigo}
                        onClick={() =>
                          setSelectedUserForAssign((prev) =>
                            prev === user.codigo ? "" : user.codigo,
                          )
                        }
                        className={`w-full text-left hover:bg-blue-50/70 transition-colors ${
                          selectedUserForAssign === user.codigo
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <div className="p-3 flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">
                                {user.name}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                Ventas
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {user.email}
                            </p>
                          </div>
                          {selectedUserForAssign === user.codigo && (
                            <div className="text-blue-600">✓</div>
                          )}
                        </div>
                      </button>
                    ))}
                  {allUsers
                    .filter((user) => user.role === "sales")
                    .filter((user) => {
                      const query = userSearchQuery.toLowerCase();
                      return (
                        user.name.toLowerCase().includes(query) ||
                        user.email.toLowerCase().includes(query)
                      );
                    }).length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No se encontraron usuarios de ventas
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignModalOpen(false);
                setLeadToAssign(null);
                setSelectedUserForAssign("");
                setUserSearchQuery("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignLead}
              disabled={!selectedUserForAssign || assigning}
            >
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                "Asignar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CrmPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "sales"]}>
      <DashboardLayout>
        <CrmContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
