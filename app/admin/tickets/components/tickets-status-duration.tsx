"use client";

import { useMemo, useState } from "react";
import { Timer, AlertTriangle, TrendingUp, ExternalLink } from "lucide-react";
import type { Ticket } from "@/lib/data-service";

// ─── helpers ──────────────────────────────────────────────────────────────────

function normEstado(v?: string | null) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function minsToHuman(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const days = Math.floor(minutes / 1440);
  const hrs = Math.floor((minutes % 1440) / 60);
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
}

function minsToHms(minutes: number): string {
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");
}

function median(vals: number[]): number | null {
  if (!vals.length) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── tipos ────────────────────────────────────────────────────────────────────

type StatusDuration = {
  estado: string;
  count: number;
  avgMinutes: number;
  medianMinutes: number | null;
  maxMinutes: number;
  minMinutes: number;
  oldestTicket: Ticket | null;
};

// Colores y etiquetas por estado
type StatusTheme = {
  bg: string;
  border: string;
  text: string;
  badge: string;
  badgeBorder: string;
  badgeText: string;
  bar: string;
  icon: string;
};

const STATUS_ORDER = [
  "PENDIENTE",
  "EN PROGRESO",
  "PENDIENTE DE ENVIO",
  "PAUSADO",
  "EN PAUSA",
  "PAUSA",
  "RESUELTO",
];

function statusRank(s: string): number {
  const idx = STATUS_ORDER.indexOf(s);
  return idx === -1 ? 50 : idx;
}

function statusTheme(estado: string): StatusTheme {
  const k = estado.toLowerCase();
  if (k.includes("resuelto"))
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      badge: "bg-emerald-100",
      badgeBorder: "border-emerald-200",
      badgeText: "text-emerald-800",
      bar: "bg-emerald-500",
      icon: "text-emerald-600",
    };
  if (k.includes("progreso") || k.includes("proceso"))
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      badge: "bg-amber-100",
      badgeBorder: "border-amber-200",
      badgeText: "text-amber-800",
      bar: "bg-amber-500",
      icon: "text-amber-600",
    };
  if (k.includes("envio"))
    return {
      bg: "bg-sky-50",
      border: "border-sky-200",
      text: "text-sky-900",
      badge: "bg-sky-100",
      badgeBorder: "border-sky-200",
      badgeText: "text-sky-800",
      bar: "bg-sky-500",
      icon: "text-sky-600",
    };
  if (k.includes("paus"))
    return {
      bg: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-900",
      badge: "bg-violet-100",
      badgeBorder: "border-violet-200",
      badgeText: "text-violet-800",
      bar: "bg-violet-500",
      icon: "text-violet-600",
    };
  if (k.includes("pendiente"))
    return {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-900",
      badge: "bg-rose-100",
      badgeBorder: "border-rose-200",
      badgeText: "text-rose-800",
      bar: "bg-rose-500",
      icon: "text-rose-600",
    };
  return {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-900",
    badge: "bg-slate-100",
    badgeBorder: "border-slate-200",
    badgeText: "text-slate-700",
    bar: "bg-slate-400",
    icon: "text-slate-500",
  };
}

// ─── cómputo principal ────────────────────────────────────────────────────────

