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
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  CloudUpload,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import { apiFetch, buildUrl } from "@/lib/api-config";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { useToast } from "@/components/ui/use-toast";
import { createMetadata, listMetadata, updateMetadata } from "@/lib/metadata";
import { getWelcomeEmailSource } from "@/lib/email-templates/welcome";
import { getReminderEmailSource } from "@/lib/email-templates/reminder";
import { getPaymentReminderEmailSource } from "@/lib/email-templates/payment-reminder";
import { getPasswordChangedEmailSource } from "@/lib/email-templates/password-changed";
import {
  getPaymentFollowupSource,
  PAYMENT_FOLLOWUP_TEMPLATES,
  DEFAULT_PAYMENT_LINKS_HTML,
} from "@/lib/email-templates/payment-followup";
import {
  getAccessExpirySource,
  ACCESS_EXPIRY_TEMPLATES,
  DEFAULT_RENEWAL_LINK,
} from "@/lib/email-templates/access-expiry";
import {
  getOnboardingWorkflowSource,
  ONBOARDING_WORKFLOW_TEMPLATES,
} from "@/lib/email-templates/onboarding-workflow";
import {
  getStarterWorkflowSource,
  STARTER_WORKFLOW_TEMPLATES,
} from "@/lib/email-templates/starter-workflow";
import {
  getContractExpirySource,
  CONTRACT_EXPIRY_TEMPLATES,
} from "@/lib/email-templates/contract-expiry";
import {
  getRescateSource,
  RESCATE_TEMPLATES,
} from "@/lib/email-templates/rescate-estudiante";

type MailTemplateKey =
  | "welcome"
  | "reminder"
  | "payment_reminder"
  | "password_changed"
  | "pago_dia_m3"
  | "pago_dia_m1"
  | "pago_dia_0"
  | "pago_dia_p2"
  | "pago_dia_p4"
  | "pago_dia_p6"
  | "acceso_dia_m5"
  | "acceso_dia_m3"
  | "acceso_dia_0"
  | "acceso_dia_p1"
  | "acceso_dia_p5"
  | "onboarding_bienvenida"
  | "onboarding_acceso"
  | "onboarding_mentalidad"
  | "onboarding_modulo0"
  | "onboarding_cierre"
  | "starter_bienvenida"
  | "starter_acceso"
  | "starter_metodologia"
  | "starter_cierre"
  | "contrato_por_vencer_15d"
  | "contrato_completado_5d"
  | "membresia_por_vencer_10d"
  | "rescate_fase1_email1"
  | "rescate_fase1_followup"
  | "rescate_fase2_email1"
  | "rescate_fase2_followup"
  | "rescate_fase3_email1"
  | "rescate_fase3_followup"
  | "rescate_fase5_email1"
  | "rescate_fase5_followup";

type TemplateCategory =
  | "general"
  | "cobros"
  | "accesos"
  | "contrasena"
  | "onboarding"
  | "starter"
  | "rescate"
  | "piloto_ia";

const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "cobros", label: "Cobros" },
  { id: "accesos", label: "Accesos" },
  { id: "contrasena", label: "Contraseña" },
  { id: "onboarding", label: "Workflow Correos - Onboarding" },
  { id: "starter", label: "Workflow Correos - Starter" },
  { id: "rescate", label: "Rescate del Estudiante" },
  { id: "piloto_ia", label: "🤖 Piloto IA ATC" },
];

const TEMPLATE_CATEGORY_MAP: Record<MailTemplateKey, TemplateCategory> = {
  welcome: "general",
  reminder: "general",
  payment_reminder: "cobros",
  password_changed: "contrasena",
  pago_dia_m3: "cobros",
  pago_dia_m1: "cobros",
  pago_dia_0: "cobros",
  pago_dia_p2: "cobros",
  pago_dia_p4: "cobros",
  pago_dia_p6: "cobros",
  acceso_dia_m5: "accesos",
  acceso_dia_m3: "accesos",
  acceso_dia_0: "accesos",
  acceso_dia_p1: "accesos",
  acceso_dia_p5: "accesos",
  onboarding_bienvenida: "onboarding",
  onboarding_acceso: "onboarding",
  onboarding_mentalidad: "onboarding",
  onboarding_modulo0: "onboarding",
  onboarding_cierre: "onboarding",
  starter_bienvenida: "starter",
  starter_acceso: "starter",
  starter_metodologia: "starter",
  starter_cierre: "starter",
  contrato_por_vencer_15d: "accesos",
  contrato_completado_5d: "accesos",
  membresia_por_vencer_10d: "accesos",
  rescate_fase1_email1: "rescate",
  rescate_fase1_followup: "rescate",
  rescate_fase2_email1: "rescate",
  rescate_fase2_followup: "rescate",
  rescate_fase3_email1: "rescate",
  rescate_fase3_followup: "rescate",
  rescate_fase5_email1: "rescate",
  rescate_fase5_followup: "rescate",
};

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
  /** Plantilla pausada — no se puede probar ni enviar desde aquí */
  disabled?: boolean;
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

type PilotoAlumno = {
  email: string;
  nombre: string;
  status?: string;
  stage?: string;
  tag?: string;
};

type PilotoInvitado = {
  email: string;
  nombre: string;
  invitado_en: string;
};

type PilotoAceptado = {
  email: string;
  nombre: string;
  aceptado_en: string;
};

type PilotoMetadataPayload = {
  version: 1;
  invitados: PilotoInvitado[];
  aceptados: PilotoAceptado[];
};

const MAIL_TEMPLATES_ENTITY = "plantillas_mails";
const ALL_TEMPLATES_ENTITY_ID = "all_templates";
const TEST_TEMPLATE_EMAIL = "cesaramuroc@gmail.com";
const PILOTO_ENTITY = "piloto_ia_v1";
const PILOTO_ENTITY_ID = "datos";

const NO_TAG_FILTER = "Sin tag";
const NO_STATE = "Sin estado";
const NO_STAGE = "Sin fase";

