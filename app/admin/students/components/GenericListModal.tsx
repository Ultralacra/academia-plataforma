"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ListRow = {
  code?: string | null;
  name?: string | null;
  subtitle?: string;
};

export default function GenericListModal({
  open,
  onOpenChange,
  title,
  rows,
  hideCode = false,
  hideDetail = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  rows: ListRow[];
  hideCode?: boolean;
  hideDetail?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {rows.length} registro{rows.length === 1 ? "" : "s"}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          <Table>
            <TableHeader>
              <TableRow>
                {!hideCode && (
                  <TableHead className="min-w-[90px]">Código</TableHead>
                )}
                <TableHead className="min-w-[220px]">Nombre</TableHead>
                {!hideDetail && (
                  <TableHead className="min-w-[220px]">Detalle</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow
                  key={`${r.code}-${i}`}
                  className={i % 2 ? "bg-muted/30" : ""}
                >
                  {!hideCode && (
                    <TableCell className="font-mono text-xs">
                      {r.code ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-normal break-words">
                    {r.name ?? "—"}
                  </TableCell>
                  {!hideDetail && (
                    <TableCell className="text-muted-foreground whitespace-normal break-words">
                      {r.subtitle ?? "—"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={(hideCode ? 0 : 1) + 1 + (hideDetail ? 0 : 1)}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No hay registros para mostrar.
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
