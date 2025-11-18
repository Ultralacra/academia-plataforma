"use client";

import { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";

export type SessionsOverviewItem = { estado: string; count: number };
export type SessionsTrendItem = { day: string; total: number };
export type SessionsByCoachItem = {
  coach_codigo: string;
  coach_nombre: string;
  total: number;
  requested: string;
  offered: string;
  approved: string;
  accepted: string;
  completed: string;
  avg_seconds: string | null;
  avg_human: string;
};
export type SessionsByAlumnoItem = {
  alumno_codigo: string;
  alumno_nombre: string | null;
  total: number;
  requested: string;
  offered: string;
  approved: string;
  accepted: string;
  completed: string;
};
export type SessionsConversion = {
  requested: number;
  offered: number;
  approved: number;
  accepted: number;
  completed: number;
  total: number;
  pct: { approved: number; accepted: number; completed: number };
};
export type SessionsTopCoach = {
  coach_codigo: string;
  coach_nombre: string;
  accepted: string;
  completed: string;
  total: number;
};

const palette = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

function k(n: number | string | null | undefined) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function fmtPct(x: number) {
  return `${Math.round((x || 0) * 100)}%`;
}

function title(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const chartCfg: ChartConfig = {
  total: { label: "Sesiones", color: "var(--chart-1)" },
};

export default memo(function SessionsMetrics({
  overview,
  trends,
  byCoach,
  byAlumno,
  conversion,
  topCoaches,
  titleText = "Métricas de sesiones",
}: {
  overview?: SessionsOverviewItem[];
  trends?: SessionsTrendItem[];
  byCoach?: SessionsByCoachItem[];
  byAlumno?: SessionsByAlumnoItem[];
  conversion?: SessionsConversion;
  topCoaches?: SessionsTopCoach[];
  titleText?: string;
}) {
  const ov = Array.isArray(overview) ? overview : [];
  const tr = Array.isArray(trends) ? trends : [];
  const bc = Array.isArray(byCoach) ? byCoach : [];
  const ba = Array.isArray(byAlumno) ? byAlumno : [];
  const cv = conversion ?? {
    requested: 0,
    offered: 0,
    approved: 0,
    accepted: 0,
    completed: 0,
    total: 0,
    pct: { approved: 0, accepted: 0, completed: 0 },
  };
  const top = Array.isArray(topCoaches) ? topCoaches : [];

  const ovTotal = useMemo(() => ov.reduce((a, c) => a + k(c.count), 0), [ov]);
  const trendData = useMemo(
    () =>
      tr.map((d) => ({
        label: (d.day || "").slice(0, 10),
        total: k(d.total),
      })),
    [tr]
  );

  const chartHeight = Math.max(240, trendData.length * 26 + 60);
  const yAxisWidth = 80;

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="text-base font-bold text-gray-900">{titleText}</div>
        <div className="text-sm text-gray-500">Resumen y tendencias</div>
      </div>
      <div className="p-5 space-y-6">
        {/* KPIs resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi label="Total" value={ovTotal} />
          <Kpi label="Solicitadas" value={cv.requested} />
          <Kpi label="Ofrecidas" value={cv.offered} />
          <Kpi
            label="Aprobadas"
            value={cv.approved}
            subtitle={fmtPct(cv.pct.approved)}
          />
          <Kpi
            label="Completadas"
            value={cv.completed}
            subtitle={fmtPct(cv.pct.completed)}
          />
        </div>

        {/* Distribución por estado */}
        <Card className="border-neutral-200/70">
          <CardContent className="pt-4">
            <div className="text-sm font-medium mb-2">
              Distribución por estado
            </div>
            {ov.length === 0 ? (
              <div className="text-sm text-neutral-500">Sin datos.</div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {ov.map((s, i) => (
                  <li
                    key={`ov-${i}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 bg-white"
                  >
                    <span className="text-sm text-neutral-700">
                      {title(String(s.estado || "")).replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-sm">{k(s.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Tendencia por día */}
        <Card className="border-neutral-200/70">
          <CardContent className="pt-4">
            <div className="text-sm font-medium mb-2">Tendencia por día</div>
            {trendData.length === 0 ? (
              <div className="text-sm text-neutral-500">Sin datos.</div>
            ) : (
              <ChartContainer
                config={chartCfg}
                className="w-full"
                style={{ height: chartHeight }}
              >
                <BarChart
                  accessibilityLayer
                  data={trendData}
                  layout="vertical"
                  barSize={14}
                  barCategoryGap={8}
                  margin={{ left: 0, right: 12, top: 8, bottom: 8 }}
                >
                  <XAxis type="number" dataKey="total" hide />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    width={yAxisWidth}
                    interval={0}
                    tick={{ fontSize: 12, fill: "#374151" }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={(p) => (
                      <ChartTooltipContent
                        {...(p as any)}
                        hideLabel={false}
                        label={"Sesiones en el día:"}
                      />
                    )}
                  />
                  <Bar dataKey="total" radius={6}>
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(v: any) => String(v)}
                    />
                    {trendData.map((_, i) => (
                      <Cell key={`t-${i}`} fill={palette[i % palette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Listados compactos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MiniTable
            title="Por coach"
            rows={bc.map((r) => ({
              left: r.coach_nombre || r.coach_codigo,
              right: `${r.total}`,
              sub: `aprobadas: ${r.approved} • completadas: ${r.completed}${
                r.avg_human ? ` • promedio: ${r.avg_human}` : ""
              }`,
            }))}
          />
          <MiniTable
            title="Por alumno"
            rows={ba.map((r) => ({
              left: r.alumno_nombre || r.alumno_codigo,
              right: `${r.total}`,
              sub: `aprobadas: ${r.approved} • completadas: ${r.completed}`,
            }))}
          />
        </div>

        {/* Top coaches */}
        <Card className="border-neutral-200/70">
          <CardContent className="pt-4">
            <div className="text-sm font-medium mb-2">Mejores coaches</div>
            {top.length === 0 ? (
              <div className="text-sm text-neutral-500">Sin datos.</div>
            ) : (
              <ul className="divide-y">
                {top.map((t, i) => (
                  <li
                    key={`tc-${i}`}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {t.coach_nombre || t.coach_codigo}
                      </div>
                      <div className="text-xs text-neutral-500">
                        aceptadas: {t.accepted} • completadas: {t.completed}
                      </div>
                    </div>
                    <div className="font-mono text-sm">{t.total}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

function Kpi({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {subtitle ? (
        <div className="text-[11px] text-neutral-500">{subtitle}</div>
      ) : null}
    </div>
  );
}

function MiniTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ left: string; right: string; sub?: string }>;
}) {
  return (
    <Card className="border-neutral-200/70">
      <CardContent className="pt-4">
        <div className="text-sm font-medium mb-2">{title}</div>
        {rows.length === 0 ? (
          <div className="text-sm text-neutral-500">Sin datos.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((r, i) => (
              <li
                key={`r-${i}`}
                className="flex items-center justify-between py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.left}</div>
                  {r.sub ? (
                    <div className="text-xs text-neutral-500">{r.sub}</div>
                  ) : null}
                </div>
                <div className="font-mono text-sm">{r.right}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
