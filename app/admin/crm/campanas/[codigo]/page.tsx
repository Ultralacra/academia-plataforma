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
    new Set()
  );
  const [assigningUsers, setAssigningUsers] = React.useState(false);
  const [availabilityOpen, setAvailabilityOpen] = React.useState(false);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
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
    setAvailabilityOpen(true);
    loadAvailability();
  };

  const getBusyDates = () => {
    if (!availability) return new Set<string>();
    const busyDates = new Set<string>();
    availability.busy.forEach((slot) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      let current = new Date(start);
      while (current <= end) {
        busyDates.add(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    });
    return busyDates;
  };

  const renderCalendar = () => {
    if (!availability) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const busyDates = getBusyDates();
    const days = [];

    // Días vacíos antes del primer día del mes
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-12" />);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split("T")[0];
      const isBusy = busyDates.has(dateStr);
      const isToday = date.toDateString() === now.toDateString();

      days.push(
        <div
          key={day}
          className={`h-12 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
            isToday
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : isBusy
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          title={isBusy ? "Ocupado - No disponible para agendar" : "Disponible"}
        >
          {day}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold">
            {new Intl.DateTimeFormat("es-ES", {
              month: "long",
              year: "numeric",
            }).format(now)}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-semibold text-slate-600"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{days}</div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-red-200 bg-red-50" />
            <span>Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-slate-200 bg-white" />
            <span>Disponible</span>
          </div>
        </div>
        {availability.busy.length > 0 && (
          <div className="mt-4 max-h-32 overflow-y-auto border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Horas ocupadas:</h4>
            <div className="space-y-1">
              {availability.busy.map((slot, idx) => (
                <div key={idx} className="text-xs text-slate-600">
                  {new Date(slot.start).toLocaleString("es-ES")} -{" "}
                  {new Date(slot.end).toLocaleString("es-ES")}
                </div>
              ))}
            </div>
          </div>
        )}
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
