"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
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
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { createMetadata, listMetadata, updateMetadata } from "@/lib/metadata";
import { getCoaches } from "@/app/admin/teamsv2/api";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FaqTarget = "coaches" | "atcs";

type MetadataFaqPayload = {
  target?: string;
  responsable?: string;
  pregunta?: string;
  respuesta?: string;
  enlace?: {
    label?: string;
    href?: string;
  };
  enlace_label?: string | null;
  enlace_href?: string | null;
  orden?: number | string;
  activo?: boolean | string | number;
};

type FaqItem = {
  id: string | number;
  entity_id: string;
  target: FaqTarget;
  orden: number;
  responsable: string;
  pregunta: string;
  respuesta: string;
  enlace?: {
    label: string;
    href: string;
  };
  activo: boolean;
};

type FaqFormState = {
  target: FaqTarget;
  responsable: string;
  pregunta: string;
  respuesta: string;
  enlaceLabel: string;
  enlaceHref: string;
  orden: string;
  activo: boolean;
};

const FAQ_ENTITY = "preguntas_frecuentes";

const DEFAULT_FORM: FaqFormState = {
  target: "coaches",
  responsable: "",
  pregunta: "",
  respuesta: "",
  enlaceLabel: "",
  enlaceHref: "",
  orden: "1",
  activo: true,
};

function toTarget(value: unknown): FaqTarget {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "atcs" ? "atcs" : "coaches";
}

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

function buildPayload(form: FaqFormState): MetadataFaqPayload {
  const enlaceLabel = form.enlaceLabel.trim();
  const enlaceHref = form.enlaceHref.trim();
  const hasLink = Boolean(enlaceLabel && enlaceHref);

  return {
    target: form.target,
    responsable: form.responsable.trim(),
    pregunta: form.pregunta.trim(),
    respuesta: form.respuesta.trim(),
    enlace_label: hasLink ? enlaceLabel : null,
    enlace_href: hasLink ? enlaceHref : null,
    enlace: hasLink
      ? {
          label: enlaceLabel,
          href: enlaceHref,
        }
      : undefined,
    orden: toNumber(form.orden, 9999),
    activo: form.activo,
  };
}

function toFaqItem(item: any): FaqItem {
  const payload: MetadataFaqPayload = item?.payload || {};
  const enlaceLabel =
    String(payload?.enlace?.label || payload?.enlace_label || "").trim() ||
    null;
  const enlaceHref =
    String(payload?.enlace?.href || payload?.enlace_href || "").trim() || null;

  return {
    id: item.id,
    entity_id: String(item?.entity_id || ""),
    target: toTarget(payload?.target),
    orden: toNumber(payload?.orden, 9999),
    responsable: String(payload?.responsable || "").trim() || "ATC",
    pregunta: String(payload?.pregunta || "").trim(),
    respuesta: String(payload?.respuesta || "").trim(),
    enlace:
      enlaceLabel && enlaceHref
        ? {
            label: enlaceLabel,
            href: enlaceHref,
          }
        : undefined,
    activo: toBoolean(payload?.activo, true),
  };
}

