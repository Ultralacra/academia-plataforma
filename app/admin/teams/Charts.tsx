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

function Card({ children, className = "" }: any) {
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}
function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b px-5 py-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
function CardBody({ children, className = "" }: any) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
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

export default function Charts({
  alumnosPorEquipo,
  areasCount,
}: {
  alumnosPorEquipo: { name: string; alumnos: number }[];
  areasCount: { area: string; count: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Top equipos por alumnos"
          subtitle="Máximo 12 para legibilidad"
        />
        <CardBody className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={alumnosPorEquipo} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="alumnos"
                name="Alumnos"
                fill="url(#gSky)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Equipos por área"
          subtitle="Conteo de equipos agrupados por área"
        />
        <CardBody className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areasCount}>
              <defs>
                <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="area"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                dy={8}
              />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="count"
                name="Equipos"
                fill="url(#gViolet)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}
