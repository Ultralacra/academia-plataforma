"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getOpciones } from "../../api";
import { toast } from "@/components/ui/use-toast";
import { buildUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import PauseDatesModal from "./PauseDatesModal";
import { fmtES } from "./detail-utils";

export default function EditOptionModal({
  open,
  onOpenChange,
  clientCode,
  current,
  mode = "all",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientCode: string;
  current: { estado?: string; etapa?: string; nicho?: string } | null;
  mode?: "estado" | "etapa" | "nicho" | "all";
  onSaved?: () => void;
}) {
  const [estados, setEstados] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [nichos, setNichos] = useState<any[]>([]);

  const [estado, setEstado] = useState<string | undefined>(current?.estado);
  const [etapa, setEtapa] = useState<string | undefined>(current?.etapa);
  const [nicho, setNicho] = useState<string | undefined>(current?.nicho);
  const [saving, setSaving] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pendingSaveAfterPauseDetails, setPendingSaveAfterPauseDetails] =
    useState(false);
  const [pauseRange, setPauseRange] = useState<{
    start?: string;
    end?: string;
    tipo?: "CONTRACTUAL" | "EXTRAORDINARIA";
    motivo?: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setEstados(await getOpciones("estado_cliente"));
        setEtapas(await getOpciones("etapa"));
        setNichos(await getOpciones("nicho"));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open]);

  useEffect(() => {
    setEstado(current?.estado);
    setEtapa(current?.etapa);
    setNicho(current?.nicho);
    // Limpiar pauseRange al abrir el modal
    setPauseRange(null);
    setPendingSaveAfterPauseDetails(false);
  }, [current, open]);

  // Determinar si el estado ACTUAL del estudiante ya es PAUSADO
  const isCurrentlyPaused = (() => {
    const label = String(current?.estado || "").toUpperCase();
    return label.includes("PAUSADO") || label.includes("PAUSA");
  })();

  async function save(
    nextPauseRange?: {
      start?: string;
      end?: string;
      tipo?: "CONTRACTUAL" | "EXTRAORDINARIA";
      motivo?: string;
    } | null,
  ) {
    if (!clientCode) return;
    setSaving(true);
    try {
      const effectivePauseRange = nextPauseRange ?? pauseRange;
      const fd = new FormData();

      // Detectar si el estado seleccionado es PAUSADO
      const isPaused = (() => {
        const match = estados.find((x) => x.key === estado);
        const label = String(match?.value || estado || "").toUpperCase();
        return label.includes("PAUSADO") || label.includes("PAUSA");
      })();

      // Solo enviar en form-data lo que se quiera editar (campo cambiado)
      // No enviar nombre ni valores existentes.
      const wantsEstado =
        (mode === "estado" || mode === "all") &&
        typeof estado !== "undefined" &&
        estado !== current?.estado;
      const wantsEtapa =
        (mode === "etapa" || mode === "all") &&
        typeof etapa !== "undefined" &&
        etapa !== current?.etapa;
      // Pedido explícito: no enviar nicho por ahora.

      // Si ya está en pausa y quiere agregar más pausas, solo necesitamos las fechas
      const isAddingPauseToAlreadyPaused =
        isCurrentlyPaused &&
        isPaused &&
        effectivePauseRange?.start &&
        effectivePauseRange?.end;

      const hasPauseDetails =
        !!effectivePauseRange?.start &&
        !!effectivePauseRange?.end &&
        !!effectivePauseRange?.tipo &&
        !!effectivePauseRange?.motivo;

      // Si NO está en pausa y quiere pausar, enviar estado + fechas + tipo/motivo
      // Si YA está en pausa y agrega otra pausa, reenviar estado + fechas + tipo/motivo
      if (isAddingPauseToAlreadyPaused) {
        const estadoToSend = String(estado ?? current?.estado ?? "").trim();
        if (estadoToSend) fd.set("estado", estadoToSend);
        if (effectivePauseRange?.start)
          fd.set("fecha_desde", String(effectivePauseRange.start));
        if (effectivePauseRange?.end)
          fd.set("fecha_hasta", String(effectivePauseRange.end));
        if (effectivePauseRange?.tipo)
          fd.set("tipo", String(effectivePauseRange.tipo));
        if (effectivePauseRange?.motivo)
          fd.set("motivo", String(effectivePauseRange.motivo));
      } else {
        // Lógica normal: enviar estado si cambió
        if (wantsEstado && estado) fd.set("estado", String(estado));
        if (wantsEtapa && etapa) fd.set("etapa", String(etapa));

        // Si se está poniendo en pausa (desde un estado no-pausado), agregar fechas
        if (
          wantsEstado &&
          isPaused &&
          effectivePauseRange?.start &&
          effectivePauseRange?.end
        ) {
          fd.set("fecha_desde", String(effectivePauseRange.start));
          fd.set("fecha_hasta", String(effectivePauseRange.end));
          if (effectivePauseRange?.tipo)
            fd.set("tipo", String(effectivePauseRange.tipo));
          if (effectivePauseRange?.motivo)
            fd.set("motivo", String(effectivePauseRange.motivo));
        }
      }

      if ([...fd.keys()].length === 0) {
        toast({
          title: "Sin cambios",
          description: "No hay nada para guardar",
        });
        setSaving(false);
        return;
      }

      // Si se selecciona PAUSADO y no tenemos rango/tipo/motivo, primero pedirlos
      if (isPaused && !hasPauseDetails) {
        setPendingSaveAfterPauseDetails(true);
        setPauseOpen(true);
        setSaving(false);
        return; // esperar confirmación del modal; el usuario pulsará Guardar de nuevo
      }

      // El endpoint acepta form-data y ahora también soporta estado, fecha_desde, fecha_hasta
      const url = buildUrl(
        `/client/update/client/${encodeURIComponent(clientCode)}`,
      );
      const token = typeof window !== "undefined" ? getAuthToken() : null;
      const res = await fetch(url, {
        method: "PUT",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      toast({
        title: "Actualizado",
        description: isAddingPauseToAlreadyPaused
          ? "Nueva pausa agregada correctamente"
          : "Campos guardados correctamente",
      });
      // Limpiar el pauseRange después de guardar para permitir agregar otra pausa
      setPauseRange(null);
      setPendingSaveAfterPauseDetails(false);
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo actualizar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar alumno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(mode === "estado" || mode === "all") && (
              <div>
                <label className="block text-xs text-muted-foreground">
                  Estado
                </label>
                <Select
                  value={estado}
                  onValueChange={(v) => {
                    setEstado(v);
                    const match = estados.find((x) => x.key === v);
                    const label = String(match?.value || v || "").toUpperCase();
                    if (label.includes("PAUSADO")) {
                      setPauseOpen(true);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona estado">
                      {estado && (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          {estados.find((x) => x.key === estado)?.value ??
                            estado}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((o) => (
                      <SelectItem key={o.id} value={o.key}>
                        <div className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span>{o.value}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pauseRange?.start && pauseRange?.end && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Nueva pausa{" "}
                    {pauseRange?.tipo ? (
                      <span className="font-medium">
                        ({String(pauseRange.tipo).toUpperCase()})
                      </span>
                    ) : null}
                    : {fmtES(pauseRange.start)} – {fmtES(pauseRange.end)}
                    {pauseRange?.motivo ? (
                      <span className="block mt-1 text-[11px] text-muted-foreground">
                        Motivo: {pauseRange.motivo}
                      </span>
                    ) : null}
                  </div>
                )}
                {/* Si ya está pausado, mostrar botón para agregar más pausas */}
                {isCurrentlyPaused && (
                  <div className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                      El alumno ya está en pausa. Puedes agregar períodos de
                      pausa adicionales.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        // UX: si el usuario abre "Agregar nueva pausa", asumimos que quiere guardarla.
                        setPendingSaveAfterPauseDetails(true);
                        setPauseOpen(true);
                      }}
                    >
                      + Agregar nueva pausa
                    </Button>
                  </div>
                )}
              </div>
            )}

            {(mode === "etapa" || mode === "all") && (
              <div>
                <label className="block text-xs text-muted-foreground">
                  Etapa
                </label>
                <Select value={etapa} onValueChange={(v) => setEtapa(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona etapa">
                      {etapa && (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          {etapas.find((x) => x.key === etapa)?.value ?? etapa}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {etapas.map((o) => (
                      <SelectItem key={o.id} value={o.key}>
                        <div className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          <span>{o.value}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(mode === "nicho" || mode === "all") && (
              <div>
                <label className="block text-xs text-muted-foreground">
                  Nicho
                </label>
                <Select value={nicho} onValueChange={(v) => setNicho(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona nicho">
                      {nicho && (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-violet-400" />
                          {nichos.find((x) => x.key === nicho)?.value ?? nicho}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {nichos.map((o) => (
                      <SelectItem key={o.id} value={o.key}>
                        <div className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-violet-400" />
                          <span>{o.value}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <PauseDatesModal
        open={pauseOpen}
        onOpenChange={(v) => setPauseOpen(v)}
        initialRange={pauseRange || undefined}
        onConfirm={(r) => {
          setPauseRange(r);
          // Si el guardado estaba pendiente (caso típico: eligió PAUSADO y faltaban fechas),
          // guardamos automáticamente para que el contador/historial se actualice sin un click extra.
          if (pendingSaveAfterPauseDetails) {
            // Evitar depender del setState async: usar el rango recién confirmado.
            queueMicrotask(() => {
              void save(r);
            });
          }
        }}
      />
    </>
  );
}
