"use client";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  Tags,
  Users,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { crmService } from "@/lib/crm-service";
import type { ProspectCore } from "@/lib/crm-types";
import { ProspectEditor } from "./ProspectEditor";
import { toast } from "@/components/ui/use-toast";

export function ProspectDetailDrawer({
  open,
  onOpenChange,
  prospectId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId?: string | null;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [core, setCore] = React.useState<ProspectCore | null>(null);

  const load = React.useCallback(() => {
    if (!prospectId) {
      setCore(null);
      return;
    }
    const p = crmService.getProspect(prospectId);
    if (!p) {
      setCore(null);
      return;
    }
    const coreLite: ProspectCore = {
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      telefono: p.telefono,
      canalFuente: p.canalFuente,
      etapaPipeline: p.etapaPipeline,
      ownerId: p.ownerId,
      ownerNombre: p.ownerNombre,
      pais: p.pais,
      ciudad: p.ciudad,
      tags: p.tags,
      score: p.score,
      notasResumen: p.notasResumen,
      creadoAt: p.creadoAt,
      actualizadoAt: p.actualizadoAt,
      nextActionAt: p.nextActionAt,
      origenCampaignId: p.origenCampaignId,
      convertedStudentId: p.convertedStudentId,
      fechaConversion: p.fechaConversion,
    };
    setCore(coreLite);
  }, [prospectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <div className="flex flex-col h-full">
          <div className="border-b px-5 py-4 bg-white">
            <SheetHeader>
              <SheetTitle>Detalle de prospecto</SheetTitle>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
            {!core ? (
              <div className="text-sm text-slate-500">
                Selecciona un prospecto…
              </div>
            ) : (
              <>
                <div className="rounded-lg border p-4">
                  <div className="text-base font-semibold">{core.nombre}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {core.email || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {core.telefono || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-slate-400" />
                      {core.canalFuente || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      {core.ownerNombre || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {core.pais || "—"}{" "}
                      {core.ciudad ? ` · ${core.ciudad}` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Creado:{" "}
                      {core.creadoAt
                        ? new Date(core.creadoAt).toLocaleString("es-ES")
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium mb-2">
                    Editar prospecto
                  </div>
                  <ProspectEditor
                    prospect={core}
                    onSaved={() => {
                      load();
                      onSaved?.();
                    }}
                  />
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <div className="text-sm font-medium">Acciones rápidas</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.verifyPayment(core.id, true)) {
                          toast({ title: "Pago confirmado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Pago confirmado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (
                          crmService.sendContract(
                            core.id,
                            `https://sign.example.com/${core.id}`
                          )
                        ) {
                          toast({ title: "Contrato enviado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Enviar contrato
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.markContractSigned(core.id)) {
                          toast({ title: "Contrato firmado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Marcar firmado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.activateAccess(core.id, false)) {
                          toast({ title: "Acceso activado" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Activar acceso
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (crmService.convertProspect(core.id)) {
                          toast({ title: "Convertido a alumno" });
                          load();
                          onSaved?.();
                        }
                      }}
                    >
                      Convertir a alumno
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="border-t px-5 py-3 bg-white flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
