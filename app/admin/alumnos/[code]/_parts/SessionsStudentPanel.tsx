"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  listAlumnoSessions,
  requestSession,
  acceptSession,
  cancelSession,
  type SessionItem,
} from "@/app/admin/teamsv2/api";
import { Check, XCircle, Plus, Info, CalendarClock } from "lucide-react";

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

function translateEstado(estado?: string | null) {
  const v = String(estado || "").toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    requested: {
      label: "Solicitada",
      className: "rounded-md bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs",
    },
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
    done: {
      label: "Realizada",
      className: "rounded-md bg-sky-100 text-sky-800 px-2 py-0.5 text-xs",
    },
    pending: {
      label: "Pendiente",
      className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
    },
    failed: {
      label: "Fallida",
      className: "rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-xs",
    },
    solicitada: {
      label: "Solicitada",
      className: "rounded-md bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs",
    },
  };
  return (
    map[v] || {
      label: estado || "—",
      className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
    }
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
      className: "rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs",
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
      className: "rounded-md bg-purple-100 text-purple-800 px-2 py-0.5 text-xs",
      label: raw,
    } as const;
  return {
    className: "rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs",
    label: raw,
  } as const;
}

export default function SessionsStudentPanel({
  studentCode,
  studentName,
  studentStage,
  assignedCoaches,
}: {
  studentCode: string;
  studentName?: string;
  studentStage?: string | null;
  assignedCoaches: Array<{
    id: string | number | null;
    code?: string | null;
    name: string;
    area?: string | null | undefined;
  }>;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [coachSel, setCoachSel] = useState<string | "">("");
  const [fecha, setFecha] = useState<string>("");
  const [duracion, setDuracion] = useState<number>(60);
  const [notas, setNotas] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<SessionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<SessionItem | null>(null);
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);
      const list = await listAlumnoSessions(studentCode);
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
  }, [studentCode]);

  useEffect(() => {
    let active = true;
    if (!requestOpen) return;
    (async () => {
      try {
        setHistoryLoading(true);
        const hist = await listAlumnoSessions(studentCode);
        if (!active) return;
        setHistory(hist);
      } catch {
        if (!active) return;
        setHistory([]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [requestOpen, studentCode]);

  const canRequest = useMemo(() => {
    return coachSel && (fecha || "").length > 0 && notas.trim().length > 0;
  }, [coachSel, fecha, notas]);

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

  function isAcceptable(estado?: string | null) {
    const v = String(estado || "").toLowerCase();
    return v === "offered" || v === "ofrecida";
  }

  function canCancel(estado?: string | null) {
    const v = String(estado || "").toLowerCase();
    // No permitir cancelar si ya fue cancelada, realizada o aprobada
    return (
      v !== "canceled" && v !== "done" && v !== "approved" && v !== "aprobada"
    );
  }

  const coachMap = useMemo(() => {
    const m = new Map<string, { name: string; area?: string | null }>();
    for (const c of assignedCoaches || []) {
      if (c.id != null)
        m.set(String(c.id), { name: c.name, area: c.area ?? null });
      if (c.code) m.set(String(c.code), { name: c.name, area: c.area ?? null });
    }
    return m;
  }, [assignedCoaches]);

  function coachLabelFor(s: SessionItem): string {
    const byId = coachMap.get(String(s.codigo_coach || ""));
    if (byId) return byId.area ? `${byId.name} · ${byId.area}` : byId.name;
    if (s.coach_nombre) return s.coach_nombre;
    return String(s.codigo_coach || "—");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Sesiones — {studentName || studentCode}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setRequestOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Solicitar sesión
          </Button>
          <Button size="sm" variant="outline" onClick={fetchAll}>
            Refrescar
          </Button>
        </div>
      </div>

      {/* Resumen arriba de la tabla (vista del alumno) */}
      <div className="rounded-md border bg-white p-3">
        {loading ? (
          <div className="text-xs text-neutral-500">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-neutral-500">Sin historial</div>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs">
            {(() => {
              const counts = items.reduce<Record<string, number>>((acc, s) => {
                const k = String(s.estado || "").toLowerCase();
                acc[k] = (acc[k] || 0) + 1;
                return acc;
              }, {});
              const order = [
                "requested",
                "offered",
                "approved",
                "failed",
                "pending",
                "canceled",
                "done",
              ];
              const label = (k: string) =>
                k === "requested"
                  ? "Solicitadas"
                  : k === "offered"
                  ? "Ofrecidas"
                  : k === "approved"
                  ? "Aprobadas"
                  : k === "pending"
                  ? "Pendientes"
                  : k === "canceled"
                  ? "Canceladas"
                  : k === "done"
                  ? "Realizadas"
                  : k === "failed"
                  ? "Fallidas"
                  : k;
              const pillClass = (k: string) =>
                k === "requested"
                  ? "bg-amber-100 text-amber-800"
                  : k === "offered"
                  ? "bg-sky-100 text-sky-800"
                  : k === "approved"
                  ? "bg-emerald-100 text-emerald-800"
                  : k === "failed"
                  ? "bg-rose-100 text-rose-800"
                  : k === "pending"
                  ? "bg-neutral-100 text-neutral-700"
                  : k === "canceled"
                  ? "bg-rose-100 text-rose-800"
                  : k === "done"
                  ? "bg-teal-100 text-teal-800"
                  : "bg-neutral-100 text-neutral-700";
              const keys = Array.from(
                new Set([...order, ...Object.keys(counts)])
              ).filter((k) => counts[k] != null);
              return keys.map((k) => (
                <span
                  key={k}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${pillClass(
                    k
                  )}`}
                >
                  {label(k)}
                  <span className="font-semibold">{counts[k]}</span>
                </span>
              ));
            })()}
          </div>
        )}
      </div>

      <Card className="border-neutral-200/70">
        <CardContent className="pt-4">
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
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
                      <TableCell>{coachLabelFor(s)}</TableCell>
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
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Detalles"
                            onClick={() => {
                              setSelected(s);
                              setDetailOpen(true);
                            }}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                          {isAcceptable(s.estado) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              title="Aprobar (aceptar) sesión"
                              onClick={() => {
                                setSelected(s);
                                setConfirmAcceptOpen(true);
                              }}
                            >
                              Aprobar
                            </Button>
                          )}
                          {canCancel(s.estado) && (
                            <Button
                              size="sm"
                              variant="outline"
                              title="Cancelar sesión"
                              className="border-rose-200 text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                setSelected(s);
                                setConfirmCancelOpen(true);
                              }}
                            >
                              Cancelar
                            </Button>
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

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar sesión</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Coach</Label>
              <select
                className="w-full h-9 rounded-md border px-3 text-sm"
                value={coachSel}
                onChange={(e) => setCoachSel(e.target.value)}
              >
                <option value="">-- Selecciona un coach --</option>
                {assignedCoaches.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Etapa</Label>
              <Input value={studentStage || ""} disabled />
            </div>

            <div>
              <Label className="text-xs">Fecha propuesta</Label>
              <Input
                type="datetime-local"
                value={fecha || toDatetimeLocalValue()}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Duración (minutos)</Label>
              <Input
                type="number"
                min={15}
                max={180}
                value={String(duracion)}
                onChange={(e) => setDuracion(Number(e.target.value) || 60)}
              />
            </div>

            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="¿Qué quieres tratar en la sesión?"
              />
            </div>

            {/* Historial */}
            <div className="mt-1 rounded-md border bg-neutral-50">
              <div className="px-3 py-2 text-xs font-medium text-neutral-700 flex items-center justify-between">
                <span>Historial de sesiones del alumno</span>
                {historyLoading && (
                  <span className="text-[10px] text-neutral-500">
                    Cargando…
                  </span>
                )}
              </div>
              <div className="px-3 pb-2">
                {history.length === 0 ? (
                  <div className="text-xs text-neutral-500">
                    Sin historial disponible.
                  </div>
                ) : (
                  <div className="max-h-32 overflow-y-auto rounded border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px]">Fecha</TableHead>
                          <TableHead className="text-[11px]">Estado</TableHead>
                          <TableHead className="text-[11px]">Coach</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.slice(0, 5).map((h) => (
                          <TableRow key={String(h.id)}>
                            <TableCell className="text-[11px]">
                              {formatDateTime(h.fecha_programada)}
                            </TableCell>
                            <TableCell className="text-[11px]">
                              <span
                                className={translateEstado(h.estado).className}
                              >
                                {translateEstado(h.estado).label}
                              </span>
                            </TableCell>
                            <TableCell className="text-[11px]">
                              {h.coach_nombre || h.codigo_coach || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setRequestOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!canRequest || saving}
                onClick={async () => {
                  if (!coachSel) {
                    toast({ title: "Selecciona un coach" });
                    return;
                  }
                  if (!fecha) {
                    toast({ title: "Indica la fecha propuesta" });
                    return;
                  }
                  if (!notas.trim()) {
                    toast({ title: "Escribe notas para la sesión" });
                    return;
                  }
                  try {
                    setSaving(true);
                    const d = new Date(fecha || toDatetimeLocalValue());
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
                      codigo_alumno: studentCode,
                      codigo_coach: coachSel,
                      etapa: studentStage || undefined,
                      fecha_programada: iso,
                      duracion: duracion || 60,
                      notas: notas.trim(),
                    } as const;
                    // eslint-disable-next-line no-console
                    console.log("[sessions] request payload", payload);
                    // Consultar historial actual usando el endpoint de sesiones
                    // para detectar posibles conflictos (sesión aprobada same slot)
                    try {
                      const existing = await listAlumnoSessions(
                        studentCode,
                        String(coachSel)
                      );
                      const conflict = (existing || []).some((it) => {
                        const st = String(it.estado || "").toLowerCase();
                        if (st === "approved" || st === "aprobada") {
                          // comparar fecha exacta en ISO (misma minute)
                          const f = it.fecha_programada
                            ? new Date(it.fecha_programada).toISOString()
                            : null;
                          return f && f === iso;
                        }
                        return false;
                      });
                      if (conflict) {
                        toast({
                          title:
                            "Ya existe una sesión aprobada en ese horario. Revisa el historial antes de solicitar.",
                        });
                        setSaving(false);
                        return;
                      }
                    } catch (e) {
                      // si falla la comprobación, continuar con la solicitud (no bloquear por fallo de red)
                    }

                    await requestSession(payload);
                    toast({ title: "Solicitud enviada" });
                    setRequestOpen(false);
                    setCoachSel("");
                    setFecha("");
                    setDuracion(60);
                    setNotas("");
                    fetchAll();
                  } catch (err: any) {
                    toast({
                      title: err?.message ?? "Error al solicitar sesión",
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Enviar solicitud
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle de sesión */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de sesión</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-2 py-1 text-sm">
              <div>
                <span className="text-neutral-500">Alumno:</span>{" "}
                {studentName || studentCode}
              </div>
              <div>
                <span className="text-neutral-500">Coach:</span>{" "}
                {coachLabelFor(selected)}
              </div>
              <div>
                <span className="text-neutral-500">Etapa:</span>{" "}
                {selected.etapa || studentStage || "—"}
              </div>
              <div>
                <span className="text-neutral-500">Fecha:</span>{" "}
                {formatDateTime(selected.fecha_programada)}
              </div>
              <div>
                <span className="text-neutral-500">Duración:</span>{" "}
                {selected.duracion ?? 60} min
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
              {selected && isAcceptable(selected.estado) && (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmAcceptOpen(true)}
                >
                  Aceptar
                </Button>
              )}
              {selected && canCancel(selected.estado) && (
                <Button
                  variant="destructive"
                  className="bg-rose-100 text-rose-800 hover:bg-rose-200"
                  onClick={() => setConfirmCancelOpen(true)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación aceptar */}
      <Dialog open={confirmAcceptOpen} onOpenChange={setConfirmAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar aceptación</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="text-sm text-neutral-700 space-y-1">
              <div>
                ¿Deseas aceptar esta sesión con el coach{" "}
                <strong>{coachLabelFor(selected)}</strong>?
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                <div>
                  <span className="text-neutral-500">Fecha:</span>{" "}
                  {formatDateTime(selected.fecha_programada)}
                </div>
                <div>
                  <span className="text-neutral-500">Duración:</span>{" "}
                  {selected.duracion ?? 60} min
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500">Etapa:</span>{" "}
                  {selected.etapa || studentStage || "—"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-700">
              ¿Deseas aceptar esta sesión?
            </div>
          )}
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmAcceptOpen(false)}
              >
                No
              </Button>
              <Button
                disabled={accepting}
                onClick={async () => {
                  if (!selected) return;
                  try {
                    setAccepting(true);
                    await acceptSession(selected.id);
                    toast({ title: "Sesión aceptada" });
                    setConfirmAcceptOpen(false);
                    setDetailOpen(false);
                    fetchAll();
                  } catch (e: any) {
                    toast({ title: e?.message ?? "Error al aceptar" });
                  } finally {
                    setAccepting(false);
                  }
                }}
              >
                {accepting ? "Procesando…" : "Sí, aceptar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación cancelar */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cancelación</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="text-sm text-neutral-700 space-y-1">
              <div>
                ¿Deseas cancelar esta sesión con el coach{" "}
                <strong>{coachLabelFor(selected)}</strong>?
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                <div>
                  <span className="text-neutral-500">Fecha:</span>{" "}
                  {formatDateTime(selected.fecha_programada)}
                </div>
                <div>
                  <span className="text-neutral-500">Duración:</span>{" "}
                  {selected.duracion ?? 60} min
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500">Etapa:</span>{" "}
                  {selected.etapa || studentStage || "—"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-700">
              ¿Deseas cancelar esta sesión?
            </div>
          )}
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmCancelOpen(false)}
              >
                No
              </Button>
              <Button
                variant="destructive"
                className="bg-rose-100 text-rose-800 hover:bg-rose-200"
                disabled={cancelling}
                onClick={async () => {
                  if (!selected) return;
                  try {
                    setCancelling(true);
                    await cancelSession(selected.id);
                    toast({ title: "Sesión cancelada" });
                    setConfirmCancelOpen(false);
                    setDetailOpen(false);
                    fetchAll();
                  } catch (e: any) {
                    toast({ title: e?.message ?? "Error al cancelar" });
                  } finally {
                    setCancelling(false);
                  }
                }}
              >
                {cancelling ? "Procesando…" : "Sí, cancelar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
