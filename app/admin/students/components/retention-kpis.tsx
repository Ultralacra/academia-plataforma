"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, DoorOpen, Target, CalendarClock } from "lucide-react";
import type { LifecycleItem } from "./phase-faker";

/* helpers */
function mean(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function Stat({
  icon,
  title,
  value,
  subtitle,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  accent: string; // tailwind color like "emerald", "sky", "amber"
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 bg-${accent}-50/40 border-${accent}-200/70`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full grid place-items-center bg-${accent}-100 text-${accent}-700`}
          >
            {icon}
          </div>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <span className={`h-2 w-2 rounded-full bg-${accent}-400`} />
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {subtitle ? (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      ) : null}
      {children}
    </div>
  );
}

export default function RetentionKPIs({ items }: { items: LifecycleItem[] }) {
  const completed = items.filter((x) => x.status_sint === "COMPLETADO").length;
  const abandons = items.filter((x) => x.status_sint === "ABANDONO").length;
  const denom = completed + abandons;
  const retention = denom ? Math.round((completed / denom) * 100) : 0;

  const stayPool = items
    .filter((x) => x.permanencia_d != null)
    .map((x) => x.permanencia_d as number);
  const avgStay = mean(stayPool);

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">
          Retención y permanencia (sintético)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Stat
            icon={<Trophy className="h-4 w-4" />}
            title="Completados"
            value={completed}
            subtitle="Casos de éxito"
            accent="emerald"
          />
          <Stat
            icon={<DoorOpen className="h-4 w-4" />}
            title="Abandonos"
            value={abandons}
            subtitle="Salidas antes de completar"
            accent="rose"
          />
          <Stat
            icon={<Target className="h-4 w-4" />}
            title="Retención"
            value={`${retention}%`}
            subtitle="Completados / (Comp. + Aband.)"
            accent="sky"
          >
            <div className="mt-3 h-2 w-full rounded-full bg-sky-100">
              <div
                className="h-2 rounded-full bg-sky-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, retention))}%` }}
              />
            </div>
          </Stat>
          <Stat
            icon={<CalendarClock className="h-4 w-4" />}
            title="Permanencia prom."
            value={`${avgStay || 0} d`}
            subtitle="Días en el programa"
            accent="amber"
          />
        </div>
      </CardContent>
    </Card>
  );
}
