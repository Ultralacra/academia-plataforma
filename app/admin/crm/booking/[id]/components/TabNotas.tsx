"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Bell, Clock, AlertTriangle } from "lucide-react";

interface TabNotasProps {
  p: any;
  user?: any;
  applyRecordPatch?: (patch: Record<string, any>) => void;
}

export function TabNotas({ p, user, applyRecordPatch }: TabNotasProps) {
  const motives = React.useMemo(
    () =>
      [
        {
          value: "lost_price_too_high",
          label: "Precio muy alto para presupuesto",
        },
        {
          value: "lost_no_urgency",
          label: "Prioridad, no tiene urgencia en hacerlo",
        },
        { value: "lost_trust", label: "Confianza" },
        {
          value: "lost_external_decision",
          label: "Decisión externa (socio o familia)",
        },
        {
          value: "lost_no_response_exhausted",
          label: "No respondió (proceso agotado)",
        },
      ] as const,
    [],
  );

  const isLost = React.useMemo(() => {
    const status = String(p?.status ?? p?.lead_status ?? "").toLowerCase();
    const stage = String(p?.etapa ?? p?.stage ?? p?.stage_label ?? "")
      .toLowerCase()
      .trim();
    return status === "lost" || stage.includes("perd");
  }, [p]);

  const selectedMotive = String(
    p?.lead_disposition ?? p?.leadDisposition ?? "",
  ).trim();

  const formatReminder = (r: any) => {
    if (typeof r === "string") return { title: r, meta: "" };
    if (!r || typeof r !== "object")
      return { title: String(r ?? ""), meta: "" };

    const title =
      String(
        r.title ?? r.text ?? r.message ?? r.note ?? r.name ?? "Recordatorio",
      ).trim() || "Recordatorio";

    const atRaw = r.at ?? r.date ?? r.datetime ?? r.when ?? r.due_at;
    const at = atRaw ? String(atRaw) : "";
    const metaParts = [
      at ? at.replace("T", " ").slice(0, 16) : "",
      r.done === true || r.completed === true ? "Hecho" : "",
    ].filter(Boolean);

    return { title, meta: metaParts.join(" · ") };
  };

  const reminders = Array.isArray(p.reminders)
    ? p.reminders
    : Array.isArray(p.call?.reminders)
      ? p.call.reminders
      : [];

  const reagendaDate =
    p.call_reschedule_date || p.call?.reschedule?.date || null;
  const reagendaTime =
    p.call_reschedule_time || p.call?.reschedule?.time || null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Notas Card */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-800">Notas</CardTitle>
              <CardDescription className="text-slate-500">
                Notas de venta y mensajes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {isLost ? (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-amber-800">
                      Motivo (obligatorio)
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      En esta etapa se tipifica un solo motivo.
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="sr-only">Motivo</Label>
                  <Select
                    value={selectedMotive || ""}
                    onValueChange={(v) => {
                      applyRecordPatch?.({ lead_disposition: v });
                    }}
                  >
                    <SelectTrigger className="h-11 bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400/20">
                      <SelectValue placeholder="Selecciona un motivo…" />
                    </SelectTrigger>
                    <SelectContent>
                      {motives.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!selectedMotive ? (
                  <div className="mt-2 text-xs text-amber-700 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Falta seleccionar el motivo antes de guardar.
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notas de venta
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 whitespace-pre-wrap text-sm text-slate-700">
                {String(p.sale_notes ?? p.saleNotes ?? "").trim() || (
                  <span className="text-slate-400">Sin notas</span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Mensajes / notas de llamada
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 whitespace-pre-wrap text-sm text-slate-700">
                {String(p.text_messages ?? p.textMessages ?? "").trim() || (
                  <span className="text-slate-400">Sin mensajes</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recordatorios Card */}
      <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-800">
                Recordatorios y reagenda
              </CardTitle>
              <CardDescription className="text-slate-500">
                Resumen rápido del seguimiento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Reagendado</span>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {reagendaDate || reagendaTime
                    ? `${String(reagendaDate || "").slice(0, 10)}${
                        reagendaTime ? ` ${String(reagendaTime)}` : ""
                      }`.trim()
                    : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4">
                <div className="flex items-center gap-2 text-violet-600 mb-1">
                  <Bell className="h-4 w-4" />
                  <span className="text-xs font-medium">Recordatorios</span>
                </div>
                <div className="text-2xl font-bold text-violet-700">
                  {reminders.length}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4">
              {reminders.length ? (
                <ul className="space-y-3">
                  {reminders.slice(0, 6).map((r: any, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bell className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      {(() => {
                        const fr = formatReminder(r);
                        return (
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-slate-800">
                              {fr.title}
                            </div>
                            {fr.meta ? (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {fr.meta}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </li>
                  ))}
                  {reminders.length > 6 ? (
                    <li className="text-xs text-slate-500 pl-10">
                      +{reminders.length - 6} más…
                    </li>
                  ) : null}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                    <Bell className="h-6 w-6 text-slate-400" />
                  </div>
                  <span className="text-sm text-slate-500">
                    Sin recordatorios
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
              <p className="text-xs text-violet-700">
                Para editar seguimiento/recordatorios, usa la pestaña
                "Seguimiento".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
