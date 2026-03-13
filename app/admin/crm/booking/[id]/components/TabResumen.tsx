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
  Calendar,
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
  { value: "hotselling_foundation", label: "Hotselling Foundation" },
];

const OBJECTION_OPTIONS = [
  { value: "precio", label: "Precio" },
  { value: "tiempo", label: "Tiempo" },
  { value: "prioridad", label: "Prioridad" },
  { value: "confianza", label: "Confianza" },
  { value: "decision_tercero", label: "Decisión de tercero" },
  { value: "liquidez", label: "Liquidez" },
  { value: "no_califica", label: "No califica" },
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
}: TabResumenProps) {
  const [newActivityNote, setNewActivityNote] = React.useState("");

  const crmPipelineStatus = String(p.pipeline_status ?? "").trim();
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

  const topStats = [
    {
      label: "Pipeline CRM",
      value:
        CRM_PIPELINE_OPTIONS.find((item) => item.value === crmPipelineStatus)
          ?.label || "Sin definir",
    },
    {
      label: "Conversación",
      value:
        CONVERSATION_STATUS_OPTIONS.find(
          (item) => item.value === conversationStatus,
        )?.label || "Sin definir",
    },
    {
      label: "Última interacción",
      value: lastInteractionAt
        ? fmtDate(p.last_interaction_at)
        : "Sin registro",
    },
    {
      label: "Próximo contacto",
      value: nextContactAt ? fmtDate(p.next_contact_at) : "Sin agenda",
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
      <div className="xl:col-span-3 space-y-8">
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
              <InfoTile
                icon={<Mail className="h-4 w-4 text-teal-600" />}
                label="Email"
                value={p.email || "—"}
                accent="teal"
              />
              <InfoTile
                icon={<Phone className="h-4 w-4 text-cyan-600" />}
                label="Teléfono"
                value={p.phone || "—"}
                accent="cyan"
              />
              <InfoTile
                icon={<Tags className="h-4 w-4 text-teal-600" />}
                label="Fuente"
                value={p.source || "booking"}
                accent="teal"
              />
              <InfoTile
                icon={<Calendar className="h-4 w-4 text-cyan-600" />}
                label="Registrado"
                value={fmtDate(record.created_at || p.created_at)}
                accent="cyan"
              />
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
                  label="Instagram"
                  value={p.instagram_user || p.instagramUser || "—"}
                />
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
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Bonos</span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {bonusesList.length ? (
                      bonusesList.map((bonus) => (
                        <Badge
                          key={bonus}
                          className="bg-slate-100 text-slate-700 border-slate-200 text-xs"
                        >
                          {bonus}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                </div>
                <DataRow
                  label="Presupuesto mensual"
                  value={
                    p.monthly_budget === null || p.monthly_budget === undefined
                      ? p.monthlyBudget === null ||
                        p.monthlyBudget === undefined
                        ? "—"
                        : String(p.monthlyBudget)
                      : String(p.monthly_budget)
                  }
                />
                <DataRow
                  label="Plataforma llamada"
                  value={p.platform_call || p.platformCall || "—"}
                />
                <DataRow
                  label="Resultado llamada"
                  value={callOutcomeLabel(
                    p.call_outcome || p.callOutcome || p.call?.outcome,
                  )}
                />
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="xl:col-span-2 space-y-8">
        <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm">
          <div className="h-1 bg-slate-200" />
          <CardHeader className="pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Target className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <CardTitle className="text-slate-800">
                  Control comercial
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Campos clave para seguimiento, recuperación y cierre
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <SelectField
                label="Pipeline CRM"
                value={crmPipelineStatus || "__empty__"}
                onValueChange={(next) =>
                  applyRecordPatch({
                    pipeline_status: next === "__empty__" ? null : next,
                  })
                }
                options={CRM_PIPELINE_OPTIONS}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Tipo de cliente"
                  value={customerType || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      customer_type: next === "__empty__" ? null : next,
                    })
                  }
                  options={CUSTOMER_TYPE_OPTIONS}
                />
                <SelectField
                  label="Venta recuperada"
                  value={wonRecovered ? "si" : "no"}
                  onValueChange={(next) =>
                    applyRecordPatch({ won_recovered: next === "si" ? 1 : 0 })
                  }
                  options={[
                    { value: "no", label: "No" },
                    { value: "si", label: "Sí" },
                  ]}
                  allowEmpty={false}
                />
              </div>

              <SelectField
                label="Producto presentado"
                value={productPresented || "__empty__"}
                onValueChange={(next) =>
                  applyRecordPatch({
                    product_presented: next === "__empty__" ? null : next,
                  })
                }
                options={PRODUCT_PRESENTED_OPTIONS}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Tipo de objeción"
                  value={objectionType || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      objection_type: next === "__empty__" ? null : next,
                    })
                  }
                  options={OBJECTION_OPTIONS}
                />
                <SelectField
                  label="Motivo de pérdida"
                  value={lostReason || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      lost_reason: next === "__empty__" ? null : next,
                    })
                  }
                  options={LOST_REASON_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Última plantilla enviada"
                  value={lastTemplateSent || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      last_template_sent_name: next === "__empty__" ? null : next,
                    })
                  }
                  options={TEMPLATE_OPTIONS}
                />
                <SelectField
                  label="Último recurso enviado"
                  value={lastResourceSent || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      last_resource_sent_name: next === "__empty__" ? null : next,
                    })
                  }
                  options={RESOURCE_OPTIONS}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <Activity className="h-3.5 w-3.5" />
                  Estado legado compatible
                </div>
                <div className="mt-4 grid gap-5">
                  <SelectField
                    label="Etapa actual del lead"
                    value={leadStatus}
                    onValueChange={(next) => applyRecordPatch({ status: next })}
                    options={[
                      { value: "new", label: "Lead Nuevo" },
                      { value: "contacted", label: "Contactado" },
                      { value: "appointment_attended", label: "Cita Atendida" },
                      {
                        value: "active_follow_up",
                        label: "Seguimiento Activo",
                      },
                      { value: "pending_payment", label: "Pendiente de Pago" },
                      { value: "won", label: "Cerrado – Ganado" },
                      { value: "lost", label: "Cerrado – Perdido" },
                    ]}
                    allowEmpty={false}
                  />

                  <SelectField
                    label="Estado comercial actual"
                    value={leadDisposition || "__empty__"}
                    onValueChange={(next) =>
                      applyRecordPatch({
                        lead_disposition: next === "__empty__" ? null : next,
                      })
                    }
                    options={[
                      {
                        value: "conversation_started",
                        label: "Contactado · Conversación iniciada",
                      },
                      {
                        value: "appointment_scheduled",
                        label: "Contactado · Cita agendada",
                      },
                      {
                        value: "appointment_cancelled",
                        label: "Contactado · Cita cancelada",
                      },
                      {
                        value: "appointment_rescheduled",
                        label: "Contactado · Cita reprogramada",
                      },
                      {
                        value: "no_response",
                        label: "Contactado · No responde",
                      },
                      { value: "no_show", label: "Contactado · No show" },
                      {
                        value: "diagnosis_done",
                        label: "Cita atendida · Diagnóstico realizado",
                      },
                      {
                        value: "offer_not_presented",
                        label: "Cita atendida · Oferta no presentada",
                      },
                      {
                        value: "offer_presented",
                        label: "Cita atendida · Oferta presentada",
                      },
                      {
                        value: "interested_evaluating",
                        label: "Seguimiento · Interesado (evaluando)",
                      },
                      {
                        value: "waiting_response",
                        label: "Seguimiento · Esperando respuesta",
                      },
                      {
                        value: "waiting_approval",
                        label: "Seguimiento · Esperando aprobación",
                      },
                      { value: "cold", label: "Seguimiento · Frío" },
                      {
                        value: "reserve",
                        label: "Pendiente de pago · Reserva",
                      },
                      {
                        value: "card_unlocking",
                        label: "Pendiente de pago · Gestión de tarjetas/límite",
                      },
                      {
                        value: "getting_money",
                        label: "Pendiente de pago · Consiguiendo el dinero",
                      },
                      {
                        value: "lost_price_too_high",
                        label: "Perdido · Precio muy alto",
                      },
                      {
                        value: "lost_no_urgency",
                        label: "Perdido · No tiene urgencia",
                      },
                      { value: "lost_trust", label: "Perdido · Confianza" },
                      {
                        value: "lost_external_decision",
                        label: "Perdido · Decisión externa",
                      },
                      {
                        value: "lost_no_response_exhausted",
                        label: "Perdido · No respondió (proceso agotado)",
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm">
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
                <DateTimeField
                  label="Inicio recuperación"
                  value={recoveryStartedAt}
                  onChange={(value) =>
                    applyRecordPatch({
                      recovery_started_at: toIsoOrNull(value),
                    })
                  }
                />
                <DateTimeField
                  label="Inicio lead dormido"
                  value={sleepingStartedAt}
                  onChange={(value) =>
                    applyRecordPatch({
                      sleeping_started_at: toIsoOrNull(value),
                    })
                  }
                />
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
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-700 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Se guarda al presionar "Guardar cambios".
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm">
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
                    Se guarda al presionar "Guardar cambios".
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
