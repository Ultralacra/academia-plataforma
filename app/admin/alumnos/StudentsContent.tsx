"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type StudentItem } from "@/lib/data-service";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
// Extrae coachs únicos de los alumnos
function getUniqueCoaches(students: StudentItem[]) {
  const allCoaches = students.flatMap(
    (s) => s.teamMembers?.map((tm) => tm.name) ?? []
  );
  return Array.from(new Set(allCoaches)).filter(Boolean).sort();
}

// Métricas por coach
function getCoachMetrics(students: StudentItem[]) {
  // Total alumnos
  const total = students.length;
  // Alumnos por fase
  const fases = ["F1", "F2", "F3", "F4", "F5"];
  const porFase = Object.fromEntries(
    fases.map((f) => [f, students.filter((s) => s.stage === f).length])
  );
  // Tickets totales
  const tickets = students.reduce((acc, s) => acc + (s.ticketsCount ?? 0), 0);
  // Promedios de respuesta/resolución (si existieran en el modelo)
  // Aquí solo se muestra la estructura, puedes expandir según tus datos
  return { total, porFase, tickets };
}
import Link from "next/link";

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
  // Coach seleccionado
  const [coach, setCoach] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<StudentItem[]>([]);

  const [search, setSearch] = useState("");
  // Eliminados filtros de fecha

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  // Load data with debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await dataService.getStudents({ search });
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
  }, [search]);

  // Lista de coachs únicos
  const coachs = useMemo(() => getUniqueCoaches(all), [all]);

  // Alumnos filtrados por coach
  const filtered =
    coach === "todos"
      ? all
      : all.filter((s) => s.teamMembers?.some((tm) => tm.name === coach));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Métricas del coach seleccionado
  const coachMetrics = useMemo(() => getCoachMetrics(filtered), [filtered]);

  const reset = () => {
    setSearch("");
    setPage(1);
  };

  const hasFilters = search;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Alumnos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Cargando..." : `${total} estudiantes`}
          </p>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px]">
          <Select value={coach} onValueChange={setCoach}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por coach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los coachs</SelectItem>
              {coachs.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Métricas individuales del coach */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3 bg-gray-100">
                <span className="text-gray-400 font-bold">👥</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Alumnos asignados</p>
                <p className="text-xl font-semibold text-gray-900">
                  {coachMetrics.total}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3 bg-gray-100">
                <span className="text-gray-400 font-bold">🎟️</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tickets totales</p>
                <p className="text-xl font-semibold text-gray-900">
                  {coachMetrics.tickets}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3 bg-gray-100">
                <span className="text-gray-400 font-bold">📊</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Alumnos por fase</p>
                <p className="text-sm text-gray-900">
                  {Object.entries(coachMetrics.porFase)
                    .map(([f, n]) => `${f}: ${n}`)
                    .join("  |  ")}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-ring/20 transition-all"
            placeholder="Buscar estudiantes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Etapa
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ingreso
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Tickets
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Última actividad
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Inactividad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contrato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span className="text-sm">Cargando estudiantes...</span>
                    </div>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="text-muted-foreground">
                      <p className="text-sm font-medium">
                        No se encontraron estudiantes
                      </p>
                      <p className="text-xs mt-1">
                        Intenta ajustar los filtros de búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((student) => (
                  <tr
                    key={student.id}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        {student.code ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {student.code ? (
                        <Link
                          href={`/admin/alumnos/${encodeURIComponent(
                            student.code
                          )}`}
                          className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group/link"
                        >
                          {student.name}
                          <span className="opacity-0 group-hover/link:opacity-100 transition-opacity">
                            →
                          </span>
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">
                          {student.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.state ? (
                        <Badge variant="secondary" className="font-normal">
                          {student.state}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {student.stage ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {fmtDateSmart(student.joinDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-md bg-muted/50 text-xs font-medium text-foreground">
                        {student.ticketsCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {fmtDateSmart(student.lastActivity)}
                    </td>
                    <td className="px-4 py-3">
                      {student.inactivityDays ? (
                        <span className="text-sm text-muted-foreground">
                          {student.inactivityDays}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.contractUrl ? (
                        <a
                          href={student.contractUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Ver contrato
                          <FileText className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && pageItems.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Mostrando{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              a{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * PAGE_SIZE, total)}
              </span>{" "}
              de <span className="font-medium text-foreground">{total}</span>{" "}
              estudiantes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-medium">{page}</span>
                <span className="text-sm text-muted-foreground">de</span>
                <span className="text-sm font-medium">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 gap-1"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
