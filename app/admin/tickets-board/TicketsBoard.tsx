"use client";

import type React from "react";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  getTickets,
  type TicketBoardItem,
  reassignTicket,
  getTicketComments,
  createTicketComment,
  updateTicketComment,
  deleteTicketComment,
  type TicketComment,
  getInternalNotes,
  createInternalNote,
  updateInternalNote,
  deleteInternalNote,
  type InternalNote,
  deleteTicketLink,
  createTicketLink,
} from "./api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";
import { toast } from "@/components/ui/use-toast";
import VideoPlayer from "@/components/chat/VideoPlayer";

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
  Link as LinkIcon,
  Plus,
  Maximize,
  Tag,
} from "lucide-react";
import { convertBlobToMp3 } from "@/lib/audio-converter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { CreateTicketModal } from "./CreateTicketModal";

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

const COACH_CHIP_STYLES = [
  "border bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950/35 dark:text-sky-200 dark:border-sky-900/60 dark:hover:bg-sky-950/55",
  "border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60 dark:hover:bg-emerald-950/55",
  "border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/35 dark:text-purple-200 dark:border-purple-900/60 dark:hover:bg-purple-950/55",
  "border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/60 dark:hover:bg-amber-950/55",
  "border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/35 dark:text-blue-200 dark:border-blue-900/60 dark:hover:bg-blue-950/55",
];

function coachChipClass(idx: number) {
  return COACH_CHIP_STYLES[idx % COACH_CHIP_STYLES.length];
}

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

// Cronómetro (SLA) oculto por requerimiento.

