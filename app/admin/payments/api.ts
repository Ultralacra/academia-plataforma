import { apiFetch } from "@/lib/api-config";

export type PaymentStatus = string;

export type PaymentRow = {
  id: number;
  codigo: string;
  cliente_codigo: string | null;
  cliente_nombre: string | null;
  monto: number | null;
  monto_reserva: number | null;
  nro_cuotas: number | null;
  moneda: string | null;
  estatus: PaymentStatus | null;
  fecha_pago: string | null;
  metodo: string | null;
  modalidad: string | null;
  referencia: string | null;
  concepto: string | null;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PaymentListEnvelope = {
  code: number;
  status: string;
  data: PaymentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PaymentDetailRow = {
  id: number;
  codigo: string;
  cuota_codigo: string | null;
  monto: number | null;
  moneda: string | null;
  estatus: string | null;
  fecha_pago: string | null;
  metodo: string | null;
  referencia: string | null;
  concepto: string | null;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PaymentDetail = PaymentRow & {
  detalles?: PaymentDetailRow[];
};

export type PaymentDetailEnvelope = {
  code: number;
  status: string;
  data: PaymentDetail;
};

async function fetchJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(pathOrUrl, init);
}

export async function getPayments(opts?: {
  page?: number;
  pageSize?: number;
  search?: string;
  cliente_codigo?: string;
  estatus?: string;
  metodo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  montoMin?: number;
  montoMax?: number;
}): Promise<PaymentListEnvelope> {
  const q = new URLSearchParams();
  if (opts?.page) q.set("page", String(opts.page));
  if (opts?.pageSize) q.set("pageSize", String(opts.pageSize));
  if (opts?.search) q.set("search", String(opts.search));
  if (opts?.cliente_codigo) q.set("cliente_codigo", String(opts.cliente_codigo));
  if (opts?.estatus) q.set("estatus", String(opts.estatus));
  if (opts?.metodo) q.set("metodo", String(opts.metodo));
  if (opts?.fechaDesde) q.set("fechaDesde", String(opts.fechaDesde));
  if (opts?.fechaHasta) q.set("fechaHasta", String(opts.fechaHasta));
  if (opts?.montoMin !== undefined && opts?.montoMin !== null && !Number.isNaN(opts.montoMin)) {
    q.set("montoMin", String(opts.montoMin));
  }
  if (opts?.montoMax !== undefined && opts?.montoMax !== null && !Number.isNaN(opts.montoMax)) {
    q.set("montoMax", String(opts.montoMax));
  }

  const url = q.toString()
    ? `/payments/get/payment?${q.toString()}`
    : "/payments/get/payment";

  return fetchJson<PaymentListEnvelope>(url);
}

export async function getPaymentByCodigo(
  codigo: string
): Promise<PaymentDetailEnvelope> {
  const safe = encodeURIComponent(String(codigo || "").trim());
  return fetchJson<PaymentDetailEnvelope>(`/payments/get/payment/${safe}`);
}
