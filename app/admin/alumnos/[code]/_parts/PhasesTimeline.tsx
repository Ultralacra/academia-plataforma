"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";

export type Person = {
  name: string;
  url?: string | null;
  puesto?: string | null;
  area?: string | null;
};

export default function TeamPickerModal({
  open,
  onOpenChange,
  people,
  onPick,
  title = "Seleccionar integrante",
  note,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  people: Person[];
  onPick: (p: Person) => void;
  title?: string;
  note?: string;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return people;
    return people.filter((p) =>
      [p.name, p.puesto, p.area, p.url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(k)
    );
  }, [people, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, área o puesto…"
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {note && <p className="mb-3 text-xs text-muted-foreground">{note}</p>}

          <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {filtered.map((m, i) => (
              <li
                key={`${m.name}-${m.url ?? i}`}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-sm font-medium text-blue-700 ring-1 ring-black/5 dark:from-blue-950/30 dark:to-indigo-950/30 dark:text-blue-400 dark:ring-white/10">
                    {(m.name ?? "?")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[m.puesto, m.area].filter(Boolean).join(" · ") ||
                        m.url ||
                        "—"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onPick(m);
                    onOpenChange(false);
                  }}
                  className="flex-none rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
                >
                  Seleccionar
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-12 text-center text-sm text-muted-foreground">
                No se encontraron coincidencias
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
