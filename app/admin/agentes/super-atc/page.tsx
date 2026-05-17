"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Textarea } from "@/components/ui/textarea";
import { getAuthToken } from "@/lib/auth";
import {
  AgenteAtcChat,
  type AIProvider,
} from "@/components/chat/AgenteAtcChat";
import { AI_PROVIDER_KEY } from "@/app/admin/agentes/page";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";
const KB_ENTITY = "super_atc_knowledge_base";
const KB_ENTITY_ID = "v1";

type Tab = "kb" | "copilot" | "test";

// ─── KB Types ─────────────────────────────────────────────────────────────────

interface KbSecciones {
  protocolos: string;
  contratos: string;
  faqs: string;
  casos_historicos: string;
  limitaciones: string;
}

const KB_DEFAULTS: KbSecciones = {
  protocolos: "",
  contratos: "",
  faqs: "",
  casos_historicos: "",
  limitaciones: `El agente NO puede:
- Aprobar reembolsos
- Aprobar garantías
- Dar excepciones
- Negociar valores
- Aprobar extensiones extraordinarias
- Contradecir protocolos
- Modificar contratos`,
};

const KB_SECTIONS: {
  key: keyof KbSecciones;
  label: string;
  icon: React.FC<{ className?: string }>;
  placeholder: string;
  description: string;
}[] = [
  {
    key: "protocolos",
    label: "Protocolos Operativos",
    icon: ShieldCheck,
    description:
      "Protocolos de garantías, pausas, extensiones, membresías, reembolsos, bonos",
    placeholder: `Protocolo de Garantías:
- Condiciones para solicitar garantía: ...
- Requisitos: ...

Protocolo de Pausas:
- Máximo 30 días por contrato
- ...

Protocolo de Extensiones:
- Tipos: contractual, extraordinaria, membresía
- ...`,
  },
  {
    key: "contratos",
    label: "Contratos",
    icon: FileText,
    description: "Hotselling PRO, Membresías, Otrosíes / Addendums",
    placeholder: `Contrato Hotselling PRO:
- Duración: 4 meses (puede ser 5 o 6)
- Incluye: ...
- Condiciones de garantía: ...

Membresía:
- Duración: 1 mes (30 días)
- ...`,
  },
  {
    key: "faqs",
    label: "FAQs Operativas",
    icon: BookOpen,
    description: "Preguntas frecuentes de alumnos y respuestas estandarizadas",
    placeholder: `P: ¿Cómo solicito una pausa?
R: Para solicitar una pausa, debes...

P: ¿Qué pasa cuando vence mi contrato?
R: Al vencer el contrato, puedes...

P: ¿Cómo accedo al material del programa?
R: El acceso se gestiona a través de...`,
  },
  {
    key: "casos_historicos",
    label: "Casos Históricos",
    icon: Database,
    description: "Crisis resueltas, inconformidades, escalaciones exitosas",
    placeholder: `Caso: Alumna con crisis financiera — Resuelta
Contexto: La alumna expresó no poder pagar su cuota...
Resolución: Se gestionó un plan de pago de 3 cuotas...
Aprendizaje: Siempre escalar cobros con más de 1 cuota en retraso.

Caso: Solicitud de garantía con requisitos incompletos
Contexto: ...`,
  },
  {
    key: "limitaciones",
    label: "Limitaciones del Agente",
    icon: Zap,
    description: "Lo que el agente NO puede hacer — protección operativa",
    placeholder: `El agente NO puede:
- Aprobar reembolsos...`,
  },
];

// ─── KB Editor Tab ────────────────────────────────────────────────────────────

