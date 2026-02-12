"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dataService, type ClientItem } from "@/lib/data-service";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GenericListModal, { type ListRow } from "./GenericListModal";
import {
  Megaphone,
  AlertTriangle,
  Eye,
  Layers,
  ListChecks,
} from "lucide-react";
import ApiFilters from "./ApiFilters";
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
import { fetchCoaches, getDefaultRange, type CoachOpt } from "./api";

export default function StudentManagement() {
  // ============================ Server filters + fetch
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<ClientItem[]>([]);
  const [search, setSearch] = useState("");
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [metricsFrom, setMetricsFrom] = useState(defaultRange.fechaDesde);
  const [metricsTo, setMetricsTo] = useState(defaultRange.fechaHasta);
  const [metricsCoach, setMetricsCoach] = useState("");
  const [coaches, setCoaches] = useState<CoachOpt[]>([]);
  const [loadingMetricsCoaches, setLoadingMetricsCoaches] = useState(false);
  // notas: filtros por mes/fechas eliminados de la UI; solo busqueda por texto

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingMetricsCoaches(true);
      try {
        const res = await fetchCoaches();
        if (!ignore) setCoaches(res);
      } catch (e) {
        console.error("[students] fetchCoaches error", e);
        if (!ignore) setCoaches([]);
      } finally {
        if (!ignore) setLoadingMetricsCoaches(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

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
    [allItems],
  );
  const stageOptions = useMemo(
    () => uniq(allItems.map((i) => i.stage)).sort(),
    [allItems],
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

  const abandonosPorInactividad = useMemo(() => {
    const thresholdDays = 29;
    const rows = (filtered ?? [])
      .map((i) => ({
        name: i.name,
        days: Number(i.inactivityDays ?? 0),
      }))
      .filter((r) => Boolean(r.name) && r.days >= thresholdDays)
      .sort((a, b) => a.days - b.days)
      .map((r) => ({
        name: r.name,
        subtitle: `${r.days} día${r.days === 1 ? "" : "s"}`,
      }));

    const names = rows.map((r) => r.name).filter(Boolean);
    return { thresholdDays, count: rows.length, names, rows };
  }, [filtered]);

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
        (map.get(i.state || "SIN ESTADO") ?? 0) + 1,
      ),
    );
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filtered]);

  const distByStage = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) =>
      map.set(
        i.stage || "SIN ETAPA",
        (map.get(i.stage || "SIN ETAPA") ?? 0) + 1,
      ),
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
      a.date.localeCompare(b.date),
    );
  }, [filtered]);

  // ============================ Faker: fases + lifecycle
  const phaseItems = useMemo(() => buildPhaseItems(filtered), [filtered]);
  const lifecycleItems = useMemo(
    () => buildLifecycleItems(filtered),
    [filtered],
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
    }>,
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

  // ============================ ADS Metrics (metadata)
  type AdsMetadataRecord = {
    id: number | string;
    entity: string;
    entity_id: string;
    payload: any;
    created_at?: string;
    updated_at?: string;
  };

  const coerceMetadataList = (res: any): AdsMetadataRecord[] => {
    if (Array.isArray(res)) return res as AdsMetadataRecord[];
    if (res && typeof res === "object") {
      if (Array.isArray((res as any).items)) return (res as any).items;
      if (Array.isArray((res as any).data)) return (res as any).data;
      const data = (res as any).data;
      if (data && typeof data === "object") {
        if (Array.isArray((data as any).items)) return (data as any).items;
        if (Array.isArray((data as any).data)) return (data as any).data;
        if (Array.isArray((data as any).rows)) return (data as any).rows;
      }
    }
    return [];
  };

  const [tab, setTab] = useState<"metrics" | "ads">("metrics");
  const [adsItems, setAdsItems] = useState<AdsMetadataRecord[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [adsLoadedOnce, setAdsLoadedOnce] = useState(false);

  const [adsListOpen, setAdsListOpen] = useState(false);
  const [adsListTitle, setAdsListTitle] = useState("");
  const [adsListRows, setAdsListRows] = useState<ListRow[]>([]);
  const adsConsoleLoggedRef = useRef(false);

  const openAdsList = (title: string, rows: ListRow[]) => {
    setAdsListTitle(title);
    setAdsListRows(rows);
    setAdsListOpen(true);
  };

  type AdsUiRow = {
    id: string;
    alumnoCodigo: string | null;
    alumnoNombre: string | null;
    fase: string;
    subfase: string;
    trascendencia: string | null;
    pautaActiva: boolean;
    requiereInterv: boolean;
    facturacion: number | null;
    createdAt: string | null;
  };

  const parseAmount = (value: unknown): number | null => {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;
    const s = value.trim();
    if (!s) return null;

    const cleaned = s.replace(/[^\d.,-]/g, "");
    if (!cleaned) return null;

    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");

    let normalized = cleaned;
    if (lastDot !== -1 && lastComma !== -1) {
      // usa como separador decimal el último que aparezca
      if (lastDot > lastComma) {
        normalized = cleaned.replace(/,/g, "");
      } else {
        normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
      }
    } else if (lastComma !== -1) {
      const parts = cleaned.split(",");
      const decimals = parts[parts.length - 1] ?? "";
      if (decimals.length > 0 && decimals.length <= 2) {
        normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
      } else {
        normalized = cleaned.replace(/,/g, "");
      }
    } else {
      normalized = cleaned.replace(/,/g, "");
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const adsUiRows: AdsUiRow[] = useMemo(() => {
    return (adsItems ?? []).map((m) => {
      const payload = (m as any)?.payload ?? {};
      const alumnoCodigoRaw =
        payload?.alumno_codigo ?? payload?.alumno_code ?? null;
      const alumnoNombreRaw =
        payload?.alumno_nombre ?? payload?.alumno_name ?? null;

      const faseRaw = payload?.fase ?? "";
      const subfaseRaw = payload?.subfase ?? "";
      const trascendenciaRaw = payload?.subfase_color ?? null;

      const pautaActiva = Boolean(payload?.pauta_activa);
      const requiereInterv = Boolean(payload?.requiere_interv);
      const facturacion = parseAmount(payload?.facturacion);

      const createdAt = (() => {
        const raw =
          payload?._saved_at ??
          (m as any)?.updated_at ??
          (m as any)?.created_at;
        if (!raw) return null;
        const t = Date.parse(String(raw));
        if (Number.isNaN(t)) return String(raw);
        return new Date(t).toISOString();
      })();

      return {
        id: String((m as any)?.id ?? ""),
        alumnoCodigo: alumnoCodigoRaw ? String(alumnoCodigoRaw) : null,
        alumnoNombre: alumnoNombreRaw ? String(alumnoNombreRaw) : null,
        fase: String(faseRaw || "Sin fase").trim() || "Sin fase",
        subfase: String(subfaseRaw || "Sin subfase").trim() || "Sin subfase",
        trascendencia:
          trascendenciaRaw == null
            ? null
            : String(trascendenciaRaw).trim() || null,
        pautaActiva,
        requiereInterv,
        facturacion,
        createdAt,
      };
    });
  }, [adsItems]);

  useEffect(() => {
    if (!adsLoadedOnce) return;
    if (adsConsoleLoggedRef.current) return;
    if (typeof window === "undefined") return;

    adsConsoleLoggedRef.current = true;
    console.log("[students][ads_metrics] metadata items (shown)", adsItems);
    console.log("[students][ads_metrics] derived rows (shown)", adsUiRows);
  }, [adsLoadedOnce, adsItems, adsUiRows]);

  const adsSuccessCases = useMemo(() => {
    const threshold = 5000;
    const loading = !adsLoadedOnce;
    if (!adsLoadedOnce) {
      return { threshold, loading: true, rows: [] as ListRow[] };
    }

    // Queremos cantidad de USUARIOS (dedupe), no cantidad de registros
    const byStudent = new Map<
      string,
      {
        name: string;
        facturacion: number;
        fase: string;
        subfase: string;
      }
    >();

    for (const r of adsUiRows) {
      const f = r.facturacion;
      if (f == null || !(f > threshold)) continue;
      const key = String(r.alumnoCodigo ?? r.id).trim();
      if (!key) continue;

      const name = String(r.alumnoNombre ?? "—").trim() || "—";
      const prev = byStudent.get(key);
      if (!prev || f > prev.facturacion) {
        byStudent.set(key, {
          name,
          facturacion: f,
          fase: r.fase,
          subfase: r.subfase,
        });
      }
    }

    const nf = new Intl.NumberFormat("es-ES");
    const rows: ListRow[] = Array.from(byStudent.values())
      .sort((a, b) => b.facturacion - a.facturacion)
      .map((x) => ({
        name: x.name,
        subtitle: `Facturación: ${nf.format(x.facturacion)} · ${x.fase} · ${x.subfase}`,
      }));

    return { threshold, loading, rows };
  }, [adsUiRows, adsLoadedOnce]);

  const adsStats = useMemo(() => {
    const total = adsUiRows.length;
    const pautaActiva = adsUiRows.filter((r) => r.pautaActiva);
    const requiereInterv = adsUiRows.filter((r) => r.requiereInterv);
    const trascendencia = adsUiRows.filter((r) => Boolean(r.trascendencia));

    const pautaActivaRequiere = pautaActiva.filter((r) => r.requiereInterv);
    const pautaActivaOk = pautaActiva.filter((r) => !r.requiereInterv);

    const byFase = new Map<
      string,
      {
        fase: string;
        rows: AdsUiRow[];
        bySubfase: Map<
          string,
          {
            subfase: string;
            rows: AdsUiRow[];
            requiere: AdsUiRow[];
            ok: AdsUiRow[];
          }
        >;
      }
    >();

    for (const r of adsUiRows) {
      const key = r.fase;
      if (!byFase.has(key)) {
        byFase.set(key, { fase: key, rows: [], bySubfase: new Map() });
      }
      const bucket = byFase.get(key)!;
      bucket.rows.push(r);

      const sfKey = r.subfase;
      if (!bucket.bySubfase.has(sfKey)) {
        bucket.bySubfase.set(sfKey, {
          subfase: sfKey,
          rows: [],
          requiere: [],
          ok: [],
        });
      }
      const sf = bucket.bySubfase.get(sfKey)!;
      sf.rows.push(r);
      if (r.requiereInterv) sf.requiere.push(r);
      else sf.ok.push(r);
    }

    const fases = Array.from(byFase.values())
      .map((f) => {
        const subfases = Array.from(f.bySubfase.values()).sort((a, b) =>
          a.subfase.localeCompare(b.subfase),
        );
        const pautaActivaCount = f.rows.filter((r) => r.pautaActiva).length;
        const requiereCount = f.rows.filter((r) => r.requiereInterv).length;
        return {
          fase: f.fase,
          rows: f.rows,
          pautaActivaCount,
          requiereCount,
          subfases,
        };
      })
      .sort((a, b) => b.rows.length - a.rows.length);

    return {
      total,
      pautaActiva,
      requiereInterv,
      pautaActivaRequiere,
      pautaActivaOk,
      trascendencia,
      fases,
    };
  }, [adsUiRows]);

  const adsTrascendencias = useMemo(() => {
    const pickKey = (r: AdsUiRow) => {
      const k = String(r.alumnoCodigo ?? "").trim();
      return k || r.id;
    };

    const parseTime = (iso: string | null) => {
      if (!iso) return NaN;
      const t = Date.parse(iso);
      return Number.isNaN(t) ? NaN : t;
    };

    const byTrasc = new Map<
      string,
      {
        key: string;
        byUser: Map<string, AdsUiRow>;
      }
    >();

    for (const r of adsUiRows) {
      const key =
        String(r.trascendencia ?? "Por definir").trim() || "Por definir";
      if (!byTrasc.has(key)) byTrasc.set(key, { key, byUser: new Map() });
      const bucket = byTrasc.get(key)!;

      const userKey = pickKey(r);
      const prev = bucket.byUser.get(userKey);
      if (!prev) {
        bucket.byUser.set(userKey, r);
        continue;
      }

      const ta = parseTime(prev.createdAt);
      const tb = parseTime(r.createdAt);
      if (!Number.isNaN(tb) && (Number.isNaN(ta) || tb >= ta)) {
        bucket.byUser.set(userKey, r);
      }
    }

    const buckets = Array.from(byTrasc.values()).map((b) => ({
      key: b.key,
      rows: Array.from(b.byUser.values()),
    }));

    buckets.sort((a, b) => b.rows.length - a.rows.length);
    return buckets;
  }, [adsUiRows]);

  const asListRows = (rows: AdsUiRow[]): ListRow[] =>
    rows.map((r) => ({
      name: r.alumnoNombre,
      subtitle: `${r.fase} · ${r.subfase} · Trascendencia: ${r.trascendencia ?? "Por definir"} · ${r.requiereInterv ? "Requiere intervención" : "Sin intervención"}`,
    }));

  const StatCard = ({
    icon,
    title,
    value,
    dotClass,
    onClick,
  }: {
    icon: React.ReactNode;
    title: string;
    value: number;
    dotClass: string;
    onClick?: () => void;
  }) => {
    const Wrapper: any = onClick ? "button" : "div";
    return (
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={
          "rounded-2xl border border-border bg-background p-4 text-left " +
          (onClick ? "hover:bg-muted/30 transition-colors" : "")
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full grid place-items-center bg-muted text-foreground">
              {icon}
            </div>
            <span className="text-sm text-muted-foreground">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {onClick ? <Eye className="h-4 w-4 text-muted-foreground" /> : null}
            <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          </div>
        </div>
        <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      </Wrapper>
    );
  };

  useEffect(() => {
    if (adsLoadedOnce) return;

    let ignore = false;
    (async () => {
      setAdsLoading(true);
      setAdsError(null);
      try {
        const qs = new URLSearchParams();
        qs.set("entity", "ads_metrics");
        const json = await apiFetch<any>(`/metadata?${qs.toString()}`, {
          method: "GET",
        });
        const items = coerceMetadataList(json).filter(
          (m) => String((m as any)?.entity ?? "") === "ads_metrics",
        );
        if (!ignore) {
          setAdsItems(items);
          setAdsLoadedOnce(true);
        }
      } catch (e) {
        if (!ignore) {
          setAdsError(e instanceof Error ? e.message : String(e));
          setAdsItems([]);
          setAdsLoadedOnce(true);
        }
      } finally {
        if (!ignore) setAdsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [adsLoadedOnce]);

  // ============================ Render
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Estudiantes</h2>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as any)}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="ads">Métricas ADS</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <ApiFilters
            search={search}
            setSearch={setSearch}
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
            fechaDesde={metricsFrom}
            fechaHasta={metricsTo}
            setFechaDesde={setMetricsFrom}
            setFechaHasta={setMetricsTo}
            coaches={coaches}
            coach={metricsCoach}
            setCoach={setMetricsCoach}
            loadingCoaches={loadingMetricsCoaches}
          />

          <ChartsSection
            loading={loading}
            distByState={distByState}
            distByStage={distByStage}
            byJoinDate={byJoinDate}
            fechaDesde={metricsFrom}
            fechaHasta={metricsTo}
            coach={metricsCoach}
            abandonosPorInactividad={abandonosPorInactividad}
            adsSuccessCases={adsSuccessCases}
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
            límite del backend o implementamos paginación real con
            “cursor/offset”.
          </p>
        </TabsContent>

        <TabsContent value="ads" className="space-y-6">
          {adsLoading ? (
            <div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
              Cargando metadata ADS...
            </div>
          ) : adsError ? (
            <div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
              Error cargando metadata ADS: {adsError}
            </div>
          ) : adsItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
              Sin registros de metadata para entity=ads_metrics.
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Métricas ADS (metadata)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Basado en registros de metadata con{" "}
                    <strong>entity=ads_metrics</strong>.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <StatCard
                      icon={<Layers className="h-4 w-4" />}
                      title="Registros"
                      value={adsStats.total}
                      dotClass="bg-slate-400"
                      onClick={
                        adsUiRows.length
                          ? () =>
                              openAdsList(
                                `ADS — Todos los registros (${adsUiRows.length})`,
                                asListRows(adsUiRows),
                              )
                          : undefined
                      }
                    />
                    <StatCard
                      icon={<Megaphone className="h-4 w-4" />}
                      title="Pauta activa"
                      value={adsStats.pautaActiva.length}
                      dotClass="bg-emerald-500"
                      onClick={
                        adsStats.pautaActiva.length
                          ? () =>
                              openAdsList(
                                `ADS — Pauta activa (${adsStats.pautaActiva.length})`,
                                asListRows(adsStats.pautaActiva),
                              )
                          : undefined
                      }
                    />
                    <StatCard
                      icon={<AlertTriangle className="h-4 w-4" />}
                      title="Requiere intervención"
                      value={adsStats.requiereInterv.length}
                      dotClass="bg-rose-500"
                      onClick={
                        adsStats.requiereInterv.length
                          ? () =>
                              openAdsList(
                                `ADS — Requiere intervención (${adsStats.requiereInterv.length})`,
                                asListRows(adsStats.requiereInterv),
                              )
                          : undefined
                      }
                    />
                    <StatCard
                      icon={<ListChecks className="h-4 w-4" />}
                      title="Trascendencia"
                      value={adsStats.trascendencia.length}
                      dotClass="bg-indigo-500"
                      onClick={
                        adsStats.trascendencia.length
                          ? () =>
                              openAdsList(
                                `ADS — Trascendencia (${adsStats.trascendencia.length})`,
                                asListRows(adsStats.trascendencia),
                              )
                          : undefined
                      }
                    />
                  </div>

                  <Card className="shadow-none border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Por trascendencia
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Usuarios agrupados por trascendencia.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {adsTrascendencias.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          Sin trascendencias para mostrar.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {adsTrascendencias.map((b) => (
                            <button
                              key={b.key}
                              type="button"
                              onClick={() =>
                                openAdsList(
                                  `ADS — Trascendencia: ${b.key} (${b.rows.length})`,
                                  asListRows(b.rows),
                                )
                              }
                              className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-medium truncate">
                                  {b.key}
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="text-xs tabular-nums text-muted-foreground">
                                    {b.rows.length}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="inline-flex items-center justify-end gap-1">
                                      <Eye className="h-3.5 w-3.5" />
                                      Ver lista
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Card className="shadow-none border border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Por fase</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Quién está en cada fase y subfase.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {adsStats.fases.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            Sin fases para mostrar.
                          </div>
                        ) : (
                          adsStats.fases.map((f) => (
                            <div
                              key={f.fase}
                              className="rounded-xl border border-border bg-background p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {f.fase}
                                  </span>
                                  <Badge variant="secondary">
                                    {f.rows.length} registro
                                    {f.rows.length === 1 ? "" : "s"}
                                  </Badge>
                                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/15">
                                    Pauta: {f.pautaActivaCount}
                                  </Badge>
                                  <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-500/15">
                                    Interv: {f.requiereCount}
                                  </Badge>
                                </div>
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground hover:text-foreground underline"
                                  onClick={() =>
                                    openAdsList(
                                      `ADS — Fase: ${f.fase} (${f.rows.length})`,
                                      asListRows(f.rows),
                                    )
                                  }
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver lista
                                  </span>
                                </button>
                              </div>

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {f.subfases.map((sf) => (
                                  <button
                                    key={`${f.fase}::${sf.subfase}`}
                                    type="button"
                                    onClick={() =>
                                      openAdsList(
                                        `ADS — ${f.fase} · ${sf.subfase} (${sf.rows.length})`,
                                        asListRows(sf.rows),
                                      )
                                    }
                                    className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-sm font-medium truncate">
                                        {sf.subfase}
                                      </div>
                                      <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground shrink-0">
                                        <Eye className="h-3.5 w-3.5" />
                                        {sf.rows.length}
                                      </div>
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                                      <span>
                                        <span className="inline-block h-2 w-2 rounded-full bg-rose-500 mr-1" />
                                        Interv:{" "}
                                        <strong>{sf.requiere.length}</strong>
                                      </span>
                                      <span>
                                        <span className="inline-block h-2 w-2 rounded-full bg-sky-500 mr-1" />
                                        OK: <strong>{sf.ok.length}</strong>
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-none border border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Registros</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {adsUiRows.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-xl border border-border bg-background p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium">
                                  {r.alumnoNombre ?? "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {r.createdAt
                                    ? new Date(r.createdAt).toLocaleString(
                                        "es-ES",
                                      )
                                    : ""}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{r.fase}</Badge>
                                <Badge variant="outline">{r.subfase}</Badge>
                                {r.trascendencia ? (
                                  <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-500/15">
                                    Trascendencia: {r.trascendencia}
                                  </Badge>
                                ) : null}
                                {r.pautaActiva ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/15">
                                    Pauta activa
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 dark:bg-slate-500/15">
                                    Sin pauta
                                  </Badge>
                                )}
                                {r.requiereInterv ? (
                                  <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-500/15">
                                    Requiere intervención
                                  </Badge>
                                ) : (
                                  <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:bg-sky-500/15">
                                    Sin intervención
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <GenericListModal
                open={adsListOpen}
                onOpenChange={setAdsListOpen}
                title={adsListTitle}
                rows={adsListRows}
                hideCode
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
