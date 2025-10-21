"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Opciones</h1>
          <div>
            <Button onClick={openCreate}>Crear opción</Button>
          </div>
        </div>

        <Tabs value={active} onValueChange={(v) => setActive(v)}>
          <TabsList>
            {groupsTabs.map((g) => (
              <TabsTrigger key={g} value={g} className="capitalize">
                {g.replace(/_/g, " ")}
              </TabsTrigger>
            ))}
          </TabsList>

          {groupsTabs.map((g) => (
            <TabsContent key={g} value={g}>
              <div className="rounded-sm border-2 border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-neutral-600">
                    Grupo: <span className="font-mono">{g}</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    Total: <Badge>{items.length}</Badge>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 mb-2">{error}</div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
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
                        <TableRow>
                          <TableCell colSpan={4} className="px-3 py-4">
                            Cargando...
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="px-3 py-4 text-sm text-neutral-500"
                          >
                            No hay opciones en este grupo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((it) => (
                          <TableRow
                            key={`${it.codigo ?? it.opcion_key}`}
                            className="border-t border-gray-100 hover:bg-gray-50"
                          >
                            <TableCell className="px-3 py-2 font-mono">
                              {it.opcion_key}
                            </TableCell>
                            <TableCell className="px-3 py-2 truncate">
                              {it.opcion_value}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              {it.opcion_grupo}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEdit(it)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(it)}
                                >
                                  Eliminar
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
                <Input
                  value={form.opcion_grupo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, opcion_grupo: e.target.value }))
                  }
                />
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
