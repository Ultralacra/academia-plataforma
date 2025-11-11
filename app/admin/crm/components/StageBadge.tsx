"use client";
import React from "react";
import { cn } from "@/lib/utils";

// Mapeo de estilos inspirado en tonos suaves tipo HubSpot
const STAGE_STYLES: Record<string, { base: string; ring: string }> = {
  Nuevo: {
    base: "bg-orange-50 text-orange-700 border border-orange-200",
    ring: "focus:ring-orange-300",
  },
  Contactado: {
    base: "bg-teal-50 text-teal-700 border border-teal-200",
    ring: "focus:ring-teal-300",
  },
  Calificado: {
    base: "bg-sky-50 text-sky-700 border border-sky-200",
    ring: "focus:ring-sky-300",
  },
  Ganado: {
    base: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    ring: "focus:ring-emerald-300",
  },
  Perdido: {
    base: "bg-rose-50 text-rose-700 border border-rose-200",
    ring: "focus:ring-rose-300",
  },
};

export function StageBadge({
  stage,
  className,
}: {
  stage: string;
  className?: string;
}) {
  const style = STAGE_STYLES[stage] || {
    base: "bg-slate-100 text-slate-700 border border-slate-200",
    ring: "focus:ring-slate-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium shadow-sm",
        style.base,
        style.ring,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {stage}
    </span>
  );
}
