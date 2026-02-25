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
import { AlertTriangle, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-config";

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
  const [loadingDays, setLoadingDays] = React.useState(false);
  const openedForRef = React.useRef<string | null>(null);

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

    // Debe abrir apenas conecta el alumno, aunque luego estemos cargando datos.
    console.log("[InactivityModal] opening modal, fetching data for", identity);
    setOpen(true);

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
        const resolvedPhase = String(
          first?.fase ??
            first?.etapa ??
            first?.stage ??
            first?.fase_actual ??
            first?.current_stage ??
            "",
        ).trim();
        const resolvedName = String(
          first?.nombre ?? first?.name ?? user?.name ?? "Alumno",
        ).trim();

        let bonosRows: any[] = [];
        if (resolvedCode) {
          const bonosJson = await apiFetch<any>(
            `/bonos/get/assignments/${encodeURIComponent(resolvedCode)}?page=1&pageSize=200`,
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
        setMessage(resolvedMessage.message);

        // Regla solicitada: mostrar modal solo cuando hay + de 8 días de inactividad.
        console.log("[InactivityModal] resolved", {
          inactivityDays,
          resolvedPhase,
          resolvedName,
          resolvedCode,
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
          setStudentName(String(user?.name || "Alumno"));
          setBonos([]);
          setMessage("");
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
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            Seguimiento de tu proceso
          </DialogTitle>
          <DialogDescription>
            {loadingDays
              ? "Consultando tu información..."
              : days == null
                ? "Queremos ayudarte a retomar tu avance."
                : `Hemos notado ${days} día(s) de inactividad en tu proceso.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-background p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
          {message ||
            `Hola ${studentName || "Alumno"}, cómo estás? Espero que estes muy bien. Te escribo por acá para saber como va tu proceso. Hay algo en lo que te podamos apoyar?`}
        </div>

        <div className="pt-1">
          <Button
            onClick={() => {
              router.push(`/admin/alumnos/${code}/chat`);
            }}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Sí, comunicarme con soporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
