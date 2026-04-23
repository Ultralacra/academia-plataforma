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
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Pencil,
  Sparkles,
  TimerReset,
} from "lucide-react";

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
    entityId: "F5_METRICAS_ADS",
    codigo: "F5_METRICAS_ADS",
    diasInactividad: "Cada 4 días",
    fase: "F5",
    condicion:
      "Al iniciar sesión en F5, mostrar recordatorio periódico para actualizar métricas ADS y volver a mostrarlo 4 días después de cerrarlo.",
    mensaje:
      "Recuerda actualizar tus métricas publicitarias\n\nMantén tus métricas al día para que los coaches podamos hacer un seguimiento cercano de tu progreso. Puedes hacerlo directamente en la sección Métricas ADS dentro de la plataforma.\n\n¿No sabes cómo hacerlo? Mira este video tutorial: https://www.skool.com/hotselling-pro/classroom/35c3544e?md=ebd947b99fc544a786d7b7fe4c752187",
    orden: 13,
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
    orden: 14,
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

function getPhaseAccent(phase: string) {
  const normalized = phase.toUpperCase();

  if (normalized.includes("F1")) {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      chip: "bg-emerald-500/10 text-emerald-700",
    };
  }

  if (normalized.includes("F2")) {
    return {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      chip: "bg-sky-500/10 text-sky-700",
    };
  }

  if (normalized.includes("F3")) {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      chip: "bg-amber-500/10 text-amber-700",
    };
  }

  if (normalized.includes("F4") || normalized.includes("F5")) {
    return {
      badge: "border-violet-200 bg-violet-50 text-violet-700",
      chip: "bg-violet-500/10 text-violet-700",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    chip: "bg-slate-500/10 text-slate-700",
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
  const inactiveCount = useMemo(
    () => items.filter((item) => !item.activo).length,
    [items],
  );
  const customCount = useMemo(
    () => items.filter((item) => item.fromMetadata).length,
    [items],
  );

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
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          <div className="overflow-hidden rounded-[28px] border border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),_transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-sm">
            <div className="grid gap-5 p-5 md:grid-cols-[1.4fr,0.9fr] md:p-7">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Automatizaciones
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                    Mensajes de seguimiento
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    Esta vista ahora prioriza lectura rápida: cada mensaje se ve
                    como una regla editable con estado, fase, condición y copia
                    principal sin obligarte a recorrer una tabla dura.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200/70 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Activos
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {activeCount}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Reglas disponibles para disparo.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200/70 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Personalizados
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {customCount}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Configuraciones sobrescritas en metadata.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Inactivos
                    </span>
                    <TimerReset className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {inactiveCount}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Siguen visibles en edición, pero no disparan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
            <Card className="border-border/60 shadow-sm">
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

            <Card className="border-border/60 shadow-sm">
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

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Mensajes y condiciones
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cada tarjeta representa una regla. La copia aparece resumida
                    para escanearla rápido y puedes abrir el editor completo con
                    un clic.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Orden manual</Badge>
                  <Badge variant="outline">Edición por metadata</Badge>
                  <Badge variant="outline">Vista responsive</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando configuración...
                </div>
              ) : null}
              <div className="mt-1 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {items.map((item) => {
                  const accent = getPhaseAccent(item.fase || item.codigo);

                  return (
                    <article
                      key={item.codigo}
                      className="group relative overflow-hidden rounded-3xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-amber-400 opacity-80" />

                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-white">
                              {item.codigo}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${accent.badge}`}
                            >
                              {item.fase || "Sin fase"}
                            </span>
                            {!item.activo ? (
                              <Badge variant="secondary">Inactivo</Badge>
                            ) : null}
                            {item.fromMetadata ? (
                              <Badge variant="outline">Personalizado</Badge>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1">
                              Orden {item.orden}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 ${accent.chip}`}
                            >
                              {item.diasInactividad}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(item)}
                          className="gap-1 rounded-full border-border/70 bg-white/90 shadow-sm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </div>

                      <div className="mt-5 grid gap-4">
                        <section className="rounded-2xl border border-border/60 bg-white/70 p-4">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Condición
                          </div>
                          <p className="text-sm leading-6 text-slate-700">
                            {item.condicion || "Sin condición adicional"}
                          </p>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-slate-50/80 p-4">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Mensaje
                          </div>
                          <p className="line-clamp-5 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {item.mensaje}
                          </p>
                        </section>
                      </div>
                    </article>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-3xl border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.98))]">
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
                  <Label htmlFor="dias">Días de inactividad.</Label>
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
                  rows={10}
                  className="min-h-[240px] resize-y"
                  value={form.mensaje}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, mensaje: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-white/80 p-4">
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
