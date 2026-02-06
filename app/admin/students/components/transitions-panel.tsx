"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchStageTransitionsV2,
  getDefaultRange,
  type StageItemsById,
  type StageCounts,
  type StageId,
  type StageLabels,
} from "./api";

type Preset = "7d" | "1m" | "4m";
const PRESETS: Array<{ key: Preset; label: string; days: number }> = [
  { key: "7d", label: "7 días", days: 7 },
  { key: "1m", label: "1 mes", days: 30 },
  { key: "4m", label: "4 meses", days: 120 },
];

export default function TransitionsPanel({
  onOpenList,
}: {
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
  const [isLoading, setIsLoading] = useState(true);

  // Estado para datos de API por preset
  const [countsByPreset, setCountsByPreset] = useState<
    Record<Preset, StageCounts>
  >({
    "7d": { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 },
    "1m": { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 },
    "4m": { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 },
  });
  const [itemsByPreset, setItemsByPreset] = useState<
    Record<Preset, StageItemsById>
  >({
    "7d": { F1: [], F2: [], F3: [], F4: [], F5: [] },
    "1m": { F1: [], F2: [], F3: [], F4: [], F5: [] },
    "4m": { F1: [], F2: [], F3: [], F4: [], F5: [] },
  });
  const [labelsByPreset, setLabelsByPreset] = useState<
    Record<Preset, StageLabels>
  >({
    "7d": {},
    "1m": {},
    "4m": {},
  });

  // Cargar datos una sola vez (ventana grande) y derivar 7d/30d en cliente
  useEffect(() => {
    (async () => {
      try {
        // Requerimiento: consultar el mes actual desde el primer día hasta hoy
        const { fechaDesde, fechaHasta } = getDefaultRange();

        const { items: items120, labels } = await fetchStageTransitionsV2({
          fechaDesde,
          fechaHasta,
        });

        const to = new Date(fechaHasta);

        // Derivar conteos/items para 7d / 30d filtrando por fecha
        const filterByDays = (items: StageItemsById, days: number) => {
          const cutoff = new Date(to);
          const from = new Date(to);
          from.setDate(from.getDate() - (days - 1));
          const inRange = (iso?: string | null) => {
            if (!iso) return false;
            const d = new Date(iso);
            return !isNaN(d.getTime()) && d >= from && d <= cutoff;
          };
          const filtered: StageItemsById = {};
          const counts: StageCounts = {} as StageCounts;
          Object.keys(items).forEach((id) => {
            const arr = (items[id] || []).filter((it) => inRange(it.date));
            if (arr.length) filtered[id] = arr;
            counts[id as keyof StageCounts] = arr.length as any;
          });
          return { items: filtered, counts };
        };

        const d7 = filterByDays(items120, 7);
        const d30 = filterByDays(items120, 30);

        // 120d: usamos directamente items120; counts = size por etapa
        const counts120: StageCounts = {} as StageCounts;
        Object.keys(items120).forEach((id) => {
          counts120[id as keyof StageCounts] = (items120[id] || [])
            .length as any;
        });

        setItemsByPreset({ "7d": d7.items, "1m": d30.items, "4m": items120 });
        setCountsByPreset({
          "7d": d7.counts,
          "1m": d30.counts,
          "4m": counts120,
        });
        setLabelsByPreset({ "7d": labels, "1m": labels, "4m": labels });
        setIsLoading(false);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("TransitionsPanel: error cargando datos", e);
        setIsLoading(false);
      }
    })();
  }, []);

  const totalByPreset = useMemo(() => {
    const sum = (c: StageCounts) =>
      Object.values(c).reduce((acc, n) => acc + n, 0);
    return {
      "7d": sum(countsByPreset["7d"]),
      "1m": sum(countsByPreset["1m"]),
      "4m": sum(countsByPreset["4m"]),
    } as Record<Preset, number>;
  }, [countsByPreset]);

  // Si el rango actual no tiene datos, movemos al primero que sí tenga
  useEffect(() => {
    if (totalByPreset[tab] > 0) return;
    const next = (["7d", "1m", "4m"] as Preset[]).find(
      (k) => totalByPreset[k] > 0
    );
    if (next) setTab(next);
  }, [tab, totalByPreset]);

  const activeDays = PRESETS.find((p) => p.key === tab)!.days;
  const counts = countsByPreset[tab];
  const itemsByStage = itemsByPreset[tab];
  const labels = labelsByPreset[tab];

  const stageOrder = (ids: StageId[]) => {
    return [...ids].sort((a, b) => {
      const ma = a.match(/^F(\d+)/i);
      const mb = b.match(/^F(\d+)/i);
      const ra = ma ? parseInt(ma[1]) : 999;
      const rb = mb ? parseInt(mb[1]) : 999;
      if (ra !== rb) return ra - rb;
      const la = (labels[a] || a).toLocaleLowerCase("es");
      const lb = (labels[b] || b).toLocaleLowerCase("es");
      return la.localeCompare(lb);
    });
  };

  const stageIds: StageId[] = stageOrder(Object.keys(counts || {}));

  const openList = (k: StageId, label: string) => {
    const raw = itemsByStage[k] ?? [];
    const rows = raw.map((it) => {
      const when =
        it.date &&
        new Date(it.date)
          .toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .replace(".", "");
      const extras: string[] = [];
      if (when) extras.push(`Fecha: ${when}`);
      if (it.days != null) extras.push(`${it.days} días`);
      return {
        code: it.code,
        name: it.name,
        subtitle: extras.length ? extras.join(" · ") : undefined,
      };
    });
    // Debug: imprime en consola el preset, etapa y muestra de alumnos
    try {
      // eslint-disable-next-line no-console
            /* console.log("[transitions] click", {
        presetDays: activeDays,
        stageId: k,
        stageLabel: label,
        total: raw.length,
        sample: raw.slice(0, 5),
      }); */
    } catch {}
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
          {isLoading && <span className="ml-2">(cargando…)</span>}
          {!isLoading && total === 0 && (
            <span className="ml-2 opacity-80">
              — Sin transiciones en este rango.
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[68px] rounded-lg border bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stageIds.map((id) => {
              const label = labels[id] || id;
              return (
                <button
                  key={id}
                  onClick={() => openList(id, label)}
                  className="text-left rounded-lg border bg-card px-3 py-2 hover:bg-muted transition"
                  title="Ver listado"
                >
                  <div className="text-sm">{label}</div>
                  <div className="mt-1 text-lg font-semibold">
                    {counts[id] ?? 0}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
