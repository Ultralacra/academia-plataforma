"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  Volume2,
} from "lucide-react";
import { apiFetch } from "@/lib/api-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Constantes ──────────────────────────────────────────────────────────────

const CHAT_MESSAGE =
  "Hola, espero te encuentres super bien 👋 Lina te dejó un mensaje importante relacionado con tu proceso y la etapa en la que te encuentras actualmente. Cuando tengas un momento, escúchalo por aquí y cuéntanos cómo vas. Un abrazo.";

/** Mapa de audios por fase. Añadir la URL del audio cuando estén listos F2/F3/F5. */
const AUDIO_BY_STAGE: Record<string, string> = {
  F1: "/FASE%20I.ogg",
  F2: "/FASE%20I.ogg", // TBD
  F3: "/FASE%20I.ogg", // TBD
  F5: "/FASE%20I.ogg", // TBD
};

const FALLBACK_AUDIO = "/FASE%20I.ogg";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CuotaWarning = {
  fechaPago: string;
  monto: number;
  moneda: string;
  /** Días hasta el vencimiento. Negativo = ya vencida (mora). */
  daysUntil: number;
  isOverdue: boolean;
};

type SendState = "idle" | "sending" | "sent" | "error";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPaidStatus(s: unknown) {
  return ["pagado", "paid", "completed", "listo", "aprobado"].includes(
    String(s ?? "").toLowerCase(),
  );
}

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function stageToFase(stage: string | null | undefined): string {
  const raw = String(stage ?? "").replace(/[^0-9]/g, "");
  return ["1", "2", "3", "5"].includes(raw) ? raw : "1";
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function StudentPaymentWarningDisclaimer({
  alumnoCode,
  studentStage,
  studentName,
}: {
  alumnoCode: string;
  studentStage?: string | null;
  studentName?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [cuotaWarning, setCuotaWarning] = useState<CuotaWarning | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!alumnoCode) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // 1) Listar planes por cliente_codigo
        const plansRes = await apiFetch<any>(
          `/payments/get/payment?cliente_codigo=${encodeURIComponent(alumnoCode)}&page=1&pageSize=100`,
        );
        const plansData = plansRes?.data ?? plansRes;
        const plans: any[] = Array.isArray(plansData)
          ? plansData
          : Array.isArray((plansData as any)?.items)
            ? (plansData as any).items
            : [];

        const planRow =
          plans.find(
            (p: any) =>
              String(p?.cliente_codigo ?? "").toLowerCase() ===
              alumnoCode.toLowerCase(),
          ) ??
          plans[0] ??
          null;

        const planCodigo = String(planRow?.codigo ?? "").trim();
        if (!planCodigo) {
          if (alive) setCuotaWarning(null);
          return;
        }

        // 2) Obtener detalle del plan con cuotas
        const detailRes = await apiFetch<any>(
          `/payments/get/payment/${encodeURIComponent(planCodigo)}`,
        );
        const plan = (detailRes as any)?.data ?? detailRes;

        const detalles: any[] = Array.isArray(plan?.detalles)
          ? plan.detalles
          : Array.isArray(plan?.details)
            ? plan.details
            : [];

        const pendientes = detalles.filter((d) => !isPaidStatus(d?.estatus));
        if (pendientes.length === 0) {
          if (alive) setCuotaWarning(null);
          return;
        }

        // Ordenar pendientes por fecha_pago ascendente
        const sorted = [...pendientes].sort((a, b) => {
          return (
            new Date(a?.fecha_pago ?? "9999-12-31").getTime() -
            new Date(b?.fecha_pago ?? "9999-12-31").getTime()
          );
        });

        const proxima = sorted[0];
        const fechaStr = String(proxima?.fecha_pago ?? "");
        if (!fechaStr) {
          if (alive) setCuotaWarning(null);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fechaDate = new Date(fechaStr);
        fechaDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.round(
          (fechaDate.getTime() - today.getTime()) / 86400000,
        );

        if (alive) {
          if (daysUntil <= 10) {
            setCuotaWarning({
              fechaPago: fechaStr,
              monto: Number(proxima?.monto) || 0,
              moneda: String(proxima?.moneda ?? plan?.moneda ?? "USD"),
              daysUntil,
              isOverdue: daysUntil < 0,
            });
          } else {
            setCuotaWarning(null);
          }
        }
      } catch {
        if (alive) setCuotaWarning(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [alumnoCode]);

  async function handleSendToChat(audioSrc: string) {
    setSendState("sending");
    setSendError(null);
    try {
      window.dispatchEvent(
        new CustomEvent("chat:rescue-send", {
          detail: { text: CHAT_MESSAGE, audioUrl: audioSrc },
        }),
      );
      // Esperar un momento para que se procese el envío
      await new Promise((r) => setTimeout(r, 800));
      setSendState("sent");
      setTimeout(() => setModalOpen(false), 1200);
    } catch (e: any) {
      setSendState("error");
      setSendError(e?.message ?? "Error al enviar");
    }
  }

  function openModal() {
    setModalOpen(true);
    setSendState("idle");
    setSendError(null);
  }

  // No renderizar mientras carga o si no hay advertencia
  if (loading || !cuotaWarning) return null;

  const stageUpper = String(studentStage ?? "")
    .trim()
    .toUpperCase();
  const audioSrc = AUDIO_BY_STAGE[stageUpper] ?? FALLBACK_AUDIO;
  const { isOverdue, daysUntil } = cuotaWarning;
  const daysAbs = Math.abs(daysUntil);

  const warningLabel = isOverdue
    ? `En mora · ${daysAbs} día${daysAbs !== 1 ? "s" : ""} vencida`
    : daysUntil === 0
      ? "Cuota vence hoy"
      : `Cuota en ${daysAbs} día${daysAbs !== 1 ? "s" : ""}`;

  const colorBanner = isOverdue
    ? "border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5"
    : "border-orange-300 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/5";

  const colorText = isOverdue
    ? "text-red-700 dark:text-red-400"
    : "text-orange-700 dark:text-orange-400";

  const colorMuted = isOverdue
    ? "text-red-600 dark:text-red-400"
    : "text-orange-600 dark:text-orange-400";

  const colorBtn = isOverdue
    ? "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
    : "border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/10";

  const colorModalInfo = isOverdue
    ? "border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5"
    : "border-orange-200 bg-orange-50/60 dark:border-orange-500/20 dark:bg-orange-500/5";

  return (
    <>
      {/* ── Banner del disclaimer ── */}
      <div className={`rounded-xl border p-3 mt-2 ${colorBanner}`}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className={`h-4 w-4 mt-0.5 shrink-0 ${isOverdue ? "text-red-500" : "text-orange-500"}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${colorText}`}>
                {warningLabel}
              </span>
              <Badge
                variant="outline"
                className={`h-4 px-1.5 text-[10px] font-medium ${
                  isOverdue
                    ? "border-red-300 text-red-600"
                    : "border-orange-300 text-orange-600"
                }`}
              >
                {formatMoney(cuotaWarning.monto, cuotaWarning.moneda)}
              </Badge>
            </div>
            <div className={`text-[11px] mt-0.5 ${colorMuted}`}>
              Vto: {formatDate(cuotaWarning.fechaPago)} · Accountability –
              Rescate
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`text-xs h-7 px-2 shrink-0 ${colorBtn}`}
            onClick={openModal}
          >
            <Volume2 className="h-3 w-3 mr-1" />
            Audio rescate
          </Button>
        </div>
      </div>

      {/* ── Modal de rescate ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle
                className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-orange-500"}`}
              />
              Rescate del estudiante
              {studentStage && (
                <Badge variant="secondary" className="text-[11px] ml-1">
                  {studentStage}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info de la cuota */}
            <div className={`rounded-lg border p-3 text-sm ${colorModalInfo}`}>
              <div className="font-medium">
                {isOverdue ? "⚠️ Cuota vencida" : "🔔 Próxima cuota"}
              </div>
              <div className="text-muted-foreground text-xs mt-0.5">
                {formatDate(cuotaWarning.fechaPago)} ·{" "}
                {formatMoney(cuotaWarning.monto, cuotaWarning.moneda)}
                {isOverdue
                  ? ` · ${daysAbs} día${daysAbs !== 1 ? "s" : ""} de mora`
                  : daysUntil === 0
                    ? " · vence hoy"
                    : ` · vence en ${daysAbs} día${daysAbs !== 1 ? "s" : ""}`}
              </div>
            </div>

            {/* Audio */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Audio sugerido (Lina)
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                controls
                style={{ width: "100%", minHeight: 54 }}
                src={audioSrc}
                preload="auto"
              >
                <source src={audioSrc} type="audio/ogg; codecs=opus" />
                <source src={audioSrc} type="audio/ogg" />
              </audio>
            </div>

            {/* Mensaje para el chat */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Mensaje para el chat
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground leading-relaxed">
                {CHAT_MESSAGE}
              </div>
            </div>

            {/* Botón principal: Enviar al chat */}
            <div className="border-t border-border pt-3 space-y-2">
              <Button
                className="w-full"
                size="sm"
                onClick={() => handleSendToChat(audioSrc)}
                disabled={sendState === "sending" || sendState === "sent"}
                variant={sendState === "sent" ? "outline" : "default"}
              >
                {sendState === "sending" && (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                )}
                {sendState === "sent" && (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                )}
                {sendState === "idle" && (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                {sendState === "idle"
                  ? "Enviar audio + mensaje al chat"
                  : sendState === "sending"
                    ? "Enviando…"
                    : sendState === "sent"
                      ? "¡Enviado al chat!"
                      : "Reintentar"}
              </Button>
              {sendState === "error" && sendError && (
                <div className="text-xs text-red-500">{sendError}</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
