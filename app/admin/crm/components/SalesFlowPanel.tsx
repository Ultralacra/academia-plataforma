"use client";
/**
 * SalesFlowPanel.tsx
 * Panel completo del flujo comercial de ventas para closers.
 * Cubre las 5 fases del protocolo:
 *  F1 - Seguimiento Pre-llamada
 *  F2 - Llamada de Venta
 *  F3 - Seguimiento Activo (Estratégico)
 *  F4 - Recuperación
 *  F5 - Reactivación a Largo Plazo
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleOff,
  Clock,
  DollarSign,
  Flag,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  UserX,
  Zap,
} from "lucide-react";

import type {
  SalesFlowState,
  TipoObjecion,
  TipoVentaOferta,
  ResultadoLlamada,
  ResultadoCierre,
  SeguimientoMensaje,
} from "@/lib/crm-types";
import {
  TIPO_OBJECION_LABELS,
  RESULTADO_LLAMADA_LABELS,
  TIPO_VENTA_LABELS,
  PROTOCOL_DAYS_FASE3,
  PROTOCOL_DAYS_FASE4,
  PROTOCOL_DAYS_FASE5,
} from "@/lib/crm-types";

/* ─── Paleta de colores por fase ─────────────────────────────────────── */
const FASE_CONFIG = {
  1: {
    label: "Pre-llamada",
    icon: Bell,
    gradient: "from-indigo-500 to-blue-500",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
  },
  2: {
    label: "Llamada de Venta",
    icon: PhoneCall,
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  3: {
    label: "Seguimiento Activo",
    icon: MessageCircle,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  4: {
    label: "Recuperación",
    icon: RotateCcw,
    gradient: "from-purple-500 to-violet-500",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
  },
  5: {
    label: "Reactivación LP",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
} as const;

const OBJECION_RECURSOS: Record<TipoObjecion, string[]> = {
  financiera: [
    "Opciones de pago y financiamiento disponibles",
    "Calculadora ROI: costo vs ingreso proyectado",
    "Testimonios de alumnos con situación financiera similar",
  ],
  momento: [
    "Video: Por qué el mejor momento para empezar es ahora",
    "Comparativa de costo de esperar 6 meses más",
    "Calendario de próximas cohortes (cupos limitados)",
  ],
  confianza: [
    "Casos de éxito documentados de alumnos recientes",
    "Garantía de satisfacción y política de reembolso",
    "Sesión gratuita de mentoría de prueba",
  ],
  falta_claridad: [
    "Brochure completo del programa paso a paso",
    "Video explicativo del metodología y resultados",
    "FAQ de preguntas frecuentes del programa",
  ],
  contractual: [
    "Modelo de contrato simplificado para revisión",
    "Resumen de términos y condiciones en lenguaje sencillo",
    "Llamada con el equipo legal para resolver dudas",
  ],
  consulta_socio: [
    "Presentación ejecutiva para compartir con el socio/pareja",
    "Video de la propuesta de valor para terceros",
    "Propuesta de llamada conjunta con el socio",
  ],
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function nowIso() {
  return new Date().toISOString();
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function defaultFlowState(): SalesFlowState {
  return {
    fase: 1,
    mensajes: [],
    updatedAt: nowIso(),
  };
}

/* ─── Props ─────────────────────────────────────────────────────────── */
export interface SalesFlowPanelProps {
  leadNombre: string;
  state: SalesFlowState | null | undefined;
  onChange: (next: SalesFlowState) => void;
  readOnly?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════
   Componente principal
════════════════════════════════════════════════════════════════════════ */
export function SalesFlowPanel({
  leadNombre,
  state,
  onChange,
  readOnly = false,
}: SalesFlowPanelProps) {
  const flow: SalesFlowState = state ?? defaultFlowState();

  /* Actualiza el estado y notifica hacia arriba */
  const update = React.useCallback(
    (partial: Partial<SalesFlowState>) => {
      if (readOnly) return;
      onChange({ ...flow, ...partial, updatedAt: nowIso() });
    },
    [flow, onChange, readOnly],
  );

  /* Agrega o actualiza un mensaje del protocolo */
  const addMensaje = (
    dia: number,
    tipo: SeguimientoMensaje["tipo"],
    contenido?: string,
  ) => {
    const existing = flow.mensajes ?? [];
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nuevo: SeguimientoMensaje = {
      id,
      dia,
      tipo,
      contenido: contenido ?? null,
      enviadoAt: nowIso(),
      estado: "enviado",
    };
    update({ mensajes: [...existing, nuevo] });
  };

  const toggleDiaMensaje = (dia: number, tipo: SeguimientoMensaje["tipo"]) => {
    const existing = flow.mensajes ?? [];
    const ya = existing.find((m) => m.dia === dia && m.tipo === tipo);
    if (ya) {
      // marcar como respondido / quitar
      update({
        mensajes: existing.map((m) =>
          m.id === ya.id
            ? {
                ...m,
                estado: m.estado === "enviado" ? "respondido" : "enviado",
              }
            : m,
        ),
      });
    } else {
      addMensaje(dia, tipo);
    }
  };

  const getDiaMensaje = (dia: number, tipo: SeguimientoMensaje["tipo"]) =>
    (flow.mensajes ?? []).find((m) => m.dia === dia && m.tipo === tipo);

  const faseActual = flow.fase;
  const cfg = FASE_CONFIG[faseActual];
  const FaseIcon = cfg.icon;

  /* Pasos de las fases como colapsables */
  const [openFases, setOpenFases] = React.useState<Set<number>>(
    new Set([faseActual]),
  );
  const toggleFase = (n: number) =>
    setOpenFases((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  /* Texto del estado del cierre */
  const cierreLabel: Record<NonNullable<ResultadoCierre>, string> = {
    ganado_hpro: "Cierre HPro",
    ganado_starter: "Cierre Starter",
    ganado_downsell: "Cierre Downsell",
    pendiente_pago: "Pendiente pago restante",
    objecion_activa: "Objeción en negociación",
    perdido: "Perdido",
  };

  /* ── Indicadores arriba ─────────────────────────────────────────────── */
  const QuickStats = () => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {/* Fase actual */}
      <div className={`rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Fase actual
        </div>
        <div
          className={`mt-0.5 flex items-center gap-1.5 text-sm font-bold ${cfg.text}`}
        >
          <FaseIcon className="h-3.5 w-3.5" />F{faseActual}: {cfg.label}
        </div>
      </div>
      {/* Resultado llamada */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Resultado llamada
        </div>
        <div className="mt-0.5 text-sm font-bold text-slate-700">
          {flow.resultadoLlamada
            ? RESULTADO_LLAMADA_LABELS[flow.resultadoLlamada]
            : "—"}
        </div>
      </div>
      {/* Cierre */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Estado cierre
        </div>
        <div className="mt-0.5 text-sm font-bold text-slate-700">
          {flow.resultadoCierre
            ? cierreLabel[flow.resultadoCierre]
            : "Sin cierre"}
        </div>
      </div>
      {/* Objeción */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Objeción
        </div>
        <div className="mt-0.5 text-sm font-bold text-slate-700">
          {flow.tipoObjecion
            ? TIPO_OBJECION_LABELS[flow.tipoObjecion]
            : "Sin objeción"}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     FASE 1 — Seguimiento Pre-llamada
  ═══════════════════════════════════════════════════════════════════ */
  const Fase1 = () => {
    const [agendaInput, setAgendaInput] = React.useState(
      flow.agendaCalendlyAt?.slice(0, 16) ?? "",
    );

    return (
      <div className="space-y-4">
        {/* Registro */}
        <StepRow
          done={!!flow.registroAt}
          label="Registro de Lead en CRM"
          sublabel={
            flow.registroAt ? `Registrado ${fmt(flow.registroAt)}` : "Pendiente"
          }
          icon={<Flag className="h-4 w-4" />}
          onMark={() => update({ registroAt: nowIso(), fase: 1 })}
          readOnly={readOnly}
        />

        {/* Primer contacto */}
        <StepRow
          done={flow.primerContactoRespondido === true}
          skipped={flow.primerContactoRespondido === false}
          label="¿Lead respondió primer contacto?"
          sublabel="Controla si hay conversación activa antes de la llamada"
          icon={<MessageSquare className="h-4 w-4" />}
          readOnly={readOnly}
          actions={
            !readOnly && flow.primerContactoRespondido === undefined ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => update({ primerContactoRespondido: true })}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sí
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                  onClick={() => update({ primerContactoRespondido: false })}
                >
                  <UserX className="h-3.5 w-3.5" /> No
                </Button>
              </div>
            ) : undefined
          }
        />

        {/* Lead agenda llamada mediante Calendly */}
        <StepRow
          done={!!flow.leadAgendoLlamada}
          label="Lead agendó llamada mediante Calendly"
          sublabel={
            flow.agendaCalendlyAt
              ? `Agenda: ${fmt(flow.agendaCalendlyAt)}`
              : "A través de Calendly (email y SMS de recordatorio automático)"
          }
          icon={<Calendar className="h-4 w-4" />}
          readOnly={readOnly}
        >
          {!readOnly && (
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Fecha y hora de la llamada</Label>
                <Input
                  type="datetime-local"
                  value={agendaInput}
                  onChange={(e) => setAgendaInput(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  if (!agendaInput) return;
                  update({
                    leadAgendoLlamada: true,
                    agendaCalendlyAt: new Date(agendaInput).toISOString(),
                  });
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmar agenda
              </Button>
            </div>
          )}
        </StepRow>

        {/* Recordatorios pre-llamada */}
        {flow.leadAgendoLlamada && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
              <Bell className="h-4 w-4" />
              Recordatorios pre-llamada
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <ReminderCheck
                label="Recordatorio automático (Calendly)"
                sublabel="Automático vía email y SMS de Calendly"
                done={true}
                auto
              />
              <ReminderCheck
                label="Mensaje pre-llamada 24 hrs antes"
                sublabel="Envío manual al Lead"
                done={!!flow.precallReminderEnviado24h}
                onMark={() =>
                  !readOnly && update({ precallReminderEnviado24h: true })
                }
              />
              <ReminderCheck
                label="Mensaje pre-llamada 1 hr antes"
                sublabel="Envío manual al Lead"
                done={!!flow.precallReminderEnviado1h}
                onMark={() =>
                  !readOnly && update({ precallReminderEnviado1h: true })
                }
              />
            </div>
          </div>
        )}

        {/* Avanzar a Fase 2 */}
        {!readOnly && flow.leadAgendoLlamada && faseActual === 1 && (
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
            onClick={() => update({ fase: 2 })}
          >
            <ArrowRight className="h-4 w-4" /> Avanzar a Fase 2: Llamada de
            Venta
          </Button>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     FASE 2 — Llamada de Venta
  ═══════════════════════════════════════════════════════════════════ */
  const Fase2 = () => {
    const [dolorInput, setDolorInput] = React.useState(
      flow.dolorIdentificado ?? "",
    );
    const [objetivoInput, setObjetivoInput] = React.useState(
      flow.objetivoIdentificado ?? "",
    );
    const [situacionInput, setSituacionInput] = React.useState(
      flow.situacionActual ?? "",
    );
    const [fechaPagoInput, setFechaPagoInput] = React.useState(
      flow.fechaPagoRestanteAcordada?.slice(0, 10) ?? "",
    );
    const [montoInput, setMontoInput] = React.useState(
      flow.montoReserva?.toString() ?? "",
    );
    const [cancelReagendaInput, setCancelReagendaInput] = React.useState(
      flow.canceladaFechaReagenda?.slice(0, 16) ?? "",
    );

    const resultado = flow.resultadoLlamada;

    return (
      <div className="space-y-5">
        {/* ASISTENCIA — resultado de la llamada */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PhoneCall className="h-4 w-4 text-blue-500" />
            Resultado de Asistencia
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {/* Asistencia */}
            <button
              type="button"
              disabled={readOnly}
              onClick={() =>
                update({
                  resultadoLlamada: "asistio",
                  noShowMensajes: undefined,
                })
              }
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                resultado === "asistio"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Asistencia
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                El cliente confirma y asiste
              </div>
            </button>

            {/* No Show */}
            <button
              type="button"
              disabled={readOnly}
              onClick={() =>
                update({
                  resultadoLlamada: "no_show",
                  noShowMensajes: {},
                  conversacionActiva: false,
                })
              }
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                resultado === "no_show"
                  ? "border-rose-500 bg-rose-50"
                  : "border-slate-200 hover:border-rose-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm text-rose-700">
                <PhoneOff className="h-4 w-4" /> NO SHOW
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                No asiste y no responde
              </div>
            </button>

            {/* Cancelada */}
            <button
              type="button"
              disabled={readOnly}
              onClick={() =>
                update({
                  resultadoLlamada: "cancelada",
                  conversacionActiva: true,
                })
              }
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                resultado === "cancelada"
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm text-amber-700">
                <CircleOff className="h-4 w-4" /> Cancelada
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                El cliente responde que no asistirá
              </div>
            </button>
          </div>
        </div>

        {/* ── NO SHOW: mensajes de reagenda ────────────────────────────── */}
        {resultado === "no_show" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
              <Bell className="h-4 w-4" />
              Mensajes de Reagenda — NO SHOW
            </div>
            <p className="text-[11px] text-rose-700">
              Envía los mensajes de seguimiento según los tiempos del protocolo.
            </p>
            <div className="space-y-2">
              <ReminderCheck
                label="Mensaje Reagenda: 10 min después de la hora agendada"
                done={!!flow.noShowMensajes?.enviado10m}
                onMark={() =>
                  !readOnly &&
                  update({
                    noShowMensajes: {
                      ...flow.noShowMensajes,
                      enviado10m: true,
                    },
                  })
                }
              />
              <ReminderCheck
                label="Mensaje Reagenda: 1 hr después de la agenda"
                done={!!flow.noShowMensajes?.enviado1h}
                onMark={() =>
                  !readOnly &&
                  update({
                    noShowMensajes: { ...flow.noShowMensajes, enviado1h: true },
                  })
                }
              />
              <ReminderCheck
                label="Mensaje Reagenda: 24 hrs después de la agenda"
                done={!!flow.noShowMensajes?.enviado24h}
                onMark={() =>
                  !readOnly &&
                  update({
                    noShowMensajes: {
                      ...flow.noShowMensajes,
                      enviado24h: true,
                    },
                  })
                }
              />
            </div>
            {flow.noShowMensajes?.enviado24h && (
              <div className="pt-2 border-t border-rose-200">
                <p className="text-[11px] text-rose-700 mb-2">
                  Tras 72 hrs sin resultado → activar Seguimiento Estratégico
                  (Fase 3)
                </p>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                    onClick={() =>
                      update({
                        fase: 3,
                        seguimientoActivo: {
                          activo: true,
                          inicioAt: nowIso(),
                          diasCompletados: [],
                        },
                      })
                    }
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> Activar Seguimiento
                    Estratégico
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CANCELADA: reagendar ─────────────────────────────────────── */}
        {resultado === "cancelada" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Calendar className="h-4 w-4" />
              Coordinar Reagenda — CANCELADA
            </div>
            <p className="text-[11px] text-amber-700">
              El cliente respondió que no asistirá. Coordina una nueva fecha y
              hora.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Nueva fecha propuesta</Label>
                <Input
                  type="datetime-local"
                  value={cancelReagendaInput}
                  onChange={(e) => setCancelReagendaInput(e.target.value)}
                  className="h-8 text-xs"
                  disabled={readOnly}
                />
              </div>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    update({
                      canceladaFechaReagenda: cancelReagendaInput
                        ? new Date(cancelReagendaInput).toISOString()
                        : null,
                    });
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Guardar reagenda
                </Button>
              )}
            </div>
            {flow.canceladaFechaReagenda && (
              <p className="text-[11px] text-amber-800 font-medium">
                Nueva cita: {fmt(flow.canceladaFechaReagenda)}
              </p>
            )}
          </div>
        )}

        {/* ── ASISTENCIA: flujo de la llamada ──────────────────────────── */}
        {resultado === "asistio" && (
          <div className="space-y-4">
            {/* Exploración */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Target className="h-4 w-4 text-blue-500" />
                Exploración en Llamada
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Identifica Dolor y Objetivo</Label>
                  <Textarea
                    value={dolorInput}
                    onChange={(e) => setDolorInput(e.target.value)}
                    onBlur={() =>
                      update({
                        dolorIdentificado: dolorInput,
                        objetivoIdentificado: objetivoInput,
                      })
                    }
                    placeholder="¿Cuál es el dolor principal del prospecto?"
                    className="mt-1 text-xs min-h-16"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="text-xs">Objetivo</Label>
                  <Input
                    value={objetivoInput}
                    onChange={(e) => setObjetivoInput(e.target.value)}
                    onBlur={() =>
                      update({ objetivoIdentificado: objetivoInput })
                    }
                    placeholder="¿Qué objetivo quiere lograr?"
                    className="h-8 text-xs"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="text-xs">Explorar Situación Actual</Label>
                  <Textarea
                    value={situacionInput}
                    onChange={(e) => setSituacionInput(e.target.value)}
                    onBlur={() => update({ situacionActual: situacionInput })}
                    placeholder="Situación actual del prospecto..."
                    className="mt-1 text-xs min-h-16"
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* Califica */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-2">
                  ¿Lead califica?
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    type="button"
                    disabled={readOnly}
                    variant={flow.califica === true ? "default" : "outline"}
                    className={
                      flow.califica === true
                        ? "bg-emerald-600 text-white hover:bg-emerald-600"
                        : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    }
                    onClick={() => update({ califica: true })}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Sí califica
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    disabled={readOnly}
                    variant={flow.califica === false ? "default" : "outline"}
                    className={
                      flow.califica === false
                        ? "bg-rose-600 text-white hover:bg-rose-600"
                        : "text-rose-700 border-rose-300 hover:bg-rose-50"
                    }
                    onClick={() => update({ califica: false })}
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" /> No califica
                  </Button>
                </div>
                {flow.califica === false && (
                  <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    LEAD NO CALIFICA — Registrar como Perdido
                    {!readOnly && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2 h-6 px-2 text-xs border-rose-300 text-rose-700"
                        onClick={() =>
                          update({ resultadoCierre: "perdido", fase: 4 })
                        }
                      >
                        Registrar perdido
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Presentación y cierre */}
            {flow.califica === true && (
              <div className="space-y-4">
                {/* Oferta */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Calificación, Pitch y Cierre
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Califica y presenta solución → pitch → cierre
                  </p>

                  {!readOnly && (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        ¿Qué oferta se presentó?
                      </Label>
                      <Select
                        value={flow.ofertaPresentada ?? ""}
                        onValueChange={(v) =>
                          update({ ofertaPresentada: v as TipoVentaOferta })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Seleccionar oferta" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_VENTA_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Botones de cierre */}
                  <div className="grid gap-2 sm:grid-cols-3 pt-1">
                    <CierreButton
                      label="CIERRE HPRO"
                      sublabel="Venta Hotselling PRO"
                      value="ganado_hpro"
                      current={flow.resultadoCierre}
                      color="emerald"
                      icon={<Zap className="h-4 w-4" />}
                      onClick={() =>
                        !readOnly &&
                        update({
                          resultadoCierre: "ganado_hpro",
                          ventaIngresadaCrm: false,
                          fase: 2,
                        })
                      }
                    />
                    <CierreButton
                      label="CIERRE STARTER"
                      sublabel="Reserva cupo Hotselling Starter"
                      value="ganado_starter"
                      current={flow.resultadoCierre}
                      color="blue"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      onClick={() =>
                        !readOnly &&
                        update({
                          resultadoCierre: "ganado_starter",
                          ofertaPresentada: "hotselling_starter",
                          fase: 2,
                        })
                      }
                    />
                    <CierreButton
                      label="CIERRE DOWNSELL"
                      sublabel="Se ofrece downsell en la llamada"
                      value="ganado_downsell"
                      current={flow.resultadoCierre}
                      color="purple"
                      icon={<ArrowRight className="h-4 w-4" />}
                      onClick={() =>
                        !readOnly &&
                        update({
                          resultadoCierre: "ganado_downsell",
                          ofertaPresentada: "downsell",
                          fase: 2,
                        })
                      }
                    />
                  </div>

                  {/* Perdido */}
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                      onClick={() =>
                        update({ resultadoCierre: "perdido", fase: 4 })
                      }
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" /> Cierre Perdido
                    </Button>
                  )}
                </div>

                {/* OBJECIONES */}
                {(flow.resultadoCierre === null ||
                  flow.resultadoCierre === undefined ||
                  flow.resultadoCierre === "objecion_activa") && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <AlertCircle className="h-4 w-4" />
                      Gestión de Objeciones
                    </div>
                    <p className="text-[11px] text-amber-700">
                      Clasifica el tipo de objeción → rebate → sigue el
                      protocolo
                    </p>
                    {!readOnly && (
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo de objeción</Label>
                        <Select
                          value={flow.tipoObjecion ?? ""}
                          onValueChange={(v) => {
                            update({
                              tipoObjecion: v as TipoObjecion,
                              resultadoCierre: "objecion_activa",
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Clasificar objeción" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIPO_OBJECION_LABELS).map(
                              ([k, v]) => (
                                <SelectItem
                                  key={k}
                                  value={k}
                                  className="text-xs"
                                >
                                  {v}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {flow.tipoObjecion && (
                      <div className="space-y-1.5 rounded-lg border border-amber-200 bg-white/80 p-3">
                        <div className="text-[11px] font-semibold text-amber-800">
                          Recursos para rebatir objeción "
                          {TIPO_OBJECION_LABELS[flow.tipoObjecion]}":
                        </div>
                        <ul className="space-y-1">
                          {OBJECION_RECURSOS[flow.tipoObjecion].map((r) => (
                            <li
                              key={r}
                              className="flex items-start gap-1.5 text-[11px] text-amber-900"
                            >
                              <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Activar seguimiento estratégico */}
                    {flow.tipoObjecion && !readOnly && (
                      <Button
                        size="sm"
                        className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs"
                        onClick={() =>
                          update({
                            fase: 3,
                            seguimientoActivo: {
                              activo: true,
                              inicioAt: nowIso(),
                              tipoObjecion: flow.tipoObjecion,
                              diasCompletados: [],
                            },
                          })
                        }
                      >
                        <ArrowRight className="h-3.5 w-3.5" /> Activar
                        Seguimiento Estratégico (F3)
                      </Button>
                    )}
                  </div>
                )}

                {/* STARTER: acuerda pago restante */}
                {(flow.resultadoCierre === "ganado_starter" ||
                  flow.ofertaPresentada === "hotselling_starter") && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <DollarSign className="h-4 w-4" />
                      Reserva Hotselling Starter
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Monto de reserva (USD)
                        </Label>
                        <Input
                          type="number"
                          value={montoInput}
                          onChange={(e) => setMontoInput(e.target.value)}
                          onBlur={() =>
                            update({ montoReserva: Number(montoInput) || null })
                          }
                          placeholder="Ej: 500"
                          className="h-8 text-xs"
                          disabled={readOnly}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Fecha de pago del restante acordada
                        </Label>
                        <Input
                          type="date"
                          value={fechaPagoInput}
                          onChange={(e) => setFechaPagoInput(e.target.value)}
                          onBlur={() =>
                            update({
                              fechaPagoRestanteAcordada: fechaPagoInput
                                ? new Date(
                                    `${fechaPagoInput}T00:00:00Z`,
                                  ).toISOString()
                                : null,
                            })
                          }
                          className="h-8 text-xs"
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    {flow.fechaPagoRestanteAcordada && (
                      <p className="text-[11px] text-blue-800 font-medium">
                        Pago del restante acordado para:{" "}
                        {fmtDate(flow.fechaPagoRestanteAcordada)}
                      </p>
                    )}
                    {/* Ingreso de venta */}
                    <div className="pt-2 border-t border-blue-200">
                      <StepRow
                        done={!!flow.ventaIngresadaCrm}
                        label="Registrar Reserva en CRM"
                        sublabel={
                          flow.ventaIngresadaAt
                            ? `Registrada ${fmt(flow.ventaIngresadaAt)}`
                            : "Ingreso de venta (reserva) al CRM"
                        }
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onMark={() =>
                          !readOnly &&
                          update({
                            ventaIngresadaCrm: true,
                            ventaIngresadaAt: nowIso(),
                          })
                        }
                        readOnly={readOnly}
                      />
                    </div>
                  </div>
                )}

                {/* HPRO / DOWNSELL: ingreso de venta */}
                {(flow.resultadoCierre === "ganado_hpro" ||
                  flow.resultadoCierre === "ganado_downsell") && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      VENTA CERRADA —{" "}
                      {flow.resultadoCierre === "ganado_hpro"
                        ? "Hotselling PRO"
                        : "Downsell"}
                    </div>
                    <StepRow
                      done={!!flow.ventaIngresadaCrm}
                      label="Ingreso de Venta a CRM"
                      sublabel={
                        flow.ventaIngresadaAt
                          ? `Ingresada ${fmt(flow.ventaIngresadaAt)}`
                          : "Registrar la venta en el CRM"
                      }
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      onMark={() =>
                        !readOnly &&
                        update({
                          ventaIngresadaCrm: true,
                          ventaIngresadaAt: nowIso(),
                        })
                      }
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     FASE 3 — Seguimiento Activo (Estratégico)
  ═══════════════════════════════════════════════════════════════════ */
  const Fase3 = () => {
    const seg = flow.seguimientoActivo;
    const diasCompletados = seg?.diasCompletados ?? [];
    const objecion = seg?.tipoObjecion ?? flow.tipoObjecion;

    const diaConfig: Record<
      number,
      { tipo: SeguimientoMensaje["tipo"]; label: string; descripcion: string }
    > = {
      0: {
        tipo: "conexion",
        label: "Día 0: Conexión",
        descripcion: "Mensaje inicial de conexión con el lead",
      },
      1: {
        tipo: "recurso",
        label: "Día 1: Seguimiento",
        descripcion: "Primer seguimiento post-llamada",
      },
      2: {
        tipo: "recurso",
        label: "Día 2: Enviar recurso",
        descripcion: "Enviar recurso según tipo de objeción",
      },
      4: {
        tipo: "recurso",
        label: "Día 4: Seguimiento",
        descripcion: "Seguimiento de mitad de semana",
      },
      6: {
        tipo: "recurso",
        label: "Día 6: Enviar recurso",
        descripcion: "Segundo recurso de seguimiento",
      },
      7: {
        tipo: "cierre",
        label: "Día 7: Cierre de seguimiento",
        descripcion: "Mensaje de cierre del ciclo de seguimiento activo",
      },
    };

    return (
      <div className="space-y-4">
        {/* Resumen de objeción */}
        {objecion && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-[11px] font-semibold text-amber-800">
              Seguimiento activo 7 días — Uso de recursos según tipo de
              objeción:{" "}
              <span className="font-bold">
                {TIPO_OBJECION_LABELS[objecion]}
              </span>
            </p>
            {objecion && (
              <ul className="mt-2 space-y-1">
                {OBJECION_RECURSOS[objecion].map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-1.5 text-[11px] text-amber-900"
                  >
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-amber-400" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Protocolo días */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MessageCircle className="h-4 w-4 text-amber-500" />
            Protocolo de Seguimiento (7 días)
          </div>
          <div className="space-y-2">
            {([...PROTOCOL_DAYS_FASE3] as number[]).map((dia) => {
              const cfg2 = diaConfig[dia];
              const msg = getDiaMensaje(dia, cfg2.tipo);
              const done = diasCompletados.includes(dia) || !!msg;
              return (
                <div
                  key={dia}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700">
                        {cfg2.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {cfg2.descripcion}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {msg && (
                      <Badge
                        className={
                          msg.estado === "respondido"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }
                      >
                        {msg.estado === "respondido" ? "Respondido" : "Enviado"}
                      </Badge>
                    )}
                    {!readOnly && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          toggleDiaMensaje(dia, cfg2.tipo);
                          if (!diasCompletados.includes(dia)) {
                            update({
                              seguimientoActivo: {
                                ...seg,
                                activo: true,
                                diasCompletados: [...diasCompletados, dia],
                              },
                            });
                          }
                        }}
                      >
                        {done
                          ? msg?.estado === "respondido"
                            ? "✓ Respondido"
                            : "✓ Enviado"
                          : "Marcar enviado"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ¿Hubo respuesta? */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-700">
            ¿Hubo respuesta?
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              {flow.leadRespondioSeguimiento === undefined && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    onClick={() =>
                      update({
                        leadRespondioSeguimiento: true,
                        conversacionActiva: true,
                      })
                    }
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Sí respondió
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                    onClick={() =>
                      update({
                        leadRespondioSeguimiento: false,
                        conversacionActiva: false,
                      })
                    }
                  >
                    <UserX className="h-3.5 w-3.5" /> No respondió
                  </Button>
                </>
              )}
              {flow.leadRespondioSeguimiento === true && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Se reabrió conversación — avanzar en el seguimiento
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1 text-[10px] text-slate-500"
                    onClick={() =>
                      update({ leadRespondioSeguimiento: undefined })
                    }
                  >
                    Cambiar
                  </Button>
                </div>
              )}
              {flow.leadRespondioSeguimiento === false && (
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <UserX className="h-4 w-4" />
                    <span>Sin respuesta — activar Fase 4: Recuperación</span>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs"
                    onClick={() =>
                      update({
                        fase: 4,
                        recuperacionActiva: true,
                      })
                    }
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> Activar Recuperación
                    (F4)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     FASE 4 — Recuperación
  ═══════════════════════════════════════════════════════════════════ */
  const Fase4 = () => {
    const [fechaRecontactoInput, setFechaRecontactoInput] = React.useState(
      flow.fechaRecontactoFuturo?.slice(0, 10) ?? "",
    );

    const diaConfig4: Record<number, { label: string; descripcion: string }> = {
      10: {
        label: "Acción Día 10",
        descripcion: "Primer contacto de recuperación",
      },
      14: {
        label: "Acción Día 14",
        descripcion: "Seguimiento de recuperación",
      },
      21: {
        label: "Acción Día 21",
        descripcion: "Seguimiento forzado de recuperación",
      },
      30: {
        label: "Acción Día 30",
        descripcion: "Último intento de recuperación activa",
      },
    };

    const diasCompletados4 =
      flow.mensajes
        ?.filter((m) => m.tipo === "template_inicio")
        .map((m) => m.dia) ?? [];

    return (
      <div className="space-y-4">
        {/* Templates de inicio */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-800">
            <MessageSquare className="h-4 w-4" />
            Envío de Templates para Iniciar Contacto
          </div>
          <p className="text-[11px] text-purple-700">
            Usa templates específicos para reabrir la conversación según el
            estado del lead.
          </p>
          <StepRow
            done={!!flow.templatesInicioEnviados}
            label="Templates enviados"
            sublabel="Envío de templates de inicio de contacto"
            icon={<MessageSquare className="h-4 w-4" />}
            onMark={() =>
              !readOnly && update({ templatesInicioEnviados: true })
            }
            readOnly={readOnly}
          />
        </div>

        {/* Acciones por días */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calendar className="h-4 w-4 text-purple-500" />
            Protocolo de Recuperación (Días 10–30)
          </div>
          <div className="space-y-2">
            {([...PROTOCOL_DAYS_FASE4] as number[]).map((dia) => {
              const cfg4 = diaConfig4[dia];
              const done = diasCompletados4.includes(dia);
              return (
                <div
                  key={dia}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-700">
                        {cfg4.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {cfg4.descripcion}
                      </div>
                    </div>
                  </div>
                  {!readOnly && !done && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs shrink-0 ml-2"
                      onClick={() => addMensaje(dia, "template_inicio")}
                    >
                      Marcar enviado
                    </Button>
                  )}
                  {done && (
                    <Badge className="shrink-0 ml-2 bg-emerald-100 text-emerald-700">
                      Enviado
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ¿Lead pidió recontacto futuro? */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-700">
            ¿Lead pidió recontacto futuro?
          </div>
          {!readOnly && flow.leadPidioRecontactoFuturo === undefined && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => update({ leadPidioRecontactoFuturo: true })}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Sí pidió recontacto
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                onClick={() =>
                  update({
                    leadPidioRecontactoFuturo: false,
                    recuperacionTerminoSinRespuesta: true,
                  })
                }
              >
                <UserX className="h-3.5 w-3.5" /> Sin respuesta
              </Button>
            </div>
          )}

          {flow.leadPidioRecontactoFuturo === true && (
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">
                    Fecha de seguimiento próximo
                  </Label>
                  <Input
                    type="date"
                    value={fechaRecontactoInput}
                    onChange={(e) => setFechaRecontactoInput(e.target.value)}
                    className="h-8 text-xs"
                    disabled={readOnly}
                  />
                </div>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() =>
                      update({
                        fechaRecontactoFuturo: fechaRecontactoInput
                          ? new Date(
                              `${fechaRecontactoInput}T00:00:00Z`,
                            ).toISOString()
                          : null,
                      })
                    }
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Guardar
                  </Button>
                )}
              </div>
              {flow.fechaRecontactoFuturo && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  Recontacto programado: {fmtDate(flow.fechaRecontactoFuturo)}
                </p>
              )}
            </div>
          )}

          {flow.recuperacionTerminoSinRespuesta && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <UserX className="h-4 w-4" />
                Lead terminó recuperación sin respuesta → Cliente Perdido /
                Activar Reactivación LP
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-rose-700 border-rose-200"
                    onClick={() => update({ resultadoCierre: "perdido" })}
                  >
                    <UserX className="h-3.5 w-3.5" /> Marcar como Perdido
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    onClick={() =>
                      update({
                        fase: 5,
                        reactivacionActiva: true,
                      })
                    }
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> Reactivación LP (F5)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     FASE 5 — Reactivación a Largo Plazo
  ═══════════════════════════════════════════════════════════════════ */
  const Fase5 = () => {
    const diasCompletados5 = flow.diasReactivacion ?? [];

    const diaConfig5: Record<number, { label: string; descripcion: string }> = {
      30: {
        label: "Día 30",
        descripcion: "Primer contacto de reactivación a largo plazo",
      },
      60: {
        label: "Día 60",
        descripcion: "Seguimiento de reactivación",
      },
      90: {
        label: "Día 90",
        descripcion: "Último intento de reactivación — Retargeting",
      },
    };

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <TrendingUp className="h-4 w-4" />
            Reactivación a Largo Plazo
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">
            Secuencia de reactivación de 30/60/90 días para leads que no
            respondieron en recuperación.
          </p>
        </div>

        {/* Días */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <RefreshCw className="h-4 w-4 text-emerald-500" />
            Secuencia de Reactivación
          </div>
          <div className="space-y-2">
            {([...PROTOCOL_DAYS_FASE5] as number[]).map((dia) => {
              const cfg5 = diaConfig5[dia];
              const done = diasCompletados5.includes(dia);
              return (
                <div
                  key={dia}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-700">
                        {cfg5.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {cfg5.descripcion}
                      </div>
                    </div>
                  </div>
                  {!readOnly && !done && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs shrink-0 ml-2"
                      onClick={() => {
                        update({
                          diasReactivacion: [...diasCompletados5, dia],
                        });
                        addMensaje(dia, "largo_plazo");
                      }}
                    >
                      Marcar enviado
                    </Button>
                  )}
                  {done && (
                    <Badge className="shrink-0 ml-2 bg-emerald-100 text-emerald-700">
                      Enviado
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Herramientas */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-700">
            Herramientas de Reactivación
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleStep
              done={!!flow.retargetingActivo}
              label="Retargeting activado"
              sublabel="Activar campañas de retargeting para este lead"
              icon={<Target className="h-3.5 w-3.5" />}
              onToggle={() =>
                !readOnly &&
                update({ retargetingActivo: !flow.retargetingActivo })
              }
            />
            <ToggleStep
              done={!!flow.eventoInmersionL2H}
              label="Evento Inmersión L2H"
              sublabel="Invitado al Evento de Inmersión L2H"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onToggle={() =>
                !readOnly &&
                update({ eventoInmersionL2H: !flow.eventoInmersionL2H })
              }
            />
          </div>
        </div>

        {/* Reabrir conversación */}
        {!readOnly && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
            <div className="text-xs font-semibold text-emerald-800">
              Se reabre conversación
            </div>
            <p className="text-[11px] text-emerald-700">
              Si el lead responde en cualquier punto, marca la fecha de
              seguimiento próximo.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs border-emerald-300 text-emerald-700"
              onClick={() =>
                update({
                  leadRespondioSeguimiento: true,
                  conversacionActiva: true,
                  fase: 3,
                })
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Lead respondió — volver a
              Seguimiento
            </Button>
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER PRINCIPAL
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <QuickStats />

      {/* Notas del closer */}
      <NotasCloser
        value={flow.notas ?? ""}
        onChange={(v) => !readOnly && update({ notas: v })}
        readOnly={readOnly}
      />

      {/* Fases como colapsables */}
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const cfg2 = FASE_CONFIG[n];
        const FIcon = cfg2.icon;
        const isOpen = openFases.has(n);
        const isCurrent = n === faseActual;

        return (
          <Collapsible key={n} open={isOpen} onOpenChange={() => toggleFase(n)}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={`w-full flex items-center justify-between rounded-2xl border px-5 py-4 transition-all ${
                  isCurrent
                    ? `${cfg2.bg} ${cfg2.border} shadow-sm`
                    : "border-slate-200 bg-white/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${cfg2.gradient} flex items-center justify-center`}
                  >
                    <FIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div
                      className={`text-sm font-bold ${
                        isCurrent ? cfg2.text : "text-slate-700"
                      }`}
                    >
                      FASE {n}: {cfg2.label.toUpperCase()}
                    </div>
                    {isCurrent && (
                      <div className="text-[11px] text-slate-500">
                        Fase actual del proceso
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <Badge className={`${cfg2.bg} ${cfg2.text} ${cfg2.border}`}>
                      Activa
                    </Badge>
                  )}
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 rounded-2xl border border-slate-200/60 bg-white/80 p-5 backdrop-blur">
                {n === 1 && <Fase1 />}
                {n === 2 && <Fase2 />}
                {n === 3 && <Fase3 />}
                {n === 4 && <Fase4 />}
                {n === 5 && <Fase5 />}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Última actualización */}
      <div className="text-[11px] text-slate-400 text-right">
        Última actualización: {fmt(flow.updatedAt)}
      </div>
    </div>
  );
}

/* ─── Sub-componentes reutilizables ───────────────────────────────────── */

function StepRow({
  done,
  skipped,
  label,
  sublabel,
  icon,
  onMark,
  readOnly,
  actions,
  children,
}: {
  done: boolean;
  skipped?: boolean;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  onMark?: () => void;
  readOnly?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        done
          ? "border-emerald-200 bg-emerald-50"
          : skipped
            ? "border-slate-200 bg-slate-50 opacity-60"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 ${
              done
                ? "text-emerald-500"
                : skipped
                  ? "text-slate-400"
                  : "text-slate-400"
            }`}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              (icon ?? <Clock className="h-4 w-4" />)
            )}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-700 truncate">
              {label}
            </div>
            {sublabel && (
              <div className="text-[11px] text-slate-500 truncate">
                {sublabel}
              </div>
            )}
          </div>
        </div>
        {actions ??
          (!readOnly && onMark && !done ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs shrink-0"
              onClick={onMark}
            >
              Marcar
            </Button>
          ) : null)}
      </div>
      {children}
    </div>
  );
}

function ReminderCheck({
  label,
  sublabel,
  done,
  auto,
  onMark,
}: {
  label: string;
  sublabel?: string;
  done: boolean;
  auto?: boolean;
  onMark?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
        done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Bell className="h-4 w-4 shrink-0 text-slate-400" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-700 leading-tight">{label}</div>
        {sublabel && (
          <div className="text-[10px] text-slate-400">{sublabel}</div>
        )}
      </div>
      {!done && !auto && onMark && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] shrink-0"
          onClick={onMark}
        >
          ✓
        </Button>
      )}
      {auto && !done && (
        <Badge className="text-[10px] bg-slate-100 text-slate-500 shrink-0">
          Auto
        </Badge>
      )}
    </div>
  );
}

function CierreButton({
  label,
  sublabel,
  value,
  current,
  color,
  icon,
  onClick,
}: {
  label: string;
  sublabel: string;
  value: NonNullable<ResultadoCierre>;
  current: ResultadoCierre | null | undefined;
  color: "emerald" | "blue" | "purple";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const active = current === value;
  const colorMap = {
    emerald: {
      border: active ? "border-emerald-500" : "border-slate-200",
      bg: active ? "bg-emerald-50" : "hover:border-emerald-300",
      text: "text-emerald-700",
    },
    blue: {
      border: active ? "border-blue-500" : "border-slate-200",
      bg: active ? "bg-blue-50" : "hover:border-blue-300",
      text: "text-blue-700",
    },
    purple: {
      border: active ? "border-purple-500" : "border-slate-200",
      bg: active ? "bg-purple-50" : "hover:border-purple-300",
      text: "text-purple-700",
    },
  };
  const cc = colorMap[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 p-3 text-left transition-all ${cc.border} ${cc.bg}`}
    >
      <div
        className={`flex items-center gap-1.5 font-semibold text-sm ${cc.text}`}
      >
        {icon}
        {label}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{sublabel}</div>
    </button>
  );
}

function ToggleStep({
  done,
  label,
  sublabel,
  icon,
  onToggle,
}: {
  done: boolean;
  label: string;
  sublabel: string;
  icon?: React.ReactNode;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-lg border-2 p-3 text-left transition-all w-full ${
        done
          ? "border-emerald-400 bg-emerald-50"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 font-semibold text-sm ${
          done ? "text-emerald-700" : "text-slate-600"
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : icon}
        {label}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{sublabel}</div>
    </button>
  );
}

function NotasCloser({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">
        Notas del Closer
      </Label>
      <Textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onChange(local)}
        placeholder="Observaciones, contexto del lead, puntos clave..."
        className="min-h-16 text-xs"
        disabled={readOnly}
      />
    </div>
  );
}
