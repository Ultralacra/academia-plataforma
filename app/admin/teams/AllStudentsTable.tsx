"use client";
import React from "react";

export type AllStudent = {
  id: number;
  code?: string | null;
  name: string;
  state?: string | null;
  stage?: string | null;
  lastActivity?: string | null;
  inactivityDays?: number | null;
  ticketsCount?: number | null;
};

export default function AllStudentsTable({ students, loading }: { students: AllStudent[]; loading?: boolean }) {
  const nf = (n: any) => (n === null || n === undefined || isNaN(Number(n)) ? "—" : Number(n).toLocaleString("es-ES"));
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Todos los alumnos</h3>
          <p className="text-sm text-gray-500">Listado completo para referencia de fase y estado</p>
        </div>
        <div className="text-xs text-muted-foreground">{loading ? "Cargando…" : `${students.length} alumnos`}</div>
      </div>
      <div className="overflow-x-auto max-h-[480px]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-medium">Alumno</th>
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2 text-left font-medium">Fase</th>
              <th className="px-3 py-2 text-left font-medium">Inactividad (días)</th>
              <th className="px-3 py-2 text-left font-medium">Última actividad</th>
              <th className="px-3 py-2 text-left font-medium">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-500">Cargando alumnos…</td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-500">Sin alumnos</td>
              </tr>
            )}
            {!loading && students.map(s => (
              <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{s.name}</td>
                <td className="px-3 py-2 text-gray-700">{s.code || "—"}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{s.state || "—"}</span>
                </td>
                <td className="px-3 py-2 text-gray-700">{s.stage || "—"}</td>
                <td className="px-3 py-2 text-gray-700">{nf(s.inactivityDays)}</td>
                <td className="px-3 py-2 text-gray-700">{s.lastActivity ? new Date(s.lastActivity).toLocaleDateString("es-ES") : "—"}</td>
                <td className="px-3 py-2 text-gray-700">{nf(s.ticketsCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
