"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { getAllStudents, updateClientLastTask } from "../../api";
import { getAuthToken } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import {
  Home,
  ArrowRight,
  Copy,
  ExternalLink,
  MessageSquare,
  CalendarClock,
  Gift,
  GraduationCap,
  BarChart3,
  CreditCard,
  ThumbsUp,
  ClipboardList,
} from "lucide-react";

type TaskField = {
  key: string;
  label: string;
  type?: "text" | "date" | "url" | "tel" | "email";
};

type AdsMetadataLike = {
  id?: string | number | null;
  entity?: string | null;
  entity_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  payload?: any;
};

function normalizeId(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function pickBestAdsMetadataForStudent(
  items: AdsMetadataLike[],
  alumnoCode: string,
) {
  const alumnoCodeNorm = normalizeId(alumnoCode).toLowerCase();
  const matches = (items || []).filter((m) => {
    const entity = String(m?.entity ?? "").trim();
    const payload = m?.payload ?? {};
    const payloadAlumnoCodigo = normalizeId(
      payload?.alumno_codigo,
    ).toLowerCase();
    const payloadTag = normalizeId(payload?._tag);

    const entityMatches =
      entity === "ads_metrics" || payloadTag === "admin_alumnos_ads_metrics";
    if (!entityMatches) return false;

    return Boolean(
      payloadAlumnoCodigo && payloadAlumnoCodigo === alumnoCodeNorm,
    );
  });

  const best =
    [...matches].sort((a, b) => {
      const aId = Number(a?.id);
      const bId = Number(b?.id);
      const aHasNum = Number.isFinite(aId);
      const bHasNum = Number.isFinite(bId);
      if (aHasNum && bHasNum) return bId - aId;
      if (aHasNum) return -1;
      if (bHasNum) return 1;
      const aT =
        Date.parse(String(a?.payload?._saved_at ?? a?.created_at ?? "")) || 0;
      const bT =
        Date.parse(String(b?.payload?._saved_at ?? b?.created_at ?? "")) || 0;
      return bT - aT;
    })[0] ?? null;

  return best;
}

function parseTareasFromPayload(payload: any): any[] {
  const raw = payload?.tareas;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizePhase(raw: string): number | null {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (!value) return null;
  const faseMatch = value.match(/fase\s*([1-5])/i);
  if (faseMatch?.[1]) return Number(faseMatch[1]);
  const numberMatch = value.match(/\b([1-5])\b/);
  if (numberMatch?.[1]) return Number(numberMatch[1]);
  return null;
}

function getFieldsByPhase(phase: number | null): TaskField[] {
  const base: TaskField[] = [
    { key: "fecha", label: "Fecha", type: "date" },
    { key: "nombre", label: "Nombre", type: "text" },
  ];

  if (phase === 1) {
    return [
      ...base,
      { key: "whatsapp", label: "Número de WhatsApp", type: "tel" },
      { key: "doc_link", label: "Link de doc", type: "url" },
    ];
  }

  if (phase === 2) {
    return [
      ...base,
      { key: "whatsapp", label: "Número de WhatsApp", type: "tel" },
      { key: "doc_link", label: "Link de doc", type: "url" },
      {
        key: "plataforma_paginas",
        label: "Plataforma que usas para hacer tus páginas",
        type: "text",
      },
    ];
  }

  if (phase === 3) {
    return [
      ...base,
      { key: "doc_link", label: "Link de doc", type: "url" },
      {
        key: "valor_producto_carnada",
        label: "Valor exacto de tu producto carnada",
        type: "text",
      },
    ];
  }

  if (phase === 4) {
    return [
      ...base,
      {
        key: "correo_compras",
        label: "Correo de compras del programa",
        type: "email",
      },
      { key: "doc_link", label: "Link de doc", type: "url" },
      {
        key: "valor_producto_carnada",
        label: "Valor del producto carnada",
        type: "text",
      },
    ];
  }

  if (phase === 5) {
    return [...base, { key: "doc_link", label: "Link de doc", type: "url" }];
  }

  return base;
}

function StaticCard({ title, href }: { title: string; href: string }) {
  return (
    <Card className="group h-full border border-border/80 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="text-xs">
          Recurso externo de la academia
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button asChild className="w-full justify-between" variant="outline">
          <a href={href} target="_blank" rel="noreferrer">
            Abrir recurso
            <ExternalLink className="w-4 h-4 ml-2 opacity-80 transition-opacity group-hover:opacity-100" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function InternalCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description?: string;
  href: string;
  icon: any;
}) {
  return (
    <Card className="group h-full border border-border/80 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center rounded-md w-8 h-8 bg-primary/10 text-primary">
            <Icon className="w-4 h-4" />
          </span>
          <span className="truncate">{title}</span>
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={href}>
            Entrar
            <ArrowRight className="w-4 h-4 ml-2 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StudentInicioPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const [uploadTaskOpen, setUploadTaskOpen] = useState(false);
  const [studentName, setStudentName] = useState<string>("Alumno");
  const [studentStage, setStudentStage] = useState<string>("—");
  const [loadingStudentMeta, setLoadingStudentMeta] = useState(false);
  const [adsMetadataId, setAdsMetadataId] = useState<string>("");
  const [loadingAdsMetadata, setLoadingAdsMetadata] = useState(false);
  const [taskValues, setTaskValues] = useState<Record<string, string>>({});
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [savingTaskPreview, setSavingTaskPreview] = useState(false);
  const [taskSavedSuccessOpen, setTaskSavedSuccessOpen] = useState(false);

  const isLikelyUrl = (value: string) =>
    /^https?:\/\//i.test(String(value || "").trim());

  const copyTaskValue = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado", description: "Link copiado al portapapeles." });
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Intenta copiar manualmente el enlace.",
        variant: "destructive",
      });
    }
  };

  const phaseNumber = normalizePhase(studentStage);
  const effectivePhase = selectedPhase ? Number(selectedPhase) : phaseNumber;
  const phaseFields = getFieldsByPhase(effectivePhase);

  const fetchLatestAdsMetadata = async (
    alumnoCode: string,
  ): Promise<AdsMetadataLike | null> => {
    if (!alumnoCode) return null;
    const token = getAuthToken();
    const res = await fetch(
      `/api/alumnos/${encodeURIComponent(alumnoCode)}/metadata?entity=${encodeURIComponent("ads_metrics")}`,
      {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    const items = Array.isArray(json?.items)
      ? (json.items as AdsMetadataLike[])
      : [];
    return pickBestAdsMetadataForStudent(items, alumnoCode);
  };

  const createDefaultAdsMetadataForStudent = async (
    alumnoCode: string,
  ): Promise<AdsMetadataLike | null> => {
    if (!alumnoCode) return null;

    const nowIso = new Date().toISOString();
    const createdById = (user as any)?.id ?? null;
    const createdByCode =
      (user as any)?.codigo ??
      (user as any)?.code ??
      (user as any)?.user_code ??
      null;
    const createdByName =
      (user as any)?.nombre ??
      (user as any)?.name ??
      (user as any)?.email ??
      null;

    const payload = {
      alumno_codigo: alumnoCode,
      alumno_nombre: studentName || "",
      auto_roas: true,
      auto_eff: true,
      pauta_activa: false,
      requiere_interv: false,
      roas: "",
      tareas: [],
      creado_por_id: createdById,
      creado_por_codigo: createdByCode,
      creado_por_nombre: createdByName,
      _tag: "admin_alumnos_ads_metrics",
      _view: "/admin/alumnos/[code]/ads",
      _saved_at: nowIso,
    };

    const token = getAuthToken();
    const createRes = await fetch(
      `/api/alumnos/${encodeURIComponent(alumnoCode)}/metadata/ensure-ads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          entity_id: alumnoCode,
          payload,
        }),
      },
    );

    if (!createRes.ok) {
      const txt = await createRes.text().catch(() => "");
      throw new Error(txt || `HTTP ${createRes.status}`);
    }

    const createdJson = (await createRes.json().catch(() => null)) as any;
    const created: AdsMetadataLike = {
      id: createdJson?.id ?? null,
      entity: "ads_metrics",
      entity_id: alumnoCode,
      payload,
      created_at: nowIso,
      updated_at: nowIso,
    };

    return created;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!code) return;
      try {
        setLoadingStudentMeta(true);
        const rows = await getAllStudents({
          page: 1,
          pageSize: 2000,
          search: code,
        });
        if (!active) return;
        const byCode = (rows || []).find(
          (r) =>
            String(r?.code || "").toLowerCase() === String(code).toLowerCase(),
        );
        const row = byCode ?? (rows || [])[0];
        if (row?.name) setStudentName(String(row.name));
        if (row?.stage) setStudentStage(String(row.stage));
      } catch {
        if (!active) return;
      } finally {
        if (active) setLoadingStudentMeta(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!code) {
        if (active) setAdsMetadataId("");
        return;
      }
      try {
        setLoadingAdsMetadata(true);
        const best = await fetchLatestAdsMetadata(code);
        if (!active) return;
        setAdsMetadataId(best?.id != null ? String(best.id) : "");
      } catch {
        if (!active) return;
        setAdsMetadataId("");
      } finally {
        if (active) setLoadingAdsMetadata(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    const detected = phaseNumber ? String(phaseNumber) : "";
    setSelectedPhase(detected);
  }, [phaseNumber]);

  useEffect(() => {
    if (!uploadTaskOpen) return;
    const today = new Date().toISOString().slice(0, 10);
    const initial: Record<string, string> = {
      fecha: today,
      nombre: studentName || "",
    };
    for (const field of phaseFields) {
      if (field.key in initial) continue;
      initial[field.key] = "";
    }
    setTaskValues(initial);
  }, [uploadTaskOpen, studentName, selectedPhase, phaseNumber]);

  const handleSaveTaskPreview = async () => {
    setSavingTaskPreview(true);
    try {
      const nowIso = new Date().toISOString();
      const phase = selectedPhase || (phaseNumber ? String(phaseNumber) : "");
      let latestMetadata = await fetchLatestAdsMetadata(code);

      if (!latestMetadata?.id) {
        latestMetadata = await createDefaultAdsMetadataForStudent(code);
        toast({
          title: "Metadata ADS creada",
          description:
            "Se creó una metadata base con ROAS automático para poder guardar la tarea.",
        });
      }

      const latestMetadataId =
        latestMetadata?.id != null ? String(latestMetadata.id) : "";
      if (latestMetadataId !== adsMetadataId) {
        setAdsMetadataId(latestMetadataId);
      }

      if (!latestMetadata?.id) {
        toast({
          title: "Sin metadata ADS",
          description: "No se encontró metadata ADS para este alumno.",
          variant: "destructive",
        });
        return;
      }

      const tareaPreview = {
        id: `tmp_tarea_${Date.now()}`,
        alumno_codigo: code,
        alumno_nombre: studentName || null,
        fase_formulario: phase || null,
        ads_metadata_id: latestMetadata.id,
        fecha: taskValues.fecha ? `${taskValues.fecha}T12:00:00` : nowIso,
        campos: { ...taskValues },
        created_at: nowIso,
      };

      const payloadActual = latestMetadata.payload ?? {};
      const tareasActuales = parseTareasFromPayload(payloadActual);
      const payloadActualizado = {
        ...payloadActual,
        tareas: [...tareasActuales, tareaPreview],
        _preview_generated_at: nowIso,
      };

      const metadataActualizadaPreview = {
        ...latestMetadata,
        payload: payloadActualizado,
        updated_at: nowIso,
      };

      const updateBodyPreview = {
        id: latestMetadata.id,
        entity: latestMetadata.entity ?? "ads_metrics",
        entity_id: latestMetadata.entity_id ?? code,
        payload: payloadActualizado,
      };

      const token = getAuthToken();
      const updateRes = await fetch(
        `/api/alumnos/${encodeURIComponent(code)}/metadata/update-ads`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updateBodyPreview),
        },
      );
      if (!updateRes.ok) {
        const txt = await updateRes.text().catch(() => "");
        throw new Error(txt || `HTTP ${updateRes.status}`);
      }

      const taskIsoDate = taskValues.fecha
        ? new Date(`${taskValues.fecha}T12:00:00`).toISOString()
        : nowIso;
      await updateClientLastTask(code, taskIsoDate);

      console.group("[SAVE][Subir mi tarea -> update ads metadata]");
      console.log("alumno_codigo:", code);
      console.log("ads_metadata_id:", latestMetadata.id);
      console.log("metadata_ads_actual:", latestMetadata);
      console.log("tarea_preview:", tareaPreview);
      console.log(
        "metadata_ads_actualizada_preview:",
        metadataActualizadaPreview,
      );
      console.log("update_body_enviado:", updateBodyPreview);
      console.log("ultima_tarea_actualizada_iso:", taskIsoDate);
      console.groupEnd();

      setTaskSavedSuccessOpen(true);
      setUploadTaskOpen(false);
      toast({
        title: "Tarea guardada",
        description: "Se actualizó la metadata ADS correctamente.",
      });
    } catch (error: any) {
      const detail =
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : "No se pudo guardar la tarea";
      toast({
        title: "Error",
        description: detail,
        variant: "destructive",
      });
      console.error("Error guardando tarea en metadata ADS:", error);
    } finally {
      setSavingTaskPreview(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 text-primary w-8 h-8">
                  <Home className="w-4 h-4" />
                </span>
                Inicio
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Accesos rápidos y herramientas del perfil del alumno
              </p>
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
              {isStudent ? "Vista alumno" : "Vista staff"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {/* Para alumnos: Mi perfil de primero */}
          {isStudent && (
            <InternalCard
              title="Mi perfil"
              description="Datos y progreso del alumno"
              href={`/admin/alumnos/${code}/perfil`}
              icon={GraduationCap}
            />
          )}

          <StaticCard
            title="Notion de la academia"
            href="https://www.notion.so/x-academy/HOTSELLING-LITE-af0d3555dc5b4b0c935e22129ebc878b?p=931dd222189342a9ae6a6ee1befd1ee1&pm=s"
          />

          <StaticCard
            title="Skool"
            href="https://www.skool.com/hotselling-lite-4832"
          />

          <InternalCard
            title="Chat soporte"
            description="Habla con Atención al Cliente"
            href={`/admin/alumnos/${code}/chat`}
            icon={MessageSquare}
          />

          <InternalCard
            title="Feedback"
            description={isStudent ? "Ver feedback" : "Ver tickets y estado"}
            href={`/admin/alumnos/${code}/feedback`}
            icon={ThumbsUp}
          />

          {/* Colocar Mis tareas al final */}
          <Card className="group h-full border border-border/80 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center rounded-md w-8 h-8 bg-primary/10 text-primary">
                  <ClipboardList className="w-4 h-4" />
                </span>
                <span className="truncate">Mis tareas</span>
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Ver tus tareas y si están resueltas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button
                asChild
                variant="outline"
                className="w-full justify-between"
              >
                <Link href={`/admin/alumnos/${code}/tareas`}>
                  Entrar
                  <ArrowRight className="w-4 h-4 ml-2 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={() => setUploadTaskOpen(true)}
              >
                Subir mi tarea
              </Button>
            </CardContent>
          </Card>

          {/* Ocultar Sesiones para alumnos */}
          {!isStudent && (
            <InternalCard
              title="Sesiones"
              description="Gestiona y solicita sesiones"
              href={`/admin/alumnos/${code}/sesiones`}
              icon={CalendarClock}
            />
          )}

          <InternalCard
            title="Bonos"
            description={
              isStudent ? "Ver mis bonos" : "Bonos asignados y extra"
            }
            href={`/admin/alumnos/${code}/bonos`}
            icon={Gift}
          />

          {/* Para no alumnos: Mi perfil en su posición original */}
          {!isStudent && (
            <InternalCard
              title="Mi perfil"
              description="Datos y progreso del alumno"
              href={`/admin/alumnos/${code}/perfil`}
              icon={GraduationCap}
            />
          )}

          {/* Ocultar Métricas ADS para alumnos */}
          {!isStudent && (
            <InternalCard
              title="Métricas ADS"
              description="Rendimiento de campañas"
              href={`/admin/alumnos/${code}/ads`}
              icon={BarChart3}
            />
          )}

          <InternalCard
            title="Seguimiento de pagos"
            description={
              isStudent
                ? "Ver estado y fechas de tus pagos"
                : "Historial y estado de pagos"
            }
            href={`/admin/alumnos/${code}/pagos`}
            icon={CreditCard}
          />
        </div>

        <Dialog open={uploadTaskOpen} onOpenChange={setUploadTaskOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir mi tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {loadingStudentMeta ? (
                <p className="text-muted-foreground">
                  Cargando datos del alumno…
                </p>
              ) : (
                <>
                  <p>
                    <span className="text-muted-foreground">Alumno:</span>{" "}
                    <strong>{studentName}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Fase actual:</span>{" "}
                    <strong>{studentStage || "—"}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      ID metadata ADS:
                    </span>{" "}
                    <strong>
                      {loadingAdsMetadata
                        ? "Cargando..."
                        : adsMetadataId || "Sin metadata ADS"}
                    </strong>
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Fase del formulario
                    </Label>
                    <Select
                      value={selectedPhase}
                      onValueChange={setSelectedPhase}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una fase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Fase 1</SelectItem>
                        <SelectItem value="2">Fase 2</SelectItem>
                        <SelectItem value="3">Fase 3</SelectItem>
                        <SelectItem value="4">Fase 4</SelectItem>
                        <SelectItem value="5">Fase 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 space-y-3">
                    {phaseFields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {field.label}
                        </Label>
                        <Input
                          type={field.type ?? "text"}
                          value={taskValues[field.key] ?? ""}
                          onChange={(e) =>
                            setTaskValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                        {field.key === "doc_link" && taskValues.doc_link ? (
                          <div className="flex items-center gap-2 pt-1">
                            {isLikelyUrl(taskValues.doc_link) ? (
                              <a
                                href={taskValues.doc_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                              >
                                Abrir link
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => copyTaskValue(taskValues.doc_link)}
                              aria-label="Copiar doc link"
                              title="Copiar doc link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadTaskOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={handleSaveTaskPreview}
                disabled={savingTaskPreview || loadingStudentMeta}
              >
                {savingTaskPreview ? "Guardando tarea..." : "Guardar tarea"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={taskSavedSuccessOpen}
          onOpenChange={setTaskSavedSuccessOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  ✓
                </span>
                Tarea guardada con éxito
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Tarea guardada y registrada exitosamente.</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setTaskSavedSuccessOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
