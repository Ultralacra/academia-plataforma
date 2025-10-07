"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingOverlay({
  active,
  label = "Cargando…",
  progress, // 0..100 (opcional). Si no lo pasas, usa spinner indeterminado
  align = "top", // "top" | "center"
}: {
  active: boolean;
  label?: string;
  progress?: number;
  align?: "top" | "center";
}) {
  const hasPct =
    typeof progress === "number" &&
    isFinite(progress) &&
    progress >= 0 &&
    progress <= 100;
  const pct = hasPct ? Math.round(progress) : undefined;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-50 bg-white/70 dark:bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className={
              "flex w-full h-full justify-center " +
              (align === "top" ? "items-start pt-12 md:pt-16" : "items-center")
            }
          >
            <motion.div
              className="flex flex-col items-center gap-3 rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/90 dark:bg-gray-900/80 px-5 py-4 shadow-lg"
              initial={{ y: align === "top" ? -10 : 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
            >
              {/* INDTERMINATE: spinner circular clásico */}
              {!hasPct && (
                <div
                  aria-label="Cargando"
                  className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400 animate-spin"
                />
              )}

              {/* DETERMINATE: progreso circular con conic-gradient */}
              {hasPct && (
                <div className="relative h-16 w-16">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(rgb(37 99 235) ${pct}%, transparent 0)`,
                    }}
                  />
                  <div className="absolute inset-[6px] rounded-full bg-white dark:bg-gray-900" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {pct}%
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {label}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
