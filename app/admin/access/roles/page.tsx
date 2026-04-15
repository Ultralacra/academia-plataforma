"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  KeyRound,
  Minus,
  Pencil,
  Shield,
  ShieldCheck,
  Users,
  GraduationCap,
  Headphones,
  TrendingUp,
  Crown,
  Eye,
  Settings,
  BarChart3,
  MessageSquare,
  CreditCard,
  ClipboardList,
  FileText,
  Mail,
} from "lucide-react";
import {
  assignPermissionToRole,
  createRole,
  fetchPermissionsList,
  fetchRolePermissions,
  fetchRoles,
  unassignPermissionFromRole,
  updateRole,
  type Permission,
  type Role,
} from "./api";

/* ========================================================================
   DOCUMENTACIÓN DEL SISTEMA — Roles, permisos y matriz de acceso
   ======================================================================== */

/** Definición completa de cada rol del sistema */
const ROLE_DOCS: {
  key: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  summary: string;
  description: string;
  loginRedirect: string;
  capabilities: string[];
  restrictions: string[];
}[] = [
  {
    key: "admin",
    label: "Admin / Administrador",
    icon: Crown,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    summary:
      "Control total del sistema. Supervisión, configuración y gestión global.",
    description:
      "El administrador tiene acceso completo a todos los módulos del sistema. Es responsable de la configuración general, la gestión de usuarios, la supervisión de equipos, la asignación de roles y permisos, y la auditoría de toda la operación. Puede ver y gestionar todos los datos sin restricciones.",
    loginRedirect: "/admin/tickets-board",
    capabilities: [
      "Acceso total a todos los módulos sin restricciones",
      "Gestión de usuarios del sistema (crear, editar, asignar roles)",
      "Creación y edición de roles y permisos",
      "Administración de alumnos: ver perfil, progreso, historial, asignar coaches, gestionar pausas, contratos",
      "Tablero global de tickets: visibilidad completa, filtros, reasignaciones, supervisión",
      "Módulo de pagos: consultar estados, cuotas, trazabilidad",
      "Catálogo de bonos: crear, editar, eliminar, activar/inactivar",
      "Solicitudes de bonos: ver listado, revisar detalle, coordinar ejecución",
      "CRM/Ventas: pipeline comercial, campañas, booking, contratos",
      "Métricas y reportes: alumnos, tickets, equipos, productividad, ADS, sesiones, chat",
      "Comunicaciones Brevo: gestión de campañas de email marketing",
      "Plantillas de mails y contratos: administración de plantillas del sistema",
      "Configuración de opciones/catálogos del sistema",
      "Chat general: acceso a todas las conversaciones",
      "Preguntas frecuentes: administración del catálogo de FAQ",
      "Mensajes de seguimiento: gestión de mensajes automáticos",
    ],
    restrictions: [
      "No tiene restricciones funcionales dentro de la plataforma",
    ],
  },
  {
    key: "coach",
    label: "Coach / Entrenador",
    icon: Users,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    summary: "Seguimiento y acompañamiento de alumnos asignados.",
    description:
      "El coach es el responsable principal del seguimiento de los alumnos que tiene asignados. Puede ver el perfil, progreso y estado de sus alumnos, gestionar tareas, atender tickets/feedback, y coordinar sesiones. Tiene visibilidad sobre métricas operativas relevantes para su cartera.",
    loginRedirect: "/admin/teamsv2",
    capabilities: [
      "Ver perfil del alumno: progreso, etapa/estado, historial, actividad",
      "Actualizar datos operativos del alumno (nombre, última tarea, etc.)",
      "Gestionar tareas internas del alumno (crear, marcar completadas)",
      "Asignar/quitar coaches cuando corresponde",
      "Registrar y gestionar pausas del alumno (fechas, tipo, motivo)",
      "Subir/descargar y consultar contratos del alumno",
      "Seguimiento de sesiones (flujo completo)",
      "Atender tickets/feedback: actualizar estados, comentarios públicos e internos, adjuntos",
      "Seguimiento de pagos: revisar estados y cuotas",
      "Métricas de equipos/productividad y métricas ADS",
      "Ver bonos del alumno y catálogo de bonos",
    ],
    restrictions: [
      "No puede gestionar usuarios del sistema",
      "No puede crear ni editar roles/permisos",
      "No accede a comunicaciones Brevo",
      "No puede acceder al CRM/Ventas (salvo que sea parte del flujo)",
      "No puede eliminar registros del sistema",
      "No puede modificar opciones/catálogos del sistema",
    ],
  },
  {
    key: "equipo",
    label: "Equipo",
    icon: ShieldCheck,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    summary:
      "Operación interna y soporte. Acceso similar al admin con ciertas restricciones.",
    description:
      'El rol "equipo" está pensado para el personal interno que necesita acceso a las vistas administrativas pero con algunas restricciones según su área. En el sistema, el rol equipo se normaliza para ver las mismas vistas que el admin, pero con filtros según el área asignada (ej. ATENCION_AL_CLIENTE). Puede acceder a tickets, alumnos, pagos, bonos y CRM según configuración.',
    loginRedirect: "/admin/tickets-board",
    capabilities: [
      "Tablero de tickets: visibilidad, filtros y gestión",
      "Gestión de alumnos: perfil, progreso, pausas, contratos",
      "Seguimiento de pagos",
      "Gestión de bonos y solicitudes de bonos",
      "CRM/Ventas (según área asignada)",
      "Chat general",
      "Métricas operativas (según área)",
    ],
    restrictions: [
      "No puede gestionar roles y permisos",
      'Según el área (ej. ATENCION_AL_CLIENTE), se filtran módulos como "Opciones", "Usuarios sistema" y "Pagos"',
      "No puede acceder a configuraciones del sistema",
      "No puede gestionar usuarios del sistema",
    ],
  },
  {
    key: "atc",
    label: "ATC / Soporte",
    icon: Headphones,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    summary:
      "Atención al cliente: chat, tickets y operación diaria con alumnos.",
    description:
      "El rol ATC (Atención al Cliente) se enfoca en la operación diaria de soporte. Atiende conversaciones por chat, da seguimiento a tickets, gestiona información operativa de alumnos y apoya en la coordinación de bonos y pagos. Tiene acceso directo al módulo de alumnos.",
    loginRedirect: "/admin/alumnos",
    capabilities: [
      "Atender conversaciones en chat de soporte",
      "Dar seguimiento a tickets/feedback",
      "Consultar perfil, etapa/estado del alumno",
      "Crear/gestionar pausas del alumno",
      "Apoyar en contratos (subida/consulta)",
      "Ver listado de solicitudes de bonos y coordinar ejecución",
      "Revisar estado de pagos y cuotas",
      "Coordinar sesiones (según flujo definido)",
    ],
    restrictions: [
      "No puede gestionar usuarios del sistema",
      "No puede crear ni editar roles/permisos",
      "No accede a comunicaciones Brevo",
      "No puede modificar opciones/catálogos",
      "No tiene acceso al tablero global de tickets como supervisor",
    ],
  },
  {
    key: "sales",
    label: "Sales / Ventas",
    icon: TrendingUp,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    summary: "Gestión comercial: CRM, pipeline de ventas, campañas y booking.",
    description:
      "El rol de ventas está orientado exclusivamente a la gestión comercial. Tiene acceso al CRM para dar seguimiento a oportunidades, gestionar el pipeline, organizar campañas y procesos de booking/agendamiento. Su vista está restringida únicamente al módulo CRM.",
    loginRedirect: "/admin/crm",
    capabilities: [
      "CRM: seguimiento de oportunidades y procesos comerciales",
      "Pipeline comercial: registrar y dar seguimiento a ventas",
      "Campañas: módulos de campañas y booking/agendamiento",
      "Registro y actualización de leads/prospectos",
      "Generación de contratos/documentos desde plantillas",
    ],
    restrictions: [
      "Solo ve el módulo CRM — no tiene acceso a otros módulos",
      "No puede ver alumnos, tickets, bonos ni pagos",
      "No accede a métricas de equipos ni productividad",
      "No puede gestionar usuarios ni roles",
      "No accede a comunicaciones Brevo",
      "No puede modificar opciones del sistema",
    ],
  },
  {
    key: "student",
    label: "Alumno / Student",
    icon: GraduationCap,
    color: "text-teal-700 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    borderColor: "border-teal-200 dark:border-teal-800",
    summary:
      "Usuario final del programa. Acceso limitado a su propio perfil y herramientas.",
    description:
      "El alumno es el usuario final que recibe el servicio. Solo puede acceder a su propio perfil y las herramientas destinadas a él: ver su progreso, usar el chat de soporte, crear tickets de feedback, consultar sus tareas, solicitar bonos y coordinar sesiones. Está estrictamente restringido a su propia información.",
    loginRedirect: "/admin/alumnos/{codigo}",
    capabilities: [
      "Ver su perfil, progreso, etapa/estado y evolución",
      "Chat de soporte: escribir y dar seguimiento a conversaciones",
      "Crear solicitudes de feedback/ayuda (tickets) y dar seguimiento",
      "Ver respuestas y comentarios públicos del equipo",
      "Ver tareas asignadas y su estado de completitud",
      "Solicitar/coordinar sesiones dentro del flujo definido",
      "Ver bonos asignados y solicitar bonos específicos (con formularios guiados)",
    ],
    restrictions: [
      "Solo puede ver su propio perfil — redirigido automáticamente si intenta acceder a otra ruta",
      "No puede ver información de otros alumnos",
      "No puede administrar pagos ni paneles internos",
      "No puede editar estado/etapa, gestionar pausas ni asignar coaches",
      "No accede a métricas internas (ADS, equipos, etc.)",
      "No puede ver notas internas del equipo en tickets",
      "No puede ver paneles de administración",
    ],
  },
];

