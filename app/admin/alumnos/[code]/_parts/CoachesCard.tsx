"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CoachPickerModal from "./CoachPickerModal";
import type { Person } from "./PhasesTimeline";
import type { CoachCandidate } from "./CoachPickerModal";

type Coach = Person;

export default function CoachesCard({
  coaches = [],
  peopleIndex = [],
  onChangeMember = () => {},
  onAssign = () => {},
  onRemove = () => {},
}: {
  coaches?: Coach[];
  peopleIndex?: Person[];
  onChangeMember?: (idx: number, next: Person) => void;
  onAssign?: (codes: string[]) => void;
  onRemove?: (coachId: string | number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<null | {
    id: string | number | null;
    name?: string;
  }>(null);

  const list = coaches;

  return (
    <div className="overflow-hidden rounded-xl border border-blue-100 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Equipo asignado</h3>
        </div>
        <div>
          <button
            onClick={() => {
              setCurrentIndex(null);
              setOpen(true);
            }}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Asignar coach
          </button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {list.length === 0 && (
          <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div>Sin coach</div>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setOpen(true);
              }}
              className="ml-3 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Asignar coach
            </button>
          </div>
        )}
        {list.map((c, idx) => (
          <div
            key={`${c.name}-${idx}`}
            className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 transition-colors hover:bg-blue-50/40"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* Avatar */}
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-sm font-medium text-blue-700 ring-1 ring-blue-200">
                {(c.name ?? "?")[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {([c.puesto, c.area].filter(Boolean).length > 0 && (
                    <div className="flex items-center gap-2">
                      {c.puesto ? (
                        <span className="inline-flex items-center">
                          <span className="sr-only">Puesto:</span>
                          <span className="mr-1" />
                          <span>
                            <span className="">
                              {/* usar Badge variante muted */}
                              <span className="inline-block">
                                {/* Placeholder for accessibility; actual Badge rendered below */}
                              </span>
                            </span>
                          </span>
                          <span className="ml-0">
                            <span className="">
                              <Badge
                                variant="secondary"
                                className="h-5 text-[11px]"
                              >
                                {c.puesto}
                              </Badge>
                            </span>
                          </span>
                        </span>
                      ) : null}
                      {c.area ? (
                        <Badge variant="secondary" className="h-5 text-[11px]">
                          {c.area}
                        </Badge>
                      ) : null}
                    </div>
                  )) ||
                    c.url ||
                    "—"}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCurrentIndex(idx);
                  setOpen(true);
                }}
                className="flex-none rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted active:scale-[0.98]"
              >
                Cambiar
              </button>
              <button
                onClick={() => {
                  const coachId = (c as any).coachId ?? (c as any).id ?? null;
                  setConfirmTarget({ id: coachId, name: c.name });
                  setConfirmOpen(true);
                }}
                className="flex-none rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                Desvincular
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(v) => setConfirmOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar desvinculación</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres desvincular a {confirmTarget?.name} del
              alumno? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white"
              onClick={() => {
                setConfirmOpen(false);
                if (confirmTarget) onRemove(confirmTarget.id);
                setConfirmTarget(null);
              }}
            >
              Desvincular
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CoachPickerModal
        open={open}
        onOpenChange={setOpen}
        onPick={(p: any) => {
          if (currentIndex != null)
            onChangeMember(currentIndex, {
              name: p.name,
              puesto: p.puesto ?? null,
              area: p.area ?? null,
              url: p.url ?? null,
            });
        }}
        onConfirm={(selected) => {
          // selected: CoachCandidate[] -> extraer códigos de equipo
          const codes = selected.map((s) => s.teamCode).filter(Boolean);
          onAssign(codes as string[]);
        }}
      />
    </div>
  );
}
