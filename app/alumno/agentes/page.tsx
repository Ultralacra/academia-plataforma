"use client";

import Link from "next/link";
import { ArrowRight, Headphones, Sparkles } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

function AgentesAlumnoHome() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-linear-to-br from-[#faf6f1] via-[#f5ede4] to-[#faf6f1] p-6 shadow-sm dark:border-amber-900/30 dark:from-[#2a2017] dark:via-[#1f1a14] dark:to-[#2a2017]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#d97757] to-[#c4623f] text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#3d2e1f] dark:text-amber-100">
              Tu Asistente de Agentes
            </h1>
            <p className="text-sm text-[#7a6654] dark:text-amber-200/70">
              Herramientas de inteligencia artificial para acompañarte en cada
              etapa de HotSelling.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de agentes */}
      <div>
        <p className="mb-5 text-sm font-medium text-slate-500 dark:text-slate-400">
          Agentes disponibles
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/alumno/agente"
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-teal-700"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl transition-all duration-300 group-hover:bg-teal-400/20" />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-teal-400 to-emerald-500 text-white shadow-sm">
                  <Headphones className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Disponible
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Emma · Asistente IA
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Asistente inteligente que te guía con membresías, contratos,
                  pausas, bonos y garantías. Crea tickets automáticamente cuando
                  es necesario.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                Abrir Emma
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link
            href="/alumno/agentes/copy"
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-700"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl transition-all duration-300 group-hover:bg-amber-400/20" />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-400 text-white shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Disponible
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Tu Asistente HotSelling
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  5 agentes especializados para guiarte en Fase 1, VSL, Mini
                  VSL, Carnada y Anuncios. Impulsado por HotSelling.
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                Abrir agente
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AgentesAlumnoPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <DashboardLayout>
        <AgentesAlumnoHome />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
