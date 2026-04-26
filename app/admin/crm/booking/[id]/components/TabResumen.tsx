"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Tags,
  Target,
  TrendingUp,
  User,
} from "lucide-react";

const CRM_PIPELINE_OPTIONS = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "no_show", label: "No Show" },
  { value: "llamada_realizada", label: "Llamada realizada" },
  { value: "decision", label: "Decisión" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "recuperacion", label: "Recuperación" },
  { value: "lead_dormido", label: "Lead dormido" },
  { value: "cerrado_ganado", label: "Cerrado ganado" },
  { value: "cerrado_perdido", label: "Cerrado perdido" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "pro", label: "Pro" },
  { value: "starter", label: "Starter" },
  { value: "no_califica", label: "No califica" },
];

const PRODUCT_PRESENTED_OPTIONS = [
  { value: "hotselling_pro", label: "Hotselling PRO" },
  { value: "hotselling_starter", label: "Hotselling Starter" },
];

const OBJECTION_OPTIONS = [
  { value: "financiera", label: "Financiera" },
  { value: "momento", label: "Momento" },
  { value: "confianza", label: "Confianza" },
  { value: "falta_claridad", label: "Falta de claridad" },
  { value: "contractual", label: "Contractual" },
  { value: "consulta_socio", label: "Consulta con socio" },
  { value: "otro", label: "Otro" },
];

const LOST_REASON_OPTIONS = [
  { value: "no_califica", label: "No califica" },
  { value: "precio_alto", label: "Precio alto" },
  { value: "sin_urgencia", label: "Sin urgencia" },
  { value: "decision_externa", label: "Decisión externa" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "competencia", label: "Eligió otra opción" },
  { value: "otro", label: "Otro" },
];

const CONVERSATION_STATUS_OPTIONS = [
  { value: "activa", label: "Activa" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "pausada", label: "Pausada" },
];

const CHANNEL_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "llamada", label: "Llamada" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
  { value: "otro", label: "Otro" },
];

const PROTOCOL_OPTIONS = [
  { value: "pre_llamada", label: "Pre llamada" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "recuperacion", label: "Recuperación" },
  { value: "reactivacion", label: "Reactivación" },
];

const TEMPLATE_OPTIONS = [
  { value: "bienvenida", label: "Bienvenida" },
  { value: "recordatorio_24h", label: "Recordatorio 24h" },
  { value: "recordatorio_12h", label: "Recordatorio 12h" },
  { value: "recordatorio_1h", label: "Recordatorio 1h" },
  { value: "post_llamada_d0", label: "Post llamada (Día 0)" },
  { value: "seguimiento_d1", label: "Seguimiento (Día 1)" },
  { value: "recurso_d2", label: "Recurso (Día 2)" },
  { value: "seguimiento_d4", label: "Seguimiento (Día 4)" },
  { value: "recurso_d6", label: "Recurso (Día 6)" },
  { value: "decision_d7", label: "Mensaje decisión (Día 7)" },
  { value: "reapertura_d10", label: "Reapertura (Día 10)" },
  { value: "valor_d14", label: "Contenido valor (Día 14)" },
  { value: "intento_d21", label: "Nuevo intento (Día 21)" },
  { value: "cierre_d30", label: "Cierre seguimiento (Día 30)" },
  { value: "reactivacion_60", label: "Reactivación 60 días" },
  { value: "reactivacion_90", label: "Reactivación 90 días" },
];

const RESOURCE_OPTIONS = [
  { value: "testimonios", label: "Testimonios alumnos" },
  { value: "casos_exito", label: "Casos de éxito" },
  { value: "video_programa", label: "Video explicación programa" },
  { value: "video_inversion", label: "Video inversión" },
  { value: "terminos_contrato", label: "Documento términos contrato" },
  { value: "brochure", label: "Brochure comercial" },
  { value: "faq", label: "FAQ comercial" },
];

/* ── Helpers de fase — determina qué secciones se muestran ────────── */

/** Nivel numérico del pipeline para comparación ≥ */
function pipelineLevel(status: string): number {
  switch (status) {
    case "agendado":
      return 1;
    case "confirmado":
      return 2;
    case "no_show":
      return 3;
    case "llamada_realizada":
      return 3;
    case "decision":
      return 4;
    case "seguimiento":
      return 5;
    case "recuperacion":
      return 6;
    case "lead_dormido":
      return 7;
    case "cerrado_ganado":
      return 8;
    case "cerrado_perdido":
      return 8;
    default:
      return 0;
  }
}

const CLOSER_PHASE_META = {
  1: {
    label: "Fase 1 · Pre-llamada",
    defaultStatus: "agendado",
  },
  2: {
    label: "Fase 2 · Llamada de venta",
    defaultStatus: "llamada_realizada",
  },
  3: {
    label: "Fase 3 · Seguimiento activo",
    defaultStatus: "seguimiento",
  },
  4: {
    label: "Fase 4 · Recuperación",
    defaultStatus: "recuperacion",
  },
  5: {
    label: "Fase 5 · Reactivación",
    defaultStatus: "lead_dormido",
  },
} as const;

function getCloserPhase(status: string, salesFlow: any): 1 | 2 | 3 | 4 | 5 {
  switch (status) {
    case "agendado":
    case "confirmado":
      return 1;
    case "no_show":
    case "llamada_realizada":
    case "decision":
    case "cerrado_ganado":
    case "cerrado_perdido":
      return 2;
    case "seguimiento":
      return 3;
    case "recuperacion":
      return 4;
    case "lead_dormido":
      return 5;
    default: {
      const fallback = Number(salesFlow?.fase);
      return fallback >= 1 && fallback <= 5
        ? (fallback as 1 | 2 | 3 | 4 | 5)
        : 1;
    }
  }
}

function getCloserPhaseContext(status: string, salesFlow: any) {
  const phase = getCloserPhase(status, salesFlow);
  const meta = CLOSER_PHASE_META[phase];
  return {
    phase,
    phaseLabel: meta.label,
    statusForChecklist: status || meta.defaultStatus,
  };
}

/** Item del checklist del closer */
interface ChecklistItem {
  label: string;
  done: boolean;
  sublabel?: string;
  /** Clave en sales_flow para toggle inline (tareas de confirmación) */
  actionKey?: string;
  /** Texto del botón de acción */
  actionLabel?: string;
  required?: boolean;
  /** ID del elemento HTML al que navegar */
  scrollTo?: string;
}

