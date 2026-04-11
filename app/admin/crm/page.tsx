"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  Phone,
  PieChart,
  Search,
  SlidersHorizontal,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { crmAutomations } from "@/lib/crm-service";
import { apiFetch } from "@/lib/api-config";
import { cn } from "@/lib/utils";

import { type Lead, listLeads } from "./api";
import { CrmTabsLayout, CrmTabsList } from "./components/TabsLayout";
import { CreateLeadDialog } from "./components/CreateLeadDialog";
import { DeleteLeadConfirmDialog } from "./components/DeleteLeadConfirmDialog";
import { MetricsOverview } from "./components/MetricsOverview";
import { MetricsTabs } from "./components/MetricsTabs";
import { ProspectFilters } from "./components/ProspectFilters";
import { LeadQuestionsDrawer } from "./components/LeadQuestionsDrawer";
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
  instagramUser: string | null;
  monthlyBudget: string | null;
  mainObstacle: string | null;
  inviteOthers: string | null;
  closerName: string | null;
  saleNotes: string | null;
  detallePreguntasHubspot: Lead["detalle_preguntas_hubspot"] | null;
  remote?: boolean;
  pipelineStatus: string | null;
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

const MAX_LEADS_FETCH = 5000;
const DEFAULT_PIPELINE_PAGE_SIZE = 25;
const PIPELINE_PAGE_SIZE_OPTIONS = [25, 50, 100, 250] as const;
const CRM_FILTERS_STORAGE_KEY = "crm:pipeline-filters:v1";

type CrmStoredFilters = {
  q?: string;
  emailQ?: string;
  phoneQ?: string;
  questionsQ?: string;
  closerFiltro?: string;
  combinedEtapaFiltro?: string;
  createdFrom?: string;
  createdTo?: string;
  view?: "lista" | "kanban";
  activeTab?: string;
  pipelinePageSize?: number;
};

function readStoredCrmFilters(): CrmStoredFilters {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CRM_FILTERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CrmStoredFilters;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

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
  instagramUser:
    lead.detalle_preguntas_hubspot?.instagram_user?.respuesta ??
    (lead.instagram_user != null ? String(lead.instagram_user) : null),
  monthlyBudget:
    lead.detalle_preguntas_hubspot?.monthly_budget?.respuesta ??
    (lead.monthly_budget != null ? String(lead.monthly_budget) : null),
  mainObstacle:
    lead.detalle_preguntas_hubspot?.main_obstacle?.respuesta ??
    (lead.main_obstacle != null ? String(lead.main_obstacle) : null),
  inviteOthers:
    lead.detalle_preguntas_hubspot?.invite_others?.respuesta ??
    (lead.invite_others != null ? String(lead.invite_others) : null),
  closerName:
    lead.detalle_preguntas_hubspot?.closer_name?.respuesta ??
    (lead.closer_name != null ? String(lead.closer_name) : null),
  saleNotes:
    lead.detalle_preguntas_hubspot?.sale_notes?.respuesta ??
    (lead.sale_notes != null ? String(lead.sale_notes) : null),
  detallePreguntasHubspot: lead.detalle_preguntas_hubspot ?? null,
  remote: Boolean((lead as any)?.remote),
  pipelineStatus: (lead as any)?.pipeline_status ?? null,
});

