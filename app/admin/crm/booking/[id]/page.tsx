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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { StageBadge } from "@/app/admin/crm/components/StageBadge";

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
    const v = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (!v) return "new";
    if (
      v === "new" ||
      v === "contacted" ||
      v === "qualified" ||
      v === "won" ||
      v === "lost"
    )
      return v;
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
  const leadDispositionLabel = (() => {
    const v = String(leadDisposition || "").toLowerCase();
    if (!v) return "";
    if (v === "interesado") return "Interesado";
    if (v === "reagendar") return "Reagendar";
    if (v === "no_responde") return "No responde";
    if (v === "no_califica") return "No califica";
    if (v === "no_interesado") return "No interesado";
    return leadDisposition;
  })();

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

  const salePaymentMode = String(salePayload?.payment?.mode || "").toLowerCase();
  const draftPaymentHasReserve = (draft as any)?.paymentHasReserve;
  const draftPaymentReserveAmount = (draft as any)?.paymentReserveAmount;
  const reserveAmountRaw =
    draftPaymentReserveAmount ??
    salePayload?.payment?.reserveAmount ??
    salePayload?.payment?.reservationAmount ??
    salePayload?.payment?.reserva ??
    salePayload?.payment?.deposit ??
    salePayload?.payment?.downPayment ??
    salePayload?.payment?.anticipo ??
    salePayload?.reserveAmount ??
    salePayload?.reservationAmount ??
    salePayload?.reserva ??
    salePayload?.deposit ??
    salePayload?.downPayment ??
    salePayload?.anticipo ??
    null;
  const reserveAmountNum =
    reserveAmountRaw === null || reserveAmountRaw === undefined
      ? null
      : Number(reserveAmountRaw);
  const hasReserva =
    draftPaymentHasReserve === true ||
    salePayload?.payment?.hasReserve === true ||
    ((reserveAmountNum !== null &&
      !Number.isNaN(reserveAmountNum) &&
      reserveAmountNum > 0) ||
      /reserva|apartado|señ?a|anticipo/i.test(salePaymentMode));

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
    paymentHasReserve:
      !!(
        salePayload?.payment?.hasReserve ||
        salePayload?.payment?.reserveAmount ||
        salePayload?.payment?.reservationAmount ||
        salePayload?.payment?.reserva ||
        salePayload?.payment?.deposit ||
        salePayload?.payment?.downPayment ||
        salePayload?.payment?.anticipo
      ) ||
      /reserva|apartado|señ?a|anticipo/i.test(
        String(salePayload?.payment?.mode || "").toLowerCase()
      ),
    paymentReserveAmount:
      (salePayload?.payment?.reserveAmount ??
        salePayload?.payment?.reservationAmount ??
        salePayload?.payment?.reserva ??
        salePayload?.payment?.deposit ??
        salePayload?.payment?.downPayment ??
        salePayload?.payment?.anticipo ??
        "") as any,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">
            {p.name || salePayload?.name || "Detalle del lead"}
          </h1>
          <div className="text-sm text-muted-foreground">
            Booking • ID: {record.id}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StageBadge stage={leadStageLabel} />
            {!!leadDispositionLabel && (
              <Badge variant="muted">Estado: {leadDispositionLabel}</Badge>
            )}
            <Badge variant="secondary" className="capitalize">
              Venta: {statusLabel}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/crm">Volver al CRM</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Datos básicos del contacto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{p.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{p.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{p.source || "booking"}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">
                    Registrado: {fmtDate(record.created_at || p.created_at)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del lead</CardTitle>
              <CardDescription>
                Etapa del pipeline + estado comercial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="lead-stage">Etapa</Label>
                  <select
                    id="lead-stage"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                    value={leadStatus}
                    disabled={stageSaving}
                    onChange={async (e) => {
                      const next = e.target.value;
                      setStageSaving(true);
                      try {
                        await updateMetadataPayload(String(record.id), {
                          status: next,
                        } as any);
                        toast({
                          title: "Etapa actualizada",
                          description: `Lead → ${next}`,
                        });
                        await load();
                      } catch (err: any) {
                        toast({
                          title: "Error",
                          description:
                            err?.message || "No se pudo actualizar la etapa",
                          variant: "destructive",
                        });
                      } finally {
                        setStageSaving(false);
                      }
                    }}
                  >
                    <option value="new">Nuevo</option>
                    <option value="contacted">Contactado</option>
                    <option value="qualified">Calificado</option>
                    <option value="won">Ganado</option>
                    <option value="lost">Perdido</option>
                  </select>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="lead-disposition">Estado comercial</Label>
                  <select
                    id="lead-disposition"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                    value={leadDisposition}
                    disabled={dispositionSaving}
                    onChange={async (e) => {
                      const next = e.target.value;
                      setDispositionSaving(true);
                      try {
                        await updateMetadataPayload(String(record.id), {
                          lead_disposition: next || null,
                        } as any);
                        toast({ title: "Estado guardado" });
                        await load();
                      } catch (err: any) {
                        toast({
                          title: "Error",
                          description: err?.message || "No se pudo guardar",
                          variant: "destructive",
                        });
                      } finally {
                        setDispositionSaving(false);
                      }
                    }}
                  >
                    <option value="">—</option>
                    <option value="interesado">Interesado</option>
                    <option value="reagendar">Reagendar</option>
                    <option value="no_responde">No responde</option>
                    <option value="no_califica">No califica</option>
                    <option value="no_interesado">No interesado</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Se guarda automáticamente.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <CallFlowManager
            recordId={record.id}
            payload={p}
            onSaved={() => load()}
          />

          <Card>
            <CardHeader>
              <CardTitle>Venta</CardTitle>
              <CardDescription>Cierre de venta dentro del lead</CardDescription>
              <CardAction>
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
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Pago con reserva: <span className="text-foreground">{hasReserva ? "Sí" : "No"}</span>
                {hasReserva ? (
                  <>
                    {" "}· Monto reserva: <span className="text-foreground">{String(reserveAmountRaw ?? "—")}</span>
                  </>
                ) : null}
              </div>
              <CloseSaleForm
                mode="edit"
                recordId={record.id}
                entity="booking"
                initial={initial}
                autoSave
                onChange={(f) => setDraft({ ...f })}
                onDone={() => {
                  load();
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
