"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  BarChart3,
  Loader2,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn, getSpanishApiError } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  getAllStudentsPaged,
  getAllCoachesFromTeams,
  getCoachStudentsByCoachId,
  type StudentRow,
} from "../api";
import {
  getPayments as getPaymentsGlobal,
  getPaymentCuotas,
  type PaymentCuotaRow,
} from "../../payments/api";
import { StatPill, CuotaChip } from "../StudentsContent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* =============== Helpers =============== */
function normalizeText(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR");
}

function stageLabel(stage?: string | null) {
  const s = String(stage ?? "")
    .trim()
    .toUpperCase();
  if (!s) return "—";
  return s;
}

const NO_TAG_FILTER = "Sin programa";

function normalizeTagKey(tag?: string | null) {
  return String(tag ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function canonicalTagLabel(tag?: string | null) {
  const normalized = normalizeTagKey(tag);
  if (!normalized) return "";
  if (normalized === "hotselling foundation") return "Hotselling Foundation";
  return String(tag ?? "").trim();
}

function getUniqueTags(rows: EnrichedRow[]) {
  const byKey = new Map<string, string>();
  for (const r of rows) {
    const normalized = normalizeTagKey(r.tag);
    if (!normalized) continue;
    if (!byKey.has(normalized)) {
      byKey.set(normalized, canonicalTagLabel(r.tag));
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

const PLAN_STATUSES = [
  "todos",
  "pagado",
  "pendiente",
  "en_proceso",
  "moroso",
  "vencido",
] as const;

type PlanStatusFilter = (typeof PLAN_STATUSES)[number];

type EnrichedRow = {
  code: string;
  name: string;
  team: string[];
  stage: string;
  state: string;
  joinDate: string | null;
  lastActivity: string | null;
  inactivityDays: number | null;
  contract: boolean;
  planMonto: number;
  planMoneda: string;
  planStatus: string;
  cuotasTotal: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  cuotasEnProceso: number;
  cuotasVencidas: number;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  nextDueOverdue: boolean;
  tag: string | null;
  raw: StudentRow;
};

/* =============== Componente =============== */
export default function VistaEnriquecidaContent() {
  const router = useRouter();
  const { user } = useAuth();

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const role = String(user.role ?? "").toLowerCase();
    return role === "admin";
  }, [user]);

  /* ---------- estado de datos ---------- */
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [rows, setRows] = useState<EnrichedRow[]>([]);

  /* ---------- filtros ---------- */
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string[]>([]);
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterTeam, setFilterTeam] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string[]>([]);
  const [filterPlanStatus, setFilterPlanStatus] =
    useState<PlanStatusFilter>("todos");
  const [filterInactividad, setFilterInactividad] = useState<
    "all" | "0-7" | "8-14" | "15-30" | "30+"
  >("all");
  const [filterVencidas, setFilterVencidas] = useState(false);
  const [filterPendientes, setFilterPendientes] = useState(false);
  const [filterSinEquipo, setFilterSinEquipo] = useState(false);

  /* ---------- vista ---------- */
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  /* ---------- export ---------- */
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1) Alumnos
      setProgress("Cargando alumnos…");
      const PAGE_SIZE = 1000;
      let students: StudentRow[] = [];
      let page = 1;
      let keep = true;
      while (keep) {
        const res = await getAllStudentsPaged({ page, pageSize: PAGE_SIZE });
        students = students.concat(res.items ?? []);
        if (res.totalPages != null) keep = page < res.totalPages;
        else keep = (res.items ?? []).length >= PAGE_SIZE;
        page++;
      }

      // 2) Pagos (planes)
      setProgress("Cargando planes de pago…");
      const paymentsByCode: Record<string, any[]> = {};
      try {
        let pPage = 1;
        let pKeep = true;
        while (pKeep) {
          const env = await getPaymentsGlobal({ page: pPage, pageSize: 1000 });
          const list: any[] = Array.isArray(env?.data) ? env.data : [];
          for (const p of list) {
            const cc = String(p?.cliente_codigo ?? "").trim();
            if (!cc) continue;
            (paymentsByCode[cc] ||= []).push(p);
          }
          if (env.totalPages != null) pKeep = pPage < env.totalPages;
          else pKeep = list.length >= 1000;
          pPage++;
        }
      } catch {}

      // 3) Cuotas
      setProgress("Cargando cuotas…");
      const cuotasByCode: Record<string, PaymentCuotaRow[]> = {};
      try {
        let cPage = 1;
        let cKeep = true;
        while (cKeep) {
          const env = await getPaymentCuotas({
            fechaDesde: "2020-01-01",
            fechaHasta: "2099-12-31",
            page: cPage,
            pageSize: 1000,
            background: true,
          });
          const list: PaymentCuotaRow[] = Array.isArray(env?.data)
            ? env.data
            : [];
          for (const c of list) {
            const cc = String(c?.cliente_codigo ?? "").trim();
            if (!cc) continue;
            (cuotasByCode[cc] ||= []).push(c);
          }
          if (env.totalPages != null) cKeep = cPage < env.totalPages;
          else cKeep = list.length >= 1000;
          cPage++;
        }
      } catch {}

      // 4) Equipos
      setProgress("Cargando equipos asignados…");
      const teamsByCode: Record<string, string[]> = {};
      try {
        const allCoaches = await getAllCoachesFromTeams();
        const concurrency = 6;
        let cursor = 0;
        const workers = Array.from(
          { length: Math.min(concurrency, allCoaches.length) },
          async () => {
            while (true) {
              const idx = cursor++;
              if (idx >= allCoaches.length) return;
              const cTeam = allCoaches[idx];
              const coachKey =
                (cTeam.codigo && String(cTeam.codigo).trim()) ||
                String(cTeam.id ?? "").trim();
              if (!coachKey) continue;
              try {
                const list = await getCoachStudentsByCoachId(coachKey);
                for (const r of list) {
                  const ac = String(r.alumno ?? "").trim();
                  if (!ac) continue;
                  if (!teamsByCode[ac]) teamsByCode[ac] = [];
                  if (cTeam.name && !teamsByCode[ac].includes(cTeam.name)) {
                    teamsByCode[ac].push(cTeam.name);
                  }
                }
              } catch {}
            }
          },
        );
        await Promise.all(workers);
      } catch {}

      // 5) Build rows
      setProgress("Procesando…");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const built: EnrichedRow[] = students.map((s) => {
        const code = String(s.code ?? s.id ?? "").trim();
        const teamFromMap = teamsByCode[code] ?? [];
        const teamFromStudent = (s.teamMembers ?? [])
          .map((tm) => String(tm?.name ?? "").trim())
          .filter(Boolean);
        const team = Array.from(
          new Set(teamFromMap.length > 0 ? teamFromMap : teamFromStudent),
        );

        const planList = (paymentsByCode[code] ?? []).slice().sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        const plan = planList[0] ?? null;

        const cs = cuotasByCode[code] ?? [];
        let pagadas = 0,
          pendientes = 0,
          enProceso = 0,
          vencidas = 0;
        let nextDueDate: string | null = null;
        let nextDueAmount: number | null = null;
        let nextDueIsOverdue = false;

        for (const c of cs) {
          const est = String(c.estatus ?? "")
            .toLowerCase()
            .trim();
          if (est === "pagado" || est === "pagada" || est === "paid") pagadas++;
          else if (est === "pendiente" || est === "pending") pendientes++;
          else if (
            est === "en_proceso" ||
            est === "en proceso" ||
            est === "in_progress"
          )
            enProceso++;
          else if (
            est === "vencido" ||
            est === "vencida" ||
            est === "overdue" ||
            est === "moroso"
          )
            vencidas++;

          // Próxima cuota: la pendiente / en_proceso / vencida con menor fecha_pago
          const isUnpaid = !(
            est === "pagado" ||
            est === "pagada" ||
            est === "paid"
          );
          if (isUnpaid && c.fecha_pago) {
            const d = new Date(c.fecha_pago);
            if (!Number.isNaN(d.getTime())) {
              const candIso = c.fecha_pago;
              if (
                nextDueDate == null ||
                new Date(candIso) < new Date(nextDueDate)
              ) {
                nextDueDate = candIso;
                nextDueAmount = c.monto != null ? Number(c.monto) : null;
                nextDueIsOverdue = d < today;
              }
            }
          }
        }

        return {
          code,
          name: s.name ?? "",
          team,
          stage: stageLabel(s.stage),
          state: String(s.state ?? "").trim(),
          joinDate: s.joinDate ?? null,
          lastActivity: s.lastActivity ?? null,
          inactivityDays:
            typeof s.inactivityDays === "number" ? s.inactivityDays : null,
          contract: !!s.contractUrl,
          planMonto: plan?.monto != null ? Number(plan.monto) : 0,
          planMoneda: plan?.moneda ?? "",
          planStatus: String(plan?.estatus ?? "").trim(),
          cuotasTotal:
            cs.length || (plan?.nro_cuotas ? Number(plan.nro_cuotas) : 0),
          cuotasPagadas: pagadas,
          cuotasPendientes: pendientes,
          cuotasEnProceso: enProceso,
          cuotasVencidas: vencidas,
          nextDueDate,
          nextDueAmount,
          nextDueOverdue: nextDueIsOverdue,
          tag: s.tag ?? null,
          raw: s,
        };
      });

      setRows(built);
    } catch (e) {
      toast({
        title: "No se pudo cargar la vista",
        description: getSpanishApiError(e, "Intenta de nuevo"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  // Cargar al entrar (sólo si autorizado)
  useEffect(() => {
    if (isAuthorized) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  /* ---------- opciones únicas ---------- */
  const uniqueStages = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.stage && r.stage !== "—" && set.add(r.stage));
    return Array.from(set).sort();
  }, [rows]);
  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.state && set.add(r.state));
    return Array.from(set).sort();
  }, [rows]);
  const uniqueTeams = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.team.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);
  const uniqueTags = useMemo(() => {
    const tags = getUniqueTags(rows);
    return [NO_TAG_FILTER, ...tags];
  }, [rows]);

  /* ---------- filtrado ---------- */
  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return rows.filter((r) => {
      if (q) {
        const hay =
          normalizeText(r.code) +
          " " +
          normalizeText(r.name) +
          " " +
          normalizeText(r.team.join(" ")) +
          " " +
          normalizeText(r.stage) +
          " " +
          normalizeText(r.state);
        if (!hay.includes(q)) return false;
      }
      if (filterStage.length > 0 && !filterStage.includes(r.stage))
        return false;
      if (filterState.length > 0 && !filterState.includes(r.state))
        return false;
      if (filterTeam.length > 0) {
        const matches = r.team.some((t) => filterTeam.includes(t));
        if (!matches) return false;
      }
      if (filterSinEquipo && r.team.length > 0) return false;
      if (filterTag.length > 0) {
        const tagKey = normalizeTagKey(r.tag);
        const tagMatches = filterTag.some((item) => {
          if (item === NO_TAG_FILTER) return !tagKey;
          return normalizeTagKey(item) === tagKey;
        });
        if (!tagMatches) return false;
      }
      if (filterVencidas && r.cuotasVencidas <= 0) return false;
      if (filterPendientes && r.cuotasPendientes + r.cuotasEnProceso <= 0)
        return false;
      if (filterPlanStatus !== "todos") {
        const ps = normalizeText(r.planStatus);
        if (filterPlanStatus === "pagado" && !ps.includes("pag")) return false;
        if (filterPlanStatus === "pendiente" && !ps.includes("pend"))
          return false;
        if (filterPlanStatus === "en_proceso" && !ps.includes("proc"))
          return false;
        if (filterPlanStatus === "moroso" && !ps.includes("moros"))
          return false;
        if (filterPlanStatus === "vencido" && !ps.includes("venc"))
          return false;
      }
      if (filterInactividad !== "all") {
        const i = r.inactivityDays ?? 0;
        if (filterInactividad === "0-7" && !(i >= 0 && i <= 7)) return false;
        if (filterInactividad === "8-14" && !(i >= 8 && i <= 14)) return false;
        if (filterInactividad === "15-30" && !(i >= 15 && i <= 30))
          return false;
        if (filterInactividad === "30+" && i <= 30) return false;
      }
      return true;
    });
  }, [
    rows,
    search,
    filterStage,
    filterState,
    filterTeam,
    filterTag,
    filterSinEquipo,
    filterVencidas,
    filterPendientes,
    filterPlanStatus,
    filterInactividad,
  ]);

  const totals = useMemo(() => {
    const t = {
      total: filtered.length,
      facturacion: 0,
      pagadas: 0,
      pendientes: 0,
      enProceso: 0,
      vencidas: 0,
      proxima7d: 0,
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);
    for (const r of filtered) {
      t.facturacion += r.planMonto;
      t.pagadas += r.cuotasPagadas;
      t.pendientes += r.cuotasPendientes;
      t.enProceso += r.cuotasEnProceso;
      t.vencidas += r.cuotasVencidas;
      if (r.nextDueDate) {
        const d = new Date(r.nextDueDate);
        if (d >= today && d <= in7) t.proxima7d++;
      }
    }
    return t;
  }, [filtered]);

  const hasActiveFilters =
    !!search ||
    filterStage.length > 0 ||
    filterState.length > 0 ||
    filterTeam.length > 0 ||
    filterTag.length > 0 ||
    filterSinEquipo ||
    filterVencidas ||
    filterPendientes ||
    filterPlanStatus !== "todos" ||
    filterInactividad !== "all";

  const resetFilters = () => {
    setSearch("");
    setFilterStage([]);
    setFilterState([]);
    setFilterTeam([]);
    setFilterTag([]);
    setFilterSinEquipo(false);
    setFilterVencidas(false);
    setFilterPendientes(false);
    setFilterPlanStatus("todos");
    setFilterInactividad("all");
  };

  /* ---------- export ---------- */
  const handleExport = async (format: "csv" | "xlsx") => {
    if (exporting || filtered.length === 0) return;
    setExporting(format);
    try {
      const COLUMNS = [
        "Código",
        "Nombre",
        "Equipo asignado",
        "Fase",
        "Estado",
        "Ingreso",
        "Última actividad",
        "Días inactividad",
        "Plan (monto)",
        "Plan (moneda)",
        "Estado plan",
        "Cuotas total",
        "Cuotas pagadas",
        "Cuotas pendientes",
        "Cuotas en proceso",
        "Cuotas vencidas",
        "Próxima cuota (fecha)",
        "Próxima cuota (monto)",
      ];
      const data = filtered.map((r) => ({
        Código: r.code,
        Nombre: r.name,
        "Equipo asignado": r.team.join(" | "),
        Fase: r.stage,
        Estado: r.state,
        Ingreso: fmtDate(r.joinDate),
        "Última actividad": fmtDate(r.lastActivity),
        "Días inactividad": r.inactivityDays ?? "",
        "Plan (monto)": r.planMonto || "",
        "Plan (moneda)": r.planMoneda,
        "Estado plan": r.planStatus,
        "Cuotas total": r.cuotasTotal || "",
        "Cuotas pagadas": r.cuotasPagadas || "",
        "Cuotas pendientes": r.cuotasPendientes || "",
        "Cuotas en proceso": r.cuotasEnProceso || "",
        "Cuotas vencidas": r.cuotasVencidas || "",
        "Próxima cuota (fecha)": fmtDate(r.nextDueDate),
        "Próxima cuota (monto)": r.nextDueAmount ?? "",
      }));
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `alumnos_vista_enriquecida_${stamp}`;

      if (format === "csv") {
        const escape = (v: any) => {
          const s = v == null ? "" : String(v);
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        };
        const csv = [
          COLUMNS.map(escape).join(","),
          ...data.map((row) =>
            COLUMNS.map((c) => escape((row as any)[c])).join(","),
          ),
        ].join("\n");
        const blob = new Blob(["\ufeff", csv], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(data, { header: COLUMNS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Alumnos");
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }
      toast({
        title: `Exportación lista`,
        description: `${data.length} alumnos`,
      });
    } catch (e) {
      toast({
        title: "No se pudo exportar",
        description: getSpanishApiError(e, "Intenta de nuevo"),
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  /* =============== Render =============== */
  if (!user) {
    return (
      <div className="min-h-screen p-8 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthorized) {
    return (
      <div className="min-h-screen p-8 grid place-items-center">
        <div className="max-w-md text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Acceso restringido</h1>
          <p className="text-muted-foreground text-sm">
            Esta vista está disponible únicamente para Atención al Cliente.
          </p>
          <Link href="/admin/alumnos">
            <Button variant="outline">Volver a Alumnos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-300">
              <Sparkles className="h-3.5 w-3.5" />
              Vista Mariana
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold">
              Vista Mariana · alumnos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Equipo asignado, estado de cuotas, próxima fecha de cobro y
              filtros avanzados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              disabled={loading}
              title="Recargar datos"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loading ? progress || "Cargando…" : "Actualizar"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={loading || filtered.length === 0 || !!exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => handleExport("xlsx")}
                  disabled={!!exporting}
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  disabled={!!exporting}
                >
                  <FileText className="h-4 w-4" /> CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <StatPill
            icon={<Users className="h-3.5 w-3.5" />}
            label="Alumnos"
            value={totals.total.toString()}
            tone="blue"
          />
          <StatPill
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Pagadas"
            value={totals.pagadas.toString()}
            tone="emerald"
          />
          <StatPill
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Pendientes"
            value={totals.pendientes.toString()}
            tone="blue"
          />
          <StatPill
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="En proceso"
            value={totals.enProceso.toString()}
            tone="amber"
          />
          <StatPill
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            label="Vencidas"
            value={totals.vencidas.toString()}
            tone="rose"
          />
          <StatPill
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Cobro 7 días"
            value={totals.proxima7d.toString()}
            tone="indigo"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Filtros avanzados
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={resetFilters}
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-10 rounded-xl"
                placeholder="Código, nombre, equipo, fase, estado…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ChipMultiSelect
            label="Fase"
            options={uniqueStages}
            value={filterStage}
            onChange={setFilterStage}
          />
          <ChipMultiSelect
            label="Estado"
            options={uniqueStates}
            value={filterState}
            onChange={setFilterState}
          />
          <ChipMultiSelect
            label="Equipo"
            options={uniqueTeams}
            value={filterTeam}
            onChange={setFilterTeam}
          />
          <ChipMultiSelect
            label="Programa"
            options={uniqueTags}
            value={filterTag}
            onChange={setFilterTag}
          />

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Plan de pago
            </label>
            <select
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
              value={filterPlanStatus}
              onChange={(e) =>
                setFilterPlanStatus(e.target.value as PlanStatusFilter)
              }
            >
              <option value="todos">Todos</option>
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="moroso">Moroso</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Inactividad
            </label>
            <select
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
              value={filterInactividad}
              onChange={(e) => setFilterInactividad(e.target.value as any)}
            >
              <option value="all">Cualquiera</option>
              <option value="0-7">0–7 días</option>
              <option value="8-14">8–14 días</option>
              <option value="15-30">15–30 días</option>
              <option value="30+">+30 días</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ToggleChip
            active={filterVencidas}
            onClick={() => setFilterVencidas((v) => !v)}
            tone="rose"
            icon={<AlertCircle className="h-3 w-3" />}
          >
            Con cuotas vencidas
          </ToggleChip>
          <ToggleChip
            active={filterPendientes}
            onClick={() => setFilterPendientes((v) => !v)}
            tone="blue"
            icon={<Clock className="h-3 w-3" />}
          >
            Con cuotas pendientes
          </ToggleChip>
          <ToggleChip
            active={filterSinEquipo}
            onClick={() => setFilterSinEquipo((v) => !v)}
            tone="amber"
            icon={<Users className="h-3 w-3" />}
          >
            Sin equipo asignado
          </ToggleChip>
        </div>
      </div>

      {/* Toolbar resultados */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {loading
            ? "Cargando…"
            : `${filtered.length} de ${rows.length} alumnos`}
        </p>
        <div className="inline-flex rounded-xl border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              viewMode === "cards"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted",
            )}
            title="Vista de tarjetas"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Tarjetas
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              viewMode === "table"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted",
            )}
            title="Vista de tabla"
          >
            <TableIcon className="h-3.5 w-3.5" />
            Tabla
          </button>
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 grid place-items-center text-sm text-muted-foreground">
          {rows.length === 0
            ? "Sin datos. Toca Actualizar."
            : "No hay alumnos que coincidan con los filtros."}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <AlumnoCard key={r.code || r.name} row={r} />
          ))}
        </div>
      ) : (
        <AlumnoTable rows={filtered} />
      )}
    </div>
  );
}

