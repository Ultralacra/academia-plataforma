"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LifecycleItem, TransitionKey } from "./phase-faker";
import { computeTransitions } from "./phase-faker";

type Preset = "7d" | "1m" | "4m";
const PRESETS: Array<{ key: Preset; label: string; days: number }> = [
  { key: "7d", label: "7 días", days: 7 },
  { key: "1m", label: "1 mes", days: 30 },
  { key: "4m", label: "4 meses", days: 120 },
];

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
  const [tab, setTab] = useState<Preset>("7d");

  // Pre-computamos los 3 rangos para poder:
  //  - mostrar totales
  //  - autoseleccionar el primer rango con datos
  const dataByPreset = useMemo(() => {
    return {
      "7d": computeTransitions(items, 7),
      "1m": computeTransitions(items, 30),
      "4m": computeTransitions(items, 120),
    };
  }, [items]);

  const totalByPreset = useMemo(() => {
    const sum = (obj: ReturnType<typeof computeTransitions>) =>
      Object.values(obj).reduce((acc, b) => acc + b.count, 0);
    return {
      "7d": sum(dataByPreset["7d"]),
      "1m": sum(dataByPreset["1m"]),
      "4m": sum(dataByPreset["4m"]),
    } as Record<Preset, number>;
  }, [dataByPreset]);

  // Si el rango actual no tiene datos, movemos al primero que sí tenga
  useEffect(() => {
    if (totalByPreset[tab] > 0) return;
    const next = (["7d", "1m", "4m"] as Preset[]).find(
      (k) => totalByPreset[k] > 0
    );
    if (next) setTab(next);
  }, [tab, totalByPreset]);

  const activeDays = PRESETS.find((p) => p.key === tab)!.days;
  const buckets = dataByPreset[tab];

  const pills: Array<{ key: TransitionKey; label: string }> = [
    { key: "toF1", label: "Ingresaron a F1" },
    { key: "toF2", label: "Pasaron a F2" },
    { key: "toF3", label: "Pasaron a F3" },
    { key: "toF4", label: "Pasaron a F4" },
    { key: "toF5", label: "Pasaron a F5" },
  ];

  const openList = (k: TransitionKey, label: string) => {
    const rows = (buckets[k]?.items ?? []).map((it) => {
      const when =
        it.date &&
        new Date(it.date)
          .toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .replace(".", "");
      return {
        code: it.code,
        name: it.name,
        subtitle: when ? `Fecha: ${when}` : undefined,
      };
    });
    onOpenList(`Transiciones — ${label} (últimos ${activeDays} días)`, rows);
  };

  const total = totalByPreset[tab];

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Transiciones de fase</CardTitle>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                variant={tab === p.key ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setTab(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Rango: <strong>últimos {activeDays} días</strong> · Total
          transiciones: <strong>{total}</strong>
          {total === 0 && (
            <span className="ml-2 opacity-80">
              — Sin transiciones en este rango.
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {pills.map((p) => (
            <button
              key={p.key}
              onClick={() => openList(p.key, p.label)}
              className="text-left rounded-lg border bg-card px-3 py-2 hover:bg-muted transition"
              title="Ver listado"
            >
              <div className="text-sm">{p.label}</div>
              <div className="mt-1 text-lg font-semibold">
                {buckets[p.key]?.count ?? 0}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
