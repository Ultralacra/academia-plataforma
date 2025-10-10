"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  title = "ALUMNOS POR FASE",
  aggData,
  details,
}: {
  students: StudentRow[];
  coachName: string;
  title?: string;
  aggData?: { name: string; value: number }[];
  details?: { name: string; value: number; students: string[] }[];
}) {
  const agg = useMemo(() => {
    if (Array.isArray(aggData) && aggData.length) {
      return [...aggData].sort((a, b) => b.value - a.value);
    }
    const map = new Map<string, number>();
    for (const s of students) {
      const raw = (s as any).stage ?? (s as any).etapa;
      const key = raw && String(raw).trim() ? String(raw).trim() : "Sin fase";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [students, aggData]);

  const COLORS = [
    "#6366F1", // indigo-500
    "#22C55E", // green-500
    "#F59E0B", // amber-500
    "#06B6D4", // cyan-500
    "#EF4444", // red-500
    "#A78BFA", // violet-400
    "#10B981", // emerald-500
    "#84CC16", // lime-500
    "#F43F5E", // rose-500
  ];
  const total = useMemo(() => agg.reduce((a, c) => a + c.value, 0), [agg]);
  const fmt = useMemo(() => new Intl.NumberFormat("es-ES"), []);
  const INNER = 76;
  const OUTER = 96;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const activeIndex = pinnedIndex ?? hoverIndex;
  useEffect(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [students]);
  const renderLabel = () => null;
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

  const norm = (s: string) => (s ?? "").toString().trim().toLowerCase();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white relative">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Alumnos de {coachName}</p>
        </div>
      </div>

      <div className="relative z-10 h-80 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs />
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
              label={renderLabel}
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
                    setHoverIndex(pinnedIndex === null ? null : hoverIndex)
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

      <div className="px-5 pb-5">
        <Accordion type="single" collapsible>
          {displayAgg.map((seg, i) => {
            const pct = total ? Math.round((seg.value * 1000) / total) / 10 : 0;
            const color =
              seg.name === "Otros" ? "#cbd5e1" : COLORS[i % COLORS.length];
            const det = details?.find((d) => norm(d.name) === norm(seg.name));
            const studentsList =
              seg.name === "Otros" ? [] : det?.students ?? [];
            return (
              <AccordionItem key={`${seg.name}-${i}`} value={`item-${i}`}>
                <AccordionTrigger className="px-3">
                  <div className="flex w-full items-center justify-between gap-3">
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
                </AccordionTrigger>
                <AccordionContent>
                  {studentsList.length > 0 ? (
                    <ul className="ml-6 list-disc space-y-1 text-sm text-gray-700">
                      {studentsList.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 px-3">
                      Sin alumnos listados.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
