"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentRow, CoachTeam } from "./api";
import {
  getAllStudents,
  getAllCoachesFromTeams,
  getCoachStudentsByCoachId,
} from "./api";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Activity,
  Users,
  TrendingUp,
  BarChart3,
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
import Link from "next/link";

function getUniqueCoaches(students: StudentRow[]) {
  const allCoaches = students.flatMap(
    (s) => s.teamMembers?.map((tm) => tm.name) ?? []
  );
  return Array.from(new Set(allCoaches)).filter(Boolean).sort();
}

function getCoachMetrics(students: StudentRow[]) {
  const total = students.length;
  const fases = ["F1", "F2", "F3", "F4", "F5"];
  const porFase = Object.fromEntries(
    fases.map((f) => [f, students.filter((s) => s.stage === f).length])
  );
  const tickets = students.reduce((acc, s) => acc + (s.ticketsCount ?? 0), 0);
  return { total, porFase, tickets };
}

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

export default function StudentsContent() {
  const [coach, setCoach] = useState<string>("todos"); // formato: "todos" | `id:${id}` | `name:${name}`
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [coaches, setCoaches] = useState<CoachTeam[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedCoachName, setSelectedCoachName] = useState<string | null>(
    null
  );
  const [coachCodes, setCoachCodes] = useState<Set<string> | null>(null);
  const [coachCodesLoading, setCoachCodesLoading] = useState(false);
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // 1) Traer alumnos (1000) y aplicar filtro local por search
        const items = await getAllStudents();
        const filtered = search
          ? items.filter(
              (s) =>
                (s.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (s.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (s.state ?? "").toLowerCase().includes(search.toLowerCase())
            )
          : items;
        setAll(filtered);
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

  // Cargar coaches desde equipos (una sola vez)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getAllCoachesFromTeams();
        if (!active) return;
        setCoaches(list);
      } catch (e) {
        // fallback: inferir de alumnos
        const inferred = getUniqueCoaches(all).map(
          (name, idx) => ({ id: idx + 1, name } as CoachTeam)
        );
        setCoaches(inferred);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si por alguna razón no tenemos coaches del endpoint, inferir por alumnos
  useEffect(() => {
    if (coaches.length === 0 && !loading && all.length > 0) {
      const inferred = getUniqueCoaches(all).map(
        (name, idx) => ({ id: idx + 1, name } as CoachTeam)
      );
      setCoaches(inferred);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, loading]);

  // Manejo del valor del Select → soporta formatos:
  //   - "todos"
  //   - `id:{coachId}|name:{coachName}`
  //   - `name:{coachName}`
  // Si hay id, consultamos relaciones para traer los códigos de alumnos
  useEffect(() => {
    if (coach === "todos") {
      setSelectedCoachName(null);
      setSelectedCoachId(null);
      setCoachCodes(null);
      return;
    }
    // parsear valor del select
    let nextName: string | null = null;
    let nextId: string | null = null;
    if (coach.startsWith("id:")) {
      const parts = coach.split("|name:");
      const idPart = parts[0];
      nextId = idPart.slice(3);
      nextName = parts[1] ?? null;
    } else if (coach.startsWith("name:")) {
      nextName = coach.slice(5);
    } else {
      // compat: valor crudo = name
      nextName = coach;
    }
    setSelectedCoachName(nextName);
    setSelectedCoachId(nextId ?? null);
    if (!nextId) setCoachCodes(null);
  }, [coach]);

  // Si tenemos ID de coach, consulta alumnos asociados y guarda sus códigos
  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedCoachId) return;
      try {
        setCoachCodesLoading(true);
        const rows = await getCoachStudentsByCoachId(selectedCoachId);
        if (!active) return;
        const setCodes = new Set((rows ?? []).map((r) => r.alumno));
        setCoachCodes(setCodes);
      } catch (e) {
        if (!active) return;
        setCoachCodes(null);
      } finally {
        if (active) setCoachCodesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedCoachId]);

  const filtered = useMemo(() => {
    if (coach === "todos") return all;
    // Filtrar por códigos si tenemos relación por ID
    if (selectedCoachId && coachCodes && coachCodes.size > 0) {
      return all.filter((s) => s.code && coachCodes.has(s.code));
    }
    // Fallback por nombre (case-insensitive)
    const name = selectedCoachName ?? "";
    return all.filter((s) =>
      s.teamMembers?.some(
        (tm) => (tm.name ?? "").toLowerCase() === name.toLowerCase()
      )
    );
  }, [all, coach, selectedCoachId, selectedCoachName, coachCodes]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const coachMetrics = useMemo(() => getCoachMetrics(filtered), [filtered]);

  const reset = () => {
    setSearch("");
    setCoach("todos");
    setPage(1);
  };

  const hasFilters = Boolean(search || coach !== "todos");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Gestión de Alumnos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? "Cargando..." : `${total} estudiantes registrados`}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-64">
            <Select value={coach} onValueChange={setCoach}>
              <SelectTrigger className="h-10 bg-card border-border/50 shadow-sm">
                <SelectValue placeholder="Filtrar por coach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los coachs</SelectItem>
                {coaches.map((c) => {
                  const value = c.codigo
                    ? `id:${c.codigo}|name:${c.name}`
                    : `name:${c.name}`;
                  return (
                    <SelectItem key={c.id} value={value}>
                      {c.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {coachCodesLoading && (
            <div className="h-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              Cargando alumnos del coach…
            </div>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-10 h-10 bg-card border-border/50 shadow-sm"
              placeholder="Buscar por nombre, código o estado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {hasFilters && (
            <Button
              variant="outline"
              size="default"
              onClick={reset}
              className="h-10 shadow-sm bg-transparent"
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  Alumnos asignados
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {coachMetrics.total}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  Tickets totales
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {coachMetrics.tickets}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-5 shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  <BarChart3 className="h-4 w-4" />
                  Distribución por fase
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(coachMetrics.porFase).map(([f, n]) => (
                    <Badge
                      key={f}
                      variant="secondary"
                      className="text-xs font-medium"
                    >
                      {f}: {n}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Código
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Etapa
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ingreso
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Tickets
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Última actividad
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Inactividad
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Contrato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                      <span className="text-sm font-medium">
                        Cargando estudiantes...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-12 w-12 opacity-20" />
                      <p className="text-sm font-medium">
                        No se encontraron estudiantes
                      </p>
                      <p className="text-xs">
                        Intenta ajustar los filtros de búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((student) => (
                  <tr
                    key={student.id}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <code className="text-xs font-mono text-muted-foreground bg-muted/70 px-2.5 py-1 rounded-md font-medium">
                        {student.code ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      {student.code ? (
                        <Link
                          href={`/admin/alumnos/${encodeURIComponent(
                            student.code
                          )}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group/link"
                        >
                          {student.name}
                          <span className="opacity-0 group-hover/link:opacity-100 transition-opacity text-primary">
                            →
                          </span>
                        </Link>
                      ) : (
                        <span className="font-semibold text-foreground">
                          {student.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {student.state ? (
                        <Badge
                          variant="secondary"
                          className="font-medium shadow-sm"
                        >
                          {student.state}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {student.stage ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {fmtDateSmart(student.joinDate)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2.5 rounded-lg bg-muted/70 text-xs font-semibold text-foreground shadow-sm">
                        {student.ticketsCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {fmtDateSmart(student.lastActivity)}
                    </td>
                    <td className="px-4 py-4">
                      {student.inactivityDays ? (
                        <span className="text-sm font-medium text-muted-foreground">
                          {student.inactivityDays}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {student.contractUrl ? (
                        <a
                          href={student.contractUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 font-medium"
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/50 bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Mostrando{" "}
              <span className="font-semibold text-foreground">
                {(page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-foreground">
                {Math.min(page * PAGE_SIZE, total)}
              </span>{" "}
              de <span className="font-semibold text-foreground">{total}</span>{" "}
              estudiantes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-9 gap-1.5 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                <span className="text-sm font-semibold text-foreground">
                  {page}
                </span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm font-semibold text-foreground">
                  {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-9 gap-1.5 shadow-sm"
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
