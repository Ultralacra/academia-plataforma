"use client";

import { useEffect, useMemo, useState } from "react";
import { getTickets, type TicketBoardItem } from "./api";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

import {
  Search,
  Calendar as CalendarIcon,
  File as FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getTicketFiles,
  getTicketFile,
  updateTicket,
} from "@/app/admin/alumnos/api";
import { getCoaches, type CoachItem } from "@/app/admin/teamsv2/api";

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
  PENDIENTE: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/50",
  EN_PROGRESO: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/50",
  PENDIENTE_DE_ENVIO:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/50",
  RESUELTO:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/50",
};

function coerceStatus(raw?: string | null): StatusKey {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("RESUELTO") || s.includes("COMPLETO")) return "RESUELTO";
  if (s.includes("ENVIO") || s.includes("ENVÍO")) return "PENDIENTE_DE_ENVIO";
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
  const [tickets, setTickets] = useState<TicketBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Coaches para filtro
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [coachFiltro, setCoachFiltro] = useState<string>(""); // código de coach; "" = Todos
  // Files dialog state
  const [openFiles, setOpenFiles] = useState<null | string>(null); // ticket code/UUID
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

  // filtros
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  // Por defecto: hoy
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  const [fechaDesde, setFechaDesde] = useState<string>(todayStr);
  const [fechaHasta, setFechaHasta] = useState<string>(todayStr);

  // Cargar coaches para el select de filtro
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

  const estados = useMemo(() => {
    // Always show all 4 columns in this order
    return [
      "PENDIENTE",
      "EN_PROGRESO",
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
    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === tid ? { ...t, estado: targetEstado } : t))
    );
    // Persist if we have external code (UUID)
    const tk = tickets.find((t) => t.id === tid);
    const codigo = tk?.codigo ?? null;
    if (!codigo) return;
    updateTicket(codigo, { estado: targetEstado })
      .then(() => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets — Tablero</h1>
          <p className="text-sm text-neutral-500">
            Arrastra y suelta tickets entre columnas para cambiar su estado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="pl-9 rounded-xl border px-3 py-2 text-sm"
                placeholder="Buscar asunto, alumno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Filtro por coach/equipo */}
            <div className="relative">
              <select
                className="rounded border px-2 py-2 text-sm min-w-[180px]"
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
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon className="text-gray-400" />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>

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
          >
            Recargar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500">Cargando tickets...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {estados.map((estado) => {
            const itemsForCol = tickets.filter(
              (t) => coerceStatus(t.estado) === (estado as StatusKey)
            );
            return (
              <div
                key={estado}
                className="min-h-[160px] rounded-md border border-gray-200 bg-white p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[estado as StatusKey]
                      }`}
                    >
                      {STATUS_LABEL[estado as StatusKey]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {itemsForCol.length}
                    </span>
                  </div>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, estado)}
                  className="space-y-2 min-h-[120px]"
                >
                  {itemsForCol.length === 0 ? (
                    <div className="flex items-center justify-center h-36 text-sm text-muted-foreground">
                      No hay tickets en este estado
                    </div>
                  ) : (
                    itemsForCol.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        className="rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium leading-tight">
                              {t.nombre ?? "Ticket"}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Creado:{" "}
                                {t.created_at
                                  ? new Date(t.created_at).toLocaleDateString()
                                  : "—"}
                              </span>
                              {t.tipo && <span>· {t.tipo}</span>}
                              {t.deadline && (
                                <span>
                                  · Vence:{" "}
                                  {new Date(t.deadline).toLocaleDateString()}
                                </span>
                              )}
                              {t.codigo && (
                                <button
                                  className="underline hover:no-underline"
                                  onClick={() => openFilesFor(t)}
                                  type="button"
                                >
                                  · Archivos
                                </button>
                              )}
                            </div>
                            {/* Coaches asignados */}
                            {Array.isArray((t as any).coaches) &&
                              (t as any).coaches.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {(t as any).coaches
                                    .slice(0, 4)
                                    .map((c: any, idx: number) => (
                                      <span
                                        key={`${
                                          c.codigo_equipo ?? c.nombre ?? idx
                                        }`}
                                        className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700"
                                        title={`${c.nombre ?? "Coach"}${
                                          c.area ? ` · ${c.area}` : ""
                                        }${c.puesto ? ` · ${c.puesto}` : ""}`}
                                      >
                                        {(c.nombre ?? "Coach").slice(0, 24)}
                                        {c.area
                                          ? ` · ${String(c.area).slice(0, 12)}`
                                          : ""}
                                      </span>
                                    ))}
                                  {((t as any).coaches?.length ?? 0) > 4 && (
                                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
                                      +{(t as any).coaches.length - 4} más
                                    </span>
                                  )}
                                </div>
                              )}
                            {/* Último estado */}
                            {(t as any).ultimo_estado?.estatus && (
                              <div className="mt-1 text-[11px] text-neutral-500">
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
                                    {" "}
                                    ·{" "}
                                    {new Date(
                                      (t as any).ultimo_estado.fecha
                                    ).toLocaleString()}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
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
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              Cargando archivos…
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
              Cargando previsualización…
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
