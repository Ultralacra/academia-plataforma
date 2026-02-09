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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseMaybe } from "./detail-utils";

type DateRange = { from?: Date; to?: Date };

export default function PauseDatesModal({
  open,
  onOpenChange,
  onConfirm,
  initialRange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (range: {
    start: string;
    end: string;
    tipo: "CONTRACTUAL" | "EXTRAORDINARIA";
    motivo: string;
  }) => void;
  initialRange?: { start?: string; end?: string } | null;
}) {
  const [range, setRange] = useState<DateRange>({});
  const [tipo, setTipo] = useState<"CONTRACTUAL" | "EXTRAORDINARIA" | "">("");
  const [motivo, setMotivo] = useState<string>("");
  const isMobile = useIsMobile();

  const isBusinessDay = (d: Date) => {
    const day = d.getDay(); // 0=dom, 6=sáb
    return day !== 0 && day !== 6;
  };

  useEffect(() => {
    if (!open) return;
    if (initialRange?.start) {
      const from = parseMaybe(initialRange.start) ?? undefined;
      const to = initialRange?.end
        ? (parseMaybe(initialRange.end) ?? undefined)
        : undefined;
      setRange({ from, to });
    } else {
      setRange({});
    }
    setTipo("");
    setMotivo("");
  }, [open, initialRange?.start, initialRange?.end]);

  const canSave =
    !!(
      range.from &&
      range.to &&
      !isNaN(range.from.getTime()) &&
      !isNaN(range.to.getTime())
    ) &&
    (tipo === "CONTRACTUAL" || tipo === "EXTRAORDINARIA") &&
    motivo.trim().length > 0;

  function toISO(d: Date) {
    // Normalizar a 00:00:00 UTC del día (sin corrimiento por zona horaria)
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    return new Date(Date.UTC(y, m, day, 0, 0, 0, 0)).toISOString();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Selecciona fechas de pausa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Define el rango en el que el alumno permanecerá en estado pausado.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTRACTUAL">Contractual</SelectItem>
                  <SelectItem value="EXTRAORDINARIA">Extraordinaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Motivo</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Escribe el motivo de la pausa"
                className="min-h-[72px]"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <Calendar
              mode="range"
              numberOfMonths={isMobile ? 1 : 2}
              selected={range as any}
              onSelect={(r: any) => setRange(r)}
              locale={es}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!canSave) return;
              onConfirm({
                start: toISO(range.from!),
                end: toISO(range.to!),
                tipo: tipo as any,
                motivo: motivo.trim(),
              });
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
