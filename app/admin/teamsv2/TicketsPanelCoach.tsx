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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";

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
  const [openCreate, setOpenCreate] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createTipo, setCreateTipo] = useState("");
  const [tipos, setTipos] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [localTickets, setLocalTickets] = useState<any[]>([]);
  const [coachStudents, setCoachStudents] = useState<
    { alumno: string; nombre: string }[]
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
    }[]
  >([]);
  // Confirmación de eliminación de ticket
  const [deleteTicketCodigo, setDeleteTicketCodigo] = useState<string | null>(
    null
  );
  const [deletingTicket, setDeletingTicket] = useState(false);

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

  // Cargar detalle cuando la pestaña 'detalles' o 'archivos' esté activa (para mostrar Links)
  useEffect(() => {
    if (!editOpen) return;
    if (!editTicket?.codigo) return;
    if (editActiveTab !== "detalles" && editActiveTab !== "archivos") return;
    loadTicketDetail(editTicket.codigo);
  }, [editOpen, editTicket?.codigo, editActiveTab]);

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

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setCreateFiles((prev) => {
      const next = [...prev, ...picked];
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
      const mr: any = new MR(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        const file = new File([blob], `grabacion-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setCreateFiles((prev) => [...prev, file].slice(0, 10));
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch {}
  }

  function stopRecording() {
    try {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
    } catch {}
    setIsRecording(false);
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

  const filtered = useMemo(() => {
    if (!query.trim()) return combined;
    const q = query.toLowerCase().trim();
    return combined.filter(
      (t) =>
        (t.nombre || "").toLowerCase().includes(q) ||
        (t.alumno_nombre || "").toLowerCase().includes(q) ||
        (t.codigo || "").toLowerCase().includes(q)
    );
  }, [combined, query]);

  async function handleChangeEstado(
    ticketCodigo: string,
    newEstado: StatusKey
  ) {
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
                              {s.nombre} ({s.alumno})
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
                      <div className="rounded-lg border bg-slate-50 p-3">
                        <audio
                          src={audioPreviewUrl}
                          controls
                          className="w-full"
                        />
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
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                  className="flex flex-col rounded-xl border border-slate-200 bg-white"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const codigo = e.dataTransfer.getData("text/plain");
                    if (!codigo) return;
                    setRows((prev) =>
                      prev.map((t) =>
                        t.codigo === codigo ? { ...t, estado: col } : t
                      )
                    );
                    await handleChangeEstado(codigo, col);
                  }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-medium ${STATUS_STYLE[col]}`}
                      >
                        {STATUS_LABEL[col]}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {items.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 p-3">
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
                          "group rounded-lg border bg-white p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all " +
                          (String(t.estado ?? "").toUpperCase() === "PAUSADO"
                            ? "border-amber-300 ring-1 ring-amber-200 hover:border-amber-400"
                            : "border-slate-200 hover:border-slate-300")
                        }
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4
                            className="flex-1 text-sm font-medium text-slate-900 line-clamp-2"
                            title={t.nombre ?? undefined}
                          >
                            {t.nombre ?? "—"}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                  resolvePersonName(
                                    saved.informante ?? (t as any).informante
                                  ) ?? "",
                                resolucion: saved.resolucion ?? "",
                                resuelto_por:
                                  resolvePersonName(
                                    saved.resuelto_por ??
                                      (t as any).resuelto_por
                                  ) ?? "",
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
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-2 text-xs text-slate-600">
                          {String(t.estado ?? "").toUpperCase() ===
                            "PAUSADO" && (
                            <div className="flex items-center gap-1.5 text-amber-700">
                              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[11px] font-medium">
                                Requiere atención
                              </span>
                            </div>
                          )}
                          {t.alumno_nombre && (
                            <div
                              className="flex items-center gap-1.5 truncate"
                              title={t.alumno_nombre || undefined}
                            >
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">
                                {t.alumno_nombre}
                              </span>
                            </div>
                          )}
                          {(t as any).informante && (
                            <div
                              className="flex items-center gap-1.5 truncate"
                              title={
                                (t as any).informante_nombre ||
                                (t as any).informante ||
                                undefined
                              }
                            >
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">
                                Informante:{" "}
                                {(t as any).informante_nombre ||
                                  (t as any).informante}
                              </span>
                            </div>
                          )}
                          {(t as any).resuelto_por && (
                            <div
                              className="flex items-center gap-1.5 truncate"
                              title={
                                (t as any).resuelto_por_nombre ||
                                (t as any).resuelto_por ||
                                undefined
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="truncate">
                                Resuelto por:{" "}
                                {(t as any).resuelto_por_nombre ||
                                  (t as any).resuelto_por}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {fmtDate(t.created_at)}
                            </span>
                            {t.deadline && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                                <Clock className="h-3 w-3" />
                                {fmtDate(t.deadline)}
                              </span>
                            )}
                          </div>
                          {t.codigo && (
                            <button
                              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                              onClick={() => openFilesFor(t.codigo)}
                              type="button"
                            >
                              <FileIcon className="h-3.5 w-3.5" />
                              <span className="underline decoration-slate-300 hover:decoration-slate-900">
                                Ver archivos
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
                          const thumb = blobCache[f.id];
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
                    <video
                      src={previewFile.url}
                      controls
                      className="mx-auto max-h-[65vh]"
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

      <Drawer open={editOpen} onOpenChange={setEditOpen} direction="right">
        <DrawerContent className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl md:max-w-2xl flex flex-col">
          <DrawerHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DrawerTitle className="text-lg">
                  {editTicket?.nombre || "Detalle del ticket"}
                </DrawerTitle>
                <DrawerDescription className="mt-1">
                  {editTicket?.codigo && (
                    <span className="text-xs text-slate-500">
                      Código: {editTicket.codigo}
                    </span>
                  )}
                </DrawerDescription>
              </div>
              {editForm.estado && (
                <Badge
                  variant="outline"
                  className={`${
                    STATUS_STYLE[
                      String(editForm.estado).toUpperCase() as StatusKey
                    ] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {STATUS_LABEL[
                    String(editForm.estado).toUpperCase() as StatusKey
                  ] || String(editForm.estado)}
                </Badge>
              )}
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto">
            {!editTicket ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Selecciona un ticket
              </div>
            ) : (
              <Tabs
                value={editActiveTab}
                onValueChange={setEditActiveTab}
                className="w-full"
              >
                <div className="border-b px-6">
                  <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                    <TabsTrigger
                      value="general"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none"
                    >
                      General
                    </TabsTrigger>
                    <TabsTrigger
                      value="detalles"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none"
                    >
                      Detalles
                    </TabsTrigger>
                    <TabsTrigger
                      value="archivos"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none"
                    >
                      Archivos
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="general" className="p-6 space-y-6 mt-0">
                  {String(editForm.estado ?? "").toUpperCase() ===
                    "PAUSADO" && (
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
                              setEditActiveTab("archivos");
                              setTimeout(() => {
                                editFileInputRef.current?.click();
                              }, 0);
                            } catch {}
                          }}
                        >
                          Adjuntar ahora
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
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

                    <Separator />

                    {/* Resumen del ticket (sin Último estado ni Código, en lista vertical) */}
                    {editTicket && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-500 min-w-[90px]">
                            Alumno
                          </span>
                          <span className="truncate">
                            {editTicket.alumno_nombre || "—"}
                          </span>
                        </div>
                        {(editTicket as any).informante && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-500 min-w-[90px]">
                              Informante
                            </span>
                            <span className="truncate">
                              {(editTicket as any).informante_nombre ||
                                (editTicket as any).informante}
                            </span>
                          </div>
                        )}
                        {(editTicket as any).resuelto_por && (
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-slate-500 min-w-[90px]">
                              Resuelto por
                            </span>
                            <span className="truncate">
                              {(editTicket as any).resuelto_por_nombre ||
                                (editTicket as any).resuelto_por}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-500 min-w-[90px]">
                            Creación
                          </span>
                          <span className="truncate">
                            {fmtDate(editTicket.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-500 min-w-[90px]">
                            Deadline
                          </span>
                          <span className="truncate">
                            {fmtDate(editForm.deadline ?? editTicket.deadline)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="detalles" className="p-6 space-y-6 mt-0">
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
                          className="h-10"
                          value={editForm.informante ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              informante: e.target.value,
                            }))
                          }
                          disabled
                          placeholder="Nombre del informante"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-resuelto-por" className="text-sm">
                          Resuelto por
                        </Label>
                        <Input
                          id="edit-resuelto-por"
                          className="h-10"
                          value={editForm.resuelto_por ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              resuelto_por: e.target.value,
                            }))
                          }
                          disabled
                          placeholder="Nombre de quien resolvió"
                        />
                      </div>
                    </div>

                    <Separator />
                    {/* Equipo asignado y Trabajo/Resolución removidos para unificar el patrón */}
                  </div>

                  {/* Detalle desde API */}
                  <div className="space-y-4">
                    {ticketDetailLoading ? (
                      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                        Cargando detalle…
                      </div>
                    ) : ticketDetailError ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {ticketDetailError}
                      </div>
                    ) : ticketDetail ? (
                      <>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-slate-900">
                                {ticketDetail?.nombre ||
                                  editTicket?.nombre ||
                                  "Ticket"}
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
                                {ticketDetail?.alumno_nombre ||
                                  editTicket?.alumno_nombre ||
                                  "—"}
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
                                  : fmtDate(editTicket?.created_at)}
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
                                  : fmtDate(editTicket?.deadline)}
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

                        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                          <div className="text-sm font-medium">Descripción</div>
                          <div className="whitespace-pre-wrap text-sm text-slate-800">
                            {ticketDetail?.descripcion || "—"}
                          </div>
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
                      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                        Sin datos de detalle
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="archivos" className="p-6 space-y-6 mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Paperclip className="h-4 w-4 text-slate-500" />
                        Archivos adjuntos
                      </div>
                      {editTicket?.codigo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openFilesFor(editTicket.codigo!)}
                        >
                          Ver todos
                        </Button>
                      )}
                    </div>

                    {editFilesLoading ? (
                      <div className="flex items-center justify-center py-8 text-slate-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando archivos...
                      </div>
                    ) : editExistingFiles.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">
                          {editExistingFiles.length} archivo(s) existente(s)
                        </div>
                        <div className="space-y-2">
                          {editExistingFiles.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-white">
                                {iconFor(f.mime_type, f.nombre_archivo)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  className="truncate text-sm font-medium"
                                  title={f.nombre_archivo}
                                >
                                  {shortenFileName(f.nombre_archivo, 30)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {f.tamano_bytes
                                    ? `${Math.ceil(f.tamano_bytes / 1024)} KB`
                                    : "—"}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
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
                        {editExistingFiles.length > 4 && (
                          <div className="text-xs text-slate-500 text-center pt-2">
                            +{editExistingFiles.length - 4} más
                          </div>
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
                                key={`edit-links-${i}`}
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
                        <Paperclip className="h-4 w-4" />
                        Seleccionar archivos
                      </Button>
                      {editFiles.length > 0 && (
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
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100">
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
                      )}

                      {/* Enlaces para adjuntar como URLs */}
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
                                  const url = /^https?:\/\//i.test(raw)
                                    ? raw
                                    : `https://${raw}`;
                                  try {
                                    new URL(url);
                                    setEditLinks((prev) =>
                                      Array.from(new Set([...prev, url])).slice(
                                        0,
                                        10
                                      )
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
                              const url = /^https?:\/\//i.test(raw)
                                ? raw
                                : `https://${raw}`;
                              try {
                                new URL(url);
                                setEditLinks((prev) =>
                                  Array.from(new Set([...prev, url])).slice(
                                    0,
                                    10
                                  )
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
                                    setEditLinks((prev) =>
                                      prev.filter((x) => x !== u)
                                    )
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
                              if (
                                editFiles.length === 0 &&
                                editLinks.length === 0
                              ) {
                                toast({
                                  title:
                                    "No hay archivos ni enlaces para subir",
                                });
                                return;
                              }
                              setUploadingEditFiles(true);
                              try {
                                // 1) Subir archivos físicos (si hay)
                                if (editFiles.length > 0) {
                                  await uploadTicketFiles(
                                    editTicket.codigo,
                                    editFiles,
                                    []
                                  );
                                  // refrescar la lista de archivos existentes
                                  const list = await getTicketFiles(
                                    editTicket.codigo
                                  );
                                  setEditExistingFiles(list);
                                  if (openFiles === editTicket.codigo) {
                                    setFiles(list);
                                  }
                                }

                                // 2) Integrar enlaces a la descripción
                                if (editLinks.length > 0) {
                                  // asegurarnos de tener una base de descripción
                                  const base = ticketDetail?.descripcion || "";
                                  // extraer URLs existentes y fusionar con nuevas
                                  const existing =
                                    extractUrlsFromDescription(base);
                                  const mergedSet = new Set<string>(
                                    existing.map((u) => normalizeUrl(u))
                                  );
                                  for (const raw of editLinks) {
                                    const nu = normalizeUrl(raw);
                                    if (nu) mergedSet.add(nu);
                                  }
                                  const merged = Array.from(mergedSet);
                                  // limpiar línea previa de URLs: ... (si existe)
                                  const lines: string[] = base.split(/\r?\n/);
                                  const withoutLine = lines.filter(
                                    (ln: string) => !/^\s*urls\s*:/i.test(ln)
                                  );
                                  const cleanDesc = withoutLine
                                    .join("\n")
                                    .trim();
                                  const withUrls =
                                    merged.length > 0
                                      ? (cleanDesc ? cleanDesc + "\n" : "") +
                                        `URLs: ${merged.join(", ")}`
                                      : cleanDesc;
                                  await updateTicket(editTicket.codigo, {
                                    descripcion: withUrls || undefined,
                                  } as any);
                                  // recargar detalle para reflejar cambios
                                  await loadTicketDetail(editTicket.codigo);
                                  toast({
                                    title: "Enlaces guardados en descripción",
                                  });
                                }

                                setEditFiles([]);
                                setEditLinks([]);
                              } catch (e) {
                                console.error(e);
                                toast({ title: "Error al subir/guardar" });
                              } finally {
                                setUploadingEditFiles(false);
                              }
                            }}
                            disabled={uploadingEditFiles}
                          >
                            {uploadingEditFiles
                              ? "Procesando..."
                              : "Subir archivos / Guardar URLs"}
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
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DrawerFooter className="border-t">
            <div className="flex items-center justify-end gap-2">
              {editTicket?.codigo && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteTicketCodigo(editTicket.codigo!)}
                >
                  Eliminar
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DrawerClose>
              <Button
                onClick={() => {
                  if (!editTicket) return;
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === editTicket.id
                        ? {
                            ...r,
                            nombre: editForm.nombre ?? r.nombre,
                            estado: (editForm.estado as any) ?? r.estado,
                            deadline: editForm.deadline ?? r.deadline,
                          }
                        : r
                    )
                  );
                  setDetailsById((prev) => ({
                    ...prev,
                    [editTicket.id]: {
                      prioridad: editForm.prioridad as any,
                      plazo: editForm.plazo ?? null,
                      restante: editForm.restante ?? null,
                      informante: editForm.informante ?? "",
                      resolucion: editForm.resolucion ?? "",
                      resuelto_por: editForm.resuelto_por ?? "",
                      revision: editForm.revision ?? "",
                      tarea: editForm.tarea ?? "",
                      equipo: Array.isArray(editForm.equipo)
                        ? editForm.equipo
                        : [],
                    },
                  }));
                  toast({ title: "Cambios guardados" });
                  setEditOpen(false);
                }}
              >
                Guardar cambios
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
