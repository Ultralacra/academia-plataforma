"use client";

import React from "react";
import { fmtES, getOptionBadgeClass } from "./detail-utils";
import { Badge } from "@/components/ui/badge";

export default function PhaseHistory({
  history,
  statusHistory,
  tasksHistory,
}: {
  history: Array<{
    id: number | string;
    codigo_cliente: string;
    etapa_id: string;
    created_at: string;
  }> | null;
  statusHistory?: Array<{
    id: number | string;
    codigo_cliente?: string | null;
    estado_id: string;
    created_at: string;
  }> | null;
  tasksHistory?: Array<{
    id: number | string;
    codigo_cliente?: string | null;
    descripcion?: string | null;
    created_at: string;
  }> | null;
}) {
  const phasesSorted = (history || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  const statusSorted = (statusHistory || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  const tasksSorted = (tasksHistory || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Historial</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Etapas */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Etapas
          </h4>
          {phasesSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin cambios de etapa.
            </p>
          ) : (
            <div className="relative ml-2">
              <div className="absolute left-2 top-6 bottom-0 w-px bg-border" />
              <ol className="space-y-6">
                {phasesSorted.map((h) => (
                  <li key={h.id} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary ring-2 ring-background" />
                    <div className="rounded-md border border-border bg-muted/50 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span>Cambio a</span>
                        <Badge className={getOptionBadgeClass("etapa", h.etapa_id)}>
                          {String(h.etapa_id).toUpperCase()}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtES(h.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Estatus */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estatus
          </h4>
          {statusSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin cambios de estatus.
            </p>
          ) : (
            <div className="relative ml-2">
              <div className="absolute left-2 top-6 bottom-0 w-px bg-border" />
              <ol className="space-y-6">
                {statusSorted.map((h) => (
                  <li key={h.id} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary ring-2 ring-background" />
                    <div className="rounded-md border border-border bg-muted/50 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span>Cambio a</span>
                        <Badge className={getOptionBadgeClass("estado", h.estado_id)}>
                          {String(h.estado_id).toUpperCase()}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtES(h.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Tareas */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tareas
          </h4>
          {tasksSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin tareas registradas.
            </p>
          ) : (
            <div className="relative ml-2">
              <div className="absolute left-2 top-6 bottom-0 w-px bg-border" />
              <ol className="space-y-6">
                {tasksSorted.map((h) => (
                  <li key={h.id} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary ring-2 ring-background" />
                    <div className="rounded-md border border-border bg-muted/50 p-3">
                      <div className="text-sm font-medium text-foreground">
                        {h.descripcion || "Tarea registrada"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtES(h.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
