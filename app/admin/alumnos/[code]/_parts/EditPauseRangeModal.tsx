"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function asDateOnly(v?: string | null) {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
}

export default function EditPauseRangeModal({
  open,
  onOpenChange,
  initialRange,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialRange: { start: string; end: string } | null;
  saving?: boolean;
  onConfirm: (body: { fecha_desde: string; fecha_hasta: string }) => void;
}) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setFrom(asDateOnly(initialRange?.start ?? ""));
    setTo(asDateOnly(initialRange?.end ?? ""));
  }, [open, initialRange?.start, initialRange?.end]);

  const canSave = useMemo(() => {
    if (!from || !to) return false;
    const a = new Date(`${from}T00:00:00`);
    const b = new Date(`${to}T00:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
    return a.getTime() <= b.getTime();
  }, [from, to]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar pausa</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={!!saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!canSave) return;
              onConfirm({ fecha_desde: from, fecha_hasta: to });
            }}
            disabled={!canSave || !!saving}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
