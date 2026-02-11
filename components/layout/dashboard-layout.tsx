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
  Plus,
  RefreshCw,
  BadgeDollarSign,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTicketNotifications } from "@/components/hooks/useTicketNotifications";
import { useSseNotifications } from "@/components/hooks/useSseNotifications";
import { usePaymentDueNotifications } from "@/components/hooks/usePaymentDueNotifications";
import { useCallback, useMemo, useState } from "react";
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

function PaymentsDueBadge() {
  const { user } = useAuth();
  const enabled = user?.role === "coach" || user?.role === "equipo";
  const { dueCount, loading, error, refresh, items } =
    usePaymentDueNotifications({ enabled, daysWindow: 5 });

  const [open, setOpen] = useState(false);

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
                  ? `Cuotas por vencer: ${dueCount}`
                  : "No hay cuotas por vencer"
          }
          type="button"
        >
          <BadgeDollarSign
            className={`h-4 w-4 ${loading ? "opacity-60" : ""}`}
          />
          {dueCount > 0 && (
            <span
              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
              title="Cuotas por vencer"
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
          Pagos por vencer (≤5 días)
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              {error
                ? "No se pudieron cargar las cuotas"
                : "No hay cuotas por vencer"}
            </div>
          ) : (
            items.slice(0, 30).map((it) => {
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
                  <div
                    className="text-sm font-medium leading-snug truncate"
                    title={who}
                  >
                    {who}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {when}
                    {it.fecha_pago ? ` (${fmtDateShort(it.fecha_pago)})` : ""}
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

  const MenuToggleButton = () => {
    const { toggleSidebar } = useSidebar();
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSidebar}
        className="gap-2"
      >
        <Menu className="h-4 w-4" />
        <span>Menú</span>
      </Button>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="flex flex-wrap items-center gap-3 justify-between p-3 sm:p-4 border-b bg-background">
            <div className="flex items-center gap-3 min-w-0">
              <MenuToggleButton />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
              <ThemeToggle />
              <PaymentsDueBadge />
              <NotificationsBadge />
              <div className="flex items-center gap-2 text-sm min-w-0">
                <User className="h-4 w-4" />
                <span className="truncate max-w-[40vw] sm:max-w-[200px]">
                  {user?.name}
                </span>
                <span className="hidden sm:inline text-muted-foreground">
                  ({user?.role})
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Salir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-sm p-4">
                  <AlertDialogHeader className="text-center">
                    <AlertDialogTitle className="text-base">
                      Cerrar sesión
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      ¿Estás seguro? Saldrás de tu cuenta y volverás a la
                      pantalla de inicio de sesión.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={logout}
                      disabled={isLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
