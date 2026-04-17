"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  getLead,
  updateLeadFull,
  updateMetadataPayload,
} from "@/app/admin/crm/api";
import { type CloseSaleInput } from "../../components/CloseSaleForm2";
import {
  createMetadata,
  getMetadata,
  listMetadata,
  type MetadataRecord,
} from "@/lib/metadata";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { StageBadge } from "@/app/admin/crm/components/StageBadge";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabResumen } from "./components/TabResumen";
import { TabSeguimiento } from "./components/TabSeguimiento";
import { TabVenta } from "./components/TabVenta";
import { TabNotas } from "./components/TabNotas";

const CUSTOMER_PROFILE_KEYS = [
  "current_context",
  "program_interest",
  "objectives",
  "niche_project",
  "relevant_crm_data",
] as const;

const CRM_PIPELINE_OPTIONS = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "no_show", label: "No Show" },
  { value: "llamada_realizada", label: "Llamada realizada" },
  { value: "decision", label: "Decisión" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "recuperacion", label: "Recuperación" },
  { value: "lead_dormido", label: "Lead dormido" },
  { value: "cerrado_ganado", label: "Cerrado ganado" },
  { value: "cerrado_perdido", label: "Cerrado perdido" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "pro", label: "Pro" },
  { value: "starter", label: "Starter" },
  { value: "no_califica", label: "No califica" },
];

const PRODUCT_PRESENTED_OPTIONS = [
  { value: "hotselling_pro", label: "Hotselling PRO" },
  { value: "hotselling_foundation", label: "Hotselling Foundation" },
];

const OBJECTION_OPTIONS = [
  { value: "financiera", label: "Financiera" },
  { value: "momento", label: "Momento" },
  { value: "confianza", label: "Confianza" },
  { value: "falta_claridad", label: "Falta de claridad" },
  { value: "contractual", label: "Contractual" },
  { value: "consulta_socio", label: "Consulta con socio" },
  { value: "otro", label: "Otro" },
];

const LOST_REASON_OPTIONS = [
  { value: "no_califica", label: "No califica" },
  { value: "precio_alto", label: "Precio alto" },
  { value: "sin_urgencia", label: "Sin urgencia" },
  { value: "decision_externa", label: "Decisión externa" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "competencia", label: "Eligió otra opción" },
  { value: "otro", label: "Otro" },
];

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "Lead Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "appointment_attended", label: "Cita Atendida" },
  { value: "active_follow_up", label: "Seguimiento Activo" },
  { value: "pending_payment", label: "Pendiente de Pago" },
  { value: "won", label: "Cerrado – Ganado" },
  { value: "lost", label: "Cerrado – Perdido" },
];

const LEAD_DISPOSITION_OPTIONS = [
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
  {
    value: "interested_evaluating",
    label: "Seguimiento · Interesado (evaluando)",
  },
  {
    value: "waiting_response",
    label: "Seguimiento · Esperando respuesta",
  },
  {
    value: "waiting_approval",
    label: "Seguimiento · Esperando aprobación",
  },
  { value: "cold", label: "Seguimiento · Frío" },
  { value: "reserve", label: "Pendiente de pago · Reserva" },
  {
    value: "card_unlocking",
    label: "Pendiente de pago · Gestión de tarjetas/límite",
  },
  {
    value: "getting_money",
    label: "Pendiente de pago · Consiguiendo el dinero",
  },
  { value: "lost_price_too_high", label: "Perdido · Precio muy alto" },
  { value: "lost_no_urgency", label: "Perdido · No tiene urgencia" },
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

const LEAD_PUT_FIELD_KEYS = new Set([
  "name",
  "email",
  "phone",
  "source",
  "origen",
  "created_at",
  "status",
  "pipeline_status",
  "metadata_id",
]);

function pipelineLevel(status: string): number {
  switch (status) {
    case "agendado":
      return 1;
    case "confirmado":
      return 2;
    case "no_show":
    case "llamada_realizada":
      return 3;
    case "decision":
      return 4;
    case "seguimiento":
      return 5;
    case "recuperacion":
      return 6;
    case "lead_dormido":
      return 7;
    case "cerrado_ganado":
    case "cerrado_perdido":
      return 8;
    default:
      return 0;
  }
}

function HeaderSelectField({
  label,
  value,
  onValueChange,
  options,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allowEmpty?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 border-slate-200 bg-white text-sm text-slate-700">
          <SelectValue placeholder="Seleccionar" />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty ? (
            <SelectItem value="__empty__">Sin definir</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function normalizeCustomerProfile(value: any) {
  const raw = value && typeof value === "object" ? value : {};

  return {
    current_context: String(raw.current_context ?? ""),
    program_interest: String(raw.program_interest ?? ""),
    objectives: String(raw.objectives ?? ""),
    niche_project: String(raw.niche_project ?? ""),
    relevant_crm_data: String(raw.relevant_crm_data ?? ""),
  };
}

function buildChangedFields(
  current: Record<string, any> | null | undefined,
  next: Record<string, any>,
) {
  const base = current && typeof current === "object" ? current : {};
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => {
      if (value === undefined) return false;
      try {
        return JSON.stringify(base[key]) !== JSON.stringify(value);
      } catch {
        return base[key] !== value;
      }
    }),
  );
}

function serializeCustomerProfile(value: any) {
  const profile = normalizeCustomerProfile(value);
  return JSON.stringify(
    CUSTOMER_PROFILE_KEYS.reduce(
      (acc, key) => {
        acc[key] = String(profile[key] ?? "").trim();
        return acc;
      },
      {} as Record<(typeof CUSTOMER_PROFILE_KEYS)[number], string>,
    ),
  );
}

function omitLeadPutFields(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => !LEAD_PUT_FIELD_KEYS.has(key) && value !== undefined,
    ),
  );
}

function getLeadMetadataId(value: any) {
  const raw = value?.metadata_id ?? value?.crm_metadata_id ?? null;
  if (raw === null || raw === undefined) return null;
  const normalized = String(raw).trim();
  return normalized ? normalized : null;
}

