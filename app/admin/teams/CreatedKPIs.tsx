"use client";

import type React from "react";

import { Users, BarChart3, FileText } from "lucide-react";
import { motion } from "framer-motion";

function KpiCard({
  icon,
  label,
  value,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6"
    >
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">
            {typeof value === "number"
              ? new Intl.NumberFormat("es-ES").format(value)
              : value}
          </p>
        </div>
        <motion.div
          whileHover={{ rotate: 5, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="rounded-xl p-3 bg-gray-100"
        >
          <div className="text-gray-400">{icon}</div>
        </motion.div>
      </div>
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
