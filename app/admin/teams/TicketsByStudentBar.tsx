"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Row = { name: string; count: number };

export default function TicketsByStudentBar({
  data,
  title = "TICKETS POR ALUMNO",
  avgResolution,
}: {
  data: Row[];
  title?: string;
  // Mapa opcional: nombre de alumno -> { minutos, horas, hms }
  avgResolution?: Map<
    string,
    { minutes: number | null; hours: number | null; hms: string }
  >;
}) {
  const rows = [...(data || [])]
    .map((r) => ({
      name: r.name || "Sin Alumno",
      count: Number(r.count || 0) || 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Altura dinámica según cantidad de filas (máx. 600px)
  const base = 48; // header + paddings
  const per = 26; // alto por barra
  const height = Math.max(160, Math.min(600, base + rows.length * per));

  const chartConfig: ChartConfig = {
    tickets: {
      label: "Tickets",
      color: "var(--chart-2)",
    },
    label: {
      // color usado para el texto dentro de la barra
      color: "var(--background)",
    },
  };

  // Paleta de colores para cada barra (rotando)
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

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">Ordenado de mayor a menor</p>
        {avgResolution && avgResolution.size > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Incluye tiempo promedio de resolución por alumno (horas) en el
            tooltip.
          </p>
        )}
      </div>
      <div className="p-5">
        <ChartContainer
          config={chartConfig}
          className="w-full aspect-auto"
          style={{ height }}
        >
          <BarChart
            accessibilityLayer
            data={rows}
            layout="vertical"
            margin={{ right: 96 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="#e5e7eb"
            />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              width={280}
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const metrics = avgResolution?.get(String(label)) ?? null;
                return (
                  <div className="border border-gray-200 bg-white rounded-md shadow-sm px-2.5 py-1.5 text-xs">
                    <div className="font-semibold text-gray-900">
                      {String(label)}
                    </div>
                    <div className="text-gray-700">
                      Tickets: {Number(payload[0]?.value ?? 0)}
                    </div>
                    {metrics &&
                      metrics.hours != null &&
                      !isNaN(Number(metrics.hours)) && (
                        <div className="text-gray-700">
                          Horas: {Number(metrics.hours).toFixed(2)} h
                        </div>
                      )}
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={8}>
              {rows.map((_, i) => (
                <Cell key={`cell-${i}`} fill={palette[i % palette.length]} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
