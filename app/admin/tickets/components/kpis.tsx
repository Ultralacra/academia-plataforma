"use client";

import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CalendarDays,
  Flame,
  PauseCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { TicketsMetrics } from "./metrics";

/* Chip simple */
function Kpi({
  icon,
  label,
  value,
  hint,
  color = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  color?: "default" | "blue" | "green" | "amber" | "red" | "violet";
}) {
  const map: Record<string, string> = {
    default: "border-gray-200",
    blue: "border-sky-200",
    green: "border-emerald-200",
    amber: "border-amber-200",
    red: "border-rose-200",
    violet: "border-violet-200",
  };
  return (
    <div className={`rounded-xl border ${map[color]} p-3`}>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <div className="rounded-md bg-white p-1.5 border">{icon}</div>
        <span className="font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export default function KPIs({
  metrics,
  loading,
}: {
  metrics: TicketsMetrics;
  loading?: boolean;
}) {
  const range =
    metrics.from && metrics.to
      ? `${metrics.from} → ${metrics.to} (${metrics.days || 0} días)`
      : "—";

  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Métricas de tickets</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Rango considerado: {range}
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 pt-3 md:grid-cols-7">
        <Kpi
          icon={<FileText className="h-4 w-4 text-sky-600" />}
          label="Total"
          value={loading ? "…" : metrics.total}
          hint="Tickets en la vista actual"
          color="blue"
        />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label="Resueltos"
          value={loading ? "…" : metrics.resueltos}
          hint={`${
            metrics.total
              ? Math.round((metrics.resueltos / metrics.total) * 100)
              : 0
          }% del total`}
          color="green"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label="Pendientes"
          value={loading ? "…" : metrics.pendientes}
          hint={`${
            metrics.total
              ? Math.round((metrics.pendientes / metrics.total) * 100)
              : 0
          }% del total`}
          color="amber"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4 text-sky-600" />}
          label="Pendiente de envío"
          value={loading ? "…" : metrics.pendientesDeEnvio}
          hint={`${
            metrics.total
              ? Math.round((metrics.pendientesDeEnvio / metrics.total) * 100)
              : 0
          }% del total`}
          color="blue"
        />
        <Kpi
          icon={<Clock className="h-4 w-4 text-violet-600" />}
          label="En progreso"
          value={loading ? "…" : metrics.enProgreso}
          hint={`${
            metrics.total
              ? Math.round((metrics.enProgreso / metrics.total) * 100)
              : 0
          }% del total`}
          color="violet"
        />
        <Kpi
          icon={<PauseCircle className="h-4 w-4 text-gray-600" />}
          label="Pausados"
          value={loading ? "…" : metrics.pausados}
          hint={`${
            metrics.total
              ? Math.round((metrics.pausados / metrics.total) * 100)
              : 0
          }% del total`}
        />
        <Kpi
          icon={<CalendarDays className="h-4 w-4 text-sky-600" />}
          label="Promedio por día"
          value={loading ? "…" : metrics.avgPerDay || 0}
          hint={metrics.days ? `En ${metrics.days} días` : "Sin rango"}
          color="blue"
        />
      </CardContent>

      {/* Extra: hoy / 7 / 30 + pico + días en blanco */}
      <CardContent className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-5">
        <Kpi
          icon={<CalendarDays className="h-4 w-4 text-gray-600" />}
          label="Hoy"
          value={loading ? "…" : metrics.today}
          hint="Tickets creados hoy"
        />
        <Kpi
          icon={<CalendarDays className="h-4 w-4 text-gray-600" />}
          label="Últ. 7 días"
          value={loading ? "…" : metrics.last7}
          hint="Anclado al final del rango"
        />
        <Kpi
          icon={<CalendarDays className="h-4 w-4 text-gray-600" />}
          label="Últ. 30 días"
          value={loading ? "…" : metrics.last30}
          hint="Anclado al final del rango"
        />
        <Kpi
          icon={<Flame className="h-4 w-4 text-rose-600" />}
          label="Día más activo"
          value={
            loading
              ? "…"
              : metrics.busiestDay
              ? `${metrics.busiestDay.count}`
              : "—"
          }
          hint={metrics.busiestDay ? metrics.busiestDay.date : "Sin datos"}
          color="red"
        />
        <Kpi
          icon={<CalendarDays className="h-4 w-4 text-gray-600" />}
          label="Días sin actividad"
          value={loading ? "…" : metrics.quietDays}
          hint="Dentro del rango"
        />
      </CardContent>
    </Card>
  );
}
