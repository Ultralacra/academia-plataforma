"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type ClientItem } from "@/lib/data-service";
import { Button } from "@/components/ui/button";
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
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

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

  // ============================ Render
  return (
    <div className="space-y-6">
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

      <ApiFilters
        search={search}
        setSearch={setSearch}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
      />

      <ClientFilters
        stateOptions={stateOptions}
        stageOptions={stageOptions}
        statesFilter={statesFilter}
        setStatesFilter={(v) => {
          setStatesFilter(v);
          setPage(1);
        }}
        stagesFilter={stagesFilter}
        setStagesFilter={(v) => {
          setStagesFilter(v);
          setPage(1);
        }}
        lastFrom={lastFrom}
        setLastFrom={(v) => {
          setLastFrom(v);
          setPage(1);
        }}
        lastTo={lastTo}
        setLastTo={(v) => {
          setLastTo(v);
          setPage(1);
        }}
        inactFrom={inactFrom}
        setInactFrom={(v) => {
          setInactFrom(v);
          setPage(1);
        }}
        inactTo={inactTo}
        setInactTo={(v) => {
          setInactTo(v);
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
