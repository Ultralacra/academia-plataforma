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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Listado de tickets</CardTitle>
        <CardDescription>
          {loading
            ? "Cargando..."
            : `${items.length} de ${total} (mostrando ${pageSize} por página)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="px-4 py-2">ID Externo</th>
              <th className="px-4 py-2">Asunto</th>
              <th className="px-4 py-2">Alumno</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Creación</th>
              <th className="px-4 py-2">Deadline</th>
              <th className="px-4 py-2"># Equipo URLs</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="px-4 py-2">{t.id_externo ?? "-"}</td>
                <td className="px-4 py-2">{t.nombre ?? "-"}</td>
                <td className="px-4 py-2">{t.alumno_nombre ?? "-"}</td>
                <td className="px-4 py-2">{t.estado ?? "—"}</td>
                <td className="px-4 py-2">{t.tipo ?? "—"}</td>
                <td className="px-4 py-2">{fmtDate(t.creacion)}</td>
                <td className="px-4 py-2">
                  {t.deadline ? fmtDate(t.deadline) : "—"}
                </td>
                <td className="px-4 py-2">{t.equipo_urls.length}</td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  No hay tickets para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* paginación local */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
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
