"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createLead } from "../api";
import { listLeadOrigins, type LeadOrigin } from "../api";

export function CreateLeadDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
        >
          <Plus className="h-4 w-4" /> Nuevo lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear lead</DialogTitle>
        </DialogHeader>
        <CreateLeadForm
          onCreated={() => {
            setOpen(false);
            onCreated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateLeadForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [campaignCodigo, setCampaignCodigo] = React.useState<string>("");
  const [status, setStatus] = React.useState("new");
  const [loading, setLoading] = React.useState(false);

  const DEFAULT_OWNER_CODIGO = (
    process.env.NEXT_PUBLIC_CRM_DEFAULT_OWNER_CODIGO || ""
  ).trim();

  const [campaigns, setCampaigns] = React.useState<LeadOrigin[]>([]);
  const [campaignsLoading, setCampaignsLoading] = React.useState(false);

  const loadCampaigns = React.useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const items = await listLeadOrigins();
      setCampaigns(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setCampaigns([]);
      toast({
        title: "Error",
        description: e?.message || "No se pudieron cargar las campañas",
        variant: "destructive",
      });
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Cargar campañas para el selector de source
    loadCampaigns();
  }, [loadCampaigns]);

  const submit = async () => {
    if (!name.trim()) return;

    const selectedCampaign = campaignCodigo
      ? campaigns.find((c) => String(c.codigo) === String(campaignCodigo))
      : null;

    // Si viene de campaña, asociamos por source_entity_id y dejamos un source legible.
    // Si no viene de campaña, usamos source=manual_form y aplicamos owner_codigo default (oculto).
    const computedSource = selectedCampaign
      ? String(selectedCampaign.name || selectedCampaign.codigo)
      : "manual_form";
    const computedOwnerCodigo = selectedCampaign
      ? undefined
      : DEFAULT_OWNER_CODIGO || undefined;

    setLoading(true);
    try {
      await createLead({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: computedSource,
        status: status.trim() || undefined,
        owner_codigo: computedOwnerCodigo,
        ...(selectedCampaign
          ? {
              source_entity_id: String(selectedCampaign.codigo),
              source_entity: "lead_origin",
            }
          : {}),
      });
      toast({ title: "Lead creado", description: name.trim() });
      onCreated();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo crear el lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-2">
        <Label>Nombre *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Teléfono</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Campaña (source)</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none"
          value={campaignCodigo}
          onChange={(e) => setCampaignCodigo(e.target.value)}
          disabled={campaignsLoading}
        >
          <option value="">
            {campaignsLoading ? "Cargando campañas..." : "Sin campaña"}
          </option>
          {campaigns.map((c) => (
            <option key={String(c.codigo)} value={String(c.codigo)}>
              {String(c.name || c.codigo)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Estado</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="new">Nuevo</option>
          <option value="contacted">Contactado</option>
          <option value="qualified">Calificado</option>
          <option value="won">Ganado</option>
          <option value="lost">Perdido</option>
        </select>
      </div>
      <div className="col-span-2 flex justify-end gap-2 mt-2">
        <Button
          variant="outline"
          onClick={() => {
            setName("");
            setEmail("");
            setPhone("");
            setCampaignCodigo("");
            setStatus("new");
          }}
        >
          Limpiar
        </Button>
        <Button onClick={submit} disabled={loading || !name.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Crear lead
        </Button>
      </div>
    </div>
  );
}
