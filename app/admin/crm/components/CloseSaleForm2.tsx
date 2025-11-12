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
import { updateMetadataPayload } from "@/app/admin/crm/api";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  paymentPlatform: PaymentPlatform;
  nextChargeDate?: string;
  contractThirdParty?: boolean;
  contractPartyName?: string;
  contractPartyEmail?: string;
  contractPartyPhone?: string;
  contractParties?: Array<{
    name?: string;
    email?: string;
    phone?: string;
  }>;
  notes?: string;
}

type Mode = "create" | "edit";

export function CloseSaleForm({
  onDone,
  initial,
  mode = "create",
  recordId,
  entity = "sale",
}: {
  onDone?: () => void;
  initial?: Partial<CloseSaleInput> & { status?: string };
  mode?: Mode;
  recordId?: string | number;
  entity?: "sale" | "booking";
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CloseSaleInput>({
    fullName: initial?.fullName || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    program: initial?.program || "",
    bonuses: (initial?.bonuses as string[] | undefined) || [],
    paymentMode: initial?.paymentMode || "",
    paymentAmount: initial?.paymentAmount || "",
    paymentPlatform: (initial?.paymentPlatform as PaymentPlatform) || "hotmart",
    nextChargeDate: initial?.nextChargeDate || "",
    contractThirdParty: !!initial?.contractThirdParty,
    contractPartyName: initial?.contractPartyName || initial?.fullName || "",
    contractPartyEmail: initial?.contractPartyEmail || initial?.email || "",
    contractPartyPhone: initial?.contractPartyPhone || initial?.phone || "",
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

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      fullName: initial?.fullName ?? prev.fullName,
      email: initial?.email ?? prev.email,
      phone: initial?.phone ?? prev.phone,
      program: initial?.program ?? prev.program,
      bonuses: (initial?.bonuses as string[] | undefined) ?? prev.bonuses,
      paymentMode: initial?.paymentMode ?? prev.paymentMode,
      paymentAmount: initial?.paymentAmount ?? prev.paymentAmount,
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
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial)]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.fullName ||
      !form.email ||
      !form.phone ||
      !form.program ||
      !form.paymentMode ||
      !form.paymentAmount
    ) {
      toast({ title: "Faltan campos obligatorios", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "edit" && recordId) {
        const closer = user
          ? {
              id: (user as any).id ?? user.email ?? user.name ?? "",
              name: user.name ?? "",
              email: user.email ?? "",
            }
          : null;
        const salePayload: any = {
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
            platform: form.paymentPlatform,
            nextChargeDate: form.nextChargeDate || null,
          },
          contract: {
            thirdParty: !!form.contractThirdParty,
            status: initial?.status || "pending",
            parties: Array.isArray(form.contractParties)
              ? form.contractParties
              : [],
            party: {
              name: form.contractPartyName || null,
              email: form.contractPartyEmail || null,
              phone: form.contractPartyPhone || null,
            },
          },
          status: initial?.status || "payment_verification_pending",
          notes: form.notes || null,
        };
        if (paymentProof?.dataUrl) {
          salePayload.payment.proof = {
            name: paymentProof.name,
            type: paymentProof.type,
            size: paymentProof.size,
            dataUrl: paymentProof.dataUrl,
          };
        }
        if (entity === "sale") {
          await updateMetadataPayload(String(recordId), salePayload as any);
        } else {
          await updateMetadataPayload(String(recordId), {
            sale: salePayload,
          } as any);
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
        onDone?.();
        setForm({
          fullName: "",
          email: "",
          phone: "",
          program: "",
          bonuses: [],
          paymentMode: "",
          paymentAmount: "",
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
  const BONUS_OPTIONS = [
    {
      value: "mentoria_1a1",
      label: "Mentoría 1:1",
      description: "Sesiones personalizadas con un mentor.",
    },
    {
      value: "grupo_vip",
      label: "Grupo VIP",
      description: "Acceso a comunidad cerrada y soporte prioritario.",
    },
    {
      value: "plantillas",
      label: "Plantillas",
      description: "Pack de plantillas listas para usar.",
    },
    {
      value: "acceso_anticipado",
      label: "Acceso anticipado",
      description: "Entradas tempranas a nuevos módulos y features.",
    },
    {
      value: "garantia_extendida",
      label: "Garantía extendida",
      description: "Período de garantía ampliado.",
    },
  ];

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
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo *</Label>
                  <Input
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
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Programa adquirido *</Label>
                  <Input
                    value={form.program}
                    onChange={(e) =>
                      setForm({ ...form, program: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bonos" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BONUS_OPTIONS.map((b) => {
                const selected = (form.bonuses || []).includes(b.value);
                return (
                  <Card
                    key={b.value}
                    className={
                      "p-3 cursor-pointer border transition-colors " +
                      (selected
                        ? "border-indigo-500 bg-indigo-50"
                        : "hover:bg-slate-50")
                    }
                    onClick={() => {
                      const cur = new Set(form.bonuses || []);
                      if (cur.has(b.value)) cur.delete(b.value);
                      else cur.add(b.value);
                      setForm({ ...form, bonuses: Array.from(cur) });
                    }}
                  >
                    <div className="font-medium text-sm">{b.label}</div>
                    <div className="text-xs text-slate-600">
                      {b.description}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="pago" className="m-0">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Modalidad de pago *</Label>
                  <Select
                    value={form.paymentMode}
                    onValueChange={(v) => setForm({ ...form, paymentMode: v })}
                  >
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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
                    value={form.nextChargeDate || ""}
                    onChange={(e) =>
                      setForm({ ...form, nextChargeDate: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Comprobante de pago (imagen)</Label>
                  <Input
                    type="file"
                    accept="image/*"
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
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="thirdParty"
                  type="checkbox"
                  checked={!!form.contractThirdParty}
                  onChange={(e) =>
                    setForm({ ...form, contractThirdParty: e.target.checked })
                  }
                />
                <Label htmlFor="thirdParty">
                  Contrato a nombre de otra persona
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Nombre para contrato</Label>
                  <Input
                    value={form.contractPartyName || ""}
                    onChange={(e) =>
                      setForm({ ...form, contractPartyName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Email para contrato</Label>
                  <Input
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
                    value={form.contractPartyPhone || ""}
                    onChange={(e) =>
                      setForm({ ...form, contractPartyPhone: e.target.value })
                    }
                  />
                </div>
              </div>

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
