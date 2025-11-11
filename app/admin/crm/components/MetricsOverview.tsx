"use client";
import React from "react";
import type { CrmGlobalMetrics } from "@/lib/crm-types";
import { Card } from "@/components/ui/card";

export function MetricsOverview({ gm }: { gm: CrmGlobalMetrics }) {
  const blocks = [
    { label: "Total", value: gm.totalProspects },
    { label: "Nuevo", value: gm.byStage.nuevo },
    { label: "Contactado", value: gm.byStage.contactado },
    {
      label: "Calificado",
      value: gm.byStage.calificado + gm.byStage.propuesta,
    },
    { label: "Ganado", value: gm.byStage.ganado },
    { label: "Perdido", value: gm.byStage.perdido },
    { label: "Conv %", value: `${(gm.conversionRate * 100).toFixed(1)}%` },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
      {blocks.map((b) => (
        <Card key={b.label} className="p-4">
          <div className="text-xs text-slate-500">{b.label}</div>
          <div className="text-xl font-semibold">{b.value as any}</div>
        </Card>
      ))}
    </div>
  );
}
