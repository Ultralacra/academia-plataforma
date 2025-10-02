"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
                    <div className="font-medium truncate">
                      {r.name ?? "—"}{" "}
                      {r.code ? (
                        <span className="opacity-60">({r.code})</span>
                      ) : null}
                    </div>
                    {r.subtitle ? (
                      <div className="text-xs text-muted-foreground">
                        {r.subtitle}
                      </div>
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
