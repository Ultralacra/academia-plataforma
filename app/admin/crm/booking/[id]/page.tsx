"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getMetadata, type MetadataRecord } from "@/lib/metadata";
import {
  CloseSaleForm,
  type CloseSaleInput,
} from "@/app/admin/crm/components/CloseSaleForm2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Phone, Tags, Calendar } from "lucide-react";
import Link from "next/link";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
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
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando lead...
        </Card>
      </div>
    );
  }

  if (!record || record.entity !== "booking") {
    return (
      <div className="p-6">
        <Card className="p-6">No se encontró el lead solicitado.</Card>
      </div>
    );
  }

  const p = record.payload || {};
  const salePayload = p.sale || {};

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Detalle del lead</h1>
          <div className="text-sm text-slate-600">ID: {record.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/crm">Volver al CRM</Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={`/admin/crm/sales/${encodeURIComponent(String(record.id))}`}
            >
              Abrir vista de venta
            </Link>
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="truncate">{p.email || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="truncate">{p.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-4 w-4 text-slate-400" />
            <span className="truncate">{p.source || "booking"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              Registrado: {fmtDate(record.created_at || p.created_at)}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium mb-2">
          Cierre de venta dentro del lead
        </div>
        <CloseSaleForm
          mode="edit"
          recordId={record.id}
          entity="booking"
          initial={initial}
          onDone={() => {
            // tras guardar, refrescamos para ver cambios en pantalla
            // usando navegación básica
            window.location.reload();
          }}
        />
      </Card>
    </div>
  );
}
