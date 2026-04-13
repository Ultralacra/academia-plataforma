"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText,
  Download,
  Upload,
  Loader2,
  FileWarning,
  CheckCircle2,
} from "lucide-react";
import {
  generateContract,
  generateContractFromText,
  loadTemplateFromUrl,
  loadContractTextFromUrl,
  mapLeadToContractData,
  prepareContractData,
  applyConditionalBlocks,
  type ContractData,
} from "@/lib/contract-generator";
import {
  getLead,
  sendLeadContractForSignature,
  updateLeadPatch,
  type LeadContractSignatureSendResponse,
} from "@/app/admin/crm/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { listMetadata } from "@/lib/metadata";

interface ContractGeneratorProps {
  lead: any;
  draft?: any;
  onGenerated?: () => void;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
  /** Callback que notifica al padre cuándo este diálogo se abre/cierra */
  onOpenChange?: (open: boolean) => void;
}

type BuiltinContractTemplate = {
  key: string;
  label: string;
  description: string;
  textUrl: string;
  docxUrl?: string;
  metadataKey?: string;
};

const BUILTIN_CONTRACT_TEMPLATES: BuiltinContractTemplate[] = [
  {
    key: "hotselling-pro-closer-v1",
    label: "Hotselling Pro v1",
    description: "Contrato comercial base para cierre de HOTSELLING PRO.",
    textUrl: "/templates/contrato-hotselling-pro-closer-v1.txt",
    metadataKey: "hotselling-pro-closer-v1",
  },
  {
    key: "hotselling-starter-v1",
    label: "Hotselling Starter v1",
    description:
      "Contrato para el programa HOTSELLING STARTER (4 meses, acceso Skool).",
    textUrl: "/templates/contrato-hotselling-starter-v1.txt",
    metadataKey: "hotselling-starter-v1",
  },
];

