"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createMetadata, listMetadata, updateMetadata } from "@/lib/metadata";
import { Loader2, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FollowupItem = {
  id?: string | number;
  entityId: string;
  codigo: string;
  diasInactividad: string;
  fase: string;
  condicion: string;
  mensaje: string;
  orden: number;
  activo: boolean;
  fromMetadata: boolean;
};

type MetadataFollowupPayload = {
  codigo?: string;
  diasInactividad?: string;
  fase?: string;
  condicion?: string;
  mensaje?: string;
  orden?: number | string;
  activo?: boolean | string | number;
};

type FollowupFormState = {
  diasInactividad: string;
  fase: string;
  condicion: string;
  mensaje: string;
  orden: string;
  activo: boolean;
};

const FOLLOWUP_ENTITY = "mensajes_seguimiento";

const DEFAULT_FORM: FollowupFormState = {
  diasInactividad: "> 8 días",
  fase: "",
  condicion: "",
  mensaje: "",
  orden: "1",
  activo: true,
};

const TRAFFICKER_BONUS_DETECTION = ["BONO2026-09", "TRAFICKER", "TRAFFICKER"];

const FOLLOWUP_ITEMS: FollowupItem[] = [
  {
    entityId: "F1",
    codigo: "F1",
    diasInactividad: "> 8 días",
    fase: "F1",
    condicion: "Sin condición adicional",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con la estructuración de tus promesas y tu ecosistema de ventas? Hay algo en lo que te podamos apoyar?",
    orden: 1,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F2",
    codigo: "F2",
    diasInactividad: "> 8 días",
    fase: "F2 (genérico)",
    condicion:
      "Cuando fase inicia con F2 y no coincide con subfases específicas (C-Botella, Grabación, Embudo, Piloto, Páginas, VSL)",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con la construcción del copy de tu VSL y con la configuración de tus páginas de venta? Hay algo en lo que te podamos apoyar?",
    orden: 2,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F2_C_BOTELLA",
    codigo: "F2_C_BOTELLA",
    diasInactividad: "> 8 días",
    fase: "F2 C-Botella",
    condicion: "Fase contiene C-BOTELLA o C_BOTELLA",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso? Hay algo en lo que te podamos apoyar?",
    orden: 3,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F2_GRABACION",
    codigo: "F2_GRABACION",
    diasInactividad: "> 8 días",
    fase: "F2 Grabación",
    condicion: "Fase contiene GRABACION o F2_GRABACION",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con la grabación de tu VSL? Hay algo en lo que te podamos apoyar?",
    orden: 4,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F2_EMBUDO",
    codigo: "F2_EMBUDO",
    diasInactividad: "> 8 días",
    fase: "F2 Embudo",
    condicion: "Fase contiene EMBUDO o F2_EMBUDO",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso con la estructuración del embudo y con la configuración de tus páginas de venta? Hay algo en lo que te podamos apoyar?",
    orden: 5,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F2_PILOTO",
    codigo: "F2_PILOTO",
    diasInactividad: "> 8 días",
    fase: "F2 Piloto",
    condicion: "Fase contiene PILOTO",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con la prueba piloto de tu producto? Hay algo en lo que te podamos apoyar?",
    orden: 6,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F2_PAGINAS",
    codigo: "F2_PAGINAS",
    diasInactividad: "> 8 días",
    fase: "F2 Páginas",
    condicion: "Fase contiene PAGINAS o F2_PAGINAS",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con la configuración de tus páginas de venta? Hay algo en lo que te podamos apoyar?",
    orden: 7,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F2_VSL",
    codigo: "F2_VSL",
    diasInactividad: "> 8 días",
    fase: "F2 VSL",
    condicion: "Fase contiene VSL o F2_VSL",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con la construcción del copy de tu VSL y tu VSL en general? Hay algo en lo que te podamos apoyar?",
    orden: 8,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F3_SIN_BONO",
    codigo: "F3_SIN_BONO",
    diasInactividad: "> 8 días",
    fase: "F3",
    condicion: "No tiene bono de inserción de Trafficker",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con los copys para tu Ads y tu montaje de la campaña publicitaria? Hay algo en lo que te podamos apoyar?",
    orden: 9,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F3_CON_BONO",
    codigo: "F3_CON_BONO",
    diasInactividad: "> 8 días",
    fase: "F3",
    condicion: "Tiene bono de inserción de Trafficker",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con los copys para tu Ads y tu montaje de la campaña publicitaria? Hay algo en lo que te podamos apoyar?. Recuerda también que tienes el bono de inserción de Trafficker, donde nuestro trafficker puede montar las campañas publicitarias por ti, toda la info la encontrarás en Skool, en classroom en una sección llamada Bono extra: Inserción de Trafficker, donde hay un video que te recomendamos ver. Quedamos atentos por aquí.",
    orden: 10,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F4",
    codigo: "F4",
    diasInactividad: "> 8 días",
    fase: "F4",
    condicion: "Sin condición adicional",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con el análisis de métricas? Recuerda que es importante que nos puedas pasar periódicamente tu análisis de métricas para apoyarte en la toma de decisiones de tus campañas? Hay algo en lo que te podamos apoyar?",
    orden: 11,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "F5",
    codigo: "F5",
    diasInactividad: "> 8 días",
    fase: "F5",
    condicion: "Sin condición adicional",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso, cómo te ha ido con el análisis de métricas y con tu trascendencia al High Ticket? Recuerda que es importante que nos puedas pasar periódicamente tu análisis de métricas para apoyarte en la toma de decisiones de tus campañas? Hay algo en lo que te podamos apoyar?",
    orden: 12,
    activo: true,
    fromMetadata: false,
  },
  {
    entityId: "GENERIC",
    codigo: "GENERIC",
    diasInactividad: "> 8 días",
    fase: "Cualquier fase no reconocida",
    condicion: "Fallback",
    mensaje:
      "Hola {nombre}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber cómo va tu proceso. ¿Hay algo en lo que te podamos apoyar?",
    orden: 13,
    activo: true,
    fromMetadata: false,
  },
];

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const str = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!str) return fallback;
  if (["false", "0", "no", "off"].includes(str)) return false;
  if (["true", "1", "si", "sí", "on"].includes(str)) return true;
  return fallback;
}

