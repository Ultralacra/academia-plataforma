"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSignature,
  ListChecks,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  UserPlus,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  downloadLeadDropboxSignSignedDocument,
  type LeadDropboxSignDocument,
  listLeadDropboxSignDocuments,
  updateMetadataPayload,
} from "@/app/admin/crm/api";
import { createStudent } from "@/app/admin/alumnos/api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth";
import { getMetadata, listMetadata, type MetadataRecord } from "@/lib/metadata";
import {
  ONBOARDING_WORKFLOW_TEMPLATES,
  type OnboardingStep,
} from "@/lib/email-templates/onboarding-workflow";
import {
  STARTER_WORKFLOW_TEMPLATES,
  type StarterStep,
} from "@/lib/email-templates/starter-workflow";

type WorkflowKind = "onboarding" | "starter";

const WORKFLOW_TEMPLATES: Record<
  WorkflowKind,
  ReadonlyArray<{
    key: string;
    name: string;
    step: OnboardingStep | StarterStep;
  }>
> = {
  onboarding: ONBOARDING_WORKFLOW_TEMPLATES.map((t) => ({
    key: t.key,
    name: t.name,
    step: t.step,
  })),
  starter: STARTER_WORKFLOW_TEMPLATES.map((t) => ({
    key: t.key,
    name: t.name,
    step: t.step,
  })),
};

const WORKFLOW_LABELS: Record<WorkflowKind, string> = {
  onboarding: "Workflow Correos - Onboarding",
  starter: "Workflow Correos - Starter",
};

function detectWorkflowKind(document: LeadDropboxSignDocument): WorkflowKind {
  const haystack =
    `${document.title ?? ""} ${document.contract_source ?? ""}`.toLowerCase();
  if (haystack.includes("starter")) return "starter";
  return "onboarding";
}

// Genera una contraseña con el formato IUCLXSIOWRSV: 12 letras mayúsculas A-Z.
function generateStudentPassword(length = 12): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(length);
    window.crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) {
      out += alphabet[buf[i] % alphabet.length];
    }
    return out;
  }
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_signature: "Pendiente de firma",
  signed: "Firmado",
  declined: "Rechazado",
  canceled: "Cancelado",
  error: "Con error",
};

const STATUS_STYLES: Record<string, string> = {
  awaiting_signature:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  signed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  declined: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50",
  canceled: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100",
  error: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
};

const DROPBOX_SIGN_LABELS: Record<string, string> = {
  awaiting_signature: "Pendiente de firma",
  signed: "Firmado",
  declined: "Rechazado",
  canceled: "Cancelado",
  cancelled: "Cancelado",
  error: "Con error",
  signature_request_sent: "Solicitud enviada",
  signature_request_viewed: "Solicitud visualizada",
  signature_request_signed: "Solicitud firmada",
  signature_request_all_signed: "Solicitud completamente firmada",
  signature_request_declined: "Solicitud rechazada",
  signature_request_canceled: "Solicitud cancelada",
  signature_request_cancelled: "Solicitud cancelada",
  signature_request_downloadable: "Documento listo para descargar",
  signature_request_reassigned: "Solicitud reasignada",
  signature_request_invalid: "Solicitud inválida",
  reminder_sent: "Recordatorio enviado",
  email_delivered: "Correo entregado",
  unknown: "Desconocido",
};

function translateDropboxSignLabel(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return "—";
  if (DROPBOX_SIGN_LABELS[normalized]) return DROPBOX_SIGN_LABELS[normalized];

  return normalized
    .split("_")
    .map((chunk) => {
      if (chunk === "signature") return "firma";
      if (chunk === "request") return "solicitud";
      if (chunk === "signed") return "firmada";
      if (chunk === "sent") return "enviada";
      if (chunk === "viewed") return "visualizada";
      if (chunk === "declined") return "rechazada";
      if (chunk === "canceled" || chunk === "cancelled") return "cancelada";
      if (chunk === "downloadable") return "lista para descargar";
      if (chunk === "download") return "descarga";
      if (chunk === "all") return "completamente";
      if (chunk === "email") return "correo";
      if (chunk === "delivered") return "entregado";
      if (chunk === "reminder") return "recordatorio";
      return chunk;
    })
    .join(" ");
}

function normalizeStatus(status: string | null | undefined) {
  const value = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!value) return "unknown";
  if (value.includes("awaiting")) return "awaiting_signature";
  if (value.includes("signed")) return "signed";
  if (value.includes("declin")) return "declined";
  if (value.includes("cancel")) return "canceled";
  if (value.includes("error")) return "error";
  return value;
}

