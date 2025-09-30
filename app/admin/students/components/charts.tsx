// app/admin/students/components/charts.tsx
"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DistItem = { name: string; value: number };
type BarItem = { date: string; count: number };

const COLORS = [
  "#7C3AED",
  "#F97316",
  "#10B981",
  "#EF4444",
  "#3B82F6",
  "#EAB308",
  "#06B6D4",
  "#F43F5E",
];

/* ====== fecha dd MMM yyyy (sin puntos) ====== */
const fDate = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const cleanDots = (s: string) => s.replaceAll(".", "");
function fmtLabelDate(v?: string) {
  if (!v) return "—";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  return isNaN(d.getTime()) ? v : cleanDots(fDate.format(d));
}

function PrettyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = p?.name ?? p?.payload?.name ?? "";
  const value = typeof p?.value === "number" ? p.value : 0;
  const lab =
    typeof label === "string" && /\d{4}-\d{2}-\d{2}/.test(label)
      ? fmtLabelDate(label)
      : label;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow">
      {lab ? <div className="font-medium">{lab}</div> : null}
      <div className="text-muted-foreground">
        {name ? <span>{name}: </span> : null}
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* Agrupa en “Otros” si hay muchas categorías */
function withTopNAndOthers(data: DistItem[], topN = 8): DistItem[] {
  if ((data?.length ?? 0) <= topN) return data;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const others = tail.reduce((acc, x) => acc + (x.value ?? 0), 0);
  return [...head, { name: "Otros", value: others }];
}

/* ───────────────────── Skeletons ───────────────────── */
export function PieCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("min-h-[360px] overflow-hidden", className)}>
      <CardHeader className="pb-0">
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="flex h-full flex-col pt-2">
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-40 w-40 rounded-full" />
        </div>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border bg-card px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BarCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("min-h-[360px] overflow-hidden", className)}>
      <CardHeader className="pb-0">
        <Skeleton className="h-4 w-52" />
      </CardHeader>
      <CardContent className="h-full pt-2">
        <div className="h-[280px] w-full flex items-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[20vh] w-4 rounded-sm" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────── Pie (donut) ───────────────────── */
export function PieCard({
  title,
  data,
  className,
  topN = 8,
}: {
  title: string;
  data: DistItem[];
  className?: string;
  topN?: number;
}) {
  const compact = withTopNAndOthers(data ?? [], topN);
  const total = compact.reduce((a, b) => a + (b?.value ?? 0), 0);
  const withPerc = compact.map((d) => ({
    ...d,
    perc: total ? Math.round((d.value / total) * 100) : 0,
  }));

  return (
    <Card className={cn("min-h-[360px] overflow-hidden", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>

      {/* flex-col + overflow-hidden para que la leyenda scrollee dentro */}
      <CardContent className="flex h-full flex-col pt-2 overflow-hidden">
        {/* Altura fija del gráfico para reservar espacio a la leyenda */}
        <div className="relative h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
              <defs>
                {COLORS.map((c, i) => (
                  <linearGradient
                    id={`g${i}`}
                    key={i}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={c} stopOpacity={1} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.85} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                dataKey="value"
                data={withPerc}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={90}
                stroke="#e5e7eb"
                strokeWidth={1}
                paddingAngle={2}
                isAnimationActive
              >
                {withPerc.map((_, idx) => (
                  <Cell key={idx} fill={`url(#g${idx % COLORS.length})`} />
                ))}
              </Pie>
              <RTooltip content={<PrettyTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* centro del donut */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold leading-none">{total}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Total
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda: ocupa el resto y scrollea internamente */}
        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
            {withPerc.map((d, idx) => (
              <li
                key={`${d.name}-${idx}`}
                className="flex items-center justify-between rounded-md border bg-card px-2.5 py-1.5"
                title={`${d.name} — ${d.value} (${d.perc}%)`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full shrink-0"
                    style={{ background: COLORS[idx % COLORS.length] }}
                  />
                  <span className="truncate text-sm">{d.name || "—"}</span>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {d.value} <span className="opacity-80">({d.perc}%)</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────── Bar ───────────────────── */
export function BarCard({
  title,
  data,
  className,
}: {
  title: string;
  data: BarItem[];
  className?: string;
}) {
  return (
    <Card className={cn("min-h-[360px] overflow-hidden", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 12, bottom: 16, left: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtLabelDate}
              minTickGap={12}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={30}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <RTooltip
              content={<PrettyTooltip />}
              labelFormatter={(v) => fmtLabelDate(String(v))}
            />
            <Bar
              dataKey="count"
              name="Clientes"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
