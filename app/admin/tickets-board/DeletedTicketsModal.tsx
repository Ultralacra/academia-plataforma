"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/ui/spinner";
import { Search, Trash2, RefreshCw } from "lucide-react";
import { getDeletedTickets, type DeletedTicketItem } from "./api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const t = Date.parse(String(iso));
  if (Number.isNaN(t)) return String(iso);
  return new Date(t).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DeletedTicketsModal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DeletedTicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 25;

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await getDeletedTickets({
        page: p,
        pageSize,
        search: q || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error("[DeletedTicketsModal] error", e);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load(page, debouncedSearch);
  }, [open, page, debouncedSearch]);

  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Spinner className="h-6 w-6 mr-2" /> Cargando papelera...
        </div>
      );
    }
    if (!items.length) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
          <Trash2 className="h-8 w-8 mb-2 opacity-50" />
          No hay tickets eliminados.
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asunto</TableHead>
              <TableHead>Alumno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Informante</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Eliminado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="max-w-[240px]">
                  <div
                    className="font-medium text-sm truncate"
                    title={t.nombre ?? ""}
                  >
                    {t.nombre ?? "—"}
                  </div>
                  {t.codigo ? (
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t.codigo}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">
                  {t.alumno_nombre ?? "—"}
                </TableCell>
                <TableCell>
                  {t.tipo ? (
                    <Badge variant="outline" className="text-xs">
                      {t.tipo}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {t.informante_nombre ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(t.created_at)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(t.deleted_at ?? t.ultimo_estado?.fecha ?? null)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }, [loading, items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Papelera de tickets
          </DialogTitle>
          <DialogDescription>
            Listado de tickets eliminados.{" "}
            {total > 0 ? (
              <span className="tabular-nums">
                {total} registro{total === 1 ? "" : "s"}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en papelera..."
              className="pl-8 h-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(page, debouncedSearch)}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
        </div>

        {body}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
