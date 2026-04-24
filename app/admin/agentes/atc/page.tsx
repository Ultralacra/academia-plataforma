"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  SendHorizonal,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-config";
import {
  dataService,
  type ClientItem,
  type Ticket,
  type TeamWithCounts,
} from "@/lib/data-service";

/* =========================
   Tipos
========================= */
type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type AreaKey = "ATC" | "Ads" | "Copy" | "Mentalidad" | "Técnico";

type CoachRaw = {
  codigo: string;
  nombre: string;
  puesto?: string | null;
  area?: string | null;
  alumnos: number;
  tickets: number;
};

type CoachAnalysis = {
  codigo: string;
  nombre: string;
  area: AreaKey;
  puesto?: string | null;
  alumnos_total: number;
  alumnos_activos_7d: number;
  alumnos_activos_30d: number;
  alumnos_inactivos_30d_mas: number;
  alumnos_sin_actividad_registrada: number;
  prom_dias_inactividad: number | null;
  alumnos_muy_activos: { nombre: string; inactividad_dias: number | null }[];
  tickets_totales_historicos: number;
  tickets_ultimos_7d: number;
  tickets_ultimos_30d: number;
  tickets_por_alumno_30d: number;
  tickets_por_dia_promedio_30d: number;
  score_carga: number; // menor = mejor
};

type AreaSummary = {
  area: AreaKey;
  coaches_considerados: number;
  total_alumnos: number;
  total_tickets_7d: number;
  total_tickets_30d: number;
  tickets_promedio_por_dia: number;
  promedio_alumnos_por_coach: number;
  promedio_tickets_30d_por_coach: number;
};

type AnalysisPayload = {
  generado_en: string;
  ventana_dias: number;
  coaches: CoachAnalysis[];
  resumen_por_area: AreaSummary[];
  alumnos_unicos_total: number;
  whitelists: {
    copy: string[];
    atc: string[];
    notas: string;
  };
};

/* =========================
   Whitelists (editable)
========================= */
const COPY_WHITELIST = [
  "Iván Hernandez",
  "Alexia Cardenas",
  "Diego",
  "Alma",
  "Lina Alfaro",
  "Daniel Aguilar",
  "Yanela Gonzalez",
  "Isabel Maestre",
  "Lina",
];

const ATC_WHITELIST = ["Alejandro", "Lizeth Tocaria", "Pedro"];

/* =========================
   Utilidades
========================= */
function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalize(str?: string | null) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Devuelve true si el nombre del coach "contiene" o coincide con algún entry del whitelist. */
function matchesWhitelist(coachName: string, whitelist: string[]) {
  const nc = normalize(coachName);
  if (!nc) return false;
  return whitelist.some((w) => {
    const nw = normalize(w);
    if (!nw) return false;
    // coincidencia exacta o contiene todas las palabras del whitelist
    const parts = nw.split(" ").filter(Boolean);
    return parts.every((p) => nc.includes(p));
  });
}

/** Decide el área final del coach.
 *  - Copy y ATC: SOLO si el nombre está en whitelist (el whitelist manda).
 *  - Ads / Mentalidad / Técnico: detecta por area/puesto.
 */
