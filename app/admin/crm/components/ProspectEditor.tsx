"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { crmService } from "@/lib/crm-service";
import type { ProspectCore } from "@/lib/crm-types";
import { User } from "lucide-react";

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
    <div className="rounded-xl border border-slate-200/70 bg-white/90 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <User className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Información del prospecto
          </p>
          <p className="text-xs text-slate-500">
            Actualiza datos clave antes de guardar.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Nombre</Label>
          <Input
            className="bg-white"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Email</Label>
          <Input
            className="bg-white"
            value={form.email || ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Teléfono</Label>
          <Input
            className="bg-white"
            value={form.telefono || ""}
            onChange={(e) => set("telefono", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Canal</Label>
          <Input
            className="bg-white"
            value={form.canalFuente || ""}
            onChange={(e) => set("canalFuente", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Owner</Label>
          <Input
            className="bg-white"
            value={form.ownerNombre || ""}
            onChange={(e) => set("ownerNombre", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Ciudad</Label>
          <Input
            className="bg-white"
            value={form.ciudad || ""}
            onChange={(e) => set("ciudad", e.target.value)}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-slate-500">Notas</Label>
          <Textarea
            className="min-h-[90px] bg-white"
            value={form.notasResumen || ""}
            onChange={(e) => set("notasResumen", e.target.value)}
            placeholder="Resumen de la conversación o próximos pasos"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
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
