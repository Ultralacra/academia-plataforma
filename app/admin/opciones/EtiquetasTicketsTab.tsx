"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getEtiquetasTickets, type EtiquetaTicket } from "./api";

export default function EtiquetasTicketsTab() {
  const [items, setItems] = useState<EtiquetaTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await getEtiquetasTickets(page, pageSize);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setItems(rows);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar etiquetas");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter((it) =>
      Object.values(it).some(
        (v) => typeof v === "string" && v.toLowerCase().includes(k),
      ),
    );
  }, [items, q]);

  // Detect column keys dynamically from the first items
  const columns = useMemo(() => {
    if (items.length === 0) return ["id", "nombre", "color"];
    const keys = new Set<string>();
    items.forEach((it) => {
      Object.keys(it).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [items]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-50 text-rose-700 ring-1 ring-rose-200">
            Etiquetas tickets
          </span>
          <span className="hidden sm:inline text-neutral-500">
            Gestión de etiquetas de tickets
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 w-64"
              placeholder="Buscar..."
            />
          </div>
          <div className="text-sm text-neutral-500">
            Total: <Badge>{total}</Badge>
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-gray-50/80 backdrop-blur text-gray-600 text-xs uppercase tracking-wide">
              {columns.map((col) => (
                <TableHead key={col} className="px-3 py-2 text-left">
                  {col.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="animate-pulse">
                  {columns.map((col) => (
                    <TableCell key={col} className="px-3 py-3">
                      <div className="h-4 w-24 rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="px-3 py-4 text-sm text-neutral-500"
                >
                  No hay etiquetas registradas.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((it, idx) => (
                <TableRow
                  key={it.id ?? it.codigo ?? idx}
                  className="border-t border-gray-100 hover:bg-blue-50/40"
                >
                  {columns.map((col) => (
                    <TableCell key={col} className="px-3 py-2 truncate">
                      {col === "color" && typeof it[col] === "string" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-3 w-3 rounded-full border"
                            style={{ backgroundColor: it[col] as string }}
                          />
                          {it[col] as string}
                        </span>
                      ) : (
                        String(it[col] ?? "—")
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-neutral-600">
            Página {page} de {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
