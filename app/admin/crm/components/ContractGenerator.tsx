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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [baseContractText, setBaseContractText] = useState<string | null>(null);
  const [baseContractStats, setBaseContractStats] = useState<{
    lines: number;
    chars: number;
  } | null>(null);
  const [baseContractWarnings, setBaseContractWarnings] = useState<string[]>(
    [],
  );
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
    setPreviewOpen(false);
    setPreviewError(null);
  }, [open]);

  const getContractTextWarnings = (txt: string): string[] => {
    const warnings: string[] = [];

    // Detección específica de truncamiento observado previamente en 9.4
    if (
      /9\.4\s+Infracción y consecuencias\./i.test(txt) &&
      /●\s*La exigencia de retiro inmediato del contenido,\s*\n\s*\n?\s*DÉCIMA\./i.test(
        txt,
      )
    ) {
      warnings.push(
        "El texto base parece estar cortado en la cláusula 9.4 (queda un ítem con coma y salta directo a DÉCIMA). Si falta contenido, complétalo en el .txt y pulsa “Actualizar”.",
      );
    }

    if (!txt.includes("[[FIRMAS]]")) {
      warnings.push(
        "No se encontró el marcador [[FIRMAS]] en el texto base. La sección de firmas no se maquetará como tabla.",
      );
    }

    return warnings;
  };

  const ensureBaseContractText = async (forceReload = false) => {
    if (baseContractText && !forceReload) return baseContractText;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      // Cache-buster para evitar que el navegador se quede con una versión antigua
      const url = forceReload
        ? `${DEFAULT_CONTRACT_TEXT_URL}?v=${Date.now()}`
        : DEFAULT_CONTRACT_TEXT_URL;
      const txt = await loadContractTextFromUrl(url);
      setBaseContractText(txt);
      setBaseContractStats({
        lines: txt.split(/\r?\n/).length,
        chars: txt.length,
      });
      setBaseContractWarnings(getContractTextWarnings(txt));
      return txt;
    } catch (e: any) {
      const msg = e?.message || "No se pudo cargar el texto base del contrato";
      setPreviewError(msg);
      throw e;
    } finally {
      setPreviewLoading(false);
    }
  };

  type PreviewBlock =
    | { type: "h1"; text: string }
    | { type: "centerTitle"; text: string }
    | { type: "h2"; text: string }
    | { type: "p"; text: string }
    | { type: "list"; label: string; text: string; level: number }
    | { type: "signatures" };

  const fillPlaceholdersLocal = (
    input: string,
    values: Record<string, string>,
  ) =>
    input.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key: string) => {
      const v = values[key];
      return typeof v === "string" ? v : "";
    });

  const parsePreviewBlocks = React.useCallback(
    (contractText: string, values: Record<string, string>): PreviewBlock[] => {
      const lines = contractText
        .split(/\r?\n/)
        .map((l) => fillPlaceholdersLocal(l, values).trimEnd());

      const blocks: PreviewBlock[] = [];
      let buffer: string[] = [];
      let currentNumberDepth = 0;

      const flush = () => {
        const text = buffer.join(" ").trim();
        buffer = [];
        if (!text) return;
        blocks.push({ type: "p", text });
      };

      const isAllCapsHeading = (line: string) => {
        const t = line.trim();
        if (!t) return false;
        const letters = t.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
        return letters.length >= 6 && t === t.toUpperCase() && t.length <= 80;
      };

      const looksLikeClauseHeading = (line: string) => {
        const t = line.trim();
        if (!t) return false;
        return /^[A-ZÁÉÍÓÚÜÑ]+\.[\s\S]+$/.test(t) && t === t.toUpperCase();
      };

      for (const raw of lines) {
        const trimmed = raw.trim();
        if (!trimmed) {
          flush();
          continue;
        }

        if (trimmed === "[[FIRMAS]]") {
          flush();
          currentNumberDepth = 0;
          blocks.push({ type: "signatures" });
          continue;
        }

        const bulletMatch = /^([●•\-])\s+(.*)$/.exec(trimmed);
        if (bulletMatch) {
          flush();
          blocks.push({
            type: "list",
            label: "•",
            text: bulletMatch[2].trim(),
            level: 1,
          });
          continue;
        }

        if (trimmed.includes("CONTRATO") && trimmed === trimmed.toUpperCase()) {
          flush();
          currentNumberDepth = 0;
          blocks.push({ type: "h1", text: trimmed });
          continue;
        }

        if (trimmed.toUpperCase() === "CLÁUSULAS") {
          flush();
          currentNumberDepth = 0;
          blocks.push({ type: "centerTitle", text: trimmed });
          continue;
        }

        if (looksLikeClauseHeading(trimmed) || isAllCapsHeading(trimmed)) {
          flush();
          currentNumberDepth = 0;
          blocks.push({ type: "h2", text: trimmed });
          continue;
        }

        const subsectionMatch =
          /^(\d+(?:\.\d+)+)\.(?:\s+|\t+)(.*)$/.exec(trimmed) ??
          /^(\d+(?:\.\d+)+)\s+(.*)$/.exec(trimmed);
        if (subsectionMatch) {
          flush();
          const label = subsectionMatch[1];
          const rest = subsectionMatch[2].trim();
          currentNumberDepth = Math.max(0, label.split(".").length - 1);
          blocks.push({
            type: "list",
            label: `${label}`,
            text: rest,
            level: currentNumberDepth + 1,
          });
          continue;
        }

        const numberedMatch = /^(\d+)\.(?:\s+|\t+)(.*)$/.exec(trimmed);
        if (numberedMatch) {
          flush();
          blocks.push({
            type: "list",
            label: `${numberedMatch[1]}.`,
            text: numberedMatch[2].trim(),
            level: Math.max(1, currentNumberDepth + 1),
          });
          continue;
        }

        const letterMatch = /^([a-z])\)(?:\s+|\t+)(.*)$/i.exec(trimmed);
        if (letterMatch) {
          flush();
          blocks.push({
            type: "list",
            label: `${letterMatch[1].toLowerCase()})`,
            text: letterMatch[2].trim(),
            level: Math.max(2, currentNumberDepth + 2),
          });
          continue;
        }

        const romanMatch = /^([ivx]+)\.(?:\s+|\t+)(.*)$/i.exec(trimmed);
        if (romanMatch) {
          flush();
          blocks.push({
            type: "list",
            label: `${romanMatch[1].toLowerCase()}.`,
            text: romanMatch[2].trim(),
            level: Math.max(2, currentNumberDepth + 2),
          });
          continue;
        }

        buffer.push(trimmed);
      }

      flush();
      return blocks;
    },
    [],
  );

  const previewBlocks = React.useMemo(() => {
    if (!baseContractText) return [] as PreviewBlock[];
    return parsePreviewBlocks(baseContractText, preparedData);
  }, [baseContractText, parsePreviewBlocks, preparedData]);

  const buildPreviewHtml = React.useCallback((): string => {
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");

    const blocks = previewBlocks;
    const body = blocks
      .map((b) => {
        if (b.type === "h1") {
          return `<h1 class="h1">${esc(b.text)}</h1>`;
        }
        if (b.type === "centerTitle") {
          return `<div class="centerTitle">${esc(b.text)}</div>`;
        }
        if (b.type === "h2") {
          return `<div class="h2">${esc(b.text)}</div>`;
        }
        if (b.type === "p") {
          return `<p class="p">${esc(b.text)}</p>`;
        }
        if (b.type === "list") {
          const pad = Math.min(56, 12 + b.level * 14);
          return `<div class="li" style="padding-left:${pad}px"><span class="label">${esc(
            b.label,
          )}</span><span class="text">${esc(b.text)}</span></div>`;
        }
        if (b.type === "signatures") {
          return `
<div class="sigWrap">
  <div class="sigGrid">
    <div class="sigLeft">
      <div class="sigName">JAVIER MIRANDA</div>
      <div class="sigName">MHF GROUP LLC</div>
    </div>
    <div class="sigRight">
      <div class="sigLine">${esc(preparedData.NOMBRE_COMPLETO || "")}</div>
      <div class="sigHint">(NOMBRE Y APELLIDO)</div>
      <div class="sigFields">
        <div class="row"><div class="k">Correo Electrónico:</div><div class="v">${esc(
          preparedData.EMAIL || "",
        )}</div></div>
        <div class="row"><div class="k">Ciudad de Residencia:</div><div class="v">${esc(
          preparedData.CIUDAD || "",
        )}</div></div>
        <div class="row"><div class="k">País de Residencia:</div><div class="v">${esc(
          preparedData.PAIS || "",
        )}</div></div>
        <div class="row"><div class="k">Nro. de Telef.:</div><div class="v">${esc(
          preparedData.TELEFONO || "",
        )}</div></div>
      </div>
    </div>
  </div>
</div>`;
        }
        return "";
      })
      .join("\n");

    const title = `Contrato_${(mergedData.fullName || "cliente").replace(/[^a-zA-Z0-9]/g, "_")}`;

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    body{font-family:Arial, sans-serif; color:#000; margin:0; background:#fff;}
    .page{max-width:900px; margin:0 auto; padding:40px 48px;}
    .h1{text-align:center; font-weight:700; font-size:18px; margin:0 0 16px;}
    .centerTitle{text-align:center; font-weight:700; font-size:16px; margin:16px 0;}
    .h2{font-weight:700; font-size:15px; margin:18px 0 8px;}
    .p{margin:0 0 12px; text-align:justify;}
    .li{margin:0 0 8px; text-align:justify;}
    .label{font-weight:700; margin-right:8px;}
    .sigWrap{margin:24px 0;}
    .sigGrid{display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:start;}
    .sigLeft{text-align:center;}
    .sigName{font-weight:700;}
    .sigLine{text-align:center; font-weight:700; border-bottom:1px solid #000; padding-bottom:4px;}
    .sigHint{text-align:center; font-weight:700; font-size:12px; margin-top:6px;}
    .sigFields{margin-top:16px; display:flex; flex-direction:column; gap:8px;}
    .row{display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:end;}
    .k{font-weight:700;}
    .v{border-bottom:1px solid #000; min-height:18px;}
    @media print {.page{padding:0.75in 0.75in;}}
  </style>
</head>
<body>
  <div class="page">
    ${body}
  </div>
</body>
</html>`;
  }, [mergedData.fullName, mergedData, previewBlocks, preparedData]);

  const downloadPreviewHtml = React.useCallback(() => {
    const html = buildPreviewHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const clientName = (mergedData.fullName || "cliente").replace(
      /[^a-zA-Z0-9]/g,
      "_",
    );
    const date = new Date().toISOString().slice(0, 10);
    const filename = `Contrato_${clientName}_${date}.html`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, [buildPreviewHtml, mergedData.fullName]);

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
        // Cache-buster para asegurar que se use el texto más reciente
        const baseText = await loadContractTextFromUrl(
          `${DEFAULT_CONTRACT_TEXT_URL}?v=${Date.now()}`,
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
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setPreviewOpen(true);
                try {
                  // Al abrir, siempre recargamos para mostrar el texto completo y más reciente
                  await ensureBaseContractText(true);
                } catch {
                  // error ya seteado
                }
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Vista previa
            </Button>

            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogTitle>Vista previa del contrato</DialogTitle>
                    <DialogDescription>
                      Vista previa basada en el texto del contrato (modo sin
                      plantilla). Si usas un template .docx personalizado, la
                      vista previa puede diferir.
                    </DialogDescription>
                    {baseContractStats && !previewError && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Cargado: {baseContractStats.lines} líneas,{" "}
                        {baseContractStats.chars} caracteres.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await ensureBaseContractText(true);
                        } catch {
                          // error ya seteado
                        }
                      }}
                      disabled={previewLoading}
                    >
                      Actualizar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={downloadPreviewHtml}
                      disabled={
                        previewLoading || !baseContractText || !!previewError
                      }
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Descargar HTML
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {previewError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {previewError}
                </div>
              ) : (
                <ScrollArea className="h-[70vh] rounded-md border">
                  <div
                    className="p-6 text-[14px] leading-relaxed"
                    style={{ fontFamily: "Arial" }}
                  >
                    {baseContractWarnings.length > 0 && (
                      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <div className="text-sm font-medium text-amber-900">
                          Aviso
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-amber-900">
                          {baseContractWarnings.map((w, i) => (
                            <div key={i}>- {w}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {previewLoading && !baseContractText ? (
                      <p className="text-sm text-muted-foreground">
                        Cargando vista previa…
                      </p>
                    ) : (
                      previewBlocks.map((b, idx) => {
                        if (b.type === "h1") {
                          return (
                            <h1
                              key={idx}
                              className="text-center font-bold text-[18px] mb-4"
                            >
                              {b.text}
                            </h1>
                          );
                        }
                        if (b.type === "centerTitle") {
                          return (
                            <div
                              key={idx}
                              className="text-center font-bold text-[16px] my-4"
                            >
                              {b.text}
                            </div>
                          );
                        }
                        if (b.type === "h2") {
                          return (
                            <div
                              key={idx}
                              className="font-bold text-[15px] mt-5 mb-2"
                            >
                              {b.text}
                            </div>
                          );
                        }
                        if (b.type === "p") {
                          return (
                            <p
                              key={idx}
                              className="mb-3"
                              style={{
                                textAlign: "justify" as const,
                                textJustify: "inter-word",
                              }}
                            >
                              {b.text}
                            </p>
                          );
                        }
                        if (b.type === "list") {
                          const pad = Math.min(56, 12 + b.level * 14);
                          return (
                            <div
                              key={idx}
                              className="mb-2"
                              style={{
                                paddingLeft: pad,
                                textAlign: "justify" as const,
                              }}
                            >
                              <span className="font-bold">{b.label}</span>
                              <span className="ml-2">{b.text}</span>
                            </div>
                          );
                        }
                        if (b.type === "signatures") {
                          return (
                            <div key={idx} className="my-6">
                              <div className="grid grid-cols-2 gap-8 items-start">
                                <div className="text-center">
                                  <div className="font-bold">
                                    JAVIER MIRANDA
                                  </div>
                                  <div className="font-bold">MHF GROUP LLC</div>
                                </div>
                                <div>
                                  <div className="text-center">
                                    <div className="border-b border-black pb-1 font-bold">
                                      {preparedData.NOMBRE_COMPLETO}
                                    </div>
                                    <div className="text-[12px] font-bold mt-1">
                                      (NOMBRE Y APELLIDO)
                                    </div>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    {[
                                      [
                                        "Correo Electrónico:",
                                        preparedData.EMAIL,
                                      ],
                                      [
                                        "Ciudad de Residencia:",
                                        preparedData.CIUDAD,
                                      ],
                                      [
                                        "País de Residencia:",
                                        preparedData.PAIS,
                                      ],
                                      [
                                        "Nro. de Telef.:",
                                        preparedData.TELEFONO,
                                      ],
                                    ].map(([label, value]) => (
                                      <div
                                        key={label}
                                        className="grid grid-cols-[auto,1fr] gap-3"
                                      >
                                        <div className="font-bold">{label}</div>
                                        <div className="border-b border-black">
                                          {value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })
                    )}
                  </div>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>

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
