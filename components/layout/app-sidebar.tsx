"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { useChatNotifications } from "@/components/hooks/useChatNotifications";
import { toast } from "@/components/ui/use-toast";

/* ====================== Tipos ====================== */
type MenuItem = {
  title: string;
  url?: string;
  icon: any;
  children?: MenuItem[];
};

/* ====================== Menús (admin con top-level Coachs/Alumnos/Tickets + grupo “Métricas”) ====================== */
const adminItems: MenuItem[] = [
  /*  { title: "Dashboard", url: "/admin", icon: Home },
   */
  // NUEVOS top-level (mismo nivel que “Métricas”)
  { title: "Coachs", url: "/admin/teamsv2", icon: Users },
  { title: "Alumnos", url: "/admin/alumnos", icon: GraduationCap },
  { title: "Tickets", url: "/admin/tickets-board", icon: MessageSquare },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Chat Beta", url: "/chat/beta", icon: MessageSquare },
  /*  { title: "Tickets", url: "/admin/ticketsv2", icon: MessageSquare }, */

  // Grupo colapsable renombrado a “Métricas”
  {
    title: "Métricas",
    icon: BarChart3,
    children: [
      { title: "Alumnos", url: "/admin/students", icon: GraduationCap },
      { title: "Coachs", url: "/admin/teams", icon: Users },
      { title: "Tickets", url: "/admin/tickets", icon: MessageSquare },
    ],
  },
  { title: "Opciones", url: "/admin/opciones", icon: Settings },
];

/* Coach */
const coachItems: MenuItem[] = [
  { title: "Dashboard", url: "/coach", icon: Home },
  { title: "Alumnos", url: "/coach/students", icon: GraduationCap },
  { title: "Tickets", url: "/coach/tickets", icon: MessageSquare },
];

/* Student */
const studentItems: MenuItem[] = [
  { title: "Dashboard", url: "/student", icon: Home },
  { title: "Mi Curso", url: "/student/course", icon: GraduationCap },
  { title: "Chat", url: "/chat/student", icon: MessageSquare },
];

