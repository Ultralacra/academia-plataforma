"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Check,
  CloudUpload,
  Copy,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Replace,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { createMetadata, listMetadata, updateMetadata } from "@/lib/metadata";

/* ── Constantes ─────────────────────────────────────────────── */

const CONTRACT_TEMPLATES_ENTITY = "plantillas_contratos";
const ALL_TEMPLATES_ENTITY_ID = "all_templates";
const DEFAULT_CONTRACT_TEXT_URL = "/templates/contrato-hotselling-pro.txt";

/* ── Variables del contrato ──────────────────────────────────── */

interface ContractVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

const CONTRACT_VARIABLES: ContractVariable[] = [
  {
    key: "PROGRAMA",
    label: "Programa",
    description: "Nombre del programa contratado",
    example: "Hotselling Pro",
  },
  {
    key: "NOMBRE_COMPLETO",
    label: "Nombre completo",
    description: "Nombre y apellidos del cliente",
    example: "Juan Pérez García",
  },
  {
    key: "DNI",
    label: "DNI / Identificación",
    description: "Número de documento del cliente",
    example: "12345678A",
  },
  {
    key: "DIRECCION",
    label: "Dirección",
    description: "Domicilio del cliente",
    example: "Calle Principal 123, Madrid, España",
  },
  {
    key: "DURACION_TEXTO",
    label: "Duración (texto)",
    description: "Duración del programa en texto",
    example: "seis (6)",
  },
  {
    key: "DURACION_NUMERO",
    label: "Duración (número)",
    description: "Duración numérica del programa",
    example: "6",
  },
  {
    key: "DIA_INICIO",
    label: "Día de inicio",
    description: "Día de inicio del programa",
    example: "15",
  },
  {
    key: "MES_INICIO",
    label: "Mes de inicio",
    description: "Mes de inicio del programa",
    example: "enero",
  },
  {
    key: "ANIO_INICIO",
    label: "Año de inicio",
    description: "Año de inicio del programa",
    example: "2025",
  },
  {
    key: "MODALIDAD_PAGO",
    label: "Modalidad de pago",
    description: "Forma de pago del cliente",
    example: "pago único",
  },
  {
    key: "MONTO_TOTAL_LETRAS",
    label: "Monto total (letras)",
    description: "Monto total en texto",
    example: "mil quinientos dólares americanos",
  },
  {
    key: "MONTO_TOTAL",
    label: "Monto total",
    description: "Monto total numérico",
    example: "1500.00",
  },
  {
    key: "MONEDA",
    label: "Moneda",
    description: "Moneda del pago",
    example: "USD",
  },
  {
    key: "FECHA_CONTRATO",
    label: "Fecha del contrato",
    description: "Fecha de emisión del contrato",
    example: "15 de enero de 2025",
  },
];

const SPECIAL_MARKERS = [
  {
    key: "[[FIRMAS]]",
    label: "Bloque de firmas",
    description:
      "Marcador especial que genera la tabla de firmas de la empresa y el cliente",
  },
];

/* ── Textos base de Otrosí de membresía ──────────────────────── */

