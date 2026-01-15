"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TabNotasProps {
  p: any;
}

export function TabNotas({ p }: TabNotasProps) {
  const reminders = Array.isArray(p.reminders)
    ? p.reminders
    : Array.isArray(p.call?.reminders)
    ? p.call.reminders
    : [];

  const reagendaDate =
    p.call_reschedule_date || p.call?.reschedule?.date || null;
  const reagendaTime =
    p.call_reschedule_time || p.call?.reschedule?.time || null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
          <CardDescription>Notas de venta y mensajes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs font-medium text-slate-600">
                Notas de venta
              </div>
              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap">
                {String(p.sale_notes ?? p.saleNotes ?? "").trim() || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">
                Mensajes / notas de llamada
              </div>
              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap">
                {String(p.text_messages ?? p.textMessages ?? "").trim() ||
                  "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recordatorios y reagenda</CardTitle>
          <CardDescription>
            Resumen rápido del seguimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                Reagendado
              </span>
              <span className="font-medium">
                {reagendaDate || reagendaTime
                  ? `${String(reagendaDate || "").slice(0, 10)}${
                      reagendaTime ? ` ${String(reagendaTime)}` : ""
                    }`.trim()
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                Recordatorios
              </span>
              <span className="font-medium">{reminders.length}</span>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              {reminders.length ? (
                <ul className="space-y-2">
                  {reminders
                    .slice(0, 6)
                    .map((r: any, idx: number) => (
                      <li key={idx} className="text-sm">
                        {typeof r === "string"
                          ? r
                          : JSON.stringify(r)}
                      </li>
                    ))}
                  {reminders.length > 6 ? (
                    <li className="text-xs text-slate-500">
                      +{reminders.length - 6} más…
                    </li>
                  ) : null}
                </ul>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Para editar seguimiento/recordatorios, usa la pestaña
              "Seguimiento".
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
