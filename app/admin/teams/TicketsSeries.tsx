"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  LabelList,
  Cell,
} from "recharts";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp } from "lucide-react";

type TicketsSeries = {
  daily: Array<{ date: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
};

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const { x, month, color, y } = p?.payload || {};
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl"
    >
      {/* Fecha completa */}
      <div className="font-semibold text-gray-900">{x}</div>
      {/* Línea de mes + valor con punto de color */}
      <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: color || "#3b82f6" }}
        />
        <span className="font-medium">{month}</span>
        <span className="ml-auto font-bold text-gray-900">{y}</span>
      </div>
      {/* Texto auxiliar */}
      <div className="mt-1 text-xs text-gray-500">
        Haz clic para ver los datos
      </div>
    </motion.div>
  );
}

export default function TicketsSeriesChart({
  series,
}: {
  series: TicketsSeries;
}) {
  const [tab, setTab] = useState<"day" | "week" | "month">("day");
  const palette = [
    "#3b82f6",
    "#f59e0b",
    "#22c55e",
    "#a78bfa",
    "#ef4444",
    "#06b6d4",
  ]; // se cicla si hay más meses
  const monthKeyFromISO = (iso: string) =>
    iso.length >= 7 ? iso.slice(0, 7) : iso;
  const monthLabelFromKey = (key: string) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString("es-ES", {
      month: "short",
      year: "numeric",
    });

  const colorMap = useMemo(() => {
    const keys = new Set<string>();
    series.daily.forEach((d) => keys.add(monthKeyFromISO(d.date)));
    series.weekly.forEach((d) => keys.add(monthKeyFromISO(d.week)));
    series.monthly.forEach((d) => keys.add(d.month));
    const ordered = Array.from(keys).sort();
    const map = new Map<string, string>();
    ordered.forEach((k, i) => map.set(k, palette[i % palette.length]));
    return map;
  }, [series.daily, series.weekly, series.monthly]);

  const dayData = useMemo(() => {
    return series.daily.map((d) => {
      const mkey = monthKeyFromISO(d.date);
      return {
        x: new Date(d.date).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        y: d.count,
        month: monthLabelFromKey(mkey),
        color: colorMap.get(mkey) || palette[0],
        mkey,
      };
    });
  }, [series.daily, colorMap]);

  const weekData = useMemo(() => {
    return series.weekly.map((d) => {
      const mkey = monthKeyFromISO(d.week);
      return {
        x: new Date(d.week).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        y: d.count,
        month: monthLabelFromKey(mkey),
        color: colorMap.get(mkey) || palette[0],
        mkey,
      };
    });
  }, [series.weekly, colorMap]);

  const monthData = useMemo(() => {
    return series.monthly.map((d) => {
      const mkey = d.month;
      return {
        x: monthLabelFromKey(mkey),
        y: d.count,
        month: monthLabelFromKey(mkey),
        color: colorMap.get(mkey) || palette[0],
        mkey,
      };
    });
  }, [series.monthly, colorMap]);

  const data = tab === "day" ? dayData : tab === "week" ? weekData : monthData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5 bg-white">
        <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          TICKETS POR PERIODO
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Evolución temporal de tickets creados
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-50 px-6 py-4 bg-white">
        <div className="flex items-center gap-2">
          {[
            { k: "day", l: "Diario" },
            { k: "week", l: "Semanal" },
            { k: "month", l: "Mensual" },
          ].map((b) => (
            <motion.button
              key={b.k}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab(b.k as any)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                tab === b.k
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md"
                  : "border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              {b.l}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 p-6">
        <ResponsiveContainer width="100%" height="100%">
          {tab === "day" ? (
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="x"
                angle={-45}
                textAnchor="end"
                height={60}
                stroke="#6b7280"
                style={{ fontSize: "12px", fontWeight: 500 }}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                stroke="#6b7280"
                style={{ fontSize: "12px", fontWeight: 500 }}
              />
              <RTooltip
                content={<TooltipContent />}
                cursor={{ fill: "rgba(59,130,246,0.08)" }}
              />
              <Bar dataKey="y" name="Tickets" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="y"
                  position="top"
                  style={{ fill: "#374151", fontSize: 12, fontWeight: 600 }}
                />
                {dayData.map((_, idx) => (
                  <Cell key={`c-${idx}`} fill={(data[idx] as any).color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="x"
                angle={-45}
                textAnchor="end"
                height={60}
                stroke="#6b7280"
                style={{ fontSize: "12px", fontWeight: 500 }}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                stroke="#6b7280"
                style={{ fontSize: "12px", fontWeight: 500 }}
              />
              <RTooltip
                content={<TooltipContent />}
                cursor={{ fill: "rgba(59,130,246,0.08)" }}
              />
              <Bar dataKey="y" name="Tickets" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="y"
                  position="top"
                  style={{ fill: "#374151", fontSize: 12, fontWeight: 600 }}
                />
                {data.map((_, idx) => (
                  <Cell key={`cw-${idx}`} fill={(data[idx] as any).color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Leyenda de meses (según pestaña activa) */}
      {(() => {
        const current = data as any[];
        const uniqueMKeys = Array.from(new Set(current.map((d) => d.mkey)));
        if (!uniqueMKeys.length) return null;
        return (
          <div className="px-6 pb-6 flex flex-wrap items-center gap-3 text-xs">
            {uniqueMKeys.map((mk) => (
              <div
                key={mk}
                className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: colorMap.get(mk) || palette[0] }}
                />
                <span className="font-medium text-gray-700">
                  {monthLabelFromKey(mk)}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </motion.div>
  );
}
