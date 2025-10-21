"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  dataService,
  type StudentItem,
  type CoachMember,
} from "@/lib/data-service";
import Header from "./_parts/Header";
import MetricsStrip from "./_parts/MetricsStrip";
import PhasesTimeline from "./_parts/PhasesTimeline";
import PhaseHistory from "./_parts/PhaseHistory";
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
import EditOptionModal from "./_parts/EditOptionModal";
import { getStudentTickets } from "../api";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { uploadClientContract, downloadClientContractBlob } from "../api";

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

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Fetch the student directly from the API using the search code
        const url = `https://v001.vercel.app/v1/client/get/clients?page=1&search=${encodeURIComponent(
          code
        )}`;
        const resRaw = await fetch(url, { cache: "no-store" });
        const json = await resRaw.json().catch(() => ({}));
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

  // Polling sencillo para refrescar historial en tiempo real (cada 10s)
  async function fetchPhaseHistory(codeToFetch: string) {
    try {
      const histUrl = `https://v001.vercel.app/v1/client/get/cliente-etapas/${encodeURIComponent(
        codeToFetch
      )}`;
      const rh = await fetch(histUrl, { cache: "no-store" });
      const jh = await rh.json().catch(() => ({}));
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
  useEffect(() => {
    if (!student?.code) return;
    let mounted = true;
    const id = setInterval(async () => {
      try {
        await fetchPhaseHistory(student.code);
      } catch (e) {
        /* ignore */
      }
    }, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [student?.code]);

  async function loadCoaches(alumnoCode: string) {
    try {
      const qUrl = `https://v001.vercel.app/v1/client/get/clients-coaches?alumno=${encodeURIComponent(
        alumnoCode
      )}`;
      const r = await fetch(qUrl, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      const rows = Array.isArray(j?.data) ? j.data : [];
      const cs = rows.map((r: any) => ({
        name: r.coach_nombre ?? r.name ?? "",
        puesto: r.puesto ?? null,
        area: r.area ?? null,
        url: r.url ?? null,
        // El endpoint puede devolver id_coach o id; lo guardamos como coachId
        coachId: r.id_coach ?? r.id ?? r.id_relacion ?? null,
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
      await fetch("https://v001.vercel.app/v1/team/associate/team-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(
        "https://v001.vercel.app/v1/team/associate/team-client",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      let json: any = null;
      try {
        json = await res.json();
      } catch (e) {
        console.warn("removeCoach: no JSON in response", e);
      }
      console.log("removeCoach response", res.status, json);
      // refresh coaches
      await loadCoaches(student.code);
    } catch (e) {
      console.error("Error removing coach", e);
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

      <MetricsStrip
        statusLabel={
          (student?.state ?? student?.raw?.estado ?? "").replace?.("_", " ") ??
          student?.state ??
          student?.raw?.estado ??
          ""
        }
        permanencia={permanencia}
        lastTaskAt={lastTaskAt}
        faseActual={faseActual}
        ingreso={pIngreso}
        salida={salida}
        onEdit={(mode) => {
          setEditMode(mode ?? "all");
          setEditOpen(true);
        }}
      />

      {/* Contrato se moverá a la columna derecha junto a otras tarjetas para evitar espacios en blanco */}

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
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <PhasesTimelineAny steps={steps} />
        </div>
        <div className="space-y-4">
          <CoachesCard
            coaches={coaches}
            onAssign={(codes) => assignCoaches(codes)}
            onRemove={(teamCode) => removeCoach(teamCode)}
          />
          {/* Contrato card reubicado aquí para llenar la columna lateral */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-medium">Contrato</h3>
            <ContratoCard
              code={student.code || code}
              contratoRaw={student.contrato ?? student.raw?.contrato}
              onUpdated={async () => {
                try {
                  const url = `https://v001.vercel.app/v1/client/get/clients?page=1&search=${encodeURIComponent(
                    student.code || code
                  )}`;
                  const resRaw = await fetch(url, { cache: "no-store" });
                  const json = await resRaw.json().catch(() => ({}));
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
          <ActivityFeed lastTaskAt={lastTaskAt} steps={steps} />
          <PhaseHistory history={phaseHistory} />
        </div>
      </div>

      <TicketsPanel
        student={student}
        onChangedTickets={(n) => setTicketsCount(n)}
      />

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
            const url = `https://v001.vercel.app/v1/client/get/clients?page=1&search=${encodeURIComponent(
              code
            )}`;
            const resRaw = await fetch(url, { cache: "no-store" });
            const json = await resRaw.json().catch(() => ({}));
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
          }}
        />
      )}

      {/* Chat flotante para la vista de detalle del alumno */}
      <Link
        href={`/chat/${encodeURIComponent(student.code || code)}`}
        className="fixed right-6 bottom-6 z-[12000] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-95"
        aria-label="Abrir chat"
      >
        <MessageSquare className="h-5 w-5" />
        Chat
      </Link>

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
