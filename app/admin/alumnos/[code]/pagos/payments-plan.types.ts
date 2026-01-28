export type PaymentStatus = string;

export type PaymentMetodo = string;
export type PaymentModalidad = string;

export type PaymentDetailInput = {
  monto: number;
  moneda: string;
  cuota_codigo: string;
  estatus: PaymentStatus;
  fecha_pago: string; // ISO string
  metodo: PaymentMetodo;
  referencia?: string;
  concepto?: string;
  notas?: string;
};

export type CreatePaymentDetailInput = PaymentDetailInput;

export type CreatePaymentPlanInput = {
  cliente_codigo: string;
  monto: number;
  moneda: string;
  monto_reserva?: number;
  nro_cuotas?: number;
  estatus?: PaymentStatus;
  fecha_pago?: string; // ISO string
  metodo?: PaymentMetodo;
  modalidad?: PaymentModalidad;
  tipo_pago?: string;
  referencia?: string;
  concepto?: string;
  notas?: string;
  details?: PaymentDetailInput[];
};

export type UpdatePaymentPlanInput = {
  cliente_codigo?: string;
  monto?: number;
  monto_reserva?: number;
  nro_cuotas?: number;
  moneda?: string;
  estatus?: PaymentStatus;
  fecha_pago?: string;
  metodo?: PaymentMetodo;
  modalidad?: PaymentModalidad;
  tipo_pago?: string;
  referencia?: string;
  concepto?: string;
  notas?: string;
};

export type UpdatePaymentDetailInput = {
  cuota_codigo?: string;
  monto?: number;
  moneda?: string;
  estatus?: PaymentStatus;
  fecha_pago?: string;
  metodo?: PaymentMetodo;
  referencia?: string;
  concepto?: string;
  notas?: string;
};

export type ApiEnvelope<T> = {
  code: number;
  status: string;
  data: T;
};

export type PaymentRow = {
  id: number;
  codigo: string;
  cliente_codigo: string | null;
  cliente_nombre?: string | null;
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
  updated_at?: string | null;
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
  updated_at?: string | null;
};

export type PaymentPlanDetail = PaymentRow & {
  detalles?: PaymentDetailRow[];
  details?: PaymentDetailRow[]; // algunos backends usan details
};
