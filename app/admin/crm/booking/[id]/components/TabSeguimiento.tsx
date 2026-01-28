"use client";
import React from "react";
import { CallFlowManager } from "@/app/admin/crm/components/CallFlowManager";
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
  return (
    <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <PhoneCall className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-slate-800">Seguimiento</CardTitle>
            <CardDescription className="text-slate-500">
              Gestión de llamadas y recordatorios
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/50 p-4">
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
                call_negotiation_active: nextCall?.negotiation?.active ? 1 : 0,
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
  );
}
