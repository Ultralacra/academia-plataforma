"use client";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createMetadata } from "@/lib/metadata";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateLeadPatch, updateMetadataPayload } from "@/app/admin/crm/api";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
import { BONOS_CONTRACTUALES, BONOS_EXTRA } from "@/lib/bonos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Programa fijo de la oferta actual
const STATIC_PROGRAM = "Hotselling Lite";

export type PaymentPlatform =
  | "hotmart"
  | "paypal"
  | "binance"
  | "payoneer"
  | "zelle"
  | "bancolombia"
  | "boa"
  | "otra";

export interface CloseSaleInput {
  fullName: string;
  email: string;
  phone: string;
  program: string;
  bonuses?: string[];
  paymentMode: string;
  paymentAmount: string;
  paymentHasReserve?: boolean;
  paymentReserveAmount?: string;
  paymentPlatform: PaymentPlatform;
  nextChargeDate?: string;
  contractThirdParty?: boolean;
  contractIsCompany?: boolean;
  contractPartyName?: string;
  contractPartyEmail?: string;
  contractPartyPhone?: string;
  contractPartyAddress?: string;
  contractPartyCity?: string;
  contractPartyCountry?: string;
  contractCompanyName?: string;
  contractCompanyTaxId?: string;
  contractCompanyAddress?: string;
  contractCompanyCity?: string;
  contractCompanyCountry?: string;
  contractParties?: Array<{
    name?: string;
    email?: string;
    phone?: string;
  }>;
  notes?: string;
}

type Mode = "create" | "edit";

function toLeadIsoDateOrNull(v?: string | null) {
  if (!v) return null;
  const s = String(v);
  if (!s) return null;
  // YYYY-MM-DD -> ISO midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    try {
      return new Date(`${s}T00:00:00.000Z`).toISOString();
    } catch {
      return s;
    }
  }
  return s;
}

function salePayloadToLeadPatch(salePayload: any): Record<string, any> {
  const payment = salePayload?.payment ?? {};
  const contract = salePayload?.contract ?? {};
  const party = contract?.party ?? {};
  const company = contract?.company ?? {};
  const closer = salePayload?.closer ?? null;

  return {
    program: salePayload?.program ?? null,
    bonuses: Array.isArray(salePayload?.bonuses) ? salePayload.bonuses : [],

    payment_status: salePayload?.status ?? null,
    payment_mode: payment?.mode ?? null,
    payment_amount: payment?.amount ?? null,
    payment_platform: payment?.platform ?? null,
    next_charge_date: toLeadIsoDateOrNull(payment?.nextChargeDate ?? null),
    payment_has_reserve: payment?.hasReserve ? 1 : 0,
    payment_reserve_amount: payment?.hasReserve
      ? payment?.reserveAmount ?? null
      : null,

    sale_notes: salePayload?.notes ?? null,

    contract_status: contract?.status ?? null,
    contract_third_party: contract?.thirdParty ? 1 : 0,
    contract_is_company: contract?.isCompany ? 1 : 0,
    contract_parties: Array.isArray(contract?.parties) ? contract.parties : [],
    contract_party_address: party?.address ?? null,
    contract_party_city: party?.city ?? null,
    contract_party_country: party?.country ?? null,
    contract_company_name: company?.name ?? null,
    contract_company_tax_id: company?.taxId ?? null,
    contract_company_address: company?.address ?? null,
    contract_company_city: company?.city ?? null,
    contract_company_country: company?.country ?? null,

    closer_name: closer?.name ?? null,
  };
}

