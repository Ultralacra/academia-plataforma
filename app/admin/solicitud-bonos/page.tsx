"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Trash2 } from "lucide-react";
import * as bonosSolicitudesApi from "./api";
import * as alumnosApi from "@/app/admin/alumnos/api";

function SolicitudBonosContent() {
  const { user } = useAuth();
  const roleLower = String((user as any)?.role ?? "").toLowerCase();
  const isAdmin = roleLower === "admin";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<bonosSolicitudesApi.BonoSolicitud[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRow, setDetailRow] =
    useState<bonosSolicitudesApi.BonoSolicitud | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [bonosByCodigo, setBonosByCodigo] = useState<
    Map<string, alumnosApi.Bono>
  >(new Map());

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<bonosSolicitudesApi.BonoSolicitud | null>(null);

  const normCode = (v: unknown) =>
    String(v ?? "")
      .trim()
      .toUpperCase();

  const formatDateTime = (v: unknown) => {
    const t = Date.parse(String(v ?? ""));
    if (Number.isNaN(t)) return "";
    try {
      return new Date(t).toLocaleString();
    } catch {
      return "";
    }
  };

  const getBonoNombre = (bonoCodigo: unknown) => {
    const c = normCode(bonoCodigo);
    const b = bonosByCodigo.get(c);
    return b?.nombre ? String(b.nombre) : "";
  };

  const renderPairs = (pairs: Array<[string, unknown]>) => {
    const clean = pairs.filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    );
    if (clean.length === 0) return null;
    return (
      <div className="grid gap-2">
        {clean.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="text-sm text-right break-words max-w-[70%]">
              {typeof v === "boolean" ? (v ? "sí" : "no") : String(v)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDataSummary = (data: any) => {
    if (!data || typeof data !== "object") return null;
    const entries = Object.entries(data)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .slice(0, 6);
    if (entries.length === 0) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {entries.map(([k, v]) => {
          const label = String(k);
          const value = typeof v === "boolean" ? (v ? "sí" : "no") : String(v);
          return (
            <span
              key={label}
              className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
              title={`${label}: ${value}`}
            >
              {label}: {value}
            </span>
          );
        })}
      </div>
    );
  };

  async function loadBonosIfNeeded() {
    // Cargar lista de bonos para mapear codigo -> nombre
    if (bonosByCodigo.size > 0) return;
    try {
      const list = await alumnosApi.getAllBonos({ includeInactivos: true });
      const m = new Map<string, alumnosApi.Bono>();
      for (const b of list ?? []) {
        const c = normCode((b as any)?.codigo);
        if (c) m.set(c, b);
      }
      setBonosByCodigo(m);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudieron cargar los bonos",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await loadBonosIfNeeded();
      const res = await bonosSolicitudesApi.getBonoSolicitudes({
        page,
        pageSize,
      });
      const data = Array.isArray(res?.data) ? res.data : [];
      setRows(data);
      setTotal(Number(res?.total ?? data.length ?? 0));
      setTotalPages(Math.max(1, Number(res?.totalPages ?? 1)));
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id: number | string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailRow(null);
    try {
      await loadBonosIfNeeded();
      const res = await bonosSolicitudesApi.getBonoSolicitudById(id);
      setDetailRow((res as any)?.data ?? null);
    } catch (e: any) {
      console.error(e);
      setDetailError(e?.message ?? "Error desconocido");
    } finally {
      setDetailLoading(false);
    }
  }

  async function confirmDelete() {
    const id = (deleteTarget as any)?.id;
    if (!id && id !== 0) return;
    setDeleteLoading(true);
    try {
      await bonosSolicitudesApi.deleteBonoSolicitudById(id);
      toast({
        title: "Solicitud eliminada",
        description: "La solicitud fue eliminada correctamente.",
      });

      if (detailOpen && String((detailRow as any)?.id ?? "") === String(id)) {
        setDetailOpen(false);
        setDetailRow(null);
        setDetailError(null);
      }

      setDeleteOpen(false);
      setDeleteTarget(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudo eliminar",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const effectiveTotalPages = useMemo(
    () => Math.max(1, totalPages || 1),
    [totalPages]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitud de bonos</h1>
        <p className="text-muted-foreground">
          Listado de solicitudes registradas por los alumnos.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Página {page} de {effectiveTotalPages} — {total} registros
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">PageSize</label>
            <select
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              value={pageSize}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPage(1);
                setPageSize(Number.isFinite(n) ? n : 25);
              }}
              disabled={loading}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={loading}
            >
              {loading ? "Cargando..." : "Actualizar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="max-h-[65vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[260px]">Bono</TableHead>
                <TableHead className="min-w-[200px]">Alumno</TableHead>
                <TableHead className="w-[140px]">Estado</TableHead>
                <TableHead className="min-w-[170px]">Creado</TableHead>
                <TableHead className="w-[110px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={5}>
                      <div className="h-6 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-red-600">
                    {error}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-sm text-muted-foreground"
                  >
                    No hay solicitudes.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const bonoCodigo = normCode((r as any)?.bono_codigo);
                  const bonoNombre = getBonoNombre(bonoCodigo);
                  const created = formatDateTime((r as any)?.created_at);
                  const estado = String((r as any)?.estado ?? "").trim();

                  const alumnoNombre = (r as any)?.alumno_nombre;
                  const alumnoFase = (r as any)?.alumno_fase;

                  return (
                    <TableRow key={String((r as any)?.id ?? bonoCodigo)}>
                      <TableCell>
                        <div className="min-w-0">
                          {bonoNombre ? (
                            <div
                              className="truncate font-medium"
                              title={bonoNombre}
                            >
                              {bonoNombre}
                            </div>
                          ) : null}
                          <div className="truncate text-xs text-muted-foreground font-mono">
                            {bonoCodigo}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-0">
                          {alumnoNombre ? (
                            <div
                              className="truncate font-medium"
                              title={String(alumnoNombre)}
                            >
                              {String(alumnoNombre)}
                            </div>
                          ) : null}

                          {alumnoFase ? (
                            <div className="mt-1">
                              <Badge variant="muted" className="font-mono">
                                {String(alumnoFase)}
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        {estado ? (
                          <Badge variant="secondary" className="capitalize">
                            {estado}
                          </Badge>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {created}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetail((r as any)?.id)}
                            disabled={loading}
                            title="Ver"
                            aria-label="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {isAdmin ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={loading}
                              title="Eliminar"
                              aria-label="Eliminar"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteTarget(r);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) {
            setDeleteTarget(null);
            setDeleteLoading(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina la solicitud y no se puede deshacer.
              {(deleteTarget as any)?.alumno_nombre ||
              (deleteTarget as any)?.student_code ||
              (deleteTarget as any)?.bono_codigo ? (
                <span className="block mt-2">
                  {(deleteTarget as any)?.alumno_nombre ? (
                    <span className="block">
                      Alumno: {String((deleteTarget as any)?.alumno_nombre)}
                    </span>
                  ) : null}
                  {(deleteTarget as any)?.student_code ? (
                    <span className="block">
                      Código alumno:{" "}
                      <span className="font-mono">
                        {String((deleteTarget as any)?.student_code)}
                      </span>
                    </span>
                  ) : null}
                  {(deleteTarget as any)?.bono_codigo ? (
                    <span className="block">
                      Bono:{" "}
                      <span className="font-mono">
                        {String((deleteTarget as any)?.bono_codigo)}
                      </span>
                    </span>
                  ) : null}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (!deleteLoading) confirmDelete();
              }}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) {
            setDetailError(null);
            setDetailRow(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalle de solicitud</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : detailError ? (
            <div className="text-sm text-red-600">{detailError}</div>
          ) : !detailRow ? (
            <div className="text-sm text-muted-foreground">
              No se pudo cargar el detalle.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3">
                {(() => {
                  const codigo = normCode((detailRow as any)?.bono_codigo);
                  const nombre = getBonoNombre(codigo);
                  return (
                    <div className="space-y-1">
                      {nombre ? (
                        <div className="font-medium">{nombre}</div>
                      ) : null}
                      <div className="text-xs text-muted-foreground font-mono">
                        {codigo}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {renderPairs([
                ["Alumno", (detailRow as any)?.student_code],
                ["Nombre alumno", (detailRow as any)?.alumno_nombre],
                ["Fase alumno", (detailRow as any)?.alumno_fase],
                ["Estado", (detailRow as any)?.estado],
                ["Nombre solicitante", (detailRow as any)?.nombre_solicitante],
                ["Correo entrega", (detailRow as any)?.correo_entrega],
                ["Descripción", (detailRow as any)?.descripcion],
                ["Creado", formatDateTime((detailRow as any)?.created_at)],
                ["Actualizado", formatDateTime((detailRow as any)?.updated_at)],
              ])}

              {(detailRow as any)?.data ? (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Data
                  </div>
                  {renderDataSummary((detailRow as any)?.data)}
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Página {page} de {effectiveTotalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= effectiveTotalPages}
            onClick={() => setPage((p) => Math.min(effectiveTotalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SolicitudBonosPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <SolicitudBonosContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
