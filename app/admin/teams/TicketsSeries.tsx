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
import { useState } from "react";
import type { TicketsSeries } from "./metrics-faker";

function Card({ children }: any) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">{children}</div>
  );
}
function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-4">
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}
function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        Tickets: <span className="font-semibold">{p.value}</span>
      </p>
    </div>
  );
}

export default function TicketsSeriesChart({
  series,
}: {
  series: TicketsSeries;
}) {
  const [tab, setTab] = useState<"day" | "week" | "month">("day");
  const data =
    tab === "day"
      ? series.daily.map((d) => ({ x: d.date.slice(5), y: d.count }))
      : tab === "week"
      ? series.weekly.map((d) => ({ x: d.week.slice(5), y: d.count }))
      : series.monthly.map((d) => ({ x: d.month, y: d.count }));

  return (
    <Card>
      <Header title="Tickets por periodo" />
      <div className="px-5 pt-3">
        <div className="mb-3 flex items-center gap-2">
          {[
            { k: "day", l: "Día" },
            { k: "week", l: "Semana" },
            { k: "month", l: "Mes" },
          ].map((b) => (
            <button
              key={b.k}
              onClick={() => setTab(b.k as any)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                tab === b.k
                  ? "bg-sky-600 text-white border-sky-600"
                  : "hover:bg-gray-50"
              }`}
            >
              {b.l}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 px-5 pb-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis allowDecimals={false} />
            <RTooltip content={<TooltipContent />} />
            <Area
              dataKey="y"
              name="Tickets"
              type="monotone"
              fill="url(#gArea)"
              stroke="#0ea5e9"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
