"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

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

function badgeForState(value?: string | null) {
  const raw = String(value || "");
  const v = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
  if (!v)
    return {
      className: "rounded-md bg-gray-100 text-gray-500 px-2 py-0.5 text-xs",
      label: "—",
    } as const;
  // Map similar a ResultsTable (students)
  if (v.includes("INACTIVO POR PAGO"))
    return {
      className: "rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("INACTIVO"))
    return {
      className: "rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("PAUS"))
    return {
      className: "rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("PROGRESO"))
    return {
      className: "rounded-md bg-violet-100 text-violet-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.includes("ACTIVO"))
    return {
      className: "rounded-md bg-sky-100 text-sky-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  return {
    className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
    label: raw,
  } as const;
}

function badgeForStage(value?: string | null) {
  const raw = String(value || "");
  const v = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
  if (!v)
    return {
      className: "rounded-md bg-gray-100 text-gray-500 px-2 py-0.5 text-xs",
      label: "—",
    } as const;
  if (v.includes("ONBOARD"))
    return {
      className: "rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F1"))
    return {
      className:
        "rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F2"))
    return {
      className: "rounded-md bg-lime-100 text-lime-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F3"))
    return {
      className: "rounded-md bg-cyan-100 text-cyan-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F4"))
    return {
      className: "rounded-md bg-sky-100 text-sky-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  if (v.startsWith("F5"))
    return {
      className: "rounded-md bg-purple-100 text-purple-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  return {
    className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
    label: raw,
  } as const;
}

export default function CoachStudentsTable({
  rows,
  title = "ALUMNOS DEL COACH",
  onOffer,
  onView,
}: {
  rows: Row[];
  title?: string;
  onOffer?: (row: Row) => void;
  onView?: (row: Row) => void;
}) {
  const fmt = useMemo(() => new Intl.DateTimeFormat("es-ES"), []);
  const data = Array.isArray(rows) ? rows : [];

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
              {onView && <th className="px-3 py-2 text-right">Ver</th>}
              {onOffer && <th className="px-3 py-2 text-right">Sesión</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={(() => {
                    let cols = 8;
                    if (onView) cols += 1;
                    if (onOffer) cols += 1;
                    return cols;
                  })()}
                  className="px-3 py-4 text-sm text-neutral-500 text-center"
                >
                  Sin alumnos
                </td>
              </tr>
            ) : (
              data.map((r) => {
                const st = badgeForState(r.state);
                const ph = badgeForStage(r.stage);
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
                    {onView && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs border hover:bg-gray-100"
                          title="Ver sesiones del alumno"
                          onClick={() => onView(r)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                        </button>
                      </td>
                    )}
                    {onOffer && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs border hover:bg-gray-100"
                          title="Ofrecer sesión"
                          onClick={() => onOffer(r)}
                        >
                          Sesión
                        </button>
                      </td>
                    )}
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
