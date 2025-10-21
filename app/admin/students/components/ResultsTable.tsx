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
import Link from "next/link";
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
import type { LifecycleItem } from "./phase-faker";

const SintBadge = ({ v }: { v?: string | null }) => {
  const s = (v || "").toUpperCase();
  if (s === "COMPLETADO")
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">COMPLETADO</Badge>
    );
  if (s === "ABANDONO")
    return <Badge className="bg-rose-600 hover:bg-rose-600">ABANDONO</Badge>;
  if (s === "PAUSA")
    return <Badge className="bg-amber-500 hover:bg-amber-500">PAUSA</Badge>;
  return <Badge className="bg-sky-600 hover:bg-sky-600">EN CURSO</Badge>;
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
  lifecycleByCode,
}: {
  loading: boolean;
  pageItems: ClientItem[];
  totalFiltered: number;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenTeam: (c: ClientItem) => void;
  lifecycleByCode: Record<string, LifecycleItem>;
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
                    <TableHead className="min-w-[90px]">Código</TableHead>
                    <TableHead className="min-w-[220px]">Nombre</TableHead>
                    <TableHead className="min-w-[120px]">Equipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Últ. actividad</TableHead>
                    <TableHead>Inactividad (d)</TableHead>
                    <TableHead className="min-w-[120px]">
                      Estado (sint.)
                    </TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Permanencia (d)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((c, idx) => {
                    const lk = c.code ?? "";
                    const life = lifecycleByCode[lk];
                    return (
                      <TableRow
                        key={c.id}
                        className={idx % 2 ? "bg-muted/30" : ""}
                      >
                        <TableCell className="font-medium">
                          {c.code ? (
                            <Link
                              href={`/admin/alumnos/${encodeURIComponent(
                                String(c.code)
                              )}`}
                              className="text-blue-600 hover:underline"
                            >
                              {c.code}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {c.code ? (
                            <Link
                              href={`/admin/alumnos/${encodeURIComponent(
                                String(c.code)
                              )}`}
                              className="text-gray-900 hover:underline"
                            >
                              {c.name}
                            </Link>
                          ) : (
                            c.name
                          )}
                        </TableCell>

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
                            <Badge variant="outline">{c.state}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{c.stage ?? "—"}</TableCell>
                        <TableCell>{formatDateSmart(c.joinDate)}</TableCell>
                        <TableCell>{c.ticketsCount ?? 0}</TableCell>
                        <TableCell>{formatDateSmart(c.lastActivity)}</TableCell>
                        <TableCell>{c.inactivityDays ?? "—"}</TableCell>

                        <TableCell>
                          {life ? <SintBadge v={life.status_sint} /> : "—"}
                        </TableCell>
                        <TableCell>{life?.salida ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">
                          {life?.permanencia_d ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={12}
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
