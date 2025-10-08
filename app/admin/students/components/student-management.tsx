"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type ClientItem } from "@/lib/data-service";
import { Separator } from "@/components/ui/separator";
import ApiFilters from "./ApiFilters";
import ClientFilters from "./ClientFilters";
import ChartsSection from "./ChartsSection";
import ResultsTable from "./ResultsTable";
import TeamModal, { type CoachMember } from "./TeamModal";
import StudentsListModal from "./students-list-modal";
import { uniq, toDateKey } from "./utils/students-utils";
import {
  buildPhaseItems,
  buildLifecycleItems,
  type LifecycleItem,
} from "./phase-faker";

export default function StudentManagement() {
  // ============================ Server filters + fetch
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<ClientItem[]>([]);
  const [search, setSearch] = useState("");
  // notas: filtros por mes/fechas eliminados de la UI; solo busqueda por texto

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await dataService.getClients({
          search,
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
  }, [search]);

  // ============================ Client filters
  const [statesFilter, setStatesFilter] = useState<string[]>([]);
  const [stagesFilter, setStagesFilter] = useState<string[]>([]);
  const [lastFrom, setLastFrom] = useState<string>("");
  const [lastTo, setLastTo] = useState<string>("");
  const [inactFrom, setInactFrom] = useState<string>("");
  const [inactTo, setInactTo] = useState<string>("");

  const stateOptions = useMemo(
    () => uniq(allItems.map((i) => i.state)).sort(),
    [allItems]
  );
  const stageOptions = useMemo(
    () => uniq(allItems.map((i) => i.stage)).sort(),
    [allItems]
  );

  // debug: print sample data when items or filters change
  useEffect(() => {
    if (typeof window === "undefined") return;
    console.debug("[students] items", allItems?.slice(0, 5));
    console.debug("[students] stateOptions", stateOptions);
    console.debug("[students] stageOptions", stageOptions);
    console.debug("[students] statesFilter", statesFilter);
    console.debug("[students] stagesFilter", stagesFilter);
  }, [allItems, stateOptions, stageOptions, statesFilter, stagesFilter]);

  const filtered = useMemo(() => {
    // normalize filters and item fields to avoid mismatches due to case/whitespace
    const normStates = statesFilter.map((s) => s?.trim().toLowerCase());
    const normStages = stagesFilter.map((s) => s?.trim().toLowerCase());

    return (allItems ?? []).filter((i) => {
      const istate = (i.state ?? "").toString().trim().toLowerCase();
      const istage = (i.stage ?? "").toString().trim().toLowerCase();

      const okState =
        normStates.length === 0 || (istate && normStates.includes(istate));

      const okStage =
        normStages.length === 0 || (istage && normStages.includes(istage));

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

  // ============================ Paginación local
  const pageSizeUI = 25;
  const [page, setPage] = useState(1);
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSizeUI));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSizeUI;
    return filtered.slice(start, start + pageSizeUI);
  }, [filtered, page]);

  // ============================ Distribuciones
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

  // ============================ Faker: fases + lifecycle
  const phaseItems = useMemo(() => buildPhaseItems(filtered), [filtered]);
  const lifecycleItems = useMemo(
    () => buildLifecycleItems(filtered),
    [filtered]
  );
  const lifecycleByCode = useMemo(() => {
    const m: Record<string, LifecycleItem> = {};
    lifecycleItems.forEach((x) => {
      if (x.code) m[x.code] = x;
    });
    return m;
  }, [lifecycleItems]);

  // ============================ Modal: coaches por alumno
  const [teamOpen, setTeamOpen] = useState(false);
  const [modalStudentName, setModalStudentName] = useState("");
  const [modalStudentCode, setModalStudentCode] = useState<string | null>(null);
  const [modalMembers, setModalMembers] = useState<CoachMember[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  const openTeamForStudent = async (student: ClientItem) => {
    setModalStudentName(student.name);
    setModalStudentCode(student.code ?? null);
    setModalMembers([]);
    setTeamOpen(true);

    if (!student.code) return;
    setLoadingCoaches(true);
    try {
      const res = await dataService.getClientCoaches(student.code);
      const coaches: CoachMember[] = (res.coaches ?? []).map((c: any) => ({
        name: c.name,
        puesto: c.puesto ?? null,
        area: c.area ?? null,
        url: (c as any).url ?? null,
      }));
      setModalMembers(coaches);
    } catch (e) {
      console.error(e);
      setModalMembers([]);
    } finally {
      setLoadingCoaches(false);
    }
  };

  // ============================ Modal: listados (transiciones / no tareas)
  const [listOpen, setListOpen] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listRows, setListRows] = useState<
    Array<{ code?: string | null; name?: string | null; subtitle?: string }>
  >([]);

  const openList = (
    title: string,
    rows: Array<{
      code?: string | null;
      name?: string | null;
      subtitle?: string;
    }>
  ) => {
    setListTitle(title);
    setListRows(rows);
    setListOpen(true);
  };

  // ============================ Reset
  // note: reset button removed per UX request; keep resetAll in case needed later
  const resetAll = () => {
    setSearch("");
    setStatesFilter([]);
    setStagesFilter([]);
    setLastFrom("");
    setLastTo("");
    setInactFrom("");
    setInactTo("");
    setPage(1);
  };

  // ============================ Render
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Estudiantes</h2>
        </div>
      </div>

      <ApiFilters search={search} setSearch={setSearch} />

      <ClientFilters
        stateOptions={stateOptions}
        stageOptions={stageOptions}
        statesFilter={statesFilter}
        setStatesFilter={(v: string[]) => {
          setStatesFilter(v);
          setPage(1);
        }}
        stagesFilter={stagesFilter}
        setStagesFilter={(v: string[]) => {
          setStagesFilter(v);
          setPage(1);
        }}
      />

      {/* >>> IMPORTANTE: pasamos students={filtered} <<< */}
      <ChartsSection
        loading={loading}
        distByState={distByState}
        distByStage={distByStage}
        byJoinDate={byJoinDate}
        phaseItems={phaseItems}
        lifecycleItems={lifecycleItems}
        students={filtered}
        onOpenList={openList}
      />

      <ResultsTable
        loading={loading}
        pageItems={pageItems}
        totalFiltered={totalFiltered}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        onOpenTeam={openTeamForStudent}
        lifecycleByCode={lifecycleByCode}
      />

      <TeamModal
        open={teamOpen}
        onOpenChange={setTeamOpen}
        studentName={modalStudentName}
        studentCode={modalStudentCode}
        members={modalMembers}
        loading={loadingCoaches}
      />

      <StudentsListModal
        open={listOpen}
        onOpenChange={setListOpen}
        title={listTitle}
        rows={listRows}
      />

      <Separator />
      <p className="text-xs text-muted-foreground">
        * Esta vista pagina localmente: si necesitas más de 1000, subimos el
        límite del backend o implementamos paginación real con “cursor/offset”.
      </p>
    </div>
  );
}
