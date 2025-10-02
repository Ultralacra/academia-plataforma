"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  computeTransitions,
  type LifecycleItem,
  type TransitionKey,
} from "./phase-faker";
import { ArrowUpRight, MoveRight } from "lucide-react";

const RANGES: { key: string; label: string; days: number }[] = [
  { key: "7d", label: "7 días", days: 7 },
  { key: "1m", label: "1 mes", days: 30 },
  { key: "4m", label: "4 meses", days: 120 },
];

function Segmented({
  value,
  onChange,
}: {
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full border bg-background p-1">
      {RANGES.map((r) => {
        const active = r.key === value;
        return (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            className={`px-3 py-1.5 text-xs rounded-full transition ${
              active
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

function Tile({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border p-4 text-left hover:bg-muted/60 transition group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 grid place-items-center rounded-full bg-indigo-100 text-indigo-700">
            <MoveRight className="h-4 w-4" />
          </span>
          <span className="text-sm">{label}</span>
        </div>
        <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{count}</div>
    </button>
  );
}

export default function TransitionsPanel({
  items,
  onOpenList,
}: {
  items: LifecycleItem[];
  onOpenList: (
    title: string,
    rows: Array<{
      code?: string | null;
      name?: string | null;
      subtitle?: string;
    }>
  ) => void;
}) {
  const [range, setRange] = useState(RANGES[0]);
  const buckets = useMemo(
    () => computeTransitions(items, range.days),
    [items, range]
  );
  const order: TransitionKey[] = ["toF1", "toF2", "toF3", "toF4", "toF5"];

  const total =
    buckets.toF1.count +
    buckets.toF2.count +
    buckets.toF3.count +
    buckets.toF4.count +
    buckets.toF5.count;

  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - range.days);
  const fmt = (d: Date) =>
    `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-1 flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Transiciones de fase</CardTitle>
          <div className="text-xs text-muted-foreground mt-0.5">
            Rango: {fmt(from)} → {fmt(today)} · Total: {total}
          </div>
        </div>
        <Segmented
          value={range.key}
          onChange={(k) => setRange(RANGES.find((r) => r.key === k)!)}
        />
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {order.map((k) => {
            const b = buckets[k];
            return (
              <Tile
                key={k}
                label={b.label}
                count={b.count}
                onClick={() =>
                  onOpenList(
                    b.label,
                    b.items.map((x) => ({
                      code: x.code,
                      name: x.name,
                      subtitle: x.date ? `Fecha: ${x.date}` : "—",
                    }))
                  )
                }
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
