// app/admin/students/components/student-management.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type ClientItem } from "@/lib/data-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
} from "lucide-react";
import { PieCard, BarCard, PieCardSkeleton, BarCardSkeleton } from "./charts";
import TeamModal from "./TeamModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/* ─────────────────────────────────────────
   Helpers
────────────────────────────────────────── */
function uniq(arr: (string | null | undefined)[]) {
  return Array.from(new Set(arr.filter(Boolean) as string[]));
}
function toDateKey(yyyyMmDd: string | null | undefined) {
  return yyyyMmDd || "—";
}

// Formateo local de fechas (es-ES)
const dtDateTime = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dtDateOnly = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
function cleanMonthDots(s: string) {
  return s.replaceAll(".", "");
}
function formatDateSmart(value?: string | null) {
  if (!value) return "—";
  if (value.includes("T")) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return cleanMonthDots(dtDateTime.format(d));
  }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return cleanMonthDots(dtDateOnly.format(d));
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return cleanMonthDots(dtDateTime.format(d));
  return value;
}

/* ─────────────────────────────────────────
   Componente
────────────────────────────────────────── */
export default function StudentManagement() {
  // Datos base (hasta 1000 desde la API)
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<ClientItem[]>([]);

  // Filtros que viajan al servidor (disparan la consulta de 1000)
  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // Filtros client-side
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [lastFrom, setLastFrom] = useState<string>("");
  const [lastTo, setLastTo] = useState<string>("");
  const [inactFrom, setInactFrom] = useState<string>("");
  const [inactTo, setInactTo] = useState<string>("");

  // Paginación UI local
  const pageSizeUI = 25;
  const [page, setPage] = useState(1);

  // Modal equipo
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamFor, setTeamFor] = useState<{
    name: string;
    members: ClientItem["teamMembers"];
  } | null>(null);

  // Consulta al server (hasta 1000) con debounce en filtros de server
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await dataService.getClients({
          search,
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
        });
        setAllItems(res.items ?? []);
        setPage(1); // reset página UI
      } catch (e) {
        console.error(e);
        setAllItems([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, fechaDesde, fechaHasta]);

  /* Filtro client-side sobre los 1000 */
  const filtered = useMemo(() => {
    return (allItems ?? []).filter((i) => {
      const okState = stateFilter === "all" || i.state === stateFilter;
      const okStage = stageFilter === "all" || i.stage === stageFilter;

      const okLastFrom = !lastFrom || (i.lastActivity ?? "") >= lastFrom;
      const okLastTo = !lastTo || (i.lastActivity ?? "") <= lastTo;

      const inact = i.inactivityDays ?? null;
      const fromN = inactFrom ? Number(inactFrom) : null;
      const toN = inactTo ? Number(inactTo) : null;
      const okInact =
        inact === null
          ? !(fromN !== null || toN !== null)
          : (fromN === null || inact >= fromN) &&
            (toN === null || inact <= toN);

      return okState && okStage && okLastFrom && okLastTo && okInact;
    });
  }, [
    allItems,
    stateFilter,
    stageFilter,
    lastFrom,
    lastTo,
    inactFrom,
    inactTo,
  ]);

  // Paginación local (sobre filtered)
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSizeUI));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSizeUI;
    return filtered.slice(start, start + pageSizeUI);
  }, [filtered, page]);

  // opciones selects desde el conjunto filtrado
  const states = useMemo(
    () => ["all", ...uniq(filtered.map((i) => i.state))],
    [filtered]
  );
  const stages = useMemo(
    () => ["all", ...uniq(filtered.map((i) => i.stage))],
    [filtered]
  );

  /* Gráficas */
  const distByState = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) =>
      map.set(
        i.state || "SIN ESTADO",
        (map.get(i.state || "SIN ESTADO") ?? 0) + 1
      )
    );
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filtered]);

  const distByStage = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) =>
      map.set(
        i.stage || "SIN ETAPA",
        (map.get(i.stage || "SIN ETAPA") ?? 0) + 1
      )
    );
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filtered]);

  const byJoinDate = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) => {
      const key = toDateKey(i.joinDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map, ([date, count]) => ({ date, count })).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filtered]);

  /* ─────────── helpers de skeleton para tabla ─────────── */
  const TableSkeleton = () => (
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Estudiantes</h2>
          <p className="text-muted-foreground">
            Se consultan hasta 1000 resultados y se pagina localmente (25 por
            página).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setFechaDesde("");
              setFechaHasta("");
              setStateFilter("all");
              setStageFilter("all");
              setLastFrom("");
              setLastTo("");
              setInactFrom("");
              setInactTo("");
              setPage(1);
            }}
          >
            Reiniciar
          </Button>
        </div>
      </div>

      {/* Filtros que pegan a la API */}
      <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <CardTitle>Consulta a la API</CardTitle>
          <CardDescription>
            Buscar y filtrar por rango de ingreso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar (nombre, código)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="md:col-span-1">
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * Se recuperan hasta 1000 registros.
          </p>
        </CardContent>
      </Card>

      {/* Filtros client-side */}
      <Card>
        <CardHeader>
          <CardTitle>Refinar resultados</CardTitle>
          <CardDescription>
            Aplicados sobre los resultados cargados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select
                value={stateFilter}
                onValueChange={(v) => {
                  setPage(1);
                  setStateFilter(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "Todos" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Etapa</label>
              <Select
                value={stageFilter}
                onValueChange={(v) => {
                  setPage(1);
                  setStageFilter(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "Todas" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Últ. actividad (desde)
              </label>
              <Input
                type="date"
                value={lastFrom}
                onChange={(e) => {
                  setPage(1);
                  setLastFrom(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Últ. actividad (hasta)
              </label>
              <Input
                type="date"
                value={lastTo}
                onChange={(e) => {
                  setPage(1);
                  setLastTo(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Inactividad mín. (d)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={inactFrom}
                onChange={(e) => {
                  setPage(1);
                  setInactFrom(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Inactividad máx. (d)
              </label>
              <Input
                type="number"
                placeholder="100"
                value={inactTo}
                onChange={(e) => {
                  setPage(1);
                  setInactTo(e.target.value);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PieCardSkeleton />
          <PieCardSkeleton />
          <BarCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PieCard title="Distribución por Estado" data={distByState} />
          <PieCard title="Distribución por Etapa" data={distByStage} />
          <BarCard title="Clientes por día de ingreso" data={byJoinDate} />
        </div>
      )}

      {/* Resultados + Tabla paginada local */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            {loading ? (
              <Skeleton className="h-4 w-64" />
            ) : (
              `${pageItems.length} de ${totalFiltered} (mostrando 25 por página)`
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
              <TableSkeleton />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[90px]">Código</TableHead>
                      <TableHead className="min-w-[220px]">Nombre</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead className="min-w-[200px]">Equipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead>Tickets</TableHead>
                      <TableHead>Últ. actividad</TableHead>
                      <TableHead>Inactividad (d)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((c, idx) => (
                      <TableRow
                        key={c.id}
                        className={idx % 2 ? "bg-muted/30" : ""}
                      >
                        <TableCell className="font-medium">
                          {c.code ?? "—"}
                        </TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>
                          {c.contractUrl ? (
                            <a
                              href={c.contractUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary underline"
                            >
                              Abrir <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={() => {
                              setTeamFor({
                                name: c.name,
                                members: c.teamMembers,
                              });
                              setTeamOpen(true);
                            }}
                          >
                            <Users className="mr-1 h-3 w-3" />
                            Ver equipo
                            <Badge
                              variant="secondary"
                              className="ml-2 h-5 px-1 text-[10px] leading-4"
                            >
                              {c.teamMembers.length}
                            </Badge>
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
                      </TableRow>
                    ))}
                    {pageItems.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No hay resultados para los filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación local */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página <strong>{page}</strong> de{" "}
                  <strong>{totalPages}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Modal Equipo */}
      {teamFor && (
        <TeamModal
          open={teamOpen}
          onOpenChange={setTeamOpen}
          studentName={teamFor.name}
          members={teamFor.members}
        />
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        * Esta vista pagina localmente: si necesitas más de 1000, subimos el
        límite del backend o implementamos paginación real con “cursor/offset”.
      </p>
    </div>
  );
}
