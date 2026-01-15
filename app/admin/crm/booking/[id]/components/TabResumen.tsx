"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Tags, Calendar } from "lucide-react";

interface TabResumenProps {
  p: any;
  record: any;
  salePayload: any;
  effectiveSalePayload: any;
  draft: any;
  leadStatus: string;
  leadDisposition: string;
  statusLabel: string;
  planSummary: string;
  bonusesList: string[];
  fmtDate: (iso?: string) => string;
  callOutcomeLabel: (raw?: any) => string;
  paymentStatusLabel: (raw?: any) => string;
  applyRecordPatch: (patch: Record<string, any>) => void;
}

export function TabResumen({
  p,
  record,
  salePayload,
  effectiveSalePayload,
  draft,
  leadStatus,
  leadDisposition,
  statusLabel,
  planSummary,
  bonusesList,
  fmtDate,
  callOutcomeLabel,
  paymentStatusLabel,
  applyRecordPatch,
}: TabResumenProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Datos básicos del contacto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{p.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{p.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{p.source || "booking"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">
                  Registrado: {fmtDate(record.created_at || p.created_at)}
                </span>
              </div>

              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                Detalle
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Instagram</span>
                  <span className="truncate">
                    {p.instagram_user || p.instagramUser || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Programa</span>
                  <span className="truncate">
                    {(draft as any)?.program ||
                      effectiveSalePayload?.program ||
                      p.program ||
                      salePayload?.program ||
                      "—"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Bonos</span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {bonusesList.length ? (
                      bonusesList.map((b) => (
                        <Badge key={b} variant="secondary">
                          {b}
                        </Badge>
                      ))
                    ) : (
                      <span className="truncate">—</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Presupuesto mensual
                  </span>
                  <span className="truncate">
                    {(p.monthly_budget ?? p.monthlyBudget) === null ||
                    (p.monthly_budget ?? p.monthlyBudget) === undefined
                      ? "—"
                      : String(p.monthly_budget ?? p.monthlyBudget)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Plataforma llamada
                  </span>
                  <span className="truncate">
                    {p.platform_call || p.platformCall || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Resultado llamada
                  </span>
                  <span className="truncate">
                    {callOutcomeLabel(
                      p.call_outcome || p.callOutcome || p.call?.outcome
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Pago</span>
                  <span className="truncate">
                    {p.payment_status
                      ? paymentStatusLabel(p.payment_status)
                      : statusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Monto</span>
                  <span className="truncate">
                    {(p.payment_amount ??
                      effectiveSalePayload?.payment?.amount) === null ||
                    (p.payment_amount ??
                      effectiveSalePayload?.payment?.amount) === undefined
                      ? "—"
                      : String(
                          p.payment_amount ??
                            effectiveSalePayload?.payment?.amount
                        )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Próximo cobro
                  </span>
                  <span className="truncate">
                    {p.next_charge_date ||
                    effectiveSalePayload?.payment?.nextChargeDate
                      ? fmtDate(
                          p.next_charge_date ||
                            effectiveSalePayload?.payment?.nextChargeDate
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="truncate">{planSummary}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Recordatorios
                  </span>
                  <span className="truncate">
                    {Array.isArray(p.reminders)
                      ? p.reminders.length
                      : Array.isArray(p.call?.reminders)
                      ? p.call.reminders.length
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del lead</CardTitle>
            <CardDescription>
              Etapa del pipeline + estado comercial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-1">
                <Label htmlFor="lead-stage">Etapa</Label>
                <Select
                  value={leadStatus}
                  onValueChange={(next) => {
                    applyRecordPatch({ status: next });
                  }}
                >
                  <SelectTrigger id="lead-stage" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nuevo</SelectItem>
                    <SelectItem value="contacted">Contactado</SelectItem>
                    <SelectItem value="qualified">Calificado</SelectItem>
                    <SelectItem value="won">Ganado</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="lead-disposition">Estado comercial</Label>
                <Select
                  value={leadDisposition || "__empty__"}
                  onValueChange={(next) => {
                    applyRecordPatch({
                      lead_disposition:
                        next === "__empty__" ? null : next,
                    });
                  }}
                >
                  <SelectTrigger id="lead-disposition" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">—</SelectItem>
                    <SelectItem value="interesado">Interesado</SelectItem>
                    <SelectItem value="en_seguimiento">
                      En seguimiento
                    </SelectItem>
                    <SelectItem value="pendiente_pago">
                      Pendiente de pago
                    </SelectItem>
                    <SelectItem value="reagendar">Reagendar</SelectItem>
                    <SelectItem value="no_responde">
                      No responde
                    </SelectItem>
                    <SelectItem value="no_califica">
                      No califica
                    </SelectItem>
                    <SelectItem value="no_interesado">
                      No interesado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Se guarda al presionar "Guardar cambios".
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
