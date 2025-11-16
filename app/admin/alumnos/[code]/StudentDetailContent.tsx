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
  parseMaybe,
  diffDays,
  type Stage,
  type StatusSint,
} from "./_parts/detail-utils";
import TicketsPanel from "./_parts/TicketsPanel";
import SessionsStudentPanel from "./_parts/SessionsStudentPanel";
import BonosPanel from "./_parts/BonosPanel";
import ChatPanel from "./_parts/ChatPanel";
import EditOptionModal from "./_parts/EditOptionModal";
import { getStudentTickets } from "../api";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function StudentDetailContent({ code }: { code: string }) {
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
    undefined
  );
  const [pauseInfo, setPauseInfo] = useState<{
    start: string;
    end: string;
    daysElapsed: number;
    totalDays: number;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Fetch the student directly from the API using the search code
        const url = `/client/get/clients?page=1&search=${encodeURIComponent(
          code
        )}`;
        const json = await apiFetch<any>(url);
        const rows: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.clients?.data)
          ? json.clients.data
          : Array.isArray(json?.getClients?.data)
          ? json.getClients.data
          : [];
        const list = rows.map(
          (r) =>
            ({
              id: r.id,
              code: r.codigo ?? r.code ?? null,
              name: (r.nombre ?? r.name) || "-",
              stage: r.etapa ?? r.stage ?? null,
              state: r.estado ?? r.state ?? null,
              ingreso: r.ingreso ?? r.joinDate ?? null,
              lastActivity: r.ultima_actividad ?? r.lastActivity ?? null,
              teamMembers: Array.isArray(r.teamMembers)
                ? r.teamMembers
                : r.equipo ?? r.alumnos ?? [],
              contrato: r.contrato ?? null,
              raw: r,
            } as any)
        );

        const s =
          list.find(
            (x) => (x.code ?? "").toLowerCase() === code.toLowerCase()
          ) ||
          list[0] ||
          null;
        if (!alive) return;
        setStudent(s as any);

        if (s?.code) {
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

          // Cargar historial de estatus y tareas
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
                "ONBOARDING"
            );
          } catch {
            // keep existing stage if parsing fails
          }
          setPIngreso(
            s.ingreso ?? s.joinDate ?? s.raw?.ingreso ?? s.raw?.joinDate ?? ""
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
        setStudent(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  // Cargar/derivar pausa desde localStorage
  // Función para calcular y actualizar la info de pausa desde localStorage
  function computePauseFromStorage() {
    try {
      const key = `student-pause:${code}`;
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (!raw) {
        setPauseInfo(null);
        return;
      }
      const { start, end } = JSON.parse(raw) || {};
      if (!start || !end) {
        setPauseInfo(null);
        return;
      }
      const s = new Date(start);
      const e = new Date(end);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const msPerDay = 24 * 60 * 60 * 1000;
      const totalDays = Math.max(
        1,
        Math.round((e.getTime() - s.getTime()) / msPerDay) + 1
      );
      const daysElapsed = Math.min(
        totalDays,
        Math.max(0, Math.round((today.getTime() - s.getTime()) / msPerDay) + 1)
      );
      setPauseInfo({
        start: s.toISOString(),
        end: e.toISOString(),
        daysElapsed,
        totalDays,
      });
    } catch {
      setPauseInfo(null);
    }
  }

  useEffect(() => {
    computePauseFromStorage();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === `student-pause:${code}`) computePauseFromStorage();
    };
    const onPauseChanged = (ev: Event) => {
      try {
        const anyEv = ev as CustomEvent<any>;
        if (!anyEv?.detail) return;
        if (anyEv.detail.code !== code) return;
        // leer de storage para mantener una sola fuente
        computePauseFromStorage();
      } catch {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
      window.addEventListener("student:pause-changed", onPauseChanged);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("student:pause-changed", onPauseChanged);
      }
    };
  }, [code]);

  // Cargar historial de etapas una vez y bajo demanda
  async function fetchPhaseHistory(codeToFetch: string) {
    try {
      const histUrl = `/client/get/cliente-etapas/${encodeURIComponent(
        codeToFetch
      )}`;
      const jh = await apiFetch<any>(histUrl);
      const rows = Array.isArray(jh?.data) ? jh.data : [];
      setPhaseHistory(
        rows.map((r: any) => ({
          id: r.id,
          codigo_cliente: r.codigo_cliente,
          etapa_id: r.etapa_id,
          created_at: r.created_at,
        }))
      );
    } catch (e) {
      setPhaseHistory(null);
    }
  }

  async function loadCoaches(alumnoCode: string) {
    try {
      const qUrl = `/client/get/clients-coaches?alumno=${encodeURIComponent(
        alumnoCode
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
    try {
      const body = {
        codigo_cliente: student.code,
        equipos: codes,
      };
      await apiFetch("/team/associate/team-client", {
        method: "POST",
        body: JSON.stringify(body),
      });
      // refresh coaches
      await loadCoaches(student.code);
    } catch (e) {
      console.error("Error assigning coaches", e);
    }
  }

  async function removeCoach(coachId: string | number | null) {
    if (!student?.code || !coachId) {
      console.warn(
        "removeCoach called without student.code or coachId",
        student?.code,
        coachId
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
    id: number;
    codigo_cliente: string;
    etapa_id: string;
    created_at: string;
  }> | null>(null);
  const [statusHistory, setStatusHistory] = useState<Array<{
    id: number | string;
    codigo_cliente?: string | null;
    estado_id: string;
    created_at: string;
  }> | null>(null);
  const [tasksHistory, setTasksHistory] = useState<Array<{
    id: number | string;
    codigo_cliente?: string | null;
    descripcion?: string | null;
    created_at: string;
  }> | null>(null);

  const [topTab, setTopTab] = useState<
    "detalle" | "chat" | "ads" | "sesiones" | "bonos"
  >("detalle");

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
            No se encontró el alumno con código{" "}
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {code}
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        name={student.name}
        code={student.code || ""}
        apiStage={student.stage || undefined}
        apiState={student.state || student.raw?.estado || undefined}
        status={statusSint}
        ticketsCount={ticketsCount}
      />

      {/* Tabs superiores: Detalle / Chat a pantalla completa */}
      <div className="flex items-center gap-2">
        <TabBtn
          active={topTab === "detalle"}
          onClick={() => setTopTab("detalle")}
        >
          Detalle
        </TabBtn>
        <TabBtn active={topTab === "chat"} onClick={() => setTopTab("chat")}>
          Chat
        </TabBtn>
        <TabBtn active={topTab === "ads"} onClick={() => setTopTab("ads")}>
          Métricas ADS
        </TabBtn>
        <TabBtn
          active={topTab === "sesiones"}
          onClick={() => setTopTab("sesiones")}
        >
          Sesiones
        </TabBtn>
        <TabBtn active={topTab === "bonos"} onClick={() => setTopTab("bonos")}>
          Bonos
        </TabBtn>
      </div>

      {topTab === "chat" ? (
        // Chat a altura casi completa de la ventana (ajuste fijo para header y paddings)
        <div className="mt-2 h-[calc(100vh-180px)]">
          <ChatPanel
            code={student.code || code}
            studentName={student.name}
            fullHeight
          />
        </div>
      ) : topTab === "ads" ? (
        <div className="mt-2">
          <AdsMetricsForm
            studentCode={student.code || code}
            studentName={student.name}
          />
        </div>
      ) : topTab === "sesiones" ? (
        <div className="mt-2">
          <SessionsStudentPanel
            studentCode={student.code || code}
            studentName={student.name}
            studentStage={
              (student.stage || student.raw?.etapa || faseActual) as string
            }
            assignedCoaches={(coaches || []).map((c) => ({
              id: (c as any).coachId ?? (c as any).id ?? null,
              code:
                (c as any).teamCode ??
                (c as any).codigo ??
                (c as any).id ??
                null,
              name: c.name,
              area: (c as any).area ?? undefined,
            }))}
          />
        </div>
      ) : topTab === "bonos" ? (
        <div className="mt-2">
          <BonosPanel studentCode={student.code || code} />
        </div>
      ) : (
        <>
          <MetricsStrip
            statusLabel={
              (student?.state ?? student?.raw?.estado ?? "").replace?.(
                "_",
                " "
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
            pausedRange={pauseInfo}
            onSaveLastTask={async (localValue) => {
              try {
                const iso = new Date(localValue).toISOString();
                await updateClientLastTask(student.code || code, iso);
                setLastTaskAt(iso);
                try {
                  const th = await getClienteTareas(student.code || code);
                  setTasksHistory(th);
                } catch {}
                toast({ title: "Última tarea actualizada" });
              } catch (e) {
                console.error(e);
                toast({ title: "No se pudo actualizar la última tarea" });
              }
            }}
            coachCount={(coaches || []).length}
            coachNames={
              (coaches || []).map((c) => c.name).filter(Boolean) as string[]
            }
            onJumpToCoaches={() => {
              if (typeof window === "undefined") return;
              const el = document.getElementById("coaches-card");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onEdit={(mode) => {
              setEditMode(mode ?? "all");
              setEditOpen(true);
            }}
          />

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
              {/* Mover tickets aquí para aprovechar el espacio disponible */}
              <div id="tickets">
                <TicketsPanel
                  student={student}
                  onChangedTickets={setTicketsCount}
                />
              </div>
            </div>
            {/* Columna lateral: equipo y contrato (sticky) */}
            <div className="space-y-4 lg:col-span-4 lg:sticky lg:top-24 self-start">
              <div id="coaches-card">
                <CoachesCard
                  coaches={coaches}
                  onAssign={(codes) => assignCoaches(codes)}
                  onRemove={(teamCode) => removeCoach(teamCode)}
                  onChangeMember={(idx, candidate) =>
                    changeCoach(idx, candidate)
                  }
                />
              </div>
              {/* Contrato card */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-medium">Contrato</h3>
                <ContratoCard
                  code={student.code || code}
                  contratoRaw={student.contrato ?? student.raw?.contrato}
                  onUpdated={async () => {
                    try {
                      const url = `/client/get/clients?page=1&search=${encodeURIComponent(
                        student.code || code
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
                              : r.equipo ?? r.alumnos ?? [],
                            contrato: r.contrato ?? null,
                            raw: r,
                          }))
                          .find(
                            (x) =>
                              (x.code ?? "").toLowerCase() ===
                              (student.code || code).toLowerCase()
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
      )}

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
              code
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
                        : r.equipo ?? r.alumnos ?? [],
                      contrato: r.contrato ?? null,
                      raw: r,
                    } as any)
                )
                .find(
                  (x) => (x.code ?? "").toLowerCase() === code.toLowerCase()
                ) ||
              rows[0] ||
              null;
            setStudent(s as any);
            // actualizar pausa en tiempo real tras guardar
            try {
              computePauseFromStorage();
            } catch {}
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

