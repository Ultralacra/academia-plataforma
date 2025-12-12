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
        "relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground " +
        "shadow-sm " +
        (className ?? "")
      }
    >
      {/* Borde/acento lateral */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-rose-500 via-red-500 to-orange-500" />
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:items-center">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20">
            <Timer className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <div className="mt-1 text-sm text-foreground/80">
              <span className="font-semibold">Alumno:</span>{" "}
              {ticket.nombre_alumno}{" "}
              <span className="text-muted-foreground">
                ({ticket.codigo_alumno})
              </span>
            </div>
            <div className="text-sm text-foreground/80">
              <span className="font-semibold">Asunto:</span>{" "}
              {ticket.asunto_ticket || "—"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:ml-auto md:w-full md:max-w-xl">
          <div className="rounded-xl border border-border/60 bg-muted/50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Tipo
            </div>
            <div className="text-sm font-semibold text-foreground">
              {ticket.tipo_ticket || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Estado
            </div>
            <div className="text-sm font-semibold text-foreground">
              {ticket.estado_ticket || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Respuesta (h)
            </div>
            <div className="text-sm font-semibold text-foreground">
              {hours} h
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Respuesta (días)
            </div>
            <div className="text-sm font-semibold text-foreground">
              {days} días
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
