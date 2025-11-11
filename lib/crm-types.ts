// lib/crm-types.ts
// Tipos centrales para el módulo CRM (prospectos, actividades, ventas, cobros, automatizaciones)
// Diseñado para extenderse fácilmente cuando exista un backend real.

export type ID = string;

/* ========================= Pipeline / Prospect ========================= */
export type PipelineStageId =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "propuesta"
  | "ganado" // equivalente a venta cerrada
  | "perdido";

export interface PipelineStage {
  id: PipelineStageId;
  orden: number;
  nombre: string;
  color?: string; // tailwind class o hex
  probabilidad?: number; // win probability 0..1
  slaHoras?: number; // tiempo objetivo máximo en la etapa
}

export interface ProspectCore {
  id: ID;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  canalFuente?: string | null; // Ej: Facebook Ads, Landing, Referido
  etapaPipeline: PipelineStageId;
  ownerId?: ID | null; // usuario responsable (closer / asesor)
  ownerNombre?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  tags?: string[];
  score?: number | null; // lead scoring simple (0-100)
  notasResumen?: string | null;
  creadoAt: string; // ISO
  actualizadoAt: string; // ISO
  nextActionAt?: string | null; // próxima acción planificada (ISO)
  origenCampaignId?: ID | null; // campaña de marketing
  convertedStudentId?: ID | null; // alumno creado
  fechaConversion?: string | null; // ISO
}

/* ========================= Venta / Contrato / Accesos ========================= */
export type VentaEstadoId =
  | "pendiente_verificacion" // Registro inicial - esperando validar pago
  | "pago_por_confirmar" // se registró pago manual, falta confirmar
  | "pago_confirmado" // pago OK
  | "contrato_enviado" // contrato mandado para firma
  | "contrato_firmado" // contrato firmado
  | "acceso_activo" // acceso completo
  | "acceso_provisional" // acceso parcial / provisional
  | "pendiente_cobro" // cuota vencida reciente
  | "congelado" // acceso congelado por mora
  | "baja_definitiva" // cierre del cupo
  | "cierre_operativo"; // proceso completo

export interface VentaInfo {
  estado: VentaEstadoId;
  programa?: string | null; // nombre del programa adquirido
  modalidadPago?: string | null; // contado, cuotas, etc.
  montoTotal?: number | null;
  moneda?: string | null; // USD, PEN, etc.
  plataformaPago?: string | null; // Hotmart, PayPal, Binance, Zelle...
  bonosOfrecidos?: string[]; // lista de bonos/beneficios
  contratoNombre?: string | null; // nombre en contrato si difiere
  contratoEnlace?: string | null; // link firma digital (DropboxSign etc)
  contratoFirmadoAt?: string | null;
  accesoActivadoAt?: string | null;
  accesoProvisionalExpiraAt?: string | null; // si es provisional
  cierreOperativoAt?: string | null;
}

/* ========================= Cobros / Pagos futuros ========================= */
export interface PaymentScheduleItem {
  id: ID;
  tipo: "cuota" | "renovacion" | "otro";
  numero?: number | null; // número de cuota
  monto: number;
  moneda?: string | null;
  dueAt: string; // fecha de vencimiento (ISO date)
  pagadoAt?: string | null; // fecha pago efectuado
  comprobanteUrl?: string | null;
  estado: "pendiente" | "pagado" | "retraso" | "cancelado";
  extensionGraciaHasta?: string | null; // D+7 si aplica
}

/* ========================= Actividades / Historial ========================= */
export type ActivityTipo =
  | "nota"
  | "llamada"
  | "email"
  | "tarea"
  | "whatsapp"
  | "pago"
  | "contrato"
  | "acceso"
  | "estado"
  | "trigger"; // actividad generada automáticamente por el sistema

export interface ProspectActivity {
  id: ID;
  prospectId: ID;
  tipo: ActivityTipo;
  texto?: string | null; // contenido libre
  metadata?: Record<string, any> | null;
  createdAt: string; // ISO
  createdBy?: ID | null; // usuario que creó
  createdByNombre?: string | null;
  dueAt?: string | null; // para tareas
  completedAt?: string | null; // fin de tarea / llamada etc.
}

/* ========================= Prospecto extendido ========================= */
export interface Prospect extends ProspectCore {
  venta: VentaInfo;
  paymentSchedule: PaymentScheduleItem[]; // cuotas futuras
  actividades: ProspectActivity[]; // timeline (puede cargarse on-demand)
}

/* ========================= Respuestas de servicio ========================= */
export interface ListProspectsParams {
  search?: string;
  etapa?: PipelineStageId;
  ownerId?: ID;
  canal?: string;
  desde?: string; // ISO desde creadoAt
  hasta?: string; // ISO hasta creadoAt
  estadoVenta?: VentaEstadoId;
}

export interface ListProspectsResult {
  items: ProspectCore[]; // versión liviana
  total: number;
}

