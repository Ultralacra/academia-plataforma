"use client";

import { useMemo } from "react";

type MetricStudentRow = {
  id: number | string;
  name: string;
  code?: string | null;
  state?: string | null;
  stage?: string | null;
  tickets?: number | null;
};

export default function CoachStudentsPhaseDistributionCard({
  students,
  title = "Distribución de alumnos por fase",
}: {
  students: MetricStudentRow[];
  title?: string;
}) {
  const phaseCounts = useMemo(() => {
    const map = new Map<string, number>();
    const rows = Array.isArray(students) ? students : [];
    for (const row of rows) {
      const stage = String(row.stage || "Sin fase").trim() || "Sin fase";
      map.set(stage, (map.get(stage) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => b.count - a.count || a.phase.localeCompare(b.phase));
  }, [students]);

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          Fases: {phaseCounts.length}
        </span>
      </div>

      <div className="space-y-2">
        {phaseCounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay datos de fases para este coach.
          </p>
        ) : (
          phaseCounts.map((item) => (
            <div
              key={item.phase}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="text-slate-700">{item.phase}</span>
              <span className="font-semibold text-slate-900">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
