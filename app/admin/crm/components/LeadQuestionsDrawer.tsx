"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CircleDollarSign,
  ExternalLink,
  Instagram,
  Loader2,
  Mail,
  MessageSquareQuote,
  Phone,
  ShieldQuestion,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  if (normalized === "contacted")
    return { label: "Contactado", color: "bg-blue-100 text-blue-700" };
  if (normalized === "qualified")
    return { label: "Calificado", color: "bg-violet-100 text-violet-700" };
  if (normalized === "won")
    return { label: "Ganado", color: "bg-emerald-100 text-emerald-700" };
  if (normalized === "lost")
    return { label: "Perdido", color: "bg-rose-100 text-rose-700" };
  return { label: "Nuevo", color: "bg-slate-100 text-slate-600" };
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-base font-bold shadow">
      {letters || "?"}
    </div>
  );
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
  const status = statusLabel(lead?.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0 overflow-hidden"
      >
        {/* Header fijo */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Initials name={lead?.name || "?"} />
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {lead?.name || "Lead CRM"}
                </h2>
                {lead && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.color}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      #{lead.codigo}
                    </span>
                    {answeredCount > 0 && (
                      <span className="text-[11px] text-slate-500">
                        {answeredCount}/{questionItems.length} respuestas
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {leadCode && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-8"
              >
                <Link
                  href={`/admin/crm/booking/${encodeURIComponent(leadCode)}`}
                >
                  Ver ficha
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Cargando contacto...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : lead ? (
            <>
              {/* Tarjeta de contacto */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Información de contacto
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Mail className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Email
                      </div>
                      <div className="text-sm text-slate-800 truncate">
                        {lead.email || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Teléfono
                      </div>
                      <div className="text-sm text-slate-800">
                        {lead.phone || "—"}
                      </div>
                    </div>
                  </div>
                  {lead.source && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-sky-50 text-sky-700 border-sky-200"
                      >
                        {lead.source}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Preguntas */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Respuestas del formulario
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {questionItems.map((item) => {
                    const Icon = item.icon;
                    const hasAnswer = Boolean(item.response);
                    return (
                      <div key={item.key} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex-shrink-0 rounded-lg p-1.5 ${hasAnswer ? "bg-indigo-50 text-indigo-500" : "bg-slate-100 text-slate-400"}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-700">
                                {item.title}
                              </span>
                              {!hasAnswer && (
                                <span className="text-[10px] text-slate-400 italic">
                                  Sin respuesta
                                </span>
                              )}
                            </div>
                            {hasAnswer && (
                              <p className="mt-1 text-sm text-slate-800 leading-relaxed break-words">
                                {item.response}
                              </p>
                            )}
                            <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                              {item.question}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 text-center">
              Selecciona un contacto para ver su detalle.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