export default function TicketsBoard({
  studentCode,
  hideHeader,
  mode,
}: {
  studentCode?: string;
  hideHeader?: boolean;
  mode?: "tickets" | "feedback";
}) {
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const isStudent = (user?.role || "").toLowerCase() === "student";
  const canEdit = !isStudent; // admins and team members can edit; students only view

  const isFeedbackMode = mode === "feedback";
  const uiTicket = isFeedbackMode ? "Feedback" : "Ticket";
  const uiTickets = isFeedbackMode ? "Feedback" : "Tickets";
  const uiTicketLower = isFeedbackMode ? "feedback" : "ticket";
  const uiTicketsLower = isFeedbackMode ? "feedback" : "tickets";

  const formatTitleForUi = (value?: string | null) => {
    const base = String(value ?? "");
    if (!isFeedbackMode) return base;
    return base
      .replace(/\btickets\b/gi, "Feedback")
      .replace(/\bticket\b/gi, "Feedback");
  };

  const filterDescriptionForStudent = (raw: string) => {
    if (!isStudent) return raw;
    const text = String(raw || "").replace(/\r\n/g, "\n");
    if (!text.trim()) return text;

    const startRe = /---\s*Mensaje\s+Original\s+del\s+Alumno\s*---/i;
    const endRe = /\n\s*Recomendaci[oó]n(?:\s+o\s+siguiente\s+paso)?\s*:/i;

    const startMatch = startRe.exec(text);
    if (startMatch) {
      const start = startMatch.index;
      const afterStart = text.slice(start);
      const endMatch = endRe.exec(afterStart);
      const sliced = endMatch
        ? afterStart.slice(0, endMatch.index)
        : afterStart;
      return sliced.trim();
    }

    // Fallback: si no hay marcador, al menos ocultar recomendación si viene.
    const endMatchGlobal = endRe.exec(text);
    if (endMatchGlobal) return text.slice(0, endMatchGlobal.index).trim();
    return text;
  };

  // Permisos especiales: además de admin, permitir reasignar/eliminar a usuarios puntuales
  const privilegedTicketManagerCodes = new Set<string>([
    "PKBT2jVtzKzN7TpnLZkPj", // Katherine
    "mQ2dwRX3xMzV99e3nh9eb", // Pedro
  ]);
  const currentUserCodigo = String((user as any)?.codigo || "");
  const canManageTickets =
    isAdmin || privilegedTicketManagerCodes.has(currentUserCodigo);
  const [tickets, setTickets] = useState<TicketBoardItem[]>([]);
  const ticketsRef = useRef<TicketBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshBump, setRefreshBump] = useState(0);
  const searchParams = useSearchParams();
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
      url?: string | null;
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
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Estado para modal de descarga y progreso básico
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState(
    "Descargando archivo..."
  );
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<TicketBoardItem | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<
    "general" | "respuesta" | "detalle" | "notas" | "anteriores"
  >("general");
  const [ticketDetail, setTicketDetail] = useState<any | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [ticketDetailError, setTicketDetailError] = useState<string | null>(
    null
  );

  const [previousTickets, setPreviousTickets] = useState<TicketBoardItem[]>([]);
  const [previousTicketsLoading, setPreviousTicketsLoading] = useState(false);
  const [previousTicketsError, setPreviousTicketsError] = useState<
    string | null
  >(null);
  const [previousTicketsStudentCode, setPreviousTicketsStudentCode] = useState<
    string | null
  >(null);

  const [historyDetailOpen, setHistoryDetailOpen] = useState(false);
  const [historyDetailCodigo, setHistoryDetailCodigo] = useState<string | null>(
    null
  );
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [historyDetailError, setHistoryDetailError] = useState<string | null>(
    null
  );
  const [historyDetail, setHistoryDetail] = useState<any | null>(null);
  const [historyFiles, setHistoryFiles] = useState<any[]>([]);
  const [historyFilesLoading, setHistoryFilesLoading] = useState(false);
  const [historyComments, setHistoryComments] = useState<TicketComment[]>([]);
  const [historyCommentsLoading, setHistoryCommentsLoading] = useState(false);

  const visibleDesc = useMemo(() => {
    return filterDescriptionForStudent(String(ticketDetail?.descripcion || ""));
  }, [ticketDetail?.descripcion, isStudent]);

  // Los alumnos solo pueden ver: bloquear pestañas/acciones privadas
  useEffect(() => {
    if (isStudent && detailTab === "notas") setDetailTab("general");
  }, [isStudent, detailTab]);

  // Carga perezosa: historial de tickets del alumno solo cuando se abre la pestaña
  useEffect(() => {
    const studentCode = String(selectedTicket?.id_alumno ?? "").trim();
    if (!drawerOpen) return;
    if (detailTab !== "anteriores") return;
    if (!studentCode) return;

    // Evita re-consultar si ya cargamos para ese alumno
    if (previousTicketsStudentCode === studentCode && previousTickets.length) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setPreviousTicketsLoading(true);
        setPreviousTicketsError(null);
        const res = await getTickets({ studentCode });
        if (cancelled) return;
        setPreviousTickets(res.items || []);
        setPreviousTicketsStudentCode(studentCode);
      } catch (e: any) {
        if (cancelled) return;
        setPreviousTicketsError(
          String(e?.message || e || "Error cargando historial")
        );
        setPreviousTickets([]);
        setPreviousTicketsStudentCode(studentCode);
      } finally {
        if (!cancelled) setPreviousTicketsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    drawerOpen,
    detailTab,
    selectedTicket?.id_alumno,
    previousTicketsStudentCode,
    previousTickets.length,
  ]);

  async function loadHistoryTicketDetail(codigo: string) {
    const code = String(codigo || "").trim();
    if (!code) return;
    try {
      setHistoryDetailLoading(true);
      setHistoryDetailError(null);
      setHistoryDetail(null);
      const url = buildUrl(`/ticket/get/ticket/${encodeURIComponent(code)}`);
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
      const data = (json as any)?.data ?? json ?? null;
      setHistoryDetail(data);

      // Cargar archivos del ticket
      try {
        setHistoryFilesLoading(true);
        const filesData = await getTicketFiles(code);
        setHistoryFiles(Array.isArray(filesData) ? filesData : []);
      } catch {
        setHistoryFiles([]);
      } finally {
        setHistoryFilesLoading(false);
      }

      // Cargar comentarios/observaciones del ticket
      try {
        setHistoryCommentsLoading(true);
        const commentsData = await getTicketComments(code);
        setHistoryComments(Array.isArray(commentsData) ? commentsData : []);
      } catch {
        setHistoryComments([]);
      } finally {
        setHistoryCommentsLoading(false);
      }
    } catch (e: any) {
      setHistoryDetailError(
        String(e?.message || e || "Error al cargar detalle")
      );
    } finally {
      setHistoryDetailLoading(false);
    }
  }

  // Estado para crear ticket manual
  const [createModalOpen, setCreateModalOpen] = useState(false);

  function handleCreateTicket() {
    setCreateModalOpen(true);
  }

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
      descripcion?: string | null;
    }
  >({});

  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [generalFiles, setGeneralFiles] = useState<File[]>([]);
  const [generalUrls, setGeneralUrls] = useState<string[]>([]);
  const [newGeneralUrl, setNewGeneralUrl] = useState("");
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadingGeneralFiles, setUploadingGeneralFiles] = useState(false);
  // Audio recording and URL states
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  // Links genéricos (antes: audio URLs)
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [newAudioUrl, setNewAudioUrl] = useState<string>("");
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
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

  // Comentarios (Observaciones)
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Notas Internas (Internal Notes)
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [internalNotesLoading, setInternalNotesLoading] = useState(false);
  const [newInternalNote, setNewInternalNote] = useState("");
  const [addingInternalNote, setAddingInternalNote] = useState(false);
  const [editingInternalNoteId, setEditingInternalNoteId] = useState<
    string | null
  >(null);
  const [editingInternalNoteText, setEditingInternalNoteText] = useState("");

  // Control para expandir lista completa de archivos en el panel de edición
  const [showAllFiles, setShowAllFiles] = useState(false);
  // Edición de descripción (pestaña Detalle)
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const [notasDraft, setNotasDraft] = useState("");
  const [savingNotas, setSavingNotas] = useState(false);

  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [onlyMyTickets, setOnlyMyTickets] = useState(false);

  const [viewMode, setViewMode] = useState<"kanban" | "table">(
    studentCode ? "table" : "kanban"
  );

  // Alumno: solo vista tabla (sin kanban)
  useEffect(() => {
    if (isStudent && viewMode !== "table") setViewMode("table");
  }, [isStudent, viewMode]);

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  // Default to 4 days ago
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(today.getDate() - 4);
  const y4 = fourDaysAgo.getFullYear();
  const m4 = String(fourDaysAgo.getMonth() + 1).padStart(2, "0");
  const d4 = String(fourDaysAgo.getDate()).padStart(2, "0");
  const fourDaysAgoStr = `${y4}-${m4}-${d4}`;

  const [fechaDesde, setFechaDesde] = useState<string>(fourDaysAgoStr);
  const [fechaHasta, setFechaHasta] = useState<string>(todayStr);

  const visibleTickets = useMemo(() => {
    if (!onlyMyTickets) return tickets;
    if (!(user?.codigo || typeof (user as any)?.id !== "undefined"))
      return tickets;

    const myCode = String((user as any)?.codigo ?? "").trim();
    const myId = String((user as any)?.id ?? "").trim();

    return tickets.filter((t) => {
      const informanteStr = String((t as any).informante || "").trim();
      const createdByMe =
        informanteStr === myCode || (!!myId && informanteStr === myId);

      let assignedToMe = false;
      try {
        const coachesArr = Array.isArray((t as any)?.coaches)
          ? (t as any).coaches
          : [];
        const overrides = Array.isArray((t as any)?.coaches_override)
          ? (t as any).coaches_override
          : [];

        assignedToMe = coachesArr.some((co: any) => {
          const code = String(
            (co && typeof co === "object"
              ? co?.codigo_equipo ?? co?.codigo ?? co?.id
              : co) ?? ""
          ).trim();
          return code === myCode || (!!myId && code === myId);
        });

        if (!assignedToMe && overrides.length > 0) {
          const overrideObjects = overrides.filter(
            (o: any) => o && typeof o === "object"
          );
          if (overrideObjects.length > 0) {
            assignedToMe = overrideObjects.some((o: any) => {
              const code = String(
                o?.codigo_equipo || o?.codigo || o?.id || ""
              ).trim();
              return code === myCode || (!!myId && code === myId);
            });
          } else {
            assignedToMe = overrides.some((o: any) => {
              const code = String(o || "").trim();
              return code === myCode || (!!myId && code === myId);
            });
          }
        }
      } catch {}

      return createdByMe || assignedToMe;
    });
  }, [tickets, onlyMyTickets, user]);

  // Alumno: solo ver estados En progreso, Pausado y Resuelto
  const displayTickets = useMemo(() => {
    if (!isStudent) return visibleTickets;
    const allowed = new Set<StatusKey>(["EN_PROGRESO", "PAUSADO", "RESUELTO"]);
    return visibleTickets.filter((t) => allowed.has(coerceStatus(t.estado)));
  }, [visibleTickets, isStudent]);

  // Cargar filtros de fecha desde localStorage al montar
  useEffect(() => {
    try {
      const savedDesde = localStorage.getItem("ticketsBoard_fechaDesde");
      const savedHasta = localStorage.getItem("ticketsBoard_fechaHasta");
      if (savedDesde) setFechaDesde(savedDesde);
      if (savedHasta) setFechaHasta(savedHasta);
    } catch {}
  }, []);

  // Mantener ref con la lista actual (para handlers globales sin stale closures)
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  // Refrescar tickets cuando llegue una notificación SSE
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setRefreshBump((n) => n + 1);
    };
    window.addEventListener("tickets:refresh", handler as any);
    return () => window.removeEventListener("tickets:refresh", handler as any);
  }, []);

  // Abrir un ticket específico desde notificación (botón "Ver ticket")
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (ev: Event) => {
      try {
        const anyEv = ev as CustomEvent<any>;
        const codigo = String(anyEv?.detail?.codigo ?? "").trim();
        if (!codigo) return;
        openTicketByCodigo(codigo);
      } catch {}
    };
    window.addEventListener("tickets:open", handler as any);
    return () => window.removeEventListener("tickets:open", handler as any);
  }, []);

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
          studentCode,
        });
        if (!mounted) return;
        // Filtrar explícitamente tickets eliminados por si la API los devuelve
        const validTickets = (res.items ?? []).filter((t) => {
          const st = (t.estado || "").toUpperCase();
          return (
            !st.includes("ELIMINAD") &&
            !st.includes("BORRADO") &&
            !st.includes("DELETED")
          );
        });
        setTickets(validTickets);
      } catch (e) {
        console.error(e);
        toast({ title: `Error cargando ${uiTicketsLower}` });
        setTickets([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [search, fechaDesde, fechaHasta, coachFiltro, studentCode, refreshBump]);

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
        title: isFeedbackMode
          ? "Feedback pausado requiere atención"
          : "Tickets pausados requieren atención",
        description: isFeedbackMode
          ? `Tienes ${pausedCount} feedback en Pausado. Revisa y envía la información correspondiente.`
          : `Tienes ${pausedCount} ticket(s) en Pausado. Revisa y envía la información correspondiente.`,
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
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetEstado: string) {
    if (!canEdit) return;
    e.preventDefault();

    // Solo usuarios con permisos de gestión pueden pasar un ticket a PAUSADO
    if (coerceStatus(targetEstado) === "PAUSADO" && !canManageTickets) {
      return;
    }

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
          const title = `${uiTicket} actualizado: ${tk?.nombre || codigo} → ${
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
        toast({ title: `${uiTicket} actualizado` });
      })
      .catch(async (err) => {
        console.error(err);
        toast({ title: `Error al actualizar ${uiTicketLower}` });
        try {
          const res = await getTickets({
            page: 1,
            pageSize: 500,
            search,
            fechaDesde,
            fechaHasta,
            coach: coachFiltro || undefined,
            studentCode,
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
      try {
        const urls = (list || []).map((f: any) => f?.url).filter(Boolean);
        // Log de URLs para verificación
        console.log("Ticket files URLs:", urls);
      } catch {}
    } catch (e) {
      console.error(e);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }

  async function downloadFile(fileId: string, nombre: string) {
    try {
      setDownloadMessage("Descargando archivo...");
      setDownloadProgress(null);
      setDownloadModalOpen(true);

      const local = files.find((f) => f.id === fileId);
      let blob: Blob | null = null;
      let finalName = nombre || local?.nombre_archivo || "archivo";
      let finalMime = local?.mime_type || "";

      // 1. Intentar descargar desde URL directa si existe (evita base64 pesado)
      if (local?.url) {
        try {
          const res = await fetch(local.url);
          if (res.ok) {
            blob = await res.blob();
            finalMime = blob.type || finalMime;
          }
        } catch (err) {
          console.warn(
            "Fallo descarga directa (posible CORS), intentando vía API...",
            err
          );
        }
      }

      // 2. Si no hay URL o falló el fetch, usar endpoint de API (base64)
      if (!blob) {
        try {
          const f = await getTicketFile(fileId);
          const b = Uint8Array.from(atob(f.contenido_base64), (c) =>
            c.charCodeAt(0)
          );
          blob = new Blob([b], {
            type: f.mime_type || "application/octet-stream",
          });
          finalName = nombre || f.nombre_archivo || "archivo";
          finalMime = f.mime_type || "";
        } catch (e) {
          console.error("Fallo descarga vía API", e);
        }
      }

      // 3. Si todo falla pero tenemos URL, intentar abrir en nueva pestaña (último recurso)
      if (!blob && local?.url) {
        setDownloadModalOpen(false);
        window.open(local.url, "_blank");
        toast({ title: "Abriendo archivo en nueva pestaña..." });
        return;
      }

      if (!blob)
        throw new Error("No se pudo obtener el archivo por ningún medio");

      // 3. Crear URL local y forzar descarga
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // --- DETECCIÓN DE FORMATO REAL (SNIFFING) ---
      // Esto soluciona el problema de archivos "rotos" que son WebM pero tienen extensión .mp3
      try {
        const header = await blob.slice(0, 12).arrayBuffer();
        const uint8 = new Uint8Array(header);
        const hex = Array.from(uint8)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();

        let detectedExt = "";

        // WebM signature: 1A 45 DF A3
        if (hex.startsWith("1A45DFA3")) {
          detectedExt = ".webm";
        }
        // Ogg signature: 4F 67 67 53
        else if (hex.startsWith("4F676753")) {
          detectedExt = ".ogg";
        }
        // WAV signature: 52 49 46 46 (RIFF)
        else if (hex.startsWith("52494646")) {
          detectedExt = ".wav";
        }
        // MP3 ID3: 49 44 33
        else if (hex.startsWith("494433")) {
          detectedExt = ".mp3";
        }
        // MP3 Sync (approx): FF FB, FF F3, etc.
        else if (hex.startsWith("FF")) {
          detectedExt = ".mp3";
        }
        // M4A / MP4 (ftyp en offset 4)
        else if (
          hex.length >= 24 &&
          String.fromCharCode(uint8[4], uint8[5], uint8[6], uint8[7]) === "ftyp"
        ) {
          detectedExt = ".m4a";
        }

        if (detectedExt) {
          // Si detectamos que es WebM/Ogg pero se llama .mp3, lo corregimos
          if (
            (detectedExt === ".webm" || detectedExt === ".ogg") &&
            finalName.toLowerCase().endsWith(".mp3")
          ) {
            finalName = finalName.slice(0, -4) + detectedExt;
          }
          // Si no tiene extensión, se la ponemos
          else if (!/\.[a-z0-9]{3,4}$/i.test(finalName)) {
            finalName += detectedExt;
          }
          // Si tiene una extensión diferente y estamos seguros del formato, reemplazamos
          else if (!finalName.toLowerCase().endsWith(detectedExt)) {
            // Prioridad a la detección real para formatos contenedores
            if (
              detectedExt === ".webm" ||
              detectedExt === ".ogg" ||
              detectedExt === ".m4a"
            ) {
              finalName = finalName.replace(/\.[^.]+$/, "") + detectedExt;
            }
          }
        }
      } catch (e) {
        console.warn("Error detectando formato real:", e);
      }
      // --------------------------------------------

      a.download = finalName;
      document.body.appendChild(a);
      a.click();

      // Limpieza
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);

      setDownloadModalOpen(false);
      setDownloadProgress(null);
    } catch (e) {
      console.error(e);
      setDownloadModalOpen(false);
      toast({ title: "Error al descargar archivo" });
    }
  }

  // Descarga múltiple con progreso simple
  async function downloadFiles(
    filesToDownload: Array<{ id: string; nombre_archivo: string }>
  ) {
    if (!filesToDownload?.length) return;
    setDownloadModalOpen(true);
    setDownloadMessage("Descargando archivos...");
    setDownloadProgress(0);
    try {
      for (let i = 0; i < filesToDownload.length; i++) {
        const f = filesToDownload[i];
        await downloadFile(f.id, f.nombre_archivo);
        setDownloadProgress(
          Math.round(((i + 1) / filesToDownload.length) * 100)
        );
        setDownloadMessage(
          `Descargando (${i + 1}/${filesToDownload.length})...`
        );
      }
    } finally {
      setDownloadModalOpen(false);
      setDownloadProgress(null);
      setDownloadMessage("Descargando archivo...");
    }
  }

  async function openPreview(f: {
    id: string;
    nombre_archivo: string;
    mime_type: string | null;
    url?: string | null;
  }) {
    try {
      setPreviewLoading(true);
      const cached = blobCache[f.id];
      if (cached) {
        setPreviewFile({ ...f, url: cached });
        setPreviewOpen(true);
        return;
      }
      // Si el backend ya provee una URL pública, úsala directamente
      if (f.url) {
        setPreviewFile({ ...f, url: f.url });
        setPreviewOpen(true);
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
      setPreviewOpen(true);
    } catch (e) {
      console.error(e);
      setPreviewFile({ ...f, url: f.url ?? undefined });
      setPreviewOpen(true);
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
      // Intenta usar el mimeType más compatible; MediaRecorder no soporta MP3 nativo en la mayoría de navegadores
      // Grabamos en webm/ogg y luego convertimos a MP3 con lamejs
      const options: MediaRecorderOptions = {};
      const supported = ["audio/webm", "audio/ogg"].filter((t) =>
        MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(t) : true
      );
      if (supported.length > 0) options.mimeType = supported[0] as any;
      const mr = new MediaRecorder(stream, options);
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
      // Start with 1s timeslices to ensure data availability
      mr.start(1000);
      setIsRecording(true);
      toast({ title: "Grabación iniciada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error iniciando grabación" });
    }
  }

  function stopRecording() {
    // Small delay to ensure the last chunk is captured
    setTimeout(() => {
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
    }, 500);
  }

  async function addRecordedToFiles() {
    if (!recordedBlob) return;

    // Notificar al usuario que se está procesando
    toast({
      title: "Procesando audio...",
      description: "Optimizando y convirtiendo a MP3.",
    });

    try {
      // Convertir la grabación a MP3 en el cliente
      const mp3File = await convertBlobToMp3(recordedBlob);
      setEditFiles((prev) => [...prev, mp3File]);
      toast({
        title: "Audio agregado",
        description: "Grabación guardada como MP3.",
      });
    } catch (err) {
      console.error("Error converting recording to MP3:", err);

      // Fallback: adjuntar el original si falla la conversión
      const ext = recordedBlob.type?.includes("audio/ogg") ? "ogg" : "webm";
      const file = new File([recordedBlob], `grabacion-${Date.now()}.${ext}`, {
        type: recordedBlob.type || "audio/webm",
      });
      setEditFiles((prev) => [...prev, file]);

      toast({
        title: "Advertencia",
        description:
          "No se pudo convertir a MP3. Se guardó en formato original.",
        variant: "destructive",
      });
    } finally {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
      }
      setRecordedBlob(null);
    }
  }

  async function addRecordedToGeneralFiles() {
    if (!recordedBlob) return;
    try {
      const mp3File = await convertBlobToMp3(recordedBlob);
      setGeneralFiles((prev) => [...prev, mp3File]);
      toast({
        title: "Audio agregado a General",
        description: "Grabación guardada como MP3.",
      });
    } catch (err) {
      console.error("Error converting recording to MP3:", err);

      // Fallback
      const ext = recordedBlob.type?.includes("audio/ogg") ? "ogg" : "webm";
      const file = new File([recordedBlob], `grabacion-${Date.now()}.${ext}`, {
        type: recordedBlob.type || "audio/webm",
      });
      setGeneralFiles((prev) => [...prev, file]);

      toast({
        title: "Advertencia",
        description:
          "No se pudo convertir a MP3. Se guardó en formato original.",
        variant: "destructive",
      });
    } finally {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
      }
      setRecordedBlob(null);
    }
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

  async function loadComments(codigo: string) {
    try {
      setCommentsLoading(true);
      const list = await getTicketComments(codigo);
      setComments(list);
    } catch (e) {
      console.error(e);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleAddComment() {
    if (!canEdit) return;
    if (!selectedTicket?.codigo || !newComment.trim()) return;
    try {
      setAddingComment(true);
      await createTicketComment(selectedTicket.codigo, newComment);
      setNewComment("");
      await loadComments(selectedTicket.codigo);
      toast({ title: "Observación agregada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al agregar observación" });
    } finally {
      setAddingComment(false);
    }
  }

  async function handleUpdateComment() {
    if (!canEdit) return;
    if (!editingCommentId || !editingCommentText.trim()) return;
    try {
      await updateTicketComment(editingCommentId, editingCommentText);
      setEditingCommentId(null);
      setEditingCommentText("");
      if (selectedTicket?.codigo) await loadComments(selectedTicket.codigo);
      toast({ title: "Observación actualizada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al actualizar observación" });
    }
  }

  async function handleDeleteComment(id: string) {
    if (!canEdit) return;
    if (!confirm("¿Eliminar esta observación?")) return;
    try {
      await deleteTicketComment(id);
      if (selectedTicket?.codigo) await loadComments(selectedTicket.codigo);
      toast({ title: "Observación eliminada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al eliminar observación" });
    }
  }

  // --- Handlers para Notas Internas ---

  async function loadInternalNotes(codigo: string) {
    if (isStudent) {
      setInternalNotes([]);
      return;
    }
    try {
      setInternalNotesLoading(true);
      const list = await getInternalNotes(codigo);
      setInternalNotes(list);
    } catch (e) {
      console.error(e);
      setInternalNotes([]);
    } finally {
      setInternalNotesLoading(false);
    }
  }

  async function handleAddInternalNote() {
    if (!canEdit) return;
    if (!selectedTicket?.codigo || !newInternalNote.trim()) return;
    try {
      setAddingInternalNote(true);
      await createInternalNote(selectedTicket.codigo, newInternalNote);
      setNewInternalNote("");
      await loadInternalNotes(selectedTicket.codigo);
      toast({ title: "Nota interna agregada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al agregar nota interna" });
    } finally {
      setAddingInternalNote(false);
    }
  }

  async function handleUpdateInternalNote() {
    if (!canEdit) return;
    if (!editingInternalNoteId || !editingInternalNoteText.trim()) return;
    try {
      await updateInternalNote(editingInternalNoteId, editingInternalNoteText);
      setEditingInternalNoteId(null);
      setEditingInternalNoteText("");
      if (selectedTicket?.codigo)
        await loadInternalNotes(selectedTicket.codigo);
      toast({ title: "Nota interna actualizada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al actualizar nota interna" });
    }
  }

  async function handleDeleteInternalNote(id: string) {
    if (!canEdit) return;
    if (!confirm("¿Eliminar esta nota interna?")) return;
    try {
      await deleteInternalNote(id);
      if (selectedTicket?.codigo)
        await loadInternalNotes(selectedTicket.codigo);
      toast({ title: "Nota interna eliminada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al eliminar nota interna" });
    }
  }

  function openTicketDetail(ticket: TicketBoardItem) {
    if (isStudent && coerceStatus(ticket.estado) !== "RESUELTO") {
      toast({
        title: `Solo puedes ver el detalle de ${uiTicketsLower} resueltos`,
      });
      return;
    }
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
      loadComments(ticket.codigo);
      if (!isStudent) loadInternalNotes(ticket.codigo);
    }
    setShowAllFiles(false);
  }

  async function openTicketByCodigo(codigo: string) {
    const code = String(codigo || "").trim();
    if (!code) return;

    // 1) Si está en la lista actual, abrir directo
    const existing = ticketsRef.current.find(
      (t) => String(t.codigo || "").trim() === code
    );
    if (existing) {
      openTicketDetail(existing);
      return;
    }

    // 2) Si no está en la lista (por filtros/fechas), pedir detalle y abrir igual
    try {
      const url = buildUrl(`/ticket/get/ticket/${encodeURIComponent(code)}`);
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
      const data = (json as any)?.data ?? json ?? {};

      const ticket: TicketBoardItem = {
        id: Number((data as any)?.id ?? 0),
        codigo: String((data as any)?.codigo ?? code),
        nombre: (data as any)?.nombre ?? code,
        id_alumno: (data as any)?.id_alumno ?? null,
        alumno_nombre: (data as any)?.alumno_nombre ?? null,
        created_at: (data as any)?.created_at ?? null,
        deadline: (data as any)?.deadline ?? null,
        estado: (data as any)?.estado ?? null,
        tipo: (data as any)?.tipo ?? null,
        plazo: (data as any)?.plazo ?? null,
        coaches: Array.isArray((data as any)?.coaches)
          ? (data as any).coaches.map((c: any) => ({
              codigo_equipo:
                (c?.codigo_equipo ??
                  c?.codigo ??
                  c?.id ??
                  c?.id_equipo ??
                  null) &&
                String(
                  c?.codigo_equipo ?? c?.codigo ?? c?.id ?? c?.id_equipo
                ).trim(),
              nombre: (c?.nombre ?? null) && String(c?.nombre).trim(),
              puesto:
                (c?.puesto ?? c?.rol ?? null) &&
                String(c?.puesto ?? c?.rol).trim(),
              area:
                (c?.area ?? c?.departamento ?? null) &&
                String(c?.area ?? c?.departamento).trim(),
            }))
          : [],
        ultimo_estado: (data as any)?.ultimo_estado ?? null,
        resuelto_por: (data as any)?.resuelto_por ?? null,
        resuelto_por_nombre: (data as any)?.resuelto_por_nombre ?? null,
        informante: (data as any)?.informante ?? null,
        informante_nombre: (data as any)?.informante_nombre ?? null,
        plazo_info: (data as any)?.plazo_info ?? null,
        coaches_override: (data as any)?.coaches_override ?? null,
      };

      openTicketDetail(ticket);
    } catch (e) {
      console.error(e);
      toast({ title: `No se pudo abrir el ${uiTicketLower}` });
    }
  }

  // Si vienes desde una notificación (ruta /admin/tickets-board?openTicket=...)
  useEffect(() => {
    try {
      const code = String(searchParams?.get("openTicket") || "").trim();
      if (!code) return;
      openTicketByCodigo(code);
    } catch {}
    // Solo reacciona a cambios de query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      const data = json?.data ?? json ?? null;
      setTicketDetail(data);
      setNotasDraft(data?.notas_internas || "");
      setEditForm((prev) => ({
        ...prev,
        descripcion: data?.descripcion || "",
      }));
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
      try {
        const urls = (list || []).map((f: any) => f?.url).filter(Boolean);
        console.log("Ticket files URLs:", urls);
      } catch {}
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
      let currentDesc = String(editForm.descripcion || "").trim();
      // Eliminar líneas previas de URLs para evitar duplicados
      const lines = currentDesc
        .split(/\r?\n/)
        .filter((ln) => !/^\s*URLs\s*:/i.test(ln));
      currentDesc = lines.join("\n").trim();
      const existingUrls =
        extractUrlsFromDescription(editForm.descripcion) || [];
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

      // Preparar archivos: comprimir imágenes a WebP y registrar tamaños
      let filesToUpload: File[] = [...editFiles];
      if (filesToUpload.length > 0) {
        const processed: File[] = [];
        for (const f of filesToUpload) {
          const type = (f.type || "").toLowerCase();
          const isImage = type.startsWith("image/") && type !== "image/svg+xml";
          const isAudio = type.startsWith("audio/");

          if (isImage) {
            const originalSizeKb = Math.round(f.size / 1024);
            console.log(
              `[Upload] Imagen original: name=${f.name}, type=${f.type}, size=${originalSizeKb} KB`
            );
            try {
              const webp = await compressImageToWebp(f, 0.8);
              const webpSizeKb = Math.round(webp.size / 1024);
              console.log(
                `[Upload] Imagen convertida: name=${webp.name}, type=${webp.type}, size=${webpSizeKb} KB`
              );
              processed.push(webp);
            } catch (err) {
              console.error(
                "[Upload] Error convirtiendo a WebP, usando original",
                err
              );
              processed.push(f);
            }
          } else if (
            isAudio &&
            !type.includes("mp3") &&
            !type.includes("mpeg")
          ) {
            // Convertir audio a MP3 si no lo es
            try {
              console.log(`[Upload] Convirtiendo audio a MP3: ${f.name}`);
              const mp3 = await convertBlobToMp3(f);
              console.log(`[Upload] Audio convertido: ${mp3.name}`);
              processed.push(mp3);
            } catch (e) {
              console.error("Error converting audio to mp3", e);
              processed.push(f);
            }
          } else {
            // No imagen ni audio convertible: mantener archivo, log básico
            console.log(
              `[Upload] Archivo: name=${f.name}, type=${
                f.type
              }, size=${Math.round(f.size / 1024)} KB`
            );
            processed.push(f);
          }
        }
        filesToUpload = processed;
      }

      // Subir archivos seleccionados (incluye audios grabados y imágenes procesadas)
      if (filesToUpload.length > 0) {
        try {
          await uploadTicketFiles(selectedTicket.codigo, filesToUpload);
          toast({ title: "Archivos subidos" });
          setEditFiles([]);
          await loadFilesForTicket(selectedTicket.codigo);
        } catch (e) {
          console.error(e);
          toast({ title: "Error subiendo archivos" });
        }
      }

      const payload: any = {
        nombre: editForm.nombre,
        descripcion: finalDescripcion || undefined,
      };
      // only allow updating estado/deadline when user can edit (not students)
      if (canEdit) {
        payload.estado =
          typeof editForm.estado === "string" ? editForm.estado : undefined;
        payload.deadline = editForm.deadline ?? undefined;
      }
      await updateTicket(selectedTicket.codigo, payload as any);
      // Notificación local: guardado de cambios (incluye estado si cambia)
      try {
        const current =
          typeof editForm.estado === "string"
            ? coerceStatus(editForm.estado)
            : undefined;
        const title = `${uiTicket} actualizado: ${
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
      toast({ title: `${uiTicket} actualizado correctamente` });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? {
                ...t,
                nombre: editForm.nombre ?? t.nombre,
                ...(canEdit ? { estado: editForm.estado ?? t.estado } : {}),
                ...(canEdit
                  ? { deadline: editForm.deadline ?? t.deadline }
                  : {}),
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
      toast({ title: `Error al actualizar ${uiTicketLower}` });
    }
  }

  // Comprimir imagen a WebP usando canvas en el navegador
  async function compressImageToWebp(file: File, quality = 0.8): Promise<File> {
    // Cargar imagen en un elemento Image
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = dataUrl;
    });
    // Dibujar en canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear contexto de canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Exportar a WebP
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) return reject(new Error("Falló toBlob WebP"));
          resolve(b);
        },
        "image/webp",
        quality
      );
    });
    const webpFile = new File([blob], renameToWebp(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
    return webpFile;
  }

  function renameToWebp(name: string) {
    const dot = name.lastIndexOf(".");
    const base = dot > -1 ? name.slice(0, dot) : name;
    return `${base}.webp`;
  }

  function iconFor(mime: string | null, name?: string) {
    const m = mime || mimeFromName(name) || "";
    if (m.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    if (m.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
    if (m.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
    if (m === "application/pdf") return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  }

  function groupByDate(items: TicketBoardItem[]) {
    const sorted = [...items].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
    const map = new Map<string, TicketBoardItem[]>();
    sorted.forEach((t) => {
      let key = "Sin fecha";
      if (t.created_at) {
        const d = new Date(t.created_at);
        const s = d.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        key = s.charAt(0).toUpperCase() + s.slice(1);
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).map(([date, groupedItems]) => {
      return { date, items: groupedItems };
    });
  }

  return (
    <div className={"space-y-6 p-6"}>
      {/* Modal de estado de descarga */}
      <Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{downloadMessage}</DialogTitle>
            <DialogDescription>
              Progreso de descarga de archivos asociados al {uiTicketLower}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            {downloadProgress == null ? (
              <Spinner className="h-8 w-8" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-muted" />
                  <div
                    className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                    style={{ animationDuration: "0.8s" }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {downloadProgress}%
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de vista previa cargando */}
      <Dialog open={previewLoading} onOpenChange={(o) => setPreviewLoading(o)}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Preparando vista previa...</DialogTitle>
            <DialogDescription>
              Cargando contenido para previsualización del archivo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <Spinner className="h-8 w-8" />
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {!hideHeader && (
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Tablero de {uiTickets}
            </h1>
            {!isFeedbackMode && (
              <p className="text-xs text-muted-foreground">
                Arrastra y suelta {uiTicketsLower} entre columnas para cambiar
                su estado
              </p>
            )}
          </div>
        )}

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
          {!isStudent && (
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all sm:w-64"
                placeholder="Buscar asunto, alumno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Filtro por fecha: Desde */}
          <div className="relative w-full sm:w-auto">
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all sm:w-auto sm:min-w-[160px]"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(e) => {
                const v = e.target.value;
                setFechaDesde(v);
                try {
                  localStorage.setItem("ticketsBoard_fechaDesde", v);
                } catch {}
                // Si 'Desde' supera a 'Hasta', ajustamos 'Hasta'
                if (fechaHasta && v && v > fechaHasta) {
                  setFechaHasta(v);
                  try {
                    localStorage.setItem("ticketsBoard_fechaHasta", v);
                  } catch {}
                }
              }}
              title="Fecha desde"
            />
          </div>

          {/* Filtro por fecha: Hasta */}
          <div className="relative w-full sm:w-auto">
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all sm:w-auto sm:min-w-[160px]"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(e) => {
                const v = e.target.value;
                setFechaHasta(v);
                try {
                  localStorage.setItem("ticketsBoard_fechaHasta", v);
                } catch {}
                // Si 'Hasta' queda antes de 'Desde', ajustamos 'Desde'
                if (fechaDesde && v && v < fechaDesde) {
                  setFechaDesde(v);
                  try {
                    localStorage.setItem("ticketsBoard_fechaDesde", v);
                  } catch {}
                }
              }}
              title="Fecha hasta"
            />
          </div>

          {!isStudent && (
            <select
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all sm:w-auto sm:min-w-[180px]"
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
          )}

          {!isStudent && (
            <>
              <Button
                size="sm"
                onClick={handleCreateTicket}
                className="h-9 w-full gap-2 sm:w-auto"
                title={`Crear nuevo ${uiTicketLower}`}
              >
                <Plus className="h-4 w-4" />
                Nuevo {uiTicket}
              </Button>

              <Button
                variant={onlyMyTickets ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyMyTickets(!onlyMyTickets)}
                className="h-9 w-full gap-2 sm:w-auto dark:bg-primary dark:text-primary-foreground dark:border-primary/50 dark:hover:bg-primary/90"
                title={`Mostrar solo mis ${uiTicketsLower} creados`}
              >
                <User className="h-4 w-4" />
                Mis {uiTickets}
              </Button>
            </>
          )}

          {!isStudent && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                size="sm"
                className="h-9 flex-1 sm:flex-none"
                onClick={() => setViewMode("kanban")}
              >
                Kanban
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                className="h-9 flex-1 sm:flex-none"
                onClick={() => setViewMode("table")}
              >
                Tabla
              </Button>
            </div>
          )}

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
                  studentCode,
                });
                setTickets(res.items ?? []);
                toast({
                  title: isFeedbackMode
                    ? "Feedback recargado"
                    : "Tickets recargados",
                });
              } catch (e) {
                toast({ title: "Error al recargar" });
              } finally {
                setLoading(false);
              }
            }}
            variant="outline"
            size="sm"
            className="h-9 w-full gap-2 sm:w-auto dark:bg-primary dark:text-primary-foreground dark:border-primary/50 dark:hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Cargando {uiTicketsLower}...
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Estado</TableHead>
                <TableHead>Asunto</TableHead>
                {isFeedbackMode && <TableHead>Tipo</TableHead>}
                <TableHead className="w-[160px]">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTickets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(studentCode ? 3 : 4) + (isFeedbackMode ? 1 : 0)}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay {uiTicketsLower} para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                displayTickets.map((t) => {
                  const estado = coerceStatus(t.estado);
                  const canOpen = !isStudent || estado === "RESUELTO";
                  const subjectLabel = (() => {
                    const base =
                      t.nombre || (t.codigo ? `${uiTicket} ${t.codigo}` : "—");
                    if (!isFeedbackMode) return base;
                    if (base === "—") return base;
                    return formatTitleForUi(base);
                  })();
                  const createdLabel = (() => {
                    const raw =
                      (t as any)?.created_at ?? (t as any)?.fecha ?? null;
                    if (!raw) return "—";
                    const dt = new Date(String(raw));
                    if (Number.isNaN(dt.getTime())) return "—";
                    return dt
                      .toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                      .replace(".", "");
                  })();

                  return (
                    <TableRow
                      key={String(
                        (t as any)?.id ?? t.codigo ?? t.nombre ?? Math.random()
                      )}
                      className={canOpen ? "cursor-pointer" : "cursor-default"}
                      onClick={canOpen ? () => openTicketDetail(t) : undefined}
                    >
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[estado]}`}
                        >
                          {STATUS_LABEL[estado]}
                        </span>
                        {isStudent &&
                          isFeedbackMode &&
                          estado === "PAUSADO" && (
                            <div className="mt-3 flex w-fit items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>
                                Este Feedback requiere atención, por favor
                                comunícate con el equipo de soporte.
                              </span>
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {subjectLabel}
                      </TableCell>
                      {isFeedbackMode && (
                        <TableCell>{(t as any)?.tipo || "—"}</TableCell>
                      )}
                      {!studentCode && (
                        <TableCell>
                          {(t as any)?.alumno_nombre || "—"}
                        </TableCell>
                      )}
                      <TableCell>{createdLabel}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {estados.map((estado) => {
            const itemsForCol = tickets.filter((t) => {
              const statusMatch =
                coerceStatus(t.estado) === (estado as StatusKey);
              if (!statusMatch) return false;
              if (
                onlyMyTickets &&
                (user?.codigo || typeof user?.id !== "undefined")
              ) {
                const myCode = String(user?.codigo ?? "").trim();
                const myId = String(user?.id ?? "").trim();
                // Creados por mí
                const informanteStr = String(t.informante || "").trim();
                const createdByMe =
                  informanteStr === myCode ||
                  (!!myId && informanteStr === myId);

                // Asignados a mí: revisar coaches del ticket y overrides.
                // Importante: NO hacer fallback por "ser técnico" porque eso muestra tickets de otros técnicos.
                let assignedToMe = false;
                try {
                  const coachesArr = Array.isArray((t as any)?.coaches)
                    ? (t as any).coaches
                    : [];
                  const overrides = Array.isArray((t as any)?.coaches_override)
                    ? (t as any).coaches_override
                    : [];

                  // a) coaches del ticket
                  assignedToMe = coachesArr.some((co: any) => {
                    const code = String(
                      (co && typeof co === "object"
                        ? co?.codigo_equipo ?? co?.codigo ?? co?.id
                        : co) ?? ""
                    ).trim();
                    return code === myCode || (!!myId && code === myId);
                  });

                  // b) overrides como objetos o ids
                  if (!assignedToMe && overrides.length > 0) {
                    const overrideObjects = overrides.filter(
                      (o: any) => o && typeof o === "object"
                    );
                    if (overrideObjects.length > 0) {
                      assignedToMe = overrideObjects.some((o: any) => {
                        const code = String(
                          o?.codigo_equipo || o?.codigo || o?.id || ""
                        ).trim();
                        return code === myCode || (!!myId && code === myId);
                      });
                    } else {
                      assignedToMe = overrides.some((o: any) => {
                        const code = String(o || "").trim();
                        return code === myCode || (!!myId && code === myId);
                      });
                    }
                  }
                } catch {}

                return createdByMe || assignedToMe;
              }
              return true;
            });
            return (
              <div
                key={estado}
                className="flex min-h-[400px] flex-col rounded-xl border border-border bg-muted/30 p-4"
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
                    <span className="text-xs font-medium text-muted-foreground">
                      {itemsForCol.length}
                    </span>
                  </div>
                </div>

                <div
                  onDragOver={(e) => canEdit && handleDragOver(e)}
                  onDrop={(e) => canEdit && handleDrop(e, estado)}
                  className="flex-1 space-y-3"
                >
                  {itemsForCol.length === 0 ? (
                    <div className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-border bg-background/40 text-sm text-muted-foreground">
                      Sin {uiTicketsLower}
                    </div>
                  ) : (
                    groupByDate(itemsForCol).map((group) => (
                      <div key={group.date} className="space-y-3">
                        <div className="flex items-center gap-2 py-2">
                          <div className="h-px flex-1 bg-border"></div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {group.date}
                          </span>
                          <div className="h-px flex-1 bg-border"></div>
                        </div>
                        {group.items.map((t) => (
                          <div
                            key={t.id}
                            draggable={canEdit}
                            onDragStart={(e) =>
                              canEdit && handleDragStart(e, t.id)
                            }
                            onClick={() => openTicketDetail(t)}
                            className={
                              "group rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md cursor-pointer " +
                              (coerceStatus(t.estado) === "PAUSADO"
                                ? "border-amber-400/60 ring-1 ring-amber-400/20"
                                : "")
                            }
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="flex-1 text-sm font-medium leading-snug text-foreground">
                                  {(() => {
                                    return formatTitleForUi(
                                      t.nombre ?? uiTicket
                                    );
                                  })()}
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
                                <div className="flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-50/70 px-2 py-1 text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span className="text-[11px] font-medium">
                                    Este Feedback requiere atención, por favor
                                    comunícate con el equipo de soporte.
                                  </span>
                                </div>
                              )}

                              <div className="space-y-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>
                                    {t.created_at
                                      ? new Date(
                                          t.created_at
                                        ).toLocaleDateString("es-ES", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </span>
                                </div>
                                {t.tipo && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-1 w-1 rounded-full bg-muted-foreground/70" />
                                    <span>{t.tipo}</span>
                                  </div>
                                )}
                                {t.deadline && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-1 w-1 rounded-full bg-muted-foreground/70" />
                                    <span>
                                      Vence:{" "}
                                      {new Date(t.deadline).toLocaleDateString(
                                        "es-ES",
                                        { day: "numeric", month: "short" }
                                      )}
                                    </span>
                                  </div>
                                )}
                                {/* Cronómetro (SLA) oculto */}
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

                              {/* Alumno */}
                              {(((t as any).alumno_nombre ||
                                (t as any).id_alumno) as any) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-foreground/70">
                                    Alumno:
                                  </span>
                                  <span className="font-medium text-foreground/90">
                                    {(t as any).alumno_nombre ||
                                      (t as any).id_alumno}
                                  </span>
                                </div>
                              )}

                              {/* Informante */}
                              {(t.informante_nombre || t.informante) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium text-foreground/90">
                                    {t.informante_nombre || t.informante}
                                  </span>
                                </div>
                              )}

                              {(() => {
                                // 1. Obtener coaches del ticket y overrides
                                const ticketCoaches =
                                  t.coaches && Array.isArray(t.coaches)
                                    ? t.coaches
                                    : [];
                                const overrides = Array.isArray(
                                  t.coaches_override
                                )
                                  ? t.coaches_override
                                  : [];

                                let result: any[] = [];

                                // Helper para limpiar IDs
                                const clean = (s: any) =>
                                  String(s || "").trim();

                                // 2. Si hay overrides, tienen prioridad absoluta
                                if (overrides.length > 0) {
                                  // Caso A: overrides son objetos del coach
                                  const overrideObjects = overrides.filter(
                                    (o: any) => o && typeof o === "object"
                                  ) as any[];
                                  if (overrideObjects.length > 0) {
                                    result = overrideObjects.map((o) => ({
                                      codigo_equipo:
                                        o.codigo_equipo ?? o.codigo ?? null,
                                      nombre: o.nombre ?? "Coach",
                                      puesto: o.puesto ?? o.rol ?? null,
                                      area: o.area ?? o.departamento ?? null,
                                    }));
                                  } else {
                                    // Caso B: overrides son ids (strings)
                                    const fromTicket = ticketCoaches.filter(
                                      (c) =>
                                        overrides.some(
                                          (o: any) =>
                                            clean(o) === clean(c.codigo_equipo)
                                        )
                                    );

                                    result = [...fromTicket];

                                    // Completar desde lista global si faltan
                                    if (
                                      result.length < overrides.length &&
                                      coaches.length > 0
                                    ) {
                                      const foundIds = new Set(
                                        result.map((c) =>
                                          clean(c.codigo_equipo)
                                        )
                                      );
                                      const missing = (
                                        overrides as any[]
                                      ).filter((o) => !foundIds.has(clean(o)));

                                      const fromGlobal = coaches
                                        .filter((c) =>
                                          missing.some(
                                            (m) => clean(m) === clean(c.codigo)
                                          )
                                        )
                                        .map((c) => ({
                                          codigo_equipo: c.codigo,
                                          nombre: c.nombre,
                                          puesto: c.puesto,
                                          area: c.area,
                                        }));

                                      result = [...result, ...fromGlobal];
                                    }
                                  }
                                }
                                // 3. Si NO hay overrides, aplicar lógica de fallback por tipo
                                else {
                                  const normalize = (s: any) =>
                                    String(s || "")
                                      .normalize("NFD")
                                      .replace(/[\u0300-\u036f]/g, "")
                                      .toUpperCase()
                                      .trim();

                                  const tipo = normalize(t.tipo);

                                  // Si es técnico (TECNICA o TECNICO), priorizar coaches técnicos
                                  if (tipo.includes("TECNIC")) {
                                    const techs = ticketCoaches.filter((c) => {
                                      // Normalizar area y puesto para ignorar tildes (TÉCNICO vs TECNICO)
                                      const area = normalize(c.area);
                                      const puesto = normalize(c.puesto);
                                      return (
                                        area.includes("TECNIC") ||
                                        puesto.includes("TECNIC")
                                      );
                                    });
                                    if (techs.length > 0) {
                                      result = techs;
                                    } else {
                                      // No rellenar desde lista global al renderizar tarjeta.
                                      // Si el ticket no trae coaches y no hay override, no mostramos chips.
                                      result = [];
                                    }
                                  } else {
                                    // Si no es técnico y no hay override, mostrar todos
                                    result = ticketCoaches;
                                  }
                                }

                                // 4. Renderizar
                                if (result.length === 0) return null;

                                return (
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.slice(0, 3).map((c, idx) => (
                                      <span
                                        key={`${
                                          c.codigo_equipo ?? c.nombre ?? idx
                                        }`}
                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs transition-colors ${coachChipClass(
                                          idx
                                        )}`}
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
                                    {result.length > 3 && (
                                      <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground/90">
                                        +{result.length - 3}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              {(t as any).ultimo_estado?.estatus && (
                                <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                                  Último:{" "}
                                  {
                                    STATUS_LABEL[
                                      coerceStatus(
                                        (t as any).ultimo_estado.estatus
                                      )
                                    ]
                                  }
                                  {(t as any).ultimo_estado?.fecha && (
                                    <>
                                      {" · "}
                                      {new Date(
                                        (t as any).ultimo_estado.fecha
                                      ).toLocaleString("es-ES", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "UTC",
                                      })}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
            <DialogDescription>
              Lista de archivos vinculados al {uiTicketLower} seleccionado.
            </DialogDescription>
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
                          {!(
                            f.mime_type || mimeFromName(f.nombre_archivo)
                          )?.startsWith("audio/") &&
                            (f.url ? (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Abrir ${f.nombre_archivo} en una pestaña nueva`}
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
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
                            ))}
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
            <DialogDescription>
              Vista previa del archivo seleccionado de {uiTicketLower}.
            </DialogDescription>
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
                    <div className="relative flex flex-col items-center gap-2">
                      <div className="relative w-full bg-black rounded-md overflow-hidden">
                        <video
                          ref={videoPreviewRef}
                          src={previewFile.url}
                          controls
                          autoPlay
                          controlsList="nodownload"
                          className="mx-auto max-h-[65vh] w-full object-contain"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          const v = videoPreviewRef.current;
                          if (v) {
                            if (v.requestFullscreen) v.requestFullscreen();
                            // @ts-ignore
                            else if (v.webkitRequestFullscreen)
                              // @ts-ignore
                              v.webkitRequestFullscreen();
                            // @ts-ignore
                            else if (v.msRequestFullscreen)
                              // @ts-ignore
                              v.msRequestFullscreen();
                          }
                        }}
                      >
                        <Maximize className="h-4 w-4" />
                        Ver pantalla completa
                      </Button>
                    </div>
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
            <DialogDescription>
              Esta acción eliminará el archivo de forma permanente.
            </DialogDescription>
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

      <Dialog
        open={historyDetailOpen}
        onOpenChange={(v) => {
          if (!v) {
            setHistoryDetailOpen(false);
            setHistoryDetailCodigo(null);
            setHistoryDetail(null);
            setHistoryDetailError(null);
            setHistoryFiles([]);
            setHistoryComments([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg font-semibold">
              Detalle del ticket
            </DialogTitle>
            <DialogDescription>
              {historyDetailCodigo ? `Código: ${historyDetailCodigo}` : ""}
            </DialogDescription>
          </DialogHeader>

          {historyDetailLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              Cargando...
            </div>
          ) : historyDetailError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {historyDetailError}
            </div>
          ) : !historyDetail ? (
            <div className="text-sm text-slate-600">Sin datos.</div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const statusKey = coerceStatus(
                      historyDetail?.estado ?? historyDetail?.status
                    );
                    const label = STATUS_LABEL[statusKey];
                    const badge = STATUS_STYLE[statusKey];
                    return (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${badge}`}
                      >
                        {label}
                      </span>
                    );
                  })()}
                  <Badge variant="secondary">
                    {formatTitleForUi(
                      historyDetail?.tipo ?? historyDetail?.type ?? "—"
                    )}
                  </Badge>
                  {historyDetail?.creacion || historyDetail?.created_at ? (
                    <Badge variant="muted">
                      {new Date(
                        historyDetail?.creacion || historyDetail?.created_at
                      ).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900">
                    {formatTitleForUi(historyDetail?.nombre) || "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {historyDetail?.alumno_nombre || historyDetail?.alumnoNombre
                      ? `Alumno: ${
                          historyDetail?.alumno_nombre ||
                          historyDetail?.alumnoNombre
                        }`
                      : ""}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">
                    Descripción
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 p-3 rounded border border-slate-100">
                    {filterDescriptionForStudent(
                      String(historyDetail?.descripcion || "")
                    ) || "—"}
                  </div>
                </div>

                {(() => {
                  const responseText =
                    historyDetail?.respuesta_coach ??
                    historyDetail?.respuestaCoach ??
                    historyDetail?.respuesta ??
                    historyDetail?.respuesta_del_coach ??
                    historyDetail?.coach_response ??
                    historyDetail?.coachResponse ??
                    historyDetail?.feedback ??
                    historyDetail?.solucion ??
                    historyDetail?.solution ??
                    "";
                  return (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-600">
                        Respuesta del Coach
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 p-3 rounded border border-slate-100 min-h-[60px]">
                        {String(responseText || "").trim() || (
                          <span className="text-slate-400 italic">
                            Sin respuesta aún
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Coaches asignados */}
                {(() => {
                  const coaches =
                    historyDetail?.coaches ??
                    historyDetail?.coaches_override ??
                    [];
                  if (!Array.isArray(coaches) || coaches.length === 0)
                    return null;
                  return (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-600">
                        Coaches asignados
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {coaches.map((c: any, idx: number) => {
                          const name =
                            typeof c === "string" ? c : c?.nombre ?? "Coach";
                          const area = typeof c === "string" ? null : c?.area;
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                              title={area ? `${name} · ${area}` : name}
                            >
                              {name}
                              {area ? ` · ${area}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Archivos adjuntos */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">
                    Archivos adjuntos
                  </div>
                  {historyFilesLoading ? (
                    <div className="text-xs text-slate-500">
                      Cargando archivos...
                    </div>
                  ) : historyFiles.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      Sin archivos adjuntos.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {historyFiles.map((f: any, idx: number) => {
                        const fileName =
                          f?.nombre ??
                          f?.name ??
                          f?.filename ??
                          `Archivo ${idx + 1}`;
                        const fileUrl = f?.url ?? f?.enlace ?? "";
                        const fileMime = String(
                          f?.tipo ?? f?.mime ?? f?.mimetype ?? ""
                        ).toLowerCase();
                        const isImage = fileMime.startsWith("image/");
                        const isVideo = fileMime.startsWith("video/");
                        const isAudio = fileMime.startsWith("audio/");
                        return (
                          <div
                            key={f?.id ?? idx}
                            className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
                          >
                            {isImage ? (
                              <FileImage className="h-4 w-4 text-emerald-600" />
                            ) : isVideo ? (
                              <FileVideo className="h-4 w-4 text-purple-600" />
                            ) : isAudio ? (
                              <FileAudio className="h-4 w-4 text-amber-600" />
                            ) : (
                              <FileIcon className="h-4 w-4 text-slate-500" />
                            )}
                            <span
                              className="truncate max-w-[140px]"
                              title={fileName}
                            >
                              {fileName}
                            </span>
                            {fileUrl && (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                title="Descargar / Ver"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">
                    Observaciones
                  </div>
                  {historyCommentsLoading ? (
                    <div className="text-xs text-slate-500">
                      Cargando observaciones...
                    </div>
                  ) : historyComments.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      Sin observaciones.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto rounded border border-slate-100 bg-slate-50 p-2">
                      {historyComments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded bg-white border border-slate-200 p-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-slate-700">
                              {c.user_nombre || "Usuario"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {c.created_at
                                ? new Date(c.created_at).toLocaleString(
                                    "es-ES",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : ""}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap text-slate-800">
                            {c.contenido || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-shrink-0 flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                if (historyDetailCodigo) {
                  window.open(
                    `/admin/tickets-board/${historyDetailCodigo}`,
                    "_blank"
                  );
                }
              }}
              disabled={!historyDetailCodigo}
              className="flex items-center gap-2"
            >
              <Maximize className="h-4 w-4" />
              Abrir completo
            </Button>
            <Button
              variant="outline"
              onClick={() => setHistoryDetailOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-4xl flex flex-col overflow-hidden"
        >
          <SheetHeader className="border-b pb-4 pr-12">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <SheetTitle className="text-lg">
                  {formatTitleForUi(editForm.nombre) ||
                    `Detalle del ${uiTicketLower}`}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {!isStudent && selectedTicket?.codigo && (
                    <span className="text-xs text-slate-500">
                      Código: {selectedTicket.codigo}
                    </span>
                  )}
                </SheetDescription>
              </div>
              <div className="shrink-0">
                {canManageTickets && (
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
                    className="relative z-10 mt-1"
                  >
                    Reasignar {uiTicketLower}
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {!selectedTicket ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Selecciona un {uiTicketLower}
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
                      onClick={() => setDetailTab("respuesta")}
                      className={`px-3 py-1.5 text-xs border-l ${
                        detailTab === "respuesta"
                          ? "bg-slate-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Respuesta del Coach"
                    >
                      Respuesta Coach
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab("anteriores")}
                      className={`px-3 py-1.5 text-xs border-l ${
                        detailTab === "anteriores"
                          ? "bg-slate-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Historial de tickets del alumno"
                    >
                      Feedback anteriores
                    </button>
                    {!isStudent && (
                      <button
                        type="button"
                        onClick={() => setDetailTab("notas")}
                        className={`px-3 py-1.5 text-xs border-l ${
                          detailTab === "notas"
                            ? "bg-slate-900 text-white"
                            : "hover:bg-gray-50"
                        }`}
                        title="Notas internas"
                      >
                        Notas internas
                      </button>
                    )}
                  </div>
                </div>

                <div className={detailTab === "general" ? "block" : "hidden"}>
                  <div className="p-6 space-y-8">
                    {/* Alerta de Pausado */}
                    {coerceStatus(editForm.estado as any) === "PAUSADO" && (
                      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          Este {uiTicketLower} está pausado y requiere acción.
                          Por favor envía la información correspondiente.
                        </div>
                      </div>
                    )}

                    {/* Título editable */}
                    {canEdit && (
                      <div className="space-y-1">
                        <Input
                          className="text-lg font-semibold border-transparent hover:border-slate-200 px-0 h-auto py-1 focus:ring-0 focus:border-slate-300 bg-transparent shadow-none"
                          value={editForm.nombre ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              nombre: e.target.value,
                            }))
                          }
                          placeholder={`Título del ${uiTicketLower}`}
                          disabled={!canEdit}
                        />
                      </div>
                    )}

                    {/* Coaches (Movido desde Detalle) */}
                    {(() => {
                      const overrides = (ticketDetail as any)?.coaches_override;
                      const hasOverride =
                        Array.isArray(overrides) && overrides.length > 0;
                      const source = hasOverride
                        ? overrides
                        : ticketDetail?.coaches;

                      if (!Array.isArray(source) || source.length === 0)
                        return null;

                      // Mostrar solo el primero si el usuario pide "el coach"
                      const c = source[0];
                      // Normalizar si es string o objeto
                      const name =
                        typeof c === "string" ? c : c.nombre ?? "Coach";
                      const area = typeof c === "string" ? null : c.area;
                      const puesto = typeof c === "string" ? null : c.puesto;

                      return (
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                            title={`${name}${area ? ` · ${area}` : ""}${
                              puesto ? ` · ${puesto}` : ""
                            }`}
                          >
                            {name.slice(0, 20)}
                            {area ? ` · ${String(area).slice(0, 10)}` : ""}
                          </span>
                          {source.length > 1 && (
                            <span
                              className="text-xs text-slate-400 flex items-center"
                              title="Más coaches asignados"
                            >
                              +{source.length - 1}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Lista de Propiedades (Estilo Notion) */}
                    <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm items-start">
                      {/* Alumno */}
                      <div className="flex items-center gap-2 text-slate-500 h-6">
                        <User className="h-4 w-4" /> <span>Alumno</span>
                      </div>
                      <div className="min-h-[24px] flex items-center font-medium">
                        {ticketDetail?.alumno_nombre || "—"}
                      </div>

                      {/* Tipo (Movido desde Detalle) */}
                      <div className="flex items-center gap-2 text-slate-500 h-6">
                        <Tag className="h-4 w-4" /> <span>Tipo</span>
                      </div>
                      <div className="min-h-[24px] flex items-center">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                          {ticketDetail?.tipo || "—"}
                        </span>
                      </div>

                      {/* Tarea (Links) - Integrado aquí */}
                      <div className="flex items-center gap-2 text-slate-500 h-6 pt-1">
                        <LinkIcon className="h-4 w-4" /> <span>Tarea</span>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          type TaskLink = {
                            id?: string | number | null;
                            url: string;
                            title?: string | null;
                          };
                          const raw = Array.isArray(
                            (ticketDetail as any)?.links
                          )
                            ? (ticketDetail as any).links
                            : [];
                          const taskLinks: TaskLink[] = (raw as any[])
                            .map((it) => {
                              if (typeof it === "string")
                                return { id: null, url: it, title: null };
                              const url =
                                it?.url || it?.link || it?.enlace || "";
                              const title =
                                it?.titulo || it?.title || it?.nombre || null;
                              return {
                                id: it?.id ?? null,
                                url,
                                title,
                              } as TaskLink;
                            })
                            .filter((t) => !!t.url);

                          const onDeleteTask = async (
                            id?: string | number | null
                          ) => {
                            if (!id) return;
                            try {
                              await deleteTicketLink(id);
                              toast({ title: "Tarea eliminada" });
                              if (selectedTicket?.codigo)
                                await loadTicketDetail(selectedTicket.codigo);
                            } catch (e) {
                              console.error(e);
                              toast({ title: "Error al eliminar tarea" });
                            }
                          };

                          return (
                            <>
                              {taskLinks.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  {taskLinks.map((t, i) => (
                                    <div
                                      key={`task-${t.id ?? i}`}
                                      className="group flex items-center gap-2"
                                    >
                                      <a
                                        href={normalizeUrl(t.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-600 underline truncate max-w-[300px]"
                                        title={t.url}
                                      >
                                        {t.title || t.url}
                                      </a>
                                      {canEdit && t.id != null && (
                                        <button
                                          onClick={() => onDeleteTask(t.id!)}
                                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {canEdit && selectedTicket?.codigo && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    placeholder="Agregar link..."
                                    className="h-7 text-xs w-full max-w-[200px]"
                                    value={newAudioUrl}
                                    onChange={(e) =>
                                      setNewAudioUrl(e.target.value)
                                    }
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        const url = (newAudioUrl || "").trim();
                                        if (!url) return;
                                        try {
                                          await createTicketLink(
                                            selectedTicket.codigo!,
                                            { url }
                                          );
                                          setNewAudioUrl("");
                                          await loadTicketDetail(
                                            selectedTicket.codigo!
                                          );
                                          toast({ title: "Tarea creada" });
                                        } catch (err) {
                                          console.error(err);
                                          toast({
                                            title: "Error al crear tarea",
                                          });
                                        }
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                    title="Guardar tarea"
                                    onClick={async () => {
                                      const url = (newAudioUrl || "").trim();
                                      if (!url) return;
                                      try {
                                        await createTicketLink(
                                          selectedTicket.codigo!,
                                          { url }
                                        );
                                        setNewAudioUrl("");
                                        await loadTicketDetail(
                                          selectedTicket.codigo!
                                        );
                                        toast({ title: "Tarea creada" });
                                      } catch (err) {
                                        console.error(err);
                                        toast({
                                          title: "Error al crear tarea",
                                        });
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {!isStudent && (
                        <>
                          {/* Informante */}
                          <div className="flex items-center gap-2 text-slate-500 h-6">
                            <Users className="h-4 w-4" />{" "}
                            <span>Informante</span>
                          </div>
                          <div className="min-h-[24px] flex items-center">
                            {editForm.informante || "—"}
                          </div>

                          {/* Resuelto por */}
                          <div className="flex items-center gap-2 text-slate-500 h-6">
                            <CheckCircle2 className="h-4 w-4" />{" "}
                            <span>Resuelto por</span>
                          </div>
                          <div className="min-h-[24px] flex items-center">
                            {editForm.resuelto_por || "—"}
                          </div>
                        </>
                      )}

                      {/* Creación */}
                      <div className="flex items-center gap-2 text-slate-500 h-6">
                        <Clock className="h-4 w-4" /> <span>Creación</span>
                      </div>
                      <div className="min-h-[24px] flex items-center text-slate-700">
                        {ticketDetail?.created_at
                          ? new Date(ticketDetail.created_at).toLocaleString(
                              "es-ES",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "UTC",
                              }
                            )
                          : "—"}
                      </div>

                      {/* Resolución */}
                      <div className="flex items-center gap-2 text-slate-500 h-6">
                        <CalendarIcon className="h-4 w-4" />{" "}
                        <span>Resolución</span>
                      </div>
                      <div className="min-h-[24px] flex items-center text-slate-700">
                        {ticketDetail?.ultimo_estado?.estatus === "RESUELTO" &&
                        ticketDetail?.ultimo_estado?.fecha
                          ? new Date(
                              ticketDetail.ultimo_estado.fecha
                            ).toLocaleString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>

                      {!isStudent && (
                        <>
                          {/* Deadline */}
                          <div className="flex items-center gap-2 text-slate-500 h-6">
                            <AlertTriangle className="h-4 w-4" />{" "}
                            <span>Deadline</span>
                          </div>
                          <div className="min-h-[24px] flex items-center">
                            <input
                              type="date"
                              className="h-7 rounded border border-slate-200 px-2 text-xs"
                              value={
                                editForm.deadline
                                  ? new Date(editForm.deadline)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  deadline: e.target.value
                                    ? new Date(e.target.value).toISOString()
                                    : null,
                                }))
                              }
                              disabled={!canEdit}
                            />
                          </div>

                          {/* Cronómetro (SLA) oculto */}

                          {/* Estado */}
                          <div className="flex items-center gap-2 text-slate-500 h-6">
                            <RefreshCw className="h-4 w-4" />{" "}
                            <span>Estado</span>
                          </div>
                          <div className="min-h-[24px] flex items-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild disabled={!canEdit}>
                                <button
                                  className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${
                                    STATUS_STYLE[
                                      coerceStatus(editForm.estado as any)
                                    ]
                                  }`}
                                >
                                  {
                                    STATUS_LABEL[
                                      coerceStatus(editForm.estado as any)
                                    ]
                                  }
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {estados
                                  .filter(
                                    (st) => st !== "PAUSADO" || canManageTickets
                                  )
                                  .map((st) => (
                                    <DropdownMenuItem
                                      key={st}
                                      onClick={async () => {
                                        const newStatus = st as StatusKey;
                                        setEditForm((prev) => ({
                                          ...prev,
                                          estado: newStatus,
                                        }));

                                        if (selectedTicket?.codigo) {
                                          try {
                                            await updateTicket(
                                              selectedTicket.codigo,
                                              { estado: newStatus }
                                            );

                                            setTickets((prev) =>
                                              prev.map((t) =>
                                                t.id === selectedTicket.id
                                                  ? {
                                                      ...t,
                                                      estado: newStatus,
                                                    }
                                                  : t
                                              )
                                            );

                                            if (ticketDetail) {
                                              setTicketDetail((prev: any) => ({
                                                ...prev,
                                                estado: newStatus,
                                              }));
                                            }

                                            setSelectedTicket((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    estado: newStatus,
                                                  }
                                                : null
                                            );

                                            toast({
                                              title: "Estado actualizado",
                                            });
                                          } catch (e) {
                                            console.error(e);
                                            toast({
                                              title:
                                                "Error al actualizar estado",
                                              variant: "destructive",
                                            });
                                          }
                                        }
                                      }}
                                      className="text-xs"
                                    >
                                      <div
                                        className={`inline-flex items-center rounded-md px-2 py-0.5 border ${
                                          STATUS_STYLE[st as StatusKey]
                                        }`}
                                      >
                                        {STATUS_LABEL[st as StatusKey]}
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </>
                      )}
                    </div>

                    <Separator />

                    {/* Descripción y tareas (Movido desde Detalle) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-900">
                          Descripción
                        </div>
                        {!descEditing && canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
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
                        <div className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 p-3 rounded border border-slate-100">
                          {visibleDesc || "—"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            rows={8}
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            placeholder={`Escribe la descripción del ${uiTicketLower}...`}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDescEditing(false);
                                setDescDraft("");
                              }}
                              disabled={savingDesc}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!selectedTicket?.codigo) return;
                                setSavingDesc(true);
                                try {
                                  await updateTicket(selectedTicket.codigo, {
                                    descripcion: (descDraft || "").trim(),
                                  } as any);
                                  await loadTicketDetail(selectedTicket.codigo);
                                  setDescEditing(false);
                                  toast({
                                    title: "Descripción actualizada",
                                  });
                                } catch (e) {
                                  console.error(e);
                                  toast({
                                    title: "Error al actualizar descripción",
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
                          ...extractUrlsFromDescription(visibleDesc),
                          ...(
                            (Array.isArray((ticketDetail as any)?.links)
                              ? (ticketDetail as any).links
                              : []) as any[]
                          )
                            .map((it: any) =>
                              typeof it === "string"
                                ? it
                                : it?.url || it?.link || it?.enlace || ""
                            )
                            .filter((s: string) => !!s),
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
                          <div className="pt-2">
                            <div className="text-xs font-medium text-slate-500 mb-1">
                              Enlaces detectados
                            </div>
                            <div className="flex flex-col gap-1">
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

                    <Separator />

                    {/* Archivos Adjuntos (Contexto del Ticket) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <Paperclip className="h-4 w-4 text-slate-500" />{" "}
                          Archivos Adjuntos
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <input
                              ref={generalFileInputRef}
                              type="file"
                              className="hidden"
                              multiple
                              onChange={(e) => {
                                const picked = Array.from(e.target.files ?? []);
                                if (!picked.length) return;
                                setGeneralFiles((prev) =>
                                  [...prev, ...picked].slice(0, 10)
                                );
                                e.currentTarget.value = "";
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() =>
                                generalFileInputRef.current?.click()
                              }
                            >
                              + Agregar Archivo
                            </Button>
                          </div>
                        )}
                      </div>

                      {files.length === 0 && generalFiles.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">
                          No hay archivos adjuntos.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {files
                            .filter((f) => {
                              // Heurística: Archivos creados cerca de la creación del ticket (< 5 min)
                              // se consideran "originales" del alumno.
                              // O si tienen prefijo [CTX]
                              const name = f.nombre_archivo || "";
                              if (name.startsWith("[CTX]")) return true;
                              if (name.startsWith("[RES]")) return false;

                              if (!ticketDetail?.created_at || !f.created_at)
                                return true; // Si no hay fecha, mostrar por defecto
                              const ticketTime = new Date(
                                ticketDetail.created_at
                              ).getTime();
                              const fileTime = new Date(f.created_at).getTime();
                              const diffMinutes =
                                (fileTime - ticketTime) / 1000 / 60;
                              return diffMinutes < 5;
                            })
                            .map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center gap-2 rounded border border-slate-100 bg-slate-50 p-2 text-xs group"
                              >
                                <div className="shrink-0 text-slate-400">
                                  {iconFor(f.mime_type, f.nombre_archivo)}
                                </div>
                                <div
                                  className="flex-1 truncate"
                                  title={f.nombre_archivo}
                                >
                                  {f.nombre_archivo.replace(/^\[CTX\]\s*/, "")}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!(
                                    f.mime_type ||
                                    mimeFromName(f.nombre_archivo)
                                  )?.startsWith("audio/") &&
                                    (f.url ? (
                                      <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-400 hover:text-slate-700"
                                        title="Abrir en nueva pestaña"
                                      >
                                        <Download className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          downloadFile(f.id, f.nombre_archivo)
                                        }
                                        className="text-slate-400 hover:text-slate-700"
                                        title="Descargar"
                                      >
                                        <Download className="h-3 w-3" />
                                      </button>
                                    ))}
                                  <button
                                    onClick={() => openPreview(f)}
                                    className="text-slate-400 hover:text-slate-700"
                                    title="Ver"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                  {canEdit && (
                                    <button
                                      onClick={() =>
                                        setFileToDelete({
                                          id: f.id,
                                          nombre_archivo: f.nombre_archivo,
                                        })
                                      }
                                      className="text-slate-400 hover:text-red-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          {canEdit &&
                            generalFiles.map((f, i) => (
                              <div
                                key={`new-gen-${i}`}
                                className="flex items-center gap-2 rounded border border-blue-100 bg-blue-50 p-2 text-xs"
                              >
                                <div className="shrink-0 text-blue-400">
                                  {iconFor(f.type, f.name)}
                                </div>
                                <div className="flex-1 truncate font-medium text-blue-700">
                                  {f.name}
                                </div>
                                <button
                                  onClick={() =>
                                    setGeneralFiles((prev) =>
                                      prev.filter((_, idx) => idx !== i)
                                    )
                                  }
                                  className="text-blue-400 hover:text-blue-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                      {canEdit && generalFiles.length > 0 && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!selectedTicket?.codigo) return;
                            setUploadingGeneralFiles(true);
                            try {
                              // Renombrar archivos con prefijo [CTX]
                              const renamedFiles = generalFiles.map((f) => {
                                return new File([f], `[CTX] ${f.name}`, {
                                  type: f.type,
                                });
                              });

                              await uploadTicketFiles(
                                selectedTicket.codigo,
                                renamedFiles,
                                generalUrls
                              );
                              toast({ title: "Archivos subidos" });
                              setGeneralFiles([]);
                              setGeneralUrls([]);
                              await loadFilesForTicket(selectedTicket.codigo);
                            } catch (e) {
                              console.error(e);
                              toast({ title: "Error al subir archivos" });
                            } finally {
                              setUploadingGeneralFiles(false);
                            }
                          }}
                          disabled={uploadingGeneralFiles}
                        >
                          {uploadingGeneralFiles
                            ? "Subiendo..."
                            : "Subir archivos"}
                        </Button>
                      )}

                      {/* Grabador de audio (General) */}
                      {canEdit && (
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant={isRecording ? "destructive" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => {
                              if (isRecording) stopRecording();
                              else startRecording();
                            }}
                          >
                            {isRecording ? "Detener" : "Grabar audio"}
                          </Button>
                          {isRecording && (
                            <span className="text-xs text-red-500 animate-pulse">
                              Grabando...
                            </span>
                          )}
                          {recordedUrl && (
                            <div className="flex items-center gap-2">
                              <audio
                                src={recordedUrl}
                                controls
                                className="h-6 w-24"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  URL.revokeObjectURL(recordedUrl!);
                                  setRecordedUrl(null);
                                  setRecordedBlob(null);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 text-xs"
                                onClick={addRecordedToGeneralFiles}
                              >
                                Guardar
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Agregar URL (General) */}
                      {canEdit && (
                        <>
                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              placeholder="Agregar URL..."
                              className="h-7 text-xs w-full max-w-[200px]"
                              value={newGeneralUrl}
                              onChange={(e) => setNewGeneralUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = (newGeneralUrl || "").trim();
                                  if (v) {
                                    setGeneralUrls((prev) => [...prev, v]);
                                    setNewGeneralUrl("");
                                  }
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const v = (newGeneralUrl || "").trim();
                                if (v) {
                                  setGeneralUrls((prev) => [...prev, v]);
                                  setNewGeneralUrl("");
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {generalUrls.length > 0 && (
                            <div className="flex flex-col gap-1 pt-1">
                              {generalUrls.map((u, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-1 rounded border border-slate-100"
                                >
                                  <LinkIcon className="h-3 w-3" />
                                  <span className="truncate flex-1">{u}</span>
                                  <button
                                    onClick={() =>
                                      setGeneralUrls((prev) =>
                                        prev.filter((_, idx) => idx !== i)
                                      )
                                    }
                                    className="text-slate-400 hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {!isStudent && (
                      <>
                        <Separator />

                        {/* Estados (Movido desde Detalle) */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-slate-900">
                            Historial de Estados
                          </div>
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
                                  ).toLocaleString("es-ES", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "UTC",
                                  })}
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
                                      "es-ES",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "UTC",
                                      }
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
                    )}
                  </div>
                </div>

                <div className={detailTab === "respuesta" ? "block" : "hidden"}>
                  <div className="p-6 space-y-8">
                    {/* Archivos y Herramientas de Respuesta */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <Paperclip className="h-4 w-4 text-slate-500" /> Tu
                          Respuesta (Archivos y Evidencias)
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
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
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => editFileInputRef.current?.click()}
                            >
                              + Agregar Archivo
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Lista de archivos existentes (Filtrados: Solo respuestas > 5 min) + nuevos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {files
                          .filter((f) => {
                            // Heurística inversa: Archivos creados > 5 min después del ticket
                            // se consideran "respuestas" o evidencias del coach.
                            // O si tienen prefijo [RES]
                            const name = f.nombre_archivo || "";
                            if (name.startsWith("[RES]")) return true;
                            if (name.startsWith("[CTX]")) return false;

                            if (!ticketDetail?.created_at || !f.created_at)
                              return false; // Si no hay fecha, asumimos que es original (General)
                            const ticketTime = new Date(
                              ticketDetail.created_at
                            ).getTime();
                            const fileTime = new Date(f.created_at).getTime();
                            const diffMinutes =
                              (fileTime - ticketTime) / 1000 / 60;
                            return diffMinutes >= 5;
                          })
                          .map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-2 rounded border border-slate-100 bg-slate-50 p-2 text-xs group"
                            >
                              <div className="shrink-0 text-slate-400">
                                {iconFor(f.mime_type, f.nombre_archivo)}
                              </div>
                              <div
                                className="flex-1 truncate"
                                title={f.nombre_archivo}
                              >
                                {f.nombre_archivo.replace(/^\[RES\]\s*/, "")}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!(
                                  f.mime_type || mimeFromName(f.nombre_archivo)
                                )?.startsWith("audio/") && (
                                  <button
                                    onClick={() =>
                                      downloadFile(f.id, f.nombre_archivo)
                                    }
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openPreview(f)}
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  <Eye className="h-3 w-3" />
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() =>
                                      setFileToDelete({
                                        id: f.id,
                                        nombre_archivo: f.nombre_archivo,
                                      })
                                    }
                                    className="text-slate-400 hover:text-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        {canEdit &&
                          editFiles.map((f, i) => (
                            <div
                              key={`new-${i}`}
                              className="flex items-center gap-2 rounded border border-blue-100 bg-blue-50 p-2 text-xs"
                            >
                              <div className="shrink-0 text-blue-400">
                                {iconFor(f.type, f.name)}
                              </div>
                              <div className="flex-1 truncate font-medium text-blue-700">
                                {f.name}
                              </div>
                              <button
                                onClick={() =>
                                  setEditFiles((prev) =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                                className="text-blue-400 hover:text-blue-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                      </div>
                      {canEdit && editFiles.length > 0 && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!selectedTicket?.codigo) return;
                            setUploadingFiles(true);
                            try {
                              // Procesar imágenes -> WebP con logs antes de subir desde el botón
                              let filesToUpload: File[] = [...editFiles];
                              if (filesToUpload.length > 0) {
                                const processed: File[] = [];
                                for (const f of filesToUpload) {
                                  const type = (f.type || "").toLowerCase();
                                  const isImage =
                                    type.startsWith("image/") &&
                                    type !== "image/svg+xml";
                                  if (isImage) {
                                    const originalSizeKb = Math.round(
                                      f.size / 1024
                                    );
                                    console.log(
                                      `[UploadButton] Imagen original: name=${f.name}, type=${f.type}, size=${originalSizeKb} KB`
                                    );
                                    try {
                                      const webp = await compressImageToWebp(
                                        f,
                                        0.8
                                      );
                                      const webpSizeKb = Math.round(
                                        webp.size / 1024
                                      );
                                      console.log(
                                        `[UploadButton] Imagen convertida: name=${webp.name}, type=${webp.type}, size=${webpSizeKb} KB`
                                      );
                                      processed.push(webp);
                                    } catch (err) {
                                      console.error(
                                        "[UploadButton] Error convirtiendo a WebP, usando original",
                                        err
                                      );
                                      processed.push(f);
                                    }
                                  } else {
                                    console.log(
                                      `[UploadButton] Archivo no imagen: name=${
                                        f.name
                                      }, type=${f.type}, size=${Math.round(
                                        f.size / 1024
                                      )} KB`
                                    );
                                    processed.push(f);
                                  }
                                }
                                filesToUpload = processed;
                              }

                              // Renombrar con prefijo [RES]
                              const renamedFiles = filesToUpload.map((f) => {
                                return new File([f], `[RES] ${f.name}`, {
                                  type: f.type,
                                });
                              });

                              await uploadTicketFiles(
                                selectedTicket.codigo,
                                renamedFiles
                              );
                              toast({ title: "Archivos subidos" });
                              setEditFiles([]);
                              await loadFilesForTicket(selectedTicket.codigo);
                            } catch (e) {
                              console.error(e);
                              toast({ title: "Error" });
                            } finally {
                              setUploadingFiles(false);
                            }
                          }}
                          disabled={uploadingFiles}
                        >
                          {uploadingFiles ? "Subiendo..." : "Subir archivos"}
                        </Button>
                      )}

                      {/* Grabador de audio (Compacto) */}
                      {canEdit && (
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant={isRecording ? "destructive" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => {
                              if (isRecording) stopRecording();
                              else startRecording();
                            }}
                          >
                            {isRecording ? "Detener" : "Grabar audio"}
                          </Button>
                          {isRecording && (
                            <span className="text-xs text-red-500 animate-pulse">
                              Grabando...
                            </span>
                          )}
                          {recordedUrl && (
                            <div className="flex items-center gap-2">
                              <audio
                                src={recordedUrl}
                                controls
                                className="h-6 w-24"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  URL.revokeObjectURL(recordedUrl!);
                                  setRecordedUrl(null);
                                  setRecordedBlob(null);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 text-xs"
                                onClick={addRecordedToFiles}
                              >
                                Guardar
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Observaciones */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Observaciones y Chat
                      </Label>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                        {commentsLoading ? (
                          <div className="text-center py-4 text-xs text-slate-500">
                            Cargando...
                          </div>
                        ) : comments.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-500">
                            No hay observaciones.
                          </div>
                        ) : (
                          comments.map((c) => (
                            <div
                              key={c.id}
                              className="bg-white p-3 rounded border border-slate-100 shadow-sm text-sm group"
                            >
                              {editingCommentId === c.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingCommentText}
                                    onChange={(e) =>
                                      setEditingCommentText(e.target.value)
                                    }
                                    className="min-h-[60px]"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingCommentId(null)}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={handleUpdateComment}
                                    >
                                      Guardar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-xs text-slate-700">
                                      {c.user_nombre || "Usuario"}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {c.created_at
                                        ? new Date(c.created_at).toLocaleString(
                                            "es-ES"
                                          )
                                        : ""}
                                    </span>
                                  </div>
                                  <div className="text-slate-800 whitespace-pre-wrap break-words">
                                    {(() => {
                                      const content = c.contenido || "";
                                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                                      const parts = content.split(urlRegex);
                                      return parts.map((part, i) => {
                                        if (part.match(urlRegex)) {
                                          return (
                                            <a
                                              key={i}
                                              href={part}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline"
                                            >
                                              {part}
                                            </a>
                                          );
                                        }
                                        return part;
                                      });
                                    })()}
                                  </div>
                                  {canEdit && (
                                    <div className="mt-2 flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(c.id);
                                          setEditingCommentText(c.contenido);
                                        }}
                                        className="text-[10px] text-blue-600 hover:underline"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteComment(c.id)
                                        }
                                        className="text-[10px] text-red-600 hover:underline"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-2 items-start">
                          <Textarea
                            placeholder="Escribir nueva observación..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[40px] flex-1"
                            rows={2}
                          />
                          <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={addingComment || !newComment.trim()}
                            className="mt-0.5"
                          >
                            {addingComment ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              "Enviar"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={detailTab === "anteriores" ? "block" : "hidden"}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          Feedback anteriores del alumno
                        </div>
                        <div className="text-xs text-slate-500">
                          {selectedTicket?.alumno_nombre || "Alumno"}
                          {selectedTicket?.id_alumno
                            ? ` • ${selectedTicket.id_alumno}`
                            : ""}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          // Forzar recarga
                          setPreviousTicketsStudentCode(null);
                          setPreviousTickets([]);
                        }}
                        disabled={previousTicketsLoading}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Actualizar
                      </Button>
                    </div>

                    {!String(selectedTicket?.id_alumno ?? "").trim() ? (
                      <div className="text-sm text-slate-600">
                        Este ticket no tiene alumno asociado.
                      </div>
                    ) : previousTicketsLoading ? (
                      <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                        Cargando historial...
                      </div>
                    ) : previousTicketsError ? (
                      <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        {previousTicketsError}
                      </div>
                    ) : previousTickets.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No hay tickets anteriores para este alumno.
                      </div>
                    ) : (
                      <div className="rounded-md border border-slate-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Fecha</TableHead>
                              <TableHead className="text-xs">Título</TableHead>
                              <TableHead className="text-xs">Tipo</TableHead>
                              <TableHead className="text-xs">Estado</TableHead>
                              <TableHead className="text-xs text-right">
                                Ver
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previousTickets
                              .slice()
                              .sort((a, b) => {
                                const at = a.created_at
                                  ? new Date(a.created_at).getTime()
                                  : 0;
                                const bt = b.created_at
                                  ? new Date(b.created_at).getTime()
                                  : 0;
                                return bt - at;
                              })
                              .map((t) => {
                                const isCurrent =
                                  !!selectedTicket?.codigo &&
                                  String(t.codigo || "").trim() ===
                                    String(selectedTicket.codigo || "").trim();
                                const statusKey = coerceStatus(t.estado);
                                const label = STATUS_LABEL[statusKey];
                                const badge = STATUS_STYLE[statusKey];

                                return (
                                  <TableRow key={String(t.codigo ?? t.id)}>
                                    <TableCell className="text-xs text-slate-700 whitespace-nowrap">
                                      {t.created_at
                                        ? new Date(t.created_at).toLocaleString(
                                            "es-ES",
                                            {
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            }
                                          )
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="truncate">
                                          {formatTitleForUi(t.nombre) || "—"}
                                        </span>
                                        {isCurrent && (
                                          <Badge variant="secondary">
                                            Actual
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-600">
                                      {t.tipo || "—"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <span
                                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${badge}`}
                                      >
                                        {label}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => {
                                            const codigo = String(
                                              t.codigo || ""
                                            ).trim();
                                            if (!codigo) return;
                                            setHistoryDetailCodigo(codigo);
                                            setHistoryDetailOpen(true);
                                            loadHistoryTicketDetail(codigo);
                                          }}
                                          disabled={!t.codigo}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => {
                                            const codigo = String(
                                              t.codigo || ""
                                            ).trim();
                                            if (!codigo) return;
                                            window.open(
                                              `/admin/tickets-board/${codigo}`,
                                              "_blank"
                                            );
                                          }}
                                          disabled={!t.codigo}
                                        >
                                          <Maximize className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>

                {!isStudent && (
                  <div className={detailTab === "notas" ? "block" : "hidden"}>
                    <div className="p-6 space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Notas internas (Privado)
                          </Label>
                          <span className="text-xs text-slate-500">
                            Solo visible para el equipo
                          </span>
                        </div>

                        {/* Lista de notas */}
                        <div className="space-y-4 max-h-[400px] overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-4">
                          {internalNotesLoading ? (
                            <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                              Cargando notas...
                            </div>
                          ) : internalNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-slate-500">
                              <p>No hay notas internas.</p>
                            </div>
                          ) : (
                            internalNotes.map((note) => (
                              <div
                                key={note.id}
                                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                      {(note.user_nombre ||
                                        "U")[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-slate-900">
                                        {note.user_nombre || "Usuario"}
                                      </span>
                                      <span className="text-[10px] text-slate-500">
                                        {note.created_at
                                          ? new Date(
                                              note.created_at
                                            ).toLocaleDateString()
                                          : ""}
                                      </span>
                                    </div>
                                  </div>
                                  {canEdit && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                        onClick={() => {
                                          setEditingInternalNoteId(note.id);
                                          setEditingInternalNoteText(
                                            note.contenido
                                          );
                                        }}
                                      >
                                        <FileText className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                                        onClick={() =>
                                          handleDeleteInternalNote(note.id)
                                        }
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {editingInternalNoteId === note.id ? (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      value={editingInternalNoteText}
                                      onChange={(e) =>
                                        setEditingInternalNoteText(
                                          e.target.value
                                        )
                                      }
                                      className="min-h-[60px] text-sm"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingInternalNoteId(null);
                                          setEditingInternalNoteText("");
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleUpdateInternalNote}
                                        disabled={
                                          !editingInternalNoteText.trim()
                                        }
                                      >
                                        Guardar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-slate-700 whitespace-pre-wrap break-words pl-8">
                                    {note.contenido}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Formulario nueva nota */}
                        {canEdit && (
                          <div className="flex gap-2 items-start">
                            <Textarea
                              value={newInternalNote}
                              onChange={(e) =>
                                setNewInternalNote(e.target.value)
                              }
                              placeholder="Escribe una nota interna..."
                              className="min-h-[80px] resize-none"
                            />
                            <Button
                              onClick={handleAddInternalNote}
                              disabled={
                                addingInternalNote || !newInternalNote.trim()
                              }
                              className="shrink-0"
                            >
                              {addingInternalNote ? "..." : "Agregar"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <SheetFooter className="border-t pt-4">
            <div className="flex items-center justify-end gap-2">
              {selectedTicket?.codigo && canManageTickets && (
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
              {/* Botón de guardar oculto según solicitud */}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modal: Reasignar ticket */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Reasignar {uiTicketLower}
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
                return `¿Deseas reasignar el ${uiTicketLower} al coach ${name}?`;
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
                    title: `${uiTicket} reasignado a ${
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
                      studentCode,
                    });
                    setTickets(res.items ?? []);
                  } catch (err) {
                    // noop
                  }
                  setLoading(false);
                } catch (e) {
                  console.error(e);
                  toast({ title: `Error al reasignar ${uiTicketLower}` });
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

      {/* Confirmación: eliminar ticket */}
      {canManageTickets && (
        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {uiTicketLower}</AlertDialogTitle>
              <AlertDialogDescription>
                {`¿Deseas eliminar el ${uiTicketLower} "${
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
                              title: `${uiTicket} eliminado: ${
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
                    toast({ title: `${uiTicket} eliminado` });
                  } catch (e) {
                    console.error(e);
                    toast({ title: `Error al eliminar ${uiTicketLower}` });
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
      {/* Modal: Crear Ticket Manual */}
      <CreateTicketModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultStudentCode={studentCode}
        onSuccess={() => {
          // Recargar tickets
          setLoading(true);
          getTickets({
            page: 1,
            pageSize: 500,
            search,
            fechaDesde,
            fechaHasta,
            coach: coachFiltro || undefined,
            studentCode,
          })
            .then((res) => setTickets(res.items ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
        }}
      />
    </div>
  );
}
