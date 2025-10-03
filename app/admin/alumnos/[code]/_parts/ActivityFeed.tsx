"use client";

import type React from "react";

import { CalendarDays, CheckCircle2, FileCheck2 } from "lucide-react";
import { fmtES } from "./detail-utils";

type Item =
  | { kind: "tarea"; date?: string | null; text: string }
  | { kind: "fase"; date?: string | null; text: string }
  | { kind: "nota"; date?: string | null; text: string };

const ICON_MAP: Record<Item["kind"], React.ReactNode> = {
  tarea: <FileCheck2 className="h-4 w-4" />,
  fase: <CheckCircle2 className="h-4 w-4" />,
  nota: <CalendarDays className="h-4 w-4" />,
};

export default function ActivityFeed({
  lastTaskAt,
  steps,
}: {
  lastTaskAt?: string | null;
  steps: Array<{ label: string; date?: string | null }>;
}) {
  const items: Item[] = [
    { kind: "tarea", date: lastTaskAt, text: "Última entrega de tarea" },
    ...steps
      .filter((s) => s.date)
      .slice(-3)
      .map((s) => ({
        kind: "fase" as const,
        date: s.date,
        text: `Completó ${s.label}`,
      })),
    { kind: "nota", date: null, text: "Sincronizado con API" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold">Actividad reciente</h3>
      </div>
      <ul className="divide-y p-3">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex-none text-muted-foreground">
                {ICON_MAP[it.kind]}
              </span>
              <span className="truncate text-sm">{it.text}</span>
            </div>
            <span className="flex-none text-xs text-muted-foreground">
              {fmtES(it.date)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
