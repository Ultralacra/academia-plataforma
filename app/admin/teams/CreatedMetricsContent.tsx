"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Text,
} from "recharts";

type Row = {
  statusDist?: {
    Abiertos?: number;
    "En Proceso"?: number;
    Cerrados?: number;
  };
};

export default function CreatedMetricsContent({
  initialRows,
  totalTicketsForStatus = 0,
}: {
  initialRows: Row[];
  totalTicketsForStatus?: number;
}) {
  // Agregado global por estatus
  const statusAgg = useMemo(() => {
    return (initialRows ?? []).reduce(
      (acc, r) => {
        acc.abiertos += Number(r.statusDist?.Abiertos ?? 0);
        acc.proceso += Number(r.statusDist?.["En Proceso"] ?? 0);
        acc.cerrados += Number(r.statusDist?.Cerrados ?? 0);
        return acc;
      },
      { abiertos: 0, proceso: 0, cerrados: 0 }
    );
  }, [initialRows]);

  // Total preferido del padre (si viene), con fallback a la suma local.
  const apiTotal = Number(totalTicketsForStatus) || 0;
  const sumAgg = statusAgg.abiertos + statusAgg.proceso + statusAgg.cerrados;
  const total = apiTotal > 0 ? apiTotal : sumAgg;

  // Escalado proporcional para que la dona respete "total" cuando sea distinto a la suma local
  const scale = total > 0 && sumAgg > 0 ? total / sumAgg : 1;
  const scaledAbiertos = Math.round(statusAgg.abiertos * scale);
  const scaledProceso = Math.round(statusAgg.proceso * scale);
  const scaledCerrados = Math.max(0, total - scaledAbiertos - scaledProceso);

  const chartData = [
    { name: "Abiertos", value: scaledAbiertos },
    { name: "En proceso", value: scaledProceso },
    { name: "Cerrados", value: scaledCerrados },
  ];

  const nf = (n: number) => (isFinite(n) ? n.toLocaleString("es-ES") : "—");

  const COLORS = ["#f59e0b", "#3b82f6", "#22c55e"];

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900">
      <div className="px-6 py-5 border-b dark:border-gray-800">
        <h3 className="text-base font-bold">
          Distribución de estatus de tickets
        </h3>
        <p className="text-sm text-gray-500">
          Vista general del estado de todos los tickets
        </p>
      </div>

      <div className="p-6">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>

              {/* Total centrado */}
              <Text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 18, fontWeight: 700 }}
              >
                {nf(total)}
              </Text>

              <Tooltip formatter={(v: any) => nf(Number(v))} separator=": " />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
