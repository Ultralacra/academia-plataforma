"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
} from "recharts";

export default function TicketsByStudentDonut({
  data,
  title = "TICKETS POR ALUMNO",
  subtitle = "Top alumnos por volumen de tickets",
}: {
  data: { name: string; count: number }[];
  title?: string;
  subtitle?: string;
}) {
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
    "#f97316",
    "#14b8a6",
    "#8b5cf6",
  ];

  const agg = useMemo(() => {
    const arr = (data || []).map((d) => ({
      name: d.name || "Sin Alumno",
      value: Number(d.count || 0) || 0,
    }));
    return arr.sort((a, b) => b.value - a.value);
  }, [data]);

  const total = useMemo(() => agg.reduce((a, c) => a + c.value, 0), [agg]);
  const fmt = useMemo(() => new Intl.NumberFormat("es-ES"), []);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const activeIndex = pinnedIndex ?? hoverIndex;
  const INNER = 76;
  const OUTER = 96;

  useEffect(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [data]);

  // Agrupar pequeños en "Otros" (>=3% y hasta 8 etiquetas)
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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white relative">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="relative z-10 h-80 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
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
              isAnimationActive
              labelLine={false}
            >
              {displayAgg.map((seg, i) => (
                <Cell
                  key={`${seg.name}-${i}`}
                  fill={
                    seg.name === "Otros" ? "#cbd5e1" : COLORS[i % COLORS.length]
                  }
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={activeIndex === i ? 3 : 2}
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
              ))}
            </Pie>
            <RTooltip
              formatter={(value: any, name: any) => [value as any, name as any]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Overlay de Total centrado */}
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
