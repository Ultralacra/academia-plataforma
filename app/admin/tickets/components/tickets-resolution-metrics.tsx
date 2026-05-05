"use client";

import { Timer, Percent, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import type { Ticket } from "@/lib/data-service";

// ─── helpers ──────────────────────────────────────────────────────────────────

function normEstado(v?: string | null) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
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

type AreaMetrics = {
  area: string;
  total: number;
  resolved: number;
  rate: number;
  avgMinutes: number | null;
  avgHms: string | null;
};

function computeForGroup(tickets: Ticket[]): Omit<AreaMetrics, "area"> {
  const total = tickets.length;
  const resolvedTickets = tickets.filter(
    (t) => normEstado(t.estado) === "RESUELTO",
  );
  const resolved = resolvedTickets.length;
  const rate = total > 0 ? (resolved / total) * 100 : 0;

  const diffs: number[] = [];
  for (const t of resolvedTickets) {
    const created = new Date(t.creacion);
    const lastDate = t.ultimo_estado?.fecha
      ? new Date(t.ultimo_estado.fecha)
      : null;
    if (!lastDate || isNaN(lastDate.getTime()) || isNaN(created.getTime()))
      continue;
    const diffMin = (lastDate.getTime() - created.getTime()) / 60000;
    if (diffMin > 0) diffs.push(diffMin);
  }

  const avgMinutes =
    diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;

  return {
    total,
    resolved,
    rate,
    avgMinutes,
    avgHms: avgMinutes !== null ? minsToHms(avgMinutes) : null,
  };
}

function computeByArea(tickets: Ticket[]): AreaMetrics[] {
  const map = new Map<string, Ticket[]>();

  for (const t of tickets) {
    const areas = new Set<string>();
    if (Array.isArray(t.coaches) && t.coaches.length > 0) {
      for (const c of t.coaches) {
        const area = String(c.area ?? "").trim() || "Sin área";
        areas.add(area);
      }
    } else {
      areas.add("Sin área");
    }
    for (const area of areas) {
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(t);
    }
  }

  return Array.from(map.entries())
    .map(([area, ts]) => ({ area, ...computeForGroup(ts) }))
    .sort((a, b) => b.total - a.total);
}

// ─── colores por área ─────────────────────────────────────────────────────────

type AreaTheme = {
  bar: string;
  iconBg: string;
  iconText: string;
  iconRing: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  rateBg: string;
};

function areaTheme(area: string): AreaTheme {
  const k = String(area)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (k.includes("copy"))
    return {
      bar: "from-fuchsia-500 to-pink-500",
      iconBg: "bg-fuchsia-50",
      iconText: "text-fuchsia-600",
      iconRing: "ring-fuchsia-100",
      chipBg: "bg-fuchsia-50",
      chipBorder: "border-fuchsia-200",
      chipText: "text-fuchsia-700",
      rateBg: "bg-fuchsia-50",
    };
  if (k.includes("ads"))
    return {
      bar: "from-emerald-500 to-green-500",
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      iconRing: "ring-emerald-100",
      chipBg: "bg-emerald-50",
      chipBorder: "border-emerald-200",
      chipText: "text-emerald-700",
      rateBg: "bg-emerald-50",
    };
  if (k.includes("tecnic") || k.includes("tech"))
    return {
      bar: "from-sky-500 to-blue-500",
      iconBg: "bg-sky-50",
      iconText: "text-sky-600",
      iconRing: "ring-sky-100",
      chipBg: "bg-sky-50",
      chipBorder: "border-sky-200",
      chipText: "text-sky-700",
      rateBg: "bg-sky-50",
    };
  if (k.includes("atencion") || k.includes("cliente") || k.includes("atc"))
    return {
      bar: "from-amber-500 to-yellow-500",
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
      iconRing: "ring-amber-100",
      chipBg: "bg-amber-50",
      chipBorder: "border-amber-200",
      chipText: "text-amber-700",
      rateBg: "bg-amber-50",
    };
  return {
    bar: "from-violet-500 to-indigo-500",
    iconBg: "bg-violet-50",
    iconText: "text-violet-600",
    iconRing: "ring-violet-100",
    chipBg: "bg-violet-50",
    chipBorder: "border-violet-200",
    chipText: "text-violet-700",
    rateBg: "bg-violet-50",
  };
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function GlobalCard({
  total,
  resolved,
  rate,
  avgMinutes,
  avgHms,
}: Omit<AreaMetrics, "area">) {
  const pending = Math.max(total - resolved, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-indigo-500 via-violet-500 to-fuchsia-500" />
      <div className="grid grid-cols-1 divide-y p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {/* Promedio resolución */}
        <div className="flex items-start gap-3 px-5 py-4">
          <div className="mt-0.5 rounded-xl bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Promedio resolución · General
            </div>
            {avgMinutes !== null ? (
              <>
                <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                  {avgMinutes.toFixed(1)}{" "}
                  <span className="text-base font-semibold text-gray-500">
                    min
                  </span>
                </div>
                <div className="text-sm text-gray-500">({avgHms})</div>
              </>
            ) : (
              <div className="mt-1 text-xl font-semibold text-gray-400">
                Sin datos
              </div>
            )}
          </div>
        </div>

        {/* Tasa de resolución */}
        <div className="flex items-start gap-3 px-5 py-4">
          <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
            <Percent className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">
              Tasa de resolución · General
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
              {rate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              ({resolved}/{total})
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> RESUELTO: {resolved}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <Clock className="h-3.5 w-3.5" /> PENDIENTE: {pending}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AreaCard({
  area,
  total,
  resolved,
  rate,
  avgMinutes,
  avgHms,
}: AreaMetrics) {
  const th = areaTheme(area);
  const pending = Math.max(total - resolved, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${th.bar}`}
      />
      <div className="p-4 pt-5">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${th.chipBg} ${th.chipBorder} ${th.chipText}`}
          >
            {area}
          </span>
          <span className="text-xs text-gray-400">{total} tickets</span>
        </div>

        {/* Rate bar */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Tasa de resolución
            </span>
            <span className={`text-sm font-bold tabular-nums ${th.chipText}`}>
              {rate.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full bg-linear-to-r ${th.bar} transition-all duration-500`}
              style={{ width: `${Math.min(rate, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-400">
            ({resolved}/{total})
          </div>
        </div>

        {/* Avg resolution */}
        <div className="flex items-start gap-2">
          <div
            className={`mt-0.5 rounded-lg p-1.5 ring-1 ${th.iconBg} ${th.iconText} ${th.iconRing}`}
          >
            <Timer className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">
              Promedio resolución
            </div>
            {avgMinutes !== null ? (
              <>
                <div className="text-sm font-bold tabular-nums text-gray-900">
                  {avgMinutes.toFixed(1)}{" "}
                  <span className="font-semibold text-gray-500">min</span>
                </div>
                <div className="text-xs text-gray-400">({avgHms})</div>
              </>
            ) : (
              <div className="text-sm font-semibold text-gray-400">
                Sin datos
              </div>
            )}
          </div>
        </div>

        {/* Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> {resolved}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            <Clock className="h-3 w-3" /> {pending}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 w-full animate-pulse rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function TicketsResolutionMetrics({
  tickets,
  loading,
}: {
  tickets: Ticket[];
  loading?: boolean;
}) {
  const global = useMemo(() => computeForGroup(tickets), [tickets]);
  const byArea = useMemo(() => computeByArea(tickets), [tickets]);

  if (loading) return <Skeleton />;
  if (!tickets.length) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">
          Métricas de resolución
        </h3>
        <span className="text-xs text-gray-400">— general y por área</span>
      </div>

      {/* Tarjeta global */}
      <GlobalCard {...global} />

      {/* Grid por área */}
      {byArea.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {byArea.map((a) => (
            <AreaCard key={a.area} {...a} />
          ))}
        </div>
      )}
    </div>
  );
}