const OTROSI_PRO_TEXT = `OTROSÍ No. __  AL CONTRATO DE PRESTACIÓN DE SERVICIOS DEL PROGRAMA "HOTSELLING PRO"

De una parte, MHF GROUP LLC, con EIN 85-4320656, con domicilio a efectos de notificaciones en 13728 LAGOON ISLE WAY APT 205 ORLANDO, FL 32824, UNITED STATE, quien en adelante se denominará LA EMPRESA. Y, de otra parte, {{NOMBRE_COMPLETO}}, con número de identificación {{DNI}}, domiciliado(a) en {{DIRECCION}}, quien en adelante se denominará EL CLIENTE, se celebra el presente OTROSÍ al Contrato de Prestación de Servicios correspondiente al programa "HOTSELLING PRO" (en adelante, el Contrato Base), el cual se regirá por las siguientes cláusulas:

PRIMERA. Antecedentes y finalidad

Las partes celebraron el "CONTRATO PRESTACIÓN DE SERVICIOS DEL PROGRAMA "HOTSELLING PRO" (en adelante, el "Contrato Base"), cuya fecha del acuerdo consta como XXXX. Las partes requieren un marco adicional para regular, de manera estandarizada, los casos en que EL CLIENTE activa una membresía puntual por un (1) mes, sin continuidad, a modo de reactivación/renovación operativa de accesos, sin que ello constituya extensión del Contrato Base ni se enmarque dentro de la cláusula de garantía.

SEGUNDA. Objeto y definiciones

El presente Otrosí tiene por objeto crear y regular la "Membresía Puntual / No Continua" (en adelante, la "Membresía"), como modalidad aplicable cuando EL CLIENTE solicite habilitar accesos al programa por un (1) mes, sin continuidad, sin que dicha habilitación constituya extensión del Contrato Base ni se encuentre dentro del alcance de la cláusula de garantía del Contrato Base.

TERCERA. Vigencia del período mensual y mes de acceso

La membresía se activa por un período fijo de treinta (30) días calendario, contados desde la fecha de inicio indicada en este Otrosí.

Fecha de inicio: {{DIA_INICIO}} / {{MES_INICIO}} / {{ANIO_INICIO}}
Fecha de finalización: (30 días después)

CUARTA. Validación de pagos y habilitación de accesos

4.1 Cuando EL CLIENTE realice el pago y remita el comprobante correspondiente, LA EMPRESA podrá habilitar los accesos, quedando el pago sujeto a validación interna conforme a sus procesos administrativos y de control.

4.2 LA EMPRESA podrá, en cualquier momento, solicitar información adicional, comprobantes o documentación complementaria para confirmar la legitimidad del pago.

4.3 En caso de que el pago no pueda ser validado o se detecten inconsistencias, LA EMPRESA se reserva el derecho de suspender o revocar los accesos, sin que ello genere derecho a compensación, extensión, reembolso ni reclamo alguno.

4.4 La activación de accesos tras el envío del comprobante se realizará dentro de los horarios de atención del área de Atención al Cliente y quedará sujeta a validación interna del pago.

QUINTA. Aclaración sobre "pausas"

La Membresía no contempla pausas bajo ninguna modalidad. No procede la suspensión, congelación, prórroga ni reprogramación del período de acceso. El no uso total o parcial del mes no genera derecho a extensión, compensación ni reembolso.

SEXTA. Garantía

Esta modalidad de Membresía no reactiva ni extiende garantías contractuales previas. En consecuencia, no habilita solicitudes de auditoría, reembolso ni continuidad de garantía.

SÉPTIMA. Bonos, beneficios y entregables

La Membresía no habilita la reutilización de bonos contractuales previamente utilizados. Los bonos del Contrato Base no son acumulables ni reutilizables.

OCTAVA. Carácter excepcional y no renovación automática

La activación de la Membresía se realiza de manera puntual y expresa, previa solicitud y pago por parte de EL CLIENTE. Dicha activación no implica renovación automática, no constituye un derecho adquirido ni genera precedentes para futuras solicitudes, extensiones o beneficios adicionales.

NOVENA. Integridad, prevalencia y vigencia del contrato base

El presente Otrosí hace parte integral del Contrato Base. En lo no modificado expresamente por este documento, continúan vigentes todas las cláusulas del Contrato Base. En caso de contradicción entre el Contrato Base y este Otrosí respecto de la Membresía, prevalecerá lo aquí pactado para ese supuesto específico.

[[FIRMAS]]`;

