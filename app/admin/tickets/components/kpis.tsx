"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export default function KPIs({
  metrics,
  loading,
}: {
  metrics: { total: number; pend: number; prog: number; res: number };
  loading: boolean;
}) {
  const Item = ({
    icon,
    label,
    value,
    accentClass,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    accentClass: string;
  }) => (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-xl ${accentClass} p-3`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{loading ? "…" : value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Item
        icon={<Users className="h-5 w-5 text-sky-600" />}
        label="Total"
        value={metrics.total}
        accentClass="bg-sky-50"
      />
      <Item
        icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        label="Pendientes"
        value={metrics.pend}
        accentClass="bg-amber-50"
      />
      <Item
        icon={<Clock className="h-5 w-5 text-indigo-600" />}
        label="En progreso"
        value={metrics.prog}
        accentClass="bg-indigo-50"
      />
      <Item
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        label="Resueltos"
        value={metrics.res}
        accentClass="bg-emerald-50"
      />
    </div>
  );
}
