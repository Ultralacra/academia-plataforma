"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getOpciones } from "../../api";
import { toast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";

export default function EditOptionModal({
  open,
  onOpenChange,
  clientCode,
  current,
  mode = "all",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientCode: string;
  current: { estado?: string; etapa?: string; nicho?: string } | null;
  mode?: "estado" | "etapa" | "nicho" | "all";
  onSaved?: () => void;
}) {
  const [estados, setEstados] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [nichos, setNichos] = useState<any[]>([]);

  const [estado, setEstado] = useState<string | undefined>(current?.estado);
  const [etapa, setEtapa] = useState<string | undefined>(current?.etapa);
  const [nicho, setNicho] = useState<string | undefined>(current?.nicho);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setEstados(await getOpciones("estado_cliente"));
        setEtapas(await getOpciones("etapa"));
        setNichos(await getOpciones("nicho"));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open]);

  useEffect(() => {
    setEstado(current?.estado);
    setEtapa(current?.etapa);
    setNicho(current?.nicho);
  }, [current, open]);

  async function save() {
    if (!clientCode) return;
    setSaving(true);
    try {
      // Primero obtenemos los datos actuales del cliente para no enviar campos vacíos
      const getUrl = `/client/get/clients?page=1&search=${encodeURIComponent(
        clientCode
      )}`;
      let existing: any = {};
      try {
        const j = await apiFetch<any>(getUrl);
        const rows: any[] = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j?.clients?.data)
          ? j.clients.data
          : Array.isArray(j?.getClients?.data)
          ? j.getClients.data
          : [];
        existing = rows[0] || {};
      } catch (e) {
        existing = {};
      }

      const fd = new FormData();
      // Siempre enviar nombre (nuevo o existente)
      const nombreToSend = String(existing?.nombre ?? existing?.name ?? "");
      if (nombreToSend) fd.set("nombre", nombreToSend);
      // Para etapa/nicho/estado, enviar el valor nuevo si fue seleccionado, sino enviar el existente para no borrarlo.
      const estadoToSend =
        estado !== undefined
          ? String(estado)
          : String(existing?.estado ?? existing?.state ?? "");
      if (estadoToSend) fd.set("estado", estadoToSend);
      const etapaToSend =
        etapa !== undefined
          ? String(etapa)
          : String(existing?.etapa ?? existing?.stage ?? "");
      if (etapaToSend) fd.set("etapa", etapaToSend);
      const nichoToSend =
        nicho !== undefined ? String(nicho) : String(existing?.nicho ?? "");
      if (nichoToSend) fd.set("nicho", nichoToSend);
      // El endpoint acepta form-data y ahora también soporta estado
      const url = `/client/update/client/${encodeURIComponent(clientCode)}`;
      const token = typeof window !== "undefined" ? getAuthToken() : null;
      const res = await fetch(
        url.startsWith("http")
          ? url
          : (process.env.NEXT_PUBLIC_API_HOST ?? "https://v001.vercel.app/v1") +
              url,
        {
          method: "PUT",
          body: fd,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      toast({
        title: "Actualizado",
        description: "Campos guardados correctamente",
      });
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo actualizar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar alumno</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {(mode === "estado" || mode === "all") && (
            <div>
              <label className="block text-xs text-muted-foreground">
                Estado
              </label>
              <Select value={estado} onValueChange={(v) => setEstado(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona estado">
                    {estado && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        {estados.find((x) => x.key === estado)?.value ?? estado}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {estados.map((o) => (
                    <SelectItem key={o.id} value={o.key}>
                      <div className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span>{o.value}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(mode === "etapa" || mode === "all") && (
            <div>
              <label className="block text-xs text-muted-foreground">
                Etapa
              </label>
              <Select value={etapa} onValueChange={(v) => setEtapa(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona etapa">
                    {etapa && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        {etapas.find((x) => x.key === etapa)?.value ?? etapa}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {etapas.map((o) => (
                    <SelectItem key={o.id} value={o.key}>
                      <div className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        <span>{o.value}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(mode === "nicho" || mode === "all") && (
            <div>
              <label className="block text-xs text-muted-foreground">
                Nicho
              </label>
              <Select value={nicho} onValueChange={(v) => setNicho(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona nicho">
                    {nicho && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-violet-400" />
                        {nichos.find((x) => x.key === nicho)?.value ?? nicho}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {nichos.map((o) => (
                    <SelectItem key={o.id} value={o.key}>
                      <div className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-violet-400" />
                        <span>{o.value}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
