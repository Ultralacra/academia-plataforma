"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, ListChecks } from "lucide-react";
import { studentsNoTasksSince, type LifecycleItem } from "./phase-faker";

/* ---- presets y helpers ---- */
const PRESETS = [
  { key: "7d", label: "7 días", days: 7 },
  { key: "2w", label: "2 semanas", days: 14 },
  { key: "1m", label: "1 mes", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "custom", label: "Personalizado", days: 0 },
] as const;

type Unit = "d" | "w" | "m"; // días, semanas, meses

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
const f = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function NoTasksKPIs({
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
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>(PRESETS[0]);
  const [num, setNum] = useState<number>(7);
  const [unit, setUnit] = useState<Unit>("d");

  const thresholdDays = useMemo(() => {
    if (preset.key !== "custom") return preset.days;
    const n = Number.isFinite(num) ? Math.max(1, Math.floor(num)) : 7;
    const mult = unit === "d" ? 1 : unit === "w" ? 7 : 30;
    return n * mult;
  }, [preset, num, unit]);

  const list = useMemo(
    () => studentsNoTasksSince(items, thresholdDays),
    [items, thresholdDays]
  );

  const today = new Date();
  const cutoff = addDays(today, -thresholdDays);
  const label =
    preset.key === "custom"
      ? `≥ ${num} ${unit === "d" ? "días" : unit === "w" ? "semanas" : "meses"}`
      : `≥ ${thresholdDays} días`;

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">
              Sin enviar tareas (última entrega)
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Considera alumnos cuya última entrega es anterior a{" "}
              <strong>{f.format(cutoff)}</strong>.
            </div>
          </div>

          {/* Selector de rango */}
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => {
              const active = p.key === preset.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPreset(p)}
                  className={`h-8 rounded-full px-3 text-xs transition ${
                    active
                      ? "bg-foreground text-background"
                      : "border border-gray-200 hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            {/* Controles de personalizado */}
            {preset.key === "custom" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  value={Number.isFinite(num) ? num : ""}
                  onChange={(e) => setNum(parseInt(e.target.value || "0", 10))}
                  className="h-8 w-16"
                  aria-label="Cantidad"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  className="h-8 w-[110px] rounded-md border border-gray-200 bg-white px-2 text-sm"
                  aria-label="Unidad"
                >
                  <option value="d">días</option>
                  <option value="w">semanas</option>
                  <option value="m">meses</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-7 w-7 grid place-items-center rounded-full bg-slate-100 text-slate-700">
                <Clock className="h-4 w-4" />
              </span>
              <span>{label}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() =>
                onOpenList(
                  `Sin enviar tareas ${label}`,
                  list.map((r) => ({
                    code: r.code,
                    name: r.name,
                    subtitle: r.lastTaskAt
                      ? `Últ. entrega: ${r.lastTaskAt}`
                      : "—",
                  }))
                )
              }
              title="Ver lista de alumnos"
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Ver lista
            </Button>
          </div>

          <div className="mt-2 text-4xl font-semibold tabular-nums">
            {list.length}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Umbral de inactividad: <strong>{thresholdDays}</strong> días · Desde{" "}
            <strong>{f.format(cutoff)}</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