function normalizeQuestionText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function getProspectQuestionSearchText(prospect: Prospect): string {
  return [
    prospect.mainObstacle,
    prospect.monthlyBudget,
    prospect.instagramUser,
    prospect.inviteOthers,
    prospect.closerName,
    prospect.saleNotes,
    prospect.detallePreguntasHubspot?.main_obstacle?.pregunta_original,
    prospect.detallePreguntasHubspot?.monthly_budget?.pregunta_original,
    prospect.detallePreguntasHubspot?.instagram_user?.pregunta_original,
    prospect.detallePreguntasHubspot?.invite_others?.pregunta_original,
    prospect.detallePreguntasHubspot?.closer_name?.pregunta_original,
    prospect.detallePreguntasHubspot?.sale_notes?.pregunta_original,
  ]
    .map((value) => normalizeQuestionText(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .padEnd(2, "·");

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
  const userCodigo = authState?.user?.codigo ?? "";
  const initialFiltersRef = useRef<CrmStoredFilters>(readStoredCrmFilters());

  const ownerFilterRef = useRef<string>("");

  const [rows, setRows] = useState<Prospect[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [salesUsers, setSalesUsers] = useState<UserSummary[]>([]);

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

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  const [q, setQ] = useState(() =>
    typeof initialFiltersRef.current.q === "string"
      ? initialFiltersRef.current.q
      : "",
  );
  const [emailQ, setEmailQ] = useState(() =>
    typeof initialFiltersRef.current.emailQ === "string"
      ? initialFiltersRef.current.emailQ
      : "",
  );
  const [phoneQ, setPhoneQ] = useState(() =>
    typeof initialFiltersRef.current.phoneQ === "string"
      ? initialFiltersRef.current.phoneQ
      : "",
  );
  const [questionsQ, setQuestionsQ] = useState(() =>
    typeof initialFiltersRef.current.questionsQ === "string"
      ? initialFiltersRef.current.questionsQ
      : "",
  );
  const [view, setView] = useState<"lista" | "kanban">(() =>
    initialFiltersRef.current.view === "kanban" ? "kanban" : "lista",
  );
  const [closerFiltro, setCloserFiltro] = useState<string>(() =>
    typeof initialFiltersRef.current.closerFiltro === "string" &&
    initialFiltersRef.current.closerFiltro
      ? initialFiltersRef.current.closerFiltro
      : "all",
  );
  const [combinedEtapaFiltro, setCombinedEtapaFiltro] = useState<string>(() =>
    typeof initialFiltersRef.current.combinedEtapaFiltro === "string" &&
    initialFiltersRef.current.combinedEtapaFiltro
      ? initialFiltersRef.current.combinedEtapaFiltro
      : "all",
  );
  const [createdFrom, setCreatedFrom] = useState<string>(() =>
    typeof initialFiltersRef.current.createdFrom === "string"
      ? initialFiltersRef.current.createdFrom
      : "",
  );
  const [createdTo, setCreatedTo] = useState<string>(() =>
    typeof initialFiltersRef.current.createdTo === "string"
      ? initialFiltersRef.current.createdTo
      : "",
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() =>
    typeof initialFiltersRef.current.activeTab === "string" &&
    initialFiltersRef.current.activeTab
      ? initialFiltersRef.current.activeTab
      : "pipeline",
  );
  const [selectedLeadQuestionsCode, setSelectedLeadQuestionsCode] = useState<
    string | null
  >(null);
  const [pipelinePage, setPipelinePage] = useState<number>(1);
  const [pipelinePageSize, setPipelinePageSize] = useState<number>(() =>
    typeof initialFiltersRef.current.pipelinePageSize === "number" &&
    PIPELINE_PAGE_SIZE_OPTIONS.includes(
      initialFiltersRef.current
        .pipelinePageSize as (typeof PIPELINE_PAGE_SIZE_OPTIONS)[number],
    )
      ? initialFiltersRef.current.pipelinePageSize
      : DEFAULT_PIPELINE_PAGE_SIZE,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: CrmStoredFilters = {
      q,
      emailQ,
      phoneQ,
      questionsQ,
      closerFiltro,
      combinedEtapaFiltro,
      createdFrom,
      createdTo,
      view,
      activeTab,
      pipelinePageSize,
    };

    window.localStorage.setItem(
      CRM_FILTERS_STORAGE_KEY,
      JSON.stringify(payload),
    );
  }, [
    q,
    emailQ,
    phoneQ,
    questionsQ,
    closerFiltro,
    combinedEtapaFiltro,
    createdFrom,
    createdTo,
    view,
    activeTab,
    pipelinePageSize,
  ]);

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
    try {
      const users = await fetchUsers();
      const filtered = users.filter((user) =>
        ["sales", "equipo", "admin"].includes(String(user.role ?? "")),
      );
      setSalesUsers(filtered);
    } catch (error) {
      console.error("Error al cargar usuarios de ventas", error);
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

  const reload = useCallback(
    async (owner?: string) => {
      const ownerCode = owner ?? ownerFilterRef.current ?? "";
      ownerFilterRef.current = ownerCode || "";
      setLoadingLeads(true);
      try {
        const response = await listLeads({
          page: 1,
          owner: ownerCode ? String(ownerCode) : undefined,
          pageSize: MAX_LEADS_FETCH,
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
    if (isAdmin) {
      loadSalesUsers();
    }
  }, [isAdmin, loadSalesUsers, reload]);

  const filtrados = useMemo(() => {
    return rows.filter((prospect) => {
      const normalizedSearch = q.trim().toLowerCase();
      const normalizedEmail = emailQ.trim().toLowerCase();
      const normalizedPhone = phoneQ.trim().toLowerCase();
      const normalizedQuestionsSearch = questionsQ.trim().toLowerCase();
      const matchesSearch = q.trim()
        ? [prospect.nombre]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(normalizedSearch),
            )
        : true;
      const matchesEmail = normalizedEmail
        ? String(prospect.email ?? "")
            .toLowerCase()
            .includes(normalizedEmail)
        : true;
      const matchesPhone = normalizedPhone
        ? String(prospect.telefono ?? "")
            .toLowerCase()
            .includes(normalizedPhone)
        : true;
      const matchesQuestions = normalizedQuestionsSearch
        ? getProspectQuestionSearchText(prospect).includes(
            normalizedQuestionsSearch,
          )
        : true;
      const matchesCloser =
        closerFiltro === "all" ||
        String(prospect.closerName ?? "") === closerFiltro;
      const [combinedPrefix, combinedValue] =
        combinedEtapaFiltro !== "all"
          ? combinedEtapaFiltro.split(":")
          : [null, null];
      const matchesStage =
        combinedEtapaFiltro === "all" ||
        (combinedPrefix === "etapa" && prospect.etapa === combinedValue) ||
        (combinedPrefix === "pipeline" &&
          String(prospect.pipelineStatus ?? "") === combinedValue);

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
        matchesEmail &&
        matchesPhone &&
        matchesQuestions &&
        matchesCloser &&
        matchesStage &&
        matchesDate
      );
    });
  }, [
    rows,
    q,
    emailQ,
    phoneQ,
    questionsQ,
    closerFiltro,
    combinedEtapaFiltro,
    createdFrom,
    createdTo,
  ]);

  const pipelineTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filtrados.length / pipelinePageSize)),
    [filtrados.length, pipelinePageSize],
  );

  const paginatedFiltrados = useMemo(() => {
    const start = (pipelinePage - 1) * pipelinePageSize;
    return filtrados.slice(start, start + pipelinePageSize);
  }, [filtrados, pipelinePage, pipelinePageSize]);

  useEffect(() => {
    setPipelinePage(1);
  }, [
    q,
    emailQ,
    phoneQ,
    questionsQ,
    closerFiltro,
    combinedEtapaFiltro,
    createdFrom,
    createdTo,
  ]);

  useEffect(() => {
    setPipelinePage((prev) => Math.min(prev, pipelineTotalPages));
  }, [pipelineTotalPages]);

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
      const displayName =
        normalizeQuestionText(row.closerName) ||
        salesUsers.find((user) => user.codigo === row.ownerCodigo)?.name ||
        row.ownerCodigo ||
        "(Sin closer)";
      const key = displayName;
      if (!store.has(key)) {
        store.set(key, {
          ownerId: row.ownerCodigo ?? null,
          ownerNombre: displayName,
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
  }, [rows, salesUsers]);

  const closers = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => normalizeQuestionText(row.closerName))
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

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

  const activeFilterCount = useMemo(() => {
    return [
      q,
      emailQ,
      phoneQ,
      questionsQ,
      closerFiltro !== "all" ? closerFiltro : "",
      combinedEtapaFiltro !== "all" ? combinedEtapaFiltro : "",
      createdFrom,
      createdTo,
    ].filter(Boolean).length;
  }, [
    q,
    emailQ,
    phoneQ,
    questionsQ,
    closerFiltro,
    combinedEtapaFiltro,
    createdFrom,
    createdTo,
  ]);

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

      <div className="relative border-b px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-white via-indigo-50/50 to-sky-50/50 overflow-hidden">
        <div className="relative flex flex-wrap items-center gap-1.5 sm:gap-3">
          {/* Título */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white/70 text-indigo-500 shadow-inner ring-1 ring-white/60">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </span>
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900">
              CRM
            </h1>
          </div>

          {/* Tabs */}
          <CrmTabsList
            value={activeTab}
            onValueChange={setActiveTab}
            hasCampanas={false}
          />

          {/* Acciones */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            <CreateLeadDialog
              onCreated={() => {
                void reload(ownerFilterRef.current || undefined);
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="px-2 sm:px-4 py-1 sm:py-2 border-b bg-white/50">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white border border-slate-200/70 shadow-sm"
            >
              <div
                className={`p-1 sm:p-1.5 rounded-md bg-gradient-to-br ${stat.accent}`}
              >
                <stat.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-2 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-100/80">
        <CrmTabsLayout
          value={activeTab}
          onValueChange={setActiveTab}
          externalTabs
          pipeline={
            <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
              <div className="lg:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMobileFiltersOpen((prev) => !prev)}
                  className="h-9 w-full justify-between border-slate-200 bg-white text-slate-700 shadow-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                    Filtros
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
                        {activeFilterCount}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-slate-500">
                      {mobileFiltersOpen ? "Ocultar" : "Mostrar"}
                    </span>
                  </span>
                </Button>
              </div>

              <div
                className={cn(
                  "overflow-y-auto lg:block lg:w-52 lg:flex-shrink-0",
                  mobileFiltersOpen ? "block" : "hidden",
                )}
              >
                <ProspectFilters
                  q={q}
                  setQ={setQ}
                  emailQ={emailQ}
                  setEmailQ={setEmailQ}
                  phoneQ={phoneQ}
                  setPhoneQ={setPhoneQ}
                  questionsQ={questionsQ}
                  setQuestionsQ={setQuestionsQ}
                  closer={closerFiltro}
                  setCloser={setCloserFiltro}
                  combinedEtapa={combinedEtapaFiltro}
                  setCombinedEtapa={setCombinedEtapaFiltro}
                  createdFrom={createdFrom}
                  setCreatedFrom={setCreatedFrom}
                  createdTo={createdTo}
                  setCreatedTo={setCreatedTo}
                  closers={closers}
                  onClear={() => {
                    setQ("");
                    setEmailQ("");
                    setPhoneQ("");
                    setQuestionsQ("");
                    setCloserFiltro("all");
                    setCombinedEtapaFiltro("all");
                    setCreatedFrom("");
                    setCreatedTo("");
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span>
                      Mostrando {paginatedFiltrados.length} de{" "}
                      {filtrados.length} leads
                    </span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <label className="inline-flex items-center gap-1">
                      <span>Por página</span>
                      <select
                        className="h-6 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 focus:outline-none"
                        value={pipelinePageSize}
                        onChange={(event) => {
                          const size = Number(event.target.value);
                          setPipelinePageSize(size);
                          setPipelinePage(1);
                        }}
                      >
                        {PIPELINE_PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPipelinePage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={pipelinePage <= 1}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[78px] text-center text-[11px] font-medium text-slate-700">
                        Página {pipelinePage} / {pipelineTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPipelinePage((prev) =>
                            Math.min(pipelineTotalPages, prev + 1),
                          )
                        }
                        disabled={pipelinePage >= pipelineTotalPages}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setView("lista")}
                      className={`px-2 py-1 text-slate-600 hover:bg-slate-50 ${
                        view === "lista"
                          ? "bg-blue-600 text-white hover:bg-blue-600"
                          : ""
                      }`}
                      title="Vista de lista"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("kanban")}
                      className={`px-2 py-1 text-slate-600 hover:bg-slate-50 border-l border-slate-200 ${
                        view === "kanban"
                          ? "bg-blue-600 text-white hover:bg-blue-600"
                          : ""
                      }`}
                      title="Vista Kanban"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {view === "lista" ? (
                  <div className="rounded-xl border border-slate-200/70 bg-white/90 shadow-sm flex-1 overflow-hidden">
                    <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-semibold text-slate-600 border-b bg-gradient-to-r from-slate-50 via-blue-50/60 to-slate-50 uppercase tracking-wide">
                      <div className="col-span-4">Prospecto</div>
                      <div className="col-span-3">Contacto</div>
                      <div className="col-span-3">Closer</div>
                      {/* <div className="col-span-2">Canal</div> */}
                      {/* <div className="col-span-1">Etapa</div> */}
                      <div className="col-span-2 text-right">Acción</div>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(100vh-240px)]">
                      {loadingLeads ? (
                        <div className="flex items-center justify-center py-6 text-xs text-slate-500">
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Cargando leads...
                        </div>
                      ) : filtrados.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No hay leads para mostrar
                        </div>
                      ) : (
                        paginatedFiltrados.map((prospect) => (
                          <div
                            key={prospect.id}
                            className="border-b last:border-b-0 bg-white/80 even:bg-slate-50/70 hover:bg-blue-50/50 transition-colors p-3 md:grid md:grid-cols-12 md:gap-2 md:px-3 md:py-1"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3 md:hidden">
                              <div className="flex min-w-0 items-center gap-2">
                                <div
                                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700"
                                  aria-hidden
                                >
                                  {getInitials(prospect.nombre)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/admin/crm/booking/${encodeURIComponent(prospect.id)}`}
                                      className="truncate text-sm font-semibold text-slate-800 hover:text-indigo-600 hover:underline"
                                      title={`Abrir detalle de ${prospect.nombre}`}
                                    >
                                      {prospect.nombre}
                                    </Link>
                                    {prospect.remote ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] px-1 py-0 bg-indigo-50 text-indigo-600 border-indigo-200"
                                      >
                                        Remoto
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                    <StageBadge stage={prospect.etapa} />
                                    {prospect.canal ? (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                        {prospect.canal}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-4 min-w-0 md:mb-0">
                              <div className="hidden md:flex items-center gap-2 min-w-0">
                                <div
                                  className="hidden sm:flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-700"
                                  aria-hidden
                                >
                                  {getInitials(prospect.nombre)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <Link
                                      href={`/admin/crm/booking/${encodeURIComponent(prospect.id)}`}
                                      className="text-xs font-medium truncate text-slate-800 hover:text-indigo-600 hover:underline"
                                      title={`Abrir detalle de ${prospect.nombre}`}
                                    >
                                      {prospect.nombre}
                                    </Link>
                                    {prospect.remote ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] px-1 py-0 bg-indigo-50 text-indigo-600 border-indigo-200"
                                      >
                                        Remoto
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {[prospect.pais, prospect.ciudad]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1.5 md:hidden">
                                <div className="text-[11px] text-slate-500">
                                  {[prospect.pais, prospect.ciudad]
                                    .filter(Boolean)
                                    .join(" · ") || "Sin ubicación"}
                                </div>
                                <div className="grid gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 text-[11px] text-slate-600">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                                    <span className="truncate">
                                      {prospect.email || "Sin email"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Phone className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                                    <span className="truncate">
                                      {prospect.telefono || "Sin teléfono"}
                                    </span>
                                  </div>
                                </div>
                                <div className="rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-[11px] text-slate-600">
                                  <span className="font-medium text-slate-700">
                                    Closer:
                                  </span>{" "}
                                  {prospect.closerName || "Sin closer"}
                                </div>
                              </div>
                            </div>

                            <div className="hidden md:block col-span-3 min-w-0 text-[10px] space-y-0.5">
                              <div className="flex items-center gap-1 truncate text-slate-600">
                                <Mail className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                                <span className="truncate">
                                  {prospect.email || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 truncate text-slate-600">
                                <Phone className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                                <span className="truncate">
                                  {prospect.telefono || "—"}
                                </span>
                              </div>
                            </div>

                            <div className="hidden md:flex col-span-3 min-w-0 items-center">
                              <div
                                className="truncate text-[10px] text-slate-700 w-full"
                                title={prospect.closerName || "Sin closer"}
                              >
                                {prospect.closerName || (
                                  <span className="text-slate-400 italic">
                                    Sin closer
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* <div className="col-span-2 text-[10px] flex items-center">Canal</div> */}
                            {/* <div className="col-span-1 flex items-center">Etapa</div> */}

                            <div className="col-span-2 flex items-center justify-end pt-3 md:pt-0">
                              <div className="flex w-full items-center justify-between gap-1 md:w-auto md:justify-end">
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
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Ver respuestas de ${prospect.nombre}`}
                                  title="Ver respuestas"
                                  onClick={() =>
                                    setSelectedLeadQuestionsCode(prospect.id)
                                  }
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                >
                                  <User className="h-3.5 w-3.5" />
                                </button>
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
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
                    items={paginatedFiltrados.map((p) => ({
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
                    allowStageChange={false}
                  />
                )}
              </div>
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
                  ownerNombre:
                    normalizeQuestionText(p.closerName) ||
                    salesUsers.find((user) => user.codigo === p.ownerCodigo)
                      ?.name ||
                    p.ownerCodigo ||
                    "(Sin closer)",
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
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
                KPIs exactos pendientes para la pestaña de métricas: tasa de
                cierre, ventas en llamada, ventas en seguimiento, clientes por
                producto, reservas, revenue mensual por closer y leads en
                seguimiento.
              </div>
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

      <LeadQuestionsDrawer
        open={!!selectedLeadQuestionsCode}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadQuestionsCode(null);
        }}
        leadCode={selectedLeadQuestionsCode}
      />

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
                          <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-slate-700">
                            {getInitials(user.name)}
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
