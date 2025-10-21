"use client";

import React from "react";
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
  initialLimit,
  showLimiter,
}: {
  data: Row[];
  title?: string;
  // Mapa opcional: nombre de alumno -> { minutos, horas, hms }
  avgResolution?: Map<
    string,
    { minutes: number | null; hours: number | null; hms: string }
  >;
  // Para vistas con muchos alumnos (general): limitar a Top N con toggle
  initialLimit?: number;
  showLimiter?: boolean;
}) {
  const rowsAll = [...(data || [])]
    .map((r) => ({
      name: r.name || "Sin Alumno",
      count: Number(r.count || 0) || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const [limit, setLimit] = React.useState<number | null>(
    initialLimit && initialLimit > 0 ? initialLimit : null
  );
  const rows = limit ? rowsAll.slice(0, limit) : rowsAll;

  // Altura dinámica y scroll cuando se muestra "todos"
  const base = 48; // header + paddings
  const per = 26; // alto por barra
  const MAX_BOX = 600;
  const scrollMode = !!(showLimiter && limit === null);
  const height = scrollMode
    ? Math.max(160, base + rows.length * per) // altura real del contenido
    : Math.max(160, Math.min(MAX_BOX, base + rows.length * per)); // altura acotada cuando se muestra Top N

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
    <div className="w-full rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">Ordenado de mayor a menor</p>
          </div>
          {showLimiter && rowsAll.length > (initialLimit || 0) && (
            <button
              className="text-xs rounded-md border px-2 py-1 bg-white hover:bg-gray-50"
              onClick={() => setLimit((v) => (v ? null : initialLimit || 25))}
            >
              {limit
                ? `Ver todos (${rowsAll.length})`
                : `Ver top ${initialLimit || 25}`}
            </button>
          )}
        </div>
        {avgResolution && avgResolution.size > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Incluye tiempo promedio de resolución por alumno (horas) en el
            tooltip.
          </p>
        )}
      </div>
      <div className="p-5">
        <div
          className="w-full"
          style={{
            maxHeight: scrollMode ? MAX_BOX : undefined,
            overflowY: scrollMode ? "auto" : "visible",
          }}
        >
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
    </div>
  );
}
