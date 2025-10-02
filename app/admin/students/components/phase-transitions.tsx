"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PhaseItemFull } from "./phase-faker";

function inRange(d?: string | null, from?: Date, to?: Date) {
  if (!d) return false;
  const x = new Date(d);
  if (isNaN(x.getTime())) return false;
  if (from && x < from) return false;
  if (to && x > to) return false;
  return true;
}
function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PhaseTransitions({
  items,
  initialWindow = "month",
}: {
  items: PhaseItemFull[];
  /** "week" | "month" | "4months" */
  initialWindow?: "week" | "month" | "4months";
}) {
  const [win, setWin] = useState<"week" | "month" | "4months">(initialWindow);
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<"f1" | "f2" | "f3" | "f4" | "f5">(
    "f1"
  );

  const calc = useMemo(() => {
    const today = new Date();
    const to = new Date(fmtISO(today));
    const from = new Date(to);
    if (win === "week") from.setDate(to.getDate() - 7);
    else if (win === "month") from.setMonth(to.getMonth() - 1);
    else from.setMonth(to.getMonth() - 4);

    const list = {
      f1: items
        .filter((i) => inRange(i.paso_f1, from, to))
        .map((i) => ({
          id: i.id,
          name: i.name,
          code: i.code,
          date: i.paso_f1!,
        })),
      f2: items
        .filter((i) => inRange(i.paso_f2, from, to))
        .map((i) => ({
          id: i.id,
          name: i.name,
          code: i.code,
          date: i.paso_f2!,
        })),
      f3: items
        .filter((i) => inRange(i.paso_f3, from, to))
        .map((i) => ({
          id: i.id,
          name: i.name,
          code: i.code,
          date: i.paso_f3!,
        })),
      f4: items
        .filter((i) => inRange(i.paso_f4, from, to))
        .map((i) => ({
          id: i.id,
          name: i.name,
          code: i.code,
          date: i.paso_f4!,
        })),
      f5: items
        .filter((i) => inRange(i.paso_f5, from, to))
        .map((i) => ({
          id: i.id,
          name: i.name,
          code: i.code,
          date: i.paso_f5!,
        })),
    };

    const counters = {
      f1: list.f1.length,
      f2: list.f2.length,
      f3: list.f3.length,
      f4: list.f4.length,
      f5: list.f5.length,
    };
    const total =
      counters.f1 + counters.f2 + counters.f3 + counters.f4 + counters.f5;

    return { from, to, list, counters, total };
  }, [items, win]);

  const openList = (key: typeof activeKey) => {
    setActiveKey(key);
    setOpen(true);
  };

  const Pill = ({
    title,
    value,
    onClick,
  }: {
    title: string;
    value: number;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-2 flex items-center justify-between hover:bg-muted w-full text-left"
    >
      <span className="text-sm">{title}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </button>
  );

  const labelFor: Record<typeof activeKey, string> = {
    f1: "Ingresaron a F1",
    f2: "Pasaron a F2",
    f3: "Pasaron a F3",
    f4: "Pasaron a F4",
    f5: "Pasaron a F5",
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">Transiciones de fase</CardTitle>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={win === "week" ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setWin("week")}
              >
                7 días
              </Button>
              <Button
                type="button"
                variant={win === "month" ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setWin("month")}
              >
                1 mes
              </Button>
              <Button
                type="button"
                variant={win === "4months" ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setWin("4months")}
              >
                4 meses
              </Button>
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Rango: <strong>{fmtISO(calc.from)}</strong> →{" "}
            <strong>{fmtISO(calc.to)}</strong> · Total transiciones:{" "}
            <strong>{calc.total}</strong>
          </div>
        </CardHeader>
        <CardContent className="pt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
          <Pill
            title="Ingresaron a F1"
            value={calc.counters.f1}
            onClick={() => openList("f1")}
          />
          <Pill
            title="Pasaron a F2"
            value={calc.counters.f2}
            onClick={() => openList("f2")}
          />
          <Pill
            title="Pasaron a F3"
            value={calc.counters.f3}
            onClick={() => openList("f3")}
          />
          <Pill
            title="Pasaron a F4"
            value={calc.counters.f4}
            onClick={() => openList("f4")}
          />
          <Pill
            title="Pasaron a F5"
            value={calc.counters.f5}
            onClick={() => openList("f5")}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {labelFor[activeKey]} — {calc.list[activeKey].length} alumno
              {calc.list[activeKey].length === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {calc.list[activeKey].map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.code ?? "—"}
                    </td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.date}</td>
                  </tr>
                ))}
                {calc.list[activeKey].length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-muted-foreground"
                      colSpan={3}
                    >
                      No hay alumnos en este rango.
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
