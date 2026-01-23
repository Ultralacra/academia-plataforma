"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  getTicketComments,
  getInternalNotes,
  type TicketComment,
  type InternalNote,
} from "../api";
import {
  getTicketFiles,
  getTicketFile,
  type TicketFile,
} from "@/app/admin/alumnos/api";
import { apiFetch } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Spinner from "@/components/ui/spinner";
import {
  ArrowLeft,
  Download,
  FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Lock,
  Paperclip,
  Eye,
  Clock,
  CheckCircle,
  Link as LinkIcon,
  History as HistoryIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import VideoPlayer from "@/components/chat/VideoPlayer";
import ObservacionesSection from "../ObservacionesSection";
import { useAuth } from "@/hooks/use-auth";

// Status types y estilos (copiados de TicketsBoard)
type StatusKey =
  | "EN_PROGRESO"
  | "PENDIENTE"
  | "PENDIENTE_DE_ENVIO"
  | "PAUSADO"
  | "RESUELTO";

const STATUS_LABEL: Record<StatusKey, string> = {
  EN_PROGRESO: "En progreso",
  PENDIENTE: "Pendiente",
  PENDIENTE_DE_ENVIO: "Pendiente de envío",
  PAUSADO: "Pausado",
  RESUELTO: "Resuelto",
};

const STATUS_STYLE: Record<StatusKey, string> = {
  PENDIENTE:
    "border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/35 dark:text-blue-200 dark:border-blue-900/60",
  EN_PROGRESO:
    "border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/60",
  PENDIENTE_DE_ENVIO:
    "border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/35 dark:text-sky-200 dark:border-sky-900/60",
  PAUSADO:
    "border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/35 dark:text-purple-200 dark:border-purple-900/60",
  RESUELTO:
    "border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60",
};

function coerceStatus(raw?: string | null): StatusKey {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("RESUELTO") || s.includes("COMPLETO")) return "RESUELTO";
  if (s.includes("ENVIO") || s.includes("ENVÍO")) return "PENDIENTE_DE_ENVIO";
  if (s.includes("PAUSA") || s.includes("PAUSADO")) return "PAUSADO";
  if (
    s.includes("EN_PROGRES") ||
    s.includes("EN_PROCESO") ||
    s.includes("PROCES") ||
    s.includes("EN_CURSO")
  )
    return "EN_PROGRESO";
  if (s.includes("PENDIENTE")) return "PENDIENTE";
  return "PENDIENTE";
}

function mimeFromName(name?: string | null): string | null {
  if (!name) return null;
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    mp4: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    oga: "audio/ogg",
    txt: "text/plain",
    md: "text/markdown",
  };
  return map[ext] ?? null;
}

