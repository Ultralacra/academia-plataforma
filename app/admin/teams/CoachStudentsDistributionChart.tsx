"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Label,
  Tooltip as RTooltip,
} from "recharts";
import type { CoachStudent } from "./StudentsByCoachTable";

type Mode = "estado" | "fase";

export default function CoachStudentsDistributionChart({
  students,
  mode = "estado",
  onModeChange,
  coachName,
  showToggle = true,
}: {
  students: CoachStudent[];
  mode?: Mode;
  onModeChange?: (m: Mode) => void;
  coachName: string;
  showToggle?: boolean;
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
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [students, mode]);

  const total = useMemo(() => agg.reduce((a, c) => a + c.value, 0), [agg]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const fmt = useMemo(() => new Intl.NumberFormat("es-ES"), []);
  const activeIndex = pinnedIndex ?? hoverIndex;
  const INNER = 76;
  const OUTER = 96;

  useEffect(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [mode, students]);

  const COLORS = [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#06B6D4",
    "#EF4444",
    "#A78BFA",
    "#10B981",
    "#84CC16",
    "#F43F5E",
  ];

  const displayAgg = useMemo(() => {
    if (!agg.length) return [] as { name: string; value: number }[];
    const withPct = agg.map((d) => ({
      ...d,
      pct: total ? (d.value * 100) / total : 0,
    }));
    const MIN_PCT = 3;
    const MAX_LABELS = 8;
    const big = withPct.filter((d) => d.pct >= MIN_PCT).slice(0, MAX_LABELS);
    const rest = withPct.filter((d) => !big.includes(d));
    const othersTotal = rest.reduce((a, c) => a + c.value, 0);
    const result = big.map(({ name, value }) => ({ name, value }));
    if (othersTotal > 0) result.push({ name: "Otros", value: othersTotal });
    return result;
  }, [agg, total]);

  // Sin etiquetas externas para look limpio
  const RAD = Math.PI / 180;
  const renderLabel = () => null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white relative">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Distribución de alumnos de {coachName}
          </h3>
          <p className="text-sm text-gray-500">
            Vista por {{ estado: "estatus", fase: "fase" }[mode]}
          </p>
        </div>
        {showToggle && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onModeChange?.("estado")}
              className={`px-3 py-1 rounded-md border text-xs font-medium transition ${
                mode === "estado"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
              }`}
            >
              Estatus
            </button>
            <button
              onClick={() => onModeChange?.("fase")}
              className={`px-3 py-1 rounded-md border text-xs font-medium transition ${
                mode === "fase"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
              }`}
            >
              Fase
            </button>
          </div>
        )}
      </div>
      <div className="relative z-10 h-80 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>{/* defs vacíos */}</defs>
            <Pie
              data={displayAgg}
              dataKey="value"
              nameKey="name"
              innerRadius={INNER}
              outerRadius={OUTER}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              minAngle={2}
              cornerRadius={4}
              animationDuration={700}
              isAnimationActive
              labelLine={false}
              label={renderLabel}
            >
              {displayAgg.map((seg, i) => {
                const isActive = activeIndex === i;
                return (
                  <Cell
                    key={`${seg.name}-${i}`}
                    fill={
                      seg.name === "Otros"
                        ? "#cbd5e1"
                        : COLORS[i % COLORS.length]
                    }
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={isActive ? 3 : 2}
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() =>
                      setHoverIndex((prev) =>
                        pinnedIndex === null ? null : prev
                      )
                    }
                    onClick={() =>
                      setPinnedIndex((prev) => (prev === i ? null : i))
                    }
                    cursor="pointer"
                  />
                );
              })}
              {/* sin Label centrado: overlay HTML afuera */}
            </Pie>
            <RTooltip
              formatter={(value: any, name: any) => [value as any, name as any]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Overlay de Total centrado (no bloquea interacciones) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-gray-900">
              {fmt.format(total)}
            </div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Total
            </div>
          </div>
        </div>
      </div>
      {/* Leyenda compacta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-5 pb-5">
        {displayAgg.map((seg, i) => {
          const pct = total ? Math.round((seg.value * 1000) / total) / 10 : 0;
          const color =
            seg.name === "Otros" ? "#cbd5e1" : COLORS[i % COLORS.length];
          return (
            <div
              key={`${seg.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-white/70 px-3 py-2 text-xs shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
                <span
                  className="font-medium text-gray-700 truncate"
                  title={seg.name}
                >
                  {seg.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="font-semibold text-gray-900">
                  {fmt.format(seg.value)}
                </span>
                <span>({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
