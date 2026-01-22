"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { createLeadSnapshot, getLead } from "@/app/admin/crm/api";
import { type CloseSaleInput } from "../../components/CloseSaleForm2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { StageBadge } from "@/app/admin/crm/components/StageBadge";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabResumen } from "./components/TabResumen";
import { TabSeguimiento } from "./components/TabSeguimiento";
import { TabVenta } from "./components/TabVenta";
import { TabNotas } from "./components/TabNotas";

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
    null,
  );
  // Congelamos los valores iniciales del formulario para evitar loops.
  // Motivo: `draft` se actualiza con cada tecla para la vista previa; si `initial`
  // depende de `draft`, CloseSaleForm2 re-sincroniza su estado y se genera un loop.
  const [frozenSaleInitial, setFrozenSaleInitial] =
    React.useState<Partial<CloseSaleInput> | null>(null);
  const [saleDraftPayload, setSaleDraftPayload] = React.useState<any | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [snapshotSaving, setSnapshotSaving] = React.useState(false);

  // Guardado en navegador (localStorage) como fallback.
  const localStorageKey = React.useMemo(() => `crm:booking:${id}`, [id]);
  const hydratedRef = React.useRef<string | null>(null);
  const didHydrateFromLocalStorageRef = React.useRef(false);

  const hydrateFromLocalStorage = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(localStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      didHydrateFromLocalStorageRef.current = true;
      if (parsed?.record) setRecord(parsed.record);
      if (parsed?.draft) setDraft(parsed.draft);
      if (parsed?.saleDraftPayload)
        setSaleDraftPayload(parsed.saleDraftPayload);
    } catch {}
  }, [localStorageKey]);

  React.useEffect(() => {
    if (hydratedRef.current === id) return;
    hydratedRef.current = id;
    didHydrateFromLocalStorageRef.current = false;
    setFrozenSaleInitial(null);
    hydrateFromLocalStorage();
  }, [hydrateFromLocalStorage, id]);

  React.useEffect(() => {
    if (!record) return;
    const t = window.setTimeout(() => {
      try {
        const next = {
          version: 1,
          saved_at: new Date().toISOString(),
          record,
          draft,
          saleDraftPayload,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(next));
      } catch {}
    }, 250);
    return () => window.clearTimeout(t);
  }, [draft, localStorageKey, record, saleDraftPayload]);

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
          // Si falla el backend, intentamos usar el borrador local.
          hydrateFromLocalStorage();
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
    [hydrateFromLocalStorage, id],
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
          (d as any).nextChargeDate ?? null,
        ),
        payment_has_reserve: (d as any).paymentHasReserve ? 1 : 0,
        payment_reserve_amount: (d as any).paymentHasReserve
          ? (d as any).paymentReserveAmount || null
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
    [],
  );

  const buildSnapshotContext = React.useCallback(() => {
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
        v === "appointment_attended" ||
        v === "active_follow_up" ||
        v === "pending_payment" ||
        v === "won" ||
        v === "lost"
      )
        return v;
      if (v === "nuevo") return "new";
      if (v === "contactado") return "contacted";
      if (v === "cita atendida" || v === "cita_atendida")
        return "appointment_attended";
      if (v === "seguimiento activo" || v === "seguimiento_activo")
        return "active_follow_up";
      if (v === "pendiente de pago" || v === "pendiente_pago")
        return "pending_payment";
      if (v === "ganado") return "won";
      if (v === "perdido") return "lost";
      return "new";
    };

    const leadStatus = normalizeLeadStatus(p.status);
    const leadStageLabel = (() => {
      if (leadStatus === "new") return "Lead Nuevo";
      if (leadStatus === "contacted") return "Contactado";
      if (leadStatus === "appointment_attended") return "Cita Atendida";
      if (leadStatus === "active_follow_up") return "Seguimiento Activo";
      if (leadStatus === "pending_payment") return "Pendiente de Pago";
      if (leadStatus === "won") return "Cerrado – Ganado";
      if (leadStatus === "lost") return "Cerrado – Perdido";
      return "Lead Nuevo";
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
      salePayload?.payment?.mode || "",
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
      { value: "new", label: "Lead Nuevo" },
      { value: "contacted", label: "Contactado" },
      { value: "appointment_attended", label: "Cita Atendida" },
      { value: "active_follow_up", label: "Seguimiento Activo" },
      { value: "pending_payment", label: "Pendiente de Pago" },
      { value: "won", label: "Cerrado – Ganado" },
      { value: "lost", label: "Cerrado – Perdido" },
    ];
    const leadDispositionOptions = [
      { value: "", label: "—" },

      // 2. Contactado
      {
        value: "conversation_started",
        label: "Contactado · Conversación iniciada",
      },
      { value: "appointment_scheduled", label: "Contactado · Cita agendada" },
      { value: "appointment_cancelled", label: "Contactado · Cita cancelada" },
      {
        value: "appointment_rescheduled",
        label: "Contactado · Cita reprogramada",
      },
      { value: "no_response", label: "Contactado · No responde" },
      { value: "no_show", label: "Contactado · No show" },

      // 3. Cita atendida
      {
        value: "diagnosis_done",
        label: "Cita atendida · Diagnóstico realizado",
      },
      {
        value: "offer_not_presented",
        label: "Cita atendida · Oferta no presentada",
      },
      {
        value: "offer_presented",
        label: "Cita atendida · Oferta presentada",
      },

      // 4. Seguimiento activo
      {
        value: "interested_evaluating",
        label: "Seguimiento · Interesado (evaluando)",
      },
      { value: "waiting_response", label: "Seguimiento · Esperando respuesta" },
      {
        value: "waiting_approval",
        label: "Seguimiento · Esperando aprobación",
      },
      { value: "cold", label: "Seguimiento · Frío" },

      // 5. Pendiente de pago
      { value: "reserve", label: "Pendiente de pago · Reserva" },
      {
        value: "card_unlocking",
        label: "Pendiente de pago · Gestión de tarjetas/límite",
      },
      {
        value: "getting_money",
        label: "Pendiente de pago · Consiguiendo el dinero",
      },

      // 7. Cerrado – Perdido (motivo obligatorio)
      {
        value: "lost_price_too_high",
        label: "Perdido · Precio muy alto",
      },
      {
        value: "lost_no_urgency",
        label: "Perdido · No tiene urgencia",
      },
      { value: "lost_trust", label: "Perdido · Confianza" },
      {
        value: "lost_external_decision",
        label: "Perdido · Decisión externa",
      },
      {
        value: "lost_no_response_exhausted",
        label: "Perdido · No respondió (proceso agotado)",
      },
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
  }, [draft, id, leadForUi, record]);

  const handleSaveChanges = React.useCallback(async () => {
    if (!record) return;
    if (snapshotSaving) return;

    const ctx = buildSnapshotContext();
    if (!ctx) return;

    // Validación: si está en Perdido, es obligatorio registrar un solo motivo.
    if (String(ctx.leadStatus || "").toLowerCase() === "lost") {
      const motive = String(ctx.leadDisposition || "").trim();
      if (!motive) {
        toast({
          title: "Falta el motivo",
          description:
            "Para guardar un lead en Perdido debes seleccionar un motivo (en la pestaña Notas).",
          variant: "destructive",
        });
        return;
      }
    }

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

      try {
        const next = {
          version: 1,
          saved_at: new Date().toISOString(),
          record,
          draft,
          saleDraftPayload,
          last_snapshot: snapshot,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(next));
      } catch {}

      try {
        await load({ silent: true });
      } catch {}

      toast({
        title: "Guardado",
        description: "Se guardó el snapshot y se actualizó el lead.",
      });
    } catch (err: any) {
      try {
        const next = {
          version: 1,
          saved_at: new Date().toISOString(),
          record,
          draft,
          saleDraftPayload,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(next));
      } catch {}

      toast({
        title: "Error",
        description:
          err?.message ||
          "No se pudo guardar en backend (se dejó un borrador local)",
        variant: "destructive",
      });
    } finally {
      setSnapshotSaving(false);
    }
  }, [
    buildSnapshotContext,
    load,
    draft,
    draftToLeadPatch,
    id,
    leadForUi,
    localStorageKey,
    record,
    saleDraftPayload,
    snapshotSaving,
    user,
  ]);

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Derivados del lead/venta (hooks SIEMPRE se ejecutan, antes de returns) ---
  const p = React.useMemo(
    () => (leadForUi as any) || (record as any) || {},
    [leadForUi, record],
  );
  const salePayload = React.useMemo(() => (p as any).sale || {}, [p]);
  const effectiveSalePayload = React.useMemo(
    () => saleDraftPayload || salePayload,
    [saleDraftPayload, salePayload],
  );

  const initialBase: Partial<CloseSaleInput> = React.useMemo(() => {
    if (!record) return {} as any;

    const toDateInput = (v: any) => {
      const s = typeof v === "string" ? v.trim() : "";
      if (!s) return "";
      // soporta YYYY-MM-DD o ISO
      return s.length >= 10 ? s.slice(0, 10) : s;
    };

    const toBonusesArray = (v: any) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string")
        return v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      return [];
    };

    const pay: any = salePayload?.payment ?? {};
    const plan0: any = Array.isArray(pay?.plans) ? pay.plans[0] : null;
    const ex: any =
      pay?.exception_2_installments ?? pay?.exception2Installments ?? null;
    const stdScheduleRaw: any =
      pay?.installments_schedule ??
      pay?.installments?.schedule ??
      pay?.installments?.items ??
      plan0?.installments?.schedule ??
      plan0?.installments?.items ??
      null;
    const stdScheduleList = Array.isArray(stdScheduleRaw)
      ? stdScheduleRaw
      : [];
    const customRaw: any =
      pay?.custom_installments ?? plan0?.custom_installments ?? null;
    const customList = Array.isArray(customRaw) ? customRaw : [];

    const paymentCustomInstallments = customList.length
      ? customList.map((it: any, idx: number) => ({
          id: String(it?.id || `ci_${idx}`),
          amount: String(it?.amount ?? ""),
          dueDate: toDateInput(it?.due_date ?? it?.dueDate ?? ""),
        }))
      : ex
        ? [
            {
              id: "ci_0",
              amount: String(ex?.first_amount ?? ""),
              dueDate: "",
            },
            {
              id: "ci_1",
              amount: String(ex?.second_amount ?? ""),
              dueDate: toDateInput(ex?.second_due_date ?? ""),
            },
          ]
        : [];

    const paymentInstallmentsSchedule = stdScheduleList.length
      ? stdScheduleList.map((it: any, idx: number) => ({
          id: String(it?.id || `si_${idx}`),
          amount: String(it?.amount ?? ""),
          dueDate: toDateInput(it?.due_date ?? it?.dueDate ?? ""),
        }))
      : [];

    return {
      fullName: p.name || salePayload?.name || "",
      email: p.email || salePayload?.email || "",
      phone: p.phone || salePayload?.phone || "",
      program: salePayload?.program ?? "",
      bonuses: toBonusesArray(salePayload?.bonuses),
      paymentMode: pay?.mode ?? "",
      paymentAmount: pay?.amount ?? "",
      paymentPaidAmount: pay?.paid_amount ?? "",
      paymentPlanType: pay?.plan_type ?? undefined,
      paymentInstallmentsCount: pay?.installments?.count ?? undefined,
      paymentInstallmentAmount: pay?.installments?.amount ?? undefined,
      paymentInstallmentsSchedule,
      paymentFirstInstallmentAmount: ex?.first_amount ?? undefined,
      paymentSecondInstallmentAmount: ex?.second_amount ?? undefined,
      paymentSecondInstallmentDate: toDateInput(ex?.second_due_date ?? ""),
      paymentCustomInstallments,
      paymentExceptionNotes: ex?.notes ?? plan0?.notes ?? "",
      paymentHasReserve: !!(
        pay?.hasReserve ||
        pay?.reserveAmount ||
        pay?.reservationAmount ||
        pay?.reserva ||
        pay?.deposit ||
        pay?.downPayment ||
        pay?.anticipo ||
        /reserva|apartado|señ?a|anticipo/i.test(
          String(pay?.mode || "").toLowerCase(),
        )
      ),
      paymentReserveAmount: (pay?.reserveAmount ??
        pay?.reservationAmount ??
        pay?.reserva ??
        pay?.deposit ??
        pay?.downPayment ??
        pay?.anticipo ??
        "") as any,
      paymentPlatform: pay?.platform ?? "hotmart",
      nextChargeDate: pay?.nextChargeDate ?? "",
      contractThirdParty: !!salePayload?.contract?.thirdParty,
      contractPartyName: salePayload?.contract?.party?.name || p.name || "",
      contractPartyEmail: salePayload?.contract?.party?.email || p.email || "",
      contractPartyPhone: salePayload?.contract?.party?.phone || p.phone || "",
      notes: salePayload?.notes ?? "",
      status: salePayload?.status ?? undefined,
    } as any;
  }, [p, record, salePayload]);

  React.useEffect(() => {
    if (frozenSaleInitial) return;
    if (!record) return;

    // Si el draft viene de localStorage (hidratación), lo aplicamos UNA sola vez.
    if (
      didHydrateFromLocalStorageRef.current &&
      draft &&
      typeof draft === "object"
    ) {
      setFrozenSaleInitial({
        ...initialBase,
        ...draft,
        bonuses: Array.isArray((draft as any).bonuses)
          ? (draft as any).bonuses
          : (initialBase as any).bonuses,
      });
      return;
    }

    setFrozenSaleInitial(initialBase);
  }, [draft, frozenSaleInitial, initialBase, record]);

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

  const normalizeLeadStatus = (raw?: any) => {
    const v = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (!v) return "new";
    if (
      v === "new" ||
      v === "contacted" ||
      v === "appointment_attended" ||
      v === "active_follow_up" ||
      v === "pending_payment" ||
      v === "won" ||
      v === "lost"
    )
      return v;
    if (v === "nuevo") return "new";
    if (v === "contactado") return "contacted";
    if (v === "cita atendida" || v === "cita_atendida")
      return "appointment_attended";
    if (v === "seguimiento activo" || v === "seguimiento_activo")
      return "active_follow_up";
    if (v === "pendiente de pago" || v === "pendiente_pago")
      return "pending_payment";
    if (v === "ganado") return "won";
    if (v === "perdido") return "lost";
    return "new";
  };

  const leadStatus = normalizeLeadStatus(p.status);
  const leadStageLabel = (() => {
    if (leadStatus === "new") return "Lead Nuevo";
    if (leadStatus === "contacted") return "Contactado";
    if (leadStatus === "appointment_attended") return "Cita Atendida";
    if (leadStatus === "active_follow_up") return "Seguimiento Activo";
    if (leadStatus === "pending_payment") return "Pendiente de Pago";
    if (leadStatus === "won") return "Cerrado – Ganado";
    if (leadStatus === "lost") return "Cerrado – Perdido";
    return "Lead Nuevo";
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
    salePayload?.payment?.mode || "",
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

  const initial: Partial<CloseSaleInput> = frozenSaleInitial ?? initialBase;

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

  const bonusesList: string[] = Array.isArray((draft as any)?.bonuses)
    ? ((draft as any).bonuses as string[])
    : Array.isArray(initial?.bonuses)
      ? (initial.bonuses as string[])
      : [];

  const planSummary = (() => {
    const plan0 = (effectiveSalePayload as any)?.payment?.plans?.[0];
    const type = String(
      plan0?.type || (effectiveSalePayload as any)?.payment?.plan_type || "",
    )
      .trim()
      .toLowerCase();

    if (!type) return "—";
    if (type === "contado") return "Contado";
    if (type === "cuotas") {
      const count = plan0?.installments?.count;
      const amount = plan0?.installments?.amount;
      if (count && amount) return `Cuotas: ${count} x ${amount}`;
      return "Cuotas";
    }
    if (type === "excepcion_2_cuotas") {
      const a = plan0?.first_amount;
      const b = plan0?.second_amount;
      const due = plan0?.second_due_date;
      const parts = ["Excepción 2 cuotas"];
      if (a || b) parts.push(`(${String(a ?? "?")} + ${String(b ?? "?")})`);
      if (due) parts.push(`vence ${fmtDate(due)}`);
      return parts.join(" ");
    }
    if (type === "reserva") {
      const amount = plan0?.reserve?.amount;
      const due = plan0?.reserve?.remaining_due_date;
      const parts = ["Reserva"];
      if (amount) parts.push(`(${String(amount)})`);
      if (due) parts.push(`resto vence ${fmtDate(due)}`);
      return parts.join(" ");
    }
    return type;
  })();

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

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="sticky top-0 z-30 w-full justify-start rounded-md border border-slate-200 bg-white/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-white/75 overflow-x-auto">
          <TabsTrigger value="resumen" className="text-xs sm:text-sm">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="venta" className="text-xs sm:text-sm">
            Venta
          </TabsTrigger>
          <TabsTrigger value="seguimiento" className="text-xs sm:text-sm">
            Seguimiento
          </TabsTrigger>
          <TabsTrigger value="notas" className="text-xs sm:text-sm">
            Notas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6">
          <TabResumen
            p={p}
            record={record}
            salePayload={salePayload}
            effectiveSalePayload={effectiveSalePayload}
            draft={draft}
            leadStatus={leadStatus}
            leadDisposition={leadDisposition}
            statusLabel={statusLabel}
            planSummary={planSummary}
            bonusesList={bonusesList}
            fmtDate={fmtDate}
            callOutcomeLabel={callOutcomeLabel}
            paymentStatusLabel={paymentStatusLabel}
            applyRecordPatch={applyRecordPatch}
          />
        </TabsContent>

        <TabsContent value="venta" className="mt-6">
          <TabVenta
            id={id}
            effectiveSalePayload={effectiveSalePayload}
            draft={draft}
            initial={initial}
            hasReserva={hasReserva}
            reserveAmountRaw={reserveAmountRaw}
            setDraft={setDraft}
            setSaleDraftPayload={setSaleDraftPayload}
          />
        </TabsContent>

        <TabsContent value="seguimiento" className="mt-6">
          <TabSeguimiento id={id} p={p} applyRecordPatch={applyRecordPatch} />
        </TabsContent>

        <TabsContent value="notas" className="mt-6">
          <TabNotas p={p} user={user} applyRecordPatch={applyRecordPatch} />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 z-40 -mx-6 mt-8 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Los cambios se aplican al presionar "Guardar cambios".
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveChanges}
              disabled={snapshotSaving}
              className="bg-teal-600 text-white border border-teal-700 hover:bg-teal-600 hover:text-white focus-visible:ring-teal-300"
            >
              {snapshotSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
