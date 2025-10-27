"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Filter } from "lucide-react";
import {
  getOptions,
  createOption,
  updateOption,
  deleteOption,
  type OpcionItem,
} from "./api";

const GROUPS = [
  "estado_cliente",
  "etapa",
  "nicho",
  "estado_tickets",
  "tipo_ticket",
  "puesto",
  "area",
];

export default function OpcionesPage() {
  const [active, setActive] = useState<string>(GROUPS[0]);
  const [items, setItems] = useState<OpcionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<OpcionItem | null>(null);
  const [form, setForm] = useState({
    opcion_key: "",
    opcion_value: "",
    opcion_grupo: GROUPS[0],
  });
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<{
    code?: string;
    label: string;
    item?: OpcionItem | null;
  } | null>(null);

  useEffect(() => {
    setForm((f) => ({ ...f, opcion_grupo: active }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const rows = await getOptions(active);
      setItems(rows);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar opciones");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ opcion_key: "", opcion_value: "", opcion_grupo: active });
    setOpenModal(true);
  }

  function openEdit(it: OpcionItem) {
    setEditing(it);
    setForm({
      opcion_key: it.opcion_key,
      opcion_value: it.opcion_value,
      opcion_grupo: it.opcion_grupo,
    });
    setOpenModal(true);
  }

  async function submit() {
    try {
      setLoading(true);
      setError(null);
      if (!form.opcion_key.trim() || !form.opcion_value.trim()) {
        toast({
          title: "Campos requeridos",
          description: "Key y Value no pueden estar vacíos.",
          variant: "destructive",
        });
        return;
      }
      if (editing) {
        // asegurar que tenemos el codigo (uuid) antes de llamar a update
        let codigoToUpdate = editing.codigo;
        if (!codigoToUpdate) {
          // intentar resolver por grupo + key + value
          const candidates = await getOptions(editing.opcion_grupo);
          const found = candidates.find(
            (c) =>
              c.opcion_key === editing.opcion_key &&
              c.opcion_value === editing.opcion_value
          );
          codigoToUpdate = found?.codigo ?? undefined;
        }
        if (!codigoToUpdate) {
          throw new Error(
            "No se pudo resolver el identificador (codigo) para actualizar. Usa crear si estás intentado añadir uno nuevo."
          );
        }
        await updateOption(String(codigoToUpdate), form);
        toast({
          title: "Opción actualizada",
          description: `${form.opcion_key} actualizado.`,
          variant: "default",
        });
      } else {
        await createOption(form);
        toast({
          title: "Opción creada",
          description: `${form.opcion_key} creada.`,
          variant: "default",
        });
      }
      setOpenModal(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar");
      toast({
        title: "Error",
        description: String(e?.message ?? "Error al guardar"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: OpcionItem) {
    // open confirm modal with the full item so we can resolve codigo if needed
    setConfirmDelete({
      code: item.codigo ?? undefined,
      label: item.opcion_key,
      item,
    });
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    try {
      setLoading(true);
      // Determine codigo to delete. If we already have a code, use it. Otherwise try to resolve it by searching the group's options.
      let codigoToDelete = confirmDelete.code;
      if (!codigoToDelete && confirmDelete.item) {
        // try to find matching option in the same group
        try {
          const candidates = await getOptions(confirmDelete.item.opcion_grupo);
          const found = candidates.find(
            (c) =>
              c.opcion_key === confirmDelete.item!.opcion_key &&
              c.opcion_value === confirmDelete.item!.opcion_value
          );
          codigoToDelete = found?.codigo ?? undefined;
        } catch (e) {
          // ignore
        }
      }
      if (!codigoToDelete) {
        console.log("[opciones] codigoToDelete RESOLVED: ", codigoToDelete);
        throw new Error(
          "No se pudo resolver el identificador de la opción para eliminar."
        );
      }
      console.log("[opciones] Eliminando opción con codigo:", codigoToDelete);
      const resp = await deleteOption(codigoToDelete);
      console.log("[opciones] respuesta deleteOption:", resp);
      toast({
        title: "Eliminado",
        description: "La opción fue eliminada.",
        variant: "default",
      });
      setConfirmDelete(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error al eliminar");
      toast({
        title: "Error",
        description: String(e?.message ?? "Error al eliminar"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const groupsTabs = useMemo(() => GROUPS, []);

  const groupBadgeClass = (g: string) => {
    const map: Record<string, string> = {
      estado_cliente: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      etapa: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
      nicho: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
      estado_tickets: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      tipo_ticket: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      puesto: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
      area: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    };
    return map[g] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200";
  };

  const visible = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(
      (it) =>
        it.opcion_key.toLowerCase().includes(k) ||
        it.opcion_value.toLowerCase().includes(k)
    );
  }, [items, q]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Opciones</h1>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 w-64"
                placeholder="Buscar por key o value..."
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Crear opción
            </Button>
          </div>
        </div>

        <Tabs value={active} onValueChange={(v) => setActive(v)}>
          <TabsList>
            {groupsTabs.map((g) => (
              <TabsTrigger
                key={g}
                value={g}
                className="capitalize data-[state=active]:bg-primary/10"
              >
                {g.replace(/_/g, " ")}
              </TabsTrigger>
            ))}
          </TabsList>

          {groupsTabs.map((g) => (
            <TabsContent key={g} value={g}>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${groupBadgeClass(
                        g
                      )}`}
                    >
                      {g.replace(/_/g, " ")}
                    </span>
                    <span className="hidden sm:inline text-neutral-500">
                      Gestión de catálogos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative sm:hidden">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="pl-9 w-[70vw]"
                        placeholder="Buscar..."
                      />
                    </div>
                    <div className="text-sm text-neutral-500">
                      Total: <Badge>{visible.length}</Badge>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 mb-2">{error}</div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-gray-50/80 backdrop-blur text-gray-600 text-xs uppercase tracking-wide">
                        <TableHead className="px-3 py-2 text-left">
                          Key
                        </TableHead>
                        <TableHead className="px-3 py-2 text-left">
                          Value
                        </TableHead>
                        <TableHead className="px-3 py-2 text-left">
                          Grupo
                        </TableHead>
                        <TableHead className="px-3 py-2 text-left">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow
                            key={`skeleton-${i}`}
                            className="animate-pulse"
                          >
                            <TableCell className="px-3 py-3">
                              <div className="h-4 w-24 rounded bg-muted" />
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <div className="h-4 w-40 rounded bg-muted" />
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <div className="h-4 w-20 rounded bg-muted" />
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <div className="h-8 w-28 rounded bg-muted" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : visible.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="px-3 py-4 text-sm text-neutral-500"
                          >
                            No hay opciones en este grupo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        visible.map((it) => (
                          <TableRow
                            key={`${it.codigo ?? it.opcion_key}`}
                            className="border-t border-gray-100 hover:bg-blue-50/40"
                          >
                            <TableCell className="px-3 py-2 font-mono">
                              <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs">
                                {it.opcion_key}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 truncate">
                              {it.opcion_value}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${groupBadgeClass(
                                  it.opcion_grupo
                                )}`}
                              >
                                {it.opcion_grupo.replace(/_/g, " ")}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEdit(it)}
                                >
                                  <Pencil className="mr-1.5 h-4 w-4" /> Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleDelete(it)}
                                >
                                  <Trash2 className="mr-1.5 h-4 w-4" /> Eliminar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Modal Crear/Editar */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="max-w-lg w-[95vw]">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar opción" : "Crear opción"}
              </DialogTitle>
              <DialogDescription>
                Crear o editar una opción que será usada en la plataforma.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-3">
              <div>
                <label className="text-sm text-neutral-600">Key</label>
                <Input
                  value={form.opcion_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, opcion_key: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Value</label>
                <Input
                  value={form.opcion_value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, opcion_value: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-neutral-600">Grupo</label>
                <Select
                  value={form.opcion_grupo}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, opcion_grupo: v }))
                  }
                >
                  <SelectTrigger className="capitalize">
                    <SelectValue placeholder="Selecciona un grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUPS.map((g) => (
                      <SelectItem key={g} value={g} className="capitalize">
                        {g.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpenModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit}>
                  {editing ? "Guardar" : "Crear"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Confirm delete modal */}
        <Dialog
          open={!!confirmDelete}
          onOpenChange={(v) => {
            if (!v) setConfirmDelete(null);
          }}
        >
          <DialogContent className="max-w-md w-[95vw]">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de eliminar esta opción? Esta acción no se puede
                deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDeleteAction}>
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
