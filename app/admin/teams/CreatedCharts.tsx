"use client";

import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-xl hover:shadow-2xl transition-shadow duration-300"
    >
      {children}
    </motion.div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-3 text-sm shadow-2xl"
    >
      <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: p.fill }}
        />
        <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
        <span className="font-bold text-gray-900 dark:text-gray-100">
          {p.value}
        </span>
      </div>
    </motion.div>
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <Header
          title="Tickets por equipo"
          subtitle="Top 12 equipos con más tickets"
        />
        <div className="h-80 px-6 py-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topTickets} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="gSkyNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                opacity={0.5}
              />
              <XAxis dataKey="x" hide />
              <YAxis
                allowDecimals={false}
                stroke="#9ca3af"
                style={{ fontSize: "12px" }}
              />
              <RTooltip
                content={<TooltipContent />}
                cursor={{ fill: "#f3f4f6", opacity: 0.3 }}
              />
              <Bar
                dataKey="tickets"
                name="Tickets"
                fill="url(#gSkyNew)"
                radius={[10, 10, 0, 0]}
                animationBegin={0}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Header
          title="Equipos por área"
          subtitle="Distribución por área funcional"
        />
        <div className="h-80 px-6 py-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areas}>
              <defs>
                <linearGradient id="gVioletNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="50%" stopColor="#a78bfa" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                opacity={0.5}
              />
              <XAxis
                dataKey="area"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                interval={0}
                angle={-15}
                dy={8}
              />
              <YAxis
                allowDecimals={false}
                stroke="#9ca3af"
                style={{ fontSize: "12px" }}
              />
              <RTooltip
                content={<TooltipContent />}
                cursor={{ fill: "#f3f4f6", opacity: 0.3 }}
              />
              <Bar
                dataKey="count"
                name="Equipos"
                fill="url(#gVioletNew)"
                radius={[10, 10, 0, 0]}
                animationBegin={0}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
