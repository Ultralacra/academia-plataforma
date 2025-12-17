"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { List } from "lucide-react";
import type { LifecycleItem } from "./phase-faker";
import type { ClientItem } from "@/lib/data-service";
import {
  fetchNoTasksMetricsV2,
  type NoTasksDetailItem,
  type NoTasksSummary,
} from "./api";

/* ---------------- fecha utils ---------------- */
function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function firstDayOfMonthISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function parseMaybe(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDateES(iso?: string | null) {
  if (!iso) return "—";
  const d = parseMaybe(iso);
  if (!d) return "—";
  return d
    .toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
}
function diffDays(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/* ------------ presets / modo rango ----------- */
type Preset = "7d" | "14d" | "1m" | "3m" | "range";
const PRESETS: Array<{ key: Preset; label: string; days?: number }> = [
  { key: "7d", label: "7 días", days: 7 },
  { key: "14d", label: "2 semanas", days: 14 },
  { key: "1m", label: "1 mes", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "range", label: "Rango" },
];

export default function NoTasksKPIs({
  items,
  students = [], // <-- DEFAULT, evita crash
  toDateISO,
  onOpenList,
}: {
  items: LifecycleItem[];
  students?: ClientItem[];
  /**
   * Fecha de corte (YYYY-MM-DD). Si se provee, se usa como "hoy" para el cálculo.
   * Útil para frases como: "Considera alumnos cuya última entrega es anterior a 26 oct 2025".
   */
  toDateISO?: string;
  onOpenList: (
    title: string,
    rows: Array<{
      code?: string | null;
      name?: string | null;
      subtitle?: string;
    }>
  ) => void;
}) {
  const [tab, setTab] = useState<Preset>("1m");

  // para rango
  const today = useMemo(() => {
    if (toDateISO) return new Date(toDateISO);
    return new Date(isoDay(new Date()));
  }, [toDateISO]);
  const [from, setFrom] = useState<string>(
    isoDay(new Date(today.getTime() - 30 * 86400000))
  );
  const [to, setTo] = useState<string>(isoDay(today));

  /* ====== Carga desde API metrics v2 (no tasks) ====== */
  const [apiDetail, setApiDetail] = useState<NoTasksDetailItem[] | null>(null);
  const [apiSummary, setApiSummary] = useState<NoTasksSummary | null>(null);
  const [loadingApi, setLoadingApi] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Rango: primer día del mes (según "today") hasta "today"
    // Esto evita rangos inválidos cuando toDateISO es de un mes/año distinto.
    const fechaDesde = firstDayOfMonthISO(today);
    const fechaHasta = isoDay(today);
    let ignore = false;
    (async () => {
      setLoadingApi(true);
      setApiError(null);
      try {
        const { detail, summary } = await fetchNoTasksMetricsV2({
          fechaDesde,
          fechaHasta,
        });
        if (!ignore) {
          setApiDetail(detail);
          setApiSummary(summary);
        }
      } catch (e: any) {
        if (!ignore) setApiError(e?.message || "Error al cargar métricas");
      } finally {
        if (!ignore) setLoadingApi(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [today]);

  /** map rápido por código del alumno (para fallback de lastActivity) */
  const studentByCode = useMemo(() => {
    const m: Record<string, ClientItem> = {};
    (students ?? []).forEach((s) => {
      if (s.code) m[s.code] = s;
    });
    return m;
  }, [students]);

  /** determina la "última entrega" conocida del alumno, priorizando dato real */
  function lastTaskFor(it: LifecycleItem): Date | null {
    if (it.code && studentByCode[it.code]?.lastActivity) {
      const d = parseMaybe(studentByCode[it.code].lastActivity);
      if (d) return d; // dato real del API
    }
    const pref = parseMaybe(it.lastTaskAt);
    if (pref) return pref; // fallback sintético si no hay real
    return null;
  }

  /** días de inactividad hasta 'to' */
  function daysSinceLast(it: LifecycleItem, toISO: string) {
    const last = lastTaskFor(it);
    const toD = parseMaybe(toISO);
    if (!last || !toD) return null;
    return diffDays(last, toD);
  }

  /** cálculo principal (usa API si está disponible, si no, fallback a lifecycle) */
  const view = useMemo(() => {
    // minDays: umbral de “sin tareas desde …”
    let minDays = 30;
    let toISO = isoDay(today);
    if (tab === "range") {
      // interpretamos el rango como ventana de observación:
      // minDays = diferencia entre from y to (ej. 30 días)
      // y contamos alumnos cuya última entrega fue <= from
      const f = parseMaybe(from);
      const t = parseMaybe(to);
      if (f && t && f <= t) {
        minDays = diffDays(f, t);
        toISO = isoDay(t);
      }
    } else {
      const preset = PRESETS.find((p) => p.key === tab)!;
      minDays = preset.days ?? 30;
      toISO = isoDay(today);
    }

    // Preferir datos del API si están presentes
    if (apiDetail && apiSummary) {
      // Mapear preset → clave de summary (7,15,30,90)
      const tabKey =
        tab === "7d"
          ? "7"
          : tab === "14d"
          ? "15"
          : tab === "1m"
          ? "30"
          : tab === "3m"
          ? "90"
          : String(minDays);

      // conteo desde summary si existe la clave exacta
      const summaryHit = apiSummary[tabKey];
      const countFromSummary = summaryHit?.alumnos ?? null;

      // lista derivada de detail con filtro por umbral (avg_seconds >= minDays)
      const minSeconds = minDays * 86400;
      const filtered = apiDetail
        .filter((r) => (r.avg_seconds ?? 0) >= minSeconds)
        .sort((a, b) => (b.avg_seconds ?? 0) - (a.avg_seconds ?? 0));

      const count =
        countFromSummary != null ? Number(countFromSummary) : filtered.length;

      return {
        minDays,
        toISO,
        count,
        listRows: filtered.slice(0, 2000).map((r) => ({
          code: r.codigo,
          name: r.nombre,
          subtitle: r.avg_human
            ? `${r.avg_human} · ${r.task_count ?? 0} tareas`
            : `${Math.round((r.avg_seconds ?? 0) / 86400)} días · ${
                r.task_count ?? 0
              } tareas`,
        })),
      } as const;
    }

    // Fallback: lifecycle sintético
    const rows = (items ?? []).map((it) => {
      const d = daysSinceLast(it, toISO);
      return { it, days: d ?? -1 };
    });

    const matched = rows
      .filter((r) => r.days >= minDays)
      .sort((a, b) => b.days - a.days);

    const count = matched.length;

    return {
      minDays,
      toISO,
      count,
      listRows: matched.slice(0, 2000).map(({ it, days }) => ({
        code: it.code ?? undefined,
        name: it.name ?? undefined,
        subtitle:
          (it.lastTaskAt
            ? `Últ. entrega: ${fmtDateES(it.lastTaskAt)} · `
            : "") + (days >= 0 ? `${days} días` : "sin dato"),
      })),
    } as const;
  }, [
    items,
    tab,
    from,
    to,
    today,
    students,
    studentByCode,
    apiDetail,
    apiSummary,
  ]);

  const title = "Sin enviar tareas (última entrega)";
  const rightNowText =
    tab === "range"
      ? `Considera alumnos cuya última entrega es anterior a ${fmtDateES(
          from
        )}.`
      : `Considera alumnos cuya última entrega es anterior a ${fmtDateES(
          isoDay(today)
        )}.`;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>

          {/* Tabs de rango */}
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                variant={tab === p.key ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setTab(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {rightNowText}
          {loadingApi && <span className="ml-2">(cargando…)</span>}
          {apiError && <span className="ml-2 text-red-600">({apiError})</span>}
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {loadingApi ? (
          <div className="rounded-lg border bg-muted/40 p-4 animate-pulse">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="mt-3 h-8 w-24 bg-muted rounded" />
            <div className="mt-2 h-3 w-64 bg-muted rounded" />
          </div>
        ) : (
          <>
            {/* Controles de RANGO (tipo “desde / hasta”) */}
            {tab === "range" && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="text-xs text-muted-foreground">Desde</div>
                <input
                  type="date"
                  className="h-8 rounded-md border px-2 text-sm"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">Hasta</div>
                <input
                  type="date"
                  className="h-8 rounded-md border px-2 text-sm"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            )}

            {/* KPI principal */}
            <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  ≥ {view.minDays} días
                </div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {view.count}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Umbral de inactividad: {view.minDays} días · Desde{" "}
                  {fmtDateES(
                    isoDay(
                      new Date(
                        parseMaybe(view.toISO)!.getTime() -
                          view.minDays * 86400000
                      )
                    )
                  )}
                </div>
              </div>

              {/* Ver lista */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <List className="h-4 w-4 mr-1" />
                    Ver lista
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() =>
                      onOpenList(
                        `Sin tareas — ≥ ${view.minDays} días`,
                        view.listRows
                      )
                    }
                  >
                    Abrir listado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