/** Matriz de acceso por módulo */
type AccessLevel = "full" | "limited" | "view" | "none";
const ACCESS_MATRIX: {
  module: string;
  category: string;
  description: string;
  access: Record<string, AccessLevel>;
}[] = [
  {
    module: "Perfil y progreso del alumno",
    category: "Alumnos",
    description:
      "Ver información del alumno, etapa/estado, historial y evolución dentro del programa.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "view",
    },
  },
  {
    module: "Gestión de coaches del alumno",
    category: "Alumnos",
    description: "Asignar, quitar o ajustar coaches para un alumno.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "limited",
      atc: "limited",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Pausas del alumno",
    category: "Alumnos",
    description:
      "Registrar períodos de pausa con fechas, tipo y motivo. Editar o agregar pausas.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Contratos del alumno",
    category: "Alumnos",
    description: "Subir, descargar y consultar el contrato asociado al alumno.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Tareas del alumno",
    category: "Alumnos",
    description: "Crear y gestionar tareas internas del alumno.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "view",
    },
  },
  {
    module: "Chat de soporte",
    category: "Comunicación",
    description:
      "Comunicación en tiempo real entre alumnos y el equipo de soporte.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "full",
    },
  },
  {
    module: "Chat general (admin)",
    category: "Comunicación",
    description:
      "Vista de todas las conversaciones del sistema para supervisión.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "full",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Tickets / Feedback (alumno)",
    category: "Tickets",
    description: "Crear solicitudes, dar seguimiento, ver respuestas públicas.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "limited",
    },
  },
  {
    module: "Tablero global de tickets",
    category: "Tickets",
    description:
      "Vista kanban/tabla de todos los tickets con filtros, reasignaciones y supervisión.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "full",
      atc: "limited",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Observaciones y tareas por ticket",
    category: "Tickets",
    description:
      "Registro de observaciones, clasificación por área, adjuntar evidencias.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Sesiones (solicitud/seguimiento)",
    category: "Operación",
    description:
      "Flujo completo de sesiones: solicitar, ofrecer, aprobar, aceptar, completar.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "limited",
    },
  },
  {
    module: "Bonos (catálogo)",
    category: "Bonos y Pagos",
    description:
      "Crear, editar, eliminar y activar/inactivar bonos del catálogo.",
    access: {
      admin: "full",
      coach: "view",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Bonos del alumno (ver/solicitar)",
    category: "Bonos y Pagos",
    description:
      "Ver bonos asignados y solicitar bonos específicos con formularios guiados.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "limited",
    },
  },
  {
    module: "Solicitudes de bonos",
    category: "Bonos y Pagos",
    description:
      "Listado y detalle de solicitudes de bonos enviadas por alumnos.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Pagos (seguimiento)",
    category: "Bonos y Pagos",
    description:
      "Consultar pagos, cuotas, estados (pendiente, pagado, moroso, etc.).",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "CRM / Ventas",
    category: "CRM",
    description: "Pipeline comercial, campañas, booking/agendamiento, leads.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "limited",
      atc: "limited",
      sales: "full",
      student: "none",
    },
  },
  {
    module: "Métricas de alumnos",
    category: "Métricas",
    description:
      "Distribución por estado/fase, ingresos, tiempos por fase, retención.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Métricas de tickets",
    category: "Métricas",
    description:
      "Totales, tendencias, tiempos de resolución, primera respuesta.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Métricas por coach",
    category: "Métricas",
    description: "Cartera del coach, alumnos por fase, tickets, listados.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Métricas de chat",
    category: "Métricas",
    description:
      "Auditoría de conversaciones, participación y conteos por participante.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "full",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Métricas ADS",
    category: "Métricas",
    description:
      "KPIs de Ads: inversión, facturación, ROAS, listados por alumno/fase.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Métricas de equipos/productividad",
    category: "Métricas",
    description:
      "Totales generales, tickets por período, comparativos por coach/equipo.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Usuarios del sistema",
    category: "Administración",
    description:
      "Crear, editar y gestionar usuarios internos con asignación de roles.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Roles y permisos",
    category: "Administración",
    description:
      "Crear y editar roles, asignar/desasignar permisos granulares.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Opciones / Catálogos",
    category: "Administración",
    description:
      "Administración de opciones configurables del sistema (etapas, estados, etc.).",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Comunicaciones Brevo",
    category: "Administración",
    description: "Estado de correos, campañas de email marketing y eventos.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Plantillas de mails",
    category: "Administración",
    description: "Gestión de plantillas de correos del sistema.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Plantillas de contratos",
    category: "Administración",
    description: "Gestión de plantillas usadas para generar contratos.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Preguntas frecuentes",
    category: "Administración",
    description: "Administración del catálogo de preguntas frecuentes.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "Mensajes de seguimiento",
    category: "Administración",
    description: "Gestión de mensajes automáticos de seguimiento.",
    access: {
      admin: "full",
      coach: "none",
      equipo: "none",
      atc: "none",
      sales: "none",
      student: "none",
    },
  },
  {
    module: "PWA / Notificaciones push",
    category: "General",
    description:
      "Instalación como app y notificaciones push cuando el entorno lo permite.",
    access: {
      admin: "full",
      coach: "full",
      equipo: "full",
      atc: "full",
      sales: "full",
      student: "full",
    },
  },
];

