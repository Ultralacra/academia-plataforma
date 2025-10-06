"use client";

import { motion } from "framer-motion";
import {
  Ticket,
  Clock,
  CheckCircle2,
  Calendar,
  TrendingUp,
} from "lucide-react";

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

const nf = (n: number) =>
  typeof n === "number" ? n.toLocaleString("es-ES") : String(n ?? "0");

export default function TicketsSummary({
  totals,
  per,
}: {
  totals: {
    ticketsTotal: number;
    avgResponseMin: number | null;
    avgResolutionMin: number | null;
  };
  per: { day: number; week?: number; month: number };
}) {
  const hasResponseData =
    totals.avgResponseMin !== null &&
    totals.avgResponseMin !== undefined &&
    totals.avgResponseMin > 0;

  const cards = [
    {
      icon: Ticket,
      label: "Tickets totales",
      value: nf(totals.ticketsTotal),
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      disabled: false,
    },
    {
      icon: Clock,
      label: "Respuesta promedio",
      value: hasResponseData
        ? formatDuration(totals.avgResponseMin)
        : "Sin datos",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      disabled: !hasResponseData,
    },
    {
      icon: CheckCircle2,
      label: "Resolución promedio",
      value: formatDuration(totals.avgResolutionMin),
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      disabled: false,
    },
    {
      icon: Calendar,
      label: "Hoy",
      value: nf(per.day),
      gradient: "from-orange-500 to-amber-500",
      bgGradient: "from-orange-50 to-amber-50",
      disabled: false,
    },
    {
      icon: TrendingUp,
      label: "Últimos 30 días",
      value: nf(per.month),
      gradient: "from-indigo-500 to-blue-500",
      bgGradient: "from-indigo-50 to-blue-50",
      disabled: false,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
    >
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-5">
        <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Resumen de tickets
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Totales, tiempos de respuesta y actividad por periodo
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-5">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={!card.disabled ? { scale: 1.05, y: -5 } : {}}
            className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${
              card.bgGradient
            } p-5 shadow-md transition-all ${
              card.disabled
                ? "opacity-50 backdrop-blur-[1px] pointer-events-none"
                : "hover:shadow-xl"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {card.label}
                </div>
                <div
                  className={`mt-2 text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}
                >
                  {card.value}
                </div>
              </div>
              <div
                className={`rounded-lg bg-gradient-to-br ${card.gradient} p-2.5 shadow-md`}
              >
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div
              className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${card.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
