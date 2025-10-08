"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp } from "lucide-react";

type TicketsSeries = {
  daily: Array<{ date: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
};

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-gray-900">
        <Calendar className="h-4 w-4 text-blue-500" />
        {label}
      </p>
      <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        Tickets: <span className="font-bold text-gray-900">{p.value}</span>
      </p>
    </motion.div>
  );
}

export default function TicketsSeriesChart({
  series,
}: {
  series: TicketsSeries;
}) {
  const [tab, setTab] = useState<"day" | "week" | "month">("day");
  const data =
    tab === "day"
      ? series.daily.map((d) => ({ x: d.date.slice(5), y: d.count }))
      : tab === "week"
      ? series.weekly.map((d) => ({ x: d.week.slice(5), y: d.count }))
      : series.monthly.map((d) => ({ x: d.month, y: d.count }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5 bg-white">
        <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Tickets por periodo
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
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gAreaElegant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="x"
              stroke="#6b7280"
              style={{ fontSize: "12px", fontWeight: 500 }}
            />
            <YAxis
              allowDecimals={false}
              stroke="#6b7280"
              style={{ fontSize: "12px", fontWeight: 500 }}
            />
            <RTooltip
              content={<TooltipContent />}
              cursor={{ stroke: "#8b5cf6", strokeWidth: 2 }}
            />
            <Area
              dataKey="y"
              name="Tickets"
              type="monotone"
              fill="url(#gAreaElegant)"
              stroke="#8b5cf6"
              strokeWidth={3}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
