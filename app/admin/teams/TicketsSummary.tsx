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

const ticketColor = "text-gray-900";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl bg-white border border-gray-100"
    >
      <div className="border-b border-gray-100 px-6 py-5">
        <h3 className="text-lg font-semibold text-neutral-900">
          Resumen de tickets
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3 bg-gray-100">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Prom. respuesta</p>
              <p className="text-xl font-semibold text-gray-900">
                {hasResponseData ? formatDuration(totals.avgResponseMin!) : "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3 bg-gray-100">
              <CheckCircle2 className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Prom. resolución</p>
              <p className="text-xl font-semibold text-gray-900">
                {totals.avgResolutionMin
                  ? formatDuration(totals.avgResolutionMin)
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
