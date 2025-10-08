"use client";

import { Users, MapPin, Clock, CheckCircle2, Activity } from "lucide-react";
import React from "react";

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-3 bg-gray-50">{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function KPIs({
  totalAlumnos,
  areaCoach,
  abiertos,
  enProceso,
  cerrados,
  tasaResolucion,
  loading,
}: {
  totalAlumnos: number;
  areaCoach: string | null;
  abiertos: number | null;
  enProceso: number | null;
  cerrados: number | null;
  tasaResolucion: number | null; // 0..1
  loading?: boolean;
}) {
  const skeleton = (
    <div className="h-16 w-full animate-pulse rounded-xl bg-gray-100" />
  );
  const fmtRate = (v: number | null) =>
    v == null ? "—" : `${(v * 100).toFixed(1)}%`;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        icon={<Users className="h-5 w-5 text-gray-400" />}
        label="Alumnos"
        value={loading ? "…" : totalAlumnos}
      />
      <KpiCard
        icon={<MapPin className="h-5 w-5 text-gray-400" />}
        label="Área"
        value={loading ? "…" : areaCoach || "—"}
      />
      <KpiCard
        icon={<Activity className="h-5 w-5 text-gray-400" />}
        label="Abiertos"
        value={loading ? "…" : abiertos ?? "—"}
      />
      <KpiCard
        icon={<Clock className="h-5 w-5 text-gray-400" />}
        label="En proceso"
        value={loading ? "…" : enProceso ?? "—"}
      />
      <KpiCard
        icon={<CheckCircle2 className="h-5 w-5 text-gray-400" />}
        label="Cerrados"
        value={loading ? "…" : cerrados ?? "—"}
      />
      <KpiCard
        icon={<CheckCircle2 className="h-5 w-5 text-gray-400" />}
        label="Tasa resolución"
        value={loading ? "…" : fmtRate(tasaResolucion)}
      />
    </div>
  );
}