/* =============== Pieces =============== */

function ChipMultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
        {value.length > 0 && (
          <span className="ml-1 text-blue-600">({value.length})</span>
        )}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-left flex items-center justify-between"
        >
          <span className="truncate">
            {value.length === 0
              ? `Todos`
              : value.length === 1
                ? value[0]
                : `${value.length} seleccionados`}
          </span>
          {value.length > 0 && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          )}
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-border bg-popover shadow-lg p-1">
              {options.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  Sin opciones
                </div>
              ) : (
                options.map((opt) => {
                  const active = value.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? value.filter((v) => v !== opt)
                          : [...value, opt];
                        onChange(next);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center justify-between hover:bg-accent",
                        active &&
                          "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                      )}
                    >
                      <span className="truncate">{opt}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  tone,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "rose" | "blue" | "amber";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    rose: active
      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/40"
      : "ring-border text-muted-foreground hover:bg-rose-500/10",
    blue: active
      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/40"
      : "ring-border text-muted-foreground hover:bg-blue-500/10",
    amber: active
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/40"
      : "ring-border text-muted-foreground hover:bg-amber-500/10",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full ring-1 px-3 py-1 text-xs font-medium transition-colors",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function planStatusColor(s?: string) {
  const v = String(s ?? "").toLowerCase();
  if (v.includes("pag"))
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30";
  if (v.includes("venc") || v.includes("moros"))
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30";
  if (v.includes("proc") || v.includes("progres"))
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30";
  if (v.includes("pend"))
    return "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/30";
  return "bg-muted text-muted-foreground ring-border";
}

function AlumnoCard({ row: r }: { row: EnrichedRow }) {
  const pct =
    r.cuotasTotal > 0
      ? Math.min(100, Math.round((r.cuotasPagadas / r.cuotasTotal) * 100))
      : 0;

  return (
    <Link
      href={r.code ? `/admin/alumnos/${r.code}/perfil` : "#"}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all block"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/60 via-indigo-500/60 to-purple-500/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {r.name || "Sin nombre"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {r.code || "—"}
            </p>
          </div>
          {r.planStatus && (
            <span
              className={cn(
                "shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ring-1",
                planStatusColor(r.planStatus),
              )}
            >
              {r.planStatus}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {r.stage && r.stage !== "—" && (
            <Badge variant="secondary" className="text-[10px]">
              {r.stage}
            </Badge>
          )}
          {r.state && (
            <Badge variant="outline" className="text-[10px]">
              {r.state}
            </Badge>
          )}
          {r.contract && (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            >
              Contrato
            </Badge>
          )}
        </div>

        <div className="rounded-xl bg-muted/40 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <Users className="h-3 w-3" />
            Equipo asignado
          </div>
          {r.team.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin equipo</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {r.team.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {(r.planMonto > 0 || r.cuotasTotal > 0) && (
          <div className="rounded-xl border border-border p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <CreditCard className="h-3 w-3" />
                Plan de pago
              </div>
              {r.planMonto > 0 && (
                <span className="text-xs font-bold">
                  {r.planMoneda} {fmtMoney(r.planMonto)}
                </span>
              )}
            </div>

            {r.cuotasTotal > 0 && (
              <>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {r.cuotasPagadas}/{r.cuotasTotal} pagadas
                  </span>
                  <span>{pct}%</span>
                </div>
              </>
            )}

            <div className="grid grid-cols-4 gap-1 text-center">
              <CuotaChip
                icon={<CheckCircle2 className="h-3 w-3" />}
                tone="emerald"
                label="Pag."
                value={r.cuotasPagadas}
              />
              <CuotaChip
                icon={<Clock className="h-3 w-3" />}
                tone="blue"
                label="Pend."
                value={r.cuotasPendientes}
              />
              <CuotaChip
                icon={<Loader2 className="h-3 w-3" />}
                tone="amber"
                label="Proc."
                value={r.cuotasEnProceso}
              />
              <CuotaChip
                icon={<AlertCircle className="h-3 w-3" />}
                tone="rose"
                label="Venc."
                value={r.cuotasVencidas}
              />
            </div>
          </div>
        )}

        {r.nextDueDate && (
          <div
            className={cn(
              "rounded-xl border p-2.5 flex items-center gap-2",
              r.nextDueOverdue
                ? "border-rose-500/30 bg-rose-500/5"
                : "border-indigo-500/30 bg-indigo-500/5",
            )}
          >
            <Calendar
              className={cn(
                "h-4 w-4 shrink-0",
                r.nextDueOverdue
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-indigo-600 dark:text-indigo-400",
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {r.nextDueOverdue ? "Cuota vencida" : "Próxima cuota"}
              </div>
              <div className="text-sm font-semibold">
                {fmtDate(r.nextDueDate)}
                {r.nextDueAmount != null && r.nextDueAmount > 0 && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    {r.planMoneda || ""} {fmtMoney(r.nextDueAmount)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
          <span>Ingreso: {fmtDate(r.joinDate)}</span>
          <span
            className={cn(
              (r.inactivityDays ?? 0) > 14
                ? "text-rose-600 dark:text-rose-300 font-semibold"
                : "",
            )}
          >
            Inactivo: {r.inactivityDays ?? 0}d
          </span>
        </div>
      </div>
    </Link>
  );
}

function AlumnoTable({ rows }: { rows: EnrichedRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Alumno</th>
              <th className="text-left px-3 py-2 font-semibold">Equipo</th>
              <th className="text-left px-3 py-2 font-semibold">Fase</th>
              <th className="text-left px-3 py-2 font-semibold">Estado</th>
              <th className="text-left px-3 py-2 font-semibold">Plan</th>
              <th
                className="text-center px-2 py-2 font-semibold"
                title="Pagadas"
              >
                Pag.
              </th>
              <th
                className="text-center px-2 py-2 font-semibold"
                title="Pendientes"
              >
                Pend.
              </th>
              <th
                className="text-center px-2 py-2 font-semibold"
                title="En proceso"
              >
                Proc.
              </th>
              <th
                className="text-center px-2 py-2 font-semibold"
                title="Vencidas"
              >
                Venc.
              </th>
              <th className="text-left px-3 py-2 font-semibold">
                Pr&oacute;xima cuota
              </th>
              <th className="text-right px-3 py-2 font-semibold">Inact.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr
                key={r.code || r.name}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-3 py-2">
                  <Link
                    href={r.code ? `/admin/alumnos/${r.code}/perfil` : "#"}
                    className="block"
                  >
                    <div className="font-medium text-foreground">
                      {r.name || "Sin nombre"}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {r.code || "&mdash;"}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {r.team.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      &mdash;
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {r.team.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-medium"
                        >
                          {t}
                        </span>
                      ))}
                      {r.team.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{r.team.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{r.stage}</td>
                <td className="px-3 py-2 text-xs">{r.state || "&mdash;"}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {r.planMonto > 0 ? (
                    <span>
                      {r.planMoneda} {fmtMoney(r.planMonto)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                  {r.planStatus && (
                    <span
                      className={cn(
                        "ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ring-1",
                        planStatusColor(r.planStatus),
                      )}
                    >
                      {r.planStatus}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {r.cuotasPagadas || 0}
                </td>
                <td className="px-2 py-2 text-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {r.cuotasPendientes || 0}
                </td>
                <td className="px-2 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {r.cuotasEnProceso || 0}
                </td>
                <td className="px-2 py-2 text-center text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {r.cuotasVencidas || 0}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {r.nextDueDate ? (
                    <span
                      className={cn(
                        r.nextDueOverdue &&
                          "text-rose-600 dark:text-rose-300 font-semibold",
                      )}
                    >
                      {fmtDate(r.nextDueDate)}
                      {r.nextDueAmount != null && r.nextDueAmount > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({fmtMoney(r.nextDueAmount)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right text-xs",
                    (r.inactivityDays ?? 0) > 14 &&
                      "text-rose-600 dark:text-rose-300 font-semibold",
                  )}
                >
                  {r.inactivityDays ?? 0}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
