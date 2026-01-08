"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  createLeadSnapshot,
  getLead,
} from "@/app/admin/crm/api";
import {
  CloseSaleForm,
  type CloseSaleInput,
} from "../../components/CloseSaleForm2";
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
import { Loader2, Mail, Phone, Tags, Calendar } from "lucide-react";
import Link from "next/link";
import { SalePreview } from "@/app/admin/crm/components/SalePreview";
import { toast } from "@/components/ui/use-toast";
import { StageBadge } from "@/app/admin/crm/components/StageBadge";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [record, setRecord] = React.useState<any | null>(null);
  const [draft, setDraft] = React.useState<Partial<CloseSaleInput> | null>(
    null
  );
  const [saleDraftPayload, setSaleDraftPayload] = React.useState<any | null>(
    null
  );
  const [paymentProof, setPaymentProof] = React.useState<
    | {
        dataUrl: string;
        name?: string;
        type?: string;
        size?: number;
      }
    | null
  >(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [snapshotSaving, setSnapshotSaving] = React.useState(false);

  const truncateDataUrlTwoLines = React.useCallback((value: string) => {
    const s = String(value || "");
    if (!s.startsWith("data:")) return s;
    if (s.length <= 180) return s;
    const line1 = s.slice(0, 90);
    const line2 = s.slice(90, 180);
    return `${line1}\n${line2}…(truncado)`;
  }, []);

  const stringifyForBackendExample = React.useCallback(
    (obj: any) =>
      JSON.stringify(
        obj,
        (_k, v) => {
          if (typeof v === "string" && v.startsWith("data:")) {
            return truncateDataUrlTwoLines(v);
          }
          return v;
        },
        2
      ),
    [truncateDataUrlTwoLines]
  );

  const sanitizeForBackendExample = React.useCallback(
    (obj: any) => {
      try {
        return JSON.parse(stringifyForBackendExample(obj));
      } catch {
        return obj;
      }
    },
    [stringifyForBackendExample]
  );

  const buildSnapshotBodyForConsole = () => {
    if (!record) return null;
    const ctx = buildSnapshotContext();
    if (!ctx) return null;

    const capturedAt = new Date().toISOString();
    const patch = draftToLeadPatch(draft);
    const snapshotPayloadCurrentBase = {
      ...(leadForUi || record),
      ...(patch || {}),
      ...(saleDraftPayload ? { sale: saleDraftPayload } : {}),
      ...(paymentProof
        ? {
            payment_proof: {
              dataUrl: paymentProof.dataUrl,
              name: paymentProof.name,
              type: paymentProof.type,
              size: paymentProof.size,
            },
          }
        : {}),
    };

    // Completar con data de prueba (solo para consola) si faltan campos clave.
    const mkDataUrl = (mime: string) =>
      `data:${mime};base64,` +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    const nextPayloadCurrent = { ...snapshotPayloadCurrentBase } as any;
    const sale = (nextPayloadCurrent.sale || {}) as any;
    sale.payment = sale.payment || {};
    sale.payment.plans = Array.isArray(sale.payment.plans)
      ? sale.payment.plans
      : [];

    if (!sale.payment.proof) {
      sale.payment.proof = {
        name: "comprobante.png",
        type: "image/png",
        size: 123456,
        dataUrl: mkDataUrl("image/png"),
      };
    }

    if (!Array.isArray(sale.payment.attachments) || sale.payment.attachments.length === 0) {
      sale.payment.attachments = [
        {
          id: "att-test-1",
          name: "ticket.pdf",
          type: "application/pdf",
          size: 45678,
          dataUrl: mkDataUrl("application/pdf"),
          created_at: new Date().toISOString(),
        },
      ];
    }

    // Si no hay plan en el array, generar uno mínimo acorde a plan_type/mode.
    if (!sale.payment.plans.length) {
      const planType = String(sale.payment.plan_type || "").toLowerCase();
      if (planType === "cuotas") {
        sale.payment.plans = [
          {
            type: "cuotas",
            installments: {
              count: sale.payment.installments?.count ?? 3,
              amount: sale.payment.installments?.amount ?? "1600",
              period_days: 30,
              next_due_date:
                sale.payment.installments?.next_due_date ?? "2026-02-08",
            },
            total: sale.payment.amount ?? null,
            paid_amount: sale.payment.paid_amount ?? null,
          },
        ];
      } else if (planType === "excepcion_2_cuotas") {
        sale.payment.plans = [
          {
            type: "excepcion_2_cuotas",
            first_amount:
              sale.payment.exception_2_installments?.first_amount ?? 1995,
            second_amount:
              sale.payment.exception_2_installments?.second_amount ?? 1995,
            second_due_date:
              sale.payment.exception_2_installments?.second_due_date ??
              "2026-02-08",
            notes:
              sale.payment.exception_2_installments?.notes ??
              "Justificación (test)",
            total: sale.payment.amount ?? 3990,
            paid_amount: sale.payment.paid_amount ?? 1995,
          },
        ];
      } else if (planType === "reserva") {
        sale.payment.plans = [
          {
            type: "reserva",
            reserve: {
              amount: sale.payment.reserve?.amount ?? 500,
              paid_date: sale.payment.reserve?.paid_date ?? "2026-01-08",
              remaining_due_date:
                sale.payment.reserve?.remaining_due_date ?? "2026-01-20",
              notes: sale.payment.reserve?.notes ?? "Reserva (test)",
            },
            total: sale.payment.amount ?? null,
            paid_amount: sale.payment.paid_amount ?? 500,
          },
        ];
      } else {
        sale.payment.plans = [
          {
            type: "contado",
            total: sale.payment.amount ?? 3990,
            paid_amount: sale.payment.paid_amount ?? 3990,
          },
        ];
      }
    }

    nextPayloadCurrent.sale = sale;

    const snapshot = {
      schema_version: 1 as const,
      captured_at: capturedAt,
      captured_by: {
        id: (user as any)?.id ?? null,
        name: (user as any)?.name ?? null,
        email: (user as any)?.email ?? null,
        role: (user as any)?.role ?? null,
      },
      source: {
        record_id: ctx.recordId,
        entity: ctx.entity,
        entity_id: ctx.entityId,
      },
      route: {
        pathname:
          typeof window !== "undefined" ? window.location?.pathname : undefined,
        url: typeof window !== "undefined" ? window.location?.href : undefined,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
      record: {
        id: ctx.recordId,
        entity: ctx.entity,
        entity_id: ctx.entityId,
        created_at: (record as any)?.created_at ?? undefined,
        updated_at: (record as any)?.updated_at ?? undefined,
      },
      payload_current: nextPayloadCurrent,
      computed: {
        lead: {
          status: ctx.leadStatus,
          stage_label: ctx.leadStageLabel,
          disposition: ctx.leadDisposition,
          disposition_label: ctx.leadDispositionLabel,
        },
        sale: {
          status_raw: ctx.statusRaw,
          status_label: ctx.statusLabel,
          payment_mode: ctx.salePayload?.payment?.mode ?? "",
          has_reserva: ctx.hasReserva,
          reserve_amount_raw: String(ctx.reserveAmountRaw ?? ""),
        },
      },
      options: {
        lead_stage_options: ctx.leadStageOptions,
        lead_disposition_options: ctx.leadDispositionOptions,
      },
      draft: draft ?? undefined,
    };

    return {
      entity: "crm_lead_snapshot",
      codigo: id,
      entity_id: `${String(ctx.entity)}:${String(ctx.recordId)}:${capturedAt}`,
      payload: snapshot,
    };
  };

  const buildPaymentExamplesForConsole = () => {
    const mkDataUrl = (mime: string) =>
      `data:${mime};base64,` +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    const proof =
      paymentProof && paymentProof.dataUrl
        ? {
            name: paymentProof.name || "comprobante.png",
            type: paymentProof.type || "image/png",
            size: paymentProof.size || 123456,
            dataUrl: paymentProof.dataUrl,
          }
        : {
            name: "comprobante.png",
            type: "image/png",
            size: 123456,
            dataUrl: mkDataUrl("image/png"),
          };

    const attachment = {
      id: "att-test-1",
      name: "ticket.pdf",
      type: "application/pdf",
      size: 45678,
      dataUrl: mkDataUrl("application/pdf"),
      created_at: new Date().toISOString(),
    };

    const program = String(
      saleDraftPayload?.program || (leadForUi as any)?.program || (record as any)?.program || ""
    ).trim();

    return {
      program,
      payment_examples: [
        {
          type: "contado",
          payment: {
            platform: "hotmart",
            proof,
            attachments: [attachment],
            plans: [
              {
                type: "contado",
                total: 3990,
                paid_amount: 3990,
              },
            ],
          },
        },
        {
          type: "cuotas",
          payment: {
            platform: "paypal",
            proof,
            attachments: [attachment],
            plans: [
              {
                type: "cuotas",
                installments: {
                  count: 3,
                  amount: 1600,
                  period_days: 30,
                  next_due_date: "2026-02-08",
                },
                total: 4800,
                paid_amount: null,
              },
            ],
          },
        },
        {
          type: "excepcion_2_cuotas",
          payment: {
            platform: "binance",
            proof,
            attachments: [attachment],
            plans: [
              {
                type: "excepcion_2_cuotas",
                first_amount: 1995,
                second_amount: 1995,
                second_due_date: "2026-02-08",
                notes: "Justificación (test)",
                total: 3990,
                paid_amount: 1995,
              },
            ],
          },
        },
        {
          type: "reserva",
          payment: {
            platform: "zelle",
            proof,
            attachments: [attachment],
            plans: [
              {
                type: "reserva",
                reserve: {
                  amount: 500,
                  paid_date: "2026-01-08",
                  remaining_due_date: "2026-01-20",
                  notes: "Reserva (test)",
                },
                total: 3990,
                paid_amount: 500,
              },
            ],
          },
        },
      ],
    };
  };

  const buildFullSnapshotExampleForConsole = () => {
    const base = buildSnapshotBodyForConsole();
    if (!base) return null;

    const mkPlan = (type: "contado" | "cuotas" | "excepcion_2_cuotas" | "reserva") => {
      if (type === "contado") {
        return { type, total: 3990, paid_amount: 3990 };
      }
      if (type === "cuotas") {
        return {
          type,
          installments: {
            count: 3,
            amount: 1600,
            period_days: 30,
            next_due_date: "2026-02-08",
          },
          total: 4800,
          paid_amount: null,
        };
      }
      if (type === "excepcion_2_cuotas") {
        return {
          type,
          first_amount: 1995,
          second_amount: 1995,
          second_due_date: "2026-02-08",
          notes: "Justificación (test)",
          total: 3990,
          paid_amount: 1995,
        };
      }
      return {
        type,
        reserve: {
          amount: 500,
          paid_date: "2026-01-08",
          remaining_due_date: "2026-01-20",
          notes: "Reserva (test)",
        },
        total: 3990,
        paid_amount: 500,
      };
    };

    const next: any = JSON.parse(JSON.stringify(base));
    delete next.examples;
    delete next.mock;

    const pc = (next?.payload?.payload_current || {}) as any;
    pc.call = pc.call || {
      outcome: "no_answer",
      result_at: "2026-01-08T15:00:00.000Z",
      notes: "Notas de prueba",
      reschedule: { requested: false, date: "", time: "" },
      negotiation: { active: false, until: null },
      reminders: [],
    };

    pc.sale = pc.sale || {};
    pc.sale.payment = pc.sale.payment || {};

    // Ejemplo: 4 tipos dentro del MISMO payment.plans.
    // Producción enviará 1 plan (seleccionado), pero esto sirve como referencia.
    const keep = pc.sale.payment;
    pc.sale.payment = {
      plan_type: keep.plan_type ?? "contado",
      mode: keep.mode ?? "pago_total",
      platform: keep.platform || "hotmart",
      amount: keep.amount ?? null,
      paid_amount: keep.paid_amount ?? null,
      nextChargeDate: keep.nextChargeDate ?? null,
      hasReserve: !!keep.hasReserve,
      reserveAmount: keep.reserveAmount ?? null,
      attachments: Array.isArray(keep.attachments) ? keep.attachments : [],
      ...(keep.proof ? { proof: keep.proof } : {}),
      plans: [
        mkPlan("contado"),
        mkPlan("cuotas"),
        mkPlan("excepcion_2_cuotas"),
        mkPlan("reserva"),
      ],
    };

    next.payload.payload_current = pc;
    return next;
  };

  const applyRecordPatch = React.useCallback((patch: Record<string, any>) => {
    setRecord((prev: any | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...patch,
      };
    });
  }, []);

  const leadForUi = React.useMemo(() => {
    if (!record) return null;
    const lead = record as any;
    const dateToYmd = (iso?: string | null) => {
      if (!iso) return "";
      try {
        return new Date(iso).toISOString().slice(0, 10);
      } catch {
        return "";
      }
    };

    const callFromLead = {
      outcome: lead.call_outcome ?? null,
      result_at: lead.call_result_at ?? null,
      notes: lead.text_messages ?? null,
      reschedule: {
        requested: !!(lead.call_reschedule_date || lead.call_reschedule_time),
        date: lead.call_reschedule_date
          ? dateToYmd(lead.call_reschedule_date)
          : "",
        time: lead.call_reschedule_time ?? "",
      },
      negotiation: {
        active: !!lead.call_negotiation_active,
        until: lead.call_negotiation_until ?? null,
      },
      reminders: Array.isArray(lead.reminders) ? lead.reminders : [],
    };

    const call = {
      ...callFromLead,
      ...(lead?.call && typeof lead.call === "object" ? lead.call : {}),
    };

    const sale = {
      type: "sale",
      name: lead.name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      program: lead.program ?? "",
      bonuses: Array.isArray(lead.bonuses) ? lead.bonuses : [],
      status: lead.payment_status ?? "",
      notes: lead.sale_notes ?? null,
      payment: {
        mode: lead.payment_mode ?? "",
        amount: lead.payment_amount ?? "",
        hasReserve: !!lead.payment_has_reserve,
        reserveAmount: lead.payment_reserve_amount ?? null,
        platform: lead.payment_platform ?? "",
        nextChargeDate: lead.next_charge_date ?? null,
      },
      contract: {
        thirdParty: !!lead.contract_third_party,
        isCompany: !!lead.contract_is_company,
        status: lead.contract_status ?? "pending",
        parties: Array.isArray(lead.contract_parties)
          ? lead.contract_parties
          : [],
        party: {
          name: lead.name ?? null,
          email: lead.email ?? null,
          phone: lead.phone ?? null,
          address: lead.contract_party_address ?? null,
          city: lead.contract_party_city ?? null,
          country: lead.contract_party_country ?? null,
        },
        company: !!lead.contract_is_company
          ? {
              name: lead.contract_company_name ?? null,
              taxId: lead.contract_company_tax_id ?? null,
              address: lead.contract_company_address ?? null,
              city: lead.contract_company_city ?? null,
              country: lead.contract_company_country ?? null,
            }
          : null,
      },
    };

    return {
      ...lead,
      call,
      sale,
    };
  }, [record]);

  const load = React.useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      try {
        const lead = await getLead(id);
        setRecord(lead as any);
      } catch (e) {
        if (!silent) {
          setRecord(null);
        } else {
          toast({
            title: "Error",
            description: "No se pudo refrescar el lead",
            variant: "destructive",
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  const toLeadIsoDateOrNull = (v?: string | null) => {
    if (!v) return null;
    const s = String(v);
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      try {
        return new Date(`${s}T00:00:00.000Z`).toISOString();
      } catch {
        return s;
      }
    }
    return s;
  };

  const draftToLeadPatch = React.useCallback(
    (d?: Partial<CloseSaleInput> | null) => {
      if (!d) return null;
      return {
        name: d.fullName ?? undefined,
        email: d.email ?? undefined,
        phone: d.phone ?? undefined,
        program: d.program ?? undefined,
        bonuses: Array.isArray(d.bonuses) ? d.bonuses : undefined,

        payment_mode: d.paymentMode ?? undefined,
        payment_amount: d.paymentAmount ?? undefined,
        payment_platform: (d as any).paymentPlatform ?? undefined,
        next_charge_date: toLeadIsoDateOrNull(
          (d as any).nextChargeDate ?? null
        ),
        payment_has_reserve: (d as any).paymentHasReserve ? 1 : 0,
        payment_reserve_amount: (d as any).paymentHasReserve
          ? ((d as any).paymentReserveAmount || null)
          : null,

        sale_notes: (d as any).notes ?? undefined,

        contract_third_party: (d as any).contractThirdParty ? 1 : 0,
        contract_is_company: (d as any).contractIsCompany ? 1 : 0,
        contract_parties: Array.isArray((d as any).contractParties)
          ? (d as any).contractParties
          : undefined,
        contract_party_address: (d as any).contractPartyAddress ?? undefined,
        contract_party_city: (d as any).contractPartyCity ?? undefined,
        contract_party_country: (d as any).contractPartyCountry ?? undefined,
        contract_company_name: (d as any).contractCompanyName ?? undefined,
        contract_company_tax_id: (d as any).contractCompanyTaxId ?? undefined,
        contract_company_address:
          (d as any).contractCompanyAddress ?? undefined,
        contract_company_city: (d as any).contractCompanyCity ?? undefined,
        contract_company_country:
          (d as any).contractCompanyCountry ?? undefined,
      } as Record<string, any>;
    },
    []
  );

  const buildSnapshotContext = () => {
    if (!record) return null;

    const p = (leadForUi as any) || (record as any) || {};
    const salePayload = (p as any).sale || {};

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
      if (v === "en_seguimiento") return "En seguimiento";
      if (v === "pendiente_pago") return "Pendiente de pago";
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
      (reserveAmountNum !== null &&
        !Number.isNaN(reserveAmountNum) &&
        reserveAmountNum > 0) ||
      /reserva|apartado|señ?a|anticipo/i.test(salePaymentMode);

    const recordId =
      (record as any)?.record_id ??
      (record as any)?.id ??
      (record as any)?.codigo ??
      id;
    const entity = (record as any)?.record_entity ?? "crm_lead";
    const entityIdRaw =
      (record as any)?.source_entity_id ?? (record as any)?.entity_id ?? null;
    const entityId = String(entityIdRaw ?? id).trim();

    const leadStageOptions = [
      { value: "new", label: "Nuevo" },
      { value: "contacted", label: "Contactado" },
      { value: "qualified", label: "Calificado" },
      { value: "won", label: "Ganado" },
      { value: "lost", label: "Perdido" },
    ];
    const leadDispositionOptions = [
      { value: "", label: "—" },
      { value: "interesado", label: "Interesado" },
      { value: "en_seguimiento", label: "En seguimiento" },
      { value: "pendiente_pago", label: "Pendiente de pago" },
      { value: "reagendar", label: "Reagendar" },
      { value: "no_responde", label: "No responde" },
      { value: "no_califica", label: "No califica" },
      { value: "no_interesado", label: "No interesado" },
    ];

    return {
      p,
      salePayload,
      leadStatus,
      leadStageLabel,
      leadDisposition,
      leadDispositionLabel,
      statusRaw,
      statusLabel,
      reserveAmountRaw,
      hasReserva,
      recordId,
      entity,
      entityId,
      leadStageOptions,
      leadDispositionOptions,
    } as const;
  };

  const handleSaveChanges = React.useCallback(async () => {
    if (!record) return;
    if (snapshotSaving) return;

    const ctx = buildSnapshotContext();
    if (!ctx) return;

    // Nota: algunos leads no traen source_entity_id/entity_id desde el backend.
    // En ese caso usamos el `codigo` del lead como fallback para source.entity_id.

    // Guardado centralizado: un solo POST /v1/leads/snapshot.
    // El backend usa `codigo` + `payload.payload_current` para actualizar el lead
    // y además registra el snapshot.
    const capturedAt = new Date().toISOString();
    const patch = draftToLeadPatch(draft);
    const snapshotPayloadCurrent = {
      ...(leadForUi || record),
      ...(patch || {}),
      ...(saleDraftPayload ? { sale: saleDraftPayload } : {}),
      ...(paymentProof
        ? {
            payment_proof: {
              dataUrl: paymentProof.dataUrl,
              name: paymentProof.name,
              type: paymentProof.type,
              size: paymentProof.size,
            },
          }
        : {}),
    };

    setSnapshotSaving(true);
    try {
      const snapshot = {
        schema_version: 1 as const,
        captured_at: capturedAt,
        captured_by: {
          id: (user as any)?.id ?? null,
          name: (user as any)?.name ?? null,
          email: (user as any)?.email ?? null,
          role: (user as any)?.role ?? null,
        },
        source: {
          record_id: ctx.recordId,
          entity: ctx.entity,
          entity_id: ctx.entityId,
        },
        route: {
          pathname:
            typeof window !== "undefined"
              ? window.location?.pathname
              : undefined,
          url:
            typeof window !== "undefined" ? window.location?.href : undefined,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
        record: {
          id: ctx.recordId,
          entity: ctx.entity,
          entity_id: ctx.entityId,
          created_at: (record as any)?.created_at ?? undefined,
          updated_at: (record as any)?.updated_at ?? undefined,
        },
        payload_current: snapshotPayloadCurrent,
        computed: {
          lead: {
            status: ctx.leadStatus,
            stage_label: ctx.leadStageLabel,
            disposition: ctx.leadDisposition,
            disposition_label: ctx.leadDispositionLabel,
          },
          sale: {
            status_raw: ctx.statusRaw,
            status_label: ctx.statusLabel,
            payment_mode: ctx.salePayload?.payment?.mode ?? "",
            has_reserva: ctx.hasReserva,
            reserve_amount_raw: String(ctx.reserveAmountRaw ?? ""),
          },
        },
        options: {
          lead_stage_options: ctx.leadStageOptions,
          lead_disposition_options: ctx.leadDispositionOptions,
        },
        draft: draft ?? undefined,
      };

      await createLeadSnapshot({
        codigo: id,
        source: {
          record_id: ctx.recordId,
          entity: ctx.entity,
          entity_id: ctx.entityId,
        },
        snapshot,
      });

      toast({ title: "Cambios guardados" });
      await load({ silent: true });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setSnapshotSaving(false);
    }
  }, [draft, draftToLeadPatch, id, leadForUi, load, paymentProof, record, saleDraftPayload, snapshotSaving, user]);

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

  if (!record) {
    return (
      <div className="p-6">
        <Card className="p-6">No se encontró el lead solicitado.</Card>
      </div>
    );
  }

  const p = (leadForUi as any) || (record as any) || {};
  const salePayload = (p as any).sale || {};

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
    if (v === "en_seguimiento") return "En seguimiento";
    if (v === "pendiente_pago") return "Pendiente de pago";
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

  const salePaymentMode = String(
    salePayload?.payment?.mode || ""
  ).toLowerCase();
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
    (reserveAmountNum !== null &&
      !Number.isNaN(reserveAmountNum) &&
      reserveAmountNum > 0) ||
    /reserva|apartado|señ?a|anticipo/i.test(salePaymentMode);

  // NOTE: handlers definidos arriba para respetar el orden de hooks.

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
    paymentReserveAmount: (salePayload?.payment?.reserveAmount ??
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

  const callOutcomeLabel = (raw?: any) => {
    const v = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (!v) return "—";
    if (v === "attended") return "Asistencia";
    if (v === "no_show" || v === "noshow") return "No asistió";
    if (v === "cancelled" || v === "canceled") return "Cancelada";
    return String(raw);
  };

  const paymentStatusLabel = (raw?: any) => {
    const v = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (!v) return "—";
    if (v === "payment_verification_pending") return "verificación de pago";
    if (v === "payment_confirmed") return "pago confirmado";
    if (v === "active" || v === "active_provisional") return "activo";
    if (v === "cancelled" || v === "lost") return "cancelada";
    if (v === "operational_closure") return "cierre operativo";
    if (v === "contract_sent") return "contrato enviado";
    if (v === "contract_signed") return "contrato firmado";
    return v.replace(/_/g, " ");
  };

  const bonusesList: string[] = Array.isArray(initial?.bonuses)
    ? (initial.bonuses as string[])
    : [];


  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">
            {p.name || salePayload?.name || "Detalle del lead"}
          </h1>
          <div className="text-sm text-muted-foreground">
            Lead • Código: {record.codigo}
            {record.record_id
              ? ` • Record: ${record.record_entity || "—"} #${record.record_id}`
              : ""}
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
          <Button
            variant="outline"
            onClick={handleSaveChanges}
            disabled={snapshotSaving}
            className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:ring-teal-300"
          >
            {snapshotSaving ? "Guardando..." : "Guardar cambios"}
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

                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  Detalle (API)
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Instagram</span>
                    <span className="truncate">
                      {p.instagram_user || p.instagramUser || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Programa</span>
                    <span className="truncate">
                      {p.program || salePayload?.program || "—"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Bonos</span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {bonusesList.length ? (
                        bonusesList.map((b) => (
                          <Badge key={b} variant="secondary">
                            {b}
                          </Badge>
                        ))
                      ) : (
                        <span className="truncate">—</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      Presupuesto mensual
                    </span>
                    <span className="truncate">
                      {(p.monthly_budget ?? p.monthlyBudget) === null ||
                      (p.monthly_budget ?? p.monthlyBudget) === undefined
                        ? "—"
                        : String(p.monthly_budget ?? p.monthlyBudget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      Plataforma llamada
                    </span>
                    <span className="truncate">
                      {p.platform_call || p.platformCall || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      Resultado llamada
                    </span>
                    <span className="truncate">
                      {callOutcomeLabel(
                        p.call_outcome || p.callOutcome || p.call?.outcome
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="truncate">
                      {p.payment_status
                        ? paymentStatusLabel(p.payment_status)
                        : statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Monto</span>
                    <span className="truncate">
                      {(p.payment_amount ?? salePayload?.payment?.amount) ===
                        null ||
                      (p.payment_amount ?? salePayload?.payment?.amount) ===
                        undefined
                        ? "—"
                        : String(
                            p.payment_amount ?? salePayload?.payment?.amount
                          )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Próximo cobro</span>
                    <span className="truncate">
                      {p.next_charge_date ||
                      salePayload?.payment?.nextChargeDate
                        ? fmtDate(
                            p.next_charge_date ||
                              salePayload?.payment?.nextChargeDate
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Recordatorios</span>
                    <span className="truncate">
                      {Array.isArray(p.reminders)
                        ? p.reminders.length
                        : Array.isArray(p.call?.reminders)
                        ? p.call.reminders.length
                        : 0}
                    </span>
                  </div>
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
                  <Select
                    value={leadStatus}
                    onValueChange={(next) => {
                      // No persistir aquí: se guarda con el botón "Guardar cambios" (snapshot).
                      applyRecordPatch({ status: next });
                    }}
                  >
                    <SelectTrigger id="lead-stage" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nuevo</SelectItem>
                      <SelectItem value="contacted">Contactado</SelectItem>
                      <SelectItem value="qualified">Calificado</SelectItem>
                      <SelectItem value="won">Ganado</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="lead-disposition">Estado comercial</Label>
                  <Select
                    value={leadDisposition || "__empty__"}
                    onValueChange={(next) => {
                      applyRecordPatch({
                        lead_disposition: next === "__empty__" ? null : next,
                      });
                      // No persistir aquí: se guarda con el botón "Guardar cambios" (snapshot).
                    }}
                  >
                    <SelectTrigger id="lead-disposition" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">—</SelectItem>
                      <SelectItem value="interesado">Interesado</SelectItem>
                      <SelectItem value="en_seguimiento">
                        En seguimiento
                      </SelectItem>
                      <SelectItem value="pendiente_pago">
                        Pendiente de pago
                      </SelectItem>
                      <SelectItem value="reagendar">Reagendar</SelectItem>
                      <SelectItem value="no_responde">No responde</SelectItem>
                      <SelectItem value="no_califica">No califica</SelectItem>
                      <SelectItem value="no_interesado">No interesado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Se guarda al presionar “Guardar cambios”.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <CallFlowManager
            leadCodigo={id}
            payload={p}
            persistMode="local"
            onSaved={(nextCall) => {
              if (!nextCall) return;

              const toMidnightIso = (date?: string | null) => {
                if (!date) return null;
                const s = String(date);
                if (s.includes("T")) return s;
                try {
                  return new Date(`${s}T00:00:00.000Z`).toISOString();
                } catch {
                  return s;
                }
              };

              applyRecordPatch({
                call: nextCall,
                call_outcome: nextCall?.outcome ?? null,
                call_result_at: nextCall?.result_at ?? null,
                call_reschedule_date: toMidnightIso(
                  nextCall?.reschedule?.date ?? null
                ),
                call_reschedule_time: nextCall?.reschedule?.time ?? null,
                call_negotiation_active: nextCall?.negotiation?.active ? 1 : 0,
                call_negotiation_until: nextCall?.negotiation?.until ?? null,
                reminders: Array.isArray(nextCall?.reminders)
                  ? nextCall.reminders
                  : [],
                ...(nextCall?.notes !== undefined
                  ? { text_messages: nextCall?.notes ?? null }
                  : {}),
              });
            }}
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
                      payload={saleDraftPayload || salePayload}
                      draft={draft || undefined}
                      leadCodigo={id}
                      entity="booking"
                      persistMode="local"
                      title="Contrato / resumen"
                      onUpdated={() => load({ silent: true })}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const body = buildSnapshotBodyForConsole();
                    if (!body) {
                      toast({
                        title: "No disponible",
                        description: "No se pudo construir el body en este momento.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const sanitized = sanitizeForBackendExample(body);
                    console.log("[CRM] Body snapshot (data test)", sanitized);
                    toast({
                      title: "Impreso en consola",
                      description:
                        "Se imprimió el body completo con data de prueba (base64 truncado).",
                    });
                  }}
                >
                  Imprimir body
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const examples = buildPaymentExamplesForConsole();
                    const sanitized = sanitizeForBackendExample(examples);
                    console.log("[CRM] Tipos de pago (data test)", sanitized);
                    toast({
                      title: "Impreso en consola",
                      description:
                        "Se imprimieron los tipos de pago con data de prueba (base64 truncado).",
                    });
                  }}
                >
                  Imprimir tipos de pago
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const full = buildFullSnapshotExampleForConsole();
                    if (!full) {
                      toast({
                        title: "No disponible",
                        description: "No se pudo construir el JSON completo.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const sanitized = sanitizeForBackendExample(full);
                    console.log("[CRM] Snapshot completo (payment.plans con 4 tipos, test)", sanitized);
                    toast({
                      title: "Impreso en consola",
                      description:
                        "Se imprimió 1 snapshot completo con 4 tipos en payment.plans (sin payment_examples; base64 truncado).",
                    });
                  }}
                >
                  Imprimir JSON completo (4 tipos)
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Pago con reserva:{" "}
                <span className="text-foreground">
                  {hasReserva ? "Sí" : "No"}
                </span>
                {hasReserva ? (
                  <>
                    {" "}
                    · Monto reserva:{" "}
                    <span className="text-foreground">
                      {String(reserveAmountRaw ?? "—")}
                    </span>
                  </>
                ) : null}
              </div>
              <CloseSaleForm
                mode="edit"
                leadCodigo={id}
                entity="booking"
                initial={initial}
                autoSave={false}
                persistMode="local"
                onChange={(f: CloseSaleInput) => setDraft({ ...f })}
                onPaymentProofChange={setPaymentProof}
                onSalePayloadChange={setSaleDraftPayload}
                onDone={() => {
                  // En modo local no persistimos aquí: se guarda con snapshot.
                  toast({
                    title: "Listo para guardar",
                    description:
                      "Estos cambios se guardarán al presionar “Guardar cambios”.",
                  });
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
