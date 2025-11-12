"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { listMetadata, type MetadataRecord } from "@/lib/metadata";
import { useAuth } from "@/hooks/use-auth";

type SalePayload = {
  status?: string;
  payment?: { amount?: string | number; nextChargeDate?: string | null };
  closer?: { id?: string; email?: string; name?: string } | null;
  program?: string;
};

function sumAmounts(items: MetadataRecord<SalePayload>[]) {
  let total = 0;
  for (const it of items) {
    const raw = it.payload?.payment?.amount;
    const num =
      typeof raw === "number"
        ? raw
        : parseFloat(String(raw || 0).replace(/[^0-9.\-]/g, ""));
    if (!isNaN(num)) total += num;
  }
  return total;
}

export function SalesPersonalMetrics() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<MetadataRecord<SalePayload>[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await listMetadata<any>();
      const records = res.items || [];
      // Fuente A: entidad 'sale'
      const salesA = records.filter(
        (r) => r.entity === "sale"
      ) as MetadataRecord<SalePayload>[];
      // Fuente B: entidad 'booking' con sale embebido en payload.sale
      const salesB = records
        .filter((r) => r.entity === "booking" && r.payload && r.payload.sale)
        .map((r) => ({
          ...r,
          payload: r.payload.sale as SalePayload,
        })) as MetadataRecord<SalePayload>[];
      const allSales = [...salesA, ...salesB];
      const mine = allSales.filter((r) => {
        const closer = r.payload?.closer;
        const uid = (user as any)?.id ?? user.email ?? user.name;
        return closer && (closer.id === uid || closer.email === user.email);
      });
      setItems(mine);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  const byStatus = items.reduce<Record<string, number>>((acc, r) => {
    const s = (r.payload?.status || "-").toString();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const revenueConfirmed = sumAmounts(
    items.filter((r) =>
      [
        "payment_confirmed",
        "contract_signed",
        "active",
        "operational_closure",
      ].includes(r.payload?.status || "")
    )
  );

  const today = new Date();
  const upcoming = items.filter((r) => {
    const d = r.payload?.payment?.nextChargeDate;
    return d ? new Date(d) >= today : false;
  }).length;
  const overdue = items.filter((r) => {
    const d = r.payload?.payment?.nextChargeDate;
    return d ? new Date(d) < today : false;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="text-xs text-slate-600">Mis cierres</div>
        <div className="text-2xl font-semibold">{items.length}</div>
        <div className="text-xs text-slate-500">Ventas registradas</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-slate-600">Ingresos confirmados</div>
        <div className="text-2xl font-semibold">
          ${revenueConfirmed.toLocaleString()}
        </div>
        <div className="text-xs text-slate-500">Suma de montos</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-slate-600">Próximos cobros</div>
        <div className="text-2xl font-semibold">{upcoming}</div>
        <div className="text-xs text-slate-500">Con fecha futura</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-slate-600">Cobros vencidos</div>
        <div className="text-2xl font-semibold">{overdue}</div>
        <div className="text-xs text-slate-500">Con fecha pasada</div>
      </Card>

      <Card className="p-4 md:col-span-4">
        <div className="text-sm font-medium mb-2">Estados</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.keys(byStatus).length === 0 ? (
            <span className="text-slate-500">Sin ventas</span>
          ) : (
            Object.entries(byStatus).map(([s, n]) => (
              <span
                key={s}
                className="px-2 py-1 rounded-md bg-slate-100 text-slate-700"
              >
                {s}: {n}
              </span>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
