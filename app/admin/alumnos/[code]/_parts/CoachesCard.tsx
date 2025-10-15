"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import CoachPickerModal from "./CoachPickerModal";
import type { Person } from "./PhasesTimeline";
import type { CoachCandidate } from "./CoachPickerModal";

type Coach = Person;

export default function CoachesCard({
  coaches = [],
  peopleIndex = [],
  onChangeMember = () => {},
}: {
  coaches?: Coach[];
  peopleIndex?: Person[];
  onChangeMember?: (idx: number, next: Person) => void;
}) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const list = coaches.length
    ? coaches
    : [
        { name: "Ana Salas", puesto: "Coach", area: "FrontEnd" },
        { name: "Luis Vega", puesto: "Mentor", area: "BackEnd" },
      ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Equipo asignado</h3>
      </div>

      <div className="space-y-2 p-3">
        {list.map((c, idx) => (
          <div
            key={`${c.name}-${idx}`}
            className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* Avatar */}
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-sm font-medium text-blue-700 ring-1 ring-black/5 dark:from-blue-950/30 dark:to-indigo-950/30 dark:text-blue-400 dark:ring-white/10">
                {(c.name ?? "?")[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[c.puesto, c.area].filter(Boolean).join(" · ") ||
                    c.url ||
                    "—"}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentIndex(idx);
                setOpen(true);
              }}
              className="flex-none rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted active:scale-[0.98]"
            >
              Cambiar
            </button>
          </div>
        ))}
      </div>

      <CoachPickerModal
        open={open}
        onOpenChange={setOpen}
        onPick={(p: CoachCandidate) => {
          if (currentIndex != null)
            onChangeMember(currentIndex, {
              name: p.name,
              puesto: p.puesto ?? null,
              area: p.area ?? null,
              url: p.url ?? null,
            });
        }}
      />
    </div>
  );
}
