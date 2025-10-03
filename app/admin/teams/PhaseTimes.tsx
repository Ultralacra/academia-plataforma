"use client";

export function PhaseAverages({
  data,
}: {
  data: { phase: string; days: number }[];
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="text-sm font-semibold">Tiempos promedio por fase</h3>
        <p className="text-xs text-muted-foreground">
          Promedio de días que tarda un estudiante en cada fase
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-5">
        {data.map((d) => (
          <div key={d.phase} className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Fase {d.phase}</div>
            <div className="mt-1 text-xl font-semibold">{d.days} d</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PhaseActives({
  data,
}: {
  data: { phase: string; count: number }[];
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="text-sm font-semibold">Estudiantes activos por fase</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-5">
        {data.map((d) => (
          <div key={d.phase} className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Fase {d.phase}</div>
            <div className="mt-1 text-xl font-semibold">{d.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