function matchesSelectedValue(
  selected: string[],
  actualValue: string,
  emptyToken?: string,
) {
  if (selected.length === 0) return true;
  return selected.some((item) => {
    if (emptyToken && item === emptyToken) return !actualValue;
    return item === actualValue;
  });
}

function normalizeTagKey(tag?: string | null) {
  return String(tag ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function canonicalTagLabel(tag?: string | null) {
  const normalized = normalizeTagKey(tag);
  if (!normalized) return "";
  if (normalized === "hotselling foundation") return "Hotselling Starter";
  return String(tag ?? "").trim();
}

function getUniqueTags(students: PilotoAlumno[]) {
  const byKey = new Map<string, string>();
  for (const student of students) {
    const normalized = normalizeTagKey(student.tag);
    if (!normalized) continue;
    if (!byKey.has(normalized)) {
      byKey.set(normalized, canonicalTagLabel(student.tag));
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

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

const PAYMENT_FOLLOWUP_VARS: TemplateVariable[] = [
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
  {
    key: "{{amount}}",
    description: "Monto",
    example: "$200",
  },
  {
    key: "{{paymentLinks}}",
    description: "Bloque HTML con enlaces de pago",
    example: "(enlaces de pago)",
  },
];

const ACCESS_EXPIRY_VARS: TemplateVariable[] = [
  {
    key: "{{expiryDate}}",
    description: "Fecha de vencimiento del acceso",
    example: "15 de marzo de 2026",
  },
  {
    key: "{{renewalLink}}",
    description: "Enlace de renovación",
    example: DEFAULT_RENEWAL_LINK,
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
    pago_dia_m3: PAYMENT_FOLLOWUP_VARS,
    pago_dia_m1: PAYMENT_FOLLOWUP_VARS,
    pago_dia_0: PAYMENT_FOLLOWUP_VARS,
    pago_dia_p2: PAYMENT_FOLLOWUP_VARS,
    pago_dia_p4: PAYMENT_FOLLOWUP_VARS,
    pago_dia_p6: PAYMENT_FOLLOWUP_VARS,
    acceso_dia_m5: ACCESS_EXPIRY_VARS,
    acceso_dia_m3: ACCESS_EXPIRY_VARS,
    acceso_dia_0: ACCESS_EXPIRY_VARS,
    acceso_dia_p1: ACCESS_EXPIRY_VARS,
    acceso_dia_p5: ACCESS_EXPIRY_VARS,
    onboarding_bienvenida: [],
    onboarding_acceso: [
      {
        key: "{{recipientUsername}}",
        description: "Usuario de acceso",
        example: "user@mail.com",
      },
      {
        key: "{{recipientPassword}}",
        description: "Contraseña inicial",
        example: "Abc123",
      },
      {
        key: "{{coachName}}",
        description: "Nombre del coach asignado (opcional)",
        example: "Carlos López",
      },
      {
        key: "{{coachEmail}}",
        description: "Email del coach asignado (opcional)",
        example: "coach@hotselling.com",
      },
    ],
    onboarding_mentalidad: [],
    onboarding_modulo0: [],
    onboarding_cierre: [],
    starter_bienvenida: [],
    starter_acceso: [
      {
        key: "{{skoolLink}}",
        description: "Enlace de acceso a Skool",
        example: "https://www.skool.com/hotselling",
      },
      {
        key: "{{notionLink}}",
        description: "Enlace de acceso a Notion",
        example: "https://www.notion.so/hotselling",
      },
    ],
    starter_metodologia: [],
    starter_cierre: [],
    contrato_por_vencer_15d: [],
    contrato_completado_5d: [],
    membresia_por_vencer_10d: [],
    rescate_fase1_email1: [],
    rescate_fase1_followup: [],
    rescate_fase2_email1: [],
    rescate_fase2_followup: [],
    rescate_fase3_email1: [],
    rescate_fase3_followup: [],
    rescate_fase5_email1: [],
    rescate_fase5_followup: [],
  };

/* ── Interpolación de variables para preview / test ────────────── */

function interpolateVars(input: string, vars: Record<string, string>): string {
  return String(input || "").replace(
    /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,
    (_, key) => vars[key] ?? "",
  );
}

function getExampleVarsForTemplate(
  key: MailTemplateKey,
): Record<string, string> {
  const allVars = [
    ...COMMON_TEMPLATE_VARIABLES,
    ...(TEMPLATE_SPECIFIC_VARIABLES[key] || []),
  ];
  const map: Record<string, string> = {};
  for (const v of allVars) {
    const name = v.key.replace(/^\{\{|\}\}$/g, "");
    // Para paymentLinks usar el bloque HTML real en vez de texto plano
    if (name === "paymentLinks") {
      map[name] = DEFAULT_PAYMENT_LINKS_HTML;
    } else if (name === "renewalLink") {
      map[name] = DEFAULT_RENEWAL_LINK;
    } else {
      map[name] = v.example || "";
    }
  }
  return map;
}

function renderTemplatePreview(template: MailTemplateItem): string {
  const vars = getExampleVarsForTemplate(template.key);
  return interpolateVars(template.html, vars);
}

function renderTextPreview(template: MailTemplateItem): string {
  const vars = getExampleVarsForTemplate(template.key);
  return interpolateVars(template.text, vars);
}

function renderSubjectPreview(template: MailTemplateItem): string {
  const vars = getExampleVarsForTemplate(template.key);
  return interpolateVars(template.subject, vars);
}

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
  const welcomeSource = getWelcomeEmailSource();
  const reminderSource = getReminderEmailSource();
  const paymentReminderSource = getPaymentReminderEmailSource();
  const passwordChangedSource = getPasswordChangedEmailSource();

  const base: MailTemplateItem[] = [
    {
      key: "welcome",
      entityId: "welcome",
      name: "Bienvenida con accesos",
      description: "Correo de alta al portal con usuario y contraseña.",
      endpoint: "/api/brevo/send-test (template: welcome)",
      source: "lib/email-templates/welcome.ts",
      subject: welcomeSource.subject,
      html: welcomeSource.html,
      text: welcomeSource.text,
      headerImageUrl: extractFirstImageSrc(welcomeSource.html),
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
      subject: reminderSource.subject,
      html: reminderSource.html,
      text: reminderSource.text,
      headerImageUrl: extractFirstImageSrc(reminderSource.html),
      activo: true,
      orden: 2,
      fromMetadata: false,
    },
    {
      key: "payment_reminder",
      entityId: "payment_reminder",
      name: "Recordatorio de pago (genérico)",
      description: "Aviso genérico de cuota próxima a vencer.",
      endpoint: "/api/brevo/send-test (template: payment_reminder)",
      source: "lib/email-templates/payment-reminder.ts",
      subject: paymentReminderSource.subject,
      html: paymentReminderSource.html,
      text: paymentReminderSource.text,
      headerImageUrl: extractFirstImageSrc(paymentReminderSource.html),
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
      subject: passwordChangedSource.subject,
      html: passwordChangedSource.html,
      text: passwordChangedSource.text,
      headerImageUrl: extractFirstImageSrc(passwordChangedSource.html),
      activo: true,
      orden: 4,
      fromMetadata: false,
    },
  ];

  // Agregar las 6 plantillas de seguimiento de pago
  for (let i = 0; i < PAYMENT_FOLLOWUP_TEMPLATES.length; i++) {
    const meta = PAYMENT_FOLLOWUP_TEMPLATES[i];
    const src = getPaymentFollowupSource(meta.day);
    base.push({
      key: meta.key as MailTemplateKey,
      entityId: meta.key,
      name: meta.name,
      description: meta.description,
      endpoint: "/api/brevo/send-preview",
      source: "lib/email-templates/payment-followup.ts",
      subject: src.subject,
      html: src.html,
      text: src.text,
      headerImageUrl: extractFirstImageSrc(src.html),
      activo: true,
      orden: 5 + i,
      fromMetadata: false,
    });
  }

  // Agregar las 5 plantillas de vencimiento de acceso (pausadas — reemplazadas por contract-expiry)
  for (let i = 0; i < ACCESS_EXPIRY_TEMPLATES.length; i++) {
    const meta = ACCESS_EXPIRY_TEMPLATES[i];
    const src = getAccessExpirySource(meta.day);
    base.push({
      key: meta.key as MailTemplateKey,
      entityId: meta.key,
      name: meta.name,
      description: meta.description,
      endpoint: "/api/brevo/send-preview",
      source: "lib/email-templates/access-expiry.ts",
      subject: src.subject,
      html: src.html,
      text: src.text,
      headerImageUrl: extractFirstImageSrc(src.html),
      activo: true,
      orden: 11 + i,
      fromMetadata: false,
      disabled: true,
    });
  }

  // Agregar las 3 nuevas plantillas de vencimiento de contrato/membresía
  for (let i = 0; i < CONTRACT_EXPIRY_TEMPLATES.length; i++) {
    const meta = CONTRACT_EXPIRY_TEMPLATES[i];
    const src = getContractExpirySource(meta.key);
    base.push({
      key: meta.key as MailTemplateKey,
      entityId: meta.key,
      name: meta.name,
      description: meta.description,
      endpoint: "/api/brevo/send-contract-expiry",
      source: "lib/email-templates/contract-expiry.ts",
      subject: src.subject,
      html: src.html,
      text: src.text,
      headerImageUrl: extractFirstImageSrc(src.html),
      activo: true,
      orden: 16 + i,
      fromMetadata: false,
      disabled: false,
    });
  }

  // Agregar las 5 plantillas de workflow de onboarding
  for (let i = 0; i < ONBOARDING_WORKFLOW_TEMPLATES.length; i++) {
    const meta = ONBOARDING_WORKFLOW_TEMPLATES[i];
    const src = getOnboardingWorkflowSource(meta.step);
    base.push({
      key: meta.key as MailTemplateKey,
      entityId: meta.key,
      name: meta.name,
      description: meta.description,
      endpoint: "/api/brevo/send-preview",
      source: "lib/email-templates/onboarding-workflow.ts",
      subject: src.subject,
      html: src.html,
      text: src.text,
      headerImageUrl: extractFirstImageSrc(src.html),
      activo: true,
      orden: 19 + i,
      fromMetadata: false,
    });
  }

  // Agregar las 4 plantillas de workflow Starter
  for (let i = 0; i < STARTER_WORKFLOW_TEMPLATES.length; i++) {
    const meta = STARTER_WORKFLOW_TEMPLATES[i];
    const src = getStarterWorkflowSource(meta.step);
    base.push({
      key: meta.key as MailTemplateKey,
      entityId: meta.key,
      name: meta.name,
      description: meta.description,
      endpoint: "/api/brevo/send-preview",
      source: "lib/email-templates/starter-workflow.ts",
      subject: src.subject,
      html: src.html,
      text: src.text,
      headerImageUrl: extractFirstImageSrc(src.html),
      activo: true,
      orden: 24 + i,
      fromMetadata: false,
    });
  }

  // Agregar las 8 plantillas de Rescate del Estudiante (Accountability)
  for (let i = 0; i < RESCATE_TEMPLATES.length; i++) {
    const meta = RESCATE_TEMPLATES[i];
    const src = getRescateSource(meta.step);
    base.push({
      key: meta.key as MailTemplateKey,
      entityId: meta.key,
      name: meta.name,
      description: meta.description,
      endpoint: "/api/brevo/send-rescate",
      source: "lib/email-templates/rescate-estudiante.ts",
      subject: src.subject,
      html: src.html,
      text: src.text,
      headerImageUrl: extractFirstImageSrc(src.html),
      activo: true,
      orden: 28 + i,
      fromMetadata: false,
    });
  }

  return base;
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

/** Merge usando el payload.templates del registro unificado */
function mergeWithSingleRecord(
  baseTemplates: MailTemplateItem[],
  templatesPayload: Record<string, MetadataTemplatePayload>,
): MailTemplateItem[] {
  return baseTemplates
    .map((base) => {
      const payload = templatesPayload[base.key];
      if (!payload) return base;

      return {
        ...base,
        name: String(payload.name || "").trim() || base.name,
        description:
          String(payload.description || "").trim() || base.description,
        endpoint: String(payload.endpoint || "").trim() || base.endpoint,
        source: String(payload.source || "").trim() || base.source,
        subject: String(payload.subject || "").trim() || base.subject,
        html: String(payload.html || "").trim() || base.html,
        text: String(payload.text || "").trim() || base.text,
        headerImageUrl:
          String(payload.headerImageUrl || "").trim() ||
          extractFirstImageSrc(String(payload.html || "")) ||
          base.headerImageUrl,
        activo: toBoolean(payload.activo, true),
        orden: toNumber(payload.orden, base.orden),
        fromMetadata: true,
      };
    })
    .sort((a, b) => a.orden - b.orden);
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTestKey, setSendingTestKey] = useState<MailTemplateKey | null>(
    null,
  );
  const [templates, setTemplates] = useState<MailTemplateItem[]>(
    getDefaultTemplates(),
  );
  const [selectedKey, setSelectedKey] = useState<MailTemplateKey>("welcome");
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateCategory>("general");
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

  // ── Single metadata record state ──
  const [metaRecordId, setMetaRecordId] = useState<string | number | null>(
    null,
  );
  const [syncingKey, setSyncingKey] = useState<MailTemplateKey | null>(null);
  const [creatingMeta, setCreatingMeta] = useState(false);

  // ── Piloto IA ATC state ──
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [students, setStudents] = useState<PilotoAlumno[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [sendingPilotInvites, setSendingPilotInvites] = useState(false);
  const [pilotMetaLoading, setPilotMetaLoading] = useState(false);
  const [filterState, setFilterState] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterAcceptedStatus, setFilterAcceptedStatus] = useState("");
  const [testEmail, setTestEmail] = useState(TEST_TEMPLATE_EMAIL);
  const [pilotTestEmail, setPilotTestEmail] = useState(TEST_TEMPLATE_EMAIL);
  const [sendingPilotTest, setSendingPilotTest] = useState(false);
  const [pilotMeta, setPilotMeta] = useState<PilotoMetadataPayload>({
    version: 1,
    invitados: [],
    aceptados: [],
  });
  const isPilotCategory = selectedCategory === "piloto_ia";
  const role = String(user?.role ?? user?.tipo ?? "")
    .trim()
    .toLowerCase();
  const isAdminUser = role === "admin";

  const pilotProgress = useMemo(() => {
    const invited = pilotMeta.invitados.length;
    const accepted = pilotMeta.aceptados.length;
    if (invited === 0) return 0;
    return Math.round((accepted / invited) * 100);
  }, [pilotMeta]);

  const consentUrl = useMemo(() => {
    return `${getPublicAppOrigin()}/consentimiento-piloto`;
  }, []);

  const selectedStudents = useMemo(() => {
    const selectedSet = new Set(selectedEmails);
    return students.filter((s) => selectedSet.has(s.email));
  }, [students, selectedEmails]);

  const uniqueStates = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.status).filter(Boolean)),
      ).sort() as string[],
    [students],
  );

  const uniqueStages = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.stage).filter(Boolean)),
      ).sort() as string[],
    [students],
  );

  const uniqueTags = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.tag).filter(Boolean)),
      ).sort() as string[],
    [students],
  );

  const filteredStudents = useMemo(() => {
    let result = students;

    // 1. Search filter
    const q = studentsSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((s) => {
        const nombre = String(s.nombre || "").toLowerCase();
        const email = String(s.email || "").toLowerCase();
        const status = String(s.status || "").toLowerCase();
        const stage = String(s.stage || "").toLowerCase();
        return (
          nombre.includes(q) ||
          email.includes(q) ||
          status.includes(q) ||
          stage.includes(q)
        );
      });
    }

    // 2. State filter
    if (filterState) {
      result = result.filter((s) => s.status === filterState);
    }

    // 3. Stage filter
    if (filterStage) {
      result = result.filter((s) => s.stage === filterStage);
    }

    // 4. Tag filter
    if (filterTag) {
      result = result.filter((s) => s.tag === filterTag);
    }

    return result;
  }, [students, studentsSearch, filterState, filterStage, filterTag]);

  // Enrich accepted students with status/stage/tag from students list
  const enrichedAccepted = useMemo(() => {
    const studentMap = new Map(students.map((s) => [s.email, s]));
    return pilotMeta.aceptados.map((a) => {
      const student = studentMap.get(a.email);
      return {
        ...a,
        status: student?.status || undefined,
        stage: student?.stage || undefined,
        tag: student?.tag || undefined,
      };
    });
  }, [pilotMeta.aceptados, students]);

  const acceptedByStatus = useMemo(() => {
    const map = new Map<string, typeof enrichedAccepted>();
    for (const item of enrichedAccepted) {
      const key = item.status || "Sin estado";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [enrichedAccepted]);

  const acceptedStatuses = useMemo(
    () => Array.from(acceptedByStatus.keys()).sort(),
    [acceptedByStatus],
  );

  const filteredAccepted = useMemo(() => {
    if (!filterAcceptedStatus) return enrichedAccepted;
    return enrichedAccepted.filter(
      (a) => (a.status || "Sin estado") === filterAcceptedStatus,
    );
  }, [enrichedAccepted, filterAcceptedStatus]);

  const activeTemplates = useMemo(
    () => templates.filter((item) => item.activo),
    [templates],
  );

  const categoryTemplates = useMemo(
    () =>
      activeTemplates.filter(
        (item) => TEMPLATE_CATEGORY_MAP[item.key] === selectedCategory,
      ),
    [activeTemplates, selectedCategory],
  );

  const selectedTemplate = useMemo(() => {
    const inActive = activeTemplates.find((item) => item.key === selectedKey);
    if (inActive) return inActive;
    // Fallback al primer item de la categoría activa
    return categoryTemplates[0] || activeTemplates[0] || templates[0] || null;
  }, [activeTemplates, categoryTemplates, selectedKey, templates]);

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
      const allItems = res.items || [];

      // Buscar registro unificado
      const allRecord = allItems.find(
        (item: any) =>
          String(item?.entity || "") === MAIL_TEMPLATES_ENTITY &&
          String(item?.entity_id || "").toLowerCase() ===
            ALL_TEMPLATES_ENTITY_ID,
      );

      let merged: MailTemplateItem[];

      if (allRecord) {
        setMetaRecordId(allRecord.id);
        const templatesPayload: Record<string, MetadataTemplatePayload> =
          allRecord.payload?.templates || {};
        merged = mergeWithSingleRecord(getDefaultTemplates(), templatesPayload);
      } else {
        setMetaRecordId(null);
        // Fallback: registros individuales (legacy)
        const metadataItems = allItems.filter(
          (item: any) => String(item?.entity || "") === MAIL_TEMPLATES_ENTITY,
        );
        merged = metadataItems.length
          ? mergeWithMetadata(getDefaultTemplates(), metadataItems)
          : getDefaultTemplates();
      }

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
      setMetaRecordId(null);
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

  const loadPilotMetadata = useCallback(async () => {
    setPilotMetaLoading(true);
    try {
      const res = await listMetadata<any>();
      const allItems = res.items || [];
      const rec = allItems.find(
        (item: any) =>
          String(item?.entity || "") === PILOTO_ENTITY &&
          String(item?.entity_id || "") === PILOTO_ENTITY_ID,
      );

      const payload = (rec?.payload ?? {
        version: 1,
        invitados: [],
        aceptados: [],
      }) as PilotoMetadataPayload;

      setPilotMeta({
        version: 1,
        invitados: Array.isArray(payload.invitados) ? payload.invitados : [],
        aceptados: Array.isArray(payload.aceptados) ? payload.aceptados : [],
      });
    } catch (error: any) {
      toast({
        title: "No se pudo cargar el estado del piloto",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setPilotMetaLoading(false);
    }
  }, [toast]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      // 1. Fetch auth users (source of truth for email)
      const qs = new URLSearchParams({
        page: "1",
        pageSize: "1000",
      });

      const res = await fetch(`/api/users?${qs.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken()
            ? { Authorization: `Bearer ${getAuthToken()}` }
            : {}),
        },
        credentials: "include",
      });

      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(raw?.message || "No se pudo listar usuarios"));
      }

      const source: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.data?.items)
            ? raw.data.items
            : Array.isArray(raw?.data)
              ? raw.data
              : [];

      const normalized = source
        .map((u) => {
          const email = String(u?.email || "")
            .trim()
            .toLowerCase();
          const nombre = String(u?.name || u?.nombre || "").trim();
          const role = String(u?.role || u?.tipo || "").toLowerCase();
          return { email, nombre, role };
        })
        .filter(
          (u) =>
            u.email &&
            ["student", "alumno", "cliente", "user"].includes(u.role),
        )
        .map((u) => ({ email: u.email, nombre: u.nombre || u.email }));

      const map = new Map<string, PilotoAlumno>();
      for (const item of normalized) map.set(item.email, item);

      // 2. Fetch client data to enrich with status/stage/tag
      try {
        const raw = await apiFetch<any>(
          `/client/get/clients?page=1&pageSize=1000`,
        );

        const rows: any[] = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.clients?.data)
            ? raw.clients.data
            : Array.isArray(raw?.getClients?.data)
              ? raw.getClients.data
              : Array.isArray(raw)
                ? raw
                : [];

        // Build name -> client map for matching
        const nameMap = new Map<string, any>();
        for (const r of rows) {
          const name = String(r?.nombre || r?.name || "")
            .trim()
            .toLowerCase();
          if (name) nameMap.set(name, r);
        }

        for (const student of normalized) {
          const match = nameMap.get(student.nombre.toLowerCase());
          if (match) {
            const existing = map.get(student.email);
            if (existing) {
              existing.status = String(
                match?.estado ?? match?.state ?? match?.estatus ?? "",
              ).trim();
              existing.stage = String(
                match?.etapa ?? match?.stage ?? "",
              ).trim();
              existing.tag = String(
                match?.tag ?? match?.tags ?? match?.etiqueta ?? "",
              ).trim();
            }
          }
        }
      } catch {}

      setStudents(Array.from(map.values()));
    } catch (error: any) {
      toast({
        title: "No se pudo cargar alumnos",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setStudentsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedCategory !== "piloto_ia") return;
    loadStudents();
  }, [selectedCategory, loadStudents]);

  useEffect(() => {
    if (selectedCategory !== "piloto_ia") return;
    loadPilotMetadata();
  }, [selectedCategory, loadPilotMetadata]);

  function toggleStudent(email: string, checked: boolean) {
    setSelectedEmails((prev) => {
      const set = new Set(prev);
      if (checked) set.add(email);
      else set.delete(email);
      return Array.from(set);
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedEmails((prev) => {
      if (!checked) {
        const visible = new Set(filteredStudents.map((s) => s.email));
        return prev.filter((email) => !visible.has(email));
      }
      const set = new Set(prev);
      filteredStudents.forEach((s) => set.add(s.email));
      return Array.from(set);
    });
  }

  async function sendPilotInvitations() {
    if (selectedStudents.length === 0) {
      toast({
        title: "Selecciona al menos un alumno",
        description: "Marca destinatarios para enviar la invitación.",
        variant: "destructive",
      });
      return;
    }

    setSendingPilotInvites(true);
    try {
      const res = await fetch("/api/brevo/send-piloto-ia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken()
            ? { Authorization: `Bearer ${getAuthToken()}` }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify({ alumnos: selectedStudents }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data?.status || "") !== "success") {
        throw new Error(
          String(data?.message || "No se pudieron enviar invitaciones"),
        );
      }

      toast({
        title: "Invitaciones enviadas",
        description: `${data.okCount ?? selectedStudents.length} envío(s) exitosos.`,
      });

      setSelectedEmails([]);
      await loadPilotMetadata();
    } catch (error: any) {
      toast({
        title: "Error enviando invitaciones",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setSendingPilotInvites(false);
    }
  }

  async function sendPilotTest() {
    const targetEmail = String(pilotTestEmail || TEST_TEMPLATE_EMAIL).trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      toast({
        title: "Email inválido",
        description: "Ingresa un email válido para enviar la prueba.",
        variant: "destructive",
      });
      return;
    }

    setSendingPilotTest(true);
    try {
      const res = await fetch("/api/brevo/send-piloto-ia-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken()
            ? { Authorization: `Bearer ${getAuthToken()}` }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          to: targetEmail,
          nombre: "Prueba",
          origin: getPublicAppOrigin(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data?.status || "") !== "success") {
        throw new Error(
          String(data?.message || "No se pudo enviar la prueba"),
        );
      }

      toast({
        title: "Prueba enviada",
        description: `Invitación de piloto enviada a ${targetEmail}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error enviando prueba",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setSendingPilotTest(false);
    }
  }

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

  /* ── Helpers para leer / escribir el registro unificado ────── */

  async function fetchCurrentAllTemplatesPayload(): Promise<{
    recordId: string | number | null;
    currentPayload: any;
    currentTemplates: Record<string, MetadataTemplatePayload>;
  }> {
    const res = await listMetadata<any>();
    const allRecord = (res.items || []).find(
      (item: any) =>
        String(item?.entity || "") === MAIL_TEMPLATES_ENTITY &&
        String(item?.entity_id || "").toLowerCase() === ALL_TEMPLATES_ENTITY_ID,
    );
    if (allRecord) {
      return {
        recordId: allRecord.id,
        currentPayload: allRecord.payload || {},
        currentTemplates: allRecord.payload?.templates || {},
      };
    }
    return { recordId: null, currentPayload: {}, currentTemplates: {} };
  }

  async function upsertAllTemplatesRecord(
    updatedTemplates: Record<string, MetadataTemplatePayload>,
    existingRecordId?: string | number | null,
  ) {
    const recId = existingRecordId ?? metaRecordId;
    if (recId != null) {
      await updateMetadata(recId, {
        id: recId,
        entity: MAIL_TEMPLATES_ENTITY,
        entity_id: ALL_TEMPLATES_ENTITY_ID,
        payload: { templates: updatedTemplates },
      } as any);
    } else {
      const created = await createMetadata({
        entity: MAIL_TEMPLATES_ENTITY,
        entity_id: ALL_TEMPLATES_ENTITY_ID,
        payload: { templates: updatedTemplates },
      });
      setMetaRecordId(created.id);
    }
  }

  /* ── Crear metadata con TODAS las plantillas base ────────── */

  async function handleCreateMetadata() {
    setCreatingMeta(true);
    try {
      const base = getDefaultTemplates();
      const tplPayload: Record<string, MetadataTemplatePayload> = {};
      for (const tpl of base) {
        tplPayload[tpl.key] = buildMetadataPayload(toFormState(tpl));
      }
      await upsertAllTemplatesRecord(tplPayload);
      toast({
        title: "Metadata creado",
        description: `Se sincronizaron ${base.length} plantillas en un registro unificado.`,
      });
      await loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error al crear metadata",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setCreatingMeta(false);
    }
  }

  /* ── Sincronizar UNA plantilla individual al registro ────── */

  async function handleSyncTemplate(key: MailTemplateKey) {
    const template = templates.find((t) => t.key === key);
    if (!template) return;

    setSyncingKey(key);
    try {
      const { recordId, currentTemplates } =
        await fetchCurrentAllTemplatesPayload();
      currentTemplates[key] = buildMetadataPayload(toFormState(template));
      await upsertAllTemplatesRecord(currentTemplates, recordId);
      toast({
        title: "Plantilla sincronizada",
        description: `"${template.name}" guardada en metadata.`,
      });
      await loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error al sincronizar",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setSyncingKey(null);
    }
  }

  /* ── Restaurar plantilla a la versión del código fuente ──── */

  async function handleResetToSource(key: MailTemplateKey) {
    const sourceTemplate = getDefaultTemplates().find((t) => t.key === key);
    if (!sourceTemplate) return;

    setSyncingKey(key);
    try {
      const { recordId, currentTemplates } =
        await fetchCurrentAllTemplatesPayload();
      currentTemplates[key] = buildMetadataPayload(toFormState(sourceTemplate));
      await upsertAllTemplatesRecord(currentTemplates, recordId);
      toast({
        title: "Plantilla restaurada",
        description: `"${sourceTemplate.name}" restaurada a la versión del código fuente.`,
      });
      await loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error al restaurar",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setSyncingKey(null);
    }
  }

  /* ── Guardar plantilla editada ────────────────────────────── */

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
      const { recordId, currentTemplates } =
        await fetchCurrentAllTemplatesPayload();
      currentTemplates[form.key] = payload;
      await upsertAllTemplatesRecord(currentTemplates, recordId);

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

  async function sendTemplateTest(template: MailTemplateItem, emailTo?: string) {
    const targetEmail = String(emailTo || testEmail || TEST_TEMPLATE_EMAIL).trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      toast({
        title: "Email inválido",
        description: "Ingresa un email válido para enviar la prueba.",
        variant: "destructive",
      });
      return;
    }

    setSendingTestKey(template.key);
    try {
      const isRescate =
        (TEMPLATE_CATEGORY_MAP[template.key] as string) === "rescate";
      const res = isRescate
        ? await fetch("/api/brevo/send-rescate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              templateKey: template.key,
              to: targetEmail,
              first_name: "César",
              recipientName: "César",
            }),
          })
        : await fetch("/api/brevo/send-preview", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              to: targetEmail,
              subject: renderSubjectPreview(template),
              html: renderTemplatePreview(template),
              text: renderTextPreview(template),
            }),
          });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json?.status || "") !== "success") {
        throw new Error(String(json?.message || "No se pudo enviar la prueba"));
      }

      toast({
        title: "Prueba enviada",
        description: `Se envió ${template.name} a ${targetEmail}.`,
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
                    <Badge
                      variant={metaRecordId != null ? "default" : "destructive"}
                    >
                      {metaRecordId != null
                        ? `Metadata activo (ID: ${metaRecordId})`
                        : "Sin metadata"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={metaRecordId != null ? "outline" : "default"}
                  className="gap-2"
                  disabled={loading || creatingMeta}
                  onClick={handleCreateMetadata}
                >
                  {creatingMeta ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : metaRecordId != null ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  {metaRecordId != null
                    ? "Re-sincronizar todo"
                    : "Crear metadata"}
                </Button>
                <Button
                  type="button"
                  onClick={openEditDialog}
                  className="gap-2"
                  disabled={!selectedTemplate || loading || isPilotCategory}
                >
                  <Pencil className="h-4 w-4" />
                  Editar seleccionada
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="Email de prueba..."
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="h-9 w-56 text-sm"
                    disabled={!selectedTemplate}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 h-9"
                    disabled={
                      !selectedTemplate ||
                      loading ||
                      sendingTestKey !== null
                    }
                    onClick={() =>
                      selectedTemplate && sendTemplateTest(selectedTemplate)
                    }
                  >
                    {selectedTemplate &&
                    sendingTestKey === selectedTemplate.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar prueba
                  </Button>
                </div>
              </div>
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Plantillas</CardTitle>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {TEMPLATE_CATEGORIES.map((cat) => {
                      const count =
                        cat.id === "piloto_ia"
                          ? 1
                          : activeTemplates.filter(
                              (t) => TEMPLATE_CATEGORY_MAP[t.key] === cat.id,
                            ).length;
                      const isActive = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            // Auto-seleccionar la primera de la nueva categoría
                            const first = activeTemplates.find(
                              (t) => TEMPLATE_CATEGORY_MAP[t.key] === cat.id,
                            );
                            if (first) setSelectedKey(first.key);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          {cat.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {selectedCategory === "piloto_ia" && (
                    <div className="rounded-lg border p-3 bg-violet-50/50 dark:bg-violet-950/20">
                      <p className="font-medium text-sm">
                        Campaña Piloto IA ATC
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Selección de alumnos, envío de invitaciones y
                        seguimiento de aceptaciones.
                      </p>
                    </div>
                  )}

                  {categoryTemplates.map((item) => {
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
                          <div className="flex items-center gap-1.5">
                            {item.disabled && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-amber-400 text-amber-600 dark:text-amber-400"
                              >
                                Pausada
                              </Badge>
                            )}
                            <Badge
                              variant={
                                item.fromMetadata ? "default" : "secondary"
                              }
                            >
                              {item.fromMetadata ? "metadata" : "base"}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Orden: {item.orden}
                        </p>
                        <div className="mt-2 flex gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={
                              sendingTestKey !== null || !!item.disabled
                            }
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            title="Sincronizar plantilla a metadata"
                            disabled={syncingKey !== null || creatingMeta}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncTemplate(item.key);
                            }}
                          >
                            {syncingKey === item.key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {item.fromMetadata && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-amber-600 hover:text-amber-700"
                              title="Restaurar a la versión del código fuente"
                              disabled={syncingKey !== null || creatingMeta}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetToSource(item.key);
                              }}
                            >
                              {syncingKey === item.key ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {selectedCategory === "piloto_ia" ? (
                <Card className="rounded-xl">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Bot className="h-5 w-5 text-violet-500" />
                        Piloto IA ATC · Invitaciones
                      </CardTitle>
                      <Badge variant="outline">
                        Público: /consentimiento-piloto
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Selecciona alumnos para enviar la invitación al piloto, y
                      monitorea quién ya aceptó el consentimiento.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Prueba de invitación piloto */}
                    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Probar invitación de piloto
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          Preview
                        </Badge>
                      </div>
                      <p className="text-xs text-violet-700">
                        Envía una prueba de la invitación del piloto a un email antes de enviar a todos los alumnos.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="email"
                          placeholder="Email de prueba..."
                          value={pilotTestEmail}
                          onChange={(e) => setPilotTestEmail(e.target.value)}
                          className="h-9 flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 gap-2 border-violet-300 hover:bg-violet-100"
                          disabled={sendingPilotTest}
                          onClick={sendPilotTest}
                        >
                          {sendingPilotTest ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Enviar prueba
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Enviar invitaciones
                          </p>
                          <Badge variant="secondary">
                            {selectedStudents.length} seleccionados
                          </Badge>
                        </div>

                        <Input
                          placeholder="Buscar alumnos por nombre o email..."
                          value={studentsSearch}
                          onChange={(e) => setStudentsSearch(e.target.value)}
                          className="h-9"
                        />

                        <div className="flex flex-wrap gap-2">
                          <select
                            value={filterState}
                            onChange={(e) => setFilterState(e.target.value)}
                            className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                          >
                            <option value="">Todos los estados</option>
                            {uniqueStates.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <select
                            value={filterStage}
                            onChange={(e) => setFilterStage(e.target.value)}
                            className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                          >
                            <option value="">Todas las fases</option>
                            {uniqueStages.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <select
                            value={filterTag}
                            onChange={(e) => setFilterTag(e.target.value)}
                            className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                          >
                            <option value="">Todas las tags</option>
                            {uniqueTags.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* Active filters summary */}
                        {(filterState || filterStage || filterTag) && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Filtros:</span>
                            {filterState && (
                              <Badge variant="secondary" className="text-[10px]">
                                Estado: {filterState}
                              </Badge>
                            )}
                            {filterStage && (
                              <Badge variant="secondary" className="text-[10px]">
                                Fase: {filterStage}
                              </Badge>
                            )}
                            {filterTag && (
                              <Badge variant="secondary" className="text-[10px]">
                                Tag: {filterTag}
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setFilterState("");
                                setFilterStage("");
                                setFilterTag("");
                              }}
                              className="text-muted-foreground hover:text-foreground underline"
                            >
                              Limpiar
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={
                                filteredStudents.length > 0 &&
                                filteredStudents.every((s) =>
                                  selectedEmails.includes(s.email),
                                )
                              }
                              onChange={(e) =>
                                toggleAllVisible(e.target.checked)
                              }
                            />
                            Seleccionar todos visibles
                          </label>
                          <span className="text-muted-foreground">
                            {filteredStudents.length} alumno
                            {filteredStudents.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                          {studentsLoading ? (
                            <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Cargando alumnos...
                            </div>
                          ) : filteredStudents.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                              No se encontraron alumnos.
                            </div>
                          ) : (
                            filteredStudents.map((student) => {
                              const checked = selectedEmails.includes(
                                student.email,
                              );
                              return (
                                <label
                                  key={student.email}
                                  className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      toggleStudent(
                                        student.email,
                                        e.target.checked,
                                      )
                                    }
                                    className="mt-1"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                      {student.nombre}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {student.email}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    {student.status ? (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {student.status}
                                      </Badge>
                                    ) : null}
                                    {student.tag ? (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {student.tag}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>

                        <Button
                          type="button"
                          className="w-full gap-2"
                          disabled={
                            sendingPilotInvites ||
                            selectedStudents.length === 0 ||
                            !isAdminUser
                          }
                          onClick={sendPilotInvitations}
                        >
                          {sendingPilotInvites ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Enviando invitaciones...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Enviar invitación a seleccionados
                            </>
                          )}
                        </Button>

                        {!isAdminUser && (
                          <p className="text-xs text-amber-600">
                            Solo usuarios admin pueden enviar invitaciones.
                          </p>
                        )}

                        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground">
                            Link público de consentimiento
                          </p>
                          <p className="break-all">{consentUrl}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            Estado del piloto
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={loadPilotMetadata}
                            disabled={pilotMetaLoading}
                          >
                            {pilotMetaLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-md border p-2.5">
                            <p className="text-[11px] text-muted-foreground">
                              Invitados
                            </p>
                            <p className="text-lg font-semibold">
                              {pilotMeta.invitados.length}
                            </p>
                          </div>
                          <div className="rounded-md border p-2.5">
                            <p className="text-[11px] text-muted-foreground">
                              Aceptados
                            </p>
                            <p className="text-lg font-semibold text-emerald-600">
                              {pilotMeta.aceptados.length}
                            </p>
                          </div>
                          <div className="rounded-md border p-2.5">
                            <p className="text-[11px] text-muted-foreground">
                              Progreso
                            </p>
                            <p className="text-lg font-semibold">
                              {pilotProgress}%
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium">
                              Aceptados recientes
                            </p>
                            {acceptedStatuses.length > 0 && (
                              <select
                                value={filterAcceptedStatus}
                                onChange={(e) =>
                                  setFilterAcceptedStatus(e.target.value)
                                }
                                className="h-7 rounded-md border bg-background px-2 text-xs"
                              >
                                <option value="">Todos los estados</option>
                                {acceptedStatuses.map((s) => (
                                  <option key={s} value={s}>
                                    {s} ({acceptedByStatus.get(s)?.length})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                            {pilotMeta.aceptados.length === 0 ? (
                              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                Aún no hay aceptaciones registradas.
                              </div>
                            ) : filteredAccepted.length === 0 ? (
                              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                No hay aceptados con este filtro.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {Array.from(
                                  (() => {
                                    const groups = new Map<
                                      string,
                                      typeof filteredAccepted
                                    >();
                                    for (const item of filteredAccepted) {
                                      const key =
                                        item.status || "Sin estado";
                                      if (!groups.has(key))
                                        groups.set(key, []);
                                      groups.get(key)!.push(item);
                                    }
                                    return groups;
                                  })(),
                                ).map(([status, items]) => (
                                  <div key={status} className="space-y-1.5">
                                    <div className="flex items-center gap-2 px-1">
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px]"
                                      >
                                        {status}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground">
                                        {items.length} alumno
                                        {items.length !== 1 ? "s" : ""}
                                      </span>
                                    </div>
                                    {items
                                      .sort(
                                        (a, b) =>
                                          String(b.aceptado_en).localeCompare(
                                            String(a.aceptado_en),
                                          ),
                                      )
                                      .map((item) => (
                                        <div
                                          key={`${item.email}-${item.aceptado_en}`}
                                          className="rounded-md border p-2.5"
                                        >
                                          <p className="text-sm font-medium truncate">
                                            {item.nombre || item.email}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {item.email}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-1">
                                            {item.stage && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1 py-0"
                                              >
                                                {item.stage}
                                              </Badge>
                                            )}
                                            {item.tag && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1 py-0"
                                              >
                                                {item.tag}
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-muted-foreground mt-1">
                                            {new Date(
                                              item.aceptado_en,
                                            ).toLocaleString()}
                                          </p>
                                        </div>
                                      ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : selectedTemplate ? (
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
                            srcDoc={renderTemplatePreview(selectedTemplate)}
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

            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                Variables dinámicas
              </p>
              <p className="text-blue-800 dark:text-blue-300 text-xs">
                Usa la sintaxis{" "}
                <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  {"{{nombreVariable}}"}
                </code>{" "}
                en el HTML o texto. Al enviar el correo, estas variables se
                reemplazan automáticamente con los datos reales del
                destinatario.
              </p>
              {form ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    ...COMMON_TEMPLATE_VARIABLES,
                    ...(TEMPLATE_SPECIFIC_VARIABLES[form.key] || []),
                  ].map((v) => (
                    <span
                      key={v.key}
                      className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 text-xs font-mono text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title={`${v.description}${v.example ? ` (ej: ${v.example})` : ""}`}
                      onClick={() => navigator.clipboard?.writeText(v.key)}
                    >
                      {v.key}
                    </span>
                  ))}
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 self-center ml-1">
                    (click para copiar)
                  </span>
                </div>
              ) : null}
            </div>

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
