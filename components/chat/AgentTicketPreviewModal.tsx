"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  Tag,
  X,
} from "lucide-react";
import { createTicket, uploadTicketFiles } from "@/app/admin/alumnos/api";
import { convertBlobToMp3 } from "@/lib/audio-converter";

interface AgentTicketPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alumnoCode: string;
  alumnoName: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  onSuccess: () => void;
  /** Archivos adjuntados en el chat — se suben junto al ticket */
  files?: File[];
  /** URLs extraídas del mensaje del alumno */
  urls?: string[];
  /** Función alternativa de creación (ej. createTicketAsAgent) */
  createFn?: (
    form: import("@/app/admin/alumnos/api").CreateTicketForm,
  ) => Promise<any>;
}

export function AgentTicketPreviewModal({
  open,
  onOpenChange,
  alumnoCode,
  alumnoName,
  title,
  description,
  category,
  priority,
  onSuccess,
  files,
  urls,
  createFn,
}: AgentTicketPreviewModalProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm() {
    setCreating(true);
    setError(null);
    try {
      const fn = createFn ?? createTicket;
      const created = await fn({
        nombre: title,
        id_alumno: alumnoCode,
        tipo: category,
        descripcion: description,
        estado: "EN_PROGRESO",
        urls: urls && urls.length > 0 ? urls : undefined,
      });

      // Upload files if any
      if (files && files.length > 0) {
        const payload = created?.data ?? created;
        const ticketId = payload?.codigo ?? payload?.id;
        if (ticketId) {
          for (const file of files) {
            let fileToUpload = file;
            const fileType = (file.type || "").toLowerCase();
            if (
              fileType.startsWith("audio/") &&
              !fileType.includes("mp3") &&
              !fileType.includes("mpeg")
            ) {
              try {
                fileToUpload = await convertBlobToMp3(file);
              } catch {}
            }
            await uploadTicketFiles(String(ticketId), [fileToUpload]);
          }
        }
      }

      onSuccess();
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? "No se pudo enviar el feedback";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  const prioridadColors: Record<string, string> = {
    ALTA: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    MEDIA:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    BAJA: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !creating && onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
              <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Confirmar feedback</p>
              <p className="text-xs text-muted-foreground">
                Revisa los detalles antes de enviar
              </p>
            </div>
          </div>
          <button
            onClick={() => !creating && onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
            disabled={creating}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Alumno (read-only) */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Alumno
            </p>
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-sm font-medium">{alumnoName}</p>
              <p className="text-xs text-muted-foreground">{alumnoCode}</p>
            </div>
          </div>

          {/* Asunto */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Asunto
            </p>
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-sm">{title}</p>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Descripción
            </p>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {/* Categoría + Prioridad */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Categoría
              </p>
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{category}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prioridad
              </p>
              <div
                className={`rounded-xl px-3 py-2 text-sm font-medium ${prioridadColors[priority] ?? prioridadColors.MEDIA}`}
              >
                {priority}
              </div>
            </div>
          </div>

          {/* Archivos adjuntos */}
          {files && files.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Adjuntos ({files.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="max-w-[9rem] truncate">{f.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            onClick={() => !creating && onOpenChange(false)}
            disabled={creating}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={creating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar y enviar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
