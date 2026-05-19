"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { Ticket } from "@/lib/data-service";
import {
  computeStudentMonthlyAvg,
  getMonthsInRange,
  type StudentAvgEntry,
} from "./student-avg-metrics";

// ─── Local UI primitives (mismo estilo que tickets-content) ──────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-none">
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2">
          <Users className="h-4 w-4 text-gray-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const MAX_MONTH_COLS = 6; // máximo de columnas de desglose mensual

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StudentTicketsAvg({
  tickets,
  fechaDesde,
  fechaHasta,
  loading,
}: {
  tickets: Ticket[];
  fechaDesde: string;
  fechaHasta: string;
  loading: boolean;
}) {
  const [page, setPage] = useState(1);

  const months = useMemo(
    () => getMonthsInRange(fechaDesde, fechaHasta),
    [fechaDesde, fechaHasta],
  );

  const entries: StudentAvgEntry[] = useMemo(
    () => computeStudentMonthlyAvg(tickets, fechaDesde, fechaHasta),
    [tickets, fechaDesde, fechaHasta],
  );

  // Resetear página si cambian los datos
  useMemo(() => setPage(1), [entries]);

  const showMonthCols = months.length > 0 && months.length <= MAX_MONTH_COLS;
  const totalMonths = months.length;

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Resumen global ────────────────────────────────────────────────────────
  const totalTickets = entries.reduce((s, e) => s + e.totalTickets, 0);
  const totalAlumnos = entries.length;
  /** Promedio de tickets por alumno en todo el rango (sin dividir por meses) */
  const avgPerAlumno =
    totalAlumnos > 0
      ? Math.round((totalTickets / totalAlumnos) * 100) / 100
      : 0;
  /** Promedio de tickets por alumno × mes */
  const avgPerAlumnoPerMonth =
    totalAlumnos > 0 && totalMonths > 0
      ? Math.round((totalTickets / totalAlumnos / totalMonths) * 100) / 100
      : 0;

  const subtitle = `${totalMonths} ${totalMonths === 1 ? "mes" : "meses"} en el rango · ${totalAlumnos} alumnos`;

  return (
    <Card>
      <CardHeader
        title="Promedio mensual de tickets por alumno"
        subtitle={subtitle}
      />

      {/* ── KPIs resumen global ─────────────────────────────────────────── */}
      {!loading && totalAlumnos > 0 && (
        <div className="flex flex-wrap gap-4 border-b px-5 py-4">
          <SummaryKpi label="Total tickets" value={totalTickets.toString()} />
          <SummaryKpi
            label="Alumnos con tickets"
            value={totalAlumnos.toString()}
          />
          <SummaryKpi
            label="Tickets por alumno (rango)"
            value={avgPerAlumno.toFixed(2)}
            hint={`Total tickets ÷ alumnos`}
          />
          <SummaryKpi
            label="Tickets por alumno / mes"
            value={avgPerAlumnoPerMonth.toFixed(2)}
            hint={`Total tickets ÷ alumnos ÷ ${totalMonths} ${totalMonths === 1 ? "mes" : "meses"}`}
            highlight
          />
        </div>
      )}

      <CardBody className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-1 bg-white">
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Alumno</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Promedio / mes</th>
              {showMonthCols &&
                months.map((m) => (
                  <th key={m} className="px-3 py-3 text-right">
                    {formatMonthLabel(m)}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-400"
                  colSpan={4 + (showMonthCols ? months.length : 0)}
                >
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && pageEntries.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-400"
                  colSpan={4 + (showMonthCols ? months.length : 0)}
                >
                  No hay datos para el rango seleccionado.
                </td>
              </tr>
            )}
            {!loading &&
              pageEntries.map((entry, idx) => {
                const rank = (page - 1) * PAGE_SIZE + idx + 1;
                return (
                  <tr
                    key={entry.id_alumno}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-gray-400">
                      {rank}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">
                        {entry.nombre}
                      </span>
                      {entry.id_alumno !== entry.nombre && (
                        <span className="ml-2 text-xs text-gray-400">
                          {entry.id_alumno}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {entry.totalTickets}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <AvgBadge value={entry.avgPerMonth} />
                    </td>
                    {showMonthCols &&
                      months.map((m) => {
                        const count = entry.monthlyBreakdown[m] ?? 0;
                        return (
                          <td
                            key={m}
                            className="px-3 py-2.5 text-right tabular-nums text-gray-600"
                          >
                            {count > 0 ? (
                              count
                            ) : (
                              <span className="text-gray-300">–</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-gray-500">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, entries.length)} de {entries.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-gray-50"
              >
                ‹ Anterior
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function AvgBadge({ value }: { value: number }) {
  let color = "bg-gray-100 text-gray-700";
  if (value >= 4) color = "bg-red-100 text-red-700";
  else if (value >= 2) color = "bg-amber-100 text-amber-700";
  else if (value >= 1) color = "bg-sky-100 text-sky-700";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {value.toFixed(1)}
    </span>
  );
}

function formatMonthLabel(ym: string): string {
  // "2026-03" → "Mar 26"
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const monthName = months[+m[2] - 1] ?? m[2];
  const year = m[1].slice(2);
  return `${monthName} ${year}`;
}

function SummaryKpi({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 ${
        highlight ? "border-sky-200 bg-sky-50" : "border-gray-100 bg-gray-50"
      }`}
    >
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-xl font-bold tabular-nums ${highlight ? "text-sky-700" : "text-gray-900"}`}
      >
        {value}
      </span>
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </div>
  );
}
