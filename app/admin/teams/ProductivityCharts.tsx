"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
// ProdByCoach shape provided by metrics API; keep a local type here to avoid dependency on faker
type ProdByCoach = {
  coach: string;
  tickets: number;
  sessions: number;
  hours: number;
};

function Card({ children }: any) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">{children}</div>
  );
}
function Header({ title }: any) {
  return (
    <div className="border-b px-5 py-4">
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}
function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {p.name}: <span className="font-semibold">{p.value}</span>
      </p>
    </div>
  );
}

export default function ProductivityCharts({ rows }: { rows: ProdByCoach[] }) {
  const base = rows.map((r) => ({
    x: r.coach,
    tickets: r.tickets,
    sessions: r.sessions,
    hours: r.hours,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <Header title="Tickets por coach" />
        <div className="h-64 px-5 pb-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={base}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" hide />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="tickets"
                name="Tickets"
                fill="#0ea5e9"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Header title="Sesiones por coach" />
        <div className="h-64 px-5 pb-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={base}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" hide />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="sessions"
                name="Sesiones"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Header title="Horas invertidas por coach" />
        <div className="h-64 px-5 pb-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={base}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" hide />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="hours"
                name="Horas"
                fill="#f59e0b"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
