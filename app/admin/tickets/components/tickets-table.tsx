"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TicketsTable({
  items,
  total,
  page,
  pageSize,
  totalPages,
  setPage,
  fmtDate,
  loading,
}: {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (p: number) => void;
  fmtDate: (iso?: string | null) => string;
  loading: boolean;
}) {
  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px]">Listado de tickets</CardTitle>
        <CardDescription className="text-xs">
          {loading
            ? "Cargando..."
            : `${items.length} de ${total} (mostrando ${pageSize} por página)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-white">
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="px-4 py-2">Asunto</th>
              <th className="px-4 py-2">Alumno</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Creación</th>
              <th className="px-4 py-2">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr
                key={t.id}
                className="border-b hover:bg-muted/40 transition-colors"
              >
                <td className="px-4 py-2">{t.nombre ?? "-"}</td>
                <td className="px-4 py-2">{t.alumno_nombre ?? "-"}</td>
                <td className="px-4 py-2">
                  {(() => {
                    const v = String(t.estado ?? "").toUpperCase();
                    const classes =
                      v.includes("RESUELT") || v.includes("CERR")
                        ? "bg-emerald-100 text-emerald-800"
                        : v.includes("PROGRESO")
                        ? "bg-sky-100 text-sky-800"
                        : v.includes("PEND")
                        ? "bg-amber-100 text-amber-800"
                        : v.includes("BLOQUE") || v.includes("ESCAL")
                        ? "bg-rose-100 text-rose-800"
                        : v
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-100 text-gray-500";
                    return t.estado ? (
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}
                      >
                        {t.estado}
                      </span>
                    ) : (
                      "—"
                    );
                  })()}
                </td>
                <td className="px-4 py-2">{(t.tipo ?? "—").toUpperCase()}</td>
                <td className="px-4 py-2">{fmtDate(t.creacion)}</td>
                <td className="px-4 py-2">
                  {t.deadline ? fmtDate(t.deadline) : "—"}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No hay tickets para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* paginación local */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
