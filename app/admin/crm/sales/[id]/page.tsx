"use client";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getMetadata, type MetadataRecord } from "@/lib/metadata";
import {
  CloseSaleForm,
  type CloseSaleInput,
} from "@/app/admin/crm/components/CloseSaleForm2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SalePreview } from "@/app/admin/crm/components/SalePreview";

export default function SaleEditPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <Content id={params.id} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function Content({ id }: { id: string }) {
  const [loading, setLoading] = React.useState(true);
  const [record, setRecord] = React.useState<MetadataRecord<any> | null>(null);
  const [draft, setDraft] = React.useState<Partial<CloseSaleInput> | null>(
    null
  );
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const rec = await getMetadata<any>(id);
      setRecord(rec);
    } catch (e) {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-6 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando venta...
        </Card>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6">
        <Card className="p-6">No se encontró el registro solicitado.</Card>
      </div>
    );
  }

  const isSale = record.entity === "sale";
  const salePayload = isSale ? record.payload : record.payload?.sale ?? {};

  const rawBonuses = Array.isArray(salePayload?.bonuses)
    ? (salePayload?.bonuses as string[])
    : typeof salePayload?.bonuses === "string"
    ? String(salePayload?.bonuses)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const toDateInput = (v: any) => {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) return "";
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  const pay: any = salePayload?.payment ?? {};
  const plan0: any = Array.isArray(pay?.plans) ? pay.plans[0] : null;
  const ex: any = pay?.exception_2_installments ?? null;
  const stdScheduleRaw: any =
    pay?.installments_schedule ??
    pay?.installments?.schedule ??
    pay?.installments?.items ??
    plan0?.installments?.schedule ??
    plan0?.installments?.items ??
    null;
  const stdScheduleList = Array.isArray(stdScheduleRaw) ? stdScheduleRaw : [];
  const customRaw: any = pay?.custom_installments ?? plan0?.custom_installments;
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

  const initial: Partial<CloseSaleInput> = {
    fullName: salePayload?.name || "",
    email: salePayload?.email || "",
    phone: salePayload?.phone || "",
    program: salePayload?.program || "",
    bonuses: rawBonuses,
    paymentMode: pay?.mode || "",
    paymentAmount: pay?.amount || "",
    paymentPaidAmount: pay?.paid_amount || "",
    paymentPlanType: pay?.plan_type || undefined,
    paymentInstallmentsCount: pay?.installments?.count ?? undefined,
    paymentInstallmentAmount: pay?.installments?.amount ?? undefined,
    paymentInstallmentsSchedule: stdScheduleList.length
      ? stdScheduleList.map((it: any, idx: number) => ({
          id: String(it?.id || `si_${idx}`),
          amount: String(it?.amount ?? ""),
          dueDate: toDateInput(it?.due_date ?? it?.dueDate ?? ""),
        }))
      : [],
    paymentFirstInstallmentAmount: ex?.first_amount ?? undefined,
    paymentSecondInstallmentAmount: ex?.second_amount ?? undefined,
    paymentSecondInstallmentDate: toDateInput(ex?.second_due_date ?? ""),
    paymentCustomInstallments,
    paymentExceptionNotes: ex?.notes ?? plan0?.notes ?? "",
    paymentPlatform: pay?.platform || "hotmart",
    nextChargeDate: pay?.nextChargeDate || "",
    contractThirdParty: !!salePayload?.contract?.thirdParty,
    notes: salePayload?.notes || "",
    status: salePayload?.status || undefined,
  } as any;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar venta</h1>
        <Button variant="outline" onClick={() => router.push("/admin/crm")}>
          Volver al CRM
        </Button>
      </div>
      <SalePreview
        payload={salePayload}
        draft={draft || undefined}
        id={record.id}
        entity={isSale ? "sale" : "booking"}
        onUpdated={() => router.refresh()}
      />
      <Card className="p-4">
        <CloseSaleForm
          mode="edit"
          recordId={record.id}
          entity={isSale ? "sale" : "booking"}
          initial={initial}
          autoSave
          onChange={(f) => setDraft({ ...f })}
          onDone={() => router.refresh()}
        />
      </Card>
    </div>
  );
}
