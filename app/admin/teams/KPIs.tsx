"use client";

import { Users, PanelsTopLeft, Grid2X2 } from "lucide-react";

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "sky" | "violet" | "emerald";
}) {
  const map = {
    sky: { bg: "bg-sky-50", text: "text-sky-600" },
    violet: { bg: "bg-violet-50", text: "text-violet-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  }[accent];

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 ${map.bg}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-semibold ${map.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function KPIs({
  totalEquipos,
  totalAlumnos,
  areas,
}: {
  totalEquipos: number;
  totalAlumnos: number;
  areas: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <KpiCard
        icon={<PanelsTopLeft className="h-5 w-5 text-sky-600" />}
        label="Total de equipos"
        value={totalEquipos}
        accent="sky"
      />
      <KpiCard
        icon={<Users className="h-5 w-5 text-violet-600" />}
        label="Total de alumnos"
        value={totalAlumnos}
        accent="violet"
      />
      <KpiCard
        icon={<Grid2X2 className="h-5 w-5 text-emerald-600" />}
        label="Áreas distintas"
        value={areas}
        accent="emerald"
      />
    </div>
  );
}
