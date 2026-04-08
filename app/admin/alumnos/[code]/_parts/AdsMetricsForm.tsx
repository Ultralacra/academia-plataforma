"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { type MetadataRecord } from "@/lib/metadata";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isoDay, parseMaybe } from "./detail-utils";

const DRY_RUN_METADATA_SAVE = false;

type CurrencyCode = "USD" | "COP" | "ARS" | "EUR" | "MXN" | "PEN";

const CURRENCY_OPTIONS: Array<{ code: CurrencyCode; label: string }> = [
  { code: "USD", label: "Dólar (USD)" },
  { code: "COP", label: "Peso colombiano (COP)" },
  { code: "ARS", label: "Peso argentino (ARS)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "MXN", label: "Peso mexicano (MXN)" },
  { code: "PEN", label: "Sol peruano (PEN)" },
];

const PHASE_OPTIONS = [
  "Fase de testeo",
  "Fase de optimización",
  "Fase de Escala",
] as const;

const SUBPHASE_OPTIONS = [
  "Copy/Ads",
  "Copy/VSL",
  "Copy/Página",
  "Copy/Oferta",
  "Técnica",
  "Ads",
] as const;

const SUBPHASE_COLOR_OPTIONS = ["En proceso", "Ejecutado"] as const;

type AdsMetricsCalloutItem = {
  title: string;
  description: string;
  details?: string[];
  featured?: boolean;
};

const MONEY_DISCLAIMER_ITEMS: AdsMetricsCalloutItem[] = [];

const FUNNEL_DISCLAIMER_ITEMS: AdsMetricsCalloutItem[] = [
  {
    title: "Registro acumulado",
    description:
      "En esta sección vas a registrar las métricas acumuladas de todo el periodo que se tuvo pauta activa.",
  },
];

const STATUS_DISCLAIMER_ITEMS: AdsMetricsCalloutItem[] = [
  {
    title: "1. Fase de Testeo",
    description:
      "Es la fase inicial. Comienza desde el momento en que lanzas tu pauta y abarca hasta que llevas invertidos entre 150 y 200 dólares.",
  },
  {
    title: "2. Fase de Optimización",
    description:
      "Es la fase en la que empiezas a hacer ajustes y mejoras en tu publicidad.",
    featured: true,
    details: [
      "Copy/Ads: Debes crear más anuncios.",
      "Copy/VSL: Debes hacer modificaciones en los titulares de tu VSL, en el hook, o incluso crear micro VSLs.",
      "Copy/Página: Realizas ajustes a nivel de copy u oferta directamente en tu página.",
      "Copy/Oferta: Reformulas la oferta de tu producto carnada.",
      "Técnica: Corriges problemas de velocidad en tu página o arreglas partes del embudo que están rotas y no permiten que la compra del OTO o el Downsell funcione correctamente.",
      "Ads: Te dedicas exclusivamente a apagar los anuncios, VSLs y páginas que no están dando resultados.",
    ],
  },
  {
    title: "3. Fase de Escala",
    description:
      "Es la fase en la que ya identificaste qué funciona mejor, ya sea a nivel de anuncios, VSL o página, y comienzas a aumentar significativamente la inversión para potenciar tus resultados publicitarios.",
  },
];

function AdsMetricsCallout({
  eyebrow,
  title,
  description,
  items,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: AdsMetricsCalloutItem[];
  tone: "amber" | "sky";
}) {
  const palette =
    tone === "amber"
      ? {
          shell:
            "border-amber-200/80 bg-gradient-to-br from-amber-50 via-background to-orange-50",
          badge: "border-amber-300/80 bg-amber-100/80 text-amber-900",
          accent: "bg-amber-500",
          card: "border-amber-200/70 bg-white/80",
        }
      : {
          shell:
            "border-sky-200/80 bg-gradient-to-br from-sky-50 via-background to-cyan-50",
          badge: "border-sky-300/80 bg-sky-100/80 text-sky-900",
          accent: "bg-sky-500",
          card: "border-sky-200/70 bg-white/80",
        };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${palette.shell}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${palette.badge}`}
          >
            {eyebrow}
          </span>
          <div className="h-px flex-1 min-w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="rounded-xl border border-white/50 bg-white/60 p-3 backdrop-blur-sm">
            <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div
          className={
            items.length <= 1
              ? "grid gap-3"
              : "grid gap-3 lg:grid-cols-2 xl:grid-cols-3"
          }
        >
          {items.map((item) => (
            <div
              key={item.title}
              className={`rounded-xl border p-3 backdrop-blur-sm ${palette.card} ${
                item.featured ? "lg:col-span-2 xl:col-span-2" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${palette.accent}`}
                />
                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-foreground">
                    {item.title}
                  </div>
                  <p className="whitespace-pre-line text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                  {item.details?.length ? (
                    <ul
                      className={`text-xs leading-5 text-muted-foreground ${
                        item.featured
                          ? "grid gap-x-4 gap-y-2 md:grid-cols-2"
                          : "space-y-1"
                      }`}
                    >
                      {item.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex gap-2 rounded-lg bg-background/70 px-2.5 py-2"
                        >
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function normalizeSubphaseColor(input: unknown): string {
  const value = String(input ?? "").trim();
  if (!value) return "";

  switch (value.toLowerCase()) {
    case "no aplica":
    case "sin trascendencia":
      return "";
    case "por definir":
    case "en proceso":
      return "En proceso";
    case "realizado":
    case "ejecutado":
      return "Ejecutado";
    default:
      return value;
  }
}

function normalizeCurrency(input: unknown): CurrencyCode {
  const code = String(input ?? "USD")
    .trim()
    .toUpperCase();
  if (["USD", "COP", "ARS", "EUR", "MXN", "PEN"].includes(code)) {
    return code as CurrencyCode;
  }
  return "USD";
}

function formatRateLabel(code: CurrencyCode, rateToUsd: number | null) {
  if (code === "USD") return "1 USD = 1 USD";
  if (rateToUsd == null || rateToUsd <= 0) return "Sin tipo de cambio";
  return `1 USD = ${new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 6,
  }).format(rateToUsd)} ${code}`;
}

function normPhaseId(v: unknown) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function isOptimizationPhase(v: unknown) {
  const normalized = normPhaseId(v);
  return (
    normalized === "FASEDEOPTIMIZACION" ||
    normalized === "FASEOPTIMIZACION" ||
    normalized === "OPTIMIZACION"
  );
}

function isFase5(etapaId: unknown) {
  const n = normPhaseId(etapaId);
  if (n === "F5" || n === "FASE5") return true;
  if (n.startsWith("F5") && n.length > 2 && !/\d/.test(n[2])) return true;
  if (n.startsWith("FASE5") && n.length > 5 && !/\d/.test(n[5])) return true;
  return false;
}

async function fetchFase5StartDateISO(
  studentCode: string,
): Promise<string | null> {
  try {
    const histUrl = `/client/get/cliente-etapas/${encodeURIComponent(
      studentCode,
    )}`;
    const jh = await apiFetch<any>(histUrl);
    const rows = Array.isArray(jh?.data) ? jh.data : [];

    const dates = rows
      .filter((r: any) =>
        isFase5(r?.etapa_id ?? r?.etapa ?? r?.fase ?? r?.stage),
      )
      .map((r: any) => parseMaybe(r?.created_at ?? r?.fecha ?? r?.createdAt))
      .filter((d: Date | null): d is Date => Boolean(d))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    return dates[0] ? isoDay(dates[0]) : null;
  } catch {
    return null;
  }
}

// Utilidades numéricas para formato en vista previa del formulario ADS
function toNum(v?: string | number | null) {
  return toNumFlexible(v);
}
function fmtNum(n?: string | number | null, digits?: number) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: typeof digits === "number" ? digits : 0,
  }).format(v);
}
function fmtMoney(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}
function fmtPct(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

function toMoneyStorageString(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "";
  const rounded = Number(v.toFixed(2));
  return String(rounded);
}

function toNumFlexible(v?: string | number | null) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;

  const cleaned = s.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  const dotThousands = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;
  const commaThousands = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

  let normalized = cleaned;

  if (dotThousands.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else if (commaThousands.test(cleaned)) {
    normalized = cleaned.replace(/,/g, "");
  } else {
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");

    if (dotCount > 0 && commaCount > 0) {
      normalized =
        lastDot > lastComma
          ? cleaned.replace(/,/g, "")
          : cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else if (commaCount > 0) {
      if (commaCount > 1) {
        normalized = cleaned.replace(/,/g, "");
      } else {
        const decimals = cleaned.split(",")[1] ?? "";
        normalized =
          decimals.length <= 6
            ? cleaned.replace(",", ".")
            : cleaned.replace(/,/g, "");
      }
    } else if (dotCount > 0) {
      if (dotCount > 1) {
        normalized = cleaned.replace(/\./g, "");
      } else {
        const decimals = cleaned.split(".")[1] ?? "";
        normalized =
          decimals.length <= 6 ? cleaned : cleaned.replace(/\./g, "");
      }
    }
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function convertLocalToUsd(
  amountLocal: number | null,
  currency: CurrencyCode,
  rateToUsd: number | null,
) {
  if (amountLocal == null) return null;
  if (currency === "USD") return amountLocal;
  if (rateToUsd == null || rateToUsd <= 0) return null;
  return amountLocal / rateToUsd;
}

function fmtMoneyByCurrency(n: number | null, currency: CurrencyCode) {
  if (n == null || !Number.isFinite(n)) return "—";
  const localeMap: Record<CurrencyCode, string> = {
    USD: "en-US",
    COP: "es-CO",
    ARS: "es-AR",
    EUR: "es-ES",
    MXN: "es-MX",
    PEN: "es-PE",
  };
  const fractionDigits = currency === "USD" || currency === "EUR" ? 2 : 0;
  return new Intl.NumberFormat(localeMap[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

function computeAutomaticInterventionDecision(next: {
  inversion?: string;
  facturacion?: string;
  roas?: string;
}) {
  const inversionUsd = toNumFlexible(next.inversion);
  const facturacionUsd = toNumFlexible(next.facturacion);
  const roasCalculated =
    inversionUsd != null && inversionUsd > 0 && facturacionUsd != null
      ? facturacionUsd / inversionUsd
      : null;
  const roasValue = roasCalculated ?? toNumFlexible(next.roas);

  if (inversionUsd == null || roasValue == null) return null;
  if (inversionUsd <= 150) return null;
  if (roasValue < 0.4) return true;
  if (roasValue > 0.6) return false;
  return null;
}

export default function AdsMetricsForm({
  studentCode,
  studentName,
  readOnly,
}: {
  studentCode: string;
  studentName?: string;
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const isReadOnly = Boolean(readOnly);
  const normalizedUserRole = String((user as any)?.role ?? "")
    .trim()
    .toLowerCase();
  const normalizedUserTipo = String((user as any)?.tipo ?? "")
    .trim()
    .toLowerCase();
  const canEditInterventionSwitch =
    !isReadOnly &&
    [normalizedUserRole, normalizedUserTipo].some((value) =>
      ["admin", "administrator", "superadmin", "equipo", "team"].includes(
        value,
      ),
    );

  type Metrics = {
    fecha_inicio?: string;
    fecha_asignacion?: string;
    fecha_fin?: string;
    moneda?: CurrencyCode;
    tipo_cambio_usd?: string;
    fx_updated_at?: string;
    inversion?: string;
    inversion_moneda?: string;
    facturacion?: string;
    facturacion_moneda?: string;
    roas?: string;
    alcance?: string;
    clics?: string;
    visitas?: string;
    pagos?: string;
    carga_pagina?: string;
    eff_ads?: string;
    eff_pago?: string;
    eff_compra?: string;
    compra_carnada?: string;
    compra_bump1?: string;
    compra_bump2?: string;
    compra_oto1?: string;
    compra_oto2?: string;
    compra_downsell?: string;
    pauta_activa?: boolean;
    requiere_interv?: boolean;
    fase?: string;
    subfase?: string;
    subfase_color?: string;
    fase_data?: Record<string, { obs?: string; interv_sugerida?: string }>;
    coach_copy?: string;
    coach_plat?: string;
    obs?: string;
    interv_sugerida?: string;
    auto_roas?: boolean;
    auto_eff?: boolean;
    adjuntos?: Array<{
      id: string;
      kind: "link" | "file";
      name: string;
      url?: string;
      type?: string;
      size?: number;
    }>;
  };

  const [data, setData] = useState<Metrics>({
    moneda: "USD",
    tipo_cambio_usd: "1",
    auto_roas: true,
    auto_eff: true,
    pauta_activa: false,
    requiere_interv: false,
    adjuntos: [],
  });
  const [fxLoading, setFxLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const saveTimerRef = useRef<number | null>(null);
  const didInitRef = useRef<boolean>(false);
  // Refs para evitar consultas duplicadas
  const coachesFetchedRef = useRef<string | null>(null);
  const studentInfoFetchedRef = useRef<string | null>(null);

  const [assignedCoaches, setAssignedCoaches] = useState<
    Array<{ name: string; area?: string | null; puesto?: string | null }>
  >([]);
  const [studentInfo, setStudentInfo] = useState<{
    id: string | number | null;
    code: string;
    name: string;
  } | null>(null);

  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [matchedMetadata, setMatchedMetadata] =
    useState<MetadataRecord<any> | null>(null);
  const [matchedMetadataCount, setMatchedMetadataCount] = useState<number>(0);
  const [matchedMetadataAllIds, setMatchedMetadataAllIds] = useState<
    (string | number)[]
  >([]);
  const [matchedMetadataAllItems, setMatchedMetadataAllItems] = useState<
    MetadataRecord<any>[]
  >([]);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<
    string | number | null
  >(null);
  const [metadataDeleting, setMetadataDeleting] = useState(false);

  function syncMonetaryFields(next: Metrics): Metrics {
    const currency = normalizeCurrency(next.moneda);
    const rateToUsd =
      currency === "USD" ? 1 : toNumFlexible(next.tipo_cambio_usd);

    const hasLocalInputs =
      next.inversion_moneda != null || next.facturacion_moneda != null;

    const inversionLocal = toNumFlexible(
      next.inversion_moneda ?? next.inversion,
    );
    const facturacionLocal = toNumFlexible(
      next.facturacion_moneda ?? next.facturacion,
    );

    const inversionUsd = convertLocalToUsd(inversionLocal, currency, rateToUsd);
    const facturacionUsd = convertLocalToUsd(
      facturacionLocal,
      currency,
      rateToUsd,
    );

    const keepLegacyUsdValues =
      currency === "USD" &&
      !hasLocalInputs &&
      next.inversion != null &&
      next.facturacion != null;

    const synced: Metrics = {
      ...next,
      moneda: currency,
      tipo_cambio_usd:
        currency === "USD"
          ? "1"
          : rateToUsd != null && rateToUsd > 0
            ? String(Number(rateToUsd.toFixed(6)))
            : "",
      inversion_moneda:
        next.inversion_moneda ??
        next.inversion ??
        (inversionLocal == null ? "" : String(inversionLocal)),
      facturacion_moneda:
        next.facturacion_moneda ??
        next.facturacion ??
        (facturacionLocal == null ? "" : String(facturacionLocal)),
      inversion: keepLegacyUsdValues
        ? String(next.inversion ?? "")
        : toMoneyStorageString(inversionUsd),
      facturacion: keepLegacyUsdValues
        ? String(next.facturacion ?? "")
        : toMoneyStorageString(facturacionUsd),
    };

    const automaticInterventionDecision =
      computeAutomaticInterventionDecision(synced);
    if (automaticInterventionDecision !== null) {
      synced.requiere_interv = automaticInterventionDecision;
    }

    return synced;
  }

  function applyMetadataToForm(record: MetadataRecord<any> | null) {
    if (!record) return;
    const p = (record as any)?.payload;
    if (!p || typeof p !== "object") return;
    setData((prev) =>
      syncMonetaryFields({
        ...prev,
        ...(p as any),
        subfase_color: normalizeSubphaseColor((p as any)?.subfase_color),
        auto_roas: true,
        auto_eff: true,
      }),
    );
  }

  const norm = (v: unknown) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toUpperCase();

  const coachCopyAssigned = useMemo(() => {
    return assignedCoaches.find((c) => norm(c.area).includes("COPY")) || null;
  }, [assignedCoaches]);

  const coachAdsAssigned = useMemo(() => {
    return (
      assignedCoaches.find(
        (c) => norm(c.area) === "TECNICO" && norm(c.puesto) === "COACH_TECNICO",
      ) || null
    );
  }, [assignedCoaches]);

  useEffect(() => {
    // Evitar consulta duplicada si ya consultamos este studentCode
    if (coachesFetchedRef.current === studentCode) return;

    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
          studentCode,
        )}`;
        const j = await apiFetch<any>(url);
        if (!alive) return;
        coachesFetchedRef.current = studentCode;
        const rows: any[] = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j)
            ? j
            : [];
        const mapped = rows
          .map((r) => {
            const name = String(
              r?.coach_nombre ?? r?.name ?? r?.nombre ?? "",
            ).trim();
            if (!name) return null;
            return {
              name,
              area: r?.area ?? null,
              puesto: r?.puesto ?? null,
            };
          })
          .filter(Boolean) as Array<{
          name: string;
          area?: string | null;
          puesto?: string | null;
        }>;
        const uniqByName = Array.from(
          new Map(mapped.map((c) => [c.name, c])).values(),
        ).sort((a, b) => a.name.localeCompare(b.name, "es"));
        setAssignedCoaches(uniqByName);
      } catch {
        if (!alive) return;
        coachesFetchedRef.current = studentCode;
        setAssignedCoaches([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentCode]);

  // Resolver id/nombre del alumno para poder guardar en metadata
  useEffect(() => {
    // Evitar consulta duplicada si ya consultamos este studentCode
    if (studentInfoFetchedRef.current === studentCode) return;

    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients?page=1&search=${encodeURIComponent(
          studentCode,
        )}`;
        const json = await apiFetch<any>(url);
        if (!alive) return;
        studentInfoFetchedRef.current = studentCode;
        const rows: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.clients?.data)
            ? json.clients.data
            : Array.isArray(json?.getClients?.data)
              ? json.getClients.data
              : Array.isArray(json)
                ? json
                : [];

        const found =
          rows.find(
            (r) =>
              String(r.codigo ?? r.code ?? "").toLowerCase() ===
              studentCode.toLowerCase(),
          ) ||
          rows[0] ||
          null;

        const id =
          found?.id ??
          found?.alumno_id ??
          found?.client_id ??
          found?.cliente_id ??
          null;
        const name = String(found?.nombre ?? found?.name ?? "").trim();
        setStudentInfo({
          id: id != null ? id : null,
          code: studentCode,
          name,
        });
      } catch {
        if (!alive) return;
        studentInfoFetchedRef.current = studentCode;
        setStudentInfo({ id: null, code: studentCode, name: "" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentCode]);

  function normalizeId(v: unknown) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    // algunos ids vienen como numero o string
    const n = Number(s);
    if (Number.isFinite(n) && String(n) === s) return String(n);
    return s;
  }

  function isDeletedPayload(p: any) {
    return Boolean(p?.deleted);
  }

  function pickBestMetadataForStudent(
    items: MetadataRecord<any>[],
    opts: {
      studentCode: string;
      alumnoId: string | number | null;
      entity: string;
      tag: string;
    },
  ) {
    const alumnoIdStr = normalizeId(opts.alumnoId);
    const candidateEntityIds = Array.from(
      new Set(
        [alumnoIdStr, normalizeId(opts.studentCode)].filter(
          Boolean,
        ) as string[],
      ),
    );

    const matches = items
      .filter((m) => !isDeletedPayload((m as any)?.payload))
      .filter((m) => {
        const entity = String((m as any)?.entity ?? "").trim();
        const entityId = normalizeId((m as any)?.entity_id);
        const payload = (m as any)?.payload ?? {};

        const entityMatches =
          entity === opts.entity || String(payload?._tag ?? "") === opts.tag;
        if (!entityMatches) return false;

        const idMatches = entityId && candidateEntityIds.includes(entityId);
        const payloadAlumnoId = normalizeId(payload?.alumno_id);
        const payloadAlumnoCodigo = String(payload?.alumno_codigo ?? "").trim();
        const payloadMatches =
          (alumnoIdStr && payloadAlumnoId === alumnoIdStr) ||
          (payloadAlumnoCodigo &&
            payloadAlumnoCodigo.toLowerCase() ===
              opts.studentCode.toLowerCase());

        return Boolean(idMatches || payloadMatches);
      });

    // elegir la más reciente: preferimos id numérico más alto; si no, por created_at
    const best = [...matches].sort((a, b) => {
      const aId = Number((a as any)?.id);
      const bId = Number((b as any)?.id);
      const aHasNum = Number.isFinite(aId);
      const bHasNum = Number.isFinite(bId);
      if (aHasNum && bHasNum) return bId - aId;
      if (aHasNum) return -1;
      if (bHasNum) return 1;
      const aT = Date.parse(String((a as any)?.created_at ?? "")) || 0;
      const bT = Date.parse(String((b as any)?.created_at ?? "")) || 0;
      return bT - aT;
    })[0] as MetadataRecord<any> | undefined;

    return {
      best: best ?? null,
      count: matches.length,
      allIds: matches
        .map((m) => (m as any)?.id)
        .filter((id: any) => id != null),
      allMatches: matches,
    };
  }

  async function reloadStudentMetadata(preferredId?: string | number | null) {
    const alumnoId = studentInfo?.id ?? null;
    setMetadataLoading(true);
    try {
      // Para estudiantes, siempre usar el código (no el ID numérico del cliente)
      // porque los routes validan ownership comparando con meCode de /auth/me.
      const userRole = String((user as any)?.role ?? "");
      const idForRoute =
        userRole === "student" ? studentCode : String(alumnoId ?? studentCode);
      const token = getAuthToken();
      const res = await fetch(
        `/api/alumnos/${encodeURIComponent(idForRoute)}/metadata?entity=${encodeURIComponent(
          "ads_metrics",
        )}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json().catch(() => null)) as any;
      const items = Array.isArray(json?.items) ? json.items : [];
      const { best, count, allIds, allMatches } = pickBestMetadataForStudent(
        items,
        {
          studentCode,
          alumnoId,
          entity: "ads_metrics",
          tag: "admin_alumnos_ads_metrics",
        },
      );
      // Si se proporcionó un preferredId, intentar usarlo en vez de "best".
      const preferred =
        preferredId != null
          ? (allMatches.find(
              (m) => String((m as any)?.id) === String(preferredId),
            ) ?? best)
          : best;
      setMatchedMetadata(preferred);
      setMatchedMetadataCount(count);
      setMatchedMetadataAllIds(allIds);
      setMatchedMetadataAllItems(allMatches);
      if (preferred) applyMetadataToForm(preferred);
    } catch (e) {
      console.warn("[ADS][metadata] no se pudo listar metadata:", e);
      setMatchedMetadata(null);
      setMatchedMetadataCount(0);
      setMatchedMetadataAllIds([]);
      setMatchedMetadataAllItems([]);
    } finally {
      setMetadataLoading(false);
    }
  }

  async function handleGuardarMetadata() {
    if (isReadOnly) return;
    const alumnoId = studentInfo?.id ?? null;
    const alumnoNombre =
      String(studentName || studentInfo?.name || "").trim() || studentCode;

    const creadoPorId = (user as any)?.id ?? null;
    const creadoPorCodigo =
      (user as any)?.codigo ??
      (user as any)?.code ??
      (user as any)?.user_code ??
      null;
    const creadoPorNombre =
      (user as any)?.nombre ??
      (user as any)?.name ??
      (user as any)?.email ??
      null;

    const sanitizedData: any = {
      ...data,
      requiere_interv: requiresInterventionEffective,
      subfase_color: normalizeSubphaseColor(data.subfase_color),
      auto_roas: true,
      auto_eff: true,
    };
    // Importante: al EDITAR, no queremos sobrescribir con vacío.
    // Si vienen vacíos, omitimos estas keys del payload.
    for (const k of ["fase", "subfase", "subfase_color"]) {
      const raw = sanitizedData?.[k];
      if (raw == null) continue;
      if (typeof raw === "string" && raw.trim() === "") delete sanitizedData[k];
    }

    const payload = {
      ...sanitizedData,
      alumno_id: alumnoId,
      alumno_codigo: studentCode,
      alumno_nombre: alumnoNombre,
      // Se mantiene el esquema del detalle; si ya existe, estos campos se
      // preservan desde el detalle (para no cambiar el creador original).
      creado_por_id: creadoPorId,
      creado_por_codigo: creadoPorCodigo,
      creado_por_nombre: creadoPorNombre,
      _tag: "admin_alumnos_ads_metrics",
      _view: "/admin/alumnos/[code]/ads",
      _saved_at: new Date().toISOString(),
    };

    const body = {
      entity: "ads_metrics",
      entity_id: String(alumnoId ?? studentCode),
      payload,
    };

    if (DRY_RUN_METADATA_SAVE) {
      const currentPayload = (matchedMetadata as any)?.payload ?? null;
      const changedKeys = Object.keys(payload).filter(
        (k) =>
          JSON.stringify((currentPayload as any)?.[k]) !==
          JSON.stringify((payload as any)?.[k]),
      );

      console.group(`[ADS][metadata][dry-run] ${studentCode}`);
      console.log("Alumno:", {
        alumno_id: alumnoId,
        alumno_codigo: studentCode,
        alumno_nombre: alumnoNombre,
      });
      console.log("Metadata actual:", matchedMetadata ?? null);
      console.log("Payload candidato:", payload);
      console.log("Body candidato:", body);
      console.log("Keys con cambios:", changedKeys);
      console.groupEnd();

      toast({
        title: "Simulación activa",
        description:
          "No se guardó metadata. Revisa la consola para ver el payload y cambios.",
      });
      return;
    }

    setMetadataSaving(true);
    try {
      // 1) Listar SOLO lo del alumno (proxy interno) y filtrar el mejor registro
      // Para estudiantes, usar el código para que el ownership check funcione.
      const userRole = String((user as any)?.role ?? "");
      const idForRoute =
        userRole === "student" ? studentCode : String(alumnoId ?? studentCode);
      const token = getAuthToken();
      const res = await fetch(
        `/api/alumnos/${encodeURIComponent(idForRoute)}/metadata?entity=${encodeURIComponent(
          body.entity,
        )}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const listJson = (await res.json().catch(() => null)) as any;
      const items = Array.isArray(listJson?.items) ? listJson.items : [];
      const { best, count, allIds, allMatches } = pickBestMetadataForStudent(
        items,
        {
          studentCode,
          alumnoId,
          entity: body.entity,
          tag: "admin_alumnos_ads_metrics",
        },
      );

      // Si el usuario seleccionó manualmente un registro, usarlo en lugar del "best" automático.
      const currentSelectedId =
        matchedMetadata?.id != null ? String(matchedMetadata.id) : null;
      const userSelected = currentSelectedId
        ? (allMatches.find(
            (m) => String((m as any)?.id) === currentSelectedId,
          ) ?? best)
        : best;

      if (userSelected?.id != null) {
        // Ya existe: actualizar (PUT) y luego consultar por id
        /* console.log(
          "[ADS][metadata] ya existe para este alumno, actualizando por id:",
          best.id,
        ); */

        // Preservamos creado_por_* si ya existe, para no modificar creador.
        const existingPayload = (userSelected as any)?.payload ?? {};
        const mergedPayload = {
          ...existingPayload,
          ...payload,
          creado_por_id:
            existingPayload?.creado_por_id ?? payload.creado_por_id,
          creado_por_codigo:
            existingPayload?.creado_por_codigo ?? payload.creado_por_codigo,
          creado_por_nombre:
            existingPayload?.creado_por_nombre ?? payload.creado_por_nombre,
        };

        const updateBody = {
          id: (userSelected as any)?.id,
          entity: (userSelected as any)?.entity,
          entity_id: (userSelected as any)?.entity_id,
          payload: mergedPayload,
        };

        /* console.log("[ADS][metadata] update body ->", updateBody); */

        const updateRes = await fetch(
          `/api/alumnos/${encodeURIComponent(idForRoute)}/metadata/update-ads`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(updateBody),
          },
        );
        if (!updateRes.ok) {
          const txt = await updateRes.text().catch(() => "");
          throw new Error(txt || `HTTP ${updateRes.status}`);
        }

        toast({ title: "Guardado", description: "Métricas ADS actualizadas" });
        // Re-fetch desde el servidor para reflejar datos reales
        await reloadStudentMetadata(userSelected.id);
        return;
      }

      // 2) Crear metadata SOLO para este alumno
      /* console.log("[ADS][metadata] create body ->", body); */
      const createRes = await fetch(
        `/api/alumnos/${encodeURIComponent(idForRoute)}/metadata/ensure-ads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        },
      );
      if (!createRes.ok) {
        const txt = await createRes.text().catch(() => "");
        throw new Error(txt || `HTTP ${createRes.status}`);
      }
      const createdJson = (await createRes.json().catch(() => null)) as any;
      const createdId = createdJson?.id ?? null;
      toast({ title: "Guardado", description: "Métricas ADS guardadas" });
      // Re-fetch desde el servidor para reflejar datos reales
      await reloadStudentMetadata(createdId);
    } catch (e: unknown) {
      console.error("[ADS][metadata] error guardando/consultando:", e);
      try {
        const desc = e instanceof Error ? e.message : String(e ?? "Error");
        toast({
          title: "Error",
          description: desc,
          variant: "destructive",
        });
      } catch {}
    } finally {
      setMetadataSaving(false);
    }
  }

  // Cargar metadata del alumno al montar (lista completa + filtro local)
  useEffect(() => {
    if (!studentCode) return;
    reloadStudentMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode, studentInfo?.id]);

  useEffect(() => {
    // Persistir automáticamente el coach de COPY y el de ADS dentro de la métrica
    // (así queda guardado en localStorage como antes)
    const nextCopy = coachCopyAssigned?.name || "";
    const nextAds = coachAdsAssigned?.name || "";
    setData((prev) => {
      if (
        (prev.coach_copy || "") === nextCopy &&
        (prev.coach_plat || "") === nextAds
      )
        return prev;
      return {
        ...prev,
        coach_copy: nextCopy,
        coach_plat: nextAds,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachCopyAssigned?.name, coachAdsAssigned?.name]);

  function toNumOrNull(s?: string): number | null {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function fmtPercentNoScale(n?: number | null): string {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    const v = Number(n);
    const s = v.toFixed(2);
    return `${s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
  }
  function pctOf(
    part?: string | number | null,
    total?: string | number | null,
  ): string {
    const p = toNum(part as any);
    const t = toNum(total as any);
    if (p == null || !t || t <= 0) return "—";
    return fmtPercentNoScale((p / t) * 100);
  }

  // Cargar métrica existente por estudiante
  useEffect(() => {
    if (isReadOnly) {
      setLoading(false);
      didInitRef.current = true;
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const fase5Start = await fetchFase5StartDateISO(studentCode);
        const key = `ads-metrics:${studentCode}`;
        const raw =
          !isReadOnly && typeof window !== "undefined"
            ? window.localStorage.getItem(key)
            : null;
        if (!mounted) return;

        let maybeForm: any = null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            maybeForm = parsed?.form ?? parsed;

            // Migration: if obs/interv exists but no fase_data, move them
            if (
              (maybeForm?.obs || maybeForm?.interv_sugerida) &&
              !maybeForm?.fase_data
            ) {
              const p = maybeForm?.fase || "sin-fase";
              maybeForm.fase_data = {
                [p]: {
                  obs: maybeForm.obs,
                  interv_sugerida: maybeForm.interv_sugerida,
                },
              };
            }
          } catch {
            maybeForm = null;
          }
        }

        setData((prev) => {
          const merged = {
            ...prev,
            ...(maybeForm ?? {}),
            subfase_color: normalizeSubphaseColor(maybeForm?.subfase_color),
            auto_roas: true,
            auto_eff: true,
          } as Metrics;
          // Regla: fecha_inicio debe ser la fecha de entrada a Fase 5 si existe.
          if (fase5Start) merged.fecha_inicio = fase5Start;
          return syncMonetaryFields(merged);
        });
      } catch (e) {
        console.error("ADS metrics local load error", e);
      } finally {
        if (mounted) setLoading(false);
        didInitRef.current = true;
      }
    })();
    return () => {
      mounted = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [studentCode, isReadOnly]);

  // Autosave con debounce al cambiar datos
  useEffect(() => {
    if (isReadOnly) return;
    if (!didInitRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        const key = `ads-metrics:${studentCode}`;
        const payload = {
          savedAt: new Date().toISOString(),
          form: data,
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(payload));
        }
      } catch (e) {
        console.error("ADS metrics local save error", e);
      } finally {
        setSaving(false);
      }
    }, 600);
  }, [JSON.stringify(data), studentCode, isReadOnly]);

  function persist(next: Metrics) {
    if (isReadOnly) return;
    setData(next);
  }

  function onMoneyFieldChange(
    key:
      | "inversion_moneda"
      | "facturacion_moneda"
      | "tipo_cambio_usd"
      | "moneda",
    value: string,
  ) {
    persist(syncMonetaryFields({ ...data, [key]: value } as Metrics));
  }

  // Derivados automáticos
  const roasCalc = useMemo(() => {
    const inv = toNum(data.inversion);
    const fac = toNum(data.facturacion);
    if (inv && inv > 0 && fac != null) return (fac / inv).toFixed(2);
    return undefined;
  }, [data.inversion, data.facturacion]);
  const effAdsCalc = useMemo(() => {
    const c = toNum(data.clics);
    const a = toNum(data.alcance);
    if (c != null && a && a > 0) return c / a;
    return undefined;
  }, [data.clics, data.alcance]);
  const effPagoCalc = useMemo(() => {
    const p = toNum(data.pagos);
    const v = toNum(data.visitas);
    if (p != null && v && v > 0) return p / v;
    return undefined;
  }, [data.pagos, data.visitas]);
  const effCompraCalc = useMemo(() => {
    const comp = toNum(data.compra_carnada);
    const v = toNum(data.visitas);
    if (comp != null && v && v > 0) return comp / v;
    return undefined;
  }, [data.compra_carnada, data.visitas]);

  const view = {
    roas: roasCalc ?? data.roas,
    eff_ads: effAdsCalc ?? data.eff_ads,
    eff_pago: effPagoCalc ?? data.eff_pago,
    eff_compra: effCompraCalc ?? data.eff_compra,
  } as const;

  const automaticInterventionDecision = useMemo(
    () => computeAutomaticInterventionDecision({ ...data, roas: view.roas }),
    [data, view.roas],
  );

  const requiresInterventionEffective = !!data.requiere_interv;

  const optimizationPhaseSelected = isOptimizationPhase(data.fase);

  function onChange<K extends keyof Metrics>(k: K, v: Metrics[K]) {
    const next = { ...data, [k]: v } as Metrics;
    if (k === "requiere_interv") {
      persist(next);
      return;
    }
    const nextAutomaticInterventionDecision =
      computeAutomaticInterventionDecision({ ...next, roas: view.roas });
    if (nextAutomaticInterventionDecision !== null) {
      next.requiere_interv = nextAutomaticInterventionDecision;
    }
    persist(next);
  }

  useEffect(() => {
    const currency = normalizeCurrency(data.moneda);
    if (currency === "USD") {
      if (data.tipo_cambio_usd !== "1") {
        setData((prev) =>
          syncMonetaryFields({ ...prev, tipo_cambio_usd: "1" }),
        );
      }
      return;
    }

    let active = true;
    (async () => {
      try {
        setFxLoading(true);
        const res = await fetch(
          `/api/ads-metrics/exchange-rate?currency=${encodeURIComponent(currency)}`,
          { method: "GET", cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json().catch(() => null)) as any;
        const rate = toNumFlexible(json?.rate_to_usd);
        if (!active || rate == null || rate <= 0) return;

        const fetchedAt =
          String(json?.fetched_at || "").trim() || new Date().toISOString();
        setData((prev) =>
          syncMonetaryFields({
            ...prev,
            tipo_cambio_usd: String(rate),
            fx_updated_at: fetchedAt,
          }),
        );
      } catch (e) {
        console.warn("[ADS][FX] no se pudo obtener tipo de cambio:", e);
      } finally {
        if (active) setFxLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.moneda]);

  // Nota: se removió la caja de “Notas y adjuntos” en esta vista.

  // Auto-calcular "Carga de página (%)" = visitas/clics*100
  useEffect(() => {
    const v = toNum(data.visitas);
    const c = toNum(data.clics);
    let calc = "0";
    if (c && c > 0 && v != null) {
      const pct = (v / c) * 100;
      const s = pct.toFixed(1);
      calc = /\.0$/.test(s) ? s.replace(/\.0$/, "") : s;
    }
    if ((data.carga_pagina || "0") !== calc) {
      setData((prev) => ({ ...prev, carga_pagina: calc }));
    }
  }, [data.visitas, data.clics]);

  // Debug: log inputs y resultados con etiquetas idénticas a la UI
  useEffect(() => {
    try {
      const alcanceN = toNum(data.alcance) ?? null;
      const clicsN = toNum(data.clics) ?? null;
      const visitasN = toNum(data.visitas) ?? null;
      const pagosN = toNum(data.pagos) ?? null;
      /* console.log(
        "[ADS] Embudo → Alcance:",
        alcanceN,
        "Clics:",
        clicsN,
        "Visitas:",
        visitasN,
        "Pagos iniciados:",
        pagosN,
      ); */

      const effAdsRatio = effAdsCalc != null ? Number(effAdsCalc) : null;
      const effPagoRatio = effPagoCalc != null ? Number(effPagoCalc) : null;
      const effCompraRatio =
        effCompraCalc != null ? Number(effCompraCalc) : null;
      const effAdsPct = effAdsRatio != null ? effAdsRatio * 100 : null;
      const effPagoPct = effPagoRatio != null ? effPagoRatio * 100 : null;
      const effCompraPct = effCompraRatio != null ? effCompraRatio * 100 : null;
      /* console.log(
        "[ADS] Efectividades (ratio) → Ads (clics/alcance):",
        effAdsRatio,
        "Pago iniciado (pagos/visitas):",
        effPagoRatio,
        "Compra (carnada/visitas):",
        effCompraRatio,
      ); */
      /* console.log(
        "[ADS] Efectividades (%) → Ads (clics/alcance):",
        effAdsPct != null ? `${effAdsPct.toFixed(1)}%` : null,
        "Pago iniciado (pagos/visitas):",
        effPagoPct != null ? `${effPagoPct.toFixed(1)}%` : null,
        "Compra (carnada/visitas):",
        effCompraPct != null ? `${effCompraPct.toFixed(1)}%` : null,
      ); */

      const dispEffAds = fmtRatioToPercent(view.eff_ads);
      const dispEffPago = fmtRatioToPercent(view.eff_pago);
      const dispEffCompra = fmtRatioToPercent(view.eff_compra);
      /* console.log(
        "[ADS] UI → Ads (clics/alcance):",
        `${dispEffAds}%`,
        "Pago iniciado (pagos/visitas):",
        `${dispEffPago}%`,
        "Compra (carnada/visitas):",
        `${dispEffCompra}%`,
      ); */
    } catch (e) {
      console.warn("[ADS] Log error", e);
    }
  }, [
    data.alcance,
    data.clics,
    data.visitas,
    data.pagos,
    effAdsCalc,
    effPagoCalc,
    effCompraCalc,
  ]);

  useEffect(() => {
    const currency = normalizeCurrency(data.moneda);
    const rate = currency === "USD" ? 1 : toNumFlexible(data.tipo_cambio_usd);
    const inversionLocal =
      toNumFlexible(data.inversion_moneda ?? data.inversion) ?? null;
    const facturacionLocal =
      toNumFlexible(data.facturacion_moneda ?? data.facturacion) ?? null;
    const inversionUsd = toNum(data.inversion) ?? null;
    const facturacionUsd = toNum(data.facturacion) ?? null;

    console.log("[ADS][FX] Estado conversión", {
      moneda: currency,
      tipo_cambio_usd: rate,
      inversion_moneda: inversionLocal,
      facturacion_moneda: facturacionLocal,
      inversion_usd_guardado: inversionUsd,
      facturacion_usd_guardado: facturacionUsd,
      fx_updated_at: data.fx_updated_at ?? null,
    });
  }, [
    data.moneda,
    data.tipo_cambio_usd,
    data.inversion_moneda,
    data.facturacion_moneda,
    data.inversion,
    data.facturacion,
    data.fx_updated_at,
  ]);

  // Helpers de presentación para porcentajes
  function fmtRatioToPercent(x?: string | number | null): string {
    const v = toNum(x);
    if (v == null) return "";
    return (v * 100).toFixed(1).replace(/\.0$/, "");
  }

  const userRole = String((user as any)?.role ?? "");
  const canDeleteMetadata = userRole === "admin" || userRole === "equipo";

  async function handleDeleteMetadata(metaId: string | number) {
    setMetadataDeleting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `/api/metadata/${encodeURIComponent(String(metaId))}`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      toast({
        title: "Eliminado",
        description: `Metadata #${metaId} eliminada correctamente`,
      });
      setDeleteConfirmId(null);
      setShowDuplicatesDialog(false);
      // Recargar metadata
      await reloadStudentMetadata();
    } catch (e: unknown) {
      const desc = e instanceof Error ? e.message : String(e ?? "Error");
      toast({
        title: "Error al eliminar",
        description: desc,
        variant: "destructive",
      });
    } finally {
      setMetadataDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {isReadOnly
              ? "Solo lectura"
              : loading
                ? "Cargando métricas…"
                : saving
                  ? "Guardando…"
                  : "Cambios guardados"}
          </div>
          <div className="flex items-center gap-2">
            {metadataLoading ? (
              <Badge variant="secondary">metadata…</Badge>
            ) : matchedMetadata?.id != null ? (
              <>
                <Badge variant="secondary">
                  metadata #{String(matchedMetadata.id)}
                  {matchedMetadataCount > 1
                    ? ` (+${matchedMetadataCount - 1})`
                    : ""}
                </Badge>
                {matchedMetadataCount > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Ver registros duplicados"
                    onClick={() => setShowDuplicatesDialog(true)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <path d="M12 11h4" />
                      <path d="M12 16h4" />
                      <path d="M8 11h.01" />
                      <path d="M8 16h.01" />
                    </svg>
                  </Button>
                )}
              </>
            ) : (
              <Badge variant="outline">sin metadata</Badge>
            )}
            {!isReadOnly ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleGuardarMetadata}
                disabled={loading || metadataSaving}
              >
                Guardar
              </Button>
            ) : null}
          </div>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Métricas ADS {studentName ? `— ${studentName}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <fieldset disabled={isReadOnly} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={data.fecha_inicio || ""}
                    onChange={(e) => onChange("fecha_inicio", e.target.value)}
                  />
                </div>
                {/* Comentado: Fecha asignación y Fecha fin ocultas temporalmente
              <div className="space-y-1.5">
                <Label>Fecha asignación</Label>
                <Input
                  type="date"
                  value={data.fecha_asignacion || ""}
                  onChange={(e) => onChange("fecha_asignacion", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={data.fecha_fin || ""}
                  onChange={(e) => onChange("fecha_fin", e.target.value)}
                />
              </div>
              */}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Rendimiento</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-4">
                      <AdsMetricsCallout
                        eyebrow="Importante"
                        title="Inversión y facturación"
                        description="En el campo de inversión, debes escribir el monto en la moneda de tu cuenta publicitaria. Lo mismo aplica para la facturación. Para hacer esta conversión, puedes usar Google o cualquier convertidor de moneda en línea. Ejemplo, si mi cuenta publicitaria está en peso Colombiano, la facturación también debería estar en pesos Colombianos"
                        items={MONEY_DISCLAIMER_ITEMS}
                        tone="amber"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Moneda</Label>
                      <select
                        value={normalizeCurrency(data.moneda)}
                        onChange={(e) =>
                          onMoneyFieldChange("moneda", e.target.value)
                        }
                        className="w-full h-9 rounded-md border px-3 text-sm"
                      >
                        {CURRENCY_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Tipo de cambio{" "}
                        {normalizeCurrency(data.moneda) === "USD"
                          ? "(fijo)"
                          : "(1 USD = ?)"}
                      </Label>
                      <Input
                        inputMode="decimal"
                        placeholder={
                          normalizeCurrency(data.moneda) === "USD" ? "1" : "0"
                        }
                        disabled
                        value={data.tipo_cambio_usd || ""}
                      />
                      <div className="text-[11px] text-muted-foreground">
                        {fxLoading
                          ? "Actualizando tipo de cambio…"
                          : formatRateLabel(
                              normalizeCurrency(data.moneda),
                              normalizeCurrency(data.moneda) === "USD"
                                ? 1
                                : toNumFlexible(data.tipo_cambio_usd),
                            )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Inversión ({normalizeCurrency(data.moneda)})
                      </Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.inversion_moneda ?? data.inversion ?? ""}
                        onChange={(e) =>
                          onMoneyFieldChange("inversion_moneda", e.target.value)
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Se guarda en USD: {fmtMoney(data.inversion)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Facturación ({normalizeCurrency(data.moneda)})
                      </Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={
                          data.facturacion_moneda ?? data.facturacion ?? ""
                        }
                        onChange={(e) =>
                          onMoneyFieldChange(
                            "facturacion_moneda",
                            e.target.value,
                          )
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Se guarda en USD: {fmtMoney(data.facturacion)}
                      </div>
                    </div>
                    <div className="space-y-1 md:col-span-4">
                      <Label>ROAS</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        disabled
                        value={view.roas || ""}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Embudo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AdsMetricsCallout
                      eyebrow="Cómo llenar"
                      title="Embudo"
                      description="Registra aquí las métricas acumuladas de todo el periodo en el que la pauta estuvo activa."
                      items={FUNNEL_DISCLAIMER_ITEMS}
                      tone="sky"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Alcance</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={data.alcance || ""}
                          onChange={(e) => onChange("alcance", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Clics</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={data.clics || ""}
                          onChange={(e) => onChange("clics", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Visitas</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={data.visitas || ""}
                          onChange={(e) => onChange("visitas", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Pagos iniciados</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={data.pagos || ""}
                          onChange={(e) => onChange("pagos", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Compras
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>Carnada</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={data.compra_carnada || ""}
                            onChange={(e) =>
                              onChange("compra_carnada", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Bump 1</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={data.compra_bump1 || ""}
                            onChange={(e) =>
                              onChange("compra_bump1", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Bump 2</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={data.compra_bump2 || ""}
                            onChange={(e) =>
                              onChange("compra_bump2", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>OTO 1</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={data.compra_oto1 || ""}
                            onChange={(e) =>
                              onChange("compra_oto1", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>OTO 2</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={data.compra_oto2 || ""}
                            onChange={(e) =>
                              onChange("compra_oto2", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Downsell</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={data.compra_downsell || ""}
                            onChange={(e) =>
                              onChange("compra_downsell", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Efectividades (%)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label>Carga de página (visitas/clics)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={`${data.carga_pagina || "0"}%`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ads (clics/alcance)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0.0"
                        disabled
                        value={
                          view.eff_ads != null
                            ? `${(Number(view.eff_ads) * 100).toFixed(1)}%`
                            : ""
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Pago iniciado (pagos/visitas)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={`${fmtRatioToPercent(view.eff_pago)}%`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Compra (carnada/visitas)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={`${fmtRatioToPercent(view.eff_compra)}%`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bump 1 (vs. carnada)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={pctOf(data.compra_bump1, data.compra_carnada)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bump 2 (vs. carnada)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={pctOf(data.compra_bump2, data.compra_carnada)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>OTO 1 (vs. carnada)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={pctOf(data.compra_oto1, data.compra_carnada)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>OTO 2 (vs. carnada)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={pctOf(data.compra_oto2, data.compra_carnada)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Downsell (vs. carnada)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={pctOf(data.compra_downsell, data.compra_carnada)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Estado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AdsMetricsCallout
                      eyebrow="Cómo llenar"
                      title="Estado"
                      description="Tu proceso publicitario se divide en tres grandes fases. Usa esta caja para identificar en cuál se encuentra el alumno y qué tipo de intervención corresponde."
                      items={STATUS_DISCLAIMER_ITEMS}
                      tone="sky"
                    />
                    <div className="flex items-center justify-between">
                      <Label>Pauta activa</Label>
                      <Switch
                        checked={!!data.pauta_activa}
                        onCheckedChange={(v) => onChange("pauta_activa", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>¿Requiere intervención?</Label>
                      <Switch
                        checked={requiresInterventionEffective}
                        disabled={!canEditInterventionSwitch}
                        onCheckedChange={(v) => onChange("requiere_interv", v)}
                      />
                    </div>
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">
                            Ruta de optimización
                          </Label>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            La subfase solo se habilita cuando la fase activa es
                            optimización.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {data.fase || "Sin fase definida"}
                          </Badge>
                          <Badge
                            variant={
                              optimizationPhaseSelected
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {optimizationPhaseSelected
                              ? "Subfase disponible"
                              : "Subfase bloqueada"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label>Fase</Label>
                          <Select
                            value={data.fase || "sin-fase"}
                            onValueChange={(value) =>
                              onChange(
                                "fase",
                                value === "sin-fase" ? "" : value,
                              )
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl border-border/70 bg-background/90 shadow-sm data-[placeholder]:text-muted-foreground">
                              <SelectValue placeholder="Selecciona una fase" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sin-fase">Sin fase</SelectItem>
                              {PHASE_OPTIONS.map((phase) => (
                                <SelectItem key={phase} value={phase}>
                                  {phase}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Subfase</Label>
                          <Select
                            value={data.subfase || "sin-subfase"}
                            onValueChange={(value) =>
                              onChange(
                                "subfase",
                                value === "sin-subfase" ? "" : value,
                              )
                            }
                            disabled={!optimizationPhaseSelected}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-border/70 bg-background/90 shadow-sm data-[placeholder]:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground">
                              <SelectValue
                                placeholder={
                                  optimizationPhaseSelected
                                    ? "Selecciona una subfase"
                                    : "Disponible en optimización"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sin-subfase">
                                Sin subfase
                              </SelectItem>
                              {SUBPHASE_OPTIONS.map((subphase) => (
                                <SelectItem key={subphase} value={subphase}>
                                  {subphase}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Trascendencia</Label>
                          <Select
                            value={data.subfase_color || "sin-trascendencia"}
                            onValueChange={(value) =>
                              onChange(
                                "subfase_color",
                                value === "sin-trascendencia" ? "" : value,
                              )
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl border-border/70 bg-background/90 shadow-sm data-[placeholder]:text-muted-foreground">
                              <SelectValue placeholder="Selecciona una trascendencia" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sin-trascendencia">
                                Sin trascendencia
                              </SelectItem>
                              {SUBPHASE_COLOR_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Este campo queda editable siempre. La restricción
                            aplica solo para la subfase.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {optimizationPhaseSelected ? (
                          <span>
                            {data.subfase
                              ? `Subfase activa: ${data.subfase}.`
                              : "Selecciona una subfase para clasificar el punto actual de la optimización."}{" "}
                            {data.subfase_color
                              ? `Trascendencia: ${data.subfase_color}.`
                              : "Aún no hay trascendencia definida."}
                          </span>
                        ) : (
                          <span>
                            Mientras la fase no sea optimización, subfase y
                            trascendencia quedan bloqueadas y se limpian para
                            evitar guardar datos inconsistentes.
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Coaches</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label>Coach de Copy</Label>
                      <div className="min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {coachCopyAssigned?.name || "—"}
                        </span>
                        {coachCopyAssigned?.area ? (
                          <Badge variant="secondary">
                            {String(coachCopyAssigned.area)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Coach Técnico</Label>
                      <div className="min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {coachAdsAssigned?.name || "—"}
                        </span>
                        {coachAdsAssigned?.area ? (
                          <Badge variant="secondary">
                            {String(coachAdsAssigned.area)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vista previa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground">
                Rendimiento
              </div>
              <div>
                ROAS: <b>{view.roas ?? "—"}</b>
              </div>
              <div>
                Inversión ({normalizeCurrency(data.moneda)}):{" "}
                <b>
                  {fmtMoneyByCurrency(
                    toNumFlexible(data.inversion_moneda ?? data.inversion),
                    normalizeCurrency(data.moneda),
                  )}
                </b>
              </div>
              <div>
                Inversión (USD guardado): <b>{fmtMoney(data.inversion)}</b>
              </div>
              <div>
                Facturación ({normalizeCurrency(data.moneda)}):{" "}
                <b>
                  {fmtMoneyByCurrency(
                    toNumFlexible(data.facturacion_moneda ?? data.facturacion),
                    normalizeCurrency(data.moneda),
                  )}
                </b>
              </div>
              <div>
                Facturación (USD guardado): <b>{fmtMoney(data.facturacion)}</b>
              </div>
              <div>
                Tipo de cambio:{" "}
                <b>
                  {formatRateLabel(
                    normalizeCurrency(data.moneda),
                    normalizeCurrency(data.moneda) === "USD"
                      ? 1
                      : toNumFlexible(data.tipo_cambio_usd),
                  )}
                </b>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">Embudo</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    Alcance: <b>{fmtNum(data.alcance)}</b>
                  </div>
                  <div>
                    Clics: <b>{fmtNum(data.clics)}</b>
                  </div>
                  <div>
                    Visitas: <b>{fmtNum(data.visitas)}</b>
                  </div>
                  <div>
                    Pagos: <b>{fmtNum(data.pagos)}</b>
                  </div>
                  <div className="col-span-2">
                    Carga pág: <b>{fmtPct(data.carga_pagina)}</b>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">
                  Efectividades
                </div>
                <div>
                  Ads: <b>{fmtPct(view.eff_ads)}</b>{" "}
                  <span className="text-[10px] text-muted-foreground">
                    ({view.eff_ads})
                  </span>
                </div>
                <div>
                  Pago iniciado: <b>{fmtPct(view.eff_pago)}</b>
                </div>
                <div>
                  Compra: <b>{fmtPct(view.eff_compra)}</b>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="font-medium text-muted-foreground mb-2">
                  Compras
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["Carnada", data.compra_carnada],
                      ["B1", data.compra_bump1],
                      ["B2", data.compra_bump2],
                      ["O1", data.compra_oto1],
                      ["O2", data.compra_oto2],
                      ["Dn", data.compra_downsell],
                    ] as const
                  )
                    .filter(([, v]) => toNum(v) && toNum(v)! > 0)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded bg-muted px-2 py-1 text-xs"
                      >
                        {k}: {fmtNum(v)}
                      </span>
                    ))}
                  {!toNum(data.compra_carnada) &&
                    !toNum(data.compra_bump1) &&
                    !toNum(data.compra_bump2) &&
                    !toNum(data.compra_oto1) &&
                    !toNum(data.compra_oto2) &&
                    !toNum(data.compra_downsell) && (
                      <span className="text-sm text-muted-foreground">
                        Sin registros
                      </span>
                    )}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground mb-2">
                  Estado y fase
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                      data.pauta_activa ? "border-border" : "border-border"
                    }`}
                  >
                    {data.pauta_activa ? "Pauta activa" : "Pauta inactiva"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      requiresInterventionEffective
                        ? "bg-rose-900/20 text-rose-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {requiresInterventionEffective
                      ? "Requiere intervención"
                      : "Sin intervención"}
                  </span>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-border">
                    {data.fase || "—"}
                  </span>
                  {data.subfase ? (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-background">
                      {data.subfase}
                    </span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground mb-2">
                  Coaches
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <div>
                    Copy: <b>{data.coach_copy || "—"}</b>
                  </div>
                  <div>
                    Técnico: <b>{data.coach_plat || "—"}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground">
              {isReadOnly
                ? "Datos cargados desde metadata del alumno."
                : DRY_RUN_METADATA_SAVE
                  ? "Guardado local automáticamente. Botón “Guardar” en modo simulación: no persiste metadata y muestra payload/cambios en consola."
                  : "Guardado local automáticamente. “Guardar” crea la metadata del alumno si no existe; si ya existe, la actualiza (PUT /metadata/:id) y luego la vuelve a consultar por id."}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de registros duplicados */}
      <AlertDialog
        open={showDuplicatesDialog && deleteConfirmId == null}
        onOpenChange={setShowDuplicatesDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Registros de metadata ADS ({matchedMetadataCount})
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se encontraron {matchedMetadataCount} registros de métricas ADS
              para este alumno. Selecciona uno para cargar su información en el
              formulario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {matchedMetadataAllItems
              .sort(
                (a, b) =>
                  Number((b as any)?.id ?? 0) - Number((a as any)?.id ?? 0),
              )
              .map((item) => {
                const id = (item as any)?.id;
                const isBest = String(id) === String(matchedMetadata?.id);
                const savedAt = (item as any)?.payload?._saved_at;
                const createdAt = (item as any)?.created_at;
                const displayDate = savedAt || createdAt || "";
                const formattedDate = displayDate
                  ? new Date(displayDate).toLocaleString("es", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Sin fecha";
                const entityId = String((item as any)?.entity_id ?? "");
                return (
                  <div
                    key={String(id)}
                    className={`flex items-center justify-between rounded-md border p-2 text-sm cursor-pointer transition-colors hover:bg-muted/50 ${
                      isBest ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      setMatchedMetadata(item);
                      applyMetadataToForm(item);
                      setShowDuplicatesDialog(false);
                      toast({
                        title: "Registro cargado",
                        description: `Metadata #${id} cargada en el formulario`,
                      });
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">#{String(id)}</span>
                      {isBest && (
                        <Badge
                          variant="default"
                          className="ml-2 text-[10px] px-1.5 py-0"
                        >
                          activo
                        </Badge>
                      )}
                      <div className="text-xs text-muted-foreground truncate">
                        {formattedDate} · entity_id: {entityId}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant={isBest ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMatchedMetadata(item);
                          applyMetadataToForm(item);
                          setShowDuplicatesDialog(false);
                          toast({
                            title: "Registro cargado",
                            description: `Metadata #${id} cargada en el formulario`,
                          });
                        }}
                      >
                        {isBest ? "Seleccionado" : "Seleccionar"}
                      </Button>
                      {canDeleteMetadata && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={metadataDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(id);
                          }}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación de borrado */}
      <AlertDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar metadata #{String(deleteConfirmId)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará únicamente el registro #
              {String(deleteConfirmId)} de forma permanente.
              {String(deleteConfirmId) === String(matchedMetadata?.id) && (
                <>
                  {" "}
                  Este es el registro activo. Al eliminarlo se usará el
                  siguiente disponible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={metadataDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={metadataDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId != null)
                  handleDeleteMetadata(deleteConfirmId);
              }}
            >
              {metadataDeleting ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
