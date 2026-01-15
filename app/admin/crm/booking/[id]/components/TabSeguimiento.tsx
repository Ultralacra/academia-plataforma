"use client";
import React from "react";
import { CallFlowManager } from "@/app/admin/crm/components/CallFlowManager";

interface TabSeguimientoProps {
  id: string;
  p: any;
  applyRecordPatch: (patch: Record<string, any>) => void;
}

export function TabSeguimiento({ id, p, applyRecordPatch }: TabSeguimientoProps) {
  return (
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
            nextCall?.reschedule?.date ?? null
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
  );
}