/* ====================== Sidebar ====================== */
export function AppSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const menuItems = useMemo(() => {
    switch (user?.role) {
      case "admin":
        return adminItems;
      case "coach":
        return coachItems;
      case "student":
        return studentItems;
      default:
        return [];
    }
  }, [user?.role]);

  const roleLabel =
    user?.role === "admin"
      ? "Administrador"
      : user?.role === "coach"
      ? "Coach"
      : user?.role === "student"
      ? "Estudiante"
      : "Invitado";

  const [metricsOpen, setMetricsOpen] = useState(false);
  const { unreadTotal, lastEvent } = useChatNotifications({
    role: (user?.role === "student"
      ? "alumno"
      : user?.role === "coach"
      ? "coach"
      : "admin") as any,
    enableToast: true,
  });

  // Toast cuando hay mensaje nuevo y estamos visibles pero fuera de /chat
  useEffect(() => {
    if (!lastEvent) return;
    if (typeof document === "undefined") return;
    const visible = document.visibilityState === "visible";
    const onChatPage = pathname?.startsWith("/chat");
    if (visible && !onChatPage) {
      try {
        toast({
          title: "Nuevo mensaje en chat",
          description: `${lastEvent.sender}: ${
            lastEvent.text?.slice(0, 80) || "(adjunto)"
          }`,
        });
      } catch {}
    }
  }, [lastEvent, pathname]);

  useEffect(() => {
    if (!pathname) return;
    // Abre “Métricas” si navegamos a alguna subruta de métricas
    if (pathname.startsWith("/admin/metrics")) setMetricsOpen(true);
  }, [pathname]);

  return (
    <Sidebar className="border-r bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <SidebarContent className="flex h-full flex-col overflow-x-hidden">
        {/* Header — estilo Notion */}
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <img
              src="https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg"
              alt="Logo"
              className="h-8 w-8 rounded-md object-cover ring-1 ring-black/5"
              loading="eager"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">
                {user?.name ?? user?.email ?? "Usuario"}
              </p>
              <Badge
                variant="outline"
                className="mt-0.5 h-5 px-1.5 text-[10px] border-neutral-200 text-neutral-600"
              >
                {roleLabel}
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Navegación — Notion-like */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-[11px] uppercase tracking-wide text-neutral-500">
              Navegación
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <TooltipProvider delayDuration={300}>
                  {menuItems.map((item) => {
                    const Icon = item.icon;

                    // Enlace simple
                    if (!item.children?.length) {
                      const active =
                        pathname === item.url ||
                        (!!item.url &&
                          item.url !== "/" &&
                          pathname?.startsWith(item.url));

                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "group relative overflow-hidden rounded-md px-2.5 py-1.5 text-sm",
                                  active
                                    ? "bg-neutral-100 text-neutral-900"
                                    : "hover:bg-neutral-50 text-neutral-700"
                                )}
                              >
                                <Link
                                  href={item.url ?? "#"}
                                  className="flex items-center gap-2.5"
                                >
                                  {/* Dot activo al estilo Notion */}
                                  <span
                                    className={cn(
                                      "absolute left-2 top-1/2 -translate-y-1/2 h-[6px] w-[6px] rounded-full bg-amber-500 transition-opacity",
                                      active ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Icon
                                    className={cn(
                                      "h-4 w-4",
                                      active
                                        ? "text-neutral-900"
                                        : "text-neutral-600"
                                    )}
                                  />
                                  <span className="truncate flex items-center gap-2">
                                    {item.title}
                                    {item.title === "Chat" &&
                                      unreadTotal > 0 && (
                                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold">
                                          {unreadTotal > 99
                                            ? "99+"
                                            : unreadTotal}
                                        </span>
                                      )}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      );
                    }

                    // Grupo “Métricas”
                    const isAnyChildActive = item.children?.some((c) =>
                      pathname?.startsWith(c.url ?? "")
                    );

                    return (
                      <SidebarMenuItem key={item.title}>
                        <button
                          type="button"
                          onClick={() => setMetricsOpen((v) => !v)}
                          className={cn(
                            "group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm",
                            metricsOpen || isAnyChildActive
                              ? "bg-neutral-100 text-neutral-900"
                              : "hover:bg-neutral-50 text-neutral-700"
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                (metricsOpen || isAnyChildActive) &&
                                  "text-neutral-900"
                              )}
                            />
                            <span className="truncate">{item.title}</span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform text-neutral-500",
                              metricsOpen ? "rotate-180" : "rotate-0"
                            )}
                          />
                        </button>

                        {/* Submenú colapsable */}
                        <div
                          className={cn(
                            "mt-1 grid overflow-hidden transition-all",
                            metricsOpen
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="min-h-0">
                            <ul className="my-1 ml-5 border-l border-neutral-200 pl-3 space-y-0.5">
                              {item.children?.map((child) => {
                                const CIcon = child.icon;
                                const active =
                                  pathname === child.url ||
                                  (!!child.url &&
                                    child.url !== "/" &&
                                    pathname?.startsWith(child.url));
                                return (
                                  <li key={child.title} className="relative">
                                    <Link
                                      href={child.url ?? "#"}
                                      className={cn(
                                        "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                                        active
                                          ? "bg-neutral-100 text-neutral-900"
                                          : "hover:bg-neutral-50 text-neutral-700"
                                      )}
                                    >
                                      {/* Dot activo */}
                                      <span
                                        className={cn(
                                          "absolute left-0 top-1/2 -translate-y-1/2 h-[6px] w-[6px] rounded-full bg-amber-500",
                                          active ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <CIcon
                                        className={cn(
                                          "h-4 w-4",
                                          active
                                            ? "text-neutral-900"
                                            : "text-neutral-600"
                                        )}
                                      />
                                      <span className="truncate">
                                        {child.title}
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      </SidebarMenuItem>
                    );
                  })}
                </TooltipProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer minimal — Notion-like */}
        <Separator className="mx-3 mt-2" />
        <div className="px-3 py-2">
          <p className="text-[11px] text-neutral-500">
            {new Date().getFullYear()} • Workspace
          </p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
