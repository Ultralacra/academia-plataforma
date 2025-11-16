"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  pctOf,
  toPercentNoSymbol,
  toPercentNoSymbolNoScale,
  sanitizePercentInput,
} from "./ads-utils";

export default function AdsMetricsEffAndPurchases({
  data,
  onChange,
  view,
}: any) {
  return (
    <div className="mt-2 flex flex-col gap-4 lg:flex-row">
      {/* Embudo */}
      <Card className="flex-1">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Embudo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Alcance</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.alcance || ""}
              onChange={(e) => onChange("alcance", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Clics</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.clics || ""}
              onChange={(e) => onChange("clics", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Visitas</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.visitas || ""}
              onChange={(e) => onChange("visitas", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pagos iniciados</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.pagos || ""}
              onChange={(e) => onChange("pagos", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Carga de página (%)</Label>
            <Input
              inputMode="decimal"
              placeholder="0%"
              disabled
              value={`${data.carga_pagina || "0"}%`}
            />
            <div className="text-[11px] text-muted-foreground">
              Se calcula: visitas / clics × 100
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Efectividades */}
      <Card className="flex-1">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Efectividades (%)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Ads (visitas/alcance)</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Auto</span>
                <Switch
                  checked={!!data.auto_eff}
                  onCheckedChange={(v) => onChange("auto_eff", v)}
                />
              </div>
            </div>
            <Input
              inputMode="decimal"
              placeholder="0%"
              disabled={data.auto_eff}
              value={`${
                data.auto_eff
                  ? toPercentNoSymbol(view.eff_ads)
                  : toPercentNoSymbol(data.eff_ads)
              }%`}
              onChange={(e) =>
                onChange("eff_ads", sanitizePercentInput(e.target.value))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pago iniciado (pagos/visitas)</Label>
            <Input
              inputMode="decimal"
              placeholder="0%"
              disabled={data.auto_eff}
              value={`${
                data.auto_eff
                  ? toPercentNoSymbolNoScale(view.eff_pago)
                  : toPercentNoSymbolNoScale(data.eff_pago)
              }%`}
              onChange={(e) =>
                onChange("eff_pago", sanitizePercentInput(e.target.value))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Compra (%)</Label>
            <Input
              inputMode="decimal"
              placeholder="0%"
              disabled={data.auto_eff}
              value={`${
                data.auto_eff
                  ? toPercentNoSymbol(view.eff_compra)
                  : toPercentNoSymbol(data.eff_compra)
              }%`}
              onChange={(e) =>
                onChange("eff_compra", sanitizePercentInput(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Compras */}
      <Card className="flex-1">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Compras</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <Label>Carnada</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.compra_carnada || ""}
              onChange={(e) => onChange("compra_carnada", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bump 1</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.compra_bump1 || ""}
              onChange={(e) => onChange("compra_bump1", e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">
              Efectividad: {pctOf(data.compra_bump1, data.compra_carnada)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bump 2</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.compra_bump2 || ""}
              onChange={(e) => onChange("compra_bump2", e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">
              Efectividad: {pctOf(data.compra_bump2, data.compra_carnada)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>OTO 1</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.compra_oto1 || ""}
              onChange={(e) => onChange("compra_oto1", e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">
              Efectividad: {pctOf(data.compra_oto1, data.compra_carnada)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>OTO 2</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.compra_oto2 || ""}
              onChange={(e) => onChange("compra_oto2", e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">
              Efectividad: {pctOf(data.compra_oto2, data.compra_carnada)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Downsell</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.compra_downsell || ""}
              onChange={(e) => onChange("compra_downsell", e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">
              Efectividad: {pctOf(data.compra_downsell, data.compra_carnada)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
