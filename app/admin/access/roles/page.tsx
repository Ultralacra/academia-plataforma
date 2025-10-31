"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { createRole, fetchRoles, updateRole, type Role } from "./api";

function RolesContent() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchRoles({ page, pageSize, search: debouncedQ })
      .then((res) => {
        if (!alive) return;
        setRows(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch((e) =>
        toast({
          title: "Error",
          description: "No se pudieron cargar roles",
          variant: "destructive",
        })
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, pageSize, debouncedQ]);

  useEffect(() => setPage(1), [debouncedQ]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setOpen(true);
  }
  function openEdit(r: Role) {
    setEditing(r);
    setName(r.name || "");
    setDescription(r.description || "");
    setOpen(true);
  }
  async function handleSave() {
    try {
      if (editing) {
        const res = await updateRole(editing.id, { name, description });
        toast({
          title: "Rol actualizado",
          description: `Se actualizó ${res.data?.name}`,
        });
      } else {
        const res = await createRole({ name, description });
        toast({
          title: "Rol creado",
          description: `Se creó ${res.data?.name}`,
        });
      }
      setOpen(false);
      // Refetch
      fetchRoles({ page, pageSize, search: debouncedQ }).then((res) => {
        setRows(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo guardar",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Roles y permisos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los roles del sistema
          </p>
        </div>
        <Button onClick={openCreate}>Nuevo rol</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-sm"
          placeholder="Buscar rol…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
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

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-sm text-muted-foreground"
                >
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="odd:bg-muted/10 hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell
                    className="max-w-[400px] truncate"
                    title={r.description || undefined}
                  >
                    {r.description || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.updated_at
                      ? new Date(r.updated_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(r)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-sm text-muted-foreground"
                >
                  Sin roles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar rol" : "Nuevo rol"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="admin / equipo / alumno"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del rol"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RolesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <RolesContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
