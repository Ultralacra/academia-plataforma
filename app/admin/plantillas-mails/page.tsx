"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2, Mail, Pencil, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createMetadata, listMetadata, updateMetadata } from "@/lib/metadata";
import { buildWelcomeEmail } from "@/lib/email-templates/welcome";
import { buildReminderEmail } from "@/lib/email-templates/reminder";
import { buildPaymentReminderEmail } from "@/lib/email-templates/payment-reminder";
import { buildPasswordChangedEmail } from "@/lib/email-templates/password-changed";

type MailTemplateKey =
  | "welcome"
  | "reminder"
  | "payment_reminder"
  | "password_changed";

type MetadataTemplatePayload = {
  key?: string;
  name?: string;
  description?: string;
  endpoint?: string;
  source?: string;
  subject?: string;
  html?: string;
  text?: string;
  headerImageUrl?: string;
  activo?: boolean | string | number;
  orden?: number | string;
};

type MailTemplateItem = {
  key: MailTemplateKey;
  id?: string | number;
  entityId: string;
  name: string;
  description: string;
  endpoint: string;
  source: string;
  subject: string;
  html: string;
  text: string;
  headerImageUrl?: string;
  activo: boolean;
  orden: number;
  fromMetadata: boolean;
};

type MailTemplateFormState = {
  key: MailTemplateKey;
  name: string;
  description: string;
  endpoint: string;
  source: string;
  subject: string;
  headerImageUrl: string;
  html: string;
  text: string;
  orden: string;
  activo: boolean;
};

type TemplateVariable = {
  key: string;
  description: string;
  example?: string;
};

const MAIL_TEMPLATES_ENTITY = "plantillas_mails";
const TEST_TEMPLATE_EMAIL = "cesaramuroc@gmail.com";

const COMMON_TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: "{{appName}}",
    description: "Nombre de la app",
    example: "Hotselling",
  },
  {
    key: "{{recipientName}}",
    description: "Nombre del destinatario",
    example: "César",
  },
  {
    key: "{{recipientEmail}}",
    description: "Email del destinatario",
    example: "user@mail.com",
  },
  {
    key: "{{portalLink}}",
    description: "URL de ingreso al portal",
    example: "https://academia.../login",
  },
  {
    key: "{{origin}}",
    description: "Origen base",
    example: "https://academia.valinkgroup.com",
  },
];

const TEMPLATE_SPECIFIC_VARIABLES: Record<MailTemplateKey, TemplateVariable[]> =
  {
    welcome: [
      {
        key: "{{recipientUsername}}",
        description: "Usuario de acceso",
        example: "user@mail.com",
      },
      {
        key: "{{recipientPassword}}",
        description: "Contraseña del usuario",
        example: "Abc123",
      },
    ],
    reminder: [],
    payment_reminder: [
      {
        key: "{{cuotaCodigo}}",
        description: "Código o nombre de cuota",
        example: "Cuota 1",
      },
      {
        key: "{{dueDate}}",
        description: "Fecha de vencimiento",
        example: "2026-03-10",
      },
      { key: "{{amount}}", description: "Monto", example: "$200" },
    ],
    password_changed: [
      {
        key: "{{recipientUsername}}",
        description: "Usuario de acceso",
        example: "user@mail.com",
      },
      {
        key: "{{recipientPassword}}",
        description: "Nueva contraseña",
        example: "Abc123",
      },
      {
        key: "{{newPassword}}",
        description: "Nueva contraseña",
        example: "Abc123",
      },
    ],
  };

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const str = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!str) return fallback;
  if (["false", "0", "no", "off"].includes(str)) return false;
  if (["true", "1", "si", "sí", "on"].includes(str)) return true;
  return fallback;
}

function toNumber(value: unknown, fallback = 9999) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function extractFirstImageSrc(html: string) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || "";
}

