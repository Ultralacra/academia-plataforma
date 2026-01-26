"use client";
import React from "react";
import type { CrmGlobalMetrics } from "@/lib/crm-types";
import { Card } from "@/components/ui/card";

export function MetricsOverview({ gm }: { gm: CrmGlobalMetrics }) {
  const blocks = [
    {
      label: "Total",
      value: gm.totalProspects,
      className: "from-indigo-50 via-white to-indigo-50/60",
      valueClass: "text-indigo-700",
    },
    {
      label: "Nuevo",
      value: gm.byStage.nuevo,
      className: "from-orange-50 via-white to-amber-50/60",
      valueClass: "text-orange-700",
    },
    {
      label: "Contactado",
      value: gm.byStage.contactado,
      className: "from-teal-50 via-white to-cyan-50/60",
      valueClass: "text-teal-700",
    },
    {
      label: "Calificado",
      value: gm.byStage.calificado + gm.byStage.propuesta,
      className: "from-sky-50 via-white to-blue-50/60",
      valueClass: "text-sky-700",
    },
    {
      label: "Ganado",
      value: gm.byStage.ganado,
      className: "from-emerald-50 via-white to-green-50/60",
      valueClass: "text-emerald-700",
    },
    {
      label: "Perdido",
      value: gm.byStage.perdido,
      className: "from-rose-50 via-white to-pink-50/60",
      valueClass: "text-rose-700",
    },
    {
      label: "Conv %",
      value: `${(gm.conversionRate * 100).toFixed(1)}%`,
      className: "from-violet-50 via-white to-fuchsia-50/60",
      valueClass: "text-violet-700",
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
      {blocks.map((b) => (
        <Card
          key={b.label}
          className={`p-4 border-slate-200/70 bg-gradient-to-br ${b.className}`}
        >
          <div className="text-xs font-semibold text-slate-500">{b.label}</div>
          <div className={`text-xl font-semibold ${b.valueClass}`}>
            {b.value as any}
          </div>
        </Card>
      ))}
    </div>
  );
}
