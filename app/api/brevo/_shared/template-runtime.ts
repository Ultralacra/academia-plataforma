import { buildUrl } from "@/lib/api-config";

type MetadataTemplatePayload = {
  key?: string;
  subject?: string;
  html?: string;
  text?: string;
  activo?: boolean | string | number;
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

function coerceList(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== "object") return [];
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && typeof res.data === "object") {
    if (Array.isArray(res.data.items)) return res.data.items;
    if (Array.isArray(res.data.data)) return res.data.data;
  }
  return [];
}

function resolvePath(obj: Record<string, any>, path: string) {
  return path.split(".").reduce<any>((acc, part) => {
    if (acc == null) return undefined;
    return acc[part];
  }, obj);
}

export function interpolateTemplateVariables(
  input: string,
  vars: Record<string, any>,
) {
  const source = String(input ?? "");
  return source.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key) => {
    const value = resolvePath(vars, String(key));
    if (value == null) return "";
    return String(value);
  });
}

export async function fetchMailTemplateOverride(
  token: string | null,
  templateKey: string,
) {
  if (!token) return null;
  try {
    const res = await fetch(buildUrl("/metadata"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    const items = coerceList(json);
    const normalizedKey = String(templateKey || "").trim().toLowerCase();

    // 1) Prioridad: registro unificado "all_templates"
    const allRecord = items.find((item) => {
      const entity = String(item?.entity || "").trim();
      const entityId = String(item?.entity_id || "").trim().toLowerCase();
      return entity === "plantillas_mails" && entityId === "all_templates";
    });

    if (allRecord) {
      const templates = allRecord?.payload?.templates;
      if (templates && typeof templates === "object") {
        const tplPayload: MetadataTemplatePayload | undefined = templates[normalizedKey];
        if (tplPayload) {
          if (!toBoolean(tplPayload?.activo, true)) return null;
          return tplPayload;
        }
      }
    }

    // 2) Fallback: registros individuales (legacy)
    const found = items.find((item) => {
      const entity = String(item?.entity || "").trim();
      if (entity !== "plantillas_mails") return false;

      const entityId = String(item?.entity_id || "")
        .trim()
        .toLowerCase();
      const payloadKey = String(item?.payload?.key || "")
        .trim()
        .toLowerCase();

      return entityId === normalizedKey || payloadKey === normalizedKey;
    });

    if (!found) return null;
    const payload: MetadataTemplatePayload = found.payload || {};
    if (!toBoolean(payload?.activo, true)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function applyTemplateOverrideWithVars(
  base: { subject: string; html: string; text: string },
  override: MetadataTemplatePayload | null,
  vars: Record<string, any>,
) {
  const subjectSource = String(override?.subject ?? base.subject ?? "");
  const htmlSource = String(override?.html ?? base.html ?? "");
  const textSource = String(override?.text ?? base.text ?? "");

  return {
    subject: interpolateTemplateVariables(subjectSource, vars),
    html: interpolateTemplateVariables(htmlSource, vars),
    text: interpolateTemplateVariables(textSource, vars),
  };
}
