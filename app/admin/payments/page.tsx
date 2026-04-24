"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getPaymentByCodigo,
  getPayments,
  getPaymentCuotas,
  syncPaymentCliente,
  upsertPaymentDetalle,
  createPaymentDetalle,
  deletePaymentDetalle,
  updatePayment,
  PAYMENT_STATUS_OPTIONS,
  type PaymentRow,
  type PaymentCuotaRow,
  type CreateDetallePayload,
  type UpdatePaymentPayload,
} from "./api";
import { getAllStudentsPaged, type StudentRow } from "../alumnos/api";
import { getOptionBadgeClass } from "../alumnos/[code]/_parts/detail-utils";
import { fetchUsers, type SysUser } from "../users/api";
import { toast } from "@/components/ui/use-toast";
import {
  CreditCard,
  Download,
  Plus,
  Pencil,
  Trash2,
  Save,
  Check,
  X,
  Loader2,
  Users,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Eye,
} from "lucide-react";
import * as XLSX from "xlsx";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

function formatMoney(
  amount: number | null | undefined,
  currency?: string | null,
) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return "—";
  const curr = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${amount} ${curr}`;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function csvEscape(value: unknown) {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function buildCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map((h) => csvEscape(h)).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

function triggerDownload(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getMonthValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getMonthRange(month: string) {
  const m = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  const year = Number(m.slice(0, 4));
  const monthIndex = Number(m.slice(5, 7)) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  const fechaDesde = `${m}-01`;
  const fechaHasta = `${m}-${String(end.getUTCDate()).padStart(2, "0")}`;
  return { fechaDesde, fechaHasta, start, end };
}

function makeDateRangeKey(fechaDesde: string, fechaHasta: string) {
  return `${String(fechaDesde || "").trim()}|${String(fechaHasta || "").trim()}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a: Date, b: Date) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

const MORA_GRACE_DAYS = 5;

const HIDDEN_PAYMENT_CODES = new Set([
  "L4SzLGXEXLa7in1C",
  "Rqcc9iY9aSpNG_bz",
  "o1AMJ3P-5-kynF83",
]);

function isHiddenPaymentCode(code: string | null | undefined) {
  const normalized = String(code || "").trim();
  return normalized ? HIDDEN_PAYMENT_CODES.has(normalized) : false;
}

function isClosedOrPaidStatus(raw: unknown) {
  const s = normalizePaymentStatus(raw);
  if (!s) return false;
  return (
    s.includes("pagad") ||
    s.includes("listo") ||
    s.includes("reembol") ||
    s.includes("no_aplica") ||
    s.includes("fallid")
  );
}

function isPendingLikeStatus(raw: unknown) {
  const s = normalizePaymentStatus(raw);
  if (!s) return true;
  return (
    s.includes("pendien") ||
    s.includes("en_proceso") ||
    s.includes("en_progreso")
  );
}

function getEffectiveCuotaStatus(
  status: unknown,
  fechaPago: string | null | undefined,
  now: Date = new Date(),
) {
  const normalized = normalizePaymentStatus(status);

  if (normalized.includes("moro") || normalized.includes("venc")) {
    return "moroso";
  }

  if (isClosedOrPaidStatus(normalized)) {
    return (
      normalized ||
      String(status ?? "")
        .trim()
        .toLowerCase()
    );
  }

  if (!fechaPago || !isPendingLikeStatus(normalized)) {
    return (
      normalized ||
      String(status ?? "")
        .trim()
        .toLowerCase()
    );
  }

  const due = new Date(fechaPago);
  if (Number.isNaN(due.getTime())) {
    return (
      normalized ||
      String(status ?? "")
        .trim()
        .toLowerCase()
    );
  }

  const overdueDays = diffDays(now, due);
  if (overdueDays > MORA_GRACE_DAYS) {
    return "moroso";
  }

  return (
    normalized ||
    String(status ?? "")
      .trim()
      .toLowerCase()
  );
}

function fixMojibake(value: string | null | undefined) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Heurística: típico mojibake UTF-8 interpretado como Latin-1 (Ã¡, Ã©, etc.)
  if (!/[ÃÂ�]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, (ch) => ch.charCodeAt(0));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const badBefore = (s.match(/[ÃÂ�]/g) || []).length;
    const badAfter = (decoded.match(/[ÃÂ�]/g) || []).length;
    if (decoded && decoded !== s && badAfter < badBefore) {
      // Si el backend ya entregó caracteres de reemplazo (�), no siempre es
      // reversible; aplicamos un fallback de correcciones comunes más abajo.
      if (!decoded.includes("�")) return decoded;
      return fixReplacementCharNames(decoded);
    }
  } catch {
    // noop
  }

  if (s.includes("�")) return fixReplacementCharNames(s);
  return s;
}

function fixReplacementCharNames(input: string) {
  // Cuando aparece "�" (U+FFFD), el byte original se perdió. Esto aplica un
  // set pequeño de arreglos comunes en nombres ES para mejorar la lectura.
  if (!input.includes("�")) return input;

  const rules: Array<[RegExp, string]> = [
    [/Encarnaci�n/gi, "Encarnación"],
    [/Mart�n\b/gi, "Martín"],
    [/Mart�nez\b/gi, "Martínez"],
    [/D�az\b/gi, "Díaz"],
    [/S�nchez\b/gi, "Sánchez"],
    [/Ram�rez\b/gi, "Ramírez"],
    [/Rodr�guez\b/gi, "Rodríguez"],
    [/Garc�a\b/gi, "García"],
    [/Hern�ndez\b/gi, "Hernández"],
    [/L�pez\b/gi, "López"],
    [/G�mez\b/gi, "Gómez"],
    [/Mu�oz\b/gi, "Muñoz"],
    [/Pe�a\b/gi, "Peña"],
    [/Nu�ez\b/gi, "Núñez"],
    [/Iba�ez\b/gi, "Ibáñez"],
  ];

  let out = input;
  for (const [re, rep] of rules) out = out.replace(re, rep);
  return out;
}

function getStatusVariant(
  status?: string | null,
): "default" | "secondary" | "muted" | "outline" | "destructive" {
  const s = String(status || "").toLowerCase();
  if (!s) return "muted";
  // Colores tipo "semáforo" como en otras vistas
  if (s.includes("moro") || s.includes("venc")) return "destructive";
  if (
    s.includes("en_proceso") ||
    s.includes("en proceso") ||
    s.includes("progres") ||
    s.includes("pendien")
  )
    return "secondary";
  if (s.includes("listo") || s.includes("pagad") || s.includes("aprob"))
    return "default";
  if (s.includes("reembol") || s.includes("devuel") || s.includes("anul"))
    return "muted";
  if (s.includes("no_aplico") || s.includes("no aplico")) return "outline";
  return "outline";
}

const ALLOWED_PAYMENT_STATUS = [
  "pendiente",
  "pagado",
  "fallido",
  "reembolsado",
  "en_proceso",
  "listo",
  "moroso",
  "no_aplica",
  "pendiente_por_cobrar",
  "pendiente_confirmar_pago",
] as const;

const CUOTA_ALLOWED_STATUS = ALLOWED_PAYMENT_STATUS.filter(
  (status) => status !== "listo",
);

const allowedPaymentStatusSet = new Set<string>(ALLOWED_PAYMENT_STATUS);