/** Información técnica del sistema de autenticación */
const AUTH_DOCS = {
  title: "Sistema de Autenticación y Autorización",
  sections: [
    {
      title: "Flujo de autenticación",
      items: [
        "El usuario ingresa email y contraseña en la pantalla de login.",
        "Se envía la solicitud al backend API (/auth/login) y se obtiene un token JWT.",
        "El token se almacena en localStorage bajo la clave 'academy_auth'.",
        "En cada carga de página, se verifica el token llamando a /auth/me.",
        "Si el token es inválido o expirado, se intenta un refresh automático (/auth/refresh).",
        "Si el refresh falla, se cierra la sesión y se redirige al login.",
      ],
    },
    {
      title: "Normalización de roles",
      items: [
        "Los roles se normalizan al iniciar sesión para mapear variantes del backend.",
        '"equipo" y "team" → se mapean al rol interno "equipo".',
        '"alumno", "cliente", "usuario", "user" → se mapean a "student".',
        '"soporte", "atencion", "customer_support" → se mapean a "atc".',
        '"ventas", "venta" → se mapean a "sales".',
        '"administrator", "superadmin" → se mapean a "admin".',
        "Se prioriza el campo 'role' sobre el campo 'tipo' para la normalización.",
      ],
    },
    {
      title: "Protección de rutas (frontend)",
      items: [
        "Cada página admin usa el componente <ProtectedRoute allowedRoles={[...]}> para restringir acceso.",
        "Si el usuario no tiene un rol permitido, se le redirige según su rol:",
        "  • student → /admin/alumnos/{su código} (solo su propio perfil)",
        "  • equipo → /admin/tickets-board",
        "  • otros → página de 'Acceso denegado'",
        "Los estudiantes están estrictamente limitados: si intentan acceder a cualquier ruta que no sea su propio perfil, son redirigidos automáticamente.",
        "Los usuarios 'equipo' pueden ver tickets, alumnos, pagos, bonos y CRM según su área.",
      ],
    },
    {
      title: "Cache y rendimiento",
      items: [
        "La llamada a /auth/me se cachea por 30 segundos para evitar spameo de requests.",
        "Se deduplican solicitudes simultáneas a /auth/me (muchos componentes llaman useAuth()).",
        "El refresh de token también se deduplica para evitar race conditions.",
      ],
    },
  ],
};

