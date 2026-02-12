"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getLeadOrigin, type LeadOrigin } from "@/app/admin/crm/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Copy,
  Calendar,
  Clock,
  FileText,
  Users,
  CalendarClock,
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmtDate(iso: unknown) {
  const s = typeof iso === "string" ? iso : "";
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return s;
  }
}

function fmtDateTime(iso: unknown) {
  const s = typeof iso === "string" ? iso : "";
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

export default function CampanaDetailPage() {
  const params = useParams<{ codigo: string }>();
  const codigo = String(params?.codigo ?? "");

  const [loading, setLoading] = React.useState(true);
  const [item, setItem] = React.useState<LeadOrigin | null>(null);
  const [assignUsersOpen, setAssignUsersOpen] = React.useState(false);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(
    new Set(),
  );
  const [assigningUsers, setAssigningUsers] = React.useState(false);
  const [availabilityOpen, setAvailabilityOpen] = React.useState(false);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [availabilityDay, setAvailabilityDay] = React.useState<Date>(
    () => new Date(),
  );
  const [availability, setAvailability] = React.useState<{
    google_email: string;
    busy: Array<{ start: string; end: string }>;
  } | null>(null);

  const formUrl = React.useMemo(() => {
    const eventCodigo = String((item as any)?.event_codigo || "").trim();
    const fallbackCodigo = String(item?.codigo || codigo || "").trim();
    const code = eventCodigo || fallbackCodigo;
    if (!code) return "";
    const origin = getPublicAppOrigin();
    return `${origin}/booking/${encodeURIComponent(code)}`;
  }, [codigo, item?.codigo, (item as any)?.event_codigo]);

  const load = React.useCallback(async () => {
    if (!codigo) return;

    setLoading(true);
    try {
      const data = await getLeadOrigin(codigo);
      setItem(data ?? null);
    } catch (err: any) {
      setItem(null);
      toast({
        title: "Error",
        description: err?.message || "No se pudo cargar la campaña",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  React.useEffect(() => {
    load();
  }, [load]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await apiFetch<{ data: any[] }>("/users?pageSize=1000");
      const allUsers = response?.data || [];
      // Filtrar solo usuarios con role === "sales"
      const salesUsers = allUsers.filter((u: any) => u.role === "sales");
      setUsers(salesUsers);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleConfirmAssignUsers = async () => {
    if (selectedUsers.size === 0 || !codigo) return;
    setAssigningUsers(true);
    try {
      const usersPayload = Array.from(selectedUsers).map((userCodigo) => ({
        user_codigo: userCodigo,
      }));
      await apiFetch(`/leads/origins/${encodeURIComponent(codigo)}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: usersPayload }),
      });
      await load();
      toast({
        title: "✓ Usuarios asignados",
        description: `${selectedUsers.size} usuario(s) asignado(s) a la campaña`,
      });
      setAssignUsersOpen(false);
      setSelectedUsers(new Set());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudieron asignar los usuarios",
        variant: "destructive",
      });
    } finally {
      setAssigningUsers(false);
    }
  };

  const handleAssignUsers = () => {
    setAssignUsersOpen(true);
    loadUsers();
  };

  const loadAvailability = async () => {
    setAvailabilityLoading(true);
    try {
      const response = await apiFetch<{
        success: boolean;
        google_email: string;
        busy: Array<{ start: string; end: string }>;
      }>("/calendar/availability");
      setAvailability({
        google_email: response.google_email,
        busy: response.busy,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message ||
          "No se pudo cargar la disponibilidad del calendario",
        variant: "destructive",
      });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleViewAvailability = () => {
    setAvailabilityDay(new Date());
    setAvailabilityOpen(true);
    loadAvailability();
  };

  const toDateKeyLocal = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDayRange = (d: Date) => {
    const start = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999,
    );
    return { start, end };
  };

  const getBusyDates = () => {
    if (!availability) return new Set<string>();
    const busyDates = new Set<string>();
    availability.busy.forEach((slot) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const current = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
      );
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      while (current <= endDay) {
        busyDates.add(toDateKeyLocal(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return busyDates;
  };

  const renderCalendar = () => {
    if (!availability) return null;

    const now = new Date();
    const selectedDay = availabilityDay || now;
    const isToday = selectedDay.toDateString() === now.toDateString();

    // Navegación de días
    const goToPrevDay = () => {
      const prev = new Date(selectedDay);
      prev.setDate(prev.getDate() - 1);
      setAvailabilityDay(prev);
    };
    const goToNextDay = () => {
      const next = new Date(selectedDay);
      next.setDate(next.getDate() + 1);
      setAvailabilityDay(next);
    };
    const goToToday = () => {
      setAvailabilityDay(new Date());
    };

    const { start: dayStart, end: dayEnd } = getDayRange(selectedDay);
    const busyForDay = availability.busy
      .map((slot) => ({ start: new Date(slot.start), end: new Date(slot.end) }))
      .filter(
        (slot) =>
          !Number.isNaN(slot.start.getTime()) &&
          !Number.isNaN(slot.end.getTime()) &&
          slot.end >= dayStart &&
          slot.start <= dayEnd,
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const hours = [] as number[];
    for (let h = 6; h <= 22; h++) hours.push(h);

    const rowHeightPx = 48;
    const timelineHeightPx = rowHeightPx * hours.length;
    const visibleStart = new Date(selectedDay);
    visibleStart.setHours(hours[0], 0, 0, 0);
    const visibleEnd = new Date(selectedDay);
    visibleEnd.setHours(hours[hours.length - 1] + 1, 0, 0, 0);

    const splitIntoHourlySegments = (start: Date, end: Date) => {
      const segments: { start: Date; end: Date }[] = [];
      let cursor = new Date(start);
      for (let i = 0; i < 48 && cursor.getTime() < end.getTime(); i++) {
        const nextHour = new Date(cursor);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(nextHour.getHours() + 1);
        const segEnd = nextHour.getTime() < end.getTime() ? nextHour : end;
        segments.push({ start: new Date(cursor), end: new Date(segEnd) });
        cursor = new Date(segEnd);
      }
      return segments;
    };

    const visibleBusy = busyForDay
      .map((slot) => {
        const start = slot.start > visibleStart ? slot.start : visibleStart;
        const end = slot.end < visibleEnd ? slot.end : visibleEnd;
        return { start, end };
      })
      .filter((slot) => slot.end.getTime() > slot.start.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .flatMap((slot) => splitIntoHourlySegments(slot.start, slot.end));

    return (
      <div className="flex flex-col h-full">
        {/* Header con navegación de días */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevDay}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="text-xs"
              >
                Hoy
              </Button>
            )}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {new Intl.DateTimeFormat("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(selectedDay)}
            </h3>
            {isToday && (
              <span className="text-xs text-blue-600 font-medium">Hoy</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded border border-slate-300 bg-white" />
              <span>Libre</span>
            </div>
          </div>
        </div>

        {/* Vista de día con horas (línea de tiempo) */}
        <div className="flex-1 overflow-y-auto max-h-[400px] border rounded-lg">
          <div className="grid grid-cols-[64px_1fr]">
            <div className="border-r bg-slate-50">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-12 px-2 text-xs text-slate-500 flex items-center justify-end border-b last:border-b-0"
                >
                  {hour.toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>
            <div
              className="relative"
              style={{ height: `${timelineHeightPx}px` }}
            >
              {hours.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-b"
                  style={{ top: `${(idx + 1) * rowHeightPx}px` }}
                />
              ))}

              {visibleBusy.map((slot, idx) => {
                const minutesFromStart =
                  (slot.start.getTime() - visibleStart.getTime()) / 60000;
                const minutesDuration =
                  (slot.end.getTime() - slot.start.getTime()) / 60000;
                const pxPerMinute = rowHeightPx / 60;
                const topPxRaw = Math.max(0, minutesFromStart * pxPerMinute);
                const heightPxRaw = Math.max(12, minutesDuration * pxPerMinute);
                const topPx = topPxRaw + 1;
                const heightPx = Math.max(10, heightPxRaw - 2);

                const showFull = heightPx >= 36;
                const showCompact = heightPx >= 22;

                const startLabel = slot.start.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const endLabel = slot.end.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={`${slot.start.toISOString()}-${idx}`}
                    className="absolute left-2 right-2 bg-blue-500/80 text-white rounded-md shadow overflow-hidden"
                    style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                  >
                    {showFull ? (
                      <div className="px-2 py-1">
                        <div className="text-[11px] font-medium leading-none">
                          Ocupado
                        </div>
                        <div className="text-[10px] text-white/90 leading-none mt-1">
                          {startLabel}–{endLabel}
                        </div>
                      </div>
                    ) : showCompact ? (
                      <div className="h-full px-2 flex items-center">
                        <div className="text-[10px] font-medium leading-none truncate">
                          {startLabel}–{endLabel}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full px-1 flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                Bloqueos del día
              </p>
              <p className="text-xs text-slate-500">
                {busyForDay.length > 0
                  ? "Tramos ocupados en el calendario."
                  : "No hay horas ocupadas para este día."}
              </p>
            </div>
            <Badge variant={busyForDay.length > 0 ? "muted" : "outline"}>
              {busyForDay.length}{" "}
              {busyForDay.length === 1 ? "bloqueo" : "bloqueos"}
            </Badge>
          </div>

          {busyForDay.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {busyForDay.map((slot, idx) => {
                const startLabel = slot.start.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const endLabel = slot.end.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <Badge key={idx} variant="muted" className="font-mono">
                    {startLabel}–{endLabel}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute allowedRoles={["admin" as const, "equipo" as const]}>
      <DashboardLayout>
        <div className="h-full flex flex-col bg-slate-50">
          {/* Header mejorado */}
          <div className="border-b bg-white px-6 py-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Button asChild variant="ghost" size="icon">
                  <Link href="/admin/crm" aria-label="Volver al CRM">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-bold tracking-tight truncate">
                      {item?.name || "Campaña"}
                    </h1>
                    <Badge variant="outline" className="font-mono text-xs">
                      {codigo}
                    </Badge>
                  </div>
                  {item?.description && (
                    <p className="text-sm text-slate-600 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleViewAvailability}
                  variant="outline"
                  className="gap-2"
                >
                  <CalendarClock className="h-4 w-4" />
                  Ver mis horas disponibles
                </Button>
                <Button onClick={handleAssignUsers} className="gap-2">
                  <Users className="h-4 w-4" />
                  Asignar usuarios
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : !item ? (
              <Card className="p-8 text-center">
                <p className="text-slate-600">No se encontró la campaña.</p>
              </Card>
            ) : (
              <div className="max-w-5xl mx-auto space-y-6">
                {/* URL del formulario */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                      URL del formulario público
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Input
                        value={formUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          try {
                            if (!formUrl) return;
                            await navigator.clipboard.writeText(formUrl);
                            toast({ title: "✓ URL copiada al portapapeles" });
                          } catch {
                            toast({
                              title: "No se pudo copiar",
                              description: "Copia el link manualmente.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!formUrl}
                        aria-label="Copiar URL del formulario"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Información de la campaña */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      Información de la campaña
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-slate-600">
                          Código del evento
                        </Label>
                        <p className="text-sm font-medium font-mono bg-slate-50 px-3 py-2 rounded border">
                          {(item as any).event_codigo || "—"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-slate-600">Código</Label>
                        <p className="text-sm font-medium font-mono bg-slate-50 px-3 py-2 rounded border">
                          {item.codigo}
                        </p>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-slate-600">Descripción</Label>
                        <p className="text-sm bg-slate-50 px-3 py-2 rounded border">
                          {item.description || "Sin descripción"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Usuarios asignados */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-slate-700" />
                      Usuarios asignados
                      {Array.isArray((item as any)?.users) && (
                        <Badge variant="outline" className="ml-2">
                          {(item as any).users.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray((item as any)?.users) &&
                    (item as any).users.length > 0 ? (
                      <div className="rounded-md border bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Email</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(item as any).users.map((u: any) => (
                              <TableRow key={String(u?.codigo || u?.id)}>
                                <TableCell className="font-medium">
                                  {u?.name || u?.nombre || "—"}
                                </TableCell>
                                <TableCell>{u?.email || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">
                        No hay usuarios asignados a esta campaña.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Modal de asignar usuarios */}
        <Dialog open={assignUsersOpen} onOpenChange={setAssignUsersOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Asignar usuarios a la campaña
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No hay usuarios disponibles
                </p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <label
                      key={user.codigo}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.codigo)}
                        onChange={(e) => {
                          const newSet = new Set(selectedUsers);
                          if (e.target.checked) {
                            newSet.add(user.codigo);
                          } else {
                            newSet.delete(user.codigo);
                          }
                          setSelectedUsers(newSet);
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.nombre}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignUsersOpen(false)}
                disabled={assigningUsers}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAssignUsers}
                disabled={selectedUsers.size === 0 || assigningUsers}
              >
                {assigningUsers ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  `Asignar (${selectedUsers.size})`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de disponibilidad */}
        <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Mis horas disponibles
              </DialogTitle>
              {availability && (
                <p className="text-sm text-slate-600">
                  Calendario sincronizado con {availability.google_email}
                </p>
              )}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {availabilityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : availability ? (
                renderCalendar()
              ) : (
                <p className="text-center text-slate-500 py-12">
                  No se pudo cargar la disponibilidad
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setAvailabilityOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
