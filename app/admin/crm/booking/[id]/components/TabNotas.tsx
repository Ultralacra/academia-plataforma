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
import {
  FileText,
  Bell,
  Clock,
  AlertTriangle,
  History,
  User,
} from "lucide-react";

interface TabNotasProps {
  p: any;
  user?: any;
  applyRecordPatch?: (patch: Record<string, any>) => void;
}

const PROFILE_FIELDS = [
  {
    key: "current_context" as const,
    label: "Contexto actual",
    placeholder:
      "Situacion actual del cliente, punto en el que esta, urgencia y contexto personal o profesional.",
  },
  {
    key: "program_interest" as const,
    label: "Que le intereso del programa",
    placeholder:
      "Que parte del programa, propuesta, metodologia o acompanamiento le llamo la atencion.",
  },
  {
    key: "objectives" as const,
    label: "Objetivos",
    placeholder:
      "Resultados esperados, metas, plazos y transformacion que busca conseguir.",
  },
  {
    key: "niche_project" as const,
    label: "Nicho - proyecto",
    placeholder:
      "Nicho, proyecto, negocio actual, estado de su oferta o tipo de cliente con el que trabaja.",
  },
  {
    key: "relevant_crm_data" as const,
    label: "Datos relevantes en el CRM",
    placeholder:
      "Objeciones, senales de compra, restricciones, antecedentes y cualquier detalle util para el seguimiento.",
  },
] as const;

export function TabNotas({ p, user, applyRecordPatch }: TabNotasProps) {
  const customerProfile = React.useMemo(() => {
    const raw =
      p?.customer_profile && typeof p.customer_profile === "object"
        ? p.customer_profile
        : {};

    return {
      current_context: String(raw.current_context ?? ""),
      program_interest: String(raw.program_interest ?? ""),
      objectives: String(raw.objectives ?? ""),
      niche_project: String(raw.niche_project ?? ""),
      relevant_crm_data: String(raw.relevant_crm_data ?? ""),
      updated_at: raw.updated_at ?? null,
      updated_by: raw.updated_by ?? null,
    };
  }, [p?.customer_profile]);

  const customerProfileHistory = React.useMemo(
    () =>
      Array.isArray(p?.customer_profile_history)
        ? p.customer_profile_history
        : [],
    [p?.customer_profile_history],
  );

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
          label: "Decision externa (socio o familia)",
        },
        {
          value: "lost_no_response_exhausted",
          label: "No respondio (proceso agotado)",
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

  const updateCustomerProfile = React.useCallback(
    (field: (typeof PROFILE_FIELDS)[number]["key"], value: string) => {
      applyRecordPatch?.({
        customer_profile: {
          ...(p?.customer_profile && typeof p.customer_profile === "object"
            ? p.customer_profile
            : {}),
          [field]: value,
        },
      });
    },
    [applyRecordPatch, p?.customer_profile],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-800">
                Perfil de cliente
              </CardTitle>
              <CardDescription className="text-slate-500">
                Contexto comercial editable con registro en el snapshot del lead
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
                      Motivo de perdida
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      En esta etapa se tipifica un solo motivo antes de guardar.
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
                      <SelectValue placeholder="Selecciona un motivo..." />
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

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Perfil editable
                </span>
              </div>

              <div className="space-y-4">
                {PROFILE_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {field.label}
                    </Label>
                    <textarea
                      value={customerProfile[field.key]}
                      onChange={(e) =>
                        updateCustomerProfile(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className="min-h-[104px] w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 outline-none transition-all resize-y focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-xs text-amber-800">
                Este perfil se confirma al presionar "Guardar cambios". El
                estado guardado queda dentro del snapshot del lead para mantener
                trazabilidad.
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ultima actualizacion confirmada
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 whitespace-pre-wrap text-sm text-slate-700">
                {customerProfile.updated_at ? (
                  <div className="space-y-1">
                    <div>
                      {String(customerProfile.updated_at)
                        .replace("T", " ")
                        .slice(0, 19)}
                    </div>
                    <div className="text-slate-500">
                      {String(
                        customerProfile.updated_by?.name ||
                          customerProfile.updated_by?.email ||
                          user?.name ||
                          user?.email ||
                          "Sin usuario",
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">
                    Todavia no hay un guardado confirmado del perfil.
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-800">
                Historial y recordatorios
              </CardTitle>
              <CardDescription className="text-slate-500">
                Registro de cambios del perfil y resumen rapido del seguimiento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Historial del perfil
                </span>
              </div>
              {customerProfileHistory.length ? (
                <ul className="space-y-3">
                  {customerProfileHistory
                    .slice()
                    .reverse()
                    .slice(0, 6)
                    .map((entry: any, idx: number) => {
                      const profile =
                        entry?.profile && typeof entry.profile === "object"
                          ? entry.profile
                          : {};
                      const summary = [
                        profile.current_context,
                        profile.program_interest,
                        profile.objectives,
                        profile.niche_project,
                        profile.relevant_crm_data,
                      ]
                        .map((value) => String(value ?? "").trim())
                        .filter(Boolean)
                        .join("\n\n");

                      return (
                        <li
                          key={`${entry?.at || idx}-${idx}`}
                          className="rounded-xl border border-slate-100 bg-white p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-violet-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                                <span>
                                  {entry?.at
                                    ? String(entry.at)
                                        .replace("T", " ")
                                        .slice(0, 19)
                                    : "—"}
                                </span>
                                {entry?.by?.name || entry?.by?.email ? (
                                  <>
                                    <span>·</span>
                                    <span className="font-medium text-slate-700">
                                      {String(entry.by.name || entry.by.email)}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <div className="text-sm whitespace-pre-wrap text-slate-700">
                                {summary || "Perfil vaciado"}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  {customerProfileHistory.length > 6 ? (
                    <li className="text-xs text-slate-500 text-center pt-1">
                      +{customerProfileHistory.length - 6} registros mas
                    </li>
                  ) : null}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">
                  Aun no hay historial guardado del perfil.
                </div>
              )}
            </div>

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
                      +{reminders.length - 6} mas...
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
                Para editar seguimiento y recordatorios, usa la pestana
                "Seguimiento".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
