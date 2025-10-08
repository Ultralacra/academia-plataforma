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
    <div className={`rounded-2xl border border-gray-200 bg-white ${className}`}>
      {children}
    </div>
  );
}
function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-gray-100 px-5 py-4 bg-white">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
function CardBody({ children, className = "" }: any) {
  return <div className={`px-5 py-4 bg-white ${className}`}>{children}</div>;
}

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-gray-500">
        {p.name}: <span className="font-semibold text-gray-900">{p.value}</span>
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
              {/* Color sólido para barras */}
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="alumnos"
                name="Alumnos"
                fill="#6366f1"
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
              {/* Color sólido para barras */}
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
                fill="#6366f1"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}
