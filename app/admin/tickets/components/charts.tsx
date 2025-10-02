"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Ticket } from "@/lib/data-service";

/* ====== utils para fechas y tooltip ====== */
const dtFull = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function parseYYYYMMDD(d?: string) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

// "YYYY-MM-DD" a partir de Date
function yyyymmdd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Rellena una ventana de N días con 0s para días sin datos
function densifyDays(
  points: { date: string; count: number }[],
  windowDays = 14
) {
  if (!points?.length) return [];
  // tomamos el día más reciente de la serie
  const maxKey = points.reduce(
    (acc, p) => (p.date > acc ? p.date : acc),
    points[0].date
  );
  const max = parseYYYYMMDD(maxKey) ?? new Date(maxKey);
  const start = new Date(max);
  start.setDate(start.getDate() - (windowDays - 1));

  const map = new Map(points.map((p) => [p.date, Number(p.count) || 0]));
  const out: { date: string; count: number }[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = yyyymmdd(d);
    out.push({ date: k, count: map.get(k) ?? 0 });
  }
  return out;
}

/* ====== componente ====== */
export function Charts({
  ticketsPorDia,
  tickets,
}: {
  ticketsPorDia: { date: string; count: number }[];
  tickets: Ticket[];
}) {
  // Serie densificada para que el área se pinte aunque solo haya 1 día con datos
  const base = densifyDays(ticketsPorDia ?? [], 14);

  // media móvil 7 días sobre la serie densificada
  const seriesMA = (() => {
    const out: { date: string; count: number; ma7: number | null }[] = [];
    let acc = 0;
    const buf: number[] = [];
    base.forEach((p) => {
      const v = p.count ?? 0;
      buf.push(v);
      acc += v;
      if (buf.length > 7) acc -= buf.shift()!;
      const ma = buf.length === 7 ? Math.round((acc / 7) * 100) / 100 : null;
      out.push({ date: p.date, count: v, ma7: ma });
    });
    return out;
  })();

  const insufficient =
    seriesMA.length < 2 || seriesMA.every((p) => (p.count ?? 0) === 0);

  // agregados por estado para panel compacto
  const counts = (() => {
    const m = new Map<string, number>();
    (tickets ?? []).forEach((t) => {
      const k = (t.estado ?? "SIN ESTADO").toUpperCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  })();
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const preferred = ["EN PROGRESO", "PENDIENTE", "RESUELTO"];
  const estadosOrdenados = [
    ...preferred.filter((k) => counts.has(k)),
    ...Array.from(counts.keys())
      .filter((k) => !preferred.includes(k))
      .sort(),
  ];

  const TooltipArea = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = parseYYYYMMDD(String(label));
    const val = payload.find((p: any) => p.dataKey === "count")?.value ?? 0;
    const ma = payload.find((p: any) => p.dataKey === "ma7")?.value ?? null;
    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow">
        <div className="font-medium">
          {d ? dtFull.format(d) : String(label)}
        </div>
        <div className="text-muted-foreground">
          Tickets: <b>{val}</b>
        </div>
        {ma !== null && (
          <div className="text-muted-foreground">
            Media 7d: <b>{ma}</b>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* === Área: Tickets por día === */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Tickets por día</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Curva diaria + media móvil de 7 días
          </p>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          {insufficient ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No hay suficientes días para dibujar la curva. Amplía el rango de
              fechas para ver la tendencia.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={seriesMA}
                margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
              >
                <defs>
                  <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#0284c7"
                      stopOpacity={0.06}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                {/* eje X oculto para estilo Notion-like */}
                <XAxis
                  dataKey="date"
                  hide
                  tick={false}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  width={34}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <RTooltip content={<TooltipArea />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0284c7"
                  fill="url(#gradArea)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {/* línea de media móvil */}
                <Area
                  type="monotone"
                  dataKey="ma7"
                  stroke="#0ea5e9"
                  fillOpacity={0}
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* === Panel compacto por estado (barras de progreso) === */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Estados (acumulado)</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Distribución de tickets en la vista actual
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {estadosOrdenados.map((estado, i) => {
            const v = counts.get(estado) ?? 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            const palette = [
              "bg-indigo-500",
              "bg-amber-500",
              "bg-emerald-500",
              "bg-rose-500",
              "bg-cyan-500",
              "bg-violet-500",
            ];
            const color = palette[i % palette.length];
            return (
              <div key={estado}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{estado}</span>
                  <span className="text-muted-foreground">
                    {v} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-2.5 rounded-full ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {estadosOrdenados.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin datos.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
