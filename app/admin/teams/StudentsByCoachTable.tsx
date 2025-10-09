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

  // Componente de chips de filtro reutilizable
  function FilterGroup({
    label,
    items,
    value,
    onChange,
    maxVisible = 8,
  }: {
    label: string;
    items: string[];
    value: string | null;
    onChange: (val: string) => void;
    maxVisible?: number;
  }) {
    if (!items.length) return null;
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? items : items.slice(0, maxVisible);
    const hiddenCount = Math.max(0, items.length - visible.length);
    return (
      <div className="flex items-center gap-2 w-full">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <div className="flex gap-1.5 whitespace-nowrap overflow-x-auto md:overflow-visible md:flex-wrap md:whitespace-normal w-full">
          {visible.map((it) => {
            const active = value === it;
            return (
              <button
                key={it}
                onClick={() => onChange(it)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition border backdrop-blur-sm ${
                  active
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white/70 text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {it}
              </button>
            );
          })}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-white/80 text-gray-700 hover:bg-gray-50 shrink-0"
            >
              {showAll ? "Ver menos" : `+${hiddenCount} más`}
            </button>
          )}
          {value && (
            <button
              onClick={() => onChange("")}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Derivar valores únicos de estado y fase
  const uniqueStates = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((s) => (s.state && s.state.trim() ? s.state.trim() : ""))
            .filter(Boolean)
        )
      ).sort(),
    [students]
  );
  const uniqueStages = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((s) => (s.stage && s.stage.trim() ? s.stage.trim() : ""))
            .filter(Boolean)
        )
      ).sort(),
    [students]
  );

  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        if (filterState && s.state !== filterState) return false;
        if (filterStage && s.stage !== filterStage) return false;
        return true;
      }),
    [students, filterState, filterStage]
  );

  // Paginación
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );
  // Reset page on students change
  React.useEffect(() => {
    setPage(1);
  }, [students, filterState, filterStage]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Alumnos de {coach}
          </h3>
          <p className="text-sm text-gray-500">
            Listado de alumnos asociados al coach y su estado actual
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:flex-1">
          <div className="flex flex-col gap-2 w-full">
            <FilterGroup
              label="Estado"
              items={uniqueStates}
              value={filterState}
              onChange={(v: string) =>
                setFilterState(v ? (v === filterState ? null : v) : null)
              }
              maxVisible={8}
            />
            <FilterGroup
              label="Fase"
              items={uniqueStages}
              value={filterStage}
              onChange={(v: string) =>
                setFilterStage(v ? (v === filterStage ? null : v) : null)
              }
              maxVisible={10}
            />
          </div>
          <div className="text-xs text-gray-500">
            {loading
              ? "Cargando…"
              : `${filtered.length} alumnos filtrados • página ${page} / ${totalPages}`}
          </div>
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
            {!loading && filtered.length === 0 && (
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
