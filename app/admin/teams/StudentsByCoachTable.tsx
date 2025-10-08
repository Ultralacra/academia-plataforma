"use client";

import React, { useMemo, useState } from "react";

export type CoachStudent = {
  id: number;
  name: string;
  code?: string | null;
  state?: string | null;
  stage?: string | null;
  inactivityDays?: number | null;
  lastActivity?: string | null;
  ticketsCount?: number | null;
  teamMembers?: { name: string; url?: string | null }[];
};

export default function StudentsByCoachTable({
  coach,
  students,
  loading,
}: {
  coach: string;
  students: CoachStudent[];
  loading?: boolean;
}) {
  const nf = (n: any) =>
    n === null || n === undefined || isNaN(Number(n))
      ? "—"
      : Number(n).toLocaleString("es-ES");

  // Paginación
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [students, page]
  );
  // Reset page on students change
  React.useEffect(() => {
    setPage(1);
  }, [students]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Alumnos de {coach}
          </h3>
          <p className="text-sm text-gray-500">
            Listado de alumnos asociados al coach y su estado actual
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {loading
            ? "Cargando…"
            : `${students.length} alumnos • página ${page} / ${totalPages}`}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-medium">Alumno</th>
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2 text-left font-medium">Fase</th>
              <th className="px-3 py-2 text-left font-medium">
                Inactividad (días)
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Última actividad
              </th>
              <th className="px-3 py-2 text-left font-medium">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                  Cargando alumnos…
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                  No se encontraron alumnos asociados a este coach.
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{s.code || "—"}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {s.state || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{s.stage || "—"}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {nf(s.inactivityDays)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {s.lastActivity
                      ? new Date(s.lastActivity).toLocaleDateString("es-ES")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {nf(s.ticketsCount)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {/* Controles de paginación */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs">
          <button
            className="px-2 py-1 rounded-md border bg-white disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </button>
          <div className="flex items-center gap-2">
            <span>
              Página {page} de {totalPages}
            </span>
          </div>
          <button
            className="px-2 py-1 rounded-md border bg-white disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
