"use client";

import { useEffect, useState, useRef } from "react";
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
  Plus,
  RefreshCw,
  Send,
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
  sendOtrosiForSignature,
  type LeadDropboxSignDocument,
} from "@/app/admin/crm/api";

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
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(
    `Estimado/a ${studentName},\n\nAdjunto encontrará el Otrosí correspondiente para su revisión y firma digital.\n\nQuedamos atentos.\nEquipo Hotselling`,
  );
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-completar el asunto cuando se elige el tipo
  useEffect(() => {
    if (!tipoOtrosi) return;
    const label =
      OTROSI_TYPES.find((t) => t.value === tipoOtrosi)?.label ?? tipoOtrosi;
    setSubject(`Otrosí — ${label} · ${studentName}`);
  }, [tipoOtrosi, studentName]);

  const canSend =
    !!tipoOtrosi && !!subject.trim() && !!message.trim() && !!file;

  async function handleSend() {
    if (!canSend || !file) return;
    setSending(true);
    try {
      await sendOtrosiForSignature(
        studentCode,
        file,
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

          {/* Archivo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Archivo del Otrosí (PDF o HTML)
            </Label>
            <div
              className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-3 hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileSignature className="h-4 w-4 text-muted-foreground flex-none" />
              <span className="text-sm text-muted-foreground truncate">
                {file ? file.name : "Haz clic para seleccionar el archivo"}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.html"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

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
            <p>
              <Link
                href="/admin/crm/contracts"
                target="_blank"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Ver en CRM Contratos
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </p>
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