/* ========================= Formularios de reserva ========================= */
export type ReservationFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "textarea"
  | "select"
  | "date";

export interface ReservationField {
  id: ID;
  label: string;
  type: ReservationFieldType;
  required?: boolean;
  options?: string[]; // para selects
}

export interface ReservationForm {
  id: ID;
  nombre: string;
  descripcion?: string | null;
  creadoAt: string;
  actualizadoAt: string;
  fields: ReservationField[];
  destino?: {
    // configuración de envío (mock por ahora)
    email?: string | null;
    webhookUrl?: string | null;
  } | null;
}

/* ========================= Scheduling (tipo Calendly lightweight) ========================= */
export interface SchedulingSlot {
  id: ID;
  formId: ID; // formulario asociado
  startAt: string; // ISO
  endAt: string; // ISO
  timezone?: string | null; // IANA tz
  createdAt: string; // ISO
  booked?: boolean; // derivado para UI
}

export interface ReservationBooking {
  id: ID;
  formId: ID;
  slotId: ID;
  prospectId?: ID | null; // si se asocia a un prospecto existente
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  answers?: Record<string, any> | null; // respuestas de campos del form
  createdAt: string; // ISO
}

/* ========================= Métricas ========================= */
export interface CrmGlobalMetrics {
  totalProspects: number;
  byStage: Record<PipelineStageId, number>;
  won: number; // ganados
  lost: number; // perdidos
  contacted: number; // etapa contactado o más
  conversionRate: number; // won / total
}

export interface SellerMetricsRow {
  ownerId: ID | null;
  ownerNombre: string;
  total: number;
  contacted: number;
  qualified: number; // calificado + propuesta
  won: number;
  lost: number;
}

export interface SellerMetricsResult {
  rows: SellerMetricsRow[];
  totalOwners: number;
}

// Métricas ampliadas
export interface FunnelMetrics {
  counts: Record<PipelineStageId, number>;
  percentages: Record<PipelineStageId, number>;
}

export interface ChannelMetricsRow {
  canal: string;
  total: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  conversionRate: number;
}
export interface ChannelMetricsResult {
  rows: ChannelMetricsRow[];
  totalCanales: number;
}

export interface TrendPoint {
  date: string; // ISO o etiqueta
  created: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
}

export interface StageAgeStat {
  stage: PipelineStageId;
  avgDaysInStage: number;
  maxDaysInStage: number;
}

/* ========================= Automatizaciones ========================= */
export type AutomationTriggerId =
  | "registro_inicial"
  | "validacion_pago"
  | "envio_contrato"
  | "firma_contrato"
  | "activacion_accesos"
  | "recordatorio_pago"
  | "seguimiento_mora"
  | "congelamiento_accesos"
  | "reactivacion_recordatorio"
  | "cierre_operativo"
  | "baja_definitiva";

export interface AutomationEvent {
  id: ID;
  trigger: AutomationTriggerId;
  prospectId: ID;
  createdAt: string;
  payload?: Record<string, any> | null;
}

/* ========================= Constantes por defecto ========================= */
export const DEFAULT_PIPELINE: PipelineStage[] = [
  { id: "nuevo", orden: 1, nombre: "Nuevo", color: "bg-slate-100" },
  { id: "contactado", orden: 2, nombre: "Contactado", color: "bg-blue-50" },
  { id: "calificado", orden: 3, nombre: "Calificado", color: "bg-amber-50" },
  { id: "propuesta", orden: 4, nombre: "Propuesta", color: "bg-purple-50" },
  { id: "ganado", orden: 5, nombre: "Ganado", color: "bg-emerald-50", probabilidad: 1 },
  { id: "perdido", orden: 6, nombre: "Perdido", color: "bg-red-50", probabilidad: 0 },
];

export const VENTA_ESTADOS_ORDER: VentaEstadoId[] = [
  "pendiente_verificacion",
  "pago_por_confirmar",
  "pago_confirmado",
  "contrato_enviado",
  "contrato_firmado",
  "acceso_activo",
  "acceso_provisional",
  "pendiente_cobro",
  "congelado",
  "baja_definitiva",
  "cierre_operativo",
];

export const AUTOMATION_TRIGGERS_HUMAN: Record<AutomationTriggerId, string> = {
  registro_inicial: "Registro inicial creado",
  validacion_pago: "Validación de pago",
  envio_contrato: "Envío de contrato",
  firma_contrato: "Contrato firmado",
  activacion_accesos: "Activación de accesos",
  recordatorio_pago: "Recordatorio de pago",
  seguimiento_mora: "Seguimiento de mora",
  congelamiento_accesos: "Accesos congelados",
  reactivacion_recordatorio: "Recordatorio de reactivación",
  cierre_operativo: "Cierre operativo completado",
  baja_definitiva: "Baja definitiva",
};

/* ========================= Utilidades ========================= */
export function nowIso(): string {
  return new Date().toISOString();
}

export function generateId(prefix: string = "id"): ID {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
