"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { createLeadSnapshot, getLead } from "@/app/admin/crm/api";
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
  // Congelamos los valores iniciales del formulario para evitar loops.
  // Motivo: `draft` se actualiza con cada tecla para la vista previa; si `initial`
  // depende de `draft`, CloseSaleForm2 re-sincroniza su estado y se genera un loop.
  const [frozenSaleInitial, setFrozenSaleInitial] =
    React.useState<Partial<CloseSaleInput> | null>(null);
  const [saleDraftPayload, setSaleDraftPayload] = React.useState<any | null>(
    null
  );
  const [paymentProof, setPaymentProof] = React.useState<{
    dataUrl: string;
    name?: string;
    type?: string;
    size?: number;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [snapshotSaving, setSnapshotSaving] = React.useState(false);

  // Guardado temporal en navegador (localStorage)
  // Backend desactivado por ahora.
  void createLeadSnapshot;
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
      if (parsed?.paymentProof) setPaymentProof(parsed.paymentProof);
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
          paymentProof,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(next));
      } catch {}
    }, 250);
    return () => window.clearTimeout(t);
  }, [draft, localStorageKey, paymentProof, record, saleDraftPayload]);

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
    [hydrateFromLocalStorage, id]
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

      // Guardado backend desactivado temporalmente.
      // await createLeadSnapshot({ codigo: id, source: {...}, snapshot })
      try {
        const next = {
          version: 1,
          saved_at: new Date().toISOString(),
          record,
          draft,
          saleDraftPayload,
          paymentProof,
          last_snapshot: snapshot,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(next));
      } catch {}

      toast({
        title: "Guardado local",
        description: "Se guardó en tu navegador (localStorage).",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudieron guardar los cambios",
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
    localStorageKey,
    paymentProof,
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
    [leadForUi, record]
  );
  const salePayload = React.useMemo(() => (p as any).sale || {}, [p]);
  const effectiveSalePayload = React.useMemo(
    () => saleDraftPayload || salePayload,
    [saleDraftPayload, salePayload]
  );

  const initialBase: Partial<CloseSaleInput> = React.useMemo(() => {
    if (!record) return {} as any;

    const toBonusesArray = (v: any) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string")
        return v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      return [];
    };

    return {
      fullName: p.name || salePayload?.name || "",
      email: p.email || salePayload?.email || "",
      phone: p.phone || salePayload?.phone || "",
      program: salePayload?.program ?? "",
      bonuses: toBonusesArray(salePayload?.bonuses),
      paymentMode: salePayload?.payment?.mode ?? "",
      paymentAmount: salePayload?.payment?.amount ?? "",
      paymentHasReserve: !!(
        salePayload?.payment?.hasReserve ||
        salePayload?.payment?.reserveAmount ||
        salePayload?.payment?.reservationAmount ||
        salePayload?.payment?.reserva ||
        salePayload?.payment?.deposit ||
        salePayload?.payment?.downPayment ||
        salePayload?.payment?.anticipo ||
        /reserva|apartado|señ?a|anticipo/i.test(
          String(salePayload?.payment?.mode || "").toLowerCase()
        )
      ),
      paymentReserveAmount: (salePayload?.payment?.reserveAmount ??
        salePayload?.payment?.reservationAmount ??
        salePayload?.payment?.reserva ??
        salePayload?.payment?.deposit ??
        salePayload?.payment?.downPayment ??
        salePayload?.payment?.anticipo ??
        "") as any,
      paymentPlatform: salePayload?.payment?.platform ?? "hotmart",
      nextChargeDate: salePayload?.payment?.nextChargeDate ?? "",
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
      plan0?.type || (effectiveSalePayload as any)?.payment?.plan_type || ""
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
                  Detalle
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
                      {(draft as any)?.program ||
                        effectiveSalePayload?.program ||
                        p.program ||
                        salePayload?.program ||
                        "—"}
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
                      {(p.payment_amount ??
                        effectiveSalePayload?.payment?.amount) === null ||
                      (p.payment_amount ??
                        effectiveSalePayload?.payment?.amount) === undefined
                        ? "—"
                        : String(
                            p.payment_amount ??
                              effectiveSalePayload?.payment?.amount
                          )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Próximo cobro</span>
                    <span className="truncate">
                      {p.next_charge_date ||
                      effectiveSalePayload?.payment?.nextChargeDate
                        ? fmtDate(
                            p.next_charge_date ||
                              effectiveSalePayload?.payment?.nextChargeDate
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="truncate">{planSummary}</span>
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
                      <SelectItem value="no_interesado">
                        No interesado
                      </SelectItem>
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
                      payload={effectiveSalePayload}
                      draft={draft || undefined}
                      leadCodigo={id}
                      entity="booking"
                      persistMode="local"
                      title="Contrato / resumen"
                    />
                  </DialogContent>
                </Dialog>
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
