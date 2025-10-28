"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Eye } from "lucide-react";

export default function StudentsListModal({
  open,
  onOpenChange,
  title,
  rows,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  rows: Array<{
    code?: string | null;
    name?: string | null;
    subtitle?: string;
  }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[92vw] sm:max-w-2xl max-h-[85vh] overflow-hidden"
        // Accesibilidad: si hay título pero no queremos descripción visible,
        // proporcionamos una descripción sólo para lectores de pantalla.
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Listado de alumnos relacionado con "{title}".
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r, i) => (
                <li
                  key={`${r.code}-${i}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name ?? "—"}</div>
                    {r.subtitle ? (
                      <div className="text-xs text-muted-foreground">
                        {r.subtitle}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 pl-3 shrink-0">
                    {r.code ? (
                      <Link
                        href={`/admin/alumnos/${encodeURIComponent(r.code)}`}
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm hover:bg-muted"
                        title="Ver página del alumno"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver alumno {r.code}</span>
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