export function ContractGenerator({
  lead,
  draft,
  onGenerated,
  triggerLabel,
  triggerVariant,
  triggerClassName,
  onOpenChange: parentOnOpenChange,
}: ContractGeneratorProps) {
  const COMPANY_SIGNATURE_PATH = "/firma_hotselling.png";
  const { toast } = useToast();
  const [open, setOpenInternal] = useState(false);
  const signatureAssetRef = React.useRef<{
    dataUrl: string | null;
    bytes: Uint8Array | null;
  } | null>(null);

  // Sincroniza con el padre al cambiar open
  const setOpen = React.useCallback(
    (v: boolean) => {
      setOpenInternal(v);
      parentOnOpenChange?.(v);
    },
    [parentOnOpenChange],
  );
  const [generating, setGenerating] = useState(false);
  const [selectedBuiltinTemplateKey, setSelectedBuiltinTemplateKey] = useState(
    BUILTIN_CONTRACT_TEMPLATES[0]?.key ?? "",
  );
  const [editBeforeGenerate, setEditBeforeGenerate] = useState(true);
  const [overrides, setOverrides] = useState<Partial<ContractData>>({});
  const [savingLead, setSavingLead] = useState(false);
  // --- Modal-stack: al abrir preview ocultamos visualmente el dialog principal ---
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingForSignature, setSendingForSignature] = useState(false);
  const [signatureSuccessOpen, setSignatureSuccessOpen] = useState(false);
  const [signatureSuccessData, setSignatureSuccessData] =
    useState<LeadContractSignatureSendResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [baseContractText, setBaseContractText] = useState<string | null>(null);
  const [baseContractStats, setBaseContractStats] = useState<{
    lines: number;
    chars: number;
  } | null>(null);
  const [baseContractWarnings, setBaseContractWarnings] = useState<string[]>(
    [],
  );
  const [liveLead, setLiveLead] = useState<any>(null);
  const [refreshingLead, setRefreshingLead] = useState(false);

  // Datos del contrato mapeados solo desde CRM/snapshot persistido.
  const contractData = mapLeadToContractData(liveLead ?? lead);
  const mergedData = React.useMemo(
    () => ({ ...contractData, ...overrides }),
    [contractData, overrides],
  );
  const selectedBuiltinTemplate = React.useMemo(
    () =>
      BUILTIN_CONTRACT_TEMPLATES.find(
        (item) => item.key === selectedBuiltinTemplateKey,
      ) || BUILTIN_CONTRACT_TEMPLATES[0],
    [selectedBuiltinTemplateKey],
  );
  const preparedData = React.useMemo(
    () => prepareContractData(mergedData),
    [mergedData],
  );

  const showSignatureSuccessModal = React.useCallback(
    (response: LeadContractSignatureSendResponse) => {
      setSignatureSuccessData(response);
      setPreviewOpen(false);
      setOpen(false);

      // Espera al siguiente tick para que Radix desmonte los diálogos previos
      // antes de abrir el modal de éxito.
      window.setTimeout(() => {
        setSignatureSuccessOpen(true);
      }, 0);
    },
    [setOpen],
  );

  React.useEffect(() => {
    if (!open) return;
    // Cada vez que se abre el diálogo, reiniciamos cambios locales para evitar confusiones
    setOverrides({});
    setPreviewOpen(false);
    setSignatureSuccessOpen(false);
    setSignatureSuccessData(null);
    setPreviewError(null);

    // Al abrir, priorizamos siempre un fetch fresco del CRM.
    setLiveLead(null);

    // Intentamos refrescar desde el CRM para que el detalle (pago/cuotas) sea el real
    const codigo = (lead as any)?.codigo;
    if (codigo) {
      setRefreshingLead(true);
      getLead(String(codigo))
        .then((fresh) => setLiveLead(fresh))
        .catch(() => {
          // Fallback mínimo si el refresh falla.
          setLiveLead(lead);
        })
        .finally(() => setRefreshingLead(false));
    } else {
      setLiveLead(lead);
    }
  }, [lead, open]);

  React.useEffect(() => {
    // Si el prop cambia mientras está abierto, reflejarlo
    setLiveLead(lead);
  }, [lead]);

  React.useEffect(() => {
    setBaseContractText(null);
    setBaseContractStats(null);
    setBaseContractWarnings([]);
  }, [selectedBuiltinTemplateKey]);

  const PAYMENT_MODE_PRESETS: Array<{ value: string; label: string }> = [
    { value: "pago_total", label: "Pago único" },
    { value: "3_cuotas", label: "3 cuotas" },
    { value: "2_cuotas", label: "2 cuotas" },
    { value: "excepcion_2_cuotas", label: "Excepción 2 cuotas" },
    { value: "reserva", label: "Reserva" },
  ];

  const currentPaymentMode =
    overrides.paymentMode ?? mergedData.paymentMode ?? "";
  const isPresetPaymentMode = PAYMENT_MODE_PRESETS.some(
    (p) => p.value === currentPaymentMode,
  );

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
      // 1) Intentar cargar la plantilla activa desde metadata
      let txt: string | null = null;
      try {
        const res = await listMetadata<any>();
        const record = (res.items || []).find(
          (item: any) =>
            String(item?.entity || "") === "plantillas_contratos" &&
            String(item?.entity_id || "").toLowerCase() === "all_templates",
        );
        if (record) {
          const payload = record.payload || {};
          const tplMap: Record<string, any> = payload.templates || {};
          const selectedTpl = selectedBuiltinTemplate?.metadataKey
            ? tplMap[selectedBuiltinTemplate.metadataKey]
            : undefined;
          const content = selectedTpl?.content;
          if (content && typeof content === "string" && content.length > 100) {
            txt = content;
          }
        }
      } catch {
        // Silencioso: caerá al fallback estático
      }

      // 2) Fallback: cargar desde archivo estático
      if (!txt) {
        const textUrl = selectedBuiltinTemplate?.textUrl;
        if (!textUrl) {
          throw new Error("No hay una plantilla del sistema configurada.");
        }
        const url = forceReload ? `${textUrl}?v=${Date.now()}` : textUrl;
        txt = await loadContractTextFromUrl(url);
      }

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
    const processedText = applyConditionalBlocks(baseContractText, mergedData);
    return parsePreviewBlocks(processedText, preparedData);
  }, [baseContractText, mergedData, parsePreviewBlocks, preparedData]);

  const loadCompanySignatureAsset = React.useCallback(async () => {
    if (signatureAssetRef.current) {
      return signatureAssetRef.current;
    }

    const response = await fetch(COMPANY_SIGNATURE_PATH, {
      cache: "force-cache",
    });
    if (!response.ok) {
      throw new Error("No se pudo cargar la firma de Javier Miranda.");
    }

    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(new Error("No se pudo leer la imagen de la firma."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });

    const asset = { dataUrl, bytes };
    signatureAssetRef.current = asset;
    return asset;
  }, []);

  const buildPreviewHtml = React.useCallback(async (): Promise<string> => {
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");

    let signatureSrc = COMPANY_SIGNATURE_PATH;
    try {
      const asset = await loadCompanySignatureAsset();
      if (asset.dataUrl) {
        signatureSrc = asset.dataUrl;
      }
    } catch {}

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
      <div class="sigImageWrap">
        <img class="sigImage" src="${signatureSrc}" alt="Firma de Javier Miranda" />
      </div>
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
    .sigImageWrap{margin-top:12px; display:flex; justify-content:center;}
    .sigImage{max-width:170px; width:100%; height:auto; object-fit:contain;}
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
  }, [
    COMPANY_SIGNATURE_PATH,
    loadCompanySignatureAsset,
    mergedData.fullName,
    mergedData,
    previewBlocks,
    preparedData,
  ]);

  const downloadPreviewHtml = React.useCallback(async () => {
    const html = await buildPreviewHtml();
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

  const buildPreviewPdfFile = React.useCallback(async () => {
    if (!previewBlocks.length) {
      throw new Error("Abre y carga la vista previa antes de generar el PDF.");
    }

    const clientName = (mergedData.fullName || "cliente").replace(
      /[^a-zA-Z0-9]/g,
      "_",
    );
    const date = new Date().toISOString().slice(0, 10);
    const filename = `Contrato_${clientName}_${date}.pdf`;

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let companySignatureImage: Awaited<
      ReturnType<typeof pdfDoc.embedPng>
    > | null = null;

    try {
      const asset = await loadCompanySignatureAsset();
      if (asset.bytes) {
        companySignatureImage = await pdfDoc.embedPng(asset.bytes);
      }
    } catch {}

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 52;
    const marginTop = 52;
    const marginBottom = 54;
    const contentWidth = pageWidth - marginX * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let cursorY = pageHeight - marginTop;

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY - requiredHeight < marginBottom) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = pageHeight - marginTop;
      }
    };

    const wrapText = (
      text: string,
      font: any,
      size: number,
      maxWidth: number,
    ) => {
      const words = String(text || "")
        .split(/\s+/)
        .filter(Boolean);
      const lines: string[] = [];
      let current = "";

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, size);
        if (width <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }

      if (current) lines.push(current);
      return lines.length ? lines : [""];
    };

    const drawTextLines = (
      lines: string[],
      options: {
        x: number;
        size: number;
        font: any;
        lineHeight: number;
        color?: ReturnType<typeof rgb>;
        centered?: boolean;
      },
    ) => {
      lines.forEach((line, index) => {
        const y = cursorY - index * options.lineHeight;
        const width = options.font.widthOfTextAtSize(line, options.size);
        const x = options.centered
          ? marginX + (contentWidth - width) / 2
          : options.x;
        page.drawText(line, {
          x,
          y,
          size: options.size,
          font: options.font,
          color: options.color || rgb(0, 0, 0),
        });
      });
      cursorY -= lines.length * options.lineHeight;
    };

    for (const block of previewBlocks) {
      if (block.type === "h1") {
        const lines = wrapText(block.text, fontBold, 14, contentWidth);
        ensureSpace(lines.length * 20 + 8);
        drawTextLines(lines, {
          x: marginX,
          size: 14,
          font: fontBold,
          lineHeight: 20,
          centered: true,
        });
        cursorY -= 8;
        continue;
      }

      if (block.type === "centerTitle") {
        const lines = wrapText(block.text, fontBold, 12, contentWidth);
        ensureSpace(lines.length * 18 + 10);
        drawTextLines(lines, {
          x: marginX,
          size: 12,
          font: fontBold,
          lineHeight: 18,
          centered: true,
        });
        cursorY -= 10;
        continue;
      }

      if (block.type === "h2") {
        const lines = wrapText(block.text, fontBold, 11, contentWidth);
        ensureSpace(lines.length * 17 + 8);
        drawTextLines(lines, {
          x: marginX,
          size: 11,
          font: fontBold,
          lineHeight: 17,
        });
        cursorY -= 8;
        continue;
      }

      if (block.type === "p") {
        const lines = wrapText(block.text, fontRegular, 10.5, contentWidth);
        ensureSpace(lines.length * 15 + 6);
        drawTextLines(lines, {
          x: marginX,
          size: 10.5,
          font: fontRegular,
          lineHeight: 15,
        });
        cursorY -= 6;
        continue;
      }

      if (block.type === "list") {
        const indent = Math.min(56, 12 + block.level * 14);
        const labelSize = 10.5;
        const textSize = 10.5;
        const lineHeight = 15;
        const labelWidth = fontBold.widthOfTextAtSize(block.label, labelSize);
        const textX = marginX + indent + labelWidth + 8;
        const maxTextWidth = pageWidth - marginX - textX;
        const lines = wrapText(block.text, fontRegular, textSize, maxTextWidth);
        ensureSpace(lines.length * lineHeight + 4);

        page.drawText(block.label, {
          x: marginX + indent,
          y: cursorY,
          size: labelSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        lines.forEach((line, index) => {
          page.drawText(line, {
            x: textX,
            y: cursorY - index * lineHeight,
            size: textSize,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
        });

        cursorY -= lines.length * lineHeight + 4;
        continue;
      }

      if (block.type === "signatures") {
        const sigHeight = 190;
        ensureSpace(sigHeight);

        const colGap = 28;
        const colWidth = (contentWidth - colGap) / 2;
        const leftX = marginX;
        const rightX = marginX + colWidth + colGap;

        page.drawText("JAVIER MIRANDA", {
          x:
            leftX +
            (colWidth - fontBold.widthOfTextAtSize("JAVIER MIRANDA", 10.5)) / 2,
          y: cursorY,
          size: 10.5,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        page.drawText("MHF GROUP LLC", {
          x:
            leftX +
            (colWidth - fontBold.widthOfTextAtSize("MHF GROUP LLC", 10.5)) / 2,
          y: cursorY - 16,
          size: 10.5,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        if (companySignatureImage) {
          const targetWidth = Math.min(150, colWidth - 24);
          const targetHeight =
            (companySignatureImage.height / companySignatureImage.width) *
            targetWidth;

          page.drawImage(companySignatureImage, {
            x: leftX + (colWidth - targetWidth) / 2,
            y: cursorY - 28 - targetHeight,
            width: targetWidth,
            height: targetHeight,
          });
        }

        const signLineY = cursorY - 12;
        page.drawLine({
          start: { x: rightX, y: signLineY },
          end: { x: rightX + colWidth, y: signLineY },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        const nameWidth = fontBold.widthOfTextAtSize(
          preparedData.NOMBRE_COMPLETO || "",
          10.5,
        );
        page.drawText(preparedData.NOMBRE_COMPLETO || "", {
          x: rightX + (colWidth - nameWidth) / 2,
          y: signLineY + 4,
          size: 10.5,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        const hint = "(NOMBRE Y APELLIDO)";
        page.drawText(hint, {
          x: rightX + (colWidth - fontBold.widthOfTextAtSize(hint, 9)) / 2,
          y: signLineY - 16,
          size: 9,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        let fieldY = signLineY - 40;
        [
          ["Correo Electrónico:", preparedData.EMAIL],
          ["Ciudad de Residencia:", preparedData.CIUDAD],
          ["País de Residencia:", preparedData.PAIS],
          ["Nro. de Telef.:", preparedData.TELEFONO],
        ].forEach(([label, value]) => {
          const safeLabel = String(label || "");
          const safeValue = String(value || "");
          const labelWidth = fontBold.widthOfTextAtSize(safeLabel, 9.5);
          page.drawText(safeLabel, {
            x: rightX,
            y: fieldY,
            size: 9.5,
            font: fontBold,
            color: rgb(0, 0, 0),
          });
          const lineX = rightX + labelWidth + 10;
          page.drawLine({
            start: { x: lineX, y: fieldY - 2 },
            end: { x: rightX + colWidth, y: fieldY - 2 },
            thickness: 0.8,
            color: rgb(0, 0, 0),
          });
          page.drawText(safeValue, {
            x: lineX + 4,
            y: fieldY + 1,
            size: 9.5,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
          fieldY -= 18;
        });

        cursorY -= sigHeight;
      }
    }

    const bytes = await pdfDoc.save();
    return {
      filename,
      file: new File([bytes], filename, { type: "application/pdf" }),
    };
  }, [
    loadCompanySignatureAsset,
    mergedData.fullName,
    preparedData,
    previewBlocks,
  ]);

  const downloadPreviewPdf = React.useCallback(async () => {
    setDownloadingPdf(true);
    try {
      const { file: pdfFile, filename } = await buildPreviewPdfFile();
      const url = URL.createObjectURL(pdfFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (error: any) {
      toast({
        title: "Error al descargar PDF",
        description:
          error?.message || "No se pudo generar el PDF del contrato.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  }, [buildPreviewPdfFile, toast]);

  const sendPreviewToSignature = React.useCallback(async () => {
    const codigo = String(
      (liveLead as any)?.codigo || (lead as any)?.codigo || "",
    );
    if (!codigo) {
      toast({
        title: "Lead no disponible",
        description:
          "No se encontró el código del lead para enviar el contrato a firma.",
        variant: "destructive",
      });
      return;
    }

    setSendingForSignature(true);
    try {
      const { file: pdfFile } = await buildPreviewPdfFile();
      const recipientName =
        mergedData.fullName || (liveLead as any)?.name || "cliente";
      const message = [
        `Asunto: Contrato para firma - ${recipientName}`,
        "",
        `Hola ${recipientName},`,
        "",
        "Te compartimos tu contrato en PDF para revisión y firma a través de Dropbox Sign.",
      ].join("\n");

      // Construir array de firmantes extra si existen contractParties
      const partiesCandidates = [
        (liveLead as any)?.contract_parties,
        (lead as any)?.contract_parties,
        (liveLead as any)?.contract?.parties,
        (lead as any)?.contract?.parties,
      ];
      const parties: Array<{ name?: string; email?: string }> =
        partiesCandidates.find((c) => Array.isArray(c) && c.length > 0) || [];
      const extraSigners = (Array.isArray(parties) ? parties : [])
        .filter((p: any) => p?.email && p?.name)
        .map((p: any, i: number) => ({
          email_address: String(p.email),
          name: String(p.name),
          order: i + 1,
        }));

      const response = await sendLeadContractForSignature(
        codigo,
        pdfFile,
        message,
        extraSigners.length > 0 ? extraSigners : undefined,
      );
      showSignatureSuccessModal(response);
    } catch (error: any) {
      toast({
        title: "Error al enviar a firma",
        description:
          error?.message || "No se pudo enviar el contrato a Dropbox Sign.",
        variant: "destructive",
      });
    } finally {
      setSendingForSignature(false);
    }
  }, [
    buildPreviewPdfFile,
    lead,
    liveLead,
    mergedData.fullName,
    showSignatureSuccessModal,
    toast,
  ]);

  const openContractPreview = React.useCallback(async () => {
    try {
      setPreviewLoading(true);
      await ensureBaseContractText(true);
      setPreviewOpen(true);
    } catch {
      // El error ya queda reflejado en previewError/toast si aplica.
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Campos que están vacíos o incompletos
  const missingFields = React.useMemo(() => {
    const missing: string[] = [];
    if (!mergedData.fullName) missing.push("Nombre completo");
    if (!mergedData.email) missing.push("Email");
    if (!mergedData.phone) missing.push("Teléfono");
    if (!mergedData.address) missing.push("Dirección");
    if (!mergedData.city) missing.push("Ciudad");
    if (!mergedData.country) missing.push("País");
    if (!mergedData.dni) missing.push("DNI / Documento");
    if (!mergedData.paymentAmount) missing.push("Monto de pago");
    if (!mergedData.paymentMode) missing.push("Modalidad de pago");
    return missing;
  }, [mergedData]);

  const configuredSigners = React.useMemo(() => {
    const candidates = [
      (liveLead as any)?.contract_parties,
      (lead as any)?.contract_parties,
      (liveLead as any)?.contract?.parties,
      (lead as any)?.contract?.parties,
    ];
    const parties: Array<{ name?: string; email?: string }> =
      candidates.find((c) => Array.isArray(c) && c.length > 0) || [];

    const extras = parties
      .filter((p: any) => p?.name || p?.email)
      .map((p: any) => ({
        name: String(p?.name || "").trim(),
        email: String(p?.email || "").trim(),
      }));

    const primary = {
      name: String(mergedData.fullName || (liveLead as any)?.name || "").trim(),
      email: String(mergedData.email || (liveLead as any)?.email || "").trim(),
    };

    const all = [primary, ...extras].filter((s) => s.name || s.email);
    const seen = new Set<string>();
    return all.filter((s) => {
      const key = `${s.name.toLowerCase()}|${s.email.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [lead, liveLead, mergedData.email, mergedData.fullName]);

  const saveOverridesToLead = React.useCallback(async () => {
    const codigo = String(
      (liveLead as any)?.codigo || (lead as any)?.codigo || "",
    );
    if (!codigo) {
      toast({
        title: "Sin código de lead",
        description: "No se puede guardar sin un lead activo.",
        variant: "destructive",
      });
      return;
    }
    setSavingLead(true);
    try {
      const patch: Record<string, any> = {};
      if (overrides.fullName !== undefined) patch.name = overrides.fullName;
      if (overrides.email !== undefined) patch.email = overrides.email;
      if (overrides.phone !== undefined) patch.phone = overrides.phone;
      if (overrides.dni !== undefined)
        patch.contract_party_document_id = overrides.dni;
      if (overrides.address !== undefined)
        patch.contract_party_address = overrides.address;
      if (overrides.city !== undefined)
        patch.contract_party_city = overrides.city;
      if (overrides.country !== undefined)
        patch.contract_party_country = overrides.country;
      if (Object.keys(patch).length === 0) {
        toast({
          title: "Sin cambios",
          description: "No hay datos modificados para guardar.",
        });
        return;
      }
      const updated = await updateLeadPatch(codigo, patch, liveLead);
      setLiveLead(updated);
      setOverrides({});
      toast({
        title: "Datos guardados",
        description: "Los datos del contrato se guardaron en el lead.",
      });
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e?.message || "No se pudieron guardar los datos.",
        variant: "destructive",
      });
    } finally {
      setSavingLead(false);
    }
  }, [lead, liveLead, overrides, toast]);

  const hasOverrides = Object.keys(overrides).length > 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let templateBuffer: ArrayBuffer | null = null;
      let usedTemplate = false;

      if (selectedBuiltinTemplate?.docxUrl) {
        // Intentar usar template docx de la plantilla seleccionada. Si no existe, hacemos fallback a texto.
        try {
          templateBuffer = await loadTemplateFromUrl(
            selectedBuiltinTemplate.docxUrl,
          );
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
        // Usar el texto que ya fue cargado desde metadata (o fallback estático)
        const baseText = await ensureBaseContractText(true);
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
    <>
      {/* Dialog principal – se oculta visualmente mientras el preview está abierto */}
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
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          visuallyHidden={previewOpen}
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>Generar Contrato</DialogTitle>
                <DialogDescription>
                  Genera un documento Word (.docx) con los datos del lead. El
                  documento será completamente editable.
                </DialogDescription>
              </div>
              {!!(lead as any)?.codigo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={refreshingLead}
                  onClick={async () => {
                    try {
                      setRefreshingLead(true);
                      const fresh = await getLead(
                        String((lead as any)?.codigo),
                      );
                      setLiveLead(fresh);
                      toast({
                        title: "Lead actualizado",
                        description:
                          "Se sincronizó el detalle del lead para el contrato.",
                      });
                    } catch (e: any) {
                      toast({
                        title: "No se pudo actualizar",
                        description:
                          e?.message ||
                          "No se pudo refrescar el lead desde el CRM.",
                        variant: "destructive",
                      });
                    } finally {
                      setRefreshingLead(false);
                    }
                  }}
                >
                  {refreshingLead ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="ml-2">Sincronizar</span>
                </Button>
              )}
            </div>
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
                    <span
                      className={`ml-2 font-medium ${
                        !mergedData.dni ? "text-amber-600" : ""
                      }`}
                    >
                      {preparedData.DNI}
                    </span>
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
                    <span className="text-muted-foreground">Dirección:</span>
                    <span
                      className={`ml-2 font-medium ${
                        !preparedData.DIRECCION ? "text-amber-600" : ""
                      }`}
                    >
                      {preparedData.DIRECCION || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ciudad:</span>
                    <span
                      className={`ml-2 font-medium ${
                        !preparedData.CIUDAD ? "text-amber-600" : ""
                      }`}
                    >
                      {preparedData.CIUDAD || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">País:</span>
                    <span
                      className={`ml-2 font-medium ${
                        !preparedData.PAIS ? "text-amber-600" : ""
                      }`}
                    >
                      {preparedData.PAIS || "—"}
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

                <div className="mt-3 pt-3 border-t">
                  <span className="text-muted-foreground text-sm">
                    Firmantes configurados:
                  </span>
                  <div className="mt-2 space-y-2">
                    {configuredSigners.length > 0 ? (
                      configuredSigners.map((signer, idx) => (
                        <div
                          key={`${signer.email || signer.name || "signer"}-${idx}`}
                          className="rounded-md border bg-muted/30 px-3 py-2"
                        >
                          <div className="text-xs text-muted-foreground">
                            Firmante{" "}
                            {configuredSigners.length > 1 ? `#${idx + 1}` : ""}
                          </div>
                          <div className="text-sm font-medium">
                            {signer.name || "Sin nombre"}
                          </div>
                          <div className="text-xs text-muted-foreground break-all">
                            {signer.email || "Sin email"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No hay firmantes configurados.
                      </div>
                    )}
                  </div>
                </div>
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
                          setOverrides((p) => ({
                            ...p,
                            address: e.target.value,
                          }))
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
                          setOverrides((p) => ({
                            ...p,
                            country: e.target.value,
                          }))
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
                      <Select
                        value={
                          isPresetPaymentMode
                            ? currentPaymentMode
                            : currentPaymentMode
                              ? "custom"
                              : ""
                        }
                        onValueChange={(v) => {
                          if (v === "custom") {
                            setOverrides((p) => ({ ...p, paymentMode: "" }));
                            return;
                          }
                          setOverrides((p) => ({ ...p, paymentMode: v }));
                        }}
                      >
                        <SelectTrigger id="cg-paymentMode">
                          <SelectValue placeholder="Selecciona una modalidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_MODE_PRESETS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">
                            Otro (escribir)
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {!isPresetPaymentMode && (
                        <Input
                          className="mt-2"
                          value={currentPaymentMode}
                          onChange={(e) =>
                            setOverrides((p) => ({
                              ...p,
                              paymentMode: e.target.value,
                            }))
                          }
                          placeholder="Ej: pago_total / 3_cuotas / reserva"
                        />
                      )}

                      <div className="mt-2 text-[11px] text-muted-foreground">
                        En el contrato se mostrará como:{" "}
                        <b>{preparedData.MODALIDAD_PAGO}</b>
                      </div>
                    </div>

                    {(String(currentPaymentMode)
                      .toLowerCase()
                      .includes("cuota") ||
                      String(currentPaymentMode)
                        .toLowerCase()
                        .includes("excepcion")) && (
                      <>
                        <div className="space-y-1">
                          <Label
                            className="text-xs"
                            htmlFor="cg-installmentsCount"
                          >
                            Número de cuotas
                          </Label>
                          <Input
                            id="cg-installmentsCount"
                            type="number"
                            min={1}
                            max={36}
                            value={
                              (overrides.installmentsCount ??
                                mergedData.installmentsCount ??
                                "") as any
                            }
                            onChange={(e) => {
                              const v = Number.parseInt(e.target.value, 10);
                              setOverrides((p) => ({
                                ...p,
                                installmentsCount: Number.isFinite(v)
                                  ? v
                                  : undefined,
                              }));
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label
                            className="text-xs"
                            htmlFor="cg-installmentAmount"
                          >
                            Monto por cuota (USD)
                          </Label>
                          <Input
                            id="cg-installmentAmount"
                            value={
                              (overrides.installmentAmount ??
                                mergedData.installmentAmount ??
                                "") as any
                            }
                            onChange={(e) =>
                              setOverrides((p) => ({
                                ...p,
                                installmentAmount: e.target.value,
                              }))
                            }
                            placeholder="Ej: 1600"
                          />
                        </div>
                      </>
                    )}

                    {String(currentPaymentMode)
                      .toLowerCase()
                      .includes("reserva") && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor="cg-reserveAmount">
                            Monto de reserva (USD)
                          </Label>
                          <Input
                            id="cg-reserveAmount"
                            value={
                              (overrides.reserveAmount ??
                                mergedData.reserveAmount ??
                                "") as any
                            }
                            onChange={(e) =>
                              setOverrides((p) => ({
                                ...p,
                                reserveAmount: e.target.value,
                              }))
                            }
                            placeholder="Ej: 500"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label
                            className="text-xs"
                            htmlFor="cg-nextChargeDate"
                          >
                            Próximo cobro (opcional)
                          </Label>
                          <Input
                            id="cg-nextChargeDate"
                            type="date"
                            value={
                              (
                                overrides.nextChargeDate ??
                                mergedData.nextChargeDate ??
                                ""
                              ).slice(0, 10) as any
                            }
                            onChange={(e) =>
                              setOverrides((p) => ({
                                ...p,
                                nextChargeDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
                {hasOverrides && (
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={savingLead}
                      onClick={saveOverridesToLead}
                      className="gap-2"
                    >
                      {savingLead ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Guardar en el lead
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selector de template */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {BUILTIN_CONTRACT_TEMPLATES.map((item) => {
                    const isSelected = item.key === selectedBuiltinTemplateKey;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedBuiltinTemplateKey(item.key)}
                        className={
                          isSelected
                            ? "rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 text-left shadow-sm transition"
                            : "rounded-xl border border-border bg-background p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-sm">
                              {item.label}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                          <div
                            className={
                              isSelected
                                ? "mt-0.5 h-4 w-4 rounded-full border-4 border-emerald-500 bg-white"
                                : "mt-0.5 h-4 w-4 rounded-full border border-muted-foreground/40 bg-white"
                            }
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={openContractPreview}
              disabled={previewLoading}
              className="gap-2"
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Vista previa
            </Button>

            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
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

      <Dialog
        open={signatureSuccessOpen}
        onOpenChange={setSignatureSuccessOpen}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-emerald-700">
              Contrato enviado a firma
            </DialogTitle>
            <DialogDescription className="text-center">
              El contrato fue enviado correctamente al lead para firma digital.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Estado del envio
                  </div>
                  <div className="mt-1 text-base font-semibold text-emerald-900">
                    Contrato enviado a firma
                  </div>
                </div>
                <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  {signatureSuccessData?.data?.status || "awaiting_signature"}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white p-4 space-y-3 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Datos del lead
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Lead</div>
                  <div className="font-medium">
                    {mergedData.fullName ||
                      (liveLead as any)?.name ||
                      "Sin nombre"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Código</div>
                  <div className="font-medium">
                    {String(
                      (liveLead as any)?.codigo || (lead as any)?.codigo || "-",
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium break-all">
                    {mergedData.email || (liveLead as any)?.email || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Teléfono</div>
                  <div className="font-medium">
                    {mergedData.phone || (liveLead as any)?.phone || "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white p-4 space-y-3 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Datos de firma
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Título</div>
                  <div className="font-medium">
                    {signatureSuccessData?.data?.title || "Contrato enviado"}
                  </div>
                </div>
              </div>

              {/* Lista de todos los firmantes */}
              {(() => {
                const sigs = signatureSuccessData?.data?.signatures;
                if (sigs && sigs.length > 0) {
                  return (
                    <div className="space-y-3 pt-1">
                      {sigs.map((sig, idx) => (
                        <div
                          key={sig.signature_id || idx}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3"
                        >
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Firmante {sigs.length > 1 ? `#${idx + 1}` : ""}
                            </div>
                            <div className="font-medium">
                              {sig.signer_name || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Email firmante
                            </div>
                            <div className="font-medium break-all">
                              {sig.signer_email_address || "-"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                // Fallback: mostrar datos simples si no hay array de signatures
                return (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Firmante
                      </div>
                      <div className="font-medium">
                        {signatureSuccessData?.data?.signer_name ||
                          mergedData.fullName ||
                          (liveLead as any)?.name ||
                          "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Email firmante
                      </div>
                      <div className="font-medium break-all">
                        {signatureSuccessData?.data?.signer_email ||
                          mergedData.email ||
                          (liveLead as any)?.email ||
                          "-"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSignatureSuccessOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de vista previa del contrato – separado para no anidar */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>Vista previa del contrato</DialogTitle>
                <DialogDescription>
                  Vista previa basada en el texto del contrato (modo sin
                  plantilla). Si usas un template .docx personalizado, la vista
                  previa puede diferir.
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
                  onClick={downloadPreviewPdf}
                  disabled={
                    previewLoading ||
                    downloadingPdf ||
                    !baseContractText ||
                    !!previewError
                  }
                  className="gap-2"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Descargar PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendPreviewToSignature}
                  disabled={
                    previewLoading ||
                    sendingForSignature ||
                    !baseContractText ||
                    !!previewError
                  }
                  className="gap-2"
                >
                  {sendingForSignature ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Enviar a firma
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
                              <div className="font-bold">JAVIER MIRANDA</div>
                              <div className="font-bold">MHF GROUP LLC</div>
                              <div className="mt-3 flex justify-center">
                                <img
                                  src={COMPANY_SIGNATURE_PATH}
                                  alt="Firma de Javier Miranda"
                                  className="h-auto max-w-[170px] object-contain"
                                />
                              </div>
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
                                  ["Correo Electrónico:", preparedData.EMAIL],
                                  [
                                    "Ciudad de Residencia:",
                                    preparedData.CIUDAD,
                                  ],
                                  ["País de Residencia:", preparedData.PAIS],
                                  ["Nro. de Telef.:", preparedData.TELEFONO],
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
    </>
  );
}
