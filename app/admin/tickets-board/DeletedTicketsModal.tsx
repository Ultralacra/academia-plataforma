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
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2, RefreshCw, RotateCcw, CalendarIcon } from "lucide-react";
import { getDeletedTickets, restoreTicket, type DeletedTicketItem } from "./api";
import { toast } from "@/components/ui/use-toast";

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

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function firstDayOfMonthYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default function DeletedTicketsModal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DeletedTicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState(firstDayOfMonthYMD);
  const [fechaHasta, setFechaHasta] = useState(todayYMD);
  const [informanteFiltro, setInformanteFiltro] = useState<string>("all");
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const pageSize = 25;

  const handleRestore = async (ticket: DeletedTicketItem) => {
    if (!ticket.codigo) {
      toast({ title: "Ticket sin código, no se puede restaurar" });
      return;
    }
    setRestoringId(ticket.id);
    try {
      await restoreTicket(ticket.codigo);
      setItems((prev) => prev.filter((i) => i.id !== ticket.id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast({ title: `Ticket "${ticket.nombre ?? ticket.codigo}" restaurado` });
    } catch (e) {
      console.error("[DeletedTicketsModal] restore error", e);
      toast({ title: "Error al restaurar ticket" });
    } finally {
      setRestoringId(null);
    }
  };

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [fechaDesde, fechaHasta, informanteFiltro]);

  const load = async (p: number, q: string, fd: string, fh: string) => {
    setLoading(true);
    try {
      const res = await getDeletedTickets({
        page: p,
        pageSize,
        search: q || undefined,
        fechaDesde: fd || undefined,
        fechaHasta: fh || undefined,
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
    load(page, debouncedSearch, fechaDesde, fechaHasta);
  }, [open, page, debouncedSearch, fechaDesde, fechaHasta]);

  // Informantes únicos para el filtro
  const informanteOpts = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of items) {
      const code = String(t.informante ?? "").trim();
      const name = String(t.informante_nombre ?? "").trim();
      if (code) {
        const existing = map.get(code);
        if (!existing || (name && existing !== name)) {
          map.set(code, name || code);
        }
      }
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ value: code, label: name || code }))
      .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [items]);

  // Filtro local por informante
  const filteredItems = useMemo(() => {
    if (informanteFiltro === "all") return items;
    return items.filter((t) => {
      const code = String(t.informante ?? "").trim();
      return code === informanteFiltro;
    });
  }, [items, informanteFiltro]);

  const filteredTotal = filteredItems.length;

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
          No hay tickets eliminados en el rango seleccionado.
        </div>
      );
    }
    const display = informanteFiltro === "all" ? items : filteredItems;
    if (!display.length) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
          <Trash2 className="h-8 w-8 mb-2 opacity-50" />
          No hay tickets eliminados para el informante seleccionado.
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
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {display.map((t) => (
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
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Restaurar ticket"
                    disabled={restoringId === t.id}
                    onClick={() => handleRestore(t)}
                  >
                    {restoringId === t.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }, [loading, items, filteredItems, informanteFiltro]);

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
                {informanteFiltro !== "all" ? ` · ${filteredTotal} filtrados` : ""}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-60">
            <Label className="text-xs text-muted-foreground mb-1 block">Desde</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="w-full sm:w-60">
            <Label className="text-xs text-muted-foreground mb-1 block">Hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          {informanteOpts.length > 0 && (
            <div className="w-full sm:w-52">
              <Label className="text-xs text-muted-foreground mb-1 block">Informante</Label>
              <Select value={informanteFiltro} onValueChange={setInformanteFiltro}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {informanteOpts.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="relative w-full sm:w-52">
            <Label className="text-xs text-muted-foreground mb-1 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en papelera..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(page, debouncedSearch, fechaDesde, fechaHasta)}
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
