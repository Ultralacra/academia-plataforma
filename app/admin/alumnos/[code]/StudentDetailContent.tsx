"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  dataService,
  type StudentItem,
  type CoachMember,
} from "@/lib/data-service";
import { apiFetch } from "@/lib/api-config";
import Header from "./_parts/Header";
import MetricsStrip from "./_parts/MetricsStrip";
import PhasesTimeline from "./_parts/PhasesTimeline";
import PhaseHistory from "./_parts/PhaseHistory";
import CoachesCard from "./_parts/CoachesCard";
import {
  buildPhasesFor,
  buildLifecycleFor,
  isoDay,
  addDays,
  parseMaybe,
  diffDays,
  fmtES,
  type Stage,
  type StatusSint,
} from "./_parts/detail-utils";
import TicketsPanel from "./_parts/TicketsPanel";
import SessionsStudentPanel from "./_parts/SessionsStudentPanel";
import BonosPanel from "./_parts/BonosPanel";
import EditOptionModal from "./_parts/EditOptionModal";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStudentTickets } from "../api";
import Link from "next/link";
import { MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  uploadClientContract,
  downloadClientContractBlob,
  getClienteEstatus,
  getClienteTareas,
  updateClientLastTask,
} from "../api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { deleteStudent } from "../api";
import { useRouter } from "next/navigation";

