"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-config";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function MembershipContractHotsellingLiteModal({
  open,
  onOpenChange,
  clientCode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientCode: string;
}) {
  const [student, setStudent] = useState<any | null>(null);
  const [option, setOption] = useState<"continua" | "ordinaria" | null>(null);
  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);
  const endDate = useMemo(() => {
    const end = addDays(new Date(), 30);
    return end.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const j = await apiFetch<any>(
          `/client/get/cliente/${encodeURIComponent(clientCode)}`,
        );
        const r = j?.data || j;
        setStudent(r || null);
      } catch (e) {
        setStudent(null);
      }
    })();
  }, [open, clientCode]);

  // Editable fields state (name, id, address, dates)
  const [editableFields, setEditableFields] = useState<Record<string, string>>(
    {},
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [contractHtmlDraft, setContractHtmlDraft] = useState<string | null>(
    null,
  );
  const [contractHtmlDownload, setContractHtmlDownload] = useState<
    string | null
  >(null);

  useEffect(() => {
    setEditableFields({
      client_name: student?.nombre ?? student?.name ?? "",
      client_id: student?.identificacion ?? student?.id_number ?? "",
      client_address: student?.direccion ?? student?.address ?? "",
      start_date: startDate,
      end_date: endDate,
    });
  }, [student, startDate, endDate]);

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const formatDateToDisplay = (iso?: string) => {
    if (!iso) return "___ / ___ / ______";
    try {
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd} / ${mm} / ${yyyy}`;
    } catch (e) {
      return iso || "___ / ___ / ______";
    }
  };

  const formatSignatureDate = (iso?: string) => {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const d = iso ? new Date(iso) : new Date();
    const day = d.getDate();
    const month = months[d.getMonth()] || "";
    const year = d.getFullYear();
    return { day, month, year };
  };

  const buildContractHtml = (
    fields: Record<string, string>,
    signatureDataUrl?: string | null,
  ) => {
    const clientName = fields.client_name?.trim()
      ? escapeHtml(fields.client_name)
      : "__________________________________________";
    const clientId = fields.client_id?.trim()
      ? escapeHtml(fields.client_id)
      : "____________________";
    const clientAddress = fields.client_address?.trim()
      ? escapeHtml(fields.client_address)
      : "___________________";
    const startDisplay = fields.start_date
      ? formatDateToDisplay(fields.start_date)
      : "___ / ___ / ______";
    const endDisplay = fields.end_date
      ? formatDateToDisplay(fields.end_date)
      : "___ / ___ / ______";

    const html =
      `<!doctype html><html><head><meta charset="utf-8"><title>Otrosí HOTSELLING LITE</title><style>
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
      `<h2 class="clause-title">OTROSÍ No. ___ AL CONTRATO DE PRESTACIÓN DE SERVICIOS DEL PROGRAMA “HOTSELLING LITE”</h2>` +
      `<p>De una parte, MHF GROUP LLC, con EIN 85-4320656, con domicilio a efectos de notificaciones en 13728 LAGOON ISLE WAY APT 205 ORLANDO, FL 32824, UNITED STATE, quien en adelante se denominará <strong>LA EMPRESA</strong>. Y, de otra parte, ${clientName}, con número de identificación ${clientId}, domiciliado(a) en ${clientAddress}, quien en adelante se denominará <strong>EL CLIENTE</strong>, se celebra el presente OTROSÍ al Contrato de Prestación de Servicios correspondiente al programa “HOTSELLING LITE” (en adelante, el Contrato Base), el cual se regirá por las siguientes cláusulas:</p>` +
      `<h3 class="clause">PRIMERA. Antecedentes y finalidad</h3>` +
      `<p>Las partes celebraron el “CONTRATO PRESTACIÓN DE SERVICIOS DEL PROGRAMA “HOTSELLING LITE” (en adelante, el “Contrato Base”), cuya fecha del acuerdo consta como 08/12/2025.` +
      ` Las partes requieren un marco adicional para regular, de manera estandarizada, los casos en que EL CLIENTE activa una membresía puntual por un (1) mes, sin continuidad, a modo de reactivación/renovación operativa de accesos, sin que ello constituya extensión del Contrato Base ni se enmarque dentro de la cláusula de garantía.</p>` +
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
      `<p>En señal de aceptación se firma el presente Otrosi en 2 ejemplares en original a los ___ días del mes de ______ de ______, en constancia firman:</p>` +
      `<div style="display:block;margin-top:24px;">` +
      `<div style="text-align:left;margin-bottom:18px;">LA EMPRESA</div>` +
      `<div style="text-align:left;margin-bottom:36px;"><img src="${signatureDataUrl || "/firma_hotselling.png"}" alt="Firma" style="max-width:220px;"/></div>` +
      `<div style="text-align:left;">MHF GROUP LLC – EIN 47-1492517<br/>Representante: JAVIER MIRANDA</div>` +
      `<div style="height:36px;"></div>` +
      `<div style="text-align:left;">LA CLIENTE (ESTUDIANTE)</div>` +
      `<div style="height:48px;"></div>` +
      `<div style="text-align:left;">Firma: __________________________<br/>Nombre: <strong>${escapeHtml(fields.client_name || "(NOMBRE Y APELLIDO COMPLETO)")}</strong><br/>Identificación: ${escapeHtml(fields.client_id || "________________")}</div>` +
      `</div></div></body></html>`;

    return html;
  };

  const handleOpenPreview = async () => {
    let signatureDataUrl: string | null = null;
    try {
      const sRes = await fetch(`/firma_hotselling.png`);
      if (sRes.ok) {
        const blob = await sRes.blob();
        signatureDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      signatureDataUrl = null;
    }

    const html = buildContractHtml(editableFields, signatureDataUrl);
    setContractHtmlDownload(html);
    setContractHtmlDraft(html);
    setPreviewOpen(true);
  };

  const handleDownloadFromPreview = () => {
    const htmlToDownload = contractHtmlDownload || contractHtmlDraft;
    if (!htmlToDownload) return;
    const blob = new Blob([htmlToDownload], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otrosi-hotselling-lite-${clientCode}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle>Otrosí — HOTSELLING LITE</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <div className="text-sm text-muted-foreground">
                Selecciona tipo de membresía
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  variant={option === "continua" ? "default" : "outline"}
                  onClick={() => setOption("continua")}
                >
                  Membresía continua
                </Button>
                <Button
                  variant={option === "ordinaria" ? "default" : "outline"}
                  onClick={() => setOption("ordinaria")}
                >
                  Membresía ordinaria
                </Button>
              </div>
            </div>

            {option === "continua" && (
              <div>
                <div className="mt-4 border p-3 rounded bg-card text-sm text-foreground">
                  <div className="flex items-center justify-between mb-2">
                    <strong>Otrosí - HOTSELLING LITE</strong>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={handleOpenPreview}>
                        Vista previa
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label>Cliente</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={editableFields.client_name || ""}
                          onChange={(e) =>
                            setEditableFields((p) => ({
                              ...p,
                              client_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Identificación</Label>
                      <Input
                        className="w-48"
                        value={editableFields.client_id || ""}
                        onChange={(e) =>
                          setEditableFields((p) => ({
                            ...p,
                            client_id: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Domicilio</Label>
                      <Input
                        value={editableFields.client_address || ""}
                        onChange={(e) =>
                          setEditableFields((p) => ({
                            ...p,
                            client_address: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Fecha inicio</Label>
                      <Input
                        type="date"
                        value={editableFields.start_date || ""}
                        onChange={(e) =>
                          setEditableFields((p) => ({
                            ...p,
                            start_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Fecha fin</Label>
                      <Input
                        type="date"
                        value={editableFields.end_date || ""}
                        onChange={(e) =>
                          setEditableFields((p) => ({
                            ...p,
                            end_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={handleOpenPreview} disabled={!option}>
                Vista previa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PreviewDialog
        open={previewOpen}
        html={contractHtmlDraft}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownloadFromPreview}
        onChange={(v) => setContractHtmlDraft(v)}
      />
    </>
  );
}

function PreviewDialog({
  open,
  html,
  onClose,
  onDownload,
  onChange,
}: {
  open: boolean;
  html: string | null;
  onClose: () => void;
  onDownload: () => void;
  onChange: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-4xl w-full h-[88vh] overflow-auto p-2">
        <DialogHeader>
          <DialogTitle>Vista previa - Otrosí</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-2 justify-end px-4">
          <Button variant="outline" onClick={() => setEditing((s) => !s)}>
            {editing ? "Ver" : "Editar"}
          </Button>
          <Button onClick={onDownload}>Descargar</Button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className="w-full text-sm text-foreground h-[78vh] p-2">
          {editing ? (
            <textarea
              className="w-full h-full p-4 font-mono text-sm"
              value={html || ""}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <div className="w-full h-full overflow-auto">
              <iframe
                className="w-full h-full min-h-full border-0"
                srcDoc={html || "<div>No hay contenido</div>"}
                title="Vista previa Otrosí"
                sandbox="allow-same-origin allow-forms allow-scripts"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