function toNumber(value: unknown, fallback = 9999) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringSafe(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function toItemFromMetadata(item: any): FollowupItem | null {
  const payload: MetadataFollowupPayload = item?.payload || {};
  const codigo = toStringSafe(
    payload.codigo || item?.entity_id || "",
  ).toUpperCase();
  if (!codigo) return null;

  return {
    id: item?.id,
    entityId: toStringSafe(item?.entity_id || codigo),
    codigo,
    diasInactividad: toStringSafe(payload.diasInactividad, "> 8 días"),
    fase: toStringSafe(payload.fase),
    condicion: toStringSafe(payload.condicion),
    mensaje: toStringSafe(payload.mensaje),
    orden: toNumber(payload.orden, 9999),
    activo: toBoolean(payload.activo, true),
    fromMetadata: true,
  };
}

function buildPayload(
  item: FollowupItem,
  form: FollowupFormState,
): MetadataFollowupPayload {
  return {
    codigo: item.codigo,
    diasInactividad: form.diasInactividad.trim(),
    fase: form.fase.trim(),
    condicion: form.condicion.trim(),
    mensaje: form.mensaje.trim(),
    orden: toNumber(form.orden, item.orden),
    activo: form.activo,
  };
}

export default function MensajesSeguimientoPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FollowupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<FollowupItem | null>(null);
  const [form, setForm] = useState<FollowupFormState>(DEFAULT_FORM);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMetadata<MetadataFollowupPayload>();
      const metadataItems = (res.items || [])
        .filter((record) => record.entity === FOLLOWUP_ENTITY)
        .map((record) => toItemFromMetadata(record))
        .filter((entry): entry is FollowupItem => Boolean(entry));

      const metadataByCode = new Map(
        metadataItems.map((entry) => [entry.codigo, entry]),
      );

      const merged = FOLLOWUP_ITEMS.map((base) => {
        const meta = metadataByCode.get(base.codigo);
        if (!meta) return base;
        return {
          ...base,
          ...meta,
          codigo: base.codigo,
          entityId: base.entityId,
          orden: meta.orden ?? base.orden,
        };
      }).sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));

      setItems(merged);
    } catch (error: any) {
      toast({
        title: "No se pudieron cargar los mensajes",
        description: error?.message || "Intenta de nuevo en unos segundos.",
        variant: "destructive",
      });
      setItems(FOLLOWUP_ITEMS.filter((item) => item.activo));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const activeCount = useMemo(() => items.length, [items]);

  function openEdit(item: FollowupItem) {
    setSelected(item);
    setForm({
      diasInactividad: item.diasInactividad,
      fase: item.fase,
      condicion: item.condicion,
      mensaje: item.mensaje,
      orden: String(item.orden || 1),
      activo: item.activo,
    });
    setEditOpen(true);
  }

  async function handleSave() {
    if (!selected) return;
    if (!form.mensaje.trim()) {
      toast({
        title: "Mensaje requerido",
        description: "Debes escribir el mensaje de seguimiento.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(selected, form);

      if (selected.id != null) {
        await updateMetadata(selected.id, {
          id: selected.id,
          entity: FOLLOWUP_ENTITY,
          entity_id: selected.entityId,
          payload,
        });
      } else {
        await createMetadata({
          entity: FOLLOWUP_ENTITY,
          entity_id: selected.entityId,
          payload,
        });
      }

      toast({
        title: "Mensaje actualizado",
        description: `Se guardó la configuración de ${selected.codigo}.`,
      });
      setEditOpen(false);
      await loadItems();
    } catch (error: any) {
      toast({
        title: "No se pudo guardar",
        description: error?.message || "Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Mensajes de seguimiento
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona el contenido de cada mensaje por fase y condición, con el
              mismo flujo de edición usado en plantillas de correo.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Regla global de disparo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">No se muestra</Badge>
                  <span>0 a 8 días de inactividad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>Se muestra</Badge>
                  <span>Más de 8 días de inactividad</span>
                </div>
                <p className="pt-2 text-xs">
                  Mensajes activos visibles: {activeCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Detección de bono Trafficker (F3)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Se toma como “con bono” si el código o nombre del bono
                  contiene alguno de:
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRAFFICKER_BONUS_DETECTION.map((token) => (
                    <Badge key={token} variant="outline">
                      {token}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Mensajes y condiciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando configuración...
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Días de inactividad</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Condición</TableHead>
                      <TableHead>Mensaje</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.codigo}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{item.codigo}</span>
                            {!item.activo ? (
                              <Badge variant="secondary">Inactivo</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.diasInactividad}
                        </TableCell>
                        <TableCell>{item.fase}</TableCell>
                        <TableCell>{item.condicion}</TableCell>
                        <TableCell className="min-w-[380px] text-sm text-muted-foreground">
                          {item.mensaje}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(item)}
                            className="gap-1"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  Editar mensaje{" "}
                  {selected?.codigo ? `(${selected.codigo})` : ""}
                </DialogTitle>
                <DialogDescription>
                  Puedes ajustar días de inactividad, condición y texto del
                  mensaje.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dias">Días de inactividad</Label>
                  <Input
                    id="dias"
                    value={form.diasInactividad}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        diasInactividad: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    min={1}
                    value={form.orden}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, orden: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fase">Fase</Label>
                  <Input
                    id="fase"
                    value={form.fase}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fase: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condicion">Condición</Label>
                  <Input
                    id="condicion"
                    value={form.condicion}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        condicion: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensaje">Mensaje</Label>
                <Textarea
                  id="mensaje"
                  rows={8}
                  value={form.mensaje}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, mensaje: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Activo</p>
                  <p className="text-xs text-muted-foreground">
                    Si lo desactivas, se marca como inactivo.
                  </p>
                </div>
                <Switch
                  checked={form.activo}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, activo: Boolean(checked) }))
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
