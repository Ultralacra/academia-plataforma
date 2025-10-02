"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { PieCard, BarCard, PieCardSkeleton, BarCardSkeleton } from "./charts";
import TeamModal from "./TeamModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
      MultiSelect FIXED (sin Radix) — abre siempre
    ────────────────────────────────────────── */
type MultiSelectProps = {
  placeholder?: string;
  options: string[]; // lista de opciones (sin "all")
  value: string[]; // seleccionadas
  onChange: (next: string[]) => void;
  className?: string;
};

function MultiSelect({
  placeholder = "Seleccionar...",
  options,
  value,
  onChange,
  className,
}: MultiSelectProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 240,
  });

  // abrir y calcular posición absoluta (fixed)
  const openMenu = () => {
    const el = btnRef.current;
    if (!el) {
      setOpen(true);
      return;
    }
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  };

  // cerrar en click-afuera / ESC / resize / scroll
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      // si clic fuera del panel
      const panel = document.getElementById("ms-panel");
      if (panel && panel.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onRelayout = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onRelayout);
    window.addEventListener("scroll", onRelayout, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onRelayout);
      window.removeEventListener("scroll", onRelayout, true);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o?.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const toggle = (opt: string) => {
    const has = value.includes(opt);
    onChange(has ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const label = value.length
    ? value.length === 1
      ? value[0]
      : `${value.length} seleccionadas`
    : placeholder;

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="outline"
        onClick={openMenu}
        className={cn(
          "w-full justify-between",
          value.length ? "text-foreground" : "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">{label}</span>
        <div className="flex items-center gap-1">
          {!!value.length && (
            <X
              className="h-4 w-4 opacity-70 hover:opacity-100"
              onClick={clearAll}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-70" />
        </div>
      </Button>

      {open &&
        createPortal(
          <div
            id="ms-panel"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="rounded-md border bg-popover shadow-xl"
          >
            <div className="p-2 border-b">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
              />
            </div>
            <div className="max-h-64 overflow-auto p-1">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  Sin opciones
                </div>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((opt) => {
                    const checked = value.includes(opt);
                    return (
                      <li key={opt}>
                        <button
                          type="button"
                          onClick={() => toggle(opt)}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(opt)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1 text-left">{opt}</span>
                          {checked && <Check className="h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="p-2 flex justify-end gap-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange([]);
                  setSearch("");
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ─────────────────────────────────────────
      Componente principal
    ────────────────────────────────────────── */
export default function StudentManagement() {
  // Datos base (hasta 1000 desde la API)
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<ClientItem[]>([]);

  // Filtros que viajan al servidor
  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // Filtros client-side (multi)
  const [statesFilter, setStatesFilter] = useState<string[]>([]);
  const [stagesFilter, setStagesFilter] = useState<string[]>([]);
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

  // Consulta al server (hasta 1000) con debounce
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
        setPage(1);
      } catch (e) {
        console.error(e);
        setAllItems([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, fechaDesde, fechaHasta]);

  /* Conjuntos de opciones */
  const stateOptions = useMemo(
    () => uniq(allItems.map((i) => i.state)).sort(),
    [allItems]
  );
  const stageOptions = useMemo(
    () => uniq(allItems.map((i) => i.stage)).sort(),
    [allItems]
  );

  /* Filtro client-side */
  const filtered = useMemo(() => {
    return (allItems ?? []).filter((i) => {
      const okState =
        statesFilter.length === 0 ||
        (i.state ? statesFilter.includes(i.state) : false);

      const okStage =
        stagesFilter.length === 0 ||
        (i.stage ? stagesFilter.includes(i.stage) : false);

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
    statesFilter,
    stagesFilter,
    lastFrom,
    lastTo,
    inactFrom,
    inactTo,
  ]);

  // Paginación local
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSizeUI));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSizeUI;
    return filtered.slice(start, start + pageSizeUI);
  }, [filtered, page]);

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

  /* Skeleton tabla */
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

  const resetAll = () => {
    setSearch("");
    setFechaDesde("");
    setFechaHasta("");
    setStatesFilter([]);
    setStagesFilter([]);
    setLastFrom("");
    setLastTo("");
    setInactFrom("");
    setInactTo("");
    setPage(1);
  };

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
          <Button variant="outline" onClick={resetAll}>
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
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Estados</label>
              <MultiSelect
                options={stateOptions}
                value={statesFilter}
                onChange={(v) => {
                  setPage(1);
                  setStatesFilter(v);
                }}
                placeholder="Seleccionar estados"
              />
              {!!statesFilter.length && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {statesFilter.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {s}
                      <button
                        className="ml-1 opacity-70 hover:opacity-100"
                        onClick={() =>
                          setStatesFilter((prev) => prev.filter((x) => x !== s))
                        }
                        aria-label={`Quitar ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Etapas</label>
              <MultiSelect
                options={stageOptions}
                value={stagesFilter}
                onChange={(v) => {
                  setPage(1);
                  setStagesFilter(v);
                }}
                placeholder="Seleccionar etapas"
              />
              {!!stagesFilter.length && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {stagesFilter.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {s}
                      <button
                        className="ml-1 opacity-70 hover:opacity-100"
                        onClick={() =>
                          setStagesFilter((prev) => prev.filter((x) => x !== s))
                        }
                        aria-label={`Quitar ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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
