"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  getAllStudents,
  getOpciones,
  createTicket,
  type StudentRow,
} from "@/app/admin/alumnos/api";

export function CreateTicketModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Data state
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [types, setTypes] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (open) {
      // Reset form
      setStudentQuery("");
      setSelectedStudentId("");
      setTitle("");
      setType("");
      setDescription("");
      setLinks([]);
      setNewLink("");
      setFiles([]);

      // Load data
      loadData();
    }
  }, [open]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const handleCreate = async () => {
    if (!selectedStudentId || !title.trim() || !type) return;

    try {
      setCreating(true);

      await createTicket({
        nombre: title,
        id_alumno: selectedStudentId,
        tipo: type,
        descripcion: description,
        archivos: files,
        urls: links,
      });

      toast({ title: "Ticket creado exitosamente" });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      console.error(e);
      toast({ title: e.message || "Error al crear ticket" });
    } finally {
      setCreating(false);
    }
  };

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
            <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="cursor-pointer"
              />
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
            disabled={creating || !selectedStudentId || !title.trim()}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
