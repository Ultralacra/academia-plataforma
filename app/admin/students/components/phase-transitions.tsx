"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Entrada mínima necesaria para calcular promedios por fase */
export type PhaseDatum = {
  ingreso?: string | null;
  paso_f1?: string | null;
  paso_f2?: string | null;
  paso_f3?: string | null;
  paso_f4?: string | null;
  paso_f5?: string | null;
};

/* ───────── helpers ───────── */
function daysBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? Math.round(diff) : null;
}
function mean(nums: Array<number | null>) {
  const v = nums.filter((x): x is number => typeof x === "number" && !isNaN(x));
  if (!v.length) return null;
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

/* ───────── estilos/colores (soft) ───────── */
const PALETTE = [
  { bg: "bg-violet-50", ring: "ring-violet-200", dot: "bg-violet-500" },
  { bg: "bg-blue-50", ring: "ring-blue-200", dot: "bg-blue-500" },
  { bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", ring: "ring-amber-200", dot: "bg-amber-500" },
  { bg: "bg-rose-50", ring: "ring-rose-200", dot: "bg-rose-500" },
];

type PhaseKey = "f1" | "f2" | "f3" | "f4" | "f5";
const PHASE_LABEL: Record<PhaseKey, string> = {
  f1: "Fase 1",
  f2: "Fase 2",
  f3: "Fase 3",
  f4: "Fase 4",
  f5: "Fase 5",
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

export default function PhaseMetrics({
  items,
  fallback = { f1: 7, f2: 10, f3: 8, f4: 9, f5: 5 },
  minSamplesToShowReal = 3,
  maxDaysCap = 30,
}: {
  items: PhaseDatum[];
  /** Valores de referencia usados si aún no hay suficientes muestras reales */
  fallback?: { f1: number; f2: number; f3: number; f4: number; f5: number };
  /** A partir de cuántas muestras mostramos el promedio real */
  minSamplesToShowReal?: number;
  /** Tope para escalar la barra visualmente */
  maxDaysCap?: number;
}) {
  const calc = useMemo(() => {
    const d1 = items.map((it) => daysBetween(it.ingreso, it.paso_f1));
    const d2 = items.map((it) => daysBetween(it.paso_f1, it.paso_f2));
    const d3 = items.map((it) => daysBetween(it.paso_f2, it.paso_f3));
    const d4 = items.map((it) => daysBetween(it.paso_f3, it.paso_f4));
    const d5 = items.map((it) => daysBetween(it.paso_f4, it.paso_f5));

    const samples = {
      f1: d1.filter((x) => x != null).length,
      f2: d2.filter((x) => x != null).length,
      f3: d3.filter((x) => x != null).length,
      f4: d4.filter((x) => x != null).length,
      f5: d5.filter((x) => x != null).length,
    };
    const avg = {
      f1: mean(d1),
      f2: mean(d2),
      f3: mean(d3),
      f4: mean(d4),
      f5: mean(d5),
    };

    const hasEnough =
      samples.f1 >= minSamplesToShowReal ||
      samples.f2 >= minSamplesToShowReal ||
      samples.f3 >= minSamplesToShowReal ||
      samples.f4 >= minSamplesToShowReal ||
      samples.f5 >= minSamplesToShowReal;

    return { samples, avg, useFallback: !hasEnough };
  }, [items, minSamplesToShowReal]);

  const values: Record<PhaseKey, number | null> = {
    f1: calc.useFallback ? fallback.f1 : calc.avg.f1,
    f2: calc.useFallback ? fallback.f2 : calc.avg.f2,
    f3: calc.useFallback ? fallback.f3 : calc.avg.f3,
    f4: calc.useFallback ? fallback.f4 : calc.avg.f4,
    f5: calc.useFallback ? fallback.f5 : calc.avg.f5,
  };

  const subtitle = calc.useFallback
    ? "Mostrando datos de ejemplo hasta acumular suficientes muestras"
    : "Promedios calculados con datos reales";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Tiempos promedio por fase</CardTitle>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["f1", "f2", "f3", "f4", "f5"] as PhaseKey[]).map((k, idx) => {
            const palette = PALETTE[idx];
            const samples = calc.samples[k];
            const v = values[k];
            return (
              <div
                key={k}
                className={cn(
                  "rounded-xl border p-4 ring-1 transition-shadow hover:shadow-sm",
                  palette.bg,
                  palette.ring
                )}
                title={
                  v != null
                    ? `${
                        PHASE_LABEL[k]
                      }: ${v} días — basado en ${samples} usuario${
                        samples === 1 ? "" : "s"
                      }`
                    : `${PHASE_LABEL[k]}: sin datos`
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", palette.dot)}
                  />
                  <span className="text-sm font-medium">
                    Tiempo promedio en {PHASE_LABEL[k]}
                  </span>
                </div>

                <div className="mt-2">
                  <div className="text-2xl font-semibold leading-none">
                    {v != null ? `${v} días` : "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    En base a <b>{samples}</b> usuario
                    {samples === 1 ? "" : "s"} en esta fase
                  </div>
                </div>

                <MetricBar value={v} cap={maxDaysCap} colorDot={palette.dot} />
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground">
          La barra indica el promedio relativo (capado a {maxDaysCap} días para
          escala visual).
        </div>
      </CardContent>
    </Card>
  );
}
