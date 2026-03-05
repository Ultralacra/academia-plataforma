"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  assignPermissionToRole,
  createRole,
  fetchPermissionsList,
  fetchRolePermissions,
  fetchRoles,
  unassignPermissionFromRole,
  updateRole,
  type Permission,
  type Role,
} from "./api";

function RolesContent() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<
    Permission[]
  >([]);
  const [loadingPermissionsCatalog, setLoadingPermissionsCatalog] =
    useState(false);
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<
    Record<string, boolean>
  >({});
  const [permissionSearch, setPermissionSearch] = useState("");

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
        }),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, pageSize, debouncedQ]);

  useEffect(() => setPage(1), [debouncedQ]);

  useEffect(() => {
    setLoadingPermissionsCatalog(true);
    fetchPermissionsList()
      .then((list) => setAllPermissions(list))
      .catch(() =>
        toast({
          title: "Error",
          description: "No se pudo cargar el catálogo de permisos",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingPermissionsCatalog(false));
  }, []);

  useEffect(() => {
    if (!rows.length) {
      setSelectedRoleId(null);
      return;
    }

    const currentExists = rows.some((role) => role.id === selectedRoleId);
    if (selectedRoleId === null || !currentExists) {
      setSelectedRoleId(rows[0].id);
    }
  }, [rows, selectedRoleId]);

  const selectedRole = useMemo(
    () => rows.find((role) => role.id === selectedRoleId) ?? null,
    [rows, selectedRoleId],
  );

  const selectedPermissionsSet = useMemo(
    () => new Set(selectedRolePermissions.map((permission) => permission.name)),
    [selectedRolePermissions],
  );

  const filteredPermissions = useMemo(() => {
    const term = permissionSearch.trim().toLowerCase();
    if (!term) return allPermissions;

    return allPermissions.filter((permission) => {
      const nameMatch = permission.name.toLowerCase().includes(term);
      const descriptionMatch = (permission.description || "")
        .toLowerCase()
        .includes(term);
      return nameMatch || descriptionMatch;
    });
  }, [allPermissions, permissionSearch]);

  function openPermissionsModal(role: Role) {
    setSelectedRoleId(role.id);
    setLoadingRolePermissions(true);
    setPendingPermission({});
    setPermissionSearch("");
    setSelectedRolePermissions([]);
    setPermissionsModalOpen(true);

    fetchRolePermissions(role.id)
      .then((list) => setSelectedRolePermissions(list))
      .catch(() =>
        toast({
          title: "Error",
          description: "No se pudieron cargar los permisos del rol",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingRolePermissions(false));
  }

  async function handlePermissionToggle(
    permissionName: string,
    nextChecked: boolean,
  ) {
    if (selectedRoleId === null) return;

    const isAssigned = selectedPermissionsSet.has(permissionName);
    if (nextChecked === isAssigned) return;

    setPendingPermission((prev) => ({ ...prev, [permissionName]: true }));
    try {
      if (nextChecked) {
        await assignPermissionToRole(selectedRoleId, permissionName);
        setSelectedRolePermissions((prev) => {
          if (prev.some((permission) => permission.name === permissionName))
            return prev;
          return [...prev, { name: permissionName }];
        });
        toast({
          title: "Permiso agregado",
          description: `${permissionName} fue asignado al rol`,
        });
      } else {
        await unassignPermissionFromRole(selectedRoleId, permissionName);
        setSelectedRolePermissions((prev) =>
          prev.filter((permission) => permission.name !== permissionName),
        );
        toast({
          title: "Permiso removido",
          description: `${permissionName} fue desasignado del rol`,
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar el permiso",
        variant: "destructive",
      });
    } finally {
      setPendingPermission((prev) => ({ ...prev, [permissionName]: false }));
    }
  }

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

      <section className="rounded-lg border p-4 space-y-3">
        <div>
          <h2 className="font-medium">Todos los permisos</h2>
          <p className="text-sm text-muted-foreground">
            Endpoint: /v1/access/roles/permissions/list
          </p>
        </div>

        {loadingPermissionsCatalog && (
          <p className="text-sm text-muted-foreground">Cargando permisos...</p>
        )}

        {!loadingPermissionsCatalog && allPermissions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay permisos disponibles.
          </p>
        )}

        {!loadingPermissionsCatalog && allPermissions.length > 0 && (
          <div className="max-h-[220px] overflow-auto rounded-md border p-3">
            <div className="flex flex-wrap gap-2">
              {allPermissions.map((permission) => (
                <Badge
                  key={`all:${permission.name}`}
                  variant="outline"
                  title={permission.description || undefined}
                >
                  {permission.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

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
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPermissionsModal(r)}
                      >
                        Ver permisos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(r)}
                      >
                        Editar
                      </Button>
                    </div>
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

      <Dialog
        open={permissionsModalOpen}
        onOpenChange={setPermissionsModalOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Permisos del rol</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Rol:{" "}
              {selectedRole
                ? `${selectedRole.name} (id: ${selectedRole.id})`
                : "-"}
            </p>
            <p>Endpoint rol: /v1/access/roles/{"{rolecodigo}"}/permissions</p>
          </div>

          <Input
            placeholder="Buscar permiso..."
            value={permissionSearch}
            onChange={(e) => setPermissionSearch(e.target.value)}
          />

          {loadingRolePermissions && (
            <p className="text-sm text-muted-foreground">
              Cargando permisos...
            </p>
          )}

          {!loadingRolePermissions &&
            !loadingPermissionsCatalog &&
            allPermissions.length > 0 && (
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <div className="divide-y">
                  {filteredPermissions.map((permission) => {
                    const isAssigned = selectedPermissionsSet.has(
                      permission.name,
                    );
                    const isPending = !!pendingPermission[permission.name];
                    return (
                      <div
                        key={`switch:${permission.name}`}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {permission.name}
                          </p>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssigned && (
                            <Badge variant="secondary">Asignado</Badge>
                          )}
                          <Switch
                            checked={isAssigned}
                            disabled={isPending}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(permission.name, checked)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {!loadingRolePermissions &&
            !loadingPermissionsCatalog &&
            allPermissions.length > 0 &&
            filteredPermissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay permisos que coincidan con la búsqueda.
              </p>
            )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermissionsModalOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
