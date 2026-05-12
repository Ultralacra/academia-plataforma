"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  FileSearch,
  Headphones,
  LayoutGrid,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Monitor,
  Receipt,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export type AIProvider = "openai" | "anthropic";
export const AI_PROVIDER_KEY = "agents-ai-provider";

const agents = [
  {
    name: "Copy",
    description:
      "Chat conversacional para generar copies adaptados a cada fase del alumno. Pide aperturas, seguimientos, objeciones o cierres según la etapa.",
    icon: Sparkles,
    href: "/admin/agentes/copy",
    gradient: "from-amber-400 to-orange-400",
    bgGlow: "bg-amber-400/10",
    active: true,
  },
  {
    name: "Seguimiento",
    description:
      "Redacta mensajes de seguimiento personalizados para mantener el contacto con prospectos y alumnos.",
    icon: Megaphone,
    href: "#",
    gradient: "from-rose-300 to-pink-400",
    bgGlow: "bg-rose-300/10",
    active: false,
  },
  {
    name: "Análisis",
    description:
      "Interpreta métricas de rendimiento del equipo y sugiere acciones de mejora basadas en datos.",
    icon: BrainCircuit,
    href: "#",
    gradient: "from-violet-300 to-purple-400",
    bgGlow: "bg-violet-300/10",
    active: false,
  },
  {
    name: "Contratos",
    description:
      "Genera, revisa y adapta contratos según el perfil del alumno y el programa contratado.",
    icon: FileSearch,
    href: "#",
    gradient: "from-emerald-300 to-teal-400",
    bgGlow: "bg-emerald-300/10",
    active: false,
  },
  {
    name: "ATC Administrativo",
    description:
      "Sugiere el equipo ideal (ATC, Ads, Copy y Mentalidad) para un alumno nuevo según la carga actual de cada coach.",
    icon: ClipboardCheck,
    href: "/admin/agentes/atc",
    gradient: "from-sky-300 to-blue-400",
    bgGlow: "bg-sky-300/10",
    active: true,
  },
  {
    name: "Soporte ATC",
    description:
      "Responde consultas frecuentes de alumnos usando el histórico real de tickets de soporte. Clasifica el riesgo del caso, sugiere la ruta de acción y orienta al equipo ATC sobre contratos, membresías, pausas, garantías y continuidad.",
    icon: LifeBuoy,
    href: "/admin/agentes/soporte-atc",
    gradient: "from-teal-400 to-emerald-500",
    bgGlow: "bg-teal-400/10",
    active: true,
  },
  {
    name: "Operativa",
    description:
      "Asiste en procesos operativos del día a día: asignaciones, calendario y coordinación de tareas.",
    icon: LayoutGrid,
    href: "#",
    gradient: "from-slate-300 to-slate-400",
    bgGlow: "bg-slate-300/10",
    active: false,
  },
  {
    name: "Atención al Cliente",
    description:
      "Genera respuestas empáticas y profesionales para la comunicación directa con alumnos.",
    icon: MessageCircle,
    href: "#",
    gradient: "from-cyan-300 to-teal-400",
    bgGlow: "bg-cyan-300/10",
    active: false,
  },
  {
    name: "Técnico",
    description:
      "Soporte técnico especializado para resolver incidencias de plataforma y herramientas digitales.",
    icon: Monitor,
    href: "#",
    gradient: "from-indigo-300 to-blue-400",
    bgGlow: "bg-indigo-300/10",
    active: false,
  },
  {
    name: "Ads",
    description:
      "Diseña copies para campañas publicitarias, creativos y estrategias de captación digital.",
    icon: TrendingUp,
    href: "#",
    gradient: "from-fuchsia-300 to-pink-400",
    bgGlow: "bg-fuchsia-300/10",
    active: false,
  },
  {
    name: "Mentalidad",
    description:
      "Genera contenido motivacional y de coaching para acompañar el desarrollo personal del alumno.",
    icon: Zap,
    href: "#",
    gradient: "from-lime-300 to-green-400",
    bgGlow: "bg-lime-300/10",
    active: false,
  },
  {
    name: "Ventas",
    description:
      "Asiste en estrategias de cierre, manejo de objeciones y scripts de venta efectivos.",
    icon: Headphones,
    href: "#",
    gradient: "from-orange-300 to-red-400",
    bgGlow: "bg-orange-300/10",
    active: false,
  },
];

