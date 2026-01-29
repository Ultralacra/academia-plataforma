"use client";

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
import { fetchUsers, type SysUser } from "../users/api";
import { toast } from "@/components/ui/use-toast";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Save,
  Check,
  X,
  Loader2,
} from "lucide-react";

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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a: Date, b: Date) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
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
  const [activeTab, setActiveTab] = useState<"pagos" | "cuotas">("pagos");

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
  const [cuotasMonth, setCuotasMonth] = useState<string>(() =>
    getMonthValue(new Date()),
  );
  const [cuotasLoadedMonth, setCuotasLoadedMonth] = useState<string | null>(
    null,
  );
  const [cuotasRows, setCuotasRows] = useState<PaymentCuotaRow[]>([]);
  const [cuotasPage, setCuotasPage] = useState<number>(1);
  const [cuotasTotalPages, setCuotasTotalPages] = useState<number>(1);
  const [cuotasTotal, setCuotasTotal] = useState<number>(0);
  const [cuotasLoading, setCuotasLoading] = useState(false);
  const [cuotasError, setCuotasError] = useState<string | null>(null);
  const cuotasReqIdRef = useRef(0);

  async function loadCuotas(opts: { page: number; append?: boolean }) {
    const range = getMonthRange(cuotasMonth);
    if (!range) {
      setCuotasError("Selecciona un mes válido");
      return;
    }

    const reqId = ++cuotasReqIdRef.current;
    setCuotasLoading(true);
    setCuotasError(null);
    try {
      const json = await getPaymentCuotas({
        fechaDesde: range.fechaDesde,
        fechaHasta: range.fechaHasta,
        page: opts.page,
        pageSize: CUOTAS_PAGE_SIZE,
      });

      if (cuotasReqIdRef.current !== reqId) return;

      const raw = Array.isArray(json?.data) ? json.data : [];
      // “Cuotas por vencer”: por defecto ocultamos PAGADA.
      const filtered = raw.filter((r) => {
        const s = String(r?.estatus ?? "").toLowerCase();
        if (!s) return true;
        return !s.includes("pagad");
      });

      setCuotasRows((prev) =>
        opts.append ? [...prev, ...filtered] : filtered,
      );
      setCuotasPage(Number(json?.page ?? opts.page) || opts.page);
      setCuotasTotalPages(Number(json?.totalPages ?? 1) || 1);
      setCuotasTotal(Number(json?.total ?? filtered.length) || 0);
      setCuotasLoadedMonth(cuotasMonth);
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
    try {
      // Obtener el pago actualizado
      const freshPayment = await getPaymentByCodigo(paymentCodigo);
      const paymentData = freshPayment?.data;
      if (!paymentData) return;

      const cuotas = Array.isArray(paymentData.detalles) ? paymentData.detalles : [];
      
      // Si no hay cuotas, no hacer nada
      if (cuotas.length === 0) return;

      // Verificar si todas las cuotas están pagadas
      const allPaid = cuotas.every((c: any) => {
        const status = String(c.estatus ?? "").toLowerCase().trim();
        return status === "pagado" || status === "pagada" || status === "listo";
      });

      // Verificar estatus actual del pago
      const currentStatus = String(paymentData.estatus ?? "").toLowerCase().trim();
      const isCurrentlyListo = currentStatus === "listo" || currentStatus === "pagado";

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
          title: newStatus === "listo" ? "¡Pago completado!" : "Pago en proceso",
          description: newStatus === "listo" 
            ? "Todas las cuotas han sido pagadas" 
            : "Hay cuotas pendientes de pago",
        });
      }
    } catch (e) {
      console.error("Error al verificar estatus del pago:", e);
    }
  }

  function openCuotaModal(cuota?: any) {
    if (cuota) {
      // Editar existente
      setCuotaEditing(cuota);
      setCuotaForm({
        cuota_codigo: cuota.cuota_codigo || "",
        monto: cuota.monto != null ? String(cuota.monto) : "",
        moneda: cuota.moneda || detail?.moneda || "USD",
        estatus: normalizePaymentStatus(cuota.estatus) || "pendiente",
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
        // Actualizar existente
        const payload = {
          codigo: cuotaEditing.codigo ?? null,
          cuota_codigo: cuotaForm.cuota_codigo.trim(),
          monto: monto,
          moneda: cuotaForm.moneda || "USD",
          estatus: normalizePaymentStatus(cuotaForm.estatus) || "pendiente",
          fecha_pago: cuotaForm.fecha_pago
            ? new Date(cuotaForm.fecha_pago).toISOString()
            : null,
          // El backend valida strings; evitar null (manda "" como en otras pantallas)
          metodo: cuotaForm.metodo.trim() || "",
          referencia: cuotaForm.referencia.trim() || "",
          concepto: cuotaForm.concepto.trim() || "",
          notas: cuotaForm.notas.trim() || "",
        };

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
        // Crear nueva
        const payload: CreateDetallePayload = {
          cuota_codigo: cuotaForm.cuota_codigo.trim(),
          monto: monto,
          moneda: cuotaForm.moneda || "USD",
          estatus: normalizePaymentStatus(cuotaForm.estatus) || "pendiente",
          fecha_pago: cuotaForm.fecha_pago
            ? new Date(cuotaForm.fecha_pago).toISOString()
            : undefined,
          metodo: cuotaForm.metodo.trim() || "",
          referencia: cuotaForm.referencia.trim() || "",
          concepto: cuotaForm.concepto.trim() || "",
          notas: cuotaForm.notas.trim() || "",
        };

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
        // No enviamos filtros al backend porque no los soporta
        // El filtrado se hace localmente
      });
      setRows(Array.isArray(json?.data) ? json.data : []);
      setTotal(Number(json?.total ?? 0));
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
        cliente_codigo: debouncedClienteCodigo.trim() || undefined,
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
        ? [...first.data]
        : [];

      for (let p = 2; p <= totalPagesFromApi; p++) {
        const next = await getPayments({
          page: p,
          pageSize: metricsPageSize,
          ...common,
        });
        if (metricsReqIdRef.current !== reqId) return;
        if (Array.isArray(next?.data) && next.data.length) {
          all.push(...next.data);
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

    // 1. Filtro por búsqueda de texto
    const searchTerm = debouncedSearch.trim().toLowerCase();
    const withSearch = searchTerm
      ? base.filter((r) => {
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
      : base;

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

    // 8. Ordenar por fecha de creación (más recientes primero)
    withReserva.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    // 9. Filtro por sincronización
    const withLinkFilter = onlyUnlinked
      ? withReserva.filter((r) => !isPaymentSynced(r))
      : withReserva;

    return withLinkFilter;
  }, [
    rows,
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
    const normalizedNextStatus = normalizePaymentStatus(nextStatus);
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
        fecha_pago: d?.fecha_pago ?? null,
        metodo: d?.metodo ? String(d.metodo) : "",
        referencia: d?.referencia ? String(d.referencia) : "",
        concepto: nextConcept || "",
        // Evitar null: el backend rechaza notas=null (manda "")
        notas: nextNotes.trim() ? nextNotes : "",
      };

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
    void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  ]);

  useEffect(() => {
    if (!syncOpen) return;
    void loadUsersList({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncOpen, debouncedSyncUserSearch]);

  useEffect(() => {
    if (activeTab !== "cuotas") return;
    if (cuotasLoadedMonth === cuotasMonth) return;
    void loadCuotas({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de pagos (lista + detalle)
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab((v as any) || "pagos")}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="cuotas">Cuotas por vencer</TabsTrigger>
        </TabsList>

        <TabsContent value="pagos" className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Métricas</div>
                <div className="text-xs text-muted-foreground">
                  Calculadas sobre todos los pagos que coinciden con los filtros
                  actuales.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={metricsLoading}
                onClick={() => loadMetrics()}
              >
                {metricsLoading ? "Calculando…" : "Recalcular"}
              </Button>
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
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="grid gap-1">
                  <Label>Buscar</Label>
                  <Input
                    placeholder="Nombre, código, estatus, moneda…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Cliente código</Label>
                  <Input
                    placeholder="KrTVx8TnoVSUcFZn"
                    value={clienteCodigo}
                    onChange={(e) => setClienteCodigo(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Estatus</Label>
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
                <div className="grid gap-1">
                  <Label>Método</Label>
                  <Input
                    placeholder="Transferencia / Tarjeta…"
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => loadList({ page: 1, pageSize })}
                  disabled={isLoading}
                >
                  {isLoading ? "Cargando…" : "Aplicar"}
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <div className="grid gap-1 md:col-span-1">
                <Label>Fecha desde</Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label>Fecha hasta</Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label>Monto min</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={montoMin}
                  onChange={(e) => setMontoMin(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label>Monto max</Label>
                <Input
                  inputMode="numeric"
                  placeholder="5000"
                  value={montoMax}
                  onChange={(e) => setMontoMax(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label>Reserva min</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={reservaMin}
                  onChange={(e) => setReservaMin(e.target.value)}
                />
              </div>
              <div className="grid gap-1 md:col-span-1">
                <Label>Reserva max</Label>
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
                {unlinkedCount ? (
                  <>
                    {" "}
                    · Sin sincronizar:{" "}
                    <span className="text-foreground">{unlinkedCount}</span>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={onlyUnlinked ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOnlyUnlinked((v) => !v)}
                >
                  {onlyUnlinked
                    ? "Viendo: sin sincronizar"
                    : "Ver sin sincronizar"}
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
                                <span className="text-xs text-muted-foreground">
                                  {fixMojibake(r.cliente_codigo)}
                                </span>
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
                            {synced ? (
                              <Badge
                                variant="outline"
                                className="border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60"
                              >
                                Sincronizado
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

        <TabsContent value="cuotas" className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-1">
                <Label>Mes</Label>
                <Input
                  type="month"
                  value={cuotasMonth}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCuotasMonth(next);
                    setCuotasLoadedMonth(null);
                    setCuotasRows([]);
                    setCuotasPage(1);
                    setCuotasTotalPages(1);
                    setCuotasTotal(0);
                    setCuotasError(null);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => loadCuotas({ page: 1 })}
                  disabled={cuotasLoading}
                >
                  {cuotasLoading ? "Cargando…" : "Buscar"}
                </Button>
              </div>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              {getMonthRange(cuotasMonth)
                ? `Rango: ${getMonthRange(cuotasMonth)!.fechaDesde} → ${
                    getMonthRange(cuotasMonth)!.fechaHasta
                  }`
                : "Selecciona un mes válido"}
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
                {cuotasRows.length}
                {cuotasTotal ? ` (total API: ${cuotasTotal})` : ""}
              </div>
              <div className="flex items-center gap-2">
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
                  {!cuotasRows.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">
                        {cuotasLoading
                          ? "Cargando…"
                          : "No hay cuotas para el mes seleccionado."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    cuotasRows.map((r) => {
                      const clientName = fixMojibake(r.cliente_nombre) || "—";
                      const cuotaCode =
                        String(r.cuota_codigo || r.codigo || "").trim() || "—";
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
                                <div className="text-xs text-muted-foreground">
                                  {fixMojibake(r.cliente_codigo)}
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
                            <Badge variant={getStatusVariant(r.estatus)}>
                              {formatPaymentStatusLabel(r.estatus)}
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
                              Ver
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
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openDeleteConfirm(d)}
                                    title="Eliminar cuota"
                                    className="text-destructive hover:text-destructive"
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
                                  const value = normalizePaymentStatus(
                                    detailEditStatusByKey[key] ?? current,
                                  );

                                  const opts = (() => {
                                    const set = new Set<string>(statusOptions);
                                    if (current) set.add(current);
                                    return Array.from(set).sort((a, b) =>
                                      a.localeCompare(b),
                                    );
                                  })();

                                  return (
                                    <div className="flex flex-col gap-1 min-w-[220px]">
                                      <Select
                                        key={`select-status-${key}`}
                                        value={value || ""}
                                        onValueChange={(v) => {
                                          const vLower =
                                            normalizePaymentStatus(v);
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
                    {ALLOWED_PAYMENT_STATUS.map((s) => (
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
    <ProtectedRoute allowedRoles={["admin", "coach", "equipo"]}>
      <DashboardLayout>
        <PaymentsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
