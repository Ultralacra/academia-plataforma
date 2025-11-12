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

export default function SaleEditPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <Content id={params.id} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function Content({ id }: { id: string }) {
  const [loading, setLoading] = React.useState(true);
  const [record, setRecord] = React.useState<MetadataRecord<any> | null>(null);
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

  const initial: Partial<CloseSaleInput> = {
    fullName: salePayload?.name || "",
    email: salePayload?.email || "",
    phone: salePayload?.phone || "",
    program: salePayload?.program || "",
    bonuses: rawBonuses,
    paymentMode: salePayload?.payment?.mode || "",
    paymentAmount: salePayload?.payment?.amount || "",
    paymentPlatform: salePayload?.payment?.platform || "hotmart",
    nextChargeDate: salePayload?.payment?.nextChargeDate || "",
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
      <Card className="p-4">
        <CloseSaleForm
          mode="edit"
          recordId={record.id}
          entity={isSale ? "sale" : "booking"}
          initial={initial}
          onDone={() => router.refresh()}
        />
      </Card>
    </div>
  );
}
