"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function AdsMetricsInputs({ data, onChange, view }: any) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Fecha inicio</Label>
          <Input
            type="date"
            value={data.fecha_inicio || ""}
            onChange={(e) => onChange("fecha_inicio", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha asignación</Label>
          <Input
            type="date"
            value={data.fecha_asignacion || ""}
            onChange={(e) => onChange("fecha_asignacion", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha fin</Label>
          <Input
            type="date"
            value={data.fecha_fin || ""}
            onChange={(e) => onChange("fecha_fin", e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Rendimiento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Inversión (USD)</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.inversion || ""}
              onChange={(e) => onChange("inversion", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Facturación (USD)</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={data.facturacion || ""}
              onChange={(e) => onChange("facturacion", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>ROAS</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Auto</span>
                <Switch
                  checked={!!data.auto_roas}
                  onCheckedChange={(v) => onChange("auto_roas", v)}
                />
              </div>
            </div>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              disabled={data.auto_roas}
              value={data.auto_roas ? view.roas || "" : data.roas || ""}
              onChange={(e) => onChange("roas", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
