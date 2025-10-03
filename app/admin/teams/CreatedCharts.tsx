"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
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
  const p = payload[0];
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {p.name}: <span className="font-semibold">{p.value}</span>
      </p>
    </div>
  );
}

export default function CreatedCharts({ rows }: { rows: CreatedTeamMetric[] }) {
  const topTickets = [...rows]
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 12)
    .map((r) => ({ x: r.nombre_coach, tickets: r.tickets }));

  const areas = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.area] = (acc[r.area] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => a.area.localeCompare(b.area));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <Header title="Tickets por equipo (Top 12)" subtitle="Ordenado desc." />
        <div className="h-72 px-5 pb-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topTickets} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" hide />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="tickets"
                name="Tickets"
                fill="url(#gSky)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Header title="Equipos por área" subtitle="Conteo por área" />
        <div className="h-72 px-5 pb-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areas}>
              <defs>
                <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="area"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                dy={8}
              />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="count"
                name="Equipos"
                fill="url(#gViolet)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
