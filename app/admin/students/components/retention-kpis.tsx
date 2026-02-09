"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, DoorOpen, Target, CalendarClock, Users } from "lucide-react";
import {
  fetchMetricsRetention,
  getDefaultRange,
  type RetentionApiData,
} from "./api";

function Stat({
  icon,
  title,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  accent: string;
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
    </div>
  );
}

export default function RetentionKPIs({
  fechaDesde,
  fechaHasta,
}: {
  fechaDesde?: string;
  fechaHasta?: string;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RetentionApiData | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const range = getDefaultRange();
        const res = await fetchMetricsRetention({
          fechaDesde: fechaDesde ?? range.fechaDesde,
          fechaHasta: fechaHasta ?? range.fechaHasta,
        });
        if (!ignore) setData(res?.data ?? null);
      } catch (e) {
        console.error("[retention-kpis] error", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fechaDesde, fechaHasta]);

  const retention = data?.retention;
  const completed = retention?.completado ?? 0;
  const abandons = retention?.abandonado ?? 0;
  const retentionPct = retention?.retention ?? 0;
  const avgStay = retention?.permanencia ?? 0;
  const total = retention?.total ?? 0;

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">Retención y permanencia</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[110px] rounded-2xl border bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Stat
              icon={<Users className="h-4 w-4" />}
              title="Total clientes"
              value={total}
              subtitle="En el rango seleccionado"
              accent="indigo"
            />
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
              value={`${retentionPct}%`}
              subtitle="Completados / (Comp. + Aband.)"
              accent="sky"
            />
            <Stat
              icon={<CalendarClock className="h-4 w-4" />}
              title="Permanencia prom."
              value={`${avgStay.toFixed(2)} d`}
              subtitle="Días en el programa"
              accent="amber"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
