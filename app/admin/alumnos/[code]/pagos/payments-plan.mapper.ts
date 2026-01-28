import type { Payment } from "./api";
import type {
  CreatePaymentPlanInput,
  PaymentDetailRow,
  PaymentPlanDetail,
  UpdatePaymentPlanInput,
} from "./payments-plan.types";

export type UiInstallment = {
  id: string;
  cuotaCodigo?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: "regular" | "extra" | "bono" | "reserva";
  concept?: string;
};

export type UiPaymentConfig = {
  metodo?: string;
  tipo_pago?: string;
  frequency: "mensual" | "trimestral" | "semanal" | "unico";
  startDate: string; // YYYY-MM-DD
  amount: number;
  currency: string;
  hasReservation?: boolean;
  reservationAmount?: number;
  reservationDate?: string;
  installments: UiInstallment[];
};

function padCuota(n: number) {
  return `CUOTA_${String(n).padStart(3, "0")}`;
}

function toIsoZ(dateYmd: string) {
  // "YYYY-MM-DD" → "YYYY-MM-DDT00:00:00Z" (suficiente para backend)
  if (!dateYmd) return undefined;
  return `${dateYmd}T00:00:00Z`;
}

export function planToCreatePayload(clienteCodigo: string, cfg: UiPaymentConfig): CreatePaymentPlanInput {
  const currency = cfg.currency || "USD";
  const montoReserva = cfg.hasReservation ? Number(cfg.reservationAmount || 0) : 0;
  const metodo = String(cfg.metodo || "transfer");
  const tipoPago = String(cfg.tipo_pago || "").trim() || undefined;

  // No enviar "bonos" por ahora (pedido)
  const details = (cfg.installments || [])
    .filter((i) => i.type !== "bono")
    .map((i, idx) => ({
      monto: Number(i.amount || 0),
      moneda: currency,
      cuota_codigo: String(i.cuotaCodigo || "").trim() || padCuota(idx + 1),
      estatus: "pendiente",
      fecha_pago: toIsoZ(i.date) || new Date().toISOString(),
      metodo,
      referencia: "",
      concepto: i.concept || `Cuota ${idx + 1}`,
      notas: "",
    }));

  const nroCuotas = details.length;

  return {
    cliente_codigo: clienteCodigo,
    monto: Number(cfg.amount || 0),
    moneda: currency,
    monto_reserva: montoReserva || undefined,
    nro_cuotas: nroCuotas || undefined,
    estatus: "pendiente",
    fecha_pago: toIsoZ(cfg.startDate) || new Date().toISOString(),
    metodo,
    tipo_pago: tipoPago,
    referencia: "",
    concepto: "Plan de pagos",
    notas: "",
    details,
  };
}

export function planToUpdatePayload(clienteCodigo: string, cfg: UiPaymentConfig): UpdatePaymentPlanInput {
  const currency = cfg.currency || "USD";
  const montoReserva = cfg.hasReservation ? Number(cfg.reservationAmount || 0) : 0;
  const nroCuotas = (cfg.installments || []).filter((i) => i.type !== "bono").length;
  const metodo = String(cfg.metodo || "transfer");
  const tipoPago = String(cfg.tipo_pago || "").trim() || undefined;

  return {
    cliente_codigo: clienteCodigo,
    monto: Number(cfg.amount || 0),
    monto_reserva: montoReserva || undefined,
    nro_cuotas: nroCuotas || undefined,
    moneda: currency,
    estatus: "pendiente",
    fecha_pago: toIsoZ(cfg.startDate) || undefined,
    metodo,
    tipo_pago: tipoPago,
    referencia: "",
    concepto: "Plan de pagos",
    notas: "",
  };
}

export function apiDetailToPaymentsArray(clienteCodigo: string, plan: PaymentPlanDetail): Payment[] {
  const rows: PaymentDetailRow[] =
    (plan as any)?.detalles ?? (plan as any)?.details ?? [];

  return rows.map((d) => ({
    id: d.codigo,
    codigo_cliente: clienteCodigo,
    monto: d.monto ?? 0,
    moneda: d.moneda ?? "USD",
    fecha_pago: d.fecha_pago ?? "",
    metodo_pago: d.metodo ?? "",
    estado: d.estatus ?? "pendiente",
    referencia: d.referencia ?? undefined,
    observaciones: d.notas ?? undefined,
    comprobante_url: undefined,
    created_at: d.created_at ?? undefined,
  }));
}

export function apiDetailToConfig(clienteCodigo: string, plan: PaymentPlanDetail): UiPaymentConfig {
  const currency = plan.moneda || "USD";
  const rows: PaymentDetailRow[] =
    (plan as any)?.detalles ?? (plan as any)?.details ?? [];

  const installments: UiInstallment[] = rows
    .map((d) => ({
      id: d.codigo,
      cuotaCodigo: d.cuota_codigo ?? undefined,
      date: (d.fecha_pago || "").slice(0, 10) || "",
      amount: Number(d.monto || 0),
      type: "regular" as const,
      concept: d.concepto || d.cuota_codigo || "",
    }))
    .filter((i) => Boolean(i.date));

  return {
    metodo: (plan as any)?.metodo ?? undefined,
    tipo_pago: (plan as any)?.tipo_pago ?? undefined,
    frequency: "mensual",
    startDate: (plan.fecha_pago || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
    amount: Number(plan.monto || 0),
    currency: String(currency),
    hasReservation: Boolean(plan.monto_reserva && Number(plan.monto_reserva) > 0),
    reservationAmount: Number(plan.monto_reserva || 0),
    reservationDate: (plan.fecha_pago || "").slice(0, 10) || undefined,
    installments,
  };
}
