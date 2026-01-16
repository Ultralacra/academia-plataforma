"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  Users,
  UserPlus,
  Calendar,
  Tags,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  X,
  Loader2,
  List,
  LayoutGrid,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ProspectKanban } from "./components/ProspectKanban";
import { ProspectEditor } from "./components/ProspectEditor";
// Detalle por modal deshabilitado; ahora usamos una vista dedicada /admin/crm/booking/[id]
import { ProspectFilters } from "./components/ProspectFilters";
import { CrmTabsLayout } from "./components/TabsLayout";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type {
  ProspectCore,
  CrmGlobalMetrics,
  SellerMetricsResult,
} from "@/lib/crm-types";
import { computeGlobalMetrics, computeSellerMetrics } from "@/lib/crm-metrics";
import { MetricsOverview } from "./components/MetricsOverview";
import { SellerMetricsTable } from "./components/SellerMetricsTable";
import { MetricsTabs } from "./components/MetricsTabs";
import { crmAutomations } from "@/lib/crm-service";
import {
  listLeads,
  updateLead,
  type Lead,
  listLeadOrigins,
  type LeadOrigin,
} from "./api";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { StageBadge } from "./components/StageBadge";
import { CloseSaleForm } from "./components/CloseSaleForm2";
import { SalesPersonalMetrics } from "./components/SalesPersonalMetrics";
import { useRouter } from "next/navigation";
import { CreateLeadDialog } from "./components/CreateLeadDialog";
import { DeleteLeadConfirmDialog } from "./components/DeleteLeadConfirmDialog";
import { EventsOriginsManager } from "./components/EventsOriginsManager";
import { apiFetch } from "@/lib/api-config";

