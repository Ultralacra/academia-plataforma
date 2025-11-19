"use client";

import type React from "react";

import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getTickets, type TicketBoardItem, reassignTicket } from "./api";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";
import { toast } from "@/components/ui/use-toast";

import {
  Search,
  CalendarIcon,
  FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  RefreshCw,
  Download,
  Eye,
  Paperclip,
  Clock,
  Users,
  CheckCircle2,
  User,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import Spinner from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Select removed for Estado/Prioridad (fields will be hidden)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getTicketFiles,
  getTicketFile,
  updateTicket,
  uploadTicketFiles,
  deleteTicketFile,
  deleteTicket,
} from "@/app/admin/alumnos/api";
import { getCoaches, type CoachItem } from "@/app/admin/teamsv2/api";

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
  PENDIENTE: "bg-blue-50 text-blue-700 border-blue-200",
  EN_PROGRESO: "bg-amber-50 text-amber-700 border-amber-200",
  PENDIENTE_DE_ENVIO: "bg-sky-50 text-sky-700 border-sky-200",
  PAUSADO: "bg-purple-50 text-purple-700 border-purple-200",
  RESUELTO: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

function shortenFileName(name: string, max = 42) {
  if (!name) return "archivo";
  if (name.length <= max) return name;
  const parts = name.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()}` : "";
  const base = parts.join(".");
  const keep = Math.max(6, max - ext.length - 3);
  return base.slice(0, keep) + "…" + ext;
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

export default function TicketsBoard() {
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const [tickets, setTickets] = useState<TicketBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [coachFiltro, setCoachFiltro] = useState<string>("");
  const [openFiles, setOpenFiles] = useState<null | string>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<
    {
      id: string;
      nombre_archivo: string;
      mime_type: string | null;
      tamano_bytes: number | null;
      created_at: string | null;
    }[]
  >([]);
  const [blobCache, setBlobCache] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<null | {
    id: string;
    nombre_archivo: string;
    mime_type: string | null;
    url?: string;
  }>(null);

  const [selectedTicket, setSelectedTicket] = useState<TicketBoardItem | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"general" | "detalle">("general");
  const [ticketDetail, setTicketDetail] = useState<any | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [ticketDetailError, setTicketDetailError] = useState<string | null>(
    null
  );

  // Helpers: URLs y formato
  const isLikelyUrl = (s: string) =>
    /^(https?:\/\/|www\.)\S+$/i.test(String(s || "").trim());
  const normalizeUrl = (s: string) => {
    const str = String(s || "").trim();
    if (!str) return "";
    return str.startsWith("http://") || str.startsWith("https://")
      ? str
      : `https://${str}`;
  };
  const extractUrlsFromDescription = (desc?: string | null) => {
    const text = String(desc || "");
    if (!text) return [] as string[];
    // Buscar URLs en cualquier parte del texto
    const re = /(https?:\/\/[^\s,]+|www\.[^\s,]+)/gi;
    const found = text.match(re) || [];
    const clean = found.map((u) => u.trim()).filter((u) => isLikelyUrl(u));
    // Dedupe
    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const u of clean) {
      const k = u.toLowerCase();
      if (!seen.has(k)) {
        uniq.push(u);
        seen.add(k);
      }
    }
    return uniq;
  };

  type ExtraDetails = {
    prioridad?: "BAJA" | "MEDIA" | "ALTA";
    plazo?: number | null;
    restante?: number | null;
    informante?: string;
    resuelto_por?: string;
    tarea?: string;
    equipo?: string[];
  };

  const [editForm, setEditForm] = useState<
    ExtraDetails & {
      nombre?: string | null;
      estado?: StatusKey | string | null;
      deadline?: string | null;
    }
  >({});

  const [editFiles, setEditFiles] = useState<File[]>([]);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  // Audio recording and URL states
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  // Links genéricos (antes: audio URLs)
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [newAudioUrl, setNewAudioUrl] = useState<string>("");
  const [fileToDelete, setFileToDelete] = useState<null | {
    id: string;
    nombre_archivo: string;
  }>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  // Reasignar ticket
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignCoach, setReassignCoach] = useState<string>("");
  const [reassignConfirmOpen, setReassignConfirmOpen] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(false);
  // Control para expandir lista completa de archivos en el panel de edición
  const [showAllFiles, setShowAllFiles] = useState(false);
  // Edición de descripción (pestaña Detalle)
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  const [fechaDesde, setFechaDesde] = useState<string>(todayStr);
  const [fechaHasta, setFechaHasta] = useState<string>(todayStr);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getCoaches({ page: 1, pageSize: 10000 });
        if (!mounted) return;
        setCoaches(list);
      } catch (e) {
        console.error(e);
        setCoaches([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await getTickets({
          page: 1,
          pageSize: 500,
          search,
          fechaDesde,
          fechaHasta,
          coach: coachFiltro || undefined,
        });
        if (!mounted) return;
        setTickets(res.items ?? []);
      } catch (e) {
        console.error(e);
        toast({ title: "Error cargando tickets" });
        setTickets([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [search, fechaDesde, fechaHasta, coachFiltro]);

  // Snackbar inicial avisando sobre tickets en PAUSADO
  const didShowPausedToast = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (didShowPausedToast.current) return;
    const pausedCount = tickets.filter(
      (t) => coerceStatus(t.estado) === "PAUSADO"
    ).length;
    if (pausedCount > 0) {
      didShowPausedToast.current = true;
      toast({
        title: "Tickets pausados requieren atención",
        description: `Tienes ${pausedCount} ticket(s) en Pausado. Revisa y envía la información correspondiente.`,
      });
    }
  }, [loading, tickets]);

  const estados = useMemo(() => {
    return [
      "PENDIENTE",
      "EN_PROGRESO",
      "PAUSADO",
      "PENDIENTE_DE_ENVIO",
      "RESUELTO",
    ] as string[];
  }, []);

  function handleDragStart(e: React.DragEvent, ticketId: number) {
    try {
      e.dataTransfer.setData("text/plain", String(ticketId));
    } catch {}
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetEstado: string) {
    e.preventDefault();
    const id =
      e.dataTransfer.getData("text/ticket-id") ||
      e.dataTransfer.getData("text/plain");
    if (!id) return;
    const tid = Number(id);
    setTickets((prev) =>
      prev.map((t) => (t.id === tid ? { ...t, estado: targetEstado } : t))
    );
    const tk = tickets.find((t) => t.id === tid);
    const codigo = tk?.codigo ?? null;
    if (!codigo) return;
    updateTicket(codigo, { estado: targetEstado })
      .then(() => {
        // Notificación local: cambio de estado
        try {
          const title = `Ticket actualizado: ${tk?.nombre || codigo} → ${
            STATUS_LABEL[coerceStatus(targetEstado)]
          }`;
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("ticket:notify", {
                detail: {
                  title,
                  ticketId: codigo,
                  previous: undefined,
                  current: coerceStatus(targetEstado),
                  at: new Date().toISOString(),
                },
              })
            );
          }
        } catch {}
        toast({ title: `Ticket actualizado` });
      })
      .catch(async (err) => {
        console.error(err);
        toast({ title: "Error al actualizar ticket" });
        try {
          const res = await getTickets({
            page: 1,
            pageSize: 500,
            search,
            fechaDesde,
            fechaHasta,
          });
          setTickets(res.items ?? []);
        } catch {}
      });
  }

  async function openFilesFor(ticket: TicketBoardItem) {
    const code = ticket.codigo || null;
    if (!code) return;
    try {
      setOpenFiles(code);
      setFilesLoading(true);
      const list = await getTicketFiles(code);
      setFiles(list);
    } catch (e) {
      console.error(e);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }

  async function downloadFile(fileId: string, nombre: string) {
    try {
      const f = await getTicketFile(fileId);
      const b = Uint8Array.from(atob(f.contenido_base64), (c) =>
        c.charCodeAt(0)
      );
      const blob = new Blob([b], {
        type: f.mime_type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre || f.nombre_archivo || "archivo";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  async function openPreview(f: {
    id: string;
    nombre_archivo: string;
    mime_type: string | null;
  }) {
    try {
      setPreviewOpen(true);
      setPreviewLoading(true);
      const cached = blobCache[f.id];
      if (cached) {
        setPreviewFile({ ...f, url: cached });
        return;
      }
      const res = await getTicketFile(f.id);
      const b = Uint8Array.from(atob(res.contenido_base64), (c) =>
        c.charCodeAt(0)
      );
      const blob = new Blob([b], {
        type: res.mime_type || f.mime_type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      setBlobCache((prev) => ({ ...prev, [f.id]: url }));
      setPreviewFile({ ...f, url });
    } catch (e) {
      console.error(e);
      setPreviewFile({ ...f });
    } finally {
      setPreviewLoading(false);
    }
  }

  function clearPreviewCache() {
    Object.values(blobCache).forEach((u) => URL.revokeObjectURL(u));
    setBlobCache({});
  }

  // Recording helpers
  async function startRecording() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({ title: "Tu navegador no soporta grabación de audio" });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      let recordedType = "";
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) {
          chunks.push(ev.data);
          // ev.data is a Blob
          try {
            recordedType = (ev.data as Blob).type || recordedType;
          } catch {}
        }
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: recordedType || "audio/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        // stop tracks
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      toast({ title: "Grabación iniciada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error iniciando grabación" });
    }
  }

  function stopRecording() {
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      console.error(e);
    }
    setIsRecording(false);
    toast({ title: "Grabación finalizada" });
  }

  function addRecordedToFiles() {
    if (!recordedBlob) return;
    const ext = recordedBlob.type?.includes("audio/ogg") ? "ogg" : "webm";
    const file = new File([recordedBlob], `grabacion-${Date.now()}.${ext}`, {
      type: recordedBlob.type || "audio/webm",
    });
    setEditFiles((prev) => [...prev, file]);
    // cleanup preview URL
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    toast({ title: "Grabación añadida a archivos" });
  }

  function addAudioUrl() {
    const v = (newAudioUrl || "").trim();
    if (!v) return;
    setAudioUrls((prev) => [v, ...prev]);
    setNewAudioUrl("");
    toast({ title: "Link agregado (pendiente de guardar)" });
  }

  function removeAudioUrl(idx: number) {
    setAudioUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  // Guardar los links en la descripción del ticket bajo la línea "URLs: ..."
  async function saveLinksToDescription() {
    if (!selectedTicket?.codigo) return;
    const toAdd = audioUrls
      .map((u) => String(u || "").trim())
      .filter((u) => !!u && isLikelyUrl(u));
    if (toAdd.length === 0) return;

    // Partimos de la descripción actual del detalle si está cargado
    const currentDesc = String(ticketDetail?.descripcion || "");

    // Extraer URLs existentes y limpiar líneas previas de "URLs:"
    const existing = extractUrlsFromDescription(currentDesc);
    const lines = currentDesc.split(/\r?\n/);
    const filteredLines = lines.filter((ln) => !/^\s*URLs\s*:/i.test(ln));

    // Unir y deduplicar
    const all = [...existing, ...toAdd];
    const seen = new Set<string>();
    const deduped = all.filter((u) => {
      const k = u.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Construir nueva descripción
    const base = filteredLines.join("\n").trim();
    const urlsLine = deduped.length > 0 ? `URLs: ${deduped.join(", ")}` : "";
    const newDesc = base ? `${base}\n\n${urlsLine}` : urlsLine;

    try {
      await updateTicket(selectedTicket.codigo, {
        descripcion: newDesc,
      } as any);
      toast({ title: "Links guardados en la descripción" });
      // Recargar el detalle para reflejar los cambios
      await loadTicketDetail(selectedTicket.codigo);
      // Limpiar lista local
      setAudioUrls([]);
      setNewAudioUrl("");
    } catch (e) {
      console.error(e);
      toast({ title: "Error al guardar links" });
    }
  }

  function openTicketDetail(ticket: TicketBoardItem) {
    // Resolver nombres legibles para informante y resuelto_por cuando la API
    // entrega solo IDs. Preferimos los campos *_nombre y, si faltan, buscamos
    // coincidencias en alumno/coaches.
    const resolvePersonName = (code?: string | null, name?: string | null) => {
      const c = (code ?? "").trim();
      if (name && name.trim()) return String(name);
      if (!c) return "";
      try {
        // Si coincide con el alumno, usar alumno_nombre
        if ((ticket as any)?.id_alumno && (ticket as any)?.id_alumno === c) {
          return (ticket as any)?.alumno_nombre || c;
        }
        // Si coincide con un coach/equipo, usar su nombre
        const coachesArr = (ticket as any)?.coaches;
        if (Array.isArray(coachesArr)) {
          const found = coachesArr.find((co: any) => co?.codigo_equipo === c);
          if (found?.nombre) return String(found.nombre);
        }
      } catch {}
      // Fallback: devolver el código si no se puede resolver
      return c;
    };

    setSelectedTicket(ticket);
    setEditForm({
      nombre: ticket.nombre ?? "",
      estado: (ticket.estado as any) ?? "PENDIENTE",
      deadline: ticket.deadline ?? null,
      prioridad: "MEDIA",
      plazo: null,
      restante: null,
      // Mostrar SIEMPRE nombres cuando sea posible
      informante: resolvePersonName(
        (ticket as any)?.informante,
        (ticket as any)?.informante_nombre
      ),
      resuelto_por: resolvePersonName(
        (ticket as any)?.resuelto_por,
        (ticket as any)?.resuelto_por_nombre
      ),
      equipo: [],
      tarea: "",
    });
    setEditFiles([]);
    setAudioUrls([]);
    setNewAudioUrl("");
    setDrawerOpen(true);
    if (ticket.codigo) {
      loadFilesForTicket(ticket.codigo);
      setDetailTab("general");
      loadTicketDetail(ticket.codigo);
    }
    setShowAllFiles(false);
  }

  async function loadTicketDetail(codigo: string) {
    try {
      setTicketDetailLoading(true);
      setTicketDetailError(null);
      setTicketDetail(null);
      const url = buildUrl(`/ticket/get/ticket/${encodeURIComponent(codigo)}`);
      const token = typeof window !== "undefined" ? getAuthToken() : null;
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = await res.json().catch(() => ({}));
      setTicketDetail(json?.data ?? json ?? null);
    } catch (e: any) {
      setTicketDetailError(
        String(e?.message || e || "Error al cargar detalle")
      );
    } finally {
      setTicketDetailLoading(false);
    }
  }

  async function loadFilesForTicket(codigo: string) {
    try {
      setFilesLoading(true);
      const list = await getTicketFiles(codigo);
      setFiles(list);
    } catch (e) {
      console.error(e);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }

  async function confirmDeleteFile() {
    if (!fileToDelete) return;
    try {
      setDeletingFile(true);
      await deleteTicketFile(fileToDelete.id);
      toast({ title: "Archivo eliminado" });
      if (selectedTicket?.codigo)
        await loadFilesForTicket(selectedTicket.codigo);
      setFileToDelete(null);
    } catch (e) {
      console.error(e);
      toast({ title: "Error eliminando archivo" });
    } finally {
      setDeletingFile(false);
    }
  }

  async function saveTicketChanges() {
    if (!selectedTicket?.codigo) return;
    try {
      // Construir nueva descripción con links (audioUrls) si existen, anteponiendo contenido previo
      let currentDesc = String(ticketDetail?.descripcion || "").trim();
      // Eliminar líneas previas de URLs para evitar duplicados
      const lines = currentDesc
        .split(/\r?\n/)
        .filter((ln) => !/^\s*URLs\s*:/i.test(ln));
      currentDesc = lines.join("\n").trim();
      const existingUrls =
        extractUrlsFromDescription(ticketDetail?.descripcion) || [];
      const newUrls = audioUrls
        .map((u) => u.trim())
        .filter((u) => !!u && isLikelyUrl(u));
      const allUrlsSet = new Set<string>();
      const allUrls: string[] = [];
      [...existingUrls, ...newUrls].forEach((u) => {
        const k = u.toLowerCase();
        if (!allUrlsSet.has(k)) {
          allUrlsSet.add(k);
          allUrls.push(u);
        }
      });
      const urlsLine = allUrls.length > 0 ? `URLs: ${allUrls.join(", ")}` : "";
      const finalDescripcion = [currentDesc, urlsLine]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 4000);

      // Subir archivos seleccionados (incluye audios grabados) antes de actualizar metadata
      if (editFiles.length > 0) {
        try {
          await uploadTicketFiles(selectedTicket.codigo, editFiles);
          toast({ title: "Archivos subidos" });
          setEditFiles([]);
          await loadFilesForTicket(selectedTicket.codigo);
        } catch (e) {
          console.error(e);
          toast({ title: "Error subiendo archivos" });
        }
      }

      await updateTicket(selectedTicket.codigo, {
        nombre: editForm.nombre,
        // ensure we only send a string or undefined
        estado:
          typeof editForm.estado === "string" ? editForm.estado : undefined,
        deadline: editForm.deadline ?? undefined,
        descripcion: finalDescripcion || undefined,
      } as any);
      // Notificación local: guardado de cambios (incluye estado si cambia)
      try {
        const current =
          typeof editForm.estado === "string"
            ? coerceStatus(editForm.estado)
            : undefined;
        const title = `Ticket actualizado: ${
          editForm.nombre || selectedTicket.nombre || selectedTicket.codigo
        }${current ? ` → ${STATUS_LABEL[current]}` : ""}`;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ticket:notify", {
              detail: {
                title,
                ticketId: selectedTicket.codigo,
                previous: undefined,
                current,
                at: new Date().toISOString(),
              },
            })
          );
        }
      } catch {}
      toast({ title: "Ticket actualizado correctamente" });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? {
                ...t,
                nombre: editForm.nombre ?? t.nombre,
                estado: editForm.estado ?? t.estado,
                deadline: editForm.deadline ?? t.deadline,
                // No almacenamos descripcion aquí; se mostrará en detalle recargado
              }
            : t
        )
      );
      // Recargar detalle para reflejar nueva descripción y links
      await loadTicketDetail(selectedTicket.codigo);
      setAudioUrls([]);
      setNewAudioUrl("");
      setDrawerOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error al actualizar ticket" });
    }
  }

  function iconFor(mime: string | null, name?: string) {
    const m = mime || mimeFromName(name) || "";
    if (m.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    if (m.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
    if (m.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
    if (m === "application/pdf") return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Tablero de Tickets
          </h1>
          <p className="text-sm text-slate-600">
            Arrastra y suelta tickets entre columnas para cambiar su estado
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
              placeholder="Buscar asunto, alumno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro por fecha: Desde */}
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all min-w-[160px]"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(e) => {
                const v = e.target.value;
                setFechaDesde(v);
                // Si 'Desde' supera a 'Hasta', ajustamos 'Hasta'
                if (fechaHasta && v && v > fechaHasta) {
                  setFechaHasta(v);
                }
              }}
              title="Fecha desde"
            />
          </div>

          {/* Filtro por fecha: Hasta */}
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all min-w-[160px]"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(e) => {
                const v = e.target.value;
                setFechaHasta(v);
                // Si 'Hasta' queda antes de 'Desde', ajustamos 'Desde'
                if (fechaDesde && v && v < fechaDesde) {
                  setFechaDesde(v);
                }
              }}
              title="Fecha hasta"
            />
          </div>

          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all min-w-[180px]"
            value={coachFiltro}
            onChange={(e) => setCoachFiltro(e.target.value)}
            title="Filtrar por coach/equipo"
          >
            <option value="">Todos los coaches</option>
            {coaches.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.nombre}
                {c.area ? ` · ${c.area}` : ""}
              </option>
            ))}
          </select>
          <Button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await getTickets({
                  page: 1,
                  pageSize: 500,
                  search,
                  fechaDesde,
                  fechaHasta,
                  coach: coachFiltro || undefined,
                });
                setTickets(res.items ?? []);
                toast({ title: "Tickets recargados" });
              } catch (e) {
                toast({ title: "Error al recargar" });
              } finally {
                setLoading(false);
              }
            }}
            variant="outline"
            size="sm"
            className="h-9 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-slate-500">
          Cargando tickets...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {estados.map((estado) => {
            const itemsForCol = tickets.filter(
              (t) => coerceStatus(t.estado) === (estado as StatusKey)
            );
            return (
              <div
                key={estado}
                className="flex min-h-[400px] flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${
                        STATUS_STYLE[estado as StatusKey]
                      }`}
                    >
                      {STATUS_LABEL[estado as StatusKey]}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {itemsForCol.length}
                    </span>
                  </div>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, estado)}
                  className="flex-1 space-y-3"
                >
                  {itemsForCol.length === 0 ? (
                    <div className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
                      Sin tickets
                    </div>
                  ) : (
                    itemsForCol.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => openTicketDetail(t)}
                        className={
                          "group rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md cursor-pointer " +
                          (coerceStatus(t.estado) === "PAUSADO"
                            ? "border-amber-300 ring-1 ring-amber-200"
                            : "border-slate-200")
                        }
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="flex-1 text-sm font-medium leading-snug text-slate-900">
                              {t.nombre ?? "Ticket"}
                            </h3>
                            <span
                              className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                STATUS_STYLE[coerceStatus(t.estado)]
                              }`}
                            >
                              {STATUS_LABEL[coerceStatus(t.estado)]}
                            </span>
                          </div>

                          {coerceStatus(t.estado) === "PAUSADO" && (
                            <div className="flex items-center gap-1.5 text-amber-700">
                              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[11px] font-medium">
                                Requiere atención
                              </span>
                            </div>
                          )}

                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {t.created_at
                                  ? new Date(t.created_at).toLocaleDateString(
                                      "es-ES",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )
                                  : "—"}
                              </span>
                            </div>
                            {t.tipo && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-slate-400" />
                                <span>{t.tipo}</span>
                              </div>
                            )}
                            {t.deadline && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-slate-400" />
                                <span>
                                  Vence:{" "}
                                  {new Date(t.deadline).toLocaleDateString(
                                    "es-ES",
                                    { day: "numeric", month: "short" }
                                  )}
                                </span>
                              </div>
                            )}
                            {t.codigo && (
                              <button
                                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openFilesFor(t);
                                }}
                                type="button"
                              >
                                <FileIcon className="h-3.5 w-3.5" />
                                <span className="underline decoration-slate-300 hover:decoration-slate-900">
                                  Ver archivos
                                </span>
                              </button>
                            )}
                          </div>

                          {Array.isArray((t as any).coaches) &&
                            (t as any).coaches.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {(t as any).coaches
                                  .slice(0, 3)
                                  .map((c: any, idx: number) => (
                                    <span
                                      key={`${
                                        c.codigo_equipo ?? c.nombre ?? idx
                                      }`}
                                      className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-200"
                                      title={`${c.nombre ?? "Coach"}${
                                        c.area ? ` · ${c.area}` : ""
                                      }${c.puesto ? ` · ${c.puesto}` : ""}`}
                                    >
                                      {(c.nombre ?? "Coach").slice(0, 20)}
                                      {c.area
                                        ? ` · ${String(c.area).slice(0, 10)}`
                                        : ""}
                                    </span>
                                  ))}
                                {((t as any).coaches?.length ?? 0) > 3 && (
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                    +{(t as any).coaches.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                          {(t as any).ultimo_estado?.estatus && (
                            <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                              Último:{" "}
                              {
                                STATUS_LABEL[
                                  coerceStatus((t as any).ultimo_estado.estatus)
                                ]
                              }
                              {(t as any).ultimo_estado?.fecha && (
                                <>
                                  {" · "}
                                  {new Date(
                                    (t as any).ultimo_estado.fecha
                                  ).toLocaleDateString("es-ES", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!openFiles}
        onOpenChange={(v) => {
          if (!v) {
            setOpenFiles(null);
            clearPreviewCache();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Archivos adjuntos
            </DialogTitle>
          </DialogHeader>
          {filesLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              Cargando archivos…
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileIcon className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">No hay archivos adjuntos</p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="group rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="mx-auto mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-slate-50">
                        {(() => {
                          const m =
                            f.mime_type || mimeFromName(f.nombre_archivo);
                          if (m?.startsWith("image/")) {
                            const thumb = blobCache[f.id];
                            return thumb ? (
                              <img
                                src={thumb || "/placeholder.svg"}
                                alt={f.nombre_archivo}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FileImage className="h-10 w-10 text-slate-400" />
                            );
                          }
                          if (m === "application/pdf") {
                            return (
                              <FileText className="h-10 w-10 text-slate-400" />
                            );
                          }
                          if (m?.startsWith("video/")) {
                            return (
                              <FileVideo className="h-10 w-10 text-slate-400" />
                            );
                          }
                          if (m?.startsWith("audio/")) {
                            return (
                              <FileAudio className="h-10 w-10 text-slate-400" />
                            );
                          }
                          return (
                            <FileIcon className="h-10 w-10 text-slate-400" />
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="truncate text-sm font-medium text-slate-900"
                              title={f.nombre_archivo}
                            >
                              {shortenFileName(f.nombre_archivo, 24)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs break-all"
                          >
                            {f.nombre_archivo}
                          </TooltipContent>
                        </Tooltip>
                        <div className="text-xs text-slate-500">
                          {(f.mime_type || "").split(";")[0].split("/")[1] ||
                            "archivo"}
                          {f.tamano_bytes &&
                            ` · ${Math.round(f.tamano_bytes / 1024)} KB`}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => downloadFile(f.id, f.nombre_archivo)}
                            aria-label={`Descargar ${f.nombre_archivo}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openPreview(f)}
                            aria-label={`Ver ${f.nombre_archivo}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipProvider>
          )}
        </DialogContent>
      </Dialog>

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
                    <video
                      src={previewFile.url}
                      controls
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
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileIcon className="mb-3 h-12 w-12 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      No se puede previsualizar este tipo de archivo
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Descárgalo para verlo
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileIcon className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">
                No hay previsualización disponible
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación antes de eliminar archivo */}
      <Dialog
        open={!!fileToDelete}
        onOpenChange={(v) => {
          if (!v) setFileToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-700">
              ¿Estás seguro que quieres eliminar el archivo{" "}
              <strong>{fileToDelete?.nombre_archivo}</strong>? Esta acción no se
              puede deshacer.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFileToDelete(null)}
              disabled={deletingFile}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteFile}
              disabled={deletingFile}
            >
              {deletingFile ? "Eliminando..." : "Eliminar archivo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl flex flex-col overflow-hidden"
        >
          <SheetHeader className="border-b pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <SheetTitle className="text-lg">
                  {editForm.nombre || "Detalle del ticket"}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {selectedTicket?.codigo && (
                    <span className="text-xs text-slate-500">
                      Código: {selectedTicket.codigo}
                    </span>
                  )}
                </SheetDescription>
              </div>
              <div className="shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selectedTicket?.codigo) return;
                    setReassignCoach("");
                    setReassignOpen(true);
                  }}
                  disabled={!selectedTicket?.codigo}
                >
                  Reasignar ticket
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {!selectedTicket ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Selecciona un ticket
              </div>
            ) : (
              <>
                <div className="px-6 pt-4">
                  <div className="inline-flex items-center rounded-md border bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDetailTab("general")}
                      className={`px-3 py-1.5 text-xs ${
                        detailTab === "general"
                          ? "bg-slate-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Editar campos"
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab("detalle")}
                      className={`px-3 py-1.5 text-xs border-l ${
                        detailTab === "detalle"
                          ? "bg-slate-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Detalle del ticket (API)"
                    >
                      Detalle
                    </button>
                  </div>
                </div>

                <div className={detailTab === "general" ? "block" : "hidden"}>
                  <div className="p-6 space-y-6">
                    {coerceStatus(editForm.estado as any) === "PAUSADO" && (
                      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          Este ticket está pausado y requiere acción. Por favor
                          envía la información correspondiente.
                        </div>
                        <div className="ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              try {
                                editFileInputRef.current?.click();
                              } catch {}
                            }}
                          >
                            Adjuntar ahora
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Título */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-nombre"
                        className="text-sm font-medium"
                      >
                        Título del ticket
                      </Label>
                      <Input
                        id="edit-nombre"
                        className="h-10"
                        value={editForm.nombre ?? ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, nombre: e.target.value }))
                        }
                        placeholder="Nombre o asunto"
                      />
                    </div>

                    {/* Personas involucradas */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4 text-slate-500" />
                        Personas involucradas
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-informante" className="text-sm">
                            Informante
                          </Label>
                          <Input
                            id="edit-informante"
                            className="h-10 bg-slate-50 cursor-not-allowed"
                            value={editForm.informante ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                informante: e.target.value,
                              }))
                            }
                            placeholder="Nombre del informante"
                            disabled
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="edit-resuelto-por"
                            className="text-sm"
                          >
                            Resuelto por
                          </Label>
                          <Input
                            id="edit-resuelto-por"
                            className="h-10 bg-slate-50 cursor-not-allowed"
                            value={editForm.resuelto_por ?? ""}
                            placeholder="Nombre de quien resolvió"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Se eliminó la sección 'Equipo asignado' según solicitud */}

                    {/* 'Trabajo y resolución' eliminado del modal según solicitud del usuario */}
                    <Separator />

                    {/* Archivos (adjuntos + upload + recorder) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Paperclip className="h-4 w-4 text-slate-500" />
                          Archivos adjuntos
                        </div>
                      </div>

                      {filesLoading ? (
                        <div className="flex items-center justify-center py-8 text-slate-500">
                          Cargando archivos...
                        </div>
                      ) : files.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">
                            {files.length} archivo(s) existente(s)
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(showAllFiles ? files : files.slice(0, 8)).map(
                              (f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3"
                                >
                                  <div className="flex h-10 w-10 flex-none shrink-0 items-center justify-center rounded bg-white">
                                    {iconFor(f.mime_type, f.nombre_archivo)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className="truncate text-sm font-medium"
                                      title={f.nombre_archivo}
                                    >
                                      {shortenFileName(f.nombre_archivo, 15)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {f.tamano_bytes
                                        ? `${Math.ceil(
                                            f.tamano_bytes / 1024
                                          )} KB`
                                        : "—"}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() =>
                                        downloadFile(f.id, f.nombre_archivo)
                                      }
                                      aria-label={`Descargar ${f.nombre_archivo}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => openPreview(f)}
                                      aria-label={`Ver ${f.nombre_archivo}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() =>
                                        setFileToDelete({
                                          id: f.id,
                                          nombre_archivo: f.nombre_archivo,
                                        })
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                          {files.length > 8 && !showAllFiles && (
                            <button
                              type="button"
                              onClick={() => setShowAllFiles(true)}
                              className="text-xs text-slate-600 text-center pt-2 w-full hover:underline"
                            >
                              +{files.length - 8} más
                            </button>
                          )}
                          {showAllFiles && files.length > 8 && (
                            <button
                              type="button"
                              onClick={() => setShowAllFiles(false)}
                              className="text-xs text-slate-600 text-center pt-2 w-full hover:underline"
                            >
                              Mostrar menos
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-2">
                            <FileIcon className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">
                            No hay archivos adjuntos
                          </p>
                        </div>
                      )}

                      {/* Links detectados en la descripción (clicables) */}
                      {(() => {
                        const urlList: string[] = [
                          ...extractUrlsFromDescription(
                            ticketDetail?.descripcion
                          ),
                          ...((Array.isArray(ticketDetail?.links)
                            ? ticketDetail.links
                            : []) as string[]),
                        ];
                        const seen = new Set<string>();
                        const links = urlList.filter((u) => {
                          const k = String(u || "").toLowerCase();
                          if (!k) return false;
                          if (seen.has(k)) return false;
                          seen.add(k);
                          return true;
                        });
                        return links.length > 0 ? (
                          <div className="mt-3">
                            <div className="text-sm font-medium">Links</div>
                            <div className="mt-1 flex flex-col gap-1">
                              {links.map((u, i) => (
                                <a
                                  key={`gen-links-${i}`}
                                  href={normalizeUrl(u)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-600 underline break-all text-sm"
                                >
                                  {u}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <Separator />

                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Adjuntar nuevos archivos
                        </Label>
                        <input
                          ref={editFileInputRef}
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const picked = Array.from(e.target.files ?? []);
                            if (!picked.length) return;
                            setEditFiles((prev) =>
                              [...prev, ...picked].slice(0, 10)
                            );
                            e.currentTarget.value = "";
                          }}
                        />
                        <Button
                          variant="outline"
                          className="w-full gap-2 bg-transparent"
                          onClick={() => editFileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" /> Seleccionar archivos
                        </Button>

                        {/* Grabador de audio y URLs */}
                        <div className="space-y-3 pt-3">
                          <Label className="text-sm font-medium">
                            Grabar audio
                          </Label>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={isRecording ? "destructive" : "outline"}
                              onClick={() => {
                                if (isRecording) stopRecording();
                                else startRecording();
                              }}
                            >
                              {isRecording ? "Detener" : "Grabar"}
                            </Button>
                            {isRecording && (
                              <div className="voice-visualizer" aria-hidden>
                                <span className="bar" />
                                <span className="bar" />
                                <span className="bar" />
                                <span className="bar" />
                                <span className="bar" />
                              </div>
                            )}
                            {recordedUrl && (
                              <audio
                                src={recordedUrl}
                                controls
                                className="h-8"
                              />
                            )}
                            {recordedBlob && (
                              <Button size="sm" onClick={addRecordedToFiles}>
                                Añadir grabación a archivos
                              </Button>
                            )}
                          </div>
                          <div className="pt-2">
                            <Label className="text-sm font-medium">
                              Agregar link (se guardará en la descripción)
                            </Label>
                            <div className="flex items-center gap-2 pt-2">
                              <Input
                                placeholder="https://..."
                                value={newAudioUrl}
                                onChange={(e) => setNewAudioUrl(e.target.value)}
                              />
                              <Button size="sm" onClick={addAudioUrl}>
                                Agregar link
                              </Button>
                            </div>
                            {audioUrls.length > 0 && (
                              <div className="space-y-2 pt-2">
                                {audioUrls.map((u, idx) => (
                                  <div
                                    key={u + idx}
                                    className="flex items-center gap-2"
                                  >
                                    <a
                                      href={normalizeUrl(u)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-sky-600 underline break-all"
                                    >
                                      {u}
                                    </a>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeAudioUrl(idx)}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                ))}
                                <div className="pt-1">
                                  <Button
                                    size="sm"
                                    onClick={saveLinksToDescription}
                                  >
                                    Guardar links
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {editFiles.length > 0 && (
                          <>
                            <div className="space-y-2">
                              <div className="text-xs text-slate-500">
                                {editFiles.length} archivo(s) seleccionado(s)
                              </div>
                              <div className="space-y-2">
                                {editFiles.map((f, i) => (
                                  <div
                                    key={`${f.name}-${i}`}
                                    className="flex items-center gap-3 rounded-lg border bg-white p-3"
                                  >
                                    <div className="flex h-10 w-10 flex-none shrink-0 items-center justify-center rounded bg-slate-100">
                                      {iconFor(f.type, f.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div
                                        className="truncate text-sm font-medium"
                                        title={f.name}
                                      >
                                        {f.name}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {Math.ceil(f.size / 1024)} KB
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() =>
                                        setEditFiles((prev) =>
                                          prev.filter((_, idx) => idx !== i)
                                        )
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  if (!selectedTicket?.codigo) return;
                                  setUploadingFiles(true);
                                  try {
                                    await uploadTicketFiles(
                                      selectedTicket.codigo,
                                      editFiles
                                    );
                                    toast({ title: "Archivos subidos" });
                                    setEditFiles([]);
                                    await loadFilesForTicket(
                                      selectedTicket.codigo
                                    );
                                  } catch (e) {
                                    console.error(e);
                                    toast({ title: "Error subiendo archivos" });
                                  } finally {
                                    setUploadingFiles(false);
                                  }
                                }}
                              >
                                {uploadingFiles
                                  ? "Subiendo..."
                                  : "Subir archivos"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditFiles([])}
                              >
                                Limpiar
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={detailTab === "detalle" ? "block" : "hidden"}>
                  <div className="p-6 space-y-4">
                    {ticketDetailLoading ? (
                      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                        Cargando detalle…
                      </div>
                    ) : ticketDetailError ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {ticketDetailError}
                      </div>
                    ) : ticketDetail ? (
                      <>
                        {/* Resumen encabezado */}
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-slate-900">
                                {ticketDetail?.nombre || "Ticket"}
                              </div>
                              {ticketDetail?.codigo && (
                                <div className="text-xs text-slate-500 break-all">
                                  Código: {ticketDetail.codigo}
                                </div>
                              )}
                            </div>
                            {ticketDetail?.estado && (
                              <span
                                className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                  STATUS_STYLE[
                                    coerceStatus(ticketDetail.estado as any)
                                  ]
                                }`}
                              >
                                {
                                  STATUS_LABEL[
                                    coerceStatus(ticketDetail.estado as any)
                                  ]
                                }
                              </span>
                            )}
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                            <div className="space-y-1">
                              <div className="text-slate-500 text-xs">
                                Alumno
                              </div>
                              <div className="font-medium break-all">
                                {ticketDetail?.alumno_nombre || "—"}
                              </div>
                              {ticketDetail?.id_alumno && (
                                <div className="text-xs text-slate-500 break-all">
                                  ID: {ticketDetail.id_alumno}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="text-slate-500 text-xs">Tipo</div>
                              <div className="font-medium">
                                {ticketDetail?.tipo || "—"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-slate-500 text-xs">
                                Creado
                              </div>
                              <div>
                                {ticketDetail?.created_at
                                  ? new Date(
                                      ticketDetail.created_at
                                    ).toLocaleString("es-ES")
                                  : "—"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-slate-500 text-xs">
                                Deadline
                              </div>
                              <div>
                                {ticketDetail?.deadline
                                  ? new Date(
                                      ticketDetail.deadline
                                    ).toLocaleString("es-ES")
                                  : "—"}
                              </div>
                            </div>
                            {ticketDetail?.plazo && (
                              <div className="space-y-1">
                                <div className="text-slate-500 text-xs">
                                  Plazo
                                </div>
                                <div>{String(ticketDetail.plazo)}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Descripción y links */}
                        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              Descripción
                            </div>
                            {!descEditing && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDescDraft(
                                    String(ticketDetail?.descripcion || "")
                                  );
                                  setDescEditing(true);
                                }}
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                          {!descEditing ? (
                            <div className="whitespace-pre-wrap text-sm text-slate-800">
                              {ticketDetail?.descripcion || "—"}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Textarea
                                rows={8}
                                value={descDraft}
                                onChange={(e) => setDescDraft(e.target.value)}
                                placeholder="Escribe la descripción del ticket..."
                              />
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setDescEditing(false);
                                    setDescDraft("");
                                  }}
                                  disabled={savingDesc}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={async () => {
                                    if (!selectedTicket?.codigo) return;
                                    setSavingDesc(true);
                                    try {
                                      await updateTicket(
                                        selectedTicket.codigo,
                                        {
                                          descripcion: (descDraft || "").trim(),
                                        } as any
                                      );
                                      await loadTicketDetail(
                                        selectedTicket.codigo
                                      );
                                      setDescEditing(false);
                                      toast({
                                        title: "Descripción actualizada",
                                      });
                                    } catch (e) {
                                      console.error(e);
                                      toast({
                                        title:
                                          "Error al actualizar descripción",
                                      });
                                    } finally {
                                      setSavingDesc(false);
                                    }
                                  }}
                                  disabled={savingDesc}
                                >
                                  {savingDesc ? "Guardando..." : "Guardar"}
                                </Button>
                              </div>
                            </div>
                          )}
                          {(() => {
                            const urlList: string[] = [
                              ...extractUrlsFromDescription(
                                ticketDetail?.descripcion
                              ),
                              ...((Array.isArray(ticketDetail?.links)
                                ? ticketDetail.links
                                : []) as string[]),
                            ];
                            // Dedupe final
                            const seen = new Set<string>();
                            const links = urlList.filter((u) => {
                              const k = String(u || "").toLowerCase();
                              if (!k) return false;
                              if (seen.has(k)) return false;
                              seen.add(k);
                              return true;
                            });
                            return links.length > 0 ? (
                              <div className="pt-1">
                                <div className="text-sm font-medium">Links</div>
                                <div className="mt-1 flex flex-col gap-1">
                                  {links.map((u, i) => (
                                    <a
                                      key={i}
                                      href={normalizeUrl(u)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sky-600 underline break-all text-sm"
                                    >
                                      {u}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        {/* Coaches */}
                        {Array.isArray(ticketDetail?.coaches) &&
                          ticketDetail.coaches.length > 0 && (
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                              <div className="text-sm font-medium mb-2">
                                Coaches
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {ticketDetail.coaches.map(
                                  (c: any, idx: number) => (
                                    <span
                                      key={`${
                                        c.codigo_equipo ?? c.nombre ?? idx
                                      }`}
                                      className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                                      title={`${c.nombre ?? "Coach"}${
                                        c.area ? ` · ${c.area}` : ""
                                      }${c.puesto ? ` · ${c.puesto}` : ""}`}
                                    >
                                      {(c.nombre ?? "Coach").slice(0, 20)}
                                      {c.area
                                        ? ` · ${String(c.area).slice(0, 10)}`
                                        : ""}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Estados */}
                        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                          <div className="text-sm font-medium">Estados</div>
                          {ticketDetail?.ultimo_estado?.estatus && (
                            <div className="text-xs text-slate-600">
                              Último:{" "}
                              {
                                STATUS_LABEL[
                                  coerceStatus(
                                    ticketDetail.ultimo_estado.estatus
                                  )
                                ]
                              }
                              {ticketDetail?.ultimo_estado?.fecha && (
                                <>
                                  {" · "}
                                  {new Date(
                                    ticketDetail.ultimo_estado.fecha
                                  ).toLocaleString("es-ES")}
                                </>
                              )}
                            </div>
                          )}
                          {Array.isArray(ticketDetail?.estados) &&
                          ticketDetail.estados.length > 0 ? (
                            <div className="mt-1 space-y-1">
                              {ticketDetail.estados.map((e: any) => (
                                <div
                                  key={e.id}
                                  className="flex items-center gap-2 text-xs text-slate-700"
                                >
                                  <span
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 border ${
                                      STATUS_STYLE[coerceStatus(e.estatus_id)]
                                    }`}
                                  >
                                    {STATUS_LABEL[coerceStatus(e.estatus_id)]}
                                  </span>
                                  <span>
                                    {new Date(e.created_at).toLocaleString(
                                      "es-ES"
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">
                              Sin historial
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                        Sin datos de detalle
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <SheetFooter className="border-t pt-4">
            <div className="flex items-center justify-end gap-2">
              {selectedTicket?.codigo && isAdmin && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Eliminar
                </Button>
              )}
              <SheetClose asChild>
                <Button variant="outline">Cancelar</Button>
              </SheetClose>
              <Button onClick={saveTicketChanges}>Guardar cambios</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modal: Reasignar ticket */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Reasignar ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">Selecciona el coach/equipo</Label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
              value={reassignCoach}
              onChange={(e) => setReassignCoach(e.target.value)}
            >
              <option value="">— Elegir —</option>
              {coaches.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                  {c.area ? ` · ${c.area}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReassignOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                // Cierra el selector para evitar stacking y luego abre confirmación
                setReassignOpen(false);
                setTimeout(() => setReassignConfirmOpen(true), 0);
              }}
              disabled={!reassignCoach}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación: reasignar */}
      <AlertDialog
        open={reassignConfirmOpen}
        onOpenChange={setReassignConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reasignación</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const coach = coaches.find((c) => c.codigo === reassignCoach);
                const name =
                  coach?.nombre || reassignCoach || "el coach seleccionado";
                return `¿Deseas reasignar el ticket al coach ${name}?`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reassignLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedTicket?.codigo || !reassignCoach) return;
                setReassignLoading(true);
                try {
                  await reassignTicket(selectedTicket.codigo, reassignCoach);
                  const coach = coaches.find((c) => c.codigo === reassignCoach);
                  toast({
                    title: `Ticket reasignado a ${
                      coach?.nombre || reassignCoach
                    }`,
                  });
                  setReassignConfirmOpen(false);
                  setReassignOpen(false);
                  // refrescar lista de tickets (rápido)
                  try {
                    setLoading(true);
                    const res = await getTickets({
                      page: 1,
                      pageSize: 500,
                      search,
                      fechaDesde,
                      fechaHasta,
                      coach: coachFiltro || undefined,
                    });
                    setTickets(res.items ?? []);
                  } catch (err) {
                    // noop
                  }
                  setLoading(false);
                } catch (e) {
                  console.error(e);
                  toast({ title: "Error al reasignar ticket" });
                } finally {
                  setReassignLoading(false);
                  setReassignCoach("");
                }
              }}
              disabled={reassignLoading}
            >
              {reassignLoading ? "Reasignando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación: eliminar ticket (sólo admin) */}
      {isAdmin && (
        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar ticket</AlertDialogTitle>
              <AlertDialogDescription>
                {`¿Deseas eliminar el ticket "${
                  selectedTicket?.nombre || "(sin título)"
                }"? Esta acción no se puede deshacer.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingTicket}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (!selectedTicket?.codigo) return;
                  setDeletingTicket(true);
                  try {
                    await deleteTicket(selectedTicket.codigo);
                    // Notificación local
                    try {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("ticket:notify", {
                            detail: {
                              title: `Ticket eliminado: ${
                                selectedTicket?.nombre || selectedTicket.codigo
                              }`,
                              ticketId: selectedTicket.codigo,
                              current: "ELIMINADO",
                              at: new Date().toISOString(),
                            },
                          })
                        );
                      }
                    } catch {}
                    // Quitar de la lista y cerrar drawer
                    setTickets((prev) =>
                      prev.filter((t) => t.codigo !== selectedTicket.codigo)
                    );
                    setDrawerOpen(false);
                    toast({ title: "Ticket eliminado" });
                  } catch (e) {
                    console.error(e);
                    toast({ title: "Error al eliminar ticket" });
                  } finally {
                    setDeletingTicket(false);
                    setDeleteConfirmOpen(false);
                  }
                }}
                disabled={deletingTicket}
              >
                {deletingTicket ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
