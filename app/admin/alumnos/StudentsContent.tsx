// components/students/StudentsContent.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type StudentItem } from "@/lib/data-service";
import { Search } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ===== helpers ===== */
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
const clean = (s: string) => s.replaceAll(".", "");

function fmtDateSmart(value?: string | null) {
  if (!value) return "—";
  if (value.includes("T")) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return clean(dtDateTime.format(d));
  }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return clean(dtDateOnly.format(d));
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return clean(dtDateTime.format(d));
  return value;
}

function uniq(xs: (string | null | undefined)[]) {
  return Array.from(new Set(xs.filter(Boolean) as string[])).sort();
}

/* ===== view ===== */
export default function StudentsContent() {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<StudentItem[]>([]);

  // filtros al servidor
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // filtros cliente
  const [estado, setEstado] = useState<string>("all");
  const [etapa, setEtapa] = useState<string>("all");

  // paginación UI local
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  // cargar (hasta 1000) con debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await dataService.getStudents({
          search,
          fechaDesde: desde || undefined,
          fechaHasta: hasta || undefined,
        });
        setAll(res.items ?? []);
        setPage(1);
      } catch (e) {
        console.error(e);
        setAll([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, desde, hasta]);

  // opciones dinámicas
  const estadoOpts = useMemo(
    () => ["all", ...uniq(all.map((i) => i.state))],
    [all]
  );
  const etapaOpts = useMemo(
    () => ["all", ...uniq(all.map((i) => i.stage))],
    [all]
  );

  // filtro cliente
  const filtered = useMemo(() => {
    return (all ?? []).filter((i) => {
      const okEstado =
        estado === "all" ||
        (i.state ? i.state.toLowerCase() === estado.toLowerCase() : false);
      const okEtapa =
        etapa === "all" ||
        (i.stage ? i.stage.toLowerCase() === etapa.toLowerCase() : false);
      return okEstado && okEtapa;
    });
  }, [all, estado, etapa]);

  // paginación local
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const reset = () => {
    setSearch("");
    setDesde("");
    setHasta("");
    setEstado("all");
    setEtapa("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alumnos</h1>
          <p className="text-sm text-muted-foreground">
            Hasta 1000 resultados del backend · Paginación local (25 por página)
          </p>
        </div>
        <Badge variant="secondary">{total} resultados</Badge>
      </div>

      {/* Filtros (search + fechas al server) */}
      <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader className="pb-2">
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Se aplican sobre la consulta al servidor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre o código…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Desde (ingreso)
              </p>
            </div>
            <div className="md:col-span-3">
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Hasta (ingreso)
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={reset}>
            Reiniciar filtros
          </Button>
        </CardContent>
      </Card>

      {/* Filtros cliente (estado / etapa) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Refinar en cliente</CardTitle>
          <CardDescription>
            Aplica sobre los resultados cargados
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              {estadoOpts.map((v) => (
                <option key={v} value={v}>
                  {v === "all" ? "Todos" : v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Etapa</label>
            <select
              value={etapa}
              onChange={(e) => {
                setEtapa(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              {etapaOpts.map((v) => (
                <option key={v} value={v}>
                  {v === "all" ? "Todas" : v}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            {loading
              ? "Cargando…"
              : `${pageItems.length} de ${total} (25 por página)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Etapa</th>
                <th className="px-4 py-2">Ingreso</th>
                <th className="px-4 py-2">Tickets</th>
                <th className="px-4 py-2">Últ. actividad</th>
                <th className="px-4 py-2">Inactividad (d)</th>
                <th className="px-4 py-2">Contrato</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">
                    {c.code ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2">
                    {c.state ? <Badge variant="outline">{c.state}</Badge> : "—"}
                  </td>
                  <td className="px-4 py-2">{c.stage ?? "—"}</td>
                  <td className="px-4 py-2">{fmtDateSmart(c.joinDate)}</td>
                  <td className="px-4 py-2">{c.ticketsCount ?? 0}</td>
                  <td className="px-4 py-2">{fmtDateSmart(c.lastActivity)}</td>
                  <td className="px-4 py-2">{c.inactivityDays ?? "—"}</td>
                  <td className="px-4 py-2">
                    {c.contractUrl ? (
                      <a
                        href={c.contractUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Abrir
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && !loading && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500"
                    colSpan={9}
                  >
                    No hay alumnos para los filtros seleccionados.
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* nota */}
      <p className="text-xs text-muted-foreground">
        * La vista pagina localmente: si necesitas más de 1000, habilitamos
        paginación real en backend o ampliamos el límite.
      </p>
    </div>
  );
}