function formatDateTime(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";

  const date =
    typeof value === "number"
      ? new Date(value * 1000)
      : /^\d+$/.test(String(value).trim())
        ? new Date(Number(value) * 1000)
        : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getDocumentSummary(document: LeadDropboxSignDocument) {
  const normalizedStatus = normalizeStatus(document.status);
  const signatures = Array.isArray(document.signatures)
    ? document.signatures
    : [];
  const signedCount = signatures.filter(
    (signature) => normalizeStatus(signature.status_code) === "signed",
  ).length;
  const totalSignatures = signatures.length;
  const pendingCount = signatures.filter(
    (signature) =>
      normalizeStatus(signature.status_code) === "awaiting_signature",
  ).length;

  return {
    normalizedStatus,
    signedCount,
    totalSignatures,
    pendingCount,
  };
}

export default function CrmContractsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "sales"]}>
      <DashboardLayout>
        <ContractsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ContractsContent() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<LeadDropboxSignDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionsFor, setActionsFor] = useState<LeadDropboxSignDocument | null>(
    null,
  );

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await listLeadDropboxSignDocuments();
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast({
        title: "No se pudieron cargar los contratos",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDownloadSignedDocument = async (
    document: LeadDropboxSignDocument,
  ) => {
    const signatureRequestId = String(
      document.signature_request_id ?? "",
    ).trim();

    if (!signatureRequestId) {
      toast({
        title: "Contrato sin identificador",
        description:
          "Este registro no tiene signature_request_id para descargar el firmado.",
        variant: "destructive",
      });
      return;
    }

    setDownloadingId(signatureRequestId);
    try {
      const { blob, fileName } =
        await downloadLeadDropboxSignSignedDocument(signatureRequestId);
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        fileName ||
        document.signed_file_name ||
        `contrato-firmado-${signatureRequestId}.pdf`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast({
        title: "No se pudo descargar el contrato",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const metrics = useMemo(() => {
    const totals = {
      all: documents.length,
      awaiting_signature: 0,
      signed: 0,
      declined: 0,
      canceled: 0,
      error: 0,
    };

    for (const document of documents) {
      const status = normalizeStatus(document.status);
      if (status in totals) {
        totals[status as keyof typeof totals] += 1;
      }
    }

    return totals;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return documents.filter((document) => {
      const summary = getDocumentSummary(document);
      const matchesStatus =
        statusFilter === "all" || summary.normalizedStatus === statusFilter;

      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        document.title,
        document.signer_name,
        document.signer_email,
        document.recipient_codigo,
        document.signature_request_id,
        document.last_event_type,
        document.signed_file_name,
        ...(document.signatures ?? []).flatMap((signature) => [
          signature.signer_name,
          signature.signer_email_address,
          signature.status_code,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [documents, query, statusFilter]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Contratos enviados a firma
                </h1>
                <p className="text-sm text-slate-600">
                  Estado de solicitudes Dropbox Sign para leads, con detalle de
                  firmantes y accesos rápidos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1 xl:w-80 xl:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por lead, firmante o documento"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={loadDocuments}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Recargar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: "all", label: "Todos", count: metrics.all },
            {
              key: "awaiting_signature",
              label: "Pendientes",
              count: metrics.awaiting_signature,
            },
            { key: "signed", label: "Firmados", count: metrics.signed },
            { key: "declined", label: "Rechazados", count: metrics.declined },
            { key: "canceled", label: "Cancelados", count: metrics.canceled },
            { key: "error", label: "Con error", count: metrics.error },
          ].map((item) => {
            const active = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                <span>{item.label}</span>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Documentos"
            value={metrics.all}
            helper="Total consultado"
            icon={<FileSignature className="h-4 w-4" />}
          />
          <MetricCard
            title="Pendientes"
            value={metrics.awaiting_signature}
            helper="Esperando firma"
            icon={<Eye className="h-4 w-4" />}
          />
          <MetricCard
            title="Firmados"
            value={metrics.signed}
            helper="Completados por el cliente"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <MetricCard
            title="Incidencias"
            value={metrics.declined + metrics.canceled + metrics.error}
            helper="Rechazados, cancelados o con error"
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Documento</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Firmantes</TableHead>
                <TableHead>Último evento</TableHead>
                <TableHead>Firmado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-slate-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando documentos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-slate-500"
                  >
                    No hay documentos que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((document) => {
                  const summary = getDocumentSummary(document);
                  const statusClass =
                    STATUS_STYLES[summary.normalizedStatus] ??
                    "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50";
                  const statusLabel =
                    STATUS_LABELS[summary.normalizedStatus] ??
                    translateDropboxSignLabel(document.status) ??
                    "Sin estado";

                  return (
                    <TableRow key={document.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1 whitespace-normal">
                          <div className="font-medium text-slate-900">
                            {document.title || "Sin título"}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID interno {document.id}
                          </div>
                          <div className="text-xs text-slate-500">
                            Request {document.signature_request_id || "—"}
                          </div>
                          {document.test_mode ? (
                            <Badge
                              variant="outline"
                              className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50"
                            >
                              Test mode
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 whitespace-normal">
                          <div className="font-medium text-slate-900">
                            {document.recipient_codigo || "Sin código"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Tipo: {document.recipient_type || "—"}
                          </div>
                          {document.recipient_codigo ? (
                            <Link
                              href={`/admin/crm/booking/${encodeURIComponent(document.recipient_codigo)}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Ver lead
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          <Badge variant="outline" className={statusClass}>
                            {statusLabel}
                          </Badge>
                          <div className="text-xs text-slate-500">
                            {summary.signedCount}/{summary.totalSignatures || 1}{" "}
                            firmas completadas
                          </div>
                          {summary.pendingCount > 0 ? (
                            <div className="text-xs text-amber-700">
                              {summary.pendingCount} pendiente(s)
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2 whitespace-normal">
                          {(document.signatures ?? []).length > 0 ? (
                            (document.signatures ?? []).map((signature) => {
                              const signatureStatus = normalizeStatus(
                                signature.status_code,
                              );
                              const isSigned = signatureStatus === "signed";
                              return (
                                <div
                                  key={
                                    signature.signature_id ??
                                    `${document.id}-${signature.signer_email_address}`
                                  }
                                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2 font-medium text-slate-900">
                                        <UserRound className="h-3.5 w-3.5 text-slate-400" />
                                        {signature.signer_name || "Sin nombre"}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {signature.signer_email_address ||
                                          "Sin email"}
                                      </div>
                                    </div>
                                    <span
                                      className={[
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                        isSigned
                                          ? "bg-emerald-100 text-emerald-700"
                                          : signatureStatus ===
                                              "awaiting_signature"
                                            ? "bg-amber-100 text-amber-700"
                                            : signatureStatus === "declined"
                                              ? "bg-rose-100 text-rose-700"
                                              : "bg-slate-200 text-slate-700",
                                      ].join(" ")}
                                    >
                                      {isSigned ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : signatureStatus === "declined" ? (
                                        <XCircle className="h-3 w-3" />
                                      ) : (
                                        <Eye className="h-3 w-3" />
                                      )}
                                      {STATUS_LABELS[signatureStatus] ??
                                        translateDropboxSignLabel(
                                          signature.status_code,
                                        ) ??
                                        "Sin estado"}
                                    </span>
                                  </div>
                                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                                    <span>
                                      Visto:{" "}
                                      {formatDateTime(signature.last_viewed_at)}
                                    </span>
                                    <span>
                                      Firmado:{" "}
                                      {formatDateTime(signature.signed_at)}
                                    </span>
                                    {signature.last_reminded_at ? (
                                      <span>
                                        Recordatorio:{" "}
                                        {formatDateTime(
                                          signature.last_reminded_at,
                                        )}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-sm text-slate-500">
                              Sin firmantes
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 whitespace-normal text-sm text-slate-700">
                          <div>
                            {document.last_event_type
                              ? translateDropboxSignLabel(
                                  document.last_event_type,
                                )
                              : "Sin evento"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDateTime(document.last_event_time)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 whitespace-normal text-sm text-slate-700">
                          <div>{formatDateTime(document.signed_at)}</div>
                          {document.signed_file_available ? (
                            <div className="text-xs text-emerald-700">
                              Archivo firmado disponible
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">
                              Archivo firmado no disponible
                            </div>
                          )}
                          {document.signed_file_name ? (
                            <div className="text-xs text-slate-500">
                              {document.signed_file_name}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          {summary.normalizedStatus === "signed" ? (
                            <button
                              type="button"
                              onClick={() => setActionsFor(document)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
                              aria-label="Acciones post-firma"
                              title="Acciones post-firma"
                            >
                              <Settings2 className="h-4 w-4" />
                            </button>
                          ) : null}
                          {document.signature_request_id ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadSignedDocument(document)
                              }
                              disabled={
                                downloadingId === document.signature_request_id
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Descargar contrato firmado"
                              title="Descargar contrato firmado"
                            >
                              {downloadingId ===
                              document.signature_request_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                          {document.signing_url ? (
                            <Link
                              href={document.signing_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Abrir firma"
                              title="Abrir firma"
                            >
                              <FileSignature className="h-4 w-4" />
                            </Link>
                          ) : null}
                          {document.details_url ? (
                            <Link
                              href={document.details_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Ver detalle"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <ContractActionsDialog
        document={actionsFor}
        onClose={() => setActionsFor(null)}
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

type CreatedAccount = {
  email: string;
  password: string;
  name: string;
  id: number | string;
  codigo?: string | null;
};

type AccountStatus =
  | {
      kind: "success";
      account: CreatedAccount;
      credentials: "pending" | "sent" | "failed";
      credentialsMessage?: string;
    }
  | {
      kind: "exists";
      email: string;
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

type ContractTracking = {
  accountCreatedAt?: string | null;
  accountEmail?: string | null;
  accountCodigo?: string | null;
  credentialsSentAt?: string | null;
  emails: Record<string, string>; // templateKey -> ISO timestamp
};

type ContractTrackingMap = Record<string, ContractTracking>;

const EMPTY_TRACKING: ContractTracking = { emails: {} };

function contractTrackingKey(document: LeadDropboxSignDocument): string {
  return (
    String(document.signature_request_id ?? "").trim() ||
    String(document.id ?? "").trim()
  );
}

function metadataBelongsToLead(
  item: MetadataRecord<any>,
  leadCodigo: string,
): boolean {
  const normalized = String(leadCodigo ?? "").trim();
  if (!normalized) return false;
  const entityId = String(item?.entity_id ?? "").trim();
  const payload =
    item?.payload && typeof item.payload === "object"
      ? (item.payload as Record<string, any>)
      : {};
  const payloadLeadCodigo = String(payload?.lead_codigo ?? "").trim();
  const payloadSourceEntityId = String(
    payload?.source_entity_id ?? payload?.entity_id ?? "",
  ).trim();
  return (
    entityId === normalized ||
    payloadLeadCodigo === normalized ||
    payloadSourceEntityId === normalized
  );
}

function pickPreferredMetadataRecord(items: MetadataRecord<any>[]) {
  return (
    [...items].sort((left, right) => {
      const leftTs = new Date(
        String(left.updated_at ?? left.created_at ?? 0),
      ).getTime();
      const rightTs = new Date(
        String(right.updated_at ?? right.created_at ?? 0),
      ).getTime();
      return rightTs - leftTs;
    })[0] ?? null
  );
}

function readTrackingFromMetadata(
  metadata: MetadataRecord<any> | null,
  contractKey: string,
): ContractTracking {
  if (!metadata || !contractKey) return { ...EMPTY_TRACKING, emails: {} };
  const payload =
    metadata.payload && typeof metadata.payload === "object"
      ? (metadata.payload as Record<string, any>)
      : {};
  const map = (payload.contract_tracking ?? {}) as ContractTrackingMap;
  const entry = map[contractKey];
  if (!entry || typeof entry !== "object") {
    return { ...EMPTY_TRACKING, emails: {} };
  }
  return {
    accountCreatedAt: entry.accountCreatedAt ?? null,
    accountEmail: entry.accountEmail ?? null,
    accountCodigo: entry.accountCodigo ?? null,
    credentialsSentAt: entry.credentialsSentAt ?? null,
    emails: { ...(entry.emails ?? {}) },
  };
}

function describeMetadataRecord(item: MetadataRecord<any>): string {
  const payload =
    item?.payload && typeof item.payload === "object"
      ? (item.payload as Record<string, any>)
      : {};
  const entityLabel = String(item.entity ?? "").trim() || "metadata";
  const source = String(
    payload.source ?? payload.kind ?? payload.type ?? "",
  ).trim();
  const updated = item.updated_at ?? item.created_at ?? null;
  const dateLabel = updated
    ? formatTrackingDate(String(updated))
    : `#${item.id}`;
  return `${entityLabel}${source ? ` · ${source}` : ""} · ${dateLabel}`;
}

function formatTrackingDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function AccountStatusCard({
  status,
  onCopy,
}: {
  status: AccountStatus | null;
  onCopy: (value: string, label: string) => void;
}) {
  if (!status) return null;

  if (status.kind === "success") {
    const { account, credentials, credentialsMessage } = status;
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Cuenta creada exitosamente
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-medium">Email</span>
          <div className="flex items-center gap-2">
            <span>{account.email}</span>
            <button
              type="button"
              onClick={() => onCopy(account.email, "Email")}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Copiar email"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-medium">Contraseña</span>
          <div className="flex items-center gap-2 font-mono">
            <span>{account.password}</span>
            <button
              type="button"
              onClick={() => onCopy(account.password, "Contraseña")}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Copiar contraseña"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        {account.codigo ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-medium">Código</span>
            <span>{account.codigo}</span>
          </div>
        ) : null}

        <div
          className={[
            "mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]",
            credentials === "sent"
              ? "bg-emerald-100 text-emerald-900"
              : credentials === "failed"
                ? "bg-rose-100 text-rose-900"
                : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {credentials === "sent" ? (
            <>
              <Mail className="h-3.5 w-3.5" />
              Credenciales enviadas por correo.
            </>
          ) : credentials === "failed" ? (
            <>
              <ShieldAlert className="h-3.5 w-3.5" />
              No se pudieron enviar las credenciales
              {credentialsMessage ? `: ${credentialsMessage}` : "."}
            </>
          ) : (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Enviando credenciales…
            </>
          )}
        </div>
      </div>
    );
  }

  if (status.kind === "exists") {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          Usuario ya registrado
        </div>
        <p className="mt-1">
          Ya existe una cuenta con <strong>{status.email}</strong>. Puedes
          continuar con el envío de correos del workflow o cambiar la contraseña
          desde el detalle del alumno.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <XCircle className="h-4 w-4 text-rose-600" />
        No se pudo crear la cuenta
      </div>
      <p className="mt-1">{status.message}</p>
      <p className="mt-1 text-[11px] text-rose-800">
        Revisa los datos y vuelve a intentarlo con el botón Reintentar.
      </p>
    </div>
  );
}

function ContractActionsDialog({
  document,
  onClose,
}: {
  document: LeadDropboxSignDocument | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const open = !!document;

  const initialEmail = String(document?.signer_email ?? "").trim();
  const initialName = String(document?.signer_name ?? "").trim();
  const initialWorkflow: WorkflowKind = document
    ? detectWorkflowKind(document)
    : "onboarding";

  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [workflow, setWorkflow] = useState<WorkflowKind>(initialWorkflow);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(
    null,
  );
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(
    null,
  );
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  // "__all__" cuando se envía toda la serie.
  const [tracking, setTracking] = useState<ContractTracking>({ emails: {} });
  const [metadataOptions, setMetadataOptions] = useState<MetadataRecord<any>[]>(
    [],
  );
  const [selectedMetadataId, setSelectedMetadataId] = useState<string>("");
  const [selectedMetadata, setSelectedMetadata] =
    useState<MetadataRecord<any> | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);

  const contractKey = document ? contractTrackingKey(document) : "";

  useEffect(() => {
    if (!document) return;
    setEmail(String(document.signer_email ?? "").trim());
    setName(String(document.signer_name ?? "").trim());
    setWorkflow(detectWorkflowKind(document));
    setCreatedAccount(null);
    setAccountStatus(null);
    setSendingKey(null);
    setTracking({ ...EMPTY_TRACKING, emails: {} });
    setMetadataOptions([]);
    setSelectedMetadataId("");
    setSelectedMetadata(null);

    const leadCodigo = String(document.recipient_codigo ?? "").trim();
    if (!leadCodigo) return;

    let cancelled = false;
    setLoadingMetadata(true);
    (async () => {
      try {
        const list = await listMetadata<any>({ background: true });
        const matches = (list.items || []).filter((item) =>
          metadataBelongsToLead(item, leadCodigo),
        );
        if (cancelled) return;
        setMetadataOptions(matches);

        const preferred = pickPreferredMetadataRecord(matches);
        if (preferred) {
          const id = String(preferred.id);
          setSelectedMetadataId(id);
          try {
            const fresh = await getMetadata<any>(id);
            if (cancelled) return;
            setSelectedMetadata(fresh);
            setTracking(
              readTrackingFromMetadata(fresh, contractTrackingKey(document)),
            );
          } catch {
            if (cancelled) return;
            setSelectedMetadata(preferred);
            setTracking(
              readTrackingFromMetadata(
                preferred,
                contractTrackingKey(document),
              ),
            );
          }
        }
      } catch {
        // ignore — el modal funciona sin metadata (no hay persistencia)
      } finally {
        if (!cancelled) setLoadingMetadata(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [document]);

  // Cambio de metadata seleccionado desde el selector
  async function handleChangeSelectedMetadata(id: string) {
    setSelectedMetadataId(id);
    if (!id || !document) return;
    setLoadingMetadata(true);
    try {
      const fresh = await getMetadata<any>(id);
      setSelectedMetadata(fresh);
      setTracking(
        readTrackingFromMetadata(fresh, contractTrackingKey(document)),
      );
    } catch (error: any) {
      toast({
        title: "No se pudo cargar el metadata",
        description: error?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoadingMetadata(false);
    }
  }

  // Persiste una mutación del tracking en el metadata seleccionado.
  // El tracking se guarda bajo payload.contract_tracking[<signature_request_id>].
  async function persistTracking(
    updater: (prev: ContractTracking) => ContractTracking,
  ): Promise<ContractTracking> {
    const nextTracking = updater(tracking);
    setTracking(nextTracking);

    if (!document || !selectedMetadataId) return nextTracking;
    const key = contractTrackingKey(document);
    if (!key) return nextTracking;

    const currentPayload =
      selectedMetadata?.payload && typeof selectedMetadata.payload === "object"
        ? (selectedMetadata.payload as Record<string, any>)
        : {};
    const currentMap = (currentPayload.contract_tracking ??
      {}) as ContractTrackingMap;
    const nextMap: ContractTrackingMap = {
      ...currentMap,
      [key]: nextTracking,
    };

    setSavingTracking(true);
    try {
      const updated = await updateMetadataPayload(selectedMetadataId, {
        contract_tracking: nextMap,
      });
      if (updated && typeof updated === "object") {
        setSelectedMetadata(updated as MetadataRecord<any>);
        setMetadataOptions((prev) =>
          prev.map((item) =>
            String(item.id) === String(selectedMetadataId)
              ? (updated as MetadataRecord<any>)
              : item,
          ),
        );
      }
    } catch (error: any) {
      toast({
        title: "No se pudo guardar el seguimiento",
        description: error?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSavingTracking(false);
    }
    return nextTracking;
  }

  const templates = WORKFLOW_TEMPLATES[workflow];

  async function handleCreateAccount() {
    const targetEmail = email.trim().toLowerCase();
    const targetName = name.trim() || targetEmail;

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      toast({
        title: "Email inválido",
        description: "Revisa el correo asociado al lead",
        variant: "destructive",
      });
      return;
    }

    setCreatingAccount(true);
    try {
      const password = generateStudentPassword(12);
      const created = await createStudent({
        name: targetName,
        email: targetEmail,
        password,
      });

      const account: CreatedAccount = {
        email: targetEmail,
        password,
        name: created.nombre || targetName,
        id: created.id,
        codigo: created.codigo ?? null,
      };
      setCreatedAccount(account);
      setAccountStatus({
        kind: "success",
        account,
        credentials: "pending",
      });
      const accountCreatedAt = new Date().toISOString();
      await persistTracking((prev) => ({
        ...prev,
        accountCreatedAt,
        accountEmail: account.email,
        accountCodigo: account.codigo ?? null,
      }));

      toast({
        title: "Cuenta creada",
        description: `${account.codigo ? account.codigo + " · " : ""}${account.name}`,
      });

      // Enviar credenciales por Brevo (plantilla password_changed).
      try {
        const token = getAuthToken();
        const res = await fetch("/api/brevo/password-changed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: account.email,
            name: account.name,
            username: account.email,
            newPassword: account.password,
          }),
        });
        if (!res.ok) {
          const j: any = await res.json().catch(() => null);
          const message =
            j?.message || "No se pudo enviar las credenciales por Brevo";
          setAccountStatus({
            kind: "success",
            account,
            credentials: "failed",
            credentialsMessage: message,
          });
          toast({
            title: "Cuenta creada, pero el correo falló",
            description: message,
            variant: "destructive",
          });
        } else {
          await persistTracking((prev) => ({
            ...prev,
            credentialsSentAt: new Date().toISOString(),
          }));
          setAccountStatus({
            kind: "success",
            account,
            credentials: "sent",
          });
          toast({
            title: "Credenciales enviadas",
            description: `Correo enviado a ${account.email}`,
          });
        }
      } catch (error: any) {
        const message = error?.message ?? "Error enviando credenciales";
        setAccountStatus({
          kind: "success",
          account,
          credentials: "failed",
          credentialsMessage: message,
        });
        toast({
          title: "Cuenta creada, pero el correo falló",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const raw = String(error?.message ?? "");
      let parsedMessage = raw;
      try {
        const parsed = JSON.parse(raw);
        const msg = parsed?.message;
        parsedMessage = Array.isArray(msg)
          ? msg.join(", ")
          : String(msg ?? raw);
      } catch {
        // no-op: raw ya es texto
      }

      const isEmailExists = /email\s+already\s+exists/i.test(parsedMessage);

      if (isEmailExists) {
        setAccountStatus({
          kind: "exists",
          email: targetEmail,
          message: `Ya existe un usuario registrado con ${targetEmail}.`,
        });
      } else {
        setAccountStatus({
          kind: "error",
          message: parsedMessage || "Error desconocido",
        });
      }

      toast({
        title: isEmailExists
          ? "Este email ya tiene una cuenta"
          : "No se pudo crear la cuenta",
        description: isEmailExists
          ? `Ya existe un usuario registrado con ${targetEmail}. Puedes continuar con el envío de correos o cambiar la contraseña desde el detalle del alumno.`
          : parsedMessage || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setCreatingAccount(false);
    }
  }

  async function sendWorkflowEmail(templateKey?: string) {
    const targetEmail = email.trim().toLowerCase();
    const targetName = name.trim();

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      toast({
        title: "Email inválido",
        description: "Revisa el correo asociado al lead",
        variant: "destructive",
      });
      return;
    }

    const key = templateKey ?? "__all__";
    setSendingKey(key);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/brevo/send-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          workflow,
          ...(templateKey ? { templateKey } : {}),
          to: targetEmail,
          recipientName: targetName,
          recipientUsername: createdAccount?.email ?? targetEmail,
          recipientPassword: createdAccount?.password ?? "",
        }),
      });

      const parsed: any = await res.json().catch(() => null);
      if (!res.ok) {
        toast({
          title: "No se pudo enviar",
          description: parsed?.message ?? `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      const now = new Date().toISOString();
      await persistTracking((prev) => {
        const emails = { ...prev.emails };
        if (templateKey) {
          emails[templateKey] = now;
        } else {
          for (const tpl of WORKFLOW_TEMPLATES[workflow]) {
            emails[tpl.key] = now;
          }
        }
        return { ...prev, emails };
      });

      toast({
        title: templateKey ? "Correo enviado" : "Serie enviada",
        description: parsed?.message ?? "Correo enviado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al enviar",
        description: error?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSendingKey(null);
    }
  }

  function handleCopy(value: string, label: string) {
    if (!value) return;
    void navigator.clipboard
      .writeText(value)
      .then(() => toast({ title: "Copiado", description: `${label} copiado` }))
      .catch(() =>
        toast({
          title: "No se pudo copiar",
          variant: "destructive",
        }),
      );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            Acciones post-firma
          </DialogTitle>
          <DialogDescription>
            {document?.title || "Contrato firmado"} · Lead{" "}
            {document?.recipient_codigo || "—"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="actions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Acciones
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Seguimiento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="mt-4">
            <div className="space-y-5">
              <MetadataSelector
                options={metadataOptions}
                selectedId={selectedMetadataId}
                loading={loadingMetadata}
                saving={savingTracking}
                onChange={handleChangeSelectedMetadata}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="action-name">Nombre</Label>
                  <Input
                    id="action-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del alumno"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="action-email">Email del lead</Label>
                  <Input
                    id="action-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@dominio.com"
                  />
                </div>
              </div>

              {/* Paso 1 — Crear cuenta */}
              <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      1. Crear cuenta de alumno
                    </h3>
                    <p className="text-xs text-slate-600">
                      Crea el usuario con una contraseña generada
                      automáticamente y envía las credenciales al correo del
                      lead.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateAccount}
                        disabled={creatingAccount || !!createdAccount}
                      >
                        {creatingAccount ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : accountStatus?.kind === "error" ? (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        ) : (
                          <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        {createdAccount
                          ? "Cuenta creada"
                          : accountStatus?.kind === "error"
                            ? "Reintentar"
                            : "Crear cuenta y enviar credenciales"}
                      </Button>
                    </div>

                    <AccountStatusCard
                      status={accountStatus}
                      onCopy={handleCopy}
                    />
                  </div>
                </div>
              </section>

              {/* Paso 2 — Workflow de correos */}
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      2. Enviar correos según el tipo de contrato
                    </h3>
                    <p className="text-xs text-slate-600">
                      Envía la serie completa o un correo individual del
                      workflow seleccionado.
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="w-64">
                        <Select
                          value={workflow}
                          onValueChange={(v) => setWorkflow(v as WorkflowKind)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="onboarding">
                              {WORKFLOW_LABELS.onboarding} (
                              {WORKFLOW_TEMPLATES.onboarding.length})
                            </SelectItem>
                            <SelectItem value="starter">
                              {WORKFLOW_LABELS.starter} (
                              {WORKFLOW_TEMPLATES.starter.length})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendWorkflowEmail()}
                        disabled={sendingKey !== null}
                      >
                        {sendingKey === "__all__" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar serie completa
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {templates.map((tpl) => {
                        const busy = sendingKey === tpl.key;
                        return (
                          <div
                            key={tpl.key}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <span className="text-xs text-slate-800">
                              {tpl.name}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendWorkflowEmail(tpl.key)}
                              disabled={sendingKey !== null}
                            >
                              {busy ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-3.5 w-3.5" />
                              )}
                              Enviar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="mt-4">
            <TrackingPanel
              tracking={tracking}
              workflow={workflow}
              templates={templates}
              metadataOptions={metadataOptions}
              selectedMetadataId={selectedMetadataId}
              loadingMetadata={loadingMetadata}
              savingTracking={savingTracking}
              onChangeMetadata={handleChangeSelectedMetadata}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrackingPanel({
  tracking,
  workflow,
  templates,
  metadataOptions,
  selectedMetadataId,
  loadingMetadata,
  savingTracking,
  onChangeMetadata,
}: {
  tracking: ContractTracking;
  workflow: WorkflowKind;
  templates: (typeof WORKFLOW_TEMPLATES)[WorkflowKind];
  metadataOptions: MetadataRecord<any>[];
  selectedMetadataId: string;
  loadingMetadata: boolean;
  savingTracking: boolean;
  onChangeMetadata: (id: string) => void;
}) {
  const accountDone = !!tracking.accountCreatedAt;
  const credentialsDone = !!tracking.credentialsSentAt;
  const emailsSent = templates.filter((t) => !!tracking.emails[t.key]).length;

  return (
    <div className="space-y-4">
      <MetadataSelector
        options={metadataOptions}
        selectedId={selectedMetadataId}
        loading={loadingMetadata}
        saving={savingTracking}
        onChange={onChangeMetadata}
      />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Resumen</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryPill
            label="Cuenta creada"
            done={accountDone}
            at={tracking.accountCreatedAt}
          />
          <SummaryPill
            label="Credenciales enviadas"
            done={credentialsDone}
            at={tracking.credentialsSentAt}
          />
          <SummaryPill
            label={`Correos ${WORKFLOW_LABELS[workflow]
              .replace("Workflow Correos - ", "")
              .toLowerCase()}`}
            done={emailsSent === templates.length && templates.length > 0}
            at={null}
            helper={`${emailsSent} / ${templates.length}`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Checkpoints
        </h3>
        <ol className="space-y-2">
          <CheckpointItem
            done={accountDone}
            title="1. Crear cuenta de alumno"
            detail={
              accountDone
                ? `${tracking.accountCodigo ? tracking.accountCodigo + " · " : ""}${tracking.accountEmail ?? ""}`
                : "Pendiente"
            }
            at={tracking.accountCreatedAt}
          />
          <CheckpointItem
            done={credentialsDone}
            title="2. Envío de credenciales"
            detail={
              credentialsDone
                ? "Correo con email y contraseña enviado"
                : "Pendiente"
            }
            at={tracking.credentialsSentAt}
          />
          <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
              <Mail className="h-4 w-4 text-slate-500" />
              3. {WORKFLOW_LABELS[workflow]}
              <span className="ml-auto text-xs text-slate-500">
                {emailsSent} / {templates.length}
              </span>
            </div>
            <ul className="space-y-1.5">
              {templates.map((tpl, idx) => {
                const at = tracking.emails[tpl.key];
                const done = !!at;
                return (
                  <li
                    key={tpl.key}
                    className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />
                    )}
                    <span className="flex-1 text-slate-800">
                      3.{idx + 1}. {tpl.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {done ? formatTrackingDate(at) : "Pendiente"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        </ol>
      </div>

      <p className="text-[11px] text-slate-500">
        El seguimiento se guarda en el metadata del lead
        {selectedMetadataId ? ` (ID ${selectedMetadataId})` : ""}.{" "}
        {metadataOptions.length === 0
          ? "Este lead no tiene metadata asociado — el seguimiento no se persistirá."
          : "Puedes cambiar el metadata desde el selector si hay más de uno."}
      </p>
    </div>
  );
}

function MetadataSelector({
  options,
  selectedId,
  loading,
  saving,
  onChange,
}: {
  options: MetadataRecord<any>[];
  selectedId: string;
  loading: boolean;
  saving: boolean;
  onChange: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando metadata del lead...
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertCircle className="h-3.5 w-3.5" />
        Este lead no tiene metadata asociado. El seguimiento no se persistirá.
      </div>
    );
  }

  // Con un único metadata, mostramos un chip informativo.
  if (options.length === 1) {
    const only = options[0];
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <span className="flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 text-slate-500" />
          Metadata: <strong>{describeMetadataRecord(only)}</strong>
        </span>
        {saving ? (
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando…
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Metadata del lead</Label>
        {saving ? (
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando…
          </span>
        ) : null}
      </div>
      <Select value={selectedId} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona metadata" />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={String(item.id)} value={String(item.id)}>
              #{item.id} · {describeMetadataRecord(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryPill({
  label,
  done,
  at,
  helper,
}: {
  label: string;
  done: boolean;
  at?: string | null;
  helper?: string;
}) {
  return (
    <div
      className={[
        "rounded-lg border p-3",
        done
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <Circle className="h-4 w-4 text-slate-400" />
        )}
        <span
          className={[
            "text-xs font-medium",
            done ? "text-emerald-900" : "text-slate-700",
          ].join(" ")}
        >
          {label}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-600">
        {helper ?? (at ? formatTrackingDate(at) : "Pendiente")}
      </div>
    </div>
  );
}

function CheckpointItem({
  done,
  title,
  detail,
  at,
}: {
  done: boolean;
  title: string;
  detail: string;
  at?: string | null;
}) {
  return (
    <li
      className={[
        "flex items-start gap-3 rounded-lg border p-3",
        done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white",
      ].join(" ")}
    >
      {done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-300" />
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-600">{detail}</div>
      </div>
      <div className="text-[11px] text-slate-500">
        {at ? formatTrackingDate(at) : "—"}
      </div>
    </li>
  );
}
