"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
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
function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.name}: <span className="font-semibold">{p.value} min</span>
        </p>
      ))}
    </div>
  );
}

export default function CreatedResponseCharts({
  rows,
}: {
  rows: CreatedTeamMetric[];
}) {
  const data = rows
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 14)
    .map((r) => ({
      x: r.nombre_coach,
      response: r.avgResponse,
      resolution: r.avgResolution,
    }));

  return (
    <Card>
      <Header
        title="Tiempos promedio por equipo"
        subtitle="Respuesta vs Resolución (min)"
      />
      <div className="h-72 px-5 pb-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <defs>
              <linearGradient id="gResp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="gReso" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.25} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" hide />
            <YAxis allowDecimals={false} />
            <Legend />
            <RTooltip content={<TooltipContent />} />
            <Bar
              dataKey="response"
              name="Respuesta"
              fill="url(#gResp)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="resolution"
              name="Resolución"
              fill="url(#gReso)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
