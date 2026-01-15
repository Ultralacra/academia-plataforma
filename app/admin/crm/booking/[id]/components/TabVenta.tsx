"use client";
import React from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CloseSaleForm, type CloseSaleInput } from "../../../components/CloseSaleForm2";
import { SalePreview } from "@/app/admin/crm/components/SalePreview";
import { toast } from "@/components/ui/use-toast";

interface TabVentaProps {
  id: string;
  effectiveSalePayload: any;
  draft: any;
  initial: Partial<CloseSaleInput>;
  hasReserva: boolean;
  reserveAmountRaw: any;
  setDraft: React.Dispatch<React.SetStateAction<Partial<CloseSaleInput> | null>>;
  setPaymentProof: React.Dispatch<React.SetStateAction<any>>;
  setSaleDraftPayload: React.Dispatch<React.SetStateAction<any>>;
}

export function TabVenta({
  id,
  effectiveSalePayload,
  draft,
  initial,
  hasReserva,
  reserveAmountRaw,
  setDraft,
  setPaymentProof,
  setSaleDraftPayload,
}: TabVentaProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venta</CardTitle>
        <CardDescription>Cierre de venta dentro del lead</CardDescription>
        <CardAction>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Vista previa</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Vista previa / contrato</DialogTitle>
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
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Pago con reserva:{" "}
          <span className="text-foreground">
            {hasReserva ? "Sí" : "No"}
          </span>
          {hasReserva ? (
            <>
              {" "}
              · Monto reserva:{" "}
              <span className="text-foreground">
                {String(reserveAmountRaw ?? "—")}
              </span>
            </>
          ) : null}
        </div>
        <CloseSaleForm
          mode="edit"
          leadCodigo={id}
          entity="booking"
          initial={initial}
          autoSave={false}
          persistMode="local"
          onChange={(f: CloseSaleInput) => setDraft({ ...f })}
          onPaymentProofChange={setPaymentProof}
          onSalePayloadChange={setSaleDraftPayload}
          onDone={() => {
            toast({
              title: "Listo para guardar",
              description:
                "Estos cambios se guardarán al presionar 'Guardar cambios'.",
            });
          }}
        />
      </CardContent>
    </Card>
  );
}
