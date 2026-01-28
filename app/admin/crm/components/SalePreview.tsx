"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  Tags,
  DollarSign,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { BONOS_BY_KEY } from "@/lib/bonos";
import { updateLeadPatch, updateMetadataPayload } from "@/app/admin/crm/api";
import { useToast } from "@/components/ui/use-toast";
import type { CloseSaleInput } from "./CloseSaleForm2";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function statusBadge(status?: string) {
  const v = String(status || "").toLowerCase();
  const cls =
    v === "active" || v === "payment_confirmed" || v === "contract_signed"
      ? "bg-emerald-100 text-emerald-700"
      : v === "contract_sent" ||
          v === "payment_verification_pending" ||
          v === "active_provisional"
        ? "bg-amber-100 text-amber-700"
        : v === "operational_closure" || v === "cancelled" || v === "lost"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate-700";
  return <Badge className={cls + " capitalize"}>{v || "draft"}</Badge>;
}

export function SalePreview({
  payload,
  draft,
  id,
  leadCodigo,
  entity = "sale",
  title = "Resumen de venta",
  onUpdated,
  persistMode = "api",
}: {
  payload?: any;
  draft?: Partial<CloseSaleInput> | null;
  id?: string | number;
  leadCodigo?: string;
  entity?: "sale" | "booking";
  title?: string;
  onUpdated?: () => void;
  persistMode?: "api" | "local";
}) {
  const { toast } = useToast();
  // Preferimos el borrador en vivo si existe, si no caemos al payload persistido
  const name = draft?.fullName ?? payload?.name ?? "";
  const email = draft?.email ?? payload?.email ?? "";
  const phone = draft?.phone ?? payload?.phone ?? "";
  const program = draft?.program ?? payload?.program ?? "";
  const primaryPlan =
    (payload as any)?.payment?.plans?.[0] ?? (payload as any)?.payment?.plan;
  const pay = {
    mode: draft?.paymentMode ?? payload?.payment?.mode ?? payload?.paymentMode,
    amount: draft?.paymentAmount ?? payload?.payment?.amount,
    paidAmount:
      (draft as any)?.paymentPaidAmount ??
      payload?.payment?.paid_amount ??
      payload?.payment?.paidAmount ??
      primaryPlan?.paid_amount ??
      null,
    hasReserve:
      (draft as any)?.paymentHasReserve ?? payload?.payment?.hasReserve,
    reserveAmount:
      (draft as any)?.paymentReserveAmount ??
      payload?.payment?.reserveAmount ??
      payload?.payment?.reservationAmount ??
      payload?.payment?.reserva ??
      payload?.payment?.deposit ??
      payload?.payment?.downPayment ??
      payload?.payment?.anticipo ??
      primaryPlan?.reserve?.amount ??
      null,
    platform: draft?.paymentPlatform ?? payload?.payment?.platform,
    nextChargeDate:
      draft?.nextChargeDate ?? payload?.payment?.nextChargeDate ?? null,
  } as {
    mode?: string;
    amount?: string;
    paidAmount?: any;
    hasReserve?: boolean;
    reserveAmount?: any;
    platform?: string;
    nextChargeDate?: string | null;
  };

  const ticket = (() => {
    const program = String(draft?.program ?? payload?.program ?? "").trim();
    const planType =
      String(
        (primaryPlan as any)?.type ??
          (payload as any)?.payment?.plan_type ??
          (payload as any)?.payment?.planType ??
          (draft as any)?.paymentPlanType ??
          "",
      ) || "";
    const mode = String(pay?.mode || "").toLowerCase();

    const draftStdSchedule = Array.isArray(
      (draft as any)?.paymentInstallmentsSchedule,
    )
      ? ((draft as any)?.paymentInstallmentsSchedule as any[])
      : [];
    const draftCustomSchedule = Array.isArray(
      (draft as any)?.paymentCustomInstallments,
    )
      ? ((draft as any)?.paymentCustomInstallments as any[])
      : [];

    const modeCuotasMatch = mode.match(/(\d+)_cuotas/);
    const modeCuotasCount = modeCuotasMatch?.[1]
      ? Number(modeCuotasMatch[1])
      : null;
    const modeExMatch = mode.match(/excepcion_(\d+)_cuotas/);
    const modeExCount = modeExMatch?.[1] ? Number(modeExMatch[1]) : null;

    const tipo = (() => {
      if (planType === "reserva" || mode.includes("reserva")) return "Reserva";
      if (planType === "excepcion_2_cuotas" || mode.includes("excepcion")) {
        const n =
          modeExCount ??
          (draft as any)?.paymentInstallmentsCount ??
          null ??
          (draftCustomSchedule.length || null) ??
          2;
        return `Excepción (${n} cuotas)`;
      }
      if (planType === "cuotas" || mode.includes("cuota")) return "Cuotas";
      return "Contado";
    })();

    const cuotasCount =
      (draft as any)?.paymentInstallmentsCount ??
      (draftStdSchedule.length ? draftStdSchedule.length : null) ??
      (draftCustomSchedule.length ? draftCustomSchedule.length : null) ??
      modeCuotasCount ??
      (payload as any)?.payment?.installments?.count ??
      (primaryPlan as any)?.installments?.count ??
      null;

    const cuotaAmount =
      (draft as any)?.paymentInstallmentAmount ??
      (() => {
        const schedule = draftStdSchedule.length
          ? draftStdSchedule
          : draftCustomSchedule;
        if (!schedule.length) return null;
        const nums = schedule
          .map((it) => Number(it?.amount))
          .filter((n) => Number.isFinite(n));
        if (!nums.length) return null;
        // Si todas son iguales, mostrar ese monto; si no, mostrar promedio aproximado
        const allSame = nums.every((n) => n === nums[0]);
        if (allSame) return String(nums[0]);
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        return String(Math.round(avg * 100) / 100);
      })() ??
      (payload as any)?.payment?.installments?.amount ??
      (primaryPlan as any)?.installments?.amount ??
      null;

    const total =
      pay?.amount ??
      (() => {
        const schedule = draftStdSchedule.length
          ? draftStdSchedule
          : draftCustomSchedule;
        if (!schedule.length) return null;
        const sum = schedule
          .map((it) => Number(it?.amount))
          .filter((n) => Number.isFinite(n))
          .reduce((a, b) => a + b, 0);
        return Number.isFinite(sum) && sum > 0 ? String(sum) : null;
      })() ??
      (primaryPlan as any)?.total ??
      null;

    const pagado = pay?.paidAmount ?? (primaryPlan as any)?.paid_amount ?? null;

    return {
      program: program || "—",
      tipo,
      cuotasCount,
      cuotaAmount,
      total,
      pagado,
    };
  })();
  const contract = payload?.contract || {};
  const bonuses: string[] = Array.isArray(draft?.bonuses)
    ? (draft?.bonuses as string[])
    : Array.isArray(payload?.bonuses)
      ? payload?.bonuses
      : payload?.bonuses
        ? String(payload?.bonuses)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
  const bonusesLabel = bonuses.length
    ? bonuses.map((k) => BONOS_BY_KEY[k]?.title || k).join(", ")
    : "—";

  const cuotas = (() => {
    const m = String(
      draft?.paymentMode || payload?.paymentMode || pay?.mode || "",
    );
    const c = m.match(/(\d+)\s*cuotas?/i);
    return c
      ? Number(c[1])
      : m.includes("cuota")
        ? 2
        : m.includes("pago_total")
          ? 1
          : undefined;
  })();

  const rawMode = String(pay?.mode || "").toLowerCase();
  const reserveAmountRaw = (pay?.reserveAmount ??
    payload?.reserveAmount ??
    payload?.reservationAmount ??
    payload?.reserva ??
    payload?.deposit ??
    payload?.downPayment ??
    payload?.anticipo ??
    null) as any;
  const reserveAmountNum =
    reserveAmountRaw === null || reserveAmountRaw === undefined
      ? null
      : Number(reserveAmountRaw);
  const hasReserva =
    pay?.hasReserve === true ||
    (reserveAmountNum !== null &&
      !Number.isNaN(reserveAmountNum) &&
      reserveAmountNum > 0) ||
    /reserva|apartado|señ?a|anticipo/i.test(rawMode);
  const isPagoTotal = cuotas === 1 || /pago[_\s-]*total|contado/.test(rawMode);
  const planLabel = isPagoTotal
    ? "Pago total"
    : cuotas && cuotas > 1
      ? `${cuotas} cuotas`
      : hasReserva
        ? "Con reserva"
        : "—";

  const [localStatus, setLocalStatus] = React.useState<string>(
    String(payload?.status || ""),
  );
  const status = localStatus;
  const isPaid = status.toLowerCase() === "payment_confirmed";

  const statusLabel = (() => {
    const v = String(status || "").toLowerCase();
    if (!v) return "borrador";
    if (v === "payment_verification_pending") return "verificación de pago";
    if (v === "payment_confirmed") return "pago confirmado";
    if (v === "active" || v === "active_provisional") return "activo";
    if (v === "cancelled" || v === "lost") return "cancelada";
    if (v === "operational_closure") return "cierre operativo";
    if (v === "contract_sent") return "contrato enviado";
    return v.replace(/_/g, " ");
  })();

  const confirmPayment = async () => {
    if (entity === "booking" && !leadCodigo) return;
    if (entity === "sale" && !id) return;
    if (persistMode === "local") {
      toast({
        title: "Listo para guardar",
        description: "Este cambio se guardará al presionar “Guardar cambios”.",
      });
      setLocalStatus("payment_confirmed");
      return;
    }
    try {
      if (entity === "sale") {
        const next = { ...(payload || {}), status: "payment_confirmed" } as any;
        await updateMetadataPayload(String(id), next);
      } else {
        await updateLeadPatch(String(leadCodigo), {
          payment_status: "payment_confirmed",
        });
      }
      setLocalStatus("payment_confirmed");
      toast({ title: "Pago confirmado" });
      onUpdated?.();
    } catch (e: any) {
      toast({
        title: "Error al confirmar pago",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  const unconfirmPayment = async () => {
    if (entity === "booking" && !leadCodigo) return;
    if (entity === "sale" && !id) return;
    if (persistMode === "local") {
      toast({
        title: "Listo para guardar",
        description: "Este cambio se guardará al presionar “Guardar cambios”.",
      });
      setLocalStatus("payment_verification_pending");
      return;
    }
    try {
      if (entity === "sale") {
        const next = {
          ...(payload || {}),
          status: "payment_verification_pending",
        } as any;
        await updateMetadataPayload(String(id), next);
      } else {
        await updateLeadPatch(String(leadCodigo), {
          payment_status: "payment_verification_pending",
        });
      }
      setLocalStatus("payment_verification_pending");
      toast({ title: "Pago desconfirmado" });
      onUpdated?.();
    } catch (e: any) {
      toast({
        title: "Error al desconfirmar pago",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  // Checklist de campos faltantes
  const missing: string[] = [];
  if (!name) missing.push("Nombre");
  if (!email) missing.push("Correo");
  if (!phone) missing.push("Teléfono");
  if (!program) missing.push("Programa");
  if (!pay.mode) missing.push("Modalidad de pago");
  if (!pay.amount) missing.push("Monto");
  if (!pay.platform) missing.push("Plataforma de pago");

  return (
    <Card className="p-4 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              (status === "payment_confirmed"
                ? "bg-emerald-100 text-emerald-700"
                : status === "payment_verification_pending" ||
                    status === "contract_sent"
                  ? "bg-amber-100 text-amber-700"
                  : status === "cancelled" || status === "lost"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-700") + " capitalize"
            }
          >
            {statusLabel}
          </Badge>
          {id ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              title="Abrir en nueva pestaña"
            >
              <a
                href={`/admin/crm/sales/${encodeURIComponent(String(id))}`}
                target="_blank"
              >
                Abrir página
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Checklist de completitud */}
      <div className="mb-3 space-y-2">
        {missing.length === 0 ? (
          <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 text-xs border border-emerald-100">
            <CheckCircle2 className="h-4 w-4" /> Listo para enviar / validar
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-amber-800 text-xs border border-amber-100">
            <AlertTriangle className="h-4 w-4" /> Faltan: {missing.join(", ")}
          </div>
        )}
        {/* Checklist compacto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-[11px] text-slate-700">
          {[
            { label: "Nombre", ok: !!name },
            { label: "Correo", ok: !!email },
            { label: "Teléfono", ok: !!phone },
            { label: "Programa", ok: !!program },
            { label: "Modalidad", ok: !!pay.mode },
            { label: "Monto", ok: !!pay.amount },
            { label: "Plataforma", ok: !!pay.platform },
            { label: "Bonos (opc.)", ok: bonuses.length > 0 },
          ].map((it) => (
            <div
              key={it.label}
              className={`inline-flex items-center gap-1 ${
                it.ok ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  it.ok ? "text-emerald-600" : "text-amber-500"
                }`}
              />
              {it.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-3">
        <div className="text-xs font-semibold text-slate-700">
          Ticket (resumen)
        </div>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Producto</span>
            <span className="text-slate-900 truncate">{ticket.program}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Tipo de pago</span>
            <span className="text-slate-900">{ticket.tipo}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Cuotas</span>
            <span className="text-slate-900">
              {ticket.cuotasCount ? String(ticket.cuotasCount) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Monto por cuota</span>
            <span className="text-slate-900">
              {ticket.cuotaAmount !== null && ticket.cuotaAmount !== undefined
                ? String(ticket.cuotaAmount)
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Total comprometido</span>
            <span className="text-slate-900">
              {ticket.total !== null && ticket.total !== undefined
                ? String(ticket.total)
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Pagado</span>
            <span className="text-slate-900">
              {ticket.pagado !== null && ticket.pagado !== undefined
                ? String(ticket.pagado)
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Secciones claras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* Cliente */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Cliente
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-slate-400" />
            <span className="truncate">{name || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="truncate">{email || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="truncate">{phone || "—"}</span>
          </div>
        </div>

        {/* Producto y bonos */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Producto y bonos
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">Programa: {program || "—"}</span>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-slate-500 text-xs mb-1">Bonos:</div>
              {bonuses.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {bonuses.map((k) => (
                    <li key={k} className="text-slate-800">
                      {BONOS_BY_KEY[k]?.title || k}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-slate-800">—</div>
              )}
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Pago
          </div>
          <div>
            <Badge
              className={
                isPaid
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }
            >
              {isPaid ? "Pago confirmado" : "Pago en verificación"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              Monto: {pay?.amount || "—"} · Modalidad: {pay?.mode || "—"}
              {cuotas ? ` (${cuotas} cuotas)` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">Plan: {planLabel}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="whitespace-normal break-words">
              Reserva: {hasReserva ? "Sí" : "No"} · Monto reserva:{" "}
              {reserveAmountRaw ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">Plataforma: {pay?.platform || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              Próximo cobro:{" "}
              {pay?.nextChargeDate ? fmtDate(pay.nextChargeDate) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              ¿Pago confirmado?: {isPaid ? "Sí" : "No"}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              ¿Pagó todo el plan?: {isPagoTotal && isPaid ? "Sí" : "No"}
            </span>
          </div>
          {!isPaid ? (
            <div>
              <Button size="sm" variant="outline" onClick={confirmPayment}>
                Confirmar pago
              </Button>
            </div>
          ) : (
            <div>
              <Button
                size="sm"
                variant="destructive"
                onClick={unconfirmPayment}
              >
                Desconfirmar pago
              </Button>
            </div>
          )}
        </div>

        {/* Contrato */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Contrato
          </div>
          <div>
            <Badge className="bg-amber-100 text-amber-700">
              Contrato pendiente
            </Badge>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">Estado: Pendiente</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
