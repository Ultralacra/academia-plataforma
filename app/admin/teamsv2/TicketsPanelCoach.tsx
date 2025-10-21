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
import { getCoachTickets, type CoachTicket } from "./api";
import {
  updateTicket,
  getTicketFiles,
  getTicketFile,
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

  const [query, setQuery] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createTipo, setCreateTipo] = useState("");
  const [localTickets, setLocalTickets] = useState<any[]>([]);

  // server data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<CoachTicket[]>([]);
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

  useEffect(() => {
    if (!coachCode) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getCoachTickets({ coach: coachCode, page, pageSize });
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
  }, [coachCode, page, pageSize]);

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
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear ticket (local)</DialogTitle>
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
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <Input
                    value={createTipo}
                    onChange={(e) => setCreateTipo(e.target.value)}
                    placeholder="Tipo (libre)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateLocal}>Crear</Button>
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
              "PENDIENTE_DE_ENVIO",
              "EN_PROGRESO",
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
                "PENDIENTE_DE_ENVIO",
                "EN_PROGRESO",
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