const OTROSI_LITE_TEXT = `OTROSÍ No. ___ AL CONTRATO DE PRESTACIÓN DE SERVICIOS DEL PROGRAMA "HOTSELLING LITE"

De una parte, MHF GROUP LLC, con EIN 85-4320656, con domicilio a efectos de notificaciones en 13728 LAGOON ISLE WAY APT 205 ORLANDO, FL 32824, UNITED STATE, quien en adelante se denominará LA EMPRESA. Y, de otra parte, {{NOMBRE_COMPLETO}}, con número de identificación {{DNI}}, domiciliado(a) en {{DIRECCION}}, quien en adelante se denominará EL CLIENTE, se celebra el presente OTROSÍ al Contrato de Prestación de Servicios correspondiente al programa "HOTSELLING LITE" (en adelante, el Contrato Base), el cual se regirá por las siguientes cláusulas:

PRIMERA. Antecedentes y finalidad

Las partes celebraron el "CONTRATO PRESTACIÓN DE SERVICIOS DEL PROGRAMA "HOTSELLING LITE" (en adelante, el "Contrato Base"), cuya fecha del acuerdo consta como XXXX. Las partes requieren un marco adicional para regular, de manera estandarizada, los casos en que EL CLIENTE activa una membresía puntual por un (1) mes, sin continuidad, a modo de reactivación/renovación operativa de accesos, sin que ello constituya extensión del Contrato Base ni se enmarque dentro de la cláusula de garantía.

SEGUNDA. Objeto y definiciones

El presente Otrosí tiene por objeto crear y regular la "Membresía Puntual / No Continua" (en adelante, la "Membresía"), como modalidad aplicable cuando EL CLIENTE solicite habilitar accesos al programa por un (1) mes, sin continuidad, sin que dicha habilitación constituya extensión del Contrato Base ni se encuentre dentro del alcance de la cláusula de garantía del Contrato Base.

TERCERA. Vigencia del período mensual y mes de acceso

La membresía se activa por un período fijo de treinta (30) días calendario, contados desde la fecha de inicio indicada en este Otrosí.

Fecha de inicio: {{DIA_INICIO}} / {{MES_INICIO}} / {{ANIO_INICIO}}
Fecha de finalización: (30 días después)

CUARTA. Validación de pagos y habilitación de accesos

4.1 Cuando EL CLIENTE realice el pago y remita el comprobante correspondiente, LA EMPRESA podrá habilitar los accesos, quedando el pago sujeto a validación interna conforme a sus procesos administrativos y de control.

4.2 LA EMPRESA podrá, en cualquier momento, solicitar información adicional, comprobantes o documentación complementaria para confirmar la legitimidad del pago.

4.3 En caso de que el pago no pueda ser validado o se detecten inconsistencias, LA EMPRESA se reserva el derecho de suspender o revocar los accesos, sin que ello genere derecho a compensación, extensión, reembolso ni reclamo alguno.

4.4 La activación de accesos tras el envío del comprobante se realizará dentro de los horarios de atención del área de Atención al Cliente y quedará sujeta a validación interna del pago.

QUINTA. Aclaración sobre "pausas"

La Membresía no contempla pausas bajo ninguna modalidad. No procede la suspensión, congelación, prórroga ni reprogramación del período de acceso. El no uso total o parcial del mes no genera derecho a extensión, compensación ni reembolso.

SEXTA. Garantía

Esta modalidad de Membresía no reactiva ni extiende garantías contractuales previas. En consecuencia, no habilita solicitudes de auditoría, reembolso ni continuidad de garantía.

SÉPTIMA. Bonos, beneficios y entregables

La Membresía no habilita la reutilización de bonos contractuales previamente utilizados. Los bonos del Contrato Base no son acumulables ni reutilizables.

OCTAVA. Carácter excepcional y no renovación automática

La activación de la Membresía se realiza de manera puntual y expresa, previa solicitud y pago por parte de EL CLIENTE. Dicha activación no implica renovación automática, no constituye un derecho adquirido ni genera precedentes para futuras solicitudes, extensiones o beneficios adicionales.

NOVENA. Integridad, prevalencia y vigencia del contrato base

El presente Otrosí hace parte integral del Contrato Base. En lo no modificado expresamente por este documento, continúan vigentes todas las cláusulas del Contrato Base. En caso de contradicción entre el Contrato Base y este Otrosí respecto de la Membresía, prevalecerá lo aquí pactado para ese supuesto específico.

[[FIRMAS]]`;

/* ── Tipos ──────────────────────────────────────────────────── */

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  /** "text" = texto plano con {{VAR}}, "html" = HTML embebido */
  format: "text" | "html";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

type MetadataContractPayload = {
  templates: Record<
    string,
    {
      name: string;
      description: string;
      content: string;
      format: "text" | "html";
      isDefault: boolean;
      createdAt: string;
      updatedAt: string;
    }
  >;
  activeTemplateId?: string;
};

/* ── Componente de resaltado de variables ───────────────────── */

/**
 * Renderiza el texto del contrato con las variables {{VAR}} resaltadas
 * en color y con un tooltip que muestra el ejemplo.
 */
