"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UsersTable from "./components/UsersTable";
import { fetchUsers, type SysUser } from "./api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CreateUserDialog } from "./components/CreateUserDialog";

const ALL_USERS_PAGE_SIZE = 200;

function normalizeFilterValue(value: string | null | undefined) {
  return (value || "").trim();
}

async function fetchAllUsers(search: string) {
  const firstPage = await fetchUsers({
    page: 1,
    pageSize: ALL_USERS_PAGE_SIZE,
    search,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      fetchUsers({
        page: index + 2,
        pageSize: ALL_USERS_PAGE_SIZE,
        search,
      }),
    ),
  );

  const data = [
    ...(firstPage.data || []),
    ...remainingPages.flatMap((pageData) => pageData.data || []),
  ];

  return {
    ...firstPage,
    data,
    total: data.length,
    page: 1,
    pageSize: data.length || ALL_USERS_PAGE_SIZE,
    totalPages: 1,
  };
}

function UsersContent() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SysUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [roleFilter, setRoleFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [puestoFilter, setPuestoFilter] = useState("all");

  // Debounce búsqueda (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch remoto completo para filtrar en cliente
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAllUsers(debouncedQ)
      .then((res) => {
        if (!alive) return;
        setRows(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.total || 0) / pageSize)));
      })
      .catch((e) => console.error("users fetch", e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [pageSize, debouncedQ, refreshKey]);

  // Resetear a página 1 al cambiar búsqueda
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, roleFilter, tipoFilter, areaFilter, puestoFilter]);

  const roleOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows.map((row) => normalizeFilterValue(row.role)).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const tipoOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows.map((row) => normalizeFilterValue(row.tipo)).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const areaOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows.map((row) => normalizeFilterValue(row.area)).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const puestoOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows.map((row) => normalizeFilterValue(row.puesto)).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesRole =
        roleFilter === "all" || normalizeFilterValue(row.role) === roleFilter;
      const matchesTipo =
        tipoFilter === "all" || normalizeFilterValue(row.tipo) === tipoFilter;
      const matchesArea =
        areaFilter === "all" || normalizeFilterValue(row.area) === areaFilter;
      const matchesPuesto =
        puestoFilter === "all" ||
        normalizeFilterValue(row.puesto) === puestoFilter;

      return matchesRole && matchesTipo && matchesArea && matchesPuesto;
    });
  }, [rows, roleFilter, tipoFilter, areaFilter, puestoFilter]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const filteredTotalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / pageSize),
  );

  useEffect(() => {
    setTotalPages(filteredTotalPages);
    if (page > filteredTotalPages) {
      setPage(filteredTotalPages);
    }
  }, [filteredTotalPages, page]);

  const hasActiveFilters =
    roleFilter !== "all" ||
    tipoFilter !== "all" ||
    areaFilter !== "all" ||
    puestoFilter !== "all";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Usuarios del sistema</h1>
        <p className="text-sm text-muted-foreground">
          Búsqueda y filtros sobre todos los usuarios
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nombre, email o código…"
          className="max-w-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <CreateUserDialog
          onCreated={() => {
            setPage(1);
            setRefreshKey((k) => k + 1);
          }}
        />

        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Todos los roles</option>
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
        >
          <option value="all">Todos los tipos</option>
          {tipoOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
        >
          <option value="all">Todas las áreas</option>
          {areaOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={puestoFilter}
          onChange={(e) => setPuestoFilter(e.target.value)}
        >
          <option value="all">Todos los puestos</option>
          {puestoOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRoleFilter("all");
              setTipoFilter("all");
              setAreaFilter("all");
              setPuestoFilter("all");
            }}
          >
            Limpiar filtros
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages || loading}
          >
            Siguiente
          </Button>
          <select
            className="border rounded-md h-9 px-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value) || 25)}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / pág
              </option>
            ))}
          </select>
        </div>
      </div>

      <UsersTable rows={paginatedRows} loading={loading} />

      <div className="text-xs text-muted-foreground">
        Resultados: {filteredRows.length} de {total} usuarios
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "coach"]}>
      <DashboardLayout>
        <UsersContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
