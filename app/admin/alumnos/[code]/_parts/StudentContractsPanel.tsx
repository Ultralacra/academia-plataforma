"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileSignature,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  downloadLeadDropboxSignSignedDocument,
  listDropboxSignDocumentsByRecipient,
  type LeadDropboxSignDocument,
  type LeadContractSignatureSendResponse,
} from "@/app/admin/crm/api";
import { apiFetch } from "@/lib/api-config";
import { listMetadata } from "@/lib/metadata";

/* ─── envío de otrosí para clientes (no leads) ──────────────── */

async function sendClientOtrosiForSignature(
  recipientCodigo: string,
  file: File,
  subject: string,
  message: string,
) {
  if (!recipientCodigo) throw new Error("recipientCodigo requerido");
  if (!(file instanceof File)) throw new Error("file requerido");

  const formData = new FormData();
  formData.set("file", file);
  formData.set("message", message);
  formData.set("title", subject);
  formData.set("subject", subject);

  return await apiFetch<LeadContractSignatureSendResponse>(
    `/client/dropboxsign/send-file/${encodeURIComponent(recipientCodigo)}`,
    {
      method: "POST",
      body: formData,
    },
  );
}

/* ─── constantes ─────────────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  awaiting_signature: "Pendiente de firma",
  signed: "Firmado",
  declined: "Rechazado",
  canceled: "Cancelado",
  error: "Con error",
};

const STATUS_STYLES: Record<string, string> = {
  awaiting_signature: "border-amber-200 bg-amber-50 text-amber-700",
  signed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  declined: "border-rose-200 bg-rose-50 text-rose-700",
  canceled: "border-slate-200 bg-slate-100 text-slate-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

const OTROSI_TYPES = [
  { value: "extension_garantia", label: "Extensión de tiempo con garantía" },
  {
    value: "extension_sin_garantia",
    label: "Extensión de tiempo sin garantía",
  },
  {
    value: "extension_auditoria",
    label: "Extensión extraordinaria post auditoría",
  },
  { value: "salud", label: "Otrosí por motivo de salud" },
  { value: "membresia", label: "Otrosí Membresía" },
  { value: "otro", label: "Otro" },
];

const CONTRACT_TEMPLATES_ENTITY = "plantillas_contratos";
const ALL_TEMPLATES_ENTITY_ID = "all_templates";

type ContractTemplate = {
  id: string;
  name: string;
  description: string;
  content: string;
  format: "text" | "html";
  isDefault: boolean;
};

type MembershipMode = "continua" | "ordinaria" | null;
type MembershipContractType = "hotselling-pro" | "hotselling-lite";

/* ─── helpers ─────────────────────────────────────────────────── */

function normalizeStatus(status: string | null | undefined): string {
  const v = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!v) return "unknown";
  if (v.includes("awaiting")) return "awaiting_signature";
  if (v.includes("signed")) return "signed";
  if (v.includes("declin")) return "declined";
  if (v.includes("cancel")) return "canceled";
  if (v.includes("error")) return "error";
  return v;
}

function fmtDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const d =
    typeof value === "number"
      ? new Date(value * 1000)
      : /^\d+$/.test(String(value).trim())
        ? new Date(Number(value) * 1000)
        : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function docNumber(idx: number, doc: LeadDropboxSignDocument) {
  // Intenta inferir el número del Otrosí del título, si no usa el índice
  const m = String(doc.title ?? "").match(/n[oº°]?\s*\.?\s*(\d+)/i);
  return m ? `Nº ${m[1]}` : `#${idx + 1}`;
}

function monthNameEs(date: Date) {
  return date.toLocaleDateString("es-ES", { month: "long" });
}

function normalizeTemplateList(payload: any): ContractTemplate[] {
  const templates = payload?.templates;
  if (!templates || typeof templates !== "object") return [];

  return Object.entries(templates)
    .map(([id, value]) => {
      const item = value as Partial<ContractTemplate> | undefined;
      return {
        id,
        name: String(item?.name ?? id),
        description: String(item?.description ?? ""),
        content: String(item?.content ?? ""),
        format: item?.format === "html" ? "html" : "text",
        isDefault: Boolean(item?.isDefault),
      } satisfies ContractTemplate;
    })
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

function isMembershipTemplate(template: ContractTemplate) {
  const haystack = [template.id, template.name, template.description]
    .join(" ")
    .toLowerCase();
  return haystack.includes("membres") || haystack.includes("otrosi");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildTemplatePreview(
  template: string,
  studentName: string,
  startDate: string,
  endDate: string,
) {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();
  const values: Record<string, string> = {
    NOMBRE_COMPLETO: studentName || "Nombre del alumno",
    DNI: "123456789",
    DIRECCION: "Dirección del alumno",
    DIA_INICIO: String(start.getDate()).padStart(2, "0"),
    MES_INICIO: monthNameEs(start),
    ANIO_INICIO: String(start.getFullYear()),
    FECHA_CONTRATO: start.toLocaleDateString("es-ES"),
    PROGRAMA: "Hotselling",
    DURACION_TEXTO: "treinta (30) días",
    DURACION_NUMERO: "30",
    MODALIDAD_PAGO: "pago único",
    MONTO_TOTAL_LETRAS: "quinientos dólares",
    MONTO_TOTAL: "500",
    MONEDA: "USD",
  };

  const filled = template
    .replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
      return values[key] ?? `{{${key}}}`;
    })
    .replace("(30 días después)", end.toLocaleDateString("es-ES"))
    .replace(/\[\[FIRMAS\]\]/g, "\n\n[Firmas de empresa y alumno]");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Vista previa</title><style>body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;color:#111;background:#fff} .wrap{max-width:860px;margin:0 auto} pre{white-space:pre-wrap;line-height:1.6;font-size:14px}</style></head><body><div class="wrap"><pre>${escapeHtml(filled)}</pre></div></body></html>`;
}

