"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = {
  informante?: string | null;
  informante_nombre?: string | null;
  nombre?: string | null;
  name?: string | null;

  cantidad?: number | string | null;
  cantidad_tickets?: number | string | null;
  tickets?: number | string | null;
  count?: number | string | null;

  created_at?: string | null;
  createdAt?: string | null;
  day?: string | null;
  date?: string | null;
  fecha?: string | null;
  [k: string]: any;
};

type ChartRow = { label: string; value: number };

function get(obj: any, path: string) {
  return path
    .split(".")
    .reduce((a: any, k: string) => (a ? a[k] : undefined), obj);
}
function firstArrayAt(obj: any, paths: string[]): any[] {
  for (const p of paths) {
    const arr = get(obj, p);
    if (Array.isArray(arr) && arr.length) return arr;
  }
  return [];
}
const toNumber = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const normName = (raw: any) => {
  const str =
    raw == null || String(raw).trim() === ""
      ? "Sin informante"
      : String(raw).trim();
  return str;
};
const normISODate = (d: any) => {
  const t = d ?? null;
  if (!t) return null;
  const dt = new Date(t);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
};

// >>> NUEVO: etiqueta "día Mes" (tres letras)
const MONTHS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
function labelDiaMesFromISO(iso: string) {
  // iso esperado: YYYY-MM-DD
  const d = parseInt(iso.slice(8, 10), 10);
  const m = parseInt(iso.slice(5, 7), 10); // 1..12
  const mes = MONTHS_ES[(m - 1 + 12) % 12] ?? "";
  return `${d} ${mes}`;
}

