// components/teams/coach-students-modal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, RefreshCw, Clipboard } from "lucide-react";

type CoachStudentsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Código del coach (ej: mQ2dwRX3xMzV99e3nh9eb) */
  coachCode: string | null | undefined;
  /** Nombre del coach (solo para encabezado) */
  coachName?: string | null;
};

type CoachStudent = {
  id: number;
  id_relacion: string;
  id_coach: string;
  id_alumno: string;
  alumno_nombre: string;
  coach_nombre?: string;
  puesto?: string | null;
  area?: string | null;
  updated_at?: string;
  created_at?: string;
};

async function fetchCoachStudents(coachCode: string, signal?: AbortSignal) {
  const path = `/client/get/clients-coaches?coach=${encodeURIComponent(
    coachCode
  )}`;
  const json = await apiFetch<{ code: number; status: string; data: any[] }>(
    path,
    { signal }
  );
  const rows = (json?.data ?? []) as any[];
  const items: CoachStudent[] = rows.map((r) => ({
    id: r.id,
    id_relacion: r.id_relacion,
    id_coach: r.id_coach,
    id_alumno: r.id_alumno,
    alumno_nombre: r.alumno_nombre,
    coach_nombre: r.coach_nombre,
    puesto: r.puesto ?? null,
    area: r.area ?? null,
    updated_at: r.updated_at,
    created_at: r.created_at,
  }));
  return items;
}

export function CoachStudentsModal({
  open,
  onOpenChange,
  coachCode,
  coachName,
}: CoachStudentsModalProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CoachStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Cargar al abrir (y cuando cambie coachCode)
  useEffect(() => {
    if (!open || !coachCode) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCoachStudents(coachCode, ctrl.signal);
        setItems(data);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message ?? "Error al cargar alumnos del coach");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [open, coachCode]);

  // Filtro local por id_alumno o alumno_nombre
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => {
      const a = (it.id_alumno ?? "").toLowerCase();
      const n = (it.alumno_nombre ?? "").toLowerCase();
      return a.includes(term) || n.includes(term);
    });
  }, [items, q]);

  function exportCsv() {
    const header = ["id_alumno", "alumno_nombre"];
    const body = filtered.map((r) => [
      r.id_alumno,
      `"${(r.alumno_nombre ?? "").replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(","), ...body.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alumnos-${coachCode ?? "coach"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyIds() {
    const ids = filtered.map((r) => r.id_alumno).join("\n");
    await navigator.clipboard.writeText(ids);
  }

  const total = items.length;
  const count = filtered.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Notion-like: ancho cómodo, alto limitado, contenido con bordes suaves y header sticky */}
      <DialogContent
        className="
          w-[95vw] sm:max-w-4xl p-0 gap-0 rounded-2xl border border-gray-200
          max-h-[85vh] overflow-y-auto
        "
      >
        {/* HEADER (sticky) */}
        <DialogHeader className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-lg bg-neutral-100 text-neutral-700 font-semibold">
              {(coachName ?? coachCode ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate">
                Alumnos de {coachName ?? "Coach"}
              </DialogTitle>
              <DialogDescription className="truncate">
                Código: <span className="font-mono">{coachCode}</span>
              </DialogDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-neutral-100 text-neutral-800"
              >
                {count} / {total}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!coachCode) return;
                  setQ("");
                  const ctrl = new AbortController();
                  setLoading(true);
                  fetchCoachStudents(coachCode, ctrl.signal)
                    .then(setItems)
                    .catch(
                      (e) =>
                        e?.name !== "AbortError" &&
                        setError(e?.message ?? "Error")
                    )
                    .finally(() => setLoading(false));
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refrescar
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyIds}
                title="Copiar IDs"
              >
                <Clipboard className="mr-2 h-4 w-4" />
                IDs
              </Button>
            </div>
          </div>

          {/* BUSCADOR */}
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por ID de alumno o nombre…"
                className="pl-8 rounded-xl bg-white border border-gray-200 shadow-none"
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </DialogHeader>

        {/* BODY scrollable */}
        <div className="px-5 pb-4">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide sticky top-0 z-10">
                    <TableHead className="px-3 py-2 text-left font-medium w-[40%]">
                      ID Alumno
                    </TableHead>
                    <TableHead className="px-3 py-2 text-left font-medium">
                      Nombre del alumno
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 12 }).map((_, i) => (
                      <TableRow
                        key={`sk-${i}`}
                        className="border-t border-gray-100"
                      >
                        <TableCell colSpan={2} className="px-3 py-2">
                          <div className="h-5 animate-pulse rounded bg-neutral-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow className="border-t border-gray-100">
                      <TableCell
                        colSpan={2}
                        className="px-3 py-2 text-sm text-neutral-500"
                      >
                        {q
                          ? "Sin resultados para tu búsqueda."
                          : "No hay alumnos asociados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r, idx) => (
                      <TableRow
                        key={`${r.id}_${r.id_alumno}`}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <TableCell className="px-3 py-2 font-mono text-gray-700">
                          {r.id_alumno}
                        </TableCell>
                        <TableCell className="px-3 py-2 truncate text-gray-900">
                          {r.alumno_nombre}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* FOOTER (ligero) */}
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Mostrando <b>{count}</b> de <b>{total}</b> alumnos
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