/** Siguiente fase del pipeline */
function getNextPipelineStage(
  current: string,
  p: any,
): { value: string; label: string } | null {
  const resultadoLlamada = p?.sales_flow?.resultadoLlamada;
  const resultadoCierre = p?.sales_flow?.resultadoCierre;
  const leadRespondioSeguimiento = p?.sales_flow?.leadRespondioSeguimiento;
  const leadPidioRecontactoFuturo = p?.sales_flow?.leadPidioRecontactoFuturo;
  const recuperacionTerminoSinRespuesta =
    p?.sales_flow?.recuperacionTerminoSinRespuesta;

  switch (current) {
    case "agendado":
      return { value: "confirmado", label: "Confirmado" };
    case "confirmado":
      if (resultadoLlamada === "no_show") {
        return { value: "no_show", label: "No Show" };
      }
      if (resultadoLlamada === "asistio" || resultadoLlamada === "cancelada") {
        return { value: "llamada_realizada", label: "Llamada realizada" };
      }
      // Fallback: Fase 1 completada, avanzar a fase de llamada
      return { value: "llamada_realizada", label: "Llamada realizada" };
    case "no_show":
      return { value: "seguimiento", label: "Seguimiento" };
    case "llamada_realizada":
    case "decision":
      if (
        resultadoCierre === "ganado_hpro" ||
        resultadoCierre === "ganado_starter" ||
        resultadoCierre === "ganado_downsell" ||
        resultadoCierre === "pendiente_pago"
      ) {
        return { value: "cerrado_ganado", label: "Cerrado ganado" };
      }
      if (resultadoCierre === "perdido") {
        return { value: "cerrado_perdido", label: "Cerrado perdido" };
      }
      if (resultadoCierre === "objecion_activa") {
        return { value: "seguimiento", label: "Seguimiento" };
      }
      return null;
    case "seguimiento":
      if (leadRespondioSeguimiento === false) {
        return { value: "recuperacion", label: "Recuperación" };
      }
      if (leadRespondioSeguimiento === true) {
        return { value: "decision", label: "Decisión" };
      }
      return null;
    case "recuperacion":
      if (recuperacionTerminoSinRespuesta) {
        return { value: "lead_dormido", label: "Lead dormido" };
      }
      if (leadPidioRecontactoFuturo === true) {
        return { value: "lead_dormido", label: "Lead dormido" };
      }
      return null;
    default:
      return null;
  }
}

