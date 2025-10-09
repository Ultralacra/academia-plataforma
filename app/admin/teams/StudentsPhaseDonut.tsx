"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Label,
} from "recharts";
import { motion } from "framer-motion";

type StudentRow = {
  id: number | string;
  name: string;
  code: string | null;
  state: string | null;
  stage: string | null;
  ticketsCount?: number | null;
};

export default function StudentsPhaseDonut({
  students,
  coachName,
  title = "Distribución por fase",
}: {
  students: StudentRow[];
  coachName: string;
  title?: string;
}) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students) {
      const raw = (s as any).stage ?? (s as any).etapa;
      const key = raw && String(raw).trim() ? String(raw).trim() : "Sin fase";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [students]);

  const COLORS = [
    "#ef4444",
    "#3b82f6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#14b8a6",
    "#f43f5e",
    "#84cc16",
  ];

  const total = data.reduce((a, c) => a + c.value, 0);

  function TooltipContent({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const value = p?.value ?? 0;
    const pct = total ? Math.round((value * 1000) / total) / 10 : 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm shadow-xl"
      >
        <div className="font-semibold text-gray-900">{p?.name}</div>
        <div className="text-gray-600">
          {value} alumnos • {pct}%
        </div>
      </motion.div>
    );
  }

  const renderLabel = (props: any) => {
    const { x, y, name, value, percent } = props;
    const pct = Math.round(percent * 1000) / 10;
    return (
      <text x={x} y={y} fill="#6b7280" fontSize={11} textAnchor="middle">
        {`${value} (${pct}%)`}
      </text>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_30%_20%,#bfdbfe,transparent_60%),radial-gradient(circle_at_80%_70%,#ddd6fe,transparent_55%)]" />

      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Alumnos de {coachName}</p>
        </div>
      </div>

      <div className="h-80 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {COLORS.map((c, i) => (
                <linearGradient
                  key={i}
                  id={`ph-${i}`}
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
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={120}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              cornerRadius={6}
              isAnimationActive
              labelLine
              label={renderLabel}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={`url(#ph-${i})`}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={2}
                />
              ))}
              <Label
                position="center"
                content={() => (
                  <g>
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      <tspan fontSize="28" fontWeight="700" fill="#111827">
                        {total}
                      </tspan>
                      <tspan
                        x={0}
                        dy="18"
                        fontSize="10"
                        fill="#6b7280"
                        letterSpacing=".08em"
                      >
                        TOTAL
                      </tspan>
                    </text>
                  </g>
                )}
              />
            </Pie>
            <RTooltip content={<TooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2 px-5 pb-5">
        {data.map((seg, i) => (
          <div
            key={seg.name}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs shadow-sm"
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
