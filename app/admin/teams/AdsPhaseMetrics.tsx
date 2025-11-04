"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Fase3Row, Fase4Row } from "./AdsStudentsTable";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function toNum(v?: string | number | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  // normaliza coma decimal y elimina espacios
  const n = Number(s.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

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
  const v = Number(n) <= 1 ? Number(n) * 100 : Number(n);
  return `${v.toFixed(1)}%`;
}

export default function AdsPhaseMetrics({
  fase3,
  fase4,
}: {
  fase3: Fase3Row[];
  fase4: Fase4Row[];
}) {
  // Totales
  const totalF3 = (fase3 || []).filter((r) =>
    (r?.["Nombre del estudiante"] || "").trim()
  ).length;
  const totalF4 = (fase4 || []).filter((r) =>
    (r?.["Nombre del estudiante"] || "").trim()
  ).length;

  // Tasa avance F3 -> F4 (desde columna Paso a fase 4)
  const f3Paso = (fase3 || []).filter((r) =>
    /sí/i.test(String(r?.["Paso a fase 4"] || ""))
  ).length;
  const tasaAvance = totalF3 > 0 ? f3Paso / totalF3 : null;

  // % intervención
  const f3IntervSi = (fase3 || []).filter((r) =>
    /sí/i.test(String(r?.["¿Requiere intervención?"] || ""))
  ).length;
  const f4IntervSi = (fase4 || []).filter((r) =>
    /sí/i.test(String(r?.["¿Requiere intervención?"] || ""))
  ).length;
  const pctIntervF3 = totalF3 > 0 ? f3IntervSi / totalF3 : null;
  const pctIntervF4 = totalF4 > 0 ? f4IntervSi / totalF4 : null;

  // % pauta activa (F4)
  const f4PautaSi = (fase4 || []).filter((r) =>
    /sí|si|true|1/i.test(String(r?.["¿Tiene pauta activa?"] || ""))
  ).length;
  const pctPautaActiva = totalF4 > 0 ? f4PautaSi / totalF4 : null;

  // ROAS promedio, inversión total, facturación total (F4)
  const roasValues: number[] = [];
  let invTotal = 0;
  let facTotal = 0;
  let effAdsSum = 0,
    effPagoSum = 0,
    effCompraSum = 0,
    effCount = 0;
  (fase4 || []).forEach((r) => {
    const roas = toNum(r?.["ROAs"]);
    if (roas != null) roasValues.push(roas);
    const inv = toNum(r?.["Inversión en Pauta"]);
    if (inv != null) invTotal += inv;
    const fac = toNum(r?.["Facturación"]);
    if (fac != null) facTotal += fac;
    const ea = toNum(r?.["Efectividad Ads"]);
    const ep = toNum(r?.["Efectividad pago iniciado"]);
    const ec = toNum(r?.["Efectividad compra"]);
    if (ea != null && ep != null && ec != null) {
      effAdsSum += ea;
      effPagoSum += ep;
      effCompraSum += ec;
      effCount += 1;
    }
  });
  const roasProm = roasValues.length
    ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length
    : null;
  const effAdsAvg = effCount ? effAdsSum / effCount : null;
  const effPagoAvg = effCount ? effPagoSum / effCount : null;
  const effCompraAvg = effCount ? effCompraSum / effCount : null;

  // Ayudas de lectura y diagnóstico
  const base = 100;
  const stepAds = effAdsAvg != null ? Math.round(base * effAdsAvg) : null;
  const stepPago =
    effPagoAvg != null && stepAds != null
      ? Math.round(stepAds * effPagoAvg)
      : null;
  const stepCompra =
    effCompraAvg != null && stepPago != null
      ? Math.round(stepPago * effCompraAvg)
      : null;
  const dropAdsPago =
    stepAds != null && stepPago != null
      ? Math.max(stepAds - stepPago, 0)
      : null;
  const dropPagoCompra =
    stepPago != null && stepCompra != null
      ? Math.max(stepPago - stepCompra, 0)
      : null;

  function badgeTone(
    v: number | null | undefined
  ): "default" | "secondary" | "destructive" {
    if (v == null || !isFinite(Number(v))) return "secondary";
    const p = Number(v);
    // Notas: usamos umbrales suaves para que sea explicativo, no alarmista
    if (p >= 0.6) return "default"; // OK
    if (p >= 0.4) return "secondary"; // Medio
    return "destructive"; // Riesgo
  }

  const recomendaciones: Array<{ text: string }> = [];
  if (effAdsAvg != null && effAdsAvg < 0.4)
    recomendaciones.push({
      text: "Baja efectividad de Ads: prueba nuevos creativos/segmentación y refuerza el mensaje de valor.",
    });
  if (effPagoAvg != null && effPagoAvg < 0.5)
    recomendaciones.push({
      text: "Pocos pasan a pago: revisa claridad de la oferta, retargeting a carrito y CTA más directo.",
    });
  if (effCompraAvg != null && effCompraAvg < 0.5)
    recomendaciones.push({
      text: "Conversión de compra baja: optimiza checkout (fricción, medios de pago, confianza) y recordatorios.",
    });
  if (pctPautaActiva != null && pctPautaActiva < 0.5)
    recomendaciones.push({
      text: "Poca pauta activa: activar campañas puede elevar el tope del embudo.",
    });
  if (roasProm != null && roasProm < 1)
    recomendaciones.push({
      text: "ROAS bajo: ajustar inversión hacia conjuntos con mejor desempeño.",
    });

  // Series para gráficos
  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

  // Dona: distribución de alumnos F3 vs F4
  const phasePieData = [
    { name: "Fase 3", value: totalF3 },
    { name: "Fase 4", value: totalF4 },
  ];

  // Embudo promedio: normalizado a 100 en la primera etapa
  const funnelData = [
    { name: "Impactados", value: base },
    { name: "Efect. Ads", value: stepAds ?? 0 },
    { name: "Pago iniciado", value: stepPago ?? 0 },
    { name: "Compra", value: stepCompra ?? 0 },
  ];

  // Barras 100% por etapa (simple y comparativo)
  const bar100Data = [
    {
      etapa: "Efect. Ads",
      ok: effAdsAvg != null ? effAdsAvg * 100 : 0,
      rest: effAdsAvg != null ? 100 - effAdsAvg * 100 : 100,
    },
    {
      etapa: "Pago iniciado",
      ok: effPagoAvg != null ? effPagoAvg * 100 : 0,
      rest: effPagoAvg != null ? 100 - effPagoAvg * 100 : 100,
    },
    {
      etapa: "Compra",
      ok: effCompraAvg != null ? effCompraAvg * 100 : 0,
      rest: effCompraAvg != null ? 100 - effCompraAvg * 100 : 100,
    },
  ];

  // Etiqueta para mostrar porcentaje al final del segmento "ok"
  const PercentLabel = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    value = 0,
  }: any) => {
    const vx = Number(value) || 0;
    const text = `${vx.toFixed(1)}%`;
    const textX = x + Math.max(width + 6, 6);
    const textY = y + height / 2 + 4;
    return (
      <text x={textX} y={textY} fill="#111827" fontSize={12}>
        {text}
      </text>
    );
  };

  // Tops por ROAS
  const topRoas = (fase4 || [])
    .map((r) => ({
      name: String(r?.["Nombre del estudiante"] || "—"),
      roas: toNum(r?.["ROAs"]),
    }))
    .filter((x) => x.roas != null)
    .sort((a, b) => b.roas! - a.roas!)
    .slice(0, 5);

  // Alertas (requiere intervención)
  const alertas = [
    ...(fase3 || [])
      .filter((r) => /sí/i.test(String(r?.["¿Requiere intervención?"] || "")))
      .map((r) => ({
        fase: "F3",
        name: String(r?.["Nombre del estudiante"] || "—"),
        motivo: String(
          r?.["Obs del estado"] || r?.["  Tipo de intervención sugerida"] || ""
        ),
      })),
    ...(fase4 || [])
      .filter((r) => /sí/i.test(String(r?.["¿Requiere intervención?"] || "")))
      .map((r) => ({
        fase: "F4",
        name: String(r?.["Nombre del estudiante"] || "—"),
        motivo: String(
          r?.["Obs del estado"] || r?.["  Tipo de intervención sugerida"] || ""
        ),
      })),
  ].slice(0, 6);

  // Componente interno: visualización de paso con barra de progreso
  function StepViz({
    label,
    value, // 0..100 base 100
    eff, // 0..1 o 0..100 (se normaliza a %)
    drop, // puntos porcentuales de caída vs etapa previa
  }: {
    label: string;
    value: number | null;
    eff?: number | null;
    drop?: number | null;
  }) {
    const pct =
      value == null ? null : Math.max(0, Math.min(100, Number(value)));
    const effPct =
      eff == null ? null : Number(eff) <= 1 ? Number(eff) * 100 : Number(eff);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2 h-full">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="flex items-center gap-1">
            {drop != null && drop > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                -{drop} pp
              </Badge>
            )}
            <Badge
              variant={badgeTone(eff ?? null)}
              className="text-[10px] px-1.5 py-0"
            >
              {fmtPercent(eff ?? null)}
            </Badge>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold tabular-nums">
            {pct != null ? pct : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">/ 100</div>
        </div>
        <div className="mt-1">
          <div className="h-3.5 w-full rounded-full bg-slate-100">
            <div
              className="h-3.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
              style={{
                width:
                  pct == null ? "0%" : `${pct > 0 ? Math.max(pct, 2) : 0}%`,
              }}
            />
          </div>
        </div>
        {effPct != null && (
          <div className="text-[11px] text-muted-foreground">
            Efectividad etapa: {effPct.toFixed(1)}%
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fila 1: Totales y avance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alumnos por fase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-muted-foreground">Fase 3</div>
                <div className="text-2xl font-semibold">
                  {fmtNumber(totalF3)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Fase 4</div>
                <div className="text-2xl font-semibold">
                  {fmtNumber(totalF4)}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Conteo con base en datasets estáticos.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tasa avance F3 → F4</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {fmtPercent(tasaAvance)}
            </div>
            <div className="text-xs text-muted-foreground">
              Basado en “Paso a fase 4” de Fase 3.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Intervenciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">F3 con intervención</div>
                <div className="text-xl font-semibold">
                  {fmtPercent(pctIntervF3)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">F4 con intervención</div>
                <div className="text-xl font-semibold">
                  {fmtPercent(pctIntervF4)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 1.25: Resumen y diagnóstico para entendimiento rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumen de conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed">
              {stepAds != null && stepPago != null && stepCompra != null ? (
                <>
                  Por cada 100 impactados: <b>{stepAds}%</b> enganchan con Ads,
                  <b> {stepPago}%</b> inician el pago y <b>{stepCompra}%</b>{" "}
                  terminan comprando.
                  {dropAdsPago != null && dropPagoCompra != null && (
                    <>
                      {" "}
                      La mayor caída está{" "}
                      {dropAdsPago >= dropPagoCompra ? (
                        <>
                          entre <b>Ads → Pago</b> (<b>-{dropAdsPago} pp</b>).
                        </>
                      ) : (
                        <>
                          entre <b>Pago → Compra</b> (
                          <b>-{dropPagoCompra} pp</b>).
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  Aún no hay suficientes datos completos para construir el
                  resumen.
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={badgeTone(effAdsAvg)}>
                Efect. Ads: {fmtPercent(effAdsAvg)}
              </Badge>
              <Badge variant={badgeTone(effPagoAvg)}>
                Pago iniciado: {fmtPercent(effPagoAvg)}
              </Badge>
              <Badge variant={badgeTone(effCompraAvg)}>
                Compra: {fmtPercent(effCompraAvg)}
              </Badge>
              <Badge variant={badgeTone(pctPautaActiva)}>
                Pauta activa: {fmtPercent(pctPautaActiva)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Consejo: mira el mayor salto negativo para priorizar acciones.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Diagnóstico rápido</CardTitle>
          </CardHeader>
          <CardContent>
            {recomendaciones.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {recomendaciones.map((r, i) => (
                  <li key={i}>{r.text}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm">
                Sin alertas por ahora. ¡Buen trabajo!
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              Generado automáticamente según umbrales suaves para orientar
              decisiones.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 1.5: Visualizaciones (torta, flujo y embudo 100%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribución por fase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={phasePieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                  >
                    {phasePieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v: any) =>
                      new Intl.NumberFormat("es-CO").format(Number(v || 0))
                    }
                    separator=": "
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              Flujo de conversión (por cada 100)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StepViz label="Impactados" value={100} eff={1} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Base: 100 personas impactadas.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StepViz
                        label="Efect. Ads"
                        value={stepAds}
                        eff={effAdsAvg}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{`100 × Efect. Ads → ${
                    stepAds ?? "—"
                  }`}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StepViz
                        label="Pago iniciado"
                        value={stepPago}
                        eff={effPagoAvg}
                        drop={dropAdsPago}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{`${stepAds ?? "—"} × Efect. pago → ${
                    stepPago ?? "—"
                  }`}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StepViz
                        label="Compra"
                        value={stepCompra}
                        eff={effCompraAvg}
                        drop={dropPagoCompra}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{`${stepPago ?? "—"} × Efect. compra → ${
                    stepCompra ?? "—"
                  }`}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <div className="text-xs text-muted-foreground mt-2">
              Cada tarjeta muestra cuántas personas llegan a esa etapa al partir
              de 100 impactados. "pp" = puntos porcentuales de caída vs la etapa
              previa.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Embudo 100% (simple)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bar100Data}
                  layout="vertical"
                  margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="okBarGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.5}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="etapa"
                    width={96}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* Track 100% */}
                  <Bar
                    dataKey={() => 100}
                    fill="#f1f5f9"
                    barSize={18}
                    radius={[8, 8, 8, 8]}
                  />
                  {/* Conversión */}
                  <Bar
                    dataKey="ok"
                    fill="url(#okBarGradient)"
                    radius={[8, 0, 0, 8]}
                    barSize={18}
                  >
                    <LabelList dataKey="ok" content={PercentLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Cada barra muestra la conversión de esa etapa (0–100%).
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 2: Ads overview y pauta activa */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ROAS promedio (F4)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {roasProm != null ? roasProm.toFixed(2) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Inversión total (F4)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fmtMoney(invTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Facturación total (F4)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fmtMoney(facTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pauta activa (F4)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {fmtPercent(pctPautaActiva)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 3: Embudo promedio F4 y Top ROAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Embudo (valores)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Efect. Ads</div>
                <div className="text-xl font-semibold">
                  {fmtPercent(effAdsAvg)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Pago iniciado</div>
                <div className="text-xl font-semibold">
                  {fmtPercent(effPagoAvg)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Compra</div>
                <div className="text-xl font-semibold">
                  {fmtPercent(effCompraAvg)}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Promedios sobre registros con datos completos.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top ROAS (F4)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {topRoas.map((x, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="truncate pr-2">{x.name}</div>
                  <div className="font-medium">{x.roas?.toFixed(2)}</div>
                </div>
              ))}
              {topRoas.length === 0 && (
                <div className="text-muted-foreground">Sin datos</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 4: Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Alertas (requieren intervención)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {alertas.map((a, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="truncate pr-2">
                  [{a.fase}] {a.name}
                </div>
                <div
                  className="text-muted-foreground truncate max-w-[60%]"
                  title={a.motivo}
                >
                  {a.motivo || "Sin detalle"}
                </div>
              </div>
            ))}
            {alertas.length === 0 && (
              <div className="text-muted-foreground">Sin alertas</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tooltip simple para el embudo
function TooltipContentFunnel() {
  return (
    <RTooltip
      formatter={(v: any) => `${Number(v || 0)} / 100`}
      labelFormatter={(l: any) => String(l)}
      separator=": "
    />
  );
}
