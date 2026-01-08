"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { updateLeadPatch } from "@/app/admin/crm/api";
import {
  Calendar,
  CheckCircle2,
  CircleOff,
  PhoneOff,
  RotateCcw,
  Bell,
  AlertTriangle,
  PhoneCall,
  Clock,
} from "lucide-react";

// Estructura que guardamos dentro de payload de un booking
export type CallOutcome = "no_show" | "cancelled" | "attended" | null;

export interface CallFlowState {
  outcome?: CallOutcome; // resultado final de la llamada
  started_at?: string | null;
  result_at?: string | null;
  notes?: string | null;
  evidence_images?: Array<{
    id: string;
    name?: string;
    type?: string;
    size?: number;
    dataUrl: string;
    created_at: string;
    outcome?: CallOutcome;
  }>;
  notes_images?: Array<{
    id: string;
    name?: string;
    type?: string;
    size?: number;
    dataUrl: string;
    created_at: string;
  }>;
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
    label?: string;
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

function toMidnightIso(date?: string | null) {
  if (!date) return null;
  const s = String(date);
  // Si ya es ISO, lo dejamos
  if (s.includes("T")) return s;
  // YYYY-MM-DD -> ISO a medianoche UTC
  try {
    return new Date(`${s}T00:00:00.000Z`).toISOString();
  } catch {
    return s;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
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
  leadCodigo,
  payload,
  onSaved,
  persistMode = "api",
}: {
  leadCodigo: string; // codigo del lead (ruta /v1/leads/:codigo)
  payload: any; // payload actual (booking)
  onSaved?: (nextCall: CallFlowState) => void;
  persistMode?: "api" | "local";
}) {
  const call: CallFlowState = (payload?.call as CallFlowState) || {};
  const [rescheduleDate, setRescheduleDate] = React.useState<string>(
    call?.reschedule?.date || ""
  );
  const [rescheduleTime, setRescheduleTime] = React.useState<string>(
    call?.reschedule?.time || ""
  );
  const [notes, setNotes] = React.useState<string>(call?.notes || "");
  const [newReminderAt, setNewReminderAt] = React.useState<string>("");
  const [newReminderLabel, setNewReminderLabel] = React.useState<string>("");
  const inputAccent =
    "border-slate-300 focus-visible:ring-slate-200 focus-visible:border-slate-400";

  const safeUpdate = async (patch: Partial<CallFlowState>) => {
    try {
      const next: CallFlowState = {
        ...call,
        ...patch,
      };

      const leadPatch: Record<string, any> = {
        call_outcome: next?.outcome ?? null,
        call_result_at: next?.result_at ?? null,
        call_reschedule_date: toMidnightIso(next?.reschedule?.date ?? null),
        call_reschedule_time: next?.reschedule?.time ?? null,
        call_negotiation_active: next?.negotiation?.active ? 1 : 0,
        call_negotiation_until: next?.negotiation?.until ?? null,
        reminders: Array.isArray(next?.reminders) ? next.reminders : [],
      };
      // Guardamos notas de llamada en un campo existente del lead (best-effort)
      if (patch?.notes !== undefined) {
        leadPatch.text_messages = next?.notes ?? null;
      }

      if (persistMode === "api") {
        await updateLeadPatch(leadCodigo, leadPatch, payload);
        toast({ title: "Guardado" });
      } else {
        toast({
          title: "Listo para guardar",
          description:
            "Este cambio se guardará al presionar “Guardar cambios”.",
        });
      }
      onSaved?.(next);
      return next;
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || String(e),
        variant: "destructive",
      });
      throw e;
    }
  };

  const agregarRecordatorioPersonalizado = async () => {
    if (!newReminderAt) {
      toast({
        title: "Falta fecha y hora",
        description: "Selecciona una fecha y hora para el recordatorio.",
        variant: "destructive",
      });
      return;
    }
    const whenIso = new Date(newReminderAt).toISOString();
    const entry = {
      id: crypto.randomUUID?.() || `r-${Date.now()}-custom`,
      kind: "custom" as any,
      label: newReminderLabel?.trim() || "Personalizado",
      at: whenIso,
      status: "pending" as const,
    };
    const existing = Array.isArray(call.reminders) ? call.reminders : [];
    await safeUpdate({ reminders: [...existing, entry] });
    setNewReminderAt("");
    setNewReminderLabel("");
  };

  const onUploadImages = async (
    files: FileList | null | undefined,
    target: "evidence_images" | "notes_images"
  ) => {
    if (!files || files.length === 0) return;
    try {
      const existing = Array.isArray((call as any)[target])
        ? ((call as any)[target] as any[])
        : [];
      const created_at = new Date().toISOString();
      const nextItems = [] as any[];
      for (const file of Array.from(files)) {
        if (!file.type?.startsWith("image/")) continue;
        const dataUrl = await fileToDataUrl(file);
        nextItems.push({
          id: crypto.randomUUID?.() || `img-${Date.now()}-${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
          created_at,
          ...(target === "evidence_images"
            ? { outcome: call?.outcome || null }
            : {}),
        });
      }
      if (nextItems.length === 0) return;
      await safeUpdate({ [target]: [...existing, ...nextItems] } as any);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo subir la imagen",
        variant: "destructive",
      });
    }
  };

  const removeImage = async (
    target: "evidence_images" | "notes_images",
    id: string
  ) => {
    const existing = Array.isArray((call as any)[target])
      ? ((call as any)[target] as any[])
      : [];
    await safeUpdate({ [target]: existing.filter((x) => x.id !== id) } as any);
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
    safeUpdate({
      outcome: "no_show",
      result_at: new Date().toISOString(),
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
      return <Badge className="bg-rose-100 text-rose-700">No asistió</Badge>;
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
    custom: "Personalizado",
  };

  return (
    <Card className="p-4 space-y-4 border-slate-200">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-slate-400" />
          <div className="text-sm font-semibold">Flujo de llamada</div>
          {nextAppointmentText() !== "—" ? (
            <Badge className="bg-slate-100 text-slate-700">
              Agenda: {nextAppointmentText()}
            </Badge>
          ) : null}
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
            <PhoneOff className="h-4 w-4 mr-1" /> No asistió
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

        <div className="mt-3">
          <div className="text-[11px] font-semibold text-slate-600 mb-1">
            Evidencia del estado (imagen)
          </div>
          <Input
            type="file"
            accept="image/*"
            multiple
            className={inputAccent}
            onChange={async (e) =>
              onUploadImages(e.target.files, "evidence_images")
            }
          />
          {Array.isArray(call?.evidence_images) &&
          call.evidence_images.length ? (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {call.evidence_images.map((img) => (
                <div
                  key={img.id}
                  className="rounded-md border border-slate-200 overflow-hidden"
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name || "Evidencia"}
                    className="h-24 w-full object-cover"
                  />
                  <div className="p-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-600 truncate">
                      {img.name || "imagen"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => removeImage("evidence_images", img.id)}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-slate-500">
              Sin evidencias cargadas.
            </div>
          )}
        </div>
      </Card>

      {/* Sección: Recordatorios */}
      <Card className="p-3 border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Recordatorios</div>
          <div className="text-[11px] text-slate-500">
            Agrega fecha y hora (personalizado)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Fecha y hora</Label>
            <Input
              type="datetime-local"
              className={inputAccent}
              value={newReminderAt}
              onChange={(e) => setNewReminderAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Etiqueta (opcional)</Label>
            <Input
              className={inputAccent}
              value={newReminderLabel}
              onChange={(e) => setNewReminderLabel(e.target.value)}
              placeholder="Ej: Llamar / WhatsApp"
            />
          </div>
          <div className="sm:col-span-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full gap-2"
              onClick={agregarRecordatorioPersonalizado}
            >
              <Clock className="h-4 w-4" /> Agregar recordatorio
            </Button>
          </div>
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
                    {r.kind === ("custom" as any)
                      ? (r as any).label || labelKind.custom
                      : labelKind[r.kind] || r.kind}
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
                    {r.status === "pending"
                      ? "Pendiente"
                      : r.status === "sent"
                      ? "Enviado"
                      : "Omitido"}
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
          <div />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={guardarNotas}
          >
            Guardar notas
          </Button>
        </div>

        <div className="mt-3">
          <div className="text-[11px] font-semibold text-slate-600 mb-1">
            Adjuntar imágenes a las notas
          </div>
          <Input
            type="file"
            accept="image/*"
            multiple
            className={inputAccent}
            onChange={async (e) =>
              onUploadImages(e.target.files, "notes_images")
            }
          />
          {Array.isArray(call?.notes_images) && call.notes_images.length ? (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {call.notes_images.map((img) => (
                <div
                  key={img.id}
                  className="rounded-md border border-slate-200 overflow-hidden"
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name || "Adjunto"}
                    className="h-24 w-full object-cover"
                  />
                  <div className="p-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-600 truncate">
                      {img.name || "imagen"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => removeImage("notes_images", img.id)}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-slate-500">Sin adjuntos.</div>
          )}
        </div>
      </Card>
    </Card>
  );
}
