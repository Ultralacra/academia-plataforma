"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import {
  BUSINESS_FORMULAS,
  buildBusinessSeedState,
  buildFormulaVariables,
  calculateBusinessKpis,
  calculateBusinessSummary,
  canAccessBusinessMetrics,
  evaluateBusinessFormula,
  evaluateFormulaOverRecords,
  normalizeBusinessState,
  slugifyCustomKey,
  sortBusinessExpenses,
  sortBusinessRecords,
  validateCustomFieldKey,
  type BusinessExpenseEntry,
  type BusinessMetricsState,
  type BusinessMonthRecord,
  type CustomFieldDef,
  type CustomFieldTarget,
  type CustomFieldType,
  type CustomFormulaDef,
  type CustomFormulaFormat,
} from "@/lib/business-metrics";
import {
  AlertTriangle,
  Activity,
  BarChart2,
  Calculator,
  Check,
  DollarSign,
  LineChart,
  Lock,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Settings,
  Sigma,
  TrendingDown,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { X } from "lucide-react";

const EMPTY_MONTH_FORM: BusinessMonthRecord = {
  id: "",
  month: "",
  ads: 0,
  closerCommissions: 0,
  carlaBonus: 0,
  bonos: 0,
  newClients: 0,
  highTicketRevenue: 0,
  delinquencyRate: 0.1,
  highTicketClients: 0,
  activeStudents: 0,
  durationMonths: 4,
  churnRate: 0.25,
  operatingCostMonthly: 0,
  roicOperationalCost: 0,
  marketingSalesCost: 0,
  notes: "",
  extra: {},
};

const EMPTY_EXPENSE_FORM: BusinessExpenseEntry = {
  id: "",
  month: "",
  scope: "operativo",
  category: "",
  amount: 0,
  note: "",
  extra: {},
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatMonthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function parseNumericInput(value: string) {
  const normalized = value.replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const BM_SESSION_KEY = "bm-vault-auth";
const BM_VAULT_PASSWORD_DEFAULT = "JJWEPNTLDIJE";

// ── Componentes auxiliares: edición inline de cabeceras y celdas ─────────
function EditableHeader({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          if (trimmed && trimmed !== value) onChange(trimmed);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 text-xs font-medium"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click para editar el título"
      className="inline-flex items-center gap-1 w-full text-left hover:underline decoration-dotted underline-offset-2 group"
    >
      <span>{value}</span>
      <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

function EditableCurrencyCell({
  value,
  onChange,
  format,
}: {
  value: number;
  onChange: (next: number) => void;
  format: (n: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || 0));
  useEffect(() => {
    setDraft(String(value || 0));
  }, [value]);
  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = Number(draft.replace(/,/g, "."));
          const safe = Number.isFinite(next) ? next : 0;
          if (safe !== value) onChange(safe);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(String(value || 0));
            setEditing(false);
          }
        }}
        className="h-7 w-28 text-sm"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click para editar el valor"
      className="inline-flex items-center gap-1 text-left hover:underline decoration-dotted underline-offset-2 group"
    >
      <span>{format(value || 0)}</span>
      <Pencil className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

function EditableNumberCell({
  value,
  onChange,
  format,
  step,
}: {
  value: number;
  onChange: (next: number) => void;
  format?: (n: number) => string;
  step?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? 0));
  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);
  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = Number(draft.replace(/,/g, "."));
          const safe = Number.isFinite(next) ? next : 0;
          if (safe !== value) onChange(safe);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(String(value ?? 0));
            setEditing(false);
          }
        }}
        className="h-7 w-24 text-sm"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click para editar el valor"
      className="inline-flex items-center gap-1 text-left hover:underline decoration-dotted underline-offset-2 group"
    >
      <span>{format ? format(value ?? 0) : String(value ?? 0)}</span>
      <Pencil className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

