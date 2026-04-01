"use client";
import React from "react";
import { SalesFlowPanel } from "@/app/admin/crm/components/SalesFlowPanel";
import { GitBranch } from "lucide-react";
import type { SalesFlowState } from "@/lib/crm-types";

interface TabSeguimientoProps {
  id: string;
  p: any;
  applyRecordPatch: (patch: Record<string, any>) => void;
  navigationTarget?: {
    tab: "seguimiento";
    sectionId?: string;
    seguimientoTab?: "flujo_ventas";
    requestKey: number;
  } | null;
}

export function TabSeguimiento({
  id,
  p,
  applyRecordPatch,
  navigationTarget,
}: TabSeguimientoProps) {
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

    const timer = window.setTimeout(() => {
      const targetId = navigationTarget.sectionId ?? "seguimiento-flujo-ventas";
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

      <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/30 p-5 backdrop-blur">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <GitBranch className="h-4 w-4 text-slate-500" />
          Flujo de Ventas
        </div>
        <div id="seguimiento-flujo-ventas">
          <SalesFlowPanel
            leadNombre={(p as any)?.name ?? (p as any)?.nombre ?? id}
            state={salesFlow}
            onChange={handleFlowChange}
            focusSectionId={navigationTarget?.sectionId}
            focusRequestKey={navigationTarget?.requestKey}
          />
        </div>
      </div>
    </div>
  );
}
