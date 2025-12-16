"use client";

import type React from "react";

import { useEffect, useMemo, useState, useRef } from "react";
import type { StudentItem } from "@/lib/data-service";
import {
  Plus,
  TicketIcon,
  FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  Loader2,
  Search,
  Pencil,
  X,
  Paperclip,
  Mic,
  LinkIcon,
  Calendar,
  Clock,
  User,
  Users,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  CalendarIcon,
  RefreshCw,
  Trash2,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import VideoPlayer from "@/components/chat/VideoPlayer";
import {
  getCoachTickets,
  type CoachTicket,
  getCoachStudents,
  type CoachStudent,
  getCoachByCode,
  type CoachItem,
  getCoaches,
} from "./api";
import {
  updateTicket,
  getTicketFiles,
  getTicketFile,
  getOpciones,
  createTicket,
  deleteTicketFile,
  uploadTicketFiles,
  deleteTicket,
} from "@/app/admin/alumnos/api";
import { toast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";
import { useAuth } from "@/hooks/use-auth";
import {
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
} from "@/app/admin/tickets-board/api";
import { convertBlobToMp3 } from "@/lib/audio-converter";

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

const estados: StatusKey[] = [
  "PENDIENTE",
  "EN_PROGRESO",
  "PENDIENTE_DE_ENVIO",
  "PAUSADO",
  "RESUELTO",
];

function coerceStatus(raw?: string | null): StatusKey {
  if (!raw) return "PENDIENTE";
  const up = raw.toUpperCase();
  if (up === "EN_PROGRESO") return "EN_PROGRESO";
  if (up === "PENDIENTE_DE_ENVIO") return "PENDIENTE_DE_ENVIO";
  if (up === "PAUSADO") return "PAUSADO";
  if (up === "RESUELTO") return "RESUELTO";
  return "PENDIENTE";
}

const PRIORITY_COLORS = {
  BAJA: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIA: "bg-blue-100 text-blue-700 border-blue-200",
  ALTA: "bg-red-100 text-red-700 border-red-200",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
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

function iconFor(mime: string | null, name?: string) {
  const m = mime || mimeFromName(name) || "";
  if (m.startsWith("image/")) return <FileImage className="h-4 w-4" />;
  if (m.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
  if (m.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
  if (m === "application/pdf") return <FileText className="h-4 w-4" />;
  if (
    [
      "application/zip",
      "application/x-7z-compressed",
      "application/x-rar-compressed",
    ].includes(m)
  )
    return <FileArchive className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
}

function TicketTimer({ hours }: { hours: number }) {
  // Convert initial hours to milliseconds
  const initialMs = hours * 3600 * 1000;
  const [timeLeft, setTimeLeft] = useState(initialMs);

  useEffect(() => {
    setTimeLeft(hours * 3600 * 1000);
  }, [hours]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Si el tiempo se agotó, mostrar 0 en lugar de números negativos
  if (timeLeft <= 0) {
    return <span>0h 0m 0s</span>;
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const absSeconds = Math.abs(totalSeconds);

  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = absSeconds % 60;

  return (
    <span>
      {h}h {m}m {s}s
    </span>
  );
}

export default function TicketsPanelCoach({
  student,
  coachCode: coachCodeProp,
}: {
  student: StudentItem;
  coachCode?: string;
}) {
  const coachCode = coachCodeProp ?? (student?.code as unknown as string);
  const todayYMDLocal = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [query, setQuery] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [studentFiltro, setStudentFiltro] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [openCreate, setOpenCreate] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createTipo, setCreateTipo] = useState("");
  const [tipos, setTipos] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [localTickets, setLocalTickets] = useState<any[]>([]);
  const [coachStudents, setCoachStudents] = useState<
    {
      alumno: string;
      nombre: string;
      fase?: string | null;
      estatus?: string | null;
    }[]
  >([]);
  const [selectedAlumno, setSelectedAlumno] = useState<string>("");
  const [studentQuery, setStudentQuery] = useState("");
  const [coachArea, setCoachArea] = useState<string | null>(null);
  const [allCoaches, setAllCoaches] = useState<CoachItem[]>([]);
  const [createDescripcion, setCreateDescripcion] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    { url: string; type: string; name: string; size: number }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<CoachTicket[]>([]);
  const [fechaDesde, setFechaDesde] = useState<string>(todayYMDLocal());
  const [fechaHasta, setFechaHasta] = useState<string>(todayYMDLocal());
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
  const [fileToDelete, setFileToDelete] = useState<null | {
    id: string;
    nombre_archivo: string;
  }>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<null | {
    id: string;
    nombre_archivo: string;
    mime_type: string | null;
    url?: string;
  }>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [blobCache, setBlobCache] = useState<Record<string, string>>({});
  // Aviso inline: si el ticket está pausado, mostramos un banner dentro del Drawer
  const [editActiveTab, setEditActiveTab] = useState<string>("general");

  type ExtraDetails = {
    prioridad?: "BAJA" | "MEDIA" | "ALTA";
    plazo?: number | null;
    restante?: number | null;
    informante?: string;
    resolucion?: string;
    resuelto_por?: string;
    revision?: string;
    tarea?: string;
    equipo?: string[];
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<CoachTicket | null>(null);
  const [editForm, setEditForm] = useState<
    ExtraDetails & {
      nombre?: string | null;
      estado?: StatusKey | string | null;
      deadline?: string | null;
    }
  >({});
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<
    { url: string; type: string; name: string; size: number }[]
  >([]);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editLinkInput, setEditLinkInput] = useState("");
  const [editLinks, setEditLinks] = useState<string[]>([]);
  const [uploadingEditFiles, setUploadingEditFiles] = useState(false);
  const [detailsById, setDetailsById] = useState<
    Record<string | number, ExtraDetails>
  >({});
  // Detalle del ticket (API)
  const [ticketDetail, setTicketDetail] = useState<any | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [ticketDetailError, setTicketDetailError] = useState<string | null>(
    null
  );

  const [editFilesLoading, setEditFilesLoading] = useState(false);
  const [editExistingFiles, setEditExistingFiles] = useState<
    {
      id: string;
      nombre_archivo: string;
      mime_type: string | null;
      tamano_bytes: number | null;
      created_at: string | null;
      url?: string | null;
    }[]
  >([]);
  // Edición de descripción
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  // Confirmación de eliminación de ticket
  const [deleteTicketCodigo, setDeleteTicketCodigo] = useState<string | null>(
    null
  );
  const [deletingTicket, setDeletingTicket] = useState(false);

  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const isStudent = (user?.role || "").toLowerCase() === "student";
  const canEdit = !isStudent;

  // Permisos especiales: además de admin, permitir pausar a usuarios puntuales
  // (mismos códigos que tienen permiso de eliminar/reasignar en el tablero admin)
  const privilegedTicketManagerCodes = new Set<string>([
    "PKBT2jVtzKzN7TpnLZkPj", // Katherine
    "mQ2dwRX3xMzV99e3nh9eb", // Pedro
  ]);
  const currentUserCodigo = String((user as any)?.codigo || "");
  const canPauseTickets =
    isAdmin || privilegedTicketManagerCodes.has(currentUserCodigo);

  // Evitar que el filtro quede en un estado no permitido (ej. si se comparte URL/estado previo)
  useEffect(() => {
    if (!canPauseTickets && String(statusFiltro || "").toUpperCase() === "PAUSADO") {
      setStatusFiltro("__all__");
    }
  }, [canPauseTickets, statusFiltro]);

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

  // Reasignar ticket
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignCoach, setReassignCoach] = useState<string>("");
  const [reassignConfirmOpen, setReassignConfirmOpen] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Audio recording and URL states (from TicketsBoard)
  const [newAudioUrl, setNewAudioUrl] = useState<string>("");
  const [audioUrls, setAudioUrls] = useState<string[]>([]);

  // General tab specific states
  const [generalFiles, setGeneralFiles] = useState<File[]>([]);
  const [generalUrls, setGeneralUrls] = useState<string[]>([]);
  const [newGeneralUrl, setNewGeneralUrl] = useState("");

  useEffect(() => {
    if (!editOpen || !editTicket?.codigo) return;
    let alive = true;
    (async () => {
      try {
        setEditFilesLoading(true);
        const list = await getTicketFiles(editTicket.codigo!);
        if (!alive) return;
        setEditExistingFiles(list);
      } catch (e) {
        if (!alive) return;
        setEditExistingFiles([]);
      } finally {
        if (alive) setEditFilesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editOpen, editTicket?.codigo]);

  // Cargar detalle cuando se abre el ticket (necesario para General y Detalle)
  useEffect(() => {
    if (!editOpen) return;
    if (!editTicket?.codigo) return;
    loadTicketDetail(editTicket.codigo);
  }, [editOpen, editTicket?.codigo]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        try {
          const tiposRes = await getOpciones("tipo_ticket");
          const mapped = tiposRes
            .map((o) => ({ id: o.id, key: o.key, value: o.value }))
            .filter((x) => x.key && x.value);
          if (alive) setTipos(mapped);
        } catch {}
        if (coachCode) {
          try {
            const list = await getCoachStudents(coachCode);
            const simple = (list as CoachStudent[]).map((r) => ({
              alumno: r.id_alumno,
              nombre: r.alumno_nombre,
              fase: r.fase,
              estatus: r.estatus,
            }));
            if (alive) {
              setCoachStudents(simple);
              if (!selectedAlumno && simple.length > 0)
                setSelectedAlumno(simple[0].alumno);
            }
          } catch {}
          try {
            const coach: CoachItem | null = await getCoachByCode(coachCode);
            if (alive) setCoachArea(coach?.area ?? null);
          } catch {}
          // Cargar lista de coaches para poder resolver nombres humanos por código
          try {
            const coaches = await getCoaches({ page: 1, pageSize: 10000 });
            if (alive) setAllCoaches(coaches);
          } catch {}
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [coachCode]);

  useEffect(() => {
    const urls = createFiles.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type,
      name: f.name,
      size: f.size,
    }));
    setPreviews(urls);
    return () => {
      urls.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [createFiles]);

  {
    /* Enlaces para adjuntar como URLs */
  }
  <div className="space-y-2 pt-2">
    <Label className="text-sm font-medium">Enlaces</Label>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-10 pl-9"
          placeholder="https://..."
          value={editLinkInput}
          onChange={(e) => setEditLinkInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const raw = editLinkInput.trim();
              if (!raw) return;
              const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
              try {
                new URL(url);
                setEditLinks((prev) =>
                  Array.from(new Set([...prev, url])).slice(0, 10)
                );
                setEditLinkInput("");
              } catch {}
            }
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const raw = editLinkInput.trim();
          if (!raw) return;
          const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
          try {
            new URL(url);
            setEditLinks((prev) =>
              Array.from(new Set([...prev, url])).slice(0, 10)
            );
            setEditLinkInput("");
          } catch {}
        }}
      >
        Agregar
      </Button>
    </div>
    {editLinks.length > 0 && (
      <div className="space-y-2">
        {editLinks.map((u, i) => (
          <div
            key={`${u}-${i}`}
            className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2"
          >
            <LinkIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <a
              href={u}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline"
            >
              {u}
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() =>
                setEditLinks((prev) => prev.filter((x) => x !== u))
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )}

    <div className="mt-2 flex gap-2">
      <Button
        size="sm"
        className="flex-1"
        onClick={async () => {
          if (!editTicket?.codigo) return;
          if (editFiles.length === 0 && editLinks.length === 0) {
            toast({ title: "No hay archivos ni enlaces para subir" });
            return;
          }
          setUploadingEditFiles(true);
          try {
            await uploadTicketFiles(editTicket.codigo, editFiles, editLinks);
            toast({ title: "Archivos/URLs subidos" });
            setEditFiles([]);
            setEditLinks([]);
            // refrescar la lista de archivos existentes
            const list = await getTicketFiles(editTicket.codigo);
            setEditExistingFiles(list);
            // si el modal de archivos global está abierto para este ticket, refrescar
            if (openFiles === editTicket.codigo) {
              setFiles(list);
            }
          } catch (e) {
            console.error(e);
            toast({ title: "Error subiendo archivos/URLs" });
          } finally {
            setUploadingEditFiles(false);
          }
        }}
        disabled={uploadingEditFiles}
      >
        {uploadingEditFiles ? "Subiendo..." : "Subir archivos/URLs"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setEditFiles([]);
          setEditLinks([]);
          setEditLinkInput("");
        }}
      >
        Limpiar
      </Button>
    </div>
  </div>;
  function normalize(s?: string | null) {
    const str = (s ?? "").toString();
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();
  }

  // Helpers: estado y URLs para 'Detalle'
  function coerceStatus(v: any): StatusKey {
    const n = Number(v);
    if (!Number.isNaN(n)) {
      if (n === 1) return "PENDIENTE";
      if (n === 2) return "EN_PROGRESO";
      if (n === 3) return "PAUSADO";
      if (n === 4) return "PENDIENTE_DE_ENVIO";
      if (n === 5) return "RESUELTO";
    }
    const s = String(v || "").toUpperCase();
    if (s.includes("EN PROGRES")) return "EN_PROGRESO";
    if (s.includes("PROGRESO")) return "EN_PROGRESO";
    if (s.includes("PAUS")) return "PAUSADO";
    if (s.includes("ENVIO") || s.includes("ENVÍO")) return "PENDIENTE_DE_ENVIO";
    if (s.includes("RESUELT")) return "RESUELTO";
    return "PENDIENTE";
  }
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
    const re = /(https?:\/\/[^\s,]+|www\.[^\s,]+)/gi;
    const found = text.match(re) || [];
    const clean = found.map((u) => u.trim()).filter((u) => isLikelyUrl(u));
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

  async function loadTicketDetail(codigo?: string | null) {
    if (!codigo) return;
    try {
      setTicketDetailLoading(true);
      setTicketDetailError(null);
      setTicketDetail(null);
      const url = buildUrl(
        `/ticket/get/ticket/${encodeURIComponent(String(codigo))}`
      );
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

      // Load comments and internal notes
      loadComments(codigo);
      loadInternalNotes(codigo);
    } catch (e: any) {
      setTicketDetailError(
        String(e?.message || e || "Error al cargar detalle")
      );
    } finally {
      setTicketDetailLoading(false);
    }
  }

  function guessTipoKey(nombre: string): string | "" {
    const n = normalize(nombre);
    if (!n) return "";
    const pairs = [
      { kw: ["copy", "copys"], match: (lab: string) => lab.includes("copy") },
      {
        kw: ["tecnica", "tecnica", "técnica"],
        match: (lab: string) => lab.includes("tecn"),
      },
      {
        kw: ["pauta", "ads", "campana", "campaña"],
        match: (lab: string) => lab.includes("pauta") || lab.includes("ads"),
      },
      {
        kw: ["diseno", "diseño", "creativo"],
        match: (lab: string) =>
          lab.includes("disen") || lab.includes("creativ"),
      },
      {
        kw: ["video", "edicion"],
        match: (lab: string) => lab.includes("video"),
      },
    ];
    const tipoList = tipos.map((t) => ({
      key: normalize(t.key),
      value: normalize(t.value),
      raw: t,
    }));
    for (const rule of pairs) {
      if (rule.kw.some((k) => n.includes(normalize(k)))) {
        const hit = tipoList.find(
          (t) => rule.match(t.value) || rule.match(t.key)
        );
        if (hit) return hit.raw.key;
      }
    }
    const exact = tipoList.find(
      (t) => n.includes(t.value) || n.includes(t.key)
    );
    return exact ? exact.raw.key : "";
  }

  useEffect(() => {
    if (!createNombre) return;
    if (!createTipo) {
      const g = guessTipoKey(createNombre);
      if (g) setCreateTipo(g);
    }
  }, [createNombre, tipos]);

  useEffect(() => {
    if (!openCreate) return;
    if (!coachArea) return;
    if (!tipos.length) return;
    if (createTipo) return;
    const areaN = normalize(coachArea);
    const match = tipos.find(
      (t) =>
        normalize(t.value) === areaN ||
        normalize(t.key) === areaN ||
        normalize(t.value).includes(areaN)
    );
    if (match) setCreateTipo(match.key);
  }, [openCreate, coachArea, tipos]);

  async function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;

    const processed: File[] = [];
    for (const f of picked) {
      if (f.type.startsWith("audio/")) {
        toast({
          title: "Procesando audio...",
          description: `Convirtiendo ${f.name} a MP3`,
        });
        try {
          const mp3 = await convertBlobToMp3(f);
          processed.push(mp3);
        } catch (err) {
          console.error(err);
          processed.push(f);
          toast({
            title: "Error al convertir audio",
            description: "Se usará el archivo original",
            variant: "destructive",
          });
        }
      } else {
        processed.push(f);
      }
    }

    setCreateFiles((prev) => {
      const next = [...prev, ...processed];
      return next.slice(0, 10);
    });
    e.currentTarget.value = "";
  }

  function removeFileAt(idx: number) {
    setCreateFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreateSubmit() {
    if (!selectedAlumno) {
      toast({ title: "Selecciona un alumno" });
      return;
    }
    if (!createNombre.trim()) {
      toast({ title: "Escribe un nombre" });
      return;
    }
    const tipo =
      createTipo || guessTipoKey(createNombre) || (tipos[0]?.key ?? "");
    if (!tipo) {
      toast({ title: "No se pudo determinar el tipo" });
      return;
    }
    let descripcion = createDescripcion.trim();
    const uniqueLinks = Array.from(
      new Set(links.map((u) => u.trim()).filter(Boolean))
    );
    if (uniqueLinks.length) {
      const urlsComma = uniqueLinks.join(", ");
      // Mantener descripcion aparte y sumar las URLs en una línea para fácil parseo del backend
      descripcion = descripcion
        ? `${descripcion}\nURLs: ${urlsComma}`
        : `URLs: ${urlsComma}`;
    }
    try {
      setCreating(true);
      const result = await createTicket({
        nombre: createNombre.trim(),
        id_alumno: selectedAlumno,
        tipo,
        descripcion: descripcion || undefined,
        archivos: createFiles.slice(0, 10),
        // URLs ahora se persisten en la descripción; opcionalmente podríamos seguir enviándolas en 'urls'
        // pero se ha solicitado centralizar el render basado en la descripción
        urls: [],
      });
      // Ya no adjuntamos URLs como "archivos"; se leerán desde la descripción
      // Disparar notificación local para el header inmediatamente
      try {
        const data = (result?.data ?? result) as any;
        const ticketId =
          data?.codigo || data?.id || data?.ticket_id || data?.ticketId;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ticket:notify", {
              detail: {
                title: `Ticket creado: ${createNombre.trim()}`,
                ticketId: ticketId ? String(ticketId) : undefined,
                previous: undefined,
                current: "CREADO",
                at: new Date().toISOString(),
              },
            })
          );
        }
      } catch {}
      const res = await getCoachTickets({
        coach: coachCode,
        page,
        pageSize,
        fechaDesde,
        fechaHasta,
      });
      setRows(res.data);
      setTotal(res.total);
      setOpenCreate(false);
      setCreateNombre("");
      setCreateTipo("");
      setCreateDescripcion("");
      setLinks([]);
      setCreateFiles([]);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      toast({ title: "Ticket creado" });
    } catch (e: any) {
      toast({ title: e?.message ?? "Error al crear ticket" });
    } finally {
      setCreating(false);
    }
  }

  function addLink() {
    const raw = linkInput.trim();
    if (!raw) return;
    const url = raw.match(/^https?:\/\//i) ? raw : `https://${raw}`;
    try {
      new URL(url);
      setLinks((prev) => Array.from(new Set([...prev, url])).slice(0, 10));
      setLinkInput("");
    } catch {}
  }

  async function startRecording() {
    try {
      if (!(navigator as any)?.mediaDevices?.getUserMedia) return;
      const stream = await (navigator as any).mediaDevices.getUserMedia({
        audio: true,
      });
      const MR: any = (window as any).MediaRecorder;
      if (!MR) return;
      const options: any = {};
      const candidates = ["audio/webm", "audio/ogg"];
      const isTypeSupported = MR.isTypeSupported?.bind(MR) ?? (() => true);
      for (const t of candidates) {
        if (isTypeSupported(t)) {
          options.mimeType = t;
          break;
        }
      }
      const mr: any = new MR(stream, options);
      audioChunksRef.current = [];
      mr.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const recordedType = options.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: recordedType });
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setRecordedBlob(blob);

        // Si NO estamos editando, convertir a MP3 y agregar a createFiles
        if (!editOpen) {
          toast({
            title: "Procesando audio...",
            description: "Convirtiendo a MP3",
          });
          convertBlobToMp3(blob)
            .then((mp3File) => {
              setCreateFiles((prev) => [...prev, mp3File].slice(0, 10));
              toast({ title: "Grabación convertida a MP3" });
            })
            .catch((err) => {
              console.error(err);
              const ext = recordedType.includes("ogg") ? "ogg" : "webm";
              const file = new File([blob], `grabacion-${Date.now()}.${ext}`, {
                type: recordedType,
              });
              setCreateFiles((prev) => [...prev, file].slice(0, 10));
              toast({ title: "Conversión a MP3 falló, adjuntado original" });
            });
        }
      };
      mediaRecorderRef.current = mr;
      // Start with 1s timeslices to ensure data availability
      mr.start(1000);
      setIsRecording(true);
    } catch {}
  }

  function stopRecording() {
    // Small delay to ensure the last chunk is captured
    setTimeout(() => {
      try {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== "inactive") mr.stop();
      } catch {}
      setIsRecording(false);
    }, 500);
  }

  function clearRecording() {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    setRecordedBlob(null);
    // Remove the latest audio recording from the file list
    setCreateFiles((prev) => {
      let indexToRemove = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (
          prev[i].type === "audio/webm" &&
          prev[i].name.startsWith("grabacion-")
        ) {
          indexToRemove = i;
          break;
        }
      }
      if (indexToRemove !== -1) {
        return prev.filter((_, i) => i !== indexToRemove);
      }
      return prev;
    });
  }

  function addRecordedToFiles() {
    if (!recordedBlob) return;
    toast({ title: "Procesando audio...", description: "Convirtiendo a MP3" });
    convertBlobToMp3(recordedBlob)
      .then((mp3File) => {
        if (editOpen) {
          setEditFiles((prev) => [...prev, mp3File]);
        } else {
          setCreateFiles((prev) => [...prev, mp3File]);
        }
        toast({ title: "Grabación convertida a MP3" });
      })
      .catch((err) => {
        console.error(err);
        const ext = recordedBlob.type?.includes("audio/ogg") ? "ogg" : "webm";
        const file = new File(
          [recordedBlob],
          `grabacion-${Date.now()}.${ext}`,
          { type: recordedBlob.type || "audio/webm" }
        );
        if (editOpen) {
          setEditFiles((prev) => [...prev, file]);
        } else {
          setCreateFiles((prev) => [...prev, file]);
        }
        toast({ title: "Conversión a MP3 falló, adjuntado original" });
      })
      .finally(() => {
        if (audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
          setAudioPreviewUrl(null);
        }
        setRecordedBlob(null);
      });
  }

  function addRecordedToGeneralFiles() {
    if (!recordedBlob) return;
    toast({ title: "Procesando audio...", description: "Convirtiendo a MP3" });
    convertBlobToMp3(recordedBlob)
      .then((mp3File) => {
        setGeneralFiles((prev) => [...prev, mp3File]);
        toast({ title: "Grabación convertida a MP3" });
      })
      .catch((err) => {
        console.error(err);
        const ext = recordedBlob.type?.includes("audio/ogg") ? "ogg" : "webm";
        const file = new File(
          [recordedBlob],
          `grabacion-${Date.now()}.${ext}`,
          { type: recordedBlob.type || "audio/webm" }
        );
        setGeneralFiles((prev) => [...prev, file]);
        toast({ title: "Conversión a MP3 falló, adjuntado original" });
      })
      .finally(() => {
        if (audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
          setAudioPreviewUrl(null);
        }
        setRecordedBlob(null);
      });
  }

  useEffect(() => {
    if (!coachCode) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getCoachTickets({
          coach: coachCode,
          page,
          pageSize,
          fechaDesde,
          fechaHasta,
        });
        if (!ctrl.signal.aborted) {
          setRows(res.data);
          setTotal(res.total);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message ?? "Error al cargar tickets");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [coachCode, page, pageSize, fechaDesde, fechaHasta]);

  // Snackbar inicial avisando sobre tickets en PAUSADO
  const didShowPausedToast = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (didShowPausedToast.current) return;
    const pausedCount = rows.filter(
      (t) => String(t.estado ?? "").toUpperCase() === "PAUSADO"
    ).length;
    if (pausedCount > 0) {
      didShowPausedToast.current = true;
      toast({
        title: "Tickets pausados requieren atención",
        description: `Tienes ${pausedCount} ticket(s) en Pausado. Revisa y envía la información correspondiente.`,
      });
    }
  }, [loading, rows]);

  const combined = useMemo(() => {
    const locals = localTickets.map((t) => ({
      id: t.id,
      codigo: "",
      nombre: t.nombre,
      id_alumno: null,
      alumno_nombre: null,
      created_at: t.creacion,
      deadline: null,
      estado: t.estado as any,
    })) as CoachTicket[];
    return [...locals, ...rows];
  }, [localTickets, rows]);

  // Lista compacta de alumnos que sí tienen tickets en el rango actual
  const studentsFromTickets = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((t) => {
      const id = String(t.id_alumno || "");
      if (!id) return;
      if (!map.has(id)) map.set(id, t.alumno_nombre || id);
    });
    return Array.from(map.entries()).map(([alumno, nombre]) => ({
      alumno,
      nombre,
    }));
  }, [rows]);

  // Resolver nombre humano para códigos de personas (alumno/coach)
  function resolvePersonNameGlobal(code?: string | null): string {
    const c = String(code || "").trim();
    if (!c) return "";
    // Si coincide con el alumno de este ticket abierto, usar su nombre
    if (editTicket && c === String(editTicket.id_alumno || "")) {
      return editTicket.alumno_nombre || c;
    }
    // Buscar en alumnos de este coach
    const s = coachStudents.find(
      (st) => String(st.alumno || "").toLowerCase() === c.toLowerCase()
    );
    if (s) return s.nombre || c;
    // Buscar en lista de coaches globales
    const coach = allCoaches.find(
      (co) => String((co as any).codigo || "").toLowerCase() === c.toLowerCase()
    );
    if (coach) return (coach as any).nombre || c;
    return c;
  }

  // Cuando cargamos el detalle, completar informante/resuelto_por con nombres
  useEffect(() => {
    if (!ticketDetail) return;
    setEditForm((prev) => ({
      ...prev,
      informante:
        (ticketDetail as any).informante_nombre ||
        resolvePersonNameGlobal((ticketDetail as any).informante),
      resuelto_por:
        (ticketDetail as any).resuelto_por_nombre ||
        resolvePersonNameGlobal((ticketDetail as any).resuelto_por),
    }));
  }, [ticketDetail]);

  const filtered = useMemo(() => {
    let list = combined;
    // Texto libre
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.nombre || "").toLowerCase().includes(q) ||
          (t.alumno_nombre || "").toLowerCase().includes(q) ||
          (t.codigo || "").toLowerCase().includes(q)
      );
    }
    // Filtro por estado
    if (statusFiltro && statusFiltro !== "__all__") {
      const sf = statusFiltro.toUpperCase();
      list = list.filter((t) => String(t.estado || "").toUpperCase() === sf);
    }
    // Filtro por alumno (código)
    if (studentFiltro && studentFiltro !== "__all__") {
      list = list.filter((t) => (t.id_alumno || "") === studentFiltro);
    }
    return list;
  }, [combined, query, statusFiltro, studentFiltro]);

  async function handleChangeEstado(
    ticketCodigo: string,
    newEstado: StatusKey
  ) {
    if (newEstado === "PAUSADO" && !canPauseTickets) {
      return;
    }
    try {
      await updateTicket(ticketCodigo, { estado: newEstado });
      // Notificación local: cambio de estado
      try {
        const t = rows.find((r) => r.codigo === ticketCodigo);
        const title = `Ticket actualizado: ${t?.nombre || ticketCodigo} → ${
          STATUS_LABEL[newEstado]
        }`;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ticket:notify", {
              detail: {
                title,
                ticketId: ticketCodigo,
                previous: undefined,
                current: newEstado,
                at: new Date().toISOString(),
              },
            })
          );
        }
      } catch {}
      toast({ title: "Ticket actualizado" });
    } catch (e: any) {
      toast({ title: e?.message ?? "Error al actualizar ticket" });
      try {
        const res = await getCoachTickets({ coach: coachCode, page, pageSize });
        setRows(res.data);
        setTotal(res.total);
      } catch {}
    }
  }

  async function openFilesFor(ticketCode?: string | null) {
    if (!ticketCode) return;
    try {
      setOpenFiles(ticketCode);
      setFilesLoading(true);
      const list = await getTicketFiles(ticketCode);
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
      // setDownloadMessage("Descargando archivo...");
      // setDownloadProgress(null);
      // setDownloadModalOpen(true);

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
      if ((!blob || blob.size === 0) && local?.url) {
        // setDownloadModalOpen(false);
        window.open(local.url, "_blank");
        toast({ title: "Abriendo archivo en nueva pestaña..." });
        return;
      }

      if (!blob || blob.size === 0)
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
        }
      } catch (e) {
        console.warn("Error sniffing file type", e);
      }

      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // setDownloadModalOpen(false);
    } catch (e) {
      console.error(e);
      // setDownloadModalOpen(false);
      toast({ title: "Error al descargar archivo" });
    }
  }

  async function openPreview(f: {
    id: string;
    nombre_archivo: string;
    mime_type: string | null;
    url?: string | null;
  }) {
    try {
      setPreviewOpen(true);
      setPreviewLoading(true);
      const cached = blobCache[f.id];
      if (cached) {
        setPreviewFile({ ...f, url: cached });
        return;
      }
      // Si el backend ya provee una URL pública, úsala directamente
      if (f.url) {
        setPreviewFile({ ...f, url: f.url });
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
      setPreviewFile({ ...f, url: f.url ?? undefined });
    } finally {
      setPreviewLoading(false);
    }
  }

  function clearPreviewCache() {
    Object.values(blobCache).forEach((u) => URL.revokeObjectURL(u));
    setBlobCache({});
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

  async function confirmDeleteFile() {
    if (!fileToDelete) return;
    try {
      setDeletingFile(true);
      await deleteTicketFile(fileToDelete.id);
      toast({
        title: "Archivo eliminado",
        description: fileToDelete.nombre_archivo,
      });
      // Refrescar listas en ambos contextos (modal global y pestaña de edición)
      if (openFiles) await openFilesFor(openFiles);
      if (editOpen && editTicket?.codigo) {
        try {
          const list = await getTicketFiles(editTicket.codigo);
          setEditExistingFiles(list);
        } catch {}
      }
      setFileToDelete(null);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al eliminar archivo",
        description: String(e ?? ""),
        variant: "destructive",
      });
    } finally {
      setDeletingFile(false);
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
    if (!editTicket?.codigo || !newComment.trim()) return;
    try {
      setAddingComment(true);
      await createTicketComment(editTicket.codigo, newComment);
      setNewComment("");
      await loadComments(editTicket.codigo);
      toast({ title: "Observación agregada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al agregar observación" });
    } finally {
      setAddingComment(false);
    }
  }

  async function handleUpdateComment() {
    if (!editingCommentId || !editingCommentText.trim()) return;
    try {
      await updateTicketComment(editingCommentId, editingCommentText);
      setEditingCommentId(null);
      setEditingCommentText("");
      if (editTicket?.codigo) await loadComments(editTicket.codigo);
      toast({ title: "Observación actualizada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al actualizar observación" });
    }
  }

  async function handleDeleteComment(id: string) {
    if (!confirm("¿Eliminar esta observación?")) return;
    try {
      await deleteTicketComment(id);
      if (editTicket?.codigo) await loadComments(editTicket.codigo);
      toast({ title: "Observación eliminada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al eliminar observación" });
    }
  }

  // --- Handlers para Notas Internas ---

  async function loadInternalNotes(codigo: string) {
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
    if (!editTicket?.codigo || !newInternalNote.trim()) return;
    try {
      setAddingInternalNote(true);
      await createInternalNote(editTicket.codigo, newInternalNote);
      setNewInternalNote("");
      await loadInternalNotes(editTicket.codigo);
      toast({ title: "Nota interna agregada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al agregar nota interna" });
    } finally {
      setAddingInternalNote(false);
    }
  }

  async function handleUpdateInternalNote() {
    if (!editingInternalNoteId || !editingInternalNoteText.trim()) return;
    try {
      await updateInternalNote(editingInternalNoteId, editingInternalNoteText);
      setEditingInternalNoteId(null);
      setEditingInternalNoteText("");
      if (editTicket?.codigo) await loadInternalNotes(editTicket.codigo);
      toast({ title: "Nota interna actualizada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al actualizar nota interna" });
    }
  }

  async function handleDeleteInternalNote(id: string) {
    if (!confirm("¿Eliminar esta nota interna?")) return;
    try {
      await deleteInternalNote(id);
      if (editTicket?.codigo) await loadInternalNotes(editTicket.codigo);
      toast({ title: "Nota interna eliminada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al eliminar nota interna" });
    }
  }

  return (
    <div className="h-full flex flex-col overflow-auto bg-white">
      <div className="border-b bg-white px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <TicketIcon className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Tickets
              </h3>
              <p className="text-xs text-slate-500">Vista de coach</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPage(1);
                }}
              />
              <span className="text-slate-400">—</span>
              <input
                type="date"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 bg-transparent"
              onClick={() => {
                const hoy = todayYMDLocal();
                setFechaDesde(hoy);
                setFechaHasta(hoy);
                setPage(1);
              }}
            >
              Hoy
            </Button>
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear nuevo ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="alumno" className="text-sm font-medium">
                      Alumno
                    </Label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="alumno-search"
                          className="h-10 pl-9"
                          placeholder="Buscar por nombre o código…"
                          value={studentQuery}
                          onChange={(e) => setStudentQuery(e.target.value)}
                        />
                      </div>
                      <Select
                        value={selectedAlumno}
                        onValueChange={setSelectedAlumno}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecciona un alumno" />
                        </SelectTrigger>
                        <SelectContent>
                          {(studentQuery
                            ? coachStudents.filter((s) => {
                                const q = normalize(studentQuery);
                                return (
                                  normalize(s.nombre).includes(q) ||
                                  normalize(s.alumno).includes(q)
                                );
                              })
                            : coachStudents
                          ).map((s) => (
                            <SelectItem key={s.alumno} value={s.alumno}>
                              {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="text-sm font-medium">
                        Nombre del ticket
                      </Label>
                      <Input
                        id="nombre"
                        className="h-10"
                        value={createNombre}
                        onChange={(e) => setCreateNombre(e.target.value)}
                        placeholder="Asunto del ticket"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo" className="text-sm font-medium">
                        Tipo
                      </Label>
                      <Select value={createTipo} onValueChange={setCreateTipo}>
                        <SelectTrigger id="tipo" className="h-10">
                          <SelectValue placeholder="(Automático)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">(Automático)</SelectItem>
                          {tipos.map((t) => (
                            <SelectItem key={t.id} value={t.key}>
                              {t.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="descripcion"
                      className="text-sm font-medium"
                    >
                      Descripción
                    </Label>
                    <textarea
                      id="descripcion"
                      className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
                      value={createDescripcion}
                      onChange={(e) => setCreateDescripcion(e.target.value)}
                      placeholder="Detalles del ticket..."
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Adjuntos</Label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        onChange={onFileInputChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Paperclip className="h-4 w-4" />
                        Archivos
                      </Button>
                      {!isRecording ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={startRecording}
                          className="gap-2 bg-transparent"
                        >
                          <Mic className="h-4 w-4" />
                          Grabar audio
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={stopRecording}
                          className="gap-2"
                        >
                          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                          Detener
                        </Button>
                      )}
                    </div>

                    {audioPreviewUrl && (
                      <div className="rounded-lg border bg-slate-50 p-3 flex items-center gap-2">
                        <audio
                          src={audioPreviewUrl}
                          controls
                          className="w-full"
                          controlsList="nodownload"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearRecording}
                          className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar grabación"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {createFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">
                          {createFiles.length} archivo(s) seleccionado(s)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {previews.map((p, idx) => (
                            <div
                              key={`${p.name}-${idx}`}
                              className="group relative flex items-center gap-3 rounded-lg border bg-white p-3 hover:bg-slate-50"
                            >
                              {p.type.startsWith("image/") ? (
                                <img
                                  src={p.url || "/placeholder.svg"}
                                  alt={p.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100">
                                  {iconFor(p.type, p.name)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div
                                  className="truncate text-sm font-medium"
                                  title={p.name}
                                >
                                  {p.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {Math.ceil(p.size / 1024)} KB
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => removeFileAt(idx)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Enlaces</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          className="h-10 pl-9"
                          placeholder="https://..."
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addLink();
                            }
                          }}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={addLink}>
                        Agregar
                      </Button>
                    </div>
                    {links.length > 0 && (
                      <div className="space-y-2">
                        {links.map((u, i) => (
                          <div
                            key={`${u}-${i}`}
                            className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2"
                          >
                            <LinkIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <a
                              href={u}
                              target="_blank"
                              rel="noreferrer"
                              className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline"
                            >
                              {u}
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                setLinks((prev) => prev.filter((x) => x !== u))
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setOpenCreate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateSubmit}
                    disabled={
                      creating || !selectedAlumno || !createNombre.trim()
                    }
                  >
                    {creating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Crear ticket
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline" className="gap-1.5 font-normal">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {filtered.length} Total
          </Badge>
          {(
            [
              "PENDIENTE",
              "EN_PROGRESO",
              "PAUSADO",
              "PENDIENTE_DE_ENVIO",
              "RESUELTO",
            ] as StatusKey[]
          ).map((s) => {
            const count = filtered.filter(
              (t) => String(t.estado).toUpperCase() === s
            ).length;
            return (
              <Badge
                key={s}
                variant="outline"
                className={`gap-1.5 font-normal ${STATUS_STYLE[s]}`}
              >
                {STATUS_LABEL[s]}: {count}
              </Badge>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-10 pl-9 border-slate-200 bg-white"
            placeholder="Buscar tickets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
          <div className="flex gap-2 items-center flex-wrap">
            {/* Filtro Estado */}
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="PENDIENTE">
                  {STATUS_LABEL.PENDIENTE}
                </SelectItem>
                <SelectItem value="EN_PROGRESO">
                  {STATUS_LABEL.EN_PROGRESO}
                </SelectItem>
                {canPauseTickets && (
                  <SelectItem value="PAUSADO">{STATUS_LABEL.PAUSADO}</SelectItem>
                )}
                <SelectItem value="PENDIENTE_DE_ENVIO">
                  {STATUS_LABEL.PENDIENTE_DE_ENVIO}
                </SelectItem>
                <SelectItem value="RESUELTO">
                  {STATUS_LABEL.RESUELTO}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro Alumno (solo alumnos con tickets en el rango) */}
            <Select value={studentFiltro} onValueChange={setStudentFiltro}>
              <SelectTrigger className="h-9 w-[240px]">
                <SelectValue placeholder="Todos los alumnos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {studentsFromTickets.map((s) => (
                  <SelectItem key={s.alumno} value={s.alumno}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle de Vista */}
          <div className="inline-flex items-center rounded-md border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs ${
                viewMode === "kanban"
                  ? "bg-slate-900 text-white"
                  : "hover:bg-gray-50"
              }`}
              title="Vista Kanban"
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs border-l ${
                viewMode === "table"
                  ? "bg-slate-900 text-white"
                  : "hover:bg-gray-50"
              }`}
              title="Vista Tabla"
            >
              Tabla
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-6 bg-slate-50">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <TicketIcon className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">No hay tickets</p>
            <p className="text-sm text-slate-500">
              Crea un nuevo ticket para comenzar
            </p>
          </div>
        ) : viewMode === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-2">
            {(
              [
                "PENDIENTE",
                "EN_PROGRESO",
                "PAUSADO",
                "PENDIENTE_DE_ENVIO",
                "RESUELTO",
              ] as StatusKey[]
            ).map((col) => {
              const items = filtered.filter(
                (t) => String(t.estado ?? "").toUpperCase() === col
              );
              return (
                <div
                  key={col}
                  className="flex flex-col rounded-lg border border-slate-200 bg-white min-w-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const codigo = e.dataTransfer.getData("text/plain");
                    if (!codigo) return;

                    if (col === "PAUSADO" && !canPauseTickets) {
                      return;
                    }

                    setRows((prev) =>
                      prev.map((t) =>
                        t.codigo === codigo ? { ...t, estado: col } : t
                      )
                    );
                    await handleChangeEstado(codigo, col);
                  }}
                >
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className={`font-medium text-[10px] px-1.5 py-0 ${STATUS_STYLE[col]}`}
                      >
                        {STATUS_LABEL[col]}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {items.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 p-2">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        draggable={Boolean(t.codigo)}
                        onDragStart={(e) => {
                          if (!t.codigo) return;
                          e.dataTransfer.setData("text/plain", t.codigo);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={
                          "group rounded border bg-white p-2 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all " +
                          (String(t.estado ?? "").toUpperCase() === "PAUSADO"
                            ? "border-amber-300 ring-1 ring-amber-200 hover:border-amber-400"
                            : "border-slate-200 hover:border-slate-300")
                        }
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <h4
                            className="flex-1 text-xs font-medium text-slate-900 line-clamp-2 leading-tight"
                            title={t.nombre ?? undefined}
                          >
                            {t.nombre ?? "—"}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => {
                              setEditTicket(t);
                              const saved = detailsById[t.id] || {};
                              // Resolver nombres humanos para informante/resuelto_por cuando tengamos códigos
                              const resolvePersonName = (
                                code?: string | null
                              ): string => {
                                const c = (code ?? "").trim();
                                if (!c) return "";
                                // Si coincide con el alumno del ticket, usar nombre de alumno
                                if (c && c === (t.id_alumno ?? "")) {
                                  return t.alumno_nombre || c;
                                }
                                // Buscar en lista de alumnos de este coach
                                const s = coachStudents.find(
                                  (st) =>
                                    (st.alumno || "").toLowerCase() ===
                                    c.toLowerCase()
                                );
                                if (s) return s.nombre || c;
                                // Buscar en lista de coaches globales por código
                                const coach = allCoaches.find(
                                  (co) =>
                                    (co.codigo || "").toLowerCase() ===
                                    c.toLowerCase()
                                );
                                if (coach) return coach.nombre || c;
                                // Devolver el valor original si no se puede resolver
                                return c;
                              };
                              setEditForm({
                                nombre: t.nombre ?? "",
                                estado: (t.estado as any) ?? "PENDIENTE",
                                deadline: t.deadline ?? null,
                                prioridad: (saved.prioridad ?? "MEDIA") as any,
                                plazo: saved.plazo ?? null,
                                restante: saved.restante ?? null,
                                // Mostrar SIEMPRE nombres cuando sea posible
                                informante:
                                  (t as any).informante_nombre ||
                                  (resolvePersonName(
                                    saved.informante ?? (t as any).informante
                                  ) ??
                                    ""),
                                resolucion: saved.resolucion ?? "",
                                resuelto_por:
                                  (t as any).resuelto_por_nombre ||
                                  (resolvePersonName(
                                    saved.resuelto_por ??
                                      (t as any).resuelto_por
                                  ) ??
                                    ""),
                                revision: saved.revision ?? "",
                                tarea: saved.tarea ?? "",
                                equipo: Array.isArray(saved.equipo)
                                  ? saved.equipo
                                  : [],
                              });
                              setEditFiles([]);
                              setEditPreviews([]);
                              setEditLinks([]);
                              setEditLinkInput("");
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1 text-[10px] text-slate-600">
                          {String(t.estado ?? "").toUpperCase() ===
                            "PAUSADO" && (
                            <div className="flex items-center gap-1 text-amber-700">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span className="font-medium">
                                Requiere atención
                              </span>
                            </div>
                          )}
                          {t.alumno_nombre && (
                            <div
                              className="flex items-center gap-1 truncate"
                              title={t.alumno_nombre || undefined}
                            >
                              <User className="h-3 w-3 text-slate-400" />
                              <span className="truncate">
                                Alumno: {t.alumno_nombre}
                              </span>
                            </div>
                          )}
                          {(t as any).informante && (
                            <div
                              className="flex items-center gap-1 truncate"
                              title={
                                (t as any).informante_nombre ||
                                (t as any).informante ||
                                undefined
                              }
                            >
                              <Users className="h-3 w-3 text-slate-400" />
                              <span className="truncate">
                                Inf:{" "}
                                {(t as any).informante_nombre ||
                                  (t as any).informante}
                              </span>
                            </div>
                          )}
                          {(t as any).resuelto_por && (
                            <div
                              className="flex items-center gap-1 truncate"
                              title={
                                (t as any).resuelto_por_nombre ||
                                (t as any).resuelto_por ||
                                undefined
                              }
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span className="truncate">
                                Res:{" "}
                                {(t as any).resuelto_por_nombre ||
                                  (t as any).resuelto_por}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            <span className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-0 text-[9px] text-slate-600">
                              <Calendar className="h-2.5 w-2.5 text-slate-400" />
                              {fmtDate(t.created_at)}
                            </span>
                            {t.deadline && (
                              <span className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1 py-0 text-[9px] text-amber-700">
                                <Clock className="h-2.5 w-2.5" />
                                {fmtDate(t.deadline)}
                              </span>
                            )}
                          </div>
                          {t.codigo && (
                            <button
                              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors pt-0.5"
                              onClick={() => openFilesFor(t.codigo)}
                              type="button"
                            >
                              <FileIcon className="h-3 w-3" />
                              <span className="underline decoration-slate-300 hover:decoration-slate-900">
                                Archivos
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%]">Ticket</TableHead>
                  <TableHead className="w-[20%]">Alumno</TableHead>
                  <TableHead className="w-[18%]">Informante</TableHead>
                  <TableHead className="w-[12%]">Estado</TableHead>
                  <TableHead className="w-[12%]">Creación</TableHead>
                  <TableHead className="w-[12%]">Deadline</TableHead>
                  <TableHead className="text-right w-[80px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50">
                    <TableCell className="align-top">
                      <div
                        className="text-sm font-medium text-slate-900 truncate"
                        title={t.nombre ?? undefined}
                      >
                        {t.nombre ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div
                        className="text-sm text-slate-800 truncate"
                        title={t.alumno_nombre ?? undefined}
                      >
                        {t.alumno_nombre ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div
                        className="text-sm text-slate-800 truncate"
                        title={
                          (t as any).informante_nombre ||
                          (t as any).informante ||
                          undefined
                        }
                      >
                        {(t as any).informante_nombre ||
                          (t as any).informante ||
                          "—"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 border text-[10px] ${
                          STATUS_STYLE[coerceStatus(t.estado as any)]
                        }`}
                      >
                        {STATUS_LABEL[coerceStatus(t.estado as any)]}
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-sm text-slate-700">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="align-top text-sm text-slate-700">
                      {t.deadline
                        ? new Date(t.deadline).toLocaleString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditTicket(t);
                          setEditForm((prev) => ({
                            ...prev,
                            nombre: t.nombre ?? "",
                            estado: (t.estado as any) ?? "PENDIENTE",
                            deadline: t.deadline ?? null,
                          }));
                          setEditFiles([]);
                          setEditPreviews([]);
                          setEditLinks([]);
                          setEditLinkInput("");
                          setEditOpen(true);
                        }}
                      >
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination moved out of scroll area */}
      </div>

      {/* Footer pagination (fixed at bottom of panel) */}
      <div className="border-t bg-white px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Página {page} · {total} tickets en total
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}/página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Files Dialog */}

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
            <DialogTitle>Archivos adjuntos</DialogTitle>
          </DialogHeader>
          {filesLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando
              archivos…
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                <FileIcon className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Sin archivos adjuntos</p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="group rounded-lg border bg-white p-3 hover:bg-slate-50"
                  >
                    <div className="mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 mb-2">
                      {(() => {
                        const m = f.mime_type || mimeFromName(f.nombre_archivo);
                        if (m?.startsWith("image/")) {
                          const thumb = blobCache[f.id] || f.url;
                          return thumb ? (
                            <img
                              src={thumb || "/placeholder.svg"}
                              alt={f.nombre_archivo}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileImage className="h-8 w-8 text-slate-400" />
                          );
                        }
                        return (
                          <div className="text-slate-400">
                            {iconFor(m, f.nombre_archivo)}
                          </div>
                        );
                      })()}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="truncate text-sm font-medium mb-1"
                          title={f.nombre_archivo}
                        >
                          {shortenFileName(f.nombre_archivo, 20)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs break-all">
                        {f.nombre_archivo}
                      </TooltipContent>
                    </Tooltip>
                    <div className="text-xs text-slate-500 mb-2">
                      {f.tamano_bytes
                        ? `${Math.ceil(f.tamano_bytes / 1024)} KB`
                        : "—"}
                    </div>
                    <div className="flex gap-2 items-center">
                      {!(
                        f.mime_type || mimeFromName(f.nombre_archivo)
                      )?.startsWith("video/") &&
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
                            onClick={() => downloadFile(f.id, f.nombre_archivo)}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() =>
                          setFileToDelete({
                            id: f.id,
                            nombre_archivo: f.nombre_archivo,
                          })
                        }
                        aria-label={`Eliminar ${f.nombre_archivo}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onOpenChange={(v) => {
          setPreviewOpen(v);
          if (!v) setPreviewFile(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewFile?.nombre_archivo || "Previsualización"}
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
            </div>
          ) : previewFile?.url ? (
            <div className="max-h-[70vh] overflow-auto rounded-lg border bg-slate-50 p-4">
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
                      className="mx-auto max-h-[65vh]"
                    />
                  );
                }
                if (m === "application/pdf") {
                  return (
                    <iframe
                      src={previewFile.url}
                      className="h-[65vh] w-full"
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
                      className="h-[65vh] w-full"
                      title="Texto"
                    />
                  );
                }
                return (
                  <div className="py-20 text-center text-sm text-slate-500">
                    No se puede previsualizar este tipo de archivo.
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-slate-500">
              No hay previsualización disponible.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm delete file dialog */}
      <Dialog
        open={!!fileToDelete}
        onOpenChange={(v) => {
          if (!v) setFileToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar archivo</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600">
            ¿Deseas eliminar el archivo "{fileToDelete?.nombre_archivo}"? Esta
            acción no se puede deshacer.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToDelete(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmDeleteFile}
              disabled={deletingFile}
              className="ml-2"
            >
              {deletingFile ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-4xl flex flex-col overflow-hidden"
        >
          <SheetHeader className="border-b pb-4 pr-12">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <SheetTitle className="text-lg">
                  {editForm.nombre ||
                    editTicket?.nombre ||
                    "Detalle del ticket"}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {editTicket?.codigo && (
                    <span className="text-xs text-slate-500">
                      Código: {editTicket.codigo}
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
                    if (!editTicket?.codigo) return;
                    setReassignCoach("");
                    setReassignOpen(true);
                  }}
                  disabled={!editTicket?.codigo || !canEdit}
                  className="relative z-10 mt-1"
                >
                  Reasignar ticket
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {!editTicket ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Selecciona un ticket
              </div>
            ) : (
              <>
                <div className="px-6 pt-4">
                  <div className="inline-flex items-center rounded-md border bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEditActiveTab("general")}
                      className={`px-3 py-1.5 text-xs ${
                        editActiveTab === "general"
                          ? "bg-slate-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Contexto del alumno"
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditActiveTab("respuesta")}
                      className={`px-3 py-1.5 text-xs border-l ${
                        editActiveTab === "respuesta"
                          ? "bg-slate-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Respuesta del coach"
                    >
                      Respuesta Coach
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditActiveTab("notas")}
                      className={`px-3 py-1.5 text-xs border-l ${
                        editActiveTab === "notas"
                          ? "bg-slate-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      title="Notas internas"
                    >
                      Notas internas
                    </button>
                  </div>
                </div>

                <div
                  className={editActiveTab === "general" ? "block" : "hidden"}
                >
                  <div className="p-6 space-y-6">
                    {/* Coaches (Top) */}
                    {Array.isArray(ticketDetail?.coaches) &&
                      ticketDetail.coaches.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {ticketDetail.coaches
                            .slice(0, 1)
                            .map((c: any, idx: number) => (
                              <span
                                key={`${c.codigo_equipo ?? c.nombre ?? idx}`}
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
                            ))}
                          {ticketDetail.coaches.length > 1 && (
                            <span className="text-xs text-slate-400 self-center">
                              +{ticketDetail.coaches.length - 1}
                            </span>
                          )}
                        </div>
                      )}

                    {/* Alerta de Pausado */}
                    {coerceStatus(editForm.estado as any) === "PAUSADO" && (
                      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          Este ticket está pausado y requiere acción. Por favor
                          envía la información correspondiente.
                        </div>
                      </div>
                    )}

                    {/* Título editable */}
                    <div className="space-y-1">
                      <Input
                        className="text-lg font-semibold border-transparent hover:border-slate-200 px-0 h-auto py-1 focus:ring-0 focus:border-slate-300 bg-transparent shadow-none"
                        value={editForm.nombre ?? ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, nombre: e.target.value }))
                        }
                        placeholder="Título del ticket"
                        disabled={!canEdit}
                      />
                    </div>

                    {/* Tipo Chip */}
                    <div>
                      <Badge variant="secondary" className="font-normal">
                        {ticketDetail?.tipo || "General"}
                      </Badge>
                    </div>

                    {/* Lista de Propiedades (Estilo Notion) */}
                    <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm items-start">
                      {/* Alumno */}
                      <div className="flex items-center gap-2 text-slate-500 h-6">
                        <User className="h-4 w-4" /> <span>Alumno</span>
                      </div>
                      <div className="min-h-[24px] flex items-center font-medium">
                        {editTicket?.alumno_nombre || "—"}
                      </div>

                      {/* Tarea (Links) */}
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
                              if (editTicket?.codigo)
                                await loadTicketDetail(editTicket.codigo);
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
                              {canEdit && editTicket?.codigo && (
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
                                            editTicket.codigo!,
                                            { url }
                                          );
                                          setNewAudioUrl("");
                                          await loadTicketDetail(
                                            editTicket.codigo!
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
                                          editTicket.codigo!,
                                          { url }
                                        );
                                        setNewAudioUrl("");
                                        await loadTicketDetail(
                                          editTicket.codigo!
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

                      {/* Informante */}
                      <div className="flex items-center gap-2 text-slate-500 h-6">
                        <Users className="h-4 w-4" /> <span>Informante</span>
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
                              timeZone: "UTC",
                            })
                          : "—"}
                      </div>

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

                      {/* Tiempo restante (SLA) */}
                      {(ticketDetail?.plazo_info || editTicket?.plazo_info) &&
                        !(ticketDetail?.plazo_info || editTicket?.plazo_info)
                          ?.fue_respondido &&
                        coerceStatus(editForm.estado as any) !== "RESUELTO" && (
                          <>
                            <div className="flex items-center gap-2 text-slate-500 h-6">
                              <Clock className="h-4 w-4" />{" "}
                              <span>Tiempo restante</span>
                            </div>
                            <div className="min-h-[24px] flex flex-col justify-center">
                              <div
                                className={`flex items-center gap-2 font-medium ${
                                  (ticketDetail?.plazo_info ||
                                    editTicket?.plazo_info)!.horas_restantes <=
                                  0
                                    ? "text-red-600"
                                    : (ticketDetail?.plazo_info ||
                                        editTicket?.plazo_info)!
                                        .horas_restantes < 4
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                <TicketTimer
                                  hours={
                                    (ticketDetail?.plazo_info ||
                                      editTicket?.plazo_info)!.horas_restantes
                                  }
                                />
                                {(ticketDetail?.plazo_info ||
                                  editTicket?.plazo_info)!.horas_restantes <=
                                  0 && (
                                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                    Requiere atención
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                      {/* Estado */}
                      <div className="flex items-center gap-2 text-slate-500 h-6">
                        <RefreshCw className="h-4 w-4" /> <span>Estado</span>
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
                                (st) => st !== "PAUSADO" || canPauseTickets
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

                                    if (editTicket?.codigo) {
                                      try {
                                        await updateTicket(editTicket.codigo, {
                                          estado: newStatus,
                                        });

                                        // Update local state
                                        setRows((prev) =>
                                          prev.map((t) =>
                                            t.id === editTicket.id
                                              ? { ...t, estado: newStatus }
                                              : t
                                          )
                                        );
                                        setLocalTickets((prev) =>
                                          prev.map((t) =>
                                            t.id === editTicket.id
                                              ? { ...t, estado: newStatus }
                                              : t
                                          )
                                        );

                                        if (ticketDetail) {
                                          setTicketDetail((prev: any) => ({
                                            ...prev,
                                            estado: newStatus,
                                          }));
                                        }

                                        setEditTicket((prev) =>
                                          prev
                                            ? { ...prev, estado: newStatus }
                                            : null
                                        );

                                        toast({ title: "Estado actualizado" });
                                      } catch (e) {
                                        console.error(e);
                                        toast({
                                          title: "Error al actualizar estado",
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
                    </div>

                    <Separator />

                    {/* Descripción */}
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
                                if (!editTicket?.codigo) return;
                                setSavingDesc(true);
                                try {
                                  await updateTicket(editTicket.codigo, {
                                    descripcion: (descDraft || "").trim(),
                                  } as any);
                                  await loadTicketDetail(editTicket.codigo);
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
                          ...extractUrlsFromDescription(
                            ticketDetail?.descripcion
                          ),
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

                    {/* Archivos (Contexto) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <Paperclip className="h-4 w-4 text-slate-500" />{" "}
                          Archivos (Contexto)
                        </div>
                      </div>

                      {/* Lista de archivos [CTX] o < 5min */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {editExistingFiles
                          .filter((f) => {
                            const isRes = f.nombre_archivo.startsWith("[RES]");
                            if (isRes) return false;
                            const isCtx = f.nombre_archivo.startsWith("[CTX]");
                            if (isCtx) return true;
                            if (!ticketDetail?.created_at || !f.created_at)
                              return true;
                            const diff =
                              new Date(f.created_at).getTime() -
                              new Date(ticketDetail.created_at).getTime();
                            return diff < 5 * 60 * 1000;
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
                                  f.mime_type || mimeFromName(f.nombre_archivo)
                                )?.startsWith("video/") &&
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
                        {/* New General Files */}
                        {generalFiles.map((f, i) => (
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

                      {/* Upload Controls for General */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <input
                          id="general-file-upload"
                          type="file"
                          className="hidden"
                          multiple
                          onChange={async (e) => {
                            const picked = Array.from(e.target.files ?? []);
                            if (!picked.length) return;

                            const processed: File[] = [];
                            for (const f of picked) {
                              if (f.type.startsWith("audio/")) {
                                toast({
                                  title: "Procesando audio...",
                                  description: `Convirtiendo ${f.name} a MP3`,
                                });
                                try {
                                  const mp3 = await convertBlobToMp3(f);
                                  processed.push(mp3);
                                } catch (err) {
                                  console.error(err);
                                  processed.push(f);
                                  toast({
                                    title: "Error al convertir audio",
                                    description: "Se usará el archivo original",
                                    variant: "destructive",
                                  });
                                }
                              } else {
                                processed.push(f);
                              }
                            }

                            setGeneralFiles((prev) =>
                              [...prev, ...processed].slice(0, 10)
                            );
                            e.currentTarget.value = "";
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-2"
                          onClick={() =>
                            document
                              .getElementById("general-file-upload")
                              ?.click()
                          }
                        >
                          <Paperclip className="h-3 w-3" /> Adjuntar
                        </Button>

                        <Button
                          size="sm"
                          variant={isRecording ? "destructive" : "outline"}
                          className="h-7 text-xs gap-2"
                          onClick={() => {
                            if (isRecording) stopRecording();
                            else startRecording();
                          }}
                        >
                          <Mic className="h-3 w-3" />{" "}
                          {isRecording ? "Detener" : "Audio"}
                        </Button>

                        {/* URL Input */}
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <Input
                            className="h-7 text-xs"
                            placeholder="https://..."
                            value={newGeneralUrl}
                            onChange={(e) => setNewGeneralUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (newGeneralUrl.trim()) {
                                  setGeneralUrls((prev) => [
                                    ...prev,
                                    newGeneralUrl.trim(),
                                  ]);
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
                              if (newGeneralUrl.trim()) {
                                setGeneralUrls((prev) => [
                                  ...prev,
                                  newGeneralUrl.trim(),
                                ]);
                                setNewGeneralUrl("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* General URLs List */}
                      {generalUrls.length > 0 && (
                        <div className="space-y-1">
                          {generalUrls.map((u, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs bg-slate-50 px-2 py-1 rounded"
                            >
                              <LinkIcon className="h-3 w-3 text-slate-400" />
                              <span className="flex-1 truncate">{u}</span>
                              <button
                                onClick={() =>
                                  setGeneralUrls((prev) =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Audio Preview */}
                      {audioPreviewUrl && (
                        <div className="flex items-center gap-2 mt-2">
                          <audio
                            src={audioPreviewUrl}
                            controls
                            className="h-6 w-24"
                            controlsList="nodownload"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              URL.revokeObjectURL(audioPreviewUrl!);
                              setAudioPreviewUrl(null);
                              audioChunksRef.current = [];
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

                      {(generalFiles.length > 0 || generalUrls.length > 0) && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!editTicket?.codigo) return;
                            setUploadingEditFiles(true);
                            try {
                              // Rename files with [CTX]
                              const renamedFiles = generalFiles.map(
                                (f) =>
                                  new File([f], `[CTX] ${f.name}`, {
                                    type: f.type,
                                  })
                              );
                              await uploadTicketFiles(
                                editTicket.codigo,
                                renamedFiles,
                                generalUrls
                              );
                              toast({ title: "Archivos subidos" });
                              setGeneralFiles([]);
                              setGeneralUrls([]);
                              const list = await getTicketFiles(
                                editTicket.codigo
                              );
                              setEditExistingFiles(list);
                            } catch (e) {
                              console.error(e);
                              toast({ title: "Error" });
                            } finally {
                              setUploadingEditFiles(false);
                            }
                          }}
                          disabled={uploadingEditFiles}
                        >
                          {uploadingEditFiles
                            ? "Subiendo..."
                            : "Subir archivos"}
                        </Button>
                      )}
                    </div>

                    <Separator />

                    {/* Estados (History) */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Historial de estados
                      </div>
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
                  </div>
                </div>

                <div
                  className={editActiveTab === "respuesta" ? "block" : "hidden"}
                >
                  <div className="p-6 space-y-6">
                    {/* Archivos y Herramientas de Respuesta */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <Paperclip className="h-4 w-4 text-slate-500" /> Tu
                          Respuesta (Archivos y Evidencias)
                        </div>
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
                      </div>

                      {/* Lista de archivos existentes (Filtrados: Solo respuestas > 5 min) + nuevos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {editExistingFiles
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
                        {editFiles.map((f, i) => (
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
                      {editFiles.length > 0 && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!editTicket?.codigo) return;
                            setUploadingEditFiles(true);
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
                                    try {
                                      const webp = await compressImageToWebp(
                                        f,
                                        0.8
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
                                editTicket.codigo,
                                renamedFiles
                              );
                              toast({ title: "Archivos subidos" });
                              setEditFiles([]);
                              const list = await getTicketFiles(
                                editTicket.codigo
                              );
                              setEditExistingFiles(list);
                            } catch (e) {
                              console.error(e);
                              toast({ title: "Error" });
                            } finally {
                              setUploadingEditFiles(false);
                            }
                          }}
                          disabled={uploadingEditFiles}
                        >
                          {uploadingEditFiles
                            ? "Subiendo..."
                            : "Subir archivos"}
                        </Button>
                      )}

                      {/* Grabador de audio (Compacto) */}
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
                        {audioPreviewUrl && (
                          <div className="flex items-center gap-2">
                            <audio
                              src={audioPreviewUrl}
                              controls
                              className="h-6 w-24"
                              controlsList="nodownload"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                URL.revokeObjectURL(audioPreviewUrl!);
                                setAudioPreviewUrl(null);
                                audioChunksRef.current = [];
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
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Enviar"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={editActiveTab === "notas" ? "block" : "hidden"}>
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
                                    {(note.user_nombre || "U")[0].toUpperCase()}
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
                                      setEditingInternalNoteText(e.target.value)
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
                                      disabled={!editingInternalNoteText.trim()}
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
                            onChange={(e) => setNewInternalNote(e.target.value)}
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
              </>
            )}
          </div>

          <SheetFooter className="border-t pt-4">
            <div className="flex items-center justify-end gap-2">
              {editTicket?.codigo && isAdmin && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Eliminar
                </Button>
              )}
              <SheetClose asChild>
                <Button variant="outline">Cerrar</Button>
              </SheetClose>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirmación: eliminar ticket */}
      <Dialog
        open={!!deleteTicketCodigo}
        onOpenChange={(v) => {
          if (!v) setDeleteTicketCodigo(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar ticket</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600">
            {`¿Deseas eliminar el ticket "${
              editTicket?.nombre ?? "(sin título)"
            }"? Esta acción no se puede deshacer.`}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTicketCodigo(null)}
              disabled={deletingTicket}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTicketCodigo) return;
                setDeletingTicket(true);
                try {
                  await deleteTicket(deleteTicketCodigo);
                  // Notificación local
                  try {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("ticket:notify", {
                          detail: {
                            title: `Ticket eliminado: ${
                              editTicket?.nombre || deleteTicketCodigo
                            }`,
                            ticketId: deleteTicketCodigo,
                            previous: undefined,
                            current: "ELIMINADO",
                            at: new Date().toISOString(),
                          },
                        })
                      );
                    }
                  } catch {}
                  // Quitar de la lista y cerrar drawer
                  setRows((prev) =>
                    prev.filter((r) => r.codigo !== deleteTicketCodigo)
                  );
                  setEditOpen(false);
                  toast({ title: "Ticket eliminado" });
                } catch (e) {
                  console.error(e);
                  toast({ title: "Error al eliminar ticket" });
                } finally {
                  setDeletingTicket(false);
                  setDeleteTicketCodigo(null);
                }
              }}
              disabled={deletingTicket}
            >
              {deletingTicket ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
