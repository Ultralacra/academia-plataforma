"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { StudentItem } from "@/lib/data-service";
import type { StudentTicket } from "../../api";
import {
  createTicket,
  getOpciones,
  getStudentTickets,
  getTicketFile,
  getTicketFiles,
  deleteTicketFile,
  updateTicket,
} from "../../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  Search,
  TicketIcon,
  FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  Calendar,
  Clock,
  Upload,
  X,
  Download,
  Eye,
  User,
  Paperclip,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { getAuthToken } from "@/lib/auth";
import { BONOS_CONTRACTUALES, BONOS_EXTRA } from "@/lib/bonos";

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

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
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

type StatusKey = "PENDIENTE" | "PAUSADO" | "RESUELTO";

const STATUS_LABEL: Record<StatusKey, string> = {
  PENDIENTE: "Pendiente",
  PAUSADO: "Pausado",
  RESUELTO: "Resuelto",
};

const STATUS_STYLE: Record<StatusKey, string> = {
  PENDIENTE:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  PAUSADO:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  RESUELTO:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
};

function coerceStatus(raw?: string | null): StatusKey {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("RESUELTO") || s.includes("COMPLETO")) return "RESUELTO";
  if (s.includes("PAUS")) return "PAUSADO"; // PAUSADO / EN_PAUSA
  // Todo lo demás cae en PENDIENTE (incluye EN_PROGRESO, PENDIENTE_DE_ENVIO, EN_CURSO, etc.)
  return "PENDIENTE";
}