/** Checklist de actividades por fase del pipeline */
function getCloserChecklist(pipelineStatus: string, p: any): ChecklistItem[] {
  const ps = pipelineStatus;
  const items: ChecklistItem[] = [];

  // FASE 1: PRE-LLAMADA (agendado / confirmado)
  if (ps === "agendado" || ps === "confirmado" || !ps) {
    items.push(
      {
        label: "Registro de lead en CRM",
        done: true,
        sublabel: "Automático al agendar",
      },
      {
        label: "¿Lead respondió primer contacto?",
        done: !!p.sales_flow?.primerContactoRespondido,
        actionKey: "sales_flow.primerContactoRespondido",
        actionLabel: "Sí, respondió",
        scrollTo: "seccion-conversacion",
        required: true,
      },
      {
        label: "Envío de templates para iniciar contacto",
        done: !!p.sales_flow?.templatesInicioEnviados,
        actionKey: "sales_flow.templatesInicioEnviados",
        actionLabel: "Templates enviados",
        scrollTo: "seccion-plantillas",
        required: true,
      },
      {
        label: "Mensaje pre-llamada 24hrs antes",
        done: !!p.sales_flow?.precallReminderEnviado24h,
        actionKey: "sales_flow.precallReminderEnviado24h",
        actionLabel: "Enviado",
        scrollTo: "seccion-conversacion",
        required: true,
      },
      {
        label: "Mensaje pre-llamada 1hr antes",
        done: !!p.sales_flow?.precallReminderEnviado1h,
        actionKey: "sales_flow.precallReminderEnviado1h",
        actionLabel: "Enviado",
        scrollTo: "seccion-conversacion",
      },
      {
        label: "Lead agendó llamada mediante Calendly",
        done: !!p.sales_flow?.leadAgendoLlamada,
        actionKey: "sales_flow.leadAgendoLlamada",
        scrollTo: "seccion-conversacion",
        actionLabel: "Ir a confirmar",
        required: true,
      },
      {
        label: "Recordatorio automático (Calendly)",
        done: !!p.sales_flow?.leadAgendoLlamada,
        sublabel: "Automático al existir agenda confirmada",
      },
    );
    return items;
  }

  // FASE 2: LLAMADA DE VENTA
  if (ps === "no_show" || ps === "llamada_realizada" || ps === "decision") {
    if (ps === "no_show") {
      items.push(
        {
          label: "Resultado: NO SHOW",
          done: true,
          sublabel: "Cliente no asistió",
        },
        {
          label: "Mensaje Reagenda: 10 min después",
          done: !!p.sales_flow?.noShowMensajes?.enviado10m,
          actionKey: "sales_flow.noShowMensajes.enviado10m",
          actionLabel: "Enviado",
          scrollTo: "seccion-conversacion",
          required: true,
        },
        {
          label: "Mensaje Reagenda: 1hr después",
          done: !!p.sales_flow?.noShowMensajes?.enviado1h,
          actionKey: "sales_flow.noShowMensajes.enviado1h",
          actionLabel: "Enviado",
          scrollTo: "seccion-conversacion",
          required: true,
        },
        {
          label: "Mensaje Reagenda: 24hrs después",
          done: !!p.sales_flow?.noShowMensajes?.enviado24h,
          actionKey: "sales_flow.noShowMensajes.enviado24h",
          actionLabel: "Enviado",
          scrollTo: "seccion-conversacion",
        },
      );
    } else {
      items.push(
        {
          label: "Resultado de asistencia registrado",
          done: p.sales_flow?.resultadoLlamada === "asistio",
          scrollTo: "seccion-conversacion",
          actionLabel: "Ir a llamada",
          required: true,
        },
        {
          label: "Identificar dolor y objetivo",
          done:
            !!p.sales_flow?.dolorIdentificado &&
            !!p.sales_flow?.objetivoIdentificado,
          scrollTo: "seccion-notas",
          actionLabel: "Ir a completar",
          required: true,
          sublabel: "Registrar en notas del lead",
        },
        {
          label: "Explorar situación actual",
          done: !!p.sales_flow?.situacionActual,
          scrollTo: "seccion-notas",
          actionLabel: "Ir a completar",
          required: true,
          sublabel: "Registrar en notas del lead",
        },
        {
          label: "¿Lead califica?",
          done:
            p.sales_flow?.califica !== undefined &&
            p.sales_flow?.califica !== null,
          scrollTo: "seccion-tipo-cliente",
          actionLabel: "Ir a llamada",
          required: true,
        },
      );

      if (p.sales_flow?.califica === false) {
        items.push(
          {
            label: "Especificar motivo de por qué no califica",
            done: !!p.sales_flow?.motivoNoCalifica?.trim(),
            scrollTo: "seccion-notas",
            actionLabel: "Ir a completar",
            required: true,
          },
          {
            label: "Registrar cierre perdido",
            done: p.sales_flow?.resultadoCierre === "perdido",
            scrollTo: "gestion-lead",
            actionLabel: "Ir a completar",
          },
        );
      } else {
        items.push(
          {
            label: "Calificar lead (tipo de cliente)",
            done: !!p.customer_type,
            scrollTo: "seccion-tipo-cliente",
            actionLabel: "Ir a clasificar",
            required: true,
          },
          {
            label: "Seleccionar resultado comercial",
            done: !!p.sales_flow?.resultadoCierre,
            scrollTo: "gestion-lead",
            actionLabel: "Ir a completar",
            required: true,
            sublabel:
              "CIERRE HPRO, H STARTER, RESERVA, CIERRE PERDIDO o SEGUIMIENTO",
          },
        );

        if (
          !p.sales_flow?.resultadoCierre ||
          p.sales_flow?.resultadoCierre === "objecion_activa"
        ) {
          items.push(
            {
              label: "Clasificar tipo de objeción",
              done: !!p.objection_type,
              scrollTo: "seccion-objecion",
              actionLabel: "Ir a objeción",
              required: true,
            },
            {
              label: "Rebatir objeciones — enviar recurso",
              done: !!p.last_resource_sent_name,
              scrollTo: "seccion-plantillas",
              actionLabel: "Ir a recursos",
              sublabel: "Seleccionar recurso enviado según tipo de objeción",
            },
          );
        }
      }
    }
    return items;
  }

  // FASE 3: SEGUIMIENTO ACTIVO (7 días)
  if (ps === "seguimiento") {
    const dias = p.sales_flow?.seguimientoActivo?.diasCompletados ?? [];
    items.push(
      {
        label: "Día 0: Conexión — mensaje post-llamada",
        done: dias.includes(0),
        actionKey: "sales_flow.seguimientoActivo.dia0",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
        required: true,
        sublabel: "Enviar mensaje y registrar interacción",
      },
      {
        label: "Día 1: Seguimiento",
        done: dias.includes(1),
        actionKey: "sales_flow.seguimientoActivo.dia1",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
        required: true,
      },
      {
        label: "Día 2: Enviar recurso según objeción",
        done: dias.includes(2),
        actionKey: "sales_flow.seguimientoActivo.dia2",
        actionLabel: "Hecho",
        scrollTo: "seccion-plantillas",
        sublabel: p.sales_flow?.tipoObjecion
          ? `Objeción: ${p.sales_flow.tipoObjecion}`
          : "Seleccionar recurso según objeción",
      },
      {
        label: "Día 4: Seguimiento",
        done: dias.includes(4),
        actionKey: "sales_flow.seguimientoActivo.dia4",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
      },
      {
        label: "Día 6: Enviar segundo recurso",
        done: dias.includes(6),
        actionKey: "sales_flow.seguimientoActivo.dia6",
        actionLabel: "Hecho",
        scrollTo: "seccion-plantillas",
      },
      {
        label: "Día 7: Cierre de seguimiento",
        done: dias.includes(7),
        actionKey: "sales_flow.seguimientoActivo.dia7",
        actionLabel: "Hecho",
        scrollTo: "gestion-lead",
        required: true,
        sublabel: "Si no hay respuesta → cambiar a Recuperación",
      },
      {
        label: "Respuesta del lead registrada",
        done:
          p.sales_flow?.leadRespondioSeguimiento !== undefined &&
          p.sales_flow?.leadRespondioSeguimiento !== null,
        scrollTo: "seccion-conversacion",
        actionLabel: "Ir a seguimiento",
        required: true,
      },
    );
    return items;
  }

  // FASE 4: RECUPERACIÓN (días 10-30)
  if (ps === "recuperacion") {
    const msgs = (p.sales_flow?.mensajes ?? []) as any[];
    const enviados = msgs
      .filter((m: any) => m.tipo === "template_inicio")
      .map((m: any) => m.dia);
    items.push(
      {
        label: "Envío de templates para iniciar contacto",
        done: !!p.sales_flow?.templatesInicioEnviados,
        actionKey: "sales_flow.templatesInicioEnviados",
        actionLabel: "Hecho",
        scrollTo: "seccion-plantillas",
        required: true,
      },
      {
        label: "Acción Día 10: Reapertura conversación",
        done: enviados.includes(10),
        actionKey: "sales_flow.recuperacion.dia10",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
        required: true,
      },
      {
        label: "Acción Día 14: Contenido de valor",
        done: enviados.includes(14),
        actionKey: "sales_flow.recuperacion.dia14",
        actionLabel: "Hecho",
        scrollTo: "seccion-plantillas",
      },
      {
        label: "Acción Día 21: Nuevo intento",
        done: enviados.includes(21),
        actionKey: "sales_flow.recuperacion.dia21",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
      },
      {
        label: "Acción Día 30: Cierre seguimiento",
        done: enviados.includes(30),
        actionKey: "sales_flow.recuperacion.dia30",
        actionLabel: "Hecho",
        scrollTo: "gestion-lead",
        required: true,
        sublabel: "Si no responde → cambiar a Lead dormido",
      },
      {
        label: "Resultado de recuperación registrado",
        done:
          p.sales_flow?.leadPidioRecontactoFuturo === true ||
          !!p.sales_flow?.recuperacionTerminoSinRespuesta,
        scrollTo: "seccion-conversacion",
        actionLabel: "Ir a recuperación",
        required: true,
      },
      {
        label: "Fecha de recontacto futuro",
        done:
          p.sales_flow?.leadPidioRecontactoFuturo === true
            ? !!p.sales_flow?.fechaRecontactoFuturo
            : true,
        scrollTo: "seccion-conversacion",
        actionLabel: "Ir a recuperación",
      },
    );
    return items;
  }

  // FASE 5: REACTIVACIÓN LARGO PLAZO
  if (ps === "lead_dormido") {
    const diasR = p.sales_flow?.diasReactivacion ?? [];
    items.push(
      {
        label: "Día 30: Primer contacto reactivación",
        done: diasR.includes(30),
        actionKey: "sales_flow.reactivacion.dia30",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
        required: true,
      },
      {
        label: "Día 60: Mensaje reactivación",
        done: diasR.includes(60),
        actionKey: "sales_flow.reactivacion.dia60",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
      },
      {
        label: "Día 90: Invitación nueva llamada — Retargeting",
        done: diasR.includes(90),
        actionKey: "sales_flow.reactivacion.dia90",
        actionLabel: "Hecho",
        scrollTo: "seccion-conversacion",
        required: true,
      },
      {
        label: "Retargeting activado",
        done: !!p.sales_flow?.retargetingActivo,
        actionKey: "sales_flow.retargetingActivo",
        actionLabel: "Activar",
        scrollTo: "seccion-conversacion",
      },
      {
        label: "Evento Inmersión L2H",
        done: !!p.sales_flow?.eventoInmersionL2H,
        actionKey: "sales_flow.eventoInmersionL2H",
        actionLabel: "Hecho",
        scrollTo: "seccion-notas",
      },
    );
    return items;
  }

  // CERRADO GANADO
  if (ps === "cerrado_ganado") {
    items.push(
      { label: "Venta cerrada", done: true },
      {
        label: "Ingreso de venta a CRM",
        done: !!p.sales_flow?.ventaIngresadaCrm,
        actionKey: "sales_flow.ventaIngresadaCrm",
        actionLabel: "Hecho",
        scrollTo: "gestion-lead",
        required: true,
      },
      {
        label: "Closer acuerda fecha de pago del restante",
        done: !!p.next_charge_date,
        scrollTo: "seccion-conversacion",
        actionLabel: "Ir a fechas",
        required: true,
      },
      {
        label: "Seguimiento de pago restante",
        done: !!p.payment_status && p.payment_status !== "pending",
        scrollTo: "gestion-lead",
        actionLabel: "Ver estado de pago",
        sublabel: "A cargo del closer",
      },
    );
    return items;
  }

  // CERRADO PERDIDO
  if (ps === "cerrado_perdido") {
    items.push(
      {
        label: "Motivo de pérdida registrado",
        done: !!p.lost_reason,
        scrollTo: "gestion-lead",
        actionLabel: "Ir a motivo",
        required: true,
      },
      {
        label: "Clasificación completada",
        done: !!p.lost_reason && !!p.customer_type,
        scrollTo: "gestion-lead",
        actionLabel: "Ir a clasificación",
        required: true,
      },
    );
    return items;
  }

  return items;
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function ensureSalesFlowBase(current: any) {
  const salesFlow = current && typeof current === "object" ? current : {};
  return {
    fase:
      typeof salesFlow.fase === "number" &&
      salesFlow.fase >= 1 &&
      salesFlow.fase <= 5
        ? salesFlow.fase
        : 1,
    mensajes: Array.isArray(salesFlow.mensajes) ? salesFlow.mensajes : [],
    ...salesFlow,
  };
}

interface TabResumenProps {
  p: any;
  user?: any;
  record: any;
  salePayload: any;
  effectiveSalePayload: any;
  draft: any;
  leadStatus: string;
  leadDisposition: string;
  statusLabel: string;
  planSummary: string;
  bonusesList: string[];
  fmtDate: (iso?: string) => string;
  callOutcomeLabel: (raw?: any) => string;
  paymentStatusLabel: (raw?: any) => string;
  applyRecordPatch: (patch: Record<string, any>) => void;
  onNavigate?: (target: {
    tab: "resumen" | "venta" | "seguimiento" | "notas";
    sectionId?: string;
    seguimientoTab?: "flujo_ventas" | "llamada";
  }) => void;
}

/* ── Helpers Calendly ─────────────────────────────────────────────── */
interface CalendlyBlock {
  inviteeUri: string;
  event: string;
  start: string;
  end: string;
  status: string;
  answers: Array<{ question: string; answer: string }>;
}

// Campos de metadatos que no son preguntas del lead
const CALENDLY_META_FIELDS = new Set([
  "Evento",
  "Inicio",
  "Fin",
  "Estado invitado",
  "Invitee URI",
  "Scheduled Event URI",
  "Respuestas",
  "Answers",
]);

function isCalendlyNotes(notes: string): boolean {
  return /\[Calendly:https?:\/\/[^\]]*calendly\.com\//.test(notes);
}

function parseCalendlyBlocks(notes: string): CalendlyBlock[] {
  // Normalizar saltos de línea (Windows \r\n → \n)
  const normalized = notes.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const blockRegex =
    /\[Calendly:(https?:\/\/[^\]]+)\]([\s\S]*?)(?=\[Calendly:|$)/g;
  const blocks: CalendlyBlock[] = [];
  let match;
  while ((match = blockRegex.exec(normalized)) !== null) {
    const inviteeUri = match[1].trim();
    const body = match[2].trim();
    const event = (body.match(/^Evento:\s*(.+)$/m) || [])[1]?.trim() || "";
    const start = (body.match(/^Inicio:\s*(.+)$/m) || [])[1]?.trim() || "";
    const end = (body.match(/^Fin:\s*(.+)$/m) || [])[1]?.trim() || "";
    const status =
      (body.match(/^Estado invitado:\s*(.+)$/m) || [])[1]?.trim() || "";

    // Encontrar inicio de la sección de respuestas (acepta "Respuestas" o "Answers")
    const headerIdx = body.search(/^(?:Respuestas|Answers)\s*:/im);
    // Tomar todo lo que viene DESPUÉS de la línea de encabezado
    const answersText =
      headerIdx >= 0 ? body.slice(body.indexOf("\n", headerIdx) + 1) : "";

    const answers: Array<{ question: string; answer: string }> = [];

    if (answersText.trim()) {
      // Formato primario: "- pregunta: respuesta" o "• pregunta: respuesta"
      // Permite respuesta vacía (\s*.*) para capturar igual la pregunta
      const bulletRegex = /^[-–•]\s*(.+?)\s*:\s*(.*)/gm;
      let m;
      while ((m = bulletRegex.exec(answersText)) !== null) {
        const q = m[1].trim();
        const a = m[2].trim();
        if (q) answers.push({ question: q, answer: a || "—" });
      }

      // Fallback: líneas "pregunta: respuesta" sin bullet (excluye metadatos)
      if (answers.length === 0) {
        const lineRegex = /^(.+?)\s*:\s*(.*)/gm;
        let lm;
        while ((lm = lineRegex.exec(answersText)) !== null) {
          const q = lm[1].trim();
          const a = lm[2].trim();
          if (q && !CALENDLY_META_FIELDS.has(q)) {
            answers.push({ question: q, answer: a || "—" });
          }
        }
      }
    } else {
      // Sin sección "Respuestas:" — extraer pares clave:valor del cuerpo
      // que no sean campos de metadatos conocidos
      const lineRegex = /^[-–•]?\s*(.+?)\s*:\s*(.*)/gm;
      let lm;
      while ((lm = lineRegex.exec(body)) !== null) {
        const q = lm[1].trim();
        const a = lm[2].trim();
        if (q && !CALENDLY_META_FIELDS.has(q) && !a.startsWith("http")) {
          answers.push({ question: q, answer: a || "—" });
        }
      }
    }

    blocks.push({ inviteeUri, event, start, end, status, answers });
  }
  return blocks;
}

export function TabResumen({
  p,
  user,
  record,
  salePayload,
  effectiveSalePayload,
  draft,
  leadStatus,
  leadDisposition,
  statusLabel,
  planSummary,
  bonusesList,
  fmtDate,
  callOutcomeLabel,
  paymentStatusLabel,
  applyRecordPatch,
  onNavigate,
}: TabResumenProps) {
  const [newActivityNote, setNewActivityNote] = React.useState("");

  /* ── Pipeline status y nivel de fase ─────────────────────────────── */
  const crmPipelineStatus = String(p.pipeline_status ?? "").trim();
  const closerPhaseContext = React.useMemo(
    () => getCloserPhaseContext(crmPipelineStatus, p.sales_flow),
    [crmPipelineStatus, p.sales_flow],
  );
  const effectiveChecklistStatus = closerPhaseContext.statusForChecklist;
  const closerPhaseLabel = closerPhaseContext.phaseLabel;
  const level = pipelineLevel(crmPipelineStatus || effectiveChecklistStatus);
  const customerType = String(p.customer_type ?? "").trim();
  const productPresented = String(p.product_presented ?? "").trim();
  const objectionType = String(p.objection_type ?? "").trim();
  const lostReason = String(p.lost_reason ?? "").trim();
  const conversationStatus = String(p.conversation_status ?? "").trim();
  const lastInteractionChannel = String(
    p.last_interaction_channel ?? "",
  ).trim();
  const protocolName = String(p.protocol_name ?? "").trim();
  const protocolStep = String(p.protocol_step ?? "").trim();
  const lastTemplateSent = String(p.last_template_sent_name ?? "").trim();
  const lastResourceSent = String(p.last_resource_sent_name ?? "").trim();
  const wonRecovered =
    p.won_recovered === true ||
    p.won_recovered === 1 ||
    String(p.won_recovered ?? "").toLowerCase() === "true";
  const lastInteractionAt = toDateTimeLocalValue(p.last_interaction_at ?? null);
  const nextContactAt = toDateTimeLocalValue(p.next_contact_at ?? null);
  const followupStartedAt = toDateTimeLocalValue(p.followup_started_at ?? null);
  const recoveryStartedAt = toDateTimeLocalValue(p.recovery_started_at ?? null);
  const sleepingStartedAt = toDateTimeLocalValue(p.sleeping_started_at ?? null);

  const activityLog = Array.isArray(p.activity_log)
    ? (p.activity_log as any[])
    : [];

  /* ── Checklist del closer ────────────────────────────────────────── */
  const checklist = React.useMemo(
    () => getCloserChecklist(effectiveChecklistStatus, p),
    [effectiveChecklistStatus, p],
  );
  const checklistDone = checklist.filter((c) => c.done).length;
  const requiredMissing = checklist.filter((c) => c.required && !c.done);
  const nextStage = getNextPipelineStage(effectiveChecklistStatus, p);
  const allPhaseDone = checklist.length > 0 && checklist.every((c) => c.done);
  const canAdvance = allPhaseDone && nextStage !== null;

  /* ── Acción rápida del checklist ─────────────────────────────────── */
  /** Navega a la sección donde se completa la tarea */
  const handleScrollTo = React.useCallback((target: string) => {
    const el = document.getElementById(target);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const getSeguimientoSectionId = React.useCallback(
    (target: string) => {
      if (target === "seccion-notas") return "sales-flow-notas";
      if (
        target !== "seccion-conversacion" &&
        target !== "seccion-plantillas"
      ) {
        return undefined;
      }

      switch (crmPipelineStatus) {
        case "":
          switch (closerPhaseContext.phase) {
            case 3:
              return "sales-flow-fase-3";
            case 4:
              return "sales-flow-fase-4";
            case 5:
              return "sales-flow-fase-5";
            case 2:
              return "sales-flow-fase-2";
            case 1:
            default:
              return "sales-flow-fase-1";
          }
        case "seguimiento":
          return "sales-flow-fase-3";
        case "recuperacion":
          return "sales-flow-fase-4";
        case "lead_dormido":
          return "sales-flow-fase-5";
        case "no_show":
        case "llamada_realizada":
        case "decision":
        case "cerrado_ganado":
        case "cerrado_perdido":
          return "sales-flow-fase-2";
        case "agendado":
        case "confirmado":
        default:
          return "sales-flow-fase-1";
      }
    },
    [closerPhaseContext.phase, crmPipelineStatus],
  );

  const handleActionNavigation = React.useCallback(
    (target: string) => {
      if (target === "gestion-lead") {
        handleScrollTo(target);
        onNavigate?.({ tab: "resumen", sectionId: target });
        return;
      }

      const sectionId = getSeguimientoSectionId(target);
      if (sectionId) {
        onNavigate?.({
          tab: "seguimiento",
          seguimientoTab: "flujo_ventas",
          sectionId,
        });
        return;
      }

      handleScrollTo(target);
    },
    [getSeguimientoSectionId, handleScrollTo, onNavigate],
  );

  /** Marca/desmarca un item de confirmación en sales_flow */
  const handleToggle = React.useCallback(
    (actionKey: string) => {
      const baseSalesFlow = ensureSalesFlowBase(p.sales_flow);

      // Acciones de día de seguimiento
      const seguimientoDayMatch = actionKey.match(
        /^sales_flow\.seguimientoActivo\.dia(\d+)$/,
      );
      if (seguimientoDayMatch) {
        const day = Number(seguimientoDayMatch[1]);
        const current = baseSalesFlow.seguimientoActivo?.diasCompletados ?? [];
        const next = current.includes(day)
          ? current.filter((d: number) => d !== day)
          : [...current, day];
        applyRecordPatch({
          sales_flow: {
            ...baseSalesFlow,
            seguimientoActivo: {
              ...baseSalesFlow.seguimientoActivo,
              diasCompletados: next,
            },
          },
        });
        return;
      }

      // Acciones de día de recuperación
      const recuperacionMatch = actionKey.match(
        /^sales_flow\.recuperacion\.dia(\d+)$/,
      );
      if (recuperacionMatch) {
        const day = Number(recuperacionMatch[1]);
        const msgs = (baseSalesFlow.mensajes ?? []) as any[];
        const exists = msgs.some((m: any) => m.dia === day);
        applyRecordPatch({
          sales_flow: {
            ...baseSalesFlow,
            mensajes: exists
              ? msgs.filter((m: any) => m.dia !== day)
              : [
                  ...msgs,
                  {
                    tipo: "template_inicio",
                    dia: day,
                    at: new Date().toISOString(),
                  },
                ],
          },
        });
        return;
      }

      // Acciones de día de reactivación
      const reactivacionMatch = actionKey.match(
        /^sales_flow\.reactivacion\.dia(\d+)$/,
      );
      if (reactivacionMatch) {
        const day = Number(reactivacionMatch[1]);
        const current = baseSalesFlow.diasReactivacion ?? [];
        const next = current.includes(day)
          ? current.filter((d: number) => d !== day)
          : [...current, day];
        applyRecordPatch({
          sales_flow: {
            ...baseSalesFlow,
            diasReactivacion: next,
          },
        });
        return;
      }

      // Acciones de nested sales_flow (e.g. sales_flow.noShowMensajes.enviado10m)
      const parts = actionKey.split(".");
      if (parts[0] === "sales_flow" && parts.length >= 2) {
        const sf = { ...baseSalesFlow } as any;
        if (parts.length === 2) {
          sf[parts[1]] = !sf[parts[1]];
        } else if (parts.length === 3) {
          const current = sf[parts[1]]?.[parts[2]];
          sf[parts[1]] = { ...sf[parts[1]], [parts[2]]: !current };
        }
        applyRecordPatch({ sales_flow: sf });
      }
    },
    [p, applyRecordPatch],
  );

  const handleAdvancePhase = React.useCallback(() => {
    if (!canAdvance || !nextStage) return;
    const phaseByPipeline: Record<string, number> = {
      agendado: 1,
      confirmado: 1,
      no_show: 2,
      llamada_realizada: 2,
      decision: 2,
      seguimiento: 3,
      recuperacion: 4,
      lead_dormido: 5,
    };
    applyRecordPatch({
      pipeline_status: nextStage.value,
      ...(phaseByPipeline[nextStage.value]
        ? {
            sales_flow: {
              ...ensureSalesFlowBase(p.sales_flow),
              fase: phaseByPipeline[nextStage.value] as 1 | 2 | 3 | 4 | 5,
            },
          }
        : {}),
    });
  }, [canAdvance, nextStage, applyRecordPatch, p.sales_flow]);

  const autoAdvancedStatusRef = React.useRef<string | null>(null);
  const autoAdvanceReadyRef = React.useRef(false);

  React.useEffect(() => {
    if (!autoAdvanceReadyRef.current) {
      autoAdvanceReadyRef.current = true;
      return;
    }

    if (!canAdvance || !nextStage) return;

    const key = `${effectiveChecklistStatus}->${nextStage.value}`;
    if (autoAdvancedStatusRef.current === key) return;

    autoAdvancedStatusRef.current = key;
    handleAdvancePhase();
  }, [canAdvance, effectiveChecklistStatus, nextStage, handleAdvancePhase]);

  /* ── Campos HubSpot / preguntas de cualificación ─────────────────── */
  const hubspot = p.detalle_preguntas_hubspot;
  const hsInstagram =
    p.instagram_user ?? hubspot?.instagram_user?.respuesta ?? null;
  const hsBudget =
    p.monthly_budget ?? hubspot?.monthly_budget?.respuesta ?? null;
  const hsObstacle =
    p.main_obstacle ?? hubspot?.main_obstacle?.respuesta ?? null;
  const hsInvite = p.invite_others ?? hubspot?.invite_others?.respuesta ?? null;
  const hsCloser = p.closer_name ?? hubspot?.closer_name?.respuesta ?? null;
  const hsSaleNotesRaw = p.sale_notes ?? hubspot?.sale_notes?.respuesta ?? null;
  const calendlyBlocks = React.useMemo(() => {
    if (!hsSaleNotesRaw || !isCalendlyNotes(String(hsSaleNotesRaw))) return [];
    return parseCalendlyBlocks(String(hsSaleNotesRaw));
  }, [hsSaleNotesRaw]);
  const hsSaleNotes =
    hsSaleNotesRaw && !isCalendlyNotes(String(hsSaleNotesRaw))
      ? hsSaleNotesRaw
      : null;
  const hsWhatsapp = p.whatsapp ?? p.phone ?? null;
  const hsArea = p.area_contacto ?? hubspot?.area_contacto?.respuesta ?? null;
  const hsAtendidoPor =
    p.atendido_por ?? hubspot?.atendido_por?.respuesta ?? null;
  const hsTipoEvento = p.tipo_evento ?? hubspot?.tipo_evento?.respuesta ?? null;
  const hsAvatar = p.avatar ?? hubspot?.avatar?.respuesta ?? null;

  /* ── Indicadores rápidos (adaptados a fase) ──────────────────────── */
  const pipelineLabel =
    CRM_PIPELINE_OPTIONS.find((item) => item.value === crmPipelineStatus)
      ?.label || "Sin definir";

  const topStats = [
    { label: "Pipeline CRM", value: pipelineLabel },
    ...(level >= 3
      ? [
          {
            label: "Conversación",
            value:
              CONVERSATION_STATUS_OPTIONS.find(
                (item) => item.value === conversationStatus,
              )?.label || "Sin definir",
          },
        ]
      : []),
    ...(level >= 1
      ? [
          {
            label: "Última interacción",
            value: lastInteractionAt
              ? fmtDate(p.last_interaction_at)
              : "Sin registro",
          },
        ]
      : []),
    ...(level >= 2
      ? [
          {
            label: "Próximo contacto",
            value: nextContactAt ? fmtDate(p.next_contact_at) : "Sin agenda",
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <div className="space-y-8">
        <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
          <CardHeader className="pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-slate-800">Resumen</CardTitle>
                <CardDescription className="text-slate-500">
                  Datos básicos del contacto
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Mail className="h-4 w-4 text-teal-600" />
                  Email
                </div>
                <Input
                  type="email"
                  value={String(p.email ?? "")}
                  onChange={(e) =>
                    applyRecordPatch({
                      email: e.target.value,
                    })
                  }
                  placeholder="correo@ejemplo.com"
                  className="border-slate-200"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Phone className="h-4 w-4 text-cyan-600" />
                  Teléfono
                </div>
                <Input
                  value={String(p.phone ?? "")}
                  onChange={(e) =>
                    applyRecordPatch({
                      phone: e.target.value,
                    })
                  }
                  placeholder="+56 9 ..."
                  className="border-slate-200"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Tags className="h-4 w-4 text-teal-600" />
                  Fuente
                </div>
                <Input
                  value={String(p.source ?? p.origen ?? "")}
                  onChange={(e) =>
                    applyRecordPatch({
                      source: e.target.value,
                      origen: e.target.value,
                    })
                  }
                  placeholder="calendly"
                  className="border-slate-200"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  Registrado
                </div>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(
                    record.created_at || p.created_at,
                  )}
                  onChange={(e) =>
                    applyRecordPatch({
                      created_at: toIsoOrNull(e.target.value),
                    })
                  }
                  className="border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {topStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-4 shadow-sm"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200/60 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Detalle completo
                </span>
              </div>

              {/* ── Preguntas HubSpot / Cualificación ──────────────── */}
              {(hsInstagram ||
                hsBudget ||
                hsObstacle ||
                hsInvite ||
                hsWhatsapp ||
                calendlyBlocks.length > 0) && (
                <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Datos de cualificación (HubSpot)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    {hsInstagram && (
                      <DataRow label="Instagram" value={String(hsInstagram)} />
                    )}
                    {hsWhatsapp && (
                      <DataRow label="WhatsApp" value={String(hsWhatsapp)} />
                    )}
                    {hsBudget && (
                      <DataRow
                        label="Meta facturación mensual (USD)"
                        value={String(hsBudget)}
                      />
                    )}
                    {hsObstacle && (
                      <DataRow
                        label="Mayor obstáculo"
                        value={String(hsObstacle)}
                      />
                    )}
                    {hsInvite && (
                      <DataRow
                        label="¿Consulta con alguien para inversiones?"
                        value={String(hsInvite)}
                      />
                    )}
                    {hsCloser && (
                      <DataRow
                        label="Closer asignado"
                        value={String(hsCloser)}
                      />
                    )}
                    {hsSaleNotes && (
                      <DataRow
                        label="Observaciones"
                        value={String(hsSaleNotes)}
                      />
                    )}
                  </div>
                  {/* Preguntas del formulario Calendly */}
                  {calendlyBlocks.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Respuestas del formulario (Calendly)
                        </span>
                      </div>
                      {calendlyBlocks.map((block, idx) => (
                        <div key={idx}>
                          {block.event && (
                            <div className="px-4 py-2 bg-violet-50/60 border-b border-violet-100 flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                              <span className="text-xs font-medium text-violet-700">
                                {block.event}
                              </span>
                              {block.start && (
                                <span className="text-[11px] text-slate-400 ml-1">
                                  {new Date(block.start).toLocaleString(
                                    "es-ES",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          {block.answers.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                              {block.answers.map((qa, qIdx) => (
                                <div
                                  key={qIdx}
                                  className="px-4 py-3 flex items-start gap-3"
                                >
                                  <div className="mt-0.5 flex-shrink-0 rounded-lg p-1.5 bg-indigo-50 text-indigo-500">
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[11px] font-semibold text-slate-700">
                                      {qa.question}
                                    </span>
                                    <p className="mt-1 text-sm text-slate-800 leading-relaxed break-words">
                                      {qa.answer}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-400 italic">
                              Sin respuestas registradas
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <DataRow
                  label="Evento"
                  value={p.event_codigo || p.eventCode || p.eventCodigo || "—"}
                />
                <DataRow
                  label="Origen"
                  value={p.origin_codigo || p.origen || p.originCodigo || "—"}
                />
                <DataRow
                  label="Agenda"
                  value={
                    p.selected_date || p.selectedDate
                      ? `${fmtDate(p.selected_date || p.selectedDate)}${
                          p.selected_time || p.selectedTime
                            ? ` · ${String(p.selected_time || p.selectedTime)}`
                            : ""
                        }`
                      : "—"
                  }
                />
                <DataRow
                  label="Plataforma llamada"
                  value={p.platform_call || p.platformCall || "—"}
                />

                {/* Solo desde llamada_realizada / no_show (nivel ≥ 3) */}
                {level >= 3 && (
                  <DataRow
                    label="Resultado llamada"
                    value={callOutcomeLabel(
                      p.call_outcome || p.callOutcome || p.call?.outcome,
                    )}
                  />
                )}

                {/* Programa: solo cuando hay producto presentado */}
                {level >= 3 && (
                  <DataRow
                    label="Programa"
                    value={
                      draft?.program ||
                      effectiveSalePayload?.program ||
                      p.program ||
                      salePayload?.program ||
                      "—"
                    }
                  />
                )}

                {/* Bonos: solo cuando hay decisión o cierre */}
                {level >= 4 && bonusesList.length > 0 && (
                  <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                    <span className="text-slate-500">Bonos</span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {bonusesList.map((bonus) => (
                        <Badge
                          key={bonus}
                          className="bg-slate-100 text-slate-700 border-slate-200 text-xs"
                        >
                          {bonus}
                        </Badge>
                      ))}
                    </span>
                  </div>
                )}

                {/* Pago, monto, cobro: solo en cerrado_ganado */}
                {level >= 8 && crmPipelineStatus === "cerrado_ganado" && (
                  <>
                    <DataRow
                      label="Pago"
                      value={
                        p.payment_status
                          ? paymentStatusLabel(p.payment_status)
                          : statusLabel
                      }
                    />
                    <DataRow
                      label="Monto"
                      value={
                        (draft?.paymentAmount ??
                        p.payment_amount ??
                        effectiveSalePayload?.payment?.amount)
                          ? String(
                              draft?.paymentAmount ??
                                p.payment_amount ??
                                effectiveSalePayload?.payment?.amount,
                            )
                          : "—"
                      }
                      accent="font-semibold"
                    />
                    <DataRow
                      label="Próximo cobro"
                      value={
                        draft?.nextChargeDate ||
                        p.next_charge_date ||
                        effectiveSalePayload?.payment?.nextChargeDate
                          ? fmtDate(
                              draft?.nextChargeDate ||
                                p.next_charge_date ||
                                effectiveSalePayload?.payment?.nextChargeDate,
                            )
                          : "—"
                      }
                    />
                    <DataRow label="Plan" value={planSummary} />
                  </>
                )}

                {/* Recordatorios: solo desde seguimiento */}
                {level >= 5 && (
                  <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                    <span className="text-slate-500">Recordatorios</span>
                    <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                      {Array.isArray(p.reminders)
                        ? p.reminders.length
                        : Array.isArray(p.call?.reminders)
                          ? p.call.reminders.length
                          : 0}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          id="seccion-notas"
          className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm scroll-mt-4"
        >
          <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardHeader className="pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-slate-800">Actividad</CardTitle>
                <CardDescription className="text-slate-500">
                  Historial de notas registradas en el lead
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nueva nota
                  </span>
                </div>
                <textarea
                  className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white p-4 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all resize-none"
                  placeholder="Escribe una nota para el historial (queda con fecha y usuario al guardar)…"
                  value={newActivityNote}
                  onChange={(e) => setNewActivityNote(e.target.value)}
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-slate-500">
                    Se guarda al presionar &quot;Guardar cambios&quot;.
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      const message = String(newActivityNote || "").trim();
                      if (!message) return;
                      const entry = {
                        type: "note",
                        at: new Date().toISOString(),
                        by: {
                          id: user?.id ?? null,
                          name: user?.name ?? null,
                          email: user?.email ?? null,
                          role: user?.role ?? null,
                        },
                        message,
                      };
                      applyRecordPatch({
                        activity_log: [...activityLog, entry],
                      });
                      setNewActivityNote("");
                    }}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar al historial
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Historial
                  </span>
                </div>
                {activityLog.length ? (
                  <ul className="space-y-3">
                    {activityLog
                      .slice()
                      .reverse()
                      .slice(0, 12)
                      .map((item: any, idx: number) => (
                        <li
                          key={`${item?.at || idx}-${idx}`}
                          className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <span>
                                {item?.at
                                  ? String(item.at)
                                      .replace("T", " ")
                                      .slice(0, 19)
                                  : "—"}
                              </span>
                              {item?.by?.name || item?.by?.email ? (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-slate-700">
                                    {String(item.by.name || item.by.email)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <div className="text-sm text-slate-700 whitespace-pre-wrap">
                              {String(item?.message ?? "").trim() || "—"}
                            </div>
                          </div>
                        </li>
                      ))}
                    {activityLog.length > 12 ? (
                      <li className="text-xs text-slate-500 text-center py-2">
                        +{activityLog.length - 12} más…
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="h-7 w-7 text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-500">
                      Sin actividad registrada.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        {/* ── CHECKLIST DEL CLOSER ──────────────────────────────────── */}
        <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-slate-800">
                  Actividades del Closer
                </CardTitle>
                <CardDescription className="text-slate-500">
                  {closerPhaseLabel} · Estado CRM: {pipelineLabel} ·{" "}
                  {checklistDone}/{checklist.length} completadas
                </CardDescription>
              </div>
              <Badge
                className={
                  checklistDone === checklist.length
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }
              >
                {checklistDone === checklist.length
                  ? "Completado"
                  : `${Math.round((checklistDone / (checklist.length || 1)) * 100)}%`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de progreso */}
            <div className="mb-4 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{
                  width: `${(checklistDone / (checklist.length || 1)) * 100}%`,
                }}
              />
            </div>
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                    item.done
                      ? "border-emerald-200 bg-emerald-50/50"
                      : item.required
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Checkbox interactivo para items con actionKey */}
                  {item.actionKey && !item.done ? (
                    <button
                      type="button"
                      className="shrink-0 h-4 w-4 rounded border border-slate-300 hover:border-amber-400 hover:bg-amber-50 flex items-center justify-center transition-colors"
                      title="Marcar como hecho"
                      onClick={() => handleToggle(item.actionKey!)}
                    >
                      <span className="sr-only">Marcar</span>
                    </button>
                  ) : item.actionKey && item.done ? (
                    <button
                      type="button"
                      className="shrink-0"
                      title="Desmarcar"
                      onClick={() => handleToggle(item.actionKey!)}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </button>
                  ) : item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : item.required ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-semibold ${
                        item.done
                          ? "text-emerald-700"
                          : item.required
                            ? "text-amber-800"
                            : "text-slate-700"
                      }`}
                    >
                      {item.label}
                      {item.required && !item.done && (
                        <span className="ml-1.5 text-[10px] font-bold text-amber-600">
                          OBLIGATORIO
                        </span>
                      )}
                    </div>
                    {item.sublabel && (
                      <div className="text-[11px] text-slate-500">
                        {item.sublabel}
                      </div>
                    )}
                  </div>

                  {/* Botón de navegación → lleva a la sección */}
                  {item.scrollTo && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={`shrink-0 h-7 px-2.5 text-[11px] gap-1 ${
                        item.done
                          ? "border-slate-200 text-slate-500 hover:bg-slate-50"
                          : "border-amber-300 text-amber-700 hover:bg-amber-50"
                      }`}
                      onClick={() => handleActionNavigation(item.scrollTo!)}
                    >
                      <ArrowRight className="h-3 w-3" />
                      {item.actionLabel || "Ir"}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Resumen obligatorios pendientes */}
            {requiredMissing.length > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs text-amber-800">
                  <strong>{requiredMissing.length}</strong> tarea
                  {requiredMissing.length > 1 ? "s" : ""} obligatoria
                  {requiredMissing.length > 1 ? "s" : ""} pendiente
                  {requiredMissing.length > 1 ? "s" : ""} para avanzar de fase
                </span>
              </div>
            )}

            {/* Botón avanzar de fase */}
            {nextStage && (
              <div className="mt-4">
                <Button
                  type="button"
                  className={`w-full gap-2 ${
                    canAdvance
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                  disabled={!canAdvance}
                  onClick={handleAdvancePhase}
                >
                  <ArrowRight className="h-4 w-4" />
                  Avanzar a: {nextStage.label}
                </Button>
                {!canAdvance && (
                  <p className="mt-1.5 text-center text-[11px] text-slate-500">
                    Completa las tareas obligatorias para desbloquear
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── CONTROL COMERCIAL — Condicional por fase ──────────────── */}
        {/* ── CONVERSACIÓN Y PROTOCOLO ────────────────────────────── */}
        <Card
          id="seccion-conversacion"
          className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm scroll-mt-4"
        >
          <div className="h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
          <CardHeader className="pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-slate-800">
                  Conversación y protocolo
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Control operativo de actividad, cadencia y próxima acción
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Estado conversación"
                  value={conversationStatus || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      conversation_status: next === "__empty__" ? null : next,
                    })
                  }
                  options={CONVERSATION_STATUS_OPTIONS}
                />
                <SelectField
                  label="Canal última interacción"
                  value={lastInteractionChannel || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      last_interaction_channel:
                        next === "__empty__" ? null : next,
                    })
                  }
                  options={CHANNEL_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateTimeField
                  label="Última interacción"
                  value={lastInteractionAt}
                  onChange={(value) =>
                    applyRecordPatch({
                      last_interaction_at: toIsoOrNull(value),
                    })
                  }
                />
                <DateTimeField
                  label="Próximo contacto"
                  value={nextContactAt}
                  onChange={(value) =>
                    applyRecordPatch({ next_contact_at: toIsoOrNull(value) })
                  }
                />
              </div>

              {/* Protocolo solo desde seguimiento (nivel ≥ 5) */}
              {level >= 5 && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <SelectField
                      label="Protocolo activo"
                      value={protocolName || "__empty__"}
                      onValueChange={(next) =>
                        applyRecordPatch({
                          protocol_name: next === "__empty__" ? null : next,
                        })
                      }
                      options={PROTOCOL_OPTIONS}
                    />
                    <TextField
                      label="Paso actual del protocolo"
                      value={protocolStep}
                      placeholder="Ej: Día 4 · seguimiento"
                      onChange={(value) =>
                        applyRecordPatch({ protocol_step: value || null })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <DateTimeField
                      label="Inicio seguimiento"
                      value={followupStartedAt}
                      onChange={(value) =>
                        applyRecordPatch({
                          followup_started_at: toIsoOrNull(value),
                        })
                      }
                    />
                    {level >= 6 && (
                      <DateTimeField
                        label="Inicio recuperación"
                        value={recoveryStartedAt}
                        onChange={(value) =>
                          applyRecordPatch({
                            recovery_started_at: toIsoOrNull(value),
                          })
                        }
                      />
                    )}
                    {level >= 7 && (
                      <DateTimeField
                        label="Inicio lead dormido"
                        value={sleepingStartedAt}
                        onChange={(value) =>
                          applyRecordPatch({
                            sleeping_started_at: toIsoOrNull(value),
                          })
                        }
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MiniInfoCard
                      label="Plantilla reciente"
                      value={lastTemplateSent || "Sin registro"}
                    />
                    <MiniInfoCard
                      label="Recurso reciente"
                      value={lastResourceSent || "Sin registro"}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-700 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Se guarda al presionar &quot;Guardar cambios&quot;.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "teal" | "cyan";
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
          accent === "teal" ? "bg-slate-100" : "bg-slate-100"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-medium text-slate-700 truncate">
          {value}
        </div>
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium text-slate-700 truncate ${accent || ""}`}>
        {value}
      </span>
    </div>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allowEmpty?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-slate-600 font-medium">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-300/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty ? (
            <SelectItem value="__empty__">Sin definir</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-slate-600 font-medium">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white border-slate-200 focus-visible:border-slate-400 focus-visible:ring-slate-300/30"
      />
    </div>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-slate-600 font-medium">{label}</Label>
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border-slate-200 focus-visible:border-slate-400 focus-visible:ring-slate-300/30"
      />
    </div>
  );
}

function MiniInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-700">{value}</div>
    </div>
  );
}
