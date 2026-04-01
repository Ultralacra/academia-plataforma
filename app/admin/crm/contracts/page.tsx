"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileSignature,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  downloadLeadDropboxSignSignedDocument,
  type LeadDropboxSignDocument,
  listLeadDropboxSignDocuments,
} from "@/app/admin/crm/api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

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
                        <div className="flex flex-col items-end gap-2">
                          {document.signature_request_id ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                handleDownloadSignedDocument(document)
                              }
                              disabled={
                                downloadingId === document.signature_request_id
                              }
                            >
                              {downloadingId ===
                              document.signature_request_id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              Descargar firmado
                            </Button>
                          ) : null}
                          {document.signing_url ? (
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={document.signing_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Firma
                              </Link>
                            </Button>
                          ) : null}
                          {document.details_url ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                href={document.details_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Detalle
                              </Link>
                            </Button>
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
