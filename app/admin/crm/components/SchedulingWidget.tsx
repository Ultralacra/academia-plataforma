"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { crmService } from "@/lib/crm-service";
import type { ReservationForm, SchedulingSlot } from "@/lib/crm-types";

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function addDaysISO(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString();
}

export function SchedulingWidget({ prospectId }: { prospectId?: string }) {
  const [forms, setForms] = React.useState<ReservationForm[]>([]);
  const [formId, setFormId] = React.useState<string>("");
  const [slots, setSlots] = React.useState<SchedulingSlot[]>([]);
  const [from, setFrom] = React.useState<string>(startOfDayISO(new Date()));
  const [to, setTo] = React.useState<string>(addDaysISO(new Date(), 7));

  const [nombre, setNombre] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefono, setTelefono] = React.useState("");

  const reloadForms = React.useCallback(() => {
    setForms(crmService.listReservationForms());
  }, []);

  const reloadSlots = React.useCallback(() => {
    if (!formId) {
      setSlots([]);
      return;
    }
    setSlots(crmService.listSlots(formId, from, to));
  }, [formId, from, to]);

  React.useEffect(() => {
    reloadForms();
  }, [reloadForms]);
  React.useEffect(() => {
    reloadSlots();
  }, [reloadSlots]);

  const createSlot = () => {
    if (!formId) return;
    const start = new Date();
    start.setHours(start.getHours() + 2, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    crmService.createSlot(formId, start.toISOString(), end.toISOString());
    reloadSlots();
  };

  const book = (slotId: string) => {
    if (!nombre.trim()) return;
    crmService.bookSlot(slotId, { nombre, email, telefono, prospectId });
    reloadSlots();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="md:col-span-2">
          <Label className="text-xs">Formulario</Label>
          <select
            className="w-full h-10 border rounded px-2"
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
          >
            <option value="">Selecciona…</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={from.slice(0, 10)}
            onChange={(e) => setFrom(new Date(e.target.value).toISOString())}
          />
        </div>
        <div>
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={to.slice(0, 10)}
            onChange={(e) => setTo(new Date(e.target.value).toISOString())}
          />
        </div>
        <div className="flex items-end">
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={createSlot}
            disabled={!formId}
          >
            Crear slot +30m
          </Button>
        </div>
      </div>

      <Card className="p-3 border-orange-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1 space-y-2">
            <Label className="text-xs">Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Label className="text-xs">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            <Label className="text-xs">Teléfono</Label>
            <Input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.id}
                  disabled={s.booked}
                  onClick={() => book(s.id)}
                  className={`border rounded p-2 text-left hover:bg-orange-50/60 transition-colors ${
                    s.booked
                      ? "opacity-50 cursor-not-allowed bg-slate-50"
                      : "border-orange-100"
                  }`}
                >
                  <div className="text-xs text-slate-500">
                    {new Date(s.startAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-medium">
                    {new Date(s.startAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(s.endAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {s.booked ? (
                    <div className="text-[10px] text-emerald-700">
                      Reservado
                    </div>
                  ) : (
                    <div className="text-[10px] text-orange-700">
                      Disponible
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
