"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  createLeadSnapshot,
  getLead,
  updateLead,
  updateLeadPatch,
} from "@/app/admin/crm/api";
import {
  CloseSaleForm,
  type CloseSaleInput,
} from "@/app/admin/crm/components/CloseSaleForm2";
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
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [stageSaving, setStageSaving] = React.useState(false);
  const [dispositionSaving, setDispositionSaving] = React.useState(false);
  const [snapshotSaving, setSnapshotSaving] = React.useState(false);

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

    const call = {
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

  const handlePrint = React.useCallback(() => {
    if (!record) return;

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const printable = record;
    const json = JSON.stringify(printable, null, 2);

    const w = window.open("", "_blank");
    if (!w) {
      toast({
        title: "No se pudo abrir la impresión",
        description: "Tu navegador bloqueó la ventana emergente.",
        variant: "destructive",
      });
      return;
    }

    w.document.open();
    w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Lead ${String(record.id)} — JSON</title>
    <style>
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; padding: 16px; }
      h1 { font-size: 14px; margin: 0 0 12px; }
      pre { white-space: pre-wrap; word-break: break-word; border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
      @media print { body { padding: 0; } pre { border: none; padding: 0; } }
    </style>
  </head>
  <body>
    <h1>Lead ${String(record.id)} (booking) — JSON</h1>
    <pre>${escapeHtml(json)}</pre>
    <script>window.focus(); window.print();</script>
  </body>
</html>`);
    w.document.close();
  }, [record]);

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
    const entity = (record as any)?.record_entity ?? "booking";
    const entityId =
      (record as any)?.source_entity_id ?? (record as any)?.entity_id ?? "";

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

  const handleDebugConsole = React.useCallback(() => {
    if (!record) return;

    const ctx = buildSnapshotContext();
    if (!ctx) return;

    const placeholder = "(AQUÍ VA UNA IMAGEN)";

    const looksLikeImageEntry = (v: any) =>
      v &&
      typeof v === "object" &&
      typeof v.dataUrl === "string" &&
      (typeof v.type === "string" || typeof v.name === "string");

    const summarizeImageField = (v: any) => {
      if (!v) return { hasImage: false, count: 0, placeholder };
      if (Array.isArray(v)) {
        const items = v.filter(looksLikeImageEntry);
        return { hasImage: items.length > 0, count: items.length, placeholder };
      }
      if (looksLikeImageEntry(v))
        return { hasImage: true, count: 1, placeholder };
      return { hasImage: false, count: 0, placeholder };
    };

    const stripDataUrls = (v: any): any => {
      if (v === null || v === undefined) return v;
      if (typeof v !== "object") return v;
      if (Array.isArray(v)) return v.map(stripDataUrls);
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) {
        if (k === "dataUrl" && typeof val === "string") {
          out[k] = `[dataUrl omitido len=${val.length}]`;
          continue;
        }
        out[k] = stripDataUrls(val);
      }
      return out;
    };

    const collectDataUrlPaths = (root: any) => {
      const paths: Array<{ path: string; len: number }> = [];
      const seen = new Set<any>();

      const walk = (node: any, path: string) => {
        if (!node || typeof node !== "object") return;
        if (seen.has(node)) return;
        seen.add(node);

        if (Array.isArray(node)) {
          node.forEach((it, idx) => walk(it, `${path}[${idx}]`));
          return;
        }
        for (const [k, val] of Object.entries(node)) {
          const nextPath = path ? `${path}.${k}` : k;
          if (k === "dataUrl" && typeof val === "string") {
            paths.push({ path: nextPath, len: val.length });
          } else {
            walk(val, nextPath);
          }
        }
      };

      walk(root, "");
      return paths;
    };

    const expected = {
      "payment.proof": summarizeImageField((record as any)?.payment?.proof),
      "call.evidence_images": summarizeImageField(
        (record as any)?.call?.evidence_images
      ),
      "call.notes_images": summarizeImageField(
        (record as any)?.call?.notes_images
      ),
    };
    const found = collectDataUrlPaths(record);

    const debug = {
      codigo: (record as any)?.codigo,
      updated_at: (record as any)?.updated_at,
      imageFlags: {
        expected,
        foundDataUrls: found,
      },
      recordNoDataUrl: stripDataUrls(record),
    };

    const capturedAt = new Date().toISOString();
    const snapshotPayloadCurrent = leadForUi || record;
    const snapshotBody = {
      entity: "crm_lead_snapshot",
      entity_id: `${String(ctx.entity)}:${String(ctx.recordId)}:${capturedAt}`,
      payload: {
        schema_version: 1,
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
      },
    };

    const snapshotForPrint = (() => {
      const clone = JSON.parse(JSON.stringify(snapshotBody)) as any;
      const ensureField = (obj: any, path: string, value: any) => {
        const parts = path.split(".");
        let curr = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const k = parts[i];
          if (!curr[k] || typeof curr[k] !== "object") curr[k] = {};
          curr = curr[k];
        }
        const last = parts[parts.length - 1];
        if (
          curr[last] === undefined ||
          curr[last] === null ||
          curr[last] === ""
        ) {
          curr[last] = value;
        }
      };

      ensureField(clone.payload.payload_current, "payment.proof", placeholder);
      ensureField(clone.payload.payload_current, "call.evidence_images", [
        placeholder,
      ]);
      ensureField(clone.payload.payload_current, "call.notes_images", [
        placeholder,
      ]);
      return clone;
    })();

    console.log("[CRM DEBUG] record (raw)", record);
    console.log("[CRM DEBUG] debug", debug);
    console.log(
      "[CRM DEBUG] snapshot.body (POST /v1/leads/snapshot)",
      snapshotBody
    );
    console.log(
      "[CRM DEBUG] snapshot.body (con placeholders)",
      snapshotForPrint
    );
    toast({
      title: "Debug en consola",
      description: "Se imprimió el lead completo y el body del snapshot.",
    });
  }, [draft, id, leadForUi, record, user]);

  const handlePostSnapshot = React.useCallback(async () => {
    if (!record) return;
    if (snapshotSaving) return;

    const ctx = buildSnapshotContext();
    if (!ctx) return;

    if (!ctx.entityId) {
      toast({
        title: "No se puede enviar snapshot",
        description: "Falta source entity_id (UUID).",
        variant: "destructive",
      });
      return;
    }

    const capturedAt = new Date().toISOString();
    const snapshotPayloadCurrent = leadForUi || record;

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

      console.log("[CRM SNAPSHOT] POST /v1/leads/snapshot body", {
        entity: "crm_lead_snapshot",
        entity_id: `${String(ctx.entity)}:${String(
          ctx.recordId
        )}:${capturedAt}`,
        payload: snapshot,
      });

      await createLeadSnapshot({
        source: {
          record_id: ctx.recordId,
          entity: ctx.entity,
          entity_id: ctx.entityId,
        },
        snapshot,
      });

      toast({ title: "Snapshot enviado" });
      await load({ silent: true });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo enviar el snapshot",
        variant: "destructive",
      });
    } finally {
      setSnapshotSaving(false);
    }
  }, [draft, id, leadForUi, load, record, snapshotSaving, user]);

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

  // NOTE: handleDebugConsole/handlePostSnapshot se definen arriba para respetar el orden de hooks.

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
          <Button variant="secondary" onClick={handlePrint}>
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={handlePostSnapshot}
            disabled={snapshotSaving}
          >
            {snapshotSaving ? "Enviando..." : "Snapshot"}
          </Button>
          <Button variant="outline" onClick={handleDebugConsole}>
            Debug consola
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
                      {p.call_outcome ||
                        p.callOutcome ||
                        p.call?.outcome ||
                        "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="truncate">
                      {p.payment_status || statusLabel}
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
                  <select
                    id="lead-stage"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                    value={leadStatus}
                    disabled={stageSaving}
                    onChange={async (e) => {
                      const next = e.target.value;
                      const prev = record?.status;
                      applyRecordPatch({ status: next });
                      setStageSaving(true);
                      try {
                        await updateLead(id, { status: next }, record as any);
                        toast({
                          title: "Etapa actualizada",
                          description: `Lead → ${next}`,
                        });
                      } catch (err: any) {
                        applyRecordPatch({ status: prev });
                        toast({
                          title: "Error",
                          description:
                            err?.message || "No se pudo actualizar la etapa",
                          variant: "destructive",
                        });
                        await load({ silent: true });
                      } finally {
                        setStageSaving(false);
                      }
                    }}
                  >
                    <option value="new">Nuevo</option>
                    <option value="contacted">Contactado</option>
                    <option value="qualified">Calificado</option>
                    <option value="won">Ganado</option>
                    <option value="lost">Perdido</option>
                  </select>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="lead-disposition">Estado comercial</Label>
                  <select
                    id="lead-disposition"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                    value={leadDisposition}
                    disabled={dispositionSaving}
                    onChange={async (e) => {
                      const next = e.target.value;
                      const prev = record?.lead_disposition;
                      applyRecordPatch({ lead_disposition: next || null });
                      setDispositionSaving(true);
                      try {
                        await updateLeadPatch(
                          id,
                          {
                            lead_disposition: next || null,
                          },
                          record as any
                        );
                        toast({ title: "Estado guardado" });
                      } catch (err: any) {
                        applyRecordPatch({ lead_disposition: prev ?? null });
                        toast({
                          title: "Error",
                          description: err?.message || "No se pudo guardar",
                          variant: "destructive",
                        });
                        await load({ silent: true });
                      } finally {
                        setDispositionSaving(false);
                      }
                    }}
                  >
                    <option value="">—</option>
                    <option value="interesado">Interesado</option>
                    <option value="en_seguimiento">En seguimiento</option>
                    <option value="pendiente_pago">Pendiente de pago</option>
                    <option value="reagendar">Reagendar</option>
                    <option value="no_responde">No responde</option>
                    <option value="no_califica">No califica</option>
                    <option value="no_interesado">No interesado</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Se guarda automáticamente.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <CallFlowManager
            leadCodigo={id}
            payload={p}
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
                      payload={salePayload}
                      draft={draft || undefined}
                      leadCodigo={id}
                      entity="booking"
                      title="Contrato / resumen"
                      onUpdated={() => load({ silent: true })}
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
                autoSave
                onChange={(f) => setDraft({ ...f })}
                onDone={() => {
                  load({ silent: true });
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