function formatDateDisplay(iso?: string) {
  if (!iso) return "___ / ___ / ______";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day} / ${month} / ${year}`;
}

function formatSignatureDate() {
  const date = new Date();
  return {
    day: date.getDate(),
    month: monthNameEs(date),
    year: date.getFullYear(),
  };
}

function buildMembershipHtml({
  contractType,
  studentName,
  studentId,
  studentAddress,
  startDate,
  endDate,
  signatureDataUrl,
}: {
  contractType: MembershipContractType;
  studentName: string;
  studentId: string;
  studentAddress: string;
  startDate: string;
  endDate: string;
  signatureDataUrl?: string | null;
}) {
  const startDisplay = formatDateDisplay(startDate);
  const endDisplay = formatDateDisplay(endDate);
  const sig = formatSignatureDate();
  if (contractType === "hotselling-pro") {
    return (
      `<!doctype html><html><head><meta charset="utf-8"><title>Otrosí HOTSELLING PRO</title><style>
      @page { size: A4; margin: 10mm; }
      html, body { height: 100%; }
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background:#fff }
      .doc-body { margin: 8mm; }
      .contract-wrapper { max-width: 800px; margin: 0 auto; padding:8px; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; font-size:13px }
      h2.clause-title { text-align:center; font-weight:700; margin:4px 0 8px; }
      h3.clause { font-weight:700; margin-bottom:6px; }
      .clause-point { margin-left:14px; margin-bottom:10px; }
    </style></head><body>` +
      `<div class="doc-body"><div class="contract-wrapper">` +
      `<h2 class="clause-title">OTROSÍ No. __  AL CONTRATO DE PRESTACIÓN DE SERVICIOS DEL PROGRAMA “HOTSELLING PRO"</h2>` +
      `<p>De una parte, MHF GROUP LLC, con EIN 85-4320656, con domicilio a efectos de notificaciones en 13728 LAGOON ISLE WAY APT 205 ORLANDO, FL 32824, UNITED STATE, quien en adelante se denominará <strong>LA EMPRESA</strong>. Y, de otra parte, <strong>${escapeHtml(studentName || "_____________________________________________")}</strong>, con número de identificación <strong>${escapeHtml(studentId || "____________________")}</strong>, domiciliado(a) en <strong>${escapeHtml(studentAddress || "___________________")}</strong>, quien en adelante se denominará <strong>EL CLIENTE</strong>, se celebra el presente OTROSÍ al Contrato de Prestación de Servicios correspondiente al programa “HOTSELLING PRO” (en adelante, el Contrato Base), el cual se regirá por las siguientes cláusulas:</p>` +
      `<h3 class="clause">PRIMERA. Antecedentes y finalidad</h3>` +
      `<p>Las partes celebraron el “CONTRATO PRESTACIÓN DE SERVICIOS DEL PROGRAMA “HOTSELLING PRO” (en adelante, el “Contrato Base”), cuya fecha del acuerdo consta como XXXX. Las partes requieren un marco adicional para regular, de manera estandarizada, los casos en que EL CLIENTE activa una membresía puntual por un (1) mes, sin continuidad, a modo de reactivación/renovación operativa de accesos, sin que ello constituya extensión del Contrato Base ni se enmarque dentro de la cláusula de garantía.</p>` +
      `<h3 class="clause">SEGUNDA. Objeto y definiciones</h3>` +
      `<p>El presente Otrosí tiene por objeto crear y regular la “Membresía Puntual / No Continua” (en adelante, la “Membresía”), como modalidad aplicable cuando EL CLIENTE solicite habilitar accesos al programa por un (1) mes, sin continuidad, sin que dicha habilitación constituya extensión del Contrato Base ni se encuentre dentro del alcance de la cláusula de garantía del Contrato Base.</p>` +
      `<h3 class="clause">TERCERA. Vigencia del período mensual y mes de acceso</h3>` +
      `<p>La membresía se activa por un período fijo de treinta (30) días calendario, contados desde la fecha de inicio indicada en este Otrosí.</p>` +
      `<p><strong>Fecha de inicio:</strong> ${startDisplay}</p>` +
      `<p><strong>Fecha de finalización:</strong> ${endDisplay}</p>` +
      `<h3 class="clause">CUARTA. Validación de pagos y habilitación de accesos</h3>` +
      `<div class="clause-point">` +
      `<p>4.1 Cuando EL CLIENTE realice el pago y remita el comprobante correspondiente, LA EMPRESA podrá habilitar los accesos, quedando el pago sujeto a validación interna conforme a sus procesos administrativos y de control.</p>` +
      `<p>4.2 LA EMPRESA podrá, en cualquier momento, solicitar información adicional, comprobantes o documentación complementaria para confirmar la legitimidad del pago.</p>` +
      `<p>4.3 En caso de que el pago no pueda ser validado o se detecten inconsistencias, LA EMPRESA se reserva el derecho de suspender o revocar los accesos, sin que ello genere derecho a compensación, extensión, reembolso ni reclamo alguno.</p>` +
      `<p>4.4 La activación de accesos tras el envío del comprobante se realizará dentro de los horarios de atención del área de Atención al Cliente y quedará sujeta a validación interna del pago.</p>` +
      `</div>` +
      `<h3 class="clause">QUINTA. Aclaración sobre “pausas”</h3>` +
      `<p>La Membresía no contempla pausas bajo ninguna modalidad. No procede la suspensión, congelación, prórroga ni reprogramación del período de acceso. El no uso total o parcial del mes no genera derecho a extensión, compensación ni reembolso.</p>` +
      `<h3 class="clause">SEXTA. Garantía</h3>` +
      `<p>Esta modalidad de Membresía no reactiva ni extiende garantías contractuales previas. En consecuencia, no habilita solicitudes de auditoría, reembolso ni continuidad de garantía.</p>` +
      `<h3 class="clause">SÉPTIMA. Bonos, beneficios y entregables</h3>` +
      `<p>La Membresía no habilita la reutilización de bonos contractuales previamente utilizados. Los bonos del Contrato Base no son acumulables ni reutilizables.</p>` +
      `<h3 class="clause">OCTAVA. Carácter excepcional y no renovación automática</h3>` +
      `<p>La activación de la Membresía se realiza de manera puntual y expresa, previa solicitud y pago por parte de EL CLIENTE. Dicha activación no implica renovación automática, no constituye un derecho adquirido ni genera precedentes para futuras solicitudes, extensiones o beneficios adicionales.</p>` +
      `<h3 class="clause">NOVENA. Integridad, prevalencia y vigencia del contrato base</h3>` +
      `<p>El presente Otrosí hace parte integral del Contrato Base. En lo no modificado expresamente por este documento, continúan vigentes todas las cláusulas del Contrato Base. En caso de contradicción entre el Contrato Base y este Otrosí respecto de la Membresía, prevalecerá lo aquí pactado para ese supuesto específico.</p>` +
      `<p>En señal de aceptación se firma el presente Otrosí en 2 ejemplares en original a los ${sig.day} días del mes de ${sig.month} de ${sig.year}, en constancia firman:</p>` +
      `<div style="display:flex;justify-content:space-between;margin-top:24px;">` +
      `<div style="text-align:left;">LA EMPRESA<br/><br/><img src="${signatureDataUrl || "/firma_hotselling.png"}" alt="Firma" style="max-width:220px;"/><br/><br/>MHF GROUP LLC – EIN 47-1492517<br/>Representante: JAVIER MIRANDA</div>` +
      `<div style="text-align:left;">LA CLIENTE (ESTUDIANTE)<br/><br/>Firma: __________________________<br/>Nombre: <strong>${escapeHtml(studentName || "")}</strong><br/>Identificación: ${escapeHtml(studentId || "")}</div>` +
      `</div></div></body></html>`
    );
  }

  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>Otrosí HOTSELLING LITE</title><style>
    @page { size: A4; margin: 20mm; }
    html, body { height: 100%; }
    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
    .doc-body { margin: 20mm; }
    .contract-wrapper { max-width: 980px; margin: 0 auto; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; font-size:13px }
    h2.clause-title { text-align:center; font-weight:700; margin-top: 0; }
    h3.clause { font-weight:700; margin-bottom:6px; }
    .clause-point { margin-left:20px; margin-bottom:12px; }
  </style></head><body>` +
    `<div class="doc-body"><div class="contract-wrapper">` +
    `<h2 class="clause-title">OTROSÍ No. ___ AL CONTRATO DE PRESTACIÓN DE SERVICIOS DEL PROGRAMA “HOTSELLING LITE”</h2>` +
    `<p>De una parte, MHF GROUP LLC, con EIN 85-4320656, con domicilio a efectos de notificaciones en 13728 LAGOON ISLE WAY APT 205 ORLANDO, FL 32824, UNITED STATE, quien en adelante se denominará <strong>LA EMPRESA</strong>. Y, de otra parte, <strong>${escapeHtml(studentName || "_____________________________________________")}</strong>, con número de identificación <strong>${escapeHtml(studentId || "____________________")}</strong>, domiciliado(a) en <strong>${escapeHtml(studentAddress || "___________________")}</strong>, quien en adelante se denominará <strong>EL CLIENTE</strong>, se celebra el presente OTROSÍ al Contrato de Prestación de Servicios correspondiente al programa “HOTSELLING LITE” (en adelante, el Contrato Base), el cual se regirá por las siguientes cláusulas:</p>` +
    `<h3 class="clause">PRIMERA. Antecedentes y finalidad</h3>` +
    `<p>Las partes celebraron el “CONTRATO PRESTACIÓN DE SERVICIOS DEL PROGRAMA “HOTSELLING LITE” (en adelante, el “Contrato Base”), cuya fecha del acuerdo consta como 08/12/2025. Las partes requieren un marco adicional para regular, de manera estandarizada, los casos en que EL CLIENTE activa una membresía puntual por un (1) mes, sin continuidad, a modo de reactivación/renovación operativa de accesos, sin que ello constituya extensión del Contrato Base ni se enmarque dentro de la cláusula de garantía.</p>` +
    `<h3 class="clause">SEGUNDA. Objeto y definiciones</h3>` +
    `<p>El presente Otrosí tiene por objeto crear y regular la “Membresía Puntual / No Continua” (en adelante, la “Membresía”), como modalidad aplicable cuando EL CLIENTE solicite habilitar accesos al programa por un (1) mes, sin continuidad, sin que dicha habilitación constituya extensión del Contrato Base ni se encuentre dentro del alcance de la cláusula de garantía del Contrato Base.</p>` +
    `<h3 class="clause">TERCERA. Vigencia del período mensual y mes de acceso</h3>` +
    `<p>La membresía se activa por un período fijo de treinta (30) días calendario, contados desde la fecha de inicio indicada en este Otrosí.</p>` +
    `<p><strong>Fecha de inicio:</strong> ${startDisplay}<br/><strong>Fecha de finalización:</strong> ${endDisplay}</p>` +
    `<h3 class="clause">CUARTA. Validación de pagos y habilitación de accesos</h3>` +
    `<div class="clause-point">` +
    `<p>4.1 Cuando EL CLIENTE realice el pago y remita el comprobante correspondiente, LA EMPRESA podrá habilitar los accesos, quedando el pago sujeto a validación interna conforme a sus procesos administrativos y de control.</p>` +
    `<p>4.2 LA EMPRESA podrá, en cualquier momento, solicitar información adicional, comprobantes o documentación complementaria para confirmar la legitimidad del pago.</p>` +
    `<p>4.3 En caso de que el pago no pueda ser validado o se detecten inconsistencias, LA EMPRESA se reserva el derecho de suspender o revocar los accesos, sin que ello genere derecho a compensación, extensión, reembolso ni reclamo alguno.</p>` +
    `<p>4.4 La activación de accesos tras el envío del comprobante se realizará dentro de los horarios de atención del área de Atención al Cliente y quedará sujeta a validación interna del pago.</p>` +
    `</div>` +
    `<h3 class="clause">QUINTA. Aclaración sobre “pausas”</h3>` +
    `<p>La Membresía no contempla pausas bajo ninguna modalidad. No procede la suspensión, congelación, prórroga ni reprogramación del período de acceso. El no uso total o parcial del mes no genera derecho a extensión, compensación ni reembolso.</p>` +
    `<h3 class="clause">SEXTA. Garantía</h3>` +
    `<p>Esta modalidad de Membresía no reactiva ni extiende garantías contractuales previas. En consecuencia, no habilita solicitudes de auditoría, reembolso ni continuidad de garantía.</p>` +
    `<h3 class="clause">SÉPTIMA. Bonos, beneficios y entregables</h3>` +
    `<p>La Membresía no habilita la reutilización de bonos contractuales previamente utilizados. Los bonos del Contrato Base no son acumulables ni reutilizables.</p>` +
    `<h3 class="clause">OCTAVA. Carácter excepcional y no renovación automática</h3>` +
    `<p>La activación de la Membresía se realiza de manera puntual y expresa, previa solicitud y pago por parte de EL CLIENTE. Dicha activación no implica renovación automática, no constituye un derecho adquirido ni genera precedentes para futuras solicitudes, extensiones o beneficios adicionales.</p>` +
    `<h3 class="clause">NOVENA. Integridad, prevalencia y vigencia del contrato base</h3>` +
    `<p>El presente Otrosí hace parte integral del Contrato Base. En lo no modificado expresamente por este documento, continúan vigentes todas las cláusulas del Contrato Base. En caso de contradicción entre el Contrato Base y este Otrosí respecto de la Membresía, prevalecerá lo aquí pactado para ese supuesto específico.</p>` +
    `<p>En señal de aceptación se firma el presente Otrosi en 2 ejemplares en original a los ${sig.day} días del mes de ${sig.month} de ${sig.year}, en constancia firman:</p>` +
    `<div style="display:block;margin-top:24px;">` +
    `<div style="text-align:left;margin-bottom:18px;">LA EMPRESA</div>` +
    `<div style="text-align:left;margin-bottom:36px;"><img src="${signatureDataUrl || "/firma_hotselling.png"}" alt="Firma" style="max-width:220px;"/></div>` +
    `<div style="text-align:left;">MHF GROUP LLC – EIN 47-1492517<br/>Representante: JAVIER MIRANDA</div>` +
    `<div style="height:36px;"></div>` +
    `<div style="text-align:left;">LA CLIENTE (ESTUDIANTE)</div>` +
    `<div style="height:48px;"></div>` +
    `<div style="text-align:left;">Firma: __________________________<br/>Nombre: <strong>${escapeHtml(studentName || "(NOMBRE Y APELLIDO COMPLETO)")}</strong><br/>Identificación: ${escapeHtml(studentId || "________________")}</div>` +
    `</div></div></body></html>`
  );
}

function buildHtmlFile(content: string, fileName: string) {
  return new File([content], fileName, { type: "text/html" });
}

function PreviewDialog({
  open,
  html,
  title,
  onOpenChange,
}: {
  open: boolean;
  html: string;
  title: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl h-[90vh] p-2">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Vista previa del documento que se enviará al alumno.
          </DialogDescription>
        </DialogHeader>
        <div className="h-full overflow-hidden px-4 pb-4">
          <iframe
            className="h-full w-full rounded-md border bg-white"
            srcDoc={html}
            title={title}
            sandbox="allow-same-origin"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── modal de envío de Otrosí ────────────────────────────────── */

interface SendOtrosiModalProps {
  open: boolean;
  studentCode: string;
  studentName: string;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}

function SendOtrosiModal({
  open,
  studentCode,
  studentName,
  onOpenChange,
  onSent,
}: SendOtrosiModalProps) {
  const [tipoOtrosi, setTipoOtrosi] = useState("");
  const [student, setStudent] = useState<any | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(
    `Estimado/a ${studentName},\n\nAdjunto encontrará el Otrosí correspondiente para su revisión y firma digital.\n\nQuedamos atentos.\nEquipo Hotselling`,
  );
  const [sourceMode, setSourceMode] = useState<"template" | "upload">(
    "template",
  );
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [templateFormat, setTemplateFormat] = useState<"text" | "html">("text");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploadedHtml, setUploadedHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [membershipMode, setMembershipMode] =
    useState<MembershipMode>("continua");
  const [membershipContractType, setMembershipContractType] =
    useState<MembershipContractType>("hotselling-pro");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const membershipTemplates = useMemo(
    () => templates.filter(isMembershipTemplate),
    [templates],
  );

  const availableTemplates =
    tipoOtrosi === "membresia" && membershipTemplates.length > 0
      ? membershipTemplates
      : templates;

  const selectedTemplate = useMemo(
    () =>
      availableTemplates.find((item) => item.id === selectedTemplateId) ?? null,
    [availableTemplates, selectedTemplateId],
  );

  const previewHtml = useMemo(() => {
    if (sourceMode === "upload") {
      if (uploadedHtml) return uploadedHtml;
      return '<html><body style="font-family:sans-serif;padding:24px">No hay vista previa disponible para este archivo.</body></html>';
    }
    if (!templateContent.trim()) {
      return '<html><body style="font-family:sans-serif;padding:24px">Selecciona una plantilla para previsualizarla.</body></html>';
    }
    if (tipoOtrosi === "membresia" && membershipMode === "continua") {
      return buildMembershipHtml({
        contractType: membershipContractType,
        studentName: student?.nombre ?? student?.name ?? studentName,
        studentId: student?.identificacion ?? student?.id_number ?? "",
        studentAddress: student?.direccion ?? student?.address ?? "",
        startDate,
        endDate,
        signatureDataUrl,
      });
    }
    return templateFormat === "html"
      ? templateContent
      : buildTemplatePreview(templateContent, studentName, startDate, endDate);
  }, [
    endDate,
    membershipContractType,
    membershipMode,
    signatureDataUrl,
    sourceMode,
    startDate,
    student,
    studentName,
    templateContent,
    templateFormat,
    tipoOtrosi,
    uploadedHtml,
  ]);

  // Auto-completar el asunto cuando se elige el tipo
  useEffect(() => {
    if (!tipoOtrosi) return;
    const label =
      OTROSI_TYPES.find((t) => t.value === tipoOtrosi)?.label ?? tipoOtrosi;
    setSubject(`Otrosí — ${label} · ${studentName}`);
  }, [tipoOtrosi, studentName]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await listMetadata<any>({ background: true });
        const record = (res.items || []).find(
          (item: any) =>
            String(item?.entity || "") === CONTRACT_TEMPLATES_ENTITY &&
            String(item?.entity_id || "") === ALL_TEMPLATES_ENTITY_ID,
        );
        const normalized = normalizeTemplateList(record?.payload);
        if (cancelled) return;
        setTemplates(normalized);
      } catch (error: any) {
        if (cancelled) return;
        setTemplates([]);
        toast({
          title: "No se pudieron cargar las plantillas",
          description:
            error?.message ?? "Se podrá continuar subiendo un archivo manual.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    }

    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadStudentAndSignature() {
      try {
        const response = await apiFetch<any>(
          `/client/get/cliente/${encodeURIComponent(studentCode)}`,
        );
        if (!cancelled) {
          const record = response?.data || response;
          setStudent(record || null);
        }
      } catch {
        if (!cancelled) setStudent(null);
      }

      try {
        const response = await fetch(`/firma_hotselling.png`);
        if (!response.ok) throw new Error("No se pudo cargar la firma");
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = (event) => reject(event);
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setSignatureDataUrl(dataUrl);
      } catch {
        if (!cancelled) setSignatureDataUrl(null);
      }
    }

    loadStudentAndSignature();
    return () => {
      cancelled = true;
    };
  }, [open, studentCode]);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setUploadedHtml(null);
    setSourceMode("template");
  }, [open]);

  useEffect(() => {
    if (!availableTemplates.length) {
      setSelectedTemplateId("");
      setTemplateContent("");
      return;
    }

    const stillExists = availableTemplates.some(
      (item) => item.id === selectedTemplateId,
    );
    const nextTemplate = stillExists
      ? availableTemplates.find((item) => item.id === selectedTemplateId)!
      : availableTemplates[0];

    setSelectedTemplateId(nextTemplate.id);
    setTemplateContent(nextTemplate.content);
    setTemplateFormat(nextTemplate.format);
  }, [availableTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateContent(selectedTemplate.content);
    setTemplateFormat(selectedTemplate.format);
  }, [selectedTemplate]);

  const canSend =
    !!tipoOtrosi &&
    !!subject.trim() &&
    !!message.trim() &&
    (sourceMode === "upload" ? !!file : !!templateContent.trim());

  async function resolveFileToSend() {
    if (sourceMode === "upload") {
      return file;
    }

    if (tipoOtrosi === "membresia" && membershipMode === "continua") {
      return buildHtmlFile(
        buildMembershipHtml({
          contractType: membershipContractType,
          studentName: student?.nombre ?? student?.name ?? studentName,
          studentId: student?.identificacion ?? student?.id_number ?? "",
          studentAddress: student?.direccion ?? student?.address ?? "",
          startDate,
          endDate,
          signatureDataUrl,
        }),
        `${membershipContractType}-${studentCode}.html`,
      );
    }

    const safeName = `${selectedTemplate?.id || "otrosi"}-${studentCode}.html`;
    const htmlContent =
      templateFormat === "html"
        ? templateContent
        : buildTemplatePreview(
            templateContent,
            studentName,
            startDate,
            endDate,
          );

    return buildHtmlFile(htmlContent, safeName);
  }

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    if (!nextFile) {
      setUploadedHtml(null);
      return;
    }

    const lowerName = nextFile.name.toLowerCase();
    const isHtml =
      nextFile.type.includes("html") ||
      lowerName.endsWith(".html") ||
      lowerName.endsWith(".htm");

    if (!isHtml) {
      setUploadedHtml(null);
      return;
    }

    try {
      const text = await nextFile.text();
      setUploadedHtml(text);
    } catch {
      setUploadedHtml(null);
    }
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      const fileToSend = await resolveFileToSend();
      if (!fileToSend) {
        throw new Error("Debes seleccionar una plantilla o subir un archivo.");
      }

      await sendClientOtrosiForSignature(
        studentCode,
        fileToSend,
        subject.trim(),
        message.trim(),
      );
      toast({
        title: "Otrosí enviado a firma",
        description: `"${subject}" enviado correctamente por Dropbox Sign.`,
      });
      onSent();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Error al enviar",
        description: e?.message ?? "No se pudo enviar el Otrosí",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Enviar Otrosí a firma
          </DialogTitle>
          <DialogDescription>
            Puedes subir un archivo propio o elegir una plantilla, editarla y
            ver su vista previa antes de enviarla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Tipo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Tipo de Otrosí
            </Label>
            <Select value={tipoOtrosi} onValueChange={setTipoOtrosi}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {OTROSI_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asunto */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Asunto del documento
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Otrosí Nº 1 — Extensión con garantía"
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Mensaje al firmante
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Origen del documento
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={sourceMode === "template" ? "default" : "outline"}
                onClick={() => setSourceMode("template")}
                className="justify-start"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Usar plantilla
              </Button>
              <Button
                type="button"
                variant={sourceMode === "upload" ? "default" : "outline"}
                onClick={() => setSourceMode("upload")}
                className="justify-start"
              >
                <Upload className="mr-2 h-4 w-4" />
                Subir archivo
              </Button>
            </div>
          </div>

          {sourceMode === "template" ? (
            <div className="space-y-3 rounded-lg border p-3">
              {tipoOtrosi === "membresia" ? (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Selecciona tipo de membresía
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant={
                          membershipMode === "continua" ? "default" : "outline"
                        }
                        onClick={() => setMembershipMode("continua")}
                      >
                        Membresía continua
                      </Button>
                      <Button
                        type="button"
                        variant={
                          membershipMode === "ordinaria" ? "default" : "outline"
                        }
                        onClick={() => setMembershipMode("ordinaria")}
                      >
                        Membresía ordinaria
                      </Button>
                    </div>
                  </div>

                  {membershipMode === "continua" ? (
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Tipo de contrato
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          variant={
                            membershipContractType === "hotselling-pro"
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setMembershipContractType("hotselling-pro")
                          }
                        >
                          Hotselling Pro
                        </Button>
                        <Button
                          type="button"
                          variant={
                            membershipContractType === "hotselling-lite"
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setMembershipContractType("hotselling-lite")
                          }
                        >
                          Hotselling Lite
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Plantilla disponible
                </Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  disabled={loadingTemplates || availableTemplates.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingTemplates
                          ? "Cargando plantillas..."
                          : "Selecciona una plantilla"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate?.description ? (
                  <p className="text-[11px] text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                ) : null}
                {tipoOtrosi === "membresia" &&
                membershipTemplates.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Se están mostrando primero las plantillas de membresía.
                  </p>
                ) : null}
                {tipoOtrosi === "membresia" ? (
                  <p className="text-[11px] text-muted-foreground">
                    Este bloque replica las mismas opciones del modal de Agregar
                    Membresía.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Fecha de inicio
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Fecha de finalización
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Edición rápida de la plantilla
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                    disabled={!templateContent.trim()}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>
                <Textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  className="min-h-[220px] font-mono text-xs"
                  placeholder="Contenido editable de la plantilla"
                  disabled={availableTemplates.length === 0}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Archivo del Otrosí (PDF o HTML)
                </Label>
                <div
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-3 transition-colors hover:bg-muted/30"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileSignature className="h-4 w-4 flex-none text-muted-foreground" />
                  <span className="truncate text-sm text-muted-foreground">
                    {file ? file.name : "Haz clic para seleccionar el archivo"}
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.html,.htm"
                  className="hidden"
                  onChange={(e) =>
                    void handleFileChange(e.target.files?.[0] ?? null)
                  }
                />
              </div>

              {uploadedHtml !== null ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Edición rápida del HTML subido
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                  <Textarea
                    value={uploadedHtml}
                    onChange={(e) => setUploadedHtml(e.target.value)}
                    className="min-h-[220px] font-mono text-xs"
                  />
                </div>
              ) : file ? (
                <p className="text-[11px] text-muted-foreground">
                  Los PDF se enviarán tal cual. La vista previa y edición rápida
                  solo está disponible para archivos HTML.
                </p>
              ) : null}
            </div>
          )}

          {/* Info */}
          <p className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2">
            El documento se enviará al correo del alumno registrado via Dropbox
            Sign. Una vez firmado aparecerá en este historial.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!canSend || sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar a firma
          </Button>
        </DialogFooter>
      </DialogContent>

      <PreviewDialog
        open={previewOpen}
        html={previewHtml}
        title="Vista previa del Otrosí"
        onOpenChange={setPreviewOpen}
      />
    </Dialog>
  );
}

/* ─── tarjeta de documento ────────────────────────────────────── */

function DocCard({
  doc,
  idx,
  downloading,
  onDownload,
}: {
  doc: LeadDropboxSignDocument;
  idx: number;
  downloading: boolean;
  onDownload: (doc: LeadDropboxSignDocument) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = normalizeStatus(doc.status);
  const statusClass = STATUS_STYLES[status] ?? STATUS_STYLES.canceled;
  const statusLabel = STATUS_LABELS[status] ?? doc.status ?? "—";
  const signatures = Array.isArray(doc.signatures) ? doc.signatures : [];
  const signedCount = signatures.filter(
    (s) => normalizeStatus(s.status_code) === "signed",
  ).length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header fila */}
      <div className="flex items-start gap-3 p-3">
        <div className="flex-none pt-0.5">
          <FileSignature className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {docNumber(idx, doc)}
            </span>
            <Badge
              variant="outline"
              className={`h-4 text-[10px] ${statusClass}`}
            >
              {statusLabel}
            </Badge>
            {doc.test_mode ? (
              <Badge
                variant="outline"
                className="h-4 text-[10px] border-sky-200 bg-sky-50 text-sky-700"
              >
                Test
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-medium text-foreground truncate">
            {doc.title || "Sin título"}
          </p>
          <p className="text-xs text-muted-foreground">
            {signedCount}/{signatures.length || 1} firma(s) completada(s)
            {doc.signed_at ? ` · Firmado ${fmtDate(doc.signed_at)}` : ""}
            {doc.last_event_type
              ? ` · Último evento: ${doc.last_event_type.replace(/_/g, " ")}`
              : ""}
          </p>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-1 flex-none">
          {doc.signature_request_id ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Descargar firmado"
              disabled={downloading}
              onClick={() => onDownload(doc)}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : null}
          {doc.signing_url ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Abrir enlace de firma"
              asChild
            >
              <Link href={doc.signing_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Ocultar detalle" : "Ver detalle"}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Detalle expandible */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-3 pb-3 pt-2 space-y-3">
          {/* Firmantes */}
          {signatures.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Firmantes
              </p>
              {signatures.map((sig) => {
                const ss = normalizeStatus(sig.status_code);
                return (
                  <div
                    key={sig.signature_id ?? sig.signer_email_address}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {sig.signer_name || "Sin nombre"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {sig.signer_email_address || "—"}
                      </p>
                      {sig.signed_at ? (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Firmado {fmtDate(sig.signed_at)}
                        </p>
                      ) : sig.last_viewed_at ? (
                        <p className="text-[10px] text-muted-foreground">
                          Visto {fmtDate(sig.last_viewed_at)}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium flex-none",
                        ss === "signed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : ss === "awaiting_signature"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                            : ss === "declined"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                              : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {ss === "signed" ? (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      ) : ss === "declined" ? (
                        <XCircle className="h-2.5 w-2.5" />
                      ) : (
                        <Eye className="h-2.5 w-2.5" />
                      )}
                      {STATUS_LABELS[ss] ?? ss}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* IDs técnicos */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            {doc.signature_request_id ? (
              <p>Request ID: {doc.signature_request_id}</p>
            ) : null}
            {doc.signed_file_name ? (
              <p>Archivo: {doc.signed_file_name}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── panel principal ─────────────────────────────────────────── */

export default function StudentContractsPanel({
  studentCode,
  studentName,
}: {
  studentCode: string;
  studentName: string;
}) {
  const [docs, setDocs] = useState<LeadDropboxSignDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);

  async function load() {
    if (!studentCode) return;
    setLoading(true);
    try {
      const data = await listDropboxSignDocumentsByRecipient(studentCode);
      setDocs(data);
    } catch (e: any) {
      toast({
        title: "No se pudieron cargar los contratos",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode]);

  async function handleDownload(doc: LeadDropboxSignDocument) {
    const reqId = String(doc.signature_request_id ?? "").trim();
    if (!reqId) return;
    setDownloadingId(reqId);
    try {
      const { blob, fileName } =
        await downloadLeadDropboxSignSignedDocument(reqId);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download =
        fileName || doc.signed_file_name || `contrato-firmado-${reqId}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: "No se pudo descargar",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Historial contractual ({docs.length})
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Recargar"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setSendOpen(true)}
            title="Enviar nuevo Otrosí a firma"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Otrosí
          </Button>
        </div>
      </div>

      {/* Listado */}
      {loading && docs.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando contratos...
        </div>
      ) : docs.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin documentos enviados a firma para este alumno.
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, idx) => (
            <DocCard
              key={doc.id}
              doc={doc}
              idx={idx}
              downloading={downloadingId === doc.signature_request_id}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      {/* Enlace a vista global */}
      <div className="pt-1">
        <Link
          href="/admin/crm/contracts"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver todos los contratos en CRM
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Modal de envío */}
      <SendOtrosiModal
        open={sendOpen}
        studentCode={studentCode}
        studentName={studentName}
        onOpenChange={setSendOpen}
        onSent={load}
      />
    </div>
  );
}
