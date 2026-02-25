"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  Gift,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Info,
  Package,
} from "lucide-react";
import * as alumnosApi from "@/app/admin/alumnos/api";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  const readOnly =
    user?.role === "equipo" && (user?.area || "").toUpperCase() === "ADS";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<alumnosApi.Bono[]>([]);
  const [search, setSearch] = useState("");

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
        String(a.codigo).localeCompare(String(b.codigo)),
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

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (b) =>
        String(b.codigo).toLowerCase().includes(q) ||
        String(b.nombre ?? "")
          .toLowerCase()
          .includes(q) ||
        String(b.descripcion ?? "")
          .toLowerCase()
          .includes(q) ||
        String(b.metadata?.tipo ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const activos = rows.filter((b) => !Boolean(b.inactivado)).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [rows]);

  function openEdit(b: alumnosApi.Bono) {
    setEditCodigo(String(b.codigo));
    setEditNombre(String(b.nombre ?? ""));
    setEditDescripcion(String(b.descripcion ?? ""));
    setEditValor(
      b.valor === null || b.valor === undefined ? "" : String(b.valor),
    );
    setEditInactivado(Boolean(b.inactivado));
    setEditTipo(String(b.metadata?.tipo ?? ""));
    setEditMaxUsos(
      b.metadata?.max_usos === null || b.metadata?.max_usos === undefined
        ? ""
        : String(b.metadata.max_usos),
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
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">
                  Bonos
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gestión de bonos disponibles para alumnos
                </p>
              </div>
            </div>
            {!readOnly && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo bono
              </Button>
            )}
          </div>

          {/* Stats cards */}
          {!loading && rows.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Total
                    </p>
                    <p className="text-lg font-bold leading-tight">
                      {stats.total}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Activos
                    </p>
                    <p className="text-lg font-bold text-emerald-600 leading-tight">
                      {stats.activos}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                    <XCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Inactivos
                    </p>
                    <p className="text-lg font-bold text-red-500 leading-tight">
                      {stats.inactivos}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por código, nombre o tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Table */}
          {loading ? (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
                  <p className="text-sm text-muted-foreground">
                    Cargando bonos...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : filteredRows.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <Gift className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {rows.length === 0
                    ? "No hay bonos creados aún."
                    : "Sin resultados para esta búsqueda."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 overflow-hidden">
              <TooltipProvider delayDuration={200}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Código
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Nombre
                      </TableHead>
                      {!readOnly && (
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                          Tipo
                        </TableHead>
                      )}
                      {!readOnly && (
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                          Valor
                        </TableHead>
                      )}
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Estado
                      </TableHead>
                      {!readOnly && (
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">
                          Acciones
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((b) => {
                      const inactivo = Boolean(b.inactivado);
                      const tipo = b.metadata?.tipo || "—";
                      const desc = b.descripcion || "";
                      return (
                        <TableRow key={String(b.codigo)} className="group">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {String(b.codigo)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {String(b.nombre ?? "")}
                              </span>
                              {desc && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-[240px] text-xs"
                                  >
                                    {desc}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          {!readOnly && (
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium"
                              >
                                {tipo}
                              </Badge>
                            </TableCell>
                          )}
                          {!readOnly && (
                            <TableCell className="text-sm tabular-nums">
                              {b.valor === null || b.valor === undefined ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className="font-medium">
                                  {String(b.valor)}
                                </span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {inactivo ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-[10px] bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/10"
                              >
                                <XCircle className="h-3 w-3" />
                                Inactivo
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Activo
                              </Badge>
                            )}
                          </TableCell>
                          {!readOnly && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-lg"
                                      onClick={() => openEdit(b)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        setDeleteCodigo(String(b.codigo));
                                        setDeleteOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </Card>
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
                      placeholder="porcentaje"
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
                      placeholder="porcentaje"
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
