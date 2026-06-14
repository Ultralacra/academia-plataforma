"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import {
  BUSINESS_METRICS_ADMIN_ID,
  canAccessBusinessMetrics,
  canAccessTeamPerformance,
} from "@/lib/business-metrics";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Lock,
  PanelRight,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCoaches, type CoachItem } from "@/app/admin/teamsv2/api";

const ENTITY = "team_performance_space_state";
const ENTITY_ID = "global";
// Vault propio del módulo "Rendimiento áreas" (independiente del de
// Inteligencia de negocio). Tiene su propia sesión y su propia entidad de
// metadata para que cambiar una contraseña no afecte a la otra.
const SHARED_SESSION_KEY = "team-perf-vault-auth";
const SHARED_DEFAULT_PASSWORD = "PHLFQKZFBIPK";
const VAULT_ENTITY = "rendimiento_area_vault";
const VAULT_ENTITY_ID = "global";

const ENTITY_ACCESS = "rendimiento_area_access";
const ENTITY_ACCESS_ID = "global";

type KrStatus = "on_track" | "at_risk" | "off_track" | "paused";
type KrMeasurementType = "numeric" | "percentage" | "boolean" | "manual";
type KrQuarter = "Q1" | "Q2" | "Q3" | "Q4";

type KrIndicator = {
  id: string;
  name: string;
  target: number | null;
  value: number | null;
  unit: string;
};

type KrItem = {
  id: string;
  title: string;
  description: string;
  assignedCodes: string[];
  periodQuarter: KrQuarter;
  periodYear: number;
  status: KrStatus;
  progress: number;
  measurementType: KrMeasurementType;
  targetValue: number | null;
  currentValue: number | null;
  unit: string;
  formula: string;
  aiReasoning: string;
  updatedAt: string;
  evidences: EvidenceItem[];
  indicators: KrIndicator[];
};

type EvidenceItem = {
  id: string;
  type: "link" | "note" | "file";
  label: string;
  url?: string;
  note?: string;
  addedAt: string;
};

type OkrItem = {
  id: string;
  title: string;
  description: string;
  assignedCodes: string[];
  krs: KrItem[];
};

type AreaNode = {
  id: string;
  name: string;
  leaderCodes: string[];
  okrs: OkrItem[];
};

type TeamPerformanceState = {
  ownerCodes: string[];
  areas: AreaNode[];
};

type RendimientoAreaAccess = {
  version: 1;
  permisos: {
    [userCodigo: string]: {
      nombre: string;
      areas: string[];
    };
  };
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
    assignedCodes: Array.isArray(raw?.assignedCodes)
      ? raw.assignedCodes.map((x: any) => String(x)).filter(Boolean)
      : [],
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
    evidences: Array.isArray(raw?.evidences)
      ? raw.evidences.map((e: any) => ({
          id: String(e.id ?? uid()),
          type: ["link", "note", "file"].includes(e.type) ? e.type : "note",
          label: String(e.label ?? ""),
          url: e.url ? String(e.url) : undefined,
          note: e.note ? String(e.note) : undefined,
          addedAt: String(e.addedAt ?? nowIso()),
        }))
      : [],
    indicators: Array.isArray(raw?.indicators)
      ? raw.indicators.map((i: any) => ({
          id: String(i.id ?? uid()),
          name: String(i.name ?? ""),
          target: typeof i.target === "number" ? i.target : null,
          value: typeof i.value === "number" ? i.value : null,
          unit: String(i.unit ?? ""),
        }))
      : [],
  };
}

function normalizeOkr(raw: any): OkrItem {
  return {
    id: String(raw?.id ?? uid()),
    title: String(raw?.title ?? "Objetivo"),
    description: String(raw?.description ?? ""),
    assignedCodes: Array.isArray(raw?.assignedCodes)
      ? raw.assignedCodes.map((x: any) => String(x)).filter(Boolean)
      : [],
    krs: Array.isArray(raw?.krs) ? raw.krs.map((k: any) => normalizeKr(k)) : [],
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

    let okrs: OkrItem[] = [];

    if (Array.isArray(area.okrs) && area.okrs.length > 0) {
      // New format
      okrs = area.okrs.map((o: any) => normalizeOkr(o));
    } else {
      // Migration from old format: krs at area level + subareas
      const krsRaw = Array.isArray(area.krs) ? area.krs : [];
      const subareasRaw = Array.isArray(area.subareas) ? area.subareas : [];

      if (krsRaw.length > 0) {
        okrs.push({
          id: "migrated-" + String(area.id ?? uid()),
          title: "Objetivo principal",
          description: "",
          assignedCodes: [],
          krs: krsRaw.map((k: any) => normalizeKr(k)),
        });
      }

      for (const subAny of subareasRaw) {
        const sub = (subAny ?? {}) as Record<string, unknown>;
        const subKrsRaw = Array.isArray(sub.krs) ? sub.krs : [];
        okrs.push({
          id: String(sub.id ?? uid()),
          title: String(sub.name ?? "Objetivo"),
          description: "",
          assignedCodes: Array.isArray(sub.leaderCodes)
            ? sub.leaderCodes.map((x: any) => String(x)).filter(Boolean)
            : [],
          krs: subKrsRaw.map((k: any) => normalizeKr(k)),
        });
      }
    }

    return {
      id: String(area.id ?? uid()),
      name: String(area.name ?? "Area"),
      leaderCodes: Array.isArray(area.leaderCodes)
        ? area.leaderCodes.map((x) => String(x)).filter(Boolean)
        : [],
      okrs,
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
      { id: "marketing", name: "Marketing", leaderCodes: [], okrs: [] },
      { id: "ventas", name: "Ventas", leaderCodes: [], okrs: [] },
      { id: "delivery", name: "Delivery", leaderCodes: [], okrs: [] },
      { id: "rrhh", name: "Recursos Humanos", leaderCodes: [], okrs: [] },
      { id: "finanzas", name: "Finanzas", leaderCodes: [], okrs: [] },
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

// ─── AddEvidenceForm ──────────────────────────────────────────────────────────
function AddEvidenceForm({ onAdd }: { onAdd: (ev: EvidenceItem) => void }) {
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<EvidenceItem["type"]>("link");
  const [url, setUrl] = React.useState("");
  const [note, setNote] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd({
      id: uid(),
      type,
      label: label.trim(),
      url: url.trim() || undefined,
      note: note.trim() || undefined,
      addedAt: nowIso(),
    });
    setLabel("");
    setUrl("");
    setNote("");
    setType("link");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-muted/10 p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Agregar evidencia
      </p>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EvidenceItem["type"])}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="link">Enlace</option>
          <option value="note">Nota</option>
          <option value="file">Archivo (URL)</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Etiqueta *</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Reporte Q1 Ventas"
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          required
        />
      </div>
      {(type === "link" || type === "file") && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      )}
      {type === "note" && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nota</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Describe la evidencia..."
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm resize-none"
          />
        </div>
      )}
      <button
        type="submit"
        disabled={!label.trim()}
        className="w-full rounded-md bg-blue-600 text-white text-sm py-1.5 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Agregar
      </button>
    </form>
  );
}

