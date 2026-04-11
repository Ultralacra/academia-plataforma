"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-config";
import { listMetadata } from "@/lib/metadata";

const FOLLOWUP_ENTITY = "mensajes_seguimiento";
const F5_METRICS_CODE = "F5_METRICAS_ADS";
const F5_METRICS_INTERVAL_MS = 4 * 24 * 60 * 60 * 1000;
const F5_TUTORIAL_URL =
  "https://www.skool.com/hotselling-pro/classroom/35c3544e?md=ebd947b99fc544a786d7b7fe4c752187";

type ReminderMode = "inactivity" | "f5_metrics";
type FollowupMetadataPayload = {
  codigo?: string;
  mensaje?: string;
  activo?: boolean | string | number;
};

function toNumberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(input: unknown) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function parseInactivityFromRow(row: any): number | null {
  const direct =
    row?.dias_inactividad ??
    row?.diasInactividad ??
    row?.inactividad ??
    row?.inactivityDays;
  const parsedDirect = toNumberOrNull(direct);
  if (parsedDirect != null) return Math.max(0, Math.trunc(parsedDirect));

  const lastActivityRaw = row?.ultima_actividad ?? row?.lastActivity ?? null;
  if (!lastActivityRaw) return null;
  const lastActivityDate = new Date(String(lastActivityRaw));
  if (Number.isNaN(lastActivityDate.getTime())) return null;

  const diffMs = Date.now() - lastActivityDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function extractRows(json: any): any[] {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.clients?.data)) return json.clients.data;
  if (Array.isArray(json?.getClients?.data)) return json.getClients.data;
  if (Array.isArray(json?.items)) return json.items;
  return [];
}

function isActiveMetadata(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return !["false", "0", "no", "off"].includes(normalized);
}

function getF5MetricsStorageKey(studentKey: string) {
  return `student:f5-metrics-reminder:${studentKey}`;
}

function shouldShowF5MetricsReminder(studentKey: string) {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(getF5MetricsStorageKey(studentKey));
  if (!raw) return true;
  const lastShown = Number(raw);
  if (!Number.isFinite(lastShown) || lastShown <= 0) return true;
  return Date.now() - lastShown >= F5_METRICS_INTERVAL_MS;
}

function markF5MetricsReminderShown(studentKey: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getF5MetricsStorageKey(studentKey),
    String(Date.now()),
  );
}

async function fetchF5MetricsReminderMessage() {
  try {
    const res = await listMetadata<FollowupMetadataPayload>();
    const record = (res.items || []).find((item) => {
      if (item.entity !== FOLLOWUP_ENTITY) return false;
      const payload = (item.payload || {}) as FollowupMetadataPayload;
      const code = String(payload.codigo || item.entity_id || "")
        .trim()
        .toUpperCase();
      if (code !== F5_METRICS_CODE) return false;
      return isActiveMetadata(payload.activo);
    });

    const message = String(record?.payload?.mensaje || "").trim();
    return message || null;
  } catch {
    return null;
  }
}