// Utilidades numéricas para formato en vista previa del formulario ADS
function toNum(v?: string | number | null) {
  if (v == null) return null;
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
  };

  const [data, setData] = useState<Metrics>({
    auto_roas: true,
    auto_eff: true,
    pauta_activa: false,
    requiere_interv: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const saveTimerRef = useRef<number | null>(null);
  const didInitRef = useRef<boolean>(false);

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
    total?: string | number | null
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
        const key = `ads-metrics:${studentCode}`;
        const raw =
          typeof window !== "undefined"
            ? window.localStorage.getItem(key)
            : null;
        if (mounted && raw) {
          try {
            const parsed = JSON.parse(raw);
            // Por compatibilidad, si hay payloads antiguos, guardar solo el objeto de formulario
            const maybeForm = parsed?.form ?? parsed;
            setData({ ...data, ...maybeForm });
          } catch {
            // si falla parseo, ignoramos y arrancamos vacío
          }
        }
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
    const v = toNum(data.visitas);
    const a = toNum(data.alcance);
    if (v != null && a && a > 0) return String(v / a);
    return undefined;
  }, [data.visitas, data.alcance]);
  const effPagoCalc = useMemo(() => {
    const p = toNum(data.pagos);
    const v = toNum(data.visitas);
    if (p != null && v && v > 0) return String(p / v);
    return undefined;
  }, [data.pagos, data.visitas]);
  const effCompraCalc = useMemo(() => {
    const comp = toNum(data.compra_carnada);
    const v = toNum(data.visitas);
    if (comp != null && v && v > 0) return String(comp / v);
    return undefined;
  }, [data.compra_carnada, data.visitas]);

  const view = {
    roas: data.auto_roas ? roasCalc ?? data.roas : data.roas,
    eff_ads: data.auto_eff ? effAdsCalc ?? data.eff_ads : data.eff_ads,
    eff_pago: data.auto_eff ? effPagoCalc ?? data.eff_pago : data.eff_pago,
    eff_compra: data.auto_eff
      ? effCompraCalc ?? data.eff_compra
      : data.eff_compra,
  } as const;

  function onChange<K extends keyof Metrics>(k: K, v: Metrics[K]) {
    persist({ ...data, [k]: v });
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

          {/* Solo rendimiento arriba */}
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

          {/* Compras moved below Embudo + Efectividades */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    <Label>Ads (visitas/alcance)</Label>
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
                    placeholder="0%"
                    disabled={data.auto_eff}
                    value={`${
                      data.auto_eff
                        ? toPercentNoSymbol(view.eff_ads)
                        : toPercentNoSymbol(data.eff_ads)
                    }%`}
                    onChange={(e) =>
                      onChange("eff_ads", sanitizePercentInput(e.target.value))
                    }
                  />
                  {!data.auto_eff && (
                    <div className="text-[11px] text-muted-foreground">
                      Ingresa porcentaje (0-100)
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
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
                  {!data.auto_eff && (
                    <div className="text-[11px] text-muted-foreground">
                      Ingresa porcentaje (0-100)
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Compra (%)</Label>
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
                        sanitizePercentInput(e.target.value)
                      )
                    }
                  />
                  {data.auto_eff ? (
                    <div className="text-[11px] text-muted-foreground">
                      Se calcula: compras (carnada) / visitas × 100
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Ingresa porcentaje (0-100)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compras: colocado debajo de Embudo y Efectividades */}
          <Card className="mt-2">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Compras</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                  onChange={(e) => onChange("compra_downsell", e.target.value)}
                />
                <div className="text-[11px] text-muted-foreground">
                  Efectividad:{" "}
                  {pctOf(data.compra_downsell, data.compra_carnada)}
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <Input
                    placeholder="Nombre"
                    value={data.coach_copy || ""}
                    onChange={(e) => onChange("coach_copy", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Coach de Plataformas</Label>
                  <Input
                    placeholder="Nombre"
                    value={data.coach_plat || ""}
                    onChange={(e) => onChange("coach_plat", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:row-span-1">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Notas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label>Observaciones</Label>
                  <Textarea
                    rows={3}
                    placeholder="Notas"
                    value={data.obs || ""}
                    onChange={(e) => onChange("obs", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Intervención sugerida</Label>
                  <Textarea
                    rows={3}
                    placeholder="Descripción"
                    value={data.interv_sugerida || ""}
                    onChange={(e) =>
                      onChange("interv_sugerida", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vista previa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Rendimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div>
                  ROAS: <b>{view.roas ?? "—"}</b>
                </div>
                <div>
                  Inversión: <b>{fmtMoney(data.inversion)}</b>
                </div>
                <div>
                  Facturación: <b>{fmtMoney(data.facturacion)}</b>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Embudo</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
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
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Efectividades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <div>
                    Ads: <b>{fmtPct(view.eff_ads)}</b>
                  </div>
                  <div>
                    Pago iniciado: <b>{fmtPct(view.eff_pago)}</b>
                  </div>
                  <div>
                    Compra: <b>{fmtPct(view.eff_compra)}</b>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Compras</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Estado y fase</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Coaches</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-1 text-sm">
                <div>
                  Copy: <b>{data.coach_copy || "—"}</b>
                </div>
                <div>
                  Plataformas: <b>{data.coach_plat || "—"}</b>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Observaciones</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {data.obs || "—"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Intervención sugerida</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {data.interv_sugerida || "—"}
              </CardContent>
            </Card>
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
          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
          : "bg-white text-muted-foreground border border-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function ContratoCard({
  code,
  contratoRaw,
  onUpdated,
}: {
  code: string;
  contratoRaw: any;
  onUpdated?: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
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
