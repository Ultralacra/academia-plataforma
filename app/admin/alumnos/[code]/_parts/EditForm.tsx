"use client";

import type React from "react";

import { Calendar, GitBranch, Tag, RotateCcw, Save } from "lucide-react";
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
  onReset,
  onSave,
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
  onReset: () => void;
  onSave: () => void;
}) {
  const stages: Stage[] = ["ONBOARDING", "F1", "F2", "F3", "F4", "F5"];
  const statuses: StatusSint[] = [
    "EN_CURSO",
    "COMPLETADO",
    "ABANDONO",
    "PAUSA",
  ];

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Propiedades del alumno</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1 h-3 w-3" /> Restaurar
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="mr-1 h-3 w-3" /> Guardar
          </Button>
        </div>
      </div>

      <div className="divide-y">
        {/* Estado y Etapa */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Estado
              </span>
            </Label>
            <Select
              value={statusSint}
              onValueChange={(v) => setStatusSint(v as StatusSint)}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecciona estado" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" /> Etapa
              </span>
            </Label>
            <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecciona etapa" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fechas principales */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Ingreso
              </span>
            </Label>
            <Input
              type="date"
              value={pIngreso}
              onChange={(e) => setPIngreso(e.target.value)}
              className="w-full max-w-xs"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Salida
              </span>
            </Label>
            <Input
              type="date"
              value={salida}
              onChange={(e) => setSalida(e.target.value)}
              className="w-full max-w-xs"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Última actividad
              </span>
            </Label>
            <Input
              type="date"
              value={lastActivity?.slice(0, 10) ?? ""}
              onChange={(e) => setLastActivity(e.target.value)}
              className="w-full max-w-xs"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Campo informativo de la API
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Última tarea
              </span>
            </Label>
            <Input
              type="date"
              value={lastTaskAt}
              onChange={(e) => setLastTaskAt(e.target.value)}
              className="w-full max-w-xs"
            />
          </div>
        </div>

        {/* Transiciones de fase */}
        <div className="px-4 py-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Transiciones de fase
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "F1", v: pF1, on: setPF1 },
              { label: "F2", v: pF2, on: setPF2 },
              { label: "F3", v: pF3, on: setPF3 },
              { label: "F4", v: pF4, on: setPF4 },
              { label: "F5", v: pF5, on: setPF5 },
            ].map((n) => (
              <div key={n.label} className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {n.label}
                </Label>
                <Input
                  type="date"
                  value={n.v}
                  onChange={(e) => n.on(e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
