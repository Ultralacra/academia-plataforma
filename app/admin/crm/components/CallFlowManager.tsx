"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { updateMetadataPayload } from "@/app/admin/crm/api";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CircleOff,
  PhoneOff,
  PhoneOutgoing,
  RotateCcw,
  Send,
  TimerReset,
  Bell,
  AlarmClock,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";

// Estructura que guardamos dentro de payload de un booking
export type CallOutcome = "no_show" | "cancelled" | "attended" | null;

export interface CallFlowState {
  outcome?: CallOutcome; // resultado final de la llamada
  started_at?: string | null;
  result_at?: string | null;
  notes?: string | null;
  // Recordatorios programados
  reminders?: Array<{
    id: string;
    kind:
      | "precall_24h"
      | "precall_1h"
      | "precall_15m"
      | "noshow_10m"
      | "noshow_1h"
      | "noshow_24h";
    at: string; // ISO
    status: "pending" | "sent" | "skipped";
  }>;
  // Reagenda solicitada
  reschedule?: {
    date?: string | null; // YYYY-MM-DD
    time?: string | null; // HH:mm
    requested?: boolean;
  };
  // Ventana de negociación activa
  negotiation?: {
    active: boolean;
    until?: string | null; // ISO (hoy + 7 días)
    last_contact_at?: string | null;
  };
}

function isoPlusMinutes(min: number) {
  const d = new Date(Date.now() + min * 60 * 1000);
  return d.toISOString();
}

function scheduleDefaultPrecallReminders(): CallFlowState["reminders"] {
  return [
    {
      id: crypto.randomUUID?.() || `r-${Date.now()}-24`,
      kind: "precall_24h",
      at: isoPlusMinutes(24 * 60),
      status: "pending",
    },
    {
      id: crypto.randomUUID?.() || `r-${Date.now()}-1`,
      kind: "precall_1h",
      at: isoPlusMinutes(60),
      status: "pending",
    },
    {
      id: crypto.randomUUID?.() || `r-${Date.now()}-15`,
      kind: "precall_15m",
      at: isoPlusMinutes(15),
      status: "pending",
    },
  ];
}

function scheduleNoShowFollowups(): CallFlowState["reminders"] {
  return [
    {
      id: crypto.randomUUID?.() || `r-${Date.now()}-ns10`,
      kind: "noshow_10m",
      at: isoPlusMinutes(10),
      status: "pending",
    },
    {
      id: crypto.randomUUID?.() || `r-${Date.now()}-ns60`,
      kind: "noshow_1h",
      at: isoPlusMinutes(60),
      status: "pending",
    },
    {
      id: crypto.randomUUID?.() || `r-${Date.now()}-ns1440`,
      kind: "noshow_24h",
      at: isoPlusMinutes(24 * 60),
      status: "pending",
    },
  ];
}

