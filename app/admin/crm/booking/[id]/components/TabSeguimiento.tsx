"use client";
import React from "react";
import { CallFlowManager } from "@/app/admin/crm/components/CallFlowManager";
import { SalesFlowPanel } from "@/app/admin/crm/components/SalesFlowPanel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneCall, GitBranch } from "lucide-react";
import type { SalesFlowState } from "@/lib/crm-types";

interface TabSeguimientoProps {
  id: string;
  p: any;
  applyRecordPatch: (patch: Record<string, any>) => void;
  navigationTarget?: {
    tab: "seguimiento";
    sectionId?: string;
    seguimientoTab?: "flujo_ventas" | "llamada";
    requestKey: number;
  } | null;
}

export function TabSeguimiento({
  id,
  p,
  applyRecordPatch,
  navigationTarget,
}: TabSeguimientoProps) {
  const [activeTab, setActiveTab] = React.useState<"flujo_ventas" | "llamada">(
    "flujo_ventas",
  );

  /* ── Estado del flujo comercial (guardado en payload.sales_flow) ── */
  const salesFlow: SalesFlowState | null = (p as any)?.sales_flow ?? null;

  const handleFlowChange = (next: SalesFlowState) => {
    applyRecordPatch({ sales_flow: next });
  };

  const summary = [
    {
      label: "Pipeline CRM",
      value: String((p as any)?.pipeline_status || "Sin definir"),
    },
    {
      label: "Protocolo",
      value: String((p as any)?.protocol_name || "Sin definir"),
    },
    {
      label: "Última interacción",
      value: (p as any)?.last_interaction_at
        ? new Date((p as any).last_interaction_at).toLocaleString("es-ES")
        : "Sin registro",
    },
    {
      label: "Próximo contacto",
      value: (p as any)?.next_contact_at
        ? new Date((p as any).next_contact_at).toLocaleString("es-ES")
        : "Sin agenda",
    },
  ];

  React.useEffect(() => {
    if (!navigationTarget) return;

    const nextTab = navigationTarget.seguimientoTab ?? "flujo_ventas";
    setActiveTab(nextTab);

    const timer = window.setTimeout(() => {
      const targetId = navigationTarget.sectionId ?? `seguimiento-${nextTab}`;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [navigationTarget]);

  return (
    <div className="space-y-6">
      {/* Resumen rápido */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs: Flujo de Ventas | Flujo de Llamada (legacy) */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "flujo_ventas" | "llamada")
        }
      >
        <TabsList className="mb-4">
          <TabsTrigger value="flujo_ventas" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Flujo de Ventas
          </TabsTrigger>
          <TabsTrigger value="llamada" className="gap-2">
            <PhoneCall className="h-4 w-4" />
            Detalle Llamada
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: FLUJO DE VENTAS (5 fases) ── */}
        <TabsContent value="flujo_ventas">
          <div
            id="seguimiento-flujo-ventas"
            className="rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/30 p-5 backdrop-blur"
          >
            <SalesFlowPanel
              leadNombre={(p as any)?.name ?? (p as any)?.nombre ?? id}
              state={salesFlow}
              onChange={handleFlowChange}
              focusSectionId={navigationTarget?.sectionId}
              focusRequestKey={navigationTarget?.requestKey}
            />
          </div>
        </TabsContent>

        {/* ── TAB: DETALLE LLAMADA (CallFlowManager legacy) ── */}
        <TabsContent value="llamada">
          <Card
            id="seguimiento-llamada"
            className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/80 backdrop-blur shadow-sm"
          >
            <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardHeader className="pb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <PhoneCall className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-slate-800">Seguimiento</CardTitle>
                  <CardDescription className="text-slate-500">
                    Gestión de llamadas, recordatorios y protocolo activo
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-3">
                {String((p as any)?.conversation_status || "").trim() ? (
                  <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-50">
                    Conversación: {String((p as any)?.conversation_status)}
                  </Badge>
                ) : null}
                {String((p as any)?.protocol_step || "").trim() ? (
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">
                    Paso: {String((p as any)?.protocol_step)}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/50 p-5">
                <CallFlowManager
                  leadCodigo={id}
                  payload={p}
                  persistMode="local"
                  onSaved={(nextCall) => {
                    if (!nextCall) return;

                    const toMidnightIso = (date?: string | null) => {
                      if (!date) return null;
                      const s = String(date);
                      if (s.includes("T")) return s;
                      try {
                        return new Date(`${s}T00:00:00.000Z`).toISOString();
                      } catch {
                        return s;
                      }
                    };

                    applyRecordPatch({
                      call: nextCall,
                      call_outcome: nextCall?.outcome ?? null,
                      call_result_at: nextCall?.result_at ?? null,
                      call_reschedule_date: toMidnightIso(
                        nextCall?.reschedule?.date ?? null,
                      ),
                      call_reschedule_time: nextCall?.reschedule?.time ?? null,
                      call_negotiation_active: nextCall?.negotiation?.active
                        ? 1
                        : 0,
                      call_negotiation_until:
                        nextCall?.negotiation?.until ?? null,
                      reminders: Array.isArray(nextCall?.reminders)
                        ? nextCall.reminders
                        : [],
                      ...(nextCall?.notes !== undefined
                        ? { text_messages: nextCall?.notes ?? null }
                        : {}),
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
