"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Fase3Row, Fase4Row } from "./AdsStudentsTable";

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
            <CardTitle className="text-sm">Embudo promedio (F4)</CardTitle>
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
