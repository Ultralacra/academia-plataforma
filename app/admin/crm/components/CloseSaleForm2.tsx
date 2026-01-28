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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Producto por defecto (si el lead no trae uno)
const STATIC_PROGRAM = "HOTSELLING PRO";

type PaymentPlanType = "contado" | "cuotas" | "excepcion_2_cuotas" | "reserva";
type PaymentPricingPreset = "lista" | "descuento";

type PaymentCustomInstallment = {
  id: string;
  amount: string;
  dueDate: string; // YYYY-MM-DD
};

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
  paymentPaidAmount?: string;
  paymentPlanType?: PaymentPlanType;
  paymentPricingPreset?: PaymentPricingPreset;
  paymentInstallmentsCount?: number;
  paymentInstallmentAmount?: string;
  paymentInstallmentsSchedule?: PaymentCustomInstallment[];
  paymentFirstInstallmentAmount?: string;
  paymentSecondInstallmentAmount?: string;
  paymentSecondInstallmentDate?: string; // YYYY-MM-DD
  paymentCustomInstallments?: PaymentCustomInstallment[];
  paymentExceptionNotes?: string;

  reservePaidDate?: string; // YYYY-MM-DD
  reserveRemainingDueDate?: string; // YYYY-MM-DD
  reserveNotes?: string;

  paymentAttachments?: Array<{
    id: string;
    name?: string;
    type?: string;
    size?: number;
    dataUrl: string;
    created_at: string;
  }>;
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

function inferProgramKey(program?: string | null) {
  const v = String(program ?? "")
    .trim()
    .toLowerCase();
  if (v.includes("foundation")) return "FOUNDATION" as const;
  if (v.includes("pro")) return "PRO" as const;
  return "UNKNOWN" as const;
}

const PRODUCT_OPTIONS = [
  { value: "HOTSELLING PRO", label: "HOTSELLING PRO" },
  { value: "HOTSELLING FOUNDATION", label: "HOTSELLING FOUNDATION" },
] as const;

const PRICING = {
  PRO: {
    list: { total: 5000, installments: { count: 3, amount: 1800 } },
    discount: { cashTotal: 3990, installments: { count: 3, amount: 1600 } },
  },
  FOUNDATION: {
    list: { total: 2000, installments: { count: 2, amount: 1100 } },
    discount: { cashTotal: 1500, installments: { count: 2, amount: 825 } },
  },
} as const;