function BusinessMetricsContent() {
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<BusinessMetricsState>(() =>
    normalizeBusinessState(buildBusinessSeedState()),
  );
  const [metaId, setMetaId] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");

  const [monthForm, setMonthForm] =
    useState<BusinessMonthRecord>(EMPTY_MONTH_FORM);
  const [expenseForm, setExpenseForm] =
    useState<BusinessExpenseEntry>(EMPTY_EXPENSE_FORM);
  const [editingMonthId, setEditingMonthId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("graficos");
  const [secondaryAuthed, setSecondaryAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSaveRef = useRef(false);
  const metaIdRef = useRef<string | null>(null);
  const [importingSnapshot, setImportingSnapshot] = useState(false);
  const [importedFields, setImportedFields] = useState<string[]>([]);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  // ── Auto-admin: formularios de campos / fórmulas / clave ─────────────────
  const [fieldDraft, setFieldDraft] = useState<CustomFieldDef>({
    key: "",
    label: "",
    type: "number",
    target: "record",
    showInTable: true,
  });
  const [fieldEditingKey, setFieldEditingKey] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [formulaDraft, setFormulaDraft] = useState<CustomFormulaDef>({
    key: "",
    label: "",
    expression: "",
    format: "currency",
    showInOverview: true,
  });
  const [formulaEditingKey, setFormulaEditingKey] = useState<string | null>(
    null,
  );
  const [formulaError, setFormulaError] = useState<string | null>(null);

  const [vaultDraft, setVaultDraft] = useState("");
  const [vaultSavedFlash, setVaultSavedFlash] = useState(false);

  // ── Edición inline de etiquetas de columnas y campos numéricos ──────────
  const columnLabels = state.columnLabels ?? {};
  const getColumnLabel = useCallback(
    (key: string, fallback: string) => columnLabels[key] ?? fallback,
    [columnLabels],
  );
  const setColumnLabel = useCallback((key: string, label: string) => {
    setState((current) => ({
      ...current,
      columnLabels: { ...(current.columnLabels ?? {}), [key]: label },
    }));
  }, []);
  const updateRecordField = useCallback(
    (recordId: string, patch: Partial<BusinessMonthRecord>) => {
      setState((current) => ({
        ...current,
        records: current.records.map((r) =>
          r.id === recordId ? { ...r, ...patch } : r,
        ),
      }));
    },
    [],
  );

  useEffect(() => {
    if (sessionStorage.getItem(BM_SESSION_KEY) === "1") {
      setSecondaryAuthed(true);
    }
  }, []);

  const handleVaultLogin = () => {
    const expected =
      (state.vaultPassword || "").trim() || BM_VAULT_PASSWORD_DEFAULT;
    if (pwInput === expected) {
      sessionStorage.setItem(BM_SESSION_KEY, "1");
      setSecondaryAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  // Carga desde backend al autenticarse
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    async function load() {
      setLoadingMeta(true);
      try {
        const token = getAuthToken();
        const res = await fetch(
          "/api/metadata?entity=business_metrics_state&entity_id=global",
          {
            headers: { Authorization: `Bearer ${token ?? ""}` },
            cache: "no-store",
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json().catch(() => null);
        const items: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.items)
              ? json.items
              : json
                ? [json]
                : [];
        const found = items.find(
          (m: any) =>
            m?.entity === "business_metrics_state" &&
            String(m?.entity_id ?? "") === "global",
        );
        if (cancelled) return;
        if (found) {
          const pl = found.payload ?? {};
          const next = normalizeBusinessState(pl);
          skipSaveRef.current = true;
          setState(next);
          setMetaId(String(found.id));
          metaIdRef.current = String(found.id);
        }
        // Si no existe: no se crea nada automáticamente.
        // El usuario debe pulsar "Sincronizar" para crear el registro.
      } catch {
        // fallback silencioso — state ya tiene seed
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Sincronización manual: crea el registro si no existe o fuerza un PUT si ya existe.
  const handleManualSync = useCallback(async () => {
    if (savingMeta) return;
    setSavingMeta(true);
    try {
      const token = getAuthToken();
      if (!metaId) {
        // POST — crear por primera vez con TODO el state actual
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: "business_metrics_state",
            entity_id: "global",
            payload: state,
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = await res.json().catch(() => null);
        const newId = json?.id ?? json?.data?.id ?? null;
        if (newId) {
          skipSaveRef.current = true;
          setMetaId(String(newId));
          metaIdRef.current = String(newId);
        } else {
          throw new Error("Respuesta sin ID");
        }
      } else {
        // PUT — forzar guardado inmediato
        const res = await fetch(`/api/metadata/${encodeURIComponent(metaId)}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: "business_metrics_state",
            entity_id: "global",
            payload: state,
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
      }
    } catch (err) {
      console.error("[metricas-negocio] sync failed:", err);
      if (typeof window !== "undefined") {
        window.alert(
          `No se pudo sincronizar el metadata. ${
            err instanceof Error ? err.message : ""
          }`,
        );
      }
    } finally {
      setSavingMeta(false);
    }
  }, [metaId, state, savingMeta]);

  // Guardado automático con debounce de 1.5s
  // Siempre actualiza el metadata existente (PUT). Si metaId aún no está
  // cargado, lo busca primero y luego hace PUT. Nunca crea duplicados.
  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSavingMeta(true);
    const snapshot = state;
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = getAuthToken();
        let id = metaIdRef.current;

        // Si aún no tenemos el ID, buscamos el registro existente
        if (!id) {
          const res = await fetch(
            "/api/metadata?entity=business_metrics_state&entity_id=global",
            {
              headers: { Authorization: `Bearer ${token ?? ""}` },
              cache: "no-store",
            },
          );
          if (res.ok) {
            const json = await res.json().catch(() => null);
            const items: any[] = Array.isArray(json)
              ? json
              : Array.isArray(json?.data)
                ? json.data
                : Array.isArray(json?.items)
                  ? json.items
                  : json
                    ? [json]
                    : [];
            const found = items.find(
              (m: any) =>
                m?.entity === "business_metrics_state" &&
                String(m?.entity_id ?? "") === "global",
            );
            if (found) {
              id = String(found.id);
              metaIdRef.current = id;
              setMetaId(id);
            }
          }
        }

        if (id) {
          // Actualizar el metadata existente
          await fetch(`/api/metadata/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token ?? ""}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entity: "business_metrics_state",
              entity_id: "global",
              payload: snapshot,
            }),
          });
        }
        // Si no existe el metadata (id === null), no se hace nada — el usuario
        // debe crear el registro manualmente antes de que el autosave funcione.
      } finally {
        setSavingMeta(false);
      }
    }, 1500);
  }, [state]);

  const visibleRecords = useMemo(() => {
    const sorted = sortBusinessRecords(state.records);
    return sorted.filter((record) => {
      if (fromMonth && record.month < fromMonth) return false;
      if (toMonth && record.month > toMonth) return false;
      return true;
    });
  }, [fromMonth, toMonth, state.records]);

  const visibleExpenses = useMemo(() => {
    const sorted = sortBusinessExpenses(state.expenses);
    return sorted.filter((expense) => {
      if (fromMonth && expense.month < fromMonth) return false;
      if (toMonth && expense.month > toMonth) return false;
      return true;
    });
  }, [fromMonth, toMonth, state.expenses]);

  const derivedRows = useMemo(
    () =>
      visibleRecords.map((record) => ({
        record,
        kpis: calculateBusinessKpis(record),
      })),
    [visibleRecords],
  );

  const summary = useMemo(
    () => calculateBusinessSummary(visibleRecords),
    [visibleRecords],
  );

  const expenseTotalsByMonth = useMemo(() => {
    const map = new Map<string, { operativo: number; ventas: number }>();
    for (const expense of visibleExpenses) {
      const current = map.get(expense.month) ?? { operativo: 0, ventas: 0 };
      current[expense.scope] += expense.amount;
      map.set(expense.month, current);
    }
    return map;
  }, [visibleExpenses]);

  const activeStudentsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of state.records) {
      map.set(record.month, record.activeStudents);
    }
    return map;
  }, [state.records]);

  // ── Fase 2: totales auto-derivados desde partidas ─────────────────────────
  // Si hay partidas cargadas para un mes, los totales se calculan solos.
  // El maestro mensual sigue siendo el "override" si no hay partidas.
  const expenseAutoTotals = useMemo(() => {
    const map = new Map<string, { operativo: number; ventas: number }>();
    for (const expense of state.expenses) {
      const cur = map.get(expense.month) ?? { operativo: 0, ventas: 0 };
      cur[expense.scope] += expense.amount;
      map.set(expense.month, cur);
    }
    return map;
  }, [state.expenses]);

  // ── Datos para gráficos ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return derivedRows.map(({ record, kpis }) => ({
      mes: formatMonthLabel(record.month),
      revenue: record.highTicketRevenue,
      cac: kpis.cac,
      ltgp: kpis.ltgpExcel,
      roic: Math.round(kpis.roic * 10000) / 100,
      activeStudents: record.activeStudents,
      newClients: record.newClients,
      entryVsExit: Math.round(kpis.entryVsExit * 100) / 100,
      acquisitionCost: kpis.acquisitionCost,
      operatingCost: record.operatingCostMonthly,
      marketingCost: record.marketingSalesCost,
      benefitPerClient: kpis.benefitPerClient,
      grossValueGenerated: kpis.grossValueGenerated,
      paybackMonths: Math.round(kpis.paybackMonths * 100) / 100,
      cacRatio: Math.round(kpis.cacRatio * 100) / 100,
    }));
  }, [derivedRows]);

  // ── Paleta cohesiva para gráficos de distribución ────────────────────────
  const CHART_PIE_COLORS = [
    "#f43f5e", // rose — ADS
    "#f97316", // orange — comisiones closer
    "#a855f7", // purple — Carla / bonos
    "#0ea5e9", // sky — operativo
    "#10b981", // emerald — beneficio
    "#6366f1", // indigo — marketing
  ];

  // Composición del costo total acumulado en el rango filtrado
  const costCompositionData = useMemo(() => {
    const acc = visibleRecords.reduce(
      (a, r) => {
        a.ads += r.ads || 0;
        a.closerCommissions += r.closerCommissions || 0;
        a.carlaBonus += r.carlaBonus || 0;
        a.operating += r.operatingCostMonthly || 0;
        return a;
      },
      { ads: 0, closerCommissions: 0, carlaBonus: 0, operating: 0 },
    );
    const items = [
      { name: "ADS", value: acc.ads, color: CHART_PIE_COLORS[0] },
      {
        name: "Comisiones closer",
        value: acc.closerCommissions,
        color: CHART_PIE_COLORS[1],
      },
      {
        name: "Carla / bonos",
        value: acc.carlaBonus,
        color: CHART_PIE_COLORS[2],
      },
      { name: "Operativo", value: acc.operating, color: CHART_PIE_COLORS[3] },
    ];
    return items.filter((it) => it.value > 0);
  }, [visibleRecords]);

  // Asignación del revenue: adquisición vs operativo vs beneficio neto
  const revenueAllocationData = useMemo(() => {
    const revenue = summary.totalRevenue;
    const acquisition = summary.totalAcquisitionCost;
    const operating = summary.totalOperatingCost;
    const profit = Math.max(revenue - acquisition - operating, 0);
    const items = [
      { name: "Adquisición", value: acquisition, color: CHART_PIE_COLORS[0] },
      { name: "Operativo", value: operating, color: CHART_PIE_COLORS[3] },
      { name: "Beneficio", value: profit, color: CHART_PIE_COLORS[4] },
    ];
    return items.filter((it) => it.value > 0);
  }, [summary]);

  // Gauge ROIC: valor actual vs objetivo 30 %
  const roicGaugeData = useMemo(() => {
    const value = Math.round(summary.weightedRoic * 10000) / 100; // %
    const clamped = Math.max(-50, Math.min(100, value));
    const color = value >= 30 ? "#10b981" : value >= 0 ? "#f59e0b" : "#ef4444";
    return { value, clamped, color };
  }, [summary]);

  // ── Fase 3: datos de cohorte ──────────────────────────────────────────────
  // Agrupa alumnos (desde los registros mensuales) por mes de ingreso y
  // calcula retención relativa usando newClients de cada mes.
  const cohortData = useMemo(() => {
    const sorted = sortBusinessRecords(visibleRecords);
    if (sorted.length === 0) return [];

    // Mapa de activos por mes para calcular retención
    const activeMap = new Map<string, number>();
    for (const r of sorted) {
      activeMap.set(r.month, r.activeStudents);
    }

    return sorted.map((record) => {
      const kpis = calculateBusinessKpis(record);
      // Retención implícita: alumnos activos del mes / total acumulado hasta ese mes
      const totalAcumulated = sorted
        .filter((r) => r.month <= record.month)
        .reduce((acc, r) => acc + r.newClients, 0);
      const retentionRate =
        totalAcumulated > 0
          ? Math.round((record.activeStudents / totalAcumulated) * 1000) / 1000
          : null;

      // LTV real: suma de revenue en los meses posteriores al ingreso de esta cohorte
      // (aproximación: revenue del mes / highTicketClients)
      const revenuePerClient =
        record.highTicketClients > 0
          ? record.highTicketRevenue / record.highTicketClients
          : 0;

      return {
        month: record.month,
        newClients: record.newClients,
        highTicketClients: record.highTicketClients,
        activeStudents: record.activeStudents,
        revenue: record.highTicketRevenue,
        revenuePerClient,
        retentionRate,
        ltgpExcel: kpis.ltgpExcel,
        ltgpProjected: kpis.ltgpProjected,
        cac: kpis.cac,
        benefitPerClient: kpis.benefitPerClient,
        roic: kpis.roic,
        paybackMonths: kpis.paybackMonths,
        // Ratio contado vs cuotas: no disponible desde este estado, placeholder
        modalidadRatio: null as null,
        expensesOperativo: expenseAutoTotals.get(record.month)?.operativo ?? 0,
        expensesVentas: expenseAutoTotals.get(record.month)?.ventas ?? 0,
      };
    });
  }, [visibleRecords, expenseAutoTotals]);

  const importSnapshot = async (month: string) => {
    if (!month) return;
    setImportingSnapshot(true);
    setSnapshotError(null);
    setImportedFields([]);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `/api/metrics/monthly-snapshot?month=${encodeURIComponent(month)}`,
        {
          headers: { Authorization: `Bearer ${token ?? ""}` },
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setSnapshotError(text || `Error HTTP ${res.status}`);
        return;
      }
      const json = await res.json().catch(() => null);
      const calc = json?.calculated ?? {};
      const filled: string[] = [];
      setMonthForm((prev) => {
        const next = { ...prev };
        if (calc.newClients != null) {
          next.newClients = calc.newClients;
          filled.push("Nuevos clientes");
        }
        if (calc.highTicketClients != null) {
          next.highTicketClients = calc.highTicketClients;
          filled.push("Clientes HT");
        }
        if (calc.activeStudents != null) {
          next.activeStudents = calc.activeStudents;
          filled.push("Alumnos activos");
        }
        if (calc.highTicketRevenue != null) {
          next.highTicketRevenue = calc.highTicketRevenue;
          filled.push("Revenue HT");
        }
        if (calc.delinquencyRate != null) {
          next.delinquencyRate = calc.delinquencyRate;
          filled.push("Morosidad");
        }
        if (calc.durationMonths != null) {
          next.durationMonths = calc.durationMonths;
          filled.push("Duración media");
        }
        return next;
      });
      setImportedFields(filled);
    } catch (e: any) {
      setSnapshotError(e?.message ?? "Error inesperado");
    } finally {
      setImportingSnapshot(false);
    }
  };

  const resetMonthForm = () => {
    setMonthForm(EMPTY_MONTH_FORM);
    setEditingMonthId(null);
  };

  const resetExpenseForm = () => {
    setExpenseForm(EMPTY_EXPENSE_FORM);
    setEditingExpenseId(null);
  };

  const upsertMonth = () => {
    if (!monthForm.month) return;
    const nextRecord: BusinessMonthRecord = {
      ...monthForm,
      id: editingMonthId || monthForm.month,
      notes: monthForm.notes?.trim() || "",
    };

    setState((current) => {
      const filtered = current.records.filter(
        (record) => record.id !== editingMonthId,
      );
      const deduped = filtered.filter(
        (record) => record.month !== nextRecord.month,
      );
      return {
        ...current,
        records: sortBusinessRecords([...deduped, nextRecord]),
      };
    });
    resetMonthForm();
  };

  const upsertExpense = () => {
    if (!expenseForm.month || !expenseForm.category.trim()) return;
    const nextExpense: BusinessExpenseEntry = {
      ...expenseForm,
      id:
        editingExpenseId ||
        `${expenseForm.month}-${expenseForm.scope}-${Date.now()}`,
      category: expenseForm.category.trim(),
      note: expenseForm.note?.trim() || "",
    };

    setState((current) => ({
      ...current,
      expenses: sortBusinessExpenses([
        ...current.expenses.filter(
          (expense) => expense.id !== editingExpenseId,
        ),
        nextExpense,
      ]),
    }));
    resetExpenseForm();
  };

  // ── Capa "auto-admin": custom fields, formulas y vault password ───────────
  const customFields = state.customFields ?? [];
  const customFormulas = state.customFormulas ?? [];
  const recordCustomFields = useMemo(
    () => customFields.filter((f) => f.target === "record"),
    [customFields],
  );
  const expenseCustomFields = useMemo(
    () => customFields.filter((f) => f.target === "expense"),
    [customFields],
  );

  function setExtraValue<T extends { extra?: Record<string, number | string> }>(
    obj: T,
    key: string,
    raw: string,
    type: CustomFieldType,
  ): T {
    const nextExtra = { ...(obj.extra ?? {}) } as Record<
      string,
      number | string
    >;
    if (type === "text") {
      nextExtra[key] = raw;
    } else {
      nextExtra[key] = parseNumericInput(raw);
    }
    return { ...obj, extra: nextExtra };
  }

  function getExtraValue(
    obj: { extra?: Record<string, number | string> } | null | undefined,
    key: string,
    type: CustomFieldType,
  ): string {
    const v = obj?.extra?.[key];
    if (v == null) return type === "text" ? "" : "0";
    return String(v);
  }

  function formatCustomValue(
    value: number | string | undefined,
    type: CustomFieldType,
  ): string {
    if (value == null) return "—";
    if (type === "text") return String(value);
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "—";
    if (type === "currency") return formatCurrency(n);
    if (type === "percent") return formatPercent(n);
    return new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 2,
    }).format(n);
  }

  function formatFormulaValue(
    value: number,
    format: CustomFormulaFormat,
  ): string {
    if (format === "currency") return formatCurrency(value);
    if (format === "percent") return formatPercent(value);
    return new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  const addCustomField = (field: CustomFieldDef) => {
    setState((current) => ({
      ...current,
      customFields: [...(current.customFields ?? []), field],
    }));
  };

  const updateCustomField = (originalKey: string, next: CustomFieldDef) => {
    setState((current) => ({
      ...current,
      customFields: (current.customFields ?? []).map((f) =>
        f.key === originalKey && f.target === next.target ? next : f,
      ),
    }));
  };

  const removeCustomField = (field: CustomFieldDef) => {
    setState((current) => ({
      ...current,
      customFields: (current.customFields ?? []).filter(
        (f) => !(f.key === field.key && f.target === field.target),
      ),
      // Limpia valores de ese campo en los registros existentes
      records:
        field.target === "record"
          ? current.records.map((r) => {
              if (!r.extra) return r;
              const { [field.key]: _omit, ...rest } = r.extra;
              return { ...r, extra: rest };
            })
          : current.records,
      expenses:
        field.target === "expense"
          ? current.expenses.map((e) => {
              if (!e.extra) return e;
              const { [field.key]: _omit, ...rest } = e.extra;
              return { ...e, extra: rest };
            })
          : current.expenses,
    }));
  };

  const addCustomFormula = (formula: CustomFormulaDef) => {
    setState((current) => ({
      ...current,
      customFormulas: [...(current.customFormulas ?? []), formula],
    }));
  };

  const updateCustomFormula = (originalKey: string, next: CustomFormulaDef) => {
    setState((current) => ({
      ...current,
      customFormulas: (current.customFormulas ?? []).map((f) =>
        f.key === originalKey ? next : f,
      ),
    }));
  };

  const removeCustomFormula = (key: string) => {
    setState((current) => ({
      ...current,
      customFormulas: (current.customFormulas ?? []).filter(
        (f) => f.key !== key,
      ),
    }));
  };

  const setVaultPassword = (next: string) => {
    setState((current) => ({ ...current, vaultPassword: next }));
  };

  // KPIs personalizados resumidos sobre los registros visibles
  const customFormulaSummaries = useMemo(() => {
    return customFormulas.map((formula) => {
      const result = evaluateFormulaOverRecords(
        formula.expression,
        visibleRecords,
        formula.format === "percent" ? "avg" : "sum",
      );
      return { formula, result };
    });
  }, [customFormulas, visibleRecords]);

  if (isLoading || loadingMeta) {
    return null;
  }

  if (!canAccessBusinessMetrics(user)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Módulo confidencial
            </CardTitle>
            <CardDescription>
              Esta sección solo está habilitada para el usuario autorizado del
              área.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Si necesitas abrir acceso a más usuarios, conviene mover esta regla
            a backend y permisos finos.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {!secondaryAuthed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Acceso restringido
              </CardTitle>
              <CardDescription>
                Introduce tu clave para acceder al módulo de inteligencia de
                negocio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={user?.email ?? ""}
                  readOnly
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Clave de acceso</Label>
                <Input
                  type="password"
                  value={pwInput}
                  autoFocus
                  placeholder="••••••••••••"
                  onChange={(e) => {
                    setPwInput(e.target.value);
                    setPwError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVaultLogin();
                  }}
                />
                {pwError && (
                  <p className="text-sm text-destructive">
                    Clave incorrecta. Inténtalo de nuevo.
                  </p>
                )}
              </div>
              <Button className="w-full" onClick={handleVaultLogin}>
                Acceder
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-violet-600 via-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Inteligencia de negocio
            </h1>
            <p className="text-sm text-muted-foreground">
              Módulo confidencial — KPIs recalculados en tiempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Confidencial</Badge>
            {metaId && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground cursor-pointer hover:bg-muted"
                title="ID del registro metadata-v2 donde se guarda toda la inteligencia de negocio. Click para copiar."
                onClick={() => {
                  navigator.clipboard?.writeText(metaId).catch(() => {});
                }}
              >
                meta: {metaId}
              </Badge>
            )}
            <Button
              size="sm"
              variant="default"
              onClick={handleManualSync}
              disabled={savingMeta}
              className="gap-1.5"
            >
              {savingMeta ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Guardar
                </>
              )}
            </Button>
            {!savingMeta && metaId && (
              <Badge
                variant="outline"
                className="text-green-600 dark:text-green-400"
              >
                <Check className="mr-1 h-3 w-3" />
                Sincronizado
              </Badge>
            )}
            {/* ── Filtro por mes ───────────────────────────────── */}
            <div className="inline-flex items-center gap-0 rounded-xl border bg-background shadow-sm text-sm overflow-hidden">
              <div className="flex flex-col items-start px-3 py-1.5 border-r">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Desde
                </span>
                <input
                  type="month"
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="font-medium bg-transparent border-none outline-none text-sm p-0 text-foreground"
                />
              </div>
              <div className="flex flex-col items-start px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Hasta
                </span>
                <input
                  type="month"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="font-medium bg-transparent border-none outline-none text-sm p-0 text-foreground"
                />
              </div>
              {(fromMonth || toMonth) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromMonth("");
                    setToMonth("");
                  }}
                  className="flex items-center px-2 self-stretch border-l hover:bg-muted/60 transition-colors"
                  title="Limpiar filtro"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card className="border-l-4 border-l-orange-400 dark:border-l-orange-500">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <DollarSign className="h-3 w-3" />
                CAC ponderado
              </CardDescription>
              <CardTitle className="text-orange-700 dark:text-orange-300">
                {formatCurrency(summary.weightedCac)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {summary.totalNewClients} nuevas altas en el periodo.
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 dark:border-l-green-400">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-400">
                <TrendingUp className="h-3 w-3" />
                Ingreso / cliente
              </CardDescription>
              <CardTitle className="text-green-700 dark:text-green-300">
                {formatCurrency(summary.weightedIncomePerClient)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {summary.totalHighTicketClients} clientes HT.
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-400">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                <Receipt className="h-3 w-3" />
                Costo op. / cliente
              </CardDescription>
              <CardTitle className="text-blue-700 dark:text-blue-300">
                {formatCurrency(summary.weightedCostPerClient)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Mensual. {summary.totalActiveStudents} alumnos activos.
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                <Calculator className="h-3 w-3" />
                Costo total / cliente
              </CardDescription>
              <CardTitle className="text-indigo-700 dark:text-indigo-300">
                {formatCurrency(summary.weightedTotalCostPerClient)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              A duración media del cliente (4 m).
            </CardContent>
          </Card>
          <Card
            className={`border-l-4 ${summary.weightedRoic >= 0 ? "border-l-purple-500 dark:border-l-purple-400" : "border-l-red-500 dark:border-l-red-400"}`}
          >
            <CardHeader className="pb-2">
              <CardDescription
                className={`flex items-center gap-1 ${summary.weightedRoic >= 0 ? "text-purple-700 dark:text-purple-400" : "text-red-600 dark:text-red-400"}`}
              >
                <Zap className="h-3 w-3" />
                ROIC medio
              </CardDescription>
              <CardTitle
                className={
                  summary.weightedRoic >= 0
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {formatPercent(summary.weightedRoic)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Retorno sobre inversión operativa.
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <BarChart2 className="h-3 w-3" />
                Valor bruto generado
              </CardDescription>
              <CardTitle className="text-emerald-700 dark:text-emerald-300">
                {formatCurrency(summary.totalGrossValueGenerated)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Clientes HT × LTGP en el periodo.
            </CardContent>
          </Card>
        </div>

        {customFormulaSummaries.filter((s) => s.formula.showInOverview).length >
          0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {customFormulaSummaries
              .filter((s) => s.formula.showInOverview)
              .map(({ formula, result }) => (
                <Card
                  key={`cf-${formula.key}`}
                  className="border-l-4 border-l-amber-500 dark:border-l-amber-400"
                >
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      <Sigma className="h-3 w-3" />
                      {formula.label}
                    </CardDescription>
                    <CardTitle className="text-amber-700 dark:text-amber-300">
                      {result.ok
                        ? formatFormulaValue(result.value, formula.format)
                        : "—"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {result.ok ? (
                      <code className="text-[10px]">{formula.expression}</code>
                    ) : (
                      <span className="text-red-500">{result.error}</span>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="border-l-4 border-l-sky-500">
            <CardHeader className="bg-sky-50/50 dark:bg-sky-950/30 rounded-t-lg pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-sky-700 dark:text-sky-300">
                <Calculator className="h-4 w-4" />
                Resumen ejecutivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pt-4">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Facturación HT</span>
                <span className="font-medium text-green-700 dark:text-green-400">
                  {formatCurrency(summary.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Inversión adquisición
                </span>
                <span className="text-orange-600 dark:text-orange-400">
                  {formatCurrency(summary.totalAcquisitionCost)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Costo operativo</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {formatCurrency(summary.totalOperatingCost)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Ventas + marketing
                </span>
                <span className="text-violet-600 dark:text-violet-400">
                  {formatCurrency(summary.totalMarketingSalesCost)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Costo op. / cliente
                </span>
                <span>{formatCurrency(summary.weightedCostPerClient)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Costo total / cliente
                </span>
                <span>
                  {formatCurrency(summary.weightedTotalCostPerClient)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Payback medio</span>
                <span>{summary.weightedPaybackMonths.toFixed(2)} meses</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Entrada vs salida media
                </span>
                <span
                  className={
                    summary.avgEntryVsExit >= 1.2
                      ? "font-semibold text-green-600 dark:text-green-400"
                      : summary.avgEntryVsExit >= 1
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "font-semibold text-red-600 dark:text-red-400"
                  }
                >
                  {summary.avgEntryVsExit.toFixed(2)}x
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="bg-violet-50/50 dark:bg-violet-950/30 rounded-t-lg pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-violet-700 dark:text-violet-300">
                <LineChart className="h-4 w-4" />
                KPI avanzado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pt-4">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Margen medio / cliente
                </span>
                <span
                  className={
                    summary.weightedMarginPerClient >= 0
                      ? "font-medium text-green-600 dark:text-green-400"
                      : "font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {formatCurrency(summary.weightedMarginPerClient)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">LTGP Excel</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.weightedLtgpExcel)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">LTGP proyectado</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(summary.weightedLtgpProjected)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Velocidad de ventas
                </span>
                <span>{formatCurrency(summary.totalSalesVelocity)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Alumnos activos</span>
                <span className="font-semibold">
                  {summary.totalActiveStudents}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Clientes HT</span>
                <span className="font-semibold">
                  {summary.totalHighTicketClients}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto bg-muted/70 gap-1 p-1">
            <TabsTrigger
              value="graficos"
              className="data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <BarChart2 className="mr-1 h-3 w-3" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Vista general
            </TabsTrigger>
            <TabsTrigger
              value="adquisicion"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              1-2. CAC e Ingresos
            </TabsTrigger>
            <TabsTrigger
              value="costos-op"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              3. Costo operativo
            </TabsTrigger>
            <TabsTrigger
              value="rentabilidad"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              4-8. Rentabilidad
            </TabsTrigger>
            <TabsTrigger
              value="roic-detail"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              9. ROIC detalle
            </TabsTrigger>
            <TabsTrigger
              value="dinamica"
              className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              10-13. Dinámica
            </TabsTrigger>
            <TabsTrigger
              value="months"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              CRUD mensual
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="data-[state=active]:bg-rose-600 data-[state=active]:text-white"
            >
              <Receipt className="mr-1 h-3 w-3" />
              Partidas / costos
            </TabsTrigger>
            <TabsTrigger
              value="academia"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
            >
              Academia
            </TabsTrigger>
            <TabsTrigger
              value="formulas"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              Fórmulas
            </TabsTrigger>
            <TabsTrigger
              value="auto-admin"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <Settings className="mr-1 h-3 w-3" />
              Auto-admin
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB GRÁFICOS                                                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="graficos" className="space-y-6">
            {chartData.length === 0 ? (
              <Card>
                <CardContent className="pt-10 pb-10 text-center text-muted-foreground text-sm">
                  Sin datos. Agrega registros mensuales en la pestaña{" "}
                  <strong>CRUD mensual</strong> para ver los gráficos.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* ── Fila 1: Revenue + ROIC ─────────────────────────────── */}
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-t-4 border-t-emerald-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Revenue HT por mes
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Evolución de ingresos high-ticket filtrada por el rango
                        seleccionado.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <defs>
                            <linearGradient
                              id="gradRevenue"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            width={52}
                          />
                          <Tooltip
                            formatter={(v: number) => [
                              formatCurrency(v),
                              "Revenue HT",
                            ]}
                            contentStyle={{
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fill="url(#gradRevenue)"
                            dot={{ r: 4, fill: "#10b981" }}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-t-4 border-t-purple-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        ROIC (%) por mes
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Zona verde ≥ 30 %. Zona amarilla ≥ 0 %. Rojo: negativo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `${v}%`}
                            width={44}
                          />
                          <Tooltip
                            formatter={(v: number) => [
                              `${v.toFixed(2)}%`,
                              "ROIC",
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <ReferenceLine
                            y={30}
                            stroke="#10b981"
                            strokeDasharray="4 2"
                            label={{
                              value: "30%",
                              position: "insideTopRight",
                              fontSize: 10,
                              fill: "#10b981",
                            }}
                          />
                          <ReferenceLine
                            y={0}
                            stroke="#ef4444"
                            strokeDasharray="4 2"
                          />
                          <Bar
                            dataKey="roic"
                            radius={[4, 4, 0, 0]}
                            fill="#a855f7"
                            opacity={0.85}
                          />
                          <Line
                            type="monotone"
                            dataKey="roic"
                            stroke="#7c3aed"
                            strokeWidth={2}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Fila 2: CAC vs LTGP ────────────────────────────────── */}
                <Card className="border-t-4 border-t-orange-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      CAC vs LTGP por mes
                    </CardTitle>
                    <CardDescription className="text-xs">
                      El LTGP debe superar al CAC (ratio sano ≥ 3x). Beneficio
                      neto = LTGP − CAC.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `$${v.toFixed(0)}`}
                          width={56}
                        />
                        <Tooltip
                          formatter={(v: number, name: string) => [
                            formatCurrency(v),
                            name === "cac"
                              ? "CAC"
                              : name === "ltgp"
                                ? "LTGP"
                                : "Beneficio",
                          ]}
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend
                          formatter={(v) =>
                            v === "cac"
                              ? "CAC"
                              : v === "ltgp"
                                ? "LTGP Excel"
                                : "Beneficio/cliente"
                          }
                        />
                        <Bar
                          dataKey="cac"
                          fill="#f97316"
                          radius={[4, 4, 0, 0]}
                          opacity={0.85}
                        />
                        <Bar
                          dataKey="ltgp"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          opacity={0.85}
                        />
                        <Line
                          type="monotone"
                          dataKey="benefitPerClient"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#6366f1" }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* ── Fila 3: Alumnos activos + Nuevos clientes ───────────── */}
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Alumnos activos
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Evolución de la base de alumnos activos mes a mes.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <defs>
                            <linearGradient
                              id="gradStudents"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#3b82f6"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="95%"
                                stopColor="#3b82f6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis tick={{ fontSize: 11 }} width={36} />
                          <Tooltip
                            formatter={(v: number) => [v, "Alumnos activos"]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="activeStudents"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            fill="url(#gradStudents)"
                            dot={{ r: 4, fill: "#3b82f6" }}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-t-4 border-t-sky-400">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Nuevos clientes por mes
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ventas cerradas y clientes high-ticket por mes.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis tick={{ fontSize: 11 }} width={30} />
                          <Tooltip
                            formatter={(v: number, name: string) => [
                              v,
                              name === "newClients"
                                ? "Nuevos clientes"
                                : "Clientes HT",
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <Legend
                            formatter={(v) =>
                              v === "newClients"
                                ? "Nuevos clientes"
                                : "Clientes HT"
                            }
                          />
                          <Bar
                            dataKey="newClients"
                            fill="#0ea5e9"
                            radius={[4, 4, 0, 0]}
                            opacity={0.85}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Fila 4: Entrada vs Salida + Desglose costos ────────── */}
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-t-4 border-t-teal-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-2">
                        <BarChart2 className="h-4 w-4" />
                        Entrada vs Salida (crecimiento)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Línea verde = 1.0 (punto de equilibrio). Por encima →
                        crecimiento.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `${v}x`}
                            width={36}
                          />
                          <Tooltip
                            formatter={(v: number) => [
                              `${v.toFixed(2)}x`,
                              "Entrada/Salida",
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <ReferenceLine
                            y={1}
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                            label={{
                              value: "Equilibrio",
                              position: "insideTopRight",
                              fontSize: 10,
                              fill: "#10b981",
                            }}
                          />
                          <Bar
                            dataKey="entryVsExit"
                            radius={[4, 4, 0, 0]}
                            fill="#14b8a6"
                            opacity={0.8}
                          />
                          <Line
                            type="monotone"
                            dataKey="entryVsExit"
                            stroke="#0f766e"
                            strokeWidth={2}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-t-4 border-t-rose-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Desglose de costos por mes
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Costo de adquisición + costo operativo mensual.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            width={48}
                          />
                          <Tooltip
                            formatter={(v: number, name: string) => [
                              formatCurrency(v),
                              name === "acquisitionCost"
                                ? "Adquisición"
                                : "Operativo",
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <Legend
                            formatter={(v) =>
                              v === "acquisitionCost"
                                ? "Adquisición"
                                : "Operativo"
                            }
                          />
                          <Bar
                            dataKey="acquisitionCost"
                            stackId="costos"
                            fill="#f43f5e"
                            radius={[0, 0, 0, 0]}
                            opacity={0.85}
                          />
                          <Bar
                            dataKey="operatingCost"
                            stackId="costos"
                            fill="#fb923c"
                            radius={[4, 4, 0, 0]}
                            opacity={0.85}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Fila 5: Payback + Valor bruto ──────────────────────── */}
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-t-4 border-t-indigo-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <LineChart className="h-4 w-4" />
                        Payback en meses
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Cuántos meses tarda en recuperarse el CAC. Menor =
                        mejor.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsLineChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `${v}m`}
                            width={36}
                          />
                          <Tooltip
                            formatter={(v: number) => [
                              `${v.toFixed(2)} meses`,
                              "Payback",
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="paybackMonths"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#6366f1" }}
                            activeDot={{ r: 6 }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-t-4 border-t-emerald-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor bruto generado
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Clientes HT × LTGP. Valor total generado por las ventas
                        del mes.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                        >
                          <defs>
                            <linearGradient
                              id="gradGross"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#059669"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="#059669"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            width={52}
                          />
                          <Tooltip
                            formatter={(v: number) => [
                              formatCurrency(v),
                              "Valor bruto",
                            ]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="grossValueGenerated"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fill="url(#gradGross)"
                            dot={{ r: 4, fill: "#059669" }}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Sección: Distribución y composición ───────────────── */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Distribución y composición
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    {/* Donut 1: Composición de costos */}
                    <Card className="border-t-4 border-t-rose-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Composición del costo
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Distribución total del periodo seleccionado.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {costCompositionData.length === 0 ? (
                          <div className="h-65 flex items-center justify-center text-xs text-muted-foreground">
                            Sin costos registrados en el rango.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Tooltip
                                formatter={(v: number, n: string) => [
                                  formatCurrency(v),
                                  n,
                                ]}
                                contentStyle={{
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={28}
                                wrapperStyle={{ fontSize: 11 }}
                              />
                              <Pie
                                data={costCompositionData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={2}
                                strokeWidth={2}
                              >
                                {costCompositionData.map((item) => (
                                  <Cell key={item.name} fill={item.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Donut 2: Asignación del revenue */}
                    <Card className="border-t-4 border-t-emerald-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />A dónde va cada
                          dólar
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Reparto del revenue HT en el rango.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {revenueAllocationData.length === 0 ? (
                          <div className="h-65 flex items-center justify-center text-xs text-muted-foreground">
                            Sin revenue registrado.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Tooltip
                                formatter={(v: number, n: string) => [
                                  formatCurrency(v),
                                  n,
                                ]}
                                contentStyle={{
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={28}
                                wrapperStyle={{ fontSize: 11 }}
                              />
                              <Pie
                                data={revenueAllocationData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={2}
                                strokeWidth={2}
                                label={(entry: { percent?: number }) =>
                                  `${((entry.percent ?? 0) * 100).toFixed(0)}%`
                                }
                                labelLine={false}
                              >
                                {revenueAllocationData.map((item) => (
                                  <Cell key={item.name} fill={item.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Gauge ROIC */}
                    <Card className="border-t-4 border-t-purple-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          ROIC medio del periodo
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Objetivo ≥ 30 %. Verde sano · ámbar OK · rojo crítico.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <ResponsiveContainer width="100%" height={260}>
                            <RadialBarChart
                              innerRadius="65%"
                              outerRadius="95%"
                              data={[
                                {
                                  name: "ROIC",
                                  value: roicGaugeData.clamped,
                                  fill: roicGaugeData.color,
                                },
                              ]}
                              startAngle={210}
                              endAngle={-30}
                            >
                              <PolarAngleAxis
                                type="number"
                                domain={[-50, 100]}
                                tick={false}
                              />
                              <RadialBar
                                background={{ fill: "rgba(148,163,184,0.18)" }}
                                dataKey="value"
                                cornerRadius={10}
                              />
                            </RadialBarChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span
                              className="text-3xl font-bold"
                              style={{ color: roicGaugeData.color }}
                            >
                              {roicGaugeData.value.toFixed(1)}%
                            </span>
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                              ROIC ponderado
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>KPIs por mes</CardTitle>
                <CardDescription>
                  Réplica de las pestañas del Excel con una capa adicional de
                  LTGP proyectado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.1", "Mes")}
                          onChange={(v) => setColumnLabel("th.1", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.2", "CAC")}
                          onChange={(v) => setColumnLabel("th.2", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.3", "Ingreso / cliente")}
                          onChange={(v) => setColumnLabel("th.3", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.4",
                            "3. Costo operativo por cliente",
                          )}
                          onChange={(v) => setColumnLabel("th.4", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.5",
                            "Costo operativo por cliente (4 meses)",
                          )}
                          onChange={(v) => setColumnLabel("th.5", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.6", "Margen op.")}
                          onChange={(v) => setColumnLabel("th.6", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.7", "LTGP Excel")}
                          onChange={(v) => setColumnLabel("th.7", v)}
                        />
                      </TableHead>
                      {/* Columna LTGP proyectado ocultada por petición.
                      <TableHead><EditableHeader value={getColumnLabel("th.8", "LTGP proyectado")} onChange={(v) => setColumnLabel("th.8", v)} /></TableHead>
                      */}
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.9", "Payback")}
                          onChange={(v) => setColumnLabel("th.9", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.10", "ROIC")}
                          onChange={(v) => setColumnLabel("th.10", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.11", "Valor bruto")}
                          onChange={(v) => setColumnLabel("th.11", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.costPerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.totalCostPerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.operatingMarginPerClient)}
                        </TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        {/* Celda LTGP proyectado ocultada por petición.
                        <TableCell>
                          {formatCurrency(kpis.ltgpProjected)}
                        </TableCell>
                        */}
                        <TableCell>{kpis.paybackMonths.toFixed(2)} m</TableCell>
                        <TableCell
                          className={`font-bold ${
                            kpis.roic >= 0.3
                              ? "text-green-600 dark:text-green-400"
                              : kpis.roic >= 0
                                ? "text-yellow-600 dark:text-yellow-500"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatPercent(kpis.roic)}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(kpis.grossValueGenerated)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Control de coherencia</CardTitle>
                <CardDescription>
                  Compara la suma de partidas manuales contra los totales
                  declarados en el maestro mensual.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.12", "Mes")}
                          onChange={(v) => setColumnLabel("th.12", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.13", "Operativo maestro")}
                          onChange={(v) => setColumnLabel("th.13", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.14", "Operativo partidas")}
                          onChange={(v) => setColumnLabel("th.14", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.15", "Ventas maestro")}
                          onChange={(v) => setColumnLabel("th.15", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.16", "Ventas partidas")}
                          onChange={(v) => setColumnLabel("th.16", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRecords.map((record) => {
                      const totals = expenseTotalsByMonth.get(record.month) ?? {
                        operativo: 0,
                        ventas: 0,
                      };
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            {formatMonthLabel(record.month)}
                          </TableCell>
                          <TableCell>
                            <EditableCurrencyCell
                              value={record.roicOperationalCost}
                              format={formatCurrency}
                              onChange={(v) =>
                                updateRecordField(record.id, {
                                  roicOperationalCost: v,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {formatCurrency(totals.operativo)}
                          </TableCell>
                          <TableCell>
                            <EditableCurrencyCell
                              value={record.marketingSalesCost}
                              format={formatCurrency}
                              onChange={(v) =>
                                updateRecordField(record.id, {
                                  marketingSalesCost: v,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(totals.ventas)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="months" className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 rounded-t-lg">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-slate-800 dark:text-slate-200">
                      {editingMonthId ? "Editar mes" : "Nuevo mes"}
                    </CardTitle>
                    <CardDescription>
                      Ingresa el mes y los costos externos. Los demás campos se
                      pueden importar automáticamente.
                    </CardDescription>
                  </div>
                  {monthForm.month && (
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        size="sm"
                        className="bg-sky-600 hover:bg-sky-700 text-white shrink-0"
                        disabled={importingSnapshot || !monthForm.month}
                        onClick={() => importSnapshot(monthForm.month)}
                      >
                        {importingSnapshot ? (
                          <>
                            <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Cargando…
                          </>
                        ) : (
                          <>
                            <Zap className="mr-1 h-4 w-4" />
                            Importar desde sistema
                          </>
                        )}
                      </Button>
                      {importedFields.length > 0 && (
                        <p className="text-xs text-sky-600 dark:text-sky-400">
                          Auto-rellenado: {importedFields.join(", ")}
                        </p>
                      )}
                      {snapshotError && (
                        <p className="text-xs text-red-500">{snapshotError}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sección: Mes */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 xl:col-span-4">
                    <Label className="text-sm font-semibold">Mes</Label>
                    <div className="flex gap-3 items-end">
                      <Input
                        type="month"
                        value={monthForm.month}
                        className="w-52"
                        onChange={(e) => {
                          setImportedFields([]);
                          setSnapshotError(null);
                          setMonthForm((current) => ({
                            ...current,
                            month: e.target.value,
                          }));
                        }}
                      />
                      {!monthForm.month && (
                        <p className="text-xs text-muted-foreground">
                          Elige un mes y luego usa “Importar desde sistema” para
                          auto-rellenar los campos calculables.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección: Costos externos (SIEMPRE manuales) */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400 mb-3">
                    Costos externos — ingreso manual
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label>ADS</Label>
                      <Input
                        type="number"
                        value={monthForm.ads}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            ads: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Comisiones closer</Label>
                      <Input
                        type="number"
                        value={monthForm.closerCommissions}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            closerCommissions: parseNumericInput(
                              e.target.value,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carla</Label>
                      <Input
                        type="number"
                        value={monthForm.carlaBonus}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            carlaBonus: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bonos</Label>
                      <Input
                        type="number"
                        value={monthForm.bonos ?? 0}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            bonos: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Ventas + marketing
                        <Badge variant="outline" className="ml-1 text-xs">
                          = ADS + Comisiones + Carla + Bonos
                        </Badge>
                      </Label>
                      <Input
                        type="number"
                        value={
                          monthForm.marketingSalesCost !== 0
                            ? monthForm.marketingSalesCost
                            : monthForm.ads +
                              monthForm.closerCommissions +
                              monthForm.carlaBonus +
                              (monthForm.bonos || 0)
                        }
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            marketingSalesCost: parseNumericInput(
                              e.target.value,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Costo operativo mensual</Label>
                      <Input
                        type="number"
                        value={monthForm.operatingCostMonthly}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            operatingCostMonthly: parseNumericInput(
                              e.target.value,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gasto operativo ROIC</Label>
                      <Input
                        type="number"
                        value={monthForm.roicOperationalCost}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            roicOperationalCost: parseNumericInput(
                              e.target.value,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Campos calculables desde el sistema */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400 mb-3">
                    Datos del sistema — auto-importables
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Nuevos clientes
                        {importedFields.includes("Nuevos clientes") && (
                          <Check className="h-3 w-3 text-sky-500" />
                        )}
                      </Label>
                      <Input
                        type="number"
                        value={monthForm.newClients}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            newClients: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Ingresos high ticket
                        {importedFields.includes("Revenue HT") && (
                          <Check className="h-3 w-3 text-sky-500" />
                        )}
                      </Label>
                      <Input
                        type="number"
                        value={monthForm.highTicketRevenue}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            highTicketRevenue: parseNumericInput(
                              e.target.value,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Morosidad
                        {importedFields.includes("Morosidad") && (
                          <Check className="h-3 w-3 text-sky-500" />
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={monthForm.delinquencyRate}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            delinquencyRate: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Clientes HT
                        {importedFields.includes("Clientes HT") && (
                          <Check className="h-3 w-3 text-sky-500" />
                        )}
                      </Label>
                      <Input
                        type="number"
                        value={monthForm.highTicketClients}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            highTicketClients: parseNumericInput(
                              e.target.value,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Alumnos activos
                        {importedFields.includes("Alumnos activos") && (
                          <Check className="h-3 w-3 text-sky-500" />
                        )}
                      </Label>
                      <Input
                        type="number"
                        value={monthForm.activeStudents}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            activeStudents: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Duración media
                        {importedFields.includes("Duración media") && (
                          <Check className="h-3 w-3 text-sky-500" />
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={monthForm.durationMonths}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            durationMonths: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Churn estructural</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={monthForm.churnRate}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            churnRate: parseNumericInput(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notas</Label>
                      <Textarea
                        value={monthForm.notes ?? ""}
                        onChange={(e) =>
                          setMonthForm((current) => ({
                            ...current,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {recordCustomFields.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      Campos personalizados
                    </p>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {recordCustomFields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label className="flex items-center gap-1">
                            {field.label}
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px]"
                            >
                              {field.key}
                            </Badge>
                          </Label>
                          <Input
                            type={field.type === "text" ? "text" : "number"}
                            step={field.type === "percent" ? "0.01" : undefined}
                            value={getExtraValue(
                              monthForm,
                              field.key,
                              field.type,
                            )}
                            onChange={(e) =>
                              setMonthForm((current) =>
                                setExtraValue(
                                  current,
                                  field.key,
                                  e.target.value,
                                  field.type,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button onClick={upsertMonth}>
                    {editingMonthId ? "Guardar cambios" : "Agregar mes"}
                  </Button>
                  <Button variant="outline" onClick={resetMonthForm}>
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base mensual</CardTitle>
                <CardDescription>
                  CRUD principal. Desde aquí salen todos los cálculos del panel
                  superior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.17", "Mes")}
                          onChange={(v) => setColumnLabel("th.17", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.18", "ADS")}
                          onChange={(v) => setColumnLabel("th.18", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.19", "Revenue HT")}
                          onChange={(v) => setColumnLabel("th.19", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.20", "Nuevos")}
                          onChange={(v) => setColumnLabel("th.20", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.21", "Activos")}
                          onChange={(v) => setColumnLabel("th.21", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.22", "Costo op.")}
                          onChange={(v) => setColumnLabel("th.22", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.23", "ROIC op.")}
                          onChange={(v) => setColumnLabel("th.23", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.24", "Ventas")}
                          onChange={(v) => setColumnLabel("th.24", v)}
                        />
                      </TableHead>
                      {recordCustomFields
                        .filter((f) => f.showInTable)
                        .map((f) => (
                          <TableHead key={`th-${f.key}`}>{f.label}</TableHead>
                        ))}
                      <TableHead className="text-right">
                        <EditableHeader
                          value={getColumnLabel("th.25", "Acciones")}
                          onChange={(v) => setColumnLabel("th.25", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortBusinessRecords(state.records).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.ads}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, { ads: v })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.highTicketRevenue}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                highTicketRevenue: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.newClients}
                            onChange={(v) =>
                              updateRecordField(record.id, { newClients: v })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.activeStudents}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                activeStudents: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.operatingCostMonthly}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                operatingCostMonthly: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.roicOperationalCost}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                roicOperationalCost: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.marketingSalesCost}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                marketingSalesCost: v,
                              })
                            }
                          />
                        </TableCell>
                        {recordCustomFields
                          .filter((f) => f.showInTable)
                          .map((f) => (
                            <TableCell key={`td-${record.id}-${f.key}`}>
                              {formatCustomValue(record.extra?.[f.key], f.type)}
                            </TableCell>
                          ))}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMonthForm({
                                  ...record,
                                  extra: { ...(record.extra ?? {}) },
                                });
                                setEditingMonthId(record.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  records: current.records.filter(
                                    (item) => item.id !== record.id,
                                  ),
                                  expenses: current.expenses.filter(
                                    (expense) => expense.month !== record.month,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card className="border-rose-200 dark:border-rose-800">
              <CardHeader className="bg-rose-50/50 dark:bg-rose-950/30 rounded-t-lg">
                <CardTitle className="text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  {editingExpenseId
                    ? "Editar partida"
                    : "Nueva partida de costo"}
                </CardTitle>
                <CardDescription>
                  Desglose manual para enriquecer el análisis. Sirve para
                  auditoría y control de origen del gasto.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <Label>Mes</Label>
                  <Input
                    type="month"
                    value={expenseForm.month}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        month: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select
                    value={expenseForm.scope}
                    onValueChange={(value: "operativo" | "ventas") =>
                      setExpenseForm((current) => ({
                        ...current,
                        scope: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operativo">Operativo</SelectItem>
                      <SelectItem value="ventas">Ventas / marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        category: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        amount: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 xl:col-span-5">
                  <Label>Nota</Label>
                  <Textarea
                    value={expenseForm.note ?? ""}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        note: e.target.value,
                      }))
                    }
                  />
                </div>
                {expenseCustomFields.length > 0 && (
                  <div className="xl:col-span-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      Campos personalizados
                    </p>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {expenseCustomFields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label className="flex items-center gap-1">
                            {field.label}
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px]"
                            >
                              {field.key}
                            </Badge>
                          </Label>
                          <Input
                            type={field.type === "text" ? "text" : "number"}
                            step={field.type === "percent" ? "0.01" : undefined}
                            value={getExtraValue(
                              expenseForm,
                              field.key,
                              field.type,
                            )}
                            onChange={(e) =>
                              setExpenseForm((current) =>
                                setExtraValue(
                                  current,
                                  field.key,
                                  e.target.value,
                                  field.type,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2 xl:col-span-5">
                  <Button onClick={upsertExpense}>
                    <Plus className="mr-2 h-4 w-4" />
                    {editingExpenseId ? "Guardar partida" : "Agregar partida"}
                  </Button>
                  <Button variant="outline" onClick={resetExpenseForm}>
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listado de partidas</CardTitle>
                <CardDescription>
                  Puedes cargar el gasto con el nivel de detalle que necesites y
                  seguir manteniendo el maestro mensual arriba.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.26", "Mes")}
                          onChange={(v) => setColumnLabel("th.26", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.27", "Scope")}
                          onChange={(v) => setColumnLabel("th.27", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.28", "Categoría")}
                          onChange={(v) => setColumnLabel("th.28", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.29", "Monto")}
                          onChange={(v) => setColumnLabel("th.29", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.30", "Nota")}
                          onChange={(v) => setColumnLabel("th.30", v)}
                        />
                      </TableHead>
                      {expenseCustomFields
                        .filter((f) => f.showInTable)
                        .map((f) => (
                          <TableHead key={`exth-${f.key}`}>{f.label}</TableHead>
                        ))}
                      <TableHead className="text-right">
                        <EditableHeader
                          value={getColumnLabel("th.31", "Acciones")}
                          onChange={(v) => setColumnLabel("th.31", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatMonthLabel(expense.month)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              expense.scope === "operativo"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700"
                            }
                            variant="outline"
                          >
                            {expense.scope}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="max-w-65 truncate">
                          {expense.note || "-"}
                        </TableCell>
                        {expenseCustomFields
                          .filter((f) => f.showInTable)
                          .map((f) => (
                            <TableCell key={`extd-${expense.id}-${f.key}`}>
                              {formatCustomValue(
                                expense.extra?.[f.key],
                                f.type,
                              )}
                            </TableCell>
                          ))}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpenseForm({
                                  ...expense,
                                  extra: { ...(expense.extra ?? {}) },
                                });
                                setEditingExpenseId(expense.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  expenses: current.expenses.filter(
                                    (item) => item.id !== expense.id,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adquisicion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Hoja 1 — CAC (Costo de adquisición de cliente)
                </CardTitle>
                <CardDescription>
                  CAC = (ADS + Comisiones closers + Carla/bonos) ÷ Nuevos
                  clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("cac.mes", "Mes")}
                          onChange={(v) => setColumnLabel("cac.mes", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("cac.ads", "ADS")}
                          onChange={(v) => setColumnLabel("cac.ads", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "cac.closerCommissions",
                            "Comisiones closers",
                          )}
                          onChange={(v) =>
                            setColumnLabel("cac.closerCommissions", v)
                          }
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("cac.carla", "Carla")}
                          onChange={(v) => setColumnLabel("cac.carla", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("cac.bonos", "Bonos")}
                          onChange={(v) => setColumnLabel("cac.bonos", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "cac.totalAdquisicion",
                            "Total adquisición",
                          )}
                          onChange={(v) =>
                            setColumnLabel("cac.totalAdquisicion", v)
                          }
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "cac.newClients",
                            "Nuevos clientes",
                          )}
                          onChange={(v) => setColumnLabel("cac.newClients", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("cac.cac", "CAC")}
                          onChange={(v) => setColumnLabel("cac.cac", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.ads}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, { ads: v })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.closerCommissions}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                closerCommissions: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.carlaBonus}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, { carlaBonus: v })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.bonos || 0}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, { bonos: v })
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.acquisitionCost)}
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.newClients}
                            onChange={(v) =>
                              updateRecordField(record.id, { newClients: v })
                            }
                          />
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.cac)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Hoja 2 — Ingreso por cliente
                </CardTitle>
                <CardDescription>
                  Ingreso por cliente = (Ingresos HT − pérdida por morosidad) ÷
                  Clientes HT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.32", "Mes")}
                          onChange={(v) => setColumnLabel("th.32", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.33", "Ingresos HT")}
                          onChange={(v) => setColumnLabel("th.33", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.34", "% Morosidad")}
                          onChange={(v) => setColumnLabel("th.34", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.35", "Pérdida morosidad")}
                          onChange={(v) => setColumnLabel("th.35", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.36", "Clientes HT")}
                          onChange={(v) => setColumnLabel("th.36", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.37", "Ingreso por cliente")}
                          onChange={(v) => setColumnLabel("th.37", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.highTicketRevenue}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                highTicketRevenue: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.delinquencyRate}
                            step="0.01"
                            format={formatPercent}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                delinquencyRate: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-destructive">
                          {formatCurrency(kpis.delinquencyLoss)}
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.highTicketClients}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                highTicketClients: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costos-op" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Costos por alumno activo y desglose de partidas operativas.
              </p>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                size="sm"
                onClick={() => {
                  resetExpenseForm();
                  setExpenseForm((f) => ({ ...f, scope: "operativo" }));
                  setActiveTab("expenses");
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Nueva partida operativa
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Hoja 3 — Costo operativo por cliente
                </CardTitle>
                <CardDescription>
                  Costo por cliente = Costos operativos mensuales ÷ Alumnos
                  activos. Costo total = costo mensual × duración (4 meses).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.38", "Mes")}
                          onChange={(v) => setColumnLabel("th.38", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.39", "Costos mensuales")}
                          onChange={(v) => setColumnLabel("th.39", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.40", "Alumnos activos")}
                          onChange={(v) => setColumnLabel("th.40", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.41",
                            "Clientes HT (nuevos)",
                          )}
                          onChange={(v) => setColumnLabel("th.41", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.42",
                            "Costo / cliente (mensual)",
                          )}
                          onChange={(v) => setColumnLabel("th.42", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.43",
                            "Costo total / cliente (4 meses)",
                          )}
                          onChange={(v) => setColumnLabel("th.43", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.operatingCostMonthly}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                operatingCostMonthly: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.activeStudents}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                activeStudents: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.highTicketClients}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                highTicketClients: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.costPerClient)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.totalCostPerClient)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Desglose de partidas por mes — Hoja 3 (columnas M:O)
                </CardTitle>
                <CardDescription>
                  Cada línea de gasto con su importe, los alumnos activos del
                  mes y lo que representa individualmente por cliente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.44", "Mes")}
                          onChange={(v) => setColumnLabel("th.44", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.45", "Tipo")}
                          onChange={(v) => setColumnLabel("th.45", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.46", "Partida")}
                          onChange={(v) => setColumnLabel("th.46", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.47", "Importe")}
                          onChange={(v) => setColumnLabel("th.47", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.48", "Alumnos activos")}
                          onChange={(v) => setColumnLabel("th.48", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.49", "Costo / cliente")}
                          onChange={(v) => setColumnLabel("th.49", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.50", "Nota")}
                          onChange={(v) => setColumnLabel("th.50", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleExpenses.map((expense) => {
                      const students =
                        activeStudentsByMonth.get(expense.month) ?? 0;
                      const costPerClient =
                        students > 0 ? expense.amount / students : 0;
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {formatMonthLabel(expense.month)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                expense.scope === "operativo"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700"
                              }
                              variant="outline"
                            >
                              {expense.scope}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.category}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>{students}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(costPerClient)}
                          </TableCell>
                          <TableCell className="max-w-52 truncate text-muted-foreground">
                            {expense.note || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rentabilidad" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Hojas 4 y 5 — Margen operativo y LTGP
                </CardTitle>
                <CardDescription>
                  Margen op. = Ingreso/cliente − Costo op./cliente (Hoja 4).
                  LTGP = Margen op. por cliente (Hoja 5, réplica Excel). LTGP
                  proyectado = Margen × duración.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.51", "Mes")}
                          onChange={(v) => setColumnLabel("th.51", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.52", "Ingreso / cliente")}
                          onChange={(v) => setColumnLabel("th.52", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.53", "Costo op. / cliente")}
                          onChange={(v) => setColumnLabel("th.53", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.54",
                            "Margen op. / cliente (H4)",
                          )}
                          onChange={(v) => setColumnLabel("th.54", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.55", "LTGP Excel (H5)")}
                          onChange={(v) => setColumnLabel("th.55", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.56", "LTGP proyectado")}
                          onChange={(v) => setColumnLabel("th.56", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.costPerClient)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.operatingMarginPerClient)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.ltgpExcel)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.ltgpProjected)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Hoja 6 — CAC Ratio (Relación LTGP / CAC)
                </CardTitle>
                <CardDescription>
                  CAC Ratio = LTGP ÷ CAC. Un ratio &gt; 3 indica rentabilidad
                  saludable por cliente adquirido.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.57", "Mes")}
                          onChange={(v) => setColumnLabel("th.57", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.58", "LTGP")}
                          onChange={(v) => setColumnLabel("th.58", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.59", "CAC")}
                          onChange={(v) => setColumnLabel("th.59", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.60",
                            "CAC Ratio (LTGP ÷ CAC)",
                          )}
                          onChange={(v) => setColumnLabel("th.60", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.61", "Evaluación")}
                          onChange={(v) => setColumnLabel("th.61", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell
                          className={`font-bold ${
                            kpis.cacRatio >= 3
                              ? "text-green-600 dark:text-green-400"
                              : kpis.cacRatio >= 1
                                ? "text-yellow-600 dark:text-yellow-500"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {kpis.cacRatio.toFixed(2)}x
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              kpis.cacRatio >= 3
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300"
                                : kpis.cacRatio >= 1
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300"
                            }
                            variant="outline"
                          >
                            {kpis.cacRatio >= 3
                              ? "Saludable"
                              : kpis.cacRatio >= 1
                                ? "Ajustado"
                                : "Por debajo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Hoja 7 — Beneficio por cliente
                </CardTitle>
                <CardDescription>
                  Beneficio por cliente = LTGP − CAC. Representa el beneficio
                  neto generado por cada cliente tras recuperar el coste de
                  adquisición.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.62", "Mes")}
                          onChange={(v) => setColumnLabel("th.62", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.63", "LTGP")}
                          onChange={(v) => setColumnLabel("th.63", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.64", "CAC")}
                          onChange={(v) => setColumnLabel("th.64", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.65",
                            "Beneficio por cliente",
                          )}
                          onChange={(v) => setColumnLabel("th.65", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell
                          className={`font-bold ${kpis.benefitPerClient >= 0 ? "" : "text-destructive"}`}
                        >
                          {formatCurrency(kpis.benefitPerClient)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  Hoja 8 — Periodo de recuperación (Payback)
                </CardTitle>
                <CardDescription>
                  Payback = CAC ÷ (Ingreso por cliente ÷ Duración). Indica en
                  cuántos meses se recupera el coste de adquisición.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.66", "Mes")}
                          onChange={(v) => setColumnLabel("th.66", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.67", "CAC")}
                          onChange={(v) => setColumnLabel("th.67", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.68",
                            "Ingreso / cliente real",
                          )}
                          onChange={(v) => setColumnLabel("th.68", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.69",
                            "Ing. ÷ Duración (mensual)",
                          )}
                          onChange={(v) => setColumnLabel("th.69", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.70", "Payback en meses")}
                          onChange={(v) => setColumnLabel("th.70", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            kpis.incomePerClient / record.durationMonths,
                          )}
                        </TableCell>
                        <TableCell className="font-bold">
                          {kpis.paybackMonths.toFixed(2)} meses
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roic-detail" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Hoja 9 — ROIC (Retorno sobre la inversión operativa)
                </CardTitle>
                <CardDescription>
                  ROIC = Profit ÷ (Gasto operativo + Ventas/mkt). Profit =
                  Ingresos HT − Gasto op. − Gasto ventas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.71", "Mes")}
                          onChange={(v) => setColumnLabel("th.71", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.72", "Ingresos HT")}
                          onChange={(v) => setColumnLabel("th.72", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.73", "Gastos operativos")}
                          onChange={(v) => setColumnLabel("th.73", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.74", "Costos ventas/mkt")}
                          onChange={(v) => setColumnLabel("th.74", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.75", "Profit")}
                          onChange={(v) => setColumnLabel("th.75", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.76", "ROIC")}
                          onChange={(v) => setColumnLabel("th.76", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.77", "Observación")}
                          onChange={(v) => setColumnLabel("th.77", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.highTicketRevenue}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                highTicketRevenue: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.roicOperationalCost}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                roicOperationalCost: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCurrencyCell
                            value={record.marketingSalesCost}
                            format={formatCurrency}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                marketingSalesCost: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell
                          className={`font-medium ${kpis.roicProfit >= 0 ? "" : "text-destructive"}`}
                        >
                          {formatCurrency(kpis.roicProfit)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatPercent(kpis.roic)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          Por cada $1 invertido, generas $
                          {Math.max(0, kpis.roic).toFixed(2)} adicional
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Desglose de partidas ventas/mkt (Hoja 9 — columnas K:N)
                </CardTitle>
                <CardDescription>
                  Partidas de tipo &quot;ventas&quot; cargadas en la pestaña
                  Partidas. Equivalen a la columna &quot;Ventas&quot; del SUMIFS
                  de la hoja 9.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.78", "Mes")}
                          onChange={(v) => setColumnLabel("th.78", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.79", "Categoría")}
                          onChange={(v) => setColumnLabel("th.79", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.80", "Importe")}
                          onChange={(v) => setColumnLabel("th.80", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.81", "Nota")}
                          onChange={(v) => setColumnLabel("th.81", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleExpenses
                      .filter((e) => e.scope === "ventas")
                      .map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {formatMonthLabel(expense.month)}
                          </TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="max-w-60 truncate text-muted-foreground">
                            {expense.note || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dinamica" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Hoja 10 — Velocidad de ventas
                </CardTitle>
                <CardDescription>
                  Velocidad de ventas = Clientes mensuales × Ingreso por
                  cliente. Mide el volumen de valor generado por las ventas en
                  el mes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.82", "Mes")}
                          onChange={(v) => setColumnLabel("th.82", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.83", "Clientes mensuales")}
                          onChange={(v) => setColumnLabel("th.83", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.84", "Ingreso / cliente")}
                          onChange={(v) => setColumnLabel("th.84", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.85", "Velocidad de ventas")}
                          onChange={(v) => setColumnLabel("th.85", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.newClients}
                            onChange={(v) =>
                              updateRecordField(record.id, { newClients: v })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.salesVelocity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Hoja 11 — Rotación estructural
                </CardTitle>
                <CardDescription>
                  Rotación estructural = Clientes activos × Churn. Estima
                  cuántos clientes salen mensualmente del sistema de forma
                  natural.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.86", "Mes")}
                          onChange={(v) => setColumnLabel("th.86", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.87", "Clientes activos")}
                          onChange={(v) => setColumnLabel("th.87", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.88", "Churn estructural")}
                          onChange={(v) => setColumnLabel("th.88", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.89",
                            "Clientes que rotan (salidas)",
                          )}
                          onChange={(v) => setColumnLabel("th.89", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.activeStudents}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                activeStudents: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.churnRate}
                            step="0.01"
                            format={formatPercent}
                            onChange={(v) =>
                              updateRecordField(record.id, { churnRate: v })
                            }
                          />
                        </TableCell>
                        <TableCell className="font-bold">
                          {kpis.structuralChurn.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Hoja 12 — Relación entrada vs salida
                </CardTitle>
                <CardDescription>
                  Entrada vs salida = Ventas ÷ Rotación estructural. Si es &gt;
                  1, el negocio crece. Si es &lt; 1, pierde base.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.90", "Mes")}
                          onChange={(v) => setColumnLabel("th.90", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.91", "Ventas (entradas)")}
                          onChange={(v) => setColumnLabel("th.91", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.92",
                            "Rotación estructural (salidas)",
                          )}
                          onChange={(v) => setColumnLabel("th.92", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.93", "Entrada vs salida")}
                          onChange={(v) => setColumnLabel("th.93", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.94", "Tendencia")}
                          onChange={(v) => setColumnLabel("th.94", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.newClients}
                            onChange={(v) =>
                              updateRecordField(record.id, { newClients: v })
                            }
                          />
                        </TableCell>
                        <TableCell>{kpis.structuralChurn.toFixed(1)}</TableCell>
                        <TableCell className="font-bold">
                          {kpis.entryVsExit.toFixed(2)}x
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              kpis.entryVsExit >= 1.2
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300"
                                : kpis.entryVsExit >= 1
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300"
                            }
                            variant="outline"
                          >
                            {kpis.entryVsExit >= 1.2
                              ? "Crecimiento"
                              : kpis.entryVsExit >= 1
                                ? "Estable"
                                : "Decrecimiento"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Hoja 13 — Valor bruto generado por mes
                </CardTitle>
                <CardDescription>
                  Valor bruto = Clientes HT × LTGP. Representa el valor total
                  que se genera en el mes a lo largo de toda la vida de los
                  clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.95", "Mes")}
                          onChange={(v) => setColumnLabel("th.95", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.96", "Clientes HT")}
                          onChange={(v) => setColumnLabel("th.96", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel("th.97", "LTGP")}
                          onChange={(v) => setColumnLabel("th.97", v)}
                        />
                      </TableHead>
                      <TableHead>
                        <EditableHeader
                          value={getColumnLabel(
                            "th.98",
                            "Valor bruto generado",
                          )}
                          onChange={(v) => setColumnLabel("th.98", v)}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          <EditableNumberCell
                            value={record.highTicketClients}
                            onChange={(v) =>
                              updateRecordField(record.id, {
                                highTicketClients: v,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.grossValueGenerated)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Fase 3: Tab Academia ────────────────────────────────────────── */}
          <TabsContent value="academia" className="space-y-4">
            <Card>
              <CardHeader className="bg-violet-50/60 dark:bg-violet-950/30 rounded-t-lg">
                <CardTitle className="text-violet-800 dark:text-violet-300">
                  Análisis de academia
                </CardTitle>
                <CardDescription>
                  Cohortes, retención, LTV real vs proyectado y métricas de
                  calidad por mes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cohortData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay datos. Agrega registros mensuales en la pestaña Base
                    Mensual.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <EditableHeader
                              value={getColumnLabel("th.99", "Mes")}
                              onChange={(v) => setColumnLabel("th.99", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.100", "Nuevos")}
                              onChange={(v) => setColumnLabel("th.100", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.101", "HT")}
                              onChange={(v) => setColumnLabel("th.101", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.102", "Activos")}
                              onChange={(v) => setColumnLabel("th.102", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.103", "Retención")}
                              onChange={(v) => setColumnLabel("th.103", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.104", "Revenue")}
                              onChange={(v) => setColumnLabel("th.104", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.105", "Rev/cliente")}
                              onChange={(v) => setColumnLabel("th.105", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.106", "CAC")}
                              onChange={(v) => setColumnLabel("th.106", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.107", "LTGP real")}
                              onChange={(v) => setColumnLabel("th.107", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.108", "LTGP proy.")}
                              onChange={(v) => setColumnLabel("th.108", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.109", "Payback")}
                              onChange={(v) => setColumnLabel("th.109", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.110", "ROIC")}
                              onChange={(v) => setColumnLabel("th.110", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.111", "Op. ($)")}
                              onChange={(v) => setColumnLabel("th.111", v)}
                            />
                          </TableHead>
                          <TableHead className="text-right">
                            <EditableHeader
                              value={getColumnLabel("th.112", "Ventas ($)")}
                              onChange={(v) => setColumnLabel("th.112", v)}
                            />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cohortData.map((row) => {
                          const roicColor =
                            row.roic == null
                              ? ""
                              : row.roic >= 0.3
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : row.roic >= 0
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400 font-bold";
                          const retColor =
                            row.retentionRate == null
                              ? ""
                              : row.retentionRate >= 0.7
                                ? "text-emerald-600"
                                : row.retentionRate >= 0.4
                                  ? "text-yellow-600"
                                  : "text-red-500";
                          return (
                            <TableRow key={row.month}>
                              <TableCell className="font-medium">
                                {formatMonthLabel(row.month)}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.newClients}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.highTicketClients}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.activeStudents}
                              </TableCell>
                              <TableCell className={`text-right ${retColor}`}>
                                {row.retentionRate != null
                                  ? `${(row.retentionRate * 100).toFixed(1)}%`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(row.revenue)}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.revenuePerClient > 0
                                  ? formatCurrency(row.revenuePerClient)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.cac != null
                                  ? formatCurrency(row.cac)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.ltgpExcel != null
                                  ? formatCurrency(row.ltgpExcel)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.ltgpProjected != null
                                  ? formatCurrency(row.ltgpProjected)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.paybackMonths != null
                                  ? `${row.paybackMonths.toFixed(1)} m`
                                  : "—"}
                              </TableCell>
                              <TableCell className={`text-right ${roicColor}`}>
                                {row.roic != null
                                  ? `${(row.roic * 100).toFixed(1)}%`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.expensesOperativo > 0
                                  ? formatCurrency(row.expensesOperativo)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.expensesVentas > 0
                                  ? formatCurrency(row.expensesVentas)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Promedios generales */}
            {cohortData.length > 0 &&
              (() => {
                const withRet = cohortData.filter(
                  (r) => r.retentionRate != null,
                );
                const withRoic = cohortData.filter((r) => r.roic != null);
                const withPayback = cohortData.filter(
                  (r) => r.paybackMonths != null && r.paybackMonths > 0,
                );
                const avgRet =
                  withRet.length > 0
                    ? withRet.reduce((a, b) => a + (b.retentionRate ?? 0), 0) /
                      withRet.length
                    : null;
                const avgRoic =
                  withRoic.length > 0
                    ? withRoic.reduce((a, b) => a + (b.roic ?? 0), 0) /
                      withRoic.length
                    : null;
                const avgPayback =
                  withPayback.length > 0
                    ? withPayback.reduce(
                        (a, b) => a + (b.paybackMonths ?? 0),
                        0,
                      ) / withPayback.length
                    : null;
                const totalRevenue = cohortData.reduce(
                  (a, b) => a + b.revenue,
                  0,
                );
                return (
                  <div className="grid gap-3 md:grid-cols-4">
                    <Card className="border-violet-200 dark:border-violet-800">
                      <CardContent className="pt-5 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Retención media
                        </p>
                        <p
                          className={`text-2xl font-bold ${avgRet != null && avgRet >= 0.7 ? "text-emerald-600" : avgRet != null && avgRet >= 0.4 ? "text-yellow-600" : "text-red-500"}`}
                        >
                          {avgRet != null
                            ? `${(avgRet * 100).toFixed(1)}%`
                            : "—"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-violet-200 dark:border-violet-800">
                      <CardContent className="pt-5 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          ROIC medio
                        </p>
                        <p
                          className={`text-2xl font-bold ${avgRoic != null && avgRoic >= 0.3 ? "text-emerald-600" : avgRoic != null && avgRoic >= 0 ? "text-yellow-600" : "text-red-500"}`}
                        >
                          {avgRoic != null
                            ? `${(avgRoic * 100).toFixed(1)}%`
                            : "—"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-violet-200 dark:border-violet-800">
                      <CardContent className="pt-5 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Payback medio
                        </p>
                        <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                          {avgPayback != null
                            ? `${avgPayback.toFixed(1)} m`
                            : "—"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-violet-200 dark:border-violet-800">
                      <CardContent className="pt-5 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Revenue total
                        </p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(totalRevenue)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
          </TabsContent>

          <TabsContent value="formulas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mapa de fórmulas</CardTitle>
                <CardDescription>
                  Traducción directa del Excel y capa mejorada con LTGP
                  proyectado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {BUSINESS_FORMULAS.map((item, index) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {index + 1}. {item.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.formula}
                        </p>
                      </div>
                    </div>
                    {index < BUSINESS_FORMULAS.length - 1 ? (
                      <Separator />
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auto-admin" className="space-y-4">
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="bg-amber-50/50 dark:bg-amber-950/30 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Settings className="h-4 w-4" />
                  Auto-administración
                </CardTitle>
                <CardDescription>
                  Todo lo que ves en este módulo se guarda en el metadata
                  sincronizado (entidad{" "}
                  <code className="text-xs">business_metrics_state</code>). Aquí
                  puedes definir campos nuevos, fórmulas/KPIs y la clave de
                  acceso sin tocar el código.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* ── Clave de acceso del módulo ─────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4" />
                  Clave de acceso del módulo
                </CardTitle>
                <CardDescription>
                  La clave actual se solicita al entrar. Si la dejas vacía se
                  usa la clave por defecto del sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <Input
                    type="text"
                    value={
                      vaultDraft !== ""
                        ? vaultDraft
                        : (state.vaultPassword ?? "")
                    }
                    placeholder={BM_VAULT_PASSWORD_DEFAULT}
                    onChange={(e) => setVaultDraft(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      setVaultPassword(vaultDraft.trim());
                      setVaultSavedFlash(true);
                      setTimeout(() => setVaultSavedFlash(false), 2000);
                    }}
                  >
                    Guardar clave
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVaultDraft("");
                      setVaultPassword("");
                    }}
                  >
                    Restablecer
                  </Button>
                </div>
                {vaultSavedFlash && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Clave actualizada y sincronizada.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Recuerda: cualquier admin con permiso para abrir este panel
                  puede ver o cambiar la clave. Para mayor seguridad mueve la
                  validación a backend.
                </p>
              </CardContent>
            </Card>

            {/* ── Campos personalizados ──────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" />
                  Campos personalizados
                </CardTitle>
                <CardDescription>
                  Crea columnas/atributos nuevos para los meses o las partidas.
                  Quedan disponibles para usarlos en fórmulas personalizadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="space-y-1 xl:col-span-2">
                    <Label className="text-xs">Etiqueta</Label>
                    <Input
                      value={fieldDraft.label}
                      placeholder="p. ej. Comisión Affiliates"
                      onChange={(e) => {
                        const label = e.target.value;
                        setFieldDraft((current) => ({
                          ...current,
                          label,
                          key:
                            fieldEditingKey || current.key
                              ? current.key
                              : slugifyCustomKey(label),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1 xl:col-span-2">
                    <Label className="text-xs">Clave (uso en fórmulas)</Label>
                    <Input
                      value={fieldDraft.key}
                      placeholder="comisionAffiliates"
                      onChange={(e) =>
                        setFieldDraft((current) => ({
                          ...current,
                          key: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={fieldDraft.type}
                      onValueChange={(value: CustomFieldType) =>
                        setFieldDraft((current) => ({
                          ...current,
                          type: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="currency">Moneda (USD)</SelectItem>
                        <SelectItem value="percent">Porcentaje</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Destino</Label>
                    <Select
                      value={fieldDraft.target}
                      onValueChange={(value: CustomFieldTarget) =>
                        setFieldDraft((current) => ({
                          ...current,
                          target: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="record">Mes (CRUD)</SelectItem>
                        <SelectItem value="expense">Partida (gasto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 xl:col-span-6">
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!!fieldDraft.showInTable}
                        onChange={(e) =>
                          setFieldDraft((current) => ({
                            ...current,
                            showInTable: e.target.checked,
                          }))
                        }
                      />
                      Mostrar como columna en la tabla
                    </label>
                    <div className="grow" />
                    <Button
                      onClick={() => {
                        const candidate: CustomFieldDef = {
                          ...fieldDraft,
                          label: fieldDraft.label.trim(),
                          key:
                            fieldDraft.key.trim() ||
                            slugifyCustomKey(fieldDraft.label),
                        };
                        if (!candidate.label) {
                          setFieldError("La etiqueta es obligatoria.");
                          return;
                        }
                        const validationError = validateCustomFieldKey(
                          candidate.key,
                          candidate.target,
                          customFields,
                          fieldEditingKey ?? undefined,
                        );
                        if (validationError) {
                          setFieldError(validationError);
                          return;
                        }
                        setFieldError(null);
                        if (fieldEditingKey) {
                          updateCustomField(fieldEditingKey, candidate);
                        } else {
                          addCustomField(candidate);
                        }
                        setFieldDraft({
                          key: "",
                          label: "",
                          type: "number",
                          target: "record",
                          showInTable: true,
                        });
                        setFieldEditingKey(null);
                      }}
                    >
                      {fieldEditingKey ? "Guardar cambios" : "Agregar campo"}
                    </Button>
                    {fieldEditingKey && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFieldEditingKey(null);
                          setFieldError(null);
                          setFieldDraft({
                            key: "",
                            label: "",
                            type: "number",
                            target: "record",
                            showInTable: true,
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
                {fieldError && (
                  <p className="text-sm text-red-500">{fieldError}</p>
                )}

                <Separator />

                {customFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay campos personalizados todavía. Crea el primero arriba
                    y aparecerá en los formularios.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.113", "Etiqueta")}
                            onChange={(v) => setColumnLabel("th.113", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.114", "Clave")}
                            onChange={(v) => setColumnLabel("th.114", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.115", "Tipo")}
                            onChange={(v) => setColumnLabel("th.115", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.116", "Destino")}
                            onChange={(v) => setColumnLabel("th.116", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.117", "Columna")}
                            onChange={(v) => setColumnLabel("th.117", v)}
                          />
                        </TableHead>
                        <TableHead className="text-right">
                          <EditableHeader
                            value={getColumnLabel("th.118", "Acciones")}
                            onChange={(v) => setColumnLabel("th.118", v)}
                          />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customFields.map((field) => (
                        <TableRow key={`${field.target}-${field.key}`}>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>
                            <code className="text-xs">{field.key}</code>
                          </TableCell>
                          <TableCell>{field.type}</TableCell>
                          <TableCell>
                            {field.target === "record" ? "Mes" : "Partida"}
                          </TableCell>
                          <TableCell>
                            {field.showInTable ? "Sí" : "No"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFieldDraft({ ...field });
                                  setFieldEditingKey(field.key);
                                  setFieldError(null);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeCustomField(field)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* ── Fórmulas/KPIs personalizados ───────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sigma className="h-4 w-4" />
                  Fórmulas / KPIs personalizados
                </CardTitle>
                <CardDescription>
                  Operadores soportados: <code>+ - * / ( )</code> y funciones{" "}
                  <code>min, max, abs, round, floor, ceil, sqrt, pow</code>.
                  Variables disponibles: campos base (ej.{" "}
                  <code>highTicketRevenue</code>, <code>activeStudents</code>),
                  KPIs calculados (ej. <code>cac</code>, <code>roic</code>,{" "}
                  <code>ltgpExcel</code>) y tus campos personalizados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="space-y-1 xl:col-span-2">
                    <Label className="text-xs">Nombre del KPI</Label>
                    <Input
                      value={formulaDraft.label}
                      placeholder="p. ej. Margen neto"
                      onChange={(e) => {
                        const label = e.target.value;
                        setFormulaDraft((current) => ({
                          ...current,
                          label,
                          key:
                            formulaEditingKey || current.key
                              ? current.key
                              : slugifyCustomKey(label),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1 xl:col-span-2">
                    <Label className="text-xs">Clave</Label>
                    <Input
                      value={formulaDraft.key}
                      placeholder="margenNeto"
                      onChange={(e) =>
                        setFormulaDraft((current) => ({
                          ...current,
                          key: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Formato</Label>
                    <Select
                      value={formulaDraft.format}
                      onValueChange={(value: CustomFormulaFormat) =>
                        setFormulaDraft((current) => ({
                          ...current,
                          format: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="currency">Moneda (USD)</SelectItem>
                        <SelectItem value="percent">Porcentaje</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!!formulaDraft.showInOverview}
                        onChange={(e) =>
                          setFormulaDraft((current) => ({
                            ...current,
                            showInOverview: e.target.checked,
                          }))
                        }
                      />
                      Mostrar en overview
                    </label>
                  </div>
                  <div className="space-y-1 xl:col-span-6">
                    <Label className="text-xs">Expresión</Label>
                    <Textarea
                      rows={2}
                      value={formulaDraft.expression}
                      placeholder="highTicketRevenue - operatingCostMonthly - marketingSalesCost"
                      onChange={(e) =>
                        setFormulaDraft((current) => ({
                          ...current,
                          expression: e.target.value,
                        }))
                      }
                    />
                    {visibleRecords[0] && formulaDraft.expression.trim() && (
                      <p className="text-[11px] text-muted-foreground">
                        Vista previa con <code>{visibleRecords[0].month}</code>:{" "}
                        {(() => {
                          const r = evaluateBusinessFormula(
                            formulaDraft.expression,
                            buildFormulaVariables(visibleRecords[0]),
                          );
                          if (!r.ok)
                            return (
                              <span className="text-red-500">{r.error}</span>
                            );
                          return (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatFormulaValue(r.value, formulaDraft.format)}
                            </span>
                          );
                        })()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end gap-2 xl:col-span-6">
                    <Button
                      onClick={() => {
                        const candidate: CustomFormulaDef = {
                          ...formulaDraft,
                          label: formulaDraft.label.trim(),
                          key:
                            formulaDraft.key.trim() ||
                            slugifyCustomKey(formulaDraft.label),
                          expression: formulaDraft.expression.trim(),
                        };
                        if (!candidate.label) {
                          setFormulaError("El nombre es obligatorio.");
                          return;
                        }
                        if (!candidate.key) {
                          setFormulaError("La clave es obligatoria.");
                          return;
                        }
                        if (
                          customFormulas.some(
                            (f) =>
                              f.key === candidate.key &&
                              f.key !== formulaEditingKey,
                          )
                        ) {
                          setFormulaError("Ya existe un KPI con esa clave.");
                          return;
                        }
                        if (!candidate.expression) {
                          setFormulaError("La expresión es obligatoria.");
                          return;
                        }
                        const test = evaluateBusinessFormula(
                          candidate.expression,
                          buildFormulaVariables(
                            visibleRecords[0] ??
                              state.records[0] ?? {
                                id: "",
                                month: "",
                                ads: 0,
                                closerCommissions: 0,
                                carlaBonus: 0,
                                bonos: 0,
                                newClients: 0,
                                highTicketRevenue: 0,
                                delinquencyRate: 0,
                                highTicketClients: 0,
                                activeStudents: 0,
                                durationMonths: 1,
                                churnRate: 0,
                                operatingCostMonthly: 0,
                                roicOperationalCost: 0,
                                marketingSalesCost: 0,
                              },
                          ),
                        );
                        if (!test.ok) {
                          setFormulaError(test.error);
                          return;
                        }
                        setFormulaError(null);
                        if (formulaEditingKey) {
                          updateCustomFormula(formulaEditingKey, candidate);
                        } else {
                          addCustomFormula(candidate);
                        }
                        setFormulaDraft({
                          key: "",
                          label: "",
                          expression: "",
                          format: "currency",
                          showInOverview: true,
                        });
                        setFormulaEditingKey(null);
                      }}
                    >
                      {formulaEditingKey ? "Guardar cambios" : "Agregar KPI"}
                    </Button>
                    {formulaEditingKey && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFormulaEditingKey(null);
                          setFormulaError(null);
                          setFormulaDraft({
                            key: "",
                            label: "",
                            expression: "",
                            format: "currency",
                            showInOverview: true,
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
                {formulaError && (
                  <p className="text-sm text-red-500">{formulaError}</p>
                )}

                <Separator />

                {customFormulas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay KPIs personalizados. Crea el primero arriba y
                    aparecerá como tarjeta en la vista general.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.119", "Nombre")}
                            onChange={(v) => setColumnLabel("th.119", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.120", "Clave")}
                            onChange={(v) => setColumnLabel("th.120", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.121", "Expresión")}
                            onChange={(v) => setColumnLabel("th.121", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.122", "Formato")}
                            onChange={(v) => setColumnLabel("th.122", v)}
                          />
                        </TableHead>
                        <TableHead>
                          <EditableHeader
                            value={getColumnLabel("th.123", "Valor (periodo)")}
                            onChange={(v) => setColumnLabel("th.123", v)}
                          />
                        </TableHead>
                        <TableHead className="text-right">
                          <EditableHeader
                            value={getColumnLabel("th.124", "Acciones")}
                            onChange={(v) => setColumnLabel("th.124", v)}
                          />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customFormulaSummaries.map(({ formula, result }) => (
                        <TableRow key={`f-${formula.key}`}>
                          <TableCell>{formula.label}</TableCell>
                          <TableCell>
                            <code className="text-xs">{formula.key}</code>
                          </TableCell>
                          <TableCell className="max-w-100 truncate">
                            <code className="text-xs">
                              {formula.expression}
                            </code>
                          </TableCell>
                          <TableCell>{formula.format}</TableCell>
                          <TableCell>
                            {result.ok ? (
                              formatFormulaValue(result.value, formula.format)
                            ) : (
                              <span className="text-red-500 text-xs">
                                {result.error}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFormulaDraft({ ...formula });
                                  setFormulaEditingKey(formula.key);
                                  setFormulaError(null);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeCustomFormula(formula.key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function BusinessMetricsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <BusinessMetricsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
