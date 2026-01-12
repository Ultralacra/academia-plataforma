"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import * as alumnosApi from "@/app/admin/alumnos/api";

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return undefined;
  return n;
}

function parseOptionalInt(value: string): number | undefined {
  const n = parseOptionalNumber(value);
  if (n === undefined) return undefined;
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export default function AdminBonosPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<alumnosApi.Bono[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [createCodigo, setCreateCodigo] = useState("");
  const [createNombre, setCreateNombre] = useState("");
  const [createDescripcion, setCreateDescripcion] = useState("");
  const [createValor, setCreateValor] = useState("");
  const [createTipo, setCreateTipo] = useState("");
  const [createMaxUsos, setCreateMaxUsos] = useState("");

  const [editCodigo, setEditCodigo] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editInactivado, setEditInactivado] = useState(false);
  const [editTipo, setEditTipo] = useState("");
  const [editMaxUsos, setEditMaxUsos] = useState("");

  const [deleteCodigo, setDeleteCodigo] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const list = await alumnosApi.getAllBonos({ includeInactivos: true });
      const normalized = Array.isArray(list) ? list : [];
      normalized.sort((a, b) =>
        String(a.codigo).localeCompare(String(b.codigo))
      );
      setRows(normalized);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudieron cargar los bonos",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteNombre = useMemo(() => {
    if (!deleteCodigo) return "";
    const found = rows.find((r) => String(r.codigo) === String(deleteCodigo));
    return String(found?.nombre ?? "");
  }, [deleteCodigo, rows]);

  function openEdit(b: alumnosApi.Bono) {
    setEditCodigo(String(b.codigo));
    setEditNombre(String(b.nombre ?? ""));
    setEditDescripcion(String(b.descripcion ?? ""));
    setEditValor(
      b.valor === null || b.valor === undefined ? "" : String(b.valor)
    );
    setEditInactivado(Boolean(b.inactivado));
    setEditTipo(String(b.metadata?.tipo ?? ""));
    setEditMaxUsos(
      b.metadata?.max_usos === null || b.metadata?.max_usos === undefined
        ? ""
        : String(b.metadata.max_usos)
    );
    setEditOpen(true);
  }

  async function onCreate() {
    const codigo = createCodigo.trim();
    const nombre = createNombre.trim();
    if (!codigo || !nombre) {
      toast({
        title: "Completa el formulario",
        description: "Código y nombre son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const tipo = createTipo.trim();
      const maxUsos = parseOptionalInt(createMaxUsos);
      const metadata =
        tipo || maxUsos !== undefined
          ? {
              tipo: tipo || undefined,
              max_usos: maxUsos,
            }
          : undefined;
      await alumnosApi.createBono({
        codigo,
        nombre,
        descripcion: createDescripcion.trim() || undefined,
        valor: parseOptionalNumber(createValor),
        metadata,
      });

      toast({ title: "Bono creado", description: "Se creó correctamente." });
      setCreateOpen(false);
      setCreateCodigo("");
      setCreateNombre("");
      setCreateDescripcion("");
      setCreateValor("");
      setCreateTipo("");
      setCreateMaxUsos("");
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudo crear el bono",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function onSave() {
    if (!editCodigo) return;

    const nombre = editNombre.trim();
    if (!nombre) {
      toast({
        title: "Completa el formulario",
        description: "El nombre es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const tipo = editTipo.trim();
      const maxUsos = parseOptionalInt(editMaxUsos);
      const metadata =
        tipo || maxUsos !== undefined
          ? {
              tipo: tipo || undefined,
              max_usos: maxUsos,
            }
          : undefined;
      await alumnosApi.updateBono(editCodigo, {
        nombre,
        descripcion: editDescripcion.trim() || "",
        valor: parseOptionalNumber(editValor) ?? 0,
        metadata,
        inactivado: editInactivado ? 1 : 0,
      });

      toast({
        title: "Bono actualizado",
        description: "Se guardó correctamente.",
      });
      setEditOpen(false);
      setEditCodigo(null);
      setEditTipo("");
      setEditMaxUsos("");
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudo guardar",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!deleteCodigo) return;

    setDeleting(true);
    try {
      await alumnosApi.deleteBono(deleteCodigo);
      toast({
        title: "Bono eliminado",
        description: "Se eliminó correctamente.",
      });
      setDeleteOpen(false);
      setDeleteCodigo(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudo eliminar",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "equipo"]}>
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">Bonos</div>
              <p className="text-xs text-muted-foreground">
                Lista de bonos creados y administración básica (CRUD).
              </p>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Nuevo bono
            </Button>
          </div>

          {loading ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Cargando bonos...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              No hay bonos.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => {
                    const inactivo = Boolean(b.inactivado);
                    return (
                      <TableRow key={String(b.codigo)}>
                        <TableCell className="font-mono text-xs">
                          {String(b.codigo)}
                        </TableCell>
                        <TableCell>{String(b.nombre ?? "")}</TableCell>
                        <TableCell>
                          {b.valor === null || b.valor === undefined
                            ? "—"
                            : String(b.valor)}
                        </TableCell>
                        <TableCell>
                          {inactivo ? "Inactivo" : "Activo"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(b)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setDeleteCodigo(String(b.codigo));
                              setDeleteOpen(true);
                            }}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Crear */}
          <Dialog
            open={createOpen}
            onOpenChange={(v) => (!creating ? setCreateOpen(v) : null)}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo bono</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={createCodigo}
                    onChange={(e) => setCreateCodigo(e.target.value)}
                    placeholder="BONO_..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={createNombre}
                    onChange={(e) => setCreateNombre(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={createDescripcion}
                    onChange={(e) => setCreateDescripcion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={createValor}
                    onChange={(e) => setCreateValor(e.target.value)}
                    placeholder="(opcional)"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo (metadata.tipo)</Label>
                    <Input
                      value={createTipo}
                      onChange={(e) => setCreateTipo(e.target.value)}
                      placeholder='porcentaje'
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max usos (metadata.max_usos)</Label>
                    <Input
                      value={createMaxUsos}
                      onChange={(e) => setCreateMaxUsos(e.target.value)}
                      placeholder="(opcional)"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={creating}
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" disabled={creating} onClick={onCreate}>
                  {creating ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Editar */}
          <Dialog
            open={editOpen}
            onOpenChange={(v) => (!saving ? setEditOpen(v) : null)}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar bono</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={editCodigo ?? ""} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={editValor}
                    onChange={(e) => setEditValor(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo (metadata.tipo)</Label>
                    <Input
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value)}
                      placeholder='porcentaje'
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max usos (metadata.max_usos)</Label>
                    <Input
                      value={editMaxUsos}
                      onChange={(e) => setEditMaxUsos(e.target.value)}
                      placeholder="(opcional)"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
                  <Checkbox
                    checked={editInactivado}
                    onCheckedChange={(v) => setEditInactivado(Boolean(v))}
                  />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      Inactivo
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Si está inactivo no debería mostrarse para asignación.
                    </div>
                  </div>
                </label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setEditOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" disabled={saving} onClick={onSave}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Eliminar */}
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(v) => {
              if (deleting) return;
              setDeleteOpen(v);
              if (!v) setDeleteCodigo(null);
            }}
          >
            <AlertDialogContent className="sm:max-w-sm p-4">
              <AlertDialogHeader className="text-center">
                <AlertDialogTitle className="text-base">
                  Eliminar bono
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  ¿Seguro que quieres eliminar este bono
                  {deleteNombre ? `: ${deleteNombre}` : ""}?\nEsta acción no se
                  puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting || !deleteCodigo}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    await onDelete();
                  }}
                >
                  {deleting ? "Eliminando..." : "Confirmar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
