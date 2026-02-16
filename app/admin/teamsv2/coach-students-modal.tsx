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
import Link from "next/link";
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
    coachCode,
  )}`;
  const json = await apiFetch<{ code: number; status: string; data: any[] }>(
    path,
    { signal },
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
  const [existingStudentMap, setExistingStudentMap] = useState<
    Map<string, string | number>
  >(new Map());
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Escuchar evento global con alumnos que ya tienen conversación
  useEffect(() => {
    const handler = (ev: any) => {
      try {
        const arr: any[] = Array.isArray(ev?.detail?.students)
          ? ev.detail.students
          : [];
        const m = new Map<string, string | number>();
        for (const it of arr) {
          try {
            const id = String(it?.id ?? "");
            const cid =
              it?.chatId ?? it?.chat_id ?? it?.chatid ?? it?.id_chat ?? null;
            if (id) m.set(id, cid ?? "");
          } catch {}
        }
        setExistingStudentMap(m);
      } catch {
        setExistingStudentMap(new Map());
      }
    };
    window.addEventListener("chat:existing-students", handler as EventListener);
    // Fallback: si ya existe un valor global publicado previamente, úsalo ahora
    try {
      const globalArr = (window as any).__chat_existing_students;
      if (Array.isArray(globalArr)) {
        const m2 = new Map<string, string | number>();
        for (const it of globalArr) {
          try {
            const id = String(it?.id ?? "");
            const cid =
              it?.chatId ?? it?.chat_id ?? it?.chatid ?? it?.id_chat ?? null;
            if (id) m2.set(id, cid ?? "");
          } catch {}
        }
        if (m2.size > 0) setExistingStudentMap(m2);
      }
    } catch {}

    return () =>
      window.removeEventListener(
        "chat:existing-students",
        handler as EventListener,
      );
  }, []);

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
    const base = term
      ? items.filter((it) => {
          const a = (it.id_alumno ?? "").toLowerCase();
          const n = (it.alumno_nombre ?? "").toLowerCase();
          return a.includes(term) || n.includes(term);
        })
      : items;
    // No excluir; en su lugar mostraremos la opción de abrir conversación existente
    return base;
  }, [items, q]);

  function exportCsv() {
    const header = ["id", "nombre"];
    const body = filtered.map((r) => [
      r.id_alumno,
      `"${(r.alumno_nombre ?? "").replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(","), ...body.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-${coachCode ?? "coach"}.csv`;
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
      {/* Modal de alumnos del coach */}
      <DialogContent
        className="
          w-[95vw] sm:max-w-4xl p-0 gap-0 rounded-2xl border border-border/40
          max-h-[85vh] overflow-y-auto shadow-2xl
        "
      >
        {/* HEADER (sticky) */}
        <DialogHeader className="sticky top-0 z-20 border-b border-border/30 bg-background/80 backdrop-blur-sm px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-xl bg-muted/50 border border-border/30 text-foreground font-bold shadow-sm">
              {(coachName ?? coachCode ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-bold">
                {coachName ?? "Coach"}
              </DialogTitle>
              <DialogDescription className="truncate text-sm text-muted-foreground">
                Código: <span className="font-mono text-xs">{coachCode}</span>
              </DialogDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-lg bg-muted/60 text-foreground font-semibold"
              >
                {count} / {total}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl hidden sm:inline-flex"
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
                        setError(e?.message ?? "Error"),
                    )
                    .finally(() => setLoading(false));
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refrescar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl hidden sm:inline-flex"
                onClick={exportCsv}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl hidden sm:inline-flex"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre…"
                className="pl-9 rounded-xl border-border/60 bg-background/80 backdrop-blur-sm shadow-sm"
              />
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        </DialogHeader>

        {/* BODY scrollable */}
        <div className="px-5 pb-4">
          <div className="rounded-xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/20">
                    <TableHead className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Nombre
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 12 }).map((_, i) => (
                      <TableRow
                        key={`sk-${i}`}
                        className="border-b border-border/10"
                      >
                        <TableCell colSpan={1} className="px-4 py-2.5">
                          <div className="h-5 animate-pulse rounded-lg bg-muted/40" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow className="border-b border-border/10">
                      <TableCell
                        colSpan={1}
                        className="px-4 py-3 text-sm text-muted-foreground"
                      >
                        {q
                          ? "Sin resultados para tu búsqueda."
                          : "No hay registros asociados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r, idx) => {
                      const studentId = String(r.id_alumno ?? "");
                      const existing = existingStudentMap.get(studentId);
                      return (
                        <TableRow
                          key={`${r.id}_${r.id_alumno}`}
                          className="border-b border-border/10 hover:bg-muted/20 transition-colors duration-100"
                        >
                          <TableCell className="px-4 py-2.5 text-foreground">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex items-center gap-2.5">
                                <div className="h-8 w-8 grid place-items-center rounded-lg bg-muted/40 border border-border/20 shrink-0">
                                  <span className="text-xs font-semibold text-foreground/60">
                                    {(r.alumno_nombre ?? "?")
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </span>
                                </div>
                                {r.id_alumno ? (
                                  <Link
                                    href={`/admin/alumnos/${encodeURIComponent(
                                      String(r.id_alumno),
                                    )}`}
                                    className="text-foreground hover:underline truncate font-medium"
                                  >
                                    {r.alumno_nombre}
                                  </Link>
                                ) : (
                                  <span className="truncate">
                                    {r.alumno_nombre}
                                  </span>
                                )}
                              </div>
                              {existing ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant="secondary"
                                    className="rounded-lg bg-yellow-100/80 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200 text-[10px] font-semibold"
                                  >
                                    Conversación existente
                                  </Badge>
                                  <Button
                                    size="sm"
                                    className="rounded-xl shadow-sm h-7 text-xs"
                                    onClick={() => {
                                      try {
                                        window.dispatchEvent(
                                          new CustomEvent("chat:open", {
                                            detail: { chatId: existing },
                                          }),
                                        );
                                      } catch {}
                                      onOpenChange(false);
                                    }}
                                  >
                                    Abrir
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Mostrando{" "}
              <span className="font-semibold text-foreground">{count}</span> de{" "}
              <span className="font-semibold text-foreground">{total}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
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