function renderRespuesta(respuesta: string) {
  const hasOrderedList = /\b1\)/.test(respuesta) && /\b2\)/.test(respuesta);
  const lines = respuesta
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!hasOrderedList && lines.length <= 1) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {respuesta}
      </p>
    );
  }

  if (!hasOrderedList) {
    return (
      <div className="space-y-1.5">
        {lines.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className="text-sm text-muted-foreground leading-relaxed"
          >
            {line}
          </p>
        ))}
      </div>
    );
  }

  const listStart = respuesta.search(/\b1\)/);
  if (listStart === -1) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {respuesta}
      </p>
    );
  }

  const intro = respuesta.slice(0, listStart).trim();
  const listText = respuesta
    .slice(listStart)
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const items = Array.from(listText.matchAll(/(\d+\))\s*(.*?)(?=(\d+\))|$)/g))
    .map((match) => ({ n: match[1], text: (match[2] || "").trim() }))
    .filter((entry) => entry.n && entry.text);

  return (
    <div className="space-y-2">
      {intro ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{intro}</p>
      ) : null}
      <div className="space-y-1.5">
        {items.map((entry, index) => (
          <p
            key={`${entry.n}-${index}`}
            className="text-sm text-muted-foreground leading-relaxed"
          >
            <span className="font-semibold text-foreground">{entry.n} </span>
            {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function FaqTable({
  items,
  onEdit,
  onRequestDeactivate,
  saving,
  canManage,
}: {
  items: FaqItem[];
  onEdit: (item: FaqItem) => void;
  onRequestDeactivate: (item: FaqItem) => void;
  saving: boolean;
  canManage: boolean;
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        No hay preguntas registradas en metadata para esta pestaña.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-x-hidden">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Coach</TableHead>
            <TableHead>Pregunta</TableHead>
            <TableHead>Respuesta</TableHead>
            {canManage ? (
              <TableHead className="w-[90px] text-right">Acciones</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={String(item.id)}
              className="align-top hover:bg-muted/30"
            >
              <TableCell className="font-medium align-top pr-2">
                <Badge variant="secondary" className="font-medium">
                  {item.responsable}
                </Badge>
              </TableCell>
              <TableCell className="align-top whitespace-normal break-words pr-2">
                <p className="text-sm font-medium leading-relaxed">
                  {item.pregunta}
                </p>
              </TableCell>
              <TableCell className="align-top whitespace-normal break-words">
                <div className="space-y-2">
                  {renderRespuesta(item.respuesta)}
                  {item.enlace ? (
                    <Link
                      href={item.enlace.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {item.enlace.label}
                    </Link>
                  ) : null}
                </div>
              </TableCell>
              {canManage ? (
                <TableCell className="align-top text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(item)}
                      disabled={saving}
                      title="Editar FAQ"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onRequestDeactivate(item)}
                      disabled={saving}
                      title="Desactivar FAQ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function PreguntasFrecuentesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [coaches, setCoaches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<FaqItem | null>(
    null,
  );
  const [form, setForm] = useState<FaqFormState>(DEFAULT_FORM);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const loadFaqs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listMetadata<any>();
      const mapped: FaqItem[] = (res.items || [])
        .filter((item) => String(item?.entity || "") === FAQ_ENTITY)
        .map(toFaqItem)
        .filter((item) => item.pregunta && item.respuesta)
        .sort((a, b) => a.orden - b.orden);

      console.log("[FAQ_METADATA]", {
        entity: FAQ_ENTITY,
        items: mapped,
      });

      setFaqs(mapped);
    } catch (error: any) {
      toast({
        title: "No se pudo consultar metadata",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
      setFaqs([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadCoaches = useCallback(async () => {
    try {
      const rows = await getCoaches({ page: 1, pageSize: 200 });
      const names = Array.from(
        new Set(
          rows
            .map((coach) => String(coach?.nombre || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "es"));
      setCoaches(names);
    } catch {
      setCoaches([]);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
    loadCoaches();
  }, [loadFaqs, loadCoaches]);

  useEffect(() => {
    if (form.target === "atcs" && form.responsable !== "ATC") {
      setForm((prev) => ({ ...prev, responsable: "ATC" }));
      return;
    }
    if (
      form.target === "coaches" &&
      !form.responsable.trim() &&
      coaches.length
    ) {
      setForm((prev) => ({ ...prev, responsable: coaches[0] }));
    }
  }, [coaches, form.responsable, form.target]);

  const activeFaqs = useMemo(() => faqs.filter((item) => item.activo), [faqs]);
  const coachFaqs = useMemo(
    () => activeFaqs.filter((item) => item.target === "coaches"),
    [activeFaqs],
  );
  const atcFaqs = useMemo(
    () => activeFaqs.filter((item) => item.target === "atcs"),
    [activeFaqs],
  );

  function openCreate() {
    if (!isAdmin) return;
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      responsable: coaches[0] || "",
      orden: String(activeFaqs.length + 1),
    });
    setOpenModal(true);
  }

  function openEdit(item: FaqItem) {
    if (!isAdmin) return;
    setEditing(item);
    setForm({
      target: item.target,
      responsable: item.responsable,
      pregunta: item.pregunta,
      respuesta: item.respuesta,
      enlaceLabel: item.enlace?.label || "",
      enlaceHref: item.enlace?.href || "",
      orden: String(item.orden),
      activo: item.activo,
    });
    setOpenModal(true);
  }

  async function handleSubmit() {
    if (!isAdmin) {
      toast({
        title: "Acceso restringido",
        description: "Solo un administrador puede crear o editar FAQs.",
        variant: "destructive",
      });
      return;
    }

    const payload = buildPayload(form);
    if (!payload.pregunta || !payload.respuesta) {
      toast({
        title: "Campos requeridos",
        description: "Pregunta y respuesta son obligatorias.",
        variant: "destructive",
      });
      return;
    }
    if (!payload.responsable) {
      toast({
        title: "Responsable requerido",
        description: "Selecciona un coach o ATC.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await updateMetadata(editing.id, {
          id: editing.id,
          entity: FAQ_ENTITY,
          entity_id: editing.entity_id,
          payload,
        } as any);
        toast({ title: "FAQ actualizada" });
      } else {
        const entityId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? `faq-${crypto.randomUUID()}`
            : `faq-${Date.now()}`;

        await createMetadata({
          entity: FAQ_ENTITY,
          entity_id: entityId,
          payload,
        });
        toast({ title: "FAQ creada" });
      }

      setOpenModal(false);
      await loadFaqs();
    } catch (error: any) {
      toast({
        title: "No se pudo guardar",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(item: FaqItem) {
    if (!isAdmin) {
      toast({
        title: "Acceso restringido",
        description: "Solo un administrador puede desactivar FAQs.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        target: item.target,
        responsable: item.responsable,
        pregunta: item.pregunta,
        respuesta: item.respuesta,
        enlace_label: item.enlace?.label || null,
        enlace_href: item.enlace?.href || null,
        orden: item.orden,
        activo: false,
      };

      await updateMetadata(item.id, {
        id: item.id,
        entity: FAQ_ENTITY,
        entity_id: item.entity_id,
        payload,
      } as any);

      toast({ title: "FAQ desactivada" });
      await loadFaqs();
    } catch (error: any) {
      toast({
        title: "No se pudo desactivar",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const coachSelectOptions = coaches.length ? coaches : ["Johan", "Karina"];

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <div className="space-y-5 max-w-full overflow-x-hidden">
          <div className="rounded-xl border bg-card p-5 sm:p-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Preguntas frecuentes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestión dinámica desde metadata (entidad: preguntas_frecuentes).
              </p>
            </div>
            {isAdmin ? (
              <Button type="button" onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva FAQ
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="rounded-xl border bg-card p-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="preguntas-frecuentes" className="w-full">
              <TabsList className="h-11 w-full justify-start rounded-xl p-1">
                <TabsTrigger
                  value="preguntas-frecuentes"
                  className="h-9 rounded-lg px-4"
                >
                  Preguntas frecuentes coaches
                </TabsTrigger>
                <TabsTrigger
                  value="preguntas-atcs"
                  className="h-9 rounded-lg px-4"
                >
                  Preguntas frecuentes ATCs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preguntas-frecuentes" className="mt-4">
                <FaqTable
                  items={coachFaqs}
                  onEdit={openEdit}
                  onRequestDeactivate={setConfirmDeleteItem}
                  saving={isSaving}
                  canManage={isAdmin}
                />
              </TabsContent>

              <TabsContent value="preguntas-atcs" className="mt-4">
                <FaqTable
                  items={atcFaqs}
                  onEdit={openEdit}
                  onRequestDeactivate={setConfirmDeleteItem}
                  saving={isSaving}
                  canManage={isAdmin}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <Dialog open={isAdmin && openModal} onOpenChange={setOpenModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar FAQ" : "Crear FAQ"}</DialogTitle>
              <DialogDescription>
                Se guarda en metadata bajo la entidad preguntas_frecuentes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Mostrar en</Label>
                  <Select
                    value={form.target}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        target: value as FaqTarget,
                        responsable:
                          value === "atcs"
                            ? "ATC"
                            : coaches[0] || prev.responsable,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coaches">Coaches</SelectItem>
                      <SelectItem value="atcs">ATCs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Coach / Responsable</Label>
                  {form.target === "coaches" ? (
                    <Select
                      value={form.responsable}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, responsable: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona coach" />
                      </SelectTrigger>
                      <SelectContent>
                        {coachSelectOptions.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value="ATC" disabled />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.orden}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, orden: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Pregunta</Label>
                <Textarea
                  value={form.pregunta}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pregunta: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Respuesta</Label>
                <Textarea
                  value={form.respuesta}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, respuesta: e.target.value }))
                  }
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Texto enlace (opcional)</Label>
                  <Input
                    value={form.enlaceLabel}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        enlaceLabel: e.target.value,
                      }))
                    }
                    placeholder="Ej: Ver tutorial"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL enlace (opcional)</Label>
                  <Input
                    value={form.enlaceHref}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        enlaceHref: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                  </span>
                ) : editing ? (
                  "Guardar cambios"
                ) : (
                  "Crear FAQ"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!confirmDeleteItem}
          onOpenChange={(open) => {
            if (!open) setConfirmDeleteItem(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción desactivará la FAQ y dejará de mostrarse en la
                lista.{" "}
                {confirmDeleteItem
                  ? `Pregunta: "${confirmDeleteItem.pregunta}".`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isSaving || !confirmDeleteItem}
                onClick={async (event) => {
                  event.preventDefault();
                  if (!confirmDeleteItem) return;
                  await handleDeactivate(confirmDeleteItem);
                  setConfirmDeleteItem(null);
                }}
              >
                {isSaving ? "Eliminando..." : "Sí, desactivar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
