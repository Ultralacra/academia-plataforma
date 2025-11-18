"use client";

import type React from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTicketNotifications } from "@/components/hooks/useTicketNotifications";
import { useSseNotifications } from "@/components/hooks/useSseNotifications";
import { useMemo, useState } from "react";
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
}

function NotificationsBadge() {
  const {
    items: ticketItems,
    unread: ticketUnread,
    markAllRead: ticketsMarkAll,
  } = useTicketNotifications();
  const {
    items: sseItems,
    unread: sseUnread,
    markAllRead: sseMarkAll,
    connected: sseConnected,
    disabled: sseDisabled,
  } = useSseNotifications();
  const [open, setOpen] = useState(false);
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
    return [...normSse, ...normTicket].sort((a, b) => b._t - a._t).slice(0, 20);
  }, [ticketItems, sseItems]);
  const totalUnread = ticketUnread + sseUnread;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
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
              className="absolute -top-1 -right-1 bg-neutral-300 text-neutral-700 rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
              title="SSE desconectado"
            >
              !
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="text-sm font-semibold px-2 py-1">Notificaciones</div>
        <div className="max-h-56 overflow-y-auto">
          {merged.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              {sseDisabled || !sseConnected
                ? "Alertas no conectadas"
                : "No hay notificaciones"}
            </div>
          ) : (
            merged.map((n: any) => (
              <div key={n.id} className="p-2 border-b last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium leading-snug min-w-0">
                    <div className="truncate" title={n.title}>
                      {n.title}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {n.at ? new Date(n.at).toLocaleString() : ""}
                      {n._kind === "sse" && (
                        <span className="inline-flex items-center rounded bg-emerald-50 text-emerald-700 px-1 py-[2px] border border-emerald-200 text-[10px]">
                          SSE
                        </span>
                      )}
                      {n._kind === "ticket" && (
                        <span className="inline-flex items-center rounded bg-sky-50 text-sky-700 px-1 py-[2px] border border-sky-200 text-[10px]">
                          Ticket
                        </span>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const s = String(n.current || "").toUpperCase();
                    const style =
                      s === "PENDIENTE"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : s === "EN_PROGRESO"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : s === "PENDIENTE_DE_ENVIO"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : s === "PAUSADO"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : s === "RESUELTO"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : s === "CREADO"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : s === "ELIMINADO"
                        ? "bg-red-50 text-red-700 border-red-200"
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
      </PopoverContent>
    </Popover>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
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
          <div className="flex-1 p-6 overflow-x-hidden overflow-y-auto min-h-0 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
