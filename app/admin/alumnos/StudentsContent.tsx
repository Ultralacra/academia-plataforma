"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentRow, CoachTeam } from "./api";
import {
  getAllStudents,
  getAllCoachesFromTeams,
  getCoachStudentsByCoachId,
  createStudent,
} from "./api";
import {
  Search,
  Activity,
  Users,
  TrendingUp,
  BarChart3,
  UserCircle2,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, getSpanishApiError } from "@/lib/utils";
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

function stageRank(stage?: string | null) {
  const s = String(stage ?? "")
    .trim()
    .toUpperCase();
  if (!s) return 999;
  if (s.includes("F1")) return 10;
  if (s.includes("F2")) return 20;
  if (s.includes("F3")) return 30;
  if (s.includes("F4")) return 40;
  if (s.includes("F5")) return 50;
  if (s.includes("COPY")) return 60;
  if (s.includes("ONBOARD")) return 70;
  return 100;
}

function normalizeStageLabel(stage?: string | null) {
  return String(stage ?? "")
    .trim()
    .toUpperCase();
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
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string | null>(null);
  const [openCoach, setOpenCoach] = useState(false);
  // Crear alumno
  const [openCreate, setOpenCreate] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [creating, setCreating] = useState(false);
  // Generar una contraseña sugerida al abrir el modal
  useEffect(() => {
    if (!openCreate) return;
    const gen = () => {
      const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@$%&*?-";
      let s = "";
      for (let i = 0; i < 14; i++)
        s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    };
    setCreatePassword((prev) => (prev ? prev : gen()));
  }, [openCreate]);

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

  // valores únicos de fases del listado filtrado por coach/buscador
  const uniqueStages = useMemo(() => {
    const NO_STAGE = "Sin fase";
    const base = Array.from(
      new Set(
        (filtered || [])
          .map((s) => (s.stage && s.stage.trim() ? s.stage.trim() : ""))
          .filter(Boolean)
      )
    ).sort();
    const hasNoStage = (filtered || []).some(
      (s) => !s.stage || !String(s.stage).trim()
    );
    return hasNoStage ? [NO_STAGE, ...base] : base;
  }, [filtered]);

  // valores únicos de estado del listado filtrado por coach/buscador
  const uniqueStates = useMemo(() => {
    const NO_STATE = "Sin estado";
    const base = Array.from(
      new Set(
        (filtered || [])
          .map((s) =>
            s.state && String(s.state).trim() ? String(s.state).trim() : ""
          )
          .filter(Boolean)
      )
    ).sort();
    const hasNoState = (filtered || []).some(
      (s) => !s.state || !String(s.state).trim()
    );
    return hasNoState ? [NO_STATE, ...base] : base;
  }, [filtered]);

  // aplicar filtro por fase adicional
  const finalRows = useMemo(() => {
    const NO_STAGE = "Sin fase";
    const NO_STATE = "Sin estado";
    const base = filtered.filter((s) => {
      // estado
      if (filterState) {
        if (filterState === NO_STATE) {
          if (s.state && String(s.state).trim()) return false;
        } else if (s.state !== filterState) return false;
      }
      // fase
      if (filterStage) {
        if (filterStage === NO_STAGE) {
          if (s.stage && String(s.stage).trim()) return false;
        } else if (s.stage !== filterStage) return false;
      }
      return true;
    });

    // Orden por fase (y por nombre dentro de cada fase)
    return [...base].sort((a, b) => {
      const ra = stageRank(a.stage);
      const rb = stageRank(b.stage);
      if (ra !== rb) return ra - rb;

      const sa = normalizeStageLabel(a.stage);
      const sb = normalizeStageLabel(b.stage);
      if (sa !== sb) return sa.localeCompare(sb, "es", { sensitivity: "base" });

      return (a.name ?? "").localeCompare(b.name ?? "", "es", {
        sensitivity: "base",
      });
    });
  }, [filtered, filterStage, filterState]);

  const total = finalRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return finalRows.slice(start, start + PAGE_SIZE);
  }, [finalRows, page]);

  const coachMetrics = useMemo(() => getCoachMetrics(filtered), [filtered]);

  const reset = () => {
    setSearch("");
    setCoach("todos");
    setFilterState(null);
    setPage(1);
  };

  const hasFilters = Boolean(
    search || coach !== "todos" || filterStage || filterState
  );

  async function handleCreateStudent() {
    if (!createNombre.trim()) return;
    if (!createEmail.trim()) {
      toast({ title: "El email es requerido" });
      return;
    }
    if (!createPassword.trim()) {
      toast({ title: "La contraseña es requerida" });
      return;
    }
    try {
      setCreating(true);
      const created = await createStudent({
        name: createNombre.trim(),
        email: createEmail.trim(),
        password: createPassword,
      });
      // Insertar al inicio de la lista
      const newRow: StudentRow = {
        id: created.id as any,
        code: created.codigo ?? null,
        name: created.nombre,
        teamMembers: [],
        state: null,
        stage: null,
        joinDate: null,
        lastActivity: null,
        inactivityDays: null,
        contractUrl: null,
        ticketsCount: 0,
      };
      setAll((prev) => [newRow, ...prev]);
      setPage(1);
      toast({
        title: "Alumno creado",
        description: `${created.codigo ?? ""} ${created.nombre}`.trim(),
      });
      setOpenCreate(false);
      setCreateNombre("");
      setCreateEmail("");
      setCreatePassword("");
      // Mantener filtros actuales; la paginación se recalcula por useMemo
    } catch (e) {
      console.error(e);
      toast({ title: getSpanishApiError(e, "Error al crear alumno") });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-80">
            <Popover open={openCoach} onOpenChange={setOpenCoach}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Seleccionar coach"
                  className={cn(
                    "group flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium outline-none transition-all",
                    "bg-card hover:bg-accent/50",
                    coach !== "todos"
                      ? "border-blue-500/60 ring-1 ring-blue-500/10"
                      : "border-border hover:border-gray-300 dark:hover:border-gray-600",
                    "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <UserCircle2
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        coach !== "todos"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "truncate",
                        coach !== "todos"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {selectedCoachName || "Seleccionar coach"}
                    </span>
                    {coach !== "todos" && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Filtrando
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    {coach !== "todos" && (
                      <X
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoach("todos");
                        }}
                        className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Limpiar coach"
                      />
                    )}
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[360px] shadow-none"
                align="start"
                sideOffset={8}
              >
                <Command>
                  <CommandInput
                    placeholder="Buscar coach..."
                    autoFocus
                    className="text-sm"
                  />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No hay resultados.</CommandEmpty>
                    <CommandGroup heading="Coachs">
                      {coaches.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            const value = c.codigo
                              ? `id:${c.codigo}|name:${c.name}`
                              : `name:${c.name}`;
                            setCoach(value);
                            setOpenCoach(false);
                          }}
                          className="cursor-pointer"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <UserCircle2 className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{c.name}</span>
                          </span>
                          {selectedCoachId && c.codigo === selectedCoachId && (
                            <Check className="ml-auto h-4 w-4 text-blue-600" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
              className="pl-10 h-10 rounded-xl bg-background border-border"
              placeholder="Buscar por nombre o estado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {hasFilters && (
            <Button
              variant="outline"
              size="default"
              onClick={reset}
              className="h-10 bg-transparent"
            >
              Limpiar filtros
            </Button>
          )}

          {/* Crear alumno */}
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="h-10" variant="default">
                Nuevo alumno
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear nuevo alumno</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Nombre
                  </label>
                  <Input
                    value={createNombre}
                    onChange={(e) => setCreateNombre(e.target.value)}
                    placeholder="Nombre del alumno"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Contraseña
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Contraseña segura"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const chars =
                          "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@$%&*?-";
                        let s = "";
                        for (let i = 0; i < 14; i++)
                          s += chars[Math.floor(Math.random() * chars.length)];
                        setCreatePassword(s);
                      }}
                    >
                      Generar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(createPassword);
                          toast({ title: "Contraseña copiada" });
                        } catch {}
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateStudent}
                  disabled={
                    creating ||
                    !createNombre.trim() ||
                    !createEmail.trim() ||
                    !createPassword.trim()
                  }
                >
                  {creating ? "Creando…" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-5 transition-all">
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

          <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-5 transition-all sm:col-span-2 lg:col-span-1">
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

      {/* Filtro por Estado (chips) */}
      {uniqueStates.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estado
            </span>
            <div className="flex gap-1.5 whitespace-nowrap overflow-x-auto md:overflow-visible md:flex-wrap md:whitespace-normal w-full">
              {uniqueStates.map((it) => {
                const active = filterState === it;
                return (
                  <button
                    key={it}
                    onClick={() => setFilterState(active ? null : it)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition border",
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-card text-foreground border-border hover:bg-accent"
                    )}
                  >
                    {it}
                  </button>
                );
              })}
              {filterState && (
                <button
                  onClick={() => setFilterState(null)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtro por Fase (chips) */}
      {uniqueStages.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fase
            </span>
            <div className="flex gap-1.5 whitespace-nowrap overflow-x-auto md:overflow-visible md:flex-wrap md:whitespace-normal w-full">
              {uniqueStages.map((it) => {
                const active = filterStage === it;
                return (
                  <button
                    key={it}
                    onClick={() => setFilterStage(active ? null : it)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition border",
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-card text-foreground border-border hover:bg-accent"
                    )}
                  >
                    {it}
                  </button>
                );
              })}
              {filterStage && (
                <button
                  onClick={() => setFilterStage(null)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Fase</th>
                <th className="px-3 py-2 text-left font-medium">Estado</th>
                <th className="px-3 py-2 text-left font-medium">Ingreso</th>
                <th className="px-3 py-2 text-left font-medium">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Última actividad
                  </div>
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Días inactividad
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    Cargando alumnos…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    No se encontraron estudiantes
                  </td>
                </tr>
              ) : (
                pageItems.map((student) => (
                  <tr
                    key={student.id}
                    className="border-t border-border/50 hover:bg-muted/50"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {student.code ? (
                        <Link
                          href={`/admin/alumnos/${encodeURIComponent(
                            student.code
                          )}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {student.name}
                        </Link>
                      ) : (
                        <span>{student.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {(() => {
                        const v = (student.stage || "").toUpperCase();
                        const classes = v.includes("COPY")
                          ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                          : v.includes("F1")
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                          : v.includes("F2")
                          ? "bg-lime-100 dark:bg-lime-500/20 text-lime-800 dark:text-lime-300"
                          : v.includes("F3")
                          ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300"
                          : v.includes("F4")
                          ? "bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300"
                          : v.includes("F5")
                          ? "bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300"
                          : v.includes("ONBOARD")
                          ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300"
                          : v
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground";
                        return (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}
                          >
                            {student.stage || "—"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      {(() => {
                        const v = (student.state || "").toUpperCase();
                        const classes = v.includes("INACTIVO")
                          ? "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300"
                          : v.includes("ACTIVO")
                          ? "bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300"
                          : v.includes("PROCESO")
                          ? "bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300"
                          : v
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground";
                        return (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}
                          >
                            {student.state || "—"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmtDateSmart(student.joinDate)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmtDateSmart(student.lastActivity)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.inactivityDays != null &&
                      student.inactivityDays !== undefined ? (
                        <span>{student.inactivityDays}d</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && pageItems.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30 text-xs">
            <div className="text-muted-foreground">
              Mostrando {(page - 1) * PAGE_SIZE + 1} a{" "}
              {Math.min(page * PAGE_SIZE, total)} de {total} estudiantes
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-md border border-border bg-card disabled:opacity-40 hover:bg-accent"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </button>
              <div className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </div>
              <button
                className="px-2 py-1 rounded-md border border-border bg-card disabled:opacity-40 hover:bg-accent"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
