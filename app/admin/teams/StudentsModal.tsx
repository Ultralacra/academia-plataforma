"use client";

import { useEffect } from "react";
import { X, User, ExternalLink } from "lucide-react";
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

export default function StudentsModal({
  open,
  onClose,
  team,
}: {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const totalFromCount =
    typeof team?.nAlumnos === "number" ? team?.nAlumnos : undefined;
  const totalFromList = team?.alumnos?.length ?? 0;
  const total = totalFromCount ?? totalFromList;

  const hasOnlyCounter =
    (team?.alumnos?.length ?? 0) === 0 && (totalFromCount ?? 0) > 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="students-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-5">
              <div>
                <h3
                  id="students-modal-title"
                  className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                >
                  {team ? `Alumnos de ${team.nombre}` : "Alumnos"}
                </h3>
                {typeof total === "number" && (
                  <p className="mt-1 text-sm text-gray-600">
                    Total:{" "}
                    <span className="font-bold text-gray-900">{total}</span>{" "}
                    alumno{total !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5 text-gray-600" />
              </motion.button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {!team ? (
                <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
                  <div className="text-5xl">🤷</div>
                  <p className="text-sm font-medium">Sin datos disponibles</p>
                </div>
              ) : team.alumnos.length === 0 ? (
                hasOnlyCounter ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
                    <p className="text-sm text-blue-900">
                      Este equipo tiene{" "}
                      <span className="font-bold">{totalFromCount}</span>{" "}
                      alumno(s), pero el listado de nombres no está disponible
                      en esta vista.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
                    <div className="text-5xl">📭</div>
                    <p className="text-sm font-medium">
                      Este equipo no tiene alumnos registrados
                    </p>
                  </div>
                )
              ) : (
                <ul className="grid grid-cols-1 gap-3">
                  {team.alumnos.map((a, i) => (
                    <motion.li
                      key={`${a.name || "alumno"}-${i}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-3 shadow-md">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {a.name || "Sin nombre"}
                          </p>
                          {a.url ? (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {a.url}
                            </a>
                          ) : (
                            <p className="mt-1 text-xs text-gray-500">
                              Sin URL
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
