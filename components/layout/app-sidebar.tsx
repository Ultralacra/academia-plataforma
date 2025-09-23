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

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Estudiantes", url: "/admin/students", icon: GraduationCap },
  { title: "Coaches", url: "/admin/coaches", icon: UserCheck },
  { title: "Tickets", url: "/admin/tickets", icon: MessageSquare },
  { title: "Reportes", url: "/admin/reports", icon: BarChart3 },
];

const coachItems = [
  { title: "Dashboard", url: "/coach", icon: Home },
  { title: "Mis Estudiantes", url: "/coach/students", icon: Users },
  { title: "Tickets", url: "/coach/tickets", icon: MessageSquare },
  { title: "Contenido", url: "/coach/content", icon: BookOpen },
];

const studentItems = [
  { title: "Dashboard", url: "/student", icon: Home },
  { title: "Mi Curso", url: "/student/course", icon: BookOpen },
  { title: "Soporte", url: "/student/support", icon: MessageSquare },
];

export function AppSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const getMenuItems = () => {
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
  };

  const menuItems = getMenuItems();

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

  return (
    <Sidebar className="border-r">
      {/* Hacemos el contenido en columnas y ocupando todo el alto */}
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

        {/* Menú: ocupa el espacio disponible, con scroll oculto */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SidebarGroup>
            <SidebarGroupLabel className="px-3">Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <TooltipProvider>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.url ||
                      (item.url !== "/" && pathname?.startsWith(item.url));
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
                                href={item.url}
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
                  })}
                </TooltipProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <Separator className="mx-3 mt-2" />

        {/* Footer fijo (no provoca scroll) */}
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