function KbEditorTab() {
  const [secciones, setSecciones] = useState<KbSecciones>(KB_DEFAULTS);
  const [saving, setSaving] = useState<keyof KbSecciones | null>(null);
  const [saved, setSaved] = useState<
    Partial<Record<keyof KbSecciones, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [metadataId, setMetadataId] = useState<string | null>(null);

  async function apiFetch(path: string, options?: RequestInit) {
    const token = getAuthToken();
    const url = path.startsWith("http") ? path : `${API_HOST}${path}`;
    return fetch(url, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  }

  const loadKb = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/metadata");
      if (!res.ok) return;
      const json = (await res.json()) as unknown;
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(json)) items = json as Record<string, unknown>[];
      else if (json && typeof json === "object") {
        const j = json as Record<string, unknown>;
        if (Array.isArray(j.data)) items = j.data as Record<string, unknown>[];
        else if (j.data && typeof j.data === "object") {
          const d = j.data as Record<string, unknown>;
          if (Array.isArray(d.items))
            items = d.items as Record<string, unknown>[];
        }
      }
      const found = items.find(
        (i) => i.entity === KB_ENTITY && i.entity_id === KB_ENTITY_ID,
      );
      if (found) {
        setMetadataId(String(found.id ?? ""));
        const payload = found.payload as Record<string, unknown> | undefined;
        if (payload?.secciones && typeof payload.secciones === "object") {
          const s = payload.secciones as Partial<KbSecciones>;
          setSecciones((prev) => ({ ...prev, ...s }));
        }
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadKb();
  }, [loadKb]);

  async function saveSection(key: keyof KbSecciones) {
    setSaving(key);
    try {
      const payload = { secciones };
      let res: Response;
      if (metadataId) {
        res = await apiFetch(`/metadata/${metadataId}`, {
          method: "PUT",
          body: JSON.stringify({ payload }),
        });
      } else {
        res = await apiFetch("/metadata", {
          method: "POST",
          body: JSON.stringify({
            entity: KB_ENTITY,
            entity_id: KB_ENTITY_ID,
            payload,
          }),
        });
        if (res.ok) {
          const json = (await res.clone().json()) as unknown;
          if (json && typeof json === "object") {
            const j = json as Record<string, unknown>;
            const id = (j.data as Record<string, unknown>)?.id ?? j.id;
            if (id) setMetadataId(String(id));
          }
        }
      }
      if (res.ok) {
        setSaved((prev) => ({
          ...prev,
          [key]: new Date().toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
      }
    } catch {
      // silencioso
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
        Esta base de conocimiento se inyecta automáticamente en el contexto del
        agente en cada consulta. Mantenerla actualizada mejora la calidad de las
        respuestas.
      </div>

      {KB_SECTIONS.map(
        ({ key, label, icon: Icon, placeholder, description }) => (
          <div
            key={key}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saved[key] && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Guardado {saved[key]}
                  </span>
                )}
                <button
                  onClick={() => void saveSection(key)}
                  disabled={saving === key}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving === key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Guardar
                </button>
              </div>
            </div>
            <div className="p-4">
              <Textarea
                value={secciones[key]}
                onChange={(e) =>
                  setSecciones((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={placeholder}
                rows={8}
                className="font-mono text-xs leading-relaxed resize-y"
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

// ─── Copilot Tab ──────────────────────────────────────────────────────────────

function CopilotTab({ provider }: { provider: AIProvider }) {
  const [alumnoCode, setAlumnoCode] = useState("");
  const [alumnoName, setAlumnoName] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [activeName, setActiveName] = useState("");
  const [key, setKey] = useState(0);

  function handleStart() {
    if (!alumnoCode.trim()) return;
    setActiveCode(alumnoCode.trim());
    setActiveName(alumnoName.trim() || alumnoCode.trim());
    setKey((k) => k + 1);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Code input */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Código del alumno
          </label>
          <input
            value={alumnoCode}
            onChange={(e) => setAlumnoCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="CXA-574"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Nombre (opcional)
          </label>
          <input
            value={alumnoName}
            onChange={(e) => setAlumnoName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="Juan Pérez"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
          />
        </div>
        <button
          onClick={handleStart}
          disabled={!alumnoCode.trim()}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-40"
        >
          <Search className="h-4 w-4" />
          Cargar contexto
        </button>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        Modo Copiloto ATC — Las respuestas del agente son sugerencias para el
        equipo. El ATC siempre valida antes de enviar al alumno.
      </div>

      {/* Chat */}
      {activeCode ? (
        <AgenteAtcChat
          key={key}
          alumnoCode={activeCode}
          alumnoName={activeName}
          mode="atc_team"
          provider={provider}
          welcomeMessage={`Contexto cargado para: **${activeName}** (${activeCode}). ¿Qué consulta de este alumno necesitas analizar?`}
          className="flex-1"
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Ingresa el código del alumno para cargar su contexto
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Test Alumno Tab ──────────────────────────────────────────────────────────

function TestAlumnoTab({ provider }: { provider: AIProvider }) {
  const [alumnoCode, setAlumnoCode] = useState("");
  const [alumnoName, setAlumnoName] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [activeName, setActiveName] = useState("");
  const [key, setKey] = useState(0);

  function handleStart() {
    if (!alumnoCode.trim()) return;
    setActiveCode(alumnoCode.trim());
    setActiveName(alumnoName.trim() || alumnoCode.trim());
    setKey((k) => k + 1);
  }

  const welcomeMessage = activeName
    ? `¡Hola ${activeName.split(" ")[0]}! 👋 Soy tu Asistente ATC de Hotselling PRO. ¿En qué te puedo ayudar hoy?\n\n*(Modo prueba admin — simulando vista del alumno)*`
    : undefined;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Code input */}
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 shadow-sm dark:border-amber-800/40 dark:bg-amber-900/20 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-amber-700 dark:text-amber-400">
            Código del alumno a simular
          </label>
          <input
            value={alumnoCode}
            onChange={(e) => setAlumnoCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="CXA-574"
            className="w-full rounded-xl border border-amber-200 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-amber-800/60"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-amber-700 dark:text-amber-400">
            Nombre
          </label>
          <input
            value={alumnoName}
            onChange={(e) => setAlumnoName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="Nombre del alumno"
            className="w-full rounded-xl border border-amber-200 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-amber-800/60"
          />
        </div>
        <button
          onClick={handleStart}
          disabled={!alumnoCode.trim()}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
        >
          <Bot className="h-4 w-4" />
          Simular alumno
        </button>
      </div>

      {/* Chat */}
      {activeCode ? (
        <AgenteAtcChat
          key={key}
          alumnoCode={activeCode}
          alumnoName={activeName}
          mode="alumno"
          provider={provider}
          welcomeMessage={welcomeMessage}
          className="flex-1"
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16">
          <Bot className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Ingresa el código del alumno para simular su experiencia
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function SuperAtcContent() {
  const [activeTab, setActiveTab] = useState<Tab>("kb");
  const [provider, setProvider] = useState<AIProvider>("anthropic");

  useEffect(() => {
    const saved = localStorage.getItem(AI_PROVIDER_KEY) as AIProvider | null;
    if (saved === "openai" || saved === "anthropic") setProvider(saved);
  }, []);

  const tabs: {
    id: Tab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: "kb", label: "Base de Conocimiento", icon: Database },
    { id: "copilot", label: "Copiloto ATC", icon: Bot },
    { id: "test", label: "Prueba Alumno", icon: Users },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/agentes"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Agentes
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-teal-200/60 bg-linear-to-br from-teal-50/80 via-emerald-50/40 to-teal-50/80 p-6 shadow-sm dark:border-teal-800/40 dark:from-teal-900/20 dark:via-emerald-900/10 dark:to-teal-900/20">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-teal-400 to-emerald-500 text-white shadow-md">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Super Agente ATC
                </h1>
                <p className="text-sm text-muted-foreground">
                  Copiloto del equipo ATC + asistente autónomo para alumnos
                </p>
              </div>
            </div>

            {/* Provider selector */}
            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Modelo IA
              </span>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-background/60 p-1">
                {(["anthropic", "openai"] as AIProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProvider(p);
                      localStorage.setItem(AI_PROVIDER_KEY, p);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      provider === p
                        ? p === "anthropic"
                          ? "bg-linear-to-r from-[#c96442] to-[#a8522e] text-white shadow"
                          : "bg-linear-to-r from-[#10a37f] to-[#0d8a6a] text-white shadow"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p === "anthropic" ? "Anthropic" : "OpenAI"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "kb" && <KbEditorTab />}
        {activeTab === "copilot" && (
          <div
            className="flex flex-col"
            style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}
          >
            <CopilotTab provider={provider} />
          </div>
        )}
        {activeTab === "test" && (
          <div
            className="flex flex-col"
            style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}
          >
            <TestAlumnoTab provider={provider} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function SuperAtcPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <SuperAtcContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
