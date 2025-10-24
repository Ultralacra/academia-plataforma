"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import type { StudentItem } from "@/lib/data-service";
import {
  Plus,
  TicketIcon,
  File as FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  Loader2,
  Search,
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
  PENDIENTE:
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  EN_PROGRESO:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  PENDIENTE_DE_ENVIO:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/50 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
  RESUELTO:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
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
  // alumnos del coach para asociar el ticket
  const [coachStudents, setCoachStudents] = useState<
    { alumno: string; nombre: string }[]
  >([]);
  const [selectedAlumno, setSelectedAlumno] = useState<string>("");
  const [studentQuery, setStudentQuery] = useState("");
  const [coachArea, setCoachArea] = useState<string | null>(null);
  // descripción y enlaces opcionales
  const [createDescripcion, setCreateDescripcion] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  // archivos a adjuntar
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    { url: string; type: string; name: string; size: number }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // grabación de audio
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // server data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<CoachTicket[]>([]);
  // Filtros de fecha (por defecto: HOY)
  const [fechaDesde, setFechaDesde] = useState<string>(todayYMDLocal());
  const [fechaHasta, setFechaHasta] = useState<string>(todayYMDLocal());
  // Archivos del ticket seleccionado
  const [openFiles, setOpenFiles] = useState<null | string>(null); // ticketCode
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
  // Previsualización de archivo individual
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<null | {
    id: string;
    nombre_archivo: string;
    mime_type: string | null;
    url?: string;
  }>(null);
  const [blobCache, setBlobCache] = useState<Record<string, string>>({});
  // Cargar opciones de tipo y alumnos del coach para creación
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // tipos de ticket
        try {
          const tiposRes = await getOpciones("tipo_ticket");
          const mapped = tiposRes
            .map((o) => ({ id: o.id, key: o.key, value: o.value }))
            .filter((x) => x.key && x.value);
          if (alive) setTipos(mapped);
        } catch {}
        // alumnos asociados al coach
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
          // área del coach para preseleccionar "tipo"
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

  // Previsualizaciones de archivos
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

  // Deducción automática de tipo a partir del nombre
  function normalize(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();
  }
  function guessTipoKey(nombre: string): string | "" {
    const n = normalize(nombre);
    if (!n) return "";
    // reglas simples por palabra clave
    const pairs = [
      { kw: ["copy", "copys"], match: (lab: string) => lab.includes("copy") },
      {
        kw: ["tecnica", "tecnica", "t\u00E9cnica"],
        match: (lab: string) => lab.includes("tecn"),
      },
      {
        kw: ["pauta", "ads", "campana", "campaña"],
        match: (lab: string) => lab.includes("pauta") || lab.includes("ads"),
      },
      {
        kw: ["diseno", "dise\u00F1o", "creativo"],
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
        // buscar por label o key que haga match
        const hit = tipoList.find(
          (t) => rule.match(t.value) || rule.match(t.key)
        );
        if (hit) return hit.raw.key;
      }
    }
    // fallback: si coincide exactamente con alguna opción por texto
    const exact = tipoList.find(
      (t) => n.includes(t.value) || n.includes(t.key)
    );
    return exact ? exact.raw.key : "";
  }

  // Cuando cambia el nombre, preseleccionar tipo si está vacío o fue autocompletado
  useEffect(() => {
    if (!createNombre) return;
    // solo autocompletar si no fue modificado manualmente (heurística: cuando está vacío)
    if (!createTipo) {
      const g = guessTipoKey(createNombre);
      if (g) setCreateTipo(g);
    }
  }, [createNombre, tipos]);

  // Preseleccionar tipo desde el área del coach cuando se abre el modal y haya opciones disponibles
  useEffect(() => {
    if (!openCreate) return;
    if (!coachArea) return;
    if (!tipos.length) return;
    if (createTipo) return; // no sobreescribir si el usuario ya eligió
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
    // Unir descripción + enlaces en un solo campo (si no hay soporte backend específico)
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
      // refrescar lista actual
      const res = await getCoachTickets({
        coach: coachCode,
        page,
        pageSize,
        fechaDesde,
        fechaHasta,
      });
      setRows(res.data);
      setTotal(res.total);
      // reset modal
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
      // validar URL simple
      // eslint-disable-next-line no-new
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
    // combinar tickets de API con locales (solo para pruebas de UI)
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

  function handleCreateLocal() {
    if (!createNombre.trim() || !createTipo.trim()) return;
    const t = {
      id: `local-${Date.now()}`,
      nombre: createNombre.trim(),
      tipo: createTipo.trim(),
      creacion: new Date().toISOString(),
      estado: "PENDIENTE",
    };
    setLocalTickets((s) => [t, ...s]);
    setOpenCreate(false);
    setCreateNombre("");
    setCreateTipo("");
  }

  async function handleChangeEstado(
    ticketCodigo: string,
    newEstado: StatusKey
  ) {
    // Optimistic: ya movimos en UI en el onDrop. Aquí confirmamos con backend
    try {
      await updateTicket(ticketCodigo, { estado: newEstado });
      toast({ title: "Ticket actualizado" });
    } catch (e: any) {
      toast({ title: e?.message ?? "Error al actualizar ticket" });
      // Revertir refetch de la página actual
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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tickets (vista coach)</h3>
          </div>
          {/* Filtro rápido de fecha */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Desde</label>
              <input
                type="date"
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <input
                type="date"
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm"
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
              onClick={() => {
                const hoy = todayYMDLocal();
                setFechaDesde(hoy);
                setFechaHasta(hoy);
                setPage(1);
              }}
            >
              Hoy
            </Button>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {/* Alumno del coach */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Alumno
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="h-9 flex-1"
                      placeholder="Buscar alumno por nombre o código…"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                    />
                  </div>
                  <select
                    className="w-full h-9 rounded-md border px-3 text-sm"
                    value={selectedAlumno}
                    onChange={(e) => setSelectedAlumno(e.target.value)}
                  >
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
                      <option key={s.alumno} value={s.alumno}>
                        {s.nombre} ({s.alumno})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Nombre del ticket */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Nombre
                  </label>
                  <Input
                    value={createNombre}
                    onChange={(e) => setCreateNombre(e.target.value)}
                    placeholder="Asunto del ticket"
                  />
                </div>
                {/* Tipo autocompletado con posibilidad de override */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <select
                    className="w-full h-9 rounded-md border px-3 text-sm"
                    value={createTipo}
                    onChange={(e) => setCreateTipo(e.target.value)}
                  >
                    <option value="">(Automático)</option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.key}>
                        {t.value}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Descripción / Notas */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Descripción (opcional)
                  </label>
                  <textarea
                    className="w-full min-h-[70px] rounded-md border px-3 py-2 text-sm"
                    value={createDescripcion}
                    onChange={(e) => setCreateDescripcion(e.target.value)}
                    placeholder="Notas del ticket, detalles del caso, etc."
                  />
                </div>
                {/* Enlaces */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">
                      Enlaces (URL)
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {links.length}/10
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="h-9 flex-1"
                      placeholder="https://…"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addLink();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLink}
                    >
                      Agregar
                    </Button>
                  </div>
                  {links.length > 0 && (
                    <ul className="space-y-1 max-h-40 overflow-auto">
                      {links.map((u, i) => (
                        <li
                          key={`${u}-${i}`}
                          className="flex items-start gap-2 rounded border px-2 py-1 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <a
                              href={u}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-blue-600 hover:underline"
                            >
                              {u}
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() =>
                              setLinks((prev) => prev.filter((x) => x !== u))
                            }
                          >
                            Quitar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Archivos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">
                      Archivos
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {createFiles.length}/10
                    </span>
                  </div>
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
                  >
                    Elegir archivos
                  </Button>
                  {/* Grabación de audio rápida */}
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={startRecording}
                      >
                        Grabar audio
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={stopRecording}
                      >
                        Detener
                      </Button>
                    )}
                    {audioPreviewUrl && (
                      <audio src={audioPreviewUrl} controls className="h-8" />
                    )}
                  </div>
                  {createFiles.length > 0 && (
                    <ul className="space-y-2">
                      {previews.map((p, idx) => (
                        <li
                          key={`${p.name}-${idx}`}
                          className="flex h-14 items-center gap-3 rounded border p-2"
                        >
                          {p.type.startsWith("image/") ? (
                            <img
                              src={p.url}
                              alt={p.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                              {p.name.split(".").pop()?.toUpperCase() || "FILE"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-sm font-medium"
                              title={p.name}
                            >
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.ceil(p.size / 1024)} KB
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFileAt(idx)}
                          >
                            Eliminar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateSubmit}
                  disabled={creating || !selectedAlumno || !createNombre.trim()}
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground`}
          >
            {filtered.length} Todos
          </div>
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
              <div
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[s]}`}
              >
                {STATUS_LABEL[s]}: {count}
              </div>
            );
          })}
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9 border-gray-200 bg-white"
            placeholder="Buscar por asunto o tipo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="p-3">
        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Cargando
            tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No hay tickets para este coach.
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
                  className="min-h-[120px] rounded-md border border-gray-200 bg-white p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const codigo = e.dataTransfer.getData("text/plain");
                    if (!codigo) return;
                    // optimistic move in local state
                    setRows((prev) =>
                      prev.map((t) =>
                        t.codigo === codigo ? { ...t, estado: col } : t
                      )
                    );
                    await handleChangeEstado(codigo, col);
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[col]}`}
                      >
                        {STATUS_LABEL[col]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        draggable={Boolean(t.codigo)}
                        onDragStart={(e) => {
                          if (!t.codigo) return;
                          e.dataTransfer.setData("text/plain", t.codigo);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-medium leading-tight truncate"
                              title={t.nombre ?? undefined}
                            >
                              {t.nombre ?? "—"}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>Creado: {fmtDate(t.created_at)}</span>
                              {t.alumno_nombre && (
                                <span>· {t.alumno_nombre}</span>
                              )}
                              {t.codigo && (
                                <button
                                  className="underline hover:no-underline"
                                  onClick={() => openFilesFor(t.codigo)}
                                  type="button"
                                >
                                  · Archivos
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[col]}`}
                            >
                              {STATUS_LABEL[col]}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación simple */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Página {page} · {total} tickets
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}/pág
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

      {/* Dialog archivos */}
      <Dialog
        open={!!openFiles}
        onOpenChange={(v) => {
          if (!v) {
            setOpenFiles(null);
            clearPreviewCache();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Archivos adjuntos</DialogTitle>
          </DialogHeader>
          {filesLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando
              archivos…
            </div>
          ) : files.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Sin archivos
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="group rounded border bg-background p-2"
                    >
                      <div className="mx-auto flex aspect-square w-28 items-center justify-center overflow-hidden rounded bg-muted">
                        {(() => {
                          const m =
                            f.mime_type || mimeFromName(f.nombre_archivo);
                          if (m?.startsWith("image/")) {
                            const thumb = blobCache[f.id];
                            return thumb ? (
                              <img
                                src={thumb}
                                alt={f.nombre_archivo}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FileImage className="h-8 w-8 text-muted-foreground" />
                            );
                          }
                          if (m === "application/pdf") {
                            return (
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            );
                          }
                          if (m?.startsWith("video/")) {
                            return (
                              <FileVideo className="h-8 w-8 text-muted-foreground" />
                            );
                          }
                          if (m?.startsWith("audio/")) {
                            return (
                              <FileAudio className="h-8 w-8 text-muted-foreground" />
                            );
                          }
                          return (
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                          );
                        })()}
                      </div>
                      <div className="mt-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="truncate text-sm font-medium"
                              title={f.nombre_archivo}
                            >
                              {shortenFileName(f.nombre_archivo, 30)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs break-all"
                          >
                            {f.nombre_archivo}
                          </TooltipContent>
                        </Tooltip>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {(f.mime_type || "").split(";")[0]}{" "}
                          {f.tamano_bytes ? `· ${f.tamano_bytes} bytes` : ""}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            variant="outline"
                            onClick={() => downloadFile(f.id, f.nombre_archivo)}
                          >
                            Descargar
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            variant="secondary"
                            onClick={() => openPreview(f)}
                          >
                            Ver
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

      {/* Sub-modal de previsualización */}
      <Dialog
        open={previewOpen}
        onOpenChange={(v) => {
          setPreviewOpen(v);
          if (!v) setPreviewFile(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewFile?.nombre_archivo || "Previsualización"}
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando
              previsualización…
            </div>
          ) : previewFile?.url ? (
            <div className="max-h-[70vh] overflow-auto rounded border bg-background p-2">
              {(() => {
                const m =
                  previewFile?.mime_type ||
                  mimeFromName(previewFile?.nombre_archivo) ||
                  "";
                if (m.startsWith("image/")) {
                  return (
                    <img
                      src={previewFile.url}
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
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No se puede previsualizar este tipo de archivo. Descárgalo
                    para verlo.
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No hay previsualización disponible.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
