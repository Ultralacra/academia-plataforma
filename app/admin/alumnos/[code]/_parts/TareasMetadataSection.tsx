"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Spinner from "@/components/ui/spinner";
import { toast } from "@/components/ui/use-toast";
import { getAuthToken } from "@/lib/auth";
import { CalendarDays, Edit2, FileText, RefreshCw } from "lucide-react";

type MetadataRecord = {
  id?: string | number | null;
  entity?: string | null;
  entity_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  payload?: any;
};

type TareaItem = {
  id: string;
  fecha?: string | null;
  fase_formulario?: string | null;
  alumno_codigo?: string | null;
  alumno_nombre?: string | null;
  ads_metadata_id?: string | number | null;
  created_at?: string | null;
  campos: Record<string, string>;
};

function normalizeId(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function parseTareas(payload: any): TareaItem[] {
  const raw = payload?.tareas;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  return list.map((t: any, idx: number) => ({
    id: String(t?.id ?? `tarea_${idx}`),
    fecha: t?.fecha ?? null,
    fase_formulario: t?.fase_formulario ?? null,
    alumno_codigo: t?.alumno_codigo ?? null,
    alumno_nombre: t?.alumno_nombre ?? null,
    ads_metadata_id: t?.ads_metadata_id ?? null,
    created_at: t?.created_at ?? null,
    campos:
      t?.campos && typeof t.campos === "object" && !Array.isArray(t.campos)
        ? Object.fromEntries(
            Object.entries(t.campos).map(([k, v]) => [k, String(v ?? "")]),
          )
        : {},
  }));
}

function pickBestAdsMetadataForStudent(
  items: MetadataRecord[],
  alumnoCode: string,
) {
  const alumnoCodeNorm = normalizeId(alumnoCode).toLowerCase();
  const matches = (items || []).filter((m) => {
    const entity = String(m?.entity ?? "").trim();
    const payload = m?.payload ?? {};
    const payloadAlumnoCodigo = normalizeId(
      payload?.alumno_codigo,
    ).toLowerCase();
    const payloadTag = normalizeId(payload?._tag);

    const entityMatches =
      entity === "ads_metrics" || payloadTag === "admin_alumnos_ads_metrics";
    if (!entityMatches) return false;

    return Boolean(
      payloadAlumnoCodigo && payloadAlumnoCodigo === alumnoCodeNorm,
    );
  });

  return (
    [...matches].sort((a, b) => {
      const aId = Number(a?.id);
      const bId = Number(b?.id);
      const aHasNum = Number.isFinite(aId);
      const bHasNum = Number.isFinite(bId);
      if (aHasNum && bHasNum) return bId - aId;
      if (aHasNum) return -1;
      if (bHasNum) return 1;
      const aT =
        Date.parse(String(a?.payload?._saved_at ?? a?.created_at ?? "")) || 0;
      const bT =
        Date.parse(String(b?.payload?._saved_at ?? b?.created_at ?? "")) || 0;
      return bT - aT;
    })[0] ?? null
  );
}

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const s = String(value);
  return s.includes("T") ? s.slice(0, 10) : s;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatFieldLabel(value: string): string {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function TareasMetadataSection({
  alumnoCode,
  canEdit,
}: {
  alumnoCode: string;
  canEdit: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<MetadataRecord | null>(null);
  const [tasks, setTasks] = useState<TareaItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState("");
  const [editFase, setEditFase] = useState("");
  const [editCampos, setEditCampos] = useState<Record<string, string>>({});

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const at = Date.parse(String(a.created_at ?? a.fecha ?? "")) || 0;
      const bt = Date.parse(String(b.created_at ?? b.fecha ?? "")) || 0;
      return bt - at;
    });
  }, [tasks]);

  const loadMetadataAndTasks = async () => {
    if (!alumnoCode) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `/api/alumnos/${encodeURIComponent(alumnoCode)}/metadata?entity=${encodeURIComponent("ads_metrics")}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json().catch(() => null)) as any;
      const items = Array.isArray(json?.items)
        ? (json.items as MetadataRecord[])
        : [];
      const best = pickBestAdsMetadataForStudent(items, alumnoCode);
      setMetadata(best);
      setTasks(best ? parseTareas(best.payload) : []);
    } catch (error) {
      console.error("Error cargando tareas desde metadata ADS:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas del alumno",
        variant: "destructive",
      });
      setMetadata(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadataAndTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoCode]);

  const openEdit = (task: TareaItem) => {
    setEditingTaskId(task.id);
    setEditFecha(toDateInputValue(task.fecha));
    setEditFase(String(task.fase_formulario ?? ""));
    setEditCampos({ ...task.campos });
    setEditOpen(true);
  };

  const handleSaveTask = async () => {
    if (!metadata?.id) {
      toast({
        title: "Sin metadata",
        description: "No existe metadata ADS para este alumno",
        variant: "destructive",
      });
      return;
    }
    if (!editingTaskId) return;

    setSaving(true);
    try {
      const currentPayload = metadata.payload ?? {};
      const currentTasks = parseTareas(currentPayload);

      const updatedTasks = currentTasks.map((task) => {
        if (task.id !== editingTaskId) return task;
        return {
          ...task,
          fecha: editFecha ? `${editFecha}T12:00:00` : task.fecha,
          fase_formulario: editFase || null,
          campos: { ...editCampos },
          updated_at: new Date().toISOString(),
        };
      });

      const payloadUpdated = {
        ...currentPayload,
        tareas: updatedTasks,
      };

      const updateBody = {
        id: metadata.id,
        entity: metadata.entity ?? "ads_metrics",
        entity_id: metadata.entity_id ?? alumnoCode,
        payload: payloadUpdated,
      };

      const token = getAuthToken();
      const res = await fetch(
        `/api/metadata/${encodeURIComponent(String(metadata.id))}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updateBody),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      console.group("[SAVE][Tareas metadata ADS]");
      console.log("metadata_id:", metadata.id);
      console.log("task_editada_id:", editingTaskId);
      console.log("update_body_enviado:", updateBody);
      console.groupEnd();

      toast({
        title: "Tarea actualizada",
        description: "La tarea se guardó correctamente",
      });

      setEditOpen(false);
      await loadMetadataAndTasks();
    } catch (error) {
      console.error("Error guardando tarea en metadata ADS:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la tarea",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Tareas del alumno
              </h3>
              <Badge variant="secondary">{sortedTasks.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Historial de tareas guardadas en metadata ADS
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-7">
              Metadata ADS: {metadata?.id != null ? String(metadata.id) : "—"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={loadMetadataAndTasks}
              disabled={loading}
              className="h-8 gap-2"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Recargar
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Cargando tareas...
        </div>
      ) : !metadata?.id ? (
        <Card className="p-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            No se encontró metadata ADS para este alumno.
          </div>
        </Card>
      ) : sortedTasks.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Este alumno aún no tiene tareas registradas en metadata.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sortedTasks.map((task, idx) => {
            const taskDate = formatDate(task.created_at ?? task.fecha);
            const taskFields = Object.entries(task.campos);

            return (
              <Card
                key={task.id}
                className="border-border/80 bg-card p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">
                        Tarea #{sortedTasks.length - idx}
                      </Badge>
                      <Badge variant="outline">
                        Fase {task.fase_formulario || "—"}
                      </Badge>
                      <Badge variant="muted" className="h-6 gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {taskDate}
                      </Badge>
                    </div>

                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(task)}
                      >
                        <Edit2 className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                    )}
                  </div>

                  {taskFields.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {taskFields.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2"
                        >
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {formatFieldLabel(key)}
                          </p>
                          <p className="mt-1 break-words text-sm text-foreground">
                            {value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                      Sin campos adicionales
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fase</Label>
                <Input
                  value={editFase}
                  onChange={(e) => setEditFase(e.target.value)}
                  placeholder="Ej: 3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Campos de la tarea</Label>
              {Object.keys(editCampos).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay campos para editar.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(editCampos).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{key.replace(/_/g, " ")}</Label>
                      <Input
                        value={value}
                        onChange={(e) =>
                          setEditCampos((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveTask} disabled={saving || !canEdit}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