function CrmContent() {
  const router = useRouter();
  const { authState } = useAuth();
  type Prospect = {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    canal?: string;
    etapa: "Nuevo" | "Contactado" | "Calificado" | "Ganado" | "Perdido";
    pais?: string;
    ciudad?: string;
    tags?: string[];
    creado?: string;
    actualizado?: string;
    notas?: string;
    remote?: boolean; // viene de API real (metadata)
    saleStatus?: string;
  };

  const [rows, setRows] = useState<Prospect[]>([]);
  const [stageUpdatingId, setStageUpdatingId] = useState<string | null>(null);
  const [leadOrigins, setLeadOrigins] = useState<LeadOrigin[]>([]);
  const [showingMyLeads, setShowingMyLeads] = useState(false);
  const [userCodigo, setUserCodigo] = useState<string | null>(null);

  // Filtro de leads por usuario sales (para admin)
  const [salesUsers, setSalesUsers] = useState<
    Array<{ codigo: string; name: string; email: string }>
  >([]);
  const [selectedSalesUserFilter, setSelectedSalesUserFilter] =
    useState<string>("");
  const [salesUsersLoading, setSalesUsersLoading] = useState(false);

  // Determinar si el usuario actual es admin o sales
  const currentUserRole = authState?.user?.role;
  const isAdmin = currentUserRole === "admin";
  const isSalesUser = currentUserRole === "sales";

  // Estados para asignar lead desde tabla
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<{
    codigo: string;
    nombre: string;
  } | null>(null);
  const [allUsers, setAllUsers] = useState<
    Array<{
      codigo: string;
      name: string;
      email: string;
      tipo: string;
      role: string;
    }>
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] =
    useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean;
    google_email?: string;
    loading: boolean;
  }>({ connected: false, loading: true });
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityDay, setAvailabilityDay] = useState<Date>(
    () => new Date()
  );
  const [availability, setAvailability] = useState<{
    google_email: string;
    busy: Array<{ start: string; end: string }>;
  } | null>(null);

  const mapLeadStatusToEtapa = (status?: string) => {
    const s = (status || "new").toLowerCase();
    if (s === "new") return "Nuevo";
    if (s === "contacted") return "Contactado";
    if (s === "qualified") return "Calificado";
    if (s === "won") return "Ganado";
    if (s === "lost") return "Perdido";
    return "Nuevo";
  };

  const mapEtapaToLeadStatus = (etapa?: string) => {
    const e = String(etapa || "").toLowerCase();
    if (e === "nuevo") return "new";
    if (e === "contactado") return "contacted";
    if (e === "calificado") return "qualified";
    if (e === "ganado") return "won";
    if (e === "perdido") return "lost";
    return "new";
  };

  // Eliminado: ya no usamos submissions locales vía localStorage.

  const reload = async (userCodigoFilter?: string) => {
    // Cargar leads desde /v1/leads o /v1/leads/user/:user_codigo
    try {
      let items: Lead[] = [];

      // Si hay un filtro de usuario (para admin filtrando por sales user)
      // o si es un usuario sales viendo sus propios leads
      const filterCodigo = userCodigoFilter || selectedSalesUserFilter;

      if (filterCodigo) {
        // Usar endpoint de leads por usuario
        const response = await apiFetch<{ data: Lead[] }>(
          `/leads/user/${filterCodigo}`
        );
        items = response.data || [];
        setShowingMyLeads(true);
      } else {
        // Cargar todos los leads
        const response = await apiFetch<{ data: Lead[] }>("/leads");
        items = response.data || [];
        setShowingMyLeads(false);
      }

      const mapped: Prospect[] = items.map((l: Lead) => ({
        id: l.codigo,
        nombre: l.name,
        email: l.email || undefined,
        telefono: l.phone || undefined,
        canal: l.source || undefined,
        etapa: mapLeadStatusToEtapa(l.status),
        creado: l.created_at || undefined,
        actualizado: l.updated_at || undefined,
        remote: true,
        saleStatus: undefined,
      }));
      setRows(mapped);
      return;
    } catch (e) {
      console.warn("Cargar leads falló, mostrando lista vacía", e);
      setRows([]);
      toast({
        title: "Error cargando leads",
        description: "No se pudieron cargar los leads.",
        variant: "destructive",
      });
      return;
    }
  };

  // Cargar usuarios de tipo sales (para el filtro de admin)
  const loadSalesUsers = async () => {
    setSalesUsersLoading(true);
    try {
      const response = await apiFetch<{ data: any[] }>("/users?pageSize=1000");
      const usersData = response?.data || [];
      // Filtrar solo usuarios con role "sales"
      const salesOnly = usersData.filter((u: any) => u.role === "sales");
      setSalesUsers(salesOnly);
    } catch (e: any) {
      setSalesUsers([]);
      console.warn("No se pudieron cargar usuarios de ventas", e);
    } finally {
      setSalesUsersLoading(false);
    }
  };

  const loadOrigins = async () => {
    try {
      const items = await listLeadOrigins();
      setLeadOrigins(items || []);
    } catch (e) {
      console.warn("No se pudieron cargar orígenes", e);
    }
  };

  const loadAllUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await apiFetch<{ data: any[] }>("/users?pageSize=1000");
      const usersData = response?.data || [];
      setAllUsers(Array.isArray(usersData) ? usersData : []);
    } catch (e: any) {
      setAllUsers([]);
      toast({
        title: "Error",
        description: e?.message || "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAssignLead = async () => {
    if (!leadToAssign || !selectedUserForAssign) return;

    setAssigning(true);
    try {
      await apiFetch(`/leads/${leadToAssign.codigo}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_codigo: selectedUserForAssign }),
      });
      toast({
        title: "Lead asignado",
        description: `${leadToAssign.nombre} asignado correctamente`,
      });
      setAssignModalOpen(false);
      setLeadToAssign(null);
      setSelectedUserForAssign("");
      setUserSearchQuery("");
      reload();
    } catch (error: any) {
      let errorMessage = error?.message || "No se pudo asignar el lead";
      if (errorMessage.includes("User is not a sales user")) {
        errorMessage = "El usuario seleccionado no es un usuario de ventas";
      }
      toast({
        title: "Error al asignar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    reload();
    loadOrigins();
    // Si el usuario es admin, cargar usuarios de ventas para el filtro
    if (isAdmin) {
      loadSalesUsers();
    }
  }, [isAdmin]);

  // Cargar estado de sincronización de Google Calendar
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
        console.error("Error al obtener estado del calendario:", error);
        setCalendarStatus({ connected: false, loading: false });
      }
    };

    fetchCalendarStatus();
    // Recargar cada 2 minutos
    const interval = setInterval(fetchCalendarStatus, 120000);
    return () => clearInterval(interval);
  }, []);

  // Función para sincronizar con Google Calendar
  const handleSyncCalendar = async () => {
    try {
      setSyncingCalendar(true);
      const response = await apiFetch<{ url: string }>("/calendar/auth");

      if (response.url) {
        // Redirigir a la URL de autorización de Google
        window.location.href = response.url;
      } else {
        toast({
          title: "Error",
          description: "No se recibió URL de autorización",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error al iniciar sincronización:", error);
      toast({
        title: "Error al sincronizar",
        description:
          error?.message ||
          "No se pudo iniciar la sincronización con Google Calendar",
        variant: "destructive",
      });
    } finally {
      setSyncingCalendar(false);
    }
  };

  const loadAvailability = async () => {
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
        description:
          error?.message ||
          "No se pudo cargar la disponibilidad del calendario",
        variant: "destructive",
      });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleViewAvailability = () => {
    setAvailabilityDay(new Date());
    setAvailabilityOpen(true);
    loadAvailability();
  };

  const toDateKeyLocal = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDayRange = (d: Date) => {
    const start = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999
    );
    return { start, end };
  };

  const getBusyDates = () => {
    if (!availability) return new Set<string>();
    const busyDates = new Set<string>();
    availability.busy.forEach((slot) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const current = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      while (current <= endDay) {
        busyDates.add(toDateKeyLocal(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return busyDates;
  };

  const renderCalendar = () => {
    if (!availability) return null;

    const now = new Date();
    const selectedDay = availabilityDay || now;
    const selectedKey = toDateKeyLocal(selectedDay);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const busyDates = getBusyDates();
    const days = [];

    // Días vacíos antes del primer día del mes
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-12" />);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = toDateKeyLocal(date);
      const isBusy = busyDates.has(dateStr);
      const isToday = date.toDateString() === now.toDateString();
      const isSelected = dateStr === selectedKey;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => setAvailabilityDay(date)}
          className={`h-12 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
            isSelected
              ? "border-blue-600 bg-blue-100 text-blue-800"
              : isToday
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : isBusy
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          title={isBusy ? "Ocupado - No disponible para agendar" : "Disponible"}
        >
          {day}
        </button>
      );
    }

    const { start: dayStart, end: dayEnd } = getDayRange(selectedDay);
    const busyForDay = availability.busy
      .map((slot) => ({ start: new Date(slot.start), end: new Date(slot.end) }))
      .filter(
        (slot) =>
          !Number.isNaN(slot.start.getTime()) &&
          !Number.isNaN(slot.end.getTime()) &&
          slot.end >= dayStart &&
          slot.start <= dayEnd
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return (
      <div>
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold">
            {new Intl.DateTimeFormat("es-ES", {
              month: "long",
              year: "numeric",
            }).format(now)}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-semibold text-slate-600"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{days}</div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-red-200 bg-red-50" />
            <span>Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-slate-200 bg-white" />
            <span>Disponible</span>
          </div>
        </div>
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold mb-1">Día seleccionado</h4>
          <p className="text-xs text-slate-600">
            {new Intl.DateTimeFormat("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(selectedDay)}
          </p>

          <div className="mt-3">
            <h5 className="text-sm font-semibold mb-2">Horas bloqueadas</h5>
            {busyForDay.length === 0 ? (
              <p className="text-xs text-slate-500">
                No hay horas bloqueadas para este día.
              </p>
            ) : (
              <div className="space-y-1">
                {busyForDay.map((slot, idx) => {
                  const clampedStart = new Date(
                    Math.max(slot.start.getTime(), dayStart.getTime())
                  );
                  const clampedEnd = new Date(
                    Math.min(slot.end.getTime(), dayEnd.getTime())
                  );
                  return (
                    <div key={idx} className="text-xs text-slate-700">
                      {clampedStart.toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {clampedEnd.toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const [q, setQ] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("all");
  const [canalFiltro, setCanalFiltro] = useState<string>("all");
  const [selectedCampaignForMetrics, setSelectedCampaignForMetrics] =
    useState<string>("all");
  // Owner eliminado de la tabla; mantenemos estado por compatibilidad UI pero podría retirarse luego.
  const [ownerFiltro, setOwnerFiltro] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  // Drawer eliminado en favor de ruta dedicada
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pipeline");

  const etapas: Prospect["etapa"][] = [
    "Nuevo",
    "Contactado",
    "Calificado",
    "Ganado",
    "Perdido",
  ];

  const filtrados = useMemo(() => {
    return rows.filter((p) => {
      const hayQ = q.trim()
        ? [p.nombre, p.email, p.telefono]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q.toLowerCase()))
        : true;
      const byEtapa = etapaFiltro === "all" ? true : p.etapa === etapaFiltro;
      const byCanal = canalFiltro === "all" ? true : p.canal === canalFiltro;
      return hayQ && byEtapa && byCanal; // Owner filtrado removido
    });
  }, [q, etapaFiltro, canalFiltro, ownerFiltro, rows]);

  // Métricas desde rows (metadata) en vez de mock
  const gmFromRows = useMemo<CrmGlobalMetrics>(() => {
    const byStage = {
      nuevo: 0,
      contactado: 0,
      calificado: 0,
      propuesta: 0,
      ganado: 0,
      perdido: 0,
    } as CrmGlobalMetrics["byStage"];
    for (const r of rows) {
      const etapa = r.etapa;
      if (etapa === "Nuevo") byStage.nuevo++;
      else if (etapa === "Contactado") byStage.contactado++;
      else if (etapa === "Calificado") byStage.calificado++;
      else if (etapa === "Ganado") byStage.ganado++;
      else if (etapa === "Perdido") byStage.perdido++;
    }
    const totalProspects = rows.length;
    const won = byStage.ganado;
    const lost = byStage.perdido;
    const contacted =
      byStage.contactado + byStage.calificado + byStage.propuesta + won + lost;
    const conversionRate = totalProspects ? won / totalProspects : 0;
    return { totalProspects, byStage, won, lost, contacted, conversionRate };
  }, [rows]);

  const sellerMetrics = useMemo<SellerMetricsResult>(() => {
    const map = new Map<
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
    for (const r of rows) {
      const key = "(Sin owner)";
      if (!map.has(key))
        map.set(key, {
          ownerId: null,
          ownerNombre: key,
          total: 0,
          contacted: 0,
          qualified: 0,
          won: 0,
          lost: 0,
        });
      const row = map.get(key)!;
      row.total++;
      if (r.etapa !== "Nuevo") row.contacted++;
      if (r.etapa === "Calificado") row.qualified++;
      if (r.etapa === "Ganado") row.won++;
      if (r.etapa === "Perdido") row.lost++;
    }
    return { rows: Array.from(map.values()), totalOwners: map.size };
  }, [rows]);

  const normalizeUrl = (s?: string) => {
    const str = String(s || "").trim();
    if (!str) return "";
    return str.startsWith("http://") || str.startsWith("https://")
      ? str
      : `https://${str}`;
  };

  const canales = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.canal).filter(Boolean))) as string[],
    [rows]
  );

  // Mapeo de ID de origen a nombre
  const getOriginName = (originId?: string) => {
    if (!originId) return "—";
    const origin = leadOrigins.find((o) => o.codigo === originId);
    return origin?.name || originId;
  };
  const owners: string[] = []; // Owner eliminado

  const saleStatusClass = (s?: string) => {
    const v = String(s || "").toLowerCase();
    if (["active", "contract_signed", "payment_confirmed"].includes(v))
      return "bg-emerald-100 text-emerald-700";
    if (
      [
        "contract_sent",
        "payment_verification_pending",
        "active_provisional",
      ].includes(v)
    )
      return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />{" "}
                CRM
              </h1>

              {/* Filtro de leads por usuario sales (solo para admin) */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedSalesUserFilter}
                    onChange={(e) => {
                      setSelectedSalesUserFilter(e.target.value);
                      reload(e.target.value);
                    }}
                    disabled={salesUsersLoading}
                  >
                    <option value="">
                      {salesUsersLoading ? "Cargando..." : "Todos los Leads"}
                    </option>
                    {salesUsers.map((u) => (
                      <option key={u.codigo} value={u.codigo}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  {selectedSalesUserFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSalesUserFilter("");
                        reload("");
                      }}
                      className="gap-1 text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                      Limpiar
                    </Button>
                  )}
                </div>
              )}

              {/* Botón para ver mis leads (solo para usuarios sales/equipo) */}
              {isSalesUser && authState?.user?.codigo && (
                <div className="flex items-center gap-2">
                  <Badge variant={showingMyLeads ? "default" : "secondary"}>
                    {showingMyLeads ? "Mis Leads" : "Todos los Leads"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showingMyLeads) {
                        // Mostrar todos
                        reload("");
                      } else {
                        // Mostrar mis leads
                        reload(authState?.user?.codigo);
                      }
                    }}
                    className="gap-2"
                  >
                    {showingMyLeads ? (
                      <>
                        <List className="h-4 w-4" />
                        Ver Todos
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" />
                        Ver Mis Leads
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Indicador de sincronización de Google Calendar */}
            <div className="flex flex-col gap-2 mt-2">
              {calendarStatus.loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando calendario...</span>
                </div>
              ) : calendarStatus.connected ? (
                <>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200"
                    title={`Sincronizado con ${
                      calendarStatus.google_email || "Google Calendar"
                    }`}
                  >
                    {/* Icono de Google */}
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
                    {calendarStatus.google_email && (
                      <span className="text-xs opacity-75">
                        ({calendarStatus.google_email})
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleViewAvailability}
                    variant="outline"
                    size="sm"
                    className="gap-2 w-fit"
                  >
                    <Calendar className="h-4 w-4" />
                    Ver mis horas disponibles
                  </Button>
                </>
              ) : (
                <button
                  onClick={handleSyncCalendar}
                  disabled={syncingCalendar}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
                  title="Sincronizar con Google Calendar"
                >
                  {syncingCalendar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      {/* Icono de Google */}
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
            {/* Selector de campaña para métricas */}
            {leadOrigins.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <label className="text-sm font-medium text-slate-700">
                  Métricas de:
                </label>
                <select
                  className="h-8 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedCampaignForMetrics}
                  onChange={(e) =>
                    setSelectedCampaignForMetrics(e.target.value)
                  }
                >
                  <option value="all">Todas las campañas</option>
                  {leadOrigins.map((origin) => (
                    <option key={origin.codigo} value={origin.codigo}>
                      {origin.name || origin.codigo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Métricas dinámicas basadas en la campaña seleccionada */}
            <div className="flex gap-4 mt-3 flex-wrap items-center">
              {(() => {
                // Filtrar leads según la campaña seleccionada
                const filteredRows =
                  selectedCampaignForMetrics === "all"
                    ? rows
                    : rows.filter(
                        (r) => r.canal === selectedCampaignForMetrics
                      );

                // Calcular métricas
                const statusMetrics = filteredRows.reduce((acc, r) => {
                  const status = r.etapa || "sin etapa";
                  acc[status] = (acc[status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const campaignName =
                  selectedCampaignForMetrics === "all"
                    ? "Total"
                    : getOriginName(selectedCampaignForMetrics);

                return (
                  <>
                    <span className="text-sm font-semibold text-slate-700">
                      {campaignName}:
                    </span>
                    <span className="text-xs text-slate-600">
                      Total:{" "}
                      <span className="font-semibold text-blue-600">
                        {filteredRows.length}
                      </span>
                    </span>
                    {Object.entries(statusMetrics).map(([status, count]) => (
                      <span key={status} className="text-xs text-slate-600">
                        {status}: <span className="font-semibold">{count}</span>
                      </span>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreateLeadDialog onCreated={reload} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 overflow-y-auto bg-white">
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
                etapas={etapas}
                canales={canales}
                owners={owners}
                onClear={() => {
                  setQ("");
                  setEtapaFiltro("all");
                  setCanalFiltro("all");
                  setOwnerFiltro("all");
                }}
              />
              {/* Toggle de vista compacto con iconos, arriba a la derecha */}
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
                <div className="rounded-xl border bg-white">
                  <div className="grid grid-cols-11 gap-2 px-4 py-2 text-xs font-medium text-slate-600 border-b bg-slate-50/50">
                    <div className="col-span-3">Prospecto</div>
                    <div className="col-span-2">Contacto</div>
                    <div className="col-span-2">Canal</div>
                    <div className="col-span-2">Etapa</div>
                    <div className="col-span-2 text-right">Acción</div>
                  </div>
                  <div>
                    {filtrados.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        No hay leads para mostrar
                      </div>
                    ) : (
                      filtrados.map((p) => (
                        <div
                          key={p.id}
                          className="grid grid-cols-11 gap-2 px-4 py-3 border-b last:border-b-0 hover:bg-blue-50/30 transition-colors"
                        >
                          <div className="col-span-3 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium truncate text-slate-800"
                                title={p.nombre}
                              >
                                {p.nombre}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {p.pais || ""} {p.ciudad ? `· ${p.ciudad}` : ""}
                            </div>
                          </div>
                          <div className="col-span-2 min-w-0 text-xs">
                            <div className="truncate flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">{p.email || "—"}</span>
                            </div>
                            <div className="truncate flex items-center gap-1 mt-0.5">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">
                                {p.telefono || "—"}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2 text-xs flex items-center">
                            <span title={p.canal}>
                              {getOriginName(p.canal)}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <select
                              className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                              value={p.etapa}
                              disabled={stageUpdatingId === p.id}
                              onChange={async (e) => {
                                const nextEtapa = e.target.value;
                                const prevEtapa = p.etapa;
                                setStageUpdatingId(p.id);
                                // Optimista: reflejar cambio sin recargar
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.id === p.id
                                      ? { ...r, etapa: nextEtapa as any }
                                      : r
                                  )
                                );
                                try {
                                  await updateLead(p.id, {
                                    status: mapEtapaToLeadStatus(nextEtapa),
                                  });
                                  toast({
                                    title: "Etapa actualizada",
                                    description: nextEtapa,
                                  });
                                } catch (err) {
                                  // rollback
                                  setRows((prev) =>
                                    prev.map((r) =>
                                      r.id === p.id
                                        ? { ...r, etapa: prevEtapa as any }
                                        : r
                                    )
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
                              title="Cambiar etapa"
                            >
                              {etapas.map((e) => (
                                <option key={e} value={e}>
                                  {e}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Asignar lead ${p.nombre}`}
                                title="Asignar a usuario"
                                onClick={() => {
                                  setLeadToAssign({
                                    codigo: p.id,
                                    nombre: p.nombre,
                                  });
                                  setAssignModalOpen(true);
                                  loadAllUsers();
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                              <Link
                                href={`/admin/crm/booking/${encodeURIComponent(
                                  p.id
                                )}`}
                                aria-label={`Ver detalle de ${p.nombre}`}
                                title="Ver detalle"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                aria-label={`Eliminar lead ${p.nombre}`}
                                title="Eliminar lead"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: p.id,
                                    nombre: p.nombre,
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
                      `/admin/crm/booking/${encodeURIComponent(p.id)}`
                    )
                  }
                  onMoved={() => reload()}
                  onStageChange={async (id, newStage) => {
                    // Mapear la etapa del Kanban (pipeline) al status del lead
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
                      reload();
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
                    reload();
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
                  ownerId: null,
                  ownerNombre: "(Sin owner)",
                  pais: null,
                  ciudad: null,
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

      {/* Drawer deshabilitado */}

      <DeleteLeadConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        leadCodigo={deleteTarget?.id || ""}
        leadName={deleteTarget?.nombre || ""}
        onDeleted={reload}
      />

      {/* Modal de Disponibilidad del Calendario */}
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

      {/* Modal de Asignación de Lead */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Asignar Lead a Usuario</DialogTitle>
            <DialogDescription>
              {leadToAssign && `Asignando: ${leadToAssign.nombre}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Lista de usuarios */}
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
                        onClick={() => setSelectedUserForAssign(user.codigo)}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                          selectedUserForAssign === user.codigo
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
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
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <CrmContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
