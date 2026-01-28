export type CrmPaymentPlanType = "contado" | "cuotas" | "excepcion_2_cuotas" | "reserva";
export type CrmPaymentPricingPreset = "lista" | "descuento";

export type CrmProgramValue = "HOTSELLING PRO" | "HOTSELLING FOUNDATION";

export const CRM_PRODUCT_OPTIONS: Array<{ value: CrmProgramValue; label: string }> = [
  { value: "HOTSELLING PRO", label: "HOTSELLING PRO" },
  { value: "HOTSELLING FOUNDATION", label: "HOTSELLING FOUNDATION" },
];

export const CRM_PRICING = {
  PRO: {
    list: { total: 5000, installments: { count: 3, amount: 1800 } },
    discount: { cashTotal: 3990, installments: { count: 3, amount: 1600 } },
  },
  FOUNDATION: {
    list: { total: 2000, installments: { count: 2, amount: 1100 } },
    discount: { cashTotal: 1500, installments: { count: 2, amount: 825 } },
  },
} as const;

export type CrmPaymentCustomInstallment = {
  id: string;
  amount: string;
  dueDate: string; // YYYY-MM-DD
};

export function inferProgramKey(program?: string | null) {
  const v = String(program ?? "")
    .trim()
    .toLowerCase();
  if (v.includes("foundation")) return "FOUNDATION" as const;
  if (v.includes("pro")) return "PRO" as const;
  return "UNKNOWN" as const;
}

export function isoPlusDays(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function isoDatePlusDays(baseIsoDate: string, days: number) {
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

export function toNumberOrNull(v?: string | null) {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function buildStandardScheduleFromCount(
  prev: CrmPaymentCustomInstallment[],
  count: number,
  amount: string,
) {
  const safeCount = Math.max(1, Math.min(24, Number(count) || 1));
  const base = Array.isArray(prev) ? prev : [];
  const next: CrmPaymentCustomInstallment[] = [];

  for (let i = 0; i < safeCount; i++) {
    const existing = base[i];
    if (existing) {
      next.push({
        id: existing.id,
        amount: i === 0 ? String(existing.amount ?? amount) : String(existing.amount ?? amount),
        dueDate: String(existing.dueDate || ""),
      });
      continue;
    }

    const lastDate = next.length ? String(next[next.length - 1]?.dueDate || "") : "";
    const dueDate = lastDate ? isoDatePlusDays(lastDate, 30) : isoPlusDays(i * 30);
    next.push({
      id: `si_${Date.now()}_${i}`,
      amount: String(amount || ""),
      dueDate,
    });
  }

  return next;
}

export function getStdPricing(program: string, preset: CrmPaymentPricingPreset) {
  const programKey = inferProgramKey(program);
  const pricing =
    programKey === "PRO"
      ? CRM_PRICING.PRO
      : programKey === "FOUNDATION"
        ? CRM_PRICING.FOUNDATION
        : null;

  if (!pricing) return null;

  const stdInstallments = preset === "lista" ? pricing.list.installments : pricing.discount.installments;
  const stdCash = preset === "lista" ? pricing.list.total : pricing.discount.cashTotal;

  return { stdInstallments, stdCash };
}

export function labelForPlanType(t: CrmPaymentPlanType) {
  if (t === "contado") return "Venta al contado";
  if (t === "cuotas") return "Venta en cuotas (estándar)";
  if (t === "excepcion_2_cuotas") return "Excepción: 2 cuotas personalizadas";
  return "Reserva";
}
