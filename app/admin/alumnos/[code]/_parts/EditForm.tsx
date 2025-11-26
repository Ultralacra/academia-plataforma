"use client";

import type React from "react";

import { Calendar, GitBranch, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import type { Stage, StatusSint } from "./detail-utils";

function PropertyRow({
  icon,
  label,
  children,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="group grid grid-cols-1 gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50 md:grid-cols-12 md:items-start">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:col-span-4">
        <span className="text-muted-foreground/60">{icon}</span>
        {label}
      </div>
      <div className="md:col-span-8">
        {children}
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export default function EditForm({
  stage,
  setStage,
  statusSint,
  setStatusSint,
  pIngreso,
  setPIngreso,
  salida,
  setSalida,
  lastActivity,
  setLastActivity,
  lastTaskAt,
  setLastTaskAt,
  pF1,
  setPF1,
  pF2,
  setPF2,
  pF3,
  setPF3,
  pF4,
  setPF4,
  pF5,
  setPF5,
}: {
  stage: Stage;
  setStage: (v: Stage) => void;
  statusSint: StatusSint;
  setStatusSint: (v: StatusSint) => void;
  pIngreso: string;
  setPIngreso: (v: string) => void;
  salida: string;
  setSalida: (v: string) => void;
  lastActivity: string;
  setLastActivity: (v: string) => void;
  lastTaskAt: string;
  setLastTaskAt: (v: string) => void;
  pF1: string;
  setPF1: (v: string) => void;
  pF2: string;
  setPF2: (v: string) => void;
  pF3: string;
  setPF3: (v: string) => void;
  pF4: string;
  setPF4: (v: string) => void;
  pF5: string;
  setPF5: (v: string) => void;
  // no external actions
}) {
  const stages: Stage[] = ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"];
  const statuses: StatusSint[] = [
    "EN_CURSO",
    "COMPLETADO",
    "ABANDONO",
    "PAUSA",
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm text-muted-foreground">
          Propiedades gestionadas automáticamente. La edición está deshabilitada
          temporalmente.
        </div>
      </div>
    </section>
  );
}
