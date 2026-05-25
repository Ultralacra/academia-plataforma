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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import {
  BUSINESS_METRICS_ADMIN_ID,
  canAccessBusinessMetrics,
} from "@/lib/business-metrics";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Lock,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ENTITY = "team_performance_space_state";
const ENTITY_ID = "global";
const SHARED_SESSION_KEY = "bm-vault-auth";
const SHARED_DEFAULT_PASSWORD = "JJWEPNTLDIJE";

type KrStatus = "on_track" | "at_risk" | "off_track" | "paused";
type KrMeasurementType = "numeric" | "percentage" | "boolean" | "manual";
type KrQuarter = "Q1" | "Q2" | "Q3" | "Q4";

type KrItem = {
  id: string;
  title: string;
  description: string;
  periodQuarter: KrQuarter;
  periodYear: number;
  status: KrStatus;
  progress: number;
  // measurement fields
  measurementType: KrMeasurementType;
  targetValue: number | null;
  currentValue: number | null;
  unit: string;
  formula: string;
  aiReasoning: string;
  updatedAt: string;
};

type SubareaNode = {
  id: string;
  name: string;
  leaderCodes: string[];
  krs: KrItem[];
};

type AreaNode = {
  id: string;
  name: string;
  leaderCodes: string[];
  krs: KrItem[];
  subareas: SubareaNode[];
};

