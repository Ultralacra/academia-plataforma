"use client";

import { Clock, CheckCircle2, UserCircle2 } from "lucide-react";
import { formatDuration } from "./format";

type RespByCoach = {
  coach: string;
  response?: number | null;
  resolution?: number | null;
  tickets?: number;
};

export default function ResponseByCoachList({
  byCoach,
}: {
  byCoach: RespByCoach[];
}) {
  const rows = [...(byCoach || [])]
    .map((r) => ({
      coach: r.coach,
      response: r.response ?? null,
      resolution: r.resolution ?? null,
      tickets: r.tickets ?? 0,
    }))
    .sort((a, b) => (b.tickets || 0) - (a.tickets || 0));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Tiempo de respuesta por coach
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Listado compacto • unidades automáticas
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.length === 0 && (
          <div className="px-5 py-6 text-sm text-gray-500">Sin datos</div>
        )}
        {rows.map((r) => (
          <div
            key={r.coach}
            className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="rounded-full bg-gray-100 p-2">
                <UserCircle2 className="h-5 w-5 text-gray-500" />
              </span>
              <span
                className="font-medium text-gray-900 truncate"
                title={r.coach}
              >
                {r.coach}
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="h-4 w-4 text-indigo-500" />
                <span className="text-gray-500">Prom. respuesta:</span>
                <span className="font-semibold text-gray-900">
                  {r.response ? formatDuration(r.response) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-gray-500">Prom. resolución:</span>
                <span className="font-semibold text-gray-900">
                  {r.resolution ? formatDuration(r.resolution) : "—"}
                </span>
              </div>
              <div className="text-gray-500">
                Tickets:{" "}
                <span className="font-semibold text-gray-900">{r.tickets}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
