import { apiFetch } from "@/lib/api-config";

export interface Payment {
  id: number | string;
  codigo_cliente: string;
  monto: string | number;
  moneda: string;
  fecha_pago: string;
  metodo_pago: string;
  estado: string; // 'aprobado', 'pendiente', etc.
  referencia?: string;
  comprobante_url?: string;
  observaciones?: string;
  created_at?: string;
}

export async function getPayments(code: string) {
  // Endpoint: /v1/payments/get/payment/:codigo
  // La base URL ya incluye /v1, así que llamamos a /payments/get/payment/...
  try {
    const res = await apiFetch<any>(`/payments/get/payment/${encodeURIComponent(code)}`);
    // Ajustar según la estructura de respuesta real (data, o array directo)
    return Array.isArray(res) ? res : res?.data || [];
  } catch (e) {
    console.error("Error fetching payments", e);
    return [];
  }
}

export async function createManualPayment(body: {
  codigo_cliente: string;
  monto: number;
  moneda: string;
  fecha_pago: string;
  metodo_pago: string;
  referencia?: string;
  observaciones?: string;
}) {
  // Endpoint: /v1/payments/manual/payment
  return apiFetch<any>(`/payments/manual/payment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
