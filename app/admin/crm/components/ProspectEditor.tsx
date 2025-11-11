"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { crmService } from "@/lib/crm-service";
import type { ProspectCore } from "@/lib/crm-types";

export function ProspectEditor({
  prospect,
  onSaved,
}: {
  prospect: ProspectCore;
  onSaved?: (p: ProspectCore) => void;
}) {
  const [form, setForm] = React.useState<ProspectCore>(prospect);
  React.useEffect(() => setForm(prospect), [prospect?.id]);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof ProspectCore>(k: K, v: ProspectCore[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  const save = async () => {
    setSaving(true);
    try {
      const updated = crmService.updateProspect(form.id, form) as ProspectCore;
      onSaved?.(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label>Nombre</Label>
        <Input
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input
          value={form.email || ""}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Teléfono</Label>
        <Input
          value={form.telefono || ""}
          onChange={(e) => set("telefono", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Canal</Label>
        <Input
          value={form.canalFuente || ""}
          onChange={(e) => set("canalFuente", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Owner</Label>
        <Input
          value={form.ownerNombre || ""}
          onChange={(e) => set("ownerNombre", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Ciudad</Label>
        <Input
          value={form.ciudad || ""}
          onChange={(e) => set("ciudad", e.target.value)}
        />
      </div>
      <div className="space-y-1 col-span-2">
        <Label>Notas</Label>
        <Input
          value={form.notasResumen || ""}
          onChange={(e) => set("notasResumen", e.target.value)}
        />
      </div>
      <div className="col-span-2 flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={() => setForm(prospect)}>
          Deshacer
        </Button>
        <Button onClick={save} disabled={saving}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
