"use client";

import { PieCard, BarCard, PieCardSkeleton, BarCardSkeleton } from "./charts";
// Gráficas que dependían de datos sintéticos quedaron en pausa
// Mostramos placeholders “En proceso de información”.
import type { ClientItem } from "@/lib/data-service";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ChartsSection({
  loading,
  distByState,
  distByStage,
  byJoinDate,
  // phaseItems y lifecycleItems se ignoran (eran sintéticos)
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
  lifecycleItems?: any[];
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

      {/* Secciones basadas en datos sintéticos → mantener "gráficas" difuminadas */}
      <div className="mt-2 grid grid-cols-1 gap-4">
        {[
          "Promedios por fase",
          "Retención / permanencia",
          "Alumnos sin tareas",
          "Transiciones de fase",
        ].map((title) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-44 overflow-hidden rounded-md">
                {/* Fondo que sugiere una gráfica */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 12px), repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 12px)",
                  }}
                />
                {/* Barras simuladas */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end gap-2 opacity-60">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-400/60 rounded-t"
                      style={{ height: `${20 + ((i * 7) % 85)}%` }}
                    />
                  ))}
                </div>
                {/* Capa difuminada */}
                <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40" />
                {/* Etiqueta de estado */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> En proceso de
                    información
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
