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
} from "./api";
import {
  updateTicket,
  getTicketFiles,
  getTicketFile,
  getOpciones,
  createTicket,
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

type StatusKey =
  | "EN_PROGRESO"
  | "PENDIENTE"
  | "PENDIENTE_DE_ENVIO"
  | "RESUELTO";

const STATUS_LABEL: Record<StatusKey, string> = {
  EN_PROGRESO: "En progreso",
  PENDIENTE: "Pendiente",
  PENDIENTE_DE_ENVIO: "Pendiente de envío",
  RESUELTO: "Resuelto",
};

const STATUS_STYLE: Record<StatusKey, string> = {
  PENDIENTE: "bg-blue-50 text-blue-700 border-blue-200",
  EN_PROGRESO: "bg-amber-50 text-amber-700 border-amber-200",
  PENDIENTE_DE_ENVIO: "bg-sky-50 text-sky-700 border-sky-200",
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<null | {
    id: string;
    nombre_archivo: string;
    mime_type: string | null;
    url?: string;
  }>(null);
  const [blobCache, setBlobCache] = useState<Record<string, string>>({});

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
  const [detailsById, setDetailsById] = useState<
    Record<string | number, ExtraDetails>
  >({});

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

  function normalize(s?: string | null) {
    const str = (s ?? "").toString();
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();
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
    if (links.length) {
      const block = ["", "Links:", ...links.map((u) => `- ${u}`)].join("\n");
      descripcion = (descripcion ? descripcion + "\n" : "") + block;
    }
    try {
      setCreating(true);
      await createTicket({
        nombre: createNombre.trim(),
        id_alumno: selectedAlumno,
        tipo,
        descripcion: descripcion || undefined,
        archivos: createFiles.slice(0, 10),
      });
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                "PENDIENTE",
                "EN_PROGRESO",
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
                        className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-slate-300 cursor-grab active:cursor-grabbing transition-all"
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
                              setEditForm({
                                nombre: t.nombre ?? "",
                                estado: (t.estado as any) ?? "PENDIENTE",
                                deadline: t.deadline ?? null,
                                prioridad: (saved.prioridad ?? "MEDIA") as any,
                                plazo: saved.plazo ?? null,
                                restante: saved.restante ?? null,
                                informante: saved.informante ?? "",
                                resolucion: saved.resolucion ?? "",
                                resuelto_por: saved.resuelto_por ?? "",
                                revision: saved.revision ?? "",
                                tarea: saved.tarea ?? "",
                                equipo: Array.isArray(saved.equipo)
                                  ? saved.equipo
                                  : [],
                              });
                              setEditFiles([]);
                              setEditPreviews([]);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {fmtDate(t.created_at)}
                          </div>
                          {t.alumno_nombre && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              {t.alumno_nombre}
                            </div>
                          )}
                          {t.codigo && (
                            <button
                              className="flex items-center gap-1.5 text-blue-600 hover:underline"
                              onClick={() => openFilesFor(t.codigo)}
                              type="button"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              Ver archivos
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

        <div className="mt-6 flex items-center justify-between rounded-lg border bg-white px-4 py-3">
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 gap-1.5 bg-transparent"
                        onClick={() => downloadFile(f.id, f.nombre_archivo)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => openPreview(f)}
                      >
                        <Eye className="h-3.5 w-3.5" />
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
              <Tabs defaultValue="general" className="w-full">
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="edit-estado"
                          className="text-sm font-medium"
                        >
                          Estado
                        </Label>
                        <Select
                          value={String(editForm.estado ?? "PENDIENTE")}
                          onValueChange={(v) =>
                            setEditForm((f) => ({ ...f, estado: v }))
                          }
                        >
                          <SelectTrigger id="edit-estado" className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              [
                                "PENDIENTE",
                                "EN_PROGRESO",
                                "PENDIENTE_DE_ENVIO",
                                "RESUELTO",
                              ] as StatusKey[]
                            ).map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="edit-prioridad"
                          className="text-sm font-medium"
                        >
                          Prioridad
                        </Label>
                        <Select
                          value={String(editForm.prioridad ?? "MEDIA")}
                          onValueChange={(v) =>
                            setEditForm((f) => ({ ...f, prioridad: v as any }))
                          }
                        >
                          <SelectTrigger id="edit-prioridad" className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["BAJA", "MEDIA", "ALTA"].map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-slate-500" />
                        Plazos y fechas
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-plazo" className="text-sm">
                            Plazo (días)
                          </Label>
                          <Input
                            id="edit-plazo"
                            type="number"
                            className="h-10"
                            value={editForm.plazo ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                plazo: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }))
                            }
                            min={0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-restante" className="text-sm">
                            Restante (días)
                          </Label>
                          <Input
                            id="edit-restante"
                            type="number"
                            className="h-10"
                            value={editForm.restante ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                restante: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }))
                            }
                            min={0}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="edit-deadline-date"
                            className="text-sm"
                          >
                            Fecha límite
                          </Label>
                          <Input
                            id="edit-deadline-date"
                            type="date"
                            className="h-10"
                            value={(() => {
                              const iso = editForm.deadline ?? "";
                              if (!iso) return "";
                              const d = new Date(iso);
                              if (isNaN(d.getTime())) return "";
                              return d.toISOString().slice(0, 10);
                            })()}
                            onChange={(e) => {
                              const prev = editForm.deadline
                                ? new Date(editForm.deadline)
                                : new Date();
                              const time = isNaN(prev.getTime())
                                ? "00:00"
                                : prev.toISOString().slice(11, 16);
                              const iso = e.target.value
                                ? `${e.target.value}T${time}:00.000Z`
                                : null;
                              setEditForm((f) => ({ ...f, deadline: iso }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="edit-deadline-time"
                            className="text-sm"
                          >
                            Hora
                          </Label>
                          <Input
                            id="edit-deadline-time"
                            type="time"
                            className="h-10"
                            value={(() => {
                              const iso = editForm.deadline ?? "";
                              if (!iso) return "";
                              const d = new Date(iso);
                              if (isNaN(d.getTime())) return "";
                              return d.toISOString().slice(11, 16);
                            })()}
                            onChange={(e) => {
                              const dateStr = (() => {
                                const iso = editForm.deadline ?? "";
                                const d = new Date(iso);
                                if (isNaN(d.getTime())) return "";
                                return d.toISOString().slice(0, 10);
                              })();
                              const iso =
                                dateStr && e.target.value
                                  ? `${dateStr}T${e.target.value}:00.000Z`
                                  : editForm.deadline;
                              setEditForm((f) => ({ ...f, deadline: iso }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
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
                          placeholder="Nombre de quien resolvió"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Users className="h-4 w-4 text-slate-500" />
                        Equipo asignado
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-equipo" className="text-sm">
                          Códigos de equipo (separados por coma)
                        </Label>
                        <Input
                          id="edit-equipo"
                          className="h-10"
                          value={(editForm.equipo ?? []).join(", ")}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              equipo: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }))
                          }
                          placeholder="JJp8..., hQycZc..., ..."
                        />
                        {editForm.equipo && editForm.equipo.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {editForm.equipo.map((c) => (
                              <Badge
                                key={c}
                                variant="secondary"
                                className="gap-1"
                              >
                                {c}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditForm((f) => ({
                                      ...f,
                                      equipo: f.equipo?.filter((x) => x !== c),
                                    }))
                                  }
                                  className="ml-1 hover:text-slate-900"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-slate-500" />
                        Trabajo y resolución
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-tarea" className="text-sm">
                            Descripción de la tarea
                          </Label>
                          <textarea
                            id="edit-tarea"
                            className="w-full min-h-[100px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
                            value={editForm.tarea ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                tarea: e.target.value,
                              }))
                            }
                            placeholder="Describe la tarea a realizar..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-resolucion" className="text-sm">
                            Notas de resolución
                          </Label>
                          <textarea
                            id="edit-resolucion"
                            className="w-full min-h-[100px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
                            value={editForm.resolucion ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                resolucion: e.target.value,
                              }))
                            }
                            placeholder="Cómo se resolvió el ticket..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-revision" className="text-sm">
                            Revisión
                          </Label>
                          <Input
                            id="edit-revision"
                            className="h-10"
                            value={editForm.revision ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                revision: e.target.value,
                              }))
                            }
                            placeholder="Notas de revisión"
                          />
                        </div>
                      </div>
                    </div>
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
                        <div className="grid grid-cols-2 gap-2">
                          {editExistingFiles.slice(0, 4).map((f) => (
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
                                  {shortenFileName(f.nombre_archivo, 15)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {f.tamano_bytes
                                    ? `${Math.ceil(f.tamano_bytes / 1024)} KB`
                                    : "—"}
                                </div>
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
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DrawerFooter className="border-t">
            <div className="flex items-center justify-end gap-2">
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
    </div>
  );
}
