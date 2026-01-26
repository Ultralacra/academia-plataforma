"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  PiggyBank,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
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
        (r) => r.entity === "sale",
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
      ].includes(r.payload?.status || ""),
    ),
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card className="p-4 border-slate-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50/70 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mis cierres
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {items.length}
            </div>
            <div className="text-xs text-slate-500">Ventas registradas</div>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-indigo-500 shadow-inner">
            <Activity className="h-5 w-5" />
          </span>
        </div>
      </Card>
      <Card className="p-4 border-slate-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ingresos confirmados
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              ${revenueConfirmed.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Suma de montos</div>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-emerald-500 shadow-inner">
            <PiggyBank className="h-5 w-5" />
          </span>
        </div>
      </Card>
      <Card className="p-4 border-slate-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50/70 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Próximos cobros
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {upcoming}
            </div>
            <div className="text-xs text-slate-500">Con fecha futura</div>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-amber-500 shadow-inner">
            <CalendarClock className="h-5 w-5" />
          </span>
        </div>
      </Card>
      <Card className="p-4 border-slate-200/70 bg-gradient-to-br from-rose-50 via-white to-pink-50/70 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cobros vencidos
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {overdue}
            </div>
            <div className="text-xs text-slate-500">Con fecha pasada</div>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-rose-500 shadow-inner">
            <AlertTriangle className="h-5 w-5" />
          </span>
        </div>
      </Card>

      <Card className="p-4 md:col-span-4 border-slate-200/70 bg-white/90 shadow-sm">
        <div className="text-sm font-medium mb-3 text-slate-700">Estados</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.keys(byStatus).length === 0 ? (
            <span className="text-slate-500">Sin ventas</span>
          ) : (
            Object.entries(byStatus).map(([s, n]) => {
              const normalized = s.toLowerCase();
              let badgeClasses = "border-slate-200 bg-slate-100 text-slate-700";
              if (
                ["active", "contract_signed", "payment_confirmed"].includes(
                  normalized,
                )
              ) {
                badgeClasses =
                  "border-emerald-200 bg-emerald-50 text-emerald-700";
              } else if (
                ["contract_sent", "operational_closure", "qualified"].includes(
                  normalized,
                )
              ) {
                badgeClasses = "border-indigo-200 bg-indigo-50 text-indigo-700";
              } else if (
                ["lost", "cancelled", "canceled"].includes(normalized)
              ) {
                badgeClasses = "border-rose-200 bg-rose-50 text-rose-700";
              }
              return (
                <Badge
                  key={s}
                  variant="outline"
                  className={`px-2 py-1 ${badgeClasses}`}
                >
                  {s}: {n}
                </Badge>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
