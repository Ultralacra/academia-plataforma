"use client";
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Download, Upload, Loader2, FileWarning } from "lucide-react";
import {
  generateContract,
  generateContractFromText,
  loadTemplateFromFile,
  loadTemplateFromUrl,
  loadContractTextFromUrl,
  mapLeadToContractData,
  prepareContractData,
  type ContractData,
} from "@/lib/contract-generator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface ContractGeneratorProps {
  lead: any;
  draft?: any;
  onGenerated?: () => void;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
}

// URL del template por defecto (se debe subir a public/)
const DEFAULT_TEMPLATE_URL = "/templates/contrato-hotselling-pro.docx";
// Texto base del contrato (fallback automático si no hay .docx)
const DEFAULT_CONTRACT_TEXT_URL = "/templates/contrato-hotselling-pro.txt";

export function ContractGenerator({
  lead,
  draft,
  onGenerated,
  triggerLabel,
  triggerVariant,
  triggerClassName,
}: ContractGeneratorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [editBeforeGenerate, setEditBeforeGenerate] = useState(true);
  const [overrides, setOverrides] = useState<Partial<ContractData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datos del contrato mapeados desde el lead
  const contractData = mapLeadToContractData(lead, draft);
  const mergedData = React.useMemo(
    () => ({ ...contractData, ...overrides }),
    [contractData, overrides],
  );
  const preparedData = React.useMemo(
    () => prepareContractData(mergedData),
    [mergedData],
  );

  React.useEffect(() => {
    if (!open) return;
    // Cada vez que se abre el diálogo, reiniciamos cambios locales para evitar confusiones
    setOverrides({});
  }, [open]);

  // Campos que están vacíos o incompletos
  const missingFields = React.useMemo(() => {
    const missing: string[] = [];
    if (!mergedData.fullName) missing.push("Nombre completo");
    if (!mergedData.email) missing.push("Email");
    if (!mergedData.phone) missing.push("Teléfono");
    if (!mergedData.paymentAmount) missing.push("Monto de pago");
    if (!mergedData.paymentMode) missing.push("Modalidad de pago");
    return missing;
  }, [mergedData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".docx")) {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo .docx",
          variant: "destructive",
        });
        return;
      }
      setTemplateFile(file);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let templateBuffer: ArrayBuffer | null = null;
      let usedTemplate = false;

      if (useCustomTemplate && templateFile) {
        templateBuffer = await loadTemplateFromFile(templateFile);
        usedTemplate = true;
      } else {
        // Intentar usar template por defecto. Si no existe, hacemos fallback a texto.
        try {
          templateBuffer = await loadTemplateFromUrl(DEFAULT_TEMPLATE_URL);
          usedTemplate = true;
        } catch {
          templateBuffer = null;
          usedTemplate = false;
        }
      }

      // Generar nombre del archivo
      const clientName = (mergedData.fullName || "cliente").replace(
        /[^a-zA-Z0-9]/g,
        "_",
      );
      const date = new Date().toISOString().slice(0, 10);
      const filename = `Contrato_${clientName}_${date}.docx`;

      // Generar el contrato
      if (usedTemplate && templateBuffer) {
        await generateContract(templateBuffer, mergedData, filename);
      } else {
        const baseText = await loadContractTextFromUrl(
          DEFAULT_CONTRACT_TEXT_URL,
        );
        await generateContractFromText(baseText, mergedData, filename);
      }

      toast({
        title: "Contrato generado",
        description: "El documento se ha descargado correctamente.",
      });

      onGenerated?.();
      setOpen(false);
    } catch (error: any) {
      console.error("Error generando contrato:", error);
      toast({
        title: "Error al generar contrato",
        description: error?.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant || "outline"}
          className={triggerClassName || "gap-2"}
        >
          <FileText className="h-4 w-4" />
          {triggerLabel || "Generar Contrato"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar Contrato</DialogTitle>
          <DialogDescription>
            Genera un documento Word (.docx) con los datos del lead. El
            documento será completamente editable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Advertencia de campos faltantes */}
          {missingFields.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <FileWarning className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Campos incompletos
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Los siguientes campos aparecerán en blanco:{" "}
                  {missingFields.join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Vista previa de datos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Vista previa de datos</CardTitle>
              <CardDescription>
                Estos datos se insertarán en el contrato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.NOMBRE_COMPLETO}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2 font-medium truncate">
                    {preparedData.EMAIL}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.TELEFONO}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">DNI:</span>
                  <span className="ml-2 font-medium">{preparedData.DNI}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duración:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.DURACION_PROGRAMA}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Inicio:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.DIA_INICIO} {preparedData.MES_INICIO}{" "}
                    {preparedData.ANIO_INICIO}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Programa:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.PROGRAMA}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.MONTO_TOTAL}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Modalidad:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.MODALIDAD_PAGO}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Plataforma:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.PLATAFORMA_PAGO}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="ml-2 font-medium">
                    {preparedData.FECHA_CONTRATO}
                  </span>
                </div>
              </div>

              {mergedData.bonuses && mergedData.bonuses.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-muted-foreground text-sm">
                    Bonos incluidos:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mergedData.bonuses.map((b, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editor rápido de datos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Revisar / editar antes de generar
              </CardTitle>
              <CardDescription>
                El usuario puede corregir datos aquí y luego descargar el
                contrato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-before-generate"
                  checked={editBeforeGenerate}
                  onCheckedChange={(checked) =>
                    setEditBeforeGenerate(checked === true)
                  }
                />
                <Label
                  htmlFor="edit-before-generate"
                  className="text-sm cursor-pointer"
                >
                  Permitir edición en este paso
                </Label>
              </div>

              {editBeforeGenerate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-fullName">
                      Nombre completo
                    </Label>
                    <Input
                      id="cg-fullName"
                      value={overrides.fullName ?? mergedData.fullName ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({
                          ...p,
                          fullName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-dni">
                      DNI / Documento
                    </Label>
                    <Input
                      id="cg-dni"
                      value={overrides.dni ?? mergedData.dni ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({ ...p, dni: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-email">
                      Email
                    </Label>
                    <Input
                      id="cg-email"
                      value={overrides.email ?? mergedData.email ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-phone">
                      Teléfono
                    </Label>
                    <Input
                      id="cg-phone"
                      value={overrides.phone ?? mergedData.phone ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs" htmlFor="cg-address">
                      Dirección
                    </Label>
                    <Input
                      id="cg-address"
                      value={overrides.address ?? mergedData.address ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({ ...p, address: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-city">
                      Ciudad
                    </Label>
                    <Input
                      id="cg-city"
                      value={overrides.city ?? mergedData.city ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({ ...p, city: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-country">
                      País
                    </Label>
                    <Input
                      id="cg-country"
                      value={overrides.country ?? mergedData.country ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({ ...p, country: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-duration">
                      Duración (meses)
                    </Label>
                    <Input
                      id="cg-duration"
                      type="number"
                      min={1}
                      max={36}
                      value={
                        overrides.programDurationNumber ??
                        mergedData.programDurationNumber ??
                        4
                      }
                      onChange={(e) => {
                        const v = Number.parseInt(e.target.value, 10);
                        setOverrides((p) => ({
                          ...p,
                          programDurationNumber: Number.isFinite(v) ? v : 4,
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-startDate">
                      Fecha de inicio (editable)
                    </Label>
                    <Input
                      id="cg-startDate"
                      type="date"
                      value={(
                        overrides.startDate ??
                        mergedData.startDate ??
                        ""
                      ).slice(0, 10)}
                      onChange={(e) =>
                        setOverrides((p) => ({
                          ...p,
                          startDate: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-paymentAmount">
                      Monto total (USD)
                    </Label>
                    <Input
                      id="cg-paymentAmount"
                      value={
                        (overrides.paymentAmount ??
                          mergedData.paymentAmount ??
                          "") as any
                      }
                      onChange={(e) =>
                        setOverrides((p) => ({
                          ...p,
                          paymentAmount: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="cg-paymentMode">
                      Modalidad de pago
                    </Label>
                    <Input
                      id="cg-paymentMode"
                      value={
                        overrides.paymentMode ?? mergedData.paymentMode ?? ""
                      }
                      onChange={(e) =>
                        setOverrides((p) => ({
                          ...p,
                          paymentMode: e.target.value,
                        }))
                      }
                      placeholder="Pago único / cuotas / reserva"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs" htmlFor="cg-notes">
                      Notas (opcional)
                    </Label>
                    <Textarea
                      id="cg-notes"
                      value={overrides.notes ?? mergedData.notes ?? ""}
                      onChange={(e) =>
                        setOverrides((p) => ({ ...p, notes: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selector de template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Template del contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-template"
                  checked={useCustomTemplate}
                  onCheckedChange={(checked) =>
                    setUseCustomTemplate(checked === true)
                  }
                />
                <Label
                  htmlFor="custom-template"
                  className="text-sm cursor-pointer"
                >
                  Usar template personalizado
                </Label>
              </div>

              {useCustomTemplate && (
                <div className="space-y-2">
                  <Label
                    htmlFor="template-file"
                    className="text-xs text-muted-foreground"
                  >
                    Sube tu template .docx con los placeholders (ej:{" "}
                    {"{{NOMBRE_COMPLETO}}"})
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      id="template-file"
                      type="file"
                      accept=".docx"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {templateFile && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        {templateFile.name}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {!useCustomTemplate && (
                <p className="text-xs text-muted-foreground">
                  Se usará el template por defecto del sistema. Asegúrate de que
                  exista en{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    /public/templates/
                  </code>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Información sobre placeholders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Placeholders disponibles
              </CardTitle>
              <CardDescription>
                Usa estos marcadores en tu template Word (entre {"{{ }}"})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs font-mono">
                {Object.keys(preparedData)
                  .slice(0, 12)
                  .map((key) => (
                    <code key={key} className="bg-muted px-1 py-0.5 rounded">
                      {`{{${key}}}`}
                    </code>
                  ))}
                <span className="text-muted-foreground col-span-full mt-1">
                  ... y más (ver documentación)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || (useCustomTemplate && !templateFile)}
            className="gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Descargar Contrato
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
