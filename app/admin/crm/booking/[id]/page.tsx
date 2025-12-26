"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getMetadata, type MetadataRecord } from "@/lib/metadata";
import {
  CloseSaleForm,
  type CloseSaleInput,
} from "@/app/admin/crm/components/CloseSaleForm2";
import { CallFlowManager } from "@/app/admin/crm/components/CallFlowManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Mail, Phone, Tags, Calendar } from "lucide-react";
import Link from "next/link";
import { SalePreview } from "@/app/admin/crm/components/SalePreview";
import { updateMetadataPayload } from "@/app/admin/crm/api";
import { toast } from "@/components/ui/use-toast";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <Content id={params.id} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function Content({ id }: { id: string }) {
  const [loading, setLoading] = React.useState(true);
  const [record, setRecord] = React.useState<MetadataRecord<any> | null>(null);
  const [draft, setDraft] = React.useState<Partial<CloseSaleInput> | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [stageSaving, setStageSaving] = React.useState(false);
  const [dispositionSaving, setDispositionSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rec = await getMetadata<any>(id);
      setRecord(rec);
    } catch (e) {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-6 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando lead...
        </Card>
      </div>
    );
  }

  if (!record || record.entity !== "booking") {
    return (
      <div className="p-6">
        <Card className="p-6">No se encontró el lead solicitado.</Card>
      </div>
    );
  }

  const p = record.payload || {};
  const salePayload = p.sale || {};

  const normalizeLeadStatus = (raw?: any) => {
    const v = String(raw ?? "").trim().toLowerCase();
    if (!v) return "new";
    if (v === "new" || v === "contacted" || v === "qualified" || v === "won" || v === "lost") return v;
    if (v === "nuevo") return "new";
    if (v === "contactado") return "contacted";
    if (v === "calificado") return "qualified";
    if (v === "ganado") return "won";
    if (v === "perdido") return "lost";
    return "new";
  };

  const leadStatus = normalizeLeadStatus(p.status);
  const leadStageLabel = (() => {
    if (leadStatus === "new") return "Nuevo";
    if (leadStatus === "contacted") return "Contactado";
    if (leadStatus === "qualified") return "Calificado";
    if (leadStatus === "won") return "Ganado";
    if (leadStatus === "lost") return "Perdido";
    return "Nuevo";
  })();

  const leadDisposition = String(p.lead_disposition ?? "");

  const statusRaw = String(salePayload?.status || "");
  const statusLabel = (() => {
    const v = statusRaw.toLowerCase();
    if (!v) return "borrador";
    if (v === "payment_verification_pending") return "verificación de pago";
    if (v === "payment_confirmed") return "pago confirmado";
    if (v === "active" || v === "active_provisional") return "activo";
    if (v === "cancelled" || v === "lost") return "cancelada";
    if (v === "operational_closure") return "cierre operativo";
    if (v === "contract_sent") return "contrato enviado";
    if (v === "contract_signed") return "contrato firmado";
    return v.replace(/_/g, " ");
  })();

  const initial: Partial<CloseSaleInput> = {
    fullName: p.name || salePayload?.name || "",
    email: p.email || salePayload?.email || "",
    phone: p.phone || salePayload?.phone || "",
    program: salePayload?.program || "",
    bonuses: Array.isArray(salePayload?.bonuses)
      ? salePayload.bonuses
      : typeof salePayload?.bonuses === "string"
      ? String(salePayload?.bonuses)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [],
    paymentMode: salePayload?.payment?.mode || "",
    paymentAmount: salePayload?.payment?.amount || "",
    paymentPlatform: salePayload?.payment?.platform || "hotmart",
    nextChargeDate: salePayload?.payment?.nextChargeDate || "",
    contractThirdParty: !!salePayload?.contract?.thirdParty,
    contractPartyName: salePayload?.contract?.party?.name || p.name || "",
    contractPartyEmail: salePayload?.contract?.party?.email || p.email || "",
    contractPartyPhone: salePayload?.contract?.party?.phone || p.phone || "",
    notes: salePayload?.notes || "",
    status: salePayload?.status || undefined,
  } as any;

  const fmtDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString("es-ES", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Detalle del lead</h1>
          <div className="text-sm text-slate-600">ID: {record.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-100 text-indigo-700 capitalize">
            Lead: {leadStageLabel}
          </Badge>
          <Badge className="bg-slate-100 text-slate-700 capitalize">
            Estatus: {statusLabel}
          </Badge>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none"
            value={leadStatus}
            disabled={stageSaving}
            onChange={async (e) => {
              const next = e.target.value;
              setStageSaving(true);
              try {
                await updateMetadataPayload(String(record.id), { status: next } as any);
                toast({ title: "Etapa actualizada", description: `Lead → ${next}` });
                await load();
              } catch (err: any) {
                toast({ title: "Error", description: err?.message || "No se pudo actualizar la etapa", variant: "destructive" });
              } finally {
                setStageSaving(false);
              }
            }}
            title="Cambiar etapa del lead"
          >
            <option value="new">Nuevo</option>
            <option value="contacted">Contactado</option>
            <option value="qualified">Calificado</option>
            <option value="won">Ganado</option>
            <option value="lost">Perdido</option>
          </select>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none"
            value={leadDisposition}
            disabled={dispositionSaving}
            onChange={async (e) => {
              const next = e.target.value;
              setDispositionSaving(true);
              try {
                await updateMetadataPayload(String(record.id), { lead_disposition: next || null } as any);
                toast({ title: "Estado guardado" });
                await load();
              } catch (err: any) {
                toast({ title: "Error", description: err?.message || "No se pudo guardar", variant: "destructive" });
              } finally {
                setDispositionSaving(false);
              }
            }}
            title="Estado comercial (no califica / reagendar / etc)"
          >
            <option value="">Estado: —</option>
            <option value="interesado">Interesado</option>
            <option value="reagendar">Reagendar</option>
            <option value="no_responde">No responde</option>
            <option value="no_califica">No califica</option>
            <option value="no_interesado">No interesado</option>
          </select>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Vista previa</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Vista previa / contrato</DialogTitle>
              </DialogHeader>
              <SalePreview
                payload={salePayload}
                draft={draft || undefined}
                id={record.id}
                entity="booking"
                title="Contrato / resumen"
                onUpdated={() => load()}
              />
            </DialogContent>
          </Dialog>
          <Button asChild variant="outline">
            <Link href="/admin/crm">Volver al CRM</Link>
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="truncate">{p.email || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="truncate">{p.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">{p.source || "booking"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              Registrado: {fmtDate(record.created_at || p.created_at)}
            </span>
          </div>
        </div>
      </Card>

      {/* Flujo de llamada según diagrama (recordatorios, resultado, reagenda) */}
      <CallFlowManager
        recordId={record.id}
        payload={p}
        onSaved={() => load()}
      />

      <Card className="p-4">
        <div className="text-sm font-medium mb-2">
          Cierre de venta dentro del lead
        </div>
        <CloseSaleForm
          mode="edit"
          recordId={record.id}
          entity="booking"
          initial={initial}
          autoSave
          onChange={(f) => setDraft({ ...f })}
          onDone={() => {
            // tras guardar, refrescamos la data sin recargar la página
            load();
          }}
        />
      </Card>
    </div>
  );
}
