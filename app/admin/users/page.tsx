"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UsersTable from "./components/UsersTable";
import { fetchUsers, type SysUser } from "./api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CreateUserDialog } from "./components/CreateUserDialog";

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

  // Debounce búsqueda (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch remoto con paginado
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchUsers({ page, pageSize, search: debouncedQ })
      .then((res) => {
        if (!alive) return;
        setRows(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch((e) => console.error("users fetch", e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, pageSize, debouncedQ, refreshKey]);

  // Resetear a página 1 al cambiar búsqueda
  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Usuarios del sistema</h1>
        <p className="text-sm text-muted-foreground">
          Búsqueda en tiempo real y paginado por servidor
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

      <UsersTable rows={rows} loading={loading} />

      <div className="text-xs text-muted-foreground">
        Resultados: {rows.length} de {total} (servidor)
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
