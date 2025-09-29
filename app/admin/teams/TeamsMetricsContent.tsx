"use client";

import { useEffect, useMemo, useState } from "react";
import { dataService, type Team } from "@/lib/data-service";
import Filters from "./Filters";
import KPIs from "./KPIs";
import Charts from "./Charts";
import TeamsTable from "./TeamsTable";
import StudentsModal from "./StudentsModal";

export default function TeamsMetricsContent() {
  // Datos
  const [data, setData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros controlados (auto-apply)
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Paginación (client-side sobre el resultado actual)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal alumnos
  const [openModal, setOpenModal] = useState(false);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  // Carga remota (filtro server por fechas / search si tu endpoint lo soporta)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await dataService.getTeams({
          page: 1, // traemos primera página del backend (usamos paginación local para navegar rápido)
          pageSize: 500, // ancho para listar/filtrar en cliente (ajusta si es necesario)
          search,
          fechaDesde: desde,
          fechaHasta: hasta,
        });
        if (!mounted) return;
        setData(res.data);
        setPage(1); // reset de página al cambiar filtros
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [search, desde, hasta]);

  // Filtro local adicional
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((t) =>
      [t.nombre, t.codigo, t.area ?? "", t.puesto ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  // KPIs
  const totalEquipos = filtered.length;
  const totalAlumnos = filtered.reduce(
    (acc, t) => acc + (t.nAlumnos ?? t.alumnos.length),
    0
  );

  const areasCount = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => {
      const a = (t.area ?? "SIN ÁREA").toUpperCase();
      map[a] = (map[a] ?? 0) + 1;
    });
    return Object.entries(map).map(([area, count]) => ({ area, count }));
  }, [filtered]);

  const alumnosPorEquipo = useMemo(
    () =>
      filtered
        .map((t) => ({
          name: t.nombre,
          alumnos: t.nAlumnos ?? t.alumnos.length,
        }))
        .sort((a, b) => b.alumnos - a.alumnos)
        .slice(0, 12),
    [filtered]
  );

  // Paginación client-side
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Modal alumnos
  const openAlumnos = (team: Team) => {
    setActiveTeam(team);
    setOpenModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Métricas de equipos
          </h1>
          <p className="text-sm text-muted-foreground">
            Filtros en vivo, gráficas y listado con acceso a alumnos por equipo.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Filters
        search={search}
        onSearch={setSearch}
        desde={desde}
        hasta={hasta}
        onDesde={setDesde}
        onHasta={setHasta}
      />

      {/* KPIs */}
      <KPIs
        totalEquipos={totalEquipos}
        totalAlumnos={totalAlumnos}
        areas={areasCount.length}
      />

      {/* Charts */}
      <Charts alumnosPorEquipo={alumnosPorEquipo} areasCount={areasCount} />

      {/* Tabla + paginación */}
      <TeamsTable
        data={pageData}
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        onOpenAlumnos={openAlumnos}
        loading={loading}
        totalPages={totalPages}
      />

      {/* Modal de alumnos */}
      <StudentsModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        team={activeTeam}
      />
    </div>
  );
}