function AgentsHome() {
  const [provider, setProvider] = useState<AIProvider>("openai");

  useEffect(() => {
    const saved = localStorage.getItem(AI_PROVIDER_KEY) as AIProvider | null;
    if (saved === "openai" || saved === "anthropic") setProvider(saved);
  }, []);

  function toggleProvider(next: AIProvider) {
    setProvider(next);
    localStorage.setItem(AI_PROVIDER_KEY, next);
  }

  return (
    <div className="space-y-8">
      {/* Header con disclaimer */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-br from-[#faf6f1] via-[#f5ede4] to-[#faf6f1] p-6 shadow-sm dark:border-orange-900/30 dark:from-[#2a2017] dark:via-[#1f1a14] dark:to-[#2a2017]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-400/8 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d97757] to-[#c4623f] text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#3d2e1f] dark:text-orange-100">
                Agentes
              </h1>
              <p className="text-sm text-[#7a6654] dark:text-orange-200/70">
                Asistentes especializados para el equipo. Elige uno para empezar
                a trabajar.
              </p>
            </div>
          </div>

          {/* Switch de proveedor IA */}
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#7a6654] dark:text-orange-200/60">
              Modelo IA
            </span>
            <div className="flex items-center gap-1 rounded-xl border border-orange-200/60 bg-white/60 p-1 shadow-sm dark:border-orange-900/30 dark:bg-[#1f1a14]/60">
              <button
                onClick={() => toggleProvider("openai")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  provider === "openai"
                    ? "bg-linear-to-r from-[#10a37f] to-[#0d8a6a] text-white shadow"
                    : "text-[#7a6654] hover:bg-orange-50 dark:text-orange-200/60 dark:hover:bg-orange-900/20"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                </svg>
                OpenAI
              </button>
              <button
                onClick={() => toggleProvider("anthropic")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  provider === "anthropic"
                    ? "bg-linear-to-r from-[#c96442] to-[#a8522e] text-white shadow"
                    : "text-[#7a6654] hover:bg-orange-50 dark:text-orange-200/60 dark:hover:bg-orange-900/20"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.357-3.415h6.571L10.173 3.52zm-1.125 9.975H5.898l2.577-6.492 2.573 6.492z" />
                </svg>
                Anthropic
              </button>
            </div>
            <span className="text-[10px] text-[#9e8778] dark:text-orange-200/40">
              {provider === "openai" ? "GPT · OpenAI" : "Claude · Anthropic"}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones secundarias */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/agentes/uso"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
        >
          <TrendingUp className="h-4 w-4" />
          Ver uso del agente HotSelling (alumnos)
        </Link>
        <Link
          href="/admin/agentes/uso-coach"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
        >
          <BarChart3 className="h-4 w-4" />
          Ver uso del agente Copy (coachs)
        </Link>
        <Link
          href="/admin/agentes/uso-tickets"
          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-100"
        >
          <Receipt className="h-4 w-4" />
          Uso agente tickets
        </Link>
      </div>

      {/* Grid de agentes */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const inner = (
            <div
              className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ${
                agent.active
                  ? "cursor-pointer border-border bg-card shadow-sm hover:shadow-lg hover:-translate-y-1"
                  : "pointer-events-none select-none border-transparent bg-card/50 blur-[2px] opacity-50"
              }`}
            >
              {/* Glow superior */}
              <div
                className={`h-1.5 w-full bg-gradient-to-r ${agent.gradient} ${agent.active ? "opacity-100" : "opacity-30"}`}
              />

              <div className="flex flex-1 flex-col items-center gap-4 p-6 pb-5 text-center">
                {/* Icono con glow */}
                <div className="relative">
                  <div
                    className={`absolute inset-0 scale-150 rounded-full ${agent.bgGlow} blur-xl ${agent.active ? "opacity-60" : "opacity-0"}`}
                  />
                  <div
                    className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.gradient} text-white shadow-md ${
                      agent.active
                        ? "opacity-100 group-hover:scale-105 transition-transform"
                        : "opacity-40"
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h2
                    className={`text-lg font-semibold ${agent.active ? "" : "text-muted-foreground"}`}
                  >
                    {agent.name}
                  </h2>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div
                className={`border-t px-6 py-3 text-center text-xs font-medium ${
                  agent.active
                    ? "bg-muted/30 text-primary group-hover:bg-primary/5"
                    : "bg-muted/20 text-muted-foreground/60"
                }`}
              >
                {agent.active ? (
                  <span className="inline-flex items-center gap-1.5">
                    Abrir agente{" "}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                ) : (
                  "Próximamente"
                )}
              </div>
            </div>
          );

          return agent.active ? (
            <Link
              key={agent.name}
              href={agent.href}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
            >
              {inner}
            </Link>
          ) : (
            <div key={agent.name}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <AgentsHome />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
