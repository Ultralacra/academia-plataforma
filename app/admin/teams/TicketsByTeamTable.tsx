"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

/** Forma exacta de cada item proveniente del API (teams.ticketsByTeam) */
export type TicketsByTeamApiRow = {
  etiqueta: string; // "Equipo 5"
  team_signature: string; // ID(s) del equipo
  miembros: string; // "Diego, Johan, ..."
  clientes: string; // "CXA-118,CXA-131,..."
  tickets_creados: number;
  tickets_resueltos: number;
  horas_promedio_resolucion: number; // horas (número)
  tasa_resolucion: number; // 0..1
};

type SortKey =
  | "equipo"
  | "integrantes"
  | "tickets_creados"
  | "tickets_resueltos"
  | "tasa_resolucion"
  | "horas_promedio_resolucion";

export default function TicketsByTeamTable({
  rows,
  loading,
}: {
  rows: TicketsByTeamApiRow[];
  loading?: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "tickets_creados",
    dir: "desc",
  });

  const data = useMemo(() => {
    // Normalizamos los datos para la tabla
    const normalized = (rows ?? []).map((r) => {
      const miembrosList =
        r.miembros
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      const integrantes = miembrosList.length;

      return {
        equipo: r.etiqueta,
        integrantes, // cantidad (número)
        miembrosStr: miembrosList.join(", "), // string para mostrar en tabla
        tickets_creados: r.tickets_creados ?? 0,
        tickets_resueltos: r.tickets_resueltos ?? 0,
        tasa_resolucion: r.tasa_resolucion ?? 0,
        horas_promedio_resolucion: r.horas_promedio_resolucion ?? 0,
        team_signature: r.team_signature,
      };
    });

    // Ordenamiento
    const arr = [...normalized];
    arr.sort((a, b) => {
      const va = a[sort.key] as any;
      const vb = b[sort.key] as any;
      if (typeof va === "number" && typeof vb === "number") {
        return sort.dir === "asc" ? va - vb : vb - va;
      }
      return sort.dir === "asc"
        ? String(va ?? "").localeCompare(String(vb ?? ""))
        : String(vb ?? "").localeCompare(String(va ?? ""));
    });
    return arr;
  }, [rows, sort]);

  const headerBtn = (label: string, key: SortKey) => {
    const active = sort.key === key;
    return (
      <button
        className={`group flex items-center gap-2 font-semibold transition-colors ${
          active
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
        onClick={() =>
          setSort((s) =>
            s.key === key
              ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
              : { key, dir: "asc" }
          )
        }
        title="Ordenar"
      >
        <span>{label}</span>
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    );
  };

  const nf = (n: number, digits = 0) =>
    typeof n === "number" && isFinite(n)
      ? n.toLocaleString("es-ES", { maximumFractionDigits: digits })
      : "—";

  const pf = (v: number, digits = 2) =>
    typeof v === "number" && isFinite(v)
      ? `${(v * 100).toLocaleString("es-ES", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })}%`
      : "—";

  const hf = (n: number) =>
    typeof n === "number" && isFinite(n)
      ? n.toLocaleString("es-ES", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";

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
            Tickets por equipo
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Equipo, integrantes, tickets y métricas de resolución
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs uppercase tracking-wide">
              <th className="px-4 py-3">{headerBtn("Equipo", "equipo")}</th>
              <th className="px-4 py-3">
                {headerBtn("Integrantes", "integrantes")}
              </th>
              <th className="px-4 py-3">Miembros</th>
              <th className="px-4 py-3">
                {headerBtn("Tickets creados", "tickets_creados")}
              </th>
              <th className="px-4 py-3">
                {headerBtn("Tickets resueltos", "tickets_resueltos")}
              </th>
              <th className="px-4 py-3">
                {headerBtn("Tasa de resolución", "tasa_resolucion")}
              </th>
              <th className="px-4 py-3">
                {headerBtn(
                  "Horas prom. resolución",
                  "horas_promedio_resolucion"
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {data.map((r, idx) => (
                <motion.tr
                  key={`${r.team_signature}-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {r.equipo || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {nf(r.integrantes)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {/* Lista simple separada por comas; si prefieres chips, aquí puedes mapear a badges */}
                    {r.miembrosStr || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {nf(r.tickets_creados)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {nf(r.tickets_resueltos)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {pf(r.tasa_resolucion, 2)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {hf(r.horas_promedio_resolucion)}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>

            {data.length === 0 && !loading && (
              <tr>
                <td
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  colSpan={7}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-2xl">📭</span>
                    </div>
                    <p className="font-medium">No hay datos para mostrar</p>
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
