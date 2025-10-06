"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { motion } from "framer-motion";
import { Ticket, Users, Clock, Lock } from "lucide-react";

type ProdByCoach = {
  coach: string;
  tickets: number;
  sessions: number;
  hours: number;
};

function TooltipContent({ active, payload, label, name }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm"
    >
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-sm text-gray-600">
        {name}: <span className="font-bold text-gray-900">{p.value}</span>
      </p>
    </motion.div>
  );
}

export default function ProductivityCharts({ rows }: { rows: ProdByCoach[] }) {
  const base = rows.map((r) => ({
    x: r.coach,
    tickets: r.tickets,
    sessions: r.sessions,
    hours: r.hours,
  }));

  // Bloqueo dinámico según datos del API (ej. sessions/hours = 0)
  const allSessionsZero =
    !rows.length || rows.every((r) => (r.sessions ?? 0) === 0);
  const allHoursZero = !rows.length || rows.every((r) => (r.hours ?? 0) === 0);

  const charts = [
    {
      title: "Tickets por coach",
      dataKey: "tickets",
      name: "Tickets",
      gradient: "gTickets",
      colors: ["#3b82f6", "#8b5cf6"],
      icon: Ticket,
      bgGradient: "from-blue-50 to-purple-50",
      locked: false, // Siempre visible
    },
    {
      title: "Sesiones por coach",
      dataKey: "sessions",
      name: "Sesiones",
      gradient: "gSessions",
      colors: ["#10b981", "#14b8a6"],
      icon: Users,
      bgGradient: "from-emerald-50 to-teal-50",
      locked: allSessionsZero, // Bloqueado si no hay datos
    },
    {
      title: "Horas invertidas por coach",
      dataKey: "hours",
      name: "Horas",
      gradient: "gHours",
      colors: ["#f59e0b", "#f97316"],
      icon: Clock,
      bgGradient: "from-amber-50 to-orange-50",
      locked: allHoursZero, // Bloqueado si no hay datos
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {charts.map((chart, idx) => (
        <motion.div
          key={chart.dataKey}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
        >
          <div
            className={`border-b border-gray-200 bg-gradient-to-r ${chart.bgGradient} px-6 py-5`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg bg-gradient-to-br p-2.5 shadow-md`}
                style={{
                  backgroundImage: `linear-gradient(to bottom right, ${chart.colors[0]}, ${chart.colors[1]})`,
                }}
              >
                <chart.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{chart.title}</h3>
            </div>
          </div>

          <div className={`h-72 p-6 ${chart.locked ? "blur-sm" : ""}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={base}>
                <defs>
                  <linearGradient
                    id={chart.gradient}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={chart.colors[0]}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={chart.colors[1]}
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="x" hide />
                <YAxis
                  allowDecimals={false}
                  stroke="#6b7280"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                />
                <RTooltip
                  content={(props) => (
                    <TooltipContent {...props} name={chart.name} />
                  )}
                />
                <Bar
                  dataKey={chart.dataKey}
                  name={chart.name}
                  fill={`url(#${chart.gradient})`}
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {chart.locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 + 0.2 }}
                className="flex flex-col items-center gap-3 rounded-xl bg-white/90 px-8 py-6 shadow-xl"
              >
                <div className="rounded-full bg-gray-100 p-3">
                  <Lock className="h-6 w-6 text-gray-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">
                    Falta información
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Datos no disponibles
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
