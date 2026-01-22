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

interface TabNotasProps {
  p: any;
  user?: any;
  applyRecordPatch?: (patch: Record<string, any>) => void;
}

export function TabNotas({ p, user, applyRecordPatch }: TabNotasProps) {
  const [newActivityNote, setNewActivityNote] = React.useState("");

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

  const activityLog = Array.isArray((p as any).activity_log)
    ? ((p as any).activity_log as any[])
    : [];

  const reagendaDate =
    p.call_reschedule_date || p.call?.reschedule?.date || null;
  const reagendaTime =
    p.call_reschedule_time || p.call?.reschedule?.time || null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Notas</CardTitle>
          <CardDescription>Notas de venta y mensajes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            {isLost ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-amber-800">
                      Motivo (obligatorio)
                    </div>
                    <div className="text-[11px] text-amber-700">
                      En esta etapa se tipifica un solo motivo.
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="sr-only">Motivo</Label>
                  <Select
                    value={selectedMotive || ""}
                    onValueChange={(v) => {
                      applyRecordPatch?.({ lead_disposition: v });
                    }}
                  >
                    <SelectTrigger className="h-10 bg-white">
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
                  <div className="mt-2 text-xs text-amber-700">
                    Falta seleccionar el motivo antes de guardar.
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <div className="text-xs font-medium text-slate-600">
                Notas de venta
              </div>
              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap">
                {String(p.sale_notes ?? p.saleNotes ?? "").trim() || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">
                Mensajes / notas de llamada
              </div>
              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap">
                {String(p.text_messages ?? p.textMessages ?? "").trim() || "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recordatorios y reagenda</CardTitle>
          <CardDescription>Resumen rápido del seguimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Reagendado</span>
              <span className="font-medium">
                {reagendaDate || reagendaTime
                  ? `${String(reagendaDate || "").slice(0, 10)}${
                      reagendaTime ? ` ${String(reagendaTime)}` : ""
                    }`.trim()
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Recordatorios</span>
              <span className="font-medium">{reminders.length}</span>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              {reminders.length ? (
                <ul className="space-y-2">
                  {reminders.slice(0, 6).map((r: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      {(() => {
                        const fr = formatReminder(r);
                        return (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900">
                              {fr.title}
                            </div>
                            {fr.meta ? (
                              <div className="text-xs text-slate-600">
                                {fr.meta}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </li>
                  ))}
                  {reminders.length > 6 ? (
                    <li className="text-xs text-slate-500">
                      +{reminders.length - 6} más…
                    </li>
                  ) : null}
                </ul>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Para editar seguimiento/recordatorios, usa la pestaña
              "Seguimiento".
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle>Actividad</CardTitle>
          <CardDescription>
            Historial de notas registradas en el lead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600">
                Nueva nota
              </div>
              <textarea
                className="min-h-[88px] w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                placeholder="Escribe una nota para el historial (queda con fecha y usuario al guardar)…"
                value={newActivityNote}
                onChange={(e) => setNewActivityNote(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="h-9 px-3 rounded border bg-white hover:bg-slate-50 text-sm"
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
                    applyRecordPatch?.({ activity_log: next });
                    setNewActivityNote("");
                  }}
                >
                  Agregar al historial
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                Se guarda al presionar "Guardar cambios".
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              {activityLog.length ? (
                <ul className="space-y-2">
                  {activityLog
                    .slice()
                    .reverse()
                    .slice(0, 12)
                    .map((a: any, idx: number) => (
                      <li key={idx} className="text-sm">
                        <div className="text-[11px] text-slate-600">
                          {a?.at
                            ? String(a.at).replace("T", " ").slice(0, 19)
                            : "—"}
                          {a?.by?.name || a?.by?.email
                            ? ` · ${String(a.by.name || a.by.email)}`
                            : ""}
                        </div>
                        <div className="whitespace-pre-wrap">
                          {String(a?.message ?? "").trim() || "—"}
                        </div>
                      </li>
                    ))}
                  {activityLog.length > 12 ? (
                    <li className="text-xs text-slate-500">
                      +{activityLog.length - 12} más…
                    </li>
                  ) : null}
                </ul>
              ) : (
                <span className="text-slate-600">
                  Sin actividad registrada.
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
