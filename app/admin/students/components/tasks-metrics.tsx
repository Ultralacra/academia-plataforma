"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer } from "lucide-react";
import GenericListModal, { type ListRow } from "./GenericListModal";
import {
  fetchMetricsTasks,
  getDefaultRange,
  type TasksApiData,
  type TasksWindowSummary,
} from "./api";

function formatDuration(avgHuman: string | null): string {
  if (!avgHuman) return "—";
  // Formato: "61d 07:26:51" -> extraer días y horas
  const match = avgHuman.match(/^(\d+)d\s+(\d+):(\d+):(\d+)$/);
  if (match) {
    const days = parseInt(match[1]);
    const hours = parseInt(match[2]);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }
  return avgHuman;
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 bg-${accent}-50/40 border-${accent}-200/70`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full grid place-items-center bg-${accent}-100 text-${accent}-700`}
          >
            {icon}
          </div>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}
    </div>
  );
}

function WindowSummaryRow({
  window,
  data,
  label,
  onClick,
}: {
  window: string;
  data: TasksWindowSummary;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      title="Ver alumnos"
    >
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          {window} días
        </Badge>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <div className="font-semibold tabular-nums">
          {data.alumnos}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            alumnos
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDuration(data.avg_human)}
        </div>
      </div>
    </button>
  );
}

export default function TasksMetrics({
  fechaDesde,
  fechaHasta,
}: {
  fechaDesde?: string;
  fechaHasta?: string;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TasksApiData | null>(null);

  const [listOpen, setListOpen] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listRows, setListRows] = useState<ListRow[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const range = getDefaultRange();
        const res = await fetchMetricsTasks({
          fechaDesde: fechaDesde ?? range.fechaDesde,
          fechaHasta: fechaHasta ?? range.fechaHasta,
        });
        if (!ignore) setData(res?.data ?? null);
      } catch (e) {
        console.error("[tasks-metrics] error", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fechaDesde, fechaHasta]);

  const tareasResumen = data?.ultimas_tareas_resumen ?? {};
  const estadosResumen = data?.estados_resumen ?? {};

  const tareasDetalle: any[] = Array.isArray(data?.ultimas_tareas_detalle)
    ? (data?.ultimas_tareas_detalle as any[])
    : [];
  const estadosDetalle: any[] = Array.isArray(data?.estados_detalle)
    ? (data?.estados_detalle as any[])
    : [];

  const windowKeys = ["7", "15", "30"];

  const toRowsFromNames = (names: any[]): ListRow[] => {
    return (Array.isArray(names) ? names : [])
      .filter(Boolean)
      .map((n) => ({ name: String(n) }));
  };

  const toRowsFromDetail = (arr: any[]): ListRow[] => {
    return (Array.isArray(arr) ? arr : []).map((r) => {
      const code = r.codigo ?? r.code ?? r.id_alumno ?? r.alumno ?? null;
      const name = r.nombre ?? r.name ?? r.alumno_nombre ?? null;
      const extras: string[] = [];
      if (r.avg_human) extras.push(String(r.avg_human));
      if (r.status_count != null) extras.push(`${Number(r.status_count)} estados`);
      if (r.task_count != null) extras.push(`${Number(r.task_count)} tareas`);
      return {
        code: code != null ? String(code) : null,
        name: name != null ? String(name) : null,
        subtitle: extras.length ? extras.join(" · ") : undefined,
      };
    });
  };

  const openWindowList = (
    kind: "tareas" | "estados",
    w: string,
    summary: any,
    detail: any[]
  ) => {
    const windowN = Number(w);
    const detailForWindow = Array.isArray(detail)
      ? detail.filter((x) => x && (x.window == null || Number(x.window) === windowN))
      : [];

    const titleBase =
      kind === "tareas"
        ? "Alumnos sin entregar tareas"
        : "Tiempo en estado actual";

    const rows =
      detailForWindow.length > 0
        ? toRowsFromDetail(detailForWindow)
        : toRowsFromNames(summary?.nombres ?? []);

    setListTitle(`${titleBase} — últimos ${w} días`);
    setListRows(rows);
    setListOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimas tareas (sin entregar) */}
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">
                Alumnos sin entregar tareas
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Tiempo promedio desde última entrega por ventana
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : Object.keys(tareasResumen).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin datos de tareas
              </p>
            ) : (
              <div className="space-y-2">
                {windowKeys.map((w) => {
                  const item = tareasResumen[w];
                  if (!item) return null;
                  return (
                    <WindowSummaryRow
                      key={w}
                      window={w}
                      data={item}
                      label="sin entregar"
                      onClick={() => openWindowList("tareas", w, item, tareasDetalle)}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estados (tiempo en estado actual) */}
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Tiempo en estado actual</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio de tiempo que llevan los alumnos en su estado
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : Object.keys(estadosResumen).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin datos de estados
              </p>
            ) : (
              <div className="space-y-2">
                {windowKeys.map((w) => {
                  const item = estadosResumen[w];
                  if (!item) return null;
                  return (
                    <WindowSummaryRow
                      key={w}
                      window={w}
                      data={item}
                      label="en estado"
                      onClick={() => openWindowList("estados", w, item, estadosDetalle)}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GenericListModal
        open={listOpen}
        onOpenChange={setListOpen}
        title={listTitle}
        rows={listRows}
        hideCode
      />
    </div>
  );
}
