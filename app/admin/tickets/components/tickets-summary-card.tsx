"use client";

import React, { useMemo } from "react";
import type { Ticket } from "@/lib/data-service";
import { type TicketsMetrics } from "./metrics";
import {
  Users,
  FileText,
  Tag,
  Clock,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

function fmtDuration(ms: number) {
  if (!isFinite(ms) || ms <= 0) return "—";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}

export default function TicketsSummaryCard({
  tickets,
  metrics,
}: {
  tickets: Ticket[];
  metrics: TicketsMetrics;
}) {
  const byAlumno = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets ?? []) {
      const k = String(t.alumno_nombre ?? "—");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [tickets]);

  const byTipo = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets ?? []) {
      const k = String(t.tipo ?? "—").toUpperCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [tickets]);

  const { topInformantes, totalInformantes } = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets ?? []) {
      const name =
        String(
          (t as any).informante_nombre ?? (t as any).informante ?? "—",
        ).trim() || "—";
      m.set(name, (m.get(name) ?? 0) + 1);
    }
    const entries = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    return { topInformantes: entries.slice(0, 8), totalInformantes: m.size };
  }, [tickets]);

  // avg time to resolution: use ultimo_estado.fecha when estatus == RESUELTO
  const avgResolution = useMemo(() => {
    let acc = 0;
    let n = 0;
    for (const t of tickets ?? []) {
      const est = t.ultimo_estado?.estatus ?? t.ultimo_estado?.estatus;
      const fechaRes = t.ultimo_estado?.fecha ?? null;
      if (!fechaRes) continue;
      const cre = new Date(t.creacion);
      const res = new Date(fechaRes);
      if (isNaN(cre.getTime()) || isNaN(res.getTime())) continue;
      if (
        String(est ?? "")
          .toUpperCase()
          .includes("RESUELT")
      ) {
        acc += Math.max(0, res.getTime() - cre.getTime());
        n++;
      }
    }
    return n ? Math.round(acc / n) : null;
  }, [tickets]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="md:col-span-2">
        <Card className="border-sky-200 shadow-none">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sky-50 p-2 border border-sky-200">
                <FileText className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <div className="text-sm font-semibold">Resumen rápido</div>
                <div className="mt-1 text-xs text-gray-600">
                  Totales y actividad reciente
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{metrics.total}</div>
              <div className="text-xs text-gray-500">tickets</div>
              <div className="text-xs text-gray-500 mt-1">
                Informantes: {totalInformantes}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-200 p-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="rounded-md bg-white p-1.5 border">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="font-medium">Resueltos</span>
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">
                  {metrics.resueltos}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="rounded-md bg-white p-1.5 border">
                    <Clock className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="font-medium">Hoy</span>
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">
                  {metrics.today}
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 p-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="rounded-md bg-white p-1.5 border">
                    <CalendarDays className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="font-medium">Últimos 7 días</span>
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">
                  {metrics.last7}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {metrics.busiestDay
                ? `Día pico: ${metrics.busiestDay.date} (${metrics.busiestDay.count})`
                : "Sin día pico"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1">
        <Card className="border-sky-200 shadow-none">
          <CardHeader className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-2 border border-sky-200">
              <Users className="h-4 w-4 text-sky-600" />
            </div>
            <div className="text-sm font-semibold">Top alumnos</div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mt-2 text-sm space-y-1">
              {byAlumno.length === 0 && (
                <div className="text-xs text-gray-500">—</div>
              )}
              {byAlumno.map(([name, cnt]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="truncate text-sm">{name}</div>
                  <div className="text-xs text-gray-600">{cnt}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1">
        <Card className="border-amber-200 shadow-none">
          <CardHeader className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
              <Tag className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-sm font-semibold">Top tipos</div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mt-2 text-sm space-y-1">
              {byTipo.length === 0 && (
                <div className="text-xs text-gray-500">—</div>
              )}
              {byTipo.map(([tipo, cnt]) => (
                <div key={tipo} className="flex items-center justify-between">
                  <div className="truncate text-sm">{tipo}</div>
                  <div className="text-xs text-gray-600">{cnt}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 border-t pt-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> Informantes
              </div>
              <div className="mt-2 text-sm space-y-1">
                {topInformantes.length === 0 && (
                  <div className="text-xs text-gray-500">—</div>
                )}
                {topInformantes.map(([inf, cnt]) => (
                  <div key={inf} className="flex items-center justify-between">
                    <div className="truncate text-sm">{inf}</div>
                    <div className="text-xs text-gray-600">{cnt}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {metrics.avgInformanteResponseMs !== null &&
        metrics.informanteRespondedCount > 0 && (
          <div className="md:col-span-4">
            <Card className="border-sky-200 shadow-none">
              <CardHeader className="flex items-center gap-3">
                <div className="rounded-lg bg-sky-50 p-2 border border-sky-200">
                  <Clock className="h-4 w-4 text-sky-600" />
                </div>
                <div className="text-sm font-semibold">
                  Tiempo medio - informantes
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mt-2 text-sm text-gray-700">
                  {fmtDuration(metrics.avgInformanteResponseMs ?? 0)}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {metrics.informanteRespondedCount} tickets con respuesta (
                  {metrics.informanteRespondedPct}% del total)
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}