export function CallFlowManager({
  recordId,
  payload,
  onSaved,
}: {
  recordId: string | number; // id del registro metadata (booking)
  payload: any; // payload actual (booking)
  onSaved?: () => void;
}) {
  const call: CallFlowState = (payload?.call as CallFlowState) || {};
  const [rescheduleDate, setRescheduleDate] = React.useState<string>(
    call?.reschedule?.date || ""
  );
  const [rescheduleTime, setRescheduleTime] = React.useState<string>(
    call?.reschedule?.time || ""
  );
  const [notes, setNotes] = React.useState<string>(call?.notes || "");
  const inputAccent =
    "border-slate-300 focus-visible:ring-slate-200 focus-visible:border-slate-400";

  const safeUpdate = async (patch: Partial<CallFlowState>) => {
    try {
      const next: CallFlowState = {
        ...call,
        ...patch,
      };
      await updateMetadataPayload(String(recordId), { call: next } as any);
      toast({ title: "Guardado" });
      onSaved?.();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  const programarPrecall = () => {
    const existing = Array.isArray(call.reminders) ? call.reminders : [];
    const appended = [...existing, ...scheduleDefaultPrecallReminders()!];
    safeUpdate({ reminders: appended });
  };

  const programarRecordatorio = (
    kind: NonNullable<CallFlowState["reminders"]>[number]["kind"]
  ) => {
    const entry = {
      id: crypto.randomUUID?.() || `r-${Date.now()}-${kind}`,
      kind,
      at:
        kind === "precall_24h"
          ? isoPlusMinutes(24 * 60)
          : kind === "precall_1h"
          ? isoPlusMinutes(60)
          : kind === "precall_15m"
          ? isoPlusMinutes(15)
          : kind === "noshow_10m"
          ? isoPlusMinutes(10)
          : kind === "noshow_1h"
          ? isoPlusMinutes(60)
          : isoPlusMinutes(24 * 60),
      status: "pending" as const,
    };
    const existing = Array.isArray(call.reminders) ? call.reminders : [];
    safeUpdate({ reminders: [...existing, entry] });
  };

  const eliminarRecordatorio = (id: string) => {
    const existing = Array.isArray(call.reminders) ? call.reminders : [];
    safeUpdate({ reminders: existing.filter((r) => r.id !== id) });
  };

  const marcarRecordatorio = (id: string, status: "sent" | "skipped") => {
    const existing = Array.isArray(call.reminders) ? call.reminders : [];
    const next = existing.map((r) => (r.id === id ? { ...r, status } : r));
    safeUpdate({ reminders: next });
  };

  const marcarNoShow = () => {
    const existing = Array.isArray(call.reminders) ? call.reminders : [];
    const appended = [...existing, ...scheduleNoShowFollowups()!];
    safeUpdate({
      outcome: "no_show",
      result_at: new Date().toISOString(),
      reminders: appended,
      negotiation: { active: false, until: null },
    });
  };

  const marcarAsistencia = () => {
    // activa negociación por 7 días
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    safeUpdate({
      outcome: "attended",
      result_at: new Date().toISOString(),
      negotiation: { active: true, until },
    });
  };

  const marcarCancelada = () => {
    safeUpdate({
      outcome: "cancelled",
      result_at: new Date().toISOString(),
      reschedule: {
        requested: true,
        date: rescheduleDate || null,
        time: rescheduleTime || null,
      },
      negotiation: { active: false, until: null },
    });
  };

  const guardarReagenda = () => {
    safeUpdate({
      reschedule: {
        requested: true,
        date: rescheduleDate || null,
        time: rescheduleTime || null,
      },
    });
  };

  const guardarNotas = () => safeUpdate({ notes });

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("es-ES") : "—";

  const nextAppointmentText = () => {
    const d = call?.reschedule?.date || "";
    const t = call?.reschedule?.time || "";
    if (!d && !t) return "—";
    if (d && t) return `${d} ${t}`;
    if (d && !t) return `${d} (sin hora)`;
    return `Hora ${t} (sin fecha)`;
  };

  const statusBadge = () => {
    const s = call?.outcome || null;
    if (s === "attended")
      return (
        <Badge className="bg-emerald-100 text-emerald-700">Asistencia</Badge>
      );
    if (s === "no_show")
      return <Badge className="bg-rose-100 text-rose-700">No show</Badge>;
    if (s === "cancelled")
      return <Badge className="bg-amber-100 text-amber-700">Cancelada</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">Sin resultado</Badge>;
  };

  const reminders = (call?.reminders || [])
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));

  // Helpers visuales
  const labelKind: Record<string, string> = {
    precall_24h: "24h antes",
    precall_1h: "1h antes",
    precall_15m: "15m antes",
    noshow_10m: "+10m",
    noshow_1h: "+1h",
    noshow_24h: "+24h",
  };

  return (
    <Card className="p-4 space-y-4 border-slate-200">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-slate-400" />
          <div className="text-sm font-semibold">Flujo de llamada</div>
        </div>
        {statusBadge()}
      </div>

      {call?.reschedule?.requested ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-amber-900">
              Reagenda solicitada
              {call?.outcome === "cancelled" ? " (cancelada + reagendada)" : ""}
            </div>
            <Badge className="bg-amber-100 text-amber-800">
              Próxima cita: {nextAppointmentText()}
            </Badge>
          </div>
          {!call?.reschedule?.date && !call?.reschedule?.time ? (
            <div className="mt-1 text-[11px] text-amber-800">
              Falta definir fecha/hora.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Sección: Estado y acciones rápidas */}
      <Card className="p-3 border-slate-200">
        <div className="text-xs font-semibold mb-2">Estado de la llamada</div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            size="sm"
            variant={call?.outcome === "attended" ? "default" : "outline"}
            onClick={marcarAsistencia}
            className={
              call?.outcome === "attended"
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : ""
            }
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Asistencia
          </Button>
          <Button
            type="button"
            size="sm"
            variant={call?.outcome === "no_show" ? "default" : "outline"}
            onClick={marcarNoShow}
            className={
              call?.outcome === "no_show"
                ? "bg-rose-600 text-white hover:bg-rose-600"
                : ""
            }
          >
            <PhoneOff className="h-4 w-4 mr-1" /> No show
          </Button>
          <Button
            type="button"
            size="sm"
            variant={call?.outcome === "cancelled" ? "default" : "outline"}
            onClick={marcarCancelada}
            className={
              call?.outcome === "cancelled"
                ? "bg-amber-600 text-white hover:bg-amber-600"
                : ""
            }
          >
            <CircleOff className="h-4 w-4 mr-1" /> Cancelada
          </Button>
        </div>
        {call?.result_at ? (
          <div className="mt-2 text-[11px] text-slate-600">
            Marcado el {fmt(call.result_at)}
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-slate-500">
            Aún sin resultado marcado
          </div>
        )}
        {call?.outcome === "attended" && call?.negotiation?.until ? (
          <div className="mt-3 rounded-md border border-emerald-200 p-2 bg-emerald-50/50 text-[11px]">
            Ventana de negociación activa hasta: {fmt(call?.negotiation?.until)}
          </div>
        ) : null}
      </Card>

      {/* Sección: Recordatorios */}
      <Card className="p-3 border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Recordatorios</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={programarPrecall}
              className="gap-2"
            >
              <TimerReset className="h-4 w-4" /> Pre-llamada 24h·1h·15m
            </Button>
            {call?.outcome === "no_show" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const existing = Array.isArray(call.reminders)
                    ? call.reminders
                    : [];
                  const appended = [...existing, ...scheduleNoShowFollowups()!];
                  safeUpdate({ reminders: appended });
                }}
                className="gap-2"
              >
                <AlarmClock className="h-4 w-4" /> Seguimiento +10m·1h·24h
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            variant="outline"
            onClick={() => programarRecordatorio("precall_24h")}
          >
            24h
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            variant="outline"
            onClick={() => programarRecordatorio("precall_1h")}
          >
            1h
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            variant="outline"
            onClick={() => programarRecordatorio("precall_15m")}
          >
            15m
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            variant="outline"
            onClick={() => programarRecordatorio("noshow_10m")}
          >
            +10m
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            variant="outline"
            onClick={() => programarRecordatorio("noshow_1h")}
          >
            +1h
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            variant="outline"
            onClick={() => programarRecordatorio("noshow_24h")}
          >
            +24h
          </Button>
        </div>

        {reminders.length > 0 ? (
          <div className="space-y-2 text-xs">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">
                    {labelKind[r.kind] || r.kind}
                  </span>
                  <Badge
                    className={
                      r.status === "pending"
                        ? "bg-slate-100 text-slate-700"
                        : r.status === "sent"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">{fmt(r.at)}</span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    variant="outline"
                    onClick={() => marcarRecordatorio(r.id, "sent")}
                  >
                    Enviado
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    variant="outline"
                    onClick={() => marcarRecordatorio(r.id, "skipped")}
                  >
                    Omitir
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    variant="outline"
                    onClick={() => eliminarRecordatorio(r.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">
            No hay recordatorios programados.
          </div>
        )}
      </Card>

      {/* Sección: Reagendar */}
      <Card className="p-3 border-slate-200">
        <div className="text-xs font-semibold mb-2">Reagendar</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
          <div>
            <Label className="text-xs">Fecha</Label>
            <Input
              type="date"
              className={inputAccent}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Hora</Label>
            <Input
              type="time"
              className={inputAccent}
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={guardarReagenda}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-1" /> Guardar re-agenda
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={marcarCancelada}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-1" /> Cancelar + re-agendar
          </Button>
        </div>
        {call?.reschedule?.date || call?.reschedule?.time ? (
          <div className="mt-2 text-[11px] text-slate-600">
            Próxima cita: {nextAppointmentText()}
          </div>
        ) : null}
      </Card>

      {/* Sección: Notas */}
      <Card className="p-3 border-slate-200">
        <div className="text-xs font-semibold mb-2">Notas</div>
        <Textarea
          placeholder="Observaciones, objeciones, acuerdos..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-24"
        />
        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Si hubo asistencia, procede con el formulario de venta
            (HLite/Found.).
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={guardarNotas}
          >
            Guardar notas
          </Button>
        </div>
      </Card>
    </Card>
  );
}
