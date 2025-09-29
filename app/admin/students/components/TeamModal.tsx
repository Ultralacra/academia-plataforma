"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Users } from "lucide-react";
import { type TeamMember } from "@/lib/data-service";

export default function TeamModal({
  open,
  onOpenChange,
  studentName,
  members,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentName: string;
  members: TeamMember[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 
        w-[92vw] para móviles, sm:max-w-2xl para desktop,
        max-h-[85vh] y overflow-hidden para que no “salga” de la pantalla.
      */}
      <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Equipo asignado
          </DialogTitle>
          <DialogDescription>
            Miembros asociados a{" "}
            <span className="font-medium text-foreground">{studentName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Scroll solo del contenido, dejando el header fijo */}
        <ScrollArea className="max-h-[60vh] pr-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este estudiante no tiene equipo asociado.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m, idx) => (
                <li
                  key={`${m.name}-${idx}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium truncate">{m.name}</span>
                    {m.url ? (
                      <span className="text-xs text-muted-foreground truncate">
                        {m.url}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin enlace
                      </span>
                    )}
                  </div>
                  {m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-primary/10 hover:border-primary"
                      title="Abrir enlace"
                    >
                      Abrir <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
