"use client";

import React from "react";
import Link from "next/link";
import {
  createLeadOrigin,
  getLeadOrigin,
  listLeadOrigins,
  updateLeadOrigin,
  type LeadOrigin,
  listLeads,
  type Lead,
} from "@/app/admin/crm/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Copy } from "lucide-react";
import { getPublicAppOrigin } from "@/lib/public-app-origin";

type EditorMode = "create" | "edit";

function toDateInputValue(value: unknown) {
  const s = typeof value === "string" ? value : "";
  if (!s) return "";
  // soporta "YYYY-MM-DD" o ISO
  const direct = s.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function fmtDate(iso: unknown) {
  const s = typeof iso === "string" ? iso : "";
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      const direct = s.trim().slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(direct) ? direct : s;
    }
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return s;
  }
}

function toIsoStart(dateStr: string) {
  const d = String(dateStr || "").trim();
  if (!d) return undefined;
  if (d.includes("T")) return d;
  return `${d}T00:00:00Z`;
}

function toIsoEnd(dateStr: string) {
  const d = String(dateStr || "").trim();
  if (!d) return undefined;
  if (d.includes("T")) return d;
  return `${d}T23:59:59Z`;
}

export function EventsOriginsManager() {
  const [items, setItems] = React.useState<LeadOrigin[]>([]);
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<EditorMode>("create");
  const [saving, setSaving] = React.useState(false);

  const [codigo, setCodigo] = React.useState("");
  const [eventCodigo, setEventCodigo] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const [configMedium, setConfigMedium] = React.useState("");
  const [configSource, setConfigSource] = React.useState("");
  const [configCampaignId, setConfigCampaignId] = React.useState("");

  const resetForm = React.useCallback(() => {
    setCodigo("");
    setEventCodigo("");
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setConfigMedium("");
    setConfigSource("");
    setConfigCampaignId("");
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [originsData, leadsData] = await Promise.all([
        listLeadOrigins(),
        listLeads({ page: 1, pageSize: 500 }),
      ]);
      setItems(Array.isArray(originsData) ? originsData : []);
      setLeads(Array.isArray(leadsData.items) ? leadsData.items : []);
    } catch (err: any) {
      setItems([]);
      setLeads([]);
      toast({
        title: "Error",
        description: err?.message || "No se pudo cargar datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const [originsData, leadsData] = await Promise.all([
        listLeadOrigins(),
        listLeads({ page: 1, pageSize: 500 }),
      ]);
      setItems(Array.isArray(originsData) ? originsData : []);
      setLeads(Array.isArray(leadsData.items) ? leadsData.items : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo refrescar",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openCreate = React.useCallback(() => {
    setMode("create");
    resetForm();
    setOpen(true);
  }, [resetForm]);

  const openEdit = React.useCallback(async (codigoToEdit: string) => {
    setMode("edit");
    setSaving(true);
    setOpen(true);
    try {
      const origin = await getLeadOrigin(codigoToEdit);
      setCodigo(String(origin?.codigo ?? codigoToEdit));
      setEventCodigo(String((origin as any)?.event_codigo ?? ""));
      setName(String(origin?.name ?? ""));
      setDescription(String(origin?.description ?? ""));
      setStartDate(toDateInputValue((origin as any)?.start_date));
      setEndDate(toDateInputValue((origin as any)?.end_date));

      const cfg: any = (origin as any)?.config;
      setConfigMedium(String(cfg?.medium ?? ""));
      setConfigSource(String(cfg?.source ?? ""));
      setConfigCampaignId(String(cfg?.campaign_id ?? ""));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo cargar el evento",
        variant: "destructive",
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleSave = React.useCallback(async () => {
    const base: any = {
      name: name || undefined,
      description: description || undefined,
      event_codigo: String(eventCodigo || "").trim() || undefined,
      start_date: toIsoStart(startDate),
      end_date: toIsoEnd(endDate),
    };

    const config: any = {
      medium: String(configMedium || "").trim() || undefined,
      source: String(configSource || "").trim() || undefined,
      campaign_id: String(configCampaignId || "").trim() || undefined,
    };
    const hasConfig = Object.values(config).some((v) => v !== undefined);

    const payload = {
      ...base,
      ...(hasConfig ? { config } : {}),
    };

    setSaving(true);
    try {
      if (mode === "create") {
        await createLeadOrigin(payload);
        toast({ title: "Evento creado" });
      } else {
        await updateLeadOrigin(codigo, payload);
        toast({ title: "Evento actualizado" });
      }
      setOpen(false);
      await handleRefresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo guardar el evento",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    codigo,
    configCampaignId,
    configMedium,
    configSource,
    description,
    endDate,
    eventCodigo,
    handleRefresh,
    mode,
    name,
    startDate,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Administra campañas (origins) para leads.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button onClick={openCreate}>Crear campaña</Button>
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hay campañas.</div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Event código
                  </TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="whitespace-nowrap">Inicio</TableHead>
                  <TableHead className="whitespace-nowrap">Fin</TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    Leads
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={String(it.codigo)}>
                    <TableCell className="min-w-[220px]">
                      {it.name || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {(it as any).event_codigo || "—"}
                    </TableCell>
                    <TableCell className="min-w-[260px]">
                      {(it as any).description || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate((it as any).start_date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate((it as any).end_date)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-semibold">
                        {leads.filter((l) => l.source === it.codigo).length}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={async () => {
                            const eventCodigoRow = String(
                              (it as any)?.event_codigo || ""
                            ).trim();
                            const fallbackCodigo = String(
                              it?.codigo || ""
                            ).trim();
                            const code = eventCodigoRow || fallbackCodigo;
                            if (!code) return;
                            const origin = getPublicAppOrigin();
                            const url = `${origin}/booking/${encodeURIComponent(
                              code
                            )}`;
                            try {
                              await navigator.clipboard.writeText(url);
                              toast({ title: "Link copiado" });
                            } catch {
                              toast({
                                title: "No se pudo copiar",
                                description: url,
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={
                            !String(
                              (it as any)?.event_codigo || it?.codigo || ""
                            ).trim()
                          }
                          aria-label="Copiar link del formulario"
                          title="Copiar link del formulario"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/admin/crm/campanas/${encodeURIComponent(
                              String(it.codigo)
                            )}`}
                          >
                            Detalle
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(String(it.codigo))}
                        >
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Crear campaña" : "Editar campaña"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {mode === "edit" ? (
              <div className="grid gap-1">
                <Label>Código (codigo)</Label>
                <Input value={codigo} disabled />
              </div>
            ) : null}

            <div className="grid gap-1">
              <Label>Event código (event_codigo)</Label>
              <Input
                value={eventCodigo}
                onChange={(e) => setEventCodigo(e.target.value)}
                placeholder="EVT-2026-01"
              />
            </div>

            <div className="grid gap-1">
              <Label>Nombre (name)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-1">
              <Label>Descripción (description)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <Label>Inicio (start_date)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="grid gap-1">
              <Label>Fin (end_date)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="grid gap-3">
              <Label>Config</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    medium
                  </Label>
                  <Input
                    value={configMedium}
                    onChange={(e) => setConfigMedium(e.target.value)}
                    placeholder="web"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    source
                  </Label>
                  <Input
                    value={configSource}
                    onChange={(e) => setConfigSource(e.target.value)}
                    placeholder="google_ads"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    campaign_id
                  </Label>
                  <Input
                    value={configCampaignId}
                    onChange={(e) => setConfigCampaignId(e.target.value)}
                    placeholder="gads-1234"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
