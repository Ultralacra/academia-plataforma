"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dataService,
  type StudentItem,
  type CoachMember,
} from "@/lib/data-service";
import Header from "./_parts/Header";
import MetricsStrip from "./_parts/MetricsStrip";
import PhasesTimeline from "./_parts/PhasesTimeline";
import EditForm from "./_parts/EditForm";
import CoachesCard from "./_parts/CoachesCard";
import ActivityFeed from "./_parts/ActivityFeed";
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
import { getStudentTickets } from "../api";
import Link from "next/link";

export default function StudentDetailContent({ code }: { code: string }) {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentItem | null>(null);
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

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await dataService.getStudents({ search: code });
        const list = res.items ?? [];
        const s =
          list.find(
            (x) => (x.code ?? "").toLowerCase() === code.toLowerCase()
          ) ||
          list[0] ||
          null;
        if (!alive) return;
        setStudent(s);

        if (s?.code) {
          try {
            const cs = await dataService.getClientCoaches(s.code);
            setCoaches(cs.coaches ?? []);
          } catch {
            setCoaches([]);
          }
          try {
            const tickets = await getStudentTickets(s.code);
            setTicketsCount(tickets.length);
          } catch {
            setTicketsCount(undefined);
          }
        }

        if (s) {
          const phases = buildPhasesFor(s);
          const lc = buildLifecycleFor(s, phases);
          setStage(
            ((s.stage || "ONBOARDING").toUpperCase() as Stage) ?? "ONBOARDING"
          );
          setPIngreso(phases.ingreso ?? "");
          setSalida(lc.salida ?? "");
          setLastActivity(s.lastActivity ?? "");
          setLastTaskAt(lc.lastTaskAt ?? "");
          setPF1(phases.f1 ?? "");
          setPF2(phases.f2 ?? "");
          setPF3(phases.f3 ?? "");
          setPF4(phases.f4 ?? "");
          setPF5(phases.f5 ?? "");
          setStatusSint(lc.status);
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

  const today = useMemo(() => new Date(isoDay(new Date())), []);
  const permanencia = useMemo(() => {
    const start = parseMaybe(pIngreso) ?? today;
    const end = salida ? parseMaybe(salida)! : today;
    return Math.max(0, diffDays(start, end));
  }, [pIngreso, salida, today]);

  const faseActual = useMemo(() => {
    if (pF5) return "F5";
    if (pF4) return "F4";
    if (pF3) return "F3";
    if (pF2) return "F2";
    if (pF1) return "F1";
    return "ONBOARDING";
  }, [pF1, pF2, pF3, pF4, pF5]);

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
        status={statusSint}
        ticketsCount={ticketsCount}
      />

      <MetricsStrip
        statusLabel={statusSint.replace("_", " ")}
        permanencia={permanencia}
        lastTaskAt={lastTaskAt}
        faseActual={faseActual}
        ingreso={pIngreso}
        salida={salida}
      />

      <EditForm
        stage={stage}
        setStage={setStage}
        statusSint={statusSint}
        setStatusSint={setStatusSint}
        pIngreso={pIngreso}
        setPIngreso={setPIngreso}
        salida={salida}
        setSalida={setSalida}
        lastActivity={lastActivity}
        setLastActivity={setLastActivity}
        lastTaskAt={lastTaskAt}
        setLastTaskAt={setLastTaskAt}
        pF1={pF1}
        setPF1={setPF1}
        pF2={pF2}
        setPF2={setPF2}
        pF3={pF3}
        setPF3={setPF3}
        pF4={pF4}
        setPF4={setPF4}
        pF5={pF5}
        setPF5={setPF5}
        onReset={() => {
          if (!student) return;
          const phases = buildPhasesFor(student);
          const lc = buildLifecycleFor(student, phases);
          setStage(
            ((student.stage || "ONBOARDING").toUpperCase() as Stage) ??
              "ONBOARDING"
          );
          setPIngreso(phases.ingreso ?? "");
          setSalida(lc.salida ?? "");
          setLastActivity(student.lastActivity ?? "");
          setLastTaskAt(lc.lastTaskAt ?? "");
          setPF1(phases.f1 ?? "");
          setPF2(phases.f2 ?? "");
          setPF3(phases.f3 ?? "");
          setPF4(phases.f4 ?? "");
          setPF5(phases.f5 ?? "");
          setStatusSint(lc.status);
        }}
        onSave={() => alert("Guardado localmente (demo).")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PhasesTimelineAny steps={steps} />
        </div>
        <div className="space-y-4">
          <CoachesCard coaches={coaches} />
          <ActivityFeed lastTaskAt={lastTaskAt} steps={steps} />
        </div>
      </div>

      <TicketsPanel
        student={student}
        onChangedTickets={(n) => setTicketsCount(n)}
      />

      <div className="flex justify-end">
        <Link
          href={`/chat/${encodeURIComponent(student.code || code)}`}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
        >
          Abrir chat
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        * Vista de demostración: los cambios no se envían al servidor
      </p>
    </div>
  );
}