export default function StudentDetailContent({ code }: { code: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any | null>(null);
  const [coaches, setCoaches] = useState<CoachMember[]>([]);

  const [stage, setStage] = useState<Stage>("ONBOARDING");
  const [statusSint, setStatusSint] = useState<StatusSint>("EN_CURSO");
  const [pIngreso, setPIngreso] = useState<string>("");
  const [salida, setSalida] = useState<string>("");
  const [lastActivity, setLastActivity] = useState<string>("");
  const [lastTaskAt, setLastTaskAt] = useState<string>("");
  const [pF1, setPF1] = useState<string>("");
  const [pF2, setPF2] = useState<string>("");
  const [pF3, setPF3] = useState<string>("");
  const [pF4, setPF4] = useState<string>("");
  const [pF5, setPF5] = useState<string>("");
  const [ticketsCount, setTicketsCount] = useState<number | undefined>(
    undefined,
  );

  // Estado para editar fecha de ingreso
  const [editIngresoOpen, setEditIngresoOpen] = useState(false);
  const [tempIngreso, setTempIngreso] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Fetch the student directly from the API using the search code
        const url = `/client/get/clients?page=1&search=${encodeURIComponent(
          code,
        )}`;
        const json = await apiFetch<any>(url);
        const rows: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.clients?.data)
            ? json.clients.data
            : Array.isArray(json?.getClients?.data)
              ? json.getClients.data
              : [];
        const rawSelected =
          rows.find(
            (r) =>
              String(r.codigo ?? r.code ?? "").toLowerCase() ===
              code.toLowerCase(),
          ) ||
          rows[0] ||
          null;

        const s = rawSelected
          ? ({
              id: rawSelected.id ?? null,
              code: rawSelected.codigo ?? rawSelected.code ?? code,
              name: rawSelected.nombre ?? rawSelected.name ?? "-",
              stage: rawSelected.etapa ?? rawSelected.stage ?? null,
              state: rawSelected.estado ?? rawSelected.state ?? null,
              ingreso: rawSelected.ingreso ?? rawSelected.joinDate ?? null,
              salida: rawSelected.salida ?? null,
              lastActivity:
                rawSelected.ultima_actividad ??
                rawSelected.lastActivity ??
                null,
              teamMembers: Array.isArray(rawSelected.teamMembers)
                ? rawSelected.teamMembers
                : (rawSelected.equipo ?? rawSelected.alumnos ?? []),
              contrato: rawSelected.contrato ?? null,
              raw: rawSelected,
            } as any)
          : null;

        if (!alive) return;
        setStudent(s);

        if (s) {
          try {
            await loadCoaches(s.code);
          } catch {
            setCoaches([]);
          }
          try {
            const tickets = await getStudentTickets(s.code);
            setTicketsCount(tickets.length);
          } catch {
            setTicketsCount(undefined);
          }

          // Cargar historial de etapas/fases (primer fetch)
          try {
            await fetchPhaseHistory(s.code);
          } catch (e) {
            setPhaseHistory(null);
          }

          // Cargar historial de estatus y tareas (tareas por CÓDIGO, no por id)
          try {
            const [eh, th] = await Promise.all([
              getClienteEstatus(s.code),
              getClienteTareas(s.code),
            ]);
            setStatusHistory(eh);
            setTasksHistory(th);
          } catch (e) {
            setStatusHistory(null);
            setTasksHistory(null);
          }
        }

        if (s) {
          // Usar únicamente campos proporcionados por la API (sin datos sintéticos).
          // Preferimos los nombres que vienen del endpoint: ingreso, ultima_actividad, etapa, estado.
          try {
            setStage(
              ((s.stage || s.raw?.etapa || "").toUpperCase() as Stage) ||
                "ONBOARDING",
            );
          } catch {
            // keep existing stage if parsing fails
          }
          setPIngreso(
            s.ingreso ?? s.joinDate ?? s.raw?.ingreso ?? s.raw?.joinDate ?? "",
          );
          setSalida(s.salida ?? s.raw?.salida ?? "");
          setLastActivity(s.lastActivity ?? s.raw?.ultima_actividad ?? "");
          setLastTaskAt(s.raw?.lastTaskAt ?? "");
          setPF1(s.raw?.f1 ?? "");
          setPF2(s.raw?.f2 ?? "");
          setPF3(s.raw?.f3 ?? "");
          setPF4(s.raw?.f4 ?? "");
          setPF5(s.raw?.f5 ?? "");
          // No calculamos status sintético aquí: mantener el valor crudo en student.state
          setStatusSint("EN_CURSO" as StatusSint);
        }
      } catch {
        // Error en listado (posible 401/403 para alumno). Fallback directo a detalle único.
        try {
          const j = await apiFetch<any>(
            `/client/get/cliente/${encodeURIComponent(code)}`,
          );
          const r = j?.data || j;
          if (r && (r.codigo || r.code || r.id)) {
            const s = {
              id: r.id,
              code: r.codigo ?? r.code ?? code,
              name: r.nombre ?? r.name ?? "-",
              stage: r.etapa ?? r.stage ?? null,
              state: r.estado ?? r.state ?? null,
              ingreso: r.ingreso ?? r.joinDate ?? null,
              lastActivity: r.ultima_actividad ?? r.lastActivity ?? null,
              teamMembers: Array.isArray(r.teamMembers)
                ? r.teamMembers
                : (r.equipo ?? r.alumnos ?? []),
              contrato: r.contrato ?? null,
              raw: r,
            } as any;
            if (alive) setStudent(s);
          } else if (alive) {
            setStudent(null);
          }
        } catch {
          if (alive) setStudent(null);
        }
      } finally {
        if (alive) setLoading(false);
        // Fallback extremo: si no pudimos cargar desde APIs y el usuario autenticado es el alumno dueño del código
        if (
          alive &&
          !student &&
          user?.role === "student" &&
          user?.codigo &&
          user.codigo === code
        ) {
          setStudent({
            id: user.id,
            code: user.codigo,
            name: user.name,
            stage: null,
            state: null,
            ingreso: null,
            lastActivity: null,
            teamMembers: [],
            contrato: null,
            raw: { source: "auth-fallback" },
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  // Función para guardar fecha de ingreso (preparado para backend)
  async function handleSaveIngreso() {
    if (!tempIngreso) return;
    // TODO: Enviar al backend cuando esté listo
    // await apiFetch(`/client/update/client/${code}`, { method: 'PUT', body: formData con 'ingreso' });
    setPIngreso(tempIngreso);
    setEditIngresoOpen(false);
    toast({
      title: "Fecha actualizada",
      description: "La fecha de ingreso se ha actualizado localmente.",
    });
  }

  // Cargar historial de etapas una vez y bajo demanda
  async function fetchPhaseHistory(codeToFetch: string) {
    try {
      const histUrl = `/client/get/cliente-etapas/${encodeURIComponent(
        codeToFetch,
      )}`;
      const jh = await apiFetch<any>(histUrl);
      const rows: any[] = Array.isArray(jh?.data)
        ? jh.data
        : Array.isArray(jh?.data?.data)
          ? jh.data.data
          : Array.isArray(jh?.rows)
            ? jh.rows
            : Array.isArray(jh)
              ? jh
              : [];

      setPhaseHistory(
        rows
          .map((r: any, idx: number) => ({
            id: r.id ?? r.etapa_hist_id ?? `${codeToFetch}-${idx}`,
            codigo_cliente:
              r.codigo_cliente ?? r.codigo ?? r.alumno ?? codeToFetch,
            etapa_id: String(r.etapa_id ?? r.etapa ?? r.fase ?? r.stage ?? ""),
            created_at: String(
              r.created_at ?? r.fecha ?? r.createdAt ?? r.updated_at ?? "",
            ),
          }))
          .filter((x) => Boolean(x.etapa_id)),
      );
    } catch (e) {
      setPhaseHistory(null);
    }
  }

  async function loadCoaches(alumnoCode: string) {
    try {
      const qUrl = `/client/get/clients-coaches?alumno=${encodeURIComponent(
        alumnoCode,
      )}`;
      const j = await apiFetch<any>(qUrl);
      const rows = Array.isArray(j?.data) ? j.data : [];
      const cs = rows.map((r: any) => ({
        name: r.coach_nombre ?? r.name ?? "",
        puesto: r.puesto ?? null,
        area: r.area ?? null,
        url: r.url ?? null,
        // El endpoint puede devolver id_coach o id; lo guardamos como coachId
        coachId: r.id_coach ?? r.id ?? r.id_relacion ?? null,
        // Guardamos también un posible código de equipo/coach para mapear contra sesiones (p.ej. XYI8LFIZ_0j3KwcP)
        teamCode: r.codigo_coach ?? r.codigo_equipo ?? r.codigo ?? r.id ?? null,
      }));
      setCoaches(cs);
      return cs;
    } catch (e) {
      setCoaches([]);
      return [];
    }
  }

  async function assignCoaches(codes: string[]) {
    if (!student?.code) return;
    const unique = Array.from(
      new Set((codes || []).map((c) => String(c ?? "").trim()).filter(Boolean)),
    );
    if (unique.length === 0) return;

    try {
      setLoading(true);

      // IMPORTANT: hacemos cola (1 POST por coach) porque el backend suele dejar solo el último
      // cuando mandamos varios a la vez.
      for (const code of unique) {
        const body = {
          codigo_cliente: student.code,
          equipos: [code],
        };
        await apiFetch("/team/associate/team-client", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      await loadCoaches(student.code);
      toast({
        title: unique.length === 1 ? "Coach asignado" : "Coaches asignados",
        description:
          unique.length === 1
            ? undefined
            : `${unique.length} coaches se asignaron correctamente.`,
      });
    } catch (e) {
      console.error("Error assigning coaches", e);
      toast({
        title: "No se pudo asignar coach",
        description: "Revisa la conexión o permisos e inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function removeCoach(coachId: string | number | null) {
    if (!student?.code || !coachId) {
      console.warn(
        "removeCoach called without student.code or coachId",
        student?.code,
        coachId,
      );
      return;
    }
    try {
      // set a removing flag so we can debug UI if needed
      setLoading(true);
      const body: any = {
        codigo_cliente: student.code,
        codigo_equipo: coachId,
      };
      console.log("Removing coach - request:", body);
      const json = await apiFetch<any>("/team/associate/team-client", {
        method: "DELETE",
        body: JSON.stringify(body),
      });
      console.log("removeCoach response", json);
      // refresh coaches
      await loadCoaches(student.code);
    } catch (e) {
      console.error("Error removing coach", e);
    } finally {
      setLoading(false);
    }
  }

  // Cambiar un coach: desvincular el coach actual (si existe) y asignar el nuevo seleccionado.
  async function changeCoach(idx: number, candidate: any) {
    if (!student?.code) return;
    try {
      setLoading(true);
      const existing = (coaches || [])[idx];
      // Si existe relación previa, intentamos eliminarla primero.
      const existingCoachId =
        (existing as any)?.coachId ??
        (existing as any)?.id ??
        (existing as any)?.id_relacion ??
        null;
      if (existingCoachId) {
        try {
          await removeCoach(existingCoachId);
        } catch (e) {
          console.error("Error removing existing coach during change", e);
        }
      }

      // Asignar el nuevo coach por teamCode (prioritario) o por teamId como fallback.
      const code =
        candidate?.teamCode ??
        (candidate?.teamId ? String(candidate.teamId) : null);
      if (code) {
        try {
          await assignCoaches([code]);
          toast({ title: "Coach actualizado" });
        } catch (e) {
          console.error("Error assigning new coach during change", e);
          toast({ title: "Error asignando coach" });
        }
      } else {
        toast({
          title: "No se pudo asignar coach",
          description: "El candidato no tiene código de equipo",
        });
      }

      // Asegurar refresco final
      await loadCoaches(student.code);
    } catch (e) {
      console.error("Error cambiando coach", e);
      toast({ title: "Error cambiando coach" });
    } finally {
      setLoading(false);
    }
  }

  const today = useMemo(() => new Date(isoDay(new Date())), []);
  const permanencia = useMemo(() => {
    if (!pIngreso) return 0;
    const start = parseMaybe(pIngreso) ?? today;
    const end = salida ? parseMaybe(salida)! : today;
    return Math.max(0, diffDays(start, end));
  }, [pIngreso, salida, today]);

  const faseActual = useMemo(() => {
    // Priorizar la etapa que venga directamente del API (student.stage / student.raw.etapa).
    const apiStage = (student?.stage ||
      student?.raw?.etapa ||
      stage ||
      "") as string;
    if (apiStage && String(apiStage).trim() !== "")
      return String(apiStage).toUpperCase();

    // Si no hay etapa explícita, usar flags históricos (pF1..pF5)
    if (pF5) return "F5";
    if (pF4) return "F4";
    if (pF3) return "F3";
    if (pF2) return "F2";
    if (pF1) return "F1";
    return "ONBOARDING";
  }, [pF1, pF2, pF3, pF4, pF5, student?.stage, student?.raw?.etapa, stage]);

  const steps = [
    { label: "F1", date: pF1 },
    { label: "F2", date: pF2 },
    { label: "F3", date: pF3 },
    { label: "F4", date: pF4 },
    { label: "F5", date: pF5 },
  ];

  // Compatibilidad: el componente importado no coincide con props esperadas.
  // Lo forzamos a any para evitar errores de tipado mientras se estabiliza la vista.
  const PhasesTimelineAny = PhasesTimeline as any;
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<
    "estado" | "etapa" | "nicho" | "all"
  >("all");
  const [phaseHistory, setPhaseHistory] = useState<Array<{
    id: number | string;
    codigo_cliente: string;
    etapa_id: string;
    created_at: string;
  }> | null>(null);
  const [statusHistory, setStatusHistory] = useState<Array<{
    id: number | string;
    codigo_cliente?: string | null;
    estado_id: string;
    created_at: string;
    fecha_desde?: string | null;
    fecha_hasta?: string | null;
  }> | null>(null);
  const [tasksHistory, setTasksHistory] = useState<Array<{
    id: number | string;
    codigo_cliente?: string | null;
    descripcion?: string | null;
    created_at: string;
  }> | null>(null);

  function toDayDate(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function daysBetweenInclusive(a: Date, b: Date) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const aa = toDayDate(a).getTime();
    const bb = toDayDate(b).getTime();
    if (bb < aa) return 0;
    return Math.round((bb - aa) / msPerDay) + 1;
  }

  // Extraer pausas del historial de estatus (solo registros con PAUSADO y fechas válidas)
  const pausesFromStatusHistory = useMemo(() => {
    if (!statusHistory) return [];
    return statusHistory
      .filter((h) => {
        const isPaused =
          String(h.estado_id || "")
            .toUpperCase()
            .includes("PAUSADO") ||
          String(h.estado_id || "")
            .toUpperCase()
            .includes("PAUSA");
        return isPaused && h.fecha_desde && h.fecha_hasta;
      })
      .map((h) => ({
        start: h.fecha_desde!,
        end: h.fecha_hasta!,
        setAt: h.created_at,
      }));
  }, [statusHistory]);

  const mergedPauseIntervals = useMemo(() => {
    const allRanges: Array<{ start: Date; end: Date }> = [];

    // Usar pausas del endpoint de historial de estatus
    for (const h of pausesFromStatusHistory || []) {
      const s = parseMaybe(h.start);
      const e = parseMaybe(h.end);
      if (!s || !e) continue;
      allRanges.push({ start: toDayDate(s), end: toDayDate(e) });
    }

    if (allRanges.length === 0) return [] as Array<{ start: Date; end: Date }>;

    allRanges.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: Array<{ start: Date; end: Date }> = [];
    for (const r of allRanges) {
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push({ start: r.start, end: r.end });
        continue;
      }
      // Solape o contiguo
      const lastEnd = last.end.getTime();
      const rStart = r.start.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      if (rStart <= lastEnd + oneDay) {
        if (r.end.getTime() > lastEnd) last.end = r.end;
      } else {
        merged.push({ start: r.start, end: r.end });
      }
    }
    return merged;
  }, [pausesFromStatusHistory]);

  const accessStats = useMemo(() => {
    const ingresoIso = pIngreso || student?.ingreso || student?.raw?.ingreso;
    const start = parseMaybe(ingresoIso);
    if (!start) return null;

    const startDay = toDayDate(start);
    const today = toDayDate(new Date());
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceStart = Math.max(
      0,
      Math.round((today.getTime() - startDay.getTime()) / msPerDay),
    );

    // Días pausados acumulados hasta hoy (sin doble conteo)
    let pausedDaysElapsed = 0;
    for (const r of mergedPauseIntervals) {
      const a = r.start < startDay ? startDay : r.start;
      const b = r.end > today ? today : r.end;
      pausedDaysElapsed += daysBetweenInclusive(a, b);
    }

    const effectiveDays = Math.max(0, daysSinceStart - pausedDaysElapsed);
    const PROGRAM_DAYS = 120; // 4 meses ~ 120 días (regla operativa)
    const remaining = PROGRAM_DAYS - effectiveDays;
    const isExpired = remaining <= 0;
    const estEnd = addDays(startDay, PROGRAM_DAYS + pausedDaysElapsed);
    return {
      startDay,
      today,
      daysSinceStart,
      pausedDaysElapsed,
      effectiveDays,
      programDays: PROGRAM_DAYS,
      remainingDays: remaining,
      isExpired,
      estimatedEnd: estEnd,
    };
  }, [pIngreso, student?.ingreso, student?.raw?.ingreso, mergedPauseIntervals]);

  // Vista simplificada: solo "Mi perfil" (detalle). Otras secciones van en rutas aparte.

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Cargando alumno…</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No se encontró el alumno/cliente con código{" "}
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {code}
            </code>
          </p>
        </div>
      </div>
    );
  }

  const canSeeAdminAccessInfo = ["admin", "equipo", "atc"].includes(
    String((user as any)?.role ?? "").toLowerCase(),
  );

  return (
    <div className="space-y-6">
      <Header
        name={student.name}
        code={student.code || ""}
        apiStage={student.stage || undefined}
        apiState={student.state || student.raw?.estado || undefined}
        status={statusSint}
        ticketsCount={ticketsCount}
        hideCodeAndTickets
        canDelete={(user?.role ?? "").toLowerCase() === "admin"}
        onDelete={async () => {
          try {
            const codeToDelete = student.code || code;
            await deleteStudent(codeToDelete);
            toast({ title: "Alumno eliminado" });
            router.push("/admin/alumnos");
          } catch (e) {
            console.error(e);
            toast({ title: "No se pudo eliminar el alumno" });
          }
        }}
      />

      {/* Mi perfil (detalle) */}
      <>
        {/** Determinar si el usuario puede editar meta (estado, etapa, última tarea). Los alumnos NO. */}
        {(() => {
          const canEditMeta = (user?.role ?? "").toLowerCase() !== "student";
          return (
            <MetricsStrip
              statusLabel={
                (student?.state ?? student?.raw?.estado ?? "").replace?.(
                  "_",
                  " ",
                ) ??
                student?.state ??
                student?.raw?.estado ??
                ""
              }
              permanencia={permanencia}
              lastTaskAt={lastTaskAt}
              faseActual={faseActual}
              ingreso={pIngreso}
              salida={salida}
              pausedRange={null}
              onSaveLastTask={
                canEditMeta
                  ? async (localValue) => {
                      try {
                        const iso = new Date(localValue).toISOString();
                        await updateClientLastTask(student.code || code, iso);
                        setLastTaskAt(iso);
                        try {
                          const th = await getClienteTareas(
                            student.code || code,
                          );
                          setTasksHistory(th);
                        } catch {}
                        toast({ title: "Última tarea actualizada" });
                      } catch (e) {
                        console.error(e);
                        toast({
                          title: "No se pudo actualizar la última tarea",
                        });
                      }
                    }
                  : undefined
              }
              coachCount={(coaches || []).length}
              coachNames={
                (coaches || []).map((c) => c.name).filter(Boolean) as string[]
              }
              onJumpToCoaches={() => {
                if (typeof window === "undefined") return;
                const el = document.getElementById("coaches-card");
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onEdit={
                canEditMeta
                  ? (mode) => {
                      setEditMode(mode ?? "all");
                      setEditOpen(true);
                    }
                  : undefined
              }
            />
          );
        })()}

        {/* Contrato se moverá a la columna derecha junto a otras tarjetas para evitar espacios en blanco */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Columna principal: progreso, actividad y tickets */}
          <div className="lg:col-span-8 space-y-4">
            <PhasesTimelineAny steps={steps} />
            <PhaseHistory
              history={phaseHistory}
              statusHistory={statusHistory}
              tasksHistory={tasksHistory}
            />
            {/* Tickets movidos a la sección Feedback */}
          </div>
          {/* Columna lateral: equipo y contrato (sticky) */}
          <div className="space-y-4 lg:col-span-4 lg:sticky lg:top-24 self-start">
            {canSeeAdminAccessInfo && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Acceso (4 meses)</h3>
                  {accessStats ? (
                    accessStats.isExpired ? (
                      <Badge variant="destructive">Vencido</Badge>
                    ) : (
                      <Badge variant="secondary">Vigente</Badge>
                    )
                  ) : (
                    <Badge variant="secondary">Sin ingreso</Badge>
                  )}
                </div>

                {!accessStats ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No hay fecha de ingreso registrada para calcular el acceso.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Ingreso</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {fmtES(accessStats.startDay.toISOString())}
                        </span>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Editar fecha de ingreso"
                          onClick={() => {
                            setTempIngreso(
                              pIngreso ||
                                accessStats.startDay
                                  .toISOString()
                                  .split("T")[0],
                            );
                            setEditIngresoOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        Días desde ingreso
                      </span>
                      <span className="font-medium">
                        {accessStats.daysSinceStart}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        Días en pausa (no cuentan)
                      </span>
                      <span className="font-medium">
                        {accessStats.pausedDaysElapsed}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        Días efectivos
                      </span>
                      <span className="font-medium">
                        {accessStats.effectiveDays} / {accessStats.programDays}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        Vence (estimado)
                      </span>
                      <span className="font-medium">
                        {fmtES(accessStats.estimatedEnd.toISOString())}
                      </span>
                    </div>
                    {!accessStats.isExpired ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Días restantes
                        </span>
                        <span className="font-medium">
                          {Math.max(0, accessStats.remainingDays)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        * El vencimiento se calcula descontando días de pausa
                        registrados.
                      </p>
                    )}

                    <div className="pt-2 border-t border-border">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Historial de pausas ({pausesFromStatusHistory.length})
                      </div>
                      {pausesFromStatusHistory.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Sin pausas registradas.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {pausesFromStatusHistory
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.start).getTime() -
                                new Date(a.start).getTime(),
                            )
                            .map((r, idx) => {
                              const startDate = toDayDate(new Date(r.start));
                              const endDate = toDayDate(new Date(r.end));
                              const days = daysBetweenInclusive(
                                startDate,
                                endDate,
                              );
                              const today = toDayDate(new Date());
                              const isActive =
                                today >= startDate && today <= endDate;
                              return (
                                <div
                                  key={`pause-${idx}-${r.start}-${r.end}`}
                                  className="rounded-md border border-border bg-muted/30 p-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-medium">
                                      {fmtES(r.start)} → {fmtES(r.end)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isActive ? (
                                        <Badge
                                          variant="secondary"
                                          className="h-5"
                                        >
                                          Activa
                                        </Badge>
                                      ) : null}
                                      <span className="text-xs text-muted-foreground">
                                        {days} días
                                      </span>
                                    </div>
                                  </div>
                                  {r.setAt && (
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                      Registrada: {fmtES(r.setAt)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div id="coaches-card">
              <CoachesCard
                coaches={coaches}
                canManage={(user?.role ?? "").toLowerCase() !== "student"}
                onAssign={(codes) => assignCoaches(codes)}
                onRemove={(teamCode) => removeCoach(teamCode)}
                onChangeMember={(idx, candidate) => changeCoach(idx, candidate)}
              />
            </div>
            {/* Contrato card */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-medium">Contrato</h3>
              <ContratoCard
                code={student.code || code}
                contratoRaw={student.contrato ?? student.raw?.contrato}
                canUpload={(user?.role ?? "").toLowerCase() !== "student"}
                onUpdated={async () => {
                  try {
                    const url = `/client/get/clients?page=1&search=${encodeURIComponent(
                      student.code || code,
                    )}`;
                    const json = await apiFetch<any>(url);
                    const rows: any[] = Array.isArray(json?.data)
                      ? json.data
                      : Array.isArray(json?.clients?.data)
                        ? json.clients.data
                        : Array.isArray(json?.getClients?.data)
                          ? json.getClients.data
                          : [];
                    const s =
                      rows
                        .map((r) => ({
                          id: r.id,
                          code: r.codigo ?? r.code ?? null,
                          name: r.nombre ?? r.name ?? "-",
                          stage: r.etapa ?? r.stage ?? null,
                          state: r.estado ?? r.state ?? null,
                          ingreso: r.ingreso ?? r.joinDate ?? null,
                          lastActivity:
                            r.ultima_actividad ?? r.lastActivity ?? null,
                          teamMembers: Array.isArray(r.teamMembers)
                            ? r.teamMembers
                            : (r.equipo ?? r.alumnos ?? []),
                          contrato: r.contrato ?? null,
                          raw: r,
                        }))
                        .find(
                          (x) =>
                            (x.code ?? "").toLowerCase() ===
                            (student.code || code).toLowerCase(),
                        ) ||
                      rows[0] ||
                      null;
                    setStudent(s as any);
                  } catch {}
                }}
              />
            </div>
          </div>
        </div>
      </>

      {/* Eliminadas Tabs internas para chat; ahora chat es pestaña superior a pantalla completa */}

      {editOpen && (
        <EditOptionModal
          open={editOpen}
          onOpenChange={(v) => setEditOpen(v)}
          clientCode={student.code || code}
          current={{
            estado: student.state || student.raw?.estado,
            etapa: student.stage || student.raw?.etapa,
            nicho: student.raw?.nicho,
          }}
          mode={editMode}
          onSaved={async () => {
            // refresh student tras guardar (estado/etapa/nicho)
            const url = `/client/get/clients?page=1&search=${encodeURIComponent(
              code,
            )}`;
            const json = await apiFetch<any>(url);
            const rows: any[] = Array.isArray(json?.data)
              ? json.data
              : Array.isArray(json?.clients?.data)
                ? json.clients.data
                : Array.isArray(json?.getClients?.data)
                  ? json.getClients.data
                  : [];
            const s =
              rows
                .map(
                  (r) =>
                    ({
                      id: r.id,
                      code: r.codigo ?? r.code ?? null,
                      name: r.nombre ?? r.name ?? "-",
                      stage: r.etapa ?? r.stage ?? null,
                      state: r.estado ?? r.state ?? null,
                      ingreso: r.ingreso ?? r.joinDate ?? null,
                      lastActivity:
                        r.ultima_actividad ?? r.lastActivity ?? null,
                      teamMembers: Array.isArray(r.teamMembers)
                        ? r.teamMembers
                        : (r.equipo ?? r.alumnos ?? []),
                      contrato: r.contrato ?? null,
                      raw: r,
                    }) as any,
                )
                .find(
                  (x) => (x.code ?? "").toLowerCase() === code.toLowerCase(),
                ) ||
              rows[0] ||
              null;
            setStudent(s as any);
            // refrescar historiales inmediatamente
            try {
              const targetCode = (s as any)?.code || code;
              await fetchPhaseHistory(targetCode);
              try {
                const [eh, th] = await Promise.all([
                  getClienteEstatus(targetCode),
                  getClienteTareas(targetCode),
                ]);
                setStatusHistory(eh);
                setTasksHistory(th);
              } catch {}
            } catch {}
          }}
        />
      )}

      {/* Modal para editar fecha de ingreso */}
      <Dialog open={editIngresoOpen} onOpenChange={setEditIngresoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar fecha de ingreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="fecha-ingreso">Fecha de ingreso</Label>
              <Input
                id="fecha-ingreso"
                type="date"
                value={tempIngreso ? tempIngreso.split("T")[0] : ""}
                onChange={(e) => setTempIngreso(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditIngresoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveIngreso} disabled={!tempIngreso}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Se eliminó el botón flotante de chat; ahora está en una pestaña */}

      <p className="text-center text-xs text-muted-foreground">
        * Vista de demostración: los cambios no se envían al servidor
      </p>
    </div>
  );
}

function ContratoViewer({ contratoRaw }: { contratoRaw: any }) {
  if (!contratoRaw) {
    return <div className="text-sm text-muted-foreground">Sin contrato</div>;
  }

  // Algunas respuestas traen el contrato como base64 grande.
  // Intentamos detectarlo y decodificar para mostrar un preview.
  let decoded: string | null = null;
  try {
    const s = String(contratoRaw || "");
    // heurística: string muy largo con caracteres base64 y signos '=' al final
    const maybeBase64 = /^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100;
    if (maybeBase64) {
      // atob es global en browsers; Next.js cliente lo soporta
      decoded = atob(s.replace(/\s+/g, ""));
    }
  } catch (e) {
    decoded = null;
  }

  if (decoded) {
    // Mostrar solo primeras 500 chars para evitar UI gigante
    const preview = decoded.slice(0, 500) + (decoded.length > 500 ? "…" : "");
    return (
      <div className="text-sm text-muted-foreground">
        <div className="mb-2 break-words whitespace-pre-wrap">{preview}</div>
        <details className="text-xs text-muted-foreground">
          <summary>Mostrar completo</summary>
          <pre className="mt-2 max-h-64 overflow-auto text-xs">{decoded}</pre>
        </details>
      </div>
    );
  }

  // Fallback: mostrar como texto simple
  return (
    <div className="text-sm text-muted-foreground break-words">
      {String(contratoRaw)}
    </div>
  );
}

function TabsTicketsChat({
  code,
  studentName,
  student,
  onChangedTickets,
}: {
  code: string;
  studentName?: string | null;
  student: any;
  onChangedTickets?: (n: number) => void;
}) {
  const [tab, setTab] = useState<"tickets" | "chat">("tickets");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TabBtn active={tab === "tickets"} onClick={() => setTab("tickets")}>
          Tickets
        </TabBtn>
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")}>
          Chat
        </TabBtn>
      </div>
      {tab === "tickets" ? (
        <TicketsPanel student={student} onChangedTickets={onChangedTickets} />
      ) : (
        <ChatPanel code={code} studentName={studentName} />
      )}
    </div>
  );
}

function ChatPanel({
  code,
  studentName,
}: {
  code: string;
  studentName?: string | null;
}) {
  const href = `/chat/${encodeURIComponent(code)}`;
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="text-xs text-muted-foreground">
          {studentName ? `Chat con ${studentName}` : "Abrir chat del alumno"}
        </div>
        <Button asChild variant="secondary" size="sm" className="w-fit">
          <Link href={href}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Abrir chat
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Utilidades numéricas para formato en vista previa del formulario ADS
function toNum(v?: string | number | null) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}
function fmtNum(n?: string | number | null, digits?: number) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: typeof digits === "number" ? digits : 0,
  }).format(v);
}
function fmtMoney(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}
function fmtPct(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

function normPhaseId(v: unknown) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function isFase5(etapaId: unknown) {
  const n = normPhaseId(etapaId);
  if (n === "F5" || n === "FASE5") return true;
  if (n.startsWith("F5") && n.length > 2 && !/\d/.test(n[2])) return true;
  if (n.startsWith("FASE5") && n.length > 5 && !/\d/.test(n[5])) return true;
  return false;
}

function byDateAsc(a: Date, b: Date) {
  return a.getTime() - b.getTime();
}

async function fetchFase5StartDateISO(
  studentCode: string,
): Promise<string | null> {
  try {
    const histUrl = `/client/get/cliente-etapas/${encodeURIComponent(
      studentCode,
    )}`;
    const jh = await apiFetch<any>(histUrl);
    const rows = Array.isArray(jh?.data) ? jh.data : [];

    const dates = rows
      .filter((r: any) =>
        isFase5(r?.etapa_id ?? r?.etapa ?? r?.fase ?? r?.stage),
      )
      .map((r: any) => parseMaybe(r?.created_at ?? r?.fecha ?? r?.createdAt))
      .filter((d: Date | null): d is Date => Boolean(d))
      .sort(byDateAsc);

    return dates[0] ? isoDay(dates[0]) : null;
  } catch {
    return null;
  }
}

// Formulario embellecido de Métricas ADS con shadcn/ui
function AdsMetricsForm({
  studentCode,
  studentName,
}: {
  studentCode: string;
  studentName?: string;
}) {
  type Metrics = {
    fecha_inicio?: string;
    fecha_asignacion?: string;
    fecha_fin?: string;
    inversion?: string;
    facturacion?: string;
    roas?: string;
    alcance?: string;
    clics?: string;
    visitas?: string;
    pagos?: string;
    carga_pagina?: string;
    eff_ads?: string;
    eff_pago?: string;
    eff_compra?: string;
    compra_carnada?: string;
    compra_bump1?: string;
    compra_bump2?: string;
    compra_oto1?: string;
    compra_oto2?: string;
    compra_downsell?: string;
    pauta_activa?: boolean;
    requiere_interv?: boolean;
    fase?: string;
    coach_copy?: string;
    coach_plat?: string;
    obs?: string;
    interv_sugerida?: string;
    auto_roas?: boolean;
    auto_eff?: boolean;
    adjuntos?: Array<{
      id: string;
      kind: "link" | "file";
      name: string;
      url?: string;
      type?: string;
      size?: number;
    }>;
  };

  const [data, setData] = useState<Metrics>({
    auto_roas: true,
    auto_eff: true,
    pauta_activa: false,
    requiere_interv: false,
    adjuntos: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const saveTimerRef = useRef<number | null>(null);
  const didInitRef = useRef<boolean>(false);

  const [assignedCoaches, setAssignedCoaches] = useState<
    Array<{ name: string; area?: string | null; puesto?: string | null }>
  >([]);

  const norm = (v: unknown) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toUpperCase();

  const coachCopyAssigned = useMemo(() => {
    return assignedCoaches.find((c) => norm(c.area).includes("COPY")) || null;
  }, [assignedCoaches]);

  const coachAdsAssigned = useMemo(() => {
    return (
      assignedCoaches.find(
        (c) => c.area === "TECNICO" && c.puesto === "COACH_TECNICO",
      ) || null
    );
  }, [assignedCoaches]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
          studentCode,
        )}`;
        const j = await apiFetch<any>(url);
        if (!alive) return;
        const rows: any[] = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j)
            ? j
            : [];
        const mapped = rows
          .map((r) => {
            const name = String(
              r?.coach_nombre ?? r?.name ?? r?.nombre ?? "",
            ).trim();
            if (!name) return null;
            return {
              name,
              area: r?.area ?? null,
              puesto: r?.puesto ?? null,
            };
          })
          .filter(Boolean) as Array<{
          name: string;
          area?: string | null;
          puesto?: string | null;
        }>;
        const uniqByName = Array.from(
          new Map(mapped.map((c) => [c.name, c])).values(),
        ).sort((a, b) => a.name.localeCompare(b.name, "es"));
        setAssignedCoaches(uniqByName);
      } catch {
        if (!alive) return;
        setAssignedCoaches([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentCode]);

  useEffect(() => {
    const nextCopy = coachCopyAssigned?.name || "";
    const nextAds = coachAdsAssigned?.name || "";
    setData((prev) => {
      if (
        (prev.coach_copy || "") === nextCopy &&
        (prev.coach_plat || "") === nextAds
      )
        return prev;
      return {
        ...prev,
        coach_copy: nextCopy,
        coach_plat: nextAds,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachCopyAssigned?.name, coachAdsAssigned?.name]);

  function toNumOrNull(s?: string): number | null {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function fmtPercentNoScale(n?: number | null): string {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    const v = Number(n);
    const s = v.toFixed(2);
    return `${s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
  }
  function pctOf(
    part?: string | number | null,
    total?: string | number | null,
  ): string {
    const p = toNum(part as any);
    const t = toNum(total as any);
    if (p == null || !t || t <= 0) return "—";
    // Para bumps/OTO: mostrar porcentaje sin escalar (1 => 1%, no 100%)
    return fmtPercentNoScale(p / t);
  }

  // Cargar métrica existente por estudiante
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const fase5Start = await fetchFase5StartDateISO(studentCode);
        const key = `ads-metrics:${studentCode}`;
        const raw =
          typeof window !== "undefined"
            ? window.localStorage.getItem(key)
            : null;
        if (!mounted) return;

        let maybeForm: any = null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            // Por compatibilidad, si hay payloads antiguos, guardar solo el objeto de formulario
            maybeForm = parsed?.form ?? parsed;
          } catch {
            maybeForm = null;
          }
        }

        setData((prev) => {
          const merged = { ...prev, ...(maybeForm ?? {}) } as Metrics;
          // Regla: fecha_inicio debe ser la fecha de entrada a Fase 5 si existe.
          if (fase5Start) merged.fecha_inicio = fase5Start;
          return merged;
        });
      } catch (e) {
        console.error("ADS metrics local load error", e);
      } finally {
        if (mounted) setLoading(false);
        didInitRef.current = true;
      }
    })();
    return () => {
      mounted = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode]);

  // Autosave con debounce al cambiar datos (crea si no existe, actualiza si existe)
  useEffect(() => {
    if (!didInitRef.current) return; // evitar correr en el primer set tras load
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        const key = `ads-metrics:${studentCode}`;
        const payload = {
          savedAt: new Date().toISOString(),
          form: data,
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(payload));
        }
      } catch (e) {
        console.error("ADS metrics local save error", e);
      } finally {
        setSaving(false);
      }
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  function persist(next: Metrics) {
    setData(next);
  }

  // Derivados automáticos
  const roasCalc = useMemo(() => {
    const inv = toNum(data.inversion);
    const fac = toNum(data.facturacion);
    if (inv && inv > 0 && fac != null) return (fac / inv).toFixed(2);
    return undefined;
  }, [data.inversion, data.facturacion]);
  const effAdsCalc = useMemo(() => {
    const c = toNum(data.clics);
    const a = toNum(data.alcance);
    if (c != null && a && a > 0) return c / a;
    return undefined;
  }, [data.clics, data.alcance]);
  const effPagoCalc = useMemo(() => {
    const p = toNum(data.pagos);
    const v = toNum(data.visitas);
    if (p != null && v && v > 0) return p / v;
    return undefined;
  }, [data.pagos, data.visitas]);
  const effCompraCalc = useMemo(() => {
    const comp = toNum(data.compra_carnada);
    const v = toNum(data.visitas);
    if (comp != null && v && v > 0) return comp / v;
    return undefined;
  }, [data.compra_carnada, data.visitas]);

  const view = {
    roas: data.auto_roas ? (roasCalc ?? data.roas) : data.roas,
    eff_ads: data.auto_eff ? (effAdsCalc ?? data.eff_ads) : data.eff_ads,
    eff_pago: data.auto_eff ? (effPagoCalc ?? data.eff_pago) : data.eff_pago,
    eff_compra: data.auto_eff
      ? (effCompraCalc ?? data.eff_compra)
      : data.eff_compra,
  } as const;

  function onChange<K extends keyof Metrics>(k: K, v: Metrics[K]) {
    persist({ ...data, [k]: v });
  }

  // Notas y Adjuntos (link y archivos de sesión)
  const [newLinkName, setNewLinkName] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");
  const [sessionFiles, setSessionFiles] = useState<
    Array<{ id: string; name: string; type: string; size: number; url: string }>
  >([]);

  function addLinkAttachment() {
    const url = (newLinkUrl || "").trim();
    const name = (newLinkName || "").trim() || url;
    if (!url) return;
    try {
      // validación básica de URL
      const u = new URL(url);
      const item = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        kind: "link" as const,
        name,
        url: u.toString(),
      };
      const next = [...(data.adjuntos || []), item];
      onChange("adjuntos", next as any);
      setNewLinkName("");
      setNewLinkUrl("");
    } catch {}
  }

  function removeSavedAttachment(id: string) {
    const next = (data.adjuntos || []).filter((a) => a.id !== id);
    onChange("adjuntos", next as any);
  }

  function onPickSessionFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const add = files.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      url: URL.createObjectURL(f),
    }));
    setSessionFiles((prev) => [...prev, ...add]);
    try {
      e.target.value = "";
    } catch {}
  }

  function removeSessionFile(id: string) {
    setSessionFiles((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.url) URL.revokeObjectURL(it.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  function NotesAndAttachments({
    data,
    onChange,
  }: {
    data: Metrics;
    onChange: <K extends keyof Metrics>(k: K, v: Metrics[K]) => void;
  }) {
    useEffect(() => {
      return () => {
        // liberar URLs al desmontar
        sessionFiles.forEach((f) => {
          try {
            if (f.url) URL.revokeObjectURL(f.url);
          } catch {}
        });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Notas y adjuntos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              rows={3}
              placeholder="Notas, comentarios, enlaces…"
              value={data.obs || ""}
              onChange={(e) => onChange("obs", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Intervención sugerida</Label>
            <Textarea
              rows={3}
              placeholder="Descripción de la intervención"
              value={data.interv_sugerida || ""}
              onChange={(e) => onChange("interv_sugerida", e.target.value)}
            />
          </div>

          <div className="pt-2 space-y-2">
            <div className="text-xs text-muted-foreground">
              Adjuntar enlaces
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <Input
                className="md:col-span-2"
                placeholder="Nombre (opcional)"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
              />
              <Input
                className="md:col-span-3"
                placeholder="https://…"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
              />
            </div>
            <div>
              <Button type="button" size="sm" onClick={addLinkAttachment}>
                Agregar enlace
              </Button>
            </div>
            {(data.adjuntos || []).filter((a) => a.kind === "link").length >
              0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Enlaces guardados
                </div>
                <div className="flex flex-wrap gap-2">
                  {(data.adjuntos || [])
                    .filter((a) => a.kind === "link")
                    .map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded border px-2 py-1"
                      >
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                          title={a.url}
                        >
                          {a.name || a.url}
                        </a>
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-red-600"
                          onClick={() => removeSavedAttachment(a.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 space-y-2">
            <div className="text-xs text-muted-foreground">
              Adjuntar archivos (solo esta sesión)
            </div>
            <input type="file" multiple onChange={onPickSessionFiles} />
            {sessionFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Archivos de la sesión
                </div>
                <div className="flex flex-col gap-1">
                  {sessionFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-xs rounded border px-2 py-1"
                    >
                      <div className="truncate">
                        {f.name}{" "}
                        <span className="text-muted-foreground">
                          ({(f.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Ver
                        </a>
                        <button
                          type="button"
                          className="hover:text-red-600"
                          onClick={() => removeSessionFile(f.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Nota: los archivos no se guardan en el servidor ni en
                  localStorage. Usa enlaces para persistir referencias (Drive,
                  YouTube, etc.).
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Auto-calcular "Carga de página (%)" = visitas/clics*100
  useEffect(() => {
    // parse numbers de strings con helper toNum
    const v = toNum(data.visitas);
    const c = toNum(data.clics);
    let calc = "0";
    if (c && c > 0 && v != null) {
      const pct = (v / c) * 100;
      // 1 decimal, sin .0 innecesario
      const s = pct.toFixed(1);
      calc = /\.0$/.test(s) ? s.replace(/\.0$/, "") : s;
    }
    if ((data.carga_pagina || "0") !== calc) {
      setData((prev) => ({ ...prev, carga_pagina: calc }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.visitas, data.clics]);

  // Helpers de presentación para porcentajes sin símbolo
  function toPercentNoSymbol(x?: string | number | null): string {
    const v = toNum(x);
    if (v == null) return "";
    // Si el valor es > 1, asumimos que es un % (ej: 25) y lo normalizamos a ratio (0.25)
    const ratio = v > 1 ? v / 100 : v;
    const pct = ratio * 100;
    const s = pct.toFixed(1);
    return /\.0$/.test(s) ? s.replace(/\.0$/, "") : s;
  }
  // Variante sin escalar: ratio 1 -> "1" (mostrado como 1%)
  function toPercentNoSymbolNoScale(x?: string | number | null): string {
    const v = toNum(x);
    if (v == null) return "";
    const s = Number(v).toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }
  function sanitizePercentInput(s: string): string {
    try {
      const t = s.replace(/%/g, "").trim();
      // normaliza comas a punto y elimina caracteres no numéricos salvo el punto
      const norm = t.replace(/,/g, ".").replace(/[^0-9.\-]/g, "");
      // evita múltiples puntos: conserva el primero
      const parts = norm.split(".");
      if (parts.length <= 2) return norm;
      return parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
    } catch {
      return s;
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        {loading
          ? "Cargando métricas…"
          : saving
            ? "Guardando…"
            : "Cambios guardados"}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Métricas ADS {studentName ? `— ${studentName}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={data.fecha_inicio || ""}
                onChange={(e) => onChange("fecha_inicio", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha asignación</Label>
              <Input
                type="date"
                value={data.fecha_asignacion || ""}
                onChange={(e) => onChange("fecha_asignacion", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={data.fecha_fin || ""}
                onChange={(e) => onChange("fecha_fin", e.target.value)}
              />
            </div>
          </div>

          {/* Fila superior: Rendimiento (1/2) y Notas/Adjuntos (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Rendimiento</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Inversión (USD)</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.inversion || ""}
                    onChange={(e) => onChange("inversion", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Facturación (USD)</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.facturacion || ""}
                    onChange={(e) => onChange("facturacion", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>ROAS</Label>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Auto</span>
                      <Switch
                        checked={!!data.auto_roas}
                        onCheckedChange={(v) => onChange("auto_roas", v)}
                      />
                    </div>
                  </div>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={data.auto_roas}
                    value={data.auto_roas ? view.roas || "" : data.roas || ""}
                    onChange={(e) => onChange("roas", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <NotesAndAttachments data={data} onChange={onChange} />
          </div>

          {/* Compras moved below Embudo + Efectividades */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Embudo</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Alcance</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.alcance || ""}
                    onChange={(e) => onChange("alcance", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Clics</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.clics || ""}
                    onChange={(e) => onChange("clics", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Visitas</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.visitas || ""}
                    onChange={(e) => onChange("visitas", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pagos iniciados</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.pagos || ""}
                    onChange={(e) => onChange("pagos", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Carga de página (%)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0%"
                    disabled
                    value={`${data.carga_pagina || "0"}%`}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Se calcula: visitas / clics × 100
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Efectividades (%)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Ads (clics/alcance)</Label>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Auto</span>
                      <Switch
                        checked={!!data.auto_eff}
                        onCheckedChange={(v) => onChange("auto_eff", v)}
                      />
                    </div>
                  </div>
                  <Input
                    inputMode="decimal"
                    placeholder="0.0"
                    disabled
                    value={
                      view.eff_ads != null
                        ? `${(Number(view.eff_ads) * 100).toFixed(1)}%`
                        : ""
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Pago iniciado (pagos/visitas)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0%"
                    disabled={data.auto_eff}
                    value={`${
                      data.auto_eff
                        ? toPercentNoSymbol(view.eff_pago)
                        : toPercentNoSymbol(data.eff_pago)
                    }%`}
                    onChange={(e) =>
                      onChange("eff_pago", sanitizePercentInput(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Compra (carnada/visitas)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0%"
                    disabled={data.auto_eff}
                    value={`${
                      data.auto_eff
                        ? toPercentNoSymbol(view.eff_compra)
                        : toPercentNoSymbol(data.eff_compra)
                    }%`}
                    onChange={(e) =>
                      onChange(
                        "eff_compra",
                        sanitizePercentInput(e.target.value),
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Compras ahora en la misma fila */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Compras</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Carnada</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_carnada || ""}
                    onChange={(e) => onChange("compra_carnada", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bump 1</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_bump1 || ""}
                    onChange={(e) => onChange("compra_bump1", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_bump1, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Bump 2</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_bump2 || ""}
                    onChange={(e) => onChange("compra_bump2", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_bump2, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>OTO 1</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_oto1 || ""}
                    onChange={(e) => onChange("compra_oto1", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_oto1, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>OTO 2</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_oto2 || ""}
                    onChange={(e) => onChange("compra_oto2", e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad: {pctOf(data.compra_oto2, data.compra_carnada)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Downsell</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={data.compra_downsell || ""}
                    onChange={(e) =>
                      onChange("compra_downsell", e.target.value)
                    }
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Efectividad:{" "}
                    {pctOf(data.compra_downsell, data.compra_carnada)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pauta activa</Label>
                  <Switch
                    checked={!!data.pauta_activa}
                    onCheckedChange={(v) => onChange("pauta_activa", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>¿Requiere intervención?</Label>
                  <Switch
                    checked={!!data.requiere_interv}
                    onCheckedChange={(v) => onChange("requiere_interv", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fase</Label>
                  <Select
                    value={data.fase ? data.fase : "sin-fase"}
                    onValueChange={(v) =>
                      onChange("fase", v === "sin-fase" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-fase">Sin fase</SelectItem>
                      <SelectItem value="Fase de testeo">
                        Fase de testeo
                      </SelectItem>
                      <SelectItem value="Fase de optimización">
                        Fase de optimización
                      </SelectItem>
                      <SelectItem value="Fase de Escala">
                        Fase de Escala
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Coaches</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label>Coach de Copy</Label>
                  <div className="min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {coachCopyAssigned?.name || "—"}
                    </span>
                    {coachCopyAssigned?.area ? (
                      <Badge variant="secondary">
                        {String(coachCopyAssigned.area)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Coach Técnico</Label>
                  <div className="min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {coachAdsAssigned?.name || "—"}
                    </span>
                    {coachAdsAssigned?.area ? (
                      <Badge variant="secondary">
                        {String(coachAdsAssigned.area)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notas movidas arriba junto a Rendimiento */}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vista previa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="space-y-1.5">
            <div className="font-medium text-muted-foreground">Rendimiento</div>
            <div>
              ROAS: <b>{view.roas ?? "—"}</b>
            </div>
            <div>
              Inversión: <b>{fmtMoney(data.inversion)}</b>
            </div>
            <div>
              Facturación: <b>{fmtMoney(data.facturacion)}</b>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground">Embudo</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  Alcance: <b>{fmtNum(data.alcance)}</b>
                </div>
                <div>
                  Clics: <b>{fmtNum(data.clics)}</b>
                </div>
                <div>
                  Visitas: <b>{fmtNum(data.visitas)}</b>
                </div>
                <div>
                  Pagos: <b>{fmtNum(data.pagos)}</b>
                </div>
                <div className="col-span-2">
                  Carga pág: <b>{fmtPct(data.carga_pagina)}</b>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground">
                Efectividades
              </div>
              <div>
                Ads: <b>{fmtPct(view.eff_ads)}</b>{" "}
                <span className="text-[10px] text-muted-foreground">
                  ({view.eff_ads})
                </span>
              </div>
              <div>
                Pago iniciado: <b>{fmtPct(view.eff_pago)}</b>
              </div>
              <div>
                Compra: <b>{fmtPct(view.eff_compra)}</b>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Compras
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["Carnada", data.compra_carnada],
                    ["B1", data.compra_bump1],
                    ["B2", data.compra_bump2],
                    ["O1", data.compra_oto1],
                    ["O2", data.compra_oto2],
                    ["Dn", data.compra_downsell],
                  ] as const
                )
                  .filter(([, v]) => toNum(v) && toNum(v)! > 0)
                  .map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-xs">
                      {k}: {fmtNum(v)}
                    </Badge>
                  ))}
                {!toNum(data.compra_carnada) &&
                  !toNum(data.compra_bump1) &&
                  !toNum(data.compra_bump2) &&
                  !toNum(data.compra_oto1) &&
                  !toNum(data.compra_oto2) &&
                  !toNum(data.compra_downsell) && (
                    <span className="text-sm text-muted-foreground">
                      Sin registros
                    </span>
                  )}
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Estado y fase
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={data.pauta_activa ? "default" : "outline"}>
                  {data.pauta_activa ? "Pauta activa" : "Pauta inactiva"}
                </Badge>
                <Badge
                  variant={data.requiere_interv ? "destructive" : "secondary"}
                >
                  {data.requiere_interv
                    ? "Requiere intervención"
                    : "Sin intervención"}
                </Badge>
                <Badge variant="outline">{data.fase || "Sin fase"}</Badge>
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Coaches
              </div>
              <div className="grid grid-cols-1 gap-1">
                <div>
                  Copy: <b>{data.coach_copy || "—"}</b>
                </div>
                <div>
                  Técnico: <b>{data.coach_plat || "—"}</b>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Observaciones
              </div>
              <div className="whitespace-pre-wrap">{data.obs || "—"}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground mb-2">
                Intervención sugerida
              </div>
              <div className="whitespace-pre-wrap">
                {data.interv_sugerida || "—"}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Guardado local automáticamente. Esta vista no envía datos al
            servidor.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 ${
        active
          ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800"
          : "bg-card text-muted-foreground border border-border hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function ContratoCard({
  code,
  contratoRaw,
  canUpload,
  onUpdated,
}: {
  code: string;
  contratoRaw: any;
  canUpload?: boolean;
  onUpdated?: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!canUpload) {
      try {
        e.target.value = "";
      } catch {}
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    // Validar tipos permitidos: PDF o Word (doc/docx)
    const okTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const okExt = new Set(["pdf", "doc", "docx"]);
    if (!(okTypes.has(file.type) || okExt.has(ext))) {
      toast({
        title: "Tipo de archivo no permitido",
        description: "Solo se aceptan PDF o Word (.doc, .docx)",
      });
      try {
        e.target.value = "";
      } catch {}
      return;
    }
    try {
      setUploading(true);
      await uploadClientContract(code, file);
      toast({ title: "Contrato actualizado" });
      await onUpdated?.();
      // refrescar vista previa tras subir
      await loadPreview();
    } catch (err) {
      console.error(err);
      toast({ title: "Error al subir contrato" });
    } finally {
      setUploading(false);
      try {
        e.target.value = "";
      } catch {}
    }
  }

  async function onDownload() {
    try {
      setDownloading(true);
      const { blob, filename } = await downloadClientContractBlob(code);
      const url = URL.createObjectURL(blob);
      // Si es PDF o imagen, abrir en nueva pestaña; si no, descargar
      const ct = blob.type || "";
      if (ct.includes("pdf") || ct.startsWith("image/")) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `contrato-${code}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error(err);
      toast({ title: "No se pudo descargar el contrato" });
    } finally {
      setDownloading(false);
    }
  }

  async function loadPreview() {
    try {
      setPreviewLoading(true);
      // descargar blob del contrato
      const { blob } = await downloadClientContractBlob(code);
      const ct = blob.type || "";
      // soportamos solo PDF y Word
      if (ct.includes("pdf") || ct === "application/pdf") {
        const url = URL.createObjectURL(blob);
        // liberar anterior
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
        setPreviewType("pdf");
      } else if (
        ct === "application/msword" ||
        ct ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        // Word: no es previsualizable de forma nativa con blob; mostramos aviso
        setPreviewUrl(null);
        setPreviewType("word");
      } else {
        setPreviewUrl(null);
        setPreviewType(null);
      }
    } catch (e) {
      // si no hay contrato o falla, limpiar
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewType(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    // cargar vista previa inicial si existe contrato
    loadPreview();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="space-y-3">
      {/* Vista previa: PDF incrustado o aviso para Word */}
      <div className="rounded border bg-muted/30 p-2">
        {previewLoading ? (
          <div className="text-sm text-muted-foreground p-6 text-center">
            Cargando vista previa…
          </div>
        ) : previewType === "pdf" && previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-[420px] rounded border"
            title={`Contrato ${code}`}
          ></iframe>
        ) : previewType === "word" ? (
          <div className="text-sm text-muted-foreground p-4">
            Vista previa de Word no disponible en el navegador. Usa
            "Ver/Descargar" para abrirlo en tu Office.
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-4">
            Sin contrato o tipo no soportado (solo PDF o Word).
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx"
              onChange={onPickFile}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Subiendo…" : "Subir contrato"}
            </Button>
          </>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={onDownload}
          disabled={downloading}
        >
          {downloading ? "Descargando…" : "Ver/Descargar"}
        </Button>
      </div>
    </div>
  );
}
