"use client";

import type React from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  User,
  Menu,
  Bell,
  ClipboardList,
  ArrowUpRight,
  Plus,
  RefreshCw,
  BadgeDollarSign,
  KeyRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTicketNotifications } from "@/components/hooks/useTicketNotifications";
import { useSseNotifications } from "@/components/hooks/useSseNotifications";
import { usePaymentDueNotifications } from "@/components/hooks/usePaymentDueNotifications";
import { useAccessDueNotifications } from "@/components/hooks/useAccessDueNotifications";
import { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/ui/spinner";

interface DashboardLayoutProps {
  children: React.ReactNode;
  contentClassName?: string; // optional override for content padding/margins
}

function NotificationsBadge() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const {
    items: ticketItems,
    unread: ticketUnread,
    markAllRead: ticketsMarkAll,
  } = useTicketNotifications();
  const {
    items: sseItems,
    unread: sseUnread,
    markAllRead: sseMarkAll,
    loadMore: sseLoadMore,
    hasMore: sseHasMore,
    connected: sseConnected,
    disabled: sseDisabled,
  } = useSseNotifications();
  const [open, setOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(20);

  const replaceTicketWord = (s: unknown) => {
    const str = String(s ?? "");
    if (!isStudent) return str;
    return str.replace(/\bTicket\b/gi, "Feedback");
  };

  const shouldHideForStudent = (n: any) => {
    if (!isStudent) return false;
    const t = String(n?.type || "").toLowerCase();
    // Alumnos solo ven: feedback creado (ticket.created) y feedback resuelto (ticket.updated con estado cerrado/resuelto)
    // Ocultar todo lo demás
    if (t === "ticket.created") return false; // Mostrar: feedback creado
    if (t === "ticket.updated") {
      // Solo mostrar si es resuelto/cerrado
      const curr = String(n?.current || "").toLowerCase();
      if (
        curr.includes("cerrad") ||
        curr.includes("resuelt") ||
        curr.includes("closed") ||
        curr.includes("resolved")
      ) {
        return false; // Mostrar: feedback resuelto
      }
      return true; // Ocultar otros updates
    }
    // Ocultar todo lo demás (deleted, etc.)
    return true;
  };

  // Fusionar notificaciones: primero las SSE (más recientes directas), luego tickets por orden de fecha
  const merged = useMemo(() => {
    const parseAt = (x: any) => {
      const v = x?.at || x?.timestamp || null;
      const t = Date.parse(String(v || ""));
      return isNaN(t) ? 0 : t;
    };
    const normTicket = ticketItems.map((it) => ({
      ...it,
      _kind: "ticket",
      _t: parseAt(it),
    }));
    const normSse = sseItems.map((it) => ({
      ...it,
      _kind: "sse",
      _t: parseAt(it),
    }));
    return [...normSse, ...normTicket]
      .filter((n) => !shouldHideForStudent(n))
      .sort((a, b) => b._t - a._t)
      .slice(0, visibleLimit);
  }, [ticketItems, sseItems, visibleLimit, isStudent]);
  const totalUnread = ticketUnread + sseUnread;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // No consultar REST al abrir: solo mostrar lo ya recibido
        if (v) setVisibleLimit(20);
        // Al cerrar, marcar todas como leídas
        if (!v) {
          ticketsMarkAll();
          sseMarkAll();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted/10"
          title={
            sseDisabled || !sseConnected
              ? "Alertas no conectadas"
              : "Notificaciones"
          }
        >
          <Bell
            className={`h-4 w-4 ${
              sseDisabled || !sseConnected
                ? "text-muted-foreground opacity-60"
                : ""
            }`}
          />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
          {totalUnread === 0 && (sseDisabled || !sseConnected) && (
            <span
              className="absolute -top-1 -right-1 bg-muted text-muted-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
              title="SSE desconectado"
            >
              !
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3">
        <div className="text-base font-semibold px-2 py-1">Notificaciones</div>
        <div className="max-h-80 overflow-y-auto">
          {merged.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              {sseDisabled || !sseConnected
                ? "Alertas no conectadas"
                : "No hay notificaciones"}
            </div>
          ) : (
            merged.map((n: any) => (
              <div
                key={n.id}
                className="p-3 border-b last:border-b-0 hover:bg-muted/30 rounded-md"
              >
                <div className="flex items-start gap-3">
                  {(() => {
                    const t = String(n.type || "");
                    const base =
                      "w-9 h-9 rounded-full border flex items-center justify-center shrink-0";
                    if (t === "ticket.updated") {
                      return (
                        <div className={`${base} bg-amber-50 border-amber-200`}>
                          <RefreshCw className="h-4 w-4 text-amber-700" />
                        </div>
                      );
                    }
                    if (t === "ticket.created") {
                      return (
                        <div
                          className={`${base} bg-emerald-50 border-emerald-200`}
                        >
                          <Plus className="h-4 w-4 text-emerald-700" />
                        </div>
                      );
                    }
                    return (
                      <div className={`${base} bg-muted border-border`}>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })()}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium leading-snug truncate"
                          title={n.title}
                        >
                          {replaceTicketWord(n.title)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {n.at ? new Date(n.at).toLocaleString() : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {n.unread && (
                          <span
                            className="w-2 h-2 rounded-full bg-sky-500"
                            title="No leído"
                          />
                        )}
                        {(() => {
                          const s = String(n.current || "").toUpperCase();
                          const style =
                            s === "PENDIENTE"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              : s === "EN_PROGRESO"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                : s === "PENDIENTE_DE_ENVIO"
                                  ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                                  : s === "PAUSADO"
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                    : s === "RESUELTO"
                                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                      : s === "CREADO"
                                        ? "bg-muted text-muted-foreground border-border"
                                        : s === "ELIMINADO"
                                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                                          : "hidden";
                          const labelMap: Record<string, string> = {
                            EN_PROGRESO: "En progreso",
                            PENDIENTE: "Pendiente",
                            PENDIENTE_DE_ENVIO: "Pendiente de envío",
                            PAUSADO: "Pausado",
                            RESUELTO: "Resuelto",
                            CREADO: "Creado",
                            ELIMINADO: "Eliminado",
                          };
                          const lab = labelMap[s] || "";
                          return (
                            <span
                              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${style}`}
                            >
                              {lab}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <button
            className="text-xs text-muted-foreground"
            onClick={() => {
              ticketsMarkAll();
              sseMarkAll();
            }}
          >
            Marcar leídas
          </button>
          <div className="text-xs text-muted-foreground">
            {ticketItems.length + sseItems.length} total
          </div>
        </div>

        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!sseHasMore}
            onClick={async () => {
              await sseLoadMore();
              setVisibleLimit((v) => v + 15);
            }}
          >
            Ver más
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TasksNotificationsBadge() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [tasksByStudent, setTasksByStudent] = useState<
    Array<{
      alumnoCodigo: string;
      alumnoNombre: string;
      total: number;
      tareas: Array<{
        id: string;
        fecha: string;
        fase: string;
        resumen: string;
      }>;
    }>
  >([]);

  const totalTasks = useMemo(
    () => tasksByStudent.reduce((acc, g) => acc + g.total, 0),
    [tasksByStudent],
  );

  const loadTaskNotifications = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const alumnoCode = String(
        (user as any)?.codigo ?? (user as any)?.code ?? "",
      ).trim();
      const alumnoId = String((user as any)?.id ?? "").trim();
      const alumnoRef = alumnoCode || alumnoId;
      if (isStudent && !alumnoRef) {
        setTasksByStudent([]);
        setTasksError("No se pudo identificar el alumno");
        return;
      }

      const json = isStudent
        ? await fetch(
            `/api/alumnos/${encodeURIComponent(alumnoRef)}/metadata?entity=${encodeURIComponent("ads_metrics")}`,
            {
              method: "GET",
              headers: {
                ...(() => {
                  try {
                    const token = getAuthToken();
                    return token ? { Authorization: `Bearer ${token}` } : {};
                  } catch {
                    return {};
                  }
                })(),
              },
              cache: "no-store",
            },
          ).then(async (res) => {
            if (!res.ok) {
              const txt = await res.text().catch(() => "");
              throw new Error(txt || `HTTP ${res.status}`);
            }
            return res.json().catch(() => null);
          })
        : await apiFetch<any>("/metadata?entity=ads_metrics", {
            method: "GET",
          });

      const rows: any[] = isStudent
        ? Array.isArray(json?.items)
          ? json.items
          : []
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.data)
            ? json.data.data
            : Array.isArray(json)
              ? json
              : [];

      const byStudent = new Map<
        string,
        {
          alumnoCodigo: string;
          alumnoNombre: string;
          total: number;
          tareas: Array<{
            id: string;
            fecha: string;
            fase: string;
            resumen: string;
          }>;
        }
      >();

      for (const record of rows) {
        const payload = record?.payload ?? {};
        const entity = String(record?.entity ?? "");
        const tag = String(payload?._tag ?? "");
        if (entity !== "ads_metrics" && tag !== "admin_alumnos_ads_metrics") {
          continue;
        }

        const alumnoCodigo = String(payload?.alumno_codigo ?? "").trim();
        const alumnoNombre =
          String(payload?.alumno_nombre ?? "").trim() ||
          alumnoCodigo ||
          "Alumno";
        if (!alumnoCodigo) continue;

        const rawTasks = payload?.tareas;
        const taskList = Array.isArray(rawTasks)
          ? rawTasks
          : typeof rawTasks === "string"
            ? (() => {
                try {
                  const parsed = JSON.parse(rawTasks);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()
            : [];

        if (!taskList.length) continue;

        const entry = byStudent.get(alumnoCodigo) ?? {
          alumnoCodigo,
          alumnoNombre,
          total: 0,
          tareas: [],
        };

        for (let i = 0; i < taskList.length; i++) {
          const t = taskList[i] ?? {};
          const dateRaw = String(t?.created_at ?? t?.fecha ?? "").trim();
          const parsedDate = Date.parse(dateRaw);
          const fecha = Number.isFinite(parsedDate)
            ? new Date(parsedDate).toISOString()
            : new Date(0).toISOString();

          const campos =
            t?.campos &&
            typeof t.campos === "object" &&
            !Array.isArray(t.campos)
              ? t.campos
              : {};
          const resumen =
            String(
              campos?.doc_link ??
                campos?.nombre ??
                campos?.correo_compras ??
                campos?.whatsapp ??
                "Tarea enviada",
            ).trim() || "Tarea enviada";

          entry.tareas.push({
            id: String(t?.id ?? `${alumnoCodigo}-${i}`),
            fecha,
            fase: String(t?.fase_formulario ?? "—"),
            resumen,
          });
          entry.total += 1;
        }

        byStudent.set(alumnoCodigo, entry);
      }

      const grouped = [...byStudent.values()]
        .map((g) => ({
          ...g,
          tareas: [...g.tareas].sort(
            (a, b) => Date.parse(b.fecha) - Date.parse(a.fecha),
          ),
        }))
        .sort((a, b) => {
          const at = a.tareas[0]?.fecha ? Date.parse(a.tareas[0].fecha) : 0;
          const bt = b.tareas[0]?.fecha ? Date.parse(b.tareas[0].fecha) : 0;
          return bt - at;
        });

      setTasksByStudent(grouped);
    } catch (e) {
      console.error("Error cargando notificaciones de tareas:", e);
      setTasksError("No se pudieron cargar las tareas");
      setTasksByStudent([]);
    } finally {
      setTasksLoading(false);
    }
  }, [isStudent, user]);

  useEffect(() => {
    loadTaskNotifications();
    const id = window.setInterval(
      () => {
        loadTaskNotifications();
      },
      3 * 60 * 1000,
    );
    return () => window.clearInterval(id);
  }, [loadTaskNotifications]);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted/10"
          title="Tareas enviadas"
          type="button"
        >
          <ClipboardList
            className={`h-4 w-4 ${tasksLoading ? "opacity-60" : ""}`}
          />
          {totalTasks > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
              {totalTasks > 99 ? "99+" : totalTasks}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[26rem] p-3">
        <div className="px-2 py-1 text-base font-semibold">Tareas enviadas</div>
        <div className="mb-2 mt-1 flex items-center justify-between px-1">
          <div className="text-xs text-muted-foreground">
            Se actualiza automáticamente cada 3 minutos
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={loadTaskNotifications}
            disabled={tasksLoading}
          >
            {tasksLoading ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-md border">
          {tasksLoading && tasksByStudent.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              Cargando tareas…
            </div>
          ) : tasksError ? (
            <div className="p-3 text-xs text-muted-foreground">
              {tasksError}
            </div>
          ) : tasksByStudent.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              No hay tareas enviadas por alumnos
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {tasksByStudent.map((group) => (
                <AccordionItem
                  key={group.alumnoCodigo}
                  value={group.alumnoCodigo}
                >
                  <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-2">
                      <div className="truncate text-left font-medium">
                        {group.alumnoNombre}
                      </div>
                      <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {group.total} tarea{group.total === 1 ? "" : "s"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 px-3 pb-2">
                      {group.tareas.map((task) => (
                        <div
                          key={`${group.alumnoCodigo}-${task.id}`}
                          className="rounded-md border bg-muted/30 px-2.5 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium">
                              Fase {task.fase}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(task.fecha).toLocaleString()}
                            </div>
                          </div>
                          <div
                            className="mt-1 truncate text-xs text-muted-foreground"
                            title={task.resumen}
                          >
                            {task.resumen}
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 h-7 w-full justify-between text-xs"
                        onClick={() => {
                          setOpen(false);
                          router.push(
                            `/admin/alumnos/${encodeURIComponent(group.alumnoCodigo)}/tareas`,
                          );
                        }}
                      >
                        Ir a tareas del alumno
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PaymentsDueBadge() {
  const router = useRouter();
  const { user } = useAuth();
  const enabled =
    user?.role === "admin" || user?.role === "coach" || user?.role === "equipo";
  const { dueCount, loading, error, refresh, items } =
    usePaymentDueNotifications({
      enabled,
      pastDaysWindow: 10,
      futureDaysWindow: 10,
    });

  const [open, setOpen] = useState(false);
  const overdueItems = useMemo(
    () => items.filter((it) => it.daysLeft < 0),
    [items],
  );
  const upcomingItems = useMemo(
    () => items.filter((it) => it.daysLeft >= 0),
    [items],
  );

  const fmtDateShort = useCallback((raw: string | null) => {
    if (!raw) return "";
    const s = String(raw).trim();
    if (!s) return "";
    // Preferir YYYY-MM-DD sin timezone
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, y, mm, dd] = m;
      return `${dd}/${mm}/${y}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      try {
        return d.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } catch {
        return d.toISOString().slice(0, 10);
      }
    }
    return s;
  }, []);

  const fmtStatus = useCallback((raw: string | null) => {
    const s = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (!s) return "Pendiente";
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  const openPaymentPlan = useCallback(
    (item: (typeof items)[number]) => {
      const clientCode = String(item.cliente_codigo ?? "").trim();
      const paymentCode = String(item.payment_codigo ?? "").trim();
      setOpen(false);

      if (clientCode) {
        router.push(`/admin/alumnos/${encodeURIComponent(clientCode)}/pagos`);
        return;
      }

      if (paymentCode) {
        router.push(
          `/admin/payments?payment=${encodeURIComponent(paymentCode)}`,
        );
        return;
      }

      router.push("/admin/payments");
    },
    [items, router],
  );

  if (!enabled) return null;

  return (
    <Popover
      open={open}
      onOpenChange={async (v) => {
        setOpen(v);
        if (v) await refresh();
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted/10"
          title={
            error
              ? "No se pudieron cargar cuotas"
              : loading
                ? "Cargando cuotas..."
                : dueCount > 0
                  ? `Cuotas pendientes: ${dueCount}`
                  : "No hay cuotas pendientes"
          }
          type="button"
        >
          <BadgeDollarSign
            className={`h-4 w-4 ${loading ? "opacity-60" : ""}`}
          />
          {dueCount > 0 && (
            <span
              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
              title="Cuotas pendientes"
            >
              {dueCount > 99 ? "99+" : dueCount}
            </span>
          )}
          {dueCount === 0 && !!error && (
            <span
              className="absolute -top-1 -right-1 bg-muted text-muted-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
              title="Error al cargar cuotas"
            >
              !
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3">
        <div className="text-base font-semibold px-2 py-1">
          Pagos pendientes
        </div>
        <Tabs defaultValue="vencidas" className="mt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="vencidas">
              Vencidas ({overdueItems.length})
            </TabsTrigger>
            <TabsTrigger value="por-vencer">
              Por vencer ({upcomingItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vencidas" className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-xs text-muted-foreground">Cargando…</div>
            ) : error ? (
              <div className="p-3 text-xs text-muted-foreground">
                No se pudieron cargar las cuotas
              </div>
            ) : overdueItems.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">
                No hay cuotas vencidas (últimos 10 días)
              </div>
            ) : (
              overdueItems.slice(0, 30).map((it) => {
                const who =
                  String(it.cliente_nombre ?? "").trim() ||
                  String(it.cliente_codigo ?? "").trim() ||
                  "Usuario";
                const when = `Vencida hace ${Math.abs(it.daysLeft)} día(s)`;
                return (
                  <div
                    key={it.key}
                    className="p-3 border-b last:border-b-0 hover:bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="text-sm font-medium leading-snug truncate"
                        title={who}
                      >
                        {who}
                      </div>
                      <span className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        Vencida
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {when}
                      {it.fecha_pago ? ` (${fmtDateShort(it.fecha_pago)})` : ""}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Estado: {fmtStatus(it.estatus)}
                    </div>
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => openPaymentPlan(it)}
                      >
                        Ver plan de pagos
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="por-vencer" className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-xs text-muted-foreground">Cargando…</div>
            ) : error ? (
              <div className="p-3 text-xs text-muted-foreground">
                No se pudieron cargar las cuotas
              </div>
            ) : upcomingItems.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">
                No hay cuotas por vencer (próximos 10 días)
              </div>
            ) : (
              upcomingItems.slice(0, 30).map((it) => {
                const who =
                  String(it.cliente_nombre ?? "").trim() ||
                  String(it.cliente_codigo ?? "").trim() ||
                  "Usuario";
                const when =
                  it.daysLeft === 0
                    ? "Vence hoy"
                    : `Vence en ${it.daysLeft} día(s)`;
                return (
                  <div
                    key={it.key}
                    className="p-3 border-b last:border-b-0 hover:bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="text-sm font-medium leading-snug truncate"
                        title={who}
                      >
                        {who}
                      </div>
                      <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {it.daysLeft === 0 ? "Hoy" : "Por vencer"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {when}
                      {it.fecha_pago ? ` (${fmtDateShort(it.fecha_pago)})` : ""}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Estado: {fmtStatus(it.estatus)}
                    </div>
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => openPaymentPlan(it)}
                      >
                        Ver plan de pagos
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function AccessDueBadge() {
  const { user } = useAuth();
  const enabled =
    user?.role === "admin" || user?.role === "coach" || user?.role === "equipo";
  const { dueCount, loading, error, refresh, items } =
    useAccessDueNotifications({ enabled, daysWindow: 5 });

  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <Popover
      open={open}
      onOpenChange={async (v) => {
        setOpen(v);
        if (v) await refresh();
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted/10"
          title={
            error
              ? "No se pudieron cargar accesos"
              : loading
                ? "Cargando accesos..."
                : dueCount > 0
                  ? `Accesos por vencer: ${dueCount}`
                  : "No hay accesos por vencer"
          }
          type="button"
        >
          <KeyRound className={`h-4 w-4 ${loading ? "opacity-60" : ""}`} />
          {dueCount > 0 && (
            <span
              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
              title="Accesos por vencer"
            >
              {dueCount > 99 ? "99+" : dueCount}
            </span>
          )}
          {dueCount === 0 && !!error && (
            <span
              className="absolute -top-1 -right-1 bg-muted text-muted-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
              title="Error al cargar accesos"
            >
              !
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3">
        <div className="text-base font-semibold px-2 py-1">
          Accesos por vencer (≤5 días)
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              {error
                ? "No se pudieron cargar los accesos"
                : "No hay accesos por vencer"}
            </div>
          ) : (
            items.slice(0, 30).map((it) => {
              const who =
                String(it.alumnoNombre ?? "").trim() ||
                String(it.alumnoCodigo ?? "").trim() ||
                "Alumno";
              const when =
                it.daysLeft === 0
                  ? "Vence hoy"
                  : `Vence en ${it.daysLeft} día(s)`;
              return (
                <div
                  key={it.key}
                  className="p-3 border-b last:border-b-0 hover:bg-muted/30 rounded-md"
                >
                  <div
                    className="text-sm font-medium leading-snug truncate"
                    title={who}
                  >
                    {who}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {when}
                    {it.fechaVence ? ` (${it.fechaVence})` : ""}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardLayout({
  children,
  contentClassName,
}: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();

  /* Helpers para mostrar rol y área formateados */
  const userRoleForLabel = (user?.role || "").toLowerCase();
  const roleLabel =
    userRoleForLabel === "admin"
      ? "Administrador"
      : userRoleForLabel === "coach"
        ? "Coach"
        : userRoleForLabel === "equipo"
          ? "Equipo"
          : userRoleForLabel === "student"
            ? "Estudiante"
            : userRoleForLabel === "sales"
              ? "Ventas"
              : "Invitado";

  const formatArea = (raw?: string): string | null => {
    if (!raw) return null;
    const map: Record<string, string> = {
      ATENCION_AL_CLIENTE: "Atención al cliente",
      VENTAS: "Ventas",
      MARKETING: "Marketing",
      ADMINISTRACION: "Administración",
      RECURSOS_HUMANOS: "Recursos humanos",
      COACHING: "Coaching",
      SOPORTE: "Soporte",
      TECNOLOGIA: "Tecnología",
    };
    if (map[raw]) return map[raw];
    return raw
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };
  const areaLabel = formatArea(user?.area);

  const MenuToggleButton = () => {
    const { toggleSidebar } = useSidebar();
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="h-9 w-9 rounded-xl hover:bg-muted/60 transition-colors duration-150"
        title="Menú"
      >
        <Menu className="h-5 w-5" />
      </Button>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="flex items-center gap-2 sm:gap-3 justify-between px-3 py-2 sm:px-5 sm:py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
            {/* Left: menu toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <MenuToggleButton />
            </div>

            {/* Right: actions + user */}
            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
              {/* Action buttons - compact on mobile */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <ThemeToggle
                  variant="ghost"
                  className="h-9 w-9 rounded-xl hover:bg-muted/60"
                />
                <PaymentsDueBadge />
                <AccessDueBadge />
                <TasksNotificationsBadge />
                <NotificationsBadge />
              </div>

              {/* Separator */}
              <div className="hidden sm:block h-6 w-px bg-border/40 mx-1" />

              {/* User info */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-border/30">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="hidden sm:flex flex-col min-w-0 gap-0.5">
                  <span className="truncate text-sm font-medium leading-tight max-w-[200px]">
                    {user?.name}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className="h-[18px] px-1.5 text-[9px] font-medium rounded-md"
                    >
                      {roleLabel}
                    </Badge>
                    {areaLabel && (
                      <Badge
                        variant="secondary"
                        className="h-[18px] px-1.5 text-[9px] font-medium rounded-md"
                      >
                        {areaLabel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors duration-150"
                    title="Cerrar sesión"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-sm rounded-2xl p-5">
                  <AlertDialogHeader className="text-center">
                    <AlertDialogTitle className="text-base font-semibold">
                      Cerrar sesión
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground">
                      ¿Estás seguro? Saldrás de tu cuenta y volverás a la
                      pantalla de inicio de sesión.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 sm:gap-2">
                    <AlertDialogCancel className="rounded-xl">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={logout}
                      disabled={isLoading}
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <div className="flex items-center gap-2">
                        {isLoading ? (
                          <Spinner size={16} thickness={2} />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        <span>{isLoading ? "Saliendo..." : "Confirmar"}</span>
                      </div>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>
          <div
            className={`flex-1 ${
              contentClassName ?? "p-6"
            } overflow-x-hidden overflow-y-auto min-h-0 flex flex-col`}
          >
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