function computeStatusDurations(tickets: Ticket[]): StatusDuration[] {
  const now = Date.now();
  const map = new Map<
    string,
    { mins: number[]; oldest: Ticket | null; oldestMin: number }
  >();

  for (const t of tickets) {
    const estado = normEstado(t.estado) || "SIN ESTADO";
    const refDateStr = t.ultimo_estado?.fecha ?? t.creacion;
    if (!refDateStr) continue;
    const refDate = new Date(refDateStr);
    if (isNaN(refDate.getTime())) continue;
    const diffMin = (now - refDate.getTime()) / 60000;
    if (diffMin < 0) continue;

    if (!map.has(estado))
      map.set(estado, { mins: [], oldest: null, oldestMin: -1 });
    const bucket = map.get(estado)!;
    bucket.mins.push(diffMin);
    if (diffMin > bucket.oldestMin) {
      bucket.oldestMin = diffMin;
      bucket.oldest = t;
    }
  }

  return Array.from(map.entries())
    .map(([estado, { mins, oldest }]) => {
      const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
      return {
        estado,
        count: mins.length,
        avgMinutes: avg,
        medianMinutes: median(mins),
        maxMinutes: Math.max(...mins),
        minMinutes: Math.min(...mins),
        oldestTicket: oldest,
      };
    })
    .sort((a, b) => statusRank(a.estado) - statusRank(b.estado));
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function StatusCard({
  estado,
  count,
  avgMinutes,
  medianMinutes,
  maxMinutes,
  oldestTicket,
  barPct,
  onTicketClick,
}: StatusDuration & { barPct: number; onTicketClick?: (t: Ticket) => void }) {
  const th = statusTheme(estado);
  const isStale = avgMinutes > 1440 * 2; // > 2 días = señal de alerta

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${th.border} bg-white shadow-sm`}
    >
      {/* borde top coloreado */}
      <div className={`absolute inset-x-0 top-0 h-1 ${th.bar}`} />

      <div className="p-4 pt-5">
        {/* Estado badge + count */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${th.badge} ${th.badgeBorder} ${th.badgeText}`}
          >
            {estado}
          </span>
          <span className="text-xs font-medium text-gray-400">
            {count} ticket{count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Barra relativa */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">Tiempo en estado</span>
            {isStale && <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-1.5 rounded-full ${th.bar} transition-all duration-500`}
              style={{ width: `${Math.min(barPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          {/* Promedio */}
          <div className="rounded-xl bg-gray-50 p-2.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Timer className={`h-3 w-3 ${th.icon}`} />
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Promedio
              </span>
            </div>
            <div className="text-sm font-bold tabular-nums text-gray-900">
              {minsToHuman(avgMinutes)}
            </div>
            <div className="text-[10px] text-gray-400">
              ({minsToHms(avgMinutes)})
            </div>
          </div>

          {/* Mediana */}
          <div className="rounded-xl bg-gray-50 p-2.5">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className={`h-3 w-3 ${th.icon}`} />
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Mediana
              </span>
            </div>
            <div className="text-sm font-bold tabular-nums text-gray-900">
              {medianMinutes !== null ? minsToHuman(medianMinutes) : "—"}
            </div>
            {medianMinutes !== null && (
              <div className="text-[10px] text-gray-400">
                ({minsToHms(medianMinutes)})
              </div>
            )}
          </div>
        </div>

        {/* Máximo (más viejo) — clickable si hay ticket */}
        <button
          type="button"
          disabled={!oldestTicket || !onTicketClick}
          onClick={() => oldestTicket && onTicketClick?.(oldestTicket)}
          className={`mt-2 w-full rounded-xl px-2.5 py-2 text-left transition-colors ${
            oldestTicket && onTicketClick
              ? `${th.bg} hover:brightness-95 cursor-pointer group`
              : "bg-gray-50 cursor-default"
          }`}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                El más antiguo lleva{" "}
              </span>
              <span className="text-xs font-bold text-gray-800">
                {minsToHuman(maxMinutes)}
              </span>
              <span className="text-[10px] text-gray-400">
                {" "}
                · ({minsToHms(maxMinutes)})
              </span>
              {oldestTicket && (
                <div className="mt-0.5 truncate text-[10px] text-gray-500">
                  {oldestTicket.id_externo
                    ? `#${oldestTicket.id_externo}`
                    : `ID ${oldestTicket.id}`}
                  {oldestTicket.alumno_nombre
                    ? ` · ${oldestTicket.alumno_nombre}`
                    : ""}
                  {oldestTicket.nombre ? ` — ${oldestTicket.nombre}` : ""}
                </div>
              )}
            </div>
            {oldestTicket && onTicketClick && (
              <ExternalLink
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100 ${th.icon}`}
              />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  );
}

// ─── export ───────────────────────────────────────────────────────────────────

export default function TicketsStatusDuration({
  tickets,
  loading,
  onTicketClick,
}: {
  tickets: Ticket[];
  loading?: boolean;
  onTicketClick?: (ticket: Ticket) => void;
}) {
  const rows = useMemo(() => computeStatusDurations(tickets), [tickets]);

  if (loading) return <Skeleton />;
  if (!rows.length) return null;

  // Normalizar barra respecto al promedio máximo (excluye Resuelto del máximo para no aplastar el resto)
  const maxAvg = Math.max(
    ...rows
      .filter((r) => !r.estado.includes("RESUELTO"))
      .map((r) => r.avgMinutes),
    1,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">
          Tiempo en cada estado
        </h3>
        <span className="text-xs text-gray-400">
          — desde el último cambio de estado
        </span>
      </div>

      {/* Nota aclaratoria */}
      <p className="text-xs text-gray-500 leading-relaxed -mt-1">
        Muestra cuánto tiempo llevan los tickets{" "}
        <strong>en su estado actual</strong> (desde el último cambio de estado).
        Útil para detectar estados donde los tickets se acumulan o quedan sin
        atención.
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((row) => {
          const barPct = (row.avgMinutes / (maxAvg || 1)) * 100;
          return (
            <StatusCard
              key={row.estado}
              {...row}
              barPct={Math.min(barPct, 100)}
              onTicketClick={onTicketClick}
            />
          );
        })}
      </div>
    </div>
  );
}
