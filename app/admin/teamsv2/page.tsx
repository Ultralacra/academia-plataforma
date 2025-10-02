// app/admin/teams/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { dataService, type TeamWithCounts } from "@/lib/data-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, RefreshCw, ArrowUpDown, Download } from "lucide-react";
import { CoachStudentsModal } from "./coach-students-modal";

/* =======================
   Helpers
======================= */
type SortKey =
  | "nombre"
  | "puesto"
  | "area"
  | "ticketsCount"
  | "nAlumnos"
  | "created_at";
type SortDir = "asc" | "desc";

// Valores sentinela para "Todos"
const ALL_PUESTO = "__ALL_PUESTO__";
const ALL_AREA = "__ALL_AREA__";

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toCsv(rows: TeamWithCounts[]) {
  const header = [
    "id",
    "codigo",
    "nombre",
    "puesto",
    "area",
    "tickets",
    "alumnos",
    "created_at",
  ];
  const body = rows.map((r) => [
    r.id,
    r.codigo,
    `"${(r.nombre ?? "").replace(/"/g, '""')}"`,
    `"${(r.puesto ?? "").replace(/"/g, '""')}"`,
    `"${(r.area ?? "").replace(/"/g, '""')}"`,
    r.ticketsCount ?? "",
    r.nAlumnos ?? "",
    r.created_at ?? "",
  ]);
  return [header.join(","), ...body.map((r) => r.join(","))].join("\n");
}

