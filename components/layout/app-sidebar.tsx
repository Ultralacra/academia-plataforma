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
  CalendarClock,
  Moon,
  Sun,
  CreditCard,
  ThumbsUp,
  ClipboardList,
  Mail,
  CircleHelp,
  FileText,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import { InstallPwaButton } from "@/components/pwa/InstallPwaButton";

/* ====================== Tipos ====================== */
type MenuItem = {
  title: string;
  url?: string;
  icon?: any;
  children?: MenuItem[];
  isSeparator?: boolean;
};

/* ====================== Menús (admin con top-level Coachs/Alumnos/Tickets + grupo “Métricas”) ====================== */
const adminItems: MenuItem[] = [
  /*  { title: "Dashboard", url: "/admin", icon: Home },
   */
  // NUEVOS top-level (mismo nivel que “Métricas”)
  { title: "Coachs", url: "/admin/teamsv2", icon: Users },
  { title: "Alumnos", url: "/admin/alumnos", icon: GraduationCap },
  { title: "Tickets", url: "/admin/tickets-board", icon: MessageSquare },
  { title: "Bonos", url: "/admin/bonos", icon: Users },
  {
    title: "Solicitud de bonos",
    url: "/admin/solicitud-bonos",
    icon: ClipboardList,
  },
  { title: "Pagos", url: "/admin/payments", icon: CreditCard },
  { title: "Chat Beta", url: "/chat/beta", icon: MessageSquare },
  { title: "Usuarios sistema", url: "/admin/users", icon: Users },
  // { title: "Brevo", url: "/admin/brevo", icon: Mail },
  { title: "Roles", url: "/admin/access/roles", icon: Settings },
  { title: "CRM", url: "/admin/crm", icon: Users },
  {
    title: "Estado correos",
    url: "/admin/brevo/events",
    icon: Mail,
  },
  {
    title: "Plantillas de mails",
    url: "/admin/plantillas-mails",
    icon: FileText,
  },
  {
    title: "Preguntas frecuentes",
    url: "/admin/preguntas-frecuentes",
    icon: CircleHelp,
  },
  {
    title: "Mensajes seguimiento",
    url: "/admin/mensajes-seguimiento",
    icon: MessageSquare,
  },

  /*  { title: "Tickets", url: "/admin/ticketsv2", icon: MessageSquare }, */

  // Grupo colapsable renombrado a “Métricas”
  {
    title: "Métricas",
    icon: BarChart3,
    children: [
      { title: "Alumnos", url: "/admin/students", icon: GraduationCap },
      { title: "Coachs", url: "/admin/teams", icon: Users },
      { title: "Tickets", url: "/admin/tickets", icon: MessageSquare },
      {
        title: "Métricas Chat",
        url: "/admin/metrics/chat",
        icon: MessageSquare,
      },
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
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems: MenuItem[] = useMemo(() => {
    // Detectar si estamos en la ficha de un alumno para añadir acceso directo al chat del alumno
    const alumnoMatch = pathname?.match(/^\/admin\/alumnos\/([^\/?#]+)/i);
    const alumnoCodeInPath = alumnoMatch?.[1];
    const userRole = (user?.role || "").toLowerCase();

    // Debug: verificar el rol del usuario
    /* console.log("User role:", user?.role, "Normalized:", userRole); */

    switch (userRole) {
      case "sales":
        return [{ title: "CRM", url: "/admin/crm", icon: Users }] as MenuItem[];
      case "admin":
        return (
          alumnoCodeInPath
            ? [
                ...adminItems,
                { title: "Vista Alumno", isSeparator: true },
                {
                  title: "Inicio",
                  url: `/admin/alumnos/${alumnoCodeInPath}/inicio`,
                  icon: Home,
                },
                {
                  title: "Mi perfil",
                  url: `/admin/alumnos/${alumnoCodeInPath}/perfil`,
                  icon: GraduationCap,
                },
                {
                  title: "Chat soporte",
                  url: `/admin/alumnos/${alumnoCodeInPath}/chat`,
                  icon: MessageSquare,
                },
                {
                  title: "Feedback",
                  url: `/admin/alumnos/${alumnoCodeInPath}/feedback`,
                  icon: ThumbsUp,
                },
                {
                  title: "Métricas ADS",
                  url: `/admin/alumnos/${alumnoCodeInPath}/ads`,
                  icon: BarChart3,
                },
                {
                  title: "Sesiones",
                  url: `/admin/alumnos/${alumnoCodeInPath}/sesiones`,
                  icon: CalendarClock,
                },
                {
                  title: "Bonos",
                  url: `/admin/alumnos/${alumnoCodeInPath}/bonos`,
                  icon: Users,
                },
                {
                  title: "Seguimiento de pagos",
                  url: `/admin/alumnos/${alumnoCodeInPath}/pagos`,
                  icon: CreditCard,
                },
              ]
            : adminItems
        ) as MenuItem[];
      case "coach":
        return (
          alumnoCodeInPath
            ? [
                ...coachItems,
                { title: "Vista Alumno", isSeparator: true },
                {
                  title: "Inicio",
                  url: `/admin/alumnos/${alumnoCodeInPath}/inicio`,
                  icon: Home,
                },
                {
                  title: "Mi perfil",
                  url: `/admin/alumnos/${alumnoCodeInPath}/perfil`,
                  icon: GraduationCap,
                },
                {
                  title: "Chat soporte",
                  url: `/admin/alumnos/${alumnoCodeInPath}/chat`,
                  icon: MessageSquare,
                },
                {
                  title: "Feedback",
                  url: `/admin/alumnos/${alumnoCodeInPath}/feedback`,
                  icon: ThumbsUp,
                },
                {
                  title: "Métricas ADS",
                  url: `/admin/alumnos/${alumnoCodeInPath}/ads`,
                  icon: BarChart3,
                },
                {
                  title: "Sesiones",
                  url: `/admin/alumnos/${alumnoCodeInPath}/sesiones`,
                  icon: CalendarClock,
                },
                {
                  title: "Bonos",
                  url: `/admin/alumnos/${alumnoCodeInPath}/bonos`,
                  icon: Users,
                },
                {
                  title: "Seguimiento de pagos",
                  url: `/admin/alumnos/${alumnoCodeInPath}/pagos`,
                  icon: CreditCard,
                },
              ]
            : (() => {
                const code = (user as any)?.codigo || "";
                const chatUrl = code
                  ? `/admin/teamsv2/${code}/chat`
                  : "/admin/teamsv2";
                // Chat debe ir justo arriba de Tickets
                return [
                  { title: "Dashboard", url: "/coach", icon: Home },
                  {
                    title: "Alumnos",
                    url: "/coach/students",
                    icon: GraduationCap,
                  },
                  { title: "Chat", url: chatUrl, icon: MessageSquare },
                  {
                    title: "Tickets",
                    url: "/coach/tickets",
                    icon: MessageSquare,
                  },
                  { title: "Bonos", url: "/admin/bonos", icon: Users },
                  { title: "Pagos", url: "/admin/payments", icon: CreditCard },
                  {
                    title: "Usuarios sistema",
                    url: "/admin/users",
                    icon: Users,
                  },
                ] as MenuItem[];
              })()
        ) as MenuItem[];
      case "equipo": {
        const code = (user as any)?.codigo || "";
        const base = code
          ? [
              {
                title: "Coachs",
                url: "/admin/teamsv2",
                icon: Users,
              },
              {
                title: "Alumnos",
                url: "/admin/alumnos",
                icon: GraduationCap,
              },
              {
                title: "Mi equipo",
                url: `/admin/teamsv2/${code}`,
                icon: Users,
              },
              {
                title: "Métricas",
                icon: BarChart3,
                children: [
                  {
                    title: "Alumnos",
                    url: "/admin/students",
                    icon: GraduationCap,
                  },
                  { title: "Coachs", url: "/admin/teams", icon: Users },
                  {
                    title: "Tickets",
                    url: "/admin/tickets",
                    icon: MessageSquare,
                  },
                ],
              },
              {
                title: "Chat",
                url: `/admin/teamsv2/${code}/chat`,
                icon: MessageSquare,
              },
              {
                title: "Tickets",
                url: "/admin/tickets-board",
                icon: MessageSquare,
              },
              { title: "Bonos", url: "/admin/bonos", icon: Users },
              {
                title: "Solicitud de bonos",
                url: "/admin/solicitud-bonos",
                icon: ClipboardList,
              },
              { title: "Pagos", url: "/admin/payments", icon: CreditCard },
              { title: "CRM", url: "/admin/crm", icon: Users },
              { title: "Usuarios sistema", url: "/admin/users", icon: Users },
              {
                title: "Estado correos",
                url: "/admin/brevo/events",
                icon: Mail,
              },
              {
                title: "Plantillas de mails",
                url: "/admin/plantillas-mails",
                icon: FileText,
              },
              {
                title: "Mensajes seguimiento",
                url: "/admin/mensajes-seguimiento",
                icon: MessageSquare,
              },
              {
                title: "Preguntas frecuentes",
                url: "/admin/preguntas-frecuentes",
                icon: CircleHelp,
              },
            ]
          : [
              {
                title: "Coachs",
                url: "/admin/teamsv2",
                icon: Users,
              },
              {
                title: "Alumnos",
                url: "/admin/alumnos",
                icon: GraduationCap,
              },
              {
                title: "Métricas",
                icon: BarChart3,
                children: [
                  {
                    title: "Alumnos",
                    url: "/admin/students",
                    icon: GraduationCap,
                  },
                  { title: "Coachs", url: "/admin/teams", icon: Users },
                  {
                    title: "Tickets",
                    url: "/admin/tickets",
                    icon: MessageSquare,
                  },
                ],
              },
              {
                title: "Tickets",
                url: "/admin/tickets-board",
                icon: MessageSquare,
              },
              { title: "Bonos", url: "/admin/bonos", icon: Users },
              {
                title: "Solicitud de bonos",
                url: "/admin/solicitud-bonos",
                icon: ClipboardList,
              },
              { title: "Pagos", url: "/admin/payments", icon: CreditCard },
              { title: "CRM", url: "/admin/crm", icon: Users },
              { title: "Usuarios sistema", url: "/admin/users", icon: Users },
              {
                title: "Estado correos",
                url: "/admin/brevo/events",
                icon: Mail,
              },
              {
                title: "Plantillas de mails",
                url: "/admin/plantillas-mails",
                icon: FileText,
              },
              {
                title: "Mensajes seguimiento",
                url: "/admin/mensajes-seguimiento",
                icon: MessageSquare,
              },
              {
                title: "Preguntas frecuentes",
                url: "/admin/preguntas-frecuentes",
                icon: CircleHelp,
              },
            ];

        // Filtrar ítems según el área del usuario equipo
        const userArea = (user?.area || "").toUpperCase();
        const filteredBase =
          userArea === "ADS" || userArea === "COPY" || userArea === "TECNICO"
            ? base.filter(
                (item) =>
                  ![
                    "CRM",
                    "Usuarios sistema",
                    "Estado correos",
                    "Plantillas de mails",
                    "Chat Beta",
                    "Pagos",
                  ].includes(item.title),
              )
            : base;

        // Añadir acceso directo al chat del alumno si estamos dentro de una ficha de alumno
        return (
          alumnoCodeInPath
            ? [
                ...filteredBase,
                { title: "Vista Alumno", isSeparator: true },
                {
                  title: "Inicio",
                  url: `/admin/alumnos/${alumnoCodeInPath}/inicio`,
                  icon: Home,
                },
                {
                  title: "Mi perfil",
                  url: `/admin/alumnos/${alumnoCodeInPath}/perfil`,
                  icon: GraduationCap,
                },
                {
                  title: "Chat soporte",
                  url: `/admin/alumnos/${alumnoCodeInPath}/chat`,
                  icon: MessageSquare,
                },
                {
                  title: "Feedback",
                  url: `/admin/alumnos/${alumnoCodeInPath}/feedback`,
                  icon: ThumbsUp,
                },
                {
                  title: "Métricas ADS",
                  url: `/admin/alumnos/${alumnoCodeInPath}/ads`,
                  icon: BarChart3,
                },
                {
                  title: "Sesiones",
                  url: `/admin/alumnos/${alumnoCodeInPath}/sesiones`,
                  icon: CalendarClock,
                },
                {
                  title: "Bonos",
                  url: `/admin/alumnos/${alumnoCodeInPath}/bonos`,
                  icon: Users,
                },
                {
                  title: "Seguimiento de pagos",
                  url: `/admin/alumnos/${alumnoCodeInPath}/pagos`,
                  icon: CreditCard,
                },
              ]
            : filteredBase
        ) as MenuItem[];
      }
      case "student": {
        const code = (user as any)?.codigo || "RvA_5Qxoezfxlxxj";
        return [
          { title: "Inicio", url: `/admin/alumnos/${code}/inicio`, icon: Home },
          {
            title: "Mi perfil",
            url: `/admin/alumnos/${code}/perfil`,
            icon: GraduationCap,
          },
          {
            title: "Chat soporte",
            url: `/admin/alumnos/${code}/chat`,
            icon: MessageSquare,
          },
          {
            title: "Feedback",
            url: `/admin/alumnos/${code}/feedback`,
            icon: ThumbsUp,
          },
          {
            title: "Bonos",
            url: `/admin/alumnos/${code}/bonos`,
            icon: Users,
          },
        ] as MenuItem[];
      }
      default:
        return [] as MenuItem[];
    }
  }, [user, pathname]);

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

  /** Formatea áreas tipo "ATENCION_AL_CLIENTE" → "Atención al cliente" */
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
    // Fallback: reemplaza _ por espacio y capitaliza primera letra
    return raw
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };
  const areaLabel = formatArea(user?.area);

  const [metricsOpen, setMetricsOpen] = useState(false);
  const roleKey = (
    userRoleForLabel === "student"
      ? "alumno"
      : userRoleForLabel === "coach" || userRoleForLabel === "equipo"
        ? "coach"
        : "admin"
  ) as "admin" | "alumno" | "coach";

  // Sumar contadores persistentes por chatId (Socket.IO) guardados en localStorage
  const [unreadByIdSum, setUnreadByIdSum] = useState<number>(0);
  useEffect(() => {
    function compute() {
      try {
        if (typeof window === "undefined") return;
        const prefix = `chatUnreadById:${roleKey}:`;
        let sum = 0;
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i) as string;
          if (!k || !k.startsWith(prefix)) continue;
          const v = parseInt(window.localStorage.getItem(k) || "0", 10);
          if (!isNaN(v)) sum += v;
        }
        setUnreadByIdSum(sum);
      } catch {}
    }
    compute();
    function onCountUpdated() {
      compute();
    }
    function onStorage(ev: StorageEvent) {
      try {
        if (!ev.key) return;
        if (ev.key.startsWith(`chatUnreadById:${roleKey}:`)) compute();
      } catch {}
    }
    window.addEventListener("chat:unread-count-updated", onCountUpdated as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(
        "chat:unread-count-updated",
        onCountUpdated as any,
      );
      window.removeEventListener("storage", onStorage);
    };
  }, [roleKey]);
  const unreadGrandTotal = unreadByIdSum || 0;

  useEffect(() => {
    if (!pathname) return;
    // Abre “Métricas” si navegamos a alguna subruta de métricas
    if (pathname.startsWith("/admin/metrics")) setMetricsOpen(true);
  }, [pathname]);

  const bestActiveUrl = useMemo(() => {
    try {
      const p = String(pathname || "");
      const matches = (url?: string) => {
        if (!url) return false;
        if (url === "/") return p === "/";
        if (p === url) return true;
        return p.startsWith(url.endsWith("/") ? url : `${url}/`);
      };

      const urls: string[] = [];
      for (const it of menuItems) {
        if (it?.url && !it.children?.length) urls.push(it.url);
        if (Array.isArray(it.children)) {
          for (const ch of it.children) {
            if (ch?.url) urls.push(ch.url);
          }
        }
      }
      let best: string | null = null;
      for (const u of urls) {
        if (!matches(u)) continue;
        if (!best || u.length > best.length) best = u;
      }
      return best;
    } catch {
      return null;
    }
  }, [menuItems, pathname]);

  return (
    <Sidebar className="border-r border-sidebar-border/40 bg-sidebar backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar/80">
      <SidebarContent className="flex h-full flex-col overflow-x-hidden">
        {/* Header — perfil de usuario */}
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/30 px-3 py-3 backdrop-blur-sm border border-sidebar-border/20">
            <div className="relative shrink-0">
              <img
                src="https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg"
                alt="Logo"
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-sidebar-border/50 shadow-md"
                loading="eager"
              />
              {/* Indicador en línea sobre el avatar */}
              {mounted && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 ring-2 ring-sidebar"></span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
                {user?.name ?? user?.email ?? "Usuario"}
              </p>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className="h-5 px-2 text-[10px] font-medium rounded-md border-sidebar-border/50 text-muted-foreground bg-sidebar-accent/40"
                >
                  {roleLabel}
                </Badge>
                {areaLabel && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-2 text-[10px] font-medium rounded-md"
                  >
                    {areaLabel}
                  </Badge>
                )}
              </div>
              {mounted && (
                <p className="mt-1.5 text-[10px] text-muted-foreground/70 capitalize">
                  {new Date().toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              )}
              {(user?.role === "student" || user?.role === "equipo") &&
                (user as any)?.codigo && (
                  <div className="mt-1 text-[10px] text-muted-foreground/70 truncate">
                    Código:{" "}
                    <code className="text-sidebar-foreground font-mono text-[10px]">
                      {(user as any).codigo}
                    </code>
                  </div>
                )}
            </div>
          </div>
        </div>

        <Separator className="mx-4 bg-sidebar-border/30" />

        {/* Navegación */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-1">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50">
              Navegación
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                <TooltipProvider delayDuration={300}>
                  {menuItems.map((item, index) => {
                    if (item.isSeparator) {
                      return (
                        <div key={`sep-${index}`} className="mt-5 mb-2 px-1">
                          <div className="flex items-center gap-2.5">
                            <Separator className="flex-1 bg-sidebar-border/30" />
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold whitespace-nowrap">
                              {item.title}
                            </span>
                            <Separator className="flex-1 bg-sidebar-border/30" />
                          </div>
                        </div>
                      );
                    }

                    const Icon = item.icon;

                    // Enlace simple
                    if (!item.children?.length) {
                      const active = !!item.url && bestActiveUrl === item.url;

                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "group relative overflow-hidden rounded-lg px-3 py-2 text-sm transition-all duration-150",
                                  active
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                    : "hover:bg-sidebar-accent/40 text-sidebar-foreground",
                                )}
                              >
                                <Link
                                  href={item.url ?? "#"}
                                  className="flex items-center gap-3"
                                >
                                  {/* Barra lateral activa */}
                                  <span
                                    className={cn(
                                      "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-foreground transition-all duration-200",
                                      active
                                        ? "opacity-100 scale-y-100"
                                        : "opacity-0 scale-y-0",
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                                      active
                                        ? "bg-foreground/10"
                                        : "bg-transparent group-hover:bg-sidebar-accent/60",
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        "h-4 w-4 transition-colors duration-150",
                                        active
                                          ? "text-sidebar-accent-foreground"
                                          : "text-muted-foreground group-hover:text-sidebar-foreground",
                                      )}
                                    />
                                  </span>
                                  <span className="truncate flex items-center gap-2 font-medium">
                                    {item.title}
                                    {(item.url?.includes("/chat") ||
                                      item.title
                                        .toLowerCase()
                                        .includes("chat")) &&
                                      unreadGrandTotal > 0 && (
                                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
                                          {unreadGrandTotal > 99
                                            ? "99+"
                                            : unreadGrandTotal}
                                        </span>
                                      )}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="text-xs rounded-lg"
                            >
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      );
                    }

                    // Grupo “Métricas”
                    const isAnyChildActive = item.children?.some(
                      (c) => !!c.url && bestActiveUrl === c.url,
                    );

                    return (
                      <SidebarMenuItem key={item.title}>
                        <button
                          type="button"
                          onClick={() => setMetricsOpen((v) => !v)}
                          className={cn(
                            "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150",
                            metricsOpen || isAnyChildActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                              : "hover:bg-sidebar-accent/40 text-sidebar-foreground",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                                metricsOpen || isAnyChildActive
                                  ? "bg-foreground/10"
                                  : "bg-transparent group-hover:bg-sidebar-accent/60",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4 transition-colors duration-150",
                                  metricsOpen || isAnyChildActive
                                    ? "text-sidebar-accent-foreground"
                                    : "text-muted-foreground group-hover:text-sidebar-foreground",
                                )}
                              />
                            </span>
                            <span className="truncate font-medium">
                              {item.title}
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200 text-muted-foreground/60",
                              metricsOpen ? "rotate-180" : "rotate-0",
                            )}
                          />
                        </button>

                        {/* Submenú colapsable */}
                        <div
                          className={cn(
                            "mt-1 grid overflow-hidden transition-all duration-200",
                            metricsOpen
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0",
                          )}
                        >
                          <div className="min-h-0">
                            <ul className="my-1 ml-6 border-l-2 border-sidebar-border/30 pl-3 space-y-0.5">
                              {item.children?.map((child) => {
                                const CIcon = child.icon;
                                const active =
                                  !!child.url && bestActiveUrl === child.url;
                                return (
                                  <li key={child.title} className="relative">
                                    <Link
                                      href={child.url ?? "#"}
                                      className={cn(
                                        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-150",
                                        active
                                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                          : "hover:bg-sidebar-accent/40 text-sidebar-foreground",
                                      )}
                                    >
                                      {/* Dot activo */}
                                      <span
                                        className={cn(
                                          "absolute -left-[15px] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-foreground transition-all duration-200",
                                          active
                                            ? "opacity-100 scale-100"
                                            : "opacity-0 scale-0",
                                        )}
                                      />
                                      <CIcon
                                        className={cn(
                                          "h-3.5 w-3.5 transition-colors duration-150",
                                          active
                                            ? "text-sidebar-accent-foreground"
                                            : "text-muted-foreground",
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

        {/* Footer */}
        <Separator className="mx-4 mt-2 bg-sidebar-border/30" />
        <div className="px-4 py-3 flex flex-col items-center gap-2.5">
          {isMobile ? (
            <div className="w-full">
              <div className="flex items-center justify-center">
                <InstallPwaButton compact />
              </div>
            </div>
          ) : null}
          {!isMobile ? (
            <div className="w-full rounded-xl border border-sidebar-border/30 bg-sidebar-accent/15 backdrop-blur-sm px-3 py-2.5 text-[11px] text-muted-foreground/80">
              <div className="font-semibold text-sidebar-foreground text-xs">
                📱 Úsala desde tu teléfono
              </div>
              <div className="mt-1 leading-relaxed">
                En móvil puedes instalarla (Agregar a pantalla de inicio).
              </div>
            </div>
          ) : null}
          <p className="text-[10px] text-muted-foreground/50 text-center tracking-wide">
            {new Date().getFullYear()} • Workspace
          </p>
          {/*  <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors"
            title={
              theme === "dark"
                ? "Cambiar a modo claro"
                : "Cambiar a modo oscuro"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button> */}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
