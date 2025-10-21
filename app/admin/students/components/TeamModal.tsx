"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type CoachMember = {
  name: string;
  puesto?: string | null;
  area?: string | null;
  url?: string | null;
};

export default function TeamModal({
  open,
  onOpenChange,
  studentName,
  studentCode,
  members,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentName: string;
  studentCode?: string | null;
  members: CoachMember[];
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Equipo del alumno
          </DialogTitle>
          <DialogDescription>
            {studentName}
            {studentCode ? (
              <span className="ml-2 rounded bg-muted px-2 py-0.5 text-[11px]">
                {studentCode}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando coaches…
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-3">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este alumno no tiene coaches asociados.
              </p>
            ) : (
              <ul className="space-y-2">
                {members.map((m, idx) => (
                  <li
                    key={`${m.name}-${idx}`}
                    className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{m.name}</span>
                        {m.puesto ? (
                          <Badge variant="muted" className="h-5 text-[11px]">
                            {m.puesto}
                          </Badge>
                        ) : null}
                        {m.area ? (
                          <Badge variant="muted" className="h-5 text-[11px]">
                            {m.area}
                          </Badge>
                        ) : null}
                      </div>
                      {m.url ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline"
                          title="Abrir perfil"
                        >
                          Abrir perfil <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
