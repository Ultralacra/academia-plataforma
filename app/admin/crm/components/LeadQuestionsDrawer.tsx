"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CircleDollarSign,
  ExternalLink,
  Instagram,
  Loader2,
  MessageSquareQuote,
  ShieldQuestion,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { getLead, type LeadDetail } from "../api";

const QUESTION_CONFIG = [
  {
    key: "main_obstacle",
    title: "Mayor obstáculo",
    fallbackQuestion:
      "¿Cuál crees que es tu mayor obstáculo para lograr tu meta de facturación?",
    icon: AlertCircle,
    flatField: "main_obstacle",
  },
  {
    key: "monthly_budget",
    title: "Meta de facturación",
    fallbackQuestion:
      "¿Cuál es tu meta de facturación mensual en USD en 6 meses?",
    icon: CircleDollarSign,
    flatField: "monthly_budget",
  },
  {
    key: "instagram_user",
    title: "Instagram",
    fallbackQuestion: "¿Cuál es tu usuario de Instagram?",
    icon: Instagram,
    flatField: "instagram_user",
  },
  {
    key: "invite_others",
    title: "Consulta con otros",
    fallbackQuestion:
      "¿Necesitas consultar con alguien para realizar inversiones en tu negocio?",
    icon: ShieldQuestion,
    flatField: "invite_others",
  },
  {
    key: "closer_name",
    title: "Atendido por",
    fallbackQuestion: "Atendido por",
    icon: UserRound,
    flatField: "closer_name",
  },
  {
    key: "sale_notes",
    title: "Observaciones",
    fallbackQuestion: "Observaciones",
    icon: MessageSquareQuote,
    flatField: "sale_notes",
  },
] as const;

function normalizeAnswer(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function getQuestionItems(lead: LeadDetail | null) {
  const nested = lead?.detalle_preguntas_hubspot ?? null;
  return QUESTION_CONFIG.map((item) => {
    const nestedEntry = nested?.[item.key] ?? null;
    const flatValue = lead
      ? (lead as Record<string, unknown>)[item.flatField]
      : null;
    const response = normalizeAnswer(
      nestedEntry?.respuesta ?? flatValue ?? null,
    );
    return {
      key: item.key,
      title: item.title,
      question: nestedEntry?.pregunta_original ?? item.fallbackQuestion,
      response,
      icon: item.icon,
    };
  });
}

function statusLabel(value: string | null | undefined) {
  const normalized = String(value ?? "new").toLowerCase();
  if (normalized === "contacted") return "Contactado";
  if (normalized === "qualified") return "Calificado";
  if (normalized === "won") return "Ganado";
  if (normalized === "lost") return "Perdido";
  return "Nuevo";
}

export function LeadQuestionsDrawer({
  open,
  onOpenChange,
  leadCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadCode?: string | null;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lead, setLead] = React.useState<LeadDetail | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!open || !leadCode) {
      setLead(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const nextLead = await getLead(leadCode);
        if (!cancelled) setLead(nextLead);
      } catch (err) {
        if (!cancelled) {
          setLead(null);
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el lead.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, leadCode]);

  const questionItems = React.useMemo(() => getQuestionItems(lead), [lead]);
  const answeredCount = questionItems.filter((item) => item.response).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader className="space-y-2 pr-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate">Detalle del contacto</SheetTitle>
              <SheetDescription className="truncate">
                {lead?.name || "Lead CRM"}
              </SheetDescription>
            </div>
            {leadCode ? (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link
                  href={`/admin/crm/booking/${encodeURIComponent(leadCode)}`}
                >
                  Abrir ficha
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando detalle del contacto...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : lead ? (
            <>
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-slate-900">
                      {lead.name || "Sin nombre"}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <Badge variant="outline">
                        {statusLabel(lead.status)}
                      </Badge>
                      <Badge variant="secondary">Código: {lead.codigo}</Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {answeredCount} de {questionItems.length} respuestas
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Email
                    </div>
                    <div className="mt-1 text-slate-900">
                      {lead.email || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Teléfono
                    </div>
                    <div className="mt-1 text-slate-900">
                      {lead.phone || "—"}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Preguntas HubSpot
                    </h3>
                    <p className="text-xs text-slate-500">
                      Respuestas capturadas en el contacto para contexto
                      comercial.
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  {questionItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-white p-2 text-slate-600 shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {item.title}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {item.question}
                            </div>
                            <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
                              {item.response || "Sin respuesta"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Selecciona un contacto para ver su detalle.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
