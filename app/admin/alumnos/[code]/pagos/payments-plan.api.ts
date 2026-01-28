import { apiFetch } from "@/lib/api-config";
import type {
  ApiEnvelope,
  CreatePaymentDetailInput,
  CreatePaymentPlanInput,
  PaymentPlanDetail,
  UpdatePaymentDetailInput,
  UpdatePaymentPlanInput,
} from "./payments-plan.types";

function unwrap<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res) return (res as ApiEnvelope<T>).data;
  return res as T;
}

function safeNotas(n?: string | null) {
  return n == null ? "" : String(n);
}

export async function createPaymentPlan(input: CreatePaymentPlanInput) {
  const body = {
    ...input,
    notas: safeNotas(input.notas),
    details: (input.details ?? []).map((d) => ({ ...d, notas: safeNotas(d.notas) })),
  };

  const res = await apiFetch<any>(`/payments/create/payment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return unwrap<PaymentPlanDetail>(res);
}

export async function getPaymentPlansByClienteCodigo(clienteCodigo: string, opts?: { page?: number; pageSize?: number; search?: string }) {
  const safeCliente = String(clienteCodigo || "").trim();
  const q = new URLSearchParams();
  if (opts?.search !== undefined) q.set("search", String(opts.search));
  q.set("cliente_codigo", safeCliente);
  q.set("page", String(opts?.page ?? 1));
  q.set("pageSize", String(opts?.pageSize ?? 100));

  const res = await apiFetch<any>(`/payments/get/payment?${q.toString()}`, { method: "GET" });
  return unwrap<any>(res);
}

// En esta vista usamos :codigo como el backend para obtener el detalle del plan (Payment.codigo)
export async function getPaymentPlanByCodigo(codigo: string) {
  const safe = encodeURIComponent(String(codigo || "").trim());
  const res = await apiFetch<any>(`/payments/get/payment/${safe}`, { method: "GET" });
  return unwrap<any>(res);
}

export async function updatePaymentPlan(paymentCodigo: string, input: UpdatePaymentPlanInput) {
  const safe = encodeURIComponent(String(paymentCodigo || "").trim());
  const body = { ...input, notas: safeNotas(input.notas) };
  const res = await apiFetch<any>(`/payments/update/payment/${safe}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return unwrap<any>(res);
}

export async function updatePaymentDetail(
  paymentCodigo: string,
  detalleCodigo: string,
  input: UpdatePaymentDetailInput,
) {
  const safePayment = encodeURIComponent(String(paymentCodigo || "").trim());
  const safeDetalle = encodeURIComponent(String(detalleCodigo || "").trim());
  const body = { ...input, notas: safeNotas(input.notas) };

  // Endpoint pedido: /payments/update/payment/:codigo/:detallepago
  try {
    const res = await apiFetch<any>(`/payments/update/payment/${safePayment}/${safeDetalle}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return unwrap<any>(res);
  } catch (e) {
    // Fallback por compatibilidad (ruta usada en admin/payments)
    const res = await apiFetch<any>(
      `/payments/update/payment/${safePayment}/detalle/${safeDetalle}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
    return unwrap<any>(res);
  }
}

export async function createPaymentDetail(paymentCodigo: string, input: CreatePaymentDetailInput) {
  const safePayment = encodeURIComponent(String(paymentCodigo || "").trim());
  const body = { ...input, notas: safeNotas((input as any)?.notas) };

  // Endpoint usado en admin/payments: /payments/create/payment/:codigo/detalle
  const res = await apiFetch<any>(`/payments/create/payment/${safePayment}/detalle`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return unwrap<any>(res);
}

export async function deletePaymentDetail(paymentCodigo: string, detalleCodigo: string) {
  const safePayment = encodeURIComponent(String(paymentCodigo || "").trim());
  const safeDetalle = encodeURIComponent(String(detalleCodigo || "").trim());

  // Endpoint pedido: /payments/delete/payment/:codigo/detalle/:detalleCodigo
  const res = await apiFetch<any>(`/payments/delete/payment/${safePayment}/detalle/${safeDetalle}`, {
    method: "DELETE",
  });
  return unwrap<any>(res);
}
