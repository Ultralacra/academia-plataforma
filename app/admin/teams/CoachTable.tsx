"use client";

import { formatDuration } from "./format";

type CoachAgg = {
  name: string;
  puesto?: string | null;
  area?: string | null;
  studentsTotal: number;
  studentsActive: number;
  studentsInactive: number;
  studentsPaused: number;
  tickets: number;
  avgResponseMin: number;
  avgResolutionMin: number;
  sessions: number;
  hours: number;
  phaseCounts: Record<"F1" | "F2" | "F3" | "F4" | "F5", number>;
  avgPhaseDays: Record<"F1" | "F2" | "F3" | "F4" | "F5", number>;
};

function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return new Intl.NumberFormat("es-ES").format(n);
}

export default function CoachTable({ rows = [] }: { rows?: CoachAgg[] }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold">Métricas por coach</h3>
          <p className="text-xs text-muted-foreground">
            Estudiantes, tickets, sesiones y tiempos promedio
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-600">
            <tr className="border-b">
              <th className="px-4 py-2">Coach</th>
              <th className="px-4 py-2">Puesto</th>
              <th className="px-4 py-2">Área</th>
              <th className="px-4 py-2">Alumnos</th>
              <th className="px-4 py-2">Activos</th>
              <th className="px-4 py-2">Pausa</th>
              <th className="px-4 py-2">Tickets</th>
              <th className="px-4 py-2">Resp. prom.</th>
              <th className="px-4 py-2">Resol. prom.</th>
              <th className="px-4 py-2">Sesiones</th>
              <th className="px-4 py-2">Horas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.name}-${i}`} className="border-b">
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="px-4 py-2">{r.puesto ?? "—"}</td>
                <td className="px-4 py-2">{r.area ?? "—"}</td>
                <td className="px-4 py-2">{formatNumber(r.studentsTotal)}</td>
                <td className="px-4 py-2">{formatNumber(r.studentsActive)}</td>
                <td className="px-4 py-2">{formatNumber(r.studentsPaused)}</td>
                <td className="px-4 py-2">{formatNumber(r.tickets)}</td>
                <td className="px-4 py-2">
                  {isFinite(r.avgResponseMin)
                    ? formatDuration(r.avgResponseMin)
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  {isFinite(r.avgResolutionMin)
                    ? formatDuration(r.avgResolutionMin)
                    : "—"}
                </td>
                <td className="px-4 py-2">{formatNumber(r.sessions)}</td>
                <td className="px-4 py-2">{formatNumber(r.hours)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500"
                  colSpan={11}
                >
                  Sin datos de coaches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
