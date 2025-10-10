"use client";

import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Row = { date: string; count: number };

export default function TicketsByPeriodBar({
  data,
  title = "Tickets por periodo",
}: {
  data: Row[];
  title?: string;
}) {
  const rows = (data || []).map((d) => {
    // Evitar desfase por zona horaria: fijar UTC explícito
    const iso = `${d.date}T00:00:00Z`;
    const label = new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    });
    return { label, value: Number(d.count || 0) || 0 };
  });

  const total = rows.reduce((a, c) => a + c.value, 0);

  // Paleta multicolor por barra
  const palette = [
    "#6366F1", // indigo-500
    "#22C55E", // green-500
    "#F59E0B", // amber-500
    "#EF4444", // red-500
    "#8B5CF6", // violet-500
    "#06B6D4", // cyan-500
    "#84CC16", // lime-500
    "#EC4899", // pink-500
    "#14B8A6", // teal-500
    "#F97316", // orange-500
  ];

  const chartConfig: ChartConfig = {
    tickets: {
      label: "Tickets",
      color: "var(--chart-1)",
    },
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{total}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500">Evolución diaria</p>
      </div>
      <div className="p-5">
        <ChartContainer
          config={chartConfig}
          className="w-full aspect-auto"
          style={{ height: 360 }}
        >
          <BarChart
            accessibilityLayer
            data={rows}
            layout="vertical"
            margin={{ left: 0, right: 24 }}
          >
            <XAxis type="number" dataKey="value" hide />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              width={80}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" radius={6}>
              {rows.map((_, i) => (
                <Cell key={`cell-${i}`} fill={palette[i % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
