"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function TeamModal({
  open,
  onOpenChange,
  bucket,
  fmtDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bucket: {
    team: { nombre: string; alumnos: { name: string; url?: string | null }[] };
    tickets: {
      id: number;
      nombre?: string | null;
      id_externo?: string | null;
      alumno_nombre?: string | null;
      creacion: string;
      tipo?: string | null;
    }[];
    membersHit: Record<string, number>;
  } | null;
  fmtDate: (iso?: string | null) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-gray-200 shadow-none">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            {bucket ? `Equipo: ${bucket.team.nombre}` : "Equipo"}
          </DialogTitle>
        </DialogHeader>

        {!bucket ? (
          <div className="text-sm text-muted-foreground">Sin datos</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold">Miembros</h4>
              <div className="space-y-2">
                {bucket.team.alumnos.map((m, i) => {
                  const hits = m.url ? bucket.membersHit[m.url] ?? 0 : 0;
                  return (
                    <div
                      key={`${m.name}-${i}`}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        {m.url ? (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            {m.url}
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            sin URL
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="tabular-nums">
                        {hits} hits
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Tickets relacionados
              </h4>
              <div className="space-y-2">
                {bucket.tickets.slice(0, 60).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {t.nombre ?? "Sin título"}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({t.id_externo ?? "-"})
                        </span>
                      </p>
                      <Badge variant="outline">
                        {(t.tipo ?? "N/A").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.alumno_nombre ?? "—"} • {fmtDate(t.creacion)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