function HighlightedContent({ text }: { text: string }) {
  const parts = text.split(/(\{\{[A-Z0-9_]+\}\}|\[\[FIRMAS\]\])/g);

  return (
    <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
      {parts.map((part, i) => {
        // Marcador especial [[FIRMAS]]
        if (part === "[[FIRMAS]]") {
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span className="inline-block bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded px-1 py-0.5 font-semibold cursor-help border border-purple-300 dark:border-purple-700">
                  {part}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs font-medium">Bloque de firmas</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Se reemplaza por la tabla de firmas de empresa y cliente
                </p>
              </TooltipContent>
            </Tooltip>
          );
        }

        // Variable {{KEY}}
        const varMatch = part.match(/^\{\{([A-Z0-9_]+)\}\}$/);
        if (varMatch) {
          const key = varMatch[1];
          const known = CONTRACT_VARIABLES.find((cv) => cv.key === key);
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span
                  className={`inline-block rounded px-1 py-0.5 font-semibold cursor-help border ${
                    known
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                      : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                  }`}
                >
                  {part}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {known ? (
                  <>
                    <p className="text-xs font-medium">{known.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {known.description}
                    </p>
                    <div className="mt-1 rounded bg-muted px-2 py-1">
                      <p className="text-[10px]">
                        <span className="font-medium">Ejemplo:</span>{" "}
                        <span className="text-primary">{known.example}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs">
                    Variable desconocida — no tiene ejemplo definido
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        }

        // Texto normal
        return <span key={i}>{part}</span>;
      })}
    </pre>
  );
}

/**
 * Renderiza el texto con las variables reemplazadas por sus ejemplos,
 * pero resaltadas en verde para indicar qué partes son dinámicas.
 */
function PreviewHighlightedContent({ text }: { text: string }) {
  const parts = text.split(/(\{\{[A-Z0-9_]+\}\}|\[\[FIRMAS\]\])/g);
  const exampleValues = getExampleValues();

  return (
    <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
      {parts.map((part, i) => {
        if (part === "[[FIRMAS]]") {
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span className="inline-block bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded px-1 py-0.5 font-semibold cursor-help border border-emerald-300 dark:border-emerald-700">
                  [Bloque de firmas]
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  Se inserta la tabla de firmas automáticamente
                </p>
              </TooltipContent>
            </Tooltip>
          );
        }

        const varMatch = part.match(/^\{\{([A-Z0-9_]+)\}\}$/);
        if (varMatch) {
          const key = varMatch[1];
          const example = exampleValues[key];
          const known = CONTRACT_VARIABLES.find((cv) => cv.key === key);
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span className="inline-block bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded px-0.5 font-semibold cursor-help underline decoration-dotted decoration-emerald-400">
                  {example || part}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs font-medium">Variable: {`{{${key}}}`}</p>
                {known && (
                  <p className="text-[10px] text-muted-foreground">
                    {known.description}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </pre>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */

function extractVariablesFromText(
  text: string,
): { key: string; count: number }[] {
  const regex = /\{\{([A-Z0-9_]+)\}\}/g;
  const counts: Record<string, number> = {};
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    counts[match[1]] = (counts[match[1]] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));
}

function fillPlaceholders(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key: string) => {
    return values[key] ?? `{{${key}}}`;
  });
}

function getExampleValues(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const v of CONTRACT_VARIABLES) {
    values[v.key] = v.example;
  }
  return values;
}

/* ── Componente principal ───────────────────────────────────── */

export default function PlantillasContratosPage() {
  const { toast } = useToast();

  /* Estado principal */
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingMeta, setCreatingMeta] = useState(false);
  const [metaRecordId, setMetaRecordId] = useState<string | number | null>(
    null,
  );

  /* Editor */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorName, setEditorName] = useState("");
  const [editorDescription, setEditorDescription] = useState("");
  const [editorIsNew, setEditorIsNew] = useState(false);

  /* Preview */
  const [previewOpen, setPreviewOpen] = useState(false);

  /* Crear nueva plantilla */
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  /* Reemplazar contenido */
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  /* Editor tabs */
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  /* ── Cargar plantillas ────────────────────────────────────── */

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMetadata<any>();
      const allItems = res.items || [];

      const record = allItems.find(
        (item: any) =>
          String(item?.entity || "") === CONTRACT_TEMPLATES_ENTITY &&
          String(item?.entity_id || "").toLowerCase() ===
            ALL_TEMPLATES_ENTITY_ID,
      );

      if (record) {
        setMetaRecordId(record.id);
        const payload: MetadataContractPayload = record.payload || {};
        const tplMap = payload.templates || {};
        const loadedTemplates: ContractTemplate[] = Object.entries(tplMap).map(
          ([id, data]) => ({
            id,
            name: data.name || id,
            description: data.description || "",
            content: data.content || "",
            format: data.format || "text",
            isDefault: data.isDefault ?? false,
            createdAt: data.createdAt || "",
            updatedAt: data.updatedAt || "",
          }),
        );

        if (loadedTemplates.length) {
          setTemplates(loadedTemplates);
          setActiveTemplateId(
            payload.activeTemplateId || loadedTemplates[0].id,
          );
          setSelectedId((prev) =>
            loadedTemplates.some((t) => t.id === prev)
              ? prev
              : loadedTemplates[0].id,
          );
        } else {
          // Tiene registro pero sin plantillas → cargar default
          await loadDefaultTemplates();
        }
      } else {
        setMetaRecordId(null);
        await loadDefaultTemplates();
      }
    } catch (error: any) {
      toast({
        title: "Error al cargar plantillas",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
      await loadDefaultTemplates();
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadDefaultTemplates = async () => {
    try {
      const now = new Date().toISOString();

      // 1) Cargar contrato principal desde archivo estático
      let proContent = "";
      try {
        const resp = await fetch(
          `${DEFAULT_CONTRACT_TEXT_URL}?v=${Date.now()}`,
        );
        if (resp.ok) proContent = await resp.text();
      } catch {
        /* vacío fallback */
      }

      const defaults: ContractTemplate[] = [
        {
          id: "contrato-hotselling-pro",
          name: "Contrato Hotselling Pro",
          description:
            "Contrato principal de prestación de servicios del programa Hotselling Pro (CRM)",
          content: proContent,
          format: "text",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "otrosi-membresia-pro",
          name: "Otrosí Membresía — Hotselling Pro",
          description:
            "Otrosí al contrato de Hotselling Pro para membresía puntual (no continua)",
          content: OTROSI_PRO_TEXT,
          format: "text",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "otrosi-membresia-lite",
          name: "Otrosí Membresía — Hotselling Lite",
          description:
            "Otrosí al contrato de Hotselling Lite para membresía puntual (no continua)",
          content: OTROSI_LITE_TEXT,
          format: "text",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      setTemplates(defaults);
      setSelectedId(defaults[0].id);
      setActiveTemplateId(defaults[0].id);
    } catch (e: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar las plantillas por defecto.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  /* ── Persistencia ─────────────────────────────────────────── */

  const buildPayload = (
    tpls: ContractTemplate[],
    activeId?: string | null,
  ): MetadataContractPayload => {
    const templatesMap: MetadataContractPayload["templates"] = {};
    for (const t of tpls) {
      templatesMap[t.id] = {
        name: t.name,
        description: t.description,
        content: t.content,
        format: t.format || "text",
        isDefault: t.isDefault,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    }
    return {
      templates: templatesMap,
      activeTemplateId: activeId || tpls[0]?.id || undefined,
    };
  };

  const saveToMetadata = async (
    tpls: ContractTemplate[],
    activeId?: string | null,
  ) => {
    setSaving(true);
    try {
      const payload = buildPayload(tpls, activeId);
      if (metaRecordId != null) {
        await updateMetadata(metaRecordId, {
          id: metaRecordId,
          entity: CONTRACT_TEMPLATES_ENTITY,
          entity_id: ALL_TEMPLATES_ENTITY_ID,
          payload,
        } as any);
      } else {
        const created = await createMetadata({
          entity: CONTRACT_TEMPLATES_ENTITY,
          entity_id: ALL_TEMPLATES_ENTITY_ID,
          payload,
        });
        setMetaRecordId(created.id);
      }
      toast({
        title: "Guardado",
        description: "Plantilla guardada correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: String(error?.message || "Intenta nuevamente."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Acciones ─────────────────────────────────────────────── */

  const handleEdit = () => {
    if (!selectedTemplate) return;
    setEditorName(selectedTemplate.name);
    setEditorDescription(selectedTemplate.description);
    setEditorContent(selectedTemplate.content);
    setEditorIsNew(false);
    setEditorOpen(true);
  };

  const handleSaveEditor = async () => {
    if (editorIsNew) {
      // Crear nueva plantilla
      const id = newName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const now = new Date().toISOString();
      const newTpl: ContractTemplate = {
        id: id || `plantilla-${Date.now()}`,
        name: editorName,
        description: editorDescription,
        content: editorContent,
        format: "text",
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...templates, newTpl];
      setTemplates(updated);
      setSelectedId(newTpl.id);
      await saveToMetadata(updated, activeTemplateId);
    } else if (selectedTemplate) {
      const now = new Date().toISOString();
      const updated = templates.map((t) =>
        t.id === selectedTemplate.id
          ? {
              ...t,
              name: editorName,
              description: editorDescription,
              content: editorContent,
              updatedAt: now,
            }
          : t,
      );
      setTemplates(updated);
      await saveToMetadata(updated, activeTemplateId);
    }
    setEditorOpen(false);
  };

  const handleSetActive = async (id: string) => {
    setActiveTemplateId(id);
    await saveToMetadata(templates, id);
  };

  const handleDelete = async (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (templates.length <= 1) {
      toast({
        title: "No se puede eliminar",
        description: "Debe existir al menos una plantilla.",
        variant: "destructive",
      });
      return;
    }
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    const newActive =
      activeTemplateId === id ? updated[0]?.id || null : activeTemplateId;
    setActiveTemplateId(newActive);
    if (selectedId === id) setSelectedId(updated[0]?.id || null);
    await saveToMetadata(updated, newActive);
  };

  const handleCreateNew = () => {
    setNewName("");
    setNewDescription("");
    setNewDialogOpen(true);
  };

  const handleConfirmCreate = () => {
    if (!newName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa un nombre para la nueva plantilla.",
        variant: "destructive",
      });
      return;
    }
    setEditorName(newName.trim());
    setEditorDescription(newDescription.trim());
    setEditorContent("");
    setEditorIsNew(true);
    setNewDialogOpen(false);
    setEditorOpen(true);
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const id = file.name
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const now = new Date().toISOString();
      const newTpl: ContractTemplate = {
        id: id || `plantilla-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        description: `Importado desde ${file.name}`,
        content: text,
        format: "text",
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...templates, newTpl];
      setTemplates(updated);
      setSelectedId(newTpl.id);
      await saveToMetadata(updated, activeTemplateId);
      const vars = extractVariablesFromText(text);
      toast({
        title: "Plantilla importada",
        description: `"${newTpl.name}" añadida con ${vars.length} variable(s) detectada(s).`,
      });
    } catch (err: any) {
      toast({
        title: "Error al importar",
        description: String(err?.message || "Formato no soportado."),
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast({
      title: "Copiado",
      description: `{{${variable}}} copiado al portapapeles.`,
    });
  };

  /* ── Reemplazar contenido de plantilla existente ─────────── */

  const handleReplaceContent = () => {
    if (!selectedTemplate) return;
    setReplaceDialogOpen(true);
  };

  const handleReplaceFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplate) return;
    try {
      const text = await file.text();
      const vars = extractVariablesFromText(text);
      const now = new Date().toISOString();
      const updated = templates.map((t) =>
        t.id === selectedTemplate.id
          ? { ...t, content: text, updatedAt: now }
          : t,
      );
      setTemplates(updated);
      await saveToMetadata(updated, activeTemplateId);
      setReplaceDialogOpen(false);
      toast({
        title: "Contenido reemplazado",
        description: `"${selectedTemplate.name}" actualizada desde "${file.name}" — ${vars.length} variable(s) detectada(s).`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: String(err?.message || "No se pudo leer el archivo."),
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  /* ── Variables detectadas en la plantilla ─────────────────── */

  const detectedVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    return extractVariablesFromText(selectedTemplate.content);
  }, [selectedTemplate]);

  const previewText = useMemo(() => {
    if (!selectedTemplate) return "";
    return fillPlaceholders(selectedTemplate.content, getExampleValues());
  }, [selectedTemplate]);

  /* ── Crear metadata con la plantilla base ────────────────── */

  const handleCreateMetadata = async () => {
    setCreatingMeta(true);
    try {
      const now = new Date().toISOString();

      // Cargar contrato principal desde archivo estático
      let proContent = "";
      try {
        const resp = await fetch(
          `${DEFAULT_CONTRACT_TEXT_URL}?v=${Date.now()}`,
        );
        if (resp.ok) proContent = await resp.text();
      } catch {
        /* vacío */
      }

      const defaults: ContractTemplate[] = [
        {
          id: "contrato-hotselling-pro",
          name: "Contrato Hotselling Pro",
          description:
            "Contrato principal de prestación de servicios del programa Hotselling Pro (CRM)",
          content: proContent,
          format: "text",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "otrosi-membresia-pro",
          name: "Otrosí Membresía — Hotselling Pro",
          description:
            "Otrosí al contrato de Hotselling Pro para membresía puntual (no continua)",
          content: OTROSI_PRO_TEXT,
          format: "text",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "otrosi-membresia-lite",
          name: "Otrosí Membresía — Hotselling Lite",
          description:
            "Otrosí al contrato de Hotselling Lite para membresía puntual (no continua)",
          content: OTROSI_LITE_TEXT,
          format: "text",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      // Merge: conservar plantillas existentes editadas por el usuario
      const mergedMap = new Map<string, ContractTemplate>();
      for (const d of defaults) mergedMap.set(d.id, d);
      for (const t of templates) {
        if (mergedMap.has(t.id)) {
          // Si el contenido fue editado, conservar esa versión
          if (t.content && t.content !== mergedMap.get(t.id)!.content) {
            mergedMap.set(t.id, t);
          }
        } else {
          mergedMap.set(t.id, t);
        }
      }
      const merged = Array.from(mergedMap.values());
      const activeId = activeTemplateId || merged[0]?.id;

      const payload = buildPayload(merged, activeId);

      if (metaRecordId != null) {
        await updateMetadata(metaRecordId, {
          id: metaRecordId,
          entity: CONTRACT_TEMPLATES_ENTITY,
          entity_id: ALL_TEMPLATES_ENTITY_ID,
          payload,
        } as any);
      } else {
        const created = await createMetadata({
          entity: CONTRACT_TEMPLATES_ENTITY,
          entity_id: ALL_TEMPLATES_ENTITY_ID,
          payload,
        });
        setMetaRecordId(created.id);
      }

      toast({
        title: "Metadata creado",
        description: `Se sincronizaron ${merged.length} plantillas de contrato en metadata.`,
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
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-6 px-4 space-y-6">
          {/* Header */}
          <div className="rounded-xl border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">
                    Plantillas de contratos
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gestiona las plantillas de texto que se usan para generar
                    contratos y otrosí de membresía. La plantilla activa es la
                    que usa el CRM.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline">
                      Total: {templates.length} plantilla
                      {templates.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge
                      variant={metaRecordId != null ? "default" : "destructive"}
                    >
                      {metaRecordId != null
                        ? `Metadata activo (ID: ${metaRecordId})`
                        : "Sin metadata"}
                    </Badge>
                    {activeTemplateId && (
                      <Badge variant="secondary">
                        Activa:{" "}
                        {templates.find((t) => t.id === activeTemplateId)
                          ?.name || activeTemplateId}
                      </Badge>
                    )}
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
                    ? "Re-sincronizar base"
                    : "Crear metadata"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => loadTemplates()}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Recargar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleUploadFile}
                >
                  <Upload className="h-4 w-4" />
                  Importar .txt
                </Button>
                <Button className="gap-2" onClick={handleCreateNew}>
                  <Plus className="h-4 w-4" />
                  Nueva plantilla
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.text"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lista de plantillas */}
              <div className="lg:col-span-3 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Plantillas ({templates.length})
                </h2>
                {templates.map((tpl) => (
                  <Card
                    key={tpl.id}
                    className={`cursor-pointer transition-colors ${
                      selectedId === tpl.id
                        ? "border-primary ring-1 ring-primary"
                        : "hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setSelectedId(tpl.id)}
                  >
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-medium truncate">
                          {tpl.name}
                        </CardTitle>
                        <div className="flex gap-1 shrink-0">
                          {activeTemplateId === tpl.id && (
                            <Badge
                              variant="default"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Activa
                            </Badge>
                          )}
                          {tpl.isDefault && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Base
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tpl.description || "Sin descripción"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-foreground/60">
                          {tpl.content.length.toLocaleString()} chars ·{" "}
                          {tpl.content.split(/\r?\n/).length} líneas
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0"
                        >
                          {extractVariablesFromText(tpl.content).length} vars
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detalle */}
              <div className="lg:col-span-6 space-y-4">
                {selectedTemplate ? (
                  <>
                    {/* Info */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <CardTitle className="text-lg">
                              {selectedTemplate.name}
                            </CardTitle>
                            <CardDescription>
                              {selectedTemplate.description ||
                                "Sin descripción"}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            {activeTemplateId !== selectedTemplate.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleSetActive(selectedTemplate.id)
                                }
                                disabled={saving}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Activar
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewOpen(true)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Vista previa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleReplaceContent}
                            >
                              <Replace className="h-4 w-4 mr-1" />
                              Reemplazar
                            </Button>
                            <Button size="sm" onClick={handleEdit}>
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            {!selectedTemplate.isDefault && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete(selectedTemplate.id)
                                }
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Texto del contrato (solo lectura) */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          Contenido de la plantilla
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[500px] rounded border p-3">
                          <HighlightedContent text={selectedTemplate.content} />
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Variables detectadas */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          Variables detectadas ({detectedVariables.length})
                        </CardTitle>
                        <CardDescription>
                          Variables encontradas en el texto de la plantilla
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {detectedVariables.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No se detectaron variables en el texto.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {detectedVariables.map((v) => {
                              const known = CONTRACT_VARIABLES.find(
                                (cv) => cv.key === v.key,
                              );
                              return (
                                <Badge
                                  key={v.key}
                                  variant={known ? "secondary" : "destructive"}
                                  className="text-xs cursor-pointer"
                                  title={
                                    known
                                      ? `${known.description} (×${v.count})`
                                      : `Variable desconocida (×${v.count})`
                                  }
                                  onClick={() => handleCopyVariable(v.key)}
                                >
                                  {"{{"}
                                  {v.key}
                                  {"}}"}
                                  {v.count > 1 && (
                                    <span className="ml-1 opacity-60">
                                      ×{v.count}
                                    </span>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-20 text-center text-muted-foreground">
                      Selecciona una plantilla para ver su contenido
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Panel de variables */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Variables disponibles
                    </CardTitle>
                    <CardDescription>
                      Haz clic para copiar. Úsalas en el texto de la plantilla
                      con la sintaxis{" "}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {"{{VARIABLE}}"}
                      </code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {CONTRACT_VARIABLES.map((v) => (
                          <div
                            key={v.key}
                            className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                            onClick={() => handleCopyVariable(v.key)}
                          >
                            <Badge
                              variant="outline"
                              className="text-[10px] shrink-0 mt-0.5 font-mono"
                            >
                              {"{{"}
                              {v.key}
                              {"}}"}
                            </Badge>
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{v.label}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {v.description}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 italic">
                                Ej: {v.example}
                              </p>
                            </div>
                            <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50 mt-1" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Marcadores especiales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {SPECIAL_MARKERS.map((m) => (
                      <div
                        key={m.key}
                        className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(m.key);
                          toast({
                            title: "Copiado",
                            description: `${m.key} copiado al portapapeles.`,
                          });
                        }}
                      >
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 mt-0.5 font-mono"
                        >
                          {m.key}
                        </Badge>
                        <div>
                          <p className="text-xs font-medium">{m.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Info metadata */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Almacenamiento</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Entity:</span>{" "}
                        {CONTRACT_TEMPLATES_ENTITY}
                      </p>
                      <p>
                        <span className="font-medium">Record ID:</span>{" "}
                        {metaRecordId ?? "No creado aún"}
                      </p>
                      <p>
                        <span className="font-medium">Plantillas:</span>{" "}
                        {templates.length}
                      </p>
                      <p>
                        <span className="font-medium">Activa:</span>{" "}
                        {activeTemplateId ?? "Ninguna"}
                      </p>
                    </div>
                    {!metaRecordId && (
                      <div className="pt-1 space-y-2">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[11px] leading-tight">
                            Las plantillas aún no están guardadas en metadata.
                            Pulsa &quot;Crear metadata&quot; en la cabecera para
                            persistirlas.
                          </span>
                        </div>
                      </div>
                    )}
                    {metaRecordId != null && (
                      <Badge variant="default" className="text-[10px] w-fit">
                        Sincronizado
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* ── Dialog: Editor ───────────────────────────────────── */}
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="!max-w-[1000px] w-[95vw] h-[92vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editorIsNew ? "Nueva plantilla" : "Editar plantilla"}
              </DialogTitle>
              <DialogDescription>
                {editorIsNew
                  ? "Escribe o pega el contenido de la nueva plantilla de contrato."
                  : `Editando "${editorName}". Usa {{VARIABLE}} para los campos dinámicos.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tpl-name">Nombre</Label>
                  <Input
                    id="tpl-name"
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    placeholder="Nombre de la plantilla"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-desc">Descripción</Label>
                  <Input
                    id="tpl-desc"
                    value={editorDescription}
                    onChange={(e) => setEditorDescription(e.target.value)}
                    placeholder="Descripción breve"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Label>Contenido del contrato</Label>
                    <div className="flex rounded-md border overflow-hidden ml-3">
                      <button
                        type="button"
                        className={`px-3 py-1 text-xs font-medium transition-colors ${editorTab === "edit" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                        onClick={() => setEditorTab("edit")}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 text-xs font-medium transition-colors ${editorTab === "preview" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                        onClick={() => setEditorTab("preview")}
                      >
                        Variables resaltadas
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {editorContent.length.toLocaleString()} chars ·{" "}
                    {editorContent.split(/\r?\n/).length} líneas ·{" "}
                    {extractVariablesFromText(editorContent).length} variables
                  </p>
                </div>

                {editorTab === "edit" ? (
                  <Textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    className="flex-1 min-h-[300px] font-mono text-xs resize-none"
                    placeholder="Pega aquí el contenido del contrato con variables {{VARIABLE}}..."
                  />
                ) : (
                  <ScrollArea className="flex-1 min-h-[300px] rounded border p-3 bg-muted/20">
                    <HighlightedContent text={editorContent || " "} />
                  </ScrollArea>
                )}
              </div>

              {/* Variables rápidas en el editor */}
              <div className="flex flex-wrap gap-1">
                {CONTRACT_VARIABLES.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      handleCopyVariable(v.key);
                    }}
                    title={v.description}
                  >
                    {"{{"}
                    {v.key}
                    {"}}"}
                  </Badge>
                ))}
                {SPECIAL_MARKERS.map((m) => (
                  <Badge
                    key={m.key}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(m.key);
                      toast({
                        title: "Copiado",
                        description: `${m.key} copiado.`,
                      });
                    }}
                    title={m.description}
                  >
                    {m.key}
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEditor} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editorIsNew ? "Crear plantilla" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Vista previa ─────────────────────────────── */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Vista previa del contrato</DialogTitle>
              <DialogDescription>
                Se muestran las variables reemplazadas con valores de ejemplo.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full rounded border">
                <div className="p-6">
                  <PreviewHighlightedContent
                    text={selectedTemplate?.content || ""}
                  />
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Reemplazar contenido ──────────────────────── */}
        <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reemplazar contenido</DialogTitle>
              <DialogDescription>
                Sube un archivo .txt para reemplazar el contenido de
                <strong> &quot;{selectedTemplate?.name}&quot;</strong>. Las
                variables{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {"{{VARIABLE}}"}
                </code>{" "}
                se detectarán automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Selecciona un archivo .txt con el nuevo contenido
                </p>
                <Button
                  variant="outline"
                  onClick={() => replaceFileRef.current?.click()}
                >
                  Seleccionar archivo
                </Button>
                <input
                  ref={replaceFileRef}
                  type="file"
                  accept=".txt,.text"
                  className="hidden"
                  onChange={handleReplaceFileSelect}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReplaceDialogOpen(false)}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Nueva plantilla ──────────────────────────── */}
        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva plantilla de contrato</DialogTitle>
              <DialogDescription>
                Define el nombre y descripción. Luego podrás escribir o pegar el
                contenido.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nombre</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Contrato venta directa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-desc">Descripción (opcional)</Label>
                <Input
                  id="new-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Breve descripción del contrato"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmCreate}>Continuar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
