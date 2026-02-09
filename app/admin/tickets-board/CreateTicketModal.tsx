"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Plus,
  X,
  Link as LinkIcon,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  getAllStudents,
  getOpciones,
  createTicket,
  uploadTicketFiles,
  type StudentRow,
} from "@/app/admin/alumnos/api";
import { convertBlobToMp3 } from "@/lib/audio-converter";
import { Badge } from "@/components/ui/badge";
import { InactivePorPagoConfirmDialog } from "@/components/tickets/InactivePorPagoConfirmDialog";

export function CreateTicketModal({
  open,
  onOpenChange,
  onSuccess,
  defaultStudentCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultStudentCode?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // const [creating, setCreating] = useState(false); // Replaced by flowStage
  const [flowStage, setFlowStage] = useState<
    "form" | "creating" | "uploading" | "success"
  >("form");

  // Form state
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudentMeta, setSelectedStudentMeta] = useState<{
    name: string;
    state?: string | null;
    stage?: string | null;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  // Data state
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [types, setTypes] = useState<{ key: string; value: string }[]>([]);
  const [inactivePaymentConfirmOpen, setInactivePaymentConfirmOpen] =
    useState(false);

  const getEstadoBadgeClassName = (estadoRaw?: string | null) => {
    const estado = String(estadoRaw ?? "")
      .trim()
      .toUpperCase();
    if (!estado) return "";

    if (estado === "ACTIVO") {
      return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    }
    if (estado === "PAUSADO") {
      return "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    }
    if (estado === "MEMBRESÍA" || estado === "MEMBRESIA") {
      return "border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200";
    }
    if (estado.includes("PAGO")) {
      return "border-orange-200 bg-orange-100 text-orange-900 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-200";
    }
    if (estado.includes("INACTIVO")) {
      return "border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200";
    }

    return "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-200";
  };

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    const wanted = String(selectedStudentId);
    return (
      students.find((s) => String((s.code as any) ?? s.id) === wanted) ?? null
    );
  }, [students, selectedStudentId]);

  const normalizeEstado = (value?: string | null) => {
    const raw = String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return raw.trim().toUpperCase().replace(/\s+/g, " ");
  };

  const selected = selectedStudent ?? selectedStudentMeta;

  const isInactivePorPago = useMemo(() => {
    const estado = normalizeEstado(selected?.state);
    return estado.includes("INACTIVO") && estado.includes("PAGO");
  }, [selected]);

  const isInactive = useMemo(() => {
    const estado = normalizeEstado(selected?.state);
    return estado.includes("INACTIVO");
  }, [selected]);

  const confirmTitle = isInactivePorPago
    ? "Alumno inactivo por pago"
    : "Alumno inactivo";

  const confirmDescription = isInactivePorPago
    ? "Este alumno está marcado como INACTIVO POR PAGO. ¿Seguro que quieres crear el ticket de todas formas?"
    : "Este alumno está marcado como INACTIVO. ¿Seguro que quieres crear el ticket de todas formas?";

  useEffect(() => {
    if (open) {
      // Reset form
      setStudentQuery("");
      setSelectedStudentId(defaultStudentCode || "");
      setSelectedStudentMeta(null);
      setTitle("");
      setType([]);
      setDescription("");
      setLinks([]);
      setNewLink("");
      setFiles([]);
      setFlowStage("form");
      setLoadError(null);

      // Load data
      loadData();
    }
  }, [open, defaultStudentCode]);

  async function loadData() {
    try {
      setLoading(true);
      setLoadError(null);
      const [studentsData, typesData] = await Promise.all([
        getAllStudents({ page: 1, pageSize: PAGE_SIZE }),
        getOpciones("tipo_ticket"),
      ]);
      setStudents(studentsData);
      setPage(1);
      setHasMore((studentsData?.length ?? 0) >= PAGE_SIZE);
      setTypes(typesData);
      if (typesData.length > 0) setType([typesData[0].key]);

      if (defaultStudentCode) {
        const wanted = String(defaultStudentCode);
        const found =
          studentsData.find(
            (s) => String((s.code as any) ?? s.id) === wanted,
          ) ?? null;
        if (found) {
          setSelectedStudentId(String((found.code as any) ?? found.id));
          setSelectedStudentMeta({
            name: found.name,
            state: found.state,
            stage: found.stage,
          });
          setStudentQuery(found.name);
        }
      }
    } catch (e) {
      console.error(e);
      setLoadError("Ocurrió un error al cargar los usuarios");
      toast({ title: "Error cargando datos iniciales" });
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreStudents() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const more = await getAllStudents({
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      if (more && more.length > 0) {
        setStudents((prev) => [...prev, ...more]);
        setPage(nextPage);
        setHasMore(more.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      setLoadError("Ocurrió un error al cargar más usuarios");
    } finally {
      setLoadingMore(false);
    }
  }

  // Buscar estudiantes en backend cuando el usuario escribe (debounce)
  useEffect(() => {
    let alive = true;
    const q = String(studentQuery || "").trim();
    if (!q) return; // no buscar si el query está vacío
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await getAllStudents({
          page: 1,
          pageSize: PAGE_SIZE,
          search: q,
        });
        if (!alive) return;
        setStudents(Array.isArray(res) ? res : []);
        setPage(1);
        setHasMore((res?.length ?? 0) >= PAGE_SIZE);
      } catch (e) {
        console.error("Error buscando alumnos:", e);
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [studentQuery]);

  const filteredStudents = React.useMemo(() => {
    const q = String(studentQuery || "").trim();
    if (!q) return [];
    // Los resultados ya vienen filtrados desde el backend cuando hay query;
    // además permitimos fallback a la lista local cargada.
    return (students || []).slice(0, 10);
  }, [students, studentQuery]);

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    setLinks([...links, newLink.trim()]);
    setNewLink("");
  };

  const MAX_FILES = 10;
  const addFiles = (incoming: File[]) => {
    if (!incoming?.length) return;
    setFiles((prev) => {
      const seen = new Set(
        prev.map((f) => `${f.name}|${f.size}|${f.lastModified}`),
      );
      const next = [...prev];
      for (const f of incoming) {
        const key = `${f.name}|${f.size}|${f.lastModified}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(f);
        if (next.length >= MAX_FILES) break;
      }
      return next.slice(0, MAX_FILES);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    addFiles(picked);
    // Permite seleccionar el mismo archivo de nuevo
    e.currentTarget.value = "";
  };

  const handleFilesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    const picked = Array.from(e.dataTransfer?.files ?? []);
    addFiles(picked);
  };

  const handlePasteIntoDropzone = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    if (!items.length) return;

    const pastedFiles: File[] = [];
    for (const it of items) {
      if (it.kind !== "file") continue;
      const file = it.getAsFile();
      if (!file) continue;
      // Si viene sin nombre útil, generamos uno
      if (!file.name || file.name === "image.png") {
        const ext = (file.type || "").includes("png")
          ? "png"
          : (file.type || "").includes("jpeg")
            ? "jpg"
            : (file.type || "").includes("webp")
              ? "webp"
              : "bin";
        const ts = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .slice(0, 19);
        pastedFiles.push(
          new File([file], `pasted-${ts}.${ext}`, { type: file.type }),
        );
      } else {
        pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      addFiles(pastedFiles);
    }
  };

  const handleCreate = async () => {
    if (!selectedStudentId || !title.trim() || type.length === 0) return;

    try {
      setFlowStage("creating");

      // 1. Crear ticket con todos los tipos seleccionados (separados por coma)
      const created = await createTicket({
        nombre: title,
        id_alumno: selectedStudentId,
        tipo: type.join(","),
        descripcion: description,
        archivos: [],
        urls: links,
      });

      const payload = created?.data ?? created;
      const ticketId = payload?.codigo ?? payload?.id;

      if (!ticketId) {
        throw new Error("No se pudo obtener el ID del ticket creado");
      }

      // 2. Subir archivos si existen
      if (files.length > 0) {
        setFlowStage("uploading");
        setUploadProgress({ current: 0, total: files.length });

        for (let i = 0; i < files.length; i++) {
          setUploadProgress({ current: i + 1, total: files.length });

          let fileToUpload = files[i];
          const fileType = (fileToUpload.type || "").toLowerCase();

          if (
            fileType.startsWith("audio/") &&
            !fileType.includes("mp3") &&
            !fileType.includes("mpeg")
          ) {
            try {
              fileToUpload = await convertBlobToMp3(fileToUpload);
            } catch (e) {
              console.error("Error converting audio to mp3 in modal", e);
            }
          }

          await uploadTicketFiles(String(ticketId), [fileToUpload]);
        }
      }

      setFlowStage("success");

      // Cerrar automáticamente después de un momento
      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (e: any) {
      console.error(e);
      toast({
        title: e.message || "Error al crear ticket",
        variant: "destructive",
      });
      setFlowStage("form");
    }
  };

  const handleCreateClick = () => {
    if (!selectedStudentId || !title.trim()) return;
    if (type.length === 0) {
      toast({
        title: "Selecciona al menos un tipo de ticket",
        variant: "destructive",
      });
      return;
    }
    if (isInactive) {
      setInactivePaymentConfirmOpen(true);
      return;
    }
    void handleCreate();
  };

  // Renderizado de estados de carga/éxito
  if (flowStage !== "form") {
    return (
      <Dialog
        open={open}
        onOpenChange={(v) => {
          // Evitar que el usuario cierre el modal mientras se crea/sube.
          // Permitir cerrar una vez en success.
          if (!v && flowStage !== "success") return;
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-md p-8 border-none shadow-2xl bg-white dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            {flowStage === "creating" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 animate-pulse" />
                  <Loader2 className="h-12 w-12 text-violet-600 animate-spin relative z-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Creando ticket...</h3>
                  <p className="text-sm text-muted-foreground">
                    Registrando la solicitud en el sistema
                  </p>
                </div>
              </>
            )}

            {flowStage === "uploading" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse" />
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin relative z-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">
                    Subiendo archivos...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Procesando archivo {uploadProgress.current} de{" "}
                    {uploadProgress.total}
                  </p>
                </div>
              </>
            )}

            {flowStage === "success" && (
              <>
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
                    ¡Ticket Creado!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    El ticket se ha registrado correctamente.
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear nuevo ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alumno Search */}
          <div className="space-y-2">
            <Label>Alumno</Label>
            {loading ? (
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50 dark:bg-zinc-800">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Cargando usuarios...
                </span>
              </div>
            ) : loadError ? (
              <div className="flex items-center justify-between gap-2 h-10 px-3 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <span className="text-sm text-red-600 dark:text-red-400">
                  {loadError}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                  onClick={() => loadData()}
                >
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {!loading && studentQuery && !selectedStudentId && (
              <div className="border rounded-md p-2 bg-slate-50 max-h-40 overflow-y-auto space-y-1 mt-1">
                {filteredStudents.length === 0 ? (
                  <div className="text-sm text-slate-500 px-2">
                    No se encontraron alumnos
                  </div>
                ) : (
                  filteredStudents.map((s) => (
                    <div
                      key={s.id}
                      className="text-sm px-2 py-1.5 hover:bg-slate-200 cursor-pointer rounded"
                      onClick={() => {
                        setSelectedStudentId(String((s.code as any) ?? s.id));
                        setSelectedStudentMeta({
                          name: s.name,
                          state: s.state,
                          stage: s.stage,
                        });
                        setStudentQuery(s.name);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate">
                              {s.name}
                            </span>
                            {s.state ? (
                              <Badge
                                className={getEstadoBadgeClassName(s.state)}
                              >
                                {s.state}
                              </Badge>
                            ) : null}
                            {s.stage ? (
                              <Badge variant="muted">{s.stage}</Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {hasMore && (
                  <div className="flex items-center justify-center mt-2">
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando...</span>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadMoreStudents()}
                      >
                        Cargar más
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            {!loading && selectedStudentId && (
              <div className="flex items-center justify-between bg-violet-50 text-violet-700 px-3 py-2 rounded-md text-sm border border-violet-200 mt-1">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      Alumno seleccionado:{" "}
                      <strong>{selected?.name || studentQuery || "—"}</strong>
                    </span>
                    {selected?.state ? (
                      <Badge
                        className={getEstadoBadgeClassName(selected.state)}
                      >
                        {selected.state}
                      </Badge>
                    ) : null}
                    {selected?.stage ? (
                      <Badge variant="muted">{selected.stage}</Badge>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-violet-200"
                  onClick={() => {
                    setSelectedStudentId("");
                    setStudentQuery("");
                    setSelectedStudentMeta(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Asunto</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumen del problema..."
            />
          </div>

          {/* Type (multi-select) */}
          <div className="space-y-2">
            <Label>
              Tipo de Ticket{" "}
              {type.length > 1 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({type.length} seleccionados — se creará un ticket por cada
                  tipo)
                </span>
              )}
            </Label>
            <div className="flex flex-wrap gap-2 rounded-md border p-2 min-h-[40px]">
              {types.map((t) => {
                const isSelected = type.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setType((prev) =>
                        isSelected
                          ? prev.filter((k) => k !== t.key)
                          : [...prev, t.key],
                      );
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    {t.value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <Label>Enlaces (opcional)</Label>
            <div className="flex gap-2">
              <Input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddLink())
                }
              />
              <Button type="button" variant="outline" onClick={handleAddLink}>
                Agregar
              </Button>
            </div>
            {links.length > 0 && (
              <div className="space-y-1 mt-2">
                {links.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border"
                  >
                    <LinkIcon className="h-3 w-3 text-slate-400" />
                    <span className="flex-1 truncate text-blue-600">{l}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() =>
                        setLinks(links.filter((_, idx) => idx !== i))
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files */}
          <div className="space-y-2">
            <Label>Adjuntos</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onPaste={handlePasteIntoDropzone}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFiles(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFiles(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFiles(false);
              }}
              onDrop={handleFilesDrop}
              className={
                "rounded-md border-2 border-dashed bg-slate-50 p-6 text-center text-sm text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-slate-200 " +
                (isDraggingFiles
                  ? "border-slate-400"
                  : "border-slate-200 hover:border-slate-300")
              }
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200">
                <Paperclip className="h-5 w-5 text-slate-500" />
              </div>
              <div className="font-medium text-slate-800">
                Arrastra y suelta archivos aquí
              </div>
              <div className="mt-1 text-xs text-slate-500">
                o haz clic para seleccionarlos · también puedes pegar una imagen
                (Ctrl+V)
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Máximo {MAX_FILES} archivos
              </div>
            </div>
            {files.length > 0 && (
              <div className="space-y-1 mt-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border"
                  >
                    <Paperclip className="h-3 w-3 text-slate-400" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() =>
                        setFiles(files.filter((_, idx) => idx !== i))
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <InactivePorPagoConfirmDialog
          open={inactivePaymentConfirmOpen}
          onOpenChange={setInactivePaymentConfirmOpen}
          title={confirmTitle}
          description={confirmDescription}
          studentName={selected?.name || studentQuery || "Alumno"}
          studentState={selected?.state}
          studentStage={selected?.stage}
          getEstadoBadgeClassName={getEstadoBadgeClassName}
          onConfirm={handleCreate}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateClick}
            disabled={!selectedStudentId || !title.trim() || type.length === 0}
          >
            Crear Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
