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
  // const [creating, setCreating] = useState(false); // Replaced by flowStage
  const [flowStage, setFlowStage] = useState<
    "form" | "creating" | "uploading" | "success"
  >("form");

  // Form state
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
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
  const [types, setTypes] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (open) {
      // Reset form
      setStudentQuery("");
      setSelectedStudentId(defaultStudentCode || "");
      setTitle("");
      setType("");
      setDescription("");
      setLinks([]);
      setNewLink("");
      setFiles([]);
      setFlowStage("form");

      // Load data
      loadData();
    }
  }, [open, defaultStudentCode]);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, typesData] = await Promise.all([
        getAllStudents(),
        getOpciones("tipo_ticket"),
      ]);
      setStudents(studentsData);
      setTypes(typesData);
      if (typesData.length > 0) setType(typesData[0].key);
    } catch (e) {
      console.error(e);
      toast({ title: "Error cargando datos iniciales" });
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = React.useMemo(() => {
    if (!studentQuery) return [];
    const q = studentQuery.toLowerCase();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q))
      )
      .slice(0, 10);
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
        prev.map((f) => `${f.name}|${f.size}|${f.lastModified}`)
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
          new File([file], `pasted-${ts}.${ext}`, { type: file.type })
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
    if (!selectedStudentId || !title.trim() || !type) return;

    try {
      setFlowStage("creating");

      // 1. Crear ticket (sin archivos pesados aún)
      const created = await createTicket({
        nombre: title,
        id_alumno: selectedStudentId,
        tipo: type,
        descripcion: description,
        archivos: [], // Se subirán en paso 2
        urls: links,
      });

      const payload = created?.data ?? created;
      // Intentar obtener el código (UUID) o ID del ticket
      const ticketId = payload?.codigo ?? payload?.id;

      if (!ticketId) {
        throw new Error("No se pudo obtener el ID del ticket creado");
      }

      // 2. Subir archivos si existen
      if (files.length > 0) {
        setFlowStage("uploading");
        setUploadProgress({ current: 0, total: files.length });

        // Subir uno por uno
        for (let i = 0; i < files.length; i++) {
          setUploadProgress({ current: i + 1, total: files.length });

          let fileToUpload = files[i];
          const type = (fileToUpload.type || "").toLowerCase();

          // Convertir audio a MP3 si es necesario
          if (
            type.startsWith("audio/") &&
            !type.includes("mp3") &&
            !type.includes("mpeg")
          ) {
            try {
              console.log(
                `[CreateTicket] Convirtiendo audio a MP3: ${fileToUpload.name}`
              );
              fileToUpload = await convertBlobToMp3(fileToUpload);
              console.log(
                `[CreateTicket] Audio convertido: ${fileToUpload.name}`
              );
            } catch (e) {
              console.error("Error converting audio to mp3 in modal", e);
              // Fallback: upload original
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {studentQuery && !selectedStudentId && (
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
                        setSelectedStudentId(s.code || String(s.id));
                        setStudentQuery(s.name);
                      }}
                    >
                      {s.name}{" "}
                      <span className="text-slate-400 text-xs">({s.code})</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedStudentId && (
              <div className="flex items-center justify-between bg-violet-50 text-violet-700 px-3 py-2 rounded-md text-sm border border-violet-200 mt-1">
                <span>
                  Alumno seleccionado:{" "}
                  <strong>
                    {students.find(
                      (s) => (s.code || String(s.id)) === selectedStudentId
                    )?.name || selectedStudentId}
                  </strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-violet-200"
                  onClick={() => {
                    setSelectedStudentId("");
                    setStudentQuery("");
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

          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo de Ticket</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedStudentId || !title.trim()}
          >
            Crear Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
