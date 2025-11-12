"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Users } from "lucide-react";
import { crmService } from "@/lib/crm-service";
import type { PipelineStageId, ProspectCore } from "@/lib/crm-types";
import { StageBadge } from "./StageBadge";

export interface KanbanProspect
  extends Pick<
    ProspectCore,
    "id" | "nombre" | "email" | "telefono" | "canalFuente" | "ownerNombre"
  > {
  etapa: string;
  saleStatus?: string;
}

export function ProspectKanban({
  items,
  onOpenDetail,
  onMoved,
  onStageChange,
}: {
  items: KanbanProspect[];
  onOpenDetail: (p: KanbanProspect) => void;
  onMoved?: (id: string, newStage: PipelineStageId) => void;
  onStageChange?: (id: string, newStage: PipelineStageId) => void;
}) {
  const columns = [
    "Nuevo",
    "Contactado",
    "Calificado",
    "Ganado",
    "Perdido",
  ] as const;

  const onDrop = (
    e: React.DragEvent<HTMLDivElement>,
    stage: (typeof columns)[number]
  ) => {
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const stageMap: Record<(typeof columns)[number], PipelineStageId> = {
      Nuevo: "nuevo",
      Contactado: "contactado",
      Calificado: "calificado",
      Ganado: "ganado",
      Perdido: "perdido",
    };
    const mapped = stageMap[stage];
    if (onStageChange) {
      onStageChange(id, mapped);
    } else {
      // Fallback a mock local si no se provee manejador externo
      crmService.updateProspectStage(id, mapped);
    }
    onMoved?.(id, mapped);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {columns.map((col) => {
        const list = items.filter((p) => p.etapa === col);
        return (
          <div
            key={col}
            className="flex flex-col rounded-xl border bg-white min-h-[320px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col)}
          >
            <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <StageBadge stage={col} />
                <span className="text-xs font-medium text-slate-500">
                  {list.length}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-2 p-3 overflow-y-auto">
              {list.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", p.id)
                  }
                  className="rounded-md border bg-white p-3 shadow-sm hover:shadow-md cursor-move transition-colors hover:bg-indigo-50/40"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4
                      className="flex-1 text-sm font-semibold text-slate-800 line-clamp-2"
                      title={p.nombre}
                    >
                      {p.nombre}
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onOpenDetail(p)}
                    >
                      <Users className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {p.saleStatus ? (
                    <div className="mb-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {p.saleStatus}
                      </Badge>
                    </div>
                  ) : null}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{p.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{p.telefono || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
