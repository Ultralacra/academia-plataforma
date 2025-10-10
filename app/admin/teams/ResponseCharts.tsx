"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Lock, AlertCircle } from "lucide-react";
import { formatDuration, shortDuration, toNum } from "./format";

/* =================== Tipos =================== */
type RespByCoach = {
  coach: string;
  response?: number | null;
  resolution?: number | null;
  tickets?: number;
};
type RespByTeam = {
  team: string;
  response?: number | null;
  resolution?: number | null;
  tickets?: number;
};

/* =================== UI Auxiliares =================== */
function Card({ children }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {children}
    </div>
  );
}
function Header({ title, subtitle }: any) {
  return (
    <div className="border-b border-gray-100 px-5 py-4 bg-white">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs"
    >
      <p className="font-medium text-gray-900">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-gray-600">
          {p.name}:{" "}
          <span className="font-semibold text-gray-900">
            {formatDuration(p.value)}
          </span>
        </p>
      ))}
    </motion.div>
  );
}

const PartialDataBadge = () => (
  <div className="absolute right-5 top-16 z-10 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs">
    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
    <span className="font-medium text-amber-900">
      Respuesta: Falta información
    </span>
  </div>
);

/* =================== Componente principal =================== */
export default function ResponseCharts({
  byCoach,
  byTeam,
  showTeamChart = true,
}: {
  byCoach: RespByCoach[];
  byTeam: RespByTeam[];
  showTeamChart?: boolean;
}) {
  const mapCoach = (arr: any[]) =>
    arr.map((r) => ({
      x: r.coach,
      response: 0, // sigue sin datos de respuesta en API
      resolution: toNum(r.resolution),
    }));

  const map = (arr: any[], xKey: string) =>
    arr.map((r) => ({
      x: r[xKey],
      response: toNum(r.response),
      resolution: toNum(r.resolution),
    }));

  // Bloqueo dinámico: si no hay byTeam, mostramos overlay+blur
  const isTeamLocked = !Array.isArray(byTeam) || byTeam.length === 0;

  return (
    <div
      className={
        showTeamChart
          ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
          : "grid grid-cols-1 gap-4"
      }
    >
      {/* ================== Izquierda ================== */}
      <Card>
        <Header
          title="TIEMPO DE RESPUESTA POR COACH"
          subtitle="Top según tickets • unidades automáticas"
        />
        <div className="relative h-72 px-5 pb-5">
          <PartialDataBadge />
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mapCoach(byCoach ?? [])}>
              <defs>
                <linearGradient id="gResp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gReso" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="x" hide />
              <YAxis allowDecimals={false} tickFormatter={shortDuration} />
              <Legend />
              <RTooltip content={<TooltipContent />} />
              <Bar
                dataKey="response"
                name="Respuesta"
                fill="url(#gResp)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="resolution"
                name="Resolución"
                fill="url(#gReso)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {showTeamChart && (
        <Card>
          <Header
            title="Tiempo de respuesta por equipo"
            subtitle="Top según tickets • unidades automáticas"
          />
          <div className="relative h-72 px-5 pb-5">
            <div className={isTeamLocked ? "blur-sm" : ""}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={map(byTeam ?? [], "team")}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="x" hide />
                  <YAxis allowDecimals={false} tickFormatter={shortDuration} />
                  <Legend />
                  <RTooltip content={<TooltipContent />} />
                  <Bar
                    dataKey="response"
                    name="Respuesta"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="resolution"
                    name="Resolución"
                    fill="#a78bfa"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {isTeamLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-3 rounded-xl bg-white/90 px-8 py-6 shadow-xl"
                >
                  <div className="rounded-full bg-gray-100 p-3">
                    <Lock className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      Falta información
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Datos no disponibles
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
