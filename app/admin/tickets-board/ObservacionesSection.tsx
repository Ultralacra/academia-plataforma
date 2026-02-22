"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/spinner";
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle,
  Paperclip,
  X,
  FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  Download,
} from "lucide-react";
import {
  getObservaciones,
  createObservacion,
  updateObservacion,
  deleteObservacion,
  type Observacion,
} from "./api";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

const AREAS = [
  "COPY",
  "VSL",
  "TECNICO",
  "ATENCION AL CLIENTE",
  "ADS",
  "MENTALIDAD",
] as const;

const PREVIEW_TAREAS_IN_ADS_METADATA_ONLY = false;

type AdsMetadataLike = {
  id?: string | number | null;
  entity?: string | null;
  entity_id?: string | number | null;
  created_at?: string | null;
  payload?: any;
};

function normalizeId(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function pickBestAdsMetadataForStudent(
  items: AdsMetadataLike[],
  alumnoId: string,
) {
  const alumnoIdStr = normalizeId(alumnoId);
  const matches = (items || []).filter((m) => {
    const entity = String(m?.entity ?? "").trim();
    const entityId = normalizeId(m?.entity_id);
    const payload = m?.payload ?? {};
    const payloadAlumnoId = normalizeId(payload?.alumno_id);
    const payloadAlumnoCodigo = normalizeId(payload?.alumno_codigo);
    const payloadTag = normalizeId(payload?._tag);

    const entityMatches =
      entity === "ads_metrics" || payloadTag === "admin_alumnos_ads_metrics";
    if (!entityMatches) return false;

    return Boolean(
      (entityId && entityId === alumnoIdStr) ||
      (payloadAlumnoId && payloadAlumnoId === alumnoIdStr) ||
      (payloadAlumnoCodigo &&
        payloadAlumnoCodigo.toLowerCase() === alumnoIdStr.toLowerCase()),
    );
  });

  const best =
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
    })[0] ?? null;

  return { best, count: matches.length };
}

