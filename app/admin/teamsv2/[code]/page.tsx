"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CoachStudentsModal } from "../coach-students-modal";
import {
  getCoachByCode,
  getCoachStudents,
  updateCoach,
  deleteCoach,
  type CoachItem,
  type CoachStudent,
} from "../api";
import { getOptions, type OpcionItem } from "@/app/admin/opciones/api";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import TicketsPanelCoach from "../TicketsPanelCoach";

export default function CoachDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [coach, setCoach] = useState<CoachItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState<string | undefined>(undefined);
  const [area, setArea] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // opciones API for puesto/area (use opcion_key/opcion_value)
  const [puestoOptionsApi, setPuestoOptionsApi] = useState<OpcionItem[]>([]);
  const [areaOptionsApi, setAreaOptionsApi] = useState<OpcionItem[]>([]);
  const [optsLoading, setOptsLoading] = useState(false);

  // edit draft fields separate from coach state
  const [draftNombre, setDraftNombre] = useState("");
  const [draftPuesto, setDraftPuesto] = useState<string | undefined>(undefined);
  const [draftArea, setDraftArea] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!code) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const c = await getCoachByCode(code);
        if (!ctrl.signal.aborted) setCoach(c);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message ?? "Error al cargar coach");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [code]);

  useEffect(() => {
    if (!coach) return;
    setNombre(coach.nombre ?? "");
    setPuesto(coach.puesto ?? undefined);
    setArea(coach.area ?? undefined);
  }, [coach]);

  async function handleSave() {
    if (!coach) return;
    try {
      setSaving(true);
      await updateCoach(coach.codigo, {
        nombre: nombre || undefined,
        puesto: puesto ?? undefined,
        area: area ?? undefined,
      });
      toast({ title: "Coach actualizado" });
      const c = await getCoachByCode(code);
      setCoach(c);
      setEditOpen(false);
    } catch (e: any) {
      toast({ title: e?.message ?? "Error al actualizar coach" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!coach) return;
    // open confirmation dialog
    setDeleteOpen(true);
  }

  // fetch opciones when edit modal opens
  useEffect(() => {
    let mounted = true;
    if (!editOpen)
      return () => {
        mounted = false;
      };
    (async () => {
      try {
        setOptsLoading(true);
        const [puestosRes, areasRes] = await Promise.all([
          getOptions("puesto"),
          getOptions("area"),
        ]);
        if (!mounted) return;
        setPuestoOptionsApi(puestosRes ?? []);
        setAreaOptionsApi(areasRes ?? []);
        // populate draft fields from current coach
        setDraftNombre(coach?.nombre ?? "");
        setDraftPuesto(coach?.puesto ?? undefined);
        setDraftArea(coach?.area ?? undefined);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setOptsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [editOpen, coach]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg bg-neutral-100 grid place-items-center text-2xl font-bold text-neutral-800">
              {(coach?.nombre
                ? String(coach.nombre).slice(0, 1)
                : String(code).slice(0, 1)
              ).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold leading-tight">
                {coach?.nombre ?? code}
              </h2>
              <div className="text-sm text-neutral-500 flex items-center gap-3">
                <span>
                  Código: <span className="font-mono">{code}</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-700">
                  {coach?.created_at
                    ? new Date(coach.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditOpen((s) => !s)}
              aria-label={editOpen ? "Cancelar" : "Editar"}
              className="p-2"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              className="bg-rose-100 text-rose-800 hover:bg-rose-200"
            >
              Eliminar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="p-4 bg-white border rounded-lg">
            {loading ? (
              <div>Cargando...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : coach ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white"
                    style={{ background: "#0ea5e9" }}
                  >
                    {coach.puesto ?? "—"}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-neutral-700 bg-neutral-100">
                    {coach.area ?? "—"}
                  </span>
                  <span className="ml-auto text-sm text-neutral-500">
                    Alumnos:{" "}
                    <strong className="text-neutral-900">
                      {coach.alumnos ?? 0}
                    </strong>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Alumnos asociados
                  </h3>
                  <CoachStudentsInline coachCode={code} />
                </div>
                {/* Tickets panel para coach (sin endpoint aún) */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Tickets (coach)</h3>
                  <TicketsPanelCoach
                    student={{
                      id: 0,
                      code: coach?.codigo ?? String(code),
                      name: coach?.nombre ?? String(code),
                      teamMembers: [],
                    }}
                  />
                </div>
                {/* Tabs removed per UI simplification request */}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">
                No se encontró información del coach.
              </div>
            )}
          </div>

          <aside className="p-4 bg-white border rounded-lg">
            <div className="text-sm text-neutral-500">Resumen</div>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="text-neutral-500">Tickets</div>
                <div className="font-medium text-neutral-900">
                  {coach?.tickets ?? 0}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-neutral-500">Creado</div>
                <div className="font-medium text-neutral-900">
                  {coach?.created_at
                    ? new Date(coach.created_at).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-neutral-500">Código</div>
                <div className="font-mono text-sm text-neutral-700">
                  {coach?.codigo ?? "—"}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <CoachStudentsModal
        open={open}
        onOpenChange={setOpen}
        coachCode={code}
        coachName={coach?.nombre ?? null}
      />
      {/* Edit Coach Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar coach</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input
                value={draftNombre}
                onChange={(e) => setDraftNombre(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Puesto</Label>
              <select
                className="w-full h-9 rounded-md border px-3 text-sm"
                value={draftPuesto ?? ""}
                onChange={(e) => setDraftPuesto(e.target.value)}
                disabled={optsLoading}
              >
                <option value="">-- Ninguno --</option>
                {puestoOptionsApi.map((o) => (
                  <option key={o.opcion_key} value={o.opcion_key}>
                    {o.opcion_value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Área</Label>
              <select
                className="w-full h-9 rounded-md border px-3 text-sm"
                value={draftArea ?? ""}
                onChange={(e) => setDraftArea(e.target.value)}
                disabled={optsLoading}
              >
                <option value="">-- Ninguno --</option>
                {areaOptionsApi.map((o) => (
                  <option key={o.opcion_key} value={o.opcion_key}>
                    {o.opcion_value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    await updateCoach(coach!.codigo, {
                      nombre: draftNombre || undefined,
                      puesto: draftPuesto ?? undefined,
                      area: draftArea ?? undefined,
                    });
                    toast({ title: "Coach actualizado" });
                    const c = await getCoachByCode(code);
                    setCoach(c);
                    setEditOpen(false);
                  } catch (err: any) {
                    toast({
                      title: err?.message ?? "Error al actualizar coach",
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-neutral-700">
              Vas a eliminar el coach <strong>{coach?.nombre ?? code}</strong>.
              Revisa los datos:
            </p>
            <div className="mt-3 text-sm">
              <div>
                Área: <strong>{coach?.area ?? "—"}</strong>
              </div>
              <div>
                Puesto: <strong>{coach?.puesto ?? "—"}</strong>
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteCoach(coach!.codigo);
                    toast({ title: "Coach eliminado" });
                    setDeleteOpen(false);
                    router.push("/admin/teamsv2");
                  } catch (err: any) {
                    toast({ title: err?.message ?? "Error al eliminar coach" });
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function CoachStudentsInline({ coachCode }: { coachCode: string }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CoachStudent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coachCode) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await getCoachStudents(coachCode);
        if (!ctrl.signal.aborted) setItems(rows);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message ?? "Error al cargar alumnos");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [coachCode]);

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <TableHead className="px-3 py-2 text-left">ID Alumno</TableHead>
              <TableHead className="px-3 py-2 text-left">Nombre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-t border-gray-100">
                  <TableCell colSpan={2} className="px-3 py-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow className="border-t border-gray-100">
                <TableCell
                  colSpan={2}
                  className="px-3 py-2 text-sm text-neutral-500"
                >
                  No hay alumnos asociados.
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow
                  key={`${r.id}_${r.id_alumno}`}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <TableCell className="px-3 py-2 font-mono text-gray-700">
                    {r.id_alumno ? (
                      <Link
                        href={`/admin/alumnos/${encodeURIComponent(
                          String(r.id_alumno)
                        )}`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.id_alumno}
                      </Link>
                    ) : (
                      r.id_alumno
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 truncate text-gray-900">
                    {r.id_alumno ? (
                      <Link
                        href={`/admin/alumnos/${encodeURIComponent(
                          String(r.id_alumno)
                        )}`}
                        className="text-gray-900 hover:underline"
                      >
                        {r.alumno_nombre}
                      </Link>
                    ) : (
                      r.alumno_nombre
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {error && <div className="p-3 text-sm text-red-600">{error}</div>}
      <div className="p-3 text-xs text-neutral-500">Total: {items.length}</div>
    </div>
  );
}
