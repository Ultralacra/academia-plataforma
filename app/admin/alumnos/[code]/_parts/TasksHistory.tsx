"use client";

import React from "react";
import { fmtES } from "./detail-utils";

export type TaskHistItem = {
  id: number | string;
  codigo_cliente?: string | null;
  descripcion?: string | null;
  created_at: string;
};

export default function TasksHistory({
  history,
}: {
  history: TaskHistItem[] | null;
}) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Historial de tareas</h3>
        <p className="text-sm text-muted-foreground">Sin tareas registradas.</p>
      </div>
    );
  }

  const sorted = [...history].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">Historial de tareas</h3>
      <div className="relative ml-2">
        <div className="absolute left-2 top-6 bottom-0 w-px bg-gray-200" />
        <ol className="space-y-6">
          {sorted.map((h) => (
            <li key={h.id} className="relative pl-8">
              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary ring-2 ring-white" />
              <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {h.descripcion ? h.descripcion : "Tarea registrada"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fmtES(h.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