function parseTareasFromAdsPayload(payload: any): any[] {
  const raw = payload?.tareas;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

type ObservacionesSectionProps = {
  ticketCode?: string;
  ticketCodeForCreate?: string;
  alumnoId: string;
  coachId: string; // ID del coach actual (quien crea la observación)
  canEdit?: boolean; // Si el usuario puede editar (solo coaches/equipo)
};

export default function ObservacionesSection({
  ticketCode,
  ticketCodeForCreate,
  alumnoId,
  coachId,
  canEdit = true,
}: ObservacionesSectionProps) {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingObservacion, setEditingObservacion] =
    useState<Observacion | null>(null); // Guardar observación completa

  // Form state
  const [fecha, setFecha] = useState("");
  const [recomendacion, setRecomendacion] = useState("");
  const [area, setArea] = useState("");
  const [estado, setEstado] = useState(false);
  const [constanciaTexto, setConstanciaTexto] = useState("");
  const [constanciaFiles, setConstanciaFiles] = useState<File[]>([]);
  const [existingConstanciaUrls, setExistingConstanciaUrls] = useState<
    string[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [adsMetadata, setAdsMetadata] = useState<any | null>(null);
  const [adsMetadataLoading, setAdsMetadataLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Refs para evitar consultas duplicadas
  const observacionesFetchedRef = useRef<string | null>(null);
  const adsMetadataFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const cacheKey = `${ticketCode ?? ""}|${alumnoId}`;

    // Cargar observaciones solo si cambiaron los parámetros
    if (observacionesFetchedRef.current !== cacheKey) {
      loadObservaciones();
      observacionesFetchedRef.current = cacheKey;
    }

    // Cargar metadata ADS solo si cambió el alumnoId
    if (adsMetadataFetchedRef.current !== alumnoId) {
      loadAdsMetadata();
      adsMetadataFetchedRef.current = alumnoId;
    }
  }, [ticketCode, alumnoId]);

  const loadAdsMetadata = async (): Promise<AdsMetadataLike | null> => {
    if (!alumnoId) {
      setAdsMetadata(null);
      return null;
    }
    setAdsMetadataLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `/api/alumnos/${encodeURIComponent(
          String(alumnoId),
        )}/metadata?entity=${encodeURIComponent("ads_metrics")}`,
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
        ? (json.items as AdsMetadataLike[])
        : [];
      const { best } = pickBestAdsMetadataForStudent(items, alumnoId);
      if (!best) {
        setAdsMetadata(null);
        return null;
      } else {
        setAdsMetadata(best);
        return best;
      }
    } catch (e) {
      console.error("Error cargando metadata ADS:", e);
      setAdsMetadata(null);
      return null;
    } finally {
      setAdsMetadataLoading(false);
    }
  };

  const loadObservaciones = async () => {
    if (!alumnoId) return;
    setLoading(true);
    try {
      const data = await getObservaciones(ticketCode, alumnoId);
      setObservaciones(data);
    } catch (error) {
      console.error("Error cargando observaciones:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las observaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFecha("");
    setRecomendacion("");
    setArea("");
    setEstado(false);
    setConstanciaTexto("");
    setConstanciaFiles([]);
    setExistingConstanciaUrls([]);
    setEditingId(null);
    setEditingObservacion(null); // Limpiar observación en edición
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (obs: Observacion) => {
    setEditingId(obs.id);
    setEditingObservacion(obs); // Guardar observación completa para preservar todos los campos
    const payload = obs.payload;
    setFecha(payload.fecha.split("T")[0]); // Convertir a formato date input
    setRecomendacion(payload.recomendacion);
    setArea(payload.area);
    setEstado(payload.estado);

    // Parsear constancia - puede ser texto o JSON con archivos
    setConstanciaTexto(payload.constancia_texto || "");
    try {
      const urls = payload.constancia ? JSON.parse(payload.constancia) : [];
      setExistingConstanciaUrls(Array.isArray(urls) ? urls : []);
    } catch {
      setExistingConstanciaUrls([]);
    }
    setConstanciaFiles([]);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setConstanciaFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setConstanciaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingUrl = (index: number) => {
    setExistingConstanciaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (constanciaFiles.length === 0) return [];

    const formData = new FormData();
    constanciaFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const token = getAuthToken();
      const url = buildUrl(`/metadata/upload/files`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Error subiendo archivos");

      const data = await response.json();
      return Array.isArray(data?.urls) ? data.urls : [];
    } catch (error) {
      console.error("Error subiendo archivos:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!recomendacion.trim() || !area.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Recomendación y área son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const isPreviewCreate = PREVIEW_TAREAS_IN_ADS_METADATA_ONLY && !editingId;

      // En modo preview no subimos archivos al backend.
      const uploadedUrls = isPreviewCreate ? [] : await uploadFiles();

      // Combinar URLs existentes con las nuevas (o placeholders locales en preview)
      const localFilePlaceholders = isPreviewCreate
        ? constanciaFiles.map(
            (f) => `local-file://${encodeURIComponent(f.name)}`,
          )
        : [];
      const allUrls = [
        ...existingConstanciaUrls,
        ...uploadedUrls,
        ...localFilePlaceholders,
      ];
      const constanciaJson = JSON.stringify(allUrls);

      const latestAdsMetadata = (await loadAdsMetadata()) ?? adsMetadata;

      // Preparar snapshot de metadata ADS para asociar a la observación
      const adsSnapshot = latestAdsMetadata
        ? {
            id: latestAdsMetadata.id,
            fase: latestAdsMetadata.payload?.fase ?? null,
            subfase: latestAdsMetadata.payload?.subfase ?? null,
            trascendencia: latestAdsMetadata.payload?.subfase_color ?? null,
            pauta_activa: latestAdsMetadata.payload?.pauta_activa ?? null,
            requiere_interv: latestAdsMetadata.payload?.requiere_interv ?? null,
          }
        : null;

      if (editingId && editingObservacion) {
        // Actualizar - IMPORTANTE: enviar TODOS los campos del payload original
        const originalPayload = editingObservacion.payload;
        await updateObservacion(editingId, {
          fecha: fecha ? `${fecha}T12:00:00` : new Date().toISOString(),
          recomendacion,
          area,
          estado,
          realizada: originalPayload.realizada ?? false, // Mantener estado de realizada
          constancia: constanciaJson,
          constancia_texto: constanciaTexto,
          creado_por_id: originalPayload.creado_por_id, // Preservar campos originales
          creado_por_nombre: originalPayload.creado_por_nombre,
          alumno_id: originalPayload.alumno_id,
          alumno_nombre: originalPayload.alumno_nombre,
          ticket_codigo: originalPayload.ticket_codigo,
          deleted: false, // Explícitamente mantener como no eliminado
          ads_metadata_id:
            adsSnapshot?.id ??
            (originalPayload as any)?.ads_metadata_id ??
            null,
          ads_metadata_snapshot:
            adsSnapshot ??
            (originalPayload as any)?.ads_metadata_snapshot ??
            null,
        });
        toast({
          title: "Actualizado",
          description: "Observación actualizada correctamente",
        });
      } else {
        if (PREVIEW_TAREAS_IN_ADS_METADATA_ONLY) {
          if (!latestAdsMetadata?.id) {
            toast({
              title: "Sin metadata ADS",
              description:
                "No se encontró metadata ADS del alumno para crear vista previa de tareas.",
              variant: "destructive",
            });
            return;
          }

          const currentPayload = latestAdsMetadata.payload ?? {};
          const tareasActuales = parseTareasFromAdsPayload(currentPayload);
          const nowIso = new Date().toISOString();
          const nuevaTarea = {
            id: `tmp_tarea_${Date.now()}`,
            fecha: fecha ? `${fecha}T12:00:00` : nowIso,
            recomendacion,
            area,
            estado,
            constancia: allUrls,
            constancia_texto: constanciaTexto,
            creada_desde: "admin_tareas_preview",
            creado_por_id: coachId || null,
            alumno_id: alumnoId || null,
            ads_metadata_id: latestAdsMetadata.id,
            created_at: nowIso,
            updated_at: nowIso,
          };

          const payloadActualizado = {
            ...currentPayload,
            tareas: [...tareasActuales, nuevaTarea],
            _preview_only: true,
            _preview_generated_at: nowIso,
          };

          const metadataActualizadaPreview = {
            ...latestAdsMetadata,
            payload: payloadActualizado,
            updated_at: nowIso,
          };

          console.group("[PREVIEW][ADS metadata + tareas]");
          console.log("metadata_actual_id:", latestAdsMetadata.id);
          console.log("tareas_previas_count:", tareasActuales.length);
          console.log("nueva_tarea:", nuevaTarea);
          console.log(
            "metadata_actualizada_preview:",
            metadataActualizadaPreview,
          );
          console.groupEnd();

          toast({
            title: "Preview generado",
            description:
              "Se imprimió en consola la metadata ADS actualizada con la nueva tarea (sin enviar al backend).",
          });

          setDialogOpen(false);
          resetForm();
          return;
        }

        const effectiveTicketCode = ticketCodeForCreate ?? ticketCode ?? "";
        if (!effectiveTicketCode.trim()) {
          toast({
            title: "Error",
            description: "No se pudo crear la tarea (código no disponible)",
            variant: "destructive",
          });
          return;
        }
        // Crear
        await createObservacion({
          fecha: fecha ? `${fecha}T12:00:00` : new Date().toISOString(),
          recomendacion,
          area,
          estado,
          constancia: constanciaJson,
          constancia_texto: constanciaTexto,
          creado_por_id: coachId,
          alumno_id: alumnoId,
          ticket_codigo: effectiveTicketCode,
          ads_metadata_id: adsSnapshot?.id ?? null,
          ads_metadata_snapshot: adsSnapshot ?? null,
        });
        toast({
          title: "Creado",
          description: "Observación creada correctamente",
        });
      }
      setDialogOpen(false);
      resetForm();
      await loadObservaciones();
      await loadAdsMetadata();
    } catch (error) {
      console.error("Error guardando observación:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la observación",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta observación?")) return;

    try {
      await deleteObservacion(id);
      toast({
        title: "Eliminado",
        description: "Observación eliminada correctamente",
      });
      await loadObservaciones();
      await loadAdsMetadata();
    } catch (error) {
      console.error("Error eliminando observación:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la observación",
        variant: "destructive",
      });
    }
  };

  const applyRealizadaOptimistic = (id: number, realizada: boolean) => {
    setObservaciones((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const payload: any = (o as any)?.payload ?? {};
        return {
          ...o,
          payload: {
            ...payload,
            realizada,
          },
        } as any;
      }),
    );
  };

  const toggleEstado = async (obs: Observacion, nextRealizada?: boolean) => {
    try {
      const payload = obs.payload;

      const resolvedNextRealizada =
        typeof nextRealizada === "boolean"
          ? nextRealizada
          : !(payload.realizada ?? false);

      // Construir el payload completo asegurando que no perdamos ningún campo
      const updatePayload: any = {
        fecha: payload.fecha,
        recomendacion: payload.recomendacion,
        area: payload.area,
        estado: payload.estado, // Mantener estado por compatibilidad
        realizada: resolvedNextRealizada,
        constancia: payload.constancia || "[]",
        constancia_texto: payload.constancia_texto || "",
        creado_por_id: payload.creado_por_id,
        alumno_id: payload.alumno_id,
        ticket_codigo: payload.ticket_codigo,
        deleted: false, // NUNCA eliminar al marcar como realizada
      };

      // Incluir campos opcionales si existen
      if (payload.creado_por_nombre) {
        updatePayload.creado_por_nombre = payload.creado_por_nombre;
      }
      if (payload.alumno_nombre) {
        updatePayload.alumno_nombre = payload.alumno_nombre;
      }

      /* console.log("Actualizando observación (toggle realizada):", {
        id: obs.id,
        payload: updatePayload,
      }); */

      await updateObservacion(obs.id, updatePayload);

      toast({
        title:
          (payload.realizada ?? false)
            ? "Marcada como pendiente"
            : "Marcada como realizada",
      });
      await loadObservaciones();
      await loadAdsMetadata();
    } catch (error) {
      console.error("Error actualizando estado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const handleToggleRealizada = async (
    obs: Observacion,
    nextRealizada?: boolean,
  ) => {
    if (!canEdit) return;
    const current = (obs.payload?.realizada ?? false) as boolean;
    const next = typeof nextRealizada === "boolean" ? nextRealizada : !current;
    applyRealizadaOptimistic(obs.id, next);
    await toggleEstado(obs, next);
  };

  const formatDisplayDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Observaciones</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpenCreate}
          className="h-8 gap-2"
          disabled={!alumnoId || !canEdit}
          title={
            !alumnoId
              ? "No se puede crear sin información del alumno"
              : !canEdit
                ? "Solo coaches y equipo pueden crear observaciones"
                : ""
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva observación
        </Button>
      </div>

      {/* Nota: la vista de ADS se muestra ahora en la pestaña General del detalle */}

      {!alumnoId ? (
        <div className="text-sm text-amber-600 py-4 text-center bg-amber-50 rounded border border-amber-200 p-3">
          No se puede cargar observaciones: información del alumno no disponible
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Spinner className="h-4 w-4" />
          Cargando observaciones...
        </div>
      ) : observaciones.length === 0 ? (
        <div className="text-sm text-slate-500 py-4 text-center">
          Sin observaciones aún
        </div>
      ) : (
        <div className="space-y-2">
          {observaciones.map((obs) => {
            const payload = obs.payload;
            const isRealizada = payload.realizada ?? false; // Usar 'realizada' en lugar de 'estado'
            return (
              <Card
                key={obs.id}
                className={`p-3 hover:shadow-sm transition-shadow ${
                  isRealizada ? "bg-emerald-50 border-emerald-200" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      id={`check-${obs.id}`}
                      checked={isRealizada}
                      onCheckedChange={(checked) =>
                        handleToggleRealizada(obs, checked === true)
                      }
                      className="mt-1"
                      disabled={!canEdit}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${
                            isRealizada ? "text-emerald-700" : "text-slate-800"
                          }`}
                        >
                          {payload.recomendacion}
                        </span>
                        {isRealizada && (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRealizada(obs)}
                        className="text-left text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                        disabled={!canEdit}
                      >
                        {isRealizada ? "✓ Realizada" : "Marcar como realizada"}
                      </button>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDisplayDate(payload.fecha)}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {payload.area}
                        </span>
                      </div>

                      {/* Texto de constancia */}
                      {payload.constancia_texto && (
                        <div className="text-xs text-slate-600 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                          <div className="font-medium mb-1">Notas:</div>
                          <div className="whitespace-pre-wrap break-words">
                            {payload.constancia_texto
                              .split(/(https?:\/\/[^\s]+)/g)
                              .map((part, index) => {
                                // Si es una URL, convertirla en enlace clickeable
                                if (part.match(/^https?:\/\//)) {
                                  return (
                                    <a
                                      key={index}
                                      href={part}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline break-all"
                                    >
                                      {part}
                                    </a>
                                  );
                                }
                                return <span key={index}>{part}</span>;
                              })}
                          </div>
                        </div>
                      )}

                      {/* Archivos adjuntos */}
                      {payload.constancia &&
                        (() => {
                          try {
                            const urls = JSON.parse(payload.constancia);
                            if (Array.isArray(urls) && urls.length > 0) {
                              return (
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs font-medium text-slate-600">
                                    Archivos adjuntos:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {urls.map((url: string, idx: number) => {
                                      const fileName =
                                        url.split("/").pop() || "archivo";
                                      const isImage =
                                        /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                      const isVideo = /\.(mp4|webm|mov)$/i.test(
                                        url,
                                      );
                                      const isAudio =
                                        /\.(mp3|wav|ogg|m4a)$/i.test(url);

                                      return (
                                        <a
                                          key={idx}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs"
                                        >
                                          {isImage && (
                                            <FileImage className="h-3 w-3" />
                                          )}
                                          {isVideo && (
                                            <FileVideo className="h-3 w-3" />
                                          )}
                                          {isAudio && (
                                            <FileAudio className="h-3 w-3" />
                                          )}
                                          {!isImage && !isVideo && !isAudio && (
                                            <FileIcon className="h-3 w-3" />
                                          )}
                                          <span className="max-w-[120px] truncate">
                                            {fileName}
                                          </span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                          } catch {
                            return null;
                          }
                          return null;
                        })()}

                      <div className="text-xs text-slate-400 mt-1">
                        Creado por: {payload.creado_por_nombre || "Coach"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(obs)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(obs.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar observación" : "Nueva observación"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recomendacion">
                Recomendación de optimización{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recomendacion"
                value={recomendacion}
                onChange={(e) => setRecomendacion(e.target.value)}
                placeholder="Ej: Revisar documentación del módulo X"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">
                Área <span className="text-red-500">*</span>
              </Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs">
              <span className="text-muted-foreground">ID metadata ADS:</span>{" "}
              <strong>
                {adsMetadataLoading
                  ? "Cargando..."
                  : adsMetadata?.id != null
                    ? String(adsMetadata.id)
                    : "Sin metadata ADS"}
              </strong>
            </div>

            <div className="space-y-2">
              <Label htmlFor="constancia">Notas / Archivos</Label>

              {/* Campo de texto para notas */}
              <Textarea
                id="constancia-texto"
                value={constanciaTexto}
                onChange={(e) => setConstanciaTexto(e.target.value)}
                placeholder="Escribe notas, comentarios o instrucciones..."
                rows={3}
                className="resize-none"
              />

              {/* Archivos existentes */}
              {existingConstanciaUrls.length > 0 && (
                <div className="space-y-1 mb-2">
                  {existingConstanciaUrls.map((url, idx) => {
                    const fileName = url.split("/").pop() || "archivo";
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-200"
                      >
                        <span className="text-xs truncate">{fileName}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeExistingUrl(idx)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Nuevos archivos seleccionados */}
              {constanciaFiles.length > 0 && (
                <div className="space-y-1 mb-2">
                  {constanciaFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 bg-blue-50 rounded border border-blue-200"
                    >
                      <span className="text-xs truncate">{file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(idx)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Seleccionar archivos
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="estado"
                checked={estado}
                onCheckedChange={(checked) => setEstado(!!checked)}
              />
              <Label htmlFor="estado" className="cursor-pointer">
                Marcar como resuelto
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
