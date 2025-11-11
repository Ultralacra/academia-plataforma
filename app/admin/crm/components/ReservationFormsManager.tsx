"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { crmService } from "@/lib/crm-service";
import type { ReservationForm } from "@/lib/crm-types";

export function ReservationFormsManager() {
  const [forms, setForms] = React.useState<ReservationForm[]>([]);
  const [name, setName] = React.useState("");
  const [editing, setEditing] = React.useState<ReservationForm | null>(null);
  const [newFieldLabel, setNewFieldLabel] = React.useState("");

  const reload = React.useCallback(() => {
    try {
      const list = crmService.listReservationForms();
      setForms(list);
    } catch {
      setForms([]);
    }
  }, []);

  React.useEffect(() => reload(), [reload]);

  const create = () => {
    if (!name.trim()) return;
    const f = crmService.createReservationForm({ nombre: name });
    if (f) {
      setName("");
      reload();
    }
  };

  const addField = () => {
    if (!editing || !newFieldLabel.trim()) return;
    const next = {
      ...editing,
      fields: [
        ...editing.fields,
        { id: `fld_${Date.now()}`, label: newFieldLabel.trim(), type: "text" },
      ],
    } as ReservationForm;
    crmService.updateReservationForm(editing.id, next);
    setEditing(next);
    setNewFieldLabel("");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre del formulario"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={create}>Crear</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {forms.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{f.nombre}</div>
                <div className="text-xs text-slate-500">
                  Campos: {f.fields.length}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(f)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    crmService.deleteReservationForm(f.id);
                    reload();
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {editing && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Editando: {editing.nombre}</div>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cerrar
            </Button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {editing.fields.map((fld) => (
                <div key={fld.id} className="border rounded p-2">
                  <div className="text-xs text-slate-500">{fld.type}</div>
                  <div className="text-sm font-medium">{fld.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Etiqueta del nuevo campo"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
              />
              <Button onClick={addField}>Agregar campo</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