export default function TicketsByInformanteBar({
  data,
  title = "TICKETS POR INFORMANTE",
}: {
  data: Row[] | any;
  title?: string;
}) {
  const [tab, setTab] = useState<"general" | "por-dia">("general");
  const [selected, setSelected] = useState<string>("");

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

  const {
    rowsGeneral,
    totalGeneral,
    chartHeightGeneral,
    yAxisWidthGeneral,
    hasDaySource,
    informanteOptions,
    dayAgg,
  } = useMemo(() => {
    const maybe = data as any;

    // -------- GENERAL --------
    const generalPaths = [
      "ticketsByInformante",
      "tickets_by_informante",
      "data.ticketsByInformante",
      "data.tickets_by_informante",
      "teams.ticketsByInformante",
      "teams.tickets_by_informante",
      "data.teams.ticketsByInformante",
      "data.teams.tickets_by_informante",
    ];
    let generalSource: any[] = firstArrayAt(maybe, generalPaths);
    if (
      (!generalSource || !generalSource.length) &&
      Array.isArray(maybe) &&
      maybe.length
    ) {
      const s = maybe[0] || {};
      const plausible =
        "informante" in s ||
        "informante_nombre" in s ||
        "name" in s ||
        "nombre" in s;
      const hasCount =
        "cantidad" in s ||
        "cantidad_tickets" in s ||
        "tickets" in s ||
        "count" in s;
      if (plausible && hasCount) generalSource = maybe;
    }

    // -------- POR DÍA (detalle / base agregada) --------
    const dayPaths = [
      "ticketsByInformanteByDay",
      "tickets_by_informante_by_day",
      "data.ticketsByInformanteByDay",
      "data.tickets_by_informante_by_day",
      "teams.ticketsByInformanteByDay",
      "teams.tickets_by_informante_by_day",
      "data.teams.ticketsByInformanteByDay",
      "data.teams.tickets_by_informante_by_day",
    ];
    let daySource: any[] = firstArrayAt(maybe, dayPaths);
    if (
      (!daySource || !daySource.length) &&
      Array.isArray(maybe) &&
      maybe.length &&
      ("created_at" in (maybe[0] || {}) ||
        "createdAt" in (maybe[0] || {}) ||
        "day" in (maybe[0] || {}) ||
        "date" in (maybe[0] || {}) ||
        "fecha" in (maybe[0] || {}))
    ) {
      daySource = maybe as any[];
    }
    const hasDaySource = Array.isArray(daySource) && daySource.length > 0;

    // -------- General: agrupar por informante --------
    const genMap: Record<string, number> = {};
    for (const d of generalSource || []) {
      const name = normName(
        d?.informante ?? d?.name ?? d?.informante_nombre ?? d?.nombre ?? null
      );
      const cnt = toNumber(
        d?.cantidad ?? d?.cantidad_tickets ?? d?.tickets ?? d?.count ?? 0
      );
      genMap[name] = (genMap[name] ?? 0) + cnt;
    }
    const rowsGeneral: ChartRow[] = Object.keys(genMap)
      .map((k) => ({ label: k, value: genMap[k] }))
      .sort((a, b) => b.value - a.value);
    const totalGeneral = rowsGeneral.reduce((a, c) => a + c.value, 0);
    const maxLabelLenGeneral = rowsGeneral.reduce(
      (m, r) => Math.max(m, String(r.label).length),
      0
    );
    const yAxisWidthGeneral = Math.min(
      300,
      Math.max(120, maxLabelLenGeneral * 8 + 40)
    );
    const chartHeightGeneral = Math.max(300, rowsGeneral.length * 36 + 80);

    // -------- Por día: construir dayAgg (name -> (isoDate -> count)) --------
    const dayAgg = new Map<string, Map<string, number>>();
    if (hasDaySource) {
      for (const d of daySource) {
        const name = normName(
          d?.informante ?? d?.name ?? d?.informante_nombre ?? d?.nombre ?? null
        );
        const dayKey = normISODate(
          d?.created_at ?? d?.createdAt ?? d?.day ?? d?.date ?? d?.fecha ?? null
        );
        const cnt = toNumber(
          d?.cantidad ?? d?.tickets ?? d?.count ?? d?.cantidad_tickets ?? 0
        );
        if (!dayKey || cnt <= 0) continue;
        if (!dayAgg.has(name)) dayAgg.set(name, new Map());
        const byDay = dayAgg.get(name)!;
        byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + cnt);
      }
    }

    const informanteOptions = Array.from(dayAgg.keys()).sort((a, b) =>
      a.localeCompare(b, "es")
    );

    return {
      rowsGeneral,
      totalGeneral,
      chartHeightGeneral,
      yAxisWidthGeneral,
      hasDaySource,
      informanteOptions,
      dayAgg,
    };
  }, [data]);

  // Selección por defecto cuando hay opciones
  useEffect(() => {
    if (!selected && informanteOptions?.length) {
      setSelected(informanteOptions[0]);
    }
  }, [informanteOptions, selected]);

  // Serie dependiente de "selected": etiqueta "día Mes"
  const { daysForSelected, totalSelected, chartHeightDays, yAxisWidthDays } =
    useMemo(() => {
      if (!selected || !dayAgg?.has(selected)) {
        return {
          daysForSelected: [] as ChartRow[],
          totalSelected: 0,
          chartHeightDays: 300,
          yAxisWidthDays: 100,
        };
      }
      const selectedMap = dayAgg.get(selected)!;

      const daysForSelected: ChartRow[] = Array.from(selectedMap.entries())
        .sort(([d1], [d2]) => d1.localeCompare(d2)) // asc por fecha
        .map(([iso, value]) => ({
          label: labelDiaMesFromISO(iso), // << aquí el cambio
          value,
        }));

      const totalSelected = daysForSelected.reduce((a, c) => a + c.value, 0);
      const maxLabelLenDays = daysForSelected.reduce(
        (m, r) => Math.max(m, String(r.label).length),
        0
      );
      const yAxisWidthDays = Math.min(
        160,
        Math.max(80, maxLabelLenDays * 8 + 32)
      );
      const chartHeightDays = Math.max(300, daysForSelected.length * 32 + 80);

      return {
        daysForSelected,
        totalSelected,
        chartHeightDays,
        yAxisWidthDays,
      };
    }, [dayAgg, selected]);

  const chartConfigGeneral: ChartConfig = {
    tickets: { label: "Tickets", color: "var(--chart-1)" },
  };
  const chartConfigDays: ChartConfig = {
    tickets: { label: "Tickets por día", color: "var(--chart-1)" },
  };

  const renderEmpty = (subtitle: string) => (
    <div className="p-6 text-sm text-gray-600">
      No hay datos para el rango seleccionado.
      <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
    </div>
  );

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">Distribución por informante</p>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="por-dia">Por día</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* GENERAL */}
      {tab === "general" ? (
        rowsGeneral.length === 0 ? (
          renderEmpty("No se encontraron tickets por informante.")
        ) : (
          <div className="p-5">
            <div className="mb-2 text-sm text-gray-600">
              Total:{" "}
              <span className="font-semibold text-gray-900">
                {totalGeneral}
              </span>
            </div>
            <ChartContainer
              config={chartConfigGeneral}
              className="w-full"
              style={{ height: chartHeightGeneral }}
            >
              <BarChart
                accessibilityLayer
                data={rowsGeneral}
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
                  width={yAxisWidthGeneral}
                  interval={0}
                  tick={{ fontSize: 12, fill: "#374151" }}
                  tickFormatter={(label) =>
                    String(label).length > 36
                      ? String(label).slice(0, 33) + "…"
                      : String(label)
                  }
                />
                <ChartTooltip
                  cursor={false}
                  content={(p) => (
                    <ChartTooltipContent
                      {...(p as any)}
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
                  {rowsGeneral.map((_, i) => (
                    <Cell key={`g-${i}`} fill={palette[i % palette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )
      ) : !hasDaySource ? (
        renderEmpty(
          "Debes aportar `ticketsByInformanteByDay` (o un array con `created_at`/`date`/`fecha`)."
        )
      ) : (
        // POR DÍA
        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Informante:</span>
              <Select
                value={selected || undefined}
                onValueChange={(v) => setSelected(v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecciona un informante" />
                </SelectTrigger>
                <SelectContent>
                  {informanteOptions.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600">
              Total del periodo:{" "}
              <span className="font-semibold text-gray-900">
                {totalSelected}
              </span>
            </div>
          </div>

          {!daysForSelected || daysForSelected.length === 0 ? (
            renderEmpty("Ese informante no tiene días con tickets en el rango.")
          ) : (
            <ChartContainer
              config={chartConfigDays}
              className="w-full"
              style={{ height: chartHeightDays }}
            >
              <BarChart
                accessibilityLayer
                data={daysForSelected}
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
                  width={yAxisWidthDays}
                  interval={0}
                  tick={{ fontSize: 12, fill: "#374151" }}
                />
                <ChartTooltip
                  cursor={false}
                  content={(p) => (
                    <ChartTooltipContent
                      {...(p as any)}
                      hideLabel={false}
                      label={"Tickets en el día:"}
                    />
                  )}
                />
                <Bar dataKey="value" radius={6}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: any) => String(v)}
                  />
                  {daysForSelected.map((_, i) => (
                    <Cell key={`d-${i}`} fill={palette[i % palette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </div>
      )}
    </div>
  );
}
