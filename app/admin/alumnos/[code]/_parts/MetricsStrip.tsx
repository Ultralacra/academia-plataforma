"use client";

import { Calendar, Clock, TrendingUp, Target } from "lucide-react";
import { fmtES } from "./detail-utils";

export default function MetricsStrip({
  statusLabel,
  permanencia,
  lastTaskAt,
  faseActual,
  ingreso,
  salida,
}: {
  statusLabel: string;
  permanencia: number;
  lastTaskAt?: string | null;
  faseActual: string;
  ingreso?: string | null;
  salida?: string | null;
}) {
  const items = [
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Estado",
      value: statusLabel,
      sub: "Estado sintético",
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Permanencia",
      value: `${permanencia} días`,
      sub: `${fmtES(ingreso)} → ${fmtES(salida)}`,
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Última tarea",
      value: fmtES(lastTaskAt),
      sub: lastTaskAt ? "Fecha de entrega" : "Sin entregas",
    },
    {
      icon: <Target className="h-4 w-4" />,
      label: "Fase actual",
      value: faseActual,
      sub: "Según pasos locales",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="group relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="text-muted-foreground/60">{it.icon}</span>
                {it.label}
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                {it.value || "—"}
              </div>
              {it.sub && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {it.sub}
                </div>
              )}
            </div>
          </div>
          {/* Subtle hover effect */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/0 to-primary/0 opacity-0 transition-opacity group-hover:from-primary/5 group-hover:to-primary/0 group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
}
