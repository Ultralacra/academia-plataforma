"use client";

import React, { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export type FilteredStudent = CoachStudent & {
  ingreso?: string | null;
  contrato?: string | null;
  nicho?: string | null;
  paso_f1?: number | null;
  paso_f2?: number | null;
  paso_f3?: number | null;
  paso_f4?: number | null;
  paso_f5?: number | null;
};

export default function StudentsByCoachTable({
  coach,
  filtered,
  loadingFiltered,
  datasets,
  defaultDatasetKey,
}: {
  coach: string;
  filtered?: FilteredStudent[];
  loadingFiltered?: boolean;
  datasets?: Array<{ key: string; label: string; rows: FilteredStudent[] }>;
  defaultDatasetKey?: string;
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
                    ? "bg-blue-600 text-white border-blue-600"
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

  // Tabs de datasets: si se proveen, usamos el dataset seleccionado; si no, usamos "filtered"
  const [activeKey, setActiveKey] = useState<string | undefined>(
    datasets?.[0]?.key || defaultDatasetKey
  );

  const currentRows: FilteredStudent[] = useMemo(() => {
    if (datasets && datasets.length) {
      const key = activeKey ?? datasets[0].key;
      const found = datasets.find((d) => d.key === key);
      return found?.rows || [];
    }
    return filtered || [];
  }, [datasets, activeKey, filtered]);

  // Dataset efectivo (para filtros/paginación)
  const baseData: Array<CoachStudent | FilteredStudent> = useMemo(
    () => currentRows,
    [currentRows]
  );

  // Derivar valores únicos de estado y fase del dataset activo
  const uniqueStates = useMemo(() => {
    const NO_STATE = "Sin estado";
    const base = Array.from(
      new Set(
        baseData
          .map((s) => (s.state && s.state.trim() ? s.state.trim() : ""))
          .filter(Boolean)
      )
    ).sort();
    const hasNoState = baseData.some(
      (s) => !s.state || !String(s.state).trim()
    );
    return hasNoState ? [NO_STATE, ...base] : base;
  }, [baseData]);
  const uniqueStages = useMemo(() => {
    const NO_STAGE = "Sin fase";
    const base = Array.from(
      new Set(
        baseData
          .map((s) => (s.stage && s.stage.trim() ? s.stage.trim() : ""))
          .filter(Boolean)
      )
    ).sort();
    const hasNoStage = baseData.some(
      (s) => !s.stage || !String(s.stage).trim()
    );
    return hasNoStage ? [NO_STAGE, ...base] : base;
  }, [baseData]);

  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string | null>(null);

  const filteredData = useMemo(
    () =>
      baseData.filter((s) => {
        const NO_STATE = "Sin estado";
        const NO_STAGE = "Sin fase";
        if (filterState) {
          if (filterState === NO_STATE) {
            if (s.state && String(s.state).trim()) return false;
          } else if (s.state !== filterState) return false;
        }
        if (filterStage) {
          if (filterStage === NO_STAGE) {
            if (s.stage && String(s.stage).trim()) return false;
          } else if (s.stage !== filterStage) return false;
        }
        return true;
      }),
    [baseData, filterState, filterStage]
  );

  // Paginación
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredData, page]
  );
  // Reset page on students change
  React.useEffect(() => {
    setPage(1);
  }, [baseData, filterState, filterStage]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 uppercase">
            {coach?.toLowerCase() === "todos"
              ? "Todos los alumnos"
              : `Alumnos de ${coach}`}
          </h3>
          <p className="text-sm text-gray-500">
            Listado de alumnos asociados al coach y su estado actual
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:flex-1">
          {/* Pestañas de dataset al lado de los filtros */}
          {datasets && datasets.length > 0 && (
            <div className="flex items-center justify-between">
              <Tabs
                value={activeKey || datasets[0].key}
                onValueChange={(v) => setActiveKey(v)}
                className="w-full"
              >
                <TabsList className="mb-1 overflow-x-auto">
                  {datasets.map((d) => (
                    <TabsTrigger
                      key={d.key}
                      value={d.key}
                      className="shadow-none data-[state=active]:shadow-none"
                    >
                      {d.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
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
            {loadingFiltered
              ? "Cargando…"
              : `${filteredData.length} alumnos filtrados • página ${page} / ${totalPages}`}
          </div>
        </div>
      </div>
      {/* Tabla única: Filtrados por rango (metrics-v2) */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-medium">Alumno</th>
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2 text-left font-medium">Fase</th>
              <th className="px-3 py-2 text-left font-medium">Ingreso</th>
              <th className="px-3 py-2 text-left font-medium">
                Última actividad
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Inactividad (días)
              </th>
              <th className="px-3 py-2 text-left font-medium">Tickets</th>
              <th className="px-3 py-2 text-left font-medium">Contrato</th>
              <th className="px-3 py-2 text-left font-medium">Nicho</th>
              <th className="px-3 py-2 text-left font-medium">F1</th>
              <th className="px-3 py-2 text-left font-medium">F2</th>
              <th className="px-3 py-2 text-left font-medium">F3</th>
              <th className="px-3 py-2 text-left font-medium">F4</th>
              <th className="px-3 py-2 text-left font-medium">F5</th>
            </tr>
          </thead>
          <tbody>
            {loadingFiltered && (
              <tr>
                <td
                  colSpan={15}
                  className="px-3 py-4 text-center text-gray-500"
                >
                  Cargando alumnos…
                </td>
              </tr>
            )}
            {!loadingFiltered && filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={15}
                  className="px-3 py-4 text-center text-gray-500"
                >
                  Sin data conseguida.
                </td>
              </tr>
            )}
            {!loadingFiltered &&
              pageItems.map((s) => {
                const fs = s as FilteredStudent;
                return (
                  <tr
                    key={fs.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {fs.name}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {fs.code || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {(() => {
                        const v = (fs.state || "").toUpperCase();
                        const classes = v.includes("INACTIVO")
                          ? "bg-rose-100 text-rose-800"
                          : v.includes("ACTIVO")
                          ? "bg-sky-100 text-sky-800"
                          : v.includes("PROCESO")
                          ? "bg-violet-100 text-violet-800"
                          : v
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-100 text-gray-500";
                        return (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}
                          >
                            {fs.state || "—"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      {(() => {
                        const v = (fs.stage || "").toUpperCase();
                        const classes = v.includes("COPY")
                          ? "bg-amber-100 text-amber-800"
                          : v.includes("F1")
                          ? "bg-emerald-100 text-emerald-800"
                          : v.includes("F2")
                          ? "bg-lime-100 text-lime-800"
                          : v.includes("F3")
                          ? "bg-cyan-100 text-cyan-800"
                          : v.includes("F4")
                          ? "bg-sky-100 text-sky-800"
                          : v.includes("F5")
                          ? "bg-purple-100 text-purple-800"
                          : v.includes("ONBOARD")
                          ? "bg-indigo-100 text-indigo-800"
                          : v
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-100 text-gray-500";
                        return (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}
                          >
                            {fs.stage || "—"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {fs.ingreso
                        ? new Date(fs.ingreso).toLocaleDateString("es-ES")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {fs.lastActivity
                        ? new Date(fs.lastActivity).toLocaleDateString("es-ES")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {nf(fs.inactivityDays)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {nf(fs.ticketsCount)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {fs.contrato ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={fs.contrato}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 shadow-none"
                            title="Abrir contrato"
                          >
                            Ver
                          </a>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {fs.nicho || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {nf(fs.paso_f1)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {nf(fs.paso_f2)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {nf(fs.paso_f3)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {nf(fs.paso_f4)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {nf(fs.paso_f5)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      {!loadingFiltered && totalPages > 1 && (
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
