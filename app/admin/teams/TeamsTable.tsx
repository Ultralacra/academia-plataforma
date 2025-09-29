"use client";

import { useMemo, useState } from "react";
import type { Team } from "@/lib/data-service";
import { ChevronLeft, ChevronRight, UserRoundSearch } from "lucide-react";

type Props = {
  data: Team[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (n: number) => void;
  onOpenAlumnos: (t: Team) => void;
  loading?: boolean;
};

export default function TeamsTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onOpenAlumnos,
  loading,
}: Props) {
  // Sort client-side
  const [sort, setSort] = useState<{
    key: keyof Team | "nAlumnos";
    dir: "asc" | "desc";
  }>({
    key: "nombre",
    dir: "asc",
  });

  const sorted = useMemo(() => {
    const arr = [...data];
    const key = sort.key;
    arr.sort((a, b) => {
      const va =
        key === "nAlumnos"
          ? a.nAlumnos ?? a.alumnos.length
          : (a as any)[key] ?? "";
      const vb =
        key === "nAlumnos"
          ? b.nAlumnos ?? b.alumnos.length
          : (b as any)[key] ?? "";
      if (typeof va === "number" && typeof vb === "number")
        return sort.dir === "asc" ? va - vb : vb - va;
      return sort.dir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [data, sort]);

  const headerBtn = (label: string, key: keyof Team | "nAlumnos") => {
    const active = sort.key === key;
    return (
      <button
        className={`flex items-center gap-1 hover:underline ${
          active ? "text-sky-700" : ""
        }`}
        onClick={() =>
          setSort((s) =>
            s.key === key
              ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
              : { key, dir: "asc" }
          )
        }
      >
        <span>{label}</span>
        {active && (
          <span className="text-[10px]">{sort.dir === "asc" ? "▲" : "▼"}</span>
        )}
      </button>
    );
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold">Listado de equipos</h3>
          <p className="text-xs text-muted-foreground">
            Resultados según filtros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Filas</label>
          <select
            className="rounded-lg border px-2 py-1 text-xs"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-gray-50">
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="px-4 py-2">{headerBtn("Código", "codigo")}</th>
              <th className="px-4 py-2">{headerBtn("Nombre", "nombre")}</th>
              <th className="px-4 py-2">{headerBtn("Puesto", "puesto")}</th>
              <th className="px-4 py-2">{headerBtn("Área", "area")}</th>
              <th className="px-4 py-2">
                {headerBtn("# Alumnos", "nAlumnos")}
              </th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, idx) => (
              <tr
                key={t.id}
                className={`border-b ${idx % 2 ? "bg-white" : "bg-white"}`}
              >
                <td className="px-4 py-2 font-mono text-xs">{t.codigo}</td>
                <td className="px-4 py-2 font-medium">{t.nombre}</td>
                <td className="px-4 py-2">{t.puesto ?? "-"}</td>
                <td className="px-4 py-2">{t.area ?? "-"}</td>
                <td className="px-4 py-2">{t.nAlumnos ?? t.alumnos.length}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => onOpenAlumnos(t)}
                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                  >
                    <UserRoundSearch className="h-4 w-4" />
                    Ver alumnos
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No hay datos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-xs text-muted-foreground">
          Total: <span className="font-medium">{total}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span className="text-xs">
            Página <span className="font-medium">{page}</span> de{" "}
            <span className="font-medium">{totalPages}</span>
          </span>
          <button
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
