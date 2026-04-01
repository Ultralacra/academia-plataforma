"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  MessageSquare,
  Sparkles,
  Workflow,
} from "lucide-react";

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

function AgentsHome() {
  const phaseCards = [
    {
      name: "Captación",
      model: "Modelo Hook",
      description: "Abre conversación y genera respuesta con fricción baja.",
    },
    {
      name: "Diagnóstico",
      model: "Modelo Discovery",
      description: "Extrae dolor, contexto y dirección antes de redactar.",
    },
    {
      name: "Cierre",
      model: "Modelo Close",
      description: "Empuja decisión con lenguaje más directo y útil.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,1),_rgba(248,250,252,1))] p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700"
          >
            Nuevo módulo
          </Badge>
          <Badge variant="secondary">Claude-ready</Badge>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Agentes internos para el equipo
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Esta sección centraliza agentes especializados. El primero es Copy:
            un chat visual que toma las fases reales desde Opciones y funciona
            como mesa conversacional para pedir copies por etapa.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-900">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Agente Copy</CardTitle>
                    <CardDescription>
                      Chat visual para copy por fase del alumno.
                    </CardDescription>
                  </div>
                </div>
              </div>
              <Badge className="bg-slate-900 text-white">v1</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              Sirve para conversar con un agente de copy por fase. Cada etapa se
              carga desde Opciones y cambia el comportamiento visual del chat.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {phaseCards.map((phaseCard) => (
                <div
                  key={phaseCard.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">
                      {phaseCard.name}
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                      {phaseCard.model}
                    </span>
                  </div>
                  <p className="mt-2 text-xs">{phaseCard.description}</p>
                </div>
              ))}
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link
                href="/admin/agentes/copy"
                className="inline-flex items-center gap-2"
              >
                Abrir agente Copy
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-slate-300 bg-slate-50/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-900">
              <Workflow className="h-5 w-5" />
              <CardTitle>Cómo queda armado</CardTitle>
            </div>
            <CardDescription>
              La base ya queda lista para sumar más agentes o conectar modelos
              reales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center gap-2 font-medium text-slate-900">
                <Bot className="h-4 w-4" />
                Modelo por fase
              </div>
              <p className="text-xs">
                Las fases reales salen del grupo etapa dentro de Opciones y cada
                una cambia el look del chat.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center gap-2 font-medium text-slate-900">
                <MessageSquare className="h-4 w-4" />
                Interfaz tipo chat
              </div>
              <p className="text-xs">
                El equipo ve fases a la izquierda y conversación al centro, sin
                paneles de prompt ni formularios pesados.
              </p>
            </div>
          </CardContent>
        </Card>
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
