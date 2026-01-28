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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  Tags,
  Calendar,
  User,
  CreditCard,
  Target,
  TrendingUp,
  MessageSquare,
  Plus,
} from "lucide-react";

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

  const activityLog = Array.isArray((p as any).activity_log)
    ? ((p as any).activity_log as any[])
    : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 space-y-6">
        {/* Card de contacto principal */}
        <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
          <CardHeader className="pb-4">
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
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60">
                <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Email</div>
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {p.email || "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60">
                <div className="h-9 w-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Teléfono</div>
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {p.phone || "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60">
                <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Tags className="h-4 w-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Fuente</div>
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {p.source || "booking"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60">
                <div className="h-9 w-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Registrado</div>
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {fmtDate(record.created_at || p.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Detalles adicionales */}
            <div className="mt-6 pt-5 border-t border-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Detalle completo
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Evento</span>
                  <span className="font-medium text-slate-700 truncate">
                    {p.event_codigo || p.eventCodigo || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Origen</span>
                  <span className="font-medium text-slate-700 truncate">
                    {p.origin_codigo || p.origen || p.originCodigo || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Agenda</span>
                  <span className="font-medium text-slate-700 truncate">
                    {p.selected_date || p.selectedDate
                      ? `${fmtDate(p.selected_date || p.selectedDate)}${
                          p.selected_time || p.selectedTime
                            ? ` · ${String(p.selected_time || p.selectedTime)}`
                            : ""
                        }`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Instagram</span>
                  <span className="font-medium text-teal-600 truncate">
                    {p.instagram_user || p.instagramUser || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Programa</span>
                  <span className="font-medium text-slate-700 truncate">
                    {(draft as any)?.program ||
                      effectiveSalePayload?.program ||
                      p.program ||
                      salePayload?.program ||
                      "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Bonos</span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {bonusesList.length ? (
                      bonusesList.map((b) => (
                        <Badge
                          key={b}
                          className="bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 border-teal-200 text-xs"
                        >
                          {b}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Presupuesto mensual</span>
                  <span className="font-medium text-slate-700 truncate">
                    {(p.monthly_budget ?? p.monthlyBudget) === null ||
                    (p.monthly_budget ?? p.monthlyBudget) === undefined
                      ? "—"
                      : String(p.monthly_budget ?? p.monthlyBudget)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Plataforma llamada</span>
                  <span className="font-medium text-slate-700 truncate">
                    {p.platform_call || p.platformCall || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Resultado llamada</span>
                  <span className="font-medium text-slate-700 truncate">
                    {callOutcomeLabel(
                      p.call_outcome || p.callOutcome || p.call?.outcome,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Pago</span>
                  <span className="font-medium text-slate-700 truncate">
                    {p.payment_status
                      ? paymentStatusLabel(p.payment_status)
                      : statusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Monto</span>
                  <span className="font-semibold text-teal-600 truncate">
                    {(p.payment_amount ??
                      effectiveSalePayload?.payment?.amount) === null ||
                    (p.payment_amount ??
                      effectiveSalePayload?.payment?.amount) === undefined
                      ? "—"
                      : String(
                          p.payment_amount ??
                            effectiveSalePayload?.payment?.amount,
                        )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Próximo cobro</span>
                  <span className="font-medium text-slate-700 truncate">
                    {p.next_charge_date ||
                    effectiveSalePayload?.payment?.nextChargeDate
                      ? fmtDate(
                          p.next_charge_date ||
                            effectiveSalePayload?.payment?.nextChargeDate,
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium text-slate-700 truncate">
                    {planSummary}
                  </span>
                </div>
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

      {/* Sidebar derecho */}
      <div className="xl:col-span-2 space-y-6">
        <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-cyan-500 to-teal-500" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-slate-800">
                  Estado del lead
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Etapa del pipeline + estado comercial
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label
                  htmlFor="lead-stage"
                  className="text-slate-600 font-medium"
                >
                  Etapa
                </Label>
                <Select
                  value={leadStatus}
                  onValueChange={(next) => {
                    applyRecordPatch({ status: next });
                  }}
                >
                  <SelectTrigger
                    id="lead-stage"
                    className="w-full bg-white border-slate-200 focus:border-teal-400 focus:ring-teal-400/20"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Lead Nuevo</SelectItem>
                    <SelectItem value="contacted">Contactado</SelectItem>
                    <SelectItem value="appointment_attended">
                      Cita Atendida
                    </SelectItem>
                    <SelectItem value="active_follow_up">
                      Seguimiento Activo
                    </SelectItem>
                    <SelectItem value="pending_payment">
                      Pendiente de Pago
                    </SelectItem>
                    <SelectItem value="won">Cerrado – Ganado</SelectItem>
                    <SelectItem value="lost">Cerrado – Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="lead-disposition"
                  className="text-slate-600 font-medium"
                >
                  Estado comercial
                </Label>
                <Select
                  value={leadDisposition || "__empty__"}
                  onValueChange={(next) => {
                    applyRecordPatch({
                      lead_disposition: next === "__empty__" ? null : next,
                    });
                  }}
                >
                  <SelectTrigger
                    id="lead-disposition"
                    className="w-full bg-white border-slate-200 focus:border-teal-400 focus:ring-teal-400/20"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">—</SelectItem>

                    <SelectItem value="conversation_started">
                      Contactado · Conversación iniciada
                    </SelectItem>
                    <SelectItem value="appointment_scheduled">
                      Contactado · Cita agendada
                    </SelectItem>
                    <SelectItem value="appointment_cancelled">
                      Contactado · Cita cancelada
                    </SelectItem>
                    <SelectItem value="appointment_rescheduled">
                      Contactado · Cita reprogramada
                    </SelectItem>
                    <SelectItem value="no_response">
                      Contactado · No responde
                    </SelectItem>
                    <SelectItem value="no_show">
                      Contactado · No show
                    </SelectItem>

                    <SelectItem value="diagnosis_done">
                      Cita atendida · Diagnóstico realizado
                    </SelectItem>
                    <SelectItem value="offer_not_presented">
                      Cita atendida · Oferta no presentada
                    </SelectItem>
                    <SelectItem value="offer_presented">
                      Cita atendida · Oferta presentada
                    </SelectItem>

                    <SelectItem value="interested_evaluating">
                      Seguimiento · Interesado (evaluando)
                    </SelectItem>
                    <SelectItem value="waiting_response">
                      Seguimiento · Esperando respuesta
                    </SelectItem>
                    <SelectItem value="waiting_approval">
                      Seguimiento · Esperando aprobación
                    </SelectItem>
                    <SelectItem value="cold">Seguimiento · Frío</SelectItem>

                    <SelectItem value="reserve">
                      Pendiente de pago · Reserva
                    </SelectItem>
                    <SelectItem value="card_unlocking">
                      Pendiente de pago · Gestión de tarjetas/límite
                    </SelectItem>
                    <SelectItem value="getting_money">
                      Pendiente de pago · Consiguiendo el dinero
                    </SelectItem>

                    <SelectItem value="lost_price_too_high">
                      Perdido · Precio muy alto
                    </SelectItem>
                    <SelectItem value="lost_no_urgency">
                      Perdido · No tiene urgencia
                    </SelectItem>
                    <SelectItem value="lost_trust">
                      Perdido · Confianza
                    </SelectItem>
                    <SelectItem value="lost_external_decision">
                      Perdido · Decisión externa
                    </SelectItem>
                    <SelectItem value="lost_no_response_exhausted">
                      Perdido · No respondió (proceso agotado)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
              <p className="text-xs text-teal-700 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Se guarda al presionar "Guardar cambios".
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardHeader className="pb-4">
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
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4">
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
                      const msg = String(newActivityNote || "").trim();
                      if (!msg) return;
                      const entry = {
                        type: "note",
                        at: new Date().toISOString(),
                        by: {
                          id: (user as any)?.id ?? null,
                          name: (user as any)?.name ?? null,
                          email: (user as any)?.email ?? null,
                          role: (user as any)?.role ?? null,
                        },
                        message: msg,
                      };
                      const next = [...activityLog, entry];
                      applyRecordPatch({ activity_log: next });
                      setNewActivityNote("");
                    }}
                    className="gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar al historial
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4">
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
                      .map((a: any, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-teal-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <span>
                                {a?.at
                                  ? String(a.at).replace("T", " ").slice(0, 19)
                                  : "—"}
                              </span>
                              {a?.by?.name || a?.by?.email ? (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-teal-600">
                                    {String(a.by.name || a.by.email)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <div className="text-sm text-slate-700 whitespace-pre-wrap">
                              {String(a?.message ?? "").trim() || "—"}
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
