"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  MessageSquare,
  BarChart3,
  UserCheck,
  BookOpen,
  HelpCircle,
  ChevronDown,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type MenuItem = {
  title: string;
  url?: string;
  icon: any;
  children?: MenuItem[];
};

const adminItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: Home },
  // Nueva sección con dropdown
  {
    title: "Métricas",
    icon: BarChart3,
    children: [
      { title: "Alumnos", url: "/admin/students", icon: GraduationCap },
      { title: "Equipos", url: "/admin/teams", icon: Users },
      { title: "Tickets", url: "/admin/tickets", icon: MessageSquare },
    ],
  },
  { title: "Coaches", url: "/admin/coaches", icon: UserCheck },
  { title: "Reportes", url: "/admin/reports", icon: BarChart3 },
];

const coachItems: MenuItem[] = [
  { title: "Dashboard", url: "/coach", icon: Home },
  { title: "Mis Estudiantes", url: "/coach/students", icon: Users },
  { title: "Tickets", url: "/coach/tickets", icon: MessageSquare },
  { title: "Contenido", url: "/coach/content", icon: BookOpen },
];

const studentItems: MenuItem[] = [
  { title: "Dashboard", url: "/student", icon: Home },
  { title: "Mi Curso", url: "/student/course", icon: BookOpen },
  { title: "Soporte", url: "/student/support", icon: MessageSquare },
];

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

  const initials = (user?.name ?? user?.email ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const roleLabel =
    user?.role === "admin"
      ? "Administrador"
      : user?.role === "coach"
      ? "Coach"
      : user?.role === "student"
      ? "Estudiante"
      : "Invitado";

  // Estado de despliegue del dropdown "Métricas"
  const [metricsOpen, setMetricsOpen] = useState(false);

  // Abre automáticamente "Métricas" si estamos en alguna de sus rutas
  useEffect(() => {
    if (!pathname) return;
    if (
      pathname.startsWith("/admin/students") ||
      pathname.startsWith("/admin/teams") ||
      pathname.startsWith("/admin/tickets")
    ) {
      setMetricsOpen(true);
    }
  }, [pathname]);

  return (
    <Sidebar className="border-r">
      {/* Contenido en columnas y todo el alto */}
      <SidebarContent className="flex h-full flex-col">
        {/* Header */}
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage
                  src={(user as any)?.image ?? ""}
                  alt={user?.name ?? "Avatar"}
                />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {user?.name ?? user?.email ?? "Usuario"}
                  </p>
                  {user?.role && (
                    <Badge variant="outline" className="h-5 text-[10px] px-1.5">
                      {roleLabel}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Academia Platform
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Menú principal */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SidebarGroup>
            <SidebarGroupLabel className="px-3">Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <TooltipProvider>
                  {menuItems.map((item) => {
                    const Icon = item.icon;

                    // Si no tiene hijos, es un link normal
                    if (!item.children?.length) {
                      const active =
                        pathname === item.url ||
                        (!!item.url &&
                          item.url !== "/" &&
                          pathname?.startsWith(item.url));
                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "transition-all",
                                  active
                                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                                    : "hover:bg-muted"
                                )}
                              >
                                <Link
                                  href={item.url ?? "#"}
                                  className="flex items-center gap-3"
                                >
                                  <Icon
                                    className={cn(
                                      "h-4 w-4",
                                      active && "text-primary"
                                    )}
                                  />
                                  <span className="truncate">{item.title}</span>
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

                    // Si tiene hijos, renderizamos dropdown
                    const isAnyChildActive = item.children.some((c) =>
                      pathname?.startsWith(c.url ?? "")
                    );

                    return (
                      <SidebarMenuItem key={item.title}>
                        {/* Botón que abre/cierra el dropdown */}
                        <button
                          type="button"
                          onClick={() => setMetricsOpen((v) => !v)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-all",
                            metricsOpen || isAnyChildActive
                              ? "bg-primary/10 text-primary hover:bg-primary/15"
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                (metricsOpen || isAnyChildActive) &&
                                  "text-primary"
                              )}
                            />
                            <span className="truncate">{item.title}</span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
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
                            <ul className="my-1 ml-8 border-l pl-3 space-y-1">
                              {item.children.map((child) => {
                                const CIcon = child.icon;
                                const active =
                                  pathname === child.url ||
                                  (!!child.url &&
                                    child.url !== "/" &&
                                    pathname?.startsWith(child.url));
                                return (
                                  <li key={child.title}>
                                    <Link
                                      href={child.url ?? "#"}
                                      className={cn(
                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                        active
                                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                                          : "hover:bg-muted"
                                      )}
                                    >
                                      <CIcon className="h-4 w-4" />
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

        <Separator className="mx-3 mt-2" />

        {/* Footer fijo */}
        <div className="p-3">
          <Link
            href={
              user?.role === "student" ? "/student/support" : "/coach/tickets"
            }
            className="group flex items-center gap-3 w-full rounded-lg border p-2.5 hover:bg-muted transition-colors"
          >
            <div className="rounded-md p-2 bg-muted group-hover:bg-background">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none">
                ¿Necesitas ayuda?
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Abre un ticket de soporte
              </p>
            </div>
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
