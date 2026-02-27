"use client";
import React from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CloseSaleForm,
  type CloseSaleInput,
} from "../../../components/CloseSaleForm2";
import { SalePreview } from "@/app/admin/crm/components/SalePreview";
import { ContractGenerator } from "@/app/admin/crm/components/ContractGenerator";
import { toast } from "@/components/ui/use-toast";
import { Eye, CreditCard, CheckCircle2, XCircle } from "lucide-react";

interface TabVentaProps {
  id: string;
  effectiveSalePayload: any;
  draft: any;
  initial: Partial<CloseSaleInput>;
  hasReserva: boolean;
  reserveAmountRaw: any;
  lead: any;
  setDraft: React.Dispatch<
    React.SetStateAction<Partial<CloseSaleInput> | null>
  >;
  setSaleDraftPayload: React.Dispatch<React.SetStateAction<any>>;
}

export function TabVenta({
  id,
  effectiveSalePayload,
  draft,
  initial,
  hasReserva,
  reserveAmountRaw,
  lead,
  setDraft,
  setSaleDraftPayload,
}: TabVentaProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Modal-stack: ocultar dialog padre visualmente cuando ContractGenerator abre su dialog
  const [contractOpen, setContractOpen] = React.useState(false);

  return (
    <Card className="bg-white/80 backdrop-blur border-slate-200/60 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-800">Venta</CardTitle>
              <CardDescription className="text-slate-500">
                Cierre de venta dentro del lead
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 bg-transparent"
                >
                  <Eye className="h-4 w-4" />
                  Vista previa
                </Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
                visuallyHidden={contractOpen}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between gap-3 text-slate-800">
                    <span className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-teal-600" />
                      Vista previa / contrato
                    </span>
                    <ContractGenerator
                      lead={lead}
                      draft={draft || undefined}
                      triggerLabel="Ver contrato"
                      triggerVariant="secondary"
                      triggerClassName="gap-2"
                      onOpenChange={setContractOpen}
                    />
                  </DialogTitle>
                </DialogHeader>
                <SalePreview
                  payload={effectiveSalePayload}
                  draft={draft || undefined}
                  leadCodigo={id}
                  entity="booking"
                  persistMode="local"
                  title="Contrato / resumen"
                />
              </DialogContent>
            </Dialog>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent>
        {/* Info banner de reserva */}
        <div
          className={`mb-5 rounded-xl border px-4 py-3 flex items-center gap-3 ${
            hasReserva
              ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
              : "bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200"
          }`}
        >
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              hasReserva ? "bg-emerald-100" : "bg-slate-200"
            }`}
          >
            {hasReserva ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700">
              Pago con reserva:{" "}
              <span
                className={hasReserva ? "text-emerald-600" : "text-slate-500"}
              >
                {hasReserva ? "Sí" : "No"}
              </span>
            </div>
            {hasReserva && (
              <div className="text-xs text-slate-500 mt-0.5">
                Monto reserva:{" "}
                <span className="font-semibold text-emerald-600">
                  {String(reserveAmountRaw ?? "—")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="rounded-xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/50 p-5">
          <CloseSaleForm
            mode="edit"
            leadCodigo={id}
            entity="booking"
            initial={initial}
            autoSave={false}
            persistMode="local"
            onChange={(f: CloseSaleInput) => setDraft({ ...f })}
            onSalePayloadChange={setSaleDraftPayload}
            onDone={() => {
              toast({
                title: "Listo para guardar",
                description:
                  "Estos cambios se guardarán al presionar 'Guardar cambios'.",
              });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
