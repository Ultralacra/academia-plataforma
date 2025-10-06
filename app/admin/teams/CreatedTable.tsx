"use client";

import { useMemo, useState } from "react";
import type { CreatedTeamMetric } from "./metrics-created";
import { formatDuration } from "./format";

export default function CreatedTable({
  rows,
  loading,
}: {
  rows: CreatedTeamMetric[];
  loading?: boolean;
}) {
  const [sort, setSort] = useState<{
    key: keyof CreatedTeamMetric;
    dir: "asc" | "desc";
  }>({
    key: "tickets",
    dir: "desc",
  });

  const data = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sort.key] as any;
      const vb = b[sort.key] as any;
      if (typeof va === "number" && typeof vb === "number") {
        return sort.dir === "asc" ? va - vb : vb - va;
      }
      return sort.dir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [rows, sort]);

  const headerBtn = (label: string, key: keyof CreatedTeamMetric) => {
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
          <h3 className="text-sm font-semibold">Equipos conformados</h3>
          <p className="text-xs text-muted-foreground">
            Tickets y tiempos promedio por equipo
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-gray-50">
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="px-4 py-2">
                {headerBtn("Código", "codigo_equipo")}
              </th>
              <th className="px-4 py-2">
                {headerBtn("Coach", "nombre_coach")}
              </th>
              <th className="px-4 py-2">{headerBtn("Puesto", "puesto")}</th>
              <th className="px-4 py-2">{headerBtn("Área", "area")}</th>
              <th className="px-4 py-2">{headerBtn("Tickets", "tickets")}</th>
              <th className="px-4 py-2">
                {headerBtn("Resp. prom.", "avgResponse")}
              </th>
              <th className="px-4 py-2">
                {headerBtn("Resol. prom.", "avgResolution")}
              </th>
              <th className="px-4 py-2">Estatus</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.codigo_equipo} className="border-b">
                <td className="px-4 py-2 font-mono text-xs">
                  {r.codigo_equipo}
                </td>
                <td className="px-4 py-2 font-medium">{r.nombre_coach}</td>
                <td className="px-4 py-2">{r.puesto || "—"}</td>
                <td className="px-4 py-2">{r.area || "—"}</td>
                <td className="px-4 py-2">{r.tickets}</td>
                <td className="px-4 py-2">{formatDuration(r.avgResponse)}</td>
                <td className="px-4 py-2">{formatDuration(r.avgResolution)}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-700">
                      Abiertos: {r.statusDist.Abiertos}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      Cerrados: {r.statusDist.Cerrados}
                    </span>
                    <span className="rounded bg-violet-50 px-2 py-0.5 text-violet-700">
                      En Proceso: {r.statusDist["En Proceso"]}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  No hay datos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
