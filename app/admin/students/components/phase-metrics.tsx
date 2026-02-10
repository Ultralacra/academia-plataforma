"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchMetricsRetention, getDefaultRange } from "./api";

/* ───────── estilos/colores (soft) ───────── */
const PALETTE = [
  { bg: "bg-violet-50", ring: "ring-violet-200", dot: "bg-violet-500" },
  { bg: "bg-blue-50", ring: "ring-blue-200", dot: "bg-blue-500" },
  { bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", ring: "ring-amber-200", dot: "bg-amber-500" },
  { bg: "bg-rose-50", ring: "ring-rose-200", dot: "bg-rose-500" },
  { bg: "bg-cyan-50", ring: "ring-cyan-200", dot: "bg-cyan-500" },
  { bg: "bg-indigo-50", ring: "ring-indigo-200", dot: "bg-indigo-500" },
  { bg: "bg-pink-50", ring: "ring-pink-200", dot: "bg-pink-500" },
];

// Labels legibles para las etapas
const STAGE_LABELS: Record<string, string> = {
  F1: "Fase 1",
  F2: "Fase 2",
  F3: "Fase 3",
  F4: "Fase 4",
  F5: "Fase 5",
  F2_PAGINAS: "F2 Páginas",
  F2_VSL: "F2 VSL",
  F2_EMBUDO: "F2 Embudo",
  F2_GRABACION: "F2 Grabación",
};

function MetricBar({
  value,
  cap = 30,
  colorDot,
}: {
  value: number | null;
  cap?: number;
  colorDot: string;
}) {
  const pct =
    value == null
      ? 0
      : Math.max(6, Math.min(100, Math.round((value / cap) * 100)));
  return (
    <div className="mt-3 h-2 w-full rounded-full bg-muted/70">
      <div
        className={cn("h-full rounded-full transition-all", colorDot)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PhaseCard({
  title,
  avgDays,
  samples,
  palette,
}: {
  title: string;
  avgDays: number | null;
  samples: number;
  palette: { bg: string; ring: string; dot: string };
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-shadow hover:shadow-sm",
        palette.bg,
        "ring-1",
        palette.ring,
      )}
      title={
        avgDays != null
          ? `${title}: ${avgDays} días — basado en ${samples} cliente${samples === 1 ? "" : "s"}`
          : `${title}: sin datos`
      }
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", palette.dot)} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge variant="outline" className="h-5 text-[11px]">
          n={samples}
        </Badge>
      </div>

      <div className="mt-2">
        <div className="text-2xl font-semibold leading-none">
          {avgDays != null ? `${avgDays} días` : "—"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Basado en {samples} cliente{samples === 1 ? "" : "s"}
        </div>
      </div>

      <MetricBar value={avgDays} colorDot={palette.dot} />
    </div>
  );
}

export default function PhaseMetrics({
  fechaDesde,
  fechaHasta,
  coach,
  maxDaysCap = 30,
}: {
  fechaDesde?: string;
  fechaHasta?: string;
  coach?: string;
  maxDaysCap?: number;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [durations, setDurations] = useState<
    Array<{ etapa_id: string; count: number; avg_days: number }>
  >([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const range = getDefaultRange();
        const res = await fetchMetricsRetention({
          fechaDesde: fechaDesde ?? range.fechaDesde,
          fechaHasta: fechaHasta ?? range.fechaHasta,
          coach,
        });
        if (!ignore) {
          setDurations(res?.data?.clientes_etapas_durations ?? []);
        }
      } catch (e) {
        console.error("[phase-metrics] error", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fechaDesde, fechaHasta, coach]);

  // Ordenar: primero F1-F5 principales, luego subfases
  const sortedDurations = [...durations].sort((a, b) => {
    const order = ["F1", "F2", "F3", "F4", "F5"];
    const ia = order.indexOf(a.etapa_id);
    const ib = order.indexOf(b.etapa_id);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.etapa_id.localeCompare(b.etapa_id);
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Tiempos promedio por fase</CardTitle>
          {durations.length === 0 && !loading && (
            <Badge variant="secondary" className="h-5 text-[11px]">
              Sin datos de duración en el rango seleccionado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[130px] rounded-xl border bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : sortedDurations.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No hay datos de duración por etapa en este período
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedDurations.map((d, idx) => (
              <PhaseCard
                key={d.etapa_id}
                title={STAGE_LABELS[d.etapa_id] ?? d.etapa_id}
                avgDays={d.avg_days}
                samples={d.count}
                palette={PALETTE[idx % PALETTE.length]}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
