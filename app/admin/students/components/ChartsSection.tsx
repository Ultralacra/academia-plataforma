"use client";

import { PieCard, BarCard, PieCardSkeleton, BarCardSkeleton } from "./charts";
import PhaseMetrics from "./phase-metrics";
import RetentionKPIs from "./retention-kpis";
import NoTasksKPIs from "./no-tasks-kpis";
import TransitionsPanel from "./transitions-panel";
import type { LifecycleItem } from "./phase-faker";
import type { ClientItem } from "@/lib/data-service";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ChartsSection({
  loading,
  distByState,
  distByStage,
  byJoinDate,
  phaseItems = [],
  lifecycleItems = [],
  students = [], // <-- DEFAULT
  onOpenList,
}: {
  loading: boolean;
  distByState: Array<{ name: string; value: number }>;
  distByStage: Array<{ name: string; value: number }>;
  byJoinDate: Array<{ date: string; count: number }>;
  phaseItems: Array<{
    ingreso?: string | null;
    paso_f1?: string | null;
    paso_f2?: string | null;
    paso_f3?: string | null;
    paso_f4?: string | null;
    paso_f5?: string | null;
  }>;
  lifecycleItems?: LifecycleItem[];
  students?: ClientItem[]; // <-- NUEVO
  onOpenList: (
    title: string,
    rows: Array<{
      code?: string | null;
      name?: string | null;
      subtitle?: string;
    }>
  ) => void;
}) {
  const [openJson, setOpenJson] = React.useState(false);
  const payload = React.useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      distByState,
      distByStage,
      byJoinDate,
      phaseItems,
      lifecycleItems,
      students,
    }),
    [distByState, distByStage, byJoinDate, phaseItems, lifecycleItems, students]
  );
  const jsonText = React.useMemo(
    () => JSON.stringify(payload, null, 2),
    [payload]
  );
  function copyJson() {
    try {
      navigator.clipboard?.writeText(jsonText);
    } catch {}
  }
  function downloadJson() {
    try {
      const blob = new Blob([jsonText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students-metrics.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch {}
  }

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <Button variant="secondary" onClick={() => setOpenJson(true)}>
          Imprimir JSON
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PieCardSkeleton />
          <PieCardSkeleton />
          <BarCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PieCard title="Distribución por Estado" data={distByState} />
          <PieCard title="Distribución por Etapa" data={distByStage} />
          <BarCard title="Clientes por día de ingreso" data={byJoinDate} />
        </div>
      )}

      {/* Promedios por fase */}
      <div className="mt-2">
        <PhaseMetrics items={phaseItems} />
      </div>

      {/* Retención / permanencia */}
      <div className="mt-2">
        <RetentionKPIs items={lifecycleItems ?? []} />
      </div>

      {/* Sin tareas (pasa lifecycle + students) */}
      <div className="mt-2">
        <NoTasksKPIs
          items={lifecycleItems ?? []}
          students={students} // <-- IMPORTANTE
          onOpenList={onOpenList}
        />
      </div>

      {/* Transiciones */}
      <div className="mt-2">
        <TransitionsPanel
          items={lifecycleItems ?? []}
          onOpenList={onOpenList}
        />
      </div>

      <Dialog open={openJson} onOpenChange={setOpenJson}>
        <DialogContent className="sm:max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>JSON de métricas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={copyJson}>
                Copiar
              </Button>
              <Button onClick={downloadJson}>Descargar</Button>
            </div>
            <pre className="max-h-[60vh] overflow-auto text-xs bg-gray-50 p-3 rounded border">
              {jsonText}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