/* =======================
   Page
======================= */
export default function TeamsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Query state (URL)
  const [q, setQ] = useState<string>(searchParams.get("q") ?? "");
  const [page, setPage] = useState<number>(
    Number(searchParams.get("page") ?? 1)
  );
  const [pageSize, setPageSize] = useState<number>(12);

  // Data
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<TeamWithCounts[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Para construir opciones de selects (toda la data)
  const [optLoading, setOptLoading] = useState<boolean>(true);
  const [optionRows, setOptionRows] = useState<TeamWithCounts[]>([]);

  // Filtros controlados ("": todos)
  const [puesto, setPuesto] = useState<string>(""); // "" = todos
  const [area, setArea] = useState<string>(""); // "" = todos

  // Valores para Select (no pueden ser "")
  const puestoSelectValue = puesto === "" ? ALL_PUESTO : puesto;
  const areaSelectValue = area === "" ? ALL_AREA : area;

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 1) Estado arriba del componente:
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [currentCoach, setCurrentCoach] = useState<{
    code: string | null;
    name?: string | null;
  }>({ code: null, name: null });

  // Sync URL
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    q ? sp.set("q", q) : sp.delete("q");
    sp.set("page", String(page));
    router.replace(`?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  // Fetch tabla paginada
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dataService.getTeamsV2({ page, pageSize, search: q });
      setRows(res.data as TeamWithCounts[]);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar equipos");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch para opciones (toda la data)
  const fetchOptionsData = async () => {
    try {
      setOptLoading(true);
      const res = await dataService.getTeamsV2({
        page: 1,
        pageSize: 10000,
        search: "",
      });
      setOptionRows(res.data as TeamWithCounts[]);
    } finally {
      setOptLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q]);

  useEffect(() => {
    fetchOptionsData();
  }, []);

  // Opciones desde todo el dataset
  const puestoOptions = useMemo(() => {
    const set = new Set<string>();
    optionRows.forEach((r) => {
      const v = (r.puesto ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [optionRows]);

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    optionRows.forEach((r) => {
      const v = (r.area ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [optionRows]);

  // Filtros + sort en la página actual
  const filteredSorted = useMemo(() => {
    const base = rows.filter((r) => {
      const okPuesto = puesto ? (r.puesto ?? "") === puesto : true;
      const okArea = area ? (r.area ?? "") === area : true;
      return okPuesto && okArea;
    });
    const sorted = [...base].sort((a, b) => {
      const A = a[sortKey] as any;
      const B = b[sortKey] as any;

      if (A == null && B == null) return 0;
      if (A == null) return sortDir === "asc" ? -1 : 1;
      if (B == null) return sortDir === "asc" ? 1 : -1;

      if (sortKey === "ticketsCount" || sortKey === "nAlumnos") {
        const x = Number(A ?? 0) - Number(B ?? 0);
        return sortDir === "asc" ? x : -x;
      }
      if (sortKey === "created_at") {
        const x = new Date(A).getTime() - new Date(B).getTime();
        return sortDir === "asc" ? x : -x;
      }
      const x = String(A).localeCompare(String(B));
      return sortDir === "asc" ? x : -x;
    });
    return sorted;
  }, [rows, puesto, area, sortKey, sortDir]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function clearFilters() {
    setPuesto("");
    setArea("");
    setPage(1);
  }

  function exportCsv() {
    const csv = toCsv(filteredSorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equipos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout
      title="Equipo"
      subtitle="Listado del equipo con estilo Notion"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 grid place-items-center rounded-lg bg-neutral-100">
            <Users className="h-5 w-5 text-neutral-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Equipo</h1>
            <p className="text-xs text-neutral-500">Coachs, soporte y áreas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refrescar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <Separator className="my-3" />

      {/* Filtros */}
      <Card className="border-neutral-200/70">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Búsqueda */}
            <div className="relative md:max-w-md w-full">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre o código…"
                className="pl-8"
              />
            </div>

            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Select Puesto (sin value="") */}
              <Select
                value={puestoSelectValue}
                onValueChange={(val) => {
                  setPuesto(val === ALL_PUESTO ? "" : val);
                  setPage(1);
                }}
                disabled={optLoading}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrar por puesto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PUESTO}>Todos los puestos</SelectItem>
                  {puestoOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Select Área (sin value="") */}
              <Select
                value={areaSelectValue}
                onValueChange={(val) => {
                  setArea(val === ALL_AREA ? "" : val);
                  setPage(1);
                }}
                disabled={optLoading}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrar por área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_AREA}>Todas las áreas</SelectItem>
                  {areaOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border px-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 12, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/pág
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <div className="mt-4 overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">
                <button
                  className="inline-flex items-center gap-1 text-left font-medium"
                  onClick={() => toggleSort("nombre")}
                >
                  Nombre / Código <ArrowUpDown className="h-4 w-4 opacity-60" />
                </button>
              </TableHead>
              <TableHead className="w-[18%]">
                <button
                  className="inline-flex items-center gap-1 font-medium"
                  onClick={() => toggleSort("puesto")}
                >
                  Puesto <ArrowUpDown className="h-4 w-4 opacity-60" />
                </button>
              </TableHead>
              <TableHead className="w-[18%]">
                <button
                  className="inline-flex items-center gap-1 font-medium"
                  onClick={() => toggleSort("area")}
                >
                  Área <ArrowUpDown className="h-4 w-4 opacity-60" />
                </button>
              </TableHead>
              <TableHead className="w-[12%]">
                <button
                  className="inline-flex items-center gap-1 font-medium"
                  onClick={() => toggleSort("ticketsCount")}
                >
                  Tickets <ArrowUpDown className="h-4 w-4 opacity-60" />
                </button>
              </TableHead>
              <TableHead className="w-[12%]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentCoach({ code: t.codigo, name: t.nombre });
                    setStudentsOpen(true);
                  }}
                >
                  Ver
                </Button>
              </TableHead>
              <TableHead className="min-w-[120px]">
                <button
                  className="inline-flex items-center gap-1 font-medium"
                  onClick={() => toggleSort("created_at")}
                >
                  Creado <ArrowUpDown className="h-4 w-4 opacity-60" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={6}>
                    <div className="h-6 animate-pulse rounded bg-neutral-100" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-red-600">
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-neutral-500">
                  Sin resultados.
                </TableCell>
              </TableRow>
            ) : (
              filteredSorted.map((t) => (
                <TableRow key={t.id} className="hover:bg-neutral-50/60">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 grid place-items-center rounded-md bg-neutral-100">
                        <Users className="h-4 w-4 text-neutral-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-neutral-900">
                          {t.nombre || "—"}
                        </div>
                        <div className="truncate text-xs text-neutral-500">
                          <span className="font-mono">{t.codigo}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle">
                    {t.puesto ? (
                      <Badge
                        variant="outline"
                        className="border-neutral-300 text-neutral-700"
                      >
                        {t.puesto}
                      </Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="align-middle">
                    {t.area ? (
                      <span className="text-sm">{t.area}</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20">
                      {t.ticketsCount ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge
                      variant="secondary"
                      className="bg-neutral-100 text-neutral-800"
                    >
                      {t.nAlumnos ?? 0}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCurrentCoach({ code: t.codigo, name: t.nombre });
                          setStudentsOpen(true);
                        }}
                      >
                        Ver
                      </Button>
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle text-sm text-neutral-600">
                    {formatDate(t.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          Página {page} de {totalPages} — {total} registros
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>
      <CoachStudentsModal
        open={studentsOpen}
        onOpenChange={setStudentsOpen}
        coachCode={currentCoach.code}
        coachName={currentCoach.name}
      />
    </DashboardLayout>
  );
}
