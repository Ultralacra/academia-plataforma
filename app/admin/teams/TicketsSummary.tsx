"use client";

export default function TicketsSummary({
  totals,
  per,
}: {
  totals: {
    ticketsTotal: number;
    avgResponseMin: number;
    avgResolutionMin: number;
  };
  per: { day: number; week: number; month: number };
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="text-sm font-semibold">Resumen de tickets</h3>
        <p className="text-xs text-muted-foreground">
          Totales, respuesta/resolución y actividad por periodo
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-5">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-muted-foreground">Tickets totales</div>
          <div className="mt-1 text-xl font-semibold">
            {totals.ticketsTotal}
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-muted-foreground">Resp. promedio</div>
          <div className="mt-1 text-xl font-semibold">
            {totals.avgResponseMin} min
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-muted-foreground">Resol. promedio</div>
          <div className="mt-1 text-xl font-semibold">
            {totals.avgResolutionMin} min
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-muted-foreground">Hoy</div>
          <div className="mt-1 text-xl font-semibold">{per.day}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-muted-foreground">Últ. 30 días</div>
          <div className="mt-1 text-xl font-semibold">{per.month}</div>
        </div>
      </div>
    </div>
  );
}
