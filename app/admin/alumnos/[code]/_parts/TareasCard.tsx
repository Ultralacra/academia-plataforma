"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { fmtES } from "./detail-utils";

type ObservacionPayload = {
  fecha: string;
  recomendacion: string;
  area: string;
  estado?: boolean; // legacy
  realizada?: boolean;
  constancia?: string;
  constancia_texto?: string;
  creado_por_id?: string;
  creado_por_nombre?: string;
  alumno_id: string;
  alumno_nombre?: string;
  ticket_codigo: string;
  deleted?: boolean;
};

type ObservacionRecord = {
  id: number;
  entity?: string | null;
  entity_id?: string | null;
  payload: ObservacionPayload;
  created_at?: string;
  updated_at?: string;
};

function isTaskLike(x: any): x is ObservacionRecord {
  if (!x || typeof x !== "object") return false;
  const p = (x as any).payload;
  if (!p || typeof p !== "object") return false;
  // Heurística: las "tareas" del modal de tickets siempre traen recomendacion+area+ticket_codigo+alumno_id
  if (!p.recomendacion || !p.area || !p.ticket_codigo || !p.alumno_id)
    return false;
  if (p.deleted === true) return false;
  return true;
}

function parseConstanciaUrls(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (parsed && typeof parsed === "object") {
      const files = (parsed as any).files;
      if (Array.isArray(files)) return files.map(String).filter(Boolean);
    }
  } catch {
    // ignore
  }
  return [];
}

type StatusFilter = "todas" | "pendientes" | "resueltas";

export default function TareasCard({
  alumnoId,
  canEdit = false,
}: {
  alumnoId: string;
  canEdit?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ObservacionRecord[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Preferimos filtrar del lado del backend.
        // El endpoint ya soporta filtros por query (en tickets usa ticket_codigo y alumno_id).
        const res = await apiFetch<any>(
          `/metadata?alumno_id=${encodeURIComponent(String(alumnoId))}`,
        );
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        const mapped: ObservacionRecord[] = (list as unknown[])
          .filter(isTaskLike)
          .filter(
            (r: ObservacionRecord) =>
              String(r.payload.alumno_id) === String(alumnoId),
          )
          .sort((a: ObservacionRecord, b: ObservacionRecord) => {
            const at = Date.parse(a.payload.fecha || a.created_at || "");
            const bt = Date.parse(b.payload.fecha || b.created_at || "");
            return (
              (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0)
            );
          });

        if (!alive) return;
        setItems(mapped);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [alumnoId]);

  const filtered = useMemo(() => {
    if (filter === "todas") return items;
    if (filter === "resueltas")
      return items.filter((x) =>
        Boolean(x.payload.realizada ?? x.payload.estado),
      );
    return items.filter(
      (x) => !Boolean(x.payload.realizada ?? x.payload.estado),
    );
  }, [items, filter]);

  const totalPendientes = useMemo(
    () =>
      items.filter((x) => !Boolean(x.payload.realizada ?? x.payload.estado))
        .length,
    [items],
  );

  async function toggleRealizada(row: ObservacionRecord, next: boolean) {
    if (!canEdit) return;
    try {
      setSavingId(row.id);
      // IMPORTANTE: para evitar que el backend "pierda" campos por updates parciales,
      // reenviamos todo el payload actual.
      const payload = {
        ...row.payload,
        realizada: next,
        // mantener compat con legacy
        estado: Boolean(next),
        deleted: row.payload.deleted ?? false,
      };
      await apiFetch<any>(`/metadata/${encodeURIComponent(String(row.id))}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setItems((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, payload } : x)),
      );
    } catch (e) {
      console.error(e);
      toast({
        title: "No se pudo actualizar la tarea",
        description: "Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">Tareas</CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Total: {items.length}</span>
            <span>·</span>
            <span>Pendientes: {totalPendientes}</span>
            {filter !== "todas" ? (
              <>
                <span>·</span>
                <span>Mostrando: {filtered.length}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={filter === "todas" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("todas")}
          >
            Todas
          </Button>
          <Button
            type="button"
            variant={filter === "pendientes" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pendientes")}
          >
            Pendientes
          </Button>
          <Button
            type="button"
            variant={filter === "resueltas" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("resueltas")}
          >
            Resueltas
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">
            Cargando tareas…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">
            No hay tareas para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-left font-medium">Estado</th>
                  <th className="px-2 py-2 text-left font-medium">Área</th>
                  <th className="px-2 py-2 text-left font-medium">Tarea</th>
                  <th className="px-2 py-2 text-left font-medium">Fecha</th>
                  <th className="px-2 py-2 text-left font-medium">Evidencia</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const done = Boolean(
                    row.payload.realizada ?? row.payload.estado,
                  );
                  const urls = parseConstanciaUrls(row.payload.constancia);
                  const fecha = row.payload.fecha || row.created_at || "";
                  const disabled = !canEdit || savingId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-border/60 hover:bg-muted/40 ${
                        done ? "bg-emerald-50/70 dark:bg-emerald-500/10" : ""
                      }`}
                    >
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              done
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : ""
                            }
                          >
                            {done ? "Resuelta" : "Pendiente"}
                          </Badge>
                          <Switch
                            checked={done}
                            onCheckedChange={(next) =>
                              toggleRealizada(row, next)
                            }
                            disabled={disabled}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <Badge variant="outline">{row.payload.area}</Badge>
                      </td>
                      <td className="px-2 py-2 min-w-[320px]">
                        <div
                          className={
                            done
                              ? "font-medium text-emerald-700 dark:text-emerald-300"
                              : "font-medium text-foreground"
                          }
                        >
                          {row.payload.recomendacion}
                        </div>
                        {row.payload.constancia_texto ? (
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {row.payload.constancia_texto}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                        {fecha ? fmtES(fecha as any) : "—"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {urls.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {urls.length} archivo(s)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