function pickArea(coach: CoachRaw): AreaKey | null {
  // 1) Whitelists mandan para Copy y ATC
  if (matchesWhitelist(coach.nombre, COPY_WHITELIST)) return "Copy";
  if (matchesWhitelist(coach.nombre, ATC_WHITELIST)) return "ATC";

  // 2) Detección por área/puesto para el resto
  const n = normalize(`${coach.area ?? ""} ${coach.puesto ?? ""}`);
  if (/\bads\b|public|advert|meta|facebook|tiktok|trafic/.test(n)) return "Ads";
  if (/mental|mindset|motiv|coach mental/.test(n)) return "Mentalidad";
  if (/tecn|soporte|support|helpdesk|sistema|\bti\b|\bit\b/.test(n))
    return "Técnico";

  return null;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function toDateSafe(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* =========================
   Fetch helpers
========================= */
async function fetchStudentsOfCoach(coachCode: string) {
  try {
    const json = await apiFetch<{ data?: any[] }>(
      `/client/get/clients-coaches?coach=${encodeURIComponent(coachCode)}`,
    );
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

/* =========================
   Presets y bienvenida
========================= */
const SUGGEST_PROMPT =
  "Dame el equipo sugerido para un alumno nuevo (1 coach de ATC, 1 de Ads, 1 de Copy, 1 de Mentalidad y 1 de Técnico). Elige siempre al coach con menor carga real, considerando alumnos asignados, actividad de sus alumnos y tickets de los últimos 7 y 30 días. Muéstrame la tabla con el equipo propuesto y después un análisis profundo (párrafo de 4-6 líneas) explicando por qué ese equipo es el más recomendable, citando números concretos.";

const PRESETS = [
  {
    label: "Equipo sugerido para alumno nuevo",
    value: SUGGEST_PROMPT,
    primary: true,
  },
  {
    label: "Coaches con menos carga por área",
    value:
      "Dame los 3 coaches con menor carga real en cada área (ATC, Ads, Copy, Mentalidad, Técnico) usando score de carga. Incluye tabla con alumnos totales, alumnos activos últimos 7 días, tickets últimos 7 y 30 días.",
  },
  {
    label: "Informantes más ruidosos",
    value:
      "¿Qué alumnos (informantes) han generado más tickets en los últimos 30 días? Dame una tabla con nombre, cantidad de tickets y su coach actual si aparece en los datos.",
  },
];

const WELCOME = `Hola 👋 Soy el agente **ATC Administrativo**.

Analizo la carga real de cada coach cruzando:
- **Alumnos asignados** y su nivel de actividad (inactividad, alumnos muy activos).
- **Tickets creados** en los últimos 7 y 30 días.
- **Área** (ATC, Ads, Copy, Mentalidad, Técnico) con listas blancas para Copy y ATC.

Puedo recomendarte el **equipo ideal para un alumno nuevo** priorizando coaches con menos carga y justificar la decisión con números.`;

/* =========================
   Markdown mini-renderer
========================= */
function renderInlineMarkdown(text: string) {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = escape(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function renderMarkdown(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s:-|]+$/.test(lines[i + 1])
    ) {
      const header = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((s) => s.trim());
        rows.push(cells);
        i++;
      }
      out.push(
        `<div class="my-3 overflow-x-auto"><table class="w-full border-collapse text-xs"><thead><tr>${header
          .map(
            (h) =>
              `<th class="border border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-semibold text-slate-700">${renderInlineMarkdown(h)}</th>`,
          )
          .join("")}</tr></thead><tbody>${rows
          .map(
            (r) =>
              `<tr>${r
                .map(
                  (c) =>
                    `<td class="border border-slate-200 px-2 py-1.5 text-slate-700">${renderInlineMarkdown(c)}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}</tbody></table></div>`,
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        `<ul class="my-2 list-disc pl-5 space-y-1">${items
          .map((it) => `<li>${renderInlineMarkdown(it)}</li>`)
          .join("")}</ul>`,
      );
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^(#{1,3})\s+/)?.[1].length ?? 2;
      const content = line.replace(/^#{1,3}\s+/, "");
      const size =
        level === 1
          ? "text-lg font-bold"
          : level === 2
            ? "text-base font-semibold"
            : "text-sm font-semibold";
      out.push(
        `<p class="mt-3 mb-1 ${size}">${renderInlineMarkdown(content)}</p>`,
      );
      i++;
      continue;
    }
    if (line.trim() === "") {
      out.push("<br/>");
    } else {
      out.push(`<p class="my-1">${renderInlineMarkdown(line)}</p>`);
    }
    i++;
  }
  return out.join("");
}

/* =========================
   Workspace
========================= */
function AtcAgentWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId("assistant"), role: "assistant", content: WELCOME },
  ]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [topInformantes, setTopInformantes] = useState<
    { nombre: string; tickets: number }[]
  >([]);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const loadAll = useMemo(
    () => async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const now = new Date();
        const since30 = new Date(now);
        since30.setDate(since30.getDate() - 30);

        // 1) Cargar en paralelo coaches, clients y tickets (30 días)
        const [teamsRes, clientsRes, ticketsRes] = await Promise.all([
          dataService.getTeamsV2({ page: 1, pageSize: 10000, search: "" }),
          dataService.getClients({ page: 1, pageSize: 2000, search: "" }),
          dataService.getTickets({
            fechaDesde: fmtDate(since30),
            fechaHasta: fmtDate(now),
            pageSize: 500,
          }),
        ]);

        const rawCoaches: CoachRaw[] = (
          (teamsRes.data as TeamWithCounts[]) ?? []
        ).map((r) => ({
          codigo: String(r.codigo ?? r.id),
          nombre: String(r.nombre ?? "").trim() || "—",
          puesto: r.puesto ?? null,
          area: r.area ?? null,
          alumnos: Number(r.nAlumnos ?? 0) || 0,
          tickets: Number(r.ticketsCount ?? 0) || 0,
        }));

        // 2) Seleccionar coaches según whitelists / área
        const selected: (CoachRaw & { area: AreaKey })[] = [];
        for (const c of rawCoaches) {
          const area = pickArea(c);
          if (!area) continue;
          selected.push({ ...c, area });
        }

        // 3) Index de alumnos por código (para cruzar actividad)
        const clients: ClientItem[] = clientsRes.items ?? [];
        const clientByCode = new Map<string, ClientItem>();
        const clientById = new Map<string, ClientItem>();
        for (const cl of clients) {
          if (cl.code) clientByCode.set(String(cl.code), cl);
          if (cl.id != null) clientById.set(String(cl.id), cl);
        }

        // 4) Tickets: map por codigo_equipo → tickets[]
        const tickets: Ticket[] = ticketsRes.items ?? [];
        const ticketsByCoach = new Map<string, Ticket[]>();
        for (const t of tickets) {
          for (const co of t.coaches ?? []) {
            const code = String(co.codigo_equipo ?? "").trim();
            if (!code) continue;
            const arr = ticketsByCoach.get(code) ?? [];
            arr.push(t);
            ticketsByCoach.set(code, arr);
          }
        }

        // Top informantes (por nombre si existe)
        const informCount = new Map<string, number>();
        for (const t of tickets) {
          const name = (t.informante_nombre ?? t.alumno_nombre ?? "").trim();
          if (!name) continue;
          informCount.set(name, (informCount.get(name) ?? 0) + 1);
        }
        const topInf = Array.from(informCount.entries())
          .map(([nombre, tickets]) => ({ nombre, tickets }))
          .sort((a, b) => b.tickets - a.tickets)
          .slice(0, 10);
        setTopInformantes(topInf);

        // 5) Para cada coach seleccionado: fetch alumnos + métricas de actividad
        const uniqueStudents = new Set<string>();
        const analysisRows: CoachAnalysis[] = await Promise.all(
          selected.map(async (co) => {
            const rawStudents = await fetchStudentsOfCoach(co.codigo);

            let activos7 = 0;
            let activos30 = 0;
            let inactivos30 = 0;
            let sinActividad = 0;
            let sumaInact = 0;
            let countInact = 0;
            const muyActivos: CoachAnalysis["alumnos_muy_activos"] = [];

            for (const s of rawStudents) {
              const idAlumno = String(s?.id_alumno ?? "");
              if (idAlumno) uniqueStudents.add(idAlumno);
              const cl =
                clientByCode.get(idAlumno) ?? clientById.get(idAlumno) ?? null;

              // Intentamos obtener inactividad desde varias fuentes
              let inact: number | null = null;
              if (typeof s?.inactividad === "number") inact = s.inactividad;
              else if (
                cl?.inactivityDays != null &&
                !isNaN(Number(cl.inactivityDays))
              )
                inact = Number(cl.inactivityDays);
              else {
                const last =
                  toDateSafe(s?.ultima_actividad) ??
                  toDateSafe(cl?.lastActivity ?? null);
                if (last) inact = daysBetween(now, last);
              }

              if (inact == null) {
                sinActividad++;
              } else {
                sumaInact += inact;
                countInact++;
                if (inact <= 7) activos7++;
                if (inact <= 30) activos30++;
                if (inact > 30) inactivos30++;
                if (inact <= 3) {
                  muyActivos.push({
                    nombre: String(s?.alumno_nombre ?? cl?.name ?? "—").trim(),
                    inactividad_dias: inact,
                  });
                }
              }
            }

            const ticketsCoach = ticketsByCoach.get(co.codigo) ?? [];
            let t7 = 0;
            let t30 = 0;
            const cutoff7 = new Date(now);
            cutoff7.setDate(cutoff7.getDate() - 7);
            for (const t of ticketsCoach) {
              const d = toDateSafe(t.creacion);
              if (!d) continue;
              t30++;
              if (d >= cutoff7) t7++;
            }

            const alumnos_total = rawStudents.length || co.alumnos || 0;
            const tickets_por_alumno_30d =
              alumnos_total > 0 ? Number((t30 / alumnos_total).toFixed(2)) : 0;
            const tickets_por_dia_promedio_30d = Number((t30 / 30).toFixed(2));
            const prom_dias_inactividad =
              countInact > 0
                ? Number((sumaInact / countInact).toFixed(1))
                : null;

            // Score de carga: pesa alumnos y tickets recientes
            const score_carga = Number(
              (
                alumnos_total +
                1.5 * t7 +
                0.5 * t30 +
                0.25 * activos7 -
                0.1 * inactivos30
              ).toFixed(2),
            );

            return {
              codigo: co.codigo,
              nombre: co.nombre,
              area: co.area,
              puesto: co.puesto ?? null,
              alumnos_total,
              alumnos_activos_7d: activos7,
              alumnos_activos_30d: activos30,
              alumnos_inactivos_30d_mas: inactivos30,
              alumnos_sin_actividad_registrada: sinActividad,
              prom_dias_inactividad,
              alumnos_muy_activos: muyActivos
                .sort(
                  (a, b) =>
                    (a.inactividad_dias ?? 999) - (b.inactividad_dias ?? 999),
                )
                .slice(0, 5),
              tickets_totales_historicos: co.tickets,
              tickets_ultimos_7d: t7,
              tickets_ultimos_30d: t30,
              tickets_por_alumno_30d,
              tickets_por_dia_promedio_30d,
              score_carga,
            };
          }),
        );

        // 6) Resumen por área
        const areaMap = new Map<AreaKey, CoachAnalysis[]>();
        for (const r of analysisRows) {
          const arr = areaMap.get(r.area) ?? [];
          arr.push(r);
          areaMap.set(r.area, arr);
        }
        const resumenPorArea: AreaSummary[] = Array.from(areaMap.entries())
          .map(([area, arr]) => {
            const total_alumnos = arr.reduce((a, b) => a + b.alumnos_total, 0);
            const total_tickets_7d = arr.reduce(
              (a, b) => a + b.tickets_ultimos_7d,
              0,
            );
            const total_tickets_30d = arr.reduce(
              (a, b) => a + b.tickets_ultimos_30d,
              0,
            );
            return {
              area,
              coaches_considerados: arr.length,
              total_alumnos,
              total_tickets_7d,
              total_tickets_30d,
              tickets_promedio_por_dia: Number(
                (total_tickets_30d / 30).toFixed(2),
              ),
              promedio_alumnos_por_coach:
                arr.length > 0
                  ? Number((total_alumnos / arr.length).toFixed(1))
                  : 0,
              promedio_tickets_30d_por_coach:
                arr.length > 0
                  ? Number((total_tickets_30d / arr.length).toFixed(1))
                  : 0,
            };
          })
          .sort((a, b) => a.area.localeCompare(b.area));

        setAnalysis({
          generado_en: now.toISOString(),
          ventana_dias: 30,
          coaches: analysisRows.sort((a, b) => a.score_carga - b.score_carga),
          resumen_por_area: resumenPorArea,
          alumnos_unicos_total: uniqueStudents.size,
          whitelists: {
            copy: COPY_WHITELIST,
            atc: ATC_WHITELIST,
            notas:
              "Copy y ATC están restringidos a whitelist. Ads, Mentalidad y Técnico usan todos los coaches disponibles con esa área.",
          },
        });
      } catch (err: any) {
        setDataError(err?.message ?? "No se pudo cargar la información.");
      } finally {
        setLoadingData(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const areaCounts = useMemo(() => {
    const map: Record<AreaKey, number> = {
      ATC: 0,
      Ads: 0,
      Copy: 0,
      Mentalidad: 0,
      Técnico: 0,
    };
    for (const c of analysis?.coaches ?? []) map[c.area]++;
    return map;
  }, [analysis]);

  const sendMessage = async (preset?: string) => {
    const value = (preset ?? draft).trim();
    if (!value || isThinking || !analysis) return;

    const userMsg: ChatMessage = {
      id: makeId("user"),
      role: "user",
      content: value,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft("");
    setIsThinking(true);

    try {
      const payloadMessages = nextMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/agentes/atc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          analysis,
          top_informantes: topInformantes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Error del servidor (${res.status}).`);
      }

      setMessages((cur) => [
        ...cur,
        {
          id: makeId("assistant"),
          role: "assistant",
          content:
            String(data?.text ?? "").trim() ||
            "No se recibió respuesta del modelo.",
        },
      ]);
    } catch (err: any) {
      setMessages((cur) => [
        ...cur,
        {
          id: makeId("assistant"),
          role: "assistant",
          content: `⚠️ No pude obtener respuesta: ${err?.message ?? "error desconocido"}.`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const totalCoaches = analysis?.coaches.length ?? 0;
  const totalTickets30d =
    analysis?.resumen_por_area.reduce((a, b) => a + b.total_tickets_30d, 0) ??
    0;
  const totalAlumnosUnicos = analysis?.alumnos_unicos_total ?? 0;
  const totalAsignaciones =
    analysis?.resumen_por_area.reduce((a, b) => a + b.total_alumnos, 0) ?? 0;

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 shadow-md">
      {/* Sidebar */}
      <div className="flex w-64 shrink-0 flex-col bg-[#0f0f0f] text-white">
        <div className="border-b border-white/10 px-4 py-4">
          <Link
            href="/admin/agentes"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Agentes
          </Link>
        </div>

        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-400/20">
              <ClipboardCheck className="h-4 w-4 text-sky-400" />
            </div>
            <span className="text-sm font-semibold">ATC Administrativo</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Claude Opus
          </div>
        </div>

        <div className="flex-1 overflow-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-white/30">
            Datos analizados
          </p>
          {loadingData ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando datos…
            </div>
          ) : dataError ? (
            <div className="mb-2 rounded-lg bg-red-500/15 px-3 py-2 text-[11px] text-red-200">
              {dataError}
            </div>
          ) : (
            <div className="space-y-1.5 px-2 text-[11px] text-white/60">
              <div>
                Coaches:{" "}
                <span className="font-semibold text-white">{totalCoaches}</span>
              </div>
              <div>
                Alumnos únicos:{" "}
                <span className="font-semibold text-white">
                  {totalAlumnosUnicos}
                </span>
              </div>
              <div title="Suma de asignaciones (un alumno puede tener varios coaches)">
                Asignaciones totales:{" "}
                <span className="font-semibold text-white">
                  {totalAsignaciones}
                </span>
              </div>
              <div>
                Tickets últimos 30d:{" "}
                <span className="font-semibold text-white">
                  {totalTickets30d}
                </span>
              </div>
              <div className="mt-3 h-px bg-white/10" />
              {(Object.keys(areaCounts) as AreaKey[]).map((k) => (
                <div key={k}>
                  {k}:{" "}
                  <span className="font-semibold text-white">
                    {areaCounts[k]}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => loadAll()}
            disabled={loadingData}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`}
            />
            Refrescar análisis
          </button>
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col bg-[#f7f7f8]">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100">
            <Bot className="h-4 w-4 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Agente ATC Administrativo
            </p>
            <p className="text-xs text-slate-500">
              Sugiere el mejor equipo combinando carga de coach, actividad de
              alumnos y tickets recientes.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isAssistant ? "" : "justify-end"}`}
                >
                  {isAssistant && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100">
                      <Bot className="h-4 w-4 text-sky-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-white text-slate-900 shadow-sm"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    {isAssistant ? (
                      <div
                        className="prose prose-sm max-w-none [&_p]:my-1 [&_table]:my-2"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(message.content),
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking ? (
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100">
                  <Bot className="h-4 w-4 text-sky-600" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3.5 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            ) : null}
            <div ref={bottomAnchorRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => sendMessage(p.value)}
                  disabled={isThinking || loadingData || !analysis}
                  className={`rounded-full px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    p.primary
                      ? "border border-sky-300 bg-sky-50 text-sky-700 hover:border-sky-400 hover:bg-sky-100"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors focus-within:border-slate-400 focus-within:bg-white">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe tu consulta administrativa o pide un equipo sugerido…"
                className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={
                  !draft.trim() || isThinking || loadingData || !analysis
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Enter envía · Shift + Enter = nueva línea
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AtcAgentPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <AtcAgentWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