function normalizePaymentStatus(input: unknown): string {
  const raw = String(input ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "";

  // Acepta valores con espacios y los convierte al formato esperado por backend
  const normalized = raw
    .replace(/\s+/g, "_")
    .replace(/__+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  // Alias comunes
  if (normalized === "en_progreso") return "en_proceso";
  if (normalized === "pendiente_por_cobrar") return "pendiente_por_cobrar";
  if (normalized === "pendiente_confirmar_pago")
    return "pendiente_confirmar_pago";
  if (normalized === "no_aplico") return "no_aplica";
  if (normalized === "no_aplica") return "no_aplica";

  return normalized;
}

function formatPaymentStatusLabel(input: unknown): string {
  const s = normalizePaymentStatus(input);
  if (!s) return "—";
  // Reemplaza _ por espacio y capitaliza cada palabra
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeCuotaEditableStatus(input: unknown): string {
  const normalized = normalizePaymentStatus(input);
  if (normalized === "listo" || normalized === "pagada") return "pagado";
  return normalized;
}

function toIsoDateOrUndefined(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

type StudentLifecycleFilter =
  | "todos"
  | "activo"
  | "en_progreso"
  | "pausa"
  | "inactivo_pago"
  | "inactivo"
  | "sin_estado"
  | "otro";

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
}

function classifyStudentLifecycleStatus(
  value: string | null | undefined,
): Exclude<StudentLifecycleFilter, "todos"> {
  const normalized = normalizeText(value);
  if (!normalized) return "sin_estado";
  if (normalized.includes("INACTIVO POR PAGO")) return "inactivo_pago";
  if (normalized.includes("PAUSA") || normalized.includes("PAUSADO")) {
    return "pausa";
  }
  if (normalized.includes("PROGRESO")) return "en_progreso";
  if (normalized.includes("INACTIVO")) return "inactivo";
  if (normalized.includes("ACTIVO") || normalized.includes("EN CURSO")) {
    return "activo";
  }
  return "otro";
}

function getStudentLifecycleLabel(filter: StudentLifecycleFilter) {
  if (filter === "activo") return "Activo";
  if (filter === "en_progreso") return "En progreso";
  if (filter === "pausa") return "Pausa";
  if (filter === "inactivo_pago") return "Inactivo por pago";
  if (filter === "inactivo") return "Inactivo";
  if (filter === "sin_estado") return "Sin estado";
  if (filter === "otro") return "Otro";
  return "Todos";
}

function getStudentLifecycleStateLabel(value: string | null | undefined) {
  const kind = classifyStudentLifecycleStatus(value);
  if (kind === "otro") {
    const raw = String(value || "").trim();
    return raw || "Sin estado";
  }
  return getStudentLifecycleLabel(kind);
}

function getStudentLifecycleBadgeClass(filter: StudentLifecycleFilter) {
  if (filter === "activo") {
    return "border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60";
  }
  if (filter === "en_progreso") {
    return "border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/35 dark:text-violet-200 dark:border-violet-900/60";
  }
  if (filter === "pausa" || filter === "inactivo_pago") {
    return "border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/60";
  }
  if (filter === "inactivo") {
    return "border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/35 dark:text-rose-200 dark:border-rose-900/60";
  }
  return "border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-900/60";
}

function matchesStudentLifecycleFilter(
  filter: StudentLifecycleFilter,
  stateValue: string | null | undefined,
) {
  if (filter === "todos") return true;
  return classifyStudentLifecycleStatus(stateValue) === filter;
}

function getStatusChipClass(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (!s)
    return "border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-900/60";

  // Pasteles (similar a tickets-board)
  if (s.includes("moro") || s.includes("venc"))
    return "border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/35 dark:text-red-200 dark:border-red-900/60";

  if (s.includes("reembol") || s.includes("devuel") || s.includes("anul"))
    return "border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/35 dark:text-purple-200 dark:border-purple-900/60";

  if (
    s.includes("en_proceso") ||
    s.includes("en proceso") ||
    s.includes("progres") ||
    s.includes("pendien")
  )
    return "border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/60";

  if (s.includes("listo") || s.includes("pagad") || s.includes("aprob"))
    return "border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60";

  if (s.includes("no_aplico") || s.includes("no aplico"))
    return "border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/35 dark:text-sky-200 dark:border-sky-900/60";

  return "border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-900/60";
}

type PaymentMetrics = {
  totalPayments: number;
  withReserva: number;
  withoutReserva: number;
  refunds: number;
  totalCuotas: number;
  avgCuotas: number;
};

function computePaymentMetrics(rows: PaymentRow[]): PaymentMetrics {
  const totalPayments = Array.isArray(rows) ? rows.length : 0;
  let withReserva = 0;
  let withoutReserva = 0;
  let refunds = 0;
  let totalCuotas = 0;
  let countCuotas = 0;

  for (const r of rows) {
    const reserva = r?.monto_reserva;
    const reservaNum =
      reserva === null || reserva === undefined ? null : Number(reserva);
    const hasReserva =
      reservaNum !== null && !Number.isNaN(reservaNum) && reservaNum > 0;
    if (hasReserva) withReserva += 1;
    else withoutReserva += 1;

    const est = String(r?.estatus ?? "").toLowerCase();
    if (est.includes("reembol")) refunds += 1;

    const cuotas = r?.nro_cuotas;
    const cuotasNum =
      cuotas === null || cuotas === undefined ? null : Number(cuotas);
    if (cuotasNum !== null && !Number.isNaN(cuotasNum) && cuotasNum > 0) {
      totalCuotas += cuotasNum;
      countCuotas += 1;
    }
  }

  const avgCuotas = countCuotas ? totalCuotas / countCuotas : 0;
  return {
    totalPayments,
    withReserva,
    withoutReserva,
    refunds,
    totalCuotas,
    avgCuotas,
  };
}

function PaymentsContent() {
  const { user } = useAuth();
  const userRole = String((user as any)?.role ?? "").toLowerCase();
  const isStudent = userRole === "student";
  const ownStudentCode = useMemo(() => {
    const raw = (user as any)?.codigo ?? (user as any)?.id ?? "";
    return String(raw || "").trim();
  }, [user]);
  const canManagePayments = !isStudent;

  const [activeTab, setActiveTab] = useState<
    "pagos" | "cuotas" | "sin-plan" | "alumnos"
  >("pagos");

  // -------- Alumnos sin plan de pago --------
  const [sinPlanLoading, setSinPlanLoading] = useState(false);
  const [sinPlanError, setSinPlanError] = useState<string | null>(null);
  const [sinPlanStudents, setSinPlanStudents] = useState<StudentRow[]>([]);
  const [sinPlanLoadedAt, setSinPlanLoadedAt] = useState<number | null>(null);
  const [sinPlanProgress, setSinPlanProgress] = useState<{
    stage: "payments" | "students" | "done" | null;
    fetched: number;
    total: number | null;
  }>({ stage: null, fetched: 0, total: null });
  const [sinPlanSearch, setSinPlanSearch] = useState<string>("");
  const [sinPlanStats, setSinPlanStats] = useState<{
    totalStudents: number;
    withPlan: number;
    withoutPlan: number;
  }>({ totalStudents: 0, withPlan: 0, withoutPlan: 0 });
  const sinPlanReqIdRef = useRef(0);

  // -------- Estado de alumnos (morosos / status) --------
  const [alumnosLoading, setAlumnosLoading] = useState(false);
  const [alumnosError, setAlumnosError] = useState<string | null>(null);
  const [alumnosLoadedAt, setAlumnosLoadedAt] = useState<number | null>(null);
  const [alumnosProgress, setAlumnosProgress] = useState<{
    stage: "students" | "payments" | "cuotas" | "done" | null;
    fetched: number;
    total: number | null;
  }>({ stage: null, fetched: 0, total: null });
  const [alumnosStudents, setAlumnosStudents] = useState<StudentRow[]>([]);
  const [alumnosPaymentsByCode, setAlumnosPaymentsByCode] = useState<
    Record<string, PaymentRow[]>
  >({});
  const [alumnosCuotasByCode, setAlumnosCuotasByCode] = useState<
    Record<string, PaymentCuotaRow[]>
  >({});
  const [alumnosSearch, setAlumnosSearch] = useState<string>("");
  const [alumnosOverdueOnly, setAlumnosOverdueOnly] = useState<boolean>(false);
  const [alumnosLifecycleFilter, setAlumnosLifecycleFilter] =
    useState<StudentLifecycleFilter>("todos");
  const alumnosReqIdRef = useRef(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [search, setSearch] = useState<string>("");
  const [clienteCodigo, setClienteCodigo] = useState<string>("");
  const [estatus, setEstatus] = useState<string>("");
  const [metodo, setMetodo] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [montoMin, setMontoMin] = useState<string>("");
  const [montoMax, setMontoMax] = useState<string>("");
  // Reserva no está en los query params indicados; lo filtramos localmente.
  const [reservaMin, setReservaMin] = useState<string>("");
  const [reservaMax, setReservaMax] = useState<string>("");
  const [reservaFilter, setReservaFilter] = useState<
    "todos" | "con_reserva" | "sin_reserva"
  >("todos");

  const [pageChanging, setPageChanging] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedClienteCodigo = useDebouncedValue(clienteCodigo, 350);
  const debouncedMetodo = useDebouncedValue(metodo, 350);
  const debouncedMontoMin = useDebouncedValue(montoMin, 350);
  const debouncedMontoMax = useDebouncedValue(montoMax, 350);
  const debouncedReservaMin = useDebouncedValue(reservaMin, 250);
  const debouncedReservaMax = useDebouncedValue(reservaMax, 250);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCodigo, setDetailCodigo] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  const [detailEditStatusByKey, setDetailEditStatusByKey] = useState<
    Record<string, string>
  >({});
  const [detailEditConceptByKey, setDetailEditConceptByKey] = useState<
    Record<string, string>
  >({});
  const [detailEditNotesByKey, setDetailEditNotesByKey] = useState<
    Record<string, string>
  >({});
  const [detailSavingByKey, setDetailSavingByKey] = useState<
    Record<string, boolean>
  >({});

  const detailEditStatusByKeyRef = useRef<Record<string, string>>({});
  const detailEditConceptByKeyRef = useRef<Record<string, string>>({});
  const detailEditNotesByKeyRef = useRef<Record<string, string>>({});
  const detailSaveTimersRef = useRef<Record<string, number>>({});

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncPayment, setSyncPayment] = useState<PaymentRow | null>(null);
  const [syncUserSearch, setSyncUserSearch] = useState("");
  const debouncedSyncUserSearch = useDebouncedValue(syncUserSearch, 300);
  const [syncUsers, setSyncUsers] = useState<SysUser[]>([]);
  const [syncUsersLoading, setSyncUsersLoading] = useState(false);
  const [syncUsersError, setSyncUsersError] = useState<string | null>(null);
  const [syncUsersPage, setSyncUsersPage] = useState(1);
  const [syncUsersTotalPages, setSyncUsersTotalPages] = useState(1);

  const [syncSelectedUser, setSyncSelectedUser] = useState<SysUser | null>(
    null,
  );
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncSaveError, setSyncSaveError] = useState<string | null>(null);

  const [onlyUnlinked, setOnlyUnlinked] = useState(false);

  // Cuotas por vencer (endpoint paginado por rango)
  const CUOTAS_PAGE_SIZE = 50;
  const [cuotasFechaDesde, setCuotasFechaDesde] = useState<string>(() => {
    const currentMonth = getMonthRange(getMonthValue(new Date()));
    return currentMonth?.fechaDesde ?? "";
  });
  const [cuotasFechaHasta, setCuotasFechaHasta] = useState<string>(() => {
    const currentMonth = getMonthRange(getMonthValue(new Date()));
    return currentMonth?.fechaHasta ?? "";
  });
  const [cuotasLoadedRangeKey, setCuotasLoadedRangeKey] = useState<
    string | null
  >(null);
  const [cuotasRows, setCuotasRows] = useState<PaymentCuotaRow[]>([]);
  const [cuotasStatusFilter, setCuotasStatusFilter] = useState<string>("todos");
  const [paymentsStudentFilter, setPaymentsStudentFilter] =
    useState<StudentLifecycleFilter>("todos");
  const [cuotasStudentFilter, setCuotasStudentFilter] =
    useState<StudentLifecycleFilter>("todos");
  const [cuotasPage, setCuotasPage] = useState<number>(1);
  const [cuotasTotalPages, setCuotasTotalPages] = useState<number>(1);
  const [cuotasTotal, setCuotasTotal] = useState<number>(0);
  const [cuotasLoading, setCuotasLoading] = useState(false);
  const [cuotasError, setCuotasError] = useState<string | null>(null);
  const cuotasReqIdRef = useRef(0);
  const [studentStateByCode, setStudentStateByCode] = useState<
    Record<string, string>
  >({});
  const [studentStatesLoading, setStudentStatesLoading] = useState(false);
  const studentStatesReqIdRef = useRef(0);

  function exportPayments(format: "csv" | "xlsx") {
    if (!filtered.length) {
      toast({
        title: "Sin datos",
        description: "No hay pagos para exportar con el filtro actual.",
      });
      return;
    }

    const data = filtered.map((r) => ({
      codigo: r.codigo,
      cliente_codigo: r.cliente_codigo || "",
      cliente_nombre: fixMojibake(r.cliente_nombre || ""),
      monto: r.monto ?? "",
      monto_reserva: r.monto_reserva ?? "",
      moneda: r.moneda || "",
      estatus: formatPaymentStatusLabel(r.estatus),
      metodo: r.metodo || "",
      modalidad: r.modalidad || "",
      referencia: r.referencia || "",
      concepto: fixMojibake(r.concepto || ""),
      notas: fixMojibake(r.notas || ""),
      fecha_pago: formatDateOnly(r.fecha_pago),
      creado: formatDateTime(r.created_at),
      actualizado: formatDateTime(r.updated_at),
    }));

    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    if (format === "csv") {
      const csv = buildCsv(data);
      triggerDownload(
        `pagos-filtrados-${stamp}.csv`,
        csv,
        "text/csv;charset=utf-8;",
      );
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pagos");
      XLSX.writeFile(wb, `pagos-filtrados-${stamp}.xlsx`);
    }

    toast({
      title: "Exportación lista",
      description: `Se exportaron ${data.length} pagos filtrados.`,
    });
  }

  function exportCuotas(format: "csv" | "xlsx") {
    if (!filteredCuotasRows.length) {
      toast({
        title: "Sin datos",
        description: "No hay cuotas para exportar con el filtro actual.",
      });
      return;
    }

    const now = new Date();
    const data = filteredCuotasRows.map((r) => {
      const effectiveStatus = getEffectiveCuotaStatus(
        r?.estatus,
        r?.fecha_pago,
        now,
      );
      const cuotaDate = r.fecha_pago ? new Date(r.fecha_pago) : null;
      const dias =
        cuotaDate && !Number.isNaN(cuotaDate.getTime())
          ? diffDays(cuotaDate, now)
          : "";

      return {
        payment_codigo: r.payment_codigo || "",
        cuota_codigo: r.cuota_codigo || r.codigo || "",
        cliente_codigo: r.cliente_codigo || "",
        cliente_nombre: fixMojibake(r.cliente_nombre || ""),
        monto: r.monto ?? "",
        moneda: r.moneda || "",
        fecha_pago: formatDateOnly(r.fecha_pago),
        dias: dias,
        estatus: formatPaymentStatusLabel(effectiveStatus),
        metodo: r.metodo || "",
        referencia: r.referencia || "",
        concepto: fixMojibake(r.concepto || ""),
        notas: fixMojibake(r.notas || ""),
        creado: formatDateTime(r.created_at),
        actualizado: formatDateTime(r.updated_at),
      };
    });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    if (format === "csv") {
      const csv = buildCsv(data);
      triggerDownload(
        `cuotas-filtradas-${stamp}.csv`,
        csv,
        "text/csv;charset=utf-8;",
      );
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cuotas");
      XLSX.writeFile(wb, `cuotas-filtradas-${stamp}.xlsx`);
    }

    toast({
      title: "Exportación lista",
      description: `Se exportaron ${data.length} cuotas filtradas.`,
    });
  }

  const filteredSinPlanStudents = useMemo(() => {
    const q = sinPlanSearch.trim().toLowerCase();
    if (!q) return sinPlanStudents;
    return sinPlanStudents.filter((s) => {
      const name = String(s?.name ?? "").toLowerCase();
      const code = String(s?.code ?? "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [sinPlanSearch, sinPlanStudents]);

  type AlumnoRow = {
    student: StudentRow;
    code: string;
    hasPlan: boolean;
    paymentsCount: number;
    cuotasCount: number;
    cuotasPendientes: number;
    cuotasMorosas: number;
    maxDiasAtraso: number;
    totalDeudaByCurrency: Record<string, number>;
    lifecycleKind: Exclude<StudentLifecycleFilter, "todos">;
  };

  const alumnosRows = useMemo<AlumnoRow[]>(() => {
    if (!alumnosStudents.length) return [];
    const now = new Date();
    return alumnosStudents.map((student) => {
      const rawCode = String(student?.code ?? "").trim();
      const key = rawCode.toLowerCase();
      const payments = key ? (alumnosPaymentsByCode[key] ?? []) : [];
      const cuotas = key ? (alumnosCuotasByCode[key] ?? []) : [];

      let cuotasPendientes = 0;
      let cuotasMorosas = 0;
      let maxDiasAtraso = 0;
      const totalDeudaByCurrency: Record<string, number> = {};

      for (const c of cuotas) {
        const effective = getEffectiveCuotaStatus(c.estatus, c.fecha_pago, now);
        const isClosed = isClosedOrPaidStatus(effective);
        if (isClosed) continue;
        cuotasPendientes += 1;

        const due = c.fecha_pago ? new Date(c.fecha_pago) : null;
        const overdueDays =
          due && !Number.isNaN(due.getTime()) ? diffDays(now, due) : 0;

        const isMoroso =
          effective.includes("moro") ||
          effective.includes("venc") ||
          overdueDays > MORA_GRACE_DAYS;

        if (isMoroso) {
          cuotasMorosas += 1;
          if (overdueDays > maxDiasAtraso) maxDiasAtraso = overdueDays;
          const monto = Number(c.monto ?? 0);
          if (Number.isFinite(monto) && monto > 0) {
            const curr = String(c.moneda || "USD").toUpperCase();
            totalDeudaByCurrency[curr] =
              (totalDeudaByCurrency[curr] ?? 0) + monto;
          }
        }
      }

      return {
        student,
        code: rawCode,
        hasPlan: payments.length > 0,
        paymentsCount: payments.length,
        cuotasCount: cuotas.length,
        cuotasPendientes,
        cuotasMorosas,
        maxDiasAtraso,
        totalDeudaByCurrency,
        lifecycleKind: classifyStudentLifecycleStatus(student?.state),
      };
    });
  }, [alumnosStudents, alumnosPaymentsByCode, alumnosCuotasByCode]);

  const filteredAlumnosRows = useMemo<AlumnoRow[]>(() => {
    const q = alumnosSearch.trim().toLowerCase();
    return alumnosRows.filter((row) => {
      if (alumnosOverdueOnly && row.cuotasMorosas === 0) return false;
      if (
        alumnosLifecycleFilter !== "todos" &&
        row.lifecycleKind !== alumnosLifecycleFilter
      ) {
        return false;
      }
      if (q) {
        const name = String(row.student?.name ?? "").toLowerCase();
        const code = row.code.toLowerCase();
        if (!name.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [alumnosRows, alumnosSearch, alumnosOverdueOnly, alumnosLifecycleFilter]);

  const alumnosStats = useMemo(() => {
    let totalAlumnos = 0;
    let morososAlumnos = 0;
    let cuotasMorosasTotales = 0;
    let sinPlanTotal = 0;
    const deudaByCurrency: Record<string, number> = {};
    for (const row of alumnosRows) {
      totalAlumnos += 1;
      if (!row.hasPlan) sinPlanTotal += 1;
      if (row.cuotasMorosas > 0) {
        morososAlumnos += 1;
        cuotasMorosasTotales += row.cuotasMorosas;
        for (const [curr, val] of Object.entries(row.totalDeudaByCurrency)) {
          deudaByCurrency[curr] = (deudaByCurrency[curr] ?? 0) + val;
        }
      }
    }
    return {
      totalAlumnos,
      morososAlumnos,
      cuotasMorosasTotales,
      sinPlanTotal,
      deudaByCurrency,
    };
  }, [alumnosRows]);

  function exportAlumnos() {
    if (!filteredAlumnosRows.length) {
      toast({
        title: "Sin datos",
        description: "No hay filas para exportar con los filtros actuales.",
      });
      return;
    }
    const data = filteredAlumnosRows.map((row) => ({
      alumno: fixMojibake(row.student?.name || ""),
      codigo: row.code,
      estado_alumno: row.student?.state || "",
      etapa: row.student?.stage || "",
      estado_lifecycle: getStudentLifecycleLabel(row.lifecycleKind),
      tiene_plan: row.hasPlan ? "sí" : "no",
      pagos: row.paymentsCount,
      cuotas_totales: row.cuotasCount,
      cuotas_pendientes: row.cuotasPendientes,
      cuotas_morosas: row.cuotasMorosas,
      max_dias_atraso: row.maxDiasAtraso,
      deuda: Object.entries(row.totalDeudaByCurrency)
        .map(([c, v]) => `${v.toFixed(2)} ${c}`)
        .join(" / "),
    }));
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estado alumnos");
    XLSX.writeFile(wb, `estado-alumnos-${stamp}.xlsx`);
    toast({
      title: "Exportación lista",
      description: `Se exportaron ${data.length} alumnos.`,
    });
  }

  function exportSinPlan(format: "csv" | "xlsx") {
    if (!filteredSinPlanStudents.length) {
      toast({
        title: "Sin datos",
        description:
          "No hay alumnos sin plan para exportar con el filtro actual.",
      });
      return;
    }

    const data = filteredSinPlanStudents.map((student) => ({
      alumno: fixMojibake(student?.name || ""),
      codigo: String(student?.code ?? "").trim(),
      estado: student?.state || "",
      etapa: student?.stage || "",
    }));

    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    if (format === "csv") {
      const csv = buildCsv(data);
      triggerDownload(
        `alumnos-sin-plan-${stamp}.csv`,
        csv,
        "text/csv;charset=utf-8;",
      );
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sin plan");
      XLSX.writeFile(wb, `alumnos-sin-plan-${stamp}.xlsx`);
    }

    toast({
      title: "Exportación lista",
      description: `Se exportaron ${data.length} alumnos sin plan.`,
    });
  }

  const cuotasStatusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of cuotasRows) {
      const effective = getEffectiveCuotaStatus(r?.estatus, r?.fecha_pago);
      if (effective) set.add(effective);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuotasRows]);

  const filteredCuotasRows = useMemo(() => {
    return cuotasRows.filter((r) => {
      const studentCode = String(r?.cliente_codigo ?? "")
        .trim()
        .toLowerCase();
      const studentState = studentCode ? studentStateByCode[studentCode] : "";
      if (!matchesStudentLifecycleFilter(cuotasStudentFilter, studentState)) {
        return false;
      }
      if (cuotasStatusFilter === "todos") return true;
      const effective = getEffectiveCuotaStatus(r?.estatus, r?.fecha_pago);
      return effective === cuotasStatusFilter;
    });
  }, [cuotasRows, cuotasStatusFilter, cuotasStudentFilter, studentStateByCode]);

  async function loadStudentStates() {
    const reqId = ++studentStatesReqIdRef.current;
    setStudentStatesLoading(true);

    try {
      const first = await getAllStudentsPaged({ page: 1, pageSize: 1000 });
      if (studentStatesReqIdRef.current !== reqId) return;

      const map: Record<string, string> = {};
      for (const item of first.items || []) {
        const key = String(item?.code ?? "")
          .trim()
          .toLowerCase();
        if (!key) continue;
        map[key] = String(item?.state ?? "").trim();
      }

      const totalPagesFromApi = Number(first?.totalPages ?? 1) || 1;
      for (
        let currentPage = 2;
        currentPage <= totalPagesFromApi;
        currentPage++
      ) {
        const next = await getAllStudentsPaged({
          page: currentPage,
          pageSize: 1000,
        });
        if (studentStatesReqIdRef.current !== reqId) return;
        for (const item of next.items || []) {
          const key = String(item?.code ?? "")
            .trim()
            .toLowerCase();
          if (!key) continue;
          map[key] = String(item?.state ?? "").trim();
        }
      }

      setStudentStateByCode(map);
    } catch {
      if (studentStatesReqIdRef.current !== reqId) return;
      setStudentStateByCode({});
    } finally {
      if (studentStatesReqIdRef.current === reqId) {
        setStudentStatesLoading(false);
      }
    }
  }

  async function loadSinPlan() {
    const reqId = ++sinPlanReqIdRef.current;
    setSinPlanLoading(true);
    setSinPlanError(null);
    setSinPlanProgress({ stage: "payments", fetched: 0, total: null });

    try {
      // 1) Recorrer todos los pagos para obtener el set de cliente_codigo con plan.
      const codesWithPlan = new Set<string>();
      const PAYMENTS_PAGE_SIZE = 200;
      let currentPage = 1;
      let totalPages = 1;

      do {
        const envelope = await getPayments({
          page: currentPage,
          pageSize: PAYMENTS_PAGE_SIZE,
        });
        if (sinPlanReqIdRef.current !== reqId) return;

        const data = Array.isArray(envelope?.data) ? envelope.data : [];
        for (const row of data) {
          const code = String(row?.cliente_codigo ?? "").trim();
          if (code) codesWithPlan.add(code.toLowerCase());
        }

        totalPages = Math.max(1, Number(envelope?.totalPages ?? 1) || 1);
        setSinPlanProgress({
          stage: "payments",
          fetched: currentPage,
          total: totalPages,
        });
        currentPage += 1;
      } while (currentPage <= totalPages);

      if (sinPlanReqIdRef.current !== reqId) return;

      // 2) Traer todos los alumnos.
      setSinPlanProgress({ stage: "students", fetched: 0, total: null });
      const studentsRes = await getAllStudentsPaged({
        page: 1,
        pageSize: 1000,
      });
      if (sinPlanReqIdRef.current !== reqId) return;

      const allStudents = Array.isArray(studentsRes?.items)
        ? studentsRes.items
        : [];

      // 3) Filtrar los que no tengan plan.
      const without = allStudents.filter((s) => {
        const code = String(s?.code ?? "")
          .trim()
          .toLowerCase();
        if (!code) return true; // sin código, considerar sin plan
        return !codesWithPlan.has(code);
      });

      setSinPlanStudents(without);
      setSinPlanStats({
        totalStudents: allStudents.length,
        withPlan: allStudents.length - without.length,
        withoutPlan: without.length,
      });
      setSinPlanLoadedAt(Date.now());
      setSinPlanProgress({
        stage: "done",
        fetched: allStudents.length,
        total: allStudents.length,
      });
    } catch (e: any) {
      if (sinPlanReqIdRef.current !== reqId) return;
      setSinPlanError(
        e?.message || "No se pudieron cargar los alumnos sin plan",
      );
    } finally {
      if (sinPlanReqIdRef.current === reqId) setSinPlanLoading(false);
    }
  }

  async function loadAlumnos() {
    const reqId = ++alumnosReqIdRef.current;
    setAlumnosLoading(true);
    setAlumnosError(null);
    setAlumnosProgress({ stage: "students", fetched: 0, total: null });

    try {
      // 1) Traer todos los alumnos.
      const studentsRes = await getAllStudentsPaged({
        page: 1,
        pageSize: 2000,
      });
      if (alumnosReqIdRef.current !== reqId) return;
      const allStudents = Array.isArray(studentsRes?.items)
        ? studentsRes.items
        : [];

      setAlumnosProgress({
        stage: "students",
        fetched: allStudents.length,
        total: allStudents.length,
      });

      // 2) Traer TODOS los pagos.
      const paymentsByCode: Record<string, PaymentRow[]> = {};
      const PAYMENTS_PAGE_SIZE = 200;
      let pPage = 1;
      let pTotalPages = 1;
      setAlumnosProgress({ stage: "payments", fetched: 0, total: null });
      do {
        const env = await getPayments({
          page: pPage,
          pageSize: PAYMENTS_PAGE_SIZE,
        });
        if (alumnosReqIdRef.current !== reqId) return;
        const data = Array.isArray(env?.data) ? env.data : [];
        for (const row of data) {
          const code = String(row?.cliente_codigo ?? "")
            .trim()
            .toLowerCase();
          if (!code) continue;
          if (!paymentsByCode[code]) paymentsByCode[code] = [];
          paymentsByCode[code].push(row);
        }
        pTotalPages = Math.max(1, Number(env?.totalPages ?? 1) || 1);
        setAlumnosProgress({
          stage: "payments",
          fetched: pPage,
          total: pTotalPages,
        });
        pPage += 1;
      } while (pPage <= pTotalPages);

      // 3) Traer cuotas en rango amplio (último año y próximo año).
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 365);
      const end = new Date(now);
      end.setDate(end.getDate() + 365);
      const toIso = (d: Date) => d.toISOString().slice(0, 10);
      const fechaDesde = toIso(start);
      const fechaHasta = toIso(end);

      const cuotasByCode: Record<string, PaymentCuotaRow[]> = {};
      const CUOTAS_PS = 200;
      let cPage = 1;
      let cTotalPages = 1;
      setAlumnosProgress({ stage: "cuotas", fetched: 0, total: null });
      do {
        const env = await getPaymentCuotas({
          fechaDesde,
          fechaHasta,
          page: cPage,
          pageSize: CUOTAS_PS,
          background: true,
        });
        if (alumnosReqIdRef.current !== reqId) return;
        const data = Array.isArray(env?.data) ? env.data : [];
        for (const row of data) {
          const code = String(row?.cliente_codigo ?? "")
            .trim()
            .toLowerCase();
          if (!code) continue;
          if (!cuotasByCode[code]) cuotasByCode[code] = [];
          cuotasByCode[code].push(row);
        }
        cTotalPages = Math.max(1, Number(env?.totalPages ?? 1) || 1);
        setAlumnosProgress({
          stage: "cuotas",
          fetched: cPage,
          total: cTotalPages,
        });
        cPage += 1;
      } while (cPage <= cTotalPages);

      setAlumnosStudents(allStudents);
      setAlumnosPaymentsByCode(paymentsByCode);
      setAlumnosCuotasByCode(cuotasByCode);
      setAlumnosLoadedAt(Date.now());
      setAlumnosProgress({
        stage: "done",
        fetched: allStudents.length,
        total: allStudents.length,
      });
    } catch (e: any) {
      if (alumnosReqIdRef.current !== reqId) return;
      setAlumnosError(e?.message || "No se pudo cargar el estado de alumnos");
    } finally {
      if (alumnosReqIdRef.current === reqId) setAlumnosLoading(false);
    }
  }

  async function loadCuotas(opts: { page: number; append?: boolean }) {
    const fechaDesde = String(cuotasFechaDesde || "").trim();
    const fechaHasta = String(cuotasFechaHasta || "").trim();

    if (!fechaDesde || !fechaHasta) {
      setCuotasError("Selecciona un rango de fechas válido");
      return;
    }

    if (fechaDesde > fechaHasta) {
      setCuotasError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }

    const reqId = ++cuotasReqIdRef.current;
    setCuotasLoading(true);
    setCuotasError(null);
    try {
      const json = await getPaymentCuotas({
        fechaDesde,
        fechaHasta,
        page: opts.page,
        pageSize: CUOTAS_PAGE_SIZE,
      });

      if (cuotasReqIdRef.current !== reqId) return;

      const raw = Array.isArray(json?.data) ? json.data : [];
      const visible = raw.filter(
        (r) => !isHiddenPaymentCode(r?.payment_codigo),
      );
      // “Cuotas por vencer”: por defecto ocultamos PAGADA.
      const filtered = visible.filter((r) => {
        const s = String(r?.estatus ?? "").toLowerCase();
        if (!s) return true;
        return !s.includes("pagad");
      });

      setCuotasRows((prev) =>
        opts.append ? [...prev, ...filtered] : filtered,
      );
      setCuotasPage(Number(json?.page ?? opts.page) || opts.page);
      setCuotasTotalPages(Number(json?.totalPages ?? 1) || 1);
      setCuotasTotal(filtered.length);
      setCuotasLoadedRangeKey(makeDateRangeKey(fechaDesde, fechaHasta));
    } catch (e: any) {
      if (cuotasReqIdRef.current !== reqId) return;
      setCuotasError(e?.message || "No se pudieron cargar las cuotas");
    } finally {
      if (cuotasReqIdRef.current === reqId) setCuotasLoading(false);
    }
  }

  const isPaymentSynced = (r: PaymentRow) => {
    const name = String(r?.cliente_nombre ?? "").trim();
    const code = String(r?.cliente_codigo ?? "").trim();
    // Regla: para considerar sincronizado, deben venir completos:
    // - cliente_nombre (no vacío)
    // - cliente_codigo que parezca un ID/código real (no un nombre)
    const looksLikeId = /[A-Za-z0-9_-]{6,}/.test(code);
    return !!name && !!code && looksLikeId;
  };

  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const metricsReqIdRef = useRef(0);

  // Estado para modal de crear/editar cuota
  const [cuotaModalOpen, setCuotaModalOpen] = useState(false);
  const [cuotaEditing, setCuotaEditing] = useState<any | null>(null); // null = crear nueva
  const [cuotaSaving, setCuotaSaving] = useState(false);
  const [cuotaForm, setCuotaForm] = useState({
    cuota_codigo: "",
    monto: "",
    moneda: "USD",
    estatus: "pendiente",
    fecha_pago: "",
    metodo: "",
    referencia: "",
    concepto: "",
    notas: "",
  });

  // Estado para edición inline del pago principal
  const [paymentEditingField, setPaymentEditingField] = useState<string | null>(
    null,
  );
  const [paymentEditValue, setPaymentEditValue] = useState<string>("");
  const [paymentFieldSaving, setPaymentFieldSaving] = useState(false);

  function startEditingPaymentField(field: string, currentValue: any) {
    setPaymentEditingField(field);
    setPaymentEditValue(currentValue != null ? String(currentValue) : "");
  }

  function cancelEditingPaymentField() {
    setPaymentEditingField(null);
    setPaymentEditValue("");
  }

  async function savePaymentField(field: string) {
    if (!canManagePayments) return;
    if (!detailCodigo) return;
    setPaymentFieldSaving(true);
    try {
      const payload: UpdatePaymentPayload = {};

      if (field === "monto") {
        const v = parseFloat(paymentEditValue);
        if (!isNaN(v)) payload.monto = v;
      } else if (field === "monto_reserva") {
        const v = parseFloat(paymentEditValue);
        if (!isNaN(v)) payload.monto_reserva = v;
      } else if (field === "nro_cuotas") {
        const v = parseInt(paymentEditValue);
        if (!isNaN(v)) payload.nro_cuotas = v;
      } else if (field === "estatus") {
        payload.estatus = paymentEditValue;
      } else if (field === "moneda") {
        payload.moneda = paymentEditValue;
      } else if (field === "metodo") {
        payload.metodo = paymentEditValue;
      } else if (field === "modalidad") {
        payload.modalidad = paymentEditValue;
      } else if (field === "referencia") {
        payload.referencia = paymentEditValue;
      } else if (field === "concepto") {
        payload.concepto = paymentEditValue;
      } else if (field === "notas") {
        payload.notas = paymentEditValue;
      }

      await updatePayment(detailCodigo, payload);

      toast({
        title: "Campo actualizado",
        description: "El dato se ha guardado correctamente",
      });

      // Refrescar detalle
      const json = await getPaymentByCodigo(detailCodigo);
      setDetail(json?.data ?? null);
      setPaymentEditingField(null);
      setPaymentEditValue("");

      // Refrescar lista principal
      loadList();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: e?.message || "No se pudo actualizar el campo",
      });
    } finally {
      setPaymentFieldSaving(false);
    }
  }

  // Verifica si todas las cuotas están pagadas y actualiza el estatus del pago automáticamente
  async function checkAndUpdatePaymentStatus(paymentCodigo: string) {
    if (!canManagePayments) return;
    try {
      // Obtener el pago actualizado
      const freshPayment = await getPaymentByCodigo(paymentCodigo);
      const paymentData = freshPayment?.data;
      if (!paymentData) return;

      const cuotas = Array.isArray(paymentData.detalles)
        ? paymentData.detalles
        : [];

      // Si no hay cuotas, no hacer nada
      if (cuotas.length === 0) return;

      // Verificar si todas las cuotas están pagadas
      const allPaid = cuotas.every((c: any) => {
        const status = String(c.estatus ?? "")
          .toLowerCase()
          .trim();
        return status === "pagado" || status === "pagada" || status === "listo";
      });

      // Verificar estatus actual del pago
      const currentStatus = String(paymentData.estatus ?? "")
        .toLowerCase()
        .trim();
      const isCurrentlyListo =
        currentStatus === "listo" || currentStatus === "pagado";

      let newStatus: string | null = null;

      if (allPaid && !isCurrentlyListo) {
        // Todas pagadas pero el pago no está en "listo" → cambiar a "listo"
        newStatus = "listo";
      } else if (!allPaid && isCurrentlyListo) {
        // No todas pagadas pero el pago está en "listo" → cambiar a "en_proceso"
        newStatus = "en_proceso";
      }

      if (newStatus) {
        await updatePayment(paymentCodigo, { estatus: newStatus });

        toast({
          title:
            newStatus === "listo" ? "¡Pago completado!" : "Pago en proceso",
          description:
            newStatus === "listo"
              ? "Todas las cuotas han sido pagadas"
              : "Hay cuotas pendientes de pago",
        });
      }
    } catch (e) {
      console.error("Error al verificar estatus del pago:", e);
    }
  }

  function openCuotaModal(cuota?: any) {
    if (!canManagePayments) return;
    if (cuota) {
      // Editar existente
      setCuotaEditing(cuota);
      setCuotaForm({
        cuota_codigo: cuota.cuota_codigo || "",
        monto: cuota.monto != null ? String(cuota.monto) : "",
        moneda: cuota.moneda || detail?.moneda || "USD",
        estatus: normalizeCuotaEditableStatus(cuota.estatus) || "pendiente",
        fecha_pago: cuota.fecha_pago ? cuota.fecha_pago.slice(0, 16) : "",
        metodo: cuota.metodo || "",
        referencia: cuota.referencia || "",
        concepto: cuota.concepto || "",
        notas: cuota.notas || "",
      });
    } else {
      // Crear nueva
      setCuotaEditing(null);
      const existingCuotas = Array.isArray(detail?.detalles)
        ? detail.detalles.length
        : 0;
      setCuotaForm({
        cuota_codigo: `CUOTA_${String(existingCuotas + 1).padStart(3, "0")}`,
        monto: "",
        moneda: detail?.moneda || "USD",
        estatus: "pendiente",
        fecha_pago: "",
        metodo: "",
        referencia: "",
        concepto: "",
        notas: "",
      });
    }
    setCuotaModalOpen(true);
  }

  async function saveCuota() {
    if (!canManagePayments) return;
    const paymentCodigo = String(detail?.codigo ?? detailCodigo ?? "").trim();
    if (!paymentCodigo) {
      toast({
        title: "Error",
        description: "No se encontró el código de pago",
        variant: "destructive",
      });
      return;
    }

    const monto = parseFloat(cuotaForm.monto);
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: "Monto inválido",
        description: "Ingresa un monto válido mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (!cuotaForm.cuota_codigo.trim()) {
      toast({
        title: "Código de cuota requerido",
        description: "Ingresa un código para la cuota",
        variant: "destructive",
      });
      return;
    }

    setCuotaSaving(true);
    try {
      if (cuotaEditing) {
        const fechaPagoIso = toIsoDateOrUndefined(cuotaForm.fecha_pago);
        // Actualizar existente
        const payload = {
          codigo: cuotaEditing.codigo ?? null,
          cuota_codigo: cuotaForm.cuota_codigo.trim(),
          monto: monto,
          moneda: cuotaForm.moneda || "USD",
          estatus:
            normalizeCuotaEditableStatus(cuotaForm.estatus) || "pendiente",
          // El backend valida strings; evitar null (manda "" como en otras pantallas)
          metodo: cuotaForm.metodo.trim() || "",
          referencia: cuotaForm.referencia.trim() || "",
          concepto: cuotaForm.concepto.trim() || "",
          notas: cuotaForm.notas.trim() || "",
        };
        if (fechaPagoIso) payload.fecha_pago = fechaPagoIso;

        await upsertPaymentDetalle(
          paymentCodigo,
          String(cuotaEditing.codigo ?? ""),
          payload,
        );

        toast({
          title: "Cuota actualizada",
          description: `Se actualizó la cuota ${cuotaForm.cuota_codigo}`,
        });
      } else {
        const fechaPagoIso = toIsoDateOrUndefined(cuotaForm.fecha_pago);
        // Crear nueva
        const payload: CreateDetallePayload = {
          cuota_codigo: cuotaForm.cuota_codigo.trim(),
          monto: monto,
          moneda: cuotaForm.moneda || "USD",
          estatus:
            normalizeCuotaEditableStatus(cuotaForm.estatus) || "pendiente",
          metodo: cuotaForm.metodo.trim() || "",
          referencia: cuotaForm.referencia.trim() || "",
          concepto: cuotaForm.concepto.trim() || "",
          notas: cuotaForm.notas.trim() || "",
        };
        if (fechaPagoIso) payload.fecha_pago = fechaPagoIso;

        await createPaymentDetalle(paymentCodigo, payload);

        toast({
          title: "Cuota creada",
          description: `Se creó la cuota ${cuotaForm.cuota_codigo}`,
        });
      }

      // Refrescar detalle desde backend
      try {
        const fresh = await getPaymentByCodigo(paymentCodigo);
        setDetail(fresh?.data ?? null);
      } catch {}

      // Verificar si todas las cuotas están pagadas para actualizar estatus del pago
      await checkAndUpdatePaymentStatus(paymentCodigo);

      // Refrescar detalle nuevamente después de posible cambio de estatus
      try {
        const fresh = await getPaymentByCodigo(paymentCodigo);
        setDetail(fresh?.data ?? null);
        // Limpiar estados de edición para que reflejen los nuevos valores
        setDetailEditStatusByKey({});
        setDetailEditConceptByKey({});
        setDetailEditNotesByKey({});
      } catch {}

      // Refrescar lista principal
      loadList();

      setCuotaModalOpen(false);
      setCuotaEditing(null);
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e?.message || "No se pudo guardar la cuota",
        variant: "destructive",
      });
    } finally {
      setCuotaSaving(false);
    }
  }

  // Estado para modal de confirmación de eliminar cuota
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cuotaToDelete, setCuotaToDelete] = useState<any | null>(null);
  const [cuotaDeleting, setCuotaDeleting] = useState(false);

  function openDeleteConfirm(cuota: any) {
    setCuotaToDelete(cuota);
    setDeleteConfirmOpen(true);
  }

  async function deleteCuota() {
    if (!canManagePayments) return;
    if (!cuotaToDelete) return;

    const paymentCodigo = String(detail?.codigo ?? detailCodigo ?? "").trim();
    const detalleCodigo = String(cuotaToDelete.codigo ?? "").trim();

    if (!paymentCodigo || !detalleCodigo) {
      toast({
        title: "Error",
        description: "No se encontró el código de pago o detalle",
        variant: "destructive",
      });
      return;
    }

    setCuotaDeleting(true);
    try {
      await deletePaymentDetalle(paymentCodigo, detalleCodigo);

      toast({
        title: "Cuota eliminada",
        description: `Se eliminó la cuota ${cuotaToDelete.cuota_codigo || detalleCodigo}`,
      });

      // Verificar si todas las cuotas están pagadas para actualizar estatus del pago
      await checkAndUpdatePaymentStatus(paymentCodigo);

      // Refrescar detalle desde backend
      try {
        const fresh = await getPaymentByCodigo(paymentCodigo);
        setDetail(fresh?.data ?? null);
        // Limpiar estados de edición para que reflejen los nuevos valores
        setDetailEditStatusByKey({});
        setDetailEditConceptByKey({});
        setDetailEditNotesByKey({});
      } catch {}

      // Refrescar lista principal
      loadList();

      setDeleteConfirmOpen(false);
      setCuotaToDelete(null);
    } catch (e: any) {
      toast({
        title: "Error al eliminar",
        description: e?.message || "No se pudo eliminar la cuota",
        variant: "destructive",
      });
    } finally {
      setCuotaDeleting(false);
    }
  }

  async function loadList(next?: { page?: number; pageSize?: number }) {
    setIsLoading(true);
    setError(null);
    try {
      // Cargar TODOS los registros de una vez (hasta 10000)
      const json = await getPayments({
        page: 1,
        pageSize: 10000,
        cliente_codigo: isStudent ? ownStudentCode || undefined : undefined,
        // No enviamos filtros al backend porque no los soporta
        // El filtrado se hace localmente
      });
      const visibleRows = Array.isArray(json?.data)
        ? json.data.filter((r) => !isHiddenPaymentCode(r?.codigo))
        : [];
      setRows(visibleRows);
      setTotal(visibleRows.length);
      // La paginación ahora es solo visual (frontend)
      const ps = next?.pageSize ?? pageSize;
      setPage(1);
      setPageSize(ps);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar pagos");
      setRows([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMetrics() {
    const reqId = ++metricsReqIdRef.current;
    setMetricsLoading(true);
    setMetricsError(null);

    try {
      const metricsPageSize = 200;
      const common = {
        search: debouncedSearch.trim() || undefined,
        cliente_codigo: isStudent
          ? ownStudentCode || undefined
          : debouncedClienteCodigo.trim() || undefined,
        estatus: estatus || undefined,
        metodo: debouncedMetodo.trim() || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        montoMin: debouncedMontoMin.trim()
          ? Number(debouncedMontoMin)
          : undefined,
        montoMax: debouncedMontoMax.trim()
          ? Number(debouncedMontoMax)
          : undefined,
      } as const;

      const first = await getPayments({
        page: 1,
        pageSize: metricsPageSize,
        ...common,
      });
      if (metricsReqIdRef.current !== reqId) return;

      const totalPagesFromApi = Number(first?.totalPages ?? 1);
      const all: PaymentRow[] = Array.isArray(first?.data)
        ? first.data.filter((r) => !isHiddenPaymentCode(r?.codigo))
        : [];

      for (let p = 2; p <= totalPagesFromApi; p++) {
        const next = await getPayments({
          page: p,
          pageSize: metricsPageSize,
          ...common,
        });
        if (metricsReqIdRef.current !== reqId) return;
        if (Array.isArray(next?.data) && next.data.length) {
          all.push(...next.data.filter((r) => !isHiddenPaymentCode(r?.codigo)));
        }
      }

      const min = debouncedReservaMin.trim()
        ? Number(debouncedReservaMin)
        : null;
      const max = debouncedReservaMax.trim()
        ? Number(debouncedReservaMax)
        : null;
      const allWithReservaFilter = all.filter((r) => {
        if (min === null && max === null) return true;
        const amount = r.monto_reserva ?? null;
        if (amount === null || Number.isNaN(Number(amount))) return false;
        if (min !== null && Number(amount) < min) return false;
        if (max !== null && Number(amount) > max) return false;
        return true;
      });

      setMetrics(computePaymentMetrics(allWithReservaFilter));
    } catch (e: any) {
      setMetrics(null);
      setMetricsError(e?.message || "No se pudieron calcular las métricas");
    } finally {
      if (metricsReqIdRef.current === reqId) setMetricsLoading(false);
    }
  }

  async function openDetail(codigo: string) {
    const safe = String(codigo || "").trim();
    if (!safe) return;
    setDetailCodigo(safe);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    // Limpiar todos los estados de edición de cuotas
    setDetailEditStatusByKey({});
    setDetailEditConceptByKey({});
    setDetailEditNotesByKey({});
    setDetailSavingByKey({});
    try {
      const json = await getPaymentByCodigo(safe);
      setDetail(json?.data ?? null);
    } catch (e: any) {
      setDetailError(e?.message || "No se pudo cargar el detalle");
    } finally {
      setDetailLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const base = Array.isArray(rows) ? rows.slice() : [];
    const ownCodeNorm = String(ownStudentCode || "")
      .trim()
      .toLowerCase();
    const onlyMine = isStudent
      ? base.filter((r) => {
          const cc = String(r?.cliente_codigo ?? "")
            .trim()
            .toLowerCase();
          return !!ownCodeNorm && cc === ownCodeNorm;
        })
      : base;

    // 1. Filtro por búsqueda de texto
    const searchTerm = debouncedSearch.trim().toLowerCase();
    const withSearch = searchTerm
      ? onlyMine.filter((r) => {
          const codigo = String(r?.codigo ?? "").toLowerCase();
          const clienteCodigo = String(r?.cliente_codigo ?? "").toLowerCase();
          const clienteNombre = fixMojibake(
            r?.cliente_nombre ?? "",
          ).toLowerCase();
          const estatus = String(r?.estatus ?? "").toLowerCase();
          const metodo = String(r?.metodo ?? "").toLowerCase();
          const moneda = String(r?.moneda ?? "").toLowerCase();
          const notas = fixMojibake(r?.notas ?? "").toLowerCase();
          const concepto = fixMojibake(r?.concepto ?? "").toLowerCase();

          return (
            codigo.includes(searchTerm) ||
            clienteCodigo.includes(searchTerm) ||
            clienteNombre.includes(searchTerm) ||
            estatus.includes(searchTerm) ||
            metodo.includes(searchTerm) ||
            moneda.includes(searchTerm) ||
            notas.includes(searchTerm) ||
            concepto.includes(searchTerm)
          );
        })
      : onlyMine;

    // 2. Filtro por cliente_codigo
    const clienteCodigoTerm = debouncedClienteCodigo.trim().toLowerCase();
    const withClienteCodigo = clienteCodigoTerm
      ? withSearch.filter((r) => {
          const cc = String(r?.cliente_codigo ?? "").toLowerCase();
          return cc.includes(clienteCodigoTerm);
        })
      : withSearch;

    // 3. Filtro por estatus
    const withEstatus = estatus
      ? withClienteCodigo.filter((r) => {
          const est = String(r?.estatus ?? "").toLowerCase();
          return est === estatus.toLowerCase();
        })
      : withClienteCodigo;

    // 4. Filtro por método
    const metodoTerm = debouncedMetodo.trim().toLowerCase();
    const withMetodo = metodoTerm
      ? withEstatus.filter((r) => {
          const met = String(r?.metodo ?? "").toLowerCase();
          return met.includes(metodoTerm);
        })
      : withEstatus;

    // 5. Filtro por fechas
    const withFechas = withMetodo.filter((r) => {
      if (!fechaDesde && !fechaHasta) return true;
      const fecha = r?.created_at || r?.fecha_pago;
      if (!fecha) return false;
      const d = new Date(fecha);
      if (Number.isNaN(d.getTime())) return false;
      if (fechaDesde) {
        const desde = new Date(fechaDesde);
        if (d < desde) return false;
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (d > hasta) return false;
      }
      return true;
    });

    // 6. Filtro por monto
    const minMonto = debouncedMontoMin.trim()
      ? Number(debouncedMontoMin)
      : null;
    const maxMonto = debouncedMontoMax.trim()
      ? Number(debouncedMontoMax)
      : null;
    const withMonto = withFechas.filter((r) => {
      if (minMonto === null && maxMonto === null) return true;
      const monto = r?.monto ?? null;
      if (monto === null || Number.isNaN(Number(monto))) return false;
      if (minMonto !== null && Number(monto) < minMonto) return false;
      if (maxMonto !== null && Number(monto) > maxMonto) return false;
      return true;
    });

    // 7. Filtro por reserva
    const minReserva = debouncedReservaMin.trim()
      ? Number(debouncedReservaMin)
      : null;
    const maxReserva = debouncedReservaMax.trim()
      ? Number(debouncedReservaMax)
      : null;
    const withReserva = withMonto.filter((r) => {
      if (minReserva === null && maxReserva === null) return true;
      const amount = r.monto_reserva ?? null;
      if (amount === null || Number.isNaN(Number(amount))) return false;
      if (minReserva !== null && Number(amount) < minReserva) return false;
      if (maxReserva !== null && Number(amount) > maxReserva) return false;
      return true;
    });

    const withReservaType = withReserva.filter((r) => {
      if (reservaFilter === "todos") return true;
      const reserva = r?.monto_reserva;
      const reservaNum =
        reserva === null || reserva === undefined ? null : Number(reserva);
      const hasReserva =
        reservaNum !== null && !Number.isNaN(reservaNum) && reservaNum > 0;
      return reservaFilter === "con_reserva" ? hasReserva : !hasReserva;
    });

    const withStudentState = withReservaType.filter((r) => {
      const studentCode = String(r?.cliente_codigo ?? "")
        .trim()
        .toLowerCase();
      const studentState = studentCode ? studentStateByCode[studentCode] : "";
      return matchesStudentLifecycleFilter(paymentsStudentFilter, studentState);
    });

    // 8. Ordenar por fecha de creación (más recientes primero)
    withStudentState.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    // 9. Filtro por sincronización
    const withLinkFilter = onlyUnlinked
      ? withStudentState.filter((r) => !isPaymentSynced(r))
      : withStudentState;

    return withLinkFilter;
  }, [
    rows,
    isStudent,
    ownStudentCode,
    debouncedSearch,
    debouncedClienteCodigo,
    estatus,
    debouncedMetodo,
    fechaDesde,
    fechaHasta,
    debouncedMontoMin,
    debouncedMontoMax,
    debouncedReservaMin,
    debouncedReservaMax,
    reservaFilter,
    paymentsStudentFilter,
    studentStateByCode,
    onlyUnlinked,
  ]);

  // Paginación local sobre datos filtrados
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, page, pageSize]);

  // Total de páginas basado en datos filtrados
  const calculatedTotalPages = useMemo(() => {
    return Math.ceil(filtered.length / pageSize) || 1;
  }, [filtered.length, pageSize]);

  // Actualizar totalPages cuando cambie
  useEffect(() => {
    setTotalPages(calculatedTotalPages);
  }, [calculatedTotalPages]);

  const unlinkedCount = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    let c = 0;
    for (const r of list) {
      if (!isPaymentSynced(r)) c += 1;
    }
    return c;
  }, [rows]);

  async function loadUsersList(next?: { page?: number }) {
    setSyncUsersLoading(true);
    setSyncUsersError(null);
    try {
      const p = next?.page ?? syncUsersPage;
      const res = await fetchUsers({
        page: p,
        pageSize: 25,
        search: debouncedSyncUserSearch.trim(),
      });
      const raw = Array.isArray(res?.data) ? res.data : [];
      const onlyClientes = raw.filter((u) => {
        const role = String(u?.role ?? "").toLowerCase();
        const tipo = String((u as any)?.tipo ?? "").toLowerCase();
        // Mostrar usuarios clientes/alumnos (excluir admin/equipo por defecto)
        if (tipo === "cliente") return true;
        if (role === "alumno" || role === "student") return true;
        if (role === "cliente" || role === "customer") return true;
        return false;
      });
      setSyncUsers(onlyClientes);
      setSyncUsersPage(Number(res?.page ?? p) || p);
      setSyncUsersTotalPages(Number(res?.totalPages ?? 1) || 1);
    } catch (e: any) {
      setSyncUsersError(e?.message || "No se pudieron cargar usuarios");
      setSyncUsers([]);
      setSyncUsersTotalPages(1);
    } finally {
      setSyncUsersLoading(false);
    }
  }

  function openSync(payment: PaymentRow) {
    if (!canManagePayments) return;
    if (isPaymentSynced(payment)) {
      toast({
        title: "Ya está sincronizado",
        description: `El pago ${payment.codigo} ya tiene usuario asociado.`,
      });
      return;
    }
    setSyncPayment(payment);
    setSyncSelectedUser(null);
    setSyncSaveError(null);
    setSyncUsersPage(1);
    setSyncOpen(true);
  }

  async function doSync() {
    if (!canManagePayments) return;
    if (!syncPayment || !syncSelectedUser) return;
    if (isPaymentSynced(syncPayment)) {
      toast({
        title: "Ya está sincronizado",
        description: `El pago ${syncPayment.codigo} ya tiene usuario asociado.`,
      });
      setSyncConfirmOpen(false);
      setSyncOpen(false);
      setSyncPayment(null);
      setSyncSelectedUser(null);
      return;
    }
    setSyncSaving(true);
    setSyncSaveError(null);
    try {
      const clienteCodigo = String(syncSelectedUser.codigo || "").trim();
      if (!clienteCodigo)
        throw new Error("El usuario seleccionado no tiene código");

      await syncPaymentCliente(syncPayment.codigo, clienteCodigo);

      // Optimistic update: reflejar en tabla inmediatamente
      setRows((prev) =>
        prev.map((r) => {
          if (r.codigo !== syncPayment.codigo) return r;
          return {
            ...r,
            cliente_codigo: clienteCodigo,
            cliente_nombre: fixMojibake(
              syncSelectedUser.name || syncSelectedUser.email || clienteCodigo,
            ),
          };
        }),
      );

      setSyncConfirmOpen(false);
      setSyncOpen(false);
      setSyncPayment(null);
      setSyncSelectedUser(null);

      toast({
        title: "Sincronización exitosa",
        description: `Pago ${syncPayment.codigo} → ${clienteCodigo}`,
      });
    } catch (e: any) {
      setSyncSaveError(e?.message || "No se pudo sincronizar");
      toast({
        title: "Error al sincronizar",
        description: e?.message || "No se pudo sincronizar",
        variant: "destructive",
      });
    } finally {
      setSyncSaving(false);
    }
  }

  const statusOptions = useMemo(() => {
    const set = new Set<string>();

    // Estatus permitidos (siempre presentes)
    ALLOWED_PAYMENT_STATUS.forEach((s) => set.add(s));

    for (const r of rows) {
      const v = normalizePaymentStatus(r?.estatus);
      if (v) set.add(v);
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    const est = normalizePaymentStatus(estatus);
    if (est && !arr.includes(est)) arr.unshift(est);
    return arr;
  }, [rows, estatus]);

  useEffect(() => {
    detailEditStatusByKeyRef.current = detailEditStatusByKey;
  }, [detailEditStatusByKey]);

  useEffect(() => {
    detailEditConceptByKeyRef.current = detailEditConceptByKey;
  }, [detailEditConceptByKey]);

  useEffect(() => {
    detailEditNotesByKeyRef.current = detailEditNotesByKey;
  }, [detailEditNotesByKey]);

  function getDetailRowKey(d: any) {
    // Incluir el código del pago padre para evitar colisiones entre pagos diferentes
    const parentCode = String(detail?.codigo ?? detailCodigo ?? "");
    const k = d?.codigo ?? d?.cuota_codigo ?? d?.id;
    return `${parentCode}_${String(k ?? "")}`;
  }

  async function saveDetalle(d: any) {
    if (!canManagePayments) return;
    const key = getDetailRowKey(d);
    if (!key) return;

    const paymentCodigo =
      String(detail?.codigo ?? detailCodigo ?? "").trim() || null;
    if (!paymentCodigo) return;

    try {
      console.debug("[payments] saveDetalle:start", {
        key,
        paymentCodigo,
        detalleCodigo: String(d?.codigo ?? ""),
        currentEstatus: d?.estatus,
      });
    } catch {}

    const nextStatus = String(
      detailEditStatusByKeyRef.current[key] ?? d?.estatus ?? "",
    )
      .trim()
      .trim();

    const nextConcept = String(
      detailEditConceptByKeyRef.current[key] ?? d?.concepto ?? "",
    ).trim();

    const nextNotes = String(
      detailEditNotesByKeyRef.current[key] ?? d?.notas ?? "",
    );
    const normalizedNextStatus = normalizeCuotaEditableStatus(nextStatus);
    if (!normalizedNextStatus) {
      toast({
        title: "Selecciona un estatus",
        description: "El estatus no puede quedar vacío.",
        variant: "destructive",
      });
      return;
    }

    if (!allowedPaymentStatusSet.has(normalizedNextStatus)) {
      toast({
        title: "Estatus inválido",
        description:
          "Selecciona un estatus permitido (sin escribir manualmente).",
        variant: "destructive",
      });
      return;
    }

    setDetailSavingByKey((prev) => ({ ...prev, [key]: true }));
    try {
      const payload = {
        codigo: d?.codigo ?? null,
        cuota_codigo: d?.cuota_codigo ?? null,
        estatus: normalizedNextStatus,
        monto: d?.monto ?? null,
        moneda: d?.moneda ?? detail?.moneda ?? null,
        metodo: d?.metodo ? String(d.metodo) : "",
        referencia: d?.referencia ? String(d.referencia) : "",
        concepto: nextConcept || "",
        // Evitar null: el backend rechaza notas=null (manda "")
        notas: nextNotes.trim() ? nextNotes : "",
      };
      const fechaPagoIso = toIsoDateOrUndefined(d?.fecha_pago);
      if (fechaPagoIso) payload.fecha_pago = fechaPagoIso;

      try {
        console.debug("[payments] saveDetalle:request", {
          paymentCodigo,
          detalleCodigo: String(d?.codigo ?? ""),
          payload,
        });
      } catch {}

      await upsertPaymentDetalle(
        paymentCodigo,
        String(d.codigo ?? ""),
        payload,
      );

      try {
        console.debug("[payments] saveDetalle:success", {
          key,
          paymentCodigo,
          estatus: normalizedNextStatus,
        });
      } catch {}

      // Optimistic update local
      setDetail((prev: any) => {
        if (!prev) return prev;
        const arr = Array.isArray(prev?.detalles) ? prev.detalles : [];
        return {
          ...prev,
          detalles: arr.map((it: any) => {
            const itKey = getDetailRowKey(it);
            if (itKey !== key) return it;
            return {
              ...it,
              estatus: normalizedNextStatus,
              concepto: nextConcept,
              notas: nextNotes,
            };
          }),
        };
      });

      // Sin toast en éxito: guardado silencioso para evitar spam.

      // Best-effort refresh from backend (keeps UI consistent)
      try {
        const fresh = await getPaymentByCodigo(paymentCodigo);
        setDetail(fresh?.data ?? null);
      } catch {
        // noop
      }

      // Verificar si todas las cuotas están pagadas para actualizar estatus del pago
      await checkAndUpdatePaymentStatus(paymentCodigo);

      // Refrescar detalle nuevamente después de posible cambio de estatus
      try {
        const fresh = await getPaymentByCodigo(paymentCodigo);
        setDetail(fresh?.data ?? null);
        // Limpiar estados de edición para que reflejen los nuevos valores
        setDetailEditStatusByKey({});
        setDetailEditConceptByKey({});
        setDetailEditNotesByKey({});
      } catch {}

      // Refrescar lista principal
      loadList();
    } catch (e: any) {
      try {
        console.error("[payments] saveDetalle:error", {
          key,
          paymentCodigo,
          detalleCodigo: String(d?.codigo ?? ""),
          message: e?.message,
          error: e,
        });
      } catch {}
      toast({
        title: "Error al actualizar",
        description: e?.message || "No se pudo actualizar el estatus",
        variant: "destructive",
      });
    } finally {
      setDetailSavingByKey((prev) => ({ ...prev, [key]: false }));
    }
  }

  function scheduleSaveDetalle(d: any, delayMs: number) {
    if (!canManagePayments) return;
    const key = getDetailRowKey(d);
    if (!key) return;

    try {
      console.debug("[payments] scheduleSaveDetalle", {
        key,
        delayMs,
        paymentCodigo: String(detail?.codigo ?? detailCodigo ?? "").trim(),
        detalleCodigo: String(d?.codigo ?? ""),
      });
    } catch {}

    const prev = detailSaveTimersRef.current[key];
    if (prev) {
      window.clearTimeout(prev);
    }
    const t = window.setTimeout(
      () => {
        delete detailSaveTimersRef.current[key];
        try {
          console.debug("[payments] scheduleSaveDetalle:fire", {
            key,
            paymentCodigo: String(detail?.codigo ?? detailCodigo ?? "").trim(),
            detalleCodigo: String(d?.codigo ?? ""),
          });
        } catch {}
        void saveDetalle(d);
      },
      Math.max(0, delayMs),
    );
    detailSaveTimersRef.current[key] = t;
  }

  useEffect(() => {
    // Carga inicial: traer todos los registros una sola vez
    void loadList({ page: 1, pageSize: 25 });
    if (!isStudent) {
      void loadStudentStates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isStudent) return;
    if (!ownStudentCode) return;
    if (clienteCodigo === ownStudentCode) return;
    setClienteCodigo(ownStudentCode);
  }, [isStudent, ownStudentCode, clienteCodigo]);

  useEffect(() => {
    if (!isStudent) return;
    if (activeTab !== "pagos") setActiveTab("pagos");
  }, [isStudent, activeTab]);

  // Cuando cambian los filtros, solo resetear a página 1 (sin recargar datos)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    estatus,
    fechaDesde,
    fechaHasta,
    debouncedSearch,
    debouncedClienteCodigo,
    debouncedMetodo,
    debouncedMontoMin,
    debouncedMontoMax,
    debouncedReservaMin,
    debouncedReservaMax,
    paymentsStudentFilter,
  ]);

  useEffect(() => {
    if (!syncOpen) return;
    void loadUsersList({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncOpen, debouncedSyncUserSearch]);

  useEffect(() => {
    if (activeTab !== "pagos") return;
    void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    isStudent,
    ownStudentCode,
    estatus,
    fechaDesde,
    fechaHasta,
    debouncedSearch,
    debouncedClienteCodigo,
    debouncedMetodo,
    debouncedMontoMin,
    debouncedMontoMax,
    debouncedReservaMin,
    debouncedReservaMax,
  ]);

  useEffect(() => {
    if (activeTab !== "cuotas") return;
    const nextRangeKey = makeDateRangeKey(cuotasFechaDesde, cuotasFechaHasta);
    if (cuotasLoadedRangeKey === nextRangeKey) return;
    void loadCuotas({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, cuotasFechaDesde, cuotasFechaHasta, cuotasLoadedRangeKey]);

  useEffect(() => {
    if (activeTab !== "sin-plan") return;
    if (isStudent) return;
    if (sinPlanLoadedAt) return;
    void loadSinPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isStudent]);

  useEffect(() => {
    if (activeTab !== "alumnos") return;
    if (isStudent) return;
    if (alumnosLoadedAt) return;
    void loadAlumnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isStudent]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de pagos (lista + detalle)
        </p>
        {isStudent ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Vista de alumno: solo lectura de tu propio seguimiento de pagos.
          </p>
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab((v as any) || "pagos")}
        className="space-y-4"
      >
        <TabsList
          className={`grid h-10 w-full ${isStudent ? "max-w-md grid-cols-1" : "max-w-3xl grid-cols-4"} items-center rounded-xl border bg-muted/40 p-1`}
        >
          <TabsTrigger
            value="pagos"
            className="h-8 rounded-lg whitespace-nowrap text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Pagos
          </TabsTrigger>
          {!isStudent ? (
            <>
              <TabsTrigger
                value="cuotas"
                className="h-8 rounded-lg whitespace-nowrap text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Cuotas por vencer
              </TabsTrigger>
              <TabsTrigger
                value="alumnos"
                className="h-8 rounded-lg whitespace-nowrap text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Estado alumnos
              </TabsTrigger>
              <TabsTrigger
                value="sin-plan"
                className="h-8 rounded-lg whitespace-nowrap text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Sin plan de pago
              </TabsTrigger>
            </>
          ) : null}
        </TabsList>

        <TabsContent value="pagos" className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Métricas</div>
                <div className="text-xs text-muted-foreground">
                  Calculadas sobre todos los pagos que coinciden con los filtros
                  actuales. Se actualizan automáticamente.
                </div>
              </div>
              {metricsLoading ? (
                <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Actualizando…
                </div>
              ) : null}
            </div>

            {metricsError ? (
              <div className="mt-3">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{metricsError}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2 md:grid-cols-5">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Con reserva</div>
                <div className="text-sm font-semibold">
                  {metricsLoading ? "…" : (metrics?.withReserva ?? "—")}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Sin reserva</div>
                <div className="text-sm font-semibold">
                  {metricsLoading ? "…" : (metrics?.withoutReserva ?? "—")}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Reembolsos</div>
                <div className="text-sm font-semibold">
                  {metricsLoading ? "…" : (metrics?.refunds ?? "—")}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">
                  Cuotas (total)
                </div>
                <div className="text-sm font-semibold">
                  {metricsLoading ? "…" : (metrics?.totalCuotas ?? "—")}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">
                  Cuotas (promedio)
                </div>
                <div className="text-sm font-semibold">
                  {metricsLoading
                    ? "…"
                    : metrics
                      ? metrics.avgCuotas.toFixed(2)
                      : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold">Filtros</div>
              <div className="text-xs text-muted-foreground">
                Usa primero búsqueda rápida y luego ajusta rango/montos si lo
                necesitas.
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.8fr)_minmax(170px,1fr)_minmax(220px,1fr)_minmax(170px,1fr)_auto_auto] xl:items-end">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Buscar</Label>
                <Input
                  placeholder="Nombre, código, estatus, moneda…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Estatus</Label>
                <Select
                  value={normalizePaymentStatus(estatus) || "__ALL__"}
                  onValueChange={(v) => {
                    setEstatus(
                      v === "__ALL__" ? "" : normalizePaymentStatus(v),
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos">
                      {estatus ? formatPaymentStatusLabel(estatus) : "Todos"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todos</SelectItem>
                    {statusOptions.length ? (
                      statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatPaymentStatusLabel(s)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="pagado">Pagado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {!isStudent ? (
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Estado alumno
                  </Label>
                  <Select
                    value={paymentsStudentFilter}
                    onValueChange={(value) => {
                      setPaymentsStudentFilter(value as StudentLifecycleFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="en_progreso">En progreso</SelectItem>
                      <SelectItem value="pausa">Pausa</SelectItem>
                      <SelectItem value="inactivo_pago">
                        Inactivo por pago
                      </SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                      <SelectItem value="sin_estado">Sin estado</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Reserva</Label>
                <Select
                  value={reservaFilter}
                  onValueChange={(value) =>
                    setReservaFilter(
                      value as "todos" | "con_reserva" | "sin_reserva",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="con_reserva">Con reserva</SelectItem>
                    <SelectItem value="sin_reserva">Sin reserva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full xl:w-auto"
                  onClick={() => {
                    setSearch("");
                    setClienteCodigo(isStudent ? ownStudentCode : "");
                    setEstatus("");
                    setMetodo("");
                    setFechaDesde("");
                    setFechaHasta("");
                    setMontoMin("");
                    setMontoMax("");
                    setReservaMin("");
                    setReservaMax("");
                    setReservaFilter("todos");
                    setPaymentsStudentFilter("todos");
                    setCuotasStudentFilter("todos");
                    setOnlyUnlinked(false);
                    setPage(1);
                  }}
                  disabled={isLoading}
                >
                  Limpiar filtros
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  className="w-full xl:w-auto"
                  onClick={() => loadList({ page: 1, pageSize })}
                  disabled={isLoading}
                >
                  {isLoading ? "Cargando…" : "Refrescar datos"}
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <div className="grid gap-1 md:col-span-1">
                <Label className="text-xs text-muted-foreground">
                  Fecha desde
                </Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label className="text-xs text-muted-foreground">
                  Fecha hasta
                </Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label className="text-xs text-muted-foreground">
                  Monto min
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={montoMin}
                  onChange={(e) => setMontoMin(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label className="text-xs text-muted-foreground">
                  Monto max
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="5000"
                  value={montoMax}
                  onChange={(e) => setMontoMax(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label className="text-xs text-muted-foreground">
                  Reserva min
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={reservaMin}
                  onChange={(e) => setReservaMin(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label className="text-xs text-muted-foreground">
                  Reserva max
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="2000"
                  value={reservaMax}
                  onChange={(e) => setReservaMax(e.target.value)}
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <div>
                Total: <span className="text-foreground">{rows.length}</span> ·
                Filtrados:{" "}
                <span className="text-foreground">{filtered.length}</span> ·
                Página:{" "}
                <span className="text-foreground">
                  {page}/{totalPages}
                </span>
                {!isStudent && paymentsStudentFilter !== "todos" ? (
                  <>
                    {" "}
                    · Estado alumno:{" "}
                    <span className="text-foreground">
                      {getStudentLifecycleLabel(paymentsStudentFilter)}
                    </span>
                  </>
                ) : null}
                {unlinkedCount ? (
                  <>
                    {" "}
                    · Sin sincronizar:{" "}
                    <span className="text-foreground">{unlinkedCount}</span>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {!isStudent ? (
                  <Button
                    variant={onlyUnlinked ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOnlyUnlinked((v) => !v)}
                  >
                    {onlyUnlinked
                      ? "Viendo: sin sincronizar"
                      : "Ver sin sincronizar"}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPayments("csv")}
                  disabled={filtered.length === 0}
                >
                  <Download className="mr-1 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPayments("xlsx")}
                  disabled={filtered.length === 0}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="whitespace-nowrap">Monto</TableHead>
                    <TableHead className="whitespace-nowrap">Reserva</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Acciones
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-sm text-muted-foreground"
                      >
                        Cargando…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-sm text-muted-foreground"
                      >
                        Sin resultados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((r) => {
                      const clientName = fixMojibake(
                        r.cliente_nombre || r.cliente_codigo || "—",
                      );
                      const synced = isPaymentSynced(r);

                      return (
                        <TableRow
                          key={r.codigo}
                          className="cursor-pointer"
                          onClick={() => {
                            try {
                              console.debug("[payments] row selected", {
                                codigo: r.codigo,
                                synced,
                                cliente_codigo: fixMojibake(r.cliente_codigo),
                                cliente_nombre: fixMojibake(r.cliente_nombre),
                              });
                            } catch {}
                            openDetail(r.codigo);
                          }}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{clientName}</span>
                                {!synced ? (
                                  <Badge variant="destructive">
                                    Sin usuario
                                  </Badge>
                                ) : null}
                              </div>
                              {r.cliente_nombre && r.cliente_codigo ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{fixMojibake(r.cliente_codigo)}</span>
                                  {!isStudent ? (
                                    <Badge
                                      variant="outline"
                                      className={getStudentLifecycleBadgeClass(
                                        classifyStudentLifecycleStatus(
                                          studentStateByCode[
                                            String(r.cliente_codigo ?? "")
                                              .trim()
                                              .toLowerCase()
                                          ],
                                        ),
                                      )}
                                    >
                                      {getStudentLifecycleStateLabel(
                                        studentStateByCode[
                                          String(r.cliente_codigo ?? "")
                                            .trim()
                                            .toLowerCase()
                                        ],
                                      )}
                                    </Badge>
                                  ) : null}
                                  {!isStudent && synced ? (
                                    <Button
                                      asChild
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Link
                                        href={`/admin/alumnos/${encodeURIComponent(
                                          String(r.cliente_codigo ?? "").trim(),
                                        )}/perfil`}
                                      >
                                        Ver perfil
                                      </Link>
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatMoney(r.monto, r.moneda)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatMoney(r.monto_reserva, r.moneda)}
                          </TableCell>
                          <TableCell>{r.moneda || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusChipClass(r.estatus)}
                            >
                              {formatPaymentStatusLabel(r.estatus)}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {synced || isStudent ? (
                              <Badge
                                variant="outline"
                                className="border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60"
                              >
                                {synced ? "Sincronizado" : "Solo lectura"}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/60 dark:hover:bg-amber-950/55"
                                onClick={() => openSync(r)}
                              >
                                Sincronizar
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(r.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {!isStudent ? (
          <TabsContent value="cuotas" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
                <div className="grid gap-1">
                  <Label>Fecha desde</Label>
                  <Input
                    type="date"
                    value={cuotasFechaDesde}
                    onChange={(e) => {
                      setCuotasFechaDesde(e.target.value);
                      setCuotasStatusFilter("todos");
                      setCuotasLoadedRangeKey(null);
                      setCuotasRows([]);
                      setCuotasPage(1);
                      setCuotasTotalPages(1);
                      setCuotasTotal(0);
                      setCuotasError(null);
                    }}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Fecha hasta</Label>
                  <Input
                    type="date"
                    value={cuotasFechaHasta}
                    onChange={(e) => {
                      setCuotasFechaHasta(e.target.value);
                      setCuotasStatusFilter("todos");
                      setCuotasLoadedRangeKey(null);
                      setCuotasRows([]);
                      setCuotasPage(1);
                      setCuotasTotalPages(1);
                      setCuotasTotal(0);
                      setCuotasError(null);
                    }}
                  />
                </div>
                <div className="grid gap-1 min-w-0">
                  <Label>Estatus</Label>
                  <Select
                    value={cuotasStatusFilter}
                    onValueChange={setCuotasStatusFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {cuotasStatusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatPaymentStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1 min-w-0">
                  <Label>Estado alumno</Label>
                  <Select
                    value={cuotasStudentFilter}
                    onValueChange={(value) =>
                      setCuotasStudentFilter(value as StudentLifecycleFilter)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="en_progreso">En progreso</SelectItem>
                      <SelectItem value="pausa">Pausa</SelectItem>
                      <SelectItem value="inactivo_pago">
                        Inactivo por pago
                      </SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                      <SelectItem value="sin_estado">Sin estado</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    className="w-full lg:w-auto"
                    onClick={() => loadCuotas({ page: 1 })}
                    disabled={cuotasLoading}
                  >
                    {cuotasLoading ? "Cargando…" : "Buscar"}
                  </Button>
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {cuotasFechaDesde && cuotasFechaHasta
                  ? `Rango: ${cuotasFechaDesde} → ${cuotasFechaHasta}`
                  : "Selecciona un rango válido"}
              </div>

              {cuotasError ? (
                <div className="mt-3">
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{cuotasError}</AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <div>
                  Página {cuotasPage} / {cuotasTotalPages} • Mostrando{" "}
                  {filteredCuotasRows.length}
                  {cuotasStatusFilter !== "todos"
                    ? ` (filtrado por: ${formatPaymentStatusLabel(cuotasStatusFilter)})`
                    : ""}
                  {cuotasStudentFilter !== "todos"
                    ? ` (alumnos: ${getStudentLifecycleLabel(cuotasStudentFilter)})`
                    : ""}
                  {cuotasTotal ? ` (total API: ${cuotasTotal})` : ""}
                  {!isStudent && studentStatesLoading
                    ? " • actualizando estados de alumnos…"
                    : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCuotas("csv")}
                    disabled={filteredCuotasRows.length === 0}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCuotas("xlsx")}
                    disabled={filteredCuotasRows.length === 0}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadCuotas({ page: 1 })}
                    disabled={cuotasLoading}
                  >
                    Recargar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      loadCuotas({ page: cuotasPage + 1, append: true })
                    }
                    disabled={cuotasLoading || cuotasPage >= cuotasTotalPages}
                  >
                    {cuotasLoading ? "Cargando…" : "Cargar más"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="whitespace-nowrap">Cuota</TableHead>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap">Días</TableHead>
                      <TableHead className="whitespace-nowrap">Monto</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!filteredCuotasRows.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-muted-foreground"
                        >
                          {cuotasLoading
                            ? "Cargando…"
                            : "No hay cuotas para el filtro seleccionado."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCuotasRows.map((r) => {
                        const now = new Date();
                        const clientName = fixMojibake(r.cliente_nombre) || "—";
                        const cuotaCode =
                          String(r.cuota_codigo || r.codigo || "").trim() ||
                          "—";
                        const effectiveStatus = getEffectiveCuotaStatus(
                          r.estatus,
                          r.fecha_pago,
                          now,
                        );
                        const cuotaDate = r.fecha_pago
                          ? new Date(r.fecha_pago)
                          : null;
                        const dias =
                          cuotaDate && !Number.isNaN(cuotaDate.getTime())
                            ? diffDays(cuotaDate, new Date())
                            : null;

                        return (
                          <TableRow key={String(r.id || r.codigo || cuotaCode)}>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="text-sm">{clientName}</div>
                                {r.cliente_codigo ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{fixMojibake(r.cliente_codigo)}</span>
                                    <Badge
                                      variant="outline"
                                      className={getStudentLifecycleBadgeClass(
                                        classifyStudentLifecycleStatus(
                                          studentStateByCode[
                                            String(r.cliente_codigo ?? "")
                                              .trim()
                                              .toLowerCase()
                                          ],
                                        ),
                                      )}
                                    >
                                      {getStudentLifecycleStateLabel(
                                        studentStateByCode[
                                          String(r.cliente_codigo ?? "")
                                            .trim()
                                            .toLowerCase()
                                        ],
                                      )}
                                    </Badge>
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="text-sm">{cuotaCode}</div>
                                {r.concepto ? (
                                  <div className="text-xs text-muted-foreground">
                                    {fixMojibake(r.concepto)}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDateOnly(r.fecha_pago)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {dias === null ? (
                                "—"
                              ) : dias < 0 ? (
                                <span className="text-destructive">{dias}</span>
                              ) : (
                                dias
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatMoney(r.monto, r.moneda)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getStatusChipClass(effectiveStatus)}
                              >
                                {formatPaymentStatusLabel(effectiveStatus)}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!r.payment_codigo}
                                onClick={() =>
                                  openDetail(String(r.payment_codigo))
                                }
                              >
                                Ver plan de pagos
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        ) : null}

        {!isStudent ? (
          <TabsContent value="alumnos" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      Estado de alumnos y morosidad
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se cruzan todos los pagos y cuotas con el listado de
                      alumnos para obtener el estado actual. Se considera
                      <strong> moroso</strong> a toda cuota pendiente cuyo
                      vencimiento supere los{" "}
                      <strong>{MORA_GRACE_DAYS} días</strong> de gracia o cuyo
                      estatus ya sea &quot;moroso&quot; / &quot;vencido&quot;.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={alumnosLoading}
                  onClick={() => {
                    setAlumnosLoadedAt(null);
                    void loadAlumnos();
                  }}
                >
                  {alumnosLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Recargar
                </Button>
              </div>

              {alumnosLoading ? (
                <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {alumnosProgress.stage === "students" ? (
                    <>Consultando alumnos…</>
                  ) : alumnosProgress.stage === "payments" ? (
                    <>
                      Recorriendo pagos… página {alumnosProgress.fetched}
                      {alumnosProgress.total
                        ? ` de ${alumnosProgress.total}`
                        : ""}
                    </>
                  ) : alumnosProgress.stage === "cuotas" ? (
                    <>
                      Recorriendo cuotas… página {alumnosProgress.fetched}
                      {alumnosProgress.total
                        ? ` de ${alumnosProgress.total}`
                        : ""}
                    </>
                  ) : (
                    <>Preparando datos…</>
                  )}
                </div>
              ) : null}

              {alumnosError ? (
                <div className="mt-3">
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{alumnosError}</AlertDescription>
                  </Alert>
                </div>
              ) : null}

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Total alumnos
                  </div>
                  <div className="text-sm font-semibold">
                    {alumnosLoading && !alumnosLoadedAt
                      ? "…"
                      : alumnosStats.totalAlumnos}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Alumnos morosos (&gt;{MORA_GRACE_DAYS} días)
                  </div>
                  <div className="text-sm font-semibold text-rose-700">
                    {alumnosLoading && !alumnosLoadedAt
                      ? "…"
                      : alumnosStats.morososAlumnos}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Cuotas morosas
                  </div>
                  <div className="text-sm font-semibold text-rose-700">
                    {alumnosLoading && !alumnosLoadedAt
                      ? "…"
                      : alumnosStats.cuotasMorosasTotales}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Listado de alumnos
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="w-full sm:w-72">
                    <Input
                      placeholder="Buscar por nombre o código…"
                      value={alumnosSearch}
                      onChange={(e) => setAlumnosSearch(e.target.value)}
                      disabled={alumnosLoading && !alumnosLoadedAt}
                    />
                  </div>
                  <Select
                    value={alumnosLifecycleFilter}
                    onValueChange={(v) =>
                      setAlumnosLifecycleFilter(v as StudentLifecycleFilter)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="Estado del alumno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="en_progreso">En progreso</SelectItem>
                      <SelectItem value="pausa">Pausa</SelectItem>
                      <SelectItem value="inactivo_pago">
                        Inactivo por pago
                      </SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                      <SelectItem value="sin_estado">Sin estado</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={alumnosOverdueOnly}
                      onChange={(e) => setAlumnosOverdueOnly(e.target.checked)}
                    />
                    Solo morosos &gt;{MORA_GRACE_DAYS} días
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAlumnos}
                    disabled={filteredAlumnosRows.length === 0}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alumno</TableHead>
                      <TableHead>Estado alumno</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Cuotas pend.</TableHead>
                      <TableHead className="text-right">Morosas</TableHead>
                      <TableHead className="text-right">Máx. atraso</TableHead>
                      <TableHead className="text-right">Deuda</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alumnosLoading && !alumnosLoadedAt ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando estado de alumnos…
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : !filteredAlumnosRows.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          {alumnosLoadedAt
                            ? "No hay coincidencias para los filtros seleccionados."
                            : "Aún no se han cargado datos."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlumnosRows.map((row) => {
                        const lifecycleLabel = getStudentLifecycleStateLabel(
                          row.student?.state,
                        );
                        const lifecycleClass = getStudentLifecycleBadgeClass(
                          row.lifecycleKind,
                        );
                        const isMoroso = row.cuotasMorosas > 0;
                        const rawState = String(
                          row.student?.state ?? "",
                        ).trim();
                        const showRawState =
                          rawState &&
                          rawState.toLowerCase() !==
                            lifecycleLabel.toLowerCase();
                        return (
                          <TableRow
                            key={row.student.id}
                            className={
                              isMoroso
                                ? "bg-rose-50/40 dark:bg-rose-950/20"
                                : undefined
                            }
                          >
                            <TableCell className="font-medium">
                              {fixMojibake(row.student?.name || "") || "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${lifecycleClass}`}
                              >
                                {lifecycleLabel}
                              </span>
                              {showRawState ? (
                                <div className="mt-0.5 text-[10px] text-muted-foreground">
                                  {rawState}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {row.student?.stage ? (
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getOptionBadgeClass(
                                    "etapa",
                                    row.student.stage,
                                  )}`}
                                >
                                  {row.student.stage}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.hasPlan ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {row.paymentsCount} pago
                                  {row.paymentsCount === 1 ? "" : "s"}
                                </Badge>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                                  Sin plan
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {row.cuotasPendientes}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.cuotasMorosas > 0 ? (
                                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200">
                                  {row.cuotasMorosas}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {row.maxDiasAtraso > 0 ? (
                                <span className="font-semibold text-rose-700">
                                  {row.maxDiasAtraso}d
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {Object.keys(row.totalDeudaByCurrency).length ===
                              0
                                ? "—"
                                : Object.entries(row.totalDeudaByCurrency)
                                    .map(([c, v]) => formatMoney(v, c))
                                    .join(" / ")}
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const firstPaymentCodigo = row.code
                                  ? String(
                                      alumnosPaymentsByCode[
                                        row.code.toLowerCase()
                                      ]?.[0]?.codigo ?? "",
                                    ).trim()
                                  : "";
                                return firstPaymentCodigo ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Ver plan de pagos"
                                    onClick={() =>
                                      openDetail(firstPaymentCodigo)
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {alumnosLoadedAt ? (
                <div className="border-t p-3 text-[11px] text-muted-foreground">
                  Mostrando {filteredAlumnosRows.length} de {alumnosRows.length}{" "}
                  alumnos · Última actualización{" "}
                  {formatDateTime(new Date(alumnosLoadedAt).toISOString())}
                </div>
              ) : null}
            </div>
          </TabsContent>
        ) : null}

        {!isStudent ? (
          <TabsContent value="sin-plan" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      Alumnos sin plan de pago
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se cruzan todos los pagos existentes contra la lista de
                      alumnos para detectar quienes aún no tienen ningún plan
                      creado (sin coincidencia de <code>cliente_codigo</code>).
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sinPlanLoading}
                  onClick={() => {
                    setSinPlanLoadedAt(null);
                    void loadSinPlan();
                  }}
                >
                  {sinPlanLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Recargar
                </Button>
              </div>

              {sinPlanLoading ? (
                <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {sinPlanProgress.stage === "payments" ? (
                    <>
                      Recorriendo pagos… página {sinPlanProgress.fetched}
                      {sinPlanProgress.total
                        ? ` de ${sinPlanProgress.total}`
                        : ""}
                    </>
                  ) : sinPlanProgress.stage === "students" ? (
                    <>Consultando alumnos…</>
                  ) : (
                    <>Preparando datos…</>
                  )}
                </div>
              ) : null}

              {sinPlanError ? (
                <div className="mt-3">
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{sinPlanError}</AlertDescription>
                  </Alert>
                </div>
              ) : null}

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Total alumnos
                  </div>
                  <div className="text-sm font-semibold">
                    {sinPlanLoading && !sinPlanLoadedAt
                      ? "…"
                      : sinPlanStats.totalStudents}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Con plan de pago
                  </div>
                  <div className="text-sm font-semibold text-emerald-700">
                    {sinPlanLoading && !sinPlanLoadedAt
                      ? "…"
                      : sinPlanStats.withPlan}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    Sin plan de pago
                  </div>
                  <div className="text-sm font-semibold text-amber-700">
                    {sinPlanLoading && !sinPlanLoadedAt
                      ? "…"
                      : sinPlanStats.withoutPlan}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Listado
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="w-full max-w-xs">
                    <Input
                      placeholder="Filtrar por nombre o código…"
                      value={sinPlanSearch}
                      onChange={(e) => setSinPlanSearch(e.target.value)}
                      disabled={sinPlanLoading && !sinPlanLoadedAt}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportSinPlan("xlsx")}
                    disabled={filteredSinPlanStudents.length === 0}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alumno</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sinPlanLoading && !sinPlanLoadedAt ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando alumnos sin plan…
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (() => {
                        const filtered = filteredSinPlanStudents;

                        if (!filtered.length) {
                          return (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="py-8 text-center text-sm text-muted-foreground"
                              >
                                {sinPlanLoadedAt
                                  ? q
                                    ? "No hay coincidencias para el filtro."
                                    : "Todos los alumnos tienen plan de pago."
                                  : "Aún no se han cargado datos."}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return filtered.map((s) => {
                          const code = String(s?.code ?? "").trim();
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">
                                {s.name || "—"}
                              </TableCell>
                              <TableCell>
                                {code ? (
                                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                    {code}
                                  </code>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {s.state ? (
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getOptionBadgeClass(
                                      "estado",
                                      s.state,
                                    )}`}
                                  >
                                    {s.state}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {s.stage ? (
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getOptionBadgeClass(
                                      "etapa",
                                      s.stage,
                                    )}`}
                                  >
                                    {s.stage}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {code ? (
                                  <div className="inline-flex items-center gap-2">
                                    <Button asChild size="sm" variant="outline">
                                      <Link
                                        href={`/admin/alumnos/${encodeURIComponent(code)}/pagos`}
                                      >
                                        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                                        Crear plan
                                      </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="ghost">
                                      <Link
                                        href={`/admin/alumnos/${encodeURIComponent(code)}`}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Sin código
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog
        open={syncOpen}
        onOpenChange={(open) => {
          setSyncOpen(open);
          if (!open) {
            setSyncPayment(null);
            setSyncSelectedUser(null);
            setSyncUserSearch("");
            setSyncUsers([]);
            setSyncUsersError(null);
            setSyncSaveError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Sincronizar pago con usuario</DialogTitle>
            <DialogDescription>
              {syncPayment
                ? `Pago: ${syncPayment.codigo}`
                : "Selecciona un pago para sincronizar."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Buscar usuario</Label>
              <Input
                placeholder="Nombre, email o código…"
                value={syncUserSearch}
                onChange={(e) => setSyncUserSearch(e.target.value)}
              />
            </div>

            {syncUsersError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{syncUsersError}</AlertDescription>
              </Alert>
            ) : null}

            {syncSaveError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{syncSaveError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-md border overflow-hidden">
              <ScrollArea className="h-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Código
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncUsersLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-sm text-muted-foreground"
                        >
                          Cargando usuarios…
                        </TableCell>
                      </TableRow>
                    ) : syncUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-sm text-muted-foreground"
                        >
                          Sin resultados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncUsers.map((u) => {
                        const isSelected = syncSelectedUser?.id === u.id;
                        const label =
                          u.name || u.email || u.codigo || "(sin nombre)";
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="text-sm font-medium">
                                  {fixMojibake(label)}
                                </div>
                                {u.email ? (
                                  <div className="text-xs text-muted-foreground">
                                    {u.email}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{u.role || "—"}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {fixMojibake(u.codigo || "—")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button
                                size="sm"
                                variant={isSelected ? "secondary" : "outline"}
                                onClick={() => setSyncSelectedUser(u)}
                              >
                                {isSelected ? "Seleccionado" : "Seleccionar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <div>
                Página <span className="text-foreground">{syncUsersPage}</span>/{" "}
                <span className="text-foreground">{syncUsersTotalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncUsersLoading || syncUsersPage <= 1}
                  onClick={() =>
                    loadUsersList({ page: Math.max(1, syncUsersPage - 1) })
                  }
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    syncUsersLoading || syncUsersPage >= syncUsersTotalPages
                  }
                  onClick={() =>
                    loadUsersList({
                      page: Math.min(syncUsersTotalPages, syncUsersPage + 1),
                    })
                  }
                >
                  Siguiente
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSyncOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!syncPayment || !syncSelectedUser}
                onClick={() => setSyncConfirmOpen(true)}
              >
                Confirmar sincronización
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar sincronización</AlertDialogTitle>
            <AlertDialogDescription>
              {syncPayment && syncSelectedUser
                ? `Esto asociará el pago ${
                    syncPayment.codigo
                  } al usuario ${fixMojibake(
                    syncSelectedUser.name ||
                      syncSelectedUser.email ||
                      syncSelectedUser.codigo,
                  )}.`
                : "Selecciona un usuario para continuar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncSaving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={syncSaving || !syncPayment || !syncSelectedUser}
              onClick={(e) => {
                e.preventDefault();
                void doSync();
              }}
            >
              {syncSaving ? "Sincronizando…" : "Sí, sincronizar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailCodigo(null);
            setDetail(null);
            setDetailError(null);
            setDetailEditStatusByKey({});
            setDetailEditConceptByKey({});
            setDetailEditNotesByKey({});
            setDetailSavingByKey({});
          }
        }}
      >
        <DialogContent className="w-[98vw] sm:max-w-6xl h-[92vh] max-h-[92vh] overflow-hidden flex flex-col top-[4vh] translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Detalle de pago
            </DialogTitle>
            <DialogDescription>
              {detailCodigo ? `Código: ${detailCodigo}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">
                Cargando detalle…
              </div>
            ) : detailError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{detailError}</AlertDescription>
              </Alert>
            ) : !detail ? (
              <div className="text-sm text-muted-foreground">Sin detalle.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border bg-card p-3">
                  <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Cliente
                      </div>
                      <div className="text-sm font-semibold text-right break-words">
                        {fixMojibake(
                          detail.cliente_nombre || detail.cliente_codigo || "—",
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Estatus
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {paymentEditingField === "estatus" ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={paymentEditValue}
                              onValueChange={setPaymentEditValue}
                            >
                              <SelectTrigger className="h-7 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("estatus")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Badge
                              variant="outline"
                              className={getStatusChipClass(detail.estatus)}
                            >
                              {formatPaymentStatusLabel(detail.estatus)}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "estatus",
                                  detail.estatus || "en_proceso",
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {detail.cliente_nombre && detail.cliente_codigo ? (
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          Código cliente
                        </div>
                        <div className="text-sm text-right break-words">
                          {fixMojibake(detail.cliente_codigo)}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Moneda
                      </div>
                      <div className="text-sm text-right flex items-center gap-1">
                        {paymentEditingField === "moneda" ? (
                          <>
                            <Select
                              value={paymentEditValue}
                              onValueChange={setPaymentEditValue}
                            >
                              <SelectTrigger className="h-7 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="MXN">MXN</SelectItem>
                                <SelectItem value="COP">COP</SelectItem>
                                <SelectItem value="VES">VES</SelectItem>
                                <SelectItem value="CLP">CLP</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("moneda")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>{detail.moneda || "—"}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "moneda",
                                  detail.moneda || "USD",
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Monto</div>
                      <div className="text-sm font-semibold text-right">
                        {formatMoney(detail.monto, detail.moneda)}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Reserva
                      </div>
                      <div className="text-sm text-right flex items-center gap-1">
                        {paymentEditingField === "monto_reserva" ? (
                          <>
                            <Input
                              type="number"
                              step="0.01"
                              value={paymentEditValue}
                              onChange={(e) =>
                                setPaymentEditValue(e.target.value)
                              }
                              className="h-7 w-24"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("monto_reserva")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>
                              {formatMoney(detail.monto_reserva, detail.moneda)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "monto_reserva",
                                  detail.monto_reserva,
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Nro. cuotas
                      </div>
                      <div className="text-sm text-right">
                        {detail.nro_cuotas ?? "—"}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Método
                      </div>
                      <div className="text-sm text-right break-words flex items-center gap-1">
                        {paymentEditingField === "metodo" ? (
                          <>
                            <Input
                              value={paymentEditValue}
                              onChange={(e) =>
                                setPaymentEditValue(e.target.value)
                              }
                              className="h-7 w-32"
                              placeholder="Método"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("metodo")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>{detail.metodo || "—"}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "metodo",
                                  detail.metodo || "",
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Modalidad
                      </div>
                      <div className="text-sm text-right break-words flex items-center gap-1">
                        {paymentEditingField === "modalidad" ? (
                          <>
                            <Input
                              value={paymentEditValue}
                              onChange={(e) =>
                                setPaymentEditValue(e.target.value)
                              }
                              className="h-7 w-32"
                              placeholder="Modalidad"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("modalidad")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>{detail.modalidad || "—"}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "modalidad",
                                  detail.modalidad || "",
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Referencia
                      </div>
                      <div className="text-sm text-right break-words flex items-center gap-1">
                        {paymentEditingField === "referencia" ? (
                          <>
                            <Input
                              value={paymentEditValue}
                              onChange={(e) =>
                                setPaymentEditValue(e.target.value)
                              }
                              className="h-7 w-32"
                              placeholder="Referencia"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("referencia")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>{detail.referencia || "—"}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "referencia",
                                  detail.referencia || "",
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Creado
                      </div>
                      <div className="text-sm text-right">
                        {formatDateTime(detail.created_at)}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Actualizado
                      </div>
                      <div className="text-sm text-right">
                        {formatDateTime(detail.updated_at)}
                      </div>
                    </div>

                    <div className="md:col-span-2 flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Concepto
                      </div>
                      <div className="text-sm text-right whitespace-pre-wrap break-words flex items-center gap-1">
                        {paymentEditingField === "concepto" ? (
                          <>
                            <Textarea
                              value={paymentEditValue}
                              onChange={(e) =>
                                setPaymentEditValue(e.target.value)
                              }
                              className="min-h-[60px] w-64"
                              placeholder="Concepto"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("concepto")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>{fixMojibake(detail.concepto) || "—"}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "concepto",
                                  detail.concepto || "",
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Notas</div>
                      <div className="text-sm text-right whitespace-pre-wrap break-words flex items-center gap-1">
                        {paymentEditingField === "notas" ? (
                          <>
                            <Textarea
                              value={paymentEditValue}
                              onChange={(e) =>
                                setPaymentEditValue(e.target.value)
                              }
                              className="min-h-[60px] w-64"
                              placeholder="Notas"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => savePaymentField("notas")}
                              disabled={paymentFieldSaving}
                            >
                              {paymentFieldSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelEditingPaymentField}
                              disabled={paymentFieldSaving}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>{fixMojibake(detail.notas) || "—"}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                startEditingPaymentField(
                                  "notas",
                                  detail.notas || "",
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      Detalles (Cuotas)
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {Array.isArray(detail.detalles)
                          ? detail.detalles.length
                          : 0}{" "}
                        items
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCuotaModal()}
                        disabled={!canManagePayments}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nueva cuota
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Acciones</TableHead>
                          <TableHead>Cuota</TableHead>
                          <TableHead className="whitespace-nowrap">
                            Monto
                          </TableHead>
                          <TableHead>Moneda</TableHead>
                          <TableHead>Estatus</TableHead>
                          <TableHead className="whitespace-nowrap">
                            Fecha pago
                          </TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Notas</TableHead>
                          <TableHead className="whitespace-nowrap">
                            Creado
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Actualizado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(detail.detalles) &&
                        detail.detalles.length ? (
                          detail.detalles.map((d: any) => (
                            <TableRow key={d.codigo || d.id}>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openCuotaModal(d)}
                                    title="Editar cuota"
                                    disabled={!canManagePayments}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openDeleteConfirm(d)}
                                    title="Eliminar cuota"
                                    className="text-destructive hover:text-destructive"
                                    disabled={!canManagePayments}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {d.cuota_codigo || "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatMoney(
                                  d.monto,
                                  d.moneda || detail.moneda,
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {d.moneda || detail.moneda || "—"}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const key = getDetailRowKey(d);
                                  const saving = !!detailSavingByKey[key];
                                  const current = normalizePaymentStatus(
                                    d?.estatus ?? "",
                                  );
                                  const currentEditable =
                                    normalizeCuotaEditableStatus(current);
                                  const value = normalizeCuotaEditableStatus(
                                    detailEditStatusByKey[key] ?? current,
                                  );

                                  const opts = (() => {
                                    const set = new Set<string>(
                                      CUOTA_ALLOWED_STATUS,
                                    );
                                    if (currentEditable) {
                                      set.add(currentEditable);
                                    }
                                    return Array.from(set).sort((a, b) =>
                                      a.localeCompare(b),
                                    );
                                  })();

                                  return (
                                    <div className="flex flex-col gap-1 min-w-[220px]">
                                      <Select
                                        key={`select-status-${key}`}
                                        value={value || ""}
                                        disabled={!canManagePayments}
                                        onValueChange={(v) => {
                                          const vLower =
                                            normalizeCuotaEditableStatus(v);
                                          try {
                                            console.debug(
                                              "[payments] detalle estatus changed",
                                              {
                                                key,
                                                from: current,
                                                to: vLower,
                                                raw: v,
                                                detalleCodigo: String(
                                                  d?.codigo ?? "",
                                                ),
                                              },
                                            );
                                          } catch {}
                                          setDetailEditStatusByKey((prev) => ({
                                            ...prev,
                                            [key]: vLower,
                                          }));
                                          // Optimistic update del UI
                                          setDetail((prevDetail: any) => {
                                            if (!prevDetail) return prevDetail;
                                            const arr = Array.isArray(
                                              prevDetail?.detalles,
                                            )
                                              ? prevDetail.detalles
                                              : [];
                                            return {
                                              ...prevDetail,
                                              detalles: arr.map((it: any) => {
                                                const itKey =
                                                  getDetailRowKey(it);
                                                if (itKey !== key) return it;
                                                return {
                                                  ...it,
                                                  estatus: vLower,
                                                };
                                              }),
                                            };
                                          });
                                          scheduleSaveDetalle(d, 250);
                                        }}
                                      >
                                        <SelectTrigger className="h-8 w-[190px]">
                                          <SelectValue placeholder="Estatus">
                                            {value ? (
                                              <span
                                                className={
                                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs " +
                                                  getStatusChipClass(value)
                                                }
                                              >
                                                {formatPaymentStatusLabel(
                                                  value,
                                                )}
                                              </span>
                                            ) : (
                                              "Estatus"
                                            )}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {opts.map((s) => (
                                            <SelectItem key={s} value={s}>
                                              <span className="flex items-center gap-2">
                                                <span
                                                  className={
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs " +
                                                    getStatusChipClass(s)
                                                  }
                                                >
                                                  {formatPaymentStatusLabel(s)}
                                                </span>
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      {saving ? (
                                        <div className="text-[11px] text-muted-foreground">
                                          Guardando…
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDateTime(d.fecha_pago)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {d.metodo || "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {d.referencia || "—"}
                              </TableCell>
                              <TableCell className="min-w-[360px] max-w-[520px] whitespace-normal break-words">
                                {(() => {
                                  const key = getDetailRowKey(d);
                                  const value =
                                    detailEditConceptByKey[key] ??
                                    String(d?.concepto ?? "");
                                  return (
                                    <Input
                                      value={value}
                                      readOnly={!canManagePayments}
                                      onChange={(e) => {
                                        const next = e.target.value;
                                        setDetailEditConceptByKey((prev) => ({
                                          ...prev,
                                          [key]: next,
                                        }));
                                        scheduleSaveDetalle(d, 900);
                                      }}
                                      onBlur={() => scheduleSaveDetalle(d, 0)}
                                      className="h-8"
                                      placeholder="Concepto"
                                    />
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="min-w-[360px] max-w-[520px] whitespace-normal break-words">
                                {(() => {
                                  const key = getDetailRowKey(d);
                                  const value =
                                    detailEditNotesByKey[key] ??
                                    fixMojibake(String(d?.notas ?? ""));
                                  return (
                                    <Textarea
                                      value={value}
                                      readOnly={!canManagePayments}
                                      onChange={(e) => {
                                        const next = e.target.value;
                                        setDetailEditNotesByKey((prev) => ({
                                          ...prev,
                                          [key]: next,
                                        }));
                                        scheduleSaveDetalle(d, 1100);
                                      }}
                                      onBlur={() => scheduleSaveDetalle(d, 0)}
                                      className="min-h-16 text-sm resize-none"
                                      placeholder="Notas"
                                    />
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDateTime(d.created_at)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDateTime(d.updated_at)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={13}
                              className="text-sm text-muted-foreground"
                            >
                              Sin detalles. Haz clic en &quot;Nueva cuota&quot;
                              para agregar una.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal crear/editar cuota */}
      <Dialog open={cuotaModalOpen} onOpenChange={setCuotaModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {cuotaEditing ? "Editar Cuota" : "Nueva Cuota"}
            </DialogTitle>
            <DialogDescription>
              {cuotaEditing
                ? `Editando cuota ${
                    cuotaEditing.cuota_codigo || cuotaEditing.codigo
                  }`
                : "Ingresa los datos de la nueva cuota"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <Label>Código de cuota *</Label>
                <Input
                  value={cuotaForm.cuota_codigo}
                  onChange={(e) =>
                    setCuotaForm((prev) => ({
                      ...prev,
                      cuota_codigo: e.target.value,
                    }))
                  }
                  placeholder="CUOTA_001"
                />
              </div>

              <div className="grid gap-1">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cuotaForm.monto}
                  onChange={(e) =>
                    setCuotaForm((prev) => ({
                      ...prev,
                      monto: e.target.value,
                    }))
                  }
                  placeholder="100.00"
                />
              </div>

              <div className="grid gap-1">
                <Label>Moneda</Label>
                <Select
                  value={cuotaForm.moneda}
                  onValueChange={(v) =>
                    setCuotaForm((prev) => ({ ...prev, moneda: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="PEN">PEN</SelectItem>
                    <SelectItem value="CLP">CLP</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label>Estatus</Label>
                <Select
                  value={cuotaForm.estatus}
                  onValueChange={(v) =>
                    setCuotaForm((prev) => ({ ...prev, estatus: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estatus" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUOTA_ALLOWED_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatPaymentStatusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label>Fecha de pago</Label>
                <Input
                  type="datetime-local"
                  value={cuotaForm.fecha_pago}
                  onChange={(e) =>
                    setCuotaForm((prev) => ({
                      ...prev,
                      fecha_pago: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-1">
                <Label>Método</Label>
                <Input
                  value={cuotaForm.metodo}
                  onChange={(e) =>
                    setCuotaForm((prev) => ({
                      ...prev,
                      metodo: e.target.value,
                    }))
                  }
                  placeholder="card, transfer, cash..."
                />
              </div>

              <div className="grid gap-1 md:col-span-2">
                <Label>Referencia</Label>
                <Input
                  value={cuotaForm.referencia}
                  onChange={(e) =>
                    setCuotaForm((prev) => ({
                      ...prev,
                      referencia: e.target.value,
                    }))
                  }
                  placeholder="REF-001"
                />
              </div>

              <div className="grid gap-1 md:col-span-2">
                <Label>Concepto</Label>
                <Input
                  value={cuotaForm.concepto}
                  onChange={(e) =>
                    setCuotaForm((prev) => ({
                      ...prev,
                      concepto: e.target.value,
                    }))
                  }
                  placeholder="Pago cuota mensual"
                />
              </div>

              <div className="grid gap-1 md:col-span-2">
                <Label>Notas</Label>
                <Textarea
                  value={cuotaForm.notas}
                  onChange={(e) =>
                    setCuotaForm((prev) => ({
                      ...prev,
                      notas: e.target.value,
                    }))
                  }
                  placeholder="Notas adicionales..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCuotaModalOpen(false)}
              disabled={cuotaSaving}
            >
              Cancelar
            </Button>
            <Button onClick={saveCuota} disabled={cuotaSaving}>
              {cuotaSaving
                ? "Guardando..."
                : cuotaEditing
                  ? "Actualizar"
                  : "Crear cuota"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar eliminación de cuota */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuota?</AlertDialogTitle>
            <AlertDialogDescription>
              {cuotaToDelete
                ? `Estás a punto de eliminar la cuota "${
                    cuotaToDelete.cuota_codigo || cuotaToDelete.codigo
                  }" con monto ${formatMoney(
                    cuotaToDelete.monto,
                    cuotaToDelete.moneda || detail?.moneda,
                  )}. Esta acción no se puede deshacer.`
                : "¿Estás seguro de que deseas eliminar esta cuota?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cuotaDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCuota}
              disabled={cuotaDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cuotaDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "equipo", "student"]}>
      <DashboardLayout>
        <PaymentsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
