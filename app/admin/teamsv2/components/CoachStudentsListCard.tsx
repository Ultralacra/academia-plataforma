"use client";

type MetricStudentRow = {
  id: number | string;
  name: string;
  code?: string | null;
  state?: string | null;
  stage?: string | null;
  tickets?: number | null;
};

export default function CoachStudentsListCard({
  students,
  title = "Alumnos del coach",
}: {
  students: MetricStudentRow[];
  title?: string;
}) {
  const rows = Array.isArray(students) ? students : [];

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          Total: {rows.length}
        </span>
      </div>

      <div className="max-h-72 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Alumno</th>
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-left font-medium">Fase</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No hay alumnos para este coach.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.code ?? row.id}`} className="border-t">
                  <td className="px-3 py-2 text-slate-900">
                    {row.name || "Sin nombre"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.code || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.stage || "Sin fase"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.state || "Sin estado"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