function KrProgressBar({ value, status }: { value: number; status: KrStatus }) {
  // Verde SOLO al 100% (completado). Resto: basado en progreso + estado.
  const fillClass =
    status === "paused"
      ? "bg-slate-400"
      : value >= 100
        ? "bg-emerald-500"
        : status === "off_track"
          ? "bg-red-500"
          : status === "at_risk"
            ? "bg-amber-500"
            : value >= 70
              ? "bg-blue-500"
              : value >= 35
                ? "bg-amber-400"
                : "bg-red-400";
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          fillClass,
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
  isOwner,
  onUpdate,
  onRemove,
}: {
  kr: KrItem;
  canEdit: boolean;
  areaName: string;
  isOwner: boolean;
  onUpdate: (patch: Partial<KrItem>) => void;
  onRemove: () => void;
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    improvedDescription: string;
    improvementNotes: string;
    reasoning: string;
    measurementType: KrMeasurementType;
    unit: string;
    targetSuggestion: number | null;
    formula: string;
  } | null>(null);
  const st = STATUS_STYLES[kr.status];

  const callAi = async () => {
    if (!kr.title.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/kr-ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: kr.title,
          areaName,
          description: kr.description,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // La IA NO sobreescribe lo que el usuario escribió: se muestra como
      // propuesta de mejora para que el usuario decida si la aplica.
      setAiSuggestion({
        improvedDescription: String(
          data.improvedDescription ?? data.description ?? "",
        ),
        improvementNotes: String(data.improvementNotes ?? ""),
        reasoning: String(data.reasoning ?? ""),
        measurementType: ([
          "numeric",
          "percentage",
          "boolean",
          "manual",
        ].includes(data.measurementType)
          ? data.measurementType
          : kr.measurementType) as KrMeasurementType,
        unit: String(data.unit ?? ""),
        targetSuggestion:
          typeof data.targetSuggestion === "number"
            ? data.targetSuggestion
            : null,
        formula: String(data.formula ?? ""),
      });
    } catch {
      setAiError("No se pudo conectar con el agente IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiDescription = () => {
    if (!aiSuggestion) return;
    onUpdate({
      description: aiSuggestion.improvedDescription,
      aiReasoning: aiSuggestion.reasoning,
    });
    setAiSuggestion(null);
  };

  const applyAiMeasurement = () => {
    if (!aiSuggestion) return;
    onUpdate({
      measurementType: aiSuggestion.measurementType,
      unit: aiSuggestion.unit || kr.unit,
      targetValue:
        aiSuggestion.targetSuggestion !== null
          ? aiSuggestion.targetSuggestion
          : kr.targetValue,
      formula: aiSuggestion.formula || kr.formula,
      aiReasoning: aiSuggestion.reasoning,
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 bg-card shadow-sm overflow-hidden",
        st.border,
      )}
    >
      <div className="p-4 space-y-3">
        {/* Nombre del KR */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Pencil className="h-3 w-3 text-muted-foreground/50" />
              <Label
                htmlFor={`kr-title-${kr.id}`}
                className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
              >
                Nombre del KR
              </Label>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={onRemove}
                title="Eliminar KR"
                className="text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Input
            id={`kr-title-${kr.id}`}
            value={kr.title}
            disabled={!canEdit}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-8 text-sm font-semibold disabled:opacity-100 disabled:cursor-default"
            placeholder="Ej: Aumentar ventas mensuales high ticket"
          />
        </div>

        {/* Descripción del usuario */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor={`kr-desc-${kr.id}`}
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Descripción
            </Label>
            {canEdit && (
              <button
                type="button"
                title="Pedir a la IA propuestas de mejora (no reemplaza lo que escribiste)"
                disabled={!kr.title.trim() || aiLoading}
                onClick={callAi}
                className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 disabled:opacity-30 transition-colors"
              >
                {aiLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Mejorar con IA
              </button>
            )}
          </div>
          <Textarea
            id={`kr-desc-${kr.id}`}
            value={kr.description}
            disabled={!canEdit}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="min-h-15 text-xs leading-relaxed disabled:opacity-100 disabled:cursor-default"
            placeholder="Escribe qué mide este KR y por qué es importante. La IA solo propondrá mejoras sobre tu texto."
          />
        </div>

        {aiError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {aiError}
          </p>
        )}

        {aiSuggestion && canEdit && (
          <div className="rounded-md border border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/30 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3 w-3" /> Propuesta de la IA
              </span>
              <button
                type="button"
                onClick={() => setAiSuggestion(null)}
                title="Descartar propuesta"
                className="text-violet-500/60 hover:text-violet-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {aiSuggestion.improvedDescription && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-violet-700/70 dark:text-violet-300/70">
                  Descripción mejorada
                </p>
                <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
                  {aiSuggestion.improvedDescription}
                </p>
                <button
                  type="button"
                  onClick={applyAiDescription}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300"
                >
                  <Check className="h-3 w-3" /> Aplicar a mi descripción
                </button>
              </div>
            )}

            {aiSuggestion.improvementNotes && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-violet-700/70 dark:text-violet-300/70">
                  Sugerencias
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                  {aiSuggestion.improvementNotes}
                </p>
              </div>
            )}

            {(aiSuggestion.unit ||
              aiSuggestion.formula ||
              aiSuggestion.targetSuggestion !== null) && (
              <div className="space-y-1 border-t border-violet-200/60 dark:border-violet-900/40 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-violet-700/70 dark:text-violet-300/70">
                  Medición propuesta
                </p>
                <p className="text-xs text-muted-foreground">
                  Tipo:{" "}
                  <span className="font-medium text-foreground/80">
                    {MEASUREMENT_LABELS[aiSuggestion.measurementType]}
                  </span>
                  {aiSuggestion.unit ? (
                    <>
                      {" "}
                      · Unidad:{" "}
                      <span className="font-medium text-foreground/80">
                        {aiSuggestion.unit}
                      </span>
                    </>
                  ) : null}
                  {aiSuggestion.targetSuggestion !== null ? (
                    <>
                      {" "}
                      · Meta sugerida:{" "}
                      <span className="font-medium text-foreground/80">
                        {aiSuggestion.targetSuggestion}
                      </span>
                    </>
                  ) : null}
                </p>
                {aiSuggestion.formula && (
                  <p className="text-[11px] italic text-muted-foreground">
                    {aiSuggestion.formula}
                  </p>
                )}
                <button
                  type="button"
                  onClick={applyAiMeasurement}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300"
                >
                  <Check className="h-3 w-3" /> Aplicar configuración de
                  medición
                </button>
              </div>
            )}
          </div>
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

        {/* Assigned codes – editable by owners/leaders */}
        {canEdit && (
          <div className="flex items-center gap-1.5 border-t pt-2">
            <Users className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <Input
              value={codesToCsv(kr.assignedCodes)}
              onChange={(e) =>
                onUpdate({ assignedCodes: csvToCodes(e.target.value) })
              }
              placeholder="Asignar a (códigos separados por coma)…"
              className="h-5 text-[10px] border-dashed bg-transparent px-1.5 flex-1"
            />
          </div>
        )}
        {!canEdit && kr.assignedCodes.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap border-t pt-2">
            <Users className="h-3 w-3 text-muted-foreground/50" />
            {kr.assignedCodes.map((c) => (
              <Badge
                key={c}
                variant="secondary"
                className="text-[10px] h-4 px-1.5"
              >
                {c}
              </Badge>
            ))}
          </div>
        )}

        {/* Indicators */}
        <div className="border-t pt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Indicadores
              </span>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    indicators: [
                      ...kr.indicators,
                      { id: uid(), name: "", target: null, value: null, unit: "" },
                    ],
                  })
                }
                className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-3 w-3" /> Agregar
              </button>
            )}
          </div>
          {kr.indicators.length === 0 ? (
            <div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/20 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">
                Agrega tu primer indicador para medir el KR
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {kr.indicators.map((ind) => {
                const progress = ind.target && ind.target > 0 && ind.value !== null
                  ? Math.min(100, Math.round((ind.value / ind.target) * 100))
                  : null;
                return (
                  <div key={ind.id} className="rounded border bg-background/80 p-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={ind.name}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const updated = kr.indicators.map((i) =>
                            i.id === ind.id ? { ...i, name: e.target.value } : i,
                          );
                          onUpdate({ indicators: updated });
                        }}
                        placeholder="Nombre"
                        className="h-5 text-[10px] flex-1"
                      />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = kr.indicators.filter(
                              (i) => i.id !== ind.id,
                            );
                            onUpdate({ indicators: updated });
                          }}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <label className="text-[9px] text-muted-foreground">Act:</label>
                        <Input
                          type="number"
                          value={ind.value ?? ""}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const updated = kr.indicators.map((i) =>
                              i.id === ind.id
                                ? { ...i, value: e.target.value ? Number(e.target.value) : null }
                                : i,
                            );
                            onUpdate({ indicators: updated });
                          }}
                          placeholder="0"
                          className="h-5 text-[10px] w-14"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-[9px] text-muted-foreground">Meta:</label>
                        <Input
                          type="number"
                          value={ind.target ?? ""}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const updated = kr.indicators.map((i) =>
                              i.id === ind.id
                                ? { ...i, target: e.target.value ? Number(e.target.value) : null }
                                : i,
                            );
                            onUpdate({ indicators: updated });
                          }}
                          placeholder="0"
                          className="h-5 text-[10px] w-14"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-[9px] text-muted-foreground">Und:</label>
                        <Input
                          value={ind.unit}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const updated = kr.indicators.map((i) =>
                              i.id === ind.id ? { ...i, unit: e.target.value } : i,
                            );
                            onUpdate({ indicators: updated });
                          }}
                          placeholder="--"
                          className="h-5 text-[10px] w-12"
                        />
                      </div>
                      {progress !== null && (
                        <div className="flex items-center gap-1">
                          <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-blue-500",
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold tabular-nums w-7">
                            {progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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

// ── Panel expandible de KR (se muestra como fila extra en la tabla) ──────────
function KrExpandedPanel({
  kr,
  canEdit,
  areaName,
  isOwner,
  onUpdate,
  teamUsers,
}: {
  kr: KrItem;
  canEdit: boolean;
  areaName: string;
  isOwner: boolean;
  onUpdate: (patch: Partial<KrItem>) => void;
  teamUsers: CoachItem[];
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    improvedDescription: string;
    improvementNotes: string;
    reasoning: string;
    measurementType: KrMeasurementType;
    unit: string;
    targetSuggestion: number | null;
    formula: string;
  } | null>(null);

  const callAi = async () => {
    if (!kr.title.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/kr-ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: kr.title,
          areaName,
          description: kr.description,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAiSuggestion({
        improvedDescription: String(
          data.improvedDescription ?? data.description ?? "",
        ),
        improvementNotes: String(data.improvementNotes ?? ""),
        reasoning: String(data.reasoning ?? ""),
        measurementType: ([
          "numeric",
          "percentage",
          "boolean",
          "manual",
        ].includes(data.measurementType)
          ? data.measurementType
          : kr.measurementType) as KrMeasurementType,
        unit: String(data.unit ?? ""),
        targetSuggestion:
          typeof data.targetSuggestion === "number"
            ? data.targetSuggestion
            : null,
        formula: String(data.formula ?? ""),
      });
    } catch {
      setAiError("No se pudo conectar con el agente IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiDescription = () => {
    if (!aiSuggestion) return;
    onUpdate({
      description: aiSuggestion.improvedDescription,
      aiReasoning: aiSuggestion.reasoning,
    });
    setAiSuggestion(null);
  };

  const applyAiMeasurement = () => {
    if (!aiSuggestion) return;
    onUpdate({
      measurementType: aiSuggestion.measurementType,
      unit: aiSuggestion.unit || kr.unit,
      targetValue:
        aiSuggestion.targetSuggestion !== null
          ? aiSuggestion.targetSuggestion
          : kr.targetValue,
      formula: aiSuggestion.formula || kr.formula,
      aiReasoning: aiSuggestion.reasoning,
    });
  };

  return (
    <div className="px-4 py-3 bg-muted/5 border-t space-y-3">
      {/* Nombre del KR */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Pencil className="h-3 w-3 text-muted-foreground/50" />
          <Label
            htmlFor={`kr-title-exp-${kr.id}`}
            className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            Nombre del KR
          </Label>
        </div>
        <Input
          id={`kr-title-exp-${kr.id}`}
          value={kr.title}
          disabled={!canEdit}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="h-8 text-sm font-semibold disabled:opacity-100 disabled:cursor-default"
          placeholder="Ej: Aumentar ventas mensuales high ticket"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Left: Descripción + Periodo + Asignados */}
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Descripción
              </Label>
              {canEdit && (
                <button
                  type="button"
                  title="Pedir a la IA propuestas de mejora"
                  disabled={!kr.title.trim() || aiLoading}
                  onClick={callAi}
                  className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 disabled:opacity-30 transition-colors"
                >
                  {aiLoading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Mejorar con IA
                </button>
              )}
            </div>
            <Textarea
              value={kr.description}
              disabled={!canEdit}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="min-h-15 text-xs leading-relaxed disabled:opacity-100 disabled:cursor-default"
              placeholder="Describe qué mide este KR y por qué es importante…"
            />
          </div>
          {/* Period selectors */}
          <div className="flex items-center gap-2">
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
          {/* Assigned users */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Users className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            {kr.assignedCodes.length === 0 ? (
              <span className="text-[10px] text-muted-foreground italic">
                Sin usuarios asignados
              </span>
            ) : (
              kr.assignedCodes.map((code) => {
                const u = teamUsers.find((t) => t.codigo === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px]"
                  >
                    {u?.nombre ?? code}
                  </span>
                );
              })
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowUserPicker(true)}
                className="ml-1 inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                <Plus className="h-2.5 w-2.5" />
                Gestionar
              </button>
            )}
          </div>

          {/* User picker modal */}
          {showUserPicker && (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center backdrop-blur-sm bg-black/60 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowUserPicker(false);
              }}
            >
              <div className="bg-background rounded-xl shadow-2xl border w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-sm">
                      Asignar usuarios a KR
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUserPicker(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* KR title */}
                <div className="px-4 py-2 bg-muted/30 border-b shrink-0">
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    <span className="font-medium text-foreground">
                      {kr.title || "KR sin título"}
                    </span>
                  </p>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b shrink-0">
                  <Input
                    placeholder="Buscar usuario…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                  />
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {teamUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No hay usuarios cargados.
                    </p>
                  ) : (
                    teamUsers
                      .filter((u) =>
                        userSearch.trim()
                          ? u.nombre
                              .toLowerCase()
                              .includes(userSearch.toLowerCase()) ||
                            (u.puesto ?? "")
                              .toLowerCase()
                              .includes(userSearch.toLowerCase())
                          : true,
                      )
                      .map((u) => {
                        const assigned = kr.assignedCodes.includes(u.codigo);
                        return (
                          <label
                            key={u.codigo}
                            className="flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-muted/40 select-none transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...kr.assignedCodes, u.codigo]
                                  : kr.assignedCodes.filter(
                                      (c) => c !== u.codigo,
                                    );
                                onUpdate({ assignedCodes: next });
                              }}
                              className="h-4 w-4 rounded accent-blue-600 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {u.nombre}
                              </p>
                              {(u.puesto || u.area) && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {[u.puesto, u.area]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                            {assigned && (
                              <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            )}
                          </label>
                        );
                      })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t shrink-0 bg-background">
                  <span className="text-xs text-muted-foreground">
                    {kr.assignedCodes.length} asignado
                    {kr.assignedCodes.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setShowUserPicker(false)}
                    className="h-7 text-xs"
                  >
                    Listo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Measurement + Indicators */}
        <div className="space-y-2">
          {/* Measurement Card */}
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
                  id={`bool-exp-${kr.id}`}
                  checked={!!kr.currentValue}
                  disabled={!canEdit}
                  onChange={(e) =>
                    onUpdate({ currentValue: e.target.checked ? 1 : 0 })
                  }
                  className="h-4 w-4 rounded accent-blue-600"
                />
                <label
                  htmlFor={`bool-exp-${kr.id}`}
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

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Avance</span>
                <span className="text-xs font-bold tabular-nums">
                  {kr.progress}%
                </span>
              </div>
              <KrProgressBar value={kr.progress} status={kr.status} />
            </div>
          </div>

          {/* Indicators Card */}
          <div className="space-y-2 rounded-md bg-muted/30 p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Indicadores
                </span>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      indicators: [
                        ...kr.indicators,
                        { id: uid(), name: "", target: null, value: null, unit: "" },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Agregar
                </button>
              )}
            </div>
            {kr.indicators.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic text-center py-2">
                Agrega indicadores para medir el KR
              </p>
            ) : (
              <div className="space-y-3">
                {kr.indicators.map((ind) => {
                  const progress = ind.target && ind.target > 0 && ind.value !== null
                    ? Math.min(100, Math.round((ind.value / ind.target) * 100))
                    : null;
                  return (
                    <div key={ind.id} className="rounded-md border bg-background p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={ind.name}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const updated = kr.indicators.map((i) =>
                              i.id === ind.id ? { ...i, name: e.target.value } : i,
                            );
                            onUpdate({ indicators: updated });
                          }}
                          placeholder="Nombre del indicador"
                          className="h-7 text-xs flex-1"
                        />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = kr.indicators.filter(
                                (i) => i.id !== ind.id,
                              );
                              onUpdate({ indicators: updated });
                            }}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-muted-foreground whitespace-nowrap">Actual:</label>
                          <Input
                            type="number"
                            value={ind.value ?? ""}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const updated = kr.indicators.map((i) =>
                                i.id === ind.id
                                  ? { ...i, value: e.target.value ? Number(e.target.value) : null }
                                  : i,
                              );
                              onUpdate({ indicators: updated });
                            }}
                            placeholder="0"
                            className="h-7 text-xs w-24"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-muted-foreground whitespace-nowrap">Meta:</label>
                          <Input
                            type="number"
                            value={ind.target ?? ""}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const updated = kr.indicators.map((i) =>
                                i.id === ind.id
                                  ? { ...i, target: e.target.value ? Number(e.target.value) : null }
                                  : i,
                              );
                              onUpdate({ indicators: updated });
                            }}
                            placeholder="0"
                            className="h-7 text-xs w-24"
                          />
                        </div>
                        {progress !== null && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-blue-500",
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold tabular-nums w-9">
                              {progress}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {aiError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {aiError}
        </p>
      )}

      {aiSuggestion && canEdit && (
        <div className="rounded-md border border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/30 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3 w-3" /> Propuesta de la IA
            </span>
            <button
              type="button"
              onClick={() => setAiSuggestion(null)}
              className="text-violet-500/60 hover:text-violet-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {aiSuggestion.improvedDescription && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-violet-700/70 dark:text-violet-300/70">
                Descripción mejorada
              </p>
              <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
                {aiSuggestion.improvedDescription}
              </p>
              <button
                type="button"
                onClick={applyAiDescription}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300"
              >
                <Check className="h-3 w-3" /> Aplicar a mi descripción
              </button>
            </div>
          )}
          {aiSuggestion.improvementNotes && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-violet-700/70 dark:text-violet-300/70">
                Sugerencias
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {aiSuggestion.improvementNotes}
              </p>
            </div>
          )}
          {(aiSuggestion.unit ||
            aiSuggestion.formula ||
            aiSuggestion.targetSuggestion !== null) && (
            <div className="space-y-1 border-t border-violet-200/60 dark:border-violet-900/40 pt-2">
              <p className="text-[10px] uppercase tracking-wider text-violet-700/70 dark:text-violet-300/70">
                Medición propuesta
              </p>
              <p className="text-xs text-muted-foreground">
                Tipo:{" "}
                <span className="font-medium text-foreground/80">
                  {MEASUREMENT_LABELS[aiSuggestion.measurementType]}
                </span>
                {aiSuggestion.unit ? (
                  <>
                    {" "}
                    · Unidad:{" "}
                    <span className="font-medium text-foreground/80">
                      {aiSuggestion.unit}
                    </span>
                  </>
                ) : null}
                {aiSuggestion.targetSuggestion !== null ? (
                  <>
                    {" "}
                    · Meta:{" "}
                    <span className="font-medium text-foreground/80">
                      {aiSuggestion.targetSuggestion}
                    </span>
                  </>
                ) : null}
              </p>
              {aiSuggestion.formula && (
                <p className="text-[11px] italic text-muted-foreground">
                  {aiSuggestion.formula}
                </p>
              )}
              <button
                type="button"
                onClick={applyAiMeasurement}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300"
              >
                <Check className="h-3 w-3" /> Aplicar configuración de medición
              </button>
            </div>
          )}
        </div>
      )}

      {kr.formula && (
        <p className="text-[10px] text-muted-foreground/60 italic border-t pt-2">
          {kr.formula}
        </p>
      )}
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
  const [showUserAccessPanel, setShowUserAccessPanel] = useState(false);
  const [okrUserPicker, setOkrUserPicker] = useState<{
    areaId: string;
    okrId: string;
  } | null>(null);
  const [okrUserSearch, setOkrUserSearch] = useState("");
  const [areaUserPicker, setAreaUserPicker] = useState<string | null>(null);
  const [areaUserSearch, setAreaUserSearch] = useState("");
  const [krDetail, setKrDetail] = useState<{
    areaId: string;
    okrId: string;
    krId: string;
  } | null>(null);
  const [accessState, setAccessState] = useState<RendimientoAreaAccess>({
    version: 1,
    permisos: {},
  });
  const [accessMetaId, setAccessMetaId] = useState<string | null>(null);
  const [teamUsers, setTeamUsers] = useState<CoachItem[]>([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessSaved, setAccessSaved] = useState(false);
  const [accessUserSearch, setAccessUserSearch] = useState("");
  const [sharedVaultPassword, setSharedVaultPassword] = useState(
    SHARED_DEFAULT_PASSWORD,
  );
  const [expandedKrs, setExpandedKrs] = useState<Set<string>>(new Set());

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
    // Solo los usuarios designados como dueños del módulo
    // pueden administrar permisos, ver todo y editar libremente.
    if (canAccessTeamPerformance(user)) return true;
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

  const visibleAreas = useMemo(() => {
    if (isOwner) return state.areas;

    const userCodigo = String((user as any)?.codigo || user?.id || "");

    return state.areas
      .filter((area) => {
        const hasAreaAccess =
          area.leaderCodes.some((code) => userKeys.has(String(code))) ||
          (accessMetaId !== null &&
            (accessState.permisos[userCodigo]?.areas ?? []).includes(area.id));
        if (!hasAreaAccess) return false;

        // Must have at least one visible OKR or KR
        return (
          area.okrs.length === 0 ||
          area.okrs.some((okr) => {
            const okrVisible =
              okr.assignedCodes.length === 0 ||
              okr.assignedCodes.some((code) => userKeys.has(String(code)));
            if (okrVisible) return true;
            return okr.krs.some(
              (kr) =>
                kr.assignedCodes.length > 0 &&
                kr.assignedCodes.some((code) => userKeys.has(String(code))),
            );
          })
        );
      })
      .map((area) => {
        const hasLeaderAccess = area.leaderCodes.some((code) =>
          userKeys.has(String(code)),
        );
        if (hasLeaderAccess) return area;

        const visibleOkrs = area.okrs
          .map((okr) => {
            const okrVisible =
              okr.assignedCodes.length === 0 ||
              okr.assignedCodes.some((code) => userKeys.has(String(code)));

            if (okrVisible) {
              const visibleKrs = okr.krs.filter(
                (kr) =>
                  kr.assignedCodes.length === 0 ||
                  kr.assignedCodes.some((code) => userKeys.has(String(code))),
              );
              return { ...okr, krs: visibleKrs };
            }

            // OKR not directly assigned — show only explicitly-assigned KRs
            const assignedKrs = okr.krs.filter(
              (kr) =>
                kr.assignedCodes.length > 0 &&
                kr.assignedCodes.some((code) => userKeys.has(String(code))),
            );
            if (assignedKrs.length === 0) return null;
            return { ...okr, krs: assignedKrs };
          })
          .filter(Boolean) as OkrItem[];

        return { ...area, okrs: visibleOkrs };
      });
  }, [isOwner, state.areas, userKeys, accessState, accessMetaId, user]);

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
        const [perfRes, vaultRes, accessRes] = await Promise.all([
          fetch(`/api/metadata?entity=${ENTITY}&entity_id=${ENTITY_ID}`, {
            headers: { Authorization: `Bearer ${token ?? ""}` },
            cache: "no-store",
          }),
          fetch(
            `/api/metadata?entity=${VAULT_ENTITY}&entity_id=${VAULT_ENTITY_ID}`,
            {
              headers: { Authorization: `Bearer ${token ?? ""}` },
              cache: "no-store",
            },
          ),
          fetch(
            `/api/metadata?entity=${ENTITY_ACCESS}&entity_id=${ENTITY_ACCESS_ID}`,
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

        if (!cancelled && vaultRes.ok) {
          const json = await vaultRes.json().catch(() => null);
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
              m?.entity === VAULT_ENTITY &&
              String(m?.entity_id ?? "") === VAULT_ENTITY_ID,
          );
          const fromMetadata = String(
            found?.payload?.password ?? found?.payload?.vaultPassword ?? "",
          ).trim();
          setSharedVaultPassword(fromMetadata || SHARED_DEFAULT_PASSWORD);
        }

        if (!cancelled && accessRes.ok) {
          const json = await accessRes.json().catch(() => null);
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
              m?.entity === ENTITY_ACCESS &&
              String(m?.entity_id ?? "") === ENTITY_ACCESS_ID,
          );
          if (found) {
            setAccessState(found.payload ?? { version: 1, permisos: {} });
            setAccessMetaId(String(found.id));
          }
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

  useEffect(() => {
    if (!canAccessBusinessMetrics(user)) return;
    let cancelled = false;
    async function loadTeamUsers() {
      try {
        const coaches = await getCoaches({ page: 1, pageSize: 500 });
        if (!cancelled) setTeamUsers(coaches);
      } catch (e) {
        console.error("[rendimiento-areas] loadTeamUsers failed", e);
      }
    }
    void loadTeamUsers();
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

  const handleToggleAreaAccess = useCallback(
    (userCodigo: string, areaId: string, checked: boolean) => {
      setAccessState((prev) => {
        const nombre =
          teamUsers.find((u) => u.codigo === userCodigo)?.nombre ?? userCodigo;
        const cur = prev.permisos[userCodigo] ?? { nombre, areas: [] };
        return {
          ...prev,
          permisos: {
            ...prev.permisos,
            [userCodigo]: {
              nombre,
              areas: checked
                ? [...new Set([...cur.areas, areaId])]
                : cur.areas.filter((a) => a !== areaId),
            },
          },
        };
      });
      setAccessSaved(false);
    },
    [teamUsers],
  );

  const handleToggleOkrAssignment = useCallback(
    (userCodigo: string, areaId: string, okrId: string, checked: boolean) => {
      setState((current) => ({
        ...current,
        areas: current.areas.map((area) => {
          if (area.id !== areaId) return area;
          return {
            ...area,
            okrs: area.okrs.map((okr) => {
              if (okr.id !== okrId) return okr;
              return {
                ...okr,
                assignedCodes: checked
                  ? [...new Set([...okr.assignedCodes, userCodigo])]
                  : okr.assignedCodes.filter((c) => c !== userCodigo),
              };
            }),
          };
        }),
      }));
    },
    [],
  );

  const handleToggleKrAssignment = useCallback(
    (
      userCodigo: string,
      areaId: string,
      okrId: string,
      krId: string,
      checked: boolean,
    ) => {
      setState((current) => ({
        ...current,
        areas: current.areas.map((area) => {
          if (area.id !== areaId) return area;
          return {
            ...area,
            okrs: area.okrs.map((okr) => {
              if (okr.id !== okrId) return okr;
              return {
                ...okr,
                krs: okr.krs.map((kr) => {
                  if (kr.id !== krId) return kr;
                  return {
                    ...kr,
                    assignedCodes: checked
                      ? [...new Set([...kr.assignedCodes, userCodigo])]
                      : kr.assignedCodes.filter((c) => c !== userCodigo),
                  };
                }),
              };
            }),
          };
        }),
      }));
    },
    [],
  );
  const handleSaveAccess = useCallback(async () => {
    if (accessSaving) return;
    setAccessSaving(true);
    try {
      const token = getAuthToken();
      if (!accessMetaId) {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: ENTITY_ACCESS,
            entity_id: ENTITY_ACCESS_ID,
            payload: accessState,
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = await res.json().catch(() => null);
        const newId = json?.id ?? json?.data?.id ?? null;
        if (newId) setAccessMetaId(String(newId));
      } else {
        const res = await fetch(
          `/api/metadata/${encodeURIComponent(accessMetaId)}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token ?? ""}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entity: ENTITY_ACCESS,
              entity_id: ENTITY_ACCESS_ID,
              payload: accessState,
            }),
          },
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
      }
      setAccessSaved(true);
    } catch (err) {
      console.error("[rendimiento-areas] access save failed", err);
    } finally {
      setAccessSaving(false);
    }
  }, [accessMetaId, accessSaving, accessState]);

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
      okrs: [],
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

  const addOkr = (areaId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      okrs: [
        ...area.okrs,
        {
          id: uid(),
          title: "",
          description: "",
          assignedCodes: [],
          krs: [],
        },
      ],
    }));
  };

  const removeOkr = (areaId: string, okrId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      okrs: area.okrs.filter((o) => o.id !== okrId),
    }));
  };

  const updateOkrField = (
    areaId: string,
    okrId: string,
    patch: Partial<Omit<OkrItem, "krs">>,
  ) => {
    updateArea(areaId, (area) => ({
      ...area,
      okrs: area.okrs.map((o) => (o.id === okrId ? { ...o, ...patch } : o)),
    }));
  };

  const addKr = (areaId: string, okrId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      okrs: area.okrs.map((o) => {
        if (o.id !== okrId) return o;
        return {
          ...o,
          krs: [
            ...o.krs,
            {
              id: uid(),
              title: "",
              description: "",
              assignedCodes: [],
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
              indicators: [],
            },
          ],
        };
      }),
    }));
  };

  const removeKr = (areaId: string, okrId: string, krId: string) => {
    updateArea(areaId, (area) => ({
      ...area,
      okrs: area.okrs.map((o) => {
        if (o.id !== okrId) return o;
        return { ...o, krs: o.krs.filter((k) => k.id !== krId) };
      }),
    }));
  };

  const updateKr = (
    areaId: string,
    okrId: string,
    krId: string,
    patch: Partial<KrItem>,
  ) => {
    updateArea(areaId, (area) => ({
      ...area,
      okrs: area.okrs.map((o) => {
        if (o.id !== okrId) return o;
        return {
          ...o,
          krs: o.krs.map((kr) => {
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
        };
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
            No tienes acceso a ninguna área. Solicita al administrador que
            configure tus permisos de vista.
          </p>
        </div>
      </div>
    );
  }

  // Global stats
  const allKrs = visibleAreas.flatMap((a) => a.okrs.flatMap((o) => o.krs));
  const totalOkrs = visibleAreas.reduce((sum, a) => sum + a.okrs.length, 0);
  const totalKrs = allKrs.length;
  const avgProgress =
    totalKrs > 0
      ? Math.round(allKrs.reduce((sum, k) => sum + k.progress, 0) / totalKrs)
      : 0;

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
            OKRs totales
          </p>
          <p className="text-2xl font-bold mt-1">{totalOkrs}</p>
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
      </div>

      {/* ── Area tabs ───────────────────────────────────────────────── */}
      <Tabs value={activeAreaId} onValueChange={setActiveAreaId}>
        <div className="flex items-center gap-3">
          <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1 flex-1">
            {visibleAreas.map((area) => {
              const areaAllKrs = area.okrs.flatMap((o) => o.krs);
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
          const areaAllKrs = area.okrs.flatMap((o) => o.krs);
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
                  {/* Area leaders / who can see this area */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Users className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    {area.leaderCodes.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground italic">
                        Sin acceso asignado
                      </span>
                    ) : (
                      area.leaderCodes.map((code) => {
                        const u = teamUsers.find((t) => t.codigo === code);
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px]"
                          >
                            {u?.nombre ?? code}
                          </span>
                        );
                      })
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setAreaUserSearch("");
                          setAreaUserPicker(area.id);
                        }}
                        className="ml-1 inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        Gestionar acceso
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-bold tabular-nums leading-none">
                      {areaAvgPct}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {area.okrs.length} OKR · {areaAllKrs.length} KR
                    </p>
                  </div>
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

              {/* Area overall progress bar */}
              <KrProgressBar value={areaAvgPct} status={dominantStatus} />

              {/* OKRs del área */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    OKRs
                  </h3>
                  {canEditArea && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={() => addOkr(area.id)}
                    >
                      <Plus className="h-3 w-3" /> Añadir OKR
                    </Button>
                  )}
                </div>

                {area.okrs.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Sin objetivos (OKRs) en esta área todavía.
                    </p>
                    {canEditArea && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 h-8"
                        onClick={() => addOkr(area.id)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir primer OKR
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {area.okrs.map((okr, okrIdx) => {
                      const okrAvgPct = okr.krs.length
                        ? Math.round(
                            okr.krs.reduce((a, k) => a + k.progress, 0) /
                              okr.krs.length,
                          )
                        : 0;
                      const okrDominant: KrStatus =
                        okr.krs.length === 0
                          ? "paused"
                          : okr.krs.some((k) => k.status === "off_track")
                            ? "off_track"
                            : okr.krs.some((k) => k.status === "at_risk")
                              ? "at_risk"
                              : okr.krs.every((k) => k.status === "on_track")
                                ? "on_track"
                                : "paused";
                      const okrSt = STATUS_STYLES[okrDominant];

                      return (
                        <div
                          key={okr.id}
                          className={cn(
                            "rounded-xl border-l-4 border bg-muted/10 p-4 space-y-4",
                            okrSt.border,
                          )}
                        >
                          {/* OKR header */}
                          <div className="flex items-start gap-3 justify-between">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 h-4 shrink-0 font-mono"
                                >
                                  OKR {okrIdx + 1}
                                </Badge>
                                {canEditArea ? (
                                  <Input
                                    value={okr.title}
                                    onChange={(e) =>
                                      updateOkrField(area.id, okr.id, {
                                        title: e.target.value,
                                      })
                                    }
                                    placeholder="Título del OKR…"
                                    className="h-7 text-sm font-semibold border-0 bg-transparent p-0 focus-visible:ring-0 flex-1 min-w-0"
                                  />
                                ) : (
                                  <p className="text-sm font-semibold">
                                    {okr.title || "Sin título"}
                                  </p>
                                )}
                              </div>

                              {canEditArea ? (
                                <Textarea
                                  value={okr.description}
                                  onChange={(e) =>
                                    updateOkrField(area.id, okr.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Descripción del OKR…"
                                  className="min-h-10 text-xs leading-relaxed border-dashed bg-transparent resize-none"
                                />
                              ) : okr.description ? (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {okr.description}
                                </p>
                              ) : null}

                              {/* Assigned users */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Users className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                {okr.assignedCodes.length === 0 ? (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    Sin usuarios asignados
                                  </span>
                                ) : (
                                  okr.assignedCodes.map((code) => {
                                    const u = teamUsers.find(
                                      (t) => t.codigo === code,
                                    );
                                    return (
                                      <span
                                        key={code}
                                        className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px]"
                                      >
                                        {u?.nombre ?? code}
                                      </span>
                                    );
                                  })
                                )}
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOkrUserSearch("");
                                      setOkrUserPicker({
                                        areaId: area.id,
                                        okrId: okr.id,
                                      });
                                    }}
                                    className="ml-1 inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                    Gestionar
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p className="text-2xl font-bold tabular-nums leading-none">
                                  {okrAvgPct}%
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {okr.krs.length} KR
                                </p>
                              </div>
                              {canEditArea && (
                                <button
                                  type="button"
                                  title="Eliminar OKR"
                                  className="text-muted-foreground/40 hover:text-destructive transition-colors"
                                  onClick={() => removeOkr(area.id, okr.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* OKR progress bar */}
                          <KrProgressBar
                            value={okrAvgPct}
                            status={okrDominant}
                          />

                          {/* KRs dentro del OKR */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                Resultados Clave
                              </span>
                              {canEditArea && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 gap-1 text-xs"
                                  onClick={() => addKr(area.id, okr.id)}
                                >
                                  <Plus className="h-3 w-3" /> KR
                                </Button>
                              )}
                            </div>

                            {okr.krs.length === 0 ? (
                              <div className="rounded-lg border border-dashed p-5 text-center">
                                <p className="text-xs text-muted-foreground">
                                  Sin KR en este objetivo.
                                </p>
                                {canEditArea && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 h-7 text-xs"
                                    onClick={() => addKr(area.id, okr.id)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" /> Añadir KR
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/40 border-b">
                                      <th className="w-7 px-2 py-2" />
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                        KR
                                      </th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                                        Estado
                                      </th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                        Progreso
                                      </th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                                        Período
                                      </th>
                                      <th className="w-8 px-2 py-2" />
                                      {(canEditArea || isOwner) && (
                                        <th className="w-8 px-2 py-2" />
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {okr.krs.map((kr) => {
                                      const st = STATUS_STYLES[kr.status];
                                      const isExpanded = expandedKrs.has(kr.id);
                                      const toggleExpand = () =>
                                        setExpandedKrs((prev) => {
                                          const next = new Set(prev);
                                          next.has(kr.id)
                                            ? next.delete(kr.id)
                                            : next.add(kr.id);
                                          return next;
                                        });
                                      return (
                                        <React.Fragment key={kr.id}>
                                          <tr
                                            key={kr.id}
                                            className={`border-b last:border-b-0 transition-colors hover:bg-muted/20 ${isExpanded ? "bg-muted/10" : ""}`}
                                          >
                                            {/* Expand toggle */}
                                            <td className="px-2 py-2 text-center">
                                              <button
                                                type="button"
                                                onClick={toggleExpand}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                <ChevronDown
                                                  className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                />
                                              </button>
                                            </td>

                                            {/* Title */}
                                            <td className="px-3 py-2">
                                              <span
                                                className="font-medium text-foreground line-clamp-2 cursor-pointer"
                                                onClick={toggleExpand}
                                              >
                                                {kr.title || (
                                                  <span className="text-muted-foreground italic">
                                                    Sin título
                                                  </span>
                                                )}
                                              </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-2 hidden sm:table-cell">
                                              <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.badgeClass}`}
                                              >
                                                <span
                                                  className={`h-1.5 w-1.5 rounded-full ${st.dot}`}
                                                />
                                                {st.label}
                                              </span>
                                            </td>

                                            {/* Progress */}
                                            <td className="px-3 py-2">
                                              <div className="flex items-center gap-2 min-w-20">
                                                <div className="flex-1">
                                                  <KrProgressBar
                                                    value={kr.progress}
                                                    status={kr.status}
                                                  />
                                                </div>
                                                <span className="tabular-nums text-[10px] text-muted-foreground w-8 text-right">
                                                  {kr.progress}%
                                                </span>
                                              </div>
                                            </td>

                                            {/* Período */}
                                            <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">
                                              {kr.periodQuarter ?? "—"}
                                            </td>

                                            {/* Detail button */}
                                            <td className="px-2 py-2 text-center">
                                              <button
                                                type="button"
                                                title="Ver detalle y evidencias"
                                                onClick={() =>
                                                  setKrDetail({
                                                    areaId: area.id,
                                                    okrId: okr.id,
                                                    krId: kr.id,
                                                  })
                                                }
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                <PanelRight className="h-3.5 w-3.5" />
                                              </button>
                                            </td>

                                            {/* Actions */}
                                            {(canEditArea || isOwner) && (
                                              <td className="px-2 py-2 text-center">
                                                {canEditArea && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      removeKr(
                                                        area.id,
                                                        okr.id,
                                                        kr.id,
                                                      )
                                                    }
                                                    className="text-muted-foreground hover:text-red-500 transition-colors"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                )}
                                              </td>
                                            )}
                                          </tr>

                                          {/* Expanded panel row */}
                                          {isExpanded && (
                                            <tr
                                              key={`${kr.id}-expanded`}
                                              className="bg-muted/5 border-b last:border-b-0"
                                            >
                                              <td
                                                colSpan={
                                                  canEditArea || isOwner ? 6 : 5
                                                }
                                                className="px-0 py-0"
                                              >
                                                <KrExpandedPanel
                                                  kr={kr}
                                                  canEdit={canEditArea}
                                                  areaName={area.name}
                                                  isOwner={isOwner}
                                                  teamUsers={teamUsers}
                                                  onUpdate={(patch) =>
                                                    updateKr(
                                                      area.id,
                                                      okr.id,
                                                      kr.id,
                                                      patch,
                                                    )
                                                  }
                                                />
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* ── Modal: Asignar usuarios a OKR ──────────────────────────────── */}
      {okrUserPicker &&
        (() => {
          const pickerArea = state.areas.find(
            (a) => a.id === okrUserPicker.areaId,
          );
          const pickerOkr = pickerArea?.okrs.find(
            (o) => o.id === okrUserPicker.okrId,
          );
          if (!pickerOkr) return null;
          return (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center backdrop-blur-sm bg-black/60 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOkrUserPicker(null);
              }}
            >
              <div className="bg-background rounded-xl shadow-2xl border w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-sm">
                      Asignar usuarios a OKR
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOkrUserPicker(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* OKR title */}
                <div className="px-4 py-2 bg-muted/30 border-b shrink-0">
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    <span className="font-medium text-foreground">
                      {pickerOkr.title || "OKR sin título"}
                    </span>
                  </p>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b shrink-0">
                  <Input
                    placeholder="Buscar usuario…"
                    value={okrUserSearch}
                    onChange={(e) => setOkrUserSearch(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                  />
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {teamUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No hay usuarios cargados.
                    </p>
                  ) : (
                    teamUsers
                      .filter((u) =>
                        okrUserSearch.trim()
                          ? u.nombre
                              .toLowerCase()
                              .includes(okrUserSearch.toLowerCase()) ||
                            (u.puesto ?? "")
                              .toLowerCase()
                              .includes(okrUserSearch.toLowerCase())
                          : true,
                      )
                      .map((u) => {
                        const assigned = pickerOkr.assignedCodes.includes(
                          u.codigo,
                        );
                        return (
                          <label
                            key={u.codigo}
                            className="flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-muted/40 select-none transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...pickerOkr.assignedCodes, u.codigo]
                                  : pickerOkr.assignedCodes.filter(
                                      (c) => c !== u.codigo,
                                    );
                                updateOkrField(
                                  okrUserPicker.areaId,
                                  okrUserPicker.okrId,
                                  {
                                    assignedCodes: next,
                                  },
                                );
                              }}
                              className="h-4 w-4 rounded accent-blue-600 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {u.nombre}
                              </p>
                              {(u.puesto || u.area) && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {[u.puesto, u.area]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                            {assigned && (
                              <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            )}
                          </label>
                        );
                      })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t shrink-0 bg-background">
                  <span className="text-xs text-muted-foreground">
                    {pickerOkr.assignedCodes.length} asignado
                    {pickerOkr.assignedCodes.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setOkrUserPicker(null)}
                    className="h-7 text-xs"
                  >
                    Listo
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Modal: Quién puede ver esta área ─────────────────────────── */}
      {areaUserPicker &&
        (() => {
          const pickerArea = state.areas.find((a) => a.id === areaUserPicker);
          if (!pickerArea) return null;
          return (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center backdrop-blur-sm bg-black/60 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setAreaUserPicker(null);
              }}
            >
              <div className="bg-background rounded-xl shadow-2xl border w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-500" />
                    <span className="font-semibold text-sm">
                      Acceso al área
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAreaUserPicker(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Area name */}
                <div className="px-4 py-2 bg-muted/30 border-b shrink-0">
                  <p className="text-xs">
                    <span className="font-medium text-foreground">
                      {pickerArea.name}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      · quién puede ver esta área
                    </span>
                  </p>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b shrink-0">
                  <Input
                    placeholder="Buscar usuario…"
                    value={areaUserSearch}
                    onChange={(e) => setAreaUserSearch(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                  />
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {teamUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No hay usuarios cargados.
                    </p>
                  ) : (
                    teamUsers
                      .filter((u) =>
                        areaUserSearch.trim()
                          ? u.nombre
                              .toLowerCase()
                              .includes(areaUserSearch.toLowerCase()) ||
                            (u.puesto ?? "")
                              .toLowerCase()
                              .includes(areaUserSearch.toLowerCase())
                          : true,
                      )
                      .map((u) => {
                        const assigned = pickerArea.leaderCodes.includes(
                          u.codigo,
                        );
                        return (
                          <label
                            key={u.codigo}
                            className="flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-muted/40 select-none transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...pickerArea.leaderCodes, u.codigo]
                                  : pickerArea.leaderCodes.filter(
                                      (c) => c !== u.codigo,
                                    );
                                updateArea(areaUserPicker, (a) => ({
                                  ...a,
                                  leaderCodes: next,
                                }));
                              }}
                              className="h-4 w-4 rounded accent-violet-600 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {u.nombre}
                              </p>
                              {(u.puesto || u.area) && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {[u.puesto, u.area]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                            {assigned && (
                              <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                            )}
                          </label>
                        );
                      })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t shrink-0 bg-background">
                  <span className="text-xs text-muted-foreground">
                    {pickerArea.leaderCodes.length} usuario
                    {pickerArea.leaderCodes.length !== 1 ? "s" : ""} con acceso
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setAreaUserPicker(null)}
                    className="h-7 text-xs"
                  >
                    Listo
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Drawer: Detalle y evidencias del KR ──────────────────────── */}
      {krDetail &&
        (() => {
          const da = state.areas.find((a) => a.id === krDetail.areaId);
          const do_ = da?.okrs.find((o) => o.id === krDetail.okrId);
          const dk = do_?.krs.find((k) => k.id === krDetail.krId);
          if (!da || !do_ || !dk) return null;
          const drawerCanEdit = isOwner || canLeadArea(da);
          return (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={() => setKrDetail(null)}
              />
              {/* Drawer */}
              <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-background shadow-2xl border-l flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <PanelRight className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {dk.title || "KR sin título"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {da.name} · {do_.title || "OKR sin título"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKrDetail(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted shrink-0 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Progreso */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Progreso actual
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <KrProgressBar value={dk.progress} status={dk.status} />
                      </div>
                      <span className="text-2xl font-bold tabular-nums w-14 text-right">
                        {dk.progress}%
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                          STATUS_STYLES[dk.status].badgeClass,
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            STATUS_STYLES[dk.status].dot,
                          )}
                        />
                        {STATUS_STYLES[dk.status].label}
                      </span>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                        {dk.periodQuarter}-{dk.periodYear}
                      </span>
                    </div>
                  </div>

                  {/* Descripción */}
                  {dk.description && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Descripción
                      </h3>
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {dk.description}
                      </p>
                    </div>
                  )}

                  {/* Medición */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Medición
                    </h3>
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="font-medium capitalize">
                          {dk.measurementType}
                        </span>
                      </div>
                      {dk.targetValue !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Meta</span>
                          <span className="font-medium">
                            {dk.targetValue} {dk.unit}
                          </span>
                        </div>
                      )}
                      {dk.currentValue !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual</span>
                          <span className="font-medium">
                            {dk.currentValue} {dk.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evidencias */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Evidencias y notas
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Adjunta capturas, links, documentos o notas que demuestren
                      el cumplimiento de este KR.
                    </p>

                    {/* Current evidence list */}
                    {(dk.evidences ?? []).length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          Sin evidencias aún.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(dk.evidences ?? []).map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {ev.label}
                              </p>
                              {ev.url && (
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:underline break-all"
                                >
                                  {ev.url}
                                </a>
                              )}
                              {ev.note && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {ev.note}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {ev.addedAt?.slice(0, 10)}
                              </p>
                            </div>
                            {drawerCanEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (dk.evidences ?? []).filter(
                                    (e) => e.id !== ev.id,
                                  );
                                  updateKr(
                                    krDetail.areaId,
                                    krDetail.okrId,
                                    krDetail.krId,
                                    {
                                      evidences: next,
                                    },
                                  );
                                }}
                                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add evidence form */}
                    {drawerCanEdit && (
                      <AddEvidenceForm
                        onAdd={(ev) => {
                          const next = [...(dk.evidences ?? []), ev];
                          updateKr(
                            krDetail.areaId,
                            krDetail.okrId,
                            krDetail.krId,
                            {
                              evidences: next,
                            },
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
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
