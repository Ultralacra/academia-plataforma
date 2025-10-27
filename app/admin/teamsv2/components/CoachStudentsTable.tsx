"use client";

import { useMemo } from "react";
import Link from "next/link";

type Row = {
  id: number | string;
  name: string;
  code?: string | null;
  state?: string | null;
  stage?: string | null;
  ingreso?: string | null;
  tickets?: number | null;
  lastActivity?: string | null;
  inactividad?: number | null;
};

export default function CoachStudentsTable({
  rows,
  title = "ALUMNOS DEL COACH",
}: {
  rows: Row[];
  title?: string;
}) {
  const fmt = useMemo(() => new Intl.DateTimeFormat("es-ES"), []);
  const data = Array.isArray(rows) ? rows : [];

  const badgeFor = (value?: string | null) => {
    const v = String(value || "").toLowerCase();
    if (!v) return { className: "hidden", label: "" } as const;
    if (v.includes("activo"))
      return {
        className:
          "rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs",
        label: value as string,
      } as const;
    if (v.includes("paus"))
      return {
        className:
          "rounded-md border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-xs",
        label: value as string,
      } as const;
    if (v.includes("inac") || v.includes("baja"))
      return {
        className:
          "rounded-md border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5 text-xs",
        label: value as string,
      } as const;
    return {
      className:
        "rounded-md border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-0.5 text-xs",
      label: value as string,
    } as const;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">Listado compacto</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left">Alumno</th>
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Fase</th>
              <th className="px-3 py-2 text-left">Ingreso</th>
              <th className="px-3 py-2 text-left">Última actividad</th>
              <th className="px-3 py-2 text-right">Inactividad (días)</th>
              <th className="px-3 py-2 text-right">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-sm text-neutral-500 text-center"
                >
                  Sin alumnos
                </td>
              </tr>
            ) : (
              data.map((r) => {
                const st = badgeFor(r.state);
                const ph = badgeFor(r.stage);
                return (
                  <tr
                    key={`${r.id}`}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 text-gray-900 truncate">
                      {r.code ? (
                        <Link
                          href={`/admin/alumnos/${encodeURIComponent(
                            String(r.code)
                          )}`}
                          className="hover:underline"
                        >
                          {r.name || r.code}
                        </Link>
                      ) : (
                        r.name || r.code || "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-700 truncate max-w-[160px]">
                      {r.code ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={st.className}>{st.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={ph.className}>{ph.label}</span>
                    </td>
                    <td className="px-3 py-2 text-neutral-700">
                      {r.ingreso ? fmt.format(new Date(r.ingreso)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">
                      {r.lastActivity
                        ? fmt.format(new Date(r.lastActivity))
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.inactividad == null || isNaN(Number(r.inactividad))
                        ? "—"
                        : Number(r.inactividad).toLocaleString("es-ES")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.tickets == null || isNaN(Number(r.tickets))
                        ? "—"
                        : Number(r.tickets).toLocaleString("es-ES")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
