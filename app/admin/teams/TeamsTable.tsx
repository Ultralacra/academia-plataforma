"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  UserRoundSearch,
  ArrowUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Team = {
  id: string;
  codigo: string;
  nombre: string;
  puesto?: string | null;
  area?: string | null;
  nAlumnos?: number;
  alumnos: Array<{ name?: string; url?: string }>;
};

type Props = {
  data: Team[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (n: number) => void;
  onOpenAlumnos: (t: Team) => void;
  loading?: boolean;
};

export default function TeamsTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onOpenAlumnos,
  loading,
}: Props) {
  const [sort, setSort] = useState<{
    key: keyof Team | "nAlumnos";
    dir: "asc" | "desc";
  }>({
    key: "nombre",
    dir: "asc",
  });

  const sorted = useMemo(() => {
    const arr = [...data];
    const key = sort.key;
    arr.sort((a, b) => {
      const va =
        key === "nAlumnos"
          ? a.nAlumnos ?? a.alumnos.length
          : (a as any)[key] ?? "";
      const vb =
        key === "nAlumnos"
          ? b.nAlumnos ?? b.alumnos.length
          : (b as any)[key] ?? "";
      if (typeof va === "number" && typeof vb === "number")
        return sort.dir === "asc" ? va - vb : vb - va;
      return sort.dir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [data, sort]);

  const headerBtn = (label: string, key: keyof Team | "nAlumnos") => {
    const active = sort.key === key;
    return (
      <button
        className={`group flex items-center gap-2 font-semibold transition-colors ${
          active ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
        }`}
        onClick={() =>
          setSort((s) =>
            s.key === key
              ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
              : { key, dir: "asc" }
          )
        }
      >
        <span>{label}</span>
        <ArrowUpDown
          className={`h-3.5 w-3.5 transition-transform ${
            active && sort.dir === "desc" ? "rotate-180" : ""
          }`}
        />
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-5">
        <div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Listado de equipos
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Resultados según filtros aplicados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Filas por página
          </label>
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100">
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">
                {headerBtn("Código", "codigo")}
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">
                {headerBtn("Nombre", "nombre")}
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">
                {headerBtn("Puesto", "puesto")}
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">
                {headerBtn("Área", "area")}
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">
                {headerBtn("# Alumnos", "nAlumnos")}
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <AnimatePresence mode="popLayout">
              {sorted.map((t, idx) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="group transition-colors hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50"
                >
                  <td className="px-6 py-4">
                    <code className="rounded-md bg-gray-100 px-2 py-1 text-xs font-mono font-semibold text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {t.codigo}
                    </code>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {t.nombre}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {t.puesto ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                      {t.area ?? "Sin área"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 px-3 py-1 text-sm font-bold text-white shadow-md">
                      {t.nAlumnos ?? t.alumnos.length}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onOpenAlumnos(t)}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg"
                    >
                      <UserRoundSearch className="h-4 w-4" />
                      Ver alumnos
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {sorted.length === 0 && !loading && (
              <tr>
                <td
                  className="px-6 py-12 text-center text-gray-500"
                  colSpan={6}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-4xl">📭</div>
                    <p className="font-medium">
                      No hay datos para los filtros seleccionados
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
        <p className="text-sm text-gray-600">
          Total: <span className="font-bold text-gray-900">{total}</span>{" "}
          equipos
        </p>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </motion.button>
          <span className="text-sm text-gray-700">
            Página <span className="font-bold text-blue-600">{page}</span> de{" "}
            <span className="font-bold text-gray-900">{totalPages}</span>
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
