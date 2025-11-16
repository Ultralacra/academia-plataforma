"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
function fmtPercent(n: number | null | undefined, digits: number = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n) <= 1 ? Number(n) * 100 : Number(n);
  return `${v.toFixed(digits)}%`;
}

function toPct(a?: number | null, b?: number | null): string {
  if (a == null || b == null || !isFinite(a) || !isFinite(b) || b === 0)
    return "—";
  return `${((a / b) * 100).toFixed(1)}%`;
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
    helper,
    chip,
    align = "left",
  }: {
    label: string;
    value: string | number;
    helper?: string;
    chip?: React.ReactNode;
    align?: "left" | "right";
  }) => (
    <div className={`space-y-0.5 ${align === "right" ? "text-right" : ""}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg md:text-xl font-semibold tabular-nums">
        {value}
      </div>
      {(helper || chip) && (
        <div
          className={`flex ${
            align === "right" ? "justify-end" : ""
          } items-center gap-2 mt-0.5`}
        >
          {helper && (
            <div className="text-[11px] text-muted-foreground">{helper}</div>
          )}
          {chip}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Rendimiento (solo arriba) */}
      <Card className="border-blue-200 col-span-12">
        <CardHeader className="py-2">
          <CardTitle className="text-xs text-blue-700">Rendimiento</CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat label="ROAS" value={fmtNumber(metrics.roas)} />
            <Stat label="Inversión" value={fmtMoney(metrics.inversion)} />
          </div>
        </CardContent>
      </Card>

      {/* Bloque inferior combinado: Embudo + Efectividades + Compras */}
      <Card className="col-span-12">
        <CardHeader className="py-2">
          <CardTitle className="text-xs">Embudo y Efectividad</CardTitle>
        </CardHeader>
        <CardContent className="py-3 space-y-6">
          {/* Embudo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Alcance" value={fmtNumber(metrics.alcance)} />
            <Stat
              label="Clics"
              value={fmtNumber(metrics.clics)}
              helper={`CTR ${toPct(metrics.clics, metrics.alcance)}`}
              chip={<Badge variant="secondary">de alcance</Badge>}
            />
            <Stat
              label="Visitas"
              value={fmtNumber(metrics.visitas)}
              helper={`${toPct(metrics.visitas, metrics.clics)} de clics`}
              chip={<Badge variant="secondary">tasa visita</Badge>}
            />
            <Stat
              label="Pagos iniciados"
              value={fmtNumber(metrics.pagos_iniciados)}
              helper={`${toPct(
                metrics.pagos_iniciados,
                metrics.visitas
              )} de visitas`}
              chip={<Badge variant="secondary">PI rate</Badge>}
            />
          </div>

          {/* Efectividades */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* Compras (Facturación) + Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat
              label="Facturación"
              value={fmtMoney(metrics.facturacion)}
              helper="USD bruto"
            />
            <div className="space-y-0.5">
              <div className="text-[11px] text-muted-foreground">
                Pauta activa
              </div>
              <div className="text-lg md:text-xl font-semibold">
                {metrics.pauta_activa == null ? (
                  "—"
                ) : metrics.pauta_activa ? (
                  <Badge className="text-[13px]" variant="default">
                    Sí
                  </Badge>
                ) : (
                  <Badge className="text-[13px]" variant="destructive">
                    No
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[11px] text-muted-foreground">Notas</div>
              <div className="text-[11px] text-muted-foreground leading-snug">
                ROAS vs inversión para ajustar presupuesto. Validar anomalías en
                pago iniciado / compra.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
