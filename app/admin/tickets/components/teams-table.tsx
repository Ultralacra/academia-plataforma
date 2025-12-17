"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function TeamsTable({
  grouped,
  openTeam,
  loading,
}: {
  grouped: Map<
    number,
    {
      team: { id: number; nombre: string };
      tickets: any[];
      countByEstado: Record<string, number>;
    }
  >;
  openTeam: (id: number) => void;
  loading: boolean;
}) {
  const rows = Array.from(grouped.values())
    .map((g) => {
      const total = g.tickets.length;
      const pendientes =
        g.countByEstado["PENDIENTE"] ?? g.countByEstado["pendiente"] ?? 0;
      const enProgreso =
        g.countByEstado["EN PROGRESO"] ??
        g.countByEstado["EN_PROGRESO"] ??
        g.countByEstado["en progreso"] ??
        0;
      const resueltos =
        g.countByEstado["RESUELTO"] ?? g.countByEstado["resuelto"] ?? 0;
      return {
        id: g.team.id,
        name: g.team.nombre,
        total,
        pendientes,
        enProgreso,
        resueltos,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Resumen por equipo
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-2">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-white">
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="px-4 py-2">Equipo</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Pendientes</th>
              <th className="px-4 py-2">En Progreso</th>
              <th className="px-4 py-2">Resueltos</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b hover:bg-muted/40 transition-colors"
              >
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="px-4 py-2 tabular-nums">{r.total}</td>
                <td className="px-4 py-2 tabular-nums">{r.pendientes}</td>
                <td className="px-4 py-2 tabular-nums">{r.enProgreso}</td>
                <td className="px-4 py-2 tabular-nums">{r.resueltos}</td>
                <td className="px-4 py-2">
                  <button
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
                    onClick={() => openTeam(r.id)}
                  >
                    Ver equipo
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No hay datos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