export default function TicketsPanel({
  student,
  onChangedTickets,
}: {
  student: StudentItem;
  onChangedTickets?: (count: number) => void;
}) {
  const { user } = useAuth();
  const isStudent = (user?.role || "").toLowerCase() === "student";
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<StudentTicket[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | StatusKey>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [tipos, setTipos] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [estadoOpts, setEstadoOpts] = useState<
    { key: StatusKey; value: string }[]
  >([
    { key: "PENDIENTE", value: "Pendiente" },
    { key: "PAUSADO", value: "Pausado" },
    { key: "RESUELTO", value: "Resuelto" },
  ]);
  const [allFull, setAllFull] = useState<StudentTicket[]>([]);
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

  const [selectedTicket, setSelectedTicket] = useState<StudentTicket | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"general" | "detalle">("general");
  // Bonos tab state
  const [detailTabBonosReady, setDetailTabBonosReady] = useState(false);
  const [bonosSelected, setBonosSelected] = useState<string[]>([]);
  const [ticketDetail, setTicketDetail] = useState<any | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [ticketDetailError, setTicketDetailError] = useState<string | null>(
    null
  );

  // New state variables for ticket creation
  const [openCreate, setOpenCreate] = useState(false);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    { url: string; type: string | undefined; name: string; size: number }[]
  >([]);
  const [createNombre, setCreateNombre] = useState("");
  const [createTipo, setCreateTipo] = useState("");
  const [createDescripcion, setCreateDescripcion] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        try {
          const tiposRes = await getOpciones("tipo_ticket");
          const mapped = tiposRes
            .map((o) => ({ id: o.id, key: o.key, value: o.value }))
            .filter((x) => x.key && x.value);
          if (alive) setTipos(mapped);
        } catch {}
        // Forzamos 3 estados fijos en orden: Pendiente, Pausado, Resuelto
        try {
          setEstadoOpts([
            { key: "PENDIENTE", value: "Pendiente" },
            { key: "PAUSADO", value: "Pausado" },
            { key: "RESUELTO", value: "Resuelto" },
          ]);
        } catch {}

        const fetchedAll = await getStudentTickets(student.code || "");
        if (!alive) return;
        const normalized = fetchedAll
          .slice()
          .sort((a, b) => (a.creacion > b.creacion ? -1 : 1));
        setAllFull(normalized);
        setAll(normalized);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setAllFull([]);
        setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [student]);

  // No filtramos en el servidor por estado; usamos los 3 estados forzados y filtramos en cliente
  useEffect(() => {
    setAll(allFull);
  }, [status, student.code, allFull]);

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

  const counts = useMemo(() => {
    const acc: Record<StatusKey, number> = {
      PENDIENTE: 0,
      PAUSADO: 0,
      RESUELTO: 0,
    };
    allFull.forEach((t) => {
      const key = coerceStatus(t.estado);
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, [allFull]);

  const filtered = useMemo(() => {
    let rows = all;
    if (status !== "ALL") {
      rows = rows.filter(
        (t) => coerceStatus(t.estado) === (status as StatusKey)
      );
    }
    if (query.trim()) {
      const q = normalize(query);
      rows = rows.filter(
        (t) =>
          normalize(t.nombre ?? "").includes(q) ||
          normalize(t.tipo ?? "").includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((t) => {
        const created = t.creacion ? new Date(t.creacion) : null;
        return created && created >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      rows = rows.filter((t) => {
        const created = t.creacion ? new Date(t.creacion) : null;
        return created && created <= to;
      });
    }
    return rows;
  }, [all, status, query, dateFrom, dateTo]);

  async function handleCreateSubmit() {
    if (!student.code) return;
    if (!createNombre.trim() || !createTipo.trim()) return;
    try {
      setCreating(true);
      const archivos: File[] = createFiles.slice(0, 10);
      let descripcion = createDescripcion.trim();
      if (links.length) {
        const block = ["", "Links:", ...links.map((u) => `- ${u}`)].join("\n");
        descripcion = (descripcion ? descripcion + "\n" : "") + block;
      }
      await createTicket({
        nombre: createNombre.trim(),
        id_alumno: student.code,
        tipo: createTipo,
        descripcion: descripcion || undefined,
        archivos,
      });
      const fetched = await getStudentTickets(student.code);
      setAll(
        fetched
          .map((t) => ({ ...t }))
          .sort((a, b) => (a.creacion > b.creacion ? -1 : 1))
      );
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
      onChangedTickets?.(fetched.length);
    } catch (e) {
      console.error(e);
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

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setCreateFiles((prev) => {
      const next = [...prev, ...picked];
      return next.slice(0, 10);
    });
    e.currentTarget.value = "";
  }

  function removeFileAt(idx: number) {
    setCreateFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleChangeEstado(ticketId: string, newEstado: string) {
    if (isStudent) {
      toast({
        title: "Acción no permitida",
        description: "Los alumnos no pueden editar el estado de los tickets.",
        variant: "destructive",
      });
      return;
    }
    try {
      const ticket = all.find((t) => t.id === ticketId);
      const codigo = ticket?.codigo;
      if (!codigo) throw new Error("No se encontró el código UUID del ticket");
      await updateTicket(codigo, { estado: newEstado });
      try {
        if (typeof window !== "undefined") {
          const proto = window.location.protocol === "https:" ? "wss" : "ws";
          const wsUrl = `${proto}://${window.location.host}/api/socket?room=tickets`;
          const ws = new WebSocket(wsUrl);
          ws.addEventListener("open", () => {
            try {
              const payload = {
                type: "ticket:status_changed",
                room: "tickets",
                data: {
                  ticketId: ticketId,
                  previous: ticket?.estado ?? null,
                  current: newEstado,
                  title: ticket?.nombre ?? null,
                },
              };
              ws.send(JSON.stringify(payload));
            } catch {}
            try {
              ws.close();
            } catch {}
          });
          setTimeout(() => {
            try {
              ws.close();
            } catch {}
          }, 2000);
        }
      } catch {}
      setAll((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, estado: newEstado } : t))
      );
      toast({
        title: "Ticket actualizado",
        description: "El ticket cambió de estado exitosamente.",
        variant: "default",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al actualizar ticket",
        description:
          typeof e === "object" && e && "message" in e
            ? String((e as any).message)
            : String(e ?? ""),
        variant: "destructive",
      });
    }
  }

  async function openFilesFor(ticketCode: string) {
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
    if (m.startsWith("image/")) return <FileImage className="h-5 w-5" />;
    if (m.startsWith("video/")) return <FileVideo className="h-5 w-5" />;
    if (m.startsWith("audio/")) return <FileAudio className="h-5 w-5" />;
    if (m === "application/pdf") return <FileText className="h-5 w-5" />;
    if (
      [
        "application/zip",
        "application/x-7z-compressed",
        "application/x-rar-compressed",
      ].includes(m)
    )
      return <FileArchive className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
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

  async function confirmDeleteFile() {
    if (!fileToDelete) return;
    try {
      setDeletingFile(true);
      await deleteTicketFile(fileToDelete.id);
      toast({
        title: "Archivo eliminado",
        description: fileToDelete.nombre_archivo,
      });
      // refresh files list
      if (openFiles) await openFilesFor(openFiles);
      setFileToDelete(null);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al eliminar",
        description: String(e ?? ""),
        variant: "destructive",
      });
    } finally {
      setDeletingFile(false);
    }
  }

  function clearPreviewCache() {
    Object.values(blobCache).forEach((u) => URL.revokeObjectURL(u));
    setBlobCache({});
  }

  function openTicketDetail(ticket: StudentTicket) {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
    setDetailTab("general");
    setDetailTabBonosReady(false);
    const codigo =
      (ticket as any)?.codigo || (ticket as any)?.id_externo || null;
    if (codigo) loadTicketDetail(String(codigo));
  }

  async function loadTicketDetail(codigo: string) {
    try {
      setTicketDetailLoading(true);
      setTicketDetailError(null);
      setTicketDetail(null);
      const url = `https://v001.vercel.app/v1/ticket/get/ticket/${encodeURIComponent(
        codigo
      )}`;
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

  // Bonos disponibles (centralizados en lib/bonos)

  // Persistencia local (temporal) de bonos por alumno
  const bonosStorageKey = student?.code
    ? `bonos:${String(student.code)}`
    : null;

  useEffect(() => {
    if (!drawerOpen || !student?.code) return;
    // Cargar bonos guardados la primera vez que abrimos el drawer en esta sesión
    if (!detailTabBonosReady) {
      try {
        const raw = bonosStorageKey
          ? localStorage.getItem(bonosStorageKey)
          : null;
        const parsed: string[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setBonosSelected(parsed);
      } catch {}
      setDetailTabBonosReady(true);
    }
  }, [drawerOpen, student?.code, bonosStorageKey, detailTabBonosReady]);

  function toggleBono(key: string, checked: boolean) {
    setBonosSelected((prev) => {
      const set = new Set(prev);
      if (checked) set.add(key);
      else set.delete(key);
      return Array.from(set);
    });
  }

  function handleSaveBonos() {
    if (!bonosStorageKey) return;
    try {
      localStorage.setItem(bonosStorageKey, JSON.stringify(bonosSelected));
      toast({
        title: "Bonos guardados",
        description: "La selección se guardó para este alumno.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "No se pudieron guardar los bonos",
        description: "Intenta de nuevo o contacta al equipo.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* Date filters */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-700">
                Desde:
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
              <label className="text-sm font-medium text-slate-700">
                Hasta:
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TicketIcon className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Tickets del alumno
                </h3>
              </div>
              {/*   <Button
                onClick={() => setOpenCreate(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo ticket
              </Button> */}
            </div>

            {/* Status filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatus("ALL")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  status === "ALL"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className="font-semibold">{allFull.length}</span>
                Todos
              </button>
              {estadoOpts.map((opt) => {
                const k = opt.key as StatusKey;
                const count = counts[k] ?? 0;
                return (
                  <button
                    key={k}
                    onClick={() => setStatus(k)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      status === k
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span className="font-semibold">{count}</span>
                    {opt.value}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 border-slate-200 bg-white"
                placeholder="Buscar por asunto o tipo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando tickets...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No hay tickets en este filtro
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(["PENDIENTE", "PAUSADO", "RESUELTO"] as StatusKey[]).map(
                (col) => {
                  const itemsForCol = filtered.filter(
                    (t) => coerceStatus(t.estado) === col
                  );
                  return (
                    <div
                      key={col}
                      className="min-h-[200px] rounded-lg border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={`${STATUS_STYLE[col]} border`}
                        >
                          {STATUS_LABEL[col]}
                        </Badge>
                        <span className="text-sm font-medium text-slate-500">
                          {itemsForCol.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {itemsForCol.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => openTicketDetail(t)}
                            className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                          >
                            <div className="space-y-3">
                              <div className="font-medium text-slate-900 leading-snug">
                                {t.nombre ?? "Ticket"}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                {t.tipo && (
                                  <div className="flex items-center gap-1">
                                    <TicketIcon className="h-3 w-3" />
                                    {t.tipo}
                                  </div>
                                )}
                                {t.creacion && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {fmtDate(t.creacion)}
                                  </div>
                                )}
                                {t.deadline && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {fmtDate(t.deadline)}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <button
                                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFilesFor(
                                      (t as any).codigo ||
                                        (t as any).id_externo ||
                                        t.id
                                    );
                                  }}
                                  type="button"
                                >
                                  <FileIcon className="h-3.5 w-3.5" />
                                  <span className="underline decoration-slate-300 hover:decoration-slate-900">
                                    Ver archivos
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl md:max-w-2xl flex flex-col">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-lg font-semibold text-slate-900">
                  {selectedTicket?.nombre || "Detalle del ticket"}
                </DrawerTitle>
                {selectedTicket?.creacion && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>Creado el {fmtDate(selectedTicket.creacion)}</span>
                  </div>
                )}
                {selectedTicket?.tipo && (
                  <Badge variant="outline" className="mt-2">
                    {selectedTicket.tipo}
                  </Badge>
                )}
              </div>
              {selectedTicket && (
                <Badge
                  variant="outline"
                  className={`${
                    STATUS_STYLE[coerceStatus(selectedTicket.estado)]
                  } border`}
                >
                  {STATUS_LABEL[coerceStatus(selectedTicket.estado)]}
                </Badge>
              )}
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Tabs pequeña en el drawer */}
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
                  title="Información general"
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("bonos" as any)}
                  className={`px-3 py-1.5 text-xs border-l ${
                    (detailTab as any) === "bonos"
                      ? "bg-slate-900 text-white"
                      : "hover:bg-gray-50"
                  }`}
                  title="Bonos del alumno"
                >
                  Bonos
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-500">
                      Título del ticket
                    </Label>
                    <p className="text-base text-slate-900">
                      {selectedTicket?.nombre || "—"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4 text-slate-500" />
                    Personas involucradas
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-500">
                        Informante
                      </Label>
                      <p className="text-base text-slate-900">
                        {(selectedTicket as any)?.informante || "—"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-500">
                        Resuelto por
                      </Label>
                      <p className="text-base text-slate-900">
                        {(selectedTicket as any)?.resuelto_por || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Files section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      Archivos adjuntos
                    </div>
                    {selectedTicket && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openFilesFor(
                            (selectedTicket as any).codigo ||
                              (selectedTicket as any).id_externo ||
                              selectedTicket.id
                          )
                        }
                      >
                        Ver todos
                      </Button>
                    )}
                  </div>

                  {selectedTicket && (
                    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                      <p>
                        Haz clic en "Ver todos" para ver los archivos adjuntos a
                        este ticket.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bonos */}
            <div
              className={(detailTab as any) === "bonos" ? "block" : "hidden"}
            >
              <div className="p-6 space-y-6">
                {!isStudent && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSaveBonos}>
                      Guardar selección
                    </Button>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    Detalles de bonos acordados con el cliente a nivel
                    contractual
                  </div>
                  <p className="text-xs text-slate-600">
                    Selecciona los bonos aplicables a este alumno. Estos bonos
                    forman parte del contrato y algunos son de una sola vez.
                  </p>
                </div>

                <div className="space-y-3">
                  {BONOS_CONTRACTUALES.map((b) => {
                    const isSel = bonosSelected.includes(b.key);
                    return (
                      <div
                        key={b.key}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          !isStudent ? toggleBono(b.key, !isSel) : undefined
                        }
                        onKeyDown={(e) => {
                          if (isStudent) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleBono(b.key, !isSel);
                          }
                        }}
                        className={`relative rounded-lg border p-4 transition-all cursor-pointer ${
                          isSel
                            ? "border-sky-400 bg-sky-50/60 ring-2 ring-sky-100"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSel}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={(v) =>
                              !isStudent && toggleBono(b.key, Boolean(v))
                            }
                            disabled={isStudent}
                            aria-label={`Seleccionar ${b.title}`}
                          />
                          <div className="space-y-1 pr-8">
                            <div className="text-sm font-medium text-slate-900">
                              {b.title}
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                              {b.description}
                            </div>
                          </div>
                        </div>
                        {isSel && (
                          <div className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    Bonos extra que puede adquirir el cliente luego de haber
                    ingresado
                  </div>
                  <p className="text-xs text-slate-600">
                    Estos bonos se solicitan fuera de las cláusulas
                    contractuales. Requieren pago, formulario con la información
                    y un acuerdo mutuo con el alcance del servicio.
                  </p>
                </div>

                <div className="space-y-3">
                  {BONOS_EXTRA.map((b) => {
                    const isSel = bonosSelected.includes(b.key);
                    return (
                      <div
                        key={b.key}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          !isStudent ? toggleBono(b.key, !isSel) : undefined
                        }
                        onKeyDown={(e) => {
                          if (isStudent) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleBono(b.key, !isSel);
                          }
                        }}
                        className={`relative rounded-lg border p-4 transition-all cursor-pointer ${
                          isSel
                            ? "border-sky-400 bg-sky-50/60 ring-2 ring-sky-100"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSel}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={(v) =>
                              !isStudent && toggleBono(b.key, Boolean(v))
                            }
                            disabled={isStudent}
                            aria-label={`Seleccionar ${b.title}`}
                          />
                          <div className="space-y-1 pr-8">
                            <div className="text-sm font-medium text-slate-900">
                              {b.title}
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                              {b.description}
                            </div>
                          </div>
                        </div>
                        {isSel && (
                          <div className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isStudent && (
                  <div className="text-xs text-slate-500">
                    Solo administradores pueden modificar los bonos asignados.
                  </div>
                )}
              </div>
            </div>

            <div className={detailTab === "detalle" ? "block" : "hidden"}>
              <div className="p-6 space-y-6">
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
                    {/* Header resumido */}
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
                          <div className="text-slate-500 text-xs">Alumno</div>
                          <div className="font-medium break-all">
                            {ticketDetail?.alumno_nombre || student.name || "—"}
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
                            {ticketDetail?.tipo || selectedTicket?.tipo || "—"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-slate-500 text-xs">Creado</div>
                          <div>
                            {ticketDetail?.created_at
                              ? new Date(
                                  ticketDetail.created_at
                                ).toLocaleString("es-ES")
                              : fmtDate(selectedTicket?.creacion)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-slate-500 text-xs">Deadline</div>
                          <div>
                            {ticketDetail?.deadline
                              ? new Date(ticketDetail.deadline).toLocaleString(
                                  "es-ES"
                                )
                              : "—"}
                          </div>
                        </div>
                        {ticketDetail?.plazo && (
                          <div className="space-y-1">
                            <div className="text-slate-500 text-xs">Plazo</div>
                            <div>{String(ticketDetail.plazo)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Descripción y links */}
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

                    {/* Coaches */}
                    {Array.isArray(ticketDetail?.coaches) &&
                      ticketDetail.coaches.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="text-sm font-medium mb-2">
                            Coaches
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ticketDetail.coaches.map((c: any, idx: number) => (
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
                              coerceStatus(ticketDetail.ultimo_estado.estatus)
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
                                {new Date(e.created_at).toLocaleString("es-ES")}
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
          </div>

          <DrawerFooter className="border-t">
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Files dialog */}
      <Dialog
        open={!!openFiles}
        onOpenChange={(v) => {
          if (!v) {
            setOpenFiles(null);
            clearPreviewCache();
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Archivos adjuntos</DialogTitle>
          </DialogHeader>
          {filesLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando
              archivos...
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Sin archivos adjuntos
            </div>
          ) : (
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="group rounded-lg border border-slate-200 bg-white p-3 transition-all hover:shadow-md"
                  >
                    <div className="mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-slate-50">
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
                            <FileImage className="h-10 w-10 text-slate-400" />
                          );
                        }
                        return iconFor(m, f.nombre_archivo);
                      })()}
                    </div>
                    <div className="mt-3 space-y-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="truncate text-sm font-medium text-slate-900"
                            title={f.nombre_archivo}
                          >
                            {shortenFileName(f.nombre_archivo, 20)}
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
                        {f.tamano_bytes
                          ? `${Math.ceil(f.tamano_bytes / 1024)} KB`
                          : ""}
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
                        {!isStudent && (
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
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
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

      {/* Preview dialog */}
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
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando
              previsualización...
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
                      className="mx-auto max-h-[65vh] rounded"
                    />
                  );
                }
                if (m === "application/pdf") {
                  return (
                    <iframe
                      src={previewFile.url}
                      className="h-[65vh] w-full rounded"
                      title="PDF"
                    />
                  );
                }
                if (m.startsWith("video/")) {
                  return (
                    <video
                      src={previewFile.url}
                      controls
                      className="mx-auto max-h-[65vh] rounded"
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
                      className="h-[65vh] w-full rounded"
                      title="Texto"
                    />
                  );
                }
                return (
                  <div className="py-16 text-center text-sm text-slate-500">
                    No se puede previsualizar este tipo de archivo. Descárgalo
                    para verlo.
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-500">
              No hay previsualización disponible.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create ticket dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear nuevo ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input
                value={createNombre}
                onChange={(e) => setCreateNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={createTipo} onValueChange={setCreateTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.key}>
                      {t.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={createDescripcion}
                onChange={(e) => setCreateDescripcion(e.target.value)}
                placeholder="Detalles del problema..."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Enlaces</Label>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="Añadir enlace..."
                />
                <Button
                  variant="outline"
                  onClick={addLink}
                  disabled={links.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {links.map((link, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="pr-2 cursor-pointer"
                      onClick={() =>
                        setLinks((l) => l.filter((_, idx) => idx !== i))
                      }
                    >
                      {link.length > 40 ? link.substring(0, 37) + "..." : link}{" "}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Archivos adjuntos</Label>
              <div className="flex flex-wrap gap-2">
                {previews.map((p, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-20 rounded-md border overflow-hidden group"
                  >
                    <img
                      src={p.url || "/placeholder.svg"}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => removeFileAt(i)}
                      className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                {createFiles.length < 10 && (
                  <label className="flex items-center justify-center h-20 w-20 rounded-md border border-dashed cursor-pointer bg-slate-50 hover:bg-slate-100">
                    <Upload className="h-6 w-6 text-slate-400" />
                    <Input
                      type="file"
                      className="hidden"
                      onChange={onFileInputChange}
                      multiple
                    />
                  </label>
                )}
              </div>
              {createFiles.length >= 10 && (
                <p className="text-xs text-red-500">
                  Máximo 10 archivos adjuntos permitidos.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Grabación de audio</Label>
              <div className="flex items-center gap-3">
                {isRecording ? (
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" /> Detener
                    grabación
                  </Button>
                ) : (
                  <Button
                    onClick={startRecording}
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-4 w-4" /> Grabar audio
                  </Button>
                )}
                {audioPreviewUrl && (
                  <audio
                    controls
                    src={audioPreviewUrl}
                    className="h-10 w-auto"
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={creating || !createNombre.trim() || !createTipo.trim()}
            >
              {creating ? "Creando..." : "Crear ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
