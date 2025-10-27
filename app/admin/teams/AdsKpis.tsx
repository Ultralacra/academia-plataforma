"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("es-CO").format(Number(n));
}
function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}
function fmtPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  // asume 0..1 o 0..100: normaliza a %
  const v = Number(n) <= 1 ? Number(n) * 100 : Number(n);
  return `${v.toFixed(1)}%`;
}

export type AdsMetrics = {
  roas: number | null;
  inversion: number | null;
  facturacion: number | null;
  alcance: number | null;
  clics: number | null;
  visitas: number | null;
  pagos_iniciados: number | null;
  efectividad_ads: number | null;
  efectividad_pago_iniciado: number | null;
  efectividad_compra: number | null;
  pauta_activa: boolean | null;
};

export default function AdsKpis({ metrics }: { metrics: AdsMetrics }) {
  const Stat = ({
    label,
    value,
    align = "left",
  }: {
    label: string;
    value: string | number;
    align?: "left" | "right";
  }) => (
    <div className={`space-y-1 ${align === "right" ? "text-right" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl md:text-2xl font-semibold">{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Rendimiento: ROAS / Inversión / Facturación */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm text-blue-700">Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="ROAS" value={fmtNumber(metrics.roas)} />
            <Stat
              label="Inversión en pauta"
              value={fmtMoney(metrics.inversion)}
            />
            <Stat
              label="Facturación"
              value={fmtMoney(metrics.facturacion)}
              align="right"
            />
          </div>
        </CardContent>
      </Card>

      {/* Embudo superior: Alcance / Clics / Visitas / Pagos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Embudo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Alcance" value={fmtNumber(metrics.alcance)} />
            <Stat label="Clics" value={fmtNumber(metrics.clics)} />
            <Stat label="Visitas" value={fmtNumber(metrics.visitas)} />
            <Stat
              label="Pagos iniciados"
              value={fmtNumber(metrics.pagos_iniciados)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Efectividades: Ads / Pago iniciado / Compra */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Efectividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat
              label="Efectividad Ads"
              value={fmtPercent(metrics.efectividad_ads)}
            />
            <Stat
              label="Pago iniciado"
              value={fmtPercent(metrics.efectividad_pago_iniciado)}
            />
            <Stat
              label="Compra"
              value={fmtPercent(metrics.efectividad_compra)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label="Pauta activa"
              value={
                metrics.pauta_activa == null
                  ? "—"
                  : metrics.pauta_activa
                  ? "Sí"
                  : "No"
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
