"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  CreditCard,
  Plus,
  Settings,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Pencil,
  Eye,
  Upload,
  FileText,
  History,
  Clock,
  Split,
  Gift,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  createPaymentDetail,
  createPaymentPlan,
  deletePaymentDetail,
  getPaymentPlansByClienteCodigo,
  getPaymentPlanByCodigo,
  updatePaymentDetail,
  updatePaymentPlan,
  type Payment,
} from "./api";
import {
  apiDetailToConfig,
  planToCreatePayload,
  planToUpdatePayload,
  type UiPaymentConfig,
} from "./payments-plan.mapper";
import {
  buildStandardScheduleFromCount,
  getStdPricing,
  isoPlusDays,
  labelForPlanType,
  type CrmPaymentCustomInstallment,
  type CrmPaymentPlanType,
  type CrmPaymentPricingPreset,
  CRM_PRODUCT_OPTIONS,
} from "./payment-plan-builder";
import { format, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { BONOS_CONTRACTUALES, BONOS_EXTRA } from "@/lib/bonos";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PaymentConfig = {
  planType?: CrmPaymentPlanType;
  pricingPreset?: CrmPaymentPricingPreset;
  program?: string;
  metodo?: string;
  tipo_pago?: string;
  frequency: "mensual" | "trimestral" | "semanal" | "unico";
  startDate: string;
  amount: number;
  currency: string;
  dayOfMonth?: number; // Para mensual
  hasReservation?: boolean;
  reservationAmount?: number;
  reservationDate?: string;
  installments: {
    id: string;
    cuotaCodigo?: string;
    date: string;
    amount: number;
    type: "regular" | "extra" | "bono" | "reserva";
    concept?: string;
  }[];
};

type ChangeLog = {
  id: string;
  date: string;
  action: string;
  details: string;
};

const DETAIL_STATUS_OPTIONS = [
  { value: "en_proceso", label: "En Proceso" },
  { value: "fallido", label: "Fallido" },
  { value: "listo", label: "Listo" },
  { value: "moroso", label: "Moroso" },
  { value: "no_aplica", label: "No Aplica" },
  { value: "pagado", label: "Pagado" },
  { value: "pendiente", label: "Pendiente" },
  { value: "pendiente_confirmar_pago", label: "Pendiente Confirmar Pago" },
  { value: "pendiente_por_cobrar", label: "Pendiente Por Cobrar" },
  { value: "reembolsado", label: "Reembolsado" },
] as const;

function normalizeDetailStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/__+/g, "_");
}

function isPaidStatusValue(value: unknown) {
  const v = normalizeDetailStatus(value);
  return ["pagado", "paid", "completed", "listo", "aprobado"].includes(v);
}

