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

type MenuItem = {
  title: string;
  url?: string;
  icon: any;
  children?: MenuItem[];
};

/* Menú admin SIN Coaches y SIN Reportes */
const adminItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: Home },
  {
    title: "Métricas",
    icon: BarChart3,
    children: [
      { title: "Alumnos", url: "/admin/students", icon: GraduationCap },
      { title: "Equipos", url: "/admin/teams", icon: Users },
      { title: "Tickets", url: "/admin/tickets", icon: MessageSquare },
    ],
  },
];

const coachItems: MenuItem[] = [
  { title: "Dashboard", url: "/coach", icon: Home },
  { title: "Mis Estudiantes", url: "/coach/students", icon: Users },
  { title: "Tickets", url: "/coach/tickets", icon: MessageSquare },
];

const studentItems: MenuItem[] = [
  { title: "Dashboard", url: "/student", icon: Home },
  { title: "Mi Curso", url: "/student/course", icon: GraduationCap },
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

  const roleLabel =
    user?.role === "admin"
      ? "Administrador"
      : user?.role === "coach"
      ? "Coach"
      : user?.role === "student"
      ? "Estudiante"
      : "Invitado";

  const [metricsOpen, setMetricsOpen] = useState(false);

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
    <Sidebar className="border-r overflow-x-hidden">
      <SidebarContent className="flex h-full flex-col overflow-x-hidden">
        {/* Header: logo a la izquierda + nombre y rol en línea */}
        <div className="p-3">
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-3">
              <img
                src="https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg"
                alt="Logo"
                className="h-10 w-10 rounded-full ring-4 ring-black/5 object-cover"
                loading="eager"
              />
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-medium truncate">
                  {user?.name ?? user?.email ?? "Usuario"}
                </p>
                {user?.role && (
                  <Badge
                    variant="outline"
                    className="h-5 text-[10px] px-1.5 border-black/20 text-black"
                  >
                    {roleLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Menú principal */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          <SidebarGroup>
            <SidebarGroupLabel className="px-3">Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <TooltipProvider>
                  {menuItems.map((item) => {
                    const Icon = item.icon;

                    // Link simple
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
                                  "transition-all group relative overflow-hidden",
                                  active
                                    ? "bg-black/5 text-black"
                                    : "hover:bg-black/5"
                                )}
                              >
                                <Link
                                  href={item.url ?? "#"}
                                  className="flex items-center gap-3"
                                >
                                  {/* Indicador activo ámbar dentro (sin offsets negativos) */}
                                  <span
                                    className={cn(
                                      "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-sm bg-amber-500",
                                      active ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Icon
                                    className={cn(
                                      "h-4 w-4",
                                      active ? "text-black" : "text-slate-700"
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

                    // Dropdown con hijos
                    const isAnyChildActive = item.children.some((c) =>
                      pathname?.startsWith(c.url ?? "")
                    );

                    return (
                      <SidebarMenuItem key={item.title}>
                        <button
                          type="button"
                          onClick={() => setMetricsOpen((v) => !v)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-all",
                            metricsOpen || isAnyChildActive
                              ? "bg-black/5 text-black"
                              : "hover:bg-black/5"
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                (metricsOpen || isAnyChildActive) &&
                                  "text-black"
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
                            <ul className="my-1 ml-6 border-l pl-3 space-y-1 relative">
                              {item.children.map((child) => {
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
                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors relative overflow-hidden",
                                        active
                                          ? "bg-black/5 text-black"
                                          : "hover:bg-black/5"
                                      )}
                                    >
                                      {/* Indicador activo ámbar dentro */}
                                      <span
                                        className={cn(
                                          "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-sm bg-amber-500",
                                          active ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <CIcon
                                        className={cn(
                                          "h-4 w-4",
                                          active
                                            ? "text-black"
                                            : "text-slate-700"
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
      </SidebarContent>
    </Sidebar>
  );
}
