"use client";

import { Search, Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  desde: string;
  hasta: string;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
};

export default function Filters({
  search,
  onSearch,
  desde,
  hasta,
  onDesde,
  onHasta,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-gray-200 bg-white"
    >
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Filtros
          </h3>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          Auto-aplicar
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12">
        {/* Search input */}
        <div className="md:col-span-6">
          <div className="relative group">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nombre, código, área o puesto…"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Month picker eliminado a solicitud */}

        {/* Date from */}
        <div className="md:col-span-3">
          <div className="relative group">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 dark:focus-within:border-blue-400">
              <Calendar className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="date"
                value={desde}
                onChange={(e) => onDesde(e.target.value)}
                className="w-full py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 ml-1">
              Desde
            </p>
          </div>
        </div>

        {/* Date to */}
        <div className="md:col-span-3">
          <div className="relative group">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 dark:focus-within:border-blue-400">
              <Calendar className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="date"
                value={hasta}
                onChange={(e) => onHasta(e.target.value)}
                className="w-full py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 ml-1">
              Hasta
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