/** Sidebar navigation por rol */
const SIDEBAR_DOCS: { role: string; label: string; items: string[] }[] = [
  {
    role: "admin",
    label: "Admin",
    items: [
      "Coachs (/admin/teamsv2)",
      "Alumnos (/admin/alumnos)",
      "Tickets (/admin/tickets-board)",
      "Bonos (/admin/bonos)",
      "Solicitud de bonos (/admin/solicitud-bonos)",
      "Pagos (/admin/payments)",
      "Chat general (/chat/beta)",
      "Usuarios sistema (/admin/users)",
      "Roles y permisos (/admin/access/roles)",
      "CRM (/admin/crm)",
      "Estado correos (/admin/brevo/events)",
      "Plantillas de mails (/admin/plantillas-mails)",
      "Plantillas de contratos (/admin/plantillas-contratos)",
      "Preguntas frecuentes (/admin/preguntas-frecuentes)",
      "Mensajes seguimiento (/admin/mensajes-seguimiento)",
      "Métricas → Alumnos, Coachs, Tickets, Chat",
      "Opciones (/admin/opciones)",
    ],
  },
  {
    role: "coach",
    label: "Coach",
    items: [
      "Mis métricas personales (/admin/teamsv2/{código})",
      "Alumnos de su cartera",
      "Tickets de sus alumnos",
    ],
  },
  {
    role: "equipo",
    label: "Equipo",
    items: [
      "Tickets (/admin/tickets-board)",
      "Alumnos (/admin/alumnos)",
      "Pagos (/admin/payments) — según área",
      "Bonos y solicitudes de bonos",
      "CRM (/admin/crm) — según área",
      "Nota: se filtran módulos según el área del usuario (ej. ATENCION_AL_CLIENTE no ve Opciones, Usuarios, Pagos)",
    ],
  },
  {
    role: "sales",
    label: "Sales / Ventas",
    items: ["CRM (/admin/crm) — único módulo disponible"],
  },
  {
    role: "student",
    label: "Alumno",
    items: [
      "Inicio (/admin/alumnos/{código}/inicio)",
      "Mi perfil (/admin/alumnos/{código}/perfil)",
      "Chat soporte (/admin/alumnos/{código}/chat)",
      "Feedback (/admin/alumnos/{código}/feedback)",
      "Mis tareas (/admin/alumnos/{código}/homework)",
      "Sesiones (/admin/alumnos/{código}/sesiones)",
      "Bonos (/admin/alumnos/{código}/bonos)",
    ],
  },
];

