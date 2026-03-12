"use client";
import React from "react";
import { CallFlowManager } from "@/app/admin/crm/components/CallFlowManager";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhoneCall } from "lucide-react";

interface TabSeguimientoProps {
  id: string;
  p: any;
  applyRecordPatch: (patch: Record<string, any>) => void;
}

export function TabSeguimiento({
  id,
  p,
  applyRecordPatch,
}: TabSeguimientoProps) {
  const summary = [
    {
      label: "Pipeline CRM",
      value: String((p as any)?.pipeline_status || "Sin definir"),
    },
    {
      label: "Protocolo",
      value: String((p as any)?.protocol_name || "Sin definir"),
    },
    {
      label: "Última interacción",
      value: (p as any)?.last_interaction_at
        ? new Date((p as any).last_interaction_at).toLocaleString("es-ES")
        : "Sin registro",
    },
    {
      label: "Próximo contacto",
      value: (p as any)?.next_contact_at
        ? new Date((p as any).next_contact_at).toLocaleString("es-ES")
        : "Sin agenda",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur"
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

      <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
        <CardHeader className="pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <PhoneCall className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-800">Seguimiento</CardTitle>
              <CardDescription className="text-slate-500">
                Gestión de llamadas, recordatorios y protocolo activo
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-3">
            {String((p as any)?.conversation_status || "").trim() ? (
              <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-50">
                Conversación: {String((p as any)?.conversation_status)}
              </Badge>
            ) : null}
            {String((p as any)?.protocol_step || "").trim() ? (
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">
                Paso: {String((p as any)?.protocol_step)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/50 p-5">
            <CallFlowManager
              leadCodigo={id}
              payload={p}
              persistMode="local"
              onSaved={(nextCall) => {
                if (!nextCall) return;

                const toMidnightIso = (date?: string | null) => {
                  if (!date) return null;
                  const s = String(date);
                  if (s.includes("T")) return s;
                  try {
                    return new Date(`${s}T00:00:00.000Z`).toISOString();
                  } catch {
                    return s;
                  }
                };

                applyRecordPatch({
                  call: nextCall,
                  call_outcome: nextCall?.outcome ?? null,
                  call_result_at: nextCall?.result_at ?? null,
                  call_reschedule_date: toMidnightIso(
                    nextCall?.reschedule?.date ?? null,
                  ),
                  call_reschedule_time: nextCall?.reschedule?.time ?? null,
                  call_negotiation_active: nextCall?.negotiation?.active
                    ? 1
                    : 0,
                  call_negotiation_until: nextCall?.negotiation?.until ?? null,
                  reminders: Array.isArray(nextCall?.reminders)
                    ? nextCall.reminders
                    : [],
                  ...(nextCall?.notes !== undefined
                    ? { text_messages: nextCall?.notes ?? null }
                    : {}),
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