function normalizeHtmlDocument(html: string) {
  const raw = String(html || "").trim();
  if (!raw) return "<p></p>";
  if (/<\s*html[\s>]/i.test(raw)) return raw;
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>${raw}</body></html>`;
}

function serializeIframeDocument(doc: Document) {
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

function getDefaultTemplates(): MailTemplateItem[] {
  const welcome = buildWelcomeEmail({
    appName: "Hotselling",
    recipientName: "Alumno",
    recipientEmail: "alumno@example.com",
    recipientUsername: "alumno@example.com",
    recipientPassword: "******",
    origin: "https://academia.valinkgroup.com",
  });

  const reminder = buildReminderEmail({
    appName: "Hotselling",
    recipientName: "Alumno",
    recipientEmail: "alumno@example.com",
    origin: "https://academia.valinkgroup.com",
  });

  const paymentReminder = buildPaymentReminderEmail({
    appName: "Hotselling",
    recipientName: "Alumno",
    recipientEmail: "alumno@example.com",
    origin: "https://academia.valinkgroup.com",
    cuotaCodigo: "Cuota 1",
    dueDate: "2026-03-10",
    amount: "$200",
  });

  const passwordChanged = buildPasswordChangedEmail({
    appName: "Hotselling",
    recipientName: "Alumno",
    recipientEmail: "alumno@example.com",
    recipientUsername: "alumno@example.com",
    newPassword: "******",
    origin: "https://academia.valinkgroup.com",
  });

  return [
    {
      key: "welcome",
      entityId: "welcome",
      name: "Bienvenida con accesos",
      description: "Correo de alta al portal con usuario y contraseña.",
      endpoint: "/api/brevo/send-test (template: welcome)",
      source: "lib/email-templates/welcome.ts",
      subject: welcome.subject,
      html: welcome.html,
      text: welcome.text,
      headerImageUrl: extractFirstImageSrc(welcome.html),
      activo: true,
      orden: 1,
      fromMetadata: false,
    },
    {
      key: "reminder",
      entityId: "reminder",
      name: "Recordatorio de uso del portal",
      description: "Recordatorio para ingresar al portal y consultar soporte.",
      endpoint: "/api/brevo/send-test (template: reminder)",
      source: "lib/email-templates/reminder.ts",
      subject: reminder.subject,
      html: reminder.html,
      text: reminder.text,
      headerImageUrl: extractFirstImageSrc(reminder.html),
      activo: true,
      orden: 2,
      fromMetadata: false,
    },
    {
      key: "payment_reminder",
      entityId: "payment_reminder",
      name: "Recordatorio de pago",
      description: "Aviso de cuota próxima a vencer.",
      endpoint: "/api/brevo/send-test (template: payment_reminder)",
      source: "lib/email-templates/payment-reminder.ts",
      subject: paymentReminder.subject,
      html: paymentReminder.html,
      text: paymentReminder.text,
      headerImageUrl: extractFirstImageSrc(paymentReminder.html),
      activo: true,
      orden: 3,
      fromMetadata: false,
    },
    {
      key: "password_changed",
      entityId: "password_changed",
      name: "Cambio de contraseña",
      description: "Confirmación de contraseña actualizada en el portal.",
      endpoint: "/api/brevo/password-changed",
      source: "lib/email-templates/password-changed.ts",
      subject: passwordChanged.subject,
      html: passwordChanged.html,
      text: passwordChanged.text,
      headerImageUrl: extractFirstImageSrc(passwordChanged.html),
      activo: true,
      orden: 4,
      fromMetadata: false,
    },
  ];
}

function mergeWithMetadata(
  baseTemplates: MailTemplateItem[],
  metadataItems: any[],
): MailTemplateItem[] {
  const byKey = new Map<MailTemplateKey, MailTemplateItem>(
    baseTemplates.map((item) => [item.key, item]),
  );

  for (const rawItem of metadataItems) {
    const payload: MetadataTemplatePayload = rawItem?.payload || {};
    const idKey = String(rawItem?.entity_id || "")
      .trim()
      .toLowerCase();
    const payloadKey = String(payload?.key || "")
      .trim()
      .toLowerCase();
    const resolvedKey = (payloadKey || idKey) as MailTemplateKey;

    if (!byKey.has(resolvedKey)) continue;

    const base = byKey.get(resolvedKey)!;
    byKey.set(resolvedKey, {
      ...base,
      id: rawItem?.id,
      entityId: String(rawItem?.entity_id || "").trim() || base.entityId,
      name: String(payload?.name || "").trim() || base.name,
      description:
        String(payload?.description || "").trim() || base.description,
      endpoint: String(payload?.endpoint || "").trim() || base.endpoint,
      source: String(payload?.source || "").trim() || base.source,
      subject: String(payload?.subject || "").trim() || base.subject,
      html: String(payload?.html || "").trim() || base.html,
      text: String(payload?.text || "").trim() || base.text,
      headerImageUrl:
        String(payload?.headerImageUrl || "").trim() ||
        extractFirstImageSrc(String(payload?.html || "")) ||
        base.headerImageUrl,
      activo: toBoolean(payload?.activo, true),
      orden: toNumber(payload?.orden, base.orden),
      fromMetadata: true,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => a.orden - b.orden);
}

function toFormState(item: MailTemplateItem): MailTemplateFormState {
  return {
    key: item.key,
    name: item.name,
    description: item.description,
    endpoint: item.endpoint,
    source: item.source,
    subject: item.subject,
    headerImageUrl: item.headerImageUrl || "",
    html: item.html,
    text: item.text,
    orden: String(item.orden),
    activo: item.activo,
  };
}

function buildMetadataPayload(
  form: MailTemplateFormState,
): MetadataTemplatePayload {
  return {
    key: form.key,
    name: form.name.trim(),
    description: form.description.trim(),
    endpoint: form.endpoint.trim(),
    source: form.source.trim(),
    subject: form.subject.trim(),
    html: form.html,
    text: form.text,
    headerImageUrl: form.headerImageUrl.trim(),
    orden: toNumber(form.orden, 9999),
    activo: form.activo,
  };
}

export default function PlantillasMailsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTestKey, setSendingTestKey] = useState<MailTemplateKey | null>(
    null,
  );
  const [templates, setTemplates] = useState<MailTemplateItem[]>(
    getDefaultTemplates(),
  );
  const [selectedKey, setSelectedKey] = useState<MailTemplateKey>("welcome");
  const [openEditor, setOpenEditor] = useState(false);
  const [form, setForm] = useState<MailTemplateFormState | null>(null);
  const [imageErrorByKey, setImageErrorByKey] = useState<
    Record<string, boolean>
  >({});
  const [editorTab, setEditorTab] = useState<"visual" | "html" | "text">(
    "visual",
  );
  const visualIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [visualHtmlDoc, setVisualHtmlDoc] = useState<string>("<p></p>");

  const activeTemplates = useMemo(
    () => templates.filter((item) => item.activo),
    [templates],
  );

  const selectedTemplate = useMemo(() => {
    const inActive = activeTemplates.find((item) => item.key === selectedKey);
    if (inActive) return inActive;
    return activeTemplates[0] || templates[0] || null;
  }, [activeTemplates, selectedKey, templates]);

  const selectedTemplateVariables = useMemo(() => {
    if (!selectedTemplate) return COMMON_TEMPLATE_VARIABLES;
    return [
      ...COMMON_TEMPLATE_VARIABLES,
      ...(TEMPLATE_SPECIFIC_VARIABLES[selectedTemplate.key] || []),
    ];
  }, [selectedTemplate]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMetadata<any>();
      const metadataItems = (res.items || []).filter(
        (item) => String(item?.entity || "") === MAIL_TEMPLATES_ENTITY,
      );
      const merged = mergeWithMetadata(getDefaultTemplates(), metadataItems);
      setTemplates(merged);
      if (merged.length) {
        setSelectedKey((prev) => {
          const exists = merged.some(
            (item) => item.key === prev && item.activo,
          );
          return exists
            ? prev
            : merged.find((item) => item.activo)?.key || merged[0].key;
        });
      }
    } catch (error: any) {
      const fallback = getDefaultTemplates();
      setTemplates(fallback);
      setSelectedKey(fallback[0]?.key || "welcome");
      toast({
        title: "No se pudo consultar metadata",
        description: String(error?.message || "Mostrando plantillas base."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function openEditDialog() {
    if (!selectedTemplate) return;
    setForm(toFormState(selectedTemplate));
    setEditorTab("visual");
    setVisualHtmlDoc(normalizeHtmlDocument(selectedTemplate.html));
    setOpenEditor(true);
  }

  function applyEditorCommand(command: string, value?: string) {
    const iframe = visualIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    doc.body?.focus();
    doc.execCommand(command, false, value);
    const html = serializeIframeDocument(doc);
    setForm((prev) =>
      prev
        ? {
            ...prev,
            html,
          }
        : prev,
    );
  }

  function handleInsertLink() {
    const link = window.prompt("Pega la URL del enlace:");
    if (!link) return;
    applyEditorCommand("createLink", link.trim());
  }

  function handleInsertImage() {
    const imageUrl = window.prompt("Pega la URL de la imagen:");
    if (!imageUrl) return;
    applyEditorCommand("insertImage", imageUrl.trim());
  }

  async function saveTemplate() {
    if (!selectedTemplate || !form) return;

    if (!form.name.trim() || !form.subject.trim() || !form.html.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Nombre, asunto y HTML son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = buildMetadataPayload(form);
      if (selectedTemplate.id != null) {
        await updateMetadata(selectedTemplate.id, {
          id: selectedTemplate.id,
          entity: MAIL_TEMPLATES_ENTITY,
          entity_id: selectedTemplate.entityId,
          payload,
        } as any);
      } else {
        await createMetadata({
          entity: MAIL_TEMPLATES_ENTITY,
          entity_id: selectedTemplate.key,
          payload,
        });
      }

      toast({ title: "Plantilla guardada" });
      setOpenEditor(false);
      await loadTemplates();
    } catch (error: any) {
      toast({
        title: "No se pudo guardar",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function sendTemplateTest(template: MailTemplateItem) {
    setSendingTestKey(template.key);
    try {
      const res = await fetch("/api/brevo/send-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          to: TEST_TEMPLATE_EMAIL,
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json?.status || "") !== "success") {
        throw new Error(String(json?.message || "No se pudo enviar la prueba"));
      }

      toast({
        title: "Prueba enviada",
        description: `Se envió ${template.name} a ${TEST_TEMPLATE_EMAIL}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error enviando prueba",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setSendingTestKey(null);
    }
  }

  useEffect(() => {
    if (!openEditor || !form) return;
    if (editorTab !== "visual") return;
    setVisualHtmlDoc(normalizeHtmlDocument(form.html));
  }, [openEditor, editorTab, form?.key]);

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <div className="space-y-5 max-w-full overflow-x-hidden pb-4">
          <div className="rounded-xl border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">
                    Gestión de plantillas de mails
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Edición dinámica con metadata (entidad:{" "}
                    {MAIL_TEMPLATES_ENTITY}).
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline">
                      Total: {templates.length} plantillas
                    </Badge>
                    <Badge variant="secondary">
                      Activas: {activeTemplates.length}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={openEditDialog}
                className="gap-2"
                disabled={!selectedTemplate || loading}
              >
                <Pencil className="h-4 w-4" />
                Editar plantilla seleccionada
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={
                  !selectedTemplate || loading || sendingTestKey !== null
                }
                onClick={() =>
                  selectedTemplate && sendTemplateTest(selectedTemplate)
                }
              >
                {selectedTemplate && sendingTestKey === selectedTemplate.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar prueba a {TEST_TEMPLATE_EMAIL}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-card p-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeTemplates.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              No hay plantillas activas para mostrar.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Plantillas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeTemplates.map((item) => {
                    const isSelected = selectedTemplate?.key === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedKey(item.key)}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{item.name}</p>
                          <Badge
                            variant={
                              item.fromMetadata ? "default" : "secondary"
                            }
                          >
                            {item.fromMetadata ? "metadata" : "base"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Orden: {item.orden}
                        </p>
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={sendingTestKey !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              sendTemplateTest(item);
                            }}
                          >
                            {sendingTestKey === item.key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1.5">Probar</span>
                          </Button>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {selectedTemplate ? (
                <Card className="rounded-xl">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl">
                        {selectedTemplate.name}
                      </CardTitle>
                      <Badge
                        variant={
                          selectedTemplate.fromMetadata
                            ? "default"
                            : "secondary"
                        }
                      >
                        {selectedTemplate.fromMetadata ? "metadata" : "base"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Endpoint
                        </p>
                        <p className="text-sm font-medium break-all mt-1">
                          {selectedTemplate.endpoint}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Archivo fuente
                        </p>
                        <p className="text-sm font-medium break-all mt-1">
                          {selectedTemplate.source}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Asunto</p>
                      <p className="text-sm font-medium mt-1">
                        {selectedTemplate.subject}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Variables disponibles para esta plantilla
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplateVariables.map((variable) => (
                          <Badge
                            key={`${selectedTemplate.key}-${variable.key}`}
                            variant="outline"
                          >
                            {variable.key}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {selectedTemplateVariables.map((variable) => (
                          <p
                            key={`${selectedTemplate.key}-${variable.key}-desc`}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-medium text-foreground">
                              {variable.key}
                            </span>
                            : {variable.description}
                            {variable.example
                              ? ` (ej: ${variable.example})`
                              : ""}
                          </p>
                        ))}
                      </div>
                    </div>

                    <Tabs defaultValue="render" className="w-full">
                      <TabsList className="h-10 w-full justify-start rounded-lg p-1">
                        <TabsTrigger value="render">
                          Vista real del mail
                        </TabsTrigger>
                        <TabsTrigger value="html">HTML fuente</TabsTrigger>
                        <TabsTrigger value="text">Texto plano</TabsTrigger>
                      </TabsList>

                      <TabsContent value="render" className="mt-3 space-y-3">
                        {selectedTemplate.headerImageUrl ? (
                          <div className="rounded-lg border p-3 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Imagen principal detectada
                            </p>
                            <p className="text-xs break-all text-muted-foreground">
                              {selectedTemplate.headerImageUrl}
                            </p>
                            <img
                              src={selectedTemplate.headerImageUrl}
                              alt={`Imagen de ${selectedTemplate.name}`}
                              className="w-full max-h-56 object-cover rounded-md border"
                              onError={() =>
                                setImageErrorByKey((prev) => ({
                                  ...prev,
                                  [selectedTemplate.key]: true,
                                }))
                              }
                            />
                            {imageErrorByKey[selectedTemplate.key] ? (
                              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <span>
                                  Esta imagen puede estar bloqueada por
                                  políticas del host (hotlink/CORS) en
                                  navegador, aunque la URL responda.
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="rounded-lg border overflow-hidden bg-background">
                          <iframe
                            title={`preview-${selectedTemplate.key}`}
                            srcDoc={selectedTemplate.html}
                            className="w-full h-[620px]"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="html" className="mt-3">
                        <pre className="rounded-lg border p-3 bg-background text-xs whitespace-pre-wrap break-words max-h-[620px] overflow-auto">
                          {selectedTemplate.html}
                        </pre>
                      </TabsContent>

                      <TabsContent value="text" className="mt-3">
                        <pre className="rounded-lg border p-3 bg-background text-xs whitespace-pre-wrap break-words max-h-[620px] overflow-auto">
                          {selectedTemplate.text}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </div>

        <Dialog open={openEditor} onOpenChange={setOpenEditor}>
          <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Editar plantilla de mail</DialogTitle>
              <DialogDescription>
                Los cambios se guardan en metadata y reemplazan la versión base.
              </DialogDescription>
            </DialogHeader>

            {form ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Clave</Label>
                    <Input value={form.key} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Orden</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.orden}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, orden: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5 flex items-end justify-between rounded-lg border p-3">
                    <Label htmlFor="plantilla-activa">Activa</Label>
                    <Switch
                      id="plantilla-activa"
                      checked={form.activo}
                      onCheckedChange={(checked) =>
                        setForm((prev) =>
                          prev ? { ...prev, activo: checked } : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nombre</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Asunto</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, subject: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Descripción</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev,
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Endpoint</Label>
                    <Input
                      value={form.endpoint}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, endpoint: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Archivo fuente</Label>
                    <Input
                      value={form.source}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, source: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>URL imagen principal</Label>
                  <Input
                    value={form.headerImageUrl}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, headerImageUrl: e.target.value }
                          : prev,
                      )
                    }
                  />
                </div>

                <Tabs
                  value={editorTab}
                  onValueChange={(value) =>
                    setEditorTab(value as "visual" | "html" | "text")
                  }
                >
                  <TabsList className="h-10 w-full justify-start rounded-lg p-1">
                    <TabsTrigger value="visual">Editor visual</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="text">Texto plano</TabsTrigger>
                  </TabsList>

                  <TabsContent value="visual" className="mt-3 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Modo no técnico: selecciona texto y aplica formato con los
                      botones.
                    </p>

                    <div className="flex flex-wrap gap-2 rounded-lg border p-2 bg-muted/30">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyEditorCommand("bold")}
                      >
                        Negrita
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyEditorCommand("italic")}
                      >
                        Cursiva
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyEditorCommand("underline")}
                      >
                        Subrayado
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyEditorCommand("formatBlock", "h2")}
                      >
                        Título
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          applyEditorCommand("insertUnorderedList")
                        }
                      >
                        Lista
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleInsertLink}
                      >
                        Enlace
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleInsertImage}
                      >
                        Imagen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyEditorCommand("removeFormat")}
                      >
                        Limpiar formato
                      </Button>
                    </div>

                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Inserta variables dinámicas (se reemplazan al enviar)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplateVariables.map((variable) => (
                          <Button
                            key={`insert-${variable.key}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              applyEditorCommand("insertText", variable.key)
                            }
                          >
                            {variable.key}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border overflow-hidden bg-background">
                      <iframe
                        ref={visualIframeRef}
                        title="editor-visual-mail"
                        srcDoc={visualHtmlDoc}
                        className="w-full h-[520px]"
                        onLoad={() => {
                          const iframe = visualIframeRef.current;
                          const doc = iframe?.contentDocument;
                          if (!doc) return;

                          doc.designMode = "on";
                          doc.body.setAttribute(
                            "style",
                            "margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;",
                          );

                          const sync = () => {
                            const html = serializeIframeDocument(doc);
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    html,
                                  }
                                : prev,
                            );
                          };

                          doc.addEventListener("input", sync);
                          doc.addEventListener("keyup", sync);
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="html" className="mt-3 space-y-1.5">
                    <Label>HTML</Label>
                    <Textarea
                      value={form.html}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, html: e.target.value } : prev,
                        )
                      }
                      rows={14}
                    />
                  </TabsContent>

                  <TabsContent value="text" className="mt-3 space-y-1.5">
                    <Label>Texto plano</Label>
                    <Textarea
                      value={form.text}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, text: e.target.value } : prev,
                        )
                      }
                      rows={8}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEditor(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={saveTemplate}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