function metadataBelongsToLead(item: MetadataRecord<any>, leadCodigo: string) {
  const normalizedLeadCodigo = String(leadCodigo ?? "").trim();
  if (!normalizedLeadCodigo) return false;

  const entityId = String(item?.entity_id ?? "").trim();
  const payload =
    item?.payload && typeof item.payload === "object" ? item.payload : {};
  const payloadLeadCodigo = String((payload as any)?.lead_codigo ?? "").trim();
  const payloadSourceEntityId = String(
    (payload as any)?.source_entity_id ?? (payload as any)?.entity_id ?? "",
  ).trim();

  return (
    entityId === normalizedLeadCodigo ||
    payloadLeadCodigo === normalizedLeadCodigo ||
    payloadSourceEntityId === normalizedLeadCodigo
  );
}

function pickPreferredMetadataRecord(items: MetadataRecord<any>[]) {
  return (
    [...items].sort((left, right) => {
      const leftTs = new Date(
        String(left.updated_at ?? left.created_at ?? 0),
      ).getTime();
      const rightTs = new Date(
        String(right.updated_at ?? right.created_at ?? 0),
      ).getTime();
      return rightTs - leftTs;
    })[0] ?? null
  );
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "sales"]}>
      <DashboardLayout>
        <Content id={params.id} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function Content({ id }: { id: string }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<
    "resumen" | "venta" | "seguimiento" | "notas"
  >("resumen");
  const [loading, setLoading] = React.useState(true);
  const [record, setRecord] = React.useState<any | null>(null);
  const [persistedRecord, setPersistedRecord] = React.useState<any | null>(
    null,
  );
  const [metadataRecord, setMetadataRecord] =
    React.useState<MetadataRecord | null>(null);
  const [associatedMetadataRecords, setAssociatedMetadataRecords] =
    React.useState<MetadataRecord[]>([]);
  const [selectedMetadataId, setSelectedMetadataId] =
    React.useState<string>("");
  const [persistedMetadataPayload, setPersistedMetadataPayload] =
    React.useState<Record<string, any>>({});
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
  const [navigationTarget, setNavigationTarget] = React.useState<{
    tab: "resumen" | "venta" | "seguimiento" | "notas";
    sectionId?: string;
    seguimientoTab?: "flujo_ventas" | "llamada";
    requestKey: number;
  } | null>(null);

  React.useEffect(() => {
    setFrozenSaleInitial(null);
    setPersistedRecord(null);
    setMetadataRecord(null);
    setAssociatedMetadataRecords([]);
    setSelectedMetadataId("");
    setPersistedMetadataPayload({});
  }, [id]);

  const applyRecordPatch = React.useCallback((patch: Record<string, any>) => {
    setRecord((prev: any | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...patch,
      };
    });
  }, []);

  const hydrateFromSnapshot = React.useCallback(
    (snapshotPayloadCurrent: Record<string, any>, snapshotSale?: any) => {
      setRecord((prev: any | null) => {
        const base = prev && typeof prev === "object" ? prev : {};
        return {
          ...base,
          ...snapshotPayloadCurrent,
          ...(snapshotSale ? { sale: snapshotSale } : {}),
        };
      });
      setSaleDraftPayload(snapshotSale ?? null);
      setFrozenSaleInitial(null);
    },
    [],
  );

  const handleNavigate = React.useCallback(
    (target: {
      tab: "resumen" | "venta" | "seguimiento" | "notas";
      sectionId?: string;
      seguimientoTab?: "flujo_ventas" | "llamada";
    }) => {
      setActiveTab(target.tab);
      setNavigationTarget({ ...target, requestKey: Date.now() });
    },
    [],
  );

  const buildSnapshotPayloadCurrent = React.useCallback(
    (args: {
      leadBase: any;
      patch: Record<string, any> | null;
      snapshotSale?: any;
      draftNotes?: any;
      paymentPaidAmount: any;
      paymentPlanType: any;
      paymentAttachments: any;
      paymentProof: any;
      paymentPlans: any;
      contractPartyAddress: any;
      contractPartyCity: any;
      contractPartyCountry: any;
      contractPartyDocumentId: any;
      capturedAt: string;
      // Nuevos: datos completos de pago y closer
      paymentMode: any;
      paymentAmount: any;
      paymentPlatform: any;
      paymentHasReserve: any;
      paymentReserveAmount: any;
      paymentInstallmentsCount: any;
      paymentInstallmentAmount: any;
      paymentInstallmentsSchedule: any;
      paymentCustomInstallments: any;
      paymentExceptionNotes: any;
      nextChargeDate: any;
      closerInfo: any;
    }) => {
      const {
        leadBase,
        patch,
        snapshotSale,
        draftNotes,
        paymentPaidAmount,
        paymentPlanType,
        paymentAttachments,
        paymentProof,
        paymentPlans,
        contractPartyAddress,
        contractPartyCity,
        contractPartyCountry,
        contractPartyDocumentId,
        capturedAt,
        paymentMode,
        paymentAmount,
        paymentPlatform,
        paymentHasReserve,
        paymentReserveAmount,
        paymentInstallmentsCount,
        paymentInstallmentAmount,
        paymentInstallmentsSchedule,
        paymentCustomInstallments,
        paymentExceptionNotes,
        nextChargeDate,
        closerInfo,
      } = args;

      const routePathname =
        typeof window !== "undefined" ? window.location?.pathname : undefined;
      const routeUrl =
        typeof window !== "undefined" ? window.location?.href : undefined;
      const userAgent =
        typeof navigator !== "undefined" ? navigator.userAgent : undefined;

      const r = record as any;
      const lb = leadBase as any;
      const pick = (key: string) => lb?.[key] ?? r?.[key] ?? null;

      return {
        // Base: record completo (garantiza que ningún campo se pierda)
        ...(r || {}),
        // Overlay con leadForUi (tiene call/sale derivados)
        ...(leadBase || {}),
        ...(patch || {}),
        ...(snapshotSale ? { sale: snapshotSale } : {}),
        ...(draftNotes !== undefined ? { sale_notes: draftNotes } : {}),

        // ── Datos básicos del lead ──────────────────────────────────
        name: patch?.name ?? pick("name"),
        email: patch?.email ?? pick("email"),
        phone: patch?.phone ?? pick("phone"),
        program: patch?.program ?? pick("program"),
        codigo: pick("codigo"),
        source: pick("source"),

        // ── Pago completo ───────────────────────────────────────────
        ...(paymentPaidAmount !== null
          ? { payment_paid_amount: paymentPaidAmount }
          : {}),
        ...(paymentPlanType !== null
          ? { payment_plan_type: paymentPlanType }
          : {}),
        ...(paymentMode !== null ? { payment_mode: paymentMode } : {}),
        ...(paymentAmount !== null ? { payment_amount: paymentAmount } : {}),
        ...(paymentPlatform !== null
          ? { payment_platform: paymentPlatform }
          : {}),
        payment_has_reserve: paymentHasReserve ?? pick("payment_has_reserve"),
        ...(paymentReserveAmount !== null
          ? { payment_reserve_amount: paymentReserveAmount }
          : {}),
        ...(paymentInstallmentsCount !== null
          ? { payment_installments_count: paymentInstallmentsCount }
          : {}),
        ...(paymentInstallmentAmount !== null
          ? { payment_installment_amount: paymentInstallmentAmount }
          : {}),
        ...(paymentInstallmentsSchedule !== null
          ? { payment_installments_schedule: paymentInstallmentsSchedule }
          : {}),
        ...(paymentCustomInstallments !== null
          ? { payment_custom_installments: paymentCustomInstallments }
          : {}),
        ...(paymentExceptionNotes !== null
          ? { payment_exception_notes: paymentExceptionNotes }
          : {}),
        ...(paymentAttachments !== null
          ? { payment_attachments: paymentAttachments }
          : {}),
        ...(paymentProof !== null ? { payment_proof: paymentProof } : {}),
        ...(paymentPlans !== null ? { payment_plans_json: paymentPlans } : {}),
        ...(nextChargeDate !== null
          ? { next_charge_date: nextChargeDate }
          : {}),

        // ── Contrato ────────────────────────────────────────────────
        ...(contractPartyAddress !== null
          ? { contract_party_address: contractPartyAddress }
          : {}),
        ...(contractPartyCity !== null
          ? { contract_party_city: contractPartyCity }
          : {}),
        ...(contractPartyCountry !== null
          ? { contract_party_country: contractPartyCountry }
          : {}),
        ...(contractPartyDocumentId !== null
          ? { contract_party_document_id: contractPartyDocumentId }
          : {}),

        // ── Closer / usuario responsable ────────────────────────────
        ...(closerInfo ? { closer: closerInfo } : {}),
        closer_name: closerInfo?.name ?? pick("closer_name"),

        // ── Estado del lead y pago ────────────────────────────────
        status: pick("status"),
        payment_status: pick("payment_status"),

        // ── Pipeline operativo y clasificación ─────────────────────
        pipeline_status: pick("pipeline_status"),
        customer_type: pick("customer_type"),
        product_presented: pick("product_presented"),
        objection_type: pick("objection_type"),
        objection_detail: pick("objection_detail"),
        lost_reason: pick("lost_reason"),
        won_recovered: pick("won_recovered"),
        lead_disposition: pick("lead_disposition"),

        // ── Llamada ─────────────────────────────────────────────────
        call_outcome: pick("call_outcome"),
        call_result_at: pick("call_result_at"),
        call_reschedule_date: pick("call_reschedule_date"),
        call_reschedule_time: pick("call_reschedule_time"),
        call_negotiation_active: pick("call_negotiation_active"),
        call_negotiation_until: pick("call_negotiation_until"),
        text_messages: pick("text_messages"),

        // ── Flujo comercial y actividades del closer ───────────────
        sales_flow: pick("sales_flow"),
        activity_log: pick("activity_log") ?? [],
        reminders: pick("reminders") ?? [],

        // ── Llamada (objeto completo) ────────────────────────────
        call: pick("call"),

        // ── Contrato completo ───────────────────────────────────────
        contract_status: pick("contract_status"),
        contract_third_party: pick("contract_third_party"),
        contract_is_company: pick("contract_is_company"),
        contract_parties: pick("contract_parties") ?? [],
        contract_company_name: pick("contract_company_name"),
        contract_company_tax_id: pick("contract_company_tax_id"),
        contract_company_address: pick("contract_company_address"),
        contract_company_city: pick("contract_company_city"),
        contract_company_country: pick("contract_company_country"),

        // ── Seguimiento / recuperación ──────────────────────────────
        followup_started_at: pick("followup_started_at"),
        recovery_started_at: pick("recovery_started_at"),
        sleeping_started_at: pick("sleeping_started_at"),
        next_contact_at: pick("next_contact_at"),
        next_task_due_at: pick("next_task_due_at"),
        last_interaction_at: pick("last_interaction_at"),
        last_interaction_channel: pick("last_interaction_channel"),
        conversation_status: pick("conversation_status"),
        protocol_name: pick("protocol_name"),
        protocol_step: pick("protocol_step"),
        protocol_paused: pick("protocol_paused"),
        last_template_sent_name: pick("last_template_sent_name"),
        last_resource_sent_name: pick("last_resource_sent_name"),

        // ── Bonos ───────────────────────────────────────────────────
        bonuses:
          patch?.bonuses ?? snapshotSale?.bonuses ?? pick("bonuses") ?? [],

        // ── Traza de ruta ───────────────────────────────────────────
        route_pathname:
          (leadBase as any)?.route_pathname ?? routePathname ?? null,
        route_url: (leadBase as any)?.route_url ?? routeUrl ?? null,
        trace_user_agent:
          (leadBase as any)?.trace_user_agent ?? userAgent ?? null,
        trace_ts: (leadBase as any)?.trace_ts ?? capturedAt,
      };
    },
    [record],
  );

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
      notes: (() => {
        const raw = lead.sale_notes ?? null;
        if (!raw) return null;
        // Si el contenido es datos crudos de Calendly, no mostrarlo como nota editable
        if (/\[Calendly:https?:\/\/[^\]]*calendly\.com\//.test(raw))
          return null;
        return raw;
      })(),
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

  /** Mergea datos frescos del backend con campos del snapshot que
   * el backend no devuelve (sales_flow, pipeline_status, activity_log, etc.)  */
  const mergeWithPreserved = React.useCallback(
    (fresh: any, source: Record<string, any> | null | undefined): any => {
      if (!fresh) return fresh;
      if (!source) return fresh;
      // El snapshot (payload_current) es la fuente de verdad para todos los
      // campos operativos del CRM. El backend solo aporta lo que no exista
      // en el snapshot (campos de la tabla leads que nunca pasaron por el CRM).
      // Estrategia: spread del backend primero, luego el snapshot encima —
      // así el snapshot siempre gana en cualquier campo que haya registrado,
      // y el backend complementa los campos que el snapshot no tiene.
      const merged = { ...fresh };
      for (const [k, v] of Object.entries(source)) {
        if (v !== undefined && v !== null) {
          merged[k] = v;
        }
      }
      return merged;
    },
    [],
  );

  const load = React.useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      try {
        const lead = await getLead(id);
        const leadCodigo = String((lead as any)?.codigo ?? id).trim();
        const leadMetadataId = getLeadMetadataId(lead);
        let mergedLead = lead as any;
        let nextMetadataRecord: MetadataRecord | null = null;
        let nextMetadataPayload: Record<string, any> = {};
        let nextAssociatedMetadataRecords: MetadataRecord[] = [];

        try {
          const metadataList = await listMetadata<any>({ background: true });
          nextAssociatedMetadataRecords = (metadataList.items || []).filter(
            (item) =>
              metadataBelongsToLead(item as MetadataRecord<any>, leadCodigo),
          );
        } catch {}

        const preferredFromList = pickPreferredMetadataRecord(
          nextAssociatedMetadataRecords,
        );
        const metadataId =
          leadMetadataId ??
          (preferredFromList?.id !== undefined && preferredFromList?.id !== null
            ? String(preferredFromList.id)
            : null);

        if (metadataId) {
          try {
            const metadata = await getMetadata<any>(metadataId);
            nextMetadataRecord = metadata;
            nextMetadataPayload =
              metadata?.payload && typeof metadata.payload === "object"
                ? (metadata.payload as Record<string, any>)
                : {};
            mergedLead = mergeWithPreserved(lead, nextMetadataPayload);
          } catch {}
        }

        setAssociatedMetadataRecords(nextAssociatedMetadataRecords);
        setSelectedMetadataId(metadataId ?? "");
        setMetadataRecord(nextMetadataRecord);
        setPersistedMetadataPayload(nextMetadataPayload);
        setRecord(mergedLead);
        setPersistedRecord(lead as any);
      } catch (e) {
        if (silent) {
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
    [id, mergeWithPreserved, toast],
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
        payment_paid_amount: (d as any).paymentPaidAmount ?? undefined,
        payment_plan_type: (d as any).paymentPlanType ?? undefined,
        payment_platform: (d as any).paymentPlatform ?? undefined,
        next_charge_date: toLeadIsoDateOrNull(
          (d as any).nextChargeDate ?? null,
        ),
        payment_has_reserve: (d as any).paymentHasReserve ? 1 : 0,
        payment_reserve_amount: (d as any).paymentHasReserve
          ? (d as any).paymentReserveAmount || null
          : null,
        payment_installments_count:
          (d as any).paymentInstallmentsCount ?? undefined,
        payment_installment_amount:
          (d as any).paymentInstallmentAmount ?? undefined,
        payment_installments_schedule: Array.isArray(
          (d as any).paymentInstallmentsSchedule,
        )
          ? (d as any).paymentInstallmentsSchedule
          : undefined,
        payment_custom_installments: Array.isArray(
          (d as any).paymentCustomInstallments,
        )
          ? (d as any).paymentCustomInstallments
          : undefined,
        payment_exception_notes: (d as any).paymentExceptionNotes ?? undefined,

        sale_notes: (d as any).notes ?? undefined,

        contract_third_party: (d as any).contractThirdParty ? 1 : 0,
        contract_is_company: (d as any).contractIsCompany ? 1 : 0,
        contract_parties: Array.isArray((d as any).contractParties)
          ? (d as any).contractParties
          : undefined,
        contract_party_address: (d as any).contractPartyAddress ?? undefined,
        contract_party_city: (d as any).contractPartyCity ?? undefined,
        contract_party_country: (d as any).contractPartyCountry ?? undefined,
        contract_party_document_id:
          (d as any).contractPartyDocumentId ?? undefined,
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
    const baseRecord =
      persistedRecord && typeof persistedRecord === "object"
        ? (persistedRecord as Record<string, any>)
        : {};
    const leadFieldsToPersist = {
      name: (record as any)?.name ?? undefined,
      email: (record as any)?.email ?? undefined,
      phone: (record as any)?.phone ?? undefined,
      source: (record as any)?.source ?? undefined,
      origen: (record as any)?.origen ?? undefined,
      created_at: (record as any)?.created_at ?? undefined,
      status: (record as any)?.status ?? undefined,
      pipeline_status: (record as any)?.pipeline_status ?? undefined,
    };
    const draftPatch = draftToLeadPatch(draft) ?? {};
    const draftNotes = (draft as any)?.notes;
    const snapshotSaleBase =
      saleDraftPayload && typeof saleDraftPayload === "object"
        ? saleDraftPayload
        : ((leadForUi as any)?.sale ?? (record as any)?.sale ?? undefined);
    const snapshotSale = snapshotSaleBase
      ? {
          ...snapshotSaleBase,
          ...(draftNotes !== undefined ? { notes: draftNotes } : {}),
        }
      : draftNotes !== undefined
        ? { notes: draftNotes }
        : undefined;
    const metadataSnapshot = {
      ...((record as any) ?? {}),
      ...draftPatch,
      ...(snapshotSale ? { sale: snapshotSale } : {}),
      metadata_updated_at: new Date().toISOString(),
      lead_codigo: String((record as any)?.codigo ?? id),
    };
    const metadataPayload = omitLeadPutFields(metadataSnapshot);

    const leadChanges = buildChangedFields(baseRecord, leadFieldsToPersist);
    const metadataChanges = buildChangedFields(
      persistedMetadataPayload,
      metadataPayload,
    );
    setSnapshotSaving(true);
    try {
      const hasLeadChanges = Object.keys(leadChanges).length > 0;
      const hasMetadataChanges = Object.keys(metadataChanges).length > 0;

      if (!hasLeadChanges && !hasMetadataChanges) {
        toast({
          title: "Sin cambios",
          description: "No hay campos modificados para guardar.",
        });
        return;
      }

      let nextMetadataId =
        selectedMetadataId ||
        getLeadMetadataId(record) ||
        getLeadMetadataId(baseRecord);
      let nextMetadataRecord =
        associatedMetadataRecords.find(
          (item) => String(item.id) === String(nextMetadataId || ""),
        ) ?? metadataRecord;

      if (!nextMetadataRecord && associatedMetadataRecords.length > 0) {
        nextMetadataRecord = pickPreferredMetadataRecord(
          associatedMetadataRecords,
        );
        if (!nextMetadataId && nextMetadataRecord?.id !== undefined) {
          nextMetadataId = String(nextMetadataRecord.id);
        }
      }

      let leadSaved = false;
      let metadataSaved = false;
      let leadSaveError: string | null = null;
      let metadataSaveError: string | null = null;

      if (hasMetadataChanges) {
        try {
          if (nextMetadataId) {
            const updatedMetadata = await updateMetadataPayload(
              nextMetadataId,
              metadataChanges,
            );
            nextMetadataRecord = updatedMetadata as MetadataRecord;
          } else {
            const createdMetadata = await createMetadata({
              entity: "crm_lead_detail",
              entity_id: String((record as any)?.codigo ?? id),
              payload: metadataPayload,
            });
            nextMetadataId = String(createdMetadata.id);
            nextMetadataRecord = createdMetadata;
            setAssociatedMetadataRecords((prev) => [...prev, createdMetadata]);
            setSelectedMetadataId(String(createdMetadata.id));
          }
          metadataSaved = true;
        } catch (error: any) {
          metadataSaveError =
            error?.message || "No se pudo guardar el metadata asociado.";
        }
      }

      if (Object.keys(leadChanges).length > 0) {
        try {
          await updateLeadFull(id, leadChanges);
          leadSaved = true;
        } catch (error: any) {
          leadSaveError = error?.message || "No se pudo guardar el lead base.";
        }
      }

      if (!leadSaved && !metadataSaved) {
        throw new Error(
          metadataSaveError ||
            leadSaveError ||
            "No se pudo guardar en backend.",
        );
      }

      const persistedAfterSave = {
        ...baseRecord,
        ...(leadSaved ? leadChanges : {}),
        ...(nextMetadataId ? { metadata_id: nextMetadataId } : {}),
      };
      const persistedMetadataAfterSave = metadataSaved
        ? { ...persistedMetadataPayload, ...metadataPayload }
        : persistedMetadataPayload;

      applyRecordPatch({
        ...(metadataSaved ? persistedMetadataAfterSave : {}),
        ...(leadSaved ? leadChanges : {}),
        ...(nextMetadataId ? { metadata_id: nextMetadataId } : {}),
      });
      if (metadataSaved && snapshotSale) {
        setSaleDraftPayload(snapshotSale);
      }
      setPersistedRecord(persistedAfterSave);
      if (nextMetadataId) setSelectedMetadataId(String(nextMetadataId));
      setMetadataRecord(nextMetadataRecord);
      setPersistedMetadataPayload(persistedMetadataAfterSave);

      toast({
        title:
          leadSaved && metadataSaved
            ? "Guardado"
            : leadSaved || metadataSaved
              ? "Guardado parcial"
              : "Error",
        description:
          leadSaved && metadataSaved
            ? "Se actualizó el lead y su metadata CRM asociado."
            : leadSaved
              ? `Se actualizaron los campos base del lead.${metadataSaveError ? ` Metadata pendiente: ${metadataSaveError}` : ""}`
              : `Se actualizó el metadata CRM asociado al lead.${leadSaveError ? ` Lead pendiente: ${leadSaveError}` : ""}`,
      });

      // Refresco en background: no bloquea el estado del botón.
      void load({ silent: true });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo guardar en backend.",
        variant: "destructive",
      });
    } finally {
      setSnapshotSaving(false);
    }
  }, [
    draft,
    draftToLeadPatch,
    id,
    leadForUi,
    load,
    applyRecordPatch,
    metadataRecord,
    associatedMetadataRecords,
    record,
    persistedRecord,
    persistedMetadataPayload,
    selectedMetadataId,
    saleDraftPayload,
    snapshotSaving,
    toast,
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

    const pickValue = (...vals: Array<any>) => {
      for (const v of vals) {
        if (v === undefined || v === null) continue;
        if (typeof v === "string" && v.trim() === "") continue;
        return v;
      }
      return undefined;
    };
    const pay: any = salePayload?.payment ?? {};
    const leadPayment = {
      mode: (p as any)?.payment_mode,
      amount: (p as any)?.payment_amount,
      paid_amount: (p as any)?.payment_paid_amount,
      plan_type: (p as any)?.payment_plan_type,
      platform: (p as any)?.payment_platform,
      nextChargeDate: (p as any)?.next_charge_date,
      hasReserve: (p as any)?.payment_has_reserve,
      reserveAmount: (p as any)?.payment_reserve_amount,
      attachments: (p as any)?.payment_attachments,
      proof: (p as any)?.payment_proof,
      plans: (p as any)?.payment_plans_json,
    };
    const payMerged = Object.keys(pay || {}).length ? pay : leadPayment;
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
    const stdScheduleList = Array.isArray(stdScheduleRaw) ? stdScheduleRaw : [];
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
      paymentMode: pickValue(payMerged?.mode, leadPayment.mode) ?? "",
      paymentAmount: pickValue(payMerged?.amount, leadPayment.amount) ?? "",
      paymentPaidAmount:
        pickValue(payMerged?.paid_amount, leadPayment.paid_amount) ?? "",
      paymentPlanType: pickValue(payMerged?.plan_type, leadPayment.plan_type),
      paymentInstallmentsCount: payMerged?.installments?.count ?? undefined,
      paymentInstallmentAmount: payMerged?.installments?.amount ?? undefined,
      paymentInstallmentsSchedule,
      paymentFirstInstallmentAmount: ex?.first_amount ?? undefined,
      paymentSecondInstallmentAmount: ex?.second_amount ?? undefined,
      paymentSecondInstallmentDate: toDateInput(ex?.second_due_date ?? ""),
      paymentCustomInstallments,
      paymentExceptionNotes: ex?.notes ?? plan0?.notes ?? "",
      paymentHasReserve: !!(
        payMerged?.hasReserve ||
        payMerged?.reserveAmount ||
        payMerged?.reservationAmount ||
        payMerged?.reserva ||
        payMerged?.deposit ||
        payMerged?.downPayment ||
        payMerged?.anticipo ||
        /reserva|apartado|señ?a|anticipo/i.test(
          String(payMerged?.mode || "").toLowerCase(),
        )
      ),
      paymentReserveAmount: (payMerged?.reserveAmount ??
        payMerged?.reservationAmount ??
        payMerged?.reserva ??
        payMerged?.deposit ??
        payMerged?.downPayment ??
        payMerged?.anticipo ??
        "") as any,
      paymentPlatform:
        pickValue(payMerged?.platform, leadPayment.platform) ?? "hotmart",
      nextChargeDate:
        pickValue(payMerged?.nextChargeDate, leadPayment.nextChargeDate) ?? "",
      contractThirdParty: !!(
        salePayload?.contract?.thirdParty ?? (p as any)?.contract_third_party
      ),
      contractIsCompany: !!(
        salePayload?.contract?.isCompany ?? (p as any)?.contract_is_company
      ),
      contractPartyName:
        salePayload?.contract?.party?.name ||
        (p as any)?.contract_party_name ||
        p.name ||
        "",
      contractPartyEmail:
        salePayload?.contract?.party?.email ||
        (p as any)?.contract_party_email ||
        p.email ||
        "",
      contractPartyPhone:
        salePayload?.contract?.party?.phone ||
        (p as any)?.contract_party_phone ||
        p.phone ||
        "",
      contractPartyDocumentId:
        salePayload?.contract?.party?.documentId ||
        (p as any)?.contract_party_document_id ||
        "",
      contractPartyAddress:
        salePayload?.contract?.party?.address ||
        (p as any)?.contract_party_address ||
        "",
      contractPartyCity:
        salePayload?.contract?.party?.city ||
        (p as any)?.contract_party_city ||
        "",
      contractPartyCountry:
        salePayload?.contract?.party?.country ||
        (p as any)?.contract_party_country ||
        "",
      contractParties: Array.isArray(salePayload?.contract?.parties)
        ? salePayload.contract.parties
        : Array.isArray((p as any)?.contract_parties)
          ? (p as any).contract_parties
          : [],
      contractCompanyName:
        salePayload?.contract?.company?.name ||
        (p as any)?.contract_company_name ||
        "",
      contractCompanyTaxId:
        salePayload?.contract?.company?.taxId ||
        (p as any)?.contract_company_tax_id ||
        "",
      contractCompanyAddress:
        salePayload?.contract?.company?.address ||
        (p as any)?.contract_company_address ||
        "",
      contractCompanyCity:
        salePayload?.contract?.company?.city ||
        (p as any)?.contract_company_city ||
        "",
      contractCompanyCountry:
        salePayload?.contract?.company?.country ||
        (p as any)?.contract_company_country ||
        "",
      notes: salePayload?.notes ?? "",
      status: salePayload?.status ?? undefined,
    } as any;
  }, [p, record, salePayload]);

  React.useEffect(() => {
    if (frozenSaleInitial) return;
    if (!record) return;

    setFrozenSaleInitial(initialBase);
  }, [frozenSaleInitial, initialBase, record]);

  React.useEffect(() => {
    if (loading || !record) return;

    const normalizedLeadStatus = (() => {
      const value = String((record as any)?.status ?? "")
        .trim()
        .toLowerCase();

      if (!value) return "new";
      if (
        value === "new" ||
        value === "contacted" ||
        value === "appointment_attended" ||
        value === "active_follow_up" ||
        value === "pending_payment" ||
        value === "won" ||
        value === "lost"
      ) {
        return value;
      }
      if (value === "nuevo") return "new";
      if (value === "contactado") return "contacted";
      if (value === "cita atendida" || value === "cita_atendida") {
        return "appointment_attended";
      }
      if (value === "seguimiento activo" || value === "seguimiento_activo") {
        return "active_follow_up";
      }
      if (value === "pendiente de pago" || value === "pendiente_pago") {
        return "pending_payment";
      }
      if (value === "ganado") return "won";
      if (value === "perdido") return "lost";
      return "new";
    })();

    const salesFlowState = (record as any)?.sales_flow ?? null;
    const resultadoCierreActual = String(
      salesFlowState?.resultadoCierre ?? "",
    ).trim();
    const showVentaTab =
      resultadoCierreActual === "ganado_hpro" ||
      resultadoCierreActual === "ganado_starter" ||
      resultadoCierreActual === "ganado_downsell" ||
      resultadoCierreActual === "pendiente_pago" ||
      normalizedLeadStatus === "won" ||
      normalizedLeadStatus === "pending_payment";
    const showSeguimientoTab = !!salesFlowState && !showVentaTab;

    if (activeTab === "venta" && !showVentaTab) {
      setActiveTab("resumen");
      return;
    }

    if (activeTab === "seguimiento" && !showSeguimientoTab) {
      setActiveTab("resumen");
    }
  }, [activeTab, loading, record]);

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/40">
        <Card className="p-6 flex items-center gap-3 bg-white/80 backdrop-blur border-slate-200/60 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
          <span className="text-slate-700 font-medium">Cargando lead...</span>
        </Card>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/40">
        <Card className="p-6 bg-white/80 backdrop-blur border-slate-200/60 shadow-sm">
          <p className="text-slate-600">No se encontró el lead solicitado.</p>
        </Card>
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
    const draftType = String((draft as any)?.paymentPlanType || "")
      .trim()
      .toLowerCase();
    const type = String(
      draftType ||
        plan0?.type ||
        (effectiveSalePayload as any)?.payment?.plan_type ||
        "",
    )
      .trim()
      .toLowerCase();

    if (!type) return "—";
    if (type === "contado") return "Contado";
    if (type === "cuotas") {
      const draftStd = Array.isArray(
        (draft as any)?.paymentInstallmentsSchedule,
      )
        ? ((draft as any)?.paymentInstallmentsSchedule as any[])
        : [];
      const draftCustom = Array.isArray(
        (draft as any)?.paymentCustomInstallments,
      )
        ? ((draft as any)?.paymentCustomInstallments as any[])
        : [];
      const count =
        (draft as any)?.paymentInstallmentsCount ??
        (draftStd.length ? draftStd.length : null) ??
        (draftCustom.length ? draftCustom.length : null) ??
        plan0?.installments?.count;
      const amount =
        (draft as any)?.paymentInstallmentAmount ?? plan0?.installments?.amount;
      if (count && amount) return `Cuotas: ${count} x ${amount}`;
      if (count) return `Cuotas: ${count}`;
      return "Cuotas";
    }
    if (type === "excepcion_2_cuotas") {
      const a =
        (draft as any)?.paymentFirstInstallmentAmount ?? plan0?.first_amount;
      const b =
        (draft as any)?.paymentSecondInstallmentAmount ?? plan0?.second_amount;
      const due =
        (draft as any)?.paymentSecondInstallmentDate ?? plan0?.second_due_date;
      const parts = ["Excepción 2 cuotas"];
      if (a || b) parts.push(`(${String(a ?? "?")} + ${String(b ?? "?")})`);
      if (due) parts.push(`vence ${fmtDate(due)}`);
      return parts.join(" ");
    }
    if (type === "reserva") {
      const amount =
        (draft as any)?.paymentReserveAmount ?? plan0?.reserve?.amount;
      const due =
        (draft as any)?.reserveRemainingDueDate ??
        plan0?.reserve?.remaining_due_date;
      const parts = ["Reserva"];
      if (amount) parts.push(`(${String(amount)})`);
      if (due) parts.push(`resto vence ${fmtDate(due)}`);
      return parts.join(" ");
    }
    return type;
  })();

  const displayName = (() => {
    const raw = String(
      (draft as any)?.fullName ||
        p.name ||
        salePayload?.name ||
        "Detalle del lead",
    );
    return raw
      .replace(/\s+(none|null|undefined)$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  })();

  const sourceValue = String(p?.source ?? record?.source ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const crmPipelineStatus = String(p.pipeline_status ?? "").trim();
  const pipelineStageLevel = pipelineLevel(crmPipelineStatus);
  const customerType = String(p.customer_type ?? "").trim();
  const productPresented = String(p.product_presented ?? "").trim();
  const objectionType = String(p.objection_type ?? "").trim();
  const lostReason = String(p.lost_reason ?? "").trim();
  const wonRecovered =
    p.won_recovered === true ||
    p.won_recovered === 1 ||
    String(p.won_recovered ?? "").toLowerCase() === "true";
  const salesFlowState = (p as any)?.sales_flow ?? null;
  const resultadoCierreActual = String(
    salesFlowState?.resultadoCierre ?? "",
  ).trim();
  const hasSalesFlowSelection = !!salesFlowState;
  const showVentaTab =
    resultadoCierreActual === "ganado_hpro" ||
    resultadoCierreActual === "ganado_starter" ||
    resultadoCierreActual === "ganado_downsell" ||
    resultadoCierreActual === "pendiente_pago" ||
    leadStatus === "won" ||
    leadStatus === "pending_payment";
  const showSeguimientoTab = hasSalesFlowSelection && !showVentaTab;
  const visibleTabsCount =
    2 + Number(showVentaTab) + Number(showSeguimientoTab);

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={leadStageLabel} />
                {!!leadDispositionLabel && (
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">
                    Estado: {leadDispositionLabel}
                  </Badge>
                )}
                <Badge className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 capitalize">
                  Venta: {statusLabel}
                </Badge>
              </div>

              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Ficha del lead
                </p>
                <Input
                  value={String((record as any)?.name ?? displayName ?? "")}
                  onChange={(e) =>
                    applyRecordPatch({
                      name: e.target.value,
                    })
                  }
                  placeholder="Nombre del lead"
                  className="h-auto border-0 px-0 py-0 text-2xl font-semibold text-slate-900 shadow-none focus-visible:ring-0 sm:text-[30px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  Lead
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  Metadata CRM: {associatedMetadataRecords.length}
                </div>
                <div className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  IDs:{" "}
                  {associatedMetadataRecords.length
                    ? associatedMetadataRecords
                        .map((item) => String(item.id))
                        .join(", ")
                    : "sin metadata asociado"}
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  <span className="text-slate-500">Metadata activo</span>
                  <Select
                    value={selectedMetadataId || "__none__"}
                    onValueChange={(value) => {
                      const nextId = value === "__none__" ? "" : value;
                      const selectedRecord = associatedMetadataRecords.find(
                        (item) => String(item.id) === nextId,
                      );
                      setSelectedMetadataId(nextId);
                      setMetadataRecord(selectedRecord ?? null);
                      setPersistedMetadataPayload(
                        selectedRecord?.payload &&
                          typeof selectedRecord.payload === "object"
                          ? (selectedRecord.payload as Record<string, any>)
                          : {},
                      );
                    }}
                  >
                    <SelectTrigger className="h-8 w-[180px] border-slate-200 bg-white text-xs text-slate-700">
                      <SelectValue placeholder="Seleccionar metadata" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin seleccionar</SelectItem>
                      {associatedMetadataRecords.map((item) => (
                        <SelectItem
                          key={String(item.id)}
                          value={String(item.id)}
                        >
                          {String(item.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {sourceValue ? (
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    Fuente:{" "}
                    <span className="ml-1 font-medium text-slate-700">
                      {sourceValue}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 p-1.5">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
              >
                <Link
                  href="/admin/crm"
                  aria-label="Volver al CRM"
                  title="Volver al CRM"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={snapshotSaving}
                size="icon"
                aria-label={
                  snapshotSaving ? "Guardando cambios" : "Guardar cambios"
                }
                title={snapshotSaving ? "Guardando cambios" : "Guardar cambios"}
                className="h-10 w-10 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                {snapshotSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div
            id="gestion-lead"
            className="mt-5 border-t border-slate-200 pt-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Gestión del lead
                </p>
                <p className="text-sm text-slate-500">
                  Campos disponibles para esta fase
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {/* Select unificado: Etapa del lead (pipeline_status + status) */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Etapa del lead
                </Label>
                <Select
                  value={
                    crmPipelineStatus
                      ? `pipeline:${crmPipelineStatus}`
                      : `etapa:${leadStatus}`
                  }
                  onValueChange={(next) => {
                    const [prefix, val] = next.split(":");
                    if (prefix === "pipeline") {
                      applyRecordPatch({ pipeline_status: val });
                    } else {
                      applyRecordPatch({ pipeline_status: null, status: val });
                    }
                  }}
                >
                  <SelectTrigger className="h-10 border-slate-200 bg-white text-sm text-slate-700">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Estado general
                      </SelectLabel>
                      <SelectItem value="etapa:new">Lead Nuevo</SelectItem>
                      <SelectItem value="etapa:contacted">
                        Contactado
                      </SelectItem>
                      <SelectItem value="etapa:appointment_attended">
                        Cita Atendida
                      </SelectItem>
                      <SelectItem value="etapa:active_follow_up">
                        Seguimiento Activo
                      </SelectItem>
                      <SelectItem value="etapa:pending_payment">
                        Pendiente de Pago
                      </SelectItem>
                      <SelectItem value="etapa:won">
                        Cerrado – Ganado
                      </SelectItem>
                      <SelectItem value="etapa:lost">
                        Cerrado – Perdido
                      </SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Pipeline CRM
                      </SelectLabel>
                      <SelectItem value="pipeline:agendado">
                        Agendado
                      </SelectItem>
                      <SelectItem value="pipeline:confirmado">
                        Confirmado
                      </SelectItem>
                      <SelectItem value="pipeline:no_show">No Show</SelectItem>
                      <SelectItem value="pipeline:llamada_realizada">
                        Llamada realizada
                      </SelectItem>
                      <SelectItem value="pipeline:decision">
                        Decisión
                      </SelectItem>
                      <SelectItem value="pipeline:seguimiento">
                        Seguimiento
                      </SelectItem>
                      <SelectItem value="pipeline:recuperacion">
                        Recuperación
                      </SelectItem>
                      <SelectItem value="pipeline:lead_dormido">
                        Lead dormido
                      </SelectItem>
                      <SelectItem value="pipeline:cerrado_ganado">
                        Cerrado ganado
                      </SelectItem>
                      <SelectItem value="pipeline:cerrado_perdido">
                        Cerrado perdido
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {pipelineStageLevel >= 3 ? (
                <HeaderSelectField
                  label="Estado comercial actual"
                  value={leadDisposition || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      lead_disposition: next === "__empty__" ? null : next,
                    })
                  }
                  options={LEAD_DISPOSITION_OPTIONS}
                />
              ) : null}

              {pipelineStageLevel >= 3 ? (
                <HeaderSelectField
                  label="Tipo de cliente"
                  value={customerType || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      customer_type: next === "__empty__" ? null : next,
                    })
                  }
                  options={CUSTOMER_TYPE_OPTIONS}
                />
              ) : null}

              {pipelineStageLevel >= 3 ? (
                <HeaderSelectField
                  label="Producto presentado"
                  value={productPresented || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      product_presented: next === "__empty__" ? null : next,
                    })
                  }
                  options={PRODUCT_PRESENTED_OPTIONS}
                />
              ) : null}

              {pipelineStageLevel >= 3 ? (
                <HeaderSelectField
                  label="Tipo de objeción"
                  value={objectionType || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      objection_type: next === "__empty__" ? null : next,
                    })
                  }
                  options={OBJECTION_OPTIONS}
                />
              ) : null}

              {crmPipelineStatus === "cerrado_perdido" ? (
                <HeaderSelectField
                  label="Motivo de pérdida"
                  value={lostReason || "__empty__"}
                  onValueChange={(next) =>
                    applyRecordPatch({
                      lost_reason: next === "__empty__" ? null : next,
                    })
                  }
                  options={LOST_REASON_OPTIONS}
                />
              ) : null}

              {crmPipelineStatus === "recuperacion" ||
              crmPipelineStatus === "lead_dormido" ||
              crmPipelineStatus === "cerrado_ganado" ? (
                <HeaderSelectField
                  label="Venta recuperada"
                  value={wonRecovered ? "si" : "no"}
                  onValueChange={(next) =>
                    applyRecordPatch({ won_recovered: next === "si" ? 1 : 0 })
                  }
                  options={[
                    { value: "no", label: "No" },
                    { value: "si", label: "Sí" },
                  ]}
                  allowEmpty={false}
                />
              ) : null}
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "resumen" | "venta" | "seguimiento" | "notas")
          }
          className="w-full space-y-6"
        >
          <div className="sticky top-0 z-30 rounded-xl border border-slate-200 bg-white/95 p-1.5 sm:p-2 backdrop-blur shadow-sm">
            <TabsList
              className={`grid h-auto w-full gap-1.5 rounded-lg bg-transparent p-0 ${
                visibleTabsCount === 2
                  ? "grid-cols-2"
                  : visibleTabsCount === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
              }`}
            >
              <TabsTrigger
                value="resumen"
                className="min-h-10 w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Resumen
              </TabsTrigger>
              {showVentaTab ? (
                <TabsTrigger
                  value="venta"
                  className="min-h-10 w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  Venta
                </TabsTrigger>
              ) : null}
              {showSeguimientoTab ? (
                <TabsTrigger
                  value="seguimiento"
                  className="min-h-10 w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  Seguimiento
                </TabsTrigger>
              ) : null}
              <TabsTrigger
                value="notas"
                className="min-h-10 w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Perfil de cliente
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="resumen"
            className="mt-0 focus-visible:outline-none"
          >
            <TabResumen
              p={p}
              user={user}
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
              onNavigate={handleNavigate}
            />
          </TabsContent>

          {showVentaTab ? (
            <TabsContent
              value="venta"
              className="mt-0 focus-visible:outline-none"
            >
              <TabVenta
                id={id}
                effectiveSalePayload={effectiveSalePayload}
                draft={draft}
                initial={initial}
                hasReserva={hasReserva}
                reserveAmountRaw={reserveAmountRaw}
                lead={leadForUi}
                setDraft={setDraft}
                setSaleDraftPayload={setSaleDraftPayload}
              />
            </TabsContent>
          ) : null}

          {showSeguimientoTab ? (
            <TabsContent
              value="seguimiento"
              className="mt-0 focus-visible:outline-none"
            >
              <TabSeguimiento
                id={id}
                p={p}
                applyRecordPatch={applyRecordPatch}
                navigationTarget={
                  navigationTarget?.tab === "seguimiento"
                    ? navigationTarget
                    : null
                }
              />
            </TabsContent>
          ) : null}

          <TabsContent
            value="notas"
            className="mt-0 focus-visible:outline-none"
          >
            <TabNotas p={p} user={user} applyRecordPatch={applyRecordPatch} />
          </TabsContent>
        </Tabs>

        {/* Footer sticky mejorado */}
        <div className="sticky bottom-0 z-40 mt-8 rounded-2xl border border-slate-200/60 bg-white/90 px-5 py-4 sm:px-6 backdrop-blur shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              Los cambios se aplican al presionar "Guardar cambios".
            </div>
            <Button
              onClick={handleSaveChanges}
              disabled={snapshotSaving}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
            >
              <Save className="h-4 w-4" />
              {snapshotSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
