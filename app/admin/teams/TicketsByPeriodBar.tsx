"use client";

import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Row = { [k: string]: any };

export default function TicketsByPeriodBar({
  data,
  title = "TICKETS POR PERIODO",
}: {
  data: Row[];
  title?: string;
}) {
  // Agrupar por día (UTC) y ordenar por fecha.
  // El input puede venir con propiedades diferentes (p.ej. `date`/`count` o `day`/`tickets`).
  const grouped: Record<string, number> = {};
  for (const d of data || []) {
    // detectar campo de fecha y de cantidad con fallback
    const rawDate = d?.date ?? d?.day ?? d?.dayKey ?? d?.fecha ?? d?.day_date;
    const rawCount =
      d?.count ?? d?.tickets ?? d?.value ?? d?.tickets_count ?? d?.clients ?? 0;
    if (!rawDate) continue;

    // Normalizar a un objeto Date válido.
    let dt: Date | null = null;
    try {
      // Si viene ya con 'T' (ISO) o termina con Z, parse directo
      if (String(rawDate).includes("T") || String(rawDate).endsWith("Z")) {
        dt = new Date(String(rawDate));
      } else {
        // Si parece YYYY-MM-DD o similar, añadir hora UTC 00:00
        dt = new Date(`${String(rawDate)}T00:00:00Z`);
      }
    } catch {
      dt = null;
    }
    if (!dt || isNaN(dt.getTime())) continue;
    const dayKey = dt.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    grouped[dayKey] = (grouped[dayKey] || 0) + Number(rawCount || 0);
  }

  const rows = Object.keys(grouped)
    .slice()
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((dayKey) => {
      const dt = new Date(`${dayKey}T00:00:00Z`);
      const label = dt.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      });
      return { label, value: grouped[dayKey] || 0 };
    });

  const total = rows.reduce((a, c) => a + c.value, 0);

  // Calcular altura dinámica para usar mejor el espacio vertical según número de filas.
  // Base 280px, luego sumar 26px por fila aproximadamente.
  const chartHeight = Math.max(300, rows.length * 26 + 80);

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
          className="w-full"
          style={{ height: chartHeight }}
        >
          <BarChart
            accessibilityLayer
            data={rows}
            layout="vertical"
            barSize={14}
            barCategoryGap={8}
            margin={{ left: 0, right: 12, top: 8, bottom: 8 }}
          >
            <XAxis type="number" dataKey="value" hide />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              width={110}
              interval={0}
              tick={{ fontSize: 12, fill: "#374151" }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" radius={6}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: any) => String(v)}
              />
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