function detailStatusLabel(value: unknown) {
  const v = normalizeDetailStatus(value);
  const found = DETAIL_STATUS_OPTIONS.find((o) => o.value === v);
  if (found) return found.label;
  if (!v) return "Pendiente";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function detailStatusClass(value: unknown) {
  const v = normalizeDetailStatus(value);
  if (["pagado", "listo", "aprobado", "completed"].includes(v)) {
    return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
  }
  if (["fallido", "moroso"].includes(v)) {
    return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
  }
  if (["reembolsado"].includes(v)) {
    return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100";
  }
  if (
    ["pendiente_confirmar_pago", "pendiente_por_cobrar", "en_proceso"].includes(
      v,
    )
  ) {
    return "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100";
  }
  return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
}

export default function StudentPaymentsPage() {
  const { user } = useAuth();
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");
  const userRole = String((user as any)?.role ?? "").toLowerCase();
  const isStudent = userRole === "student";
  const ownStudentCode = String((user as any)?.codigo ?? "").trim();
  const canEdit = !isStudent;
  const canValidatePayment = canEdit || isStudent;
  const canAccessCurrentStudent =
    !isStudent ||
    (ownStudentCode && ownStudentCode.toLowerCase() === code.toLowerCase());

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [paymentCodigo, setPaymentCodigo] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [selectedDetalleCodigo, setSelectedDetalleCodigo] = useState<
    string | null
  >(null);

  // Modals
  const [configOpen, setConfigOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [addInstallmentOpen, setAddInstallmentOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState<string>("pendiente");
  const [selectedPaymentStatusSaving, setSelectedPaymentStatusSaving] =
    useState(false);

  // Form states
  const [newPayment, setNewPayment] = useState({
    monto: "",
    moneda: "USD",
    fecha_pago: new Date().toISOString().split("T")[0],
    metodo_pago: "transferencia",
    referencia: "",
    observaciones: "",
    comprobante_url: "",
  });

  const [newInstallment, setNewInstallment] = useState<{
    type: "regular" | "extra" | "bono";
    amount: string;
    date: string;
    concept: string;
  }>({
    type: "extra",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    concept: "",
  });

  const [tempConfig, setTempConfig] = useState<PaymentConfig>({
    planType: "contado",
    pricingPreset: "descuento",
    program: "HOTSELLING PRO",
    metodo: "transfer",
    frequency: "unico",
    startDate: new Date().toISOString().split("T")[0],
    amount: 0,
    currency: "USD",
    hasReservation: false,
    reservationAmount: 0,
    reservationDate: new Date().toISOString().split("T")[0],
    installments: [],
  });

  function nextCuotaCodigo(insts: Array<{ cuotaCodigo?: string }>) {
    let max = 0;
    for (const it of insts) {
      const v = String(it?.cuotaCodigo || "");
      const m = v.match(/^CUOTA_(\d{1,})$/);
      if (m) max = Math.max(max, Number(m[1]) || 0);
    }
    const next = max + 1;
    return `CUOTA_${String(next).padStart(3, "0")}`;
  }

  function ymdPlusDays(ymd: string, days: number) {
    const base = String(ymd || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return isoPlusDays(days);
    try {
      const d = new Date(`${base}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) return isoPlusDays(days);
      return format(addDays(d, days), "yyyy-MM-dd");
    } catch {
      return isoPlusDays(days);
    }
  }

  function normalizeScheduleInstallments(next: PaymentConfig["installments"]) {
    const base = (next || []).filter((i) => i.type !== "bono");
    return base.map((it, idx) => ({
      ...it,
      type: (it.type || "regular") as any,
      cuotaCodigo: `CUOTA_${String(idx + 1).padStart(3, "0")}`,
      concept:
        String(it.concept || "").trim() ||
        ((it.type || "regular") === "reserva" ? "Reserva" : `Cuota ${idx + 1}`),
      amount: Number(it.amount || 0),
      date: String(it.date || ""),
    }));
  }

  const [initialBonuses, setInitialBonuses] = useState<
    { name: string; amount: number }[]
  >([]);
  const [newBono, setNewBono] = useState({ name: "", amount: "" });
  const [bonoSelectValue, setBonoSelectValue] = useState("");

  // State for editing installments
  const [editingInstallments, setEditingInstallments] = useState<
    PaymentConfig["installments"]
  >([]);

  // Recalculate state
  const [recalcPopoverOpen, setRecalcPopoverOpen] = useState(false);
  const [recalcDate, setRecalcDate] = useState("");

  // Split state
  const [splitPopoverOpen, setSplitPopoverOpen] = useState<string | null>(null);
  const [splitData, setSplitData] = useState<{
    parts: number;
    dates: string[];
  }>({
    parts: 2,
    dates: [],
  });

  useEffect(() => {
    if (!canAccessCurrentStudent) {
      setLoading(false);
      setConfig(null);
      setPayments([]);
      setPaymentCodigo(null);
      return;
    }
    loadData();
    loadLogs();
  }, [code, canAccessCurrentStudent]);

  async function loadData() {
    setLoading(true);
    try {
      // 1) Listar planes por cliente_codigo (código del alumno)
      const list = await getPaymentPlansByClienteCodigo(code, {
        page: 1,
        pageSize: 100,
        search: "",
      });
      const plans = Array.isArray(list) ? list : (list as any)?.data;
      const planRow = Array.isArray(plans)
        ? (plans.find(
            (p: any) =>
              String(p?.cliente_codigo ?? "").toLowerCase() ===
              code.toLowerCase(),
          ) ?? plans[0])
        : null;

      const planCodigo = String(planRow?.codigo ?? "").trim();
      if (!planCodigo) {
        setConfig(null);
        setPaymentCodigo(null);
        setPayments([]);
        return;
      }

      // 2) Consultar detalle del plan por su codigo (NO por el id/código del alumno)
      const rawDetail = await getPaymentPlanByCodigo(planCodigo);
      const plan = (rawDetail as any)?.data ?? rawDetail;
      setPaymentCodigo(planCodigo);

      // Extraer nombre y correo del cliente desde los datos disponibles
      const nameCandidates = [
        planRow?.cliente_nombre,
        planRow?.nombre,
        (plan as any)?.cliente_nombre,
        (plan as any)?.nombre,
        (plan as any)?.nombre_cliente,
        (plan as any)?.alumno_nombre,
      ];
      const emailCandidates = [
        planRow?.email,
        planRow?.correo,
        (plan as any)?.email,
        (plan as any)?.cliente_email,
        (plan as any)?.contact_email,
        (plan as any)?.correo,
      ];
      const resolvedName = nameCandidates.find((v) => v && String(v).trim());
      let resolvedEmail = emailCandidates.find((v) => v && String(v).trim());
      setStudentName(resolvedName ? String(resolvedName).trim() : null);
      setStudentEmail(resolvedEmail ? String(resolvedEmail).trim() : null);

      // Si no encontramos email en el plan, consultar /users/:codigo para obtener datos completos
      if (!resolvedEmail && code) {
        try {
          const userResp: any = await apiFetch(
            `/users/${encodeURIComponent(code)}`,
          );
          const user = (userResp && (userResp.data ?? userResp)) || null;
          if (user) {
            const userEmail =
              user.email ||
              user.correo ||
              user.contact_email ||
              user.email_address;
            const userName = user.name || user.nombre || user.fullname;
            if (userEmail) {
              resolvedEmail = String(userEmail).trim();
              setStudentEmail(resolvedEmail);
            }
            if (userName && !resolvedName) {
              setStudentName(String(userName).trim());
            }
          }
        } catch (e) {
          // no bloquear la vista por fallo de este request
          console.warn("[Pagos] Error consultando /users/:codigo", e);
        }
      }
      // Debug: imprimir en consola datos crudos y resueltos del alumno
      try {
        console.info("[Pagos] Alumno datos (candidates):", {
          code,
          planRow,
          plan,
          resolvedName,
          resolvedEmail,
          studentName: resolvedName ? String(resolvedName).trim() : null,
          studentEmail: resolvedEmail ? String(resolvedEmail).trim() : null,
        });
      } catch (err) {
        console.error("[Pagos] Error al imprimir datos del alumno", err);
      }

      // Cargar config desde el plan (cuotas/detalles) y renderizar en campos
      const cfg = apiDetailToConfig(
        code,
        plan as any,
      ) as unknown as UiPaymentConfig;
      setConfig(cfg as any);

      // Historial de pagos: solo cuotas marcadas como pagadas/listas
      const detalles: any[] = Array.isArray(plan?.detalles)
        ? plan.detalles
        : Array.isArray(plan?.details)
          ? plan.details
          : [];
      const paidPayments: Payment[] = detalles.map((d) => ({
        id: d?.codigo ?? d?.id ?? Math.random().toString(36),
        codigo_cliente: code,
        monto: d?.monto ?? 0,
        moneda: d?.moneda ?? plan?.moneda ?? "USD",
        fecha_pago: d?.fecha_pago ?? "",
        metodo_pago: d?.metodo ?? "",
        estado: String(d?.estatus ?? "pendiente"),
        referencia: d?.referencia ?? undefined,
        comprobante_url: undefined,
        observaciones: d?.concepto || d?.notas || undefined,
        created_at: d?.created_at ?? undefined,
      }));
      setPayments(paidPayments);
      // Imprimir en consola las fechas (y códigos) de las cuotas que faltan por pagar
      try {
        const unpaid = detalles.filter((d) => !isPaidStatusValue(d?.estatus));
        const unpaidDates = unpaid.map((d) => ({
          cuota: d?.cuota_codigo ?? d?.codigo ?? null,
          date: (d?.fecha_pago || "").slice(0, 10) || null,
          monto: d?.monto ?? null,
          estatus: d?.estatus ?? null,
        }));
        console.info("[Pagos] Cuotas pendientes fechas:", unpaidDates);
      } catch (err) {
        console.error("[Pagos] Error calculando cuotas pendientes", err);
      }
    } catch (e) {
      console.error("Error cargando plan de pagos", e);
      setConfig(null);
      setPaymentCodigo(null);
      setPayments([]);
    }
    setLoading(false);
  }

  function loadLogs() {
    try {
      const raw = localStorage.getItem(`payment-logs-${code}`);
      if (raw) {
        setLogs(JSON.parse(raw));
      }
    } catch {}
  }

  async function saveConfig() {
    if (!canEdit) return;
    const planType = (tempConfig.planType || "contado") as CrmPaymentPlanType;
    const preset = (tempConfig.pricingPreset ||
      "descuento") as CrmPaymentPricingPreset;
    const program = String(tempConfig.program || "HOTSELLING PRO");

    const installments: PaymentConfig["installments"] = [];
    const std = getStdPricing(program, preset);

    const normalizeNumber = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const fromModal = Array.isArray(tempConfig.installments)
      ? normalizeScheduleInstallments(tempConfig.installments)
      : [];

    if (fromModal.length > 0) {
      installments.push(...fromModal);
    } else if (planType === "contado") {
      const total =
        normalizeNumber(tempConfig.amount) ||
        (std?.stdCash ? Number(std.stdCash) : 0);
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        cuotaCodigo: "CUOTA_001",
        date: isoPlusDays(0),
        amount: total,
        type: "regular" as const,
        concept: "Pago total",
      });
    } else if (planType === "cuotas") {
      const stdCount = std?.stdInstallments?.count ?? 0;
      const stdAmount = std?.stdInstallments?.amount ?? 0;
      const desiredTotal = normalizeNumber(tempConfig.amount);

      const count = stdCount || 2;
      const per = desiredTotal > 0 ? desiredTotal / count : stdAmount;
      const perRounded = Math.round(per * 100) / 100;

      const schedule = buildStandardScheduleFromCount(
        [],
        count,
        String(perRounded),
      );
      schedule.forEach((it, idx) => {
        const a = Number(String(it.amount || "0"));
        installments.push({
          id: String(it.id || Math.random().toString(36).substr(2, 9)),
          cuotaCodigo: `CUOTA_${String(idx + 1).padStart(3, "0")}`,
          date: it.dueDate || isoPlusDays(idx * 30),
          amount: Number.isFinite(a) ? a : 0,
          type: "regular" as const,
          concept: `Cuota ${idx + 1}`,
        });
      });
    } else if (planType === "excepcion_2_cuotas") {
      const total = normalizeNumber(tempConfig.amount);
      const nowId = Date.now();
      const first = total > 0 ? Math.round((total / 2) * 100) / 100 : 0;
      const custom: CrmPaymentCustomInstallment[] = [
        { id: `ci_0_${nowId}`, amount: String(first), dueDate: isoPlusDays(0) },
        {
          id: `ci_1_${nowId}`,
          amount: String(first),
          dueDate: isoPlusDays(30),
        },
      ];
      custom.forEach((it, idx) => {
        const a = Number(String(it.amount || "0"));
        installments.push({
          id: it.id,
          cuotaCodigo: `CUOTA_${String(idx + 1).padStart(3, "0")}`,
          date: it.dueDate,
          amount: Number.isFinite(a) ? a : 0,
          type: "regular" as const,
          concept: `Cuota ${idx + 1}`,
        });
      });
    } else {
      // reserva
      const total = normalizeNumber(tempConfig.amount);
      const reserva = normalizeNumber(tempConfig.reservationAmount);
      const paidDate = tempConfig.reservationDate || isoPlusDays(0);
      const remaining = Math.max(0, total - reserva);

      if (reserva > 0) {
        installments.push({
          id: Math.random().toString(36).substr(2, 9),
          cuotaCodigo: "CUOTA_001",
          date: paidDate,
          amount: reserva,
          type: "reserva" as const,
          concept: "Reserva",
        });
      }
      if (remaining > 0) {
        installments.push({
          id: Math.random().toString(36).substr(2, 9),
          cuotaCodigo: reserva > 0 ? "CUOTA_002" : "CUOTA_001",
          date: isoPlusDays(30),
          amount: remaining,
          type: "regular" as const,
          concept: "Saldo pendiente",
        });
      }
    }

    // Add bonuses as installments
    initialBonuses.forEach((bono) => {
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        date: installments[0]?.date || isoPlusDays(0),
        amount: bono.amount,
        type: "bono" as const,
        concept: bono.name,
      });
    });

    const baseTotal = installments
      .filter((i) => i.type !== "bono")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const totalWithBonuses =
      baseTotal + initialBonuses.reduce((sum, b) => sum + b.amount, 0);

    const newConfig: PaymentConfig = {
      ...tempConfig,
      currency: "USD",
      metodo: String(tempConfig.metodo || "transfer"),
      tipo_pago: planType,
      planType,
      pricingPreset: preset,
      program,
      frequency:
        planType === "contado"
          ? "unico"
          : planType === "cuotas"
            ? "mensual"
            : planType === "excepcion_2_cuotas"
              ? "mensual"
              : "unico",
      startDate: installments[0]?.date || isoPlusDays(0),
      hasReservation: planType === "reserva",
      amount: totalWithBonuses,
      installments,
    };
    // Persistir en backend:
    try {
      if (paymentCodigo) {
        await updatePaymentPlan(
          paymentCodigo,
          planToUpdatePayload(code, newConfig as any),
        );
      } else {
        const created = await createPaymentPlan(
          planToCreatePayload(code, newConfig as any),
        );
        const createdCodigo = String(
          (created as any)?.codigo ?? (created as any)?.payment_codigo ?? "",
        ).trim();
        setPaymentCodigo(createdCodigo || null);
      }

      await loadData();
      setConfigOpen(false);
      toast({ title: "Configuración guardada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error guardando plan de pagos", variant: "destructive" });
    }
  }

  function openRegisterModal() {
    if (!canEdit) return;
    // Find first unpaid installment
    const nextUnpaid = upcomingPayments.find((p) => p.status !== "paid");
    if (nextUnpaid) {
      setSelectedDetalleCodigo(nextUnpaid.detalleCodigo || null);
      setNewPayment({
        monto: String(nextUnpaid.amount),
        moneda: config?.currency || "USD",
        fecha_pago: format(nextUnpaid.date, "yyyy-MM-dd"),
        metodo_pago: "transferencia",
        referencia: "",
        observaciones: `Pago cuota ${format(nextUnpaid.date, "dd/MM/yyyy")}`,
        comprobante_url: "",
      });
    } else {
      setSelectedDetalleCodigo(null);
      // Default empty
      setNewPayment({
        monto: "",
        moneda: config?.currency || "USD",
        fecha_pago: new Date().toISOString().split("T")[0],
        metodo_pago: "transferencia",
        referencia: "",
        observaciones: "",
        comprobante_url: "",
      });
    }
    setRegisterOpen(true);
  }

  function handleValidatePayment(
    detalleCodigo: string,
    amount: number,
    date: Date,
  ) {
    if (!canValidatePayment) return;
    setSelectedDetalleCodigo(String(detalleCodigo || "").trim() || null);
    setNewPayment({
      ...newPayment,
      monto: String(amount),
      fecha_pago: format(date, "yyyy-MM-dd"),
      observaciones: `Pago cuota ${format(date, "dd/MM/yyyy")}`,
      comprobante_url: "",
    });
    setRegisterOpen(true);
  }

  async function handleSendPaymentReminder(
    detalleCodigo: string,
    cuotaCodigo: string,
    date: Date,
    amount: number,
  ) {
    if (!canEdit) return;
    if (!studentEmail) {
      toast({ title: "No hay correo del alumno", variant: "destructive" });
      return;
    }

    try {
      const formattedDate = format(new Date(date), "dd 'de' MMM yyyy", {
        locale: es,
      });
      const subject = `Recordatorio de pago: cuota ${cuotaCodigo} vence ${formattedDate}`;

      const body = {
        template: "payment_reminder",
        recipients: [
          {
            email: studentEmail,
            name: studentName ?? undefined,
          },
        ],
        subject,
        appName: "Hotselling",
        origin:
          typeof window !== "undefined" ? window.location.origin : undefined,
        portalLink:
          typeof window !== "undefined"
            ? window.location.origin + "/login"
            : undefined,
        payment: {
          cuotaCodigo: String(cuotaCodigo || ""),
          dueDate: format(new Date(date), "yyyy-MM-dd"),
          amount: amount,
        },
      } as any;

      const token = getAuthToken();

      const res = await fetch("/api/brevo/send-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const jsonRes = await res
        .json()
        .catch(() => ({ status: "error", message: "Respuesta inválida" }));
      if (!res.ok || jsonRes?.status !== "success") {
        console.error("[Pagos] Error enviando mail", jsonRes);
        toast({
          title: "Error enviando mail",
          description: String(jsonRes?.message ?? "Error"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Correo enviado",
        description: `Notificación enviada a ${studentEmail}`,
      });
    } catch (e) {
      console.error("[Pagos] Excepción enviando mail", e);
      toast({ title: "Error enviando mail", variant: "destructive" });
    }
  }

  function handleSplitInstallment(originalId: string) {
    const originalIndex = editingInstallments.findIndex(
      (i) => i.id === originalId,
    );
    if (originalIndex === -1) return;

    const original = editingInstallments[originalIndex];
    const parts = splitData.parts;

    if (parts < 2) {
      toast({
        title: "Error",
        description: "Debe dividir en al menos 2 partes",
        variant: "destructive",
      });
      return;
    }

    // Validate dates: "sin pasar la fecha de la cuota original"
    const originalDateObj = new Date(original.date);
    // Ensure we have enough dates, fill with original date if missing
    const datesToUse = [...splitData.dates];
    while (datesToUse.length < parts) {
      datesToUse.push(original.date);
    }

    for (const dStr of datesToUse) {
      if (new Date(dStr) > originalDateObj) {
        toast({
          title: "Fecha inválida",
          description:
            "Las fechas de las partes no pueden ser posteriores a la fecha original.",
          variant: "destructive",
        });
        return;
      }
    }

    const amountPerPart = original.amount / parts;
    const newInstallmentsToAdd = [];

    for (let i = 0; i < parts; i++) {
      newInstallmentsToAdd.push({
        ...original,
        id: i === 0 ? original.id : Math.random().toString(36).substr(2, 9),
        amount: amountPerPart,
        date: datesToUse[i],
        concept: `${original.concept || "Cuota"} (Parte ${i + 1}/${parts})`,
      });
    }

    const newInstallments = [...editingInstallments];
    newInstallments.splice(originalIndex, 1, ...newInstallmentsToAdd);

    setEditingInstallments(newInstallments);
    setSplitPopoverOpen(null);
    setSplitData({ parts: 2, dates: [] });
    toast({ title: "Cuota dividida exitosamente" });
  }

  function handleDateChange(index: number, newDate: string) {
    const newInst = [...editingInstallments];
    newInst[index].date = newDate;
    setEditingInstallments(newInst);
  }

  function handleRecalculateDates(startDate: string) {
    if (!startDate) return;

    const newInst = [...editingInstallments];

    // Find first unpaid installment
    const firstUnpaidIndex = newInst.findIndex((i) => !isInstallmentPaid(i));

    if (firstUnpaidIndex === -1) {
      toast({
        title: "No hay cuotas pendientes para recalcular",
        variant: "destructive",
      });
      return;
    }

    const oldDate = new Date(newInst[firstUnpaidIndex].date);
    const newStart = new Date(startDate);
    const diffTime = newStart.getTime() - oldDate.getTime();

    // Apply shift to all unpaid installments starting from the first one found
    for (let i = firstUnpaidIndex; i < newInst.length; i++) {
      if (!isInstallmentPaid(newInst[i])) {
        const current = new Date(newInst[i].date);
        const shifted = new Date(current.getTime() + diffTime);
        newInst[i].date = shifted.toISOString().split("T")[0];
      }
    }

    setEditingInstallments(newInst);
    setRecalcPopoverOpen(false);
    toast({ title: "Fechas recalculadas" });
  }

  async function saveEditedPlan() {
    if (!canEdit) return;
    if (!config) return;
    if (!paymentCodigo) {
      toast({
        title: "No hay plan en backend",
        description: "Guarda el plan primero para poder actualizarlo.",
        variant: "destructive",
      });
      return;
    }

    // Generate logs
    const newLogs: ChangeLog[] = [];
    const now = new Date().toISOString();

    // Check for changes in existing installments
    config.installments.forEach((oldInst) => {
      const newInst = editingInstallments.find((i) => i.id === oldInst.id);
      if (newInst) {
        if (oldInst.date !== newInst.date) {
          newLogs.push({
            id: Math.random().toString(36),
            date: now,
            action: "Cambio de fecha",
            details: `Cuota ${new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: config.currency,
            }).format(oldInst.amount)}: Fecha cambiada de ${oldInst.date} a ${
              newInst.date
            }`,
          });
        }
        if (oldInst.amount !== newInst.amount) {
          newLogs.push({
            id: Math.random().toString(36),
            date: now,
            action: "Cambio de monto",
            details: `Cuota del ${oldInst.date}: Monto cambiado de ${oldInst.amount} a ${newInst.amount}`,
          });
        }
      } else {
        // Check if it was split (exists but with different ID? No, split keeps one ID and adds another)
        // If ID is gone, it was deleted.
      }
    });

    // Check for new installments (splits or adds)
    editingInstallments.forEach((newInst) => {
      const oldInst = config.installments.find((i) => i.id === newInst.id);
      if (!oldInst) {
        newLogs.push({
          id: Math.random().toString(36),
          date: now,
          action: "Cuota agregada/dividida",
          details: `Nueva cuota de ${newInst.amount} para el ${newInst.date}`,
        });
      }
    });

    const updatedLogs = [...newLogs, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(`payment-logs-${code}`, JSON.stringify(updatedLogs));

    // Recalculate total amount
    const newTotal = editingInstallments.reduce(
      (sum, inst) => sum + (Number.isFinite(inst.amount) ? inst.amount : 0),
      0,
    );

    const newConfig = {
      ...config,
      amount: newTotal,
      installments: editingInstallments,
    };
    try {
      // 1) Update del plan principal
      await updatePaymentPlan(
        paymentCodigo,
        planToUpdatePayload(code, newConfig as any),
      );

      // 2) Sync de cuotas/detalles: update (upsert) y delete
      const prev = (config.installments || []).filter((i) => i.type !== "bono");
      const next = (editingInstallments || []).filter((i) => i.type !== "bono");
      const nextIds = new Set(next.map((i) => i.id));
      const deleted = prev.filter((i) => !nextIds.has(i.id));

      const prevIds = new Set(prev.map((i) => i.id));
      const added = next.filter((i) => !prevIds.has(i.id));
      const existing = next.filter((i) => prevIds.has(i.id));

      const toMetodo = (m: string) => {
        const v = String(m || "").toLowerCase();
        if (v.includes("tarjeta") || v.includes("card")) return "card";
        return "transfer";
      };

      const metodoPlan = toMetodo((config as any)?.metodo ?? "transfer");
      const monedaPlan = config.currency || "USD";

      for (const inst of existing) {
        await updatePaymentDetail(paymentCodigo, inst.id, {
          cuota_codigo:
            String((inst as any)?.cuotaCodigo || "").trim() || undefined,
          monto: Number(inst.amount || 0),
          moneda: monedaPlan,
          estatus: "pendiente",
          fecha_pago: inst.date ? `${inst.date}T00:00:00Z` : undefined,
          metodo: metodoPlan,
          referencia: "",
          concepto: inst.concept || "",
          notas: "",
        });
      }

      for (const inst of added) {
        await createPaymentDetail(paymentCodigo, {
          cuota_codigo:
            String((inst as any)?.cuotaCodigo || "").trim() ||
            nextCuotaCodigo(next),
          monto: Number(inst.amount || 0),
          moneda: monedaPlan,
          estatus: "pendiente",
          fecha_pago: inst.date
            ? `${inst.date}T00:00:00Z`
            : new Date().toISOString(),
          metodo: metodoPlan,
          referencia: "",
          concepto: inst.concept || "",
          notas: "",
        });
      }

      for (const inst of deleted) {
        await deletePaymentDetail(paymentCodigo, inst.id);
      }

      await loadData();
      setEditPlanOpen(false);
      toast({
        title: "Plan de pagos actualizado",
        description: `Nuevo total del programa: ${new Intl.NumberFormat(
          "es-CO",
          {
            style: "currency",
            currency: config.currency,
          },
        ).format(newTotal)}`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Error actualizando plan", variant: "destructive" });
    }
  }

  function handleAddInstallment() {
    if (!canEdit) return;
    const amount = Number(newInstallment.amount);
    if (!newInstallment.date) {
      toast({
        title: "Fecha requerida",
        description: "Selecciona una fecha para la cuota.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Ingresa un monto mayor a 0.",
        variant: "destructive",
      });
      return;
    }

    setEditingInstallments([
      ...editingInstallments,
      {
        id: Math.random().toString(36).substr(2, 9),
        date: newInstallment.date,
        amount,
        type: newInstallment.type,
        concept: newInstallment.concept,
        cuotaCodigo: nextCuotaCodigo(editingInstallments),
      },
    ]);
    setAddInstallmentOpen(false);
    // Reset form
    setNewInstallment({
      type: "extra",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      concept: "",
    });
  }

  function openEditPlan() {
    if (!canEdit) return;
    if (config) {
      setEditingInstallments([...config.installments]);
      setEditPlanOpen(true);
    }
  }

  function openConfigBuilder() {
    if (!canEdit) return;
    setTempConfig((prev) => {
      const base = config;
      return {
        ...prev,
        ...(base ? (base as any) : {}),
        currency: "USD",
        metodo: String((base as any)?.metodo ?? prev.metodo ?? "transfer"),
        // Mantener cuotas actuales para editarlas dentro del modal (como CRM)
        installments: Array.isArray((base as any)?.installments)
          ? ([...(base as any).installments] as any)
          : prev.installments,
      };
    });
    setConfigOpen(true);
  }

  async function handleRegisterPayment() {
    if (!canValidatePayment) return;
    try {
      if (!paymentCodigo) {
        toast({
          title: "No hay plan en backend",
          description: "Crea/guarda el plan antes de registrar pagos.",
          variant: "destructive",
        });
        return;
      }

      const detalleCodigo = String(selectedDetalleCodigo || "").trim();
      const match = detalleCodigo
        ? (config?.installments || []).find(
            (i) => String(i.id) === detalleCodigo,
          )
        : null;

      if (!detalleCodigo || !match) {
        toast({
          title: "No se encontró una cuota",
          description:
            "Selecciona una cuota con 'Validar' para editar ese detalle.",
          variant: "destructive",
        });
        return;
      }

      const targetDate = newPayment.fecha_pago;
      const targetAmount = Number(newPayment.monto || 0);

      const toMetodo = (m: string) => {
        const v = String(m || "").toLowerCase();
        if (v.includes("tarjeta") || v.includes("card")) return "card";
        return "transfer";
      };

      await updatePaymentDetail(paymentCodigo, detalleCodigo, {
        cuota_codigo:
          String((match as any)?.cuotaCodigo || "").trim() || undefined,
        monto: targetAmount,
        moneda: newPayment.moneda || (config?.currency ?? "USD"),
        estatus: isStudent ? "pendiente" : "listo",
        // Usar mediodía UTC para evitar desfases por zona horaria
        fecha_pago: targetDate ? `${targetDate}T12:00:00Z` : undefined,
        metodo: toMetodo(newPayment.metodo_pago),
        referencia: newPayment.referencia || "",
        concepto: match.concept || "Ajuste de cuota",
        notas: newPayment.observaciones || "",
      });

      await loadData();

      if (isStudent) {
        toast({
          title: "Comprobante enviado",
          description:
            "Tu pago quedó en pendiente para validación de admin/equipo.",
        });
      } else {
        toast({
          title: "Pago registrado exitosamente",
          description: "El pago ha sido validado y registrado en el sistema.",
          className: "bg-green-50 border-green-200 text-green-800",
        });
      }
      setRegisterOpen(false);
      setSelectedDetalleCodigo(null);
      // Reset form
      setNewPayment({
        monto: config ? String(config.amount) : "",
        moneda: config ? config.currency : "USD",
        fecha_pago: new Date().toISOString().split("T")[0],
        metodo_pago: "transferencia",
        referencia: "",
        observaciones: "",
        comprobante_url: "",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al registrar pago", variant: "destructive" });
    }
  }

  // Helper to check if installment is paid (for edit modal)
  const isInstallmentPaid = (inst: any) => {
    const d = new Date(inst.date);
    return payments.some((p) => {
      if (!isPaidStatusValue(p.estado)) return false;
      const pDate = new Date(p.fecha_pago);
      const diff = Math.abs(pDate.getTime() - d.getTime());
      // Match if within 5 days and amount is similar (heuristic)
      return diff < 86400000 * 5 && Math.abs(Number(p.monto) - inst.amount) < 1;
    });
  };

  // Generar próximos pagos estimados
  const upcomingPayments = useMemo(() => {
    if (!config || !config.installments) return [];

    // Create a copy of payments to track usage
    // We need to track which payment IDs have been used
    const usedPaymentIds = new Set<string>();

    // Sort installments by date to match earliest first
    const sortedInstallments = [...config.installments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return sortedInstallments.map((inst) => {
      const d = new Date(inst.date);
      const now = new Date();

      // Find a matching payment that hasn't been used yet
      const matchingPayment = payments.find((p) => {
        if (usedPaymentIds.has(String(p.id))) return false;
        if (!isPaidStatusValue(p.estado)) return false;

        const pDate = new Date(p.fecha_pago);
        const diff = Math.abs(pDate.getTime() - d.getTime());
        const amountMatch = Math.abs(Number(p.monto) - inst.amount) < 1; // Allow small float diff

        // Match if within 5 days AND amount matches
        return diff < 86400000 * 5 && amountMatch;
      });

      let isPaid = false;
      if (matchingPayment) {
        isPaid = true;
        usedPaymentIds.add(String(matchingPayment.id));
      }

      const daysDiff = differenceInDays(d, now);
      const isNearDue = !isPaid && daysDiff <= 5 && daysDiff >= 0;

      return {
        detalleCodigo: String(inst.id),
        cuotaCodigo: String((inst as any)?.cuotaCodigo || ""),
        date: d,
        amount: inst.amount,
        type: inst.type || "regular",
        concept: inst.concept,
        status: isPaid ? "paid" : d < now ? "overdue" : "pending",
        isNearDue,
      };
    });
  }, [config, payments]);

  // Calculate totals
  const totalPaid = useMemo(() => {
    return payments
      .filter((p) => p.estado === "completed" || p.estado === "aprobado")
      .reduce((sum, p) => sum + Number(p.monto), 0);
  }, [payments]);

  const remainingBalance = useMemo(() => {
    if (!config) return 0;
    return Math.max(0, config.amount - totalPaid);
  }, [config, totalPaid]);

  const bonuses = useMemo(() => {
    if (!config) return [];
    return config.installments.filter((i) => i.type === "bono");
  }, [config]);

  useEffect(() => {
    if (!selectedPayment) return;
    setSelectedPaymentStatus(
      normalizeDetailStatus(selectedPayment.estado || "pendiente") ||
        "pendiente",
    );
  }, [selectedPayment]);

  async function handleUpdateSelectedPaymentStatus() {
    if (!canEdit) return;
    if (!paymentCodigo || !selectedPayment?.id) {
      toast({
        title: "No se pudo actualizar",
        description: "Falta el código del plan o del detalle.",
        variant: "destructive",
      });
      return;
    }

    const nextStatus =
      normalizeDetailStatus(selectedPaymentStatus) || "pendiente";

    try {
      setSelectedPaymentStatusSaving(true);
      await updatePaymentDetail(paymentCodigo, String(selectedPayment.id), {
        estatus: nextStatus,
      });

      await loadData();
      setSelectedPayment((prev) =>
        prev ? { ...prev, estado: nextStatus } : prev,
      );

      toast({
        title: "Estatus actualizado",
        description: `La cuota quedó en ${detailStatusLabel(nextStatus)}.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al actualizar estatus",
        variant: "destructive",
      });
    } finally {
      setSelectedPaymentStatusSaving(false);
    }
  }

  if (!canAccessCurrentStudent) {
    return (
      <ProtectedRoute allowedRoles={["admin", "coach", "equipo", "student"]}>
        <DashboardLayout>
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No tienes permisos para ver el seguimiento de pagos de otro
              alumno.
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "equipo", "student"]}>
      <DashboardLayout>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Seguimiento de pagos
            </h1>
            {(studentName || studentEmail) && (
              <p className="text-sm text-muted-foreground mt-1">
                {studentName && (
                  <span className="font-medium">{studentName}</span>
                )}
                {studentEmail && <span className="ml-3">{studentEmail}</span>}
              </p>
            )}
            {isStudent ? (
              <p className="text-xs text-muted-foreground mt-1">
                Vista de alumno: solo lectura de tu seguimiento de pagos.
              </p>
            ) : null}
          </div>
          {canEdit ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={openConfigBuilder}>
                <Settings className="w-4 h-4 mr-2" />
                {config ? "Configurar plan" : "Configuración inicial"}
              </Button>
              <Button onClick={openRegisterModal}>
                <Plus className="w-4 h-4 mr-2" /> Registrar pago
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Próximos pagos / Plan */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Plan de pagos
                  </div>
                  {config && canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={openEditPlan}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!config ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <p>No hay configuración de pagos.</p>
                    {canEdit ? (
                      <Button
                        variant="link"
                        onClick={openConfigBuilder}
                        className="mt-2"
                      >
                        Iniciar configuración
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">
                        {labelForPlanType(
                          (config.planType ??
                            (config.hasReservation
                              ? "reserva"
                              : config.frequency === "unico"
                                ? "contado"
                                : "cuotas")) as CrmPaymentPlanType,
                        )}
                      </span>
                    </div>
                    {config.pricingPreset && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tarifa:</span>
                        <span className="capitalize font-medium">
                          {config.pricingPreset}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Monto total:
                      </span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: config.currency,
                          maximumFractionDigits: 0,
                        }).format(config.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pagado:</span>
                      <span className="font-medium text-green-600">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: config.currency,
                          maximumFractionDigits: 0,
                        }).format(totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Pendiente por pagar:
                      </span>
                      <span className="font-bold text-red-600">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: config.currency,
                          maximumFractionDigits: 0,
                        }).format(remainingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Inicio:</span>
                      <span>
                        {format(new Date(config.startDate), "dd MMM yyyy", {
                          locale: es,
                        })}
                      </span>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium mb-3">
                        Próximos vencimientos
                      </h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {upcomingPayments.map((item, i) => {
                          const isNextToPay = !upcomingPayments
                            .slice(0, i)
                            .some((p) => p.status !== "paid");

                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-2 rounded border text-sm ${
                                item.status === "paid"
                                  ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900"
                                  : item.status === "overdue"
                                    ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900"
                                    : item.isNearDue
                                      ? "bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900"
                                      : "bg-card"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {item.status === "paid" ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : item.status === "overdue" ? (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                ) : item.isNearDue ? (
                                  <Clock className="w-4 h-4 text-yellow-600" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted" />
                                )}
                                <div className="flex flex-col">
                                  <span
                                    className={
                                      item.status === "paid"
                                        ? "text-muted-foreground line-through"
                                        : ""
                                    }
                                  >
                                    {format(item.date, "dd MMM yyyy", {
                                      locale: es,
                                    })}
                                  </span>
                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize font-medium text-primary">
                                      {item.concept || item.type}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {item.status === "paid"
                                        ? "Pagado"
                                        : item.status === "overdue"
                                          ? "Vencido"
                                          : item.isNearDue
                                            ? "Vence pronto"
                                            : "Pendiente"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="font-medium flex flex-col items-end gap-1">
                                <span>
                                  {new Intl.NumberFormat("es-CO", {
                                    style: "currency",
                                    currency: config.currency,
                                    maximumFractionDigits: 0,
                                  }).format(item.amount)}
                                </span>
                                {canValidatePayment &&
                                  item.status !== "paid" &&
                                  isNextToPay && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs px-2"
                                      onClick={() =>
                                        handleValidatePayment(
                                          String(
                                            (item as any).detalleCodigo || "",
                                          ),
                                          item.amount,
                                          item.date,
                                        )
                                      }
                                    >
                                      Validar
                                    </Button>
                                  )}
                                {canEdit && item.status !== "paid" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs px-2"
                                    onClick={() =>
                                      void handleSendPaymentReminder(
                                        String(
                                          (item as any).detalleCodigo || "",
                                        ),
                                        String(item.cuotaCodigo || ""),
                                        item.date,
                                        item.amount,
                                      )
                                    }
                                  >
                                    Enviar mail
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Historial y Bonos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bonos Card */}
            {bonuses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="w-4 h-4" /> Bonos Incluidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bonuses.map((bono, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {bono.concept}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Valorado en{" "}
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: config?.currency || "USD",
                              maximumFractionDigits: 0,
                            }).format(bono.amount)}
                          </span>
                        </div>
                        <Badge variant="secondary">Incluido</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historial de pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Cargando pagos...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No hay pagos registrados.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {p.fecha_pago
                              ? format(new Date(p.fecha_pago), "dd MMM yyyy", {
                                  locale: es,
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {p.observaciones || "Pago registrado"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: p.moneda || "USD",
                              maximumFractionDigits: 0,
                            }).format(Number(p.monto))}
                          </TableCell>
                          <TableCell className="capitalize">
                            {p.metodo_pago}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={detailStatusClass(p.estado)}
                            >
                              {detailStatusLabel(p.estado)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(p);
                                setDetailModalOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Historial de Cambios (Logs) */}
        {logs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" /> Historial de cambios en el plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-sm text-muted-foreground">
                        {log.details}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {format(new Date(log.date), "dd MMM yyyy HH:mm", {
                        locale: es,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal Configuración */}
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Configuración de pagos</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de pago *</Label>
                  <Select
                    value={(tempConfig.planType || "contado") as any}
                    onValueChange={(v: any) => {
                      const next = v as CrmPaymentPlanType;
                      const std = getStdPricing(
                        String(tempConfig.program || "HOTSELLING PRO"),
                        (tempConfig.pricingPreset ||
                          "descuento") as CrmPaymentPricingPreset,
                      );

                      if (next === "contado") {
                        const total = std?.stdCash
                          ? Number(std.stdCash)
                          : Number(tempConfig.amount || 0);
                        setTempConfig({
                          ...tempConfig,
                          planType: next,
                          hasReservation: false,
                          frequency: "unico",
                          amount: total,
                          installments: [
                            {
                              id: Math.random().toString(36).substr(2, 9),
                              cuotaCodigo: "CUOTA_001",
                              date: isoPlusDays(0),
                              amount: total,
                              type: "regular",
                              concept: "Pago total",
                            },
                          ],
                        });
                        return;
                      }

                      if (next === "cuotas") {
                        const cnt = std?.stdInstallments?.count ?? 2;
                        const per = std?.stdInstallments?.amount ?? 0;
                        const schedule = buildStandardScheduleFromCount(
                          [],
                          cnt,
                          String(per),
                        );
                        setTempConfig({
                          ...tempConfig,
                          planType: next,
                          hasReservation: false,
                          frequency: "mensual",
                          amount: cnt * per,
                          installments: schedule.map((it, idx) => ({
                            id: String(
                              it.id || Math.random().toString(36).substr(2, 9),
                            ),
                            cuotaCodigo: `CUOTA_${String(idx + 1).padStart(3, "0")}`,
                            date: it.dueDate || isoPlusDays(idx * 30),
                            amount: Number(String(it.amount || per)) || 0,
                            type: "regular",
                            concept: `Cuota ${idx + 1}`,
                          })),
                        });
                        return;
                      }

                      if (next === "excepcion_2_cuotas") {
                        const total = Number(tempConfig.amount || 0);
                        const half =
                          total > 0 ? Math.round((total / 2) * 100) / 100 : 0;
                        setTempConfig({
                          ...tempConfig,
                          planType: next,
                          hasReservation: false,
                          frequency: "mensual",
                          installments: [
                            {
                              id: Math.random().toString(36).substr(2, 9),
                              cuotaCodigo: "CUOTA_001",
                              date: isoPlusDays(0),
                              amount: half,
                              type: "regular",
                              concept: "Cuota 1",
                            },
                            {
                              id: Math.random().toString(36).substr(2, 9),
                              cuotaCodigo: "CUOTA_002",
                              date: isoPlusDays(30),
                              amount: half,
                              type: "regular",
                              concept: "Cuota 2",
                            },
                          ],
                        });
                        return;
                      }

                      // reserva
                      setTempConfig({
                        ...tempConfig,
                        planType: next,
                        hasReservation: true,
                        frequency: "unico",
                        reservationDate:
                          tempConfig.reservationDate || isoPlusDays(0),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Venta al contado</SelectItem>
                      <SelectItem value="cuotas">
                        Venta en cuotas (estándar)
                      </SelectItem>
                      <SelectItem value="excepcion_2_cuotas">
                        Excepción: 2 cuotas personalizadas
                      </SelectItem>
                      <SelectItem value="reserva">Reserva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tarifa *</Label>
                  <Select
                    value={(tempConfig.pricingPreset || "descuento") as any}
                    onValueChange={(v: any) => {
                      const nextPreset = v as CrmPaymentPricingPreset;
                      const std = getStdPricing(
                        String(tempConfig.program || "HOTSELLING PRO"),
                        nextPreset,
                      );
                      const plan = (tempConfig.planType ||
                        "contado") as CrmPaymentPlanType;

                      if (plan === "contado" && std?.stdCash) {
                        setTempConfig({
                          ...tempConfig,
                          pricingPreset: nextPreset,
                          amount: Number(std.stdCash),
                          installments: [
                            {
                              id: Math.random().toString(36).substr(2, 9),
                              cuotaCodigo: "CUOTA_001",
                              date: isoPlusDays(0),
                              amount: Number(std.stdCash),
                              type: "regular",
                              concept: "Pago total",
                            },
                          ],
                        });
                        return;
                      }
                      if (plan === "cuotas" && std?.stdInstallments) {
                        const cnt = std.stdInstallments.count;
                        const per = std.stdInstallments.amount;
                        const current = Array.isArray(tempConfig.installments)
                          ? tempConfig.installments.filter(
                              (i) => i.type !== "bono",
                            )
                          : [];
                        const schedule = buildStandardScheduleFromCount(
                          current.map((x) => ({
                            id: x.id,
                            amount: String(x.amount ?? per),
                            dueDate: String(x.date || ""),
                          })),
                          cnt,
                          String(per),
                        );
                        setTempConfig({
                          ...tempConfig,
                          pricingPreset: nextPreset,
                          amount: cnt * per,
                          installments: schedule.map((it, idx) => ({
                            id: String(
                              it.id || Math.random().toString(36).substr(2, 9),
                            ),
                            cuotaCodigo: `CUOTA_${String(idx + 1).padStart(3, "0")}`,
                            date: it.dueDate || isoPlusDays(idx * 30),
                            amount: Number(String(it.amount || per)) || 0,
                            type: "regular",
                            concept: `Cuota ${idx + 1}`,
                          })),
                        });
                        return;
                      }

                      setTempConfig({
                        ...tempConfig,
                        pricingPreset: nextPreset,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="descuento">
                        Descuento estándar
                      </SelectItem>
                      <SelectItem value="lista">Precio lista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <Select
                    value={
                      String(tempConfig.program || "HOTSELLING PRO") as any
                    }
                    onValueChange={(v: any) => {
                      const nextProgram = String(v);
                      const plan = (tempConfig.planType ||
                        "contado") as CrmPaymentPlanType;
                      const preset = (tempConfig.pricingPreset ||
                        "descuento") as CrmPaymentPricingPreset;
                      const std = getStdPricing(nextProgram, preset);

                      if (plan === "contado" && std?.stdCash) {
                        setTempConfig({
                          ...tempConfig,
                          program: nextProgram,
                          amount: Number(std.stdCash),
                          installments: [
                            {
                              id: Math.random().toString(36).substr(2, 9),
                              cuotaCodigo: "CUOTA_001",
                              date: isoPlusDays(0),
                              amount: Number(std.stdCash),
                              type: "regular",
                              concept: "Pago total",
                            },
                          ],
                        });
                        return;
                      }

                      if (plan === "cuotas" && std?.stdInstallments) {
                        const cnt = std.stdInstallments.count;
                        const per = std.stdInstallments.amount;
                        const current = Array.isArray(tempConfig.installments)
                          ? tempConfig.installments.filter(
                              (i) => i.type !== "bono",
                            )
                          : [];
                        const schedule = buildStandardScheduleFromCount(
                          current.map((x) => ({
                            id: x.id,
                            amount: String(x.amount ?? per),
                            dueDate: String(x.date || ""),
                          })),
                          cnt,
                          String(per),
                        );
                        setTempConfig({
                          ...tempConfig,
                          program: nextProgram,
                          amount:
                            std.stdInstallments.count *
                            std.stdInstallments.amount,
                          installments: schedule.map((it, idx) => ({
                            id: String(
                              it.id || Math.random().toString(36).substr(2, 9),
                            ),
                            cuotaCodigo: `CUOTA_${String(idx + 1).padStart(3, "0")}`,
                            date: it.dueDate || isoPlusDays(idx * 30),
                            amount: Number(String(it.amount || per)) || 0,
                            type: "regular",
                            concept: `Cuota ${idx + 1}`,
                          })),
                        });
                        return;
                      }

                      setTempConfig({ ...tempConfig, program: nextProgram });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_PRODUCT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <div className="text-sm text-muted-foreground border rounded-md px-3 py-2">
                    USD
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Método</Label>
                  <Select
                    value={String(tempConfig.metodo || "transfer")}
                    onValueChange={(v) =>
                      setTempConfig({ ...tempConfig, metodo: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Total del Programa (USD)</Label>
                  <Input
                    type="number"
                    value={
                      ((tempConfig.planType || "contado") as any) ===
                        "cuotas" ||
                      ((tempConfig.planType || "contado") as any) ===
                        "excepcion_2_cuotas"
                        ? Array.isArray(tempConfig.installments)
                          ? tempConfig.installments
                              .filter((i) => i.type !== "bono")
                              .reduce(
                                (sum, i) => sum + (Number(i.amount) || 0),
                                0,
                              )
                          : 0
                        : tempConfig.amount
                    }
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        amount: Number(e.target.value),
                      })
                    }
                    disabled={
                      ((tempConfig.planType || "contado") as any) ===
                        "cuotas" ||
                      ((tempConfig.planType || "contado") as any) ===
                        "excepcion_2_cuotas"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resumen</Label>
                  <div className="text-sm text-muted-foreground border rounded-md px-3 py-2">
                    {labelForPlanType(
                      (tempConfig.planType || "contado") as CrmPaymentPlanType,
                    )}
                  </div>
                </div>
              </div>

              {(((tempConfig.planType || "contado") as any) === "cuotas" ||
                ((tempConfig.planType || "contado") as any) ===
                  "excepcion_2_cuotas") && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label>
                        {((tempConfig.planType || "contado") as any) ===
                        "cuotas"
                          ? "Plan en cuotas (editable)"
                          : "Cuotas personalizadas (editable)"}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Agrega/quita cuotas y edita monto y fecha (igual que
                        CRM).
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const base = Array.isArray(tempConfig.installments)
                          ? tempConfig.installments.filter(
                              (i) => i.type !== "bono",
                            )
                          : [];
                        const last = base[base.length - 1];
                        const nextDate = last?.date
                          ? ymdPlusDays(last.date, 30)
                          : isoPlusDays(0);
                        const nextAmount = Number(last?.amount || 0);
                        const next = normalizeScheduleInstallments([
                          ...base,
                          {
                            id: Math.random().toString(36).substr(2, 9),
                            cuotaCodigo: nextCuotaCodigo(base),
                            date: nextDate,
                            amount: nextAmount,
                            type: "regular",
                            concept: `Cuota ${base.length + 1}`,
                          },
                        ] as any);
                        setTempConfig({
                          ...tempConfig,
                          installments: next,
                          amount: next.reduce(
                            (sum, i) => sum + (Number(i.amount) || 0),
                            0,
                          ),
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Agregar cuota
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {(Array.isArray(tempConfig.installments)
                      ? tempConfig.installments.filter((i) => i.type !== "bono")
                      : []
                    ).map((it, idx, arr) => (
                      <div
                        key={it.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-md border border-slate-200 bg-white p-3"
                      >
                        <div className="md:col-span-2">
                          <Label className="text-xs text-slate-600">
                            Cuota
                          </Label>
                          <div className="h-10 flex items-center text-sm font-medium">
                            #{idx + 1}
                          </div>
                        </div>

                        <div className="md:col-span-5 space-y-1.5">
                          <Label>Monto (USD) *</Label>
                          <Input
                            type="number"
                            value={String(it.amount ?? "")}
                            onChange={(e) => {
                              const base = Array.isArray(
                                tempConfig.installments,
                              )
                                ? tempConfig.installments.filter(
                                    (i) => i.type !== "bono",
                                  )
                                : [];
                              const nextBase = base.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      amount: Number(e.target.value || 0),
                                    }
                                  : x,
                              );
                              const next = normalizeScheduleInstallments(
                                nextBase as any,
                              );
                              setTempConfig({
                                ...tempConfig,
                                installments: next,
                                amount: next.reduce(
                                  (sum, i) => sum + (Number(i.amount) || 0),
                                  0,
                                ),
                              });
                            }}
                          />
                        </div>

                        <div className="md:col-span-5 space-y-1.5">
                          <Label>Fecha de pago *</Label>
                          <Input
                            type="date"
                            value={it.date || ""}
                            onChange={(e) => {
                              const base = Array.isArray(
                                tempConfig.installments,
                              )
                                ? tempConfig.installments.filter(
                                    (i) => i.type !== "bono",
                                  )
                                : [];
                              const nextBase = base.map((x, i) =>
                                i === idx ? { ...x, date: e.target.value } : x,
                              );
                              const next = normalizeScheduleInstallments(
                                nextBase as any,
                              );
                              setTempConfig({
                                ...tempConfig,
                                installments: next,
                                amount: next.reduce(
                                  (sum, i) => sum + (Number(i.amount) || 0),
                                  0,
                                ),
                              });
                            }}
                          />
                        </div>

                        <div className="md:col-span-12 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={arr.length <= 1}
                            onClick={() => {
                              if (arr.length <= 1) return;
                              const base = Array.isArray(
                                tempConfig.installments,
                              )
                                ? tempConfig.installments.filter(
                                    (i) => i.type !== "bono",
                                  )
                                : [];
                              const nextBase = base.filter((_, i) => i !== idx);
                              const next = normalizeScheduleInstallments(
                                nextBase as any,
                              );
                              setTempConfig({
                                ...tempConfig,
                                installments: next,
                                amount: next.reduce(
                                  (sum, i) => sum + (Number(i.amount) || 0),
                                  0,
                                ),
                              });
                            }}
                          >
                            Quitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Reserva */}
              {(tempConfig.planType || "contado") === "reserva" && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="space-y-0.5 mb-4">
                    <Label>Reserva</Label>
                    <p className="text-xs text-muted-foreground">
                      Igual que en CRM: monto de reserva y fecha de pago.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Monto Reserva</Label>
                      <Input
                        type="number"
                        value={tempConfig.reservationAmount}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            reservationAmount: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de pago Reserva</Label>
                      <Input
                        type="date"
                        value={tempConfig.reservationDate}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            reservationDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sección de Bonos Iniciales */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>Bonos / Extras Iniciales</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newBono.name && newBono.amount) {
                        setInitialBonuses([
                          ...initialBonuses,
                          {
                            name: newBono.name,
                            amount: Number(newBono.amount),
                          },
                        ]);
                        setNewBono({ name: "", amount: "" });
                        setBonoSelectValue("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Agregar
                  </Button>
                </div>
                <div className="flex gap-2 mb-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={bonoSelectValue}
                      onValueChange={(v) => {
                        setBonoSelectValue(v);
                        if (v !== "custom") {
                          setNewBono({ ...newBono, name: v });
                        } else {
                          setNewBono({ ...newBono, name: "" });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar bono..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Contractuales</SelectLabel>
                          {BONOS_CONTRACTUALES.map((b) => (
                            <SelectItem key={b.key} value={b.title}>
                              {b.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Extras</SelectLabel>
                          {BONOS_EXTRA.map((b) => (
                            <SelectItem key={b.key} value={b.title}>
                              {b.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Otro</SelectLabel>
                          <SelectItem value="custom">
                            Otro (Escribir manual)
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {bonoSelectValue === "custom" && (
                      <Input
                        placeholder="Nombre del bono"
                        value={newBono.name}
                        onChange={(e) =>
                          setNewBono({ ...newBono, name: e.target.value })
                        }
                      />
                    )}
                  </div>
                  <Input
                    type="number"
                    placeholder="Monto"
                    value={newBono.amount}
                    onChange={(e) =>
                      setNewBono({ ...newBono, amount: e.target.value })
                    }
                    className="w-[100px]"
                  />
                </div>
                {initialBonuses.length > 0 && (
                  <div className="space-y-1 max-h-[100px] overflow-y-auto">
                    {initialBonuses.map((b, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-sm bg-muted p-2 rounded"
                      >
                        <span>{b.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: tempConfig.currency,
                            }).format(b.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => {
                              const newBonuses = [...initialBonuses];
                              newBonuses.splice(i, 1);
                              setInitialBonuses(newBonuses);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveConfig}>Guardar configuración</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Editar Plan (Cuotas) */}
        <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar Plan de Pagos</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <p className="text-sm text-muted-foreground">
                    Ajusta las fechas y montos de las cuotas generadas.
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Total calculado:{" "}
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: config?.currency || "USD",
                    }).format(
                      editingInstallments.reduce((sum, i) => sum + i.amount, 0),
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Popover
                    open={recalcPopoverOpen}
                    onOpenChange={setRecalcPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Recalcular fechas
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 z-[9999]" align="end">
                      <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">
                            Recalcular desde
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Selecciona la nueva fecha para la primera cuota
                            pendiente.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={recalcDate}
                            onChange={(e) => setRecalcDate(e.target.value)}
                          />
                          <Button
                            onClick={() => handleRecalculateDates(recalcDate)}
                          >
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddInstallmentOpen(true)}
                    disabled={!canEdit}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Agregar cuota
                  </Button>
                </div>
              </div>

              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editingInstallments.map((inst, index) => {
                      const isPaid = isInstallmentPaid(inst);
                      return (
                        <TableRow
                          key={inst.id}
                          className={isPaid ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <Select
                              value={inst.type || "regular"}
                              disabled={isPaid}
                              onValueChange={(v: any) => {
                                const newInst = [...editingInstallments];
                                newInst[index].type = v;
                                setEditingInstallments(newInst);
                              }}
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="extra">Extra</SelectItem>
                                <SelectItem value="bono">Bono</SelectItem>
                                <SelectItem value="reserva">Reserva</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={inst.date}
                              disabled={isPaid}
                              onChange={(e) =>
                                handleDateChange(index, e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={inst.amount}
                              disabled={isPaid}
                              onChange={(e) => {
                                const newInst = [...editingInstallments];
                                newInst[index].amount = Number(e.target.value);
                                setEditingInstallments(newInst);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {isPaid ? (
                              <Badge variant="secondary" className="text-xs">
                                Pagada
                              </Badge>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Dividir cuota"
                                  onClick={() => {
                                    setSplitData({ parts: 2, dates: [] });
                                    setSplitPopoverOpen(inst.id);
                                  }}
                                >
                                  <Split className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    const newInst = editingInstallments.filter(
                                      (i) => i.id !== inst.id,
                                    );
                                    setEditingInstallments(newInst);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPlanOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveEditedPlan}>Guardar cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Agregar Cuota Extra */}
        <Dialog open={addInstallmentOpen} onOpenChange={setAddInstallmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar nueva cuota</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de cuota</Label>
                <Select
                  value={newInstallment.type}
                  onValueChange={(v: any) =>
                    setNewInstallment({ ...newInstallment, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Cuota Regular</SelectItem>
                    <SelectItem value="extra">Cuota Extra</SelectItem>
                    <SelectItem value="bono">Bono</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newInstallment.type === "bono" ? (
                <div className="space-y-2">
                  <Label>Seleccionar Bono</Label>
                  <Select
                    value={newInstallment.concept}
                    onValueChange={(v) =>
                      setNewInstallment({ ...newInstallment, concept: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar bono..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Contractuales</SelectLabel>
                        {BONOS_CONTRACTUALES.map((b) => (
                          <SelectItem key={b.key} value={b.title}>
                            {b.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Extras</SelectLabel>
                        {BONOS_EXTRA.map((b) => (
                          <SelectItem key={b.key} value={b.title}>
                            {b.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Concepto (Opcional)</Label>
                  <Input
                    value={newInstallment.concept}
                    onChange={(e) =>
                      setNewInstallment({
                        ...newInstallment,
                        concept: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={newInstallment.date}
                  onChange={(e) =>
                    setNewInstallment({
                      ...newInstallment,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  value={newInstallment.amount}
                  onChange={(e) =>
                    setNewInstallment({
                      ...newInstallment,
                      amount: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddInstallmentOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddInstallment}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Registrar Pago */}
        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isStudent ? "Enviar comprobante" : "Registrar Pago"}
              </DialogTitle>
              <DialogDescription>
                {isStudent
                  ? "Completa el método, referencia y observaciones para enviar a validación."
                  : "Ingresa los detalles del pago recibido."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    value={newPayment.monto}
                    disabled={isStudent}
                    onChange={(e) =>
                      setNewPayment({ ...newPayment, monto: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={newPayment.moneda}
                    disabled={isStudent}
                    onValueChange={(v) =>
                      setNewPayment({ ...newPayment, moneda: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Pago</Label>
                <Input
                  type="date"
                  value={newPayment.fecha_pago}
                  disabled={isStudent}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, fecha_pago: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={newPayment.metodo_pago}
                  onValueChange={(v) =>
                    setNewPayment({ ...newPayment, metodo_pago: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referencia / Comprobante</Label>
                <Input
                  value={newPayment.referencia}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, referencia: e.target.value })
                  }
                  placeholder="Nro. de transacción"
                />
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input
                  value={newPayment.observaciones}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      observaciones: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegisterPayment}>
                {isStudent ? "Enviar a validación" : "Registrar Pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Dividir Cuota */}
        <Dialog
          open={!!splitPopoverOpen}
          onOpenChange={(open) => !open && setSplitPopoverOpen(null)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Dividir cuota</DialogTitle>
              <DialogDescription>
                Divide esta cuota en varias partes. El monto se dividirá
                equitativamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parts" className="text-right">
                  Cantidad de partes
                </Label>
                <Input
                  id="parts"
                  type="number"
                  min={2}
                  max={12}
                  className="col-span-3"
                  value={splitData.parts}
                  onChange={(e) =>
                    setSplitData({
                      ...splitData,
                      parts: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {Array.from({ length: splitData.parts }).map((_, i) => {
                  const originalInst = editingInstallments.find(
                    (inst) => inst.id === splitPopoverOpen,
                  );
                  const amount = originalInst
                    ? originalInst.amount / splitData.parts
                    : 0;
                  // Default date is original date if not set
                  const date =
                    splitData.dates[i] ||
                    (originalInst ? originalInst.date : "");

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-2 gap-2 items-center border p-2 rounded"
                    >
                      <div className="text-sm">
                        <span className="font-medium">Parte {i + 1}</span>
                        <div className="text-muted-foreground">
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: config?.currency || "USD",
                          }).format(amount)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          Fecha límite
                        </Label>
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            const newDates = [...splitData.dates];
                            // Fill gaps if needed with original date
                            while (newDates.length < splitData.parts) {
                              newDates.push(originalInst?.date || "");
                            }
                            newDates[i] = e.target.value;
                            setSplitData({ ...splitData, dates: newDates });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSplitPopoverOpen(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  splitPopoverOpen && handleSplitInstallment(splitPopoverOpen)
                }
              >
                Confirmar división
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Detalle de Pago */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalle del Pago</DialogTitle>
              <DialogDescription>
                Información completa de la transacción.
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Fecha y Hora
                    </Label>
                    <p className="font-medium">
                      {selectedPayment.created_at
                        ? format(
                            new Date(selectedPayment.created_at),
                            "dd MMM yyyy HH:mm:ss",
                            { locale: es },
                          )
                        : format(
                            new Date(selectedPayment.fecha_pago),
                            "dd MMM yyyy",
                            { locale: es },
                          )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Monto
                    </Label>
                    <p className="font-medium text-lg">
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: selectedPayment.moneda || "USD",
                      }).format(Number(selectedPayment.monto))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Método
                    </Label>
                    <p className="capitalize">{selectedPayment.metodo_pago}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Estado
                    </Label>
                    {canEdit ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Select
                          value={selectedPaymentStatus}
                          onValueChange={(v) => setSelectedPaymentStatus(v)}
                          disabled={selectedPaymentStatusSaving}
                        >
                          <SelectTrigger className="w-[230px]">
                            <SelectValue placeholder="Estatus" />
                          </SelectTrigger>
                          <SelectContent>
                            {DETAIL_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={handleUpdateSelectedPaymentStatus}
                          disabled={selectedPaymentStatusSaving}
                        >
                          {selectedPaymentStatusSaving
                            ? "Guardando..."
                            : "Guardar"}
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`mt-1 ${detailStatusClass(selectedPayment.estado)}`}
                      >
                        {detailStatusLabel(selectedPayment.estado)}
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedPayment.referencia && (
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Referencia
                    </Label>
                    <p className="font-mono text-sm">
                      {selectedPayment.referencia}
                    </p>
                  </div>
                )}

                {selectedPayment.observaciones && (
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Observaciones
                    </Label>
                    <p className="text-sm">{selectedPayment.observaciones}</p>
                  </div>
                )}

                <div className="border-t pt-4 mt-2">
                  <Label className="mb-2 block">Comprobante de Pago</Label>
                  {selectedPayment.comprobante_url ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                      {/* Mock image display */}
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <FileText className="w-8 h-8 mr-2" />
                        <span className="text-sm">Comprobante adjunto</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() =>
                          window.open(selectedPayment.comprobante_url, "_blank")
                        }
                      >
                        Ver original
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        No hay comprobante adjunto
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        onClick={() => {
                          toast({
                            title: "Funcionalidad pendiente",
                            description:
                              "Aún no hay endpoint para adjuntar comprobantes desde esta vista.",
                            variant: "destructive",
                          });
                        }}
                      >
                        Subir foto del pago
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setDetailModalOpen(false)}
                className="w-full"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