function stripTutorialUrl(message: string) {
  return message
    .replace(F5_TUTORIAL_URL, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function resolvePhaseKey(phaseRaw: string): string {
  const phase = normalizeText(phaseRaw);
  if (!phase) return "GENERIC";

  if (phase.startsWith("F1")) return "F1";

  if (phase.startsWith("F2")) {
    if (phase.includes("C-BOTELLA") || phase.includes("C_BOTELLA"))
      return "F2_C_BOTELLA";
    if (phase.includes("GRABACION") || phase.includes("F2_GRABACION"))
      return "F2_GRABACION";
    if (phase.includes("EMBUDO") || phase.includes("F2_EMBUDO"))
      return "F2_EMBUDO";
    if (phase.includes("PILOTO")) return "F2_PILOTO";
    if (phase.includes("PAGINAS") || phase.includes("F2_PAGINAS"))
      return "F2_PAGINAS";
    if (phase.includes("VSL") || phase.includes("F2_VSL")) return "F2_VSL";
    return "F2";
  }

  if (phase.startsWith("F3")) return "F3";
  if (phase.startsWith("F4")) return "F4";
  if (phase.startsWith("F5")) return "F5";

  return "GENERIC";
}

function isF5Phase(value: unknown) {
  return resolvePhaseKey(String(value ?? "")) === "F5";
}

async function fetchResolvedStudentPhase(
  studentCode: string,
  fallback: string,
) {
  const fallbackPhase = String(fallback || "").trim();
  if (!studentCode) return fallbackPhase;

  try {
    const json = await apiFetch<any>(
      `/client/get/cliente-etapas/${encodeURIComponent(studentCode)}`,
      undefined,
      { background: true },
    );
    const rows = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];

    if (!rows.length) return fallbackPhase;

    const latest = [...rows]
      .map((row) => ({
        phase: String(
          row?.etapa_id ?? row?.etapa ?? row?.fase ?? row?.stage ?? "",
        ).trim(),
        createdAt: Date.parse(String(row?.created_at ?? row?.fecha ?? "")) || 0,
      }))
      .filter((row) => row.phase)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    return latest?.phase || fallbackPhase;
  } catch {
    return fallbackPhase;
  }
}

function hasTraffickerBonus(
  bonos: Array<{ codigo: string; nombre: string }>,
): boolean {
  return bonos.some((b) => {
    const text = normalizeText(`${b.codigo} ${b.nombre}`);
    return (
      text.includes("BONO2026-09") ||
      text.includes("TRAFICKER") ||
      text.includes("TRAFFICKER")
    );
  });
}

function buildFollowupMessage(
  phaseRaw: string,
  studentName: string,
  hasTrafficker: boolean,
) {
  const nombre = studentName || "Alumno";
  const head = `Hola ${nombre}, cómo estás? Espero que estes muy bien.`;
  const phaseKey = resolvePhaseKey(phaseRaw);

  const messages: Record<string, string> = {
    F1: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con la estructuración de tus promesas y tu ecosistema de ventas? Hay algo en lo que te podamos apoyar?`,
    F2: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con la construcción del copy de tu VSL y con la configuración de tus páginas de venta? Hay algo en lo que te podamos apoyar?`,
    F2_C_BOTELLA: `${head} Te escribo por acá para saber como va tu proceso? Hay algo en lo que te podamos apoyar?`,
    F2_GRABACION: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con la grabación de tu VSL? Hay algo en lo que te podamos apoyar?`,
    F2_EMBUDO: `${head} Te escribo por acá para saber como va tu proceso con la estructuración del embudo y con la configuración de tus páginas de venta? Hay algo en lo que te podamos apoyar?`,
    F2_PILOTO: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con la prueba piloto de tu producto? Hay algo en lo que te podamos apoyar?`,
    F2_PAGINAS: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con la configuración de tus páginas de venta? Hay algo en lo que te podamos apoyar?`,
    F2_VSL: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con la construcción del copy de tu VSL y tu VSL en general? Hay algo en lo que te podamos apoyar?`,
    F3_SIN_BONO: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con los copys para tu Ads y tu montaje de la campaña publicitaria? Hay algo en lo que te podamos apoyar?`,
    F3_CON_BONO: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con los copys para tu Ads y tu montaje de la campaña publicitaria? Hay algo en lo que te podamos apoyar?. Recuerda también que tienes el bono de inserción de Trafficker, donde nuestro trafficker puede montar las campañas publicitarias por ti, toda la info la encontrarás en Skool, en classroom en una sección llamada Bono extra: Inserción de Trafficker, donde hay un video que te recomendamos ver. Quedamos atentos por aquí.`,
    F4: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con el análisis de métricas? Recuerda que es importante que nos puedas pasar periódicamente tu análisis de métricas para apoyarte en la toma de decisiones de tus campañas? Hay algo en lo que te podamos apoyar?`,
    F5: `${head} Te escribo por acá para saber como va tu proceso, cómo te ha ido con el análisis de métricas y con tu trascendencia al High Ticket? Recuerda que es importante que nos puedas pasar periódicamente tu análisis de métricas para apoyarte en la toma de decisiones de tus campañas? Hay algo en lo que te podamos apoyar?`,
    GENERIC: `${head} Te escribo por acá para saber cómo va tu proceso. ¿Hay algo en lo que te podamos apoyar?`,
  };

  if (phaseKey === "F3") {
    return {
      phaseKey: hasTrafficker ? "F3_CON_BONO" : "F3_SIN_BONO",
      message: hasTrafficker ? messages.F3_CON_BONO : messages.F3_SIN_BONO,
    };
  }

  return {
    phaseKey,
    message: messages[phaseKey] || messages.GENERIC,
  };
}

function uniqueBonos(rows: any[]): Array<{ codigo: string; nombre: string }> {
  const seen = new Set<string>();
  const out: Array<{ codigo: string; nombre: string }> = [];
  for (const row of rows) {
    const codigo = String(row?.bono_codigo ?? row?.codigo ?? "").trim();
    const nombreBase = row?.nombre ?? row?.descripcion ?? codigo;
    const nombre = String(nombreBase ?? "Bono").trim();
    const key = (codigo || nombre).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ codigo: codigo || nombre, nombre });
  }
  return out;
}

export function StudentInactivityModal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const [open, setOpen] = React.useState(false);
  const [days, setDays] = React.useState<number | null>(null);
  const [phase, setPhase] = React.useState<string>("");
  const [studentName, setStudentName] = React.useState<string>("");
  const [bonos, setBonos] = React.useState<
    Array<{ codigo: string; nombre: string }>
  >([]);
  const [message, setMessage] = React.useState<string>("");
  const [mode, setMode] = React.useState<ReminderMode>("inactivity");
  const [loadingDays, setLoadingDays] = React.useState(false);
  const openedForRef = React.useRef<string | null>(null);
  const reminderKeyRef = React.useRef<string>("");

  const role = String(user?.role || "").toLowerCase();
  const code = String((user as any)?.codigo || "").trim();
  const email = String((user as any)?.email || "").trim();
  const userId = String((user as any)?.id ?? "").trim();
  const studentChatPath = code ? `/admin/alumnos/${code}/chat` : "";
  const isOnStudentChat = Boolean(
    studentChatPath && pathname === studentChatPath,
  );

  React.useEffect(() => {
    console.log("[InactivityModal] effect run", {
      isLoading,
      isAuthenticated,
      role,
      code,
      email,
      userId,
    });
    if (isLoading) {
      console.log("[InactivityModal] skipping: isLoading");
      return;
    }
    if (!isAuthenticated || role !== "student") {
      console.log(
        "[InactivityModal] skipping: not student or not authenticated",
        { isAuthenticated, role },
      );
      return;
    }

    const identity = code || email || userId;
    if (!identity) {
      console.log(
        "[InactivityModal] skipping: no identity (code/email/userId empty)",
      );
      return;
    }
    if (openedForRef.current === identity) {
      console.log("[InactivityModal] skipping: already checked for", identity);
      return;
    }
    openedForRef.current = identity;

    // Primero resolvemos si realmente aplica para evitar que el modal parpadee.
    console.log(
      "[InactivityModal] checking eligibility before opening for",
      identity,
    );
    setOpen(false);

    let cancelled = false;
    (async () => {
      setLoadingDays(true);
      try {
        const fetchBySearch = async (searchValue: string) => {
          const qs = new URLSearchParams();
          qs.set("page", "1");
          qs.set("pageSize", "50");
          qs.set("search", searchValue);
          const json = await apiFetch<any>(
            `/client/get/clients?${qs.toString()}`,
            undefined,
            { background: true },
          );
          return extractRows(json);
        };

        const rowsByCode = code ? await fetchBySearch(code) : [];
        const rowsByEmail =
          !rowsByCode.length && email ? await fetchBySearch(email) : [];
        const rows = rowsByCode.length ? rowsByCode : rowsByEmail;

        const rowByCode = rows.find((r) => {
          const rCode = String(r?.codigo ?? r?.code ?? "").trim();
          return code && rCode && rCode.toLowerCase() === code.toLowerCase();
        });
        const rowByEmail = rows.find((r) => {
          const rEmail = String(r?.email ?? "")
            .trim()
            .toLowerCase();
          return email && rEmail && rEmail === email.toLowerCase();
        });

        const first = rowByCode ?? rowByEmail ?? rows[0] ?? null;
        console.log("[InactivityModal] API result", {
          rowsCount: rows.length,
          first: first
            ? {
                codigo: first?.codigo,
                email: first?.email,
                dias_inactividad: first?.dias_inactividad,
                ultima_actividad: first?.ultima_actividad,
                fase: first?.fase ?? first?.etapa,
              }
            : null,
        });
        const resolvedCodeBase = first?.codigo ?? first?.code ?? code;
        const resolvedCode = String(resolvedCodeBase ?? "").trim();
        const inactivityDays = first ? parseInactivityFromRow(first) : null;
        const basePhase = String(
          first?.fase ??
            first?.etapa ??
            first?.stage ??
            first?.fase_actual ??
            first?.current_stage ??
            "",
        ).trim();
        const resolvedPhase = await fetchResolvedStudentPhase(
          resolvedCode || code,
          basePhase,
        );
        const resolvedName = String(
          first?.nombre ?? first?.name ?? user?.name ?? "Alumno",
        ).trim();

        let bonosRows: any[] = [];
        if (resolvedCode) {
          const bonosJson = await apiFetch<any>(
            `/bonos/get/assignments/${encodeURIComponent(resolvedCode)}?page=1&pageSize=200`,
            undefined,
            { background: true },
          );
          bonosRows = Array.isArray(bonosJson?.data) ? bonosJson.data : [];
        }

        if (cancelled) return;
        const bonosParsed = uniqueBonos(bonosRows);
        const withTrafficker = hasTraffickerBonus(bonosParsed);
        const resolvedMessage = buildFollowupMessage(
          resolvedPhase,
          resolvedName || "Alumno",
          withTrafficker,
        );

        setDays(inactivityDays);
        setPhase(resolvedPhase);
        setStudentName(resolvedName || "Alumno");
        setBonos(bonosParsed);
        const phaseKey = resolvePhaseKey(resolvedPhase);
        const reminderIdentity =
          resolvedCode || code || email || userId || identity;
        reminderKeyRef.current = reminderIdentity;

        if (
          isF5Phase(resolvedPhase) &&
          reminderIdentity &&
          shouldShowF5MetricsReminder(reminderIdentity)
        ) {
          const f5Message =
            (await fetchF5MetricsReminderMessage()) ||
            "Recuerda actualizar tus métricas publicitarias\n\nMantén tus métricas al día para que los coaches podamos hacer un seguimiento cercano de tu progreso. Puedes hacerlo directamente en la sección Métricas ADS dentro de la plataforma.\n\n¿No sabes cómo hacerlo? Mira este video tutorial: https://www.skool.com/hotselling-pro/classroom/35c3544e?md=ebd947b99fc544a786d7b7fe4c752187";

          setMode("f5_metrics");
          setMessage(f5Message);
          setOpen(true);
          return;
        }

        setMode("inactivity");
        setMessage(resolvedMessage.message);

        // Regla solicitada: mostrar modal solo cuando hay + de 8 días de inactividad.
        console.log("[InactivityModal] resolved", {
          inactivityDays,
          resolvedPhase,
          resolvedName,
          resolvedCode,
          basePhase,
          withTrafficker,
          phaseKey: resolvedMessage.phaseKey,
        });
        if (inactivityDays != null && inactivityDays > 8) {
          console.log(
            "[InactivityModal] ✅ SHOWING modal — inactivity:",
            inactivityDays,
            "days",
          );
          setOpen(true);
        } else {
          console.log(
            "[InactivityModal] ❌ NOT showing — inactivity:",
            inactivityDays,
            "(need >8)",
          );
          setOpen(false);
        }
      } catch (err) {
        console.error("[InactivityModal] ❌ ERROR fetching data", err);
        if (!cancelled) {
          setDays(null);
          setPhase("");
          setMode("inactivity");
          setStudentName(String(user?.name || "Alumno"));
          setBonos([]);
          setMessage("");
          reminderKeyRef.current = "";
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoadingDays(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, role, code, email, userId, user?.name]);

  if (!isAuthenticated || role !== "student") return null;

  return (
    <Dialog
      open={open && !isOnStudentChat}
      onOpenChange={(next) => {
        if (!next && mode === "f5_metrics") {
          const reminderIdentity =
            reminderKeyRef.current || code || email || userId;
          if (reminderIdentity) markF5MetricsReminderShown(reminderIdentity);
          setOpen(false);
          return;
        }
        if (!next && !isOnStudentChat) {
          setOpen(true);
          return;
        }
        setOpen(next);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                mode === "f5_metrics"
                  ? "bg-sky-100 text-sky-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {mode === "f5_metrics" ? (
                <BarChart3 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </span>
            {mode === "f5_metrics"
              ? "Actualiza tus métricas ADS"
              : "Seguimiento de tu proceso"}
          </DialogTitle>
          <DialogDescription>
            {mode === "f5_metrics"
              ? ""
              : loadingDays
                ? "Consultando tu información..."
                : days == null
                  ? "Queremos ayudarte a retomar tu avance."
                  : `Hemos notado ${days} día(s) de inactividad en tu proceso.`}
          </DialogDescription>
        </DialogHeader>

        <div
          className={`rounded-xl border p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
            mode === "f5_metrics"
              ? "border-sky-200 bg-gradient-to-b from-sky-50 to-background"
              : "border-amber-200 bg-gradient-to-b from-amber-50 to-background"
          }`}
        >
          {(mode === "f5_metrics" ? stripTutorialUrl(message) : message) ||
            `Hola ${studentName || "Alumno"}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso. Hay algo en lo que te podamos apoyar?`}
        </div>

        {mode === "f5_metrics" ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-sky-900">
                  ¿No sabes cómo hacerlo?
                </p>
                <p className="text-xs leading-5 text-sky-700">
                  Abre el tutorial paso a paso para actualizar tus métricas ADS.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-sky-300 bg-white text-sky-700 hover:bg-sky-100 hover:text-sky-800"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(
                      F5_TUTORIAL_URL,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
              >
                Ver video tutorial
              </Button>
            </div>
          </div>
        ) : null}

        <div className="pt-1">
          {mode === "f5_metrics" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => {
                  const reminderIdentity =
                    reminderKeyRef.current || code || email || userId;
                  if (reminderIdentity) {
                    markF5MetricsReminderShown(reminderIdentity);
                  }
                  setOpen(false);
                  router.push(`/admin/alumnos/${code}/ads`);
                }}
                className="flex-1 gap-2 bg-sky-600 text-white hover:bg-sky-700"
              >
                <BarChart3 className="h-4 w-4" />
                Actualizar mis métricas
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const reminderIdentity =
                    reminderKeyRef.current || code || email || userId;
                  if (reminderIdentity) {
                    markF5MetricsReminderShown(reminderIdentity);
                  }
                  setOpen(false);
                }}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                router.push(`/admin/alumnos/${code}/chat`);
              }}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Sí, comunicarme con soporte
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
