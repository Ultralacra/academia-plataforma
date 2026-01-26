"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StudentRow, CoachTeam } from "./api";
import {
  getAllStudents,
  getAllStudentsPaged,
  getAllCoachesFromTeams,
  createStudent,
  getOpciones,
  updateClientEtapa,
  updateClientIngreso,
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
  Loader2,
  Pencil,
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
    (s) => s.teamMembers?.map((tm) => tm.name) ?? [],
  );
  return Array.from(new Set(allCoaches)).filter(Boolean).sort();
}

function getCoachMetrics(students: StudentRow[]) {
  const total = students.length;
  const fases = ["F1", "F2", "F3", "F4", "F5"];
  const porFase = Object.fromEntries(
    fases.map((f) => [f, students.filter((s) => s.stage === f).length]),
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
  // Si viene ISO con T, extraer solo la parte de fecha para evitar desfase
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    // formato YYYY-MM-DD sin parsear como Date (evita timezone)
    const [, y, m, d] = isoMatch;
    const fake = new Date(Number(y), Number(m) - 1, Number(d));
    return clean(dtDateOnly.format(fake));
  }
  // Si es YYYY-MM-DD puro
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const fake = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return clean(dtDateOnly.format(fake));
  }
  // Fallback: parsear como Date normal
  const d = new Date(value);
  if (!isNaN(d.getTime())) return clean(dtDateTime.format(d));
  return value;
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  // Si viene ISO YYYY-MM-DDTHH:mm:ss.sssZ → extraer YYYY-MM-DD
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // Fallback: parsear fecha y formatear
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  // Usar UTC para evitar desfase de timezone
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  const [progress, setProgress] = useState<number>(0);
  const [all, setAll] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [coaches, setCoaches] = useState<CoachTeam[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedCoachName, setSelectedCoachName] = useState<string | null>(
    null,
  );
  // El backend soporta hasta 1000 por página (según uso en otros módulos)
  const SERVER_PAGE_SIZE = 1000;
  // Nuevo comportamiento: al filtrar por coach, traer primero 100 y dar opción de traer TODO.
  const COACH_FIRST_PAGE_SIZE = 100;
  const COACH_ALL_PAGE_SIZE = 500;
  // Mantener paginado local de UI liviano
  const UI_PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [serverPage, setServerPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [serverTotalPages, setServerTotalPages] = useState<number | null>(null);
  const [loadingCoachAll, setLoadingCoachAll] = useState(false);
  const [coachAllProgress, setCoachAllProgress] = useState<number>(0);
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string | null>(null);
  const [openCoach, setOpenCoach] = useState(false);

  // Cache local: dataset "todos" para volver sin refetch.
  const allTodosRef = useRef<StudentRow[] | null>(null);
  const todosMetaRef = useRef<{
    serverPage: number;
    serverTotal: number | null;
    serverTotalPages: number | null;
    hasMore: boolean;
  } | null>(null);

  const patchTodosByCode = (code: string, patch: (r: StudentRow) => StudentRow) => {
    const cached = allTodosRef.current;
    if (!cached || !code) return;
    allTodosRef.current = cached.map((r) =>
      String(r.code ?? "") === code ? patch(r) : r,
    );
  };

  // Edición de fecha de ingreso
  const [openIngreso, setOpenIngreso] = useState(false);
  const [ingresoFor, setIngresoFor] = useState<{
    code: string;
    name: string;
    prev: string | null;
  } | null>(null);
  const [draftIngreso, setDraftIngreso] = useState("");
  const [savingIngreso, setSavingIngreso] = useState(false);

  // Edición inline de fase (etapa)
  const [etapas, setEtapas] = useState<Array<{ key: string; value: string }>>(
    [],
  );
  const [openStageFor, setOpenStageFor] = useState<string | null>(null);
  const [updatingStageFor, setUpdatingStageFor] = useState<string | null>(null);
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
      setProgress(0);
      try {
        // 1) Traer alumnos (hasta 1000) desde backend una sola vez.
        // Luego, filtros/búsqueda se aplican localmente sin refetch.
        const res = await getAllStudentsPaged({
          page: 1,
          pageSize: SERVER_PAGE_SIZE,
        });
        const items = res.items;
        setAll(items);
        allTodosRef.current = items;
        setPage(1);
        setServerPage(1);
        setServerTotal(res.total ?? null);
        setServerTotalPages(res.totalPages ?? null);
        if (res.totalPages != null) {
          setHasMore((res.page ?? 1) < res.totalPages);
        } else {
          setHasMore((items?.length ?? 0) >= SERVER_PAGE_SIZE);
        }

        todosMetaRef.current = {
          serverPage: 1,
          serverTotal: res.total ?? null,
          serverTotalPages: res.totalPages ?? null,
          hasMore:
            res.totalPages != null
              ? (res.page ?? 1) < res.totalPages
              : (items?.length ?? 0) >= SERVER_PAGE_SIZE,
        };
      } catch (e) {
        console.error(e);
        setAll([]);
        setHasMore(false);
        setServerTotal(null);
        setServerTotalPages(null);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, []);

  // Mantener sincronizado el cache de "todos" cuando estamos en modo todos.
  useEffect(() => {
    if (coach !== "todos") return;
    allTodosRef.current = all;
    todosMetaRef.current = {
      serverPage,
      serverTotal,
      serverTotalPages,
      hasMore,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, coach]);

  // Cuando se filtra por coach, ahora se hace server-side: ?coach=CODE.
  useEffect(() => {
    let active = true;
    const coachId = selectedCoachId;

    // Volver a "todos" sin refetch.
    if (coach === "todos") {
      const cached = allTodosRef.current;
      const meta = todosMetaRef.current;
      if (cached) {
        setAll(cached);
        setPage(1);
        setServerPage(meta?.serverPage ?? 1);
        setServerTotal(meta?.serverTotal ?? null);
        setServerTotalPages(meta?.serverTotalPages ?? null);
        setHasMore(meta?.hasMore ?? false);
      }
      return () => {
        active = false;
      };
    }

    // Si el coach viene sin id/código, no podemos usar el endpoint nuevo.
    if (!coachId) return () => {
      active = false;
    };

    (async () => {
      setLoading(true);
      setLoadingCoachAll(false);
      setCoachAllProgress(0);
      try {
        const res = await getAllStudentsPaged({
          page: 1,
          pageSize: COACH_FIRST_PAGE_SIZE,
          coach: coachId,
        });
        if (!active) return;
        setAll(res.items ?? []);
        setPage(1);
        setServerPage(1);
        setServerTotal(res.total ?? null);
        setServerTotalPages(res.totalPages ?? null);
        // Para coach, la UX es botón "Traer todo"; no usar "Cargar más".
        setHasMore(false);
      } catch (e) {
        console.error(e);
        if (!active) return;
        setAll([]);
        setServerTotal(null);
        setServerTotalPages(null);
        setHasMore(false);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach, selectedCoachId]);

  // Progreso simulado durante carga (no hay progress real en fetch)
  useEffect(() => {
    if (!loading) {
      setProgress((p) => (p < 95 ? 100 : 100));
      const t = setTimeout(() => setProgress(0), 450);
      return () => clearTimeout(t);
    }
    setProgress(5);
    const iv = setInterval(() => {
      setProgress((p) => Math.min(90, p + 8));
    }, 180);
    return () => clearInterval(iv);
  }, [loading]);

  const loadMore = async () => {
    // En modo coach filtrado, usamos el botón "Traer todo".
    if (coach !== "todos") return;
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = serverPage + 1;
      const res = await getAllStudentsPaged({
        page: next,
        pageSize: SERVER_PAGE_SIZE,
      });
      const items = res.items;
      setAll((prev) => [...prev, ...(items ?? [])]);
      setServerPage(next);
      setServerTotal(res.total ?? serverTotal ?? null);
      setServerTotalPages(res.totalPages ?? serverTotalPages ?? null);
      if (res.totalPages != null) {
        setHasMore(next < res.totalPages);
      } else {
        setHasMore((items?.length ?? 0) >= SERVER_PAGE_SIZE);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Ocurrió un error al cargar más estudiantes",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const loadAllForSelectedCoach = async () => {
    if (coach === "todos") return;
    const coachId = selectedCoachId;
    if (!coachId) return;
    if (loadingCoachAll) return;

    setLoadingCoachAll(true);
    setCoachAllProgress(0);
    try {
      const first = await getAllStudentsPaged({
        page: 1,
        pageSize: COACH_ALL_PAGE_SIZE,
        coach: coachId,
      });

      const total = first.total ?? null;
      const totalPages = first.totalPages;
      let acc: StudentRow[] = [...(first.items ?? [])];
      setAll(acc);
      setServerTotal(total);
      setServerTotalPages(totalPages ?? null);
      setServerPage(1);

      if (total && total > 0) {
        setCoachAllProgress(Math.min(95, Math.round((acc.length / total) * 100)));
      } else {
        setCoachAllProgress(10);
      }

      if (totalPages != null) {
        for (let p = 2; p <= totalPages; p++) {
          const res = await getAllStudentsPaged({
            page: p,
            pageSize: COACH_ALL_PAGE_SIZE,
            coach: coachId,
          });
          const items = res.items ?? [];
          acc = [...acc, ...items];
          setAll(acc);
          setServerPage(p);
          if (res.total != null) setServerTotal(res.total);
          if (res.totalPages != null) setServerTotalPages(res.totalPages);

          const t = res.total ?? total;
          if (t && t > 0) {
            setCoachAllProgress(
              Math.min(99, Math.round((acc.length / t) * 100)),
            );
          }
        }
      } else {
        // Fallback: si no hay totalPages, seguir mientras venga lleno.
        let p = 2;
        while (true) {
          const res = await getAllStudentsPaged({
            page: p,
            pageSize: COACH_ALL_PAGE_SIZE,
            coach: coachId,
          });
          const items = res.items ?? [];
          if (items.length === 0) break;
          acc = [...acc, ...items];
          setAll(acc);
          setServerPage(p);
          if (res.total != null) setServerTotal(res.total);
          if (res.totalPages != null) setServerTotalPages(res.totalPages);

          const t = res.total ?? total;
          if (t && t > 0) {
            setCoachAllProgress(
              Math.min(99, Math.round((acc.length / t) * 100)),
            );
          }

          if (items.length < COACH_ALL_PAGE_SIZE) break;
          p += 1;
        }
      }

      setCoachAllProgress(100);
      setHasMore(false);
    } catch (e) {
      console.error(e);
      toast({
        title: "Ocurrió un error al traer todos los alumnos del coach",
        variant: "destructive",
      });
    } finally {
      setLoadingCoachAll(false);
      setTimeout(() => setCoachAllProgress(0), 600);
    }
  };

  const openIngresoEditor = (student: StudentRow) => {
    if (!student.code) return;
    setIngresoFor({
      code: String(student.code),
      name: String(student.name ?? ""),
      prev: student.joinDate ?? null,
    });
    setDraftIngreso(toDateInputValue(student.joinDate));
    setOpenIngreso(true);
  };

  const saveIngreso = async () => {
    if (!ingresoFor) return;
    const code = ingresoFor.code;
    const next = draftIngreso.trim() ? draftIngreso.trim() : null;

    setSavingIngreso(true);
    // optimista
    setAll((prev) =>
      prev.map((r) =>
        String(r.code ?? "") === code ? { ...r, joinDate: next } : r,
      ),
    );
    if (coach !== "todos") {
      patchTodosByCode(code, (r) => ({ ...r, joinDate: next }));
    }

    try {
      await updateClientIngreso(code, next);
      toast({
        title: "Ingreso actualizado",
        description: `${ingresoFor.name} → ${fmtDateSmart(next)}`,
      });
      setOpenIngreso(false);
      setIngresoFor(null);
    } catch (e) {
      // rollback
      setAll((prev) =>
        prev.map((r) =>
          String(r.code ?? "") === code
            ? { ...r, joinDate: ingresoFor.prev }
            : r,
        ),
      );
      if (coach !== "todos") {
        patchTodosByCode(code, (r) => ({ ...r, joinDate: ingresoFor.prev }));
      }
      toast({
        title: "Error",
        description: getSpanishApiError(
          e,
          "No se pudo actualizar la fecha de ingreso",
        ),
        variant: "destructive",
      });
    } finally {
      setSavingIngreso(false);
    }
  };

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
          (name, idx) => ({ id: idx + 1, name }) as CoachTeam,
        );
        setCoaches(inferred);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nota: la carga de `allFull` se hace arriba reutilizando el fetch principal.

  // Cargar catálogo de etapas (para edición inline de fase)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getOpciones("etapa");
        if (!active) return;
        const mapped = (list || [])
          .map((x) => ({ key: String(x.key), value: String(x.value) }))
          .filter((x) => x.key.trim());
        setEtapas(mapped);
      } catch (e) {
        if (!active) return;
        setEtapas([
          { key: "ONBOARDING", value: "ONBOARDING" },
          { key: "F1", value: "F1" },
          { key: "F2", value: "F2" },
          { key: "F3", value: "F3" },
          { key: "F4", value: "F4" },
          { key: "F5", value: "F5" },
        ]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stageLabel = (stage?: string | null) => {
    const raw = String(stage ?? "").trim();
    if (!raw) return "—";
    const match = etapas.find((e) => e.key === raw);
    return match?.value ?? raw;
  };

  // Si por alguna razón no tenemos coaches del endpoint, inferir por alumnos
  useEffect(() => {
    if (coaches.length === 0 && !loading && all.length > 0) {
      const inferred = getUniqueCoaches(all).map(
        (name, idx) => ({ id: idx + 1, name }) as CoachTeam,
      );
      setCoaches(inferred);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, loading]);

  // Manejo del valor del Select → soporta formatos:
  //   - "todos"
  //   - `id:{coachId}|name:{coachName}`
  //   - `name:{coachName}`
  useEffect(() => {
    if (coach === "todos") {
      setSelectedCoachName(null);
      setSelectedCoachId(null);
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
  }, [coach]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();

    // Nota: el filtro por coach ahora es server-side; aquí solo buscamos localmente.
    if (!q) return all;
    return all.filter((s) => {
      const name = (s.name ?? "").toString().toLowerCase();
      const code = (s.code ?? "").toString().toLowerCase();
      const state = (s.state ?? "").toString().toLowerCase();
      const stage = (s.stage ?? "").toString().toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        state.includes(q) ||
        stage.includes(q)
      );
    });
  }, [all, search]);

  // valores únicos de fases (usar la lista completa `allFull` si está disponible para mostrar todas las opciones)
  const uniqueStages = useMemo(() => {
    const NO_STAGE = "Sin fase";
    const source = all || [];
    const base = Array.from(
      new Set(
        (source || [])
          .map((s) => (s.stage && s.stage.trim() ? s.stage.trim() : ""))
          .filter(Boolean),
      ),
    ).sort();
    const hasNoStage = (source || []).some(
      (s) => !s.stage || !String(s.stage).trim(),
    );
    return hasNoStage ? [NO_STAGE, ...base] : base;
  }, [all]);

  // valores únicos de estado (usar la lista completa `allFull` si está disponible para mostrar todas las opciones)
  const uniqueStates = useMemo(() => {
    const NO_STATE = "Sin estado";
    const source = all || [];
    const base = Array.from(
      new Set(
        (source || [])
          .map((s) =>
            s.state && String(s.state).trim() ? String(s.state).trim() : "",
          )
          .filter(Boolean),
      ),
    ).sort();
    const hasNoState = (source || []).some(
      (s) => !s.state || !String(s.state).trim(),
    );
    return hasNoState ? [NO_STATE, ...base] : base;
  }, [all]);

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
  const totalPages = Math.max(1, Math.ceil(total / UI_PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * UI_PAGE_SIZE;
    return finalRows.slice(start, start + UI_PAGE_SIZE);
  }, [finalRows, page]);

  const coachMetrics = useMemo(() => getCoachMetrics(finalRows), [finalRows]);

  const reset = () => {
    setSearch("");
    setCoach("todos");
    setFilterState(null);
    setFilterStage(null);
    setPage(1);
  };

  const hasFilters = Boolean(
    search || coach !== "todos" || filterStage || filterState,
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
      if (allTodosRef.current) {
        allTodosRef.current = [newRow, ...allTodosRef.current];
      }
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
      <Dialog
        open={openIngreso}
        onOpenChange={(o) => {
          setOpenIngreso(o);
          if (!o) setIngresoFor(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar fecha de ingreso</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Alumno:</span>{" "}
              <span className="font-medium">{ingresoFor?.name ?? "—"}</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ingreso</label>
              <Input
                type="date"
                value={draftIngreso}
                onChange={(e) => setDraftIngreso(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setDraftIngreso("")}
              className="h-9"
              disabled={savingIngreso}
            >
              Limpiar fecha
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenIngreso(false)}
              disabled={savingIngreso}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveIngreso}
              disabled={savingIngreso || !ingresoFor}
            >
              {savingIngreso ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <UserCircle2
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        coach !== "todos"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate",
                        coach !== "todos"
                          ? "text-foreground"
                          : "text-muted-foreground",
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

            {coach !== "todos" && selectedCoachId && serverTotal != null && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  Cargados <span className="font-semibold">{all.length}</span> de{" "}
                  <span className="font-semibold">{serverTotal}</span>
                </div>
                {all.length < serverTotal && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2"
                    onClick={loadAllForSelectedCoach}
                    disabled={loading || loadingCoachAll}
                    title="Traer todos los alumnos de este coach"
                  >
                    {loadingCoachAll ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {coachAllProgress > 0
                          ? `Traer todo (${coachAllProgress}%)`
                          : "Traer todo"}
                      </span>
                    ) : (
                      "Traer todo"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

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
                {(() => {
                  const loaded = all.length;
                  const st = serverTotal ?? loaded;
                  if (!st) return null;
                  return (
                    <div className="text-[11px] text-muted-foreground -mt-1 mb-2">
                      Cargados {Math.min(loaded, st)} de {st}
                      {serverTotalPages != null
                        ? ` · API ${serverPage}/${serverTotalPages}`
                        : ""}
                    </div>
                  );
                })()}
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
                        : "bg-card text-foreground border-border hover:bg-accent",
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
                        : "bg-card text-foreground border-border hover:bg-accent",
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
                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                      <div className="relative h-2 w-full max-w-xl overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${Math.round(progress)}%` }}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Cargando alumnos… {Math.round(progress)}%
                      </div>
                    </div>
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
                            student.code,
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

                        const canEdit = Boolean(student.code);
                        const code = String(student.code || "");
                        const isOpen = openStageFor === code;
                        const isUpdating = updatingStageFor === code;

                        const badge = (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}
                          >
                            {stageLabel(student.stage)}
                          </span>
                        );

                        if (!canEdit) return badge;

                        return (
                          <Popover
                            open={isOpen}
                            onOpenChange={(o) =>
                              setOpenStageFor(o ? code : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={isUpdating}
                                aria-label={`Cambiar fase de ${student.name}`}
                                title="Cambiar fase"
                                className={cn(
                                  "inline-flex items-center gap-1 rounded hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                                  isUpdating
                                    ? "opacity-60 cursor-not-allowed"
                                    : "cursor-pointer",
                                )}
                              >
                                {badge}
                                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="p-0 w-[260px] shadow-none"
                              align="start"
                              sideOffset={8}
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Cambiar fase..."
                                  autoFocus
                                  className="text-sm"
                                />
                                <CommandList className="max-h-64">
                                  <CommandEmpty>
                                    No hay resultados.
                                  </CommandEmpty>
                                  <CommandGroup heading="Fases">
                                    {(etapas.length
                                      ? etapas
                                      : [
                                          {
                                            key: "ONBOARDING",
                                            value: "ONBOARDING",
                                          },
                                          { key: "F1", value: "F1" },
                                          { key: "F2", value: "F2" },
                                          { key: "F3", value: "F3" },
                                          { key: "F4", value: "F4" },
                                          { key: "F5", value: "F5" },
                                        ]
                                    ).map((opt) => (
                                      <CommandItem
                                        key={opt.key}
                                        value={`${opt.key} ${opt.value}`}
                                        onSelect={async () => {
                                          if (!student.code) return;
                                          const nextKey = opt.key;
                                          const prevStage = student.stage;
                                          setUpdatingStageFor(code);
                                          // optimista
                                          setAll((prev) =>
                                            prev.map((r) =>
                                              r.code === student.code
                                                ? { ...r, stage: nextKey }
                                                : r,
                                            ),
                                          );
                                          if (coach !== "todos") {
                                            patchTodosByCode(code, (r) => ({
                                              ...r,
                                              stage: nextKey,
                                            }));
                                          }
                                          try {
                                            await updateClientEtapa(
                                              code,
                                              nextKey,
                                            );
                                            toast({
                                              title: "Fase actualizada",
                                              description: `${student.name} → ${opt.value}`,
                                            });
                                            setOpenStageFor(null);
                                          } catch (e) {
                                            // rollback
                                            setAll((prev) =>
                                              prev.map((r) =>
                                                r.code === student.code
                                                  ? { ...r, stage: prevStage }
                                                  : r,
                                              ),
                                            );
                                            if (coach !== "todos") {
                                              patchTodosByCode(code, (r) => ({
                                                ...r,
                                                stage: prevStage,
                                              }));
                                            }
                                            toast({
                                              title: "Error",
                                              description: getSpanishApiError(
                                                e,
                                                "No se pudo actualizar la fase",
                                              ),
                                              variant: "destructive",
                                            });
                                          } finally {
                                            setUpdatingStageFor(null);
                                          }
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <span className="truncate">
                                          {opt.value}
                                        </span>
                                        {String(student.stage || "").trim() ===
                                          opt.key && (
                                          <Check className="ml-auto h-4 w-4 text-blue-600" />
                                        )}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
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
                      <div className="flex items-center gap-2">
                        <span>{fmtDateSmart(student.joinDate)}</span>
                        {student.code && (
                          <button
                            type="button"
                            onClick={() => openIngresoEditor(student)}
                            disabled={
                              savingIngreso &&
                              ingresoFor?.code === String(student.code)
                            }
                            title="Editar fecha de ingreso"
                            aria-label={`Editar ingreso de ${student.name}`}
                            className={cn(
                              "inline-flex items-center justify-center rounded p-1",
                              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                              savingIngreso &&
                                ingresoFor?.code === String(student.code)
                                ? "opacity-60 cursor-not-allowed"
                                : "cursor-pointer",
                            )}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
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
          <div className="flex items-center justify-end px-4 py-3 border-t border-border/50 bg-muted/30 text-xs">
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
              {hasMore && coach === "todos" && page >= totalPages && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando...
                    </span>
                  ) : (
                    "Cargar más"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
