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

/* ======================================================================
   FLUJO COMERCIAL DE VENTAS (Protocolo Closer)
   Mapeo completo del proceso: Pre-llamada → Llamada → Seguimiento → Recuperación → Reactivación
====================================================================== */

/** Tipo de producto/oferta del cierre */
export type TipoVentaOferta =
  | "hotselling_pro"      // VENTA HOTSELLING PRO
  | "hotselling_starter"  // VENTA HOTSELLING STARTER (reserva cupo)
  | "downsell";           // CIERRE DOWNSELL

/** Tipo de objeción clasificada durante la llamada */
export type TipoObjecion =
  | "financiera"    // no tiene el dinero / necesita cuotas
  | "momento"       // no es el momento adecuado
  | "confianza"     // no confía en el programa / resultado
  | "falta_claridad" // no entiende bien la propuesta
  | "contractual"   // dudas sobre contrato / compromiso
  | "consulta_socio"; // necesita consultar con pareja / socio

/** Resultado de la llamada de venta */
export type ResultadoLlamada =
  | "no_show"         // NO SHOW — cliente no asistió y no respondió
  | "cancelada"       // CANCELADA — cliente respondió que no asistirá
  | "asistio"         // Asistencia confirmada — se realizó la llamada
  | "pendiente";      // Aún sin resultado

/** Resultado final del proceso de cierre */
export type ResultadoCierre =
  | "ganado_hpro"       // CIERRE HPRO EN LLAMADA
  | "ganado_starter"    // CIERRE — CLIENTE HOTSELLING STARTER
  | "ganado_downsell"   // CIERRA DOWNSELL
  | "pendiente_pago"    // Agreed fecha de pago restante (Starter)
  | "objecion_activa"   // Está en negociación con objeción
  | "perdido"           // Cliente perdido definitivo
  | null;               // Sin cierre aún

/** Record de un mensaje de seguimiento enviado */
export interface SeguimientoMensaje {
  id: ID;
  dia: number;          // Día del protocolo (0,1,2,4,6,7,10,14,21,30,60,90)
  tipo:
    | "conexion"
    | "recurso"
    | "cierre"
    | "reagenda_noshow" // mensajes de no-show
    | "prellamada"
    | "template_inicio" // template para iniciar contacto (fase recuperación)
    | "largo_plazo";    // fase 5 reactivación
  contenido?: string | null;
  enviadoAt: string;    // ISO cuándo se marcó como enviado
  estado: "pendiente" | "enviado" | "respondido";
  notas?: string | null;
}

/** Seguimiento estratégico con clasificación de objeción */
export interface SeguimientoEstrategico {
  activo: boolean;
  inicioAt?: string | null;         // cuándo se activó el seguimiento (72h sin resultado)
  tipoObjecion?: TipoObjecion | null;
  recursosEnviados?: string[];      // lista de recursos enviados según tipo de objeción
  diasCompletados?: number[];       // días del protocolo ya ejecutados [0,1,2,4,6,7]
  respuestaRecibida?: boolean;
  fechaRespuesta?: string | null;
}

/** Estado completo del flujo comercial de un lead */
export interface SalesFlowState {
  // ─── FASE 1: PRE-LLAMADA ─────────────────────────────────────────────
  fase: 1 | 2 | 3 | 4 | 5;         // fase actual del proceso
  registroAt?: string | null;        // REGISTRO DE LEAD EN CRM
  agendaCalendlyAt?: string | null;  // fecha/hora de la llamada agendada via Calendly
  precallReminderEnviado24h?: boolean;
  precallReminderEnviado1h?: boolean;
  precallReminderEnviadoManual?: boolean;
  leadAgendoLlamada?: boolean;       // ¿Lead agendó llamada mediante Calendly?
  primerContactoRespondido?: boolean; // ¿Lead respondió primer contacto?

  // ─── FASE 2: LLAMADA DE VENTA ────────────────────────────────────────
  resultadoLlamada?: ResultadoLlamada | null;
  evidenciaNoShow?: Array<{
    id: ID;
    name?: string;
    type?: string;
    size?: number;
    dataUrl: string;
    created_at: string;
  }>;
  evidenciaCancelada?: Array<{
    id: ID;
    name?: string;
    type?: string;
    size?: number;
    dataUrl: string;
    created_at: string;
  }>;
  noShowMensajes?: {                // mensajes de reagenda automáticos tras no-show
    enviado10m?: boolean;
    enviado1h?: boolean;
    enviado24h?: boolean;
  };
  canceladaFechaReagenda?: string | null;   // fecha propuesta de reagenda tras cancelación
  // datos de calificación en llamada
  dolorIdentificado?: string | null;
  objetivoIdentificado?: string | null;
  situacionActual?: string | null;
  califica?: boolean | null;              // ¿lead califica?
  // cierre
  ofertaPresentada?: TipoVentaOferta | null;
  resultadoCierre?: ResultadoCierre | null;
  tipoObjecion?: TipoObjecion | null;      // objeción clasificada en llamada
  fechaPagoRestanteAcordada?: string | null; // fecha acordada para pago del restante (Starter)
  montoReserva?: number | null;             // monto de la reserva (si aplica)
  ventaIngresadaCrm?: boolean;              // ¿se registró la venta en el CRM?
  ventaIngresadaAt?: string | null;

  // ─── FASE 3: SEGUIMIENTO ACTIVO ──────────────────────────────────────
  seguimientoActivo?: SeguimientoEstrategico | null;
  mensajes?: SeguimientoMensaje[];          // historial de todos los mensajes del protocolo
  conversacionActiva?: boolean;             // ¿existe conversación activa?
  leadRespondioSeguimiento?: boolean;

  // ─── FASE 4: RECUPERACIÓN ────────────────────────────────────────────
  recuperacionActiva?: boolean;
  templatesInicioEnviados?: boolean;        // Envío de Templates para iniciar contacto
  leadPidioRecontactoFuturo?: boolean;      // lead pidió recontacto en el futuro
  fechaRecontactoFuturo?: string | null;
  recuperacionTerminoSinRespuesta?: boolean;

  // ─── FASE 5: REACTIVACIÓN A LARGO PLAZO ─────────────────────────────
  reactivacionActiva?: boolean;
  retargetingActivo?: boolean;
  eventoInmersionL2H?: boolean;            // invitado a Evento Inmersión L2H
  diasReactivacion?: number[];             // [30, 60, 90] días completados

  // metadatos
  updatedAt: string;                        // ISO última actualización
  notas?: string | null;                    // notas libres del closer
}

/** Helpers de utilidad para el flujo */
export const PROTOCOL_DAYS_FASE3 = [0, 1, 2, 4, 6, 7] as const;
export const PROTOCOL_DAYS_FASE4 = [10, 14, 21, 30] as const;
export const PROTOCOL_DAYS_FASE5 = [30, 60, 90] as const;

export const TIPO_OBJECION_LABELS: Record<TipoObjecion, string> = {
  financiera: "Financiera",
  momento: "Momento",
  confianza: "Confianza",
  falta_claridad: "Falta de claridad",
  contractual: "Contractual",
  consulta_socio: "Consulta con socio",
};

export const RESULTADO_LLAMADA_LABELS: Record<ResultadoLlamada, string> = {
  no_show: "NO SHOW",
  cancelada: "Cancelada",
  asistio: "Asistencia",
  pendiente: "Pendiente",
};

export const TIPO_VENTA_LABELS: Record<TipoVentaOferta, string> = {
  hotselling_pro: "Hotselling PRO",
  hotselling_starter: "Hotselling Starter",
  downsell: "Downsell",
};

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
