"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import type { CreatedTeamMetric } from "./metrics-created";

function Card({ children }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
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

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const total = payload.reduce((a: number, c: any) => a + (c.value ?? 0), 0);
  const value = p.value ?? 0;
  const pct = total ? Math.round((value * 1000) / total) / 10 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-3 text-sm shadow-2xl"
    >
      <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">
        {p.name}
      </p>
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <span>Tickets:</span>
        <span className="font-bold text-gray-900 dark:text-gray-100">
          {value}
        </span>
        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {pct}%
        </span>
      </div>
    </motion.div>
  );
}

const COLORS = [
  { main: "#3b82f6", light: "#60a5fa" }, // Blue - Abiertos
  { main: "#10b981", light: "#34d399" }, // Green - Cerrados
  { main: "#8b5cf6", light: "#a78bfa" }, // Purple - En Proceso
];

export default function CreatedStatusChart({
  rows,
}: {
  rows: CreatedTeamMetric[];
}) {
  const total = rows.reduce(
    (acc, r) => {
      acc.A += r.statusDist.Abiertos;
      acc.C += r.statusDist.Cerrados;
      acc.E += r.statusDist["En Proceso"];
      return acc;
    },
    { A: 0, C: 0, E: 0 }
  );

  const data = [
    { name: "Abiertos", value: total.A },
    { name: "Cerrados", value: total.C },
    { name: "En Proceso", value: total.E },
  ];

  return (
    <Card>
      <Header
        title="Distribución de estatus de tickets"
        subtitle="Vista general del estado de todos los tickets"
      />
      <div className="h-80 px-6 py-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {COLORS.map((color, i) => (
                <linearGradient
                  key={i}
                  id={`gradient-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color.main} stopOpacity={1} />
                  <stop
                    offset="100%"
                    stopColor={color.light}
                    stopOpacity={0.8}
                  />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={`url(#gradient-${i})`}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            />
            <RTooltip content={<TooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