/* Componente de celda para la matriz */
function AccessCell({ level }: { level: AccessLevel }) {
  switch (level) {
    case "full":
      return (
        <div className="flex items-center justify-center">
          <div
            className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-1"
            title="Acceso completo"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      );
    case "limited":
      return (
        <div className="flex items-center justify-center">
          <div
            className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-1"
            title="Acceso limitado"
          >
            <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      );
    case "view":
      return (
        <div className="flex items-center justify-center">
          <div
            className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-1"
            title="Solo lectura"
          >
            <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      );
    case "none":
    default:
      return (
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-muted p-1" title="Sin acceso">
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      );
  }
}

/* Componente de la vista de documentación */
function SystemDocumentation() {
  const [matrixFilter, setMatrixFilter] = useState("");

  const categories = useMemo(() => {
    const cats = [...new Set(ACCESS_MATRIX.map((m) => m.category))];
    return cats;
  }, []);

  const filteredMatrix = useMemo(() => {
    const term = matrixFilter.trim().toLowerCase();
    if (!term) return ACCESS_MATRIX;
    return ACCESS_MATRIX.filter(
      (m) =>
        m.module.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term),
    );
  }, [matrixFilter]);

  const roleKeys = ["admin", "coach", "equipo", "atc", "sales", "student"];
  const roleLabels: Record<string, string> = {
    admin: "Admin",
    coach: "Coach",
    equipo: "Equipo",
    atc: "ATC",
    sales: "Sales",
    student: "Alumno",
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="h-8 w-8 text-primary mt-1 shrink-0" />
          <div>
            <h2 className="text-xl font-bold">
              Documentación del Sistema de Roles y Permisos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Referencia completa sobre los roles existentes en la plataforma,
              qué puede hacer cada uno, la matriz de acceso por módulo y el
              sistema de autenticación. Esta página es de solo lectura y sirve
              como documentación interna del sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Leyenda de la matriz */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-1">
            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span>Acceso completo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-1">
            <Eye className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
          <span>Acceso parcial / limitado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-1">
            <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </div>
          <span>Solo lectura</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="rounded-full bg-muted p-1">
            <Minus className="h-3 w-3 text-muted-foreground" />
          </div>
          <span>Sin acceso</span>
        </div>
      </div>

      {/* ====== 1. ROLES DEL SISTEMA ====== */}
      <section>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5" />
          1. Roles del Sistema
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          El sistema tiene <strong>6 roles</strong> principales. Cada rol
          determina a qué módulos puede acceder el usuario, qué acciones puede
          realizar y qué restricciones tiene. Los roles se asignan a cada
          usuario y se normalizan al iniciar sesión.
        </p>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROLE_DOCS.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.key}
                className={`rounded-lg border p-4 ${role.bgColor} ${role.borderColor}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${role.color}`} />
                  <h4 className="font-semibold">{role.label}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {role.summary}
                </p>
                <Badge variant="outline" className="text-xs mb-2">
                  Redirect: {role.loginRedirect}
                </Badge>
              </div>
            );
          })}
        </div>
      </section>

      {/* ====== 2. DETALLE POR ROL (Accordion) ====== */}
      <section>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5" />
          2. Detalle por Rol — Capacidades y Restricciones
        </h3>

        <Accordion type="multiple" className="space-y-2">
          {ROLE_DOCS.map((role) => {
            const Icon = role.icon;
            return (
              <AccordionItem
                key={role.key}
                value={role.key}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${role.color}`} />
                    <span className="font-medium">{role.label}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {role.key}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm">{role.description}</p>

                    <div>
                      <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                        ✓ Capacidades ({role.capabilities.length})
                      </h5>
                      <ul className="space-y-1">
                        {role.capabilities.map((cap, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-start gap-2"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                        ✗ Restricciones ({role.restrictions.length})
                      </h5>
                      <ul className="space-y-1">
                        {role.restrictions.map((res, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-start gap-2"
                          >
                            <Minus className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                            <span>{res}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded border p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        <strong>Redirect al hacer login:</strong>{" "}
                        {role.loginRedirect}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>

      {/* ====== 3. MATRIZ DE ACCESO ====== */}
      <section>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" />
          3. Matriz de Acceso por Módulo
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Tabla completa que muestra el nivel de acceso de cada rol a cada
          módulo del sistema. Usa el buscador para filtrar por nombre de módulo,
          categoría o descripción.
        </p>

        <Input
          className="max-w-sm mb-3"
          placeholder="Filtrar módulos..."
          value={matrixFilter}
          onChange={(e) => setMatrixFilter(e.target.value)}
        />

        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="min-w-[140px]">Categoría</TableHead>
                <TableHead className="min-w-[200px]">Módulo</TableHead>
                {roleKeys.map((rk) => (
                  <TableHead key={rk} className="text-center min-w-[70px]">
                    {roleLabels[rk]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatrix.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50">
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs whitespace-nowrap"
                    >
                      {row.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{row.module}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.description}
                      </p>
                    </div>
                  </TableCell>
                  {roleKeys.map((rk) => (
                    <TableCell key={rk}>
                      <AccessCell level={row.access[rk] || "none"} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {filteredMatrix.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-sm text-muted-foreground"
                  >
                    No se encontraron módulos con ese criterio.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ====== 4. NAVEGACIÓN POR ROL ====== */}
      <section>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" />
          4. Navegación Lateral (Sidebar) por Rol
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Cada rol ve un menú lateral (sidebar) diferente. Esto es lo que ve
          cada uno al iniciar sesión:
        </p>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SIDEBAR_DOCS.map((sd) => (
            <div key={sd.role} className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="secondary">{sd.label}</Badge>
              </h4>
              <ul className="space-y-1">
                {sd.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-primary mt-0.5">•</span>
                    <span className="font-mono text-xs">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 5. SISTEMA DE AUTENTICACIÓN ====== */}
      <section>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5" />
          5. {AUTH_DOCS.title}
        </h3>

        <div className="space-y-4">
          {AUTH_DOCS.sections.map((section, idx) => (
            <div key={idx} className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">{section.title}</h4>
              <ol className="space-y-1 list-decimal list-inside">
                {section.items.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 6. RESUMEN DE PERMISOS API ====== */}
      <section>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5" />
          6. Permisos Granulares (API)
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Además de los roles, el sistema soporta{" "}
          <strong>permisos granulares</strong> que se asignan a cada rol desde
          la API. Estos permisos controlan el acceso a endpoints específicos del
          backend. Puedes gestionarlos desde la pestaña &quot;Gestión de
          Roles&quot;.
        </p>
        <div className="rounded-lg border p-4 bg-muted/30">
          <h4 className="font-semibold mb-2">
            Endpoints de la API de permisos
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground font-mono">
            <li>GET /v1/access/roles — Listar roles (paginado, búsqueda)</li>
            <li>POST /v1/access/roles — Crear un nuevo rol</li>
            <li>PUT /v1/access/roles/:id — Actualizar un rol</li>
            <li>
              GET /v1/access/roles/permissions/list — Listar todos los permisos
              del catálogo
            </li>
            <li>
              GET /v1/access/roles/:id/permissions — Obtener permisos de un rol
            </li>
            <li>
              POST /v1/access/roles/:id/permissions — Asignar permiso a un rol
            </li>
            <li>
              DELETE /v1/access/roles/:id/permissions/:permiso — Desasignar
              permiso de un rol
            </li>
          </ul>
        </div>
      </section>

      {/* ====== 7. NOTAS IMPORTANTES ====== */}
      <section>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          7. Notas Importantes
        </h3>
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Normalización de roles
            </h4>
            <p className="text-sm text-muted-foreground">
              El backend puede enviar variantes de nombre de rol (ej.
              &quot;alumno&quot;, &quot;cliente&quot;, &quot;usuario&quot;). El
              frontend normaliza estos valores automáticamente. Si se agrega un
              nuevo rol en el backend, debe actualizarse la función{" "}
              <code className="bg-muted px-1 rounded">normalizeRole()</code> en{" "}
              <code className="bg-muted px-1 rounded">lib/auth.ts</code>.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Filtro de equipo por área
            </h4>
            <p className="text-sm text-muted-foreground">
              Los usuarios con rol &quot;equipo&quot; pueden tener un área
              asignada (ej. ATENCION_AL_CLIENTE). El sidebar filtra módulos
              automáticamente según el área. Esto se configura en{" "}
              <code className="bg-muted px-1 rounded">
                components/layout/app-sidebar.tsx
              </code>
              .
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Protección de rutas
            </h4>
            <p className="text-sm text-muted-foreground">
              Cada página usa{" "}
              <code className="bg-muted px-1 rounded">
                &lt;ProtectedRoute allowedRoles={"{[...]}"}&gt;
              </code>{" "}
              para restringir acceso. Si un usuario intenta acceder a una ruta
              no permitida, se le redirige automáticamente según su rol. Esto se
              controla en{" "}
              <code className="bg-muted px-1 rounded">
                components/auth/protected-route.tsx
              </code>
              .
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">
              Permisos en el backend
            </h4>
            <p className="text-sm text-muted-foreground">
              Los permisos granulares se validan en el backend (API). El
              frontend solo controla la visibilidad de la interfaz mediante
              roles. Para un control fino del acceso a datos, los endpoints del
              backend verifican permisos individualmente.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================
   COMPONENTE ORIGINAL DE GESTIÓN DE ROLES (con funcionalidad CRUD)
   ======================================================================== */

function RolesContent() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<
    Permission[]
  >([]);
  const [loadingPermissionsCatalog, setLoadingPermissionsCatalog] =
    useState(false);
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<
    Record<string, boolean>
  >({});
  const [permissionSearch, setPermissionSearch] = useState("");
  const [warningOpen, setWarningOpen] = useState(true);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchRoles({ page, pageSize, search: debouncedQ })
      .then((res) => {
        if (!alive) return;
        setRows(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch((e) =>
        toast({
          title: "Error",
          description: "No se pudieron cargar roles",
          variant: "destructive",
        }),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, pageSize, debouncedQ]);

  useEffect(() => setPage(1), [debouncedQ]);

  useEffect(() => {
    setLoadingPermissionsCatalog(true);
    fetchPermissionsList()
      .then((list) => setAllPermissions(list))
      .catch(() =>
        toast({
          title: "Error",
          description: "No se pudo cargar el catálogo de permisos",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingPermissionsCatalog(false));
  }, []);

  useEffect(() => {
    if (!rows.length) {
      setSelectedRoleId(null);
      return;
    }

    const currentExists = rows.some((role) => role.id === selectedRoleId);
    if (selectedRoleId === null || !currentExists) {
      setSelectedRoleId(rows[0].id);
    }
  }, [rows, selectedRoleId]);

  const selectedRole = useMemo(
    () => rows.find((role) => role.id === selectedRoleId) ?? null,
    [rows, selectedRoleId],
  );

  const selectedPermissionsSet = useMemo(
    () => new Set(selectedRolePermissions.map((permission) => permission.name)),
    [selectedRolePermissions],
  );

  const filteredPermissions = useMemo(() => {
    const term = permissionSearch.trim().toLowerCase();
    if (!term) return allPermissions;

    return allPermissions.filter((permission) => {
      const nameMatch = permission.name.toLowerCase().includes(term);
      const descriptionMatch = (permission.description || "")
        .toLowerCase()
        .includes(term);
      return nameMatch || descriptionMatch;
    });
  }, [allPermissions, permissionSearch]);

  function openPermissionsModal(role: Role) {
    setSelectedRoleId(role.id);
    setLoadingRolePermissions(true);
    setPendingPermission({});
    setPermissionSearch("");
    setSelectedRolePermissions([]);
    setPermissionsModalOpen(true);

    fetchRolePermissions(role.id)
      .then((list) => setSelectedRolePermissions(list))
      .catch(() =>
        toast({
          title: "Error",
          description: "No se pudieron cargar los permisos del rol",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingRolePermissions(false));
  }

  async function handlePermissionToggle(
    permissionName: string,
    nextChecked: boolean,
  ) {
    if (selectedRoleId === null) return;

    const isAssigned = selectedPermissionsSet.has(permissionName);
    if (nextChecked === isAssigned) return;

    setPendingPermission((prev) => ({ ...prev, [permissionName]: true }));
    try {
      if (nextChecked) {
        await assignPermissionToRole(selectedRoleId, permissionName);
        setSelectedRolePermissions((prev) => {
          if (prev.some((permission) => permission.name === permissionName))
            return prev;
          return [...prev, { name: permissionName }];
        });
        toast({
          title: "Permiso agregado",
          description: `${permissionName} fue asignado al rol`,
        });
      } else {
        await unassignPermissionFromRole(selectedRoleId, permissionName);
        setSelectedRolePermissions((prev) =>
          prev.filter((permission) => permission.name !== permissionName),
        );
        toast({
          title: "Permiso removido",
          description: `${permissionName} fue desasignado del rol`,
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar el permiso",
        variant: "destructive",
      });
    } finally {
      setPendingPermission((prev) => ({ ...prev, [permissionName]: false }));
    }
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setOpen(true);
  }
  function openEdit(r: Role) {
    setEditing(r);
    setName(r.name || "");
    setDescription(r.description || "");
    setOpen(true);
  }
  async function handleSave() {
    try {
      if (editing) {
        const res = await updateRole(editing.id, { name, description });
        toast({
          title: "Rol actualizado",
          description: `Se actualizó ${res.data?.name}`,
        });
      } else {
        const res = await createRole({ name, description });
        toast({
          title: "Rol creado",
          description: `Se creó ${res.data?.name}`,
        });
      }
      setOpen(false);
      // Refetch
      fetchRoles({ page, pageSize, search: debouncedQ }).then((res) => {
        setRows(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo guardar",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">
            Gestión de roles y permisos
          </h2>
          <p className="text-sm text-muted-foreground">
            Crea, edita roles y asigna permisos granulares del sistema
          </p>
        </div>
        <Button onClick={openCreate}>Nuevo rol</Button>
      </div>

      <section className="rounded-lg border p-4 space-y-3">
        <div>
          <h2 className="font-medium">Todos los permisos</h2>
        </div>

        {loadingPermissionsCatalog && (
          <p className="text-sm text-muted-foreground">Cargando permisos...</p>
        )}

        {!loadingPermissionsCatalog && allPermissions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay permisos disponibles.
          </p>
        )}

        {!loadingPermissionsCatalog && allPermissions.length > 0 && (
          <div className="max-h-[220px] overflow-auto rounded-md border p-3">
            <div className="flex flex-wrap gap-2">
              {allPermissions.map((permission) => (
                <Badge
                  key={`all:${permission.name}`}
                  variant="outline"
                  title={permission.description || undefined}
                >
                  {permission.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-sm"
          placeholder="Buscar rol…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages || loading}
          >
            Siguiente
          </Button>
          <select
            className="border rounded-md h-9 px-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value) || 25)}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / pág
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-sm text-muted-foreground"
                >
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="odd:bg-muted/10 hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell
                    className="max-w-[400px] truncate"
                    title={r.description || undefined}
                  >
                    {r.description || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openPermissionsModal(r)}
                        title="Gestionar permisos"
                        aria-label="Gestionar permisos"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(r)}
                        title="Editar rol"
                        aria-label="Editar rol"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-sm text-muted-foreground"
                >
                  Sin roles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={permissionsModalOpen}
        onOpenChange={setPermissionsModalOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Permisos del rol</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Rol:{" "}
              {selectedRole
                ? `${selectedRole.name} (id: ${selectedRole.id})`
                : "-"}
            </p>
            <p>Endpoint rol: /v1/access/roles/{"{rolecodigo}"}/permissions</p>
          </div>

          <Input
            placeholder="Buscar permiso..."
            value={permissionSearch}
            onChange={(e) => setPermissionSearch(e.target.value)}
          />

          {loadingRolePermissions && (
            <p className="text-sm text-muted-foreground">
              Cargando permisos...
            </p>
          )}

          {!loadingRolePermissions &&
            !loadingPermissionsCatalog &&
            allPermissions.length > 0 && (
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <div className="divide-y">
                  {filteredPermissions.map((permission) => {
                    const isAssigned = selectedPermissionsSet.has(
                      permission.name,
                    );
                    const isPending = !!pendingPermission[permission.name];
                    return (
                      <div
                        key={`switch:${permission.name}`}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {permission.name}
                          </p>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssigned && (
                            <Badge variant="secondary">Asignado</Badge>
                          )}
                          <Switch
                            checked={isAssigned}
                            disabled={isPending}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(permission.name, checked)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {!loadingRolePermissions &&
            !loadingPermissionsCatalog &&
            allPermissions.length > 0 &&
            filteredPermissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay permisos que coincidan con la búsqueda.
              </p>
            )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermissionsModalOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar rol" : "Nuevo rol"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="admin / equipo / alumno"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del rol"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Precaucion: Roles y permisos
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ten precaucion. En esta seccion se gestionan todos los permisos de
            roles del sistema. Un cambio aqui puede afectar accesos y
            funcionalidades criticas.
          </p>
          <DialogFooter>
            <Button onClick={() => setWarningOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RolesPageTabs() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="docs" className="w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Roles y Permisos</h1>
            <p className="text-sm text-muted-foreground">
              Documentación del sistema y gestión de roles
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="docs" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              Documentación
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-1.5">
              <Settings className="h-4 w-4" />
              Gestión de Roles
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="docs" className="mt-4">
          <SystemDocumentation />
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <RolesContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function RolesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <RolesPageTabs />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
