"use client";

import { Timer, Percent, CheckCircle2, Clock } from "lucide-react";

export default function ResolutionAndRateCard({
  avgMinutes,
  avgHms,
  resolved,
  total,
  className,
}: {
  avgMinutes: number | null | undefined;
  avgHms: string | null | undefined;
  resolved: number | null | undefined;
  total: number | null | undefined;
  className?: string;
}) {
  const minutes = Number(avgMinutes ?? 0);
  const hms = avgHms ?? "—";
  const res = Number(resolved ?? 0);
  const tot = Number(total ?? 0);
  const pending = Math.max(tot - res, 0);
  const rate = tot > 0 ? (res / tot) * 100 : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm ${
        className ?? ""
      }`}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500" />
      <div className="p-4 grid grid-cols-1 gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/20">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Promedio resolución
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {minutes.toFixed(1)}{" "}
              <span className="text-base font-semibold text-muted-foreground">
                min
              </span>
            </div>
            <div className="text-sm text-muted-foreground">({hms})</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20">
            <Percent className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Tasa de resolución
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {rate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              ({res}/{tot})
            </div>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> RESUELTO: {res}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <Clock className="h-3.5 w-3.5" /> PENDIENTE: {pending}
          </span>
        </div>
      </div>
    </div>
  );
}