type TeamPerformanceState = {
  ownerCodes: string[];
  areas: AreaNode[];
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function csvToCodes(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function codesToCsv(values: string[]) {
  return values.join(", ");
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeKr(raw: any): KrItem {
  const statusRaw = String(raw?.status ?? "on_track");
  const status: KrStatus =
    statusRaw === "at_risk" ||
    statusRaw === "off_track" ||
    statusRaw === "paused"
      ? statusRaw
      : "on_track";

  const mtRaw = String(raw?.measurementType ?? "manual");
  const measurementType: KrMeasurementType =
    mtRaw === "numeric" ||
    mtRaw === "percentage" ||
    mtRaw === "boolean" ||
    mtRaw === "manual"
      ? mtRaw
      : "manual";

  const quarterRaw = String(raw?.periodQuarter ?? "");
  const periodQuarter: KrQuarter =
    quarterRaw === "Q1" ||
    quarterRaw === "Q2" ||
    quarterRaw === "Q3" ||
    quarterRaw === "Q4"
      ? quarterRaw
      : "Q2";

  const periodYear =
    typeof raw?.periodYear === "number" && raw.periodYear > 2000
      ? raw.periodYear
      : new Date().getFullYear();

  const targetValue =
    typeof raw?.targetValue === "number" ? raw.targetValue : null;
  const currentValue =
    typeof raw?.currentValue === "number" ? raw.currentValue : null;

  // Auto-calculate progress for numeric KRs
  let progress = clampProgress(Number(raw?.progress ?? 0));
  if (
    measurementType === "numeric" &&
    targetValue !== null &&
    targetValue > 0 &&
    currentValue !== null
  ) {
    progress = clampProgress((currentValue / targetValue) * 100);
  } else if (measurementType === "percentage" && currentValue !== null) {
    progress = clampProgress(currentValue);
  } else if (measurementType === "boolean") {
    progress = currentValue ? 100 : 0;
  }

  return {
    id: String(raw?.id ?? uid()),
    title: String(raw?.title ?? "KR"),
    description: String(raw?.description ?? ""),
    periodQuarter,
    periodYear,
    status,
    progress,
    measurementType,
    targetValue,
    currentValue,
    unit: String(raw?.unit ?? ""),
    formula: String(raw?.formula ?? ""),
    aiReasoning: String(raw?.aiReasoning ?? ""),
    updatedAt: String(raw?.updatedAt ?? nowIso()),
  };
}

function normalizeState(raw: unknown): TeamPerformanceState {
  const base = buildSeedState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;
  const ownerCodes = Array.isArray(r.ownerCodes)
    ? r.ownerCodes.map((c) => String(c)).filter(Boolean)
    : base.ownerCodes;

  const areasRaw = Array.isArray(r.areas) ? r.areas : [];
  const areas: AreaNode[] = areasRaw.map((areaAny) => {
    const area = (areaAny ?? {}) as Record<string, unknown>;
    const subareasRaw = Array.isArray(area.subareas) ? area.subareas : [];
    const krsRaw = Array.isArray(area.krs) ? area.krs : [];
    return {
      id: String(area.id ?? uid()),
      name: String(area.name ?? "Area"),
      leaderCodes: Array.isArray(area.leaderCodes)
        ? area.leaderCodes.map((x) => String(x)).filter(Boolean)
        : [],
      krs: krsRaw.map((k) => normalizeKr(k)),
      subareas: subareasRaw.map((subAny) => {
        const sub = (subAny ?? {}) as Record<string, unknown>;
        const subKrsRaw = Array.isArray(sub.krs) ? sub.krs : [];
        return {
          id: String(sub.id ?? uid()),
          name: String(sub.name ?? "Subarea"),
          leaderCodes: Array.isArray(sub.leaderCodes)
            ? sub.leaderCodes.map((x) => String(x)).filter(Boolean)
            : [],
          krs: subKrsRaw.map((k) => normalizeKr(k)),
        };
      }),
    };
  });

  return {
    ownerCodes,
    areas: areas.length ? areas : base.areas,
  };
}

function buildSeedState(): TeamPerformanceState {
  return {
    ownerCodes: [String(BUSINESS_METRICS_ADMIN_ID)],
    areas: [
      {
        id: "marketing",
        name: "Marketing",
        leaderCodes: [],
        krs: [],
        subareas: [],
      },
      { id: "ventas", name: "Ventas", leaderCodes: [], krs: [], subareas: [] },
      {
        id: "delivery",
        name: "Delivery",
        leaderCodes: [],
        krs: [],
        subareas: [],
      },
      {
        id: "rrhh",
        name: "Recursos Humanos",
        leaderCodes: [],
        krs: [],
        subareas: [],
      },
      {
        id: "finanzas",
        name: "Finanzas",
        leaderCodes: [],
        krs: [],
        subareas: [],
      },
    ],
  };
}

function statusLabel(status: KrStatus) {
  if (status === "on_track") return "En curso";
  if (status === "at_risk") return "En riesgo";
  if (status === "off_track") return "Fuera de rumbo";
  return "Pausado";
}

function statusBadgeVariant(
  status: KrStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "on_track") return "default";
  if (status === "at_risk") return "secondary";
  if (status === "off_track") return "destructive";
  return "outline";
}

const STATUS_STYLES: Record<
  KrStatus,
  {
    border: string;
    dot: string;
    label: string;
    badgeClass: string;
    selectBg: string;
    progressFill: string;
  }
> = {
  on_track: {
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
    label: "En curso",
    badgeClass:
      "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    selectBg:
      "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    progressFill: "bg-emerald-500",
  },
  at_risk: {
    border: "border-l-amber-500",
    dot: "bg-amber-500",
    label: "En riesgo",
    badgeClass:
      "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    selectBg:
      "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    progressFill: "bg-amber-500",
  },
  off_track: {
    border: "border-l-red-500",
    dot: "bg-red-500",
    label: "Fuera de rumbo",
    badgeClass:
      "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
    selectBg:
      "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
    progressFill: "bg-red-500",
  },
  paused: {
    border: "border-l-slate-400",
    dot: "bg-slate-400",
    label: "Pausado",
    badgeClass:
      "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    selectBg:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600",
    progressFill: "bg-slate-400",
  },
};

function KrProgressBar({ value, status }: { value: number; status: KrStatus }) {
  return (
    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          STATUS_STYLES[status].progressFill,
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function recalcProgress(kr: KrItem): number {
  if (
    kr.measurementType === "numeric" &&
    kr.targetValue !== null &&
    kr.targetValue > 0 &&
    kr.currentValue !== null
  ) {
    return clampProgress((kr.currentValue / kr.targetValue) * 100);
  }
  if (kr.measurementType === "percentage" && kr.currentValue !== null) {
    return clampProgress(kr.currentValue);
  }
  if (kr.measurementType === "boolean") {
    return kr.currentValue ? 100 : 0;
  }
  return kr.progress;
}

const QUARTERS: KrQuarter[] = ["Q1", "Q2", "Q3", "Q4"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
  CURRENT_YEAR + 2,
];

const MEASUREMENT_LABELS: Record<KrMeasurementType, string> = {
  numeric: "Numérico (meta / actual)",
  percentage: "Porcentaje directo",
  boolean: "Hito (sí / no)",
  manual: "Manual (slider)",
};

function KrCard({
  kr,
  canEdit,
  areaName,
  onUpdate,
  onRemove,
}: {
  kr: KrItem;
  canEdit: boolean;
  areaName: string;
  onUpdate: (patch: Partial<KrItem>) => void;
  onRemove: () => void;
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const st = STATUS_STYLES[kr.status];

  const callAi = async () => {
    if (!kr.title.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/kr-ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: kr.title, areaName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onUpdate({
        description: data.description || kr.description,
        measurementType: data.measurementType || kr.measurementType,
        unit: data.unit || kr.unit,
        targetValue:
          data.targetSuggestion !== null && data.targetSuggestion !== undefined
            ? data.targetSuggestion
            : kr.targetValue,
        formula: data.formula || kr.formula,
        aiReasoning: data.reasoning || kr.aiReasoning,
      });
    } catch {
      setAiError("No se pudo conectar con el agente IA.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 bg-card shadow-sm overflow-hidden",
        st.border,
      )}
    >
      <div className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <Input
            value={kr.title}
            disabled={!canEdit}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-auto border-0 bg-transparent p-0 text-sm font-semibold focus-visible:ring-0 disabled:opacity-100 disabled:cursor-default leading-snug flex-1"
            placeholder="Nombre del KR…"
          />
          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                title="Analizar KR con IA"
                disabled={!kr.title.trim() || aiLoading}
                onClick={callAi}
                className="text-muted-foreground/60 hover:text-violet-500 disabled:opacity-30 transition-colors"
              >
                {aiLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* AI description */}
        {kr.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {kr.description}
          </p>
        )}
        {aiError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {aiError}
          </p>
        )}

        {/* Quarter + Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            {canEdit ? (
              <>
                <select
                  value={kr.periodQuarter}
                  onChange={(e) =>
                    onUpdate({ periodQuarter: e.target.value as KrQuarter })
                  }
                  className="h-6 rounded border bg-muted/50 px-1.5 text-xs cursor-pointer"
                >
                  {QUARTERS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                <select
                  value={kr.periodYear}
                  onChange={(e) =>
                    onUpdate({ periodYear: Number(e.target.value) })
                  }
                  className="h-6 rounded border bg-muted/50 px-1.5 text-xs cursor-pointer"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {kr.periodQuarter}-{kr.periodYear}
              </span>
            )}
          </div>
          <select
            value={kr.status}
            disabled={!canEdit}
            onChange={(e) => onUpdate({ status: e.target.value as KrStatus })}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-pointer disabled:cursor-default",
              st.selectBg,
            )}
          >
            <option value="on_track">En curso</option>
            <option value="at_risk">En riesgo</option>
            <option value="off_track">Fuera de rumbo</option>
            <option value="paused">Pausado</option>
          </select>
        </div>

        {/* Measurement section */}
        <div className="space-y-2 rounded-md bg-muted/30 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Medición
            </span>
            {canEdit && (
              <select
                value={kr.measurementType}
                onChange={(e) =>
                  onUpdate({
                    measurementType: e.target.value as KrMeasurementType,
                  })
                }
                className="h-6 rounded border bg-background px-1.5 text-xs cursor-pointer max-w-40"
              >
                {(Object.keys(MEASUREMENT_LABELS) as KrMeasurementType[]).map(
                  (mt) => (
                    <option key={mt} value={mt}>
                      {MEASUREMENT_LABELS[mt]}
                    </option>
                  ),
                )}
              </select>
            )}
            {!canEdit && (
              <span className="text-xs text-muted-foreground">
                {MEASUREMENT_LABELS[kr.measurementType]}
              </span>
            )}
          </div>

          {kr.measurementType === "numeric" && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] text-muted-foreground">
                  Meta
                </label>
                <Input
                  type="number"
                  value={kr.targetValue ?? ""}
                  disabled={!canEdit}
                  onChange={(e) =>
                    onUpdate({
                      targetValue: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="h-7 text-xs"
                  placeholder="1000"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] text-muted-foreground">
                  Actual
                </label>
                <Input
                  type="number"
                  value={kr.currentValue ?? ""}
                  disabled={!canEdit}
                  onChange={(e) =>
                    onUpdate({
                      currentValue: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="h-7 text-xs"
                  placeholder="0"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] text-muted-foreground">
                  Unidad
                </label>
                <Input
                  value={kr.unit}
                  disabled={!canEdit}
                  onChange={(e) => onUpdate({ unit: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="$"
                />
              </div>
            </div>
          )}

          {kr.measurementType === "percentage" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">
                Valor actual
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={kr.currentValue ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  onUpdate({
                    currentValue: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                className="h-7 w-20 text-xs"
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          )}

          {kr.measurementType === "boolean" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`bool-${kr.id}`}
                checked={!!kr.currentValue}
                disabled={!canEdit}
                onChange={(e) =>
                  onUpdate({ currentValue: e.target.checked ? 1 : 0 })
                }
                className="h-4 w-4 rounded accent-blue-600"
              />
              <label
                htmlFor={`bool-${kr.id}`}
                className="text-xs text-muted-foreground cursor-pointer"
              >
                {kr.currentValue ? "Completado ✓" : "Pendiente"}
              </label>
            </div>
          )}

          {kr.measurementType === "manual" && canEdit && (
            <input
              type="range"
              min={0}
              max={100}
              value={kr.progress}
              onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
              className="w-full h-1.5 accent-blue-600 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            />
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Avance
            </span>
            <span className="text-sm font-bold tabular-nums">
              {kr.progress}%
            </span>
          </div>
          <KrProgressBar value={kr.progress} status={kr.status} />
        </div>

        {/* AI formula hint */}
        {kr.formula && (
          <p className="text-[10px] text-muted-foreground/60 italic border-t pt-2">
            {kr.formula}
          </p>
        )}

        {/* Footer timestamp */}
        <p className="text-[10px] text-muted-foreground/40">
          {new Date(kr.updatedAt).toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function TeamPerformancePageContent() {
  const { user, isLoading } = useAuth();

  const [state, setState] = useState<TeamPerformanceState>(() =>
    buildSeedState(),
  );
  const [metaId, setMetaId] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [secondaryAuthed, setSecondaryAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState("");
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const [sharedVaultPassword, setSharedVaultPassword] = useState(
    SHARED_DEFAULT_PASSWORD,
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSaveRef = useRef(false);
  const metaIdRef = useRef<string | null>(null);

  const userKeys = useMemo(() => {
    const set = new Set<string>();
    if (user?.id != null) set.add(String(user.id));
    if (user?.codigo) set.add(String(user.codigo));
    return set;
  }, [user?.id, user?.codigo]);

  const isOwner = useMemo(() => {
    if (canAccessBusinessMetrics(user)) return true;
    for (const key of state.ownerCodes) {
      if (userKeys.has(String(key))) return true;
    }
    return false;
  }, [state.ownerCodes, user, userKeys]);

  const canLeadArea = useCallback(
    (area: AreaNode) => {
      if (isOwner) return true;
      return area.leaderCodes.some((code) => userKeys.has(String(code)));
    },
    [isOwner, userKeys],
  );

  const canLeadSubarea = useCallback(
    (subarea: SubareaNode) => {
      if (isOwner) return true;
      return subarea.leaderCodes.some((code) => userKeys.has(String(code)));
    },
    [isOwner, userKeys],
  );

  const visibleAreas = useMemo(() => {
    if (isOwner) return state.areas;

    const scoped: AreaNode[] = [];
    for (const area of state.areas) {
      const areaLeader = canLeadArea(area);
      if (areaLeader) {
        scoped.push(area);
        continue;
      }
      const visibleSubareas = area.subareas.filter((sub) =>
        canLeadSubarea(sub),
      );
      if (visibleSubareas.length > 0) {
        scoped.push({ ...area, krs: [], subareas: visibleSubareas });
      }
    }
    return scoped;
  }, [canLeadArea, canLeadSubarea, isOwner, state.areas]);

  useEffect(() => {
    if (visibleAreas.length === 0) {
      setActiveAreaId("");
      return;
    }
    const exists = visibleAreas.some((area) => area.id === activeAreaId);
    if (!activeAreaId || !exists) {
      setActiveAreaId(visibleAreas[0].id);
    }
  }, [activeAreaId, visibleAreas]);

  useEffect(() => {
    if (sessionStorage.getItem(SHARED_SESSION_KEY) === "1") {
      setSecondaryAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function loadAll() {
      setLoadingMeta(true);
      try {
        const token = getAuthToken();
        const [perfRes, businessRes] = await Promise.all([
          fetch(`/api/metadata?entity=${ENTITY}&entity_id=${ENTITY_ID}`, {
            headers: { Authorization: `Bearer ${token ?? ""}` },
            cache: "no-store",
          }),
          fetch(
            "/api/metadata?entity=business_metrics_state&entity_id=global",
            {
              headers: { Authorization: `Bearer ${token ?? ""}` },
              cache: "no-store",
            },
          ),
        ]);

        if (!cancelled && perfRes.ok) {
          const json = await perfRes.json().catch(() => null);
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
              m?.entity === ENTITY && String(m?.entity_id ?? "") === ENTITY_ID,
          );
          if (found) {
            const next = normalizeState(found.payload ?? {});
            skipSaveRef.current = true;
            setState(next);
            const id = String(found.id);
            setMetaId(id);
            metaIdRef.current = id;
          }
        }

        if (!cancelled && businessRes.ok) {
          const json = await businessRes.json().catch(() => null);
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
          const fromMetadata = String(
            found?.payload?.vaultPassword ?? "",
          ).trim();
          setSharedVaultPassword(fromMetadata || SHARED_DEFAULT_PASSWORD);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleVaultLogin = () => {
    if (pwInput === sharedVaultPassword) {
      sessionStorage.setItem(SHARED_SESSION_KEY, "1");
      setSecondaryAuthed(true);
      setPwError(false);
      return;
    }
    setPwError(true);
  };

  const saveNow = useCallback(async () => {
    if (savingMeta) return;
    setSavingMeta(true);
    try {
      const token = getAuthToken();
      if (!metaId) {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: ENTITY,
            entity_id: ENTITY_ID,
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
          const id = String(newId);
          setMetaId(id);
          metaIdRef.current = id;
        }
      } else {
        const res = await fetch(`/api/metadata/${encodeURIComponent(metaId)}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: ENTITY,
            entity_id: ENTITY_ID,
            payload: state,
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
      }
    } catch (err) {
      console.error("[rendimiento-areas] save failed", err);
      if (typeof window !== "undefined") {
        window.alert(
          `No se pudo guardar el metadata. ${
            err instanceof Error ? err.message : ""
          }`,
        );
      }
    } finally {
      setSavingMeta(false);
    }
  }, [metaId, savingMeta, state]);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (!metaIdRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setSavingMeta(true);
    const snapshot = state;
    saveTimerRef.current = setTimeout(async () => {
      try {
        const id = metaIdRef.current;
        if (!id) return;
        const token = getAuthToken();
        await fetch(`/api/metadata/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: ENTITY,
            entity_id: ENTITY_ID,
            payload: snapshot,
          }),
        });
      } finally {
        setSavingMeta(false);
      }
    }, 1200);
  }, [state]);

  const updateArea = useCallback(
    (areaId: string, updater: (area: AreaNode) => AreaNode) => {
      setState((current) => ({
        ...current,
        areas: current.areas.map((area) =>
          area.id === areaId ? updater(area) : area,
        ),
      }));
    },
    [],
  );

  const addArea = () => {
    if (!isOwner) return;
    const next: AreaNode = {
      id: uid(),
      name: `Area ${state.areas.length + 1}`,
      leaderCodes: [],
      krs: [],
      subareas: [],
    };
    setState((current) => ({ ...current, areas: [...current.areas, next] }));
  };

  const removeArea = (areaId: string) => {
    if (!isOwner) return;
    setState((current) => ({
      ...current,
      areas: current.areas.filter((area) => area.id !== areaId),
    }));
  };

  const addAreaKr = (areaId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      krs: [
        ...area.krs,
        {
          id: uid(),
          title: "",
          description: "",
          periodQuarter: "Q2" as KrQuarter,
          periodYear: CURRENT_YEAR,
          status: "on_track" as KrStatus,
          progress: 0,
          measurementType: "manual" as KrMeasurementType,
          targetValue: null,
          currentValue: null,
          unit: "",
          formula: "",
          aiReasoning: "",
          updatedAt: nowIso(),
        },
      ],
    }));
  };

  const removeAreaKr = (areaId: string, krId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      krs: area.krs.filter((kr) => kr.id !== krId),
    }));
  };

  const updateAreaKr = (
    areaId: string,
    krId: string,
    patch: Partial<KrItem>,
  ) => {
    updateArea(areaId, (area) => ({
      ...area,
      krs: area.krs.map((kr) => {
        if (kr.id !== krId) return kr;
        const merged: KrItem = {
          ...kr,
          ...patch,
          progress:
            patch.progress !== undefined
              ? clampProgress(Number(patch.progress))
              : kr.progress,
          updatedAt: nowIso(),
        };
        if (merged.measurementType !== "manual") {
          merged.progress = recalcProgress(merged);
        }
        return merged;
      }),
    }));
  };

  const addSubarea = (areaId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      subareas: [
        ...area.subareas,
        {
          id: uid(),
          name: `Subarea ${area.subareas.length + 1}`,
          leaderCodes: [],
          krs: [],
        },
      ],
    }));
  };

  const removeSubarea = (areaId: string, subareaId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      subareas: area.subareas.filter((sub) => sub.id !== subareaId),
    }));
  };

  const updateSubarea = (
    areaId: string,
    subareaId: string,
    updater: (sub: SubareaNode) => SubareaNode,
  ) => {
    updateArea(areaId, (area) => ({
      ...area,
      subareas: area.subareas.map((sub) =>
        sub.id === subareaId ? updater(sub) : sub,
      ),
    }));
  };

  const addSubareaKr = (areaId: string, subareaId: string) => {
    updateSubarea(areaId, subareaId, (sub) => ({
      ...sub,
      krs: [
        ...sub.krs,
        {
          id: uid(),
          title: "",
          description: "",
          periodQuarter: "Q2" as KrQuarter,
          periodYear: CURRENT_YEAR,
          status: "on_track" as KrStatus,
          progress: 0,
          measurementType: "manual" as KrMeasurementType,
          targetValue: null,
          currentValue: null,
          unit: "",
          formula: "",
          aiReasoning: "",
          updatedAt: nowIso(),
        },
      ],
    }));
  };

  const removeSubareaKr = (areaId: string, subareaId: string, krId: string) => {
    updateSubarea(areaId, subareaId, (sub) => ({
      ...sub,
      krs: sub.krs.filter((kr) => kr.id !== krId),
    }));
  };

  const updateSubareaKr = (
    areaId: string,
    subareaId: string,
    krId: string,
    patch: Partial<KrItem>,
  ) => {
    updateSubarea(areaId, subareaId, (sub) => ({
      ...sub,
      krs: sub.krs.map((kr) => {
        if (kr.id !== krId) return kr;
        const merged: KrItem = {
          ...kr,
          ...patch,
          progress:
            patch.progress !== undefined
              ? clampProgress(Number(patch.progress))
              : kr.progress,
          updatedAt: nowIso(),
        };
        if (merged.measurementType !== "manual") {
          merged.progress = recalcProgress(merged);
        }
        return merged;
      }),
    }));
  };

  const updateOwnerCodes = (value: string) => {
    if (!isOwner) return;
    setState((current) => ({
      ...current,
      ownerCodes: csvToCodes(value),
    }));
  };

  if (isLoading || loadingMeta) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (!secondaryAuthed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60">
        <Card className="w-full max-w-sm shadow-2xl border-border/50">
          <CardHeader className="pb-4 items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Acceso restringido</CardTitle>
            <CardDescription>
              Usa la misma clave de Inteligencia de Negocio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={user.email ?? ""}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Clave de acceso
              </Label>
              <Input
                type="password"
                value={pwInput}
                autoFocus
                placeholder="••••••••••••"
                className={pwError ? "border-destructive" : ""}
                onChange={(e) => {
                  setPwInput(e.target.value);
                  setPwError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVaultLogin();
                }}
              />
              {pwError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Clave incorrecta.
                </p>
              )}
            </div>
            <Button className="w-full" onClick={handleVaultLogin}>
              Acceder
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner && visibleAreas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-3 max-w-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Sin permisos asignados</h3>
          <p className="text-sm text-muted-foreground">
            Tu usuario no está asignado como líder de ningún área o subárea.
            Pide al owner que agregue tu código.
          </p>
        </div>
      </div>
    );
  }

  // Global stats
  const allKrs = visibleAreas.flatMap((a) => [
    ...a.krs,
    ...a.subareas.flatMap((s) => s.krs),
  ]);
  const totalKrs = allKrs.length;
  const avgProgress =
    totalKrs > 0
      ? Math.round(allKrs.reduce((sum, k) => sum + k.progress, 0) / totalKrs)
      : 0;
  const statusCounts: Record<KrStatus, number> = {
    on_track: 0,
    at_risk: 0,
    off_track: 0,
    paused: 0,
  };
  for (const _kr of allKrs) {
    statusCounts[_kr.status] = (statusCounts[_kr.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-linear-to-r from-violet-600 via-blue-600 to-sky-500 bg-clip-text text-transparent">
            Rendimiento por áreas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            KR · periodos · estado · avance — un solo metadata compartido
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowAccessPanel((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 h-8 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Accesos
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  showAccessPanel && "rotate-180",
                )}
              />
            </button>
          )}
          {metaId ? (
            <Badge
              variant="outline"
              className="font-mono text-[10px] text-muted-foreground cursor-pointer hover:bg-muted hidden sm:flex"
              title="ID del metadata. Click para copiar."
              onClick={() =>
                navigator.clipboard?.writeText(metaId).catch(() => {})
              }
            >
              meta:{metaId}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 dark:border-amber-700"
            >
              Sin metadata
            </Badge>
          )}
          <Button
            size="sm"
            onClick={saveNow}
            disabled={savingMeta}
            variant={metaId ? "outline" : "default"}
            className="h-8 gap-1.5"
          >
            {savingMeta ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Guardando…
              </>
            ) : metaId ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Guardado
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Crear metadata
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Collapsible access panel ─────────────────────────────────── */}
      {isOwner && showAccessPanel && (
        <Card className="border-dashed">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Control de accesos
            </CardTitle>
            <CardDescription className="text-xs">
              Owner ve y edita todo. Cada líder solo accede a su área/subárea.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Owner codes (separados por coma)
                </Label>
                <Input
                  value={codesToCsv(state.ownerCodes)}
                  onChange={(e) => updateOwnerCodes(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tu identificador detectado</Label>
                <Input
                  readOnly
                  value={Array.from(userKeys).join(" | ") || "–"}
                  className="h-8 text-sm bg-muted/50 text-muted-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Global summary ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Áreas
          </p>
          <p className="text-2xl font-bold mt-1">{visibleAreas.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            KR totales
          </p>
          <p className="text-2xl font-bold mt-1">{totalKrs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Avance global
          </p>
          <p className="text-2xl font-bold mt-1">{avgProgress}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Estado
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {(["on_track", "at_risk", "off_track", "paused"] as KrStatus[]).map(
              (s) => {
                const count = statusCounts[s] ?? 0;
                if (!count) return null;
                const st = STATUS_STYLES[s];
                return (
                  <span
                    key={s}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                      st.badgeClass,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                    {count}
                  </span>
                );
              },
            )}
            {totalKrs === 0 && (
              <span className="text-sm text-muted-foreground">–</span>
            )}
          </div>
        </Card>
      </div>

      {/* ── Area tabs ───────────────────────────────────────────────── */}
      <Tabs value={activeAreaId} onValueChange={setActiveAreaId}>
        <div className="flex items-center gap-3">
          <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1 flex-1">
            {visibleAreas.map((area) => {
              const areaAllKrs = [
                ...area.krs,
                ...area.subareas.flatMap((s) => s.krs),
              ];
              const areaAvgPct = areaAllKrs.length
                ? Math.round(
                    areaAllKrs.reduce((a, k) => a + k.progress, 0) /
                      areaAllKrs.length,
                  )
                : 0;
              return (
                <TabsTrigger
                  key={area.id}
                  value={area.id}
                  className="gap-2 shrink-0"
                >
                  <span>{area.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {areaAvgPct}%
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {isOwner && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 h-8 gap-1 text-muted-foreground"
              onClick={addArea}
            >
              <Plus className="h-3.5 w-3.5" /> Área
            </Button>
          )}
        </div>

        {visibleAreas.map((area) => {
          const canEditArea = isOwner || canLeadArea(area);
          const areaAllKrs = [
            ...area.krs,
            ...area.subareas.flatMap((s) => s.krs),
          ];
          const areaAvgPct = areaAllKrs.length
            ? Math.round(
                areaAllKrs.reduce((a, k) => a + k.progress, 0) /
                  areaAllKrs.length,
              )
            : 0;
          const dominantStatus: KrStatus =
            areaAllKrs.length === 0
              ? "paused"
              : areaAllKrs.some((k) => k.status === "off_track")
                ? "off_track"
                : areaAllKrs.some((k) => k.status === "at_risk")
                  ? "at_risk"
                  : areaAllKrs.every((k) => k.status === "on_track")
                    ? "on_track"
                    : "paused";

          return (
            <TabsContent
              key={area.id}
              value={area.id}
              className="mt-4 space-y-5 focus-visible:outline-none focus-visible:ring-0"
            >
              {/* Area header */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="space-y-1.5 min-w-0">
                  {canEditArea ? (
                    <Input
                      value={area.name}
                      onChange={(e) =>
                        updateArea(area.id, (c) => ({
                          ...c,
                          name: e.target.value,
                        }))
                      }
                      className="h-auto text-xl font-bold border-0 bg-transparent p-0 focus-visible:ring-0 leading-tight"
                    />
                  ) : (
                    <h2 className="text-xl font-bold">{area.name}</h2>
                  )}
                  {isOwner ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <Input
                        value={codesToCsv(area.leaderCodes)}
                        onChange={(e) =>
                          updateArea(area.id, (c) => ({
                            ...c,
                            leaderCodes: csvToCodes(e.target.value),
                          }))
                        }
                        placeholder="Código del líder de área…"
                        className="h-6 text-xs border-dashed bg-transparent px-2 w-52"
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-bold tabular-nums leading-none">
                      {areaAvgPct}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {areaAllKrs.length} KR
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {canEditArea && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        onClick={() => addSubarea(area.id)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Subárea
                      </Button>
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground/60 hover:text-destructive flex items-center gap-1 transition-colors"
                        onClick={() => removeArea(area.id)}
                      >
                        <Trash2 className="h-3 w-3" /> Eliminar área
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Area overall progress bar */}
              <KrProgressBar value={areaAvgPct} status={dominantStatus} />

              {/* KR del área */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    KR del área
                  </h3>
                  {canEditArea && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={() => addAreaKr(area.id)}
                    >
                      <Plus className="h-3 w-3" /> Añadir KR
                    </Button>
                  )}
                </div>

                {area.krs.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Sin KR de área todavía.
                    </p>
                    {canEditArea && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 h-8"
                        onClick={() => addAreaKr(area.id)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir primer KR
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {area.krs.map((kr) => (
                      <KrCard
                        key={kr.id}
                        kr={kr}
                        canEdit={canEditArea}
                        areaName={area.name}
                        onUpdate={(patch) =>
                          updateAreaKr(area.id, kr.id, patch)
                        }
                        onRemove={() => removeAreaKr(area.id, kr.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Subáreas */}
              {area.subareas.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Subáreas
                    </h3>
                    {area.subareas.map((subarea) => {
                      const canEditSub = canEditArea || canLeadSubarea(subarea);
                      const subAvgPct = subarea.krs.length
                        ? Math.round(
                            subarea.krs.reduce((a, k) => a + k.progress, 0) /
                              subarea.krs.length,
                          )
                        : 0;
                      return (
                        <div
                          key={subarea.id}
                          className="rounded-xl border bg-muted/20 p-4 space-y-4"
                        >
                          {/* Subarea header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              {canEditSub ? (
                                <Input
                                  value={subarea.name}
                                  onChange={(e) =>
                                    updateSubarea(area.id, subarea.id, (c) => ({
                                      ...c,
                                      name: e.target.value,
                                    }))
                                  }
                                  className="h-7 text-sm font-semibold border-0 bg-transparent p-0 focus-visible:ring-0"
                                />
                              ) : (
                                <p className="text-sm font-semibold">
                                  {subarea.name}
                                </p>
                              )}
                              {isOwner ? (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                  <Input
                                    value={codesToCsv(subarea.leaderCodes)}
                                    onChange={(e) =>
                                      updateSubarea(
                                        area.id,
                                        subarea.id,
                                        (c) => ({
                                          ...c,
                                          leaderCodes: csvToCodes(
                                            e.target.value,
                                          ),
                                        }),
                                      )
                                    }
                                    placeholder="Código del líder…"
                                    className="h-5 text-[10px] border-dashed bg-transparent px-1.5 w-36"
                                  />
                                </div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p className="text-xl font-bold tabular-nums leading-none">
                                  {subAvgPct}%
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {subarea.krs.length} KR
                                </p>
                              </div>
                              {canEditSub && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() =>
                                    addSubareaKr(area.id, subarea.id)
                                  }
                                >
                                  <Plus className="h-3 w-3" /> KR
                                </Button>
                              )}
                              {canEditArea && (
                                <button
                                  type="button"
                                  className="text-muted-foreground/50 hover:text-destructive transition-colors"
                                  onClick={() =>
                                    removeSubarea(area.id, subarea.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {subarea.krs.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-5 text-center">
                              <p className="text-xs text-muted-foreground">
                                Sin KR en esta subárea.
                              </p>
                              {canEditSub && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 h-7 text-xs"
                                  onClick={() =>
                                    addSubareaKr(area.id, subarea.id)
                                  }
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Añadir KR
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                              {subarea.krs.map((kr) => (
                                <KrCard
                                  key={kr.id}
                                  kr={kr}
                                  canEdit={canEditSub}
                                  areaName={area.name}
                                  onUpdate={(patch) =>
                                    updateSubareaKr(
                                      area.id,
                                      subarea.id,
                                      kr.id,
                                      patch,
                                    )
                                  }
                                  onRemove={() =>
                                    removeSubareaKr(area.id, subarea.id, kr.id)
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default function TeamPerformancePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <TeamPerformancePageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
