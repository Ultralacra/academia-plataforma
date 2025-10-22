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
  updateTicket,
} from "../../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  Search,
  TicketIcon,
  File as FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
} from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

/* ========= helpers ========= */

// Nota: funciones de demo eliminadas. Mantenemos utilidades reales como fmtDate/normalize.
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

// Eliminado: RNG y helpers usados para datos de demostración.

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

function coerceStatus(raw?: string | null): StatusKey {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("RESUELTO") || s.includes("COMPLETO")) return "RESUELTO";
  if (s.includes("ENVIO") || s.includes("ENVÍO") || s.includes("ENVIO"))
    return "PENDIENTE_DE_ENVIO";
  if (
    s.includes("EN_PROGRES") ||
    s.includes("EN_PROCESO") ||
    s.includes("PROCES") ||
    s.includes("CURSO") ||
    s.includes("EN_CURSO")
  )
    return "EN_PROGRESO";
  if (s.includes("PENDIENTE")) return "PENDIENTE";
  // Por defecto tratar como PENDIENTE
  return "PENDIENTE";
}

// Eliminado: datos de demostración. El panel ahora refleja exclusivamente lo que devuelve la API.

/* ========= componente ========= */

export default function TicketsPanel({
  student,
  onChangedTickets,
}: {
  student: StudentItem;
  onChangedTickets?: (count: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<StudentTicket[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  // Filtro por fecha de creación
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  // Crear ticket
  const [openCreate, setOpenCreate] = useState(false);
  const [tipos, setTipos] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [createNombre, setCreateNombre] = useState("");
  const [createTipo, setCreateTipo] = useState("");
  const [createDescripcion, setCreateDescripcion] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    { url: string; type: string; name: string; size: number }[]
  >([]);
  const [creating, setCreating] = useState(false);
  // Grabación de audio
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  // Estados posibles para update
  const [estadoOpts, setEstadoOpts] = useState<
    { key: string; value: string }[]
  >([]);
  const [allFull, setAllFull] = useState<StudentTicket[]>([]); // lista completa para conteos y "ALL"
  // Archivos del ticket seleccionado
  const [openFiles, setOpenFiles] = useState<null | string>(null); // ticketId
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
    url?: string; // blob url
  }>(null);
  // Cache de blobs (fileId -> objectURL)
  const [blobCache, setBlobCache] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Cargar opciones (tipos y estados)
        try {
          const tiposRes = await getOpciones("tipo_ticket");
          const mapped = tiposRes
            .map((o) => ({ id: o.id, key: o.key, value: o.value }))
            .filter((x) => x.key && x.value);
          if (alive) setTipos(mapped);
        } catch {}
        try {
          const estRes = await getOpciones("estado_tickets");
          const estList = estRes
            .map((o) => ({ key: o.key, value: o.value }))
            .filter((x) => x.key);
          if (alive && estList.length) setEstadoOpts(estList);
        } catch {}

        // Cargar lista completa para "ALL" y conteos
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

  // Re-fetch al cambiar filtro de estado (lado servidor)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (status === "ALL") {
        setAll(allFull);
        return;
      }
      setLoading(true);
      try {
        const fetched = await getStudentTickets(student.code || "", [status]);
        if (!alive) return;
        const normalized = fetched
          .slice()
          .sort((a, b) => (a.creacion > b.creacion ? -1 : 1));
        setAll(normalized);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, student.code, allFull]);

  // Generar y liberar URLs de previsualización cuando cambian los archivos
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
    // Conteos a partir de la lista completa (ALL); por clave exacta del backend
    const acc: Record<string, number> = {};
    allFull.forEach((t) => {
      const key = String(t.estado ?? "").toUpperCase();
      if (!key) return;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, [allFull]);

  const filtered = useMemo(() => {
    let rows = all;
    // Si el filtro no es ALL, el backend ya devolvió la lista filtrada; no volver a filtrar por coerce.
    if (status !== "ALL") {
      rows = rows.filter(
        (t) => String(t.estado ?? "").toUpperCase() === String(status)
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
    // Filtro por fecha de creación (rango)
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
      // Compose descripcion + links
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
      // Refrescar lista de tickets
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

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setCreateFiles((prev) => {
      const next = [...prev, ...picked];
      return next.slice(0, 10);
    });
    // Reset input para permitir volver a seleccionar el mismo archivo si se elimina
    e.currentTarget.value = "";
  }

  function removeFileAt(idx: number) {
    setCreateFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleChangeEstado(ticketId: string, newEstado: string) {
    try {
      // Buscar el ticket por id y obtener su codigo (UUID)
      const ticket = all.find((t) => t.id === ticketId);
      const codigo = ticket?.codigo;
      if (!codigo) throw new Error("No se encontró el código UUID del ticket");
      await updateTicket(codigo, { estado: newEstado });
      // Emitir un evento websocket para notificar a otros clientes (si existe)
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
          // cleanup: if ws doesn't open after 2s, close
          setTimeout(() => {
            try {
              ws.close();
            } catch {}
          }, 2000);
        }
      } catch {}
      // Guardar la clave real del backend en `estado` para que el Select muestre el valor correcto
      setAll((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, estado: newEstado } : t))
      );
      // Mostrar toast usando la API compatible con el componente
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
      // Usar caché si existe
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
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          {/* Filtro por fecha de creación */}
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <label className="text-xs text-muted-foreground">Desde:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
              style={{ minWidth: 120 }}
            />
            <label className="text-xs text-muted-foreground ml-2">Hasta:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
              style={{ minWidth: 120 }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Tickets del alumno</h3>
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
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Tipo
                    </label>
                    <Select value={createTipo} onValueChange={setCreateTipo}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona tipo" />
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
                  {/* Descripción */}
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
                                {p.name.split(".").pop()?.toUpperCase() ||
                                  "FILE"}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="truncate text-sm font-medium"
                                title={p.name}
                              >
                                {shortenFileName(p.name)}
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
                  <Button
                    variant="outline"
                    onClick={() => setOpenCreate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateSubmit}
                    disabled={
                      creating || !createNombre.trim() || !createTipo.trim()
                    }
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

          {/* Summary pills */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* ALL */}
            <button
              onClick={() => setStatus("ALL")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                status === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span className="font-semibold">{allFull.length}</span>
              Todos
            </button>
            {/* Estados dinámicos desde opciones */}
            {estadoOpts.map((opt) => {
              const k = opt.key.toUpperCase();
              const count = counts[k] ?? 0;
              return (
                <button
                  key={k}
                  onClick={() => setStatus(k)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    status === k
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span className="font-semibold">{count}</span>
                  {opt.value}
                </button>
              );
            })}
          </div>

          {/* Search */}
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
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando tickets…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay tickets en este filtro
            </div>
          ) : (
            // Kanban grid: columnas por estado (orden solicitado)
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  "EN_PROGRESO",
                  "PENDIENTE",
                  "PENDIENTE_DE_ENVIO",
                  "RESUELTO",
                ] as StatusKey[]
              ).map((col) => {
                const itemsForCol = filtered.filter(
                  (t) => coerceStatus(t.estado) === col
                );
                return (
                  <div
                    key={col}
                    className="min-h-[120px] rounded-md border border-gray-200 bg-white p-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const ticketId = e.dataTransfer.getData("text/plain");
                      if (!ticketId) return;
                      // Optimistic UI: move locally first
                      setAll((prev) =>
                        prev.map((t) =>
                          String(t.id) === String(ticketId)
                            ? { ...t, estado: col }
                            : t
                        )
                      );
                      try {
                        await handleChangeEstado(ticketId, col);
                      } catch (err) {
                        // Revert by refetching tickets for the student
                        const refreshed = await getStudentTickets(
                          student.code || ""
                        );
                        setAll(
                          refreshed
                            .slice()
                            .sort((a, b) => (a.creacion > b.creacion ? -1 : 1))
                        );
                      }
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
                          {itemsForCol.length}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        &nbsp;
                      </div>
                    </div>

                    <div className="space-y-2">
                      {itemsForCol.map((t) => (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => {
                            try {
                              e.dataTransfer.setData(
                                "text/plain",
                                String(t.id)
                              );
                            } catch {}
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium leading-tight">
                                {t.nombre ?? "Ticket"}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>Creado: {fmtDate(t.creacion)}</span>
                                {t.tipo && <span>· {t.tipo}</span>}
                                {t.deadline && (
                                  <span>· Vence: {fmtDate(t.deadline)}</span>
                                )}
                                {t.id_externo && (
                                  <span>· Ref: {t.id_externo}</span>
                                )}
                                <button
                                  className="underline hover:no-underline"
                                  onClick={() =>
                                    openFilesFor(
                                      (t as any).codigo ||
                                        (t as any).id_externo ||
                                        t.id
                                    )
                                  }
                                  type="button"
                                >
                                  · Archivos
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {/* Mostrar solo la etiqueta de estado; el cambio se hace arrastrando */}
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  STATUS_STYLE[coerceStatus(t.estado)]
                                }`}
                              >
                                {STATUS_LABEL[coerceStatus(t.estado)]}
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
                        {/* Thumbnail por tipo */}
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
    </>
  );
}
