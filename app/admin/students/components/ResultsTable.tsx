"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateSmart } from "./utils/students-utils";
import type { ClientItem } from "@/lib/data-service";
// removed synthetic lifecycle types/usage

const colorByState = (v?: string | null) => {
  // Pastel: fondo 100, borde 200, texto 700
  const s = (v || "").toUpperCase();
  if (s === "COMPLETADO")
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (s === "ABANDONO")
    return "bg-rose-100 text-rose-700 border border-rose-200";
  if (s === "PAUSA")
    return "bg-amber-100 text-amber-700 border border-amber-200";
  if (s === "ACTIVO" || s === "EN CURSO")
    return "bg-blue-100 text-blue-700 border border-blue-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
};

const colorByStage = (v?: string | null) => {
  // Pastel alineado con PhaseMetrics (violet, blue, emerald, amber, rose)
  const s = (v || "").toUpperCase();
  if (s.startsWith("F1"))
    return "bg-violet-100 text-violet-700 border border-violet-200";
  if (s.startsWith("F2"))
    return "bg-blue-100 text-blue-700 border border-blue-200";
  if (s.startsWith("F3"))
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (s.startsWith("F4"))
    return "bg-amber-100 text-amber-700 border border-amber-200";
  if (s.startsWith("F5"))
    return "bg-rose-100 text-rose-700 border border-rose-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
};

export default function ResultsTable({
  loading,
  pageItems,
  totalFiltered,
  page,
  totalPages,
  onPrev,
  onNext,
  onOpenTeam,
}: {
  loading: boolean;
  pageItems: ClientItem[];
  totalFiltered: number;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenTeam: (c: ClientItem) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Resultados</CardTitle>
        <CardDescription>
          {loading ? (
            <Skeleton className="h-4 w-64" />
          ) : (
            `${Math.min(
              25,
              pageItems.length
            )} de ${totalFiltered} (mostrando 25 por página)`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando clientes...
            </div>
            <div className="rounded-md border overflow-hidden">
              <div className="p-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-10 gap-3 items-center py-2 border-b last:border-b-0"
                  >
                    {Array.from({ length: 10 }).map((__, j) => (
                      <Skeleton key={j} className="h-3 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Nombre</TableHead>
                    <TableHead className="min-w-[120px]">Equipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Últ. actividad</TableHead>
                    <TableHead>Inactividad (d)</TableHead>
                    {/* columnas sintéticas eliminadas */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((c, idx) => {
                    return (
                      <TableRow
                        key={c.id}
                        className={idx % 2 ? "bg-muted/30" : ""}
                      >
                        <TableCell className="font-medium">{c.name}</TableCell>

                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={() => onOpenTeam(c)}
                          >
                            <Users className="mr-1 h-3 w-3" />
                            Ver equipo
                          </Button>
                        </TableCell>

                        <TableCell>
                          {c.state ? (
                            <Badge className={`${colorByState(c.state)}`}>
                              {c.state}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {c.stage ? (
                            <Badge className={`${colorByStage(c.stage)}`}>
                              {c.stage}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{formatDateSmart(c.joinDate)}</TableCell>
                        <TableCell>{c.ticketsCount ?? 0}</TableCell>
                        <TableCell>{formatDateSmart(c.lastActivity)}</TableCell>
                        <TableCell>{c.inactivityDays ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No hay resultados para los filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrev}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNext}
                  disabled={page >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
