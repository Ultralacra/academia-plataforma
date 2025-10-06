"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { formatDuration } from "./format";

type CoachAgg = {
  name: string;
  puesto?: string | null;
  area?: string | null;
  studentsTotal: number;
  studentsActive: number;
  studentsInactive: number;
  studentsPaused: number;
  tickets: number;
  avgResponseMin: number;
  avgResolutionMin: number;
  sessions: number;
  hours: number;
  phaseCounts: Record<"F1" | "F2" | "F3" | "F4" | "F5", number>;
  avgPhaseDays: Record<"F1" | "F2" | "F3" | "F4" | "F5", number>;
};

function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return new Intl.NumberFormat("es-ES").format(n);
}

export default function CoachTable({ rows = [] }: { rows?: CoachAgg[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Métricas por coach
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Estudiantes, tickets, sesiones y tiempos promedio
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm text-left text-[11px] uppercase tracking-wide">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Coach
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Puesto
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Área
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Alumnos
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Activos
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Pausa
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Tickets
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Resp. prom.
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Resol. prom.
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Sesiones
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                Horas
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {rows.map((r, i) => {
                const hasTickets = r.tickets && r.tickets > 0;
                const hasResponse =
                  isFinite(r.avgResponseMin) && r.avgResponseMin > 0;
                const hasResolution =
                  isFinite(r.avgResolutionMin) && r.avgResolutionMin > 0;
                const hasSessions = r.sessions && r.sessions > 0;
                const hasHours = r.hours && r.hours > 0;

                return (
                  <motion.tr
                    key={`${r.name}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {r.name}
                    </td>
                    <td className="px-4 py-3">
                      {r.puesto ? (
                        <span className="text-gray-600 dark:text-gray-400">
                          {r.puesto}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                          Sin datos
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.area ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                          {r.area}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                          Sin área
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.studentsTotal > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 px-3 py-1 text-sm font-bold text-white shadow-sm">
                          {formatNumber(r.studentsTotal)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <AlertCircle className="h-3 w-3" />
                          Sin alumnos
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.studentsActive > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatNumber(r.studentsActive)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.studentsPaused > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {formatNumber(r.studentsPaused)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasTickets ? (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(r.tickets)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <AlertCircle className="h-3 w-3" />
                          Sin actividad
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasResponse ? (
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                          {formatDuration(r.avgResponseMin)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          No registrado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasResolution ? (
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                          {formatDuration(r.avgResolutionMin)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          No registrado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasSessions ? (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(r.sessions)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                          Sin sesiones
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasHours ? (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(r.hours)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                          Sin horas
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  colSpan={11}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-2xl">👨‍🏫</span>
                    </div>
                    <p className="font-medium">Sin datos de coaches</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
