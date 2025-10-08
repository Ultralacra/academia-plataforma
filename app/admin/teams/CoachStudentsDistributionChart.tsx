"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
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
    "#2563eb",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#dc2626",
    "#0891b2",
    "#4f46e5",
    "#65a30d",
    "#be185d",
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

  const total = agg.reduce((a, c) => a + c.value, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_30%_20%,#bfdbfe,transparent_60%),radial-gradient(circle_at_80%_70%,#ddd6fe,transparent_55%)]" />
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
      <div className="h-80 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {COLORS.map((c, i) => (
                <linearGradient
                  key={i}
                  id={`grad-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={agg}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={120}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              cornerRadius={6}
              animationDuration={900}
              isAnimationActive
            >
              {agg.map((_, i) => (
                <Cell
                  key={i}
                  fill={`url(#grad-${i})`}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <RTooltip content={<TooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center text-center">
            <span className="text-xl font-bold text-gray-900 leading-none">
              {total}
            </span>
            <span className="text-[11px] tracking-wide text-gray-500 font-medium uppercase">
              Alumnos
            </span>
          </div>
        </div>
      </div>
      {/* Custom legend */}
      <div className="flex flex-wrap gap-2 px-5 pb-5">
        {agg.map((seg, i) => (
          <div
            key={seg.name}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 backdrop-blur px-3 py-1 text-xs shadow-sm hover:shadow transition"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="font-medium text-gray-700">{seg.name}</span>
            <span className="text-gray-400">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
