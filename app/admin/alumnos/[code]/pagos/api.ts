import { apiFetch } from "@/lib/api-config";

export type Payment = {
  id: number | string;
  codigo_cliente: string;
  monto: string | number;
  moneda: string;
  fecha_pago: string;
  metodo_pago: string;
  estado: string;
  referencia?: string;
  comprobante_url?: string;
  observaciones?: string;
  created_at?: string;
};

// NOTA: esta vista de alumno usa nuevos endpoints de plan/Detalle.
// Para no romper imports existentes, dejamos funciones con nombres antiguos
// y re-exportamos helpers nuevos desde archivos segmentados.

export {
  createPaymentDetail,
  createPaymentPlan,
  deletePaymentDetail,
  getPaymentPlansByClienteCodigo,
  getPaymentPlanByCodigo,
  updatePaymentDetail,
  updatePaymentPlan,
} from "./payments-plan.api";

export type {
  CreatePaymentDetailInput,
  CreatePaymentPlanInput,
  UpdatePaymentDetailInput,
  UpdatePaymentPlanInput,
  PaymentPlanDetail,
} from "./payments-plan.types";

export async function getPayments(code: string) {
  // Compat: devolver array de "pagos" (detalles) para el alumno.
  try {
    const q = new URLSearchParams();
    q.set("cliente_codigo", String(code || "").trim());
    q.set("page", "1");
    q.set("pageSize", "100");
    const res = await apiFetch<any>(`/payments/get/payment?${q.toString()}`, {
      method: "GET",
    });
    return (res?.data ?? res) || [];
  } catch (e) {
    console.error("Error fetching payments", e);
    return [];
  }
}

export async function createManualPayment(body: {
  // DEPRECADO en esta vista: el flujo real usa create/update del plan y sus detalles.
  codigo_cliente: string;
  monto: number;
  moneda: string;
  fecha_pago: string;
  metodo_pago: string;
  referencia?: string;
  observaciones?: string;
}) {
  // Mantener por compatibilidad: crea un plan simple de 1 cuota.
  const payload = {
    cliente_codigo: body.codigo_cliente,
    monto: Number(body.monto || 0),
    moneda: body.moneda || "USD",
    monto_reserva: 0,
    nro_cuotas: 1,
    estatus: "pendiente",
    fecha_pago: body.fecha_pago ? `${body.fecha_pago}T00:00:00Z` : new Date().toISOString(),
    metodo: body.metodo_pago === "tarjeta" ? "card" : "transfer",
    referencia: body.referencia || "",
    concepto: "Pago",
    notas: body.observaciones || "",
    details: [
      {
        monto: Number(body.monto || 0),
        moneda: body.moneda || "USD",
        cuota_codigo: "CUOTA_001",
        estatus: "pendiente",
        fecha_pago: body.fecha_pago ? `${body.fecha_pago}T00:00:00Z` : new Date().toISOString(),
        metodo: body.metodo_pago === "tarjeta" ? "card" : "transfer",
        referencia: body.referencia || "",
        concepto: "Cuota 1",
        notas: body.observaciones || "",
      },
    ],
  };

  return apiFetch<any>(`/payments/create/payment`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
