"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";

type DateRange = { from?: Date; to?: Date };

export default function PauseDatesModal({
  open,
  onOpenChange,
  onConfirm,
  initialRange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (range: { start: string; end: string }) => void;
  initialRange?: { start?: string; end?: string } | null;
}) {
  const [range, setRange] = useState<DateRange>({});

  useEffect(() => {
    if (!open) return;
    if (initialRange?.start) {
      const from = new Date(initialRange.start);
      const to = initialRange?.end ? new Date(initialRange.end) : undefined;
      setRange({ from, to });
    } else {
      setRange({});
    }
  }, [open, initialRange?.start, initialRange?.end]);

  const canSave = !!(
    range.from &&
    range.to &&
    !isNaN(range.from.getTime()) &&
    !isNaN(range.to.getTime())
  );

  function toISO(d: Date) {
    // normalizar a 00:00:00 UTC del día
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd.toISOString();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecciona fechas de pausa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Define el rango en el que el alumno permanecerá en estado pausado.
          </p>
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range as any}
            onSelect={(r: any) => setRange(r)}
            locale={es}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!canSave) return;
              onConfirm({ start: toISO(range.from!), end: toISO(range.to!) });
              onOpenChange(false);
            }}
            disabled={!canSave}
          >
            Guardar pausa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
