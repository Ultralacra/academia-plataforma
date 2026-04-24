"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  FileSearch,
  Headphones,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Monitor,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

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
  return (
    <div className="space-y-8">
      {/* Header con disclaimer */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-br from-[#faf6f1] via-[#f5ede4] to-[#faf6f1] p-6 shadow-sm dark:border-orange-900/30 dark:from-[#2a2017] dark:via-[#1f1a14] dark:to-[#2a2017]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-400/8 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d97757] to-[#c4623f] text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#3d2e1f] dark:text-orange-100">
              Agentes
            </h1>
            <p className="text-sm text-[#7a6654] dark:text-orange-200/70">
              Asistentes especializados para el equipo. Elige uno para empezar a
              trabajar.
            </p>
          </div>
        </div>
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
