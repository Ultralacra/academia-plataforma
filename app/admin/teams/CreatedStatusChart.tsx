"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import type { CreatedTeamMetric } from "./metrics-created";

function Card({ children }: any) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">{children}</div>
  );
}
function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b px-5 py-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const total = payload.reduce((a: number, c: any) => a + (c.value ?? 0), 0);
  const value = p.value ?? 0;
  const pct = total ? Math.round((value * 1000) / total) / 10 : 0; // 1 decimal
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{p.name}</p>
      <p className="text-muted-foreground">
        Tickets: <span className="font-semibold">{value}</span> ({pct}%)
      </p>
    </div>
  );
}

const COLORS = ["#0ea5e9", "#22c55e", "#6366f1"]; // Abiertos, Cerrados, En Proceso

export default function CreatedStatusChart({
  rows,
}: {
  rows: CreatedTeamMetric[];
}) {
  const total = rows.reduce(
    (acc, r) => {
      acc.A += r.statusDist.Abiertos;
      acc.C += r.statusDist.Cerrados;
      acc.E += r.statusDist["En Proceso"];
      return acc;
    },
    { A: 0, C: 0, E: 0 }
  );

  const data = [
    { name: "Abiertos", value: total.A },
    { name: "Cerrados", value: total.C },
    { name: "En Proceso", value: total.E },
  ];

  return (
    <Card>
      <Header
        title="Distribución de estatus de tickets"
        subtitle="Totalizados"
      />
      <div className="h-72 px-5 pb-5">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <RTooltip content={<TooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
