"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type NoTaskRow = {
  code: string;
  name: string;
  lastActivity: string | null;
  stage: string | null;
  state: string | null;
  tickets: number;
  inactivityDays: number | null;
};

const fmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : fmt.format(d).replaceAll(".", "");
}

function StateBadge({ state }: { state: string | null }) {
  const s = (state ?? "").toUpperCase();
  if (!s) return <Badge variant="outline">—</Badge>;
  if (s.includes("ACTIVO"))
    return <Badge className="bg-emerald-100 text-emerald-800">ACTIVO</Badge>;
  if (s.includes("PAUSA") || s.includes("INACTIVO POR PAGO"))
    return <Badge className="bg-amber-100 text-amber-800">PAUSA</Badge>;
  if (s.includes("INACTIVO"))
    return <Badge className="bg-rose-100 text-rose-800">INACTIVO</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export default function NoTasksListModal({
  open,
  onOpenChange,
  title,
  rows,
  referenceISO,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  rows: NoTaskRow[];
  referenceISO: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Referencia: <strong>{fmtDate(referenceISO)}</strong> · {rows.length}{" "}
            alumno
            {rows.length === 1 ? "" : "s"}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[88px]">Código</TableHead>
                <TableHead className="min-w-[220px]">Nombre</TableHead>
                <TableHead className="min-w-[90px]">Estado</TableHead>
                <TableHead className="min-w-[70px]">Etapa</TableHead>
                <TableHead className="min-w-[140px]">Últ. entrega</TableHead>
                <TableHead
                  className="min-w-[80px]"
                  style={{ textAlign: "right" }}
                >
                  Inactividad (d)
                </TableHead>
                <TableHead
                  className="min-w-[70px]"
                  style={{ textAlign: "right" }}
                >
                  Tickets
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow
                  key={`${r.code}-${i}`}
                  className={i % 2 ? "bg-muted/30" : ""}
                >
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    <StateBadge state={r.state} />
                  </TableCell>
                  <TableCell>{r.stage ?? "—"}</TableCell>
                  <TableCell>{fmtDate(r.lastActivity)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.inactivityDays ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.tickets}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No hay alumnos en este criterio.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
