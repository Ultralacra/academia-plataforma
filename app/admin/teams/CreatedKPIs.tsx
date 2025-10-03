"use client";

import { Users, BarChart3, FileText } from "lucide-react";

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

export default function CreatedKPIs({
  teams,
  coaches,
  tickets,
}: {
  teams: number;
  coaches: number;
  tickets: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <KpiCard
        icon={<Users className="h-5 w-5 text-sky-600" />}
        label="Equipos conformados"
        value={teams}
        accent="sky"
      />
      <KpiCard
        icon={<BarChart3 className="h-5 w-5 text-violet-600" />}
        label="Coaches distintos"
        value={coaches}
        accent="violet"
      />
      <KpiCard
        icon={<FileText className="h-5 w-5 text-emerald-600" />}
        label="Tickets totales"
        value={tickets}
        accent="emerald"
      />
    </div>
  );
}