function TicketDetailContent() {
  const params = useParams();
  const router = useRouter();
  const codigo = typeof params?.codigo === "string" ? params.codigo : "";
  const { user } = useAuth();

  // Determinar si el usuario puede editar
  const isStudent = (user?.role || "").toLowerCase() === "student";
  const canEdit = !isStudent;

  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any>(null);

  const [files, setFiles] = useState<TicketFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const [comments, setComments] = useState<TicketComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [internalNotesLoading, setInternalNotesLoading] = useState(false);

  // Preview de archivos
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Cargar ticket
  useEffect(() => {
    if (!codigo) return;

    async function loadTicket() {
      setLoading(true);
      setError(null);
      try {
        const path = `/ticket/get/ticket/${encodeURIComponent(codigo)}`;
        const json = await apiFetch<any>(path);
        const data = json?.data ?? json;
        if (
          !data ||
          (typeof data === "object" && Object.keys(data).length === 0)
        ) {
          setError("Ticket no encontrado");
        } else {
          setTicket(data);
        }
      } catch (e: any) {
        console.error("Error cargando ticket:", e);
        setError(e?.message || "Error cargando ticket");
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [codigo]);

  // Cargar archivos, comentarios y notas internas cuando tengamos el ticket
  useEffect(() => {
    if (!codigo || !ticket) return;

    // Archivos
    (async () => {
      setFilesLoading(true);
      try {
        const list = await getTicketFiles(codigo);
        setFiles(list);
      } catch (e) {
        console.error("Error cargando archivos:", e);
      } finally {
        setFilesLoading(false);
      }
    })();

    // Comentarios públicos (observaciones)
    (async () => {
      setCommentsLoading(true);
      try {
        const list = await getTicketComments(codigo);
        setComments(list);
      } catch (e) {
        console.error("Error cargando comentarios:", e);
      } finally {
        setCommentsLoading(false);
      }
    })();

    // Notas internas
    (async () => {
      setInternalNotesLoading(true);
      try {
        const list = await getInternalNotes(codigo);
        setInternalNotes(list);
      } catch (e) {
        console.error("Error cargando notas internas:", e);
      } finally {
        setInternalNotesLoading(false);
      }
    })();
  }, [codigo, ticket]);

  // Funciones de descarga y preview
  async function downloadFile(fileId: string, fileName: string) {
    try {
      const fileData = await getTicketFile(fileId);
      if (!fileData.contenido_base64) {
        throw new Error("No hay contenido para descargar");
      }
      const byteChars = atob(fileData.contenido_base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], {
        type: fileData.mime_type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || fileData.nombre_archivo || "archivo";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Error descargando archivo:", e);
    }
  }

  async function openPreview(file: TicketFile) {
    if (previewLoading) return;
    setPreviewFile(file);
    setPreviewOpen(true);
    if (file.url) return;

    setPreviewLoading(true);
    try {
      const data = await getTicketFile(file.id);
      if (data.contenido_base64) {
        const mime =
          data.mime_type ||
          mimeFromName(data.nombre_archivo) ||
          "application/octet-stream";
        const dataUrl = `data:${mime};base64,${data.contenido_base64}`;
        setPreviewFile((prev: any) => ({ ...prev, url: dataUrl }));
      }
    } catch (e) {
      console.error("Error cargando preview:", e);
    } finally {
      setPreviewLoading(false);
    }
  }

  // Helpers
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/tickets-board")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/tickets-board")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="text-slate-600">No se encontró el ticket.</div>
      </div>
    );
  }

  const statusKey = coerceStatus(ticket?.estado ?? ticket?.status);
  const statusLabel = STATUS_LABEL[statusKey];
  const statusStyle = STATUS_STYLE[statusKey];

  const responseText =
    ticket?.respuesta_coach ??
    ticket?.respuestaCoach ??
    ticket?.respuesta ??
    ticket?.respuesta_del_coach ??
    ticket?.coach_response ??
    ticket?.coachResponse ??
    ticket?.feedback ??
    ticket?.solucion ??
    ticket?.solution ??
    "";

  const coaches = ticket?.coaches ?? ticket?.coaches_override ?? [];

  // Links/Tareas
  const taskLinks = (() => {
    const raw = Array.isArray(ticket?.links) ? ticket.links : [];
    return (raw as any[])
      .map((it: any) => {
        if (typeof it === "string") return { id: null, url: it, title: null };
        const url = it?.url || it?.link || it?.enlace || "";
        const title = it?.titulo || it?.title || it?.nombre || null;
        return { id: it?.id ?? null, url, title };
      })
      .filter((t: any) => !!t.url);
  })();

  // Historial de estados
  const estadosHistory = Array.isArray(ticket?.estados) ? ticket.estados : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/tickets-board")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="text-sm text-slate-500">Código: {codigo}</div>
      </div>

      {/* Título y estado */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${statusStyle}`}
            >
              {statusLabel}
            </span>
            <Badge variant="secondary">
              {ticket?.tipo ?? ticket?.type ?? "—"}
            </Badge>
          </div>
          <CardTitle className="text-xl mt-3">
            {ticket?.nombre ?? "Sin título"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid de información */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fecha de creación */}
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
              <div>
                <div className="font-medium text-slate-700">Creación</div>
                <div className="text-slate-600">
                  {formatDate(ticket?.creacion ?? ticket?.created_at)}
                </div>
              </div>
            </div>

            {/* Deadline / Fecha límite */}
            {(ticket?.deadline || ticket?.plazo) && (
              <div className="flex items-start gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-700">Fecha límite</div>
                  <div className="text-slate-600">
                    {ticket?.deadline
                      ? formatDate(ticket.deadline)
                      : ticket?.plazo || "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Fecha de resolución */}
            {(ticket?.fecha_resolucion ||
              ticket?.resolucion ||
              ticket?.resolved_at) && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-700">Resolución</div>
                  <div className="text-slate-600">
                    {formatDate(
                      ticket?.fecha_resolucion ??
                        ticket?.resolucion ??
                        ticket?.resolved_at,
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Alumno */}
            {(ticket?.alumno_nombre || ticket?.alumnoNombre) && (
              <div className="flex items-start gap-2 text-sm">
                <User className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-700">Alumno</div>
                  <div className="text-slate-600">
                    {ticket?.alumno_nombre || ticket?.alumnoNombre}
                  </div>
                </div>
              </div>
            )}

            {/* Informante */}
            {ticket?.informante_nombre && (
              <div className="flex items-start gap-2 text-sm">
                <User className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-700">Informante</div>
                  <div className="text-slate-600">
                    {ticket.informante_nombre}
                  </div>
                </div>
              </div>
            )}

            {/* Resuelto por */}
            {ticket?.resuelto_por_nombre && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-700">Resuelto por</div>
                  <div className="text-slate-600">
                    {ticket.resuelto_por_nombre}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coaches asignados */}
          {Array.isArray(coaches) && coaches.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium text-slate-700">
                Coaches asignados
              </div>
              <div className="flex flex-wrap gap-2">
                {coaches.map((c: any, idx: number) => {
                  const name =
                    typeof c === "string" ? c : (c?.nombre ?? "Coach");
                  const area = typeof c === "string" ? null : c?.area;
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                      title={area ? `${name} · ${area}` : name}
                    >
                      {name}
                      {area ? ` · ${area}` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tareas / Links */}
          {taskLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Tareas / Enlaces
              </div>
              <div className="flex flex-col gap-1">
                {taskLinks.map((t: any, i: number) => (
                  <a
                    key={`task-${t.id ?? i}`}
                    href={t.url.startsWith("http") ? t.url : `https://${t.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate"
                  >
                    {t.title || t.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Estados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Historial de Estados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Último estado */}
          {ticket?.ultimo_estado?.estatus && (
            <div className="mb-3 text-sm text-slate-600">
              <span className="font-medium">Último cambio:</span>{" "}
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                  STATUS_STYLE[coerceStatus(ticket.ultimo_estado.estatus)]
                }`}
              >
                {STATUS_LABEL[coerceStatus(ticket.ultimo_estado.estatus)]}
              </span>
              {ticket?.ultimo_estado?.fecha && (
                <span className="ml-2 text-slate-500">
                  · {formatDate(ticket.ultimo_estado.fecha)}
                </span>
              )}
            </div>
          )}
          {/* Historial completo */}
          {estadosHistory.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {estadosHistory.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 text-sm border-l-2 border-slate-200 pl-3 py-1"
                >
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                      STATUS_STYLE[
                        coerceStatus(e.estatus_id ?? e.estatus ?? e.estado)
                      ]
                    }`}
                  >
                    {
                      STATUS_LABEL[
                        coerceStatus(e.estatus_id ?? e.estatus ?? e.estado)
                      ]
                    }
                  </span>
                  <span className="text-slate-500">
                    {formatDate(e.created_at ?? e.fecha)}
                  </span>
                  {e.user_nombre && (
                    <span className="text-slate-400 text-xs">
                      por {e.user_nombre}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Sin historial de cambios de estado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Descripción */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Descripción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 p-4 rounded border border-slate-100 min-h-[80px]">
            {ticket?.descripcion || (
              <span className="text-slate-400 italic">Sin descripción</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Respuesta del Coach */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Respuesta del Coach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 p-4 rounded border border-slate-100 min-h-[80px]">
            {String(responseText || "").trim() || (
              <span className="text-slate-400 italic">Sin respuesta aún</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Archivos adjuntos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Archivos adjuntos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner className="h-4 w-4" />
              Cargando archivos...
            </div>
          ) : files.length === 0 ? (
            <div className="text-sm text-slate-500">Sin archivos adjuntos.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((f, idx) => {
                const mime =
                  f.mime_type || mimeFromName(f.nombre_archivo) || "";
                const isImage = mime.startsWith("image/");
                const isVideo = mime.startsWith("video/");
                const isAudio = mime.startsWith("audio/");
                return (
                  <div
                    key={f.id || idx}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="shrink-0">
                      {isImage ? (
                        <FileImage className="h-6 w-6 text-emerald-600" />
                      ) : isVideo ? (
                        <FileVideo className="h-6 w-6 text-purple-600" />
                      ) : isAudio ? (
                        <FileAudio className="h-6 w-6 text-amber-600" />
                      ) : (
                        <FileIcon className="h-6 w-6 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        title={f.nombre_archivo}
                      >
                        {f.nombre_archivo || "Archivo"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {f.tamano_bytes
                          ? `${(f.tamano_bytes / 1024).toFixed(1)} KB`
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => downloadFile(f.id, f.nombre_archivo)}
                        title="Descargar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => openPreview(f)}
                        title="Ver"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observaciones (comentarios públicos) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Observaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commentsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner className="h-4 w-4" />
              Cargando observaciones...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-slate-500">Sin observaciones.</div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg bg-slate-50 border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-sm text-slate-700">
                      {c.user_nombre || "Usuario"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(c.created_at)}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-800">
                    {c.contenido || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notas internas (solo para equipo/admin) */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <Lock className="h-4 w-4" />
            Notas internas (Privado)
          </CardTitle>
          <p className="text-xs text-amber-600">Solo visible para el equipo</p>
        </CardHeader>
        <CardContent>
          {internalNotesLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner className="h-4 w-4" />
              Cargando notas internas...
            </div>
          ) : internalNotes.length === 0 ? (
            <div className="text-sm text-slate-500">Sin notas internas.</div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {internalNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg bg-white border border-amber-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-sm text-slate-700">
                      {n.user_nombre || "Usuario"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-800">
                    {n.contenido || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sección de Observaciones 2.3 */}
          <Separator className="my-4" />
          <ObservacionesSection
            ticketCode={codigo}
            alumnoId={ticket?.id_alumno || ticket?.alumno_id || ""}
            coachId={String(user?.codigo || user?.id || "")}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      {/* Dialog de preview de archivos */}
      <Dialog
        open={previewOpen}
        onOpenChange={(v) => {
          setPreviewOpen(v);
          if (!v) setPreviewFile(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {previewFile?.nombre_archivo || "Previsualización"}
            </DialogTitle>
            <DialogDescription>Vista previa del archivo.</DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              Cargando previsualización…
            </div>
          ) : previewFile?.url ? (
            <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
              {(() => {
                const m =
                  previewFile?.mime_type ||
                  mimeFromName(previewFile?.nombre_archivo) ||
                  "";
                if (m.startsWith("image/")) {
                  return (
                    <img
                      src={previewFile.url || "/placeholder.svg"}
                      alt={previewFile.nombre_archivo || "imagen"}
                      className="mx-auto max-h-[65vh] rounded-md"
                    />
                  );
                }
                if (m === "application/pdf") {
                  return (
                    <iframe
                      src={previewFile.url}
                      className="h-[65vh] w-full rounded-md"
                      title="PDF"
                    />
                  );
                }
                if (m.startsWith("video/")) {
                  return (
                    <VideoPlayer
                      src={previewFile.url}
                      className="mx-auto max-h-[65vh] rounded-md"
                    />
                  );
                }
                if (m.startsWith("audio/")) {
                  return (
                    <audio src={previewFile.url} controls className="w-full" />
                  );
                }
                if (m.startsWith("text/")) {
                  return (
                    <iframe
                      src={previewFile.url}
                      className="h-[65vh] w-full rounded-md bg-white"
                      title="Texto"
                    />
                  );
                }
                return (
                  <div className="text-center py-8 text-slate-500">
                    <p className="mb-4">
                      Este tipo de archivo no tiene vista previa.
                    </p>
                    <Button
                      onClick={() =>
                        downloadFile(previewFile.id, previewFile.nombre_archivo)
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              No se pudo cargar el archivo
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <TicketDetailContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
