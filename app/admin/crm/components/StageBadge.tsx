"use client";
import React from "react";
import { cn } from "@/lib/utils";

// Mapeo de estilos inspirado en tonos suaves tipo HubSpot
const STAGE_STYLES: Record<string, { base: string; ring: string }> = {
  "Lead Nuevo": {
    base: "bg-orange-50 text-orange-700 border border-orange-200",
    ring: "focus:ring-orange-300",
  },
  Nuevo: {
    base: "bg-orange-50 text-orange-700 border border-orange-200",
    ring: "focus:ring-orange-300",
  },
  Contactado: {
    base: "bg-teal-50 text-teal-700 border border-teal-200",
    ring: "focus:ring-teal-300",
  },
  "Cita Atendida": {
    base: "bg-sky-50 text-sky-700 border border-sky-200",
    ring: "focus:ring-sky-300",
  },
  "Seguimiento Activo": {
    base: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    ring: "focus:ring-indigo-300",
  },
  "Pendiente de Pago": {
    base: "bg-amber-50 text-amber-800 border border-amber-200",
    ring: "focus:ring-amber-300",
  },
  Calificado: {
    base: "bg-sky-50 text-sky-700 border border-sky-200",
    ring: "focus:ring-sky-300",
  },
  "Cerrado – Ganado": {
    base: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    ring: "focus:ring-emerald-300",
  },
  Ganado: {
    base: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    ring: "focus:ring-emerald-300",
  },
  "Cerrado – Perdido": {
    base: "bg-rose-50 text-rose-700 border border-rose-200",
    ring: "focus:ring-rose-300",
  },
  Perdido: {
    base: "bg-rose-50 text-rose-700 border border-rose-200",
    ring: "focus:ring-rose-300",
  },
};

export function StageBadge({
  stage,
  size = "md",
  className,
}: {
  stage: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const style = STAGE_STYLES[stage] || {
    base: "bg-slate-100 text-slate-700 border border-slate-200",
    ring: "focus:ring-slate-300",
  };
  const sizeClasses =
    size === "sm"
      ? "px-1.5 py-0.5 text-[9px] gap-0.5"
      : "px-2 py-1 text-[11px] gap-1";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium shadow-sm",
        sizeClasses,
        style.base,
        style.ring,
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full bg-current opacity-70",
          size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5",
        )}
      />
      {stage}
    </span>
  );
}
