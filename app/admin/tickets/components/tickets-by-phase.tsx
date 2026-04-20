"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import type { Ticket, ClientItem } from "@/lib/data-service";

// Labels legibles para las etapas (mismo set que students/stages-breakdown)
const STAGE_LABELS: Record<string, string> = {
  F1: "Fase 1",
  F2: "Fase 2",
  F3: "Fase 3",
  F4: "Fase 4",
  F5: "Fase 5",
  F2_PAGINAS: "F2 Páginas",
  F2_VSL: "F2 VSL",
  F2_EMBUDO: "F2 Embudo",
  F2_GRABACION: "F2 Grabación",
  ONBOARDING: "Onboarding",
};

const STAGE_COLORS: Record<string, string> = {
  F1: "bg-violet-100 text-violet-700",
  F2: "bg-blue-100 text-blue-700",
  F3: "bg-emerald-100 text-emerald-700",
  F4: "bg-amber-100 text-amber-700",
  F5: "bg-rose-100 text-rose-700",
  F2_PAGINAS: "bg-sky-100 text-sky-700",
  F2_VSL: "bg-indigo-100 text-indigo-700",
  F2_EMBUDO: "bg-cyan-100 text-cyan-700",
  F2_GRABACION: "bg-pink-100 text-pink-700",
  ONBOARDING: "bg-teal-100 text-teal-700",
  SIN_ETAPA: "bg-gray-100 text-gray-700",
};

const BAR_COLORS: Record<string, string> = {
  F1: "bg-violet-500",
  F2: "bg-blue-500",
  F3: "bg-emerald-500",
  F4: "bg-amber-500",
  F5: "bg-rose-500",
  F2_PAGINAS: "bg-sky-500",
  F2_VSL: "bg-indigo-500",
  F2_EMBUDO: "bg-cyan-500",
  F2_GRABACION: "bg-pink-500",
  ONBOARDING: "bg-teal-500",
  SIN_ETAPA: "bg-gray-400",
};

function getLabel(id: string) {
  return STAGE_LABELS[id] ?? id;
}

function getBadgeColor(id: string) {
  return STAGE_COLORS[id] ?? "bg-gray-100 text-gray-700";
}

function getBarColor(id: string) {
  return BAR_COLORS[id] ?? "bg-gray-400";
}

function norm(s: string | null | undefined) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

export default function TicketsByPhase({
  tickets,
  students,
  loading = false,
}: {
  tickets: Ticket[];
  students: ClientItem[];
  loading?: boolean;
}) {
  // Índices para mapear ticket -> etapa del alumno
  const { stageByCode, stageByName } = useMemo(() => {
    const byCode = new Map<string, string>();
    const byName = new Map<string, string>();
    (students ?? []).forEach((s) => {
      const stage = (s.stage ?? "").toString().trim();
      if (!stage) return;
      if (s.code) byCode.set(String(s.code).trim(), stage);
      if (s.name) byName.set(norm(s.name), stage);
    });
    return { stageByCode: byCode, stageByName: byName };
  }, [students]);

  const rows = useMemo(() => {
    const counter = new Map<string, { count: number; alumnos: Set<string> }>();
    let unmatched = 0;

    for (const t of tickets ?? []) {
      const code = String(t.id_alumno ?? "").trim();
      const name = norm(t.alumno_nombre);

      let stage: string | undefined;
      if (code) stage = stageByCode.get(code);
      if (!stage && name) stage = stageByName.get(name);

      const key = stage && stage.length > 0 ? stage : "SIN_ETAPA";
      if (!stage) unmatched++;

      if (!counter.has(key)) {
        counter.set(key, { count: 0, alumnos: new Set<string>() });
      }
      const bucket = counter.get(key)!;
      bucket.count += 1;
      const alumnoKey = code || name || String(t.id);
      bucket.alumnos.add(alumnoKey);
    }

    const total = (tickets ?? []).length;
    const arr = Array.from(counter.entries()).map(([etapa_id, v]) => ({
      etapa_id,
      count: v.count,
      alumnos: v.alumnos.size,
      pct: total ? Math.round((v.count / total) * 100) : 0,
    }));

    // Orden: F1..F5 primero, luego subfases, luego ONBOARDING, luego SIN_ETAPA
    const order = ["F1", "F2", "F3", "F4", "F5"];
    arr.sort((a, b) => {
      if (a.etapa_id === "SIN_ETAPA") return 1;
      if (b.etapa_id === "SIN_ETAPA") return -1;
      const ia = order.indexOf(a.etapa_id);
      const ib = order.indexOf(b.etapa_id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.count - a.count;
    });

    return { items: arr, total, unmatched };
  }, [tickets, stageByCode, stageByName]);

  const maxCount = rows.items.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Tickets por fase</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-5 text-[11px]">
              Total: {rows.total}
            </Badge>
            {rows.unmatched > 0 && (
              <Badge
                variant="outline"
                className="h-5 text-[11px] bg-gray-50 text-gray-600"
                title="Tickets cuyos alumnos no se pudieron mapear a una etapa"
              >
                Sin etapa: {rows.unmatched}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-md border bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : rows.items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No hay tickets en el rango/filtros seleccionados.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.items.map((r) => (
              <div
                key={r.etapa_id}
                className="flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2"
              >
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeColor(
                    r.etapa_id,
                  )}`}
                >
                  {getLabel(r.etapa_id)}
                </span>

                <div className="flex-1">
                  <div className="h-2 w-full rounded-full bg-muted/70">
                    <div
                      className={`h-full rounded-full transition-all ${getBarColor(
                        r.etapa_id,
                      )}`}
                      style={{
                        width: `${Math.max(4, Math.round((r.count / maxCount) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                  <span>
                    <b className="text-foreground">{r.count}</b> tickets
                  </span>
                  <span className="hidden sm:inline">
                    {r.alumnos} alumno{r.alumnos === 1 ? "" : "s"}
                  </span>
                  <span className="w-10 text-right">{r.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