export function CloseSaleForm({
  onDone,
  onChange,
  initial,
  mode = "create",
  recordId,
  leadCodigo,
  entity = "sale",
  autoSave = false,
  autoSaveDelay = 600,
}: {
  onDone?: () => void;
  onChange?: (form: CloseSaleInput) => void;
  initial?: Partial<CloseSaleInput> & { status?: string };
  mode?: Mode;
  recordId?: string | number;
  leadCodigo?: string;
  entity?: "sale" | "booking";
  autoSave?: boolean;
  autoSaveDelay?: number;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CloseSaleInput>({
    fullName: initial?.fullName || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    program: STATIC_PROGRAM,
    bonuses: (initial?.bonuses as string[] | undefined) || [],
    paymentMode: initial?.paymentMode || "",
    paymentAmount: initial?.paymentAmount || "",
    paymentHasReserve: (initial as any)?.paymentHasReserve || false,
    paymentReserveAmount: (initial as any)?.paymentReserveAmount || "",
    paymentPlatform: (initial?.paymentPlatform as PaymentPlatform) || "hotmart",
    nextChargeDate: initial?.nextChargeDate || "",
    contractThirdParty: !!initial?.contractThirdParty,
    contractIsCompany: (initial as any)?.contractIsCompany || false,
    contractPartyName: initial?.contractPartyName || initial?.fullName || "",
    contractPartyEmail: initial?.contractPartyEmail || initial?.email || "",
    contractPartyPhone: initial?.contractPartyPhone || initial?.phone || "",
    contractPartyAddress: (initial as any)?.contractPartyAddress || "",
    contractPartyCity: (initial as any)?.contractPartyCity || "",
    contractPartyCountry: (initial as any)?.contractPartyCountry || "",
    contractCompanyName: (initial as any)?.contractCompanyName || "",
    contractCompanyTaxId: (initial as any)?.contractCompanyTaxId || "",
    contractCompanyAddress: (initial as any)?.contractCompanyAddress || "",
    contractCompanyCity: (initial as any)?.contractCompanyCity || "",
    contractCompanyCountry: (initial as any)?.contractCompanyCountry || "",
    contractParties:
      (initial?.contractParties as any) ||
      (initial?.contractPartyName || initial?.fullName
        ? [
            {
              name: initial?.contractPartyName || initial?.fullName,
              email: initial?.contractPartyEmail || initial?.email,
              phone: initial?.contractPartyPhone || initial?.phone,
            },
          ]
        : []),
    notes: initial?.notes || "",
  });

  const [paymentProof, setPaymentProof] = useState<{
    file?: File;
    dataUrl?: string;
    name?: string;
    type?: string;
    size?: number;
  } | null>(null);

  // Propagar cambios en vivo al padre para vista previa en tiempo real
  useEffect(() => {
    try {
      onChange?.(form);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form)]);

  // Helper para construir payload compatible con metadata
  const buildSalePayload = (withProof = true) => {
    const closer = user
      ? {
          id: (user as any).id ?? user.email ?? user.name ?? "",
          name: user.name ?? "",
          email: user.email ?? "",
        }
      : null;
    const p: any = {
      type: "sale",
      name: form.fullName,
      email: form.email,
      phone: form.phone,
      program: form.program,
      bonuses: form.bonuses || [],
      closer,
      payment: {
        mode: form.paymentMode,
        amount: form.paymentAmount,
        hasReserve: !!form.paymentHasReserve,
        reserveAmount: form.paymentHasReserve
          ? form.paymentReserveAmount || null
          : null,
        platform: form.paymentPlatform,
        nextChargeDate: form.nextChargeDate || null,
      },
      contract: {
        thirdParty: !!form.contractThirdParty,
        isCompany: !!form.contractIsCompany,
        status: "pending",
        parties: Array.isArray(form.contractParties)
          ? form.contractParties
          : [],
        party: {
          name: form.contractPartyName || null,
          email: form.contractPartyEmail || null,
          phone: form.contractPartyPhone || null,
          address: form.contractPartyAddress || null,
          city: form.contractPartyCity || null,
          country: form.contractPartyCountry || null,
        },
        company: form.contractIsCompany
          ? {
              name: form.contractCompanyName || null,
              taxId: form.contractCompanyTaxId || null,
              address: form.contractCompanyAddress || null,
              city: form.contractCompanyCity || null,
              country: form.contractCompanyCountry || null,
            }
          : null,
      },
      status: initial?.status || "payment_verification_pending",
      notes: form.notes || null,
    };
    if (withProof && paymentProof?.dataUrl) {
      p.payment.proof = {
        name: paymentProof.name,
        type: paymentProof.type,
        size: paymentProof.size,
        dataUrl: paymentProof.dataUrl,
      };
    }
    return p;
  };

  // Autosave: persistir cambios en modo edición sin recargar
  useEffect(() => {
    if (!autoSave) return;
    if (mode !== "edit") return;
    const handle = setTimeout(async () => {
      try {
        const salePayload = buildSalePayload(false);
        if (entity === "sale") {
          if (!recordId) return;
          await updateMetadataPayload(String(recordId), salePayload as any);
        } else {
          // booking: guardar dentro del lead (plano) vía /v1/leads/:codigo
          if (leadCodigo) {
            await updateLeadPatch(
              String(leadCodigo),
              salePayloadToLeadPatch(salePayload)
            );
          } else if (recordId) {
            // fallback legacy
            await updateMetadataPayload(String(recordId), {
              sale: salePayload,
            } as any);
          }
        }
      } catch (e) {
        // silencioso para no molestar al usuario mientras escribe
      }
    }, Math.max(200, autoSaveDelay || 600));
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, autoSaveDelay, mode, recordId, entity, JSON.stringify(form)]);

  useEffect(() => {
    // Evitar actualizaciones redundantes que puedan generar loops
    setForm((prev) => {
      const next: CloseSaleInput = {
        ...prev,
        fullName: initial?.fullName ?? prev.fullName,
        email: initial?.email ?? prev.email,
        phone: initial?.phone ?? prev.phone,
        // Programa siempre fijo a la oferta actual
        program: STATIC_PROGRAM,
        bonuses: (initial?.bonuses as string[] | undefined) ?? prev.bonuses,
        paymentMode: initial?.paymentMode ?? prev.paymentMode,
        paymentAmount: initial?.paymentAmount ?? prev.paymentAmount,
        paymentHasReserve:
          (initial as any)?.paymentHasReserve ?? prev.paymentHasReserve,
        paymentReserveAmount:
          (initial as any)?.paymentReserveAmount ?? prev.paymentReserveAmount,
        paymentPlatform:
          (initial?.paymentPlatform as PaymentPlatform) ?? prev.paymentPlatform,
        nextChargeDate: initial?.nextChargeDate ?? prev.nextChargeDate,
        contractThirdParty:
          initial?.contractThirdParty ?? prev.contractThirdParty,
        contractPartyName: initial?.contractPartyName ?? prev.contractPartyName,
        contractPartyEmail:
          initial?.contractPartyEmail ?? prev.contractPartyEmail,
        contractPartyPhone:
          initial?.contractPartyPhone ?? prev.contractPartyPhone,
        contractParties:
          (initial?.contractParties as any) ??
          prev.contractParties ??
          (initial?.contractPartyName || initial?.fullName
            ? [
                {
                  name: initial?.contractPartyName || initial?.fullName,
                  email: initial?.contractPartyEmail || initial?.email,
                  phone: initial?.contractPartyPhone || initial?.phone,
                },
              ]
            : []),
        notes: initial?.notes ?? prev.notes,
      };
      // Si nada cambió, devolver prev para no re-renderizar
      try {
        const a = JSON.stringify(prev);
        const b = JSON.stringify(next);
        if (a === b) return prev;
      } catch {}
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial)]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "edit" && (recordId || leadCodigo)) {
        const salePayload: any = buildSalePayload(true);
        if (entity === "sale") {
          if (!recordId)
            throw new Error("recordId requerido para editar una venta");
          await updateMetadataPayload(String(recordId), salePayload as any);
        } else {
          if (leadCodigo) {
            await updateLeadPatch(
              String(leadCodigo),
              salePayloadToLeadPatch(salePayload)
            );
          } else {
            // fallback legacy
            if (!recordId) throw new Error("leadCodigo o recordId requerido");
            await updateMetadataPayload(String(recordId), {
              sale: salePayload,
            } as any);
          }
        }
        toast({ title: "Venta actualizada" });
        onDone?.();
      } else {
        const entity_id =
          (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) ||
          `sale-${Date.now()}`;
        const payload: any = {
          type: "sale",
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          program: form.program,
          bonuses: form.bonuses || [],
          closer: user
            ? {
                id: (user as any).id ?? user.email ?? user.name ?? "",
                name: user.name ?? "",
                email: user.email ?? "",
              }
            : null,
          payment: {
            mode: form.paymentMode,
            amount: form.paymentAmount,
            platform: form.paymentPlatform,
            nextChargeDate: form.nextChargeDate || null,
          },
          contract: {
            thirdParty: !!form.contractThirdParty,
            status: "pending",
            parties: Array.isArray(form.contractParties)
              ? form.contractParties
              : [],
            party: {
              name: form.contractPartyName || null,
              email: form.contractPartyEmail || null,
              phone: form.contractPartyPhone || null,
            },
          },
          status: "payment_verification_pending",
          notes: form.notes || null,
          events: [
            {
              type: "created",
              at: new Date().toISOString(),
              trigger: "trigger#1",
              message: "Registro creado. Notificar ATC y Finanzas.",
            },
          ],
          created_at: new Date().toISOString(),
          trace: {
            userAgent:
              typeof window !== "undefined"
                ? window.navigator.userAgent
                : "server",
            ts: Date.now(),
          },
        };
        if (paymentProof?.dataUrl) {
          payload.payment.proof = {
            name: paymentProof.name,
            type: paymentProof.type,
            size: paymentProof.size,
            dataUrl: paymentProof.dataUrl,
          };
        }

        const saved = await createMetadata({
          entity: "sale",
          entity_id,
          payload,
        });
        const path = `/admin/crm/sales/${encodeURIComponent(String(saved.id))}`;
        toast({
          title: "Venta registrada",
          description: `ID: ${String(saved.id)} · URL: ${path}`,
        });
        try {
          // Abrir vista previa/edición en una nueva pestaña para verificación inmediata
          if (typeof window !== "undefined") window.open(path, "_blank");
        } catch {}
        onDone?.();
        setForm({
          fullName: "",
          email: "",
          phone: "",
          program: STATIC_PROGRAM,
          bonuses: [],
          paymentMode: "",
          paymentAmount: "",
          paymentHasReserve: false,
          paymentReserveAmount: "",
          paymentPlatform: "hotmart",
          nextChargeDate: "",
          contractThirdParty: false,
          contractPartyName: "",
          contractPartyEmail: "",
          contractPartyPhone: "",
          contractParties: [],
          notes: "",
        });
        setPaymentProof(null);
      }
    } catch (e: any) {
      toast({
        title: "Error al registrar venta",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = mode === "edit" ? "Guardar cambios" : "Registrar venta";
  // Paleta más neutra: remove azul y usa slate/neutral para inputs
  const inputAccent =
    "border-slate-300 focus-visible:ring-slate-200 focus-visible:border-slate-400";
  const selectAccent = "focus-visible:ring-slate-200";
  const PAYMENT_MODE_OPTIONS = [
    { value: "pago_total", label: "Pago total" },
    { value: "2_cuotas", label: "2 cuotas" },
    { value: "3_cuotas", label: "3 cuotas" },
    { value: "6_cuotas", label: "6 cuotas" },
    { value: "otro", label: "Otro" },
  ];
  const PAYMENT_PLATFORM_OPTIONS = [
    { value: "hotmart", label: "Hotmart" },
    { value: "paypal", label: "PayPal" },
    { value: "binance", label: "Binance" },
    { value: "payoneer", label: "Payoneer" },
    { value: "zelle", label: "Zelle" },
    { value: "bancolombia", label: "Bancolombia" },
    { value: "boa", label: "BoA" },
    { value: "otra", label: "Otra" },
  ];
  // Bonos centralizados (usamos las claves para persistir en metadata)

  // Toggle robusto para bonos, evitando updates innecesarios
  const toggleBonus = (key: string, forced?: boolean) => {
    setForm((prev) => {
      const current = new Set(prev.bonuses || []);
      const has = current.has(key);
      const shouldAdd = forced !== undefined ? forced : !has;
      if (shouldAdd && has) return prev; // sin cambios
      if (!shouldAdd && !has) return prev; // sin cambios
      if (shouldAdd) current.add(key);
      else current.delete(key);
      const next = { ...prev, bonuses: Array.from(current) } as CloseSaleInput;
      return next;
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Tabs defaultValue="datos" className="w-full">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="bonos">Bonos</TabsTrigger>
          <TabsTrigger value="pago">Pago</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="datos" className="m-0">
            <Card className="p-4 border-indigo-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo *</Label>
                  <Input
                    className={inputAccent}
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Correo *</Label>
                  <Input
                    type="email"
                    className={inputAccent}
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Teléfono *</Label>
                  <Input
                    className={inputAccent}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Programa (fijo)</Label>
                  <Input
                    className={inputAccent}
                    value={form.program}
                    readOnly
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Este programa es estático: Hotselling Lite
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bonos" className="m-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Selecciona los bonos ofrecidos a este lead.
                </div>
              </div>

              <section className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    Bonos contractuales
                    {form.bonuses && form.bonuses.length > 0
                      ? ` (${
                          form.bonuses.filter((k) =>
                            BONOS_CONTRACTUALES.some((b) => b.key === k)
                          ).length
                        })`
                      : ""}
                  </div>
                  <p className="text-xs text-slate-600">
                    Forman parte del contrato. Algunos son aplicables por única
                    vez.
                  </p>
                </div>
                <div className="space-y-3">
                  {BONOS_CONTRACTUALES.map((b) => {
                    const isSel = (form.bonuses || []).includes(b.key);
                    return (
                      <Card
                        key={b.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleBonus(b.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleBonus(b.key);
                          }
                        }}
                        className={`relative p-4 cursor-pointer transition-all border ${
                          isSel
                            ? "border-sky-400 bg-sky-50/60 ring-2 ring-sky-100"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={!!isSel}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              toggleBonus(b.key, e.target.checked)
                            }
                            aria-label={`Seleccionar ${b.title}`}
                            className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-300"
                          />
                          <div className="space-y-1 pr-8">
                            <div className="text-sm font-medium text-slate-900">
                              {b.title}
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                              {b.description}
                            </div>
                          </div>
                        </div>
                        {isSel && (
                          <div className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    Bonos extra
                    {form.bonuses && form.bonuses.length > 0
                      ? ` (${
                          form.bonuses.filter((k) =>
                            BONOS_EXTRA.some((b) => b.key === k)
                          ).length
                        })`
                      : ""}
                  </div>
                  <p className="text-xs text-slate-600">
                    Se solicitan fuera de las cláusulas contractuales. Requieren
                    pago y acuerdo mutuo.
                  </p>
                </div>
                <div className="space-y-3">
                  {BONOS_EXTRA.map((b) => {
                    const isSel = (form.bonuses || []).includes(b.key);
                    return (
                      <Card
                        key={b.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleBonus(b.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleBonus(b.key);
                          }
                        }}
                        className={`relative p-4 cursor-pointer transition-all border ${
                          isSel
                            ? "border-sky-400 bg-sky-50/60 ring-2 ring-sky-100"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={!!isSel}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              toggleBonus(b.key, e.target.checked)
                            }
                            aria-label={`Seleccionar ${b.title}`}
                            className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-300"
                          />
                          <div className="space-y-1 pr-8">
                            <div className="text-sm font-medium text-slate-900">
                              {b.title}
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                              {b.description}
                            </div>
                          </div>
                        </div>
                        {isSel && (
                          <div className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="pago" className="m-0">
            <Card className="p-4 border-indigo-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Modalidad de pago *</Label>
                  <Select
                    value={form.paymentMode}
                    onValueChange={(v) => setForm({ ...form, paymentMode: v })}
                  >
                    <SelectTrigger className={`w-full ${selectAccent}`}>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Monto de pago (USD) *</Label>
                  <Input
                    placeholder="$"
                    className={inputAccent}
                    value={form.paymentAmount}
                    onChange={(e) =>
                      setForm({ ...form, paymentAmount: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Plataforma de pago *</Label>
                  <Select
                    value={form.paymentPlatform}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        paymentPlatform: v as PaymentPlatform,
                      })
                    }
                  >
                    <SelectTrigger className={`w-full ${selectAccent}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_PLATFORM_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label>Fecha prevista de cobro futuro</Label>
                  <Input
                    type="date"
                    className={inputAccent}
                    value={form.nextChargeDate || ""}
                    onChange={(e) =>
                      setForm({ ...form, nextChargeDate: e.target.value })
                    }
                  />
                </div>

                <div className="md:col-span-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!!form.paymentHasReserve}
                      onCheckedChange={(v) => {
                        const checked = v === true;
                        setForm({
                          ...form,
                          paymentHasReserve: checked,
                          paymentReserveAmount: checked
                            ? form.paymentReserveAmount
                            : "",
                        });
                      }}
                      id="paymentHasReserve"
                    />
                    <Label htmlFor="paymentHasReserve">
                      ¿Pago con reserva?
                    </Label>
                  </div>
                  {form.paymentHasReserve ? (
                    <div className="mt-2 max-w-xs">
                      <Label>Monto de reserva (USD)</Label>
                      <Input
                        placeholder="$"
                        className={inputAccent}
                        value={form.paymentReserveAmount || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            paymentReserveAmount: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : null}
                </div>

                <div className="md:col-span-3">
                  <Label>Comprobante de pago (imagen)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className={inputAccent}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return setPaymentProof(null);
                      const reader = new FileReader();
                      reader.onload = () => {
                        setPaymentProof({
                          file,
                          dataUrl: String(reader.result || ""),
                          name: file.name,
                          type: file.type,
                          size: file.size,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {paymentProof?.dataUrl ? (
                    <div className="mt-2 space-y-2">
                      <img
                        src={paymentProof.dataUrl}
                        alt="Comprobante"
                        className="max-h-40 rounded border"
                      />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPaymentProof(null)}
                        >
                          Quitar comprobante
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contrato" className="m-0">
            <Card className="p-4 space-y-4 border-indigo-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="thirdParty"
                    type="checkbox"
                    checked={!!form.contractThirdParty}
                    onChange={(e) =>
                      setForm({ ...form, contractThirdParty: e.target.checked })
                    }
                  />
                  <Label htmlFor="thirdParty" className="select-none">
                    Contrato a nombre de otra persona
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="isCompany"
                    type="checkbox"
                    checked={!!form.contractIsCompany}
                    onChange={(e) =>
                      setForm({ ...form, contractIsCompany: e.target.checked })
                    }
                  />
                  <Label htmlFor="isCompany" className="select-none">
                    El contratante es una empresa
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Nombre para contrato</Label>
                  <Input
                    className={inputAccent}
                    value={form.contractPartyName || ""}
                    onChange={(e) =>
                      setForm({ ...form, contractPartyName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Email para contrato</Label>
                  <Input
                    className={inputAccent}
                    type="email"
                    value={form.contractPartyEmail || ""}
                    onChange={(e) =>
                      setForm({ ...form, contractPartyEmail: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Teléfono para contrato</Label>
                  <Input
                    className={inputAccent}
                    value={form.contractPartyPhone || ""}
                    onChange={(e) =>
                      setForm({ ...form, contractPartyPhone: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      className={inputAccent}
                      value={form.contractPartyAddress || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contractPartyAddress: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <Input
                      className={inputAccent}
                      value={form.contractPartyCity || ""}
                      onChange={(e) =>
                        setForm({ ...form, contractPartyCity: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>País</Label>
                    <Input
                      className={inputAccent}
                      value={form.contractPartyCountry || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contractPartyCountry: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {form.contractIsCompany ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Datos de la empresa</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Razón social</Label>
                      <Input
                        className={inputAccent}
                        value={form.contractCompanyName || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            contractCompanyName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>RUC/NIT</Label>
                      <Input
                        className={inputAccent}
                        value={form.contractCompanyTaxId || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            contractCompanyTaxId: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Dirección fiscal</Label>
                        <Input
                          className={inputAccent}
                          value={form.contractCompanyAddress || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              contractCompanyAddress: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Ciudad</Label>
                        <Input
                          className={inputAccent}
                          value={form.contractCompanyCity || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              contractCompanyCity: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>País</Label>
                        <Input
                          className={inputAccent}
                          value={form.contractCompanyCountry || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              contractCompanyCountry: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {(form.contractParties || []).map((party, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium">
                        Persona #{idx + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        {idx === 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                contractParties: [
                                  {
                                    name: prev.fullName,
                                    email: prev.email,
                                    phone: prev.phone,
                                  },
                                  ...((prev.contractParties || []).slice(
                                    1
                                  ) as any),
                                ],
                              }))
                            }
                          >
                            Usar datos de contacto
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const next = [...(form.contractParties || [])];
                            next.splice(idx, 1);
                            setForm({ ...form, contractParties: next });
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Nombre</Label>
                        <Input
                          className={inputAccent}
                          value={party.name || ""}
                          onChange={(e) => {
                            const next = [...(form.contractParties || [])];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setForm({ ...form, contractParties: next });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          className={inputAccent}
                          type="email"
                          value={party.email || ""}
                          onChange={(e) => {
                            const next = [...(form.contractParties || [])];
                            next[idx] = { ...next[idx], email: e.target.value };
                            setForm({ ...form, contractParties: next });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <Input
                          className={inputAccent}
                          value={party.phone || ""}
                          onChange={(e) => {
                            const next = [...(form.contractParties || [])];
                            next[idx] = { ...next[idx], phone: e.target.value };
                            setForm({ ...form, contractParties: next });
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        contractParties: [
                          ...(prev.contractParties || []),
                          { name: "", email: "", phone: "" },
                        ],
                      }))
                    }
                  >
                    Agregar persona
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notas" className="m-0">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Notas</Label>
                <Textarea
                  className={inputAccent}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
