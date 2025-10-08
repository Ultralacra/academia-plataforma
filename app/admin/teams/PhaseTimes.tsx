"use client";

export function PhaseAverages({
  data,
}: {
  data: { phase: string; days: number }[];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4 bg-white">
        <h3 className="text-sm font-semibold text-gray-900">
          Tiempos promedio por fase
        </h3>
        <p className="text-xs text-gray-500">
          Promedio de días que tarda un estudiante en cada fase
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-5">
        {data.map((d) => (
          <div
            key={d.phase}
            className="rounded-xl border border-gray-100 p-3 bg-white"
          >
            <div className="text-xs text-gray-500">Fase {d.phase}</div>
            <div className="mt-1 text-xl font-semibold text-gray-900">
              {d.days} d
            </div>
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
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4 bg-white">
        <h3 className="text-sm font-semibold text-gray-900">
          Estudiantes activos por fase
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-5">
        {data.map((d) => (
          <div
            key={d.phase}
            className="rounded-xl border border-gray-100 p-3 bg-white"
          >
            <div className="text-xs text-gray-500">Fase {d.phase}</div>
            <div className="mt-1 text-xl font-semibold text-gray-900">
              {d.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
