"use client";

/**
 * StudentAuditButton — Descarga en JSON toda la información disponible del alumno.
 * Fuentes incluidas:
 *   ✓ Perfil básico (nombre, email, código, estado, etapa, coaches)
 *   ✓ Historial de estatus       (getClienteEstatus)
 *   ✓ Historial de etapas/tareas (getClienteTareas)
 *   ✓ Tickets + comentarios de cada ticket
 *   ✓ Bonos asignados            (getBonoAssignmentsByAlumnoCodigo)
 *   ✓ Planes de pago + cuotas    (getPaymentPlansByClienteCodigo)
 *   ✓ Sesiones                   (listAlumnoSessions)
 *   ✓ Metadata (extra docs, etc.)
 *   ✓ Métricas ADS               (getAdsMetricByStudentCode)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import {
  ClipboardList,
  Loader2,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import {
  getStudentTickets,
  getClienteEstatus,
  getClienteTareas,
  getBonoAssignmentsByAlumnoCodigo,
  getAdsMetricByStudentCode,
} from "@/app/admin/alumnos/api";
import { getPaymentPlansByClienteCodigo } from "@/app/admin/alumnos/[code]/pagos/payments-plan.api";
import { listAlumnoSessions } from "@/app/admin/teamsv2/api";
import { listMetadata } from "@/lib/metadata";
import { getTicketComments } from "@/app/admin/tickets-board/api";
import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";

// ─── tipos internos ────────────────────────────────────────────

type StepStatus = "pending" | "loading" | "done" | "error";

type AuditStep = {
  id: string;
  label: string;
  status: StepStatus;
  count?: number;
  error?: string;
};

// ─── helpers ───────────────────────────────────────────────────

function slugDate() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── PDF helpers ───────────────────────────────────────────────

function fmtDate(v: any): string {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(v ?? "—");
  }
}

function fmtVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (Array.isArray(v)) return v.length === 0 ? "—" : `[${v.length}]`;
  if (typeof v === "object") {
    const str = JSON.stringify(v);
    return str.length > 80 ? str.slice(0, 77) + "…" : str;
  }
  return String(v);
}

function pdfTable(items: any[], preferredKeys?: string[]): string {
  if (!items || items.length === 0)
    return `<p style="text-align:center;color:#94a3b8;font-style:italic;font-size:12px;padding:14px;">Sin registros</p>`;
  const SKIP = ["comentarios", "cuotas", "metadata_extra", "__v", "updatedAt"];
  const allKeys = new Set<string>();
  items.slice(0, 30).forEach((item) => {
    if (item && typeof item === "object")
      Object.keys(item).forEach((k) => {
        if (!SKIP.includes(k)) allKeys.add(k);
      });
  });
  const ordered = preferredKeys
    ? [
        ...preferredKeys.filter((k) => allKeys.has(k)),
        ...[...allKeys].filter((k) => !preferredKeys!.includes(k)),
      ]
    : [...allKeys];
  const cols = ordered.slice(0, 7);
  const thead = cols
    .map(
      (k) =>
        `<th style="background:#f1f5f9;color:#475569;font-weight:600;text-align:left;padding:7px 10px;font-size:11px;border-bottom:2px solid #e2e8f0;white-space:nowrap;">${k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</th>`,
    )
    .join("");
  const tbody = items
    .map((item, i) => {
      const bg = i % 2 === 0 ? "white" : "#f8fafc";
      const cells = cols
        .map(
          (k) =>
            `<td style="padding:6px 10px;font-size:11px;color:#334155;border-bottom:1px solid #f1f5f9;">${fmtVal(item?.[k])}</td>`,
        )
        .join("");
      return `<tr style="background:${bg};">${cells}</tr>`;
    })
    .join("");
  return `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

function pdfKV(obj: any): string {
  if (!obj || typeof obj !== "object")
    return `<p style="text-align:center;color:#94a3b8;font-style:italic;font-size:12px;">Sin datos</p>`;
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 24);
  if (!entries.length)
    return `<p style="text-align:center;color:#94a3b8;font-style:italic;font-size:12px;">Sin datos disponibles</p>`;
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${entries
    .map(
      ([k, v]) =>
        `<div style="background:#f8fafc;border-radius:6px;padding:10px 12px;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${k.replace(/_/g, " ")}</div><div style="font-size:12px;color:#1e293b;font-weight:500;word-break:break-word;">${fmtVal(v)}</div></div>`,
    )
    .join("")}</div>`;
}

function pdfSection(
  num: string,
  title: string,
  badge: string,
  content: string,
): string {
  return `<div style="margin:0 32px 24px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #4f46e5;"><div style="background:#4f46e5;color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${num}</div><h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0;flex:1;">${title}</h3><span style="background:#ede9fe;color:#6d28d9;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:600;">${badge}</span></div>${content}</div>`;
}

function buildAuditHtml(
  report: Record<string, any>,
  studentCode: string,
  studentName: string,
): string {
  const fechaGen = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 01 Perfil
  const c = report.perfil?.cliente ?? {};
  const u = report.perfil?.usuario_sistema ?? {};
  const perfilRows: [string, string][] = [
    ["Nombre", fmtVal(c.nombre ?? c.name ?? c.nombre_completo)],
    ["Email", fmtVal(c.email ?? u.email)],
    ["Código", studentCode],
    ["Teléfono", fmtVal(c.telefono ?? c.phone)],
    ["País", fmtVal(c.pais ?? c.country)],
    ["Estatus", fmtVal(c.estatus ?? c.status)],
    ["Etapa", fmtVal(c.etapa ?? c.stage)],
    ["Inicio", fmtDate(c.fecha_inicio ?? c.start_date)],
    ["Fin", fmtDate(c.fecha_fin ?? c.end_date)],
    ["Agente / Coach", fmtVal(c.agente_asignado ?? c.agent ?? c.coach)],
    ["Rol sistema", fmtVal(u.rol ?? u.role)],
    ["Último acceso", fmtDate(u.ultimo_acceso ?? u.last_login)],
  ];
  const perfilContent = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${perfilRows.map(([k, v]) => `<div style="background:#f8fafc;border-radius:6px;padding:10px 12px;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${k}</div><div style="font-size:12px;color:#1e293b;font-weight:500;word-break:break-word;">${v}</div></div>`).join("")}</div>`;

  // 04 Tickets
  const tickets: any[] = report.tickets ?? [];
  const ticketsContent =
    tickets.length === 0
      ? `<p style="text-align:center;color:#94a3b8;font-style:italic;font-size:12px;padding:14px;">Sin tickets registrados</p>`
      : tickets
          .map((t: any, i: number) => {
            const coms: any[] = t.comentarios ?? [];
            const closed = ["cerrado", "closed", "resuelto"].includes(
              String(t.estado ?? "").toLowerCase(),
            );
            const badgeBg = closed ? "#dcfce7" : "#fef9c3";
            const badgeTx = closed ? "#166534" : "#854d0e";
            return `<div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;"><div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;"><span style="background:#4f46e5;color:white;border-radius:50%;width:18px;height:18px;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i + 1}</span><span style="font-weight:600;font-size:12px;flex:1;color:#1e293b;">${fmtVal(t.titulo ?? t.title ?? t.asunto ?? "Sin título")}</span><span style="background:${badgeBg};color:${badgeTx};border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600;">${fmtVal(t.estado ?? t.status ?? "—")}</span></div><div style="padding:8px 14px;"><div style="font-size:10px;color:#64748b;margin-bottom:6px;">${fmtVal(t.tipo ?? t.type ?? "—")} &nbsp;·&nbsp; ${fmtDate(t.fecha_creacion ?? t.created_at ?? t.fecha)}${t.prioridad ? ` &nbsp;·&nbsp; Prioridad: ${fmtVal(t.prioridad)}` : ""}</div>${t.descripcion ? `<p style="font-size:11px;color:#475569;margin:0 0 8px;line-height:1.5;">${String(t.descripcion).slice(0, 200)}${String(t.descripcion).length > 200 ? "…" : ""}</p>` : ""}${
              coms.length > 0
                ? `<div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;margin-top:6px;"><div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:6px;">💬 ${coms.length} comentario${coms.length > 1 ? "s" : ""}</div>${coms
                    .slice(0, 4)
                    .map(
                      (cm: any) =>
                        `<div style="border-left:2px solid #c4b5fd;padding-left:8px;margin-bottom:6px;"><div style="font-size:10px;color:#6d28d9;font-weight:600;">${fmtVal(cm.autor ?? cm.author ?? cm.agente ?? "—")} <span style="font-weight:400;color:#94a3b8;">${fmtDate(cm.fecha ?? cm.created_at)}</span></div><p style="font-size:11px;color:#374151;margin:2px 0 0;line-height:1.4;">${String(cm.texto ?? cm.contenido ?? cm.content ?? cm.mensaje ?? "—").slice(0, 150)}</p></div>`,
                    )
                    .join(
                      "",
                    )}${coms.length > 4 ? `<p style="font-size:10px;color:#94a3b8;font-style:italic;margin:4px 0 0;">… y ${coms.length - 4} más</p>` : ""}</div>`
                : ""
            }</div></div>`;
          })
          .join("");

  const estatus = report.historial_estatus ?? [];
  const etapas = report.historial_tareas_etapas ?? [];
  const bonos = report.bonos_asignados ?? [];
  const pagos = report.planes_pago ?? [];
  const sesiones = report.sesiones ?? [];
  const metadata = report.metadata ?? [];
  const ads = report.metricas_ads;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:white;font-family:Arial,Helvetica,sans-serif;"><div style="width:210mm;background:white;">
  <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:white;padding:36px 40px 32px;">
    <div style="background:rgba(255,255,255,0.18);display:inline-block;border-radius:20px;padding:4px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:18px;font-weight:700;">Auditoría Completa</div>
    <div style="font-size:28px;font-weight:700;margin-bottom:4px;line-height:1.2;">Reporte de Alumno</div>
    <div style="font-size:19px;font-weight:300;opacity:0.9;margin-bottom:22px;">${studentName}</div>
    <div style="display:flex;gap:32px;font-size:12px;border-top:1px solid rgba(255,255,255,0.25);padding-top:16px;">
      <div><div style="font-size:9px;opacity:0.7;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Código</div><strong>${studentCode}</strong></div>
      <div><div style="font-size:9px;opacity:0.7;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Generado</div><strong>${fechaGen}</strong></div>
      <div><div style="font-size:9px;opacity:0.7;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Módulos</div><strong>9 secciones</strong></div>
    </div>
  </div>
  <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 40px;font-size:10px;color:#64748b;letter-spacing:0.3px;">
    01 Perfil &nbsp;·&nbsp; 02 Estatus &nbsp;·&nbsp; 03 Etapas &nbsp;·&nbsp; 04 Tickets &nbsp;·&nbsp; 05 Bonos &nbsp;·&nbsp; 06 Pagos &nbsp;·&nbsp; 07 Sesiones &nbsp;·&nbsp; 08 Metadata &nbsp;·&nbsp; 09 ADS
  </div>
  <div style="padding:28px 0 16px;">
    ${pdfSection("01", "Perfil del Alumno", "1 registro", perfilContent)}
    ${pdfSection("02", "Historial de Estatus", `${estatus.length} registros`, pdfTable(estatus, ["fecha_cambio", "estatus_anterior", "estatus_nuevo", "cambiado_por", "nota"]))}
    ${pdfSection("03", "Etapas y Tareas", `${etapas.length} registros`, pdfTable(etapas, ["fecha", "etapa", "tarea", "estado", "agente", "nota"]))}
    ${pdfSection("04", "Tickets", `${tickets.length} tickets`, ticketsContent)}
    ${pdfSection("05", "Bonos Asignados", `${bonos.length} bonos`, pdfTable(bonos, ["bono_codigo", "bono_nombre", "fecha_asignacion", "estado", "descripcion"]))}
    ${pdfSection("06", "Planes de Pago", `${pagos.length} planes`, pdfTable(pagos, ["nombre", "monto_total", "moneda", "estado", "fecha_inicio", "fecha_fin"]))}
    ${pdfSection("07", "Sesiones", `${sesiones.length} sesiones`, pdfTable(sesiones, ["fecha", "tipo", "coach", "duracion", "estado", "nota"]))}
    ${pdfSection("08", "Metadata y Documentos", `${metadata.length} documentos`, pdfTable(metadata, ["tipo", "nombre", "url", "fecha_subida"]))}
    ${pdfSection("09", "Métricas ADS", ads ? "disponibles" : "sin datos", ads ? pdfKV(ads) : `<p style="text-align:center;color:#94a3b8;font-style:italic;font-size:12px;padding:14px;">Sin métricas ADS</p>`)}
  </div>
  <div style="margin:0 40px;padding:14px 0 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
    <span>Academia Plataforma — Auditoría Confidencial</span>
    <span>${studentCode} · ${new Date().toLocaleDateString("es-ES")}</span>
  </div>
</div></body></html>`;
}

async function generateAuditPdf(
  report: Record<string, any>,
  studentCode: string,
  studentName: string,
  filename: string,
) {
  // html2pdf.js es CJS – en Next.js el default puede ser el módulo completo o la función
  // @ts-ignore
  const mod = await import("html2pdf.js");
  // @ts-ignore
  const html2pdfFn: (...args: any[]) => any =
    typeof mod === "function"
      ? mod
      : typeof mod?.default === "function"
        ? mod.default
        : typeof (mod as any)?.default?.default === "function"
          ? (mod as any).default.default
          : null;

  if (!html2pdfFn)
    throw new Error("html2pdf.js no se pudo cargar correctamente");

  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:-9999px;top:0;z-index:-1;width:210mm;";
  container.innerHTML = buildAuditHtml(report, studentCode, studentName);
  document.body.appendChild(container);
  try {
    await html2pdfFn()
      .set({
        margin: 0,
        filename,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(container.firstElementChild)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

async function safeRun<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; error?: string }> {
  try {
    return { data: await fn() };
  } catch (e: any) {
    return {
      data: fallback,
      error: String(e?.message ?? e ?? "Error desconocido"),
    };
  }
}

/** Obtiene el perfil completo del alumno desde la API de clientes */
async function fetchStudentFull(code: string): Promise<any> {
  const token = getAuthToken();
  const url = buildUrl(`/client/get/client/${encodeURIComponent(code)}`);
  const res = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.data ?? json;
}

