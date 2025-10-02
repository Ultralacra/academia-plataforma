"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskSignal } from "./phase-faker";

function daysDiff(a: string, b: string) {
  const d1 = new Date(a),
    d2 = new Date(b);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TasksKPIs({ items }: { items: TaskSignal[] }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<
    "d3_6" | "d7_14" | "d15_29" | "d30p"
  >("d3_6");

  const buckets = useMemo(() => {
    const b = {
      d0_2: [] as TaskSignal[],
      d3_6: [] as TaskSignal[],
      d7_14: [] as TaskSignal[],
      d15_29: [] as TaskSignal[],
      d30p: [] as TaskSignal[],
      unknown: [] as TaskSignal[],
    };

    (items ?? []).forEach((x) => {
      if (!x.lastTaskAt) {
        b.unknown.push(x);
        return;
      }
      const dd = daysDiff(x.lastTaskAt, todayKey);
      if (dd <= 2) b.d0_2.push(x);
      else if (dd <= 6) b.d3_6.push(x);
      else if (dd <= 14) b.d7_14.push(x);
      else if (dd <= 29) b.d15_29.push(x);
      else b.d30p.push(x);
    });

    const total = items.length || 1;
    const parts = [
      {
        key: "d3_6" as const,
        label: "3–6 días",
        value: b.d3_6.length,
        color: "bg-amber-400",
        list: b.d3_6,
      },
      {
        key: "d7_14" as const,
        label: "7–14 días",
        value: b.d7_14.length,
        color: "bg-orange-500",
        list: b.d7_14,
      },
      {
        key: "d15_29" as const,
        label: "15–29 días",
        value: b.d15_29.length,
        color: "bg-rose-500",
        list: b.d15_29,
      },
      {
        key: "d30p" as const,
        label: "≥ 30 días",
        value: b.d30p.length,
        color: "bg-rose-700",
        list: b.d30p,
      },
    ].map((p) => ({ ...p, pct: Math.round((p.value / total) * 100) }));

    return {
      total,
      upToDate: b.d0_2.length,
      unknown: b.unknown.length,
      parts,
      lists: b,
    };
  }, [items, todayKey]);

  const openBucket = (key: typeof activeKey) => {
    setActiveKey(key);
    setOpen(true);
  };

  const Bar = () => (
    <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="flex h-2 w-full">
        {buckets.parts.map((p) => (
          <div
            key={p.key}
            className={`${p.color}`}
            style={{ width: `${p.pct}%` }}
            title={`${p.label}: ${p.value} (${p.pct}%)`}
          />
        ))}
      </div>
    </div>
  );

  const Row = ({
    label,
    value,
    pct,
    color,
    onClick,
  }: {
    label: string;
    value: number;
    pct: number;
    color: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-2 flex items-center justify-between hover:bg-muted text-left"
    >
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">
        {value}{" "}
        <span className="text-muted-foreground font-normal">({pct}%)</span>
      </span>
    </button>
  );

  const labelFor: Record<typeof activeKey, string> = {
    d3_6: "Sin enviar 3–6 días",
    d7_14: "Sin enviar 7–14 días",
    d15_29: "Sin enviar 15–29 días",
    d30p: "Sin enviar ≥ 30 días",
  };

  const list = buckets.parts.find((p) => p.key === activeKey)?.list ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            Sin enviar tareas (por última entrega)
          </CardTitle>
          <div className="mt-1 text-xs text-muted-foreground">
            Distribución desde la última entrega. Total estudiantes:{" "}
            <strong>{buckets.total}</strong>.
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <Bar />

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {buckets.parts.map((p) => (
              <Row
                key={p.key}
                label={p.label}
                value={p.value}
                pct={p.pct}
                color={p.color}
                onClick={() => openBucket(p.key)}
              />
            ))}
          </div>

          <div className="mt-3 text-[11px] text-muted-foreground">
            <span className="mr-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 mr-1" />
              Al día (≤ 2d): <strong>{buckets.upToDate}</strong>
            </span>
            <span>
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400 mr-1" />
              Sin datos: <strong>{buckets.unknown}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {labelFor[activeKey]} — {list.length} alumno
              {list.length === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Última entrega</th>
                  <th className="px-3 py-2">Días</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const dd = r.lastTaskAt
                    ? daysDiff(r.lastTaskAt, todayKey)
                    : null;
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.code ?? "—"}
                      </td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.lastTaskAt ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{dd ?? "—"}</td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-muted-foreground"
                      colSpan={4}
                    >
                      No hay alumnos en este bucket.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