function isoPlusDays(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function isoDatePlusDays(baseIsoDate: string, days: number) {
  const base = String(baseIsoDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return isoPlusDays(days);
  try {
    const d = new Date(`${base}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return isoPlusDays(days);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return isoPlusDays(days);
  }
}

function normalizeInstallmentsSchedule(
  input: unknown,
): PaymentCustomInstallment[] {
  if (!Array.isArray(input)) return [];
  return (input as any[])
    .map((it: any, idx: number) => ({
      id: String(it?.id || `si_${idx}`),
      amount: String(it?.amount ?? ""),
      dueDate: String(it?.dueDate ?? it?.due_date ?? ""),
    }))
    .filter(Boolean);
}

function buildStandardScheduleFromCount(
  prev: PaymentCustomInstallment[],
  count: number,
  amount: string,
) {
  const safeCount = Math.max(1, Math.min(24, Number(count) || 1));
  const base = Array.isArray(prev) ? prev : [];
  const next: PaymentCustomInstallment[] = [];

  for (let i = 0; i < safeCount; i++) {
    const existing = base[i];
    if (existing) {
      next.push({
        id: existing.id,
        amount:
          i === 0
            ? String(existing.amount ?? amount)
            : String(existing.amount ?? amount),
        dueDate: String(existing.dueDate || ""),
      });
      continue;
    }

    const lastDate = next.length
      ? String(next[next.length - 1]?.dueDate || "")
      : "";
    const dueDate = lastDate
      ? isoDatePlusDays(lastDate, 30)
      : isoPlusDays(i * 30);
    next.push({
      id: `si_${Date.now()}_${i}`,
      amount: String(amount || ""),
      dueDate,
    });
  }

  return next;
}

function toNumberOrNull(v?: string | null) {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function salePayloadToLeadPatch(salePayload: any): Record<string, any> {
  const payment = salePayload?.payment ?? {};
  const contract = salePayload?.contract ?? {};
  const party = contract?.party ?? {};
  const company = contract?.company ?? {};
  const closer = salePayload?.closer ?? null;

  return {
    // También persistimos datos básicos del lead si se editaron desde este formulario.
    name: salePayload?.name ?? null,
    email: salePayload?.email ?? null,
    phone: salePayload?.phone ?? null,

    program: salePayload?.program ?? null,
    bonuses: Array.isArray(salePayload?.bonuses) ? salePayload.bonuses : [],

    payment_status: salePayload?.status ?? null,
    payment_mode: payment?.mode ?? null,
    payment_amount: payment?.amount ?? null,
    payment_platform: payment?.platform ?? null,
    next_charge_date: toLeadIsoDateOrNull(payment?.nextChargeDate ?? null),
    payment_has_reserve: payment?.hasReserve ? 1 : 0,
    payment_reserve_amount: payment?.hasReserve
      ? (payment?.reserveAmount ?? null)
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
  onSalePayloadChange,
  initial,
  mode = "create",
  recordId,
  leadCodigo,
  entity = "sale",
  autoSave = false,
  autoSaveDelay = 600,
  persistMode = "api",
}: {
  onDone?: () => void;
  onChange?: (form: CloseSaleInput) => void;
  onSalePayloadChange?: (payload: any) => void;
  initial?: Partial<CloseSaleInput> & { status?: string };
  mode?: Mode;
  recordId?: string | number;
  leadCodigo?: string;
  entity?: "sale" | "booking";
  autoSave?: boolean;
  autoSaveDelay?: number;
  persistMode?: "api" | "local";
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const inferredInitialPlanType: PaymentPlanType = (() => {
    const explicit = (initial as any)?.paymentPlanType as
      | PaymentPlanType
      | undefined;
    if (explicit) return explicit;
    const m = String(initial?.paymentMode ?? "").toLowerCase();
    if ((initial as any)?.paymentHasReserve) return "reserva";
    if (m.includes("excepcion")) return "excepcion_2_cuotas";
    if (m.includes("cuota") || m.includes("cuotas") || /\b\d+_cuotas\b/.test(m))
      return "cuotas";
    return "contado";
  })();

  const initialCustomInstallments: PaymentCustomInstallment[] = (() => {
    const raw = (initial as any)?.paymentCustomInstallments;
    if (Array.isArray(raw) && raw.length) {
      return raw
        .map((it: any, idx: number) => ({
          id: String(it?.id || `ci_${idx}_${Date.now()}`),
          amount: String(it?.amount ?? ""),
          dueDate: String(it?.dueDate ?? ""),
        }))
        .filter(Boolean);
    }

    if (inferredInitialPlanType !== "excepcion_2_cuotas") return [];

    const first = String(
      (initial as any)?.paymentFirstInstallmentAmount ?? "",
    ).trim();
    const second = String(
      (initial as any)?.paymentSecondInstallmentAmount ?? "",
    ).trim();
    const secondDate = String(
      (initial as any)?.paymentSecondInstallmentDate ?? "",
    ).trim();

    return [
      {
        id: `ci_0_${Date.now()}`,
        amount: first || "",
        dueDate: isoPlusDays(0),
      },
      {
        id: `ci_1_${Date.now()}`,
        amount: second || "",
        dueDate: secondDate || isoPlusDays(30),
      },
    ];
  })();

  const initialInstallmentsSchedule: PaymentCustomInstallment[] = (() => {
    const raw = (initial as any)?.paymentInstallmentsSchedule;
    const parsed = normalizeInstallmentsSchedule(raw);
    if (parsed.length) return parsed;

    if (inferredInitialPlanType !== "cuotas") return [];

    const cnt = Number((initial as any)?.paymentInstallmentsCount ?? 0) || 0;
    const amt = String((initial as any)?.paymentInstallmentAmount ?? "");
    const safeCount = cnt > 0 ? cnt : 0;
    if (!safeCount) return [];
    return Array.from({ length: Math.max(1, safeCount) }).map((_, idx) => ({
      id: `si_${idx}`,
      amount: String(amt || ""),
      dueDate: isoPlusDays(idx * 30),
    }));
  })();

  const [form, setForm] = useState<CloseSaleInput>({
    fullName: initial?.fullName || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    program: initial?.program || STATIC_PROGRAM,
    bonuses: (initial?.bonuses as string[] | undefined) || [],
    paymentMode: initial?.paymentMode || "",
    paymentAmount: initial?.paymentAmount || "",
    paymentPaidAmount: (initial as any)?.paymentPaidAmount || "",
    paymentPlanType: inferredInitialPlanType,
    paymentPricingPreset:
      ((initial as any)?.paymentPricingPreset as PaymentPricingPreset) ||
      "descuento",
    paymentInstallmentsCount: (initial as any)?.paymentInstallmentsCount,
    paymentInstallmentAmount: (initial as any)?.paymentInstallmentAmount,
    paymentInstallmentsSchedule: initialInstallmentsSchedule,
    paymentFirstInstallmentAmount: (initial as any)
      ?.paymentFirstInstallmentAmount,
    paymentSecondInstallmentAmount: (initial as any)
      ?.paymentSecondInstallmentAmount,
    paymentSecondInstallmentDate: (initial as any)
      ?.paymentSecondInstallmentDate,
    paymentCustomInstallments: initialCustomInstallments,
    paymentExceptionNotes: (initial as any)?.paymentExceptionNotes || "",
    reservePaidDate: (initial as any)?.reservePaidDate,
    reserveRemainingDueDate: (initial as any)?.reserveRemainingDueDate,
    reserveNotes: (initial as any)?.reserveNotes || "",
    paymentAttachments: Array.isArray((initial as any)?.paymentAttachments)
      ? ((initial as any).paymentAttachments as any)
      : [],
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

  const [productConfigOpen, setProductConfigOpen] = useState(false);
  const [productConfigValue, setProductConfigValue] = useState<string>(
    String(form.program || STATIC_PROGRAM),
  );

  // Propagar cambios en vivo al padre para vista previa en tiempo real
  useEffect(() => {
    try {
      onChange?.(form);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form)]);

  // Helper para construir payload compatible con metadata
  const buildSalePayload = () => {
    const closer = user
      ? {
          id: (user as any).id ?? user.email ?? user.name ?? "",
          name: user.name ?? "",
          email: user.email ?? "",
        }
      : null;

    const programKey = inferProgramKey(form.program);
    const pricing =
      programKey === "PRO"
        ? PRICING.PRO
        : programKey === "FOUNDATION"
          ? PRICING.FOUNDATION
          : null;

    const planType: PaymentPlanType =
      (form.paymentPlanType as PaymentPlanType | undefined) ?? "contado";

    const installmentsScheduleUi = normalizeInstallmentsSchedule(
      (form as any).paymentInstallmentsSchedule,
    );
    const installmentsSchedule = installmentsScheduleUi
      .map((it, idx) => ({
        index: idx + 1,
        amount: String(it.amount || ""),
        due_date: String(it.dueDate || ""),
      }))
      .filter((it) => {
        const n = toNumberOrNull(it.amount);
        return n !== null || Boolean(it.due_date);
      });

    const customInstallmentsUi: PaymentCustomInstallment[] = Array.isArray(
      (form as any).paymentCustomInstallments,
    )
      ? (((form as any).paymentCustomInstallments as any[]) || [])
          .map((it: any, idx: number) => ({
            id: String(it?.id || `ci_${idx}`),
            amount: String(it?.amount ?? ""),
            dueDate: String(it?.dueDate ?? ""),
          }))
          .filter(Boolean)
      : [];

    const customInstallments = customInstallmentsUi
      .map((it, idx) => ({
        index: idx + 1,
        amount: String(it.amount || ""),
        due_date: String(it.dueDate || ""),
      }))
      .filter((it) => {
        const n = toNumberOrNull(it.amount);
        return n !== null || Boolean(it.due_date);
      });

    const defaultInstallments = pricing?.discount.installments;
    const defaultCashTotal = pricing?.discount.cashTotal;
    const defaultInstallmentsTotal =
      defaultInstallments &&
      defaultInstallments.count &&
      defaultInstallments.amount
        ? defaultInstallments.count * defaultInstallments.amount
        : null;

    const installmentsCount =
      planType === "cuotas"
        ? Number(
            form.paymentInstallmentsCount ?? defaultInstallments?.count ?? 0,
          )
        : planType === "excepcion_2_cuotas"
          ? Math.max(2, customInstallmentsUi.length || 2)
          : 0;
    const installmentAmount =
      planType === "cuotas"
        ? String(
            form.paymentInstallmentAmount ?? defaultInstallments?.amount ?? "",
          )
        : "";

    const firstAmountNum = toNumberOrNull(form.paymentFirstInstallmentAmount);
    const secondAmountNum = toNumberOrNull(form.paymentSecondInstallmentAmount);

    const computedTotalCommitted = (() => {
      if (planType === "contado") {
        return String(form.paymentAmount || defaultCashTotal || "");
      }
      if (planType === "cuotas") {
        if (installmentsSchedule.length) {
          const sum = installmentsSchedule.reduce((acc, it) => {
            const n = toNumberOrNull(it.amount);
            return acc + (n ?? 0);
          }, 0);
          if (Number.isFinite(sum) && sum > 0) return String(sum);
        }
        const a = toNumberOrNull(installmentAmount);
        if (a !== null && installmentsCount > 0)
          return String(a * installmentsCount);
        return String(form.paymentAmount || defaultInstallmentsTotal || "");
      }
      if (planType === "excepcion_2_cuotas") {
        if (customInstallments.length) {
          const sum = customInstallments.reduce((acc, it) => {
            const n = toNumberOrNull(it.amount);
            return acc + (n ?? 0);
          }, 0);
          if (Number.isFinite(sum) && sum > 0) return String(sum);
        }
        if (firstAmountNum !== null && secondAmountNum !== null)
          return String(firstAmountNum + secondAmountNum);
        return String(form.paymentAmount || defaultCashTotal || "");
      }
      // reserva
      return String(form.paymentAmount || defaultCashTotal || "");
    })();

    const computedPaidAmount = (() => {
      if (String(form.paymentPaidAmount || "").trim())
        return String(form.paymentPaidAmount);
      if (planType === "excepcion_2_cuotas")
        return String(
          customInstallmentsUi?.[0]?.amount ??
            form.paymentFirstInstallmentAmount ??
            "",
        );
      if (planType === "reserva")
        return String(form.paymentReserveAmount || "");
      if (planType === "contado") return computedTotalCommitted;
      return "";
    })();

    const computedPaymentMode = (() => {
      if (planType === "contado") return "pago_total";
      if (planType === "cuotas") return `${installmentsCount}_cuotas`;
      if (planType === "excepcion_2_cuotas")
        return installmentsCount === 2
          ? "excepcion_2_cuotas"
          : `excepcion_${installmentsCount}_cuotas`;
      return "reserva";
    })();

    const planEntry = (() => {
      if (planType === "contado") {
        return {
          type: "contado" as const,
          total: computedTotalCommitted || null,
          paid_amount: computedPaidAmount || null,
        };
      }
      if (planType === "cuotas") {
        return {
          type: "cuotas" as const,
          installments: {
            count: installmentsCount,
            amount: installmentAmount || null,
            period_days: 30,
            next_due_date: form.paymentSecondInstallmentDate || isoPlusDays(30),
            schedule: installmentsSchedule.length ? installmentsSchedule : null,
          },
          total: computedTotalCommitted || null,
          paid_amount: computedPaidAmount || null,
        };
      }
      if (planType === "excepcion_2_cuotas") {
        const firstUi = customInstallmentsUi?.[0];
        const secondUi = customInstallmentsUi?.[1];
        return {
          type: "excepcion_2_cuotas" as const,
          first_amount:
            firstUi?.amount || form.paymentFirstInstallmentAmount || null,
          second_amount:
            secondUi?.amount || form.paymentSecondInstallmentAmount || null,
          second_due_date:
            secondUi?.dueDate || form.paymentSecondInstallmentDate || null,
          custom_installments: customInstallments.length
            ? customInstallments
            : null,
          notes: form.paymentExceptionNotes || null,
          total: computedTotalCommitted || null,
          paid_amount: computedPaidAmount || null,
        };
      }
      return {
        type: "reserva" as const,
        reserve: {
          amount: form.paymentReserveAmount || null,
          paid_date: form.reservePaidDate || null,
          remaining_due_date: form.reserveRemainingDueDate || null,
          notes: form.reserveNotes || null,
        },
        total: computedTotalCommitted || null,
        paid_amount: computedPaidAmount || null,
      };
    })();

    const p: any = {
      type: "sale",
      name: form.fullName,
      email: form.email,
      phone: form.phone,
      program: form.program,
      bonuses: form.bonuses || [],
      closer,
      payment: {
        // Nuevo: array de configuraciones por tipo (para ordenar y soportar múltiples ejemplos)
        plans: [planEntry],

        // Compatibilidad: mantenemos los campos previos (el backend puede migrar cuando quiera)
        plan_type: planType,
        mode: computedPaymentMode,
        amount: computedTotalCommitted,
        paid_amount: computedPaidAmount || null,
        installments:
          planType === "cuotas"
            ? {
                count: installmentsCount,
                amount: installmentAmount || null,
                period_days: 30,
                next_due_date:
                  form.paymentSecondInstallmentDate || isoPlusDays(30),
                schedule: installmentsSchedule.length
                  ? installmentsSchedule
                  : null,
              }
            : null,
        installments_schedule:
          planType === "cuotas" && installmentsSchedule.length
            ? installmentsSchedule
            : null,
        exception_2_installments:
          planType === "excepcion_2_cuotas"
            ? {
                first_amount:
                  customInstallmentsUi?.[0]?.amount ||
                  form.paymentFirstInstallmentAmount ||
                  null,
                second_amount:
                  customInstallmentsUi?.[1]?.amount ||
                  form.paymentSecondInstallmentAmount ||
                  null,
                second_due_date:
                  customInstallmentsUi?.[1]?.dueDate ||
                  form.paymentSecondInstallmentDate ||
                  null,
                notes: form.paymentExceptionNotes || null,
              }
            : null,
        custom_installments:
          planType === "excepcion_2_cuotas" && customInstallments.length
            ? customInstallments
            : null,
        reserve:
          planType === "reserva"
            ? {
                amount: form.paymentReserveAmount || null,
                paid_date: form.reservePaidDate || null,
                remaining_due_date: form.reserveRemainingDueDate || null,
                notes: form.reserveNotes || null,
              }
            : null,
        attachments: Array.isArray(form.paymentAttachments)
          ? form.paymentAttachments
          : [],
        hasReserve: planType === "reserva" || !!form.paymentHasReserve,
        reserveAmount:
          planType === "reserva" || form.paymentHasReserve
            ? form.paymentReserveAmount || null
            : null,
        platform: form.paymentPlatform,
        nextChargeDate:
          planType === "excepcion_2_cuotas"
            ? customInstallmentsUi?.[1]?.dueDate ||
              form.paymentSecondInstallmentDate ||
              null
            : planType === "cuotas"
              ? form.paymentSecondInstallmentDate || isoPlusDays(30)
              : form.nextChargeDate || null,
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
    return p;
  };

  useEffect(() => {
    try {
      onSalePayloadChange?.(buildSalePayload());
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form)]);

  // Autosave: persistir cambios en modo edición sin recargar
  useEffect(() => {
    if (persistMode === "local") return; // Skip autosave in local mode
    if (!autoSave) return;
    if (mode !== "edit") return;
    const handle = setTimeout(
      async () => {
        try {
          const salePayload = buildSalePayload();
          if (entity === "sale") {
            if (!recordId) return;
            await updateMetadataPayload(String(recordId), salePayload as any);
          } else {
            // booking: guardar dentro del lead (plano) vía /v1/leads/:codigo
            if (leadCodigo) {
              await updateLeadPatch(
                String(leadCodigo),
                salePayloadToLeadPatch(salePayload),
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
      },
      Math.max(200, autoSaveDelay || 600),
    );
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
        program: initial?.program ?? prev.program,
        bonuses: (initial?.bonuses as string[] | undefined) ?? prev.bonuses,
        paymentMode: initial?.paymentMode ?? prev.paymentMode,
        paymentAmount: initial?.paymentAmount ?? prev.paymentAmount,
        paymentPaidAmount:
          (initial as any)?.paymentPaidAmount ?? prev.paymentPaidAmount,
        paymentPlanType:
          (initial as any)?.paymentPlanType ?? prev.paymentPlanType,
        paymentPricingPreset:
          ((initial as any)?.paymentPricingPreset as PaymentPricingPreset) ??
          prev.paymentPricingPreset,
        paymentInstallmentsCount:
          (initial as any)?.paymentInstallmentsCount ??
          prev.paymentInstallmentsCount,
        paymentInstallmentAmount:
          (initial as any)?.paymentInstallmentAmount ??
          prev.paymentInstallmentAmount,
        paymentFirstInstallmentAmount:
          (initial as any)?.paymentFirstInstallmentAmount ??
          prev.paymentFirstInstallmentAmount,
        paymentSecondInstallmentAmount:
          (initial as any)?.paymentSecondInstallmentAmount ??
          prev.paymentSecondInstallmentAmount,
        paymentSecondInstallmentDate:
          (initial as any)?.paymentSecondInstallmentDate ??
          prev.paymentSecondInstallmentDate,
        paymentExceptionNotes:
          (initial as any)?.paymentExceptionNotes ?? prev.paymentExceptionNotes,
        reservePaidDate:
          (initial as any)?.reservePaidDate ?? prev.reservePaidDate,
        reserveRemainingDueDate:
          (initial as any)?.reserveRemainingDueDate ??
          prev.reserveRemainingDueDate,
        reserveNotes: (initial as any)?.reserveNotes ?? prev.reserveNotes,
        paymentAttachments: Array.isArray((initial as any)?.paymentAttachments)
          ? ((initial as any).paymentAttachments as any)
          : prev.paymentAttachments,
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

    if (persistMode === "local") {
      toast({
        title: "Listo para guardar",
        description: "Estos cambios se guardan al presionar “Guardar cambios”.",
      });
      return; // Prevent submission in local mode
    }

    setSubmitting(true);
    try {
      if (mode === "edit" && (recordId || leadCodigo)) {
        const salePayload: any = buildSalePayload();
        if (entity === "sale") {
          if (!recordId)
            throw new Error("recordId requerido para editar una venta");
          await updateMetadataPayload(String(recordId), salePayload as any);
        } else {
          if (leadCodigo) {
            await updateLeadPatch(
              String(leadCodigo),
              salePayloadToLeadPatch(salePayload),
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
  const selectAccent =
    "bg-white border-slate-300 focus-visible:ring-slate-200 focus-visible:border-slate-400";
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
      <Tabs defaultValue="datos" className="w-full gap-0">
        <TabsList className="sticky top-0 z-20 w-full justify-start rounded-md border border-slate-200 bg-white/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-white/75 overflow-x-auto">
          <TabsTrigger value="datos" className="text-xs sm:text-sm">
            Datos
          </TabsTrigger>
          <TabsTrigger value="bonos" className="text-xs sm:text-sm">
            Bonos
          </TabsTrigger>
          <TabsTrigger value="pago" className="text-xs sm:text-sm">
            Pago
          </TabsTrigger>
          <TabsTrigger value="contrato" className="text-xs sm:text-sm">
            Contrato
          </TabsTrigger>
          <TabsTrigger value="notas" className="text-xs sm:text-sm">
            Notas
          </TabsTrigger>
        </TabsList>
        <div className="mt-3">
          <TabsContent value="datos" className="m-0">
            <Card className="p-4 border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <Label>Producto *</Label>
                  {PRODUCT_OPTIONS.some((o) => o.value === form.program) ? (
                    <Select
                      value={form.program}
                      onValueChange={(v) => setForm({ ...form, program: v })}
                    >
                      <SelectTrigger className={`w-full ${selectAccent}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input
                        className={inputAccent}
                        value={form.program}
                        readOnly
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-600">
                          Producto heredado del lead.
                        </p>
                        <Dialog
                          open={productConfigOpen}
                          onOpenChange={(open) => {
                            setProductConfigOpen(open);
                            if (open)
                              setProductConfigValue(
                                String(form.program || STATIC_PROGRAM),
                              );
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setProductConfigOpen(true)}
                            >
                              Configurar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Configurar producto</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div className="text-sm text-slate-700">
                                Selecciona el producto estándar para aplicar
                                precios preconfigurados.
                              </div>
                              <div className="space-y-1.5">
                                <Label>Producto</Label>
                                <Select
                                  value={productConfigValue}
                                  onValueChange={(v) =>
                                    setProductConfigValue(v)
                                  }
                                >
                                  <SelectTrigger
                                    className={`w-full ${selectAccent}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PRODUCT_OPTIONS.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setProductConfigOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setForm({
                                      ...form,
                                      program: productConfigValue,
                                    });
                                    setProductConfigOpen(false);
                                  }}
                                >
                                  Aplicar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </>
                  )}
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
                            BONOS_CONTRACTUALES.some((b) => b.key === k),
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
                            BONOS_EXTRA.some((b) => b.key === k),
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
            <Card className="p-4 border-slate-200">
              {(() => {
                const programKey = inferProgramKey(form.program);
                const pricing =
                  programKey === "PRO"
                    ? PRICING.PRO
                    : programKey === "FOUNDATION"
                      ? PRICING.FOUNDATION
                      : null;

                const plan = (form.paymentPlanType ||
                  "contado") as PaymentPlanType;
                const preset = (form.paymentPricingPreset ||
                  "descuento") as PaymentPricingPreset;

                const stdInstallments =
                  preset === "lista"
                    ? pricing?.list.installments
                    : pricing?.discount.installments;
                const stdCash =
                  preset === "lista"
                    ? pricing?.list.total
                    : pricing?.discount.cashTotal;

                const stdPlanLabel =
                  programKey === "PRO"
                    ? "PRO"
                    : programKey === "FOUNDATION"
                      ? "FOUNDATION"
                      : "—";

                const stdQuotaCount = stdInstallments?.count ?? 0;
                const stdQuotaAmount = stdInstallments?.amount ?? 0;

                return (
                  <div className="space-y-4">
                    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <div className="font-semibold">
                        Precios preconfigurados ({stdPlanLabel})
                      </div>
                      {pricing ? (
                        <div className="mt-2 grid grid-cols-1 gap-1 text-slate-700">
                          <div>
                            <span className="text-slate-500">
                              Precio lista:
                            </span>{" "}
                            USD {pricing.list.total.toLocaleString("en-US")} ·{" "}
                            {pricing.list.installments.count} cuotas de USD{" "}
                            {pricing.list.installments.amount.toLocaleString(
                              "en-US",
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500">
                              Descuento estándar:
                            </span>{" "}
                            Contado USD{" "}
                            {pricing.discount.cashTotal.toLocaleString("en-US")}{" "}
                            · {pricing.discount.installments.count} cuotas de
                            USD{" "}
                            {pricing.discount.installments.amount.toLocaleString(
                              "en-US",
                            )}{" "}
                            (cada 30 días)
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-slate-600">
                          Producto no reconocido para precios estándar.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label>Tipo de pago *</Label>
                        <Select
                          value={plan}
                          onValueChange={(v) => {
                            const nextPlan = v as PaymentPlanType;
                            // Preconfigurar valores estándar
                            if (nextPlan === "contado" && stdCash) {
                              setForm({
                                ...form,
                                paymentPlanType: nextPlan,
                                paymentMode: "pago_total",
                                paymentAmount: String(stdCash),
                                paymentPaidAmount: String(stdCash),
                              });
                              return;
                            }
                            if (nextPlan === "cuotas" && stdInstallments) {
                              const total =
                                stdInstallments.count * stdInstallments.amount;
                              const schedule = buildStandardScheduleFromCount(
                                [],
                                stdInstallments.count,
                                String(stdInstallments.amount),
                              );
                              setForm({
                                ...form,
                                paymentPlanType: nextPlan,
                                paymentMode: `${stdInstallments.count}_cuotas`,
                                paymentInstallmentsCount: stdInstallments.count,
                                paymentInstallmentAmount: String(
                                  stdInstallments.amount,
                                ),
                                paymentInstallmentsSchedule: schedule,
                                paymentAmount: String(total),
                                paymentPaidAmount: "",
                                paymentSecondInstallmentDate:
                                  schedule?.[1]?.dueDate || isoPlusDays(30),
                              });
                              return;
                            }
                            if (nextPlan === "excepcion_2_cuotas") {
                              const nowId = Date.now();
                              setForm({
                                ...form,
                                paymentPlanType: nextPlan,
                                paymentMode: "excepcion_2_cuotas",
                                paymentFirstInstallmentAmount: "1995",
                                paymentPaidAmount: "1995",
                                paymentSecondInstallmentAmount: "",
                                paymentSecondInstallmentDate: isoPlusDays(30),
                                paymentCustomInstallments: [
                                  {
                                    id: `ci_0_${nowId}`,
                                    amount: "1995",
                                    dueDate: isoPlusDays(0),
                                  },
                                  {
                                    id: `ci_1_${nowId}`,
                                    amount: "",
                                    dueDate: isoPlusDays(30),
                                  },
                                ],
                                paymentExceptionNotes: "",
                              });
                              return;
                            }
                            // reserva
                            setForm({
                              ...form,
                              paymentPlanType: nextPlan,
                              paymentMode: "reserva",
                              paymentHasReserve: true,
                              paymentReserveAmount:
                                form.paymentReserveAmount || "",
                              reservePaidDate:
                                form.reservePaidDate || isoPlusDays(0),
                              reserveRemainingDueDate:
                                form.reserveRemainingDueDate || "",
                              reserveNotes: form.reserveNotes || "",
                              paymentPaidAmount: form.paymentPaidAmount || "",
                            });
                          }}
                        >
                          <SelectTrigger className={`w-full ${selectAccent}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contado">
                              Venta al contado
                            </SelectItem>
                            <SelectItem value="cuotas">
                              Venta en cuotas (estándar)
                            </SelectItem>
                            <SelectItem value="excepcion_2_cuotas">
                              Excepción: 2 cuotas personalizadas
                            </SelectItem>
                            <SelectItem value="reserva">Reserva</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Tarifa *</Label>
                        <Select
                          value={preset}
                          onValueChange={(v) => {
                            const nextPreset = v as PaymentPricingPreset;
                            const nextStdInstallments =
                              nextPreset === "lista"
                                ? pricing?.list.installments
                                : pricing?.discount.installments;
                            const nextStdCash =
                              nextPreset === "lista"
                                ? pricing?.list.total
                                : pricing?.discount.cashTotal;

                            // Si el usuario cambia la tarifa, re-aplicamos los valores estándar
                            // solo para planes "contado" y "cuotas" (para no romper excepciones/reserva).
                            if (plan === "contado" && nextStdCash) {
                              setForm({
                                ...form,
                                paymentPricingPreset: nextPreset,
                                paymentAmount: String(nextStdCash),
                                paymentPaidAmount: String(nextStdCash),
                              });
                              return;
                            }
                            if (plan === "cuotas" && nextStdInstallments) {
                              const total =
                                nextStdInstallments.count *
                                nextStdInstallments.amount;
                              setForm({
                                ...form,
                                paymentPricingPreset: nextPreset,
                                paymentMode: `${nextStdInstallments.count}_cuotas`,
                                paymentInstallmentsCount:
                                  nextStdInstallments.count,
                                paymentInstallmentAmount: String(
                                  nextStdInstallments.amount,
                                ),
                                paymentAmount: String(total),
                              });
                              return;
                            }

                            setForm({
                              ...form,
                              paymentPricingPreset: nextPreset,
                            });
                          }}
                        >
                          <SelectTrigger className={`w-full ${selectAccent}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="descuento">
                              Descuento estándar
                            </SelectItem>
                            <SelectItem value="lista">Precio lista</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
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

                      <div className="md:col-span-2 space-y-1.5">
                        <Label>Fecha prevista del siguiente pago</Label>
                        <Input
                          type="date"
                          className={inputAccent}
                          value={
                            form.paymentSecondInstallmentDate ||
                            form.nextChargeDate ||
                            ""
                          }
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentSecondInstallmentDate: e.target.value,
                              nextChargeDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {plan === "cuotas" ? (
                      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">
                              Plan en cuotas (editable)
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              Puedes aumentar/disminuir el número de cuotas y/o
                              el monto por cuota. El total se recalcula
                              automáticamente.
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9"
                              onClick={() => {
                                const cur = Number(
                                  form.paymentInstallmentsCount ??
                                    stdQuotaCount,
                                );
                                const next = Math.max(
                                  1,
                                  (Number.isFinite(cur) ? cur : 0) - 1,
                                );
                                const amt = toNumberOrNull(
                                  String(
                                    form.paymentInstallmentAmount ??
                                      stdQuotaAmount,
                                  ),
                                );
                                const total =
                                  amt !== null
                                    ? String(amt * next)
                                    : form.paymentAmount;
                                const schedule = buildStandardScheduleFromCount(
                                  normalizeInstallmentsSchedule(
                                    (form as any).paymentInstallmentsSchedule,
                                  ),
                                  next,
                                  String(
                                    form.paymentInstallmentAmount ??
                                      stdQuotaAmount,
                                  ),
                                );
                                setForm({
                                  ...form,
                                  paymentInstallmentsCount: next,
                                  paymentMode: `${next}_cuotas`,
                                  paymentInstallmentsSchedule: schedule,
                                  paymentSecondInstallmentDate:
                                    schedule?.[1]?.dueDate ||
                                    form.paymentSecondInstallmentDate ||
                                    isoPlusDays(30),
                                  paymentAmount: total || "",
                                });
                              }}
                            >
                              -1
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9"
                              onClick={() => {
                                const cur = Number(
                                  form.paymentInstallmentsCount ??
                                    stdQuotaCount,
                                );
                                const next = Math.min(
                                  24,
                                  (Number.isFinite(cur) ? cur : 0) + 1,
                                );
                                const amt = toNumberOrNull(
                                  String(
                                    form.paymentInstallmentAmount ??
                                      stdQuotaAmount,
                                  ),
                                );
                                const total =
                                  amt !== null
                                    ? String(amt * next)
                                    : form.paymentAmount;
                                const schedule = buildStandardScheduleFromCount(
                                  normalizeInstallmentsSchedule(
                                    (form as any).paymentInstallmentsSchedule,
                                  ),
                                  next,
                                  String(
                                    form.paymentInstallmentAmount ??
                                      stdQuotaAmount,
                                  ),
                                );
                                setForm({
                                  ...form,
                                  paymentInstallmentsCount: next,
                                  paymentMode: `${next}_cuotas`,
                                  paymentInstallmentsSchedule: schedule,
                                  paymentSecondInstallmentDate:
                                    schedule?.[1]?.dueDate ||
                                    form.paymentSecondInstallmentDate ||
                                    isoPlusDays(30),
                                  paymentAmount: total || "",
                                });
                              }}
                            >
                              +1 cuota
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label>Número de cuotas</Label>
                            <Input
                              className={inputAccent}
                              type="number"
                              min={1}
                              max={24}
                              value={String(
                                form.paymentInstallmentsCount ?? stdQuotaCount,
                              )}
                              onChange={(e) => {
                                const next = Math.max(
                                  1,
                                  Math.min(
                                    24,
                                    Number(e.target.value || 0) || 1,
                                  ),
                                );
                                const amt = toNumberOrNull(
                                  String(
                                    form.paymentInstallmentAmount ??
                                      stdQuotaAmount,
                                  ),
                                );
                                const total =
                                  amt !== null ? String(amt * next) : "";
                                const schedule = buildStandardScheduleFromCount(
                                  normalizeInstallmentsSchedule(
                                    (form as any).paymentInstallmentsSchedule,
                                  ),
                                  next,
                                  String(
                                    form.paymentInstallmentAmount ??
                                      stdQuotaAmount,
                                  ),
                                );
                                setForm({
                                  ...form,
                                  paymentInstallmentsCount: next,
                                  paymentMode: `${next}_cuotas`,
                                  paymentInstallmentsSchedule: schedule,
                                  paymentSecondInstallmentDate:
                                    schedule?.[1]?.dueDate ||
                                    form.paymentSecondInstallmentDate ||
                                    isoPlusDays(30),
                                  paymentAmount:
                                    total || form.paymentAmount || "",
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Monto por cuota (USD)</Label>
                            <Input
                              className={inputAccent}
                              placeholder="$"
                              value={String(
                                form.paymentInstallmentAmount ?? stdQuotaAmount,
                              )}
                              onChange={(e) => {
                                const amt = toNumberOrNull(e.target.value);
                                const count = Number(
                                  form.paymentInstallmentsCount ??
                                    stdQuotaCount,
                                );
                                const safeCount =
                                  Number.isFinite(count) && count > 0
                                    ? count
                                    : 1;
                                const total =
                                  amt !== null ? String(amt * safeCount) : "";
                                const prevSchedule =
                                  normalizeInstallmentsSchedule(
                                    (form as any).paymentInstallmentsSchedule,
                                  );
                                const schedule = (
                                  prevSchedule.length
                                    ? prevSchedule
                                    : buildStandardScheduleFromCount(
                                        [],
                                        safeCount,
                                        e.target.value,
                                      )
                                ).map((it) => ({
                                  ...it,
                                  amount: e.target.value,
                                }));
                                setForm({
                                  ...form,
                                  paymentInstallmentAmount: e.target.value,
                                  paymentMode: `${safeCount}_cuotas`,
                                  paymentInstallmentsSchedule: schedule,
                                  paymentSecondInstallmentDate:
                                    schedule?.[1]?.dueDate ||
                                    form.paymentSecondInstallmentDate ||
                                    isoPlusDays(30),
                                  paymentAmount:
                                    total || form.paymentAmount || "",
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Periodicidad</Label>
                            <Input
                              className={inputAccent}
                              value="Cada 30 días"
                              readOnly
                            />
                          </div>
                        </div>

                        {(() => {
                          const count = Number(
                            form.paymentInstallmentsCount ?? stdQuotaCount,
                          );
                          const safeCount =
                            Number.isFinite(count) && count > 0 ? count : 1;
                          const baseAmount = String(
                            form.paymentInstallmentAmount ?? stdQuotaAmount,
                          );
                          const current = normalizeInstallmentsSchedule(
                            (form as any).paymentInstallmentsSchedule,
                          );
                          const schedule = current.length
                            ? buildStandardScheduleFromCount(
                                current,
                                safeCount,
                                baseAmount,
                              )
                            : buildStandardScheduleFromCount(
                                [],
                                safeCount,
                                baseAmount,
                              );

                          const setSchedule = (
                            next: PaymentCustomInstallment[],
                          ) => {
                            const next2 = next?.[1]?.dueDate || "";
                            setForm({
                              ...form,
                              paymentInstallmentsSchedule: next,
                              paymentSecondInstallmentDate:
                                next2 ||
                                form.paymentSecondInstallmentDate ||
                                isoPlusDays(30),
                              nextChargeDate:
                                next2 || form.nextChargeDate || "",
                            });
                          };

                          return (
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                  Configura monto y fecha por cuota (igual que
                                  personalizadas).
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9"
                                  onClick={() => {
                                    const nextCount = Math.min(
                                      24,
                                      safeCount + 1,
                                    );
                                    const nextSchedule =
                                      buildStandardScheduleFromCount(
                                        schedule,
                                        nextCount,
                                        baseAmount,
                                      );
                                    setForm({
                                      ...form,
                                      paymentInstallmentsCount: nextCount,
                                      paymentMode: `${nextCount}_cuotas`,
                                      paymentInstallmentsSchedule: nextSchedule,
                                      paymentSecondInstallmentDate:
                                        nextSchedule?.[1]?.dueDate ||
                                        form.paymentSecondInstallmentDate ||
                                        isoPlusDays(30),
                                    });
                                  }}
                                >
                                  Agregar cuota
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {schedule.map((it, idx) => (
                                  <div
                                    key={it.id}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-md border border-slate-200 bg-slate-50 p-3"
                                  >
                                    <div className="md:col-span-2">
                                      <Label className="text-xs text-slate-600">
                                        Cuota
                                      </Label>
                                      <div className="h-10 flex items-center text-sm font-medium">
                                        #{idx + 1}
                                      </div>
                                    </div>

                                    <div className="md:col-span-5 space-y-1.5">
                                      <Label>Monto (USD) *</Label>
                                      <Input
                                        placeholder="$"
                                        className={inputAccent}
                                        value={it.amount}
                                        onChange={(e) => {
                                          const next = schedule.map((x, i) =>
                                            i === idx
                                              ? { ...x, amount: e.target.value }
                                              : x,
                                          );
                                          setSchedule(next);
                                        }}
                                      />
                                    </div>

                                    <div className="md:col-span-5 space-y-1.5">
                                      <Label>Fecha de pago *</Label>
                                      <Input
                                        type="date"
                                        className={inputAccent}
                                        value={it.dueDate || ""}
                                        onChange={(e) => {
                                          const next = schedule.map((x, i) =>
                                            i === idx
                                              ? {
                                                  ...x,
                                                  dueDate: e.target.value,
                                                }
                                              : x,
                                          );
                                          setSchedule(next);
                                        }}
                                      />
                                    </div>

                                    <div className="md:col-span-12 flex justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9"
                                        disabled={schedule.length <= 1}
                                        onClick={() => {
                                          if (schedule.length <= 1) return;
                                          const next = schedule.filter(
                                            (_, i) => i !== idx,
                                          );
                                          const nextCount = Math.max(
                                            1,
                                            schedule.length - 1,
                                          );
                                          setForm({
                                            ...form,
                                            paymentInstallmentsCount: nextCount,
                                            paymentMode: `${nextCount}_cuotas`,
                                            paymentInstallmentsSchedule: next,
                                            paymentSecondInstallmentDate:
                                              next?.[1]?.dueDate ||
                                              form.paymentSecondInstallmentDate ||
                                              isoPlusDays(30),
                                          });
                                        }}
                                      >
                                        Quitar
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}

                    {plan === "excepcion_2_cuotas" ? (
                      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm space-y-3">
                        <div className="font-semibold">
                          Cuotas personalizadas (excepción)
                        </div>
                        <div className="text-xs text-slate-600">
                          Agrega las cuotas necesarias. Sugerimos fechas cada 30
                          días y que la primera cuota sea la más alta.
                        </div>
                        {(() => {
                          const custom: PaymentCustomInstallment[] =
                            Array.isArray(
                              (form as any).paymentCustomInstallments,
                            )
                              ? (
                                  ((form as any)
                                    .paymentCustomInstallments as any[]) || []
                                )
                                  .map((it: any, idx: number) => ({
                                    id: String(it?.id || `ci_${idx}`),
                                    amount: String(it?.amount ?? ""),
                                    dueDate: String(it?.dueDate ?? ""),
                                  }))
                                  .filter(Boolean)
                              : [];

                          const safeCustom = custom.length
                            ? custom
                            : [
                                {
                                  id: "ci_0_fallback",
                                  amount: String(
                                    form.paymentFirstInstallmentAmount || "",
                                  ),
                                  dueDate: isoPlusDays(0),
                                },
                                {
                                  id: "ci_1_fallback",
                                  amount: String(
                                    form.paymentSecondInstallmentAmount || "",
                                  ),
                                  dueDate:
                                    String(
                                      form.paymentSecondInstallmentDate || "",
                                    ) || isoPlusDays(30),
                                },
                              ];

                          const updateCustom = (
                            next: PaymentCustomInstallment[],
                          ) => {
                            const first = next[0];
                            const second = next[1];
                            setForm({
                              ...form,
                              paymentCustomInstallments: next,
                              paymentFirstInstallmentAmount:
                                first?.amount || "",
                              paymentSecondInstallmentAmount:
                                second?.amount || "",
                              paymentSecondInstallmentDate:
                                second?.dueDate || "",
                              nextChargeDate:
                                second?.dueDate || form.nextChargeDate || "",
                            });
                          };

                          const canRemove = safeCustom.length > 2;

                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                  Total = suma de cuotas · Próximo cobro = fecha
                                  de la cuota #2
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9"
                                  onClick={() => {
                                    const lastWithDate = [...safeCustom]
                                      .reverse()
                                      .find((x) =>
                                        String(x.dueDate || "").trim(),
                                      );
                                    const nextDue = lastWithDate?.dueDate
                                      ? isoDatePlusDays(
                                          lastWithDate.dueDate,
                                          30,
                                        )
                                      : isoPlusDays(30);
                                    updateCustom([
                                      ...safeCustom,
                                      {
                                        id: `ci_${Date.now()}`,
                                        amount: "",
                                        dueDate: nextDue,
                                      },
                                    ]);
                                  }}
                                >
                                  Agregar cuota
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {safeCustom.map((it, idx) => (
                                  <div
                                    key={it.id}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-md border border-slate-200 bg-slate-50 p-3"
                                  >
                                    <div className="md:col-span-2">
                                      <Label className="text-xs text-slate-600">
                                        Cuota
                                      </Label>
                                      <div className="h-10 flex items-center text-sm font-medium">
                                        #{idx + 1}
                                      </div>
                                    </div>

                                    <div className="md:col-span-5 space-y-1.5">
                                      <Label>Monto (USD) *</Label>
                                      <Input
                                        placeholder="$"
                                        className={inputAccent}
                                        value={it.amount}
                                        onChange={(e) => {
                                          const next = safeCustom.map((x, i) =>
                                            i === idx
                                              ? { ...x, amount: e.target.value }
                                              : x,
                                          );
                                          // Mantener comportamiento previo: la primera cuota marca “pagado” por defecto
                                          if (idx === 0) {
                                            setForm({
                                              ...form,
                                              paymentPaidAmount: e.target.value,
                                              paymentCustomInstallments: next,
                                              paymentFirstInstallmentAmount:
                                                next[0]?.amount || "",
                                              paymentSecondInstallmentAmount:
                                                next[1]?.amount || "",
                                              paymentSecondInstallmentDate:
                                                next[1]?.dueDate || "",
                                              nextChargeDate:
                                                next[1]?.dueDate ||
                                                form.nextChargeDate ||
                                                "",
                                            });
                                            return;
                                          }
                                          updateCustom(next);
                                        }}
                                      />
                                    </div>

                                    <div className="md:col-span-5 space-y-1.5">
                                      <Label>Fecha de pago *</Label>
                                      <Input
                                        type="date"
                                        className={inputAccent}
                                        value={it.dueDate || ""}
                                        onChange={(e) => {
                                          const next = safeCustom.map((x, i) =>
                                            i === idx
                                              ? {
                                                  ...x,
                                                  dueDate: e.target.value,
                                                }
                                              : x,
                                          );
                                          updateCustom(next);
                                        }}
                                      />
                                    </div>

                                    <div className="md:col-span-12 flex justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9"
                                        disabled={!canRemove}
                                        onClick={() => {
                                          if (!canRemove) return;
                                          const next = safeCustom.filter(
                                            (_, i) => i !== idx,
                                          );
                                          updateCustom(next);
                                        }}
                                      >
                                        Quitar
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="space-y-1.5">
                          <Label>Observaciones (justificación) *</Label>
                          <Textarea
                            className={inputAccent}
                            value={form.paymentExceptionNotes || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                paymentExceptionNotes: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : null}

                    {plan === "reserva" ? (
                      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm space-y-3">
                        <div className="font-semibold">Reserva</div>
                        <div className="text-xs text-slate-600">
                          Sugerencias de mínimo: USD 300 / USD 500 (editable).
                          La fecha del restante debe definirse lo antes posible.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label>Monto de reserva (USD) *</Label>
                            <Input
                              placeholder="$"
                              className={inputAccent}
                              value={form.paymentReserveAmount || ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  paymentReserveAmount: e.target.value,
                                  paymentHasReserve: true,
                                  paymentPaidAmount: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Fecha de reserva</Label>
                            <Input
                              type="date"
                              className={inputAccent}
                              value={form.reservePaidDate || ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  reservePaidDate: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Fecha pago del restante</Label>
                            <Input
                              type="date"
                              className={inputAccent}
                              value={form.reserveRemainingDueDate || ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  reserveRemainingDueDate: e.target.value,
                                  nextChargeDate: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Observaciones</Label>
                          <Textarea
                            className={inputAccent}
                            value={form.reserveNotes || ""}
                            onChange={(e) =>
                              setForm({ ...form, reserveNotes: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm space-y-3">
                      <div className="font-semibold">
                        Comprobantes y adjuntos
                      </div>
                      <div className="space-y-1.5">
                        <Label>Adjuntar comprobantes (PDF / imágenes)</Label>
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          className={inputAccent}
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            const created_at = new Date().toISOString();
                            const existing = Array.isArray(
                              form.paymentAttachments,
                            )
                              ? form.paymentAttachments
                              : [];
                            const nextItems: any[] = [];
                            for (const file of Array.from(files)) {
                              const dataUrl = await fileToDataUrl(file);
                              nextItems.push({
                                id:
                                  (crypto as any)?.randomUUID?.() ||
                                  `att-${Date.now()}-${file.name}`,
                                name: file.name,
                                type: file.type,
                                size: file.size,
                                dataUrl,
                                created_at,
                              });
                            }
                            setForm({
                              ...form,
                              paymentAttachments: [...existing, ...nextItems],
                            });
                          }}
                        />
                        {Array.isArray(form.paymentAttachments) &&
                        form.paymentAttachments.length ? (
                          <div className="mt-2 space-y-2">
                            {form.paymentAttachments.map((a) => (
                              <div
                                key={a.id}
                                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-xs text-slate-900">
                                    {a.name || "archivo"}
                                  </div>
                                  <div className="text-[11px] text-slate-600">
                                    {a.type || ""}{" "}
                                    {a.size
                                      ? `· ${Math.round(a.size / 1024)} KB`
                                      : ""}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setForm({
                                      ...form,
                                      paymentAttachments: (Array.isArray(
                                        form.paymentAttachments,
                                      )
                                        ? form.paymentAttachments
                                        : []
                                      ).filter((x) => x.id !== a.id),
                                    });
                                  }}
                                >
                                  Quitar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-slate-600">
                            Sin adjuntos.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </TabsContent>

          <TabsContent value="contrato" className="m-0">
            <Card className="p-4 space-y-4 border-slate-200">
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
                                    1,
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

      {persistMode === "api" ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
