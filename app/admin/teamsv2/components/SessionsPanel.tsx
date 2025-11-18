"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  getAllStudents,
  getCoachStudentsByCoachId,
} from "@/app/admin/alumnos/api";
import {
  listSessions,
  offerSession,
  deleteSession,
  updateSession,
  getSessionByCode,
  approveSession,
  listAlumnoSessions,
  cancelSession,
  rescheduleSession,
  completeSession,
  type SessionItem,
} from "../api";
import {
  Pencil,
  Trash2,
  Info,
  Save,
  Check,
  XCircle,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionsPanel({
  coachCode,
  prefillAlumno,
  openOfferSignal,
}: {
  coachCode: string;
  prefillAlumno?: string | null;
  openOfferSignal?: number;
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [offerOpen, setOfferOpen] = useState(false);
  const [students, setStudents] = useState<
    { alumno: string; nombre: string }[]
  >([]);
  const [studentsStageMap, setStudentsStageMap] = useState<
    Record<string, string | undefined>
  >({});

  // Offer form state
  const [formAlumno, setFormAlumno] = useState<string>("");
  const [formEtapa, setFormEtapa] = useState<string>("");
  const [formFecha, setFormFecha] = useState<string>(""); // datetime-local value
  // Duración fija: 45 minutos (disabled en UI)
  const [formDuracion, setFormDuracion] = useState<number>(45);
  const [formNotas, setFormNotas] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [studentQuery, setStudentQuery] = useState<string>("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [alumnoHistory, setAlumnoHistory] = useState<SessionItem[]>([]);

  // Detail / edit / delete UI state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<SessionItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFecha, setEditFecha] = useState<string>("");
  const [editNotas, setEditNotas] = useState<string>("");
  const [editMode, setEditMode] = useState<"edit" | "reschedule">("edit");

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);
      const [list] = await Promise.all([listSessions({ coach: coachCode })]);
      setItems(list);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar sesiones");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [coachCode]);

  // Load coach's students and stages map
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [coachStudents, allStudents] = await Promise.all([
          getCoachStudentsByCoachId(coachCode),
          getAllStudents(),
        ]);
        if (!mounted) return;
        // Deduplicate and sort by name
        const dedup = Array.from(
          new Map(coachStudents.map((s) => [s.alumno, s])).values()
        ).sort((a, b) => a.nombre.localeCompare(b.nombre));
        setStudents(dedup);
        const stageMap: Record<string, string | undefined> = {};
        const nameMap: Record<string, string | undefined> = {};
        for (const s of allStudents) {
          const code = String(s.code ?? "").trim();
          if (!code) continue;
          stageMap[code] = s.stage ?? undefined;
          nameMap[code] = s.name ?? undefined;
        }
        setStudentsStageMap(stageMap);
        // Enriquecer items ya cargados con nombres faltantes
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            alumno_nombre:
              it.alumno_nombre ||
              nameMap[it.codigo_alumno || ""] ||
              it.alumno_nombre,
          }))
        );
      } catch (e) {
        // silent
      }
    })();
    return () => {
      mounted = false;
    };
  }, [coachCode]);

  // Prefill alumno and open modal when requested from parent
  useEffect(() => {
    if (!prefillAlumno) return;
    setFormAlumno(prefillAlumno);
    const st = studentsStageMap[prefillAlumno] ?? "";
    setFormEtapa(st || "");
    setFormFecha("");
    setFormDuracion(45);
    setFormNotas("");
    setOfferOpen(true);
  }, [prefillAlumno, openOfferSignal]);

  // Cargar historial al seleccionar alumno en el modal
  useEffect(() => {
    let active = true;
    (async () => {
      if (!offerOpen || !formAlumno) {
        setAlumnoHistory([]);
        return;
      }
      try {
        setHistoryLoading(true);
        const hist = await listAlumnoSessions(formAlumno, coachCode);
        if (!active) return;
        setAlumnoHistory(hist);
      } catch {
        if (!active) return;
        setAlumnoHistory([]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [offerOpen, formAlumno, coachCode]);

  const canOffer = useMemo(() => {
    return formAlumno && formFecha && formNotas.trim().length > 0;
  }, [formAlumno, formFecha, formNotas]);

  function toDatetimeLocalValue(date?: Date): string {
    const d = date ?? new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function translateEstado(estado?: string | null) {
    const v = String(estado || "").toLowerCase();
    const map: Record<string, { label: string; className: string }> = {
      offered: {
        label: "Ofrecida",
        className: "rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-xs",
      },
      approved: {
        label: "Aprobada",
        className:
          "rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs",
      },
      canceled: {
        label: "Cancelada",
        className: "rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-xs",
      },
      failed: {
        label: "Fallida",
        className: "rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-xs",
      },
      done: {
        label: "Realizada",
        className: "rounded-md bg-sky-100 text-sky-800 px-2 py-0.5 text-xs",
      },
      pending: {
        label: "Pendiente",
        className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
      },
      requested: {
        label: "Solicitada",
        className:
          "rounded-md bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs",
      },
      solicitada: {
        label: "Solicitada",
        className:
          "rounded-md bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs",
      },
    };
    return (
      map[v] || {
        label: estado || "—",
        className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
      }
    );
  }

  function isApprovable(estado?: string | null) {
    const v = String(estado || "").toLowerCase();
    return v === "requested" || v === "solicitada" || v === "pending";
  }

  function canReschedule(estado?: string | null) {
    const v = String(estado || "").toLowerCase();
    // Solo permitir reprogramar sesiones ofrecidas o en estado pendiente (no aprobadas)
    return v === "offered" || v === "pending" || v === "pendiente";
  }

  function canComplete(estado?: string | null) {
    const v = String(estado || "").toLowerCase();
    return v !== "canceled" && v !== "done";
  }

  function canCancel(estado?: string | null) {
    const v = String(estado || "").toLowerCase();
    // No permitir cancelar si ya fue cancelada, realizada o aprobada
    return (
      v !== "canceled" && v !== "done" && v !== "approved" && v !== "aprobada"
    );
  }

  function badgeForStage(value?: string | null) {
    const raw = String(value || "");
    const v = raw
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase()
      .trim();
    if (!v)
      return {
        className: "rounded-md bg-gray-100 text-gray-500 px-2 py-0.5 text-xs",
        label: "—",
      } as const;
    if (v.includes("ONBOARD"))
      return {
        className:
          "rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs",
        label: raw,
      } as const;
    if (v.startsWith("F1"))
      return {
        className:
          "rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs",
        label: raw,
      } as const;
    if (v.startsWith("F2"))
      return {
        className: "rounded-md bg-lime-100 text-lime-800 px-2 py-0.5 text-xs",
        label: raw,
      } as const;
    if (v.startsWith("F3"))
      return {
        className: "rounded-md bg-cyan-100 text-cyan-800 px-2 py-0.5 text-xs",
        label: raw,
      } as const;
    if (v.startsWith("F4"))
      return {
        className: "rounded-md bg-sky-100 text-sky-800 px-2 py-0.5 text-xs",
        label: raw,
      } as const;
    if (v.startsWith("F5"))
      return {
        className:
          "rounded-md bg-purple-100 text-purple-800 px-2 py-0.5 text-xs",
        label: raw,
      } as const;
    return {
      className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Sesiones</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOfferOpen(true)}
          >
            Ofrecer sesión
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            Refrescar
          </Button>
        </div>
      </div>

      <Card className="border-neutral-200/70">
        <CardContent className="pt-4">
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[110px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell colSpan={7}>
                        <div className="h-6 animate-pulse rounded bg-neutral-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-red-600">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-neutral-500">
                      Sin sesiones.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((s) => (
                    <TableRow key={String(s.id)}>
                      <TableCell>
                        {formatDateTime(s.fecha_programada)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {s.alumno_nombre ||
                            students.find((st) => st.alumno === s.codigo_alumno)
                              ?.nombre ||
                            s.codigo_alumno}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={badgeForStage(s.etapa).className}>
                          {badgeForStage(s.etapa).label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={translateEstado(s.estado).className}>
                          {translateEstado(s.estado).label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {s.duracion ?? 45 ? `${s.duracion ?? 45} min` : "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[320px] truncate"
                        title={s.notas ?? undefined}
                      >
                        {s.notas ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isApprovable(s.estado) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Aprobar"
                              onClick={async () => {
                                try {
                                  // eslint-disable-next-line no-console
                                  console.log("[sessions] approve", s.id);
                                  await approveSession(s.id);
                                  toast({ title: "Sesión aprobada" });
                                  fetchAll();
                                } catch (e: any) {
                                  toast({
                                    title: e?.message ?? "Error al aprobar",
                                  });
                                }
                              }}
                            >
                              <Check className="w-4 h-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Detalles"
                            onClick={async () => {
                              setSelected(s);
                              setDetailOpen(true);
                              try {
                                if (s.codigo) {
                                  const d = await getSessionByCode(s.codigo);
                                  if (d) setSelected({ ...s, id: d.id });
                                }
                              } catch {}
                            }}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                          {canReschedule(s.estado) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Reprogramar"
                              onClick={() => {
                                setSelected(s);
                                const d = s.fecha_programada
                                  ? new Date(s.fecha_programada)
                                  : new Date();
                                setEditFecha(toDatetimeLocalValue(d));
                                setEditNotas(s.notas || "");
                                setEditMode("reschedule");
                                setEditOpen(true);
                              }}
                            >
                              <CalendarClock className="w-4 h-4" />
                            </Button>
                          )}
                          {canComplete(s.estado) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Completar"
                              onClick={async () => {
                                try {
                                  // eslint-disable-next-line no-console
                                  console.log("[sessions] complete", s.id);
                                  await completeSession(s.id);
                                  toast({ title: "Sesión completada" });
                                  fetchAll();
                                } catch (e: any) {
                                  toast({
                                    title: e?.message ?? "Error al completar",
                                  });
                                }
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 text-sky-600" />
                            </Button>
                          )}
                          {canCancel(s.estado) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Cancelar"
                              onClick={async () => {
                                try {
                                  // eslint-disable-next-line no-console
                                  console.log("[sessions] cancel", s.id);
                                  await cancelSession(s.id);
                                  toast({ title: "Sesión cancelada" });
                                  fetchAll();
                                } catch (e: any) {
                                  toast({
                                    title: e?.message ?? "Error al cancelar",
                                  });
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 text-rose-600" />
                            </Button>
                          )}
                          {!(
                            String(s.estado || "").toLowerCase() ===
                              "approved" ||
                            String(s.estado || "").toLowerCase() === "aprobada"
                          ) && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Editar"
                                onClick={() => {
                                  setSelected(s);
                                  const d = s.fecha_programada
                                    ? new Date(s.fecha_programada)
                                    : new Date();
                                  setEditFecha(toDatetimeLocalValue(d));
                                  setEditNotas(s.notas || "");
                                  setEditMode("edit");
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Eliminar"
                                onClick={() => {
                                  setSelected(s);
                                  setEditOpen(false);
                                  setConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ofrecer sesión</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Alumno</Label>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Buscar alumno…"
                  className="h-8"
                />
              </div>
              <select
                className="w-full h-9 rounded-md border px-3 text-sm"
                value={formAlumno}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormAlumno(val);
                  const st = studentsStageMap[val] ?? "";
                  setFormEtapa(st || "");
                }}
              >
                <option value="">-- Selecciona un alumno --</option>
                {students
                  .filter((s) => {
                    const q = (studentQuery || "").toLowerCase();
                    if (!q) return true;
                    return (
                      (s.nombre || "").toLowerCase().includes(q) ||
                      (s.alumno || "").toLowerCase().includes(q)
                    );
                  })
                  .map((s) => (
                    <option key={s.alumno} value={s.alumno}>
                      {s.nombre} ({s.alumno})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Etapa</Label>
              <Input
                value={formEtapa}
                onChange={(e) => setFormEtapa(e.target.value)}
                placeholder="Etapa actual del alumno"
                disabled
              />
            </div>

            <div>
              <Label className="text-xs">Fecha programada</Label>
              <Input
                type="datetime-local"
                value={formFecha || toDatetimeLocalValue()}
                onChange={(e) => setFormFecha(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Duración (minutos)</Label>
              <Input
                type="number"
                min={45}
                max={45}
                value={String(formDuracion)}
                disabled
              />
            </div>

            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={formNotas}
                onChange={(e) => setFormNotas(e.target.value)}
                placeholder="Detalles importantes para la sesión"
              />
            </div>

            {/* Historial del alumno seleccionado */}
            {formAlumno && (
              <div className="mt-1 rounded-md border bg-neutral-50">
                <div className="px-3 py-2 text-xs font-medium text-neutral-700 flex items-center justify-between">
                  <span>Historial del alumno</span>
                  {historyLoading && (
                    <span className="text-[10px] text-neutral-500">
                      Cargando…
                    </span>
                  )}
                </div>
                <div className="px-3 pb-2">
                  {alumnoHistory.length === 0 ? (
                    <div className="text-xs text-neutral-500">
                      Sin historial disponible.
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 grid grid-cols-2 gap-2 text-[11px] text-neutral-700">
                        {(() => {
                          const counts = alumnoHistory.reduce((acc, it) => {
                            const k = String(it.estado || "").toLowerCase();
                            acc[k] = (acc[k] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          const get = (k: string) => counts[k] || 0;
                          return (
                            <>
                              <div>
                                Solicitadas:{" "}
                                <strong>
                                  {get("requested") + get("solicitada")}
                                </strong>
                              </div>
                              <div>
                                Aprobadas: <strong>{get("approved")}</strong>
                              </div>
                              <div>
                                Fallidas: <strong>{get("failed")}</strong>
                              </div>
                              <div>
                                Pendientes: <strong>{get("pending")}</strong>
                              </div>
                              <div>
                                Canceladas: <strong>{get("canceled")}</strong>
                              </div>
                              <div>
                                Realizadas: <strong>{get("done")}</strong>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="max-h-32 overflow-y-auto rounded border bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[11px]">
                                Fecha
                              </TableHead>
                              <TableHead className="text-[11px]">
                                Estado
                              </TableHead>
                              <TableHead className="text-[11px]">
                                Etapa
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alumnoHistory.slice(0, 5).map((h) => (
                              <TableRow key={String(h.id)}>
                                <TableCell className="text-[11px]">
                                  {formatDateTime(h.fecha_programada)}
                                </TableCell>
                                <TableCell className="text-[11px]">
                                  <span
                                    className={
                                      translateEstado(h.estado).className
                                    }
                                  >
                                    {translateEstado(h.estado).label}
                                  </span>
                                </TableCell>
                                <TableCell className="text-[11px]">
                                  {h.etapa || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setOfferOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!canOffer || saving}
                onClick={async () => {
                  if (!formAlumno) {
                    toast({ title: "Selecciona un alumno" });
                    return;
                  }
                  if (!formFecha) {
                    toast({ title: "Indica la fecha programada" });
                    return;
                  }
                  if (!formNotas.trim()) {
                    toast({ title: "Escribe notas para la sesión" });
                    return;
                  }
                  try {
                    setSaving(true);
                    // Convert datetime-local to ISO (assume local time)
                    const d = new Date(formFecha || toDatetimeLocalValue());
                    const iso = new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                      d.getHours(),
                      d.getMinutes(),
                      0,
                      0
                    ).toISOString();
                    const payload = {
                      codigo_alumno: formAlumno,
                      codigo_coach: coachCode,
                      etapa: formEtapa || undefined,
                      fecha_programada: iso,
                      duracion: formDuracion || 45,
                      notas: formNotas.trim(),
                    };
                    // Print body before executing
                    // eslint-disable-next-line no-console
                    console.log("[sessions] offer payload", payload);
                    await offerSession(payload);
                    toast({ title: "Sesión ofrecida" });
                    setOfferOpen(false);
                    setFormAlumno("");
                    setFormEtapa("");
                    setFormFecha("");
                    setFormDuracion(45);
                    setFormNotas("");
                    fetchAll();
                  } catch (err: any) {
                    toast({ title: err?.message ?? "Error al crear sesión" });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Crear
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle de sesión: muestra ID */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de sesión</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-2 py-1 text-sm">
              <div>
                <span className="text-neutral-500">ID:</span>{" "}
                <span className="font-mono">{String(selected.id)}</span>
              </div>
              <div>
                <span className="text-neutral-500">Alumno:</span>{" "}
                {selected.alumno_nombre || selected.codigo_alumno}
              </div>
              <div>
                <span className="text-neutral-500">Etapa:</span>{" "}
                {selected.etapa || "—"}
              </div>
              <div>
                <span className="text-neutral-500">Fecha:</span>{" "}
                {formatDateTime(selected.fecha_programada)}
              </div>
              <div>
                <span className="text-neutral-500">Duración:</span>{" "}
                {selected.duracion ?? 45} min
              </div>
              <div>
                <span className="text-neutral-500">Estado:</span>{" "}
                {translateEstado(selected.estado).label}
              </div>
              <div>
                <span className="text-neutral-500">Notas:</span>{" "}
                {selected.notas || "—"}
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">
              Selecciona una sesión…
            </div>
          )}
          <DialogFooter>
            <div className="flex items-center gap-2">
              {selected &&
                !(
                  String(selected.estado || "").toLowerCase() === "approved" ||
                  String(selected.estado || "").toLowerCase() === "aprobada"
                ) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const d = selected.fecha_programada
                        ? new Date(selected.fecha_programada)
                        : new Date();
                      setEditFecha(toDatetimeLocalValue(d));
                      setEditNotas(selected.notas || "");
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Editar
                  </Button>
                )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación eliminar */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(v) => {
          if (v) setEditOpen(false);
          setConfirmOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-neutral-700">
            {(() => {
              const nombre =
                selected?.alumno_nombre ||
                students.find((st) => st.alumno === selected?.codigo_alumno)
                  ?.nombre ||
                selected?.codigo_alumno ||
                "alumno";
              return (
                <span>
                  ¿Deseas eliminar la sesión del alumno{" "}
                  <strong>{nombre}</strong>?
                </span>
              );
            })()}
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="bg-rose-100 text-rose-800 hover:bg-rose-200"
                onClick={async () => {
                  if (!selected) return;
                  try {
                    await deleteSession(selected.id);
                    toast({ title: "Sesión eliminada" });
                    setConfirmOpen(false);
                    setDetailOpen(false);
                    fetchAll();
                  } catch (e: any) {
                    toast({ title: e?.message ?? "Error al eliminar" });
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar sesión */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sesión</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {selected && (
              <div className="text-sm text-neutral-600">
                Alumno:{" "}
                <strong>
                  {selected.alumno_nombre ||
                    students.find((st) => st.alumno === selected.codigo_alumno)
                      ?.nombre ||
                    selected.codigo_alumno}
                </strong>
              </div>
            )}
            <div>
              <Label className="text-xs">Fecha programada</Label>
              <Input
                type="datetime-local"
                value={editFecha}
                onChange={(e) => setEditFecha(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Etapa</Label>
              <Input value={selected?.etapa || ""} disabled />
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={editNotas}
                onChange={(e) => setEditNotas(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  if (!selected) return;
                  try {
                    // Convert editFecha to ISO
                    const d = editFecha ? new Date(editFecha) : new Date();
                    const iso = new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                      d.getHours(),
                      d.getMinutes(),
                      0,
                      0
                    ).toISOString();
                    const payload = {
                      fecha_programada: iso,
                      notas: editNotas.trim() || undefined,
                    } as const;
                    // eslint-disable-next-line no-console
                    console.log("[sessions] save", {
                      mode: editMode,
                      id: selected.id,
                      ...payload,
                    });
                    if (editMode === "reschedule") {
                      await rescheduleSession(selected.id, payload);
                      toast({ title: "Sesión reprogramada" });
                    } else {
                      await updateSession(selected.id, payload);
                      toast({ title: "Sesión actualizada" });
                    }
                    setEditOpen(false);
                    setDetailOpen(false);
                    fetchAll();
                  } catch (e: any) {
                    toast({ title: e?.message ?? "Error al actualizar" });
                  }
                }}
              >
                <Save className="w-4 h-4 mr-2" /> Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
