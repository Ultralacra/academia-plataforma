"use client";

import type React from "react";

import { Users, BarChart3, FileText } from "lucide-react";
import { motion } from "framer-motion";

function KpiCard({
  icon,
  label,
  value,
  accent,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "blue" | "purple" | "green";
  index: number;
}) {
  const styles = {
    blue: {
      gradient: "from-blue-500/10 via-cyan-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
      textColor: "text-blue-700 dark:text-blue-400",
      border: "border-blue-200/50 dark:border-blue-800/50",
      glow: "shadow-blue-500/10",
    },
    purple: {
      gradient: "from-purple-500/10 via-violet-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-purple-500 to-violet-600",
      textColor: "text-purple-700 dark:text-purple-400",
      border: "border-purple-200/50 dark:border-purple-800/50",
      glow: "shadow-purple-500/10",
    },
    green: {
      gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      textColor: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200/50 dark:border-emerald-800/50",
      glow: "shadow-emerald-500/10",
    },
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-2xl border ${styles.border} bg-white dark:bg-gray-900 p-6 shadow-lg ${styles.glow} hover:shadow-xl transition-all duration-300`}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
      />

      {/* Content */}
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {label}
          </p>
          <p
            className={`text-3xl font-bold ${styles.textColor} tracking-tight`}
          >
            {typeof value === "number"
              ? new Intl.NumberFormat("es-ES").format(value)
              : value}
          </p>
        </div>

        {/* Icon with gradient background */}
        <motion.div
          whileHover={{ rotate: 5, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={`${styles.iconBg} rounded-xl p-3 shadow-lg`}
        >
          <div className="text-white">{icon}</div>
        </motion.div>
      </div>

      {/* Decorative element */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
    </motion.div>
  );
}

export default function CreatedKPIs({
  teams,
  coaches,
  tickets,
}: {
  teams: number;
  coaches: number;
  tickets: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/*  <KpiCard
        icon={<Users className="h-6 w-6" />}
        label="Equipos conformados"
        value={teams}
        accent="blue"
        index={0}
      />
      <KpiCard
        icon={<BarChart3 className="h-6 w-6" />}
        label="Coaches distintos"
        value={coaches}
        accent="purple"
        index={1}
      /> */}
      {/*    <KpiCard
        icon={<FileText className="h-6 w-6" />}
        label="Tickets totales"
        value={tickets}
        accent="green"
        index={2}
      /> */}
    </div>
  );
}
