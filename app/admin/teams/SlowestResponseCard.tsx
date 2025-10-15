"use client";

import { Timer } from "lucide-react";
import { useMemo } from "react";

export type SlowestTicket = {
  ticket_id: number;
  codigo_alumno: string;
  nombre_alumno: string;
  asunto_ticket: string;
  tipo_ticket: string;
  estado_ticket: string;
  fecha_creacion: string;
  fecha_respuesta: string;
  minutos_respuesta: number;
  horas_respuesta: number;
  dias_respuesta: number;
};

export default function SlowestResponseCard({
  ticket,
  className,
  title = "Ticket con respuesta más lenta",
}: {
  ticket: SlowestTicket;
  className?: string;
  title?: string;
}) {
  const hours = useMemo(
    () => (Number(ticket.horas_respuesta) || 0).toLocaleString("es-ES"),
    [ticket.horas_respuesta]
  );
  const days = useMemo(
    () => (Number(ticket.dias_respuesta) || 0).toFixed(2),
    [ticket.dias_respuesta]
  );

  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border border-gray-200 bg-white " +
        "shadow-sm " +
        (className ?? "")
      }
    >
      {/* Borde/acento lateral */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-rose-500 via-red-500 to-orange-500" />
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:items-center">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-100">
            <Timer className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">{title}</div>
            <div className="mt-1 text-sm text-gray-700">
              <span className="font-semibold">Alumno:</span>{" "}
              {ticket.nombre_alumno}{" "}
              <span className="text-gray-500">({ticket.codigo_alumno})</span>
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Asunto:</span>{" "}
              {ticket.asunto_ticket || "—"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:ml-auto md:w-full md:max-w-xl">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Tipo
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {ticket.tipo_ticket || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Estado
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {ticket.estado_ticket || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Respuesta (h)
            </div>
            <div className="text-sm font-semibold text-gray-900">{hours} h</div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Respuesta (días)
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {days} días
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
