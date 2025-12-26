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
import { updateMetadataPayload } from "@/app/admin/crm/api";
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
  entity = "sale",
  title = "Resumen de venta",
  onUpdated,
}: {
  payload?: any;
  draft?: Partial<CloseSaleInput> | null;
  id?: string | number;
  entity?: "sale" | "booking";
  title?: string;
  onUpdated?: () => void;
}) {
  const { toast } = useToast();
  // Preferimos el borrador en vivo si existe, si no caemos al payload persistido
  const name = draft?.fullName ?? payload?.name ?? "";
  const email = draft?.email ?? payload?.email ?? "";
  const phone = draft?.phone ?? payload?.phone ?? "";
  const program = draft?.program ?? payload?.program ?? "";
  const pay = {
    mode: draft?.paymentMode ?? payload?.payment?.mode ?? payload?.paymentMode,
    amount: draft?.paymentAmount ?? payload?.payment?.amount,
    platform: draft?.paymentPlatform ?? payload?.payment?.platform,
    nextChargeDate:
      draft?.nextChargeDate ?? payload?.payment?.nextChargeDate ?? null,
  } as {
    mode?: string;
    amount?: string;
    platform?: string;
    nextChargeDate?: string | null;
  };
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
      draft?.paymentMode || payload?.paymentMode || pay?.mode || ""
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
  const reserveAmountRaw = (payload?.payment?.reserveAmount ??
    payload?.reserveAmount ??
    null) as any;
  const reserveAmountNum =
    reserveAmountRaw === null || reserveAmountRaw === undefined
      ? null
      : Number(reserveAmountRaw);
  const hasReserva =
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
    String(payload?.status || "")
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
    if (!id) return;
    try {
      const next = { ...(payload || {}), status: "payment_confirmed" } as any;
      if (entity === "sale") {
        await updateMetadataPayload(String(id), next);
      } else {
        await updateMetadataPayload(String(id), { sale: next } as any);
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
    if (!id) return;
    try {
      const next = {
        ...(payload || {}),
        status: "payment_verification_pending",
      } as any;
      if (entity === "sale") {
        await updateMetadataPayload(String(id), next);
      } else {
        await updateMetadataPayload(String(id), { sale: next } as any);
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
            <span className="truncate">
              Plan: {planLabel} · ¿Con reserva?: {hasReserva ? "Sí" : "No"}
              {hasReserva &&
              reserveAmountNum !== null &&
              !Number.isNaN(reserveAmountNum)
                ? ` (Reserva: ${reserveAmountRaw})`
                : ""}
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
