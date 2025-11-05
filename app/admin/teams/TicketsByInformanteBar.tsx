"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Row = {
  informante?: string | null;
  informante_nombre?: string | null;
  name?: string | null;
  cantidad?: number | string | null;
  cantidad_tickets?: number | string | null;
  tickets?: number | string | null;
  count?: number | string | null;
  [k: string]: any;
};

export default function TicketsByInformanteBar({
  data,
  title = "TICKETS POR INFORMANTE",
}: {
  data: Row[];
  title?: string;
}) {
  // Memoizar transformación de datos para evitar recomputos innecesarios
  const { rows, total, chartHeight, yAxisWidth } = useMemo(() => {
    // Determinar la fuente de datos: puede venir como array directo o como
    // { ticketsByInformante: [...] } u otras variantes. Preferimos la clave
    // ticketsByInformante si existe.
    const maybe = data as any;
    const source: any[] = Array.isArray(maybe)
      ? maybe
      : Array.isArray(maybe?.ticketsByInformante)
      ? maybe.ticketsByInformante
      : Array.isArray(maybe?.tickets_by_informante)
      ? maybe.tickets_by_informante
      : Array.isArray(maybe?.data?.ticketsByInformante)
      ? maybe.data.ticketsByInformante
      : [];

    // Agrupar por informante y sumar cantidad
    const grouped: Record<string, number> = {};
    for (const d of source || []) {
      const rawName = d?.informante ?? d?.name ?? d?.informante_nombre ?? null;
      const rawCount =
        d?.cantidad ?? d?.cantidad_tickets ?? d?.tickets ?? d?.count ?? 0;
      const name =
        rawName == null || String(rawName).trim() === ""
          ? "Sin informante"
          : String(rawName).trim();

      // Intentar parsear números seguros (si vienen como string)
      const parsed = Number(rawCount) || 0;
      grouped[name] = (grouped[name] || 0) + parsed;
    }

    const computedRows = Object.keys(grouped)
      .map((k) => ({ label: k, value: grouped[k] }))
      // ordenar por cantidad descendente para mostrar los informantes principales arriba
      .sort((a, b) => b.value - a.value);

    const computedTotal = computedRows.reduce((a, c) => a + c.value, 0);

    // Calcular altura dinámica en función de filas
    const computedChartHeight = Math.max(300, computedRows.length * 36 + 80);

    // Calcular ancho dinámico de YAxis según la longitud de la etiqueta
    const maxLabelLength = computedRows.reduce(
      (m, r) => Math.max(m, String(r.label).length),
      0
    );
    // 8px por carácter aproximado + margen, limitado a [120, 300]
    const computedYAxisWidth = Math.min(
      300,
      Math.max(120, maxLabelLength * 8 + 40)
    );

    return {
      rows: computedRows,
      total: computedTotal,
      chartHeight: computedChartHeight,
      yAxisWidth: computedYAxisWidth,
    };
  }, [data]);

  // Logs de depuración para inspeccionar la data y el resultado de la transformación
  // Úsalos en la consola del navegador (devtools). Se deja como console.debug para que pueda ocultarse fácilmente.
  try {
    // Imprimir únicamente la propiedad ticketsByInformante del payload
    const only = (data as any)?.ticketsByInformante;
    if (only === undefined) {
      // data probablemente es ya el array (displayVm.ticketsByInformante || [])
      console.debug(
        "ticketsByInformante: undefined — received `data` value (probable array):",
        data
      );
    } else {
      console.debug("ticketsByInformante:", only);
    }
  } catch (e) {
    // Ignorar si console no existe
  }

  // Paleta (misma que TicketsByPeriodBar)
  const palette = [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#EC4899",
    "#14B8A6",
    "#F97316",
  ];

  const chartConfig: ChartConfig = {
    tickets: {
      label: "Tickets",
      color: "var(--chart-1)",
    },
  };

  if (!rows.length) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <div className="text-sm text-gray-600">
              Total:{" "}
              <span className="font-semibold text-gray-900">{total}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">Distribución por informante</p>
        </div>
        <div className="p-6 text-sm text-gray-600">
          No hay datos para el rango seleccionado.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{total}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500">Distribución por informante</p>
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
            barSize={16}
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
              width={yAxisWidth}
              interval={0}
              tick={{ fontSize: 12, fill: "#374151" }}
              // Truncar etiquetas largas para no romper el layout
              tickFormatter={(label) =>
                String(label).length > 36
                  ? String(label).slice(0, 33) + "..."
                  : String(label)
              }
            />
            <ChartTooltip
              cursor={false}
              content={(props) => (
                <ChartTooltipContent
                  {...(props as any)}
                  hideLabel={false}
                  label={"Cantidad de tickets:"}
                />
              )}
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
