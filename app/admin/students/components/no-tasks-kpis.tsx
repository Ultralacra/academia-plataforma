"use client";

import { useMemo, useState } from "react";
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

/* ---------------- fecha utils ---------------- */
function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
  onOpenList,
}: {
  items: LifecycleItem[];
  students?: ClientItem[];
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
  const today = useMemo(() => new Date(isoDay(new Date())), []);
  const [from, setFrom] = useState<string>(
    isoDay(new Date(today.getTime() - 30 * 86400000))
  );
  const [to, setTo] = useState<string>(isoDay(today));

  /** map rápido por código del alumno (para fallback de lastActivity) */
  const studentByCode = useMemo(() => {
    const m: Record<string, ClientItem> = {};
    (students ?? []).forEach((s) => {
      if (s.code) m[s.code] = s;
    });
    return m;
  }, [students]);

  /** determina la "última entrega" conocida del alumno */
  function lastTaskFor(it: LifecycleItem): Date | null {
    const pref = parseMaybe(it.lastTaskAt);
    if (pref) return pref;
    if (it.code && studentByCode[it.code]?.lastActivity) {
      const d = parseMaybe(studentByCode[it.code].lastActivity);
      if (d) return d;
    }
    return null;
  }

  /** días de inactividad hasta 'to' */
  function daysSinceLast(it: LifecycleItem, toISO: string) {
    const last = lastTaskFor(it);
    const toD = parseMaybe(toISO);
    if (!last || !toD) return null;
    return diffDays(last, toD);
  }

  /** cálculo principal */
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
    };
  }, [items, tab, from, to, today, students, studentByCode]);

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

        <div className="text-xs text-muted-foreground mt-1">{rightNowText}</div>
      </CardHeader>

      <CardContent className="pt-3">
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
                    parseMaybe(view.toISO)!.getTime() - view.minDays * 86400000
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
      </CardContent>
    </Card>
  );
}