/** Obtiene el usuario del sistema (correo, rol, etc.) por código */
async function fetchUserByCode(code: string): Promise<any> {
  const token = getAuthToken();
  const url = buildUrl(`/users/${encodeURIComponent(code)}`);
  const res = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? json;
}

// ─── componente ────────────────────────────────────────────────

const INITIAL_STEPS = (studentName: string): AuditStep[] => [
  { id: "perfil", label: `Perfil: ${studentName}`, status: "pending" },
  { id: "estatus", label: "Historial de estatus", status: "pending" },
  { id: "etapas", label: "Historial de etapas y tareas", status: "pending" },
  { id: "tickets", label: "Tickets + comentarios", status: "pending" },
  { id: "bonos", label: "Bonos asignados", status: "pending" },
  { id: "pagos", label: "Planes de pago", status: "pending" },
  { id: "sesiones", label: "Sesiones", status: "pending" },
  { id: "metadata", label: "Metadata (documentos, etc.)", status: "pending" },
  { id: "ads", label: "Métricas ADS", status: "pending" },
];

export default function StudentAuditButton({
  studentCode,
  studentName,
}: {
  studentCode: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [steps, setSteps] = useState<AuditStep[]>([]);

  function resetState() {
    setRunning(false);
    setDone(false);
    setSteps([]);
  }

  function updateStep(id: string, patch: Partial<AuditStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function runAudit() {
    if (!studentCode) return;
    const initial = INITIAL_STEPS(studentName);
    setSteps(initial);
    setRunning(true);
    setDone(false);

    const report: Record<string, any> = {
      _meta: {
        generado_en: new Date().toISOString(),
        alumno_codigo: studentCode,
        alumno_nombre: studentName,
        version: "1.0",
      },
    };

    // ── 1. Perfil ──────────────────────────────────────────────
    updateStep("perfil", { status: "loading" });
    const perfilResult = await safeRun(async () => {
      const [full, usr] = await Promise.all([
        fetchStudentFull(studentCode),
        fetchUserByCode(studentCode),
      ]);
      return { cliente: full, usuario_sistema: usr };
    }, null);
    report.perfil = perfilResult.data;
    updateStep("perfil", {
      status: perfilResult.error ? "error" : "done",
      error: perfilResult.error,
      count: perfilResult.data ? 1 : 0,
    });

    // ── 2. Historial de estatus ────────────────────────────────
    updateStep("estatus", { status: "loading" });
    const estatusResult = await safeRun(
      () => getClienteEstatus(studentCode),
      [],
    );
    report.historial_estatus = estatusResult.data;
    updateStep("estatus", {
      status: estatusResult.error ? "error" : "done",
      error: estatusResult.error,
      count: estatusResult.data.length,
    });

    // ── 3. Historial de etapas y tareas ───────────────────────
    updateStep("etapas", { status: "loading" });
    const etapasResult = await safeRun(() => getClienteTareas(studentCode), []);
    report.historial_tareas_etapas = etapasResult.data;
    updateStep("etapas", {
      status: etapasResult.error ? "error" : "done",
      error: etapasResult.error,
      count: etapasResult.data.length,
    });

    // ── 4. Tickets + comentarios ───────────────────────────────
    updateStep("tickets", { status: "loading" });
    const ticketsResult = await safeRun(async () => {
      const tickets = await getStudentTickets(studentCode);
      // Para cada ticket que tenga codigo (UUID), cargar sus comentarios
      const enriched = await Promise.all(
        tickets.map(async (t) => {
          const codigo = t.codigo ?? t.id_externo ?? null;
          if (!codigo) return { ...t, comentarios: [] };
          const { data: comentarios } = await safeRun(
            () => getTicketComments(String(codigo)),
            [],
          );
          return { ...t, comentarios };
        }),
      );
      return enriched;
    }, []);
    report.tickets = ticketsResult.data;
    updateStep("tickets", {
      status: ticketsResult.error ? "error" : "done",
      error: ticketsResult.error,
      count: ticketsResult.data.length,
    });

    // ── 5. Bonos ───────────────────────────────────────────────
    updateStep("bonos", { status: "loading" });
    const bonosResult = await safeRun(
      () => getBonoAssignmentsByAlumnoCodigo(studentCode),
      [],
    );
    report.bonos_asignados = bonosResult.data;
    updateStep("bonos", {
      status: bonosResult.error ? "error" : "done",
      error: bonosResult.error,
      count: bonosResult.data.length,
    });

    // ── 6. Planes de pago ──────────────────────────────────────
    updateStep("pagos", { status: "loading" });
    const pagosResult = await safeRun(async () => {
      const raw = await getPaymentPlansByClienteCodigo(studentCode, {
        pageSize: 200,
      });
      return Array.isArray(raw) ? raw : ((raw as any)?.items ?? raw ?? []);
    }, []);
    report.planes_pago = pagosResult.data;
    updateStep("pagos", {
      status: pagosResult.error ? "error" : "done",
      error: pagosResult.error,
      count: Array.isArray(pagosResult.data)
        ? (pagosResult.data as any[]).length
        : 0,
    });

    // ── 7. Sesiones ────────────────────────────────────────────
    updateStep("sesiones", { status: "loading" });
    const sesionesResult = await safeRun(
      () => listAlumnoSessions(studentCode),
      [],
    );
    report.sesiones = sesionesResult.data;
    updateStep("sesiones", {
      status: sesionesResult.error ? "error" : "done",
      error: sesionesResult.error,
      count: sesionesResult.data.length,
    });

    // ── 8. Metadata ────────────────────────────────────────────
    updateStep("metadata", { status: "loading" });
    const metadataResult = await safeRun(async () => {
      const { items } = await listMetadata();
      return items.filter((r) => String(r.entity_id) === studentCode);
    }, []);
    report.metadata = metadataResult.data;
    updateStep("metadata", {
      status: metadataResult.error ? "error" : "done",
      error: metadataResult.error,
      count: metadataResult.data.length,
    });

    // ── 9. Métricas ADS ────────────────────────────────────────
    updateStep("ads", { status: "loading" });
    const adsResult = await safeRun(
      () => getAdsMetricByStudentCode(studentCode),
      null,
    );
    report.metricas_ads = adsResult.data;
    updateStep("ads", {
      status: adsResult.error ? "error" : "done",
      error: adsResult.error,
      count: adsResult.data ? 1 : 0,
    });

    // ── Descarga PDF ──────────────────────────────────────────
    const filename = `auditoria_${studentCode}_${slugDate()}.pdf`;
    try {
      await generateAuditPdf(report, studentCode, studentName, filename);
      toast({ title: "Auditoría descargada", description: filename });
    } catch (pdfErr: any) {
      console.error("[StudentAuditButton] Error generando PDF:", pdfErr);
      toast({
        title: "Error al generar el PDF",
        description: String(pdfErr?.message ?? pdfErr ?? "Error desconocido"),
        variant: "destructive",
      });
    }

    setRunning(false);
    setDone(true);
  }

  const doneCount = steps.filter(
    (s) => s.status === "done" || s.status === "error",
  ).length;
  const progress =
    steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
  const hasErrors = steps.some((s) => s.status === "error");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => {
          resetState();
          setOpen(true);
        }}
        title="Descargar auditoría completa del alumno"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        Auditoría
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (running) return; // bloquear cierre mientras corre
          setOpen(v);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Auditoría por alumno
            </DialogTitle>
            <DialogDescription>
              Recopila y descarga toda la información disponible de{" "}
              <span className="font-medium">{studentName}</span> como{" "}
              <span className="font-medium">PDF con formato profesional</span>.
            </DialogDescription>
          </DialogHeader>

          {/* Sin correr aún */}
          {!running && !done && steps.length === 0 && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Se incluirá lo siguiente:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>Perfil y datos del alumno</li>
                <li>Historial completo de estatus y etapas</li>
                <li>Todos los tickets + comentarios</li>
                <li>Bonos asignados</li>
                <li>Planes de pago y cuotas</li>
                <li>Historial de sesiones</li>
                <li>Documentos extra y metadata</li>
                <li>Métricas ADS</li>
              </ul>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={runAudit} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Generar y descargar
                </Button>
              </div>
            </div>
          )}

          {/* Corriendo */}
          {(running || (done && steps.length > 0)) && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progreso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                    style={{
                      background:
                        step.status === "error"
                          ? "hsl(var(--destructive)/0.08)"
                          : step.status === "done"
                            ? "hsl(var(--muted)/0.5)"
                            : step.status === "loading"
                              ? "hsl(var(--primary)/0.06)"
                              : undefined,
                    }}
                  >
                    <span className="flex-none">
                      {step.status === "loading" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      )}
                      {step.status === "done" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {step.status === "error" && (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      {step.status === "pending" && (
                        <span className="block h-3.5 w-3.5 rounded-full border border-border" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {step.label}
                    </span>
                    {step.status === "done" &&
                      typeof step.count === "number" && (
                        <span className="flex-none text-[11px] text-muted-foreground">
                          {step.count} reg.
                        </span>
                      )}
                    {step.status === "error" && step.error && (
                      <span
                        className="flex-none max-w-[120px] truncate text-[11px] text-destructive"
                        title={step.error}
                      >
                        {step.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {done && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  {hasErrors ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Algunos pasos fallaron, pero el archivo fue generado con
                      la información disponible.
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Auditoría completa. Revisa la carpeta de descargas.
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-none"
                    onClick={() => setOpen(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
