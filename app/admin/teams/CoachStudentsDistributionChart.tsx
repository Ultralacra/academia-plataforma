"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import type { CoachStudent } from "./StudentsByCoachTable";

type Mode = "estado" | "fase";

export default function CoachStudentsDistributionChart({
  students,
  mode,
  onModeChange,
  coachName,
}: {
  students: CoachStudent[];
  mode: Mode;
  onModeChange: (m: Mode) => void;
  coachName: string;
}) {
  const agg = useMemo(() => {
    const map = new Map<string, number>();
    const keyField = mode === "estado" ? "state" : "stage";
    for (const s of students) {
      const raw = (s as any)[keyField];
      const key =
        raw && typeof raw === "string" && raw.trim() ? raw.trim() : "Sin dato";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return entries.map(([name, value]) => ({ name, value }));
  }, [students, mode]);

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#6366f1",
    "#84cc16",
    "#ec4899",
  ];

  function TooltipContent({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const total = agg.reduce((a, c) => a + c.value, 0);
    const value = p.value ?? 0;
    const pct = total ? Math.round((value * 1000) / total) / 10 : 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-gray-200 bg-white/90 backdrop-blur px-4 py-3 text-sm shadow-xl"
      >
        <p className="font-semibold mb-1">{p.name}</p>
        <div className="flex items-center gap-2 text-gray-600">
          <span>{value} alumnos</span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            {pct}%
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Distribución de alumnos de {coachName}
          </h3>
          <p className="text-sm text-gray-500">
            Vista por {{ estado: "estatus", fase: "fase" }[mode]}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => onModeChange("estado")}
            className={`px-3 py-1 rounded-md border text-xs font-medium transition ${
              mode === "estado"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
            }`}
          >
            Estatus
          </button>
          <button
            onClick={() => onModeChange("fase")}
            className={`px-3 py-1 rounded-md border text-xs font-medium transition ${
              mode === "fase"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
            }`}
          >
            Fase
          </button>
        </div>
      </div>
      <div className="h-80 px-4 py-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={agg}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={115}
              paddingAngle={3}
            >
              {agg.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
            <RTooltip content={<TooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
