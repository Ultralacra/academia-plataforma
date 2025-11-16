"use client";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Phone,
  Tags,
  Users,
  Calendar,
  MapPin,
  Loader2,
  Clock,
  Globe,
  AtSign,
  DollarSign,
} from "lucide-react";
import { crmService } from "@/lib/crm-service";
import { useAuth } from "@/hooks/use-auth";
import { getMetadata, listMetadata, type MetadataRecord } from "@/lib/metadata";
import { updateLead, updateMetadataPayload } from "../api";
import type { ProspectCore } from "@/lib/crm-types";
import { ProspectEditor } from "./ProspectEditor";
import { toast } from "@/components/ui/use-toast";
import { BONOS_BY_KEY } from "@/lib/bonos";

export function ProspectDetailDrawer({
  open,
  onOpenChange,
  prospectId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId?: string | null;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [core, setCore] = React.useState<ProspectCore | null>(null);
  const [meta, setMeta] = React.useState<MetadataRecord | null>(null);
  const { user } = useAuth();

  const load = React.useCallback(async () => {
    if (!prospectId) {
      setCore(null);
      setMeta(null);
      return;
    }
    // Primero intentamos cargar del mock crmService
    const p = crmService.getProspect(prospectId);
    if (p) {
      const coreLite: ProspectCore = {
        id: p.id,
        nombre: p.nombre,
        email: p.email,
        telefono: p.telefono,
        canalFuente: p.canalFuente,
        etapaPipeline: p.etapaPipeline,
        ownerId: p.ownerId,
        ownerNombre: p.ownerNombre,
        pais: p.pais,
        ciudad: p.ciudad,
        tags: p.tags,
        score: p.score,
        notasResumen: p.notasResumen,
        creadoAt: p.creadoAt,
        actualizadoAt: p.actualizadoAt,
        nextActionAt: p.nextActionAt,
        origenCampaignId: p.origenCampaignId,
        convertedStudentId: p.convertedStudentId,
        fechaConversion: p.fechaConversion,
      };
      setCore(coreLite);
      setMeta(null);
      return;
    }
    // Si no existe en mock, intentamos metadata: /v1/metadata/:codigo
    try {
      const m = await getMetadata(prospectId);
      setMeta(m as any);
      setCore(null);
      return;
    } catch {}
    // Fallback: listar todos y buscar por entity_id
    try {
      const all = await listMetadata();
      const found = (all.items || []).find(
        (r: any) => String(r?.entity_id) === String(prospectId)
      );
      if (found) {
        setMeta(found as any);
        setCore(null);
        return;
      }
    } catch {}
    setCore(null);
    setMeta(null);
  }, [prospectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <div className="flex flex-col h-full">
          <div className="border-b px-5 py-4 bg-white">
            <SheetHeader>
              <SheetTitle>Detalle de prospecto</SheetTitle>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
            {!core && !meta ? (
              <div className="text-sm text-slate-500">
                Sin datos para este ID.
              </div>
            ) : core ? (
              <>
                <div className="rounded-lg border p-4">
                  <div className="text-base font-semibold">{core.nombre}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {core.email || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {core.telefono || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-slate-400" />
                      {core.canalFuente || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      {core.ownerNombre || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {core.pais || "—"}{" "}
                      {core.ciudad ? ` · ${core.ciudad}` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Creado:{" "}
                      {core.creadoAt
                        ? new Date(core.creadoAt).toLocaleString("es-ES")
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium mb-2">
                    Editar prospecto
                  </div>
                  <ProspectEditor
                    prospect={core}
                    onSaved={() => {
                      load();
                      onSaved?.();
                    }}
                  />
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <div className="text-sm font-medium">Acciones rápidas</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.verifyPayment(core.id, true)) {
                          toast({ title: "Pago confirmado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Pago confirmado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (
                          crmService.sendContract(
                            core.id,
                            `https://sign.example.com/${core.id}`
                          )
                        ) {
                          toast({ title: "Contrato enviado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Enviar contrato
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.markContractSigned(core.id)) {
                          toast({ title: "Contrato firmado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Marcar firmado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.activateAccess(core.id, false)) {
                          toast({ title: "Acceso activado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Activar acceso
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.convertProspect(core.id)) {
                          toast({ title: "Convertido a alumno" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Convertir a alumno
                    </Button>
                  </div>
                </div>
              </>
            ) : meta ? (
              <>
                {(() => {
                  const p: any = (meta as any)?.payload || {};
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
                  const status = String(p.status || "new").toLowerCase();
                  const statusColor =
                    status === "won"
                      ? "bg-emerald-100 text-emerald-700"
                      : status === "lost"
                      ? "bg-rose-100 text-rose-700"
                      : status === "qualified"
                      ? "bg-amber-100 text-amber-700"
                      : status === "contacted"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-slate-100 text-slate-700";
                  const budget = p.monthlyBudget
                    ? String(p.monthlyBudget)
                    : null;
                  const scheduleDate = p.selectedDate
                    ? new Date(p.selectedDate)
                    : null;
                  const scheduleDateLabel = scheduleDate
                    ? scheduleDate.toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "—";

                  // Vista especializada para ventas (sale)
                  if (meta.entity === "sale") {
                    const pay = p.payment || {};
                    const contract = p.contract || {};
                    const onAction = async (type: string) => {
                      const ev = { type, at: new Date().toISOString() } as any;
                      let newStatus = p.status;
                      let patch: any = {};
                      if (type === "confirm_payment")
                        newStatus = "payment_confirmed";
                      if (type === "send_contract") {
                        newStatus = "contract_sent";
                        patch.contract = {
                          ...(p.contract || {}),
                          status: "sent",
                        };
                      }
                      if (type === "mark_signed") {
                        newStatus = "contract_signed";
                        patch.contract = {
                          ...(p.contract || {}),
                          status: "signed",
                        };
                      }
                      if (type === "activate_access") newStatus = "active";
                      if (type === "activate_provisional")
                        newStatus = "active_provisional";
                      if (type === "close_operational")
                        newStatus = "operational_closure";
                      const events = Array.isArray(p.events)
                        ? [...p.events, ev]
                        : [ev];
                      try {
                        await updateMetadataPayload(meta.id, {
                          ...patch,
                          status: newStatus,
                          events,
                        });
                        toast({ title: "Actualizado" });
                        await load();
                        onSaved?.();
                      } catch (e: any) {
                        toast({
                          title: "Error",
                          description: e?.message || String(e),
                          variant: "destructive",
                        });
                      }
                    };

                    return (
                      <>
                        <div className="rounded-lg border p-4">
                          <div className="flex items-center gap-2">
                            <div className="text-base font-semibold flex-1">
                              {p.name || meta.entity}
                            </div>
                            <Badge className="capitalize bg-slate-100 text-slate-700">
                              {String(p.status || "new")}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.open(
                                  `/admin/crm/sales/${encodeURIComponent(
                                    String(meta.id)
                                  )}`,
                                  "_blank"
                                );
                              }}
                            >
                              Abrir en página
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
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
                              <span className="truncate">
                                {p.program || "Programa"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="truncate">
                                Registrado:{" "}
                                {fmtDate(meta.created_at || p.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium mb-3">Pago</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>Monto: {pay.amount || "—"}</div>
                            <div>Modalidad: {pay.mode || "—"}</div>
                            <div>Plataforma: {pay.platform || "—"}</div>
                            <div>
                              Próximo cobro:{" "}
                              {pay.nextChargeDate
                                ? fmtDate(pay.nextChargeDate)
                                : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium mb-3">
                            Producto y bonos
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>Programa adquirido: {p.program || "—"}</div>
                            <div>
                              Bonos ofrecidos:{" "}
                              {(() => {
                                const list = Array.isArray(p.bonuses)
                                  ? (p.bonuses as string[])
                                  : p.bonuses
                                  ? String(p.bonuses)
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  : [];
                                if (!list || list.length === 0) return "—";
                                const labels = list.map(
                                  (k) => BONOS_BY_KEY[k]?.title || k
                                );
                                return labels.join(", ");
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium mb-3">
                            Contrato
                          </div>
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <input
                                  id="contract-third-party"
                                  type="checkbox"
                                  className="h-4 w-4"
                                  defaultChecked={!!p?.contract?.thirdParty}
                                  onChange={async (e) => {
                                    try {
                                      await updateMetadataPayload(meta.id, {
                                        contract: {
                                          ...(p.contract || {}),
                                          thirdParty: e.target.checked,
                                        },
                                      });
                                      toast({ title: "Guardado" });
                                      await load();
                                      onSaved?.();
                                    } catch (err: any) {
                                      toast({
                                        title: "Error",
                                        description:
                                          err?.message || String(err),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor="contract-third-party"
                                  className="cursor-pointer"
                                >
                                  Contrato a nombre de otra persona
                                </Label>
                              </div>
                              <div>Estado: {contract.status || "pending"}</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">
                                  Nombre para contrato
                                </div>
                                <Input
                                  placeholder="Nombre completo"
                                  defaultValue={p?.contract?.party?.name || ""}
                                  onBlur={async (e) => {
                                    try {
                                      await updateMetadataPayload(meta.id, {
                                        contract: {
                                          ...(p.contract || {}),
                                          party: {
                                            ...(p.contract?.party || {}),
                                            name: e.target.value || null,
                                          },
                                        },
                                      });
                                      toast({ title: "Guardado" });
                                    } catch (err: any) {
                                      toast({
                                        title: "Error",
                                        description:
                                          err?.message || String(err),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">
                                  Email para contrato
                                </div>
                                <Input
                                  type="email"
                                  placeholder="correo@ejemplo.com"
                                  defaultValue={p?.contract?.party?.email || ""}
                                  onBlur={async (e) => {
                                    try {
                                      await updateMetadataPayload(meta.id, {
                                        contract: {
                                          ...(p.contract || {}),
                                          party: {
                                            ...(p.contract?.party || {}),
                                            email: e.target.value || null,
                                          },
                                        },
                                      });
                                      toast({ title: "Guardado" });
                                    } catch (err: any) {
                                      toast({
                                        title: "Error",
                                        description:
                                          err?.message || String(err),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">
                                  Teléfono para contrato
                                </div>
                                <Input
                                  placeholder="+1 555 555 5555"
                                  defaultValue={p?.contract?.party?.phone || ""}
                                  onBlur={async (e) => {
                                    try {
                                      await updateMetadataPayload(meta.id, {
                                        contract: {
                                          ...(p.contract || {}),
                                          party: {
                                            ...(p.contract?.party || {}),
                                            phone: e.target.value || null,
                                          },
                                        },
                                      });
                                      toast({ title: "Guardado" });
                                    } catch (err: any) {
                                      toast({
                                        title: "Error",
                                        description:
                                          err?.message || String(err),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex items-end justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await updateMetadataPayload(meta.id, {
                                        contract: {
                                          ...(p.contract || {}),
                                          party: {
                                            name: p.name || null,
                                            email: p.email || null,
                                            phone: p.phone || null,
                                          },
                                        },
                                      });
                                      toast({
                                        title: "Copiado desde contacto",
                                      });
                                      await load();
                                      onSaved?.();
                                    } catch (err: any) {
                                      toast({
                                        title: "Error",
                                        description:
                                          err?.message || String(err),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Usar datos de contacto
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4 space-y-2">
                          <div className="text-sm font-medium">
                            Acciones rápidas
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction("confirm_payment")}
                            >
                              Pago confirmado
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction("send_contract")}
                            >
                              Enviar contrato
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction("mark_signed")}
                            >
                              Marcar firmado
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction("activate_access")}
                            >
                              Activar acceso
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction("activate_provisional")}
                            >
                              Activar provisional
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction("close_operational")}
                            >
                              Cierre operativo
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4 space-y-3">
                          <div className="text-sm font-medium">
                            Editar campos
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-slate-500 mb-1">
                                Próximo cobro
                              </div>
                              <input
                                type="date"
                                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                defaultValue={
                                  pay.nextChargeDate
                                    ? String(pay.nextChargeDate).slice(0, 10)
                                    : ""
                                }
                                onChange={async (e) => {
                                  const next = e.target.value;
                                  try {
                                    await updateMetadataPayload(meta.id, {
                                      payment: {
                                        ...pay,
                                        nextChargeDate: next || null,
                                      },
                                    });
                                    toast({ title: "Guardado" });
                                    await load();
                                    onSaved?.();
                                  } catch (err: any) {
                                    toast({
                                      title: "Error",
                                      description: err?.message || String(err),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-xs text-slate-500 mb-1">
                                Notas
                              </div>
                              <textarea
                                className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                defaultValue={p.notes || ""}
                                onBlur={async (e) => {
                                  const next = e.target.value;
                                  try {
                                    await updateMetadataPayload(meta.id, {
                                      notes: next || null,
                                    });
                                    toast({ title: "Guardado" });
                                    await load();
                                    onSaved?.();
                                  } catch (err: any) {
                                    toast({
                                      title: "Error",
                                      description: err?.message || String(err),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2">
                          <div className="text-base font-semibold flex-1">
                            {p.name || meta.entity}
                          </div>
                          <Badge className={statusColor + " capitalize"}>
                            {status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
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
                            <span className="truncate">
                              {p.source || meta.entity}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="truncate">
                              Registrado:{" "}
                              {fmtDate(meta.created_at || p.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="text-sm font-medium mb-3">Reserva</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>{scheduleDateLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span>
                              {p.selectedTime || "—"}
                              {p.timezone ? ` · ${p.timezone}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-slate-400" />
                            <span>
                              {p.countryFlag ? `${p.countryFlag} ` : ""}
                              {p.countryCode || ""}
                            </span>
                          </div>
                          {budget ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-slate-400" />
                              <span>Presupuesto mensual: {budget}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="text-sm font-medium mb-3">
                          Información adicional
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <AtSign className="h-4 w-4 text-slate-400" />
                            <span className="truncate">
                              {p.instagramUser || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Tags className="h-4 w-4 text-slate-400" />
                            <span className="truncate">
                              Confirmado: {String(p.confirmado ?? "—")}
                            </span>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Obstáculo principal
                            </div>
                            <div className="rounded bg-slate-50 p-2">
                              {p.mainObstacle || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Compromiso
                            </div>
                            <div className="rounded bg-slate-50 p-2">
                              {p.commitment || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Invitar a otros
                            </div>
                            <div className="rounded bg-slate-50 p-2">
                              {p.inviteOthers || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Mensajes
                            </div>
                            <div className="rounded bg-slate-50 p-2 whitespace-pre-wrap">
                              {p.textMessages || "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cierre de venta por lead */}
                      <div className="rounded-lg border p-4 space-y-3">
                        {(() => {
                          const sale = (p as any).sale || {};
                          const pay = sale.payment || {};
                          const contract = sale.contract || {};
                          const saleStatus = String(sale.status || "");
                          const saveSale = async (patch: any) => {
                            try {
                              await updateMetadataPayload(meta.id, {
                                sale: {
                                  ...sale,
                                  ...patch,
                                  updated_at: new Date().toISOString(),
                                },
                              });
                              toast({ title: "Guardado" });
                              await load();
                              onSaved?.();
                            } catch (err: any) {
                              toast({
                                title: "Error",
                                description: err?.message || String(err),
                                variant: "destructive",
                              });
                            }
                          };
                          const onAction = async (type: string) => {
                            const ev = {
                              type,
                              at: new Date().toISOString(),
                            } as any;
                            let newStatus =
                              sale.status || "payment_verification_pending";
                            let extra: any = {};
                            if (type === "confirm_payment")
                              newStatus = "payment_confirmed";
                            if (type === "send_contract") {
                              newStatus = "contract_sent";
                              extra.contract = {
                                ...(sale.contract || {}),
                                status: "sent",
                              };
                            }
                            if (type === "mark_signed") {
                              newStatus = "contract_signed";
                              extra.contract = {
                                ...(sale.contract || {}),
                                status: "signed",
                              };
                            }
                            if (type === "activate_access")
                              newStatus = "active";
                            if (type === "activate_provisional")
                              newStatus = "active_provisional";
                            if (type === "close_operational")
                              newStatus = "operational_closure";
                            const events = Array.isArray(sale.events)
                              ? [...sale.events, ev]
                              : [ev];
                            await saveSale({
                              ...extra,
                              status: newStatus,
                              events,
                            });
                          };
                          const assignCloser = async () => {
                            if (!user) return;
                            const closer = {
                              id:
                                (user as any)?.id ??
                                user.email ??
                                user.name ??
                                "",
                              name: user.name ?? "",
                              email: user.email ?? "",
                            };
                            await saveSale({ closer });
                          };
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
                                  Cierre de venta
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-slate-600">
                                    {saleStatus || "Sin cierre"}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      window.open(
                                        `/admin/crm/sales/${encodeURIComponent(
                                          String(meta.id)
                                        )}`,
                                        "_blank"
                                      );
                                    }}
                                  >
                                    Abrir en página
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Programa
                                  </div>
                                  <Input
                                    defaultValue={
                                      sale.program || p.program || ""
                                    }
                                    onBlur={(e) =>
                                      saveSale({
                                        program: e.target.value || null,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Bonos
                                  </div>
                                  <Input
                                    defaultValue={sale.bonuses || ""}
                                    onBlur={(e) =>
                                      saveSale({
                                        bonuses: e.target.value || null,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Monto
                                  </div>
                                  <Input
                                    defaultValue={pay.amount || ""}
                                    onBlur={(e) =>
                                      saveSale({
                                        payment: {
                                          ...pay,
                                          amount: e.target.value || null,
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Modalidad
                                  </div>
                                  <Input
                                    placeholder="Pago total / cuotas"
                                    defaultValue={pay.mode || ""}
                                    onBlur={(e) =>
                                      saveSale({
                                        payment: {
                                          ...pay,
                                          mode: e.target.value || null,
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Plataforma
                                  </div>
                                  <Input
                                    placeholder="Hotmart / PayPal / etc"
                                    defaultValue={pay.platform || ""}
                                    onBlur={(e) =>
                                      saveSale({
                                        payment: {
                                          ...pay,
                                          platform: e.target.value || null,
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Próximo cobro
                                  </div>
                                  <input
                                    type="date"
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    defaultValue={
                                      pay.nextChargeDate
                                        ? String(pay.nextChargeDate).slice(
                                            0,
                                            10
                                          )
                                        : ""
                                    }
                                    onChange={(e) =>
                                      saveSale({
                                        payment: {
                                          ...pay,
                                          nextChargeDate:
                                            e.target.value || null,
                                        },
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 mt-2">
                                  <input
                                    id="sale-third-party"
                                    type="checkbox"
                                    className="h-4 w-4"
                                    defaultChecked={!!contract?.thirdParty}
                                    onChange={(e) =>
                                      saveSale({
                                        contract: {
                                          ...contract,
                                          thirdParty: e.target.checked,
                                        },
                                      })
                                    }
                                  />
                                  <Label
                                    htmlFor="sale-third-party"
                                    className="cursor-pointer"
                                  >
                                    Contrato a nombre de otra persona
                                  </Label>
                                </div>
                                <div className="flex items-center justify-end mt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={assignCloser}
                                  >
                                    Asignarme como closer
                                  </Button>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Nombre firmante
                                  </div>
                                  <Input
                                    defaultValue={contract?.party?.name || ""}
                                    onBlur={(e) =>
                                      saveSale({
                                        contract: {
                                          ...contract,
                                          party: {
                                            ...(contract?.party || {}),
                                            name: e.target.value || null,
                                          },
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Email firmante
                                  </div>
                                  <Input
                                    type="email"
                                    defaultValue={contract?.party?.email || ""}
                                    onBlur={(e) =>
                                      saveSale({
                                        contract: {
                                          ...contract,
                                          party: {
                                            ...(contract?.party || {}),
                                            email: e.target.value || null,
                                          },
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">
                                    Teléfono firmante
                                  </div>
                                  <Input
                                    defaultValue={contract?.party?.phone || ""}
                                    onBlur={(e) =>
                                      saveSale({
                                        contract: {
                                          ...contract,
                                          party: {
                                            ...(contract?.party || {}),
                                            phone: e.target.value || null,
                                          },
                                        },
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onAction("confirm_payment")}
                                >
                                  Pago confirmado
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onAction("send_contract")}
                                >
                                  Enviar contrato
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onAction("mark_signed")}
                                >
                                  Marcar firmado
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onAction("activate_access")}
                                >
                                  Activar acceso
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    onAction("activate_provisional")
                                  }
                                >
                                  Activar provisional
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onAction("close_operational")}
                                >
                                  Cierre operativo
                                </Button>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {(p?.trace?.userAgent || p?.trace?.ts) && (
                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium mb-3">Trace</div>
                          <div className="space-y-2 text-sm">
                            <div>Closer: {p?.closer?.name || "—"}</div>
                            {p?.trace?.userAgent && (
                              <div className="text-slate-700 break-words">
                                <span className="text-xs text-slate-500 mr-2">
                                  User-Agent
                                </span>
                                {p.trace.userAgent}
                              </div>
                            )}
                            {p?.trace?.ts && (
                              <div className="text-slate-700">
                                <span className="text-xs text-slate-500 mr-2">
                                  TS
                                </span>
                                {fmtDate(new Date(p.trace.ts).toISOString())}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            try {
                              const data = JSON.stringify(
                                meta.payload,
                                null,
                                2
                              );
                              const blob = new Blob([data], {
                                type: "application/json",
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `metadata-${meta.id}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch {}
                          }}
                        >
                          Descargar JSON
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : null}
          </div>
          <div className="border-t px-5 py-3 bg-white flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
