export interface ManualContentBlock {
  type: "text" | "code" | "list" | "table" | "note" | "warning" | "flow" | "step"
  content?: string
  language?: string
  items?: string[]
  headers?: string[]
  rows?: string[][]
  title?: string
  steps?: string[]
}

export interface ManualSubsection {
  id: string
  blocks: ManualContentBlock[]
}

export interface ManualSection {
  id: string
  subsections: ManualSubsection[]
}

export const manualContent: ManualSection[] = [
  // ============================================================
  // 1. PANEL DE ADMIN / DASHBOARD
  // ============================================================
  {
    id: "dashboard",
    subsections: [
      {
        id: "vista-general",
        blocks: [
          {
            type: "text",
            content:
              "El panel de administración es el punto de entrada principal para los administradores y miembros del equipo. Muestra un resumen general de la actividad de la plataforma.",
          },
          {
            type: "text",
            content:
              "Al iniciar sesión con un rol de admin o equipo, serás redirigido automáticamente a `/admin`. Desde aquí puedes acceder a todas las funcionalidades de la plataforma.",
          },
        ],
      },
      {
        id: "accesos-rapidos",
        blocks: [
          {
            type: "text",
            content: "El dashboard ofrece accesos rápidos a las funcionalidades más usadas:",
          },
          {
            type: "list",
            items: [
              "Pagos: Gestión de cronogramas, cuotas, facturas",
              "Tickets: Tablero kanban y métricas de soporte",
              "Formularios Avanzados: Formularios de leads publicitarios",
              "Agentes IA: Hub de agentes inteligentes",
              "CRM: Pipeline de ventas y leads",
              "Plantillas de Email: Gestión de templates Brevo",
            ],
          },
        ],
      },
      {
        id: "kpis",
        blocks: [
          {
            type: "text",
            content:
              "Los KPIs del dashboard están en fase de desarrollo. Próximamente mostrarán métricas clave como: total de estudiantes activos, tickets abiertos, tasa de conversión del CRM, y revenue del mes.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 2. GESTIÓN DE ALUMNOS
  // ============================================================
  {
    id: "alumnos",
    subsections: [
      {
        id: "lista-alumnos",
        blocks: [
          {
            type: "text",
            content:
              "La lista de alumnos (`/admin/alumnos`) muestra todos los estudiantes registrados en la plataforma con búsqueda, filtros y paginación.",
          },
          {
            type: "step",
            steps: [
              "Ve a 'Alumnos' en el sidebar",
              "Usa la barra de búsqueda para filtrar por nombre o código",
              "Usa los filtros de Estado, Fase y Tag para refinar resultados",
              "Haz clic en un alumno para ver su perfil detallado",
            ],
          },
          {
            type: "table",
            headers: ["Columna", "Descripción"],
            rows: [
              ["Nombre", "Nombre completo del estudiante"],
              ["Código", "Código único del estudiante (ej: USR001)"],
              ["Estado", "Estado actual: activo, inactivo, etc."],
              ["Fase", "Fase del curso en la que se encuentra"],
              ["Tag", "Etiqueta personalizada para segmentación"],
              ["Coach", "Coach asignado al estudiante"],
            ],
          },
        ],
      },
      {
        id: "vista-enriquecida",
        blocks: [
          {
            type: "text",
            content:
              "La 'Vista Mariana' (`/admin/alumnos/vista-enriquecida`) ofrece una vista más detallada de los estudiantes con información enriquecida de metadata.",
          },
        ],
      },
      {
        id: "perfil-alumno",
        blocks: [
          {
            type: "text",
            content:
              "Al hacer clic en un alumno, accedes a su perfil con múltiples secciones:",
          },
          {
            type: "table",
            headers: ["Sección", "Ruta", "Descripción"],
            rows: [
              ["Inicio", "/admin/alumnos/[code]/inicio", "Resumen general, coaches asignados, acciones rápidas"],
              ["Perfil", "/admin/alumnos/[code]/perfil", "Detalle del perfil del estudiante"],
              ["Chat", "/admin/alumnos/[code]/chat", "Chat de soporte con el estudiante"],
              ["Feedback", "/admin/alumnos/[code]/feedback", "Tickets y feedback del estudiante"],
              ["ADS", "/admin/alumnos/[code]/ads", "Métricas de publicidad del estudiante"],
              ["Sesiones", "/admin/alumnos/[code]/sesiones", "Sesiones de Zoom del estudiante"],
              ["Bonos", "/admin/alumnos/[code]/bonos", "Bonos asignados al estudiante"],
              ["Pagos", "/admin/alumnos/[code]/pagos", "Cronograma de pagos y facturas"],
              ["Tareas", "/admin/alumnos/[code]/tareas", "Tareas pendientes del estudiante"],
            ],
          },
        ],
      },
      {
        id: "filtro-alumnos",
        blocks: [
          {
            type: "text",
            content:
              "La lista de alumnos soporta filtros combinados para encontrar estudiantes específicos rápidamente.",
          },
          {
            type: "list",
            items: [
              "Búsqueda por texto: nombre, código o email",
              "Filtro por Estado: activo, inactivo, pausado",
              "Filtro por Fase: fase del curso (F1, F2, F3, F4, F5)",
              "Filtro por Tag: etiquetas personalizadas (ADS, COPY, VSL, etc.)",
              "Filtro por Coach: estudiante asignado a un coach específico",
            ],
          },
        ],
      },
      {
        id: "estados-fases",
        blocks: [
          {
            type: "text",
            content: "Los estudiantes pasan por diferentes estados y fases:",
          },
          {
            type: "table",
            headers: ["Fase", "Descripción"],
            rows: [
              ["F1", "Inicio del curso - Onboarding"],
              ["F2", "Desarrollo - Contenido principal"],
              ["F3", "Práctica - Ejercicios y aplicaciones"],
              ["F4", "Avanzado - Temas complejos"],
              ["F5 (COMPLETADO)", "Curso completado - Soporte limitado"],
            ],
          },
          {
            type: "note",
            content:
              "Cuando un estudiante está en fase F5 (COMPLETADO), el acceso al chat de soporte se desactiva y se redirige a WhatsApp.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 3. GESTIÓN DE EQUIPOS (COACHES)
  // ============================================================
  {
    id: "equipos",
    subsections: [
      {
        id: "lista-coaches",
        blocks: [
          {
            type: "text",
            content:
              "La lista de coaches (`/admin/teamsv2`) muestra todos los coaches de la academia con búsqueda, filtros y métricas rápidas.",
          },
          {
            type: "table",
            headers: ["Columna", "Descripción"],
            rows: [
              ["Nombre", "Nombre del coach"],
              ["Código", "Código único del coach"],
              ["Estudiantes", "Número de estudiantes asignados"],
              ["Tickets", "Tickets activos del coach"],
              ["Área", "Área de especialización"],
            ],
          },
        ],
      },
      {
        id: "perfil-coach",
        blocks: [
          {
            type: "text",
            content:
              "El perfil de coach (`/admin/teamsv2/[code]`) muestra estadísticas detalladas, estudiantes asignados, tickets, y permite chatear con el coach.",
          },
          {
            type: "list",
            items: [
              "Estudiantes asignados: Lista de todos los alumnos del coach",
              "Estadísticas de tickets: Tickets abiertos, resueltos, tiempo promedio",
              "Gráficas de rendimiento: Métricas visuales de desempeño",
              "Chat: Comunicación directa con el coach",
              "Sesiones: Gestión de sesiones de Zoom del coach",
            ],
          },
        ],
      },
      {
        id: "rendimiento-area",
        blocks: [
          {
            type: "text",
            content:
              "La página de Rendimiento por Área (`/admin/rendimiento-areas`) muestra métricas comparativas entre las diferentes áreas del equipo.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 4. SISTEMA DE TICKETS
  // ============================================================
  {
    id: "tickets",
    subsections: [
      {
        id: "dashboard-tickets",
        blocks: [
          {
            type: "text",
            content:
              "El dashboard de tickets (`/admin/tickets`) ofrece métricas completas del sistema de soporte.",
          },
          {
            type: "list",
            items: [
              "KPIs: Total de tickets, abiertos, resueltos, tiempo promedio de resolución",
              "Gráficas: Distribución por estado, por coach, por prioridad",
              "SLA: Métricas de cumplimiento de acuerdos de nivel de servicio",
              "Desglose por equipo: Rendimiento individual de cada coach",
            ],
          },
        ],
      },
      {
        id: "tablero-kanban",
        blocks: [
          {
            type: "text",
            content:
              "El tablero kanban (`/admin/tickets-board`) permite gestionar tickets visualmente arrastrando tarjetas entre columnas de estado.",
          },
          {
            type: "step",
            steps: [
              "Ve a 'Tickets Board' en el sidebar",
              "Las columnas representan estados: Abierto, En Progreso, Esperando, Resuelto",
              "Arrastra una tarjeta para cambiar el estado del ticket",
              "Haz clic en una tarjeta para ver el detalle completo",
              "Usa los filtros para buscar por estudiante, coach o prioridad",
            ],
          },
        ],
      },
      {
        id: "detalle-ticket",
        blocks: [
          {
            type: "text",
            content:
              "El detalle de ticket (`/admin/tickets-board/[codigo]`) muestra toda la información de un ticket específico:",
          },
          {
            type: "list",
            items: [
              "Información del ticket: título, descripción, estado, prioridad, estudiante asignado",
              "Comentarios: Historial de mensajes entre el equipo y el estudiante",
              "Notas internas: Comentarios privados del equipo (no visibles para el estudiante)",
              "Archivos: Documentos e imágenes adjuntos",
              "Gestión de estado: Cambiar entre Abierto, En Progreso, Esperando, Resuelto",
            ],
          },
        ],
      },
      {
        id: "estados-sla",
        blocks: [
          {
            type: "text",
            content: "Los tickets pasan por diferentes estados:",
          },
          {
            type: "table",
            headers: ["Estado", "Descripción", "Color"],
            rows: [
              ["Abierto", "Ticket nuevo, sin asignar", "Azul"],
              ["En Progreso", "Ticket asignado y siendo atendido", "Amarillo"],
              ["Esperando", "Esperando respuesta del estudiante", "Naranja"],
              ["Resuelto", "Ticket cerrado exitosamente", "Verde"],
            ],
          },
          {
            type: "note",
            content:
              "El SLA (Service Level Agreement) define tiempos máximos de respuesta según la prioridad del ticket.",
          },
        ],
      },
      {
        id: "notas-internas",
        blocks: [
          {
            type: "text",
            content:
              "Las notas internas (`/admin/tickets-board/notas-internas`) son comentarios privados del equipo que no se muestran a los estudiantes. Son útiles para documentar decisiones internas, contexto adicional, o seguimiento entre miembros del equipo.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 5. CRM
  // ============================================================
  {
    id: "crm",
    subsections: [
      {
        id: "pipeline",
        blocks: [
          {
            type: "text",
            content:
              "El CRM (`/admin/crm`) gestiona el pipeline de ventas con vistas de kanban y lista. Cada prospecto avanza por etapas hasta convertirse en estudiante.",
          },
          {
            type: "table",
            headers: ["Etapa", "Descripción"],
            rows: [
              ["Lead nuevo", "Prospecto recién registrado"],
              ["Contactado", "Primer contacto realizado"],
              ["Interesado", "Muestra interés en el curso"],
              ["Negociación", "En proceso de cierre"],
              ["Cerrado ganado", "Se convirtió en estudiante"],
              ["Cerrado perdido", "No se concretó la venta"],
            ],
          },
        ],
      },
      {
        id: "gestion-leads",
        blocks: [
          {
            type: "text",
            content:
              "Desde el CRM puedes gestionar leads con seguimiento detallado: llamadas, emails, notas, y actividades programadas.",
          },
        ],
      },
      {
        id: "formulario-venta",
        blocks: [
          {
            type: "text",
            content:
              "El formulario de venta (`/admin/crm/sales`) permite registrar ventas completas con datos del cliente, método de pago, y cuotas.",
          },
        ],
      },
      {
        id: "contratos-crm",
        blocks: [
          {
            type: "text",
            content:
              "La sección de contratos CRM (`/admin/crm/contracts`) gestiona contratos de prospects antes de que se conviertan en estudiantes. Permite generar, enviar y hacer seguimiento de contratos.",
          },
        ],
      },
      {
        id: "reservas",
        blocks: [
          {
            type: "text",
            content:
              "El sistema de reservas (`/admin/crm/booking`) gestiona bookings y citas con prospects. Incluye calendario, disponibilidad, y recordatorios automáticos.",
          },
        ],
      },
      {
        id: "campanas",
        blocks: [
          {
            type: "text",
            content:
              "Las campañas (`/admin/crm/campanas/[codigo]`) organizan leads por origen de campaña. Permite crear URLs de seguimiento, programar contactos, y medir conversión por canal.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 6. PAGOS Y BONOS
  // ============================================================
  {
    id: "pagos",
    subsections: [
      {
        id: "gestion-pagos",
        blocks: [
          {
            type: "text",
            content:
              "La gestión de pagos (`/admin/payments`) es el módulo central para administrar los cobros de la academia.",
          },
          {
            type: "list",
            items: [
              "Cronogramas de pago: Programación de fechas de cobro",
              "Cuotas: Gestión de pagos parciales",
              "Facturas: Generación y envío de facturas",
              "Recordatorios: Notificaciones automáticas de pago",
              "Seguimiento: Estado de cada pago",
            ],
          },
        ],
      },
      {
        id: "cronogramas",
        blocks: [
          {
            type: "text",
            content:
              "Los cronogramas de pago definen las fechas y montos de cada cuota para un estudiante. Se pueden crear, editar y cancelar desde la interfaz.",
          },
        ],
      },
      {
        id: "cuotas-recordatorios",
        blocks: [
          {
            type: "text",
            content:
              "El sistema envía recordatorios automáticos antes del vencimiento de cada cuota. Los recordatorios se envían por email vía Brevo y pueden configurarse según la frecuencia deseada.",
          },
        ],
      },
      {
        id: "facturas",
        blocks: [
          {
            type: "text",
            content:
              "Las facturas se generan automáticamente al registrar un pago. Se pueden descargar en PDF y enviar por email al estudiante.",
          },
        ],
      },
      {
        id: "bonos",
        blocks: [
          {
            type: "text",
            content:
              "Los bonos son paquetes de beneficios adicionales que se pueden asignar a estudiantes. Hay dos tipos:",
          },
          {
            type: "table",
            headers: ["Tipo", "Cantidad", "Descripción"],
            rows: [
              ["Contractuales", "6 tipos", "Bonos incluidos en el contrato del estudiante"],
              ["Extra", "3 tipos", "Bonos adicionales que se pueden agregar"],
            ],
          },
        ],
      },
      {
        id: "solicitud-bonos",
        blocks: [
          {
            type: "text",
            content:
              "La página de solicitudes de bonos (`/admin/solicitud-bonos`) gestiona las solicitudes de bonos de estudiantes y coaches. Los admins revisan y aprueban/rechazan cada solicitud.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 7. CHAT DE SOPORTE
  // ============================================================
  {
    id: "chat-soporte",
    subsections: [
      {
        id: "chat-principal",
        blocks: [
          {
            type: "text",
            content:
              "El chat principal (`/chat`) es la interfaz de comunicación en tiempo real entre el equipo de soporte y los estudiantes. Usa Socket.IO para mensajería instantánea.",
          },
          {
            type: "step",
            steps: [
              "Ve a 'Chat' en el sidebar",
              "Selecciona una sala de chat de la lista",
              "Escribe tu mensaje en el campo de texto",
              "Presiona Enter o el botón de enviar",
              "El estudiante recibirá el mensaje en tiempo real",
            ],
          },
        ],
      },
      {
        id: "chat-general-beta",
        blocks: [
          {
            type: "text",
            content:
              "El Chat General Beta (`/chat/beta`) es un hub unificado que muestra pestañas de coaches, estudiantes, y el visor de Emma (agente IA). Es útil para monitorear todas las conversaciones activas.",
          },
        ],
      },
      {
        id: "chat-alumno",
        blocks: [
          {
            type: "text",
            content:
              "Cada estudiante tiene su propio chat de soporte accesible desde `/admin/alumnos/[code]/chat`. Si el estudiante está en fase F5 (COMPLETADO), se muestra un modal de WhatsApp como alternativa.",
          },
        ],
      },
      {
        id: "notificaciones-chat",
        blocks: [
          {
            type: "text",
            content:
              "El sistema de notificaciones de chat incluye múltiples capas para asegurar que no se pierdan mensajes:",
          },
          {
            type: "list",
            items: [
              "Snackbar: Popup flotante con preview del mensaje nuevo",
              "Badge: Contador de mensajes no leídos en el sidebar",
              "Sonido: Sonido de notificación al recibir mensaje",
              "Push: Notificación push del sistema operativo (PWA)",
            ],
          },
        ],
      },
      {
        id: "whatsapp-respaldo",
        blocks: [
          {
            type: "text",
            content:
              "Cuando el chat no está disponible (estudiante COMPLETADO o preferencia del usuario), se muestra un enlace directo a WhatsApp como canal de respaldo. El encla incluye un mensaje predefinido con el código del estudiante.",
          },
          {
            type: "code",
            content: "https://api.whatsapp.com/send?phone=573117280418&text=Hola, soy [nombre] código [código]",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 8. PLANTILLAS DE EMAIL
  // ============================================================
  {
    id: "plantillas",
    subsections: [
      {
        id: "gestor-plantillas",
        blocks: [
          {
            type: "text",
            content:
              "El gestor de plantillas (`/admin/plantillas-mails`) permite crear, editar y gestionar plantillas de email para diferentes propósitos. Usa Brevo como proveedor de envío.",
          },
          {
            type: "step",
            steps: [
              "Ve a 'Plantillas Mails' en el sidebar",
              "Selecciona una categoría de plantilla",
              "Edita el contenido con el editor visual o HTML",
              "Usa el asistente IA para mejorar el copywriting",
              "Envía una prueba para verificar",
              "Activa la plantilla para uso en producción",
            ],
          },
        ],
      },
      {
        id: "categorias",
        blocks: [
          {
            type: "text",
            content: "Las plantillas se organizan en categorías:",
          },
          {
            type: "table",
            headers: ["Categoría", "Uso"],
            rows: [
              ["Welcome", "Bienvenida a nuevos estudiantes"],
              ["Onboarding", "Flujo de inicio del curso"],
              ["Payment", "Recordatorios y seguimiento de pagos"],
              ["Contract", "Notificaciones de contrato"],
              ["Rescate", "Re-engagement de estudiantes inactivos"],
              ["Password", "Cambio de contraseña"],
              ["Piloto IA", "Invitaciones del piloto de IA"],
            ],
          },
        ],
      },
      {
        id: "variables-disponibles",
        blocks: [
          {
            type: "text",
            content:
              "Las plantillas soportan variables dinámicas que se reemplazan automáticamente con los datos del estudiante:",
          },
          {
            type: "code",
            content: `{{nombre}}        → Nombre del estudiante
{{email}}         → Email del estudiante
{{codigo}}        → Código del estudiante
{{fase}}          → Fase actual del curso
{{coach}}         → Nombre del coach asignado
{{fecha_pago}}    → Próxima fecha de pago
{{monto_pago}}    → Monto a pagar
{{link_whatsapp}} → Enlace de WhatsApp de soporte`,
          },
        ],
      },
      {
        id: "asistente-ia",
        blocks: [
          {
            type: "text",
            content:
              "El gestor de plantillas incluye un asistente IA que ayuda a crear y mejorar el copywriting de los emails. Puedes pedirle que genere contenido, sugiera mejoras, o adapte el tono según el propósito del email.",
          },
        ],
      },
      {
        id: "envio-prueba",
        blocks: [
          {
            type: "text",
            content:
              "Antes de activar una plantilla, puedes enviar una prueba a cualquier dirección de email para verificar cómo se ve el email final. La prueba usa el mismo motor de templates que el envío real.",
          },
          {
            type: "step",
            steps: [
              "Escribe una dirección de email en el campo 'Email de prueba'",
              "Haz clic en 'Enviar prueba'",
              "Revisa tu bandeja de entrada (o spam)",
              "Verifica que las variables se reemplazaron correctamente",
              "Si todo está bien, activa la plantilla",
            ],
          },
        ],
      },
      {
        id: "piloto-ia",
        blocks: [
          {
            type: "text",
            content:
              "La categoría 'Piloto IA' gestiona las invitaciones al programa piloto de IA. Incluye:",
          },
          {
            type: "list",
            items: [
              "Lista de estudiantes aceptados al piloto",
              "Agrupación por estado de aceptación",
              "Filtros por estado, fase y tag",
              "Envío de invitaciones masivas por email",
              "Prueba de envío individual",
              "Consentimiento de estudiantes",
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // 9. MÉTRICAS Y DASHBOARDS
  // ============================================================
  {
    id: "metricas",
    subsections: [
      {
        id: "metricas-estudiantes",
        blocks: [
          {
            type: "text",
            content:
              "Las métricas de estudiantes (`/admin/students`) muestran análisis detallados del progreso y comportamiento de los estudiantes.",
          },
          {
            type: "list",
            items: [
              "Fases: Distribución de estudiantes por fase del curso",
              "Transiciones: Flujo de estudiantes entre fases",
              "Retención: Tasa de retención de estudiantes",
              "Tareas: Completación de tareas asignadas",
            ],
          },
        ],
      },
      {
        id: "metricas-chat",
        blocks: [
          {
            type: "text",
            content:
              "Las métricas de chat (`/admin/metrics/chat`) monitorean la actividad de chat en tiempo real usando Socket.IO.",
          },
          {
            type: "list",
            items: [
              "Salas activas: Número de chats concurrentes",
              "Tiempos de respuesta: Tiempo promedio de respuesta del equipo",
              "Volumen: Mensajes por hora/día/semana",
              "Reportes: Informes agregados por estudiante específico",
            ],
          },
        ],
      },
      {
        id: "metricas-emma",
        blocks: [
          {
            type: "text",
            content:
              "Las métricas de Emma (`/admin/metrics/emma`) muestran el uso del agente IA Super-ATC.",
          },
          {
            type: "list",
            items: [
              "Uso total: Número de interacciones con Emma",
              "Clasificación de riesgo: Distribución de ALTO/MEDIO/BAJO",
              "Tickets creados: Tickets generados por Emma",
              "Pausas: Resultados de pausas (confirmadas, canceladas, fallidas)",
            ],
          },
        ],
      },
      {
        id: "metricas-negocio",
        blocks: [
          {
            type: "text",
            content:
              "Las métricas de negocio (`/admin/metricas-negocio`) son un dashboard de inteligencia de negocio con P&L, KPIs, revenue, expenses, ROIC, CAC, y churn. Acceso restringido al admin principal.",
          },
        ],
      },
      {
        id: "rendimiento-areas",
        blocks: [
          {
            type: "text",
            content:
              "La página de Rendimiento por Áreas (`/admin/rendimiento-areas`) es un dashboard completo de OKR (Objectives and Key Results) que permite definir objetivos estratégicos, medir resultados, y asignar responsabilidades.",
          },
          {
            type: "text",
            content: "Funcionalidades principales:",
          },
          {
            type: "list",
            items: [
              "Crear Objetivos (OKR): Definir objetivos estratégicos por área o equipo",
              "Key Results: Asignar resultados clave medibles para cada objetivo",
              "Asignación: Asignar OKRs a usuarios específicos con porcentaje de responsabilidad",
              "Seguimiento: Actualizar el progreso de cada Key Result con porcentajes",
              "Sugerencias IA: Usar IA para generar sugerencias de Key Results basadas en el objetivo",
              "Historial: Ver evolución del progreso en el tiempo",
            ],
          },
          {
            type: "step",
            steps: [
              "Ve a 'Rendimiento de Áreas' en el sidebar",
              "Haz clic en 'Crear OKR' para un nuevo objetivo",
              "Escribe el título del objetivo (ej: 'Aumentar retención de estudiantes')",
              "Agrega Key Results medibles (ej: 'Reducir churn del 15% al 8%)",
              "Asigna usuarios responsables con su porcentaje de responsabilidad",
              "Actualiza el progreso periódicamente",
              "Revisa el dashboard para ver el avance general",
            ],
          },
          {
            type: "note",
            content:
              "El endpoint `/api/kr-ai-suggest` usa IA para sugerir Key Results basados en la descripción del objetivo. Solo está disponible para admin/equipo.",
          },
        ],
      },
      {
        id: "exportacion",
        blocks: [
          {
            type: "text",
            content:
              "La mayoría de los dashboards de métricas incluyen un botón de exportación a Excel para análisis externo o reportes a dirección.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 10. CONFIGURACIÓN DEL SISTEMA
  // ============================================================
  {
    id: "config",
    subsections: [
      {
        id: "opciones-generales",
        blocks: [
          {
            type: "text",
            content:
              "Las opciones generales (`/admin/opciones`) permiten configurar parámetros del sistema como etiquetas de tickets, opciones de formulario, y configuraciones varias.",
          },
        ],
      },
      {
        id: "gestion-usuarios",
        blocks: [
          {
            type: "text",
            content:
              "La gestión de usuarios (`/admin/users`) permite administrar todas las cuentas de la plataforma.",
          },
          {
            type: "list",
            items: [
              "Crear nuevos usuarios con roles específicos",
              "Editar información de usuarios existentes",
              "Cambiar contraseñas y roles",
              "Buscar y filtrar usuarios por rol, nombre o email",
              "Ver detalle de actividad de cada usuario",
            ],
          },
        ],
      },
      {
        id: "carga-masiva",
        blocks: [
          {
            type: "text",
            content:
              "La carga masiva de usuarios (`/admin/users/carga-masiva`) permite importar múltiples usuarios desde un archivo Excel/XLSX. El sistema valida los datos y reporta errores antes de insertar.",
          },
          {
            type: "step",
            steps: [
              "Prepara un archivo Excel con las columnas: nombre, email, código, rol",
              "Ve a 'Usuarios' → 'Carga Masiva'",
              "Sube el archivo Excel",
              "El sistema muestra una preview de los datos a importar",
              "Revisa los errores (si los hay)",
              "Confirma la importación",
            ],
          },
        ],
      },
      {
        id: "roles-permisos-manual",
        blocks: [
          {
            type: "text",
            content:
              "Los roles y permisos (`/admin/access/roles`) permiten crear roles personalizados con permisos granulares. Cada permiso controla el acceso a una funcionalidad específica de la plataforma.",
          },
        ],
      },
      {
        id: "accesos-estudiantes",
        blocks: [
          {
            type: "text",
            content:
              "La gestión de accesos (`/admin/accesos`) controla el acceso de los estudiantes a herramientas externas como Skool, y rastrea las fechas de vencimiento de cada acceso.",
          },
        ],
      },
      {
        id: "faq",
        blocks: [
          {
            type: "text",
            content:
              "La sección de FAQ (`/admin/preguntas-frecuentes`) permite gestionar preguntas frecuentes que se muestran a los estudiantes. Soporta CRUD completo con categorías.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 11. AGENTES IA (USO)
  // ============================================================
  {
    id: "agentes-uso",
    subsections: [
      {
        id: "hub-agentes",
        blocks: [
          {
            type: "text",
            content:
              "El hub de agentes (`/admin/agentes`) es el punto de acceso a todos los agentes IA de la plataforma. Muestra tarjetas con acceso rápido y estadísticas de uso.",
          },
        ],
      },
      {
        id: "uso-atc",
        blocks: [
          {
            type: "text",
            content:
              "El ATC Admin (`/admin/agentes/atc`) es un agente IA que analiza datos de estudiantes y coaches para recomendar la mejor asignación de equipo. Útil cuando hay muchos estudiantes sin coach o cuando se necesita reasignar carga de trabajo.",
          },
        ],
      },
      {
        id: "uso-copy",
        blocks: [
          {
            type: "text",
            content:
              "El Copy Agent (`/admin/agentes/copy`) revisa y mejora el contenido de los estudiantes. Tiene sub-agentes especializados para diferentes fases del curso.",
          },
          {
            type: "list",
            items: [
              "Phase 1 Reviewer: Revisa la fase 1 del curso HotSelling",
              "VSL Scripter: Genera guiones de video de ventas",
              "Copywriter: Revisión general de copy y textos",
            ],
          },
        ],
      },
      {
        id: "uso-super-atc",
        blocks: [
          {
            type: "text",
            content:
              "El Super-ATC (`/admin/agentes/super-atc`) es el agente más avanzado. Clasifica riesgo de conversaciones, gestiona escalamientos obligatorios, y puede crear múltiples tickets por interacción.",
          },
        ],
      },
      {
        id: "uso-soporte",
        blocks: [
          {
            type: "text",
            content:
              "El Support-ATC (`/admin/agentes/soporte-atc`) sirve como copilot para el equipo de soporte. Tiene acceso a una knowledge base con información de la plataforma.",
          },
        ],
      },
      {
        id: "metricas-agentes",
        blocks: [
          {
            type: "text",
            content:
              "Las métricas de uso de agentes (`/admin/agentes/uso`) muestran estadísticas detalladas de cada agente: tokens consumidos, costos estimados, interacciones por estudiante.",
          },
          {
            type: "list",
            items: [
              "Uso por estudiante: Cuánto usa cada estudiante cada agente",
              "Uso por tickets: Impacto de agentes en creación y resolución de tickets",
              "Costos: Estimación de costos de API de IA por agente",
              "Tendencias: Evolución del uso en el tiempo",
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // 12. FORMULARIOS Y PLANTILLAS
  // ============================================================
  {
    id: "formularios",
    subsections: [
      {
        id: "formularios-avanzados",
        blocks: [
          {
            type: "text",
            content:
              "Los formularios avanzados (`/admin/formularios-avanzados`) muestran datos de formularios de leads publicitarios. Útil para analizar el rendimiento de campañas de ads.",
          },
        ],
      },
      {
        id: "plantillas-contratos",
        blocks: [
          {
            type: "text",
            content:
              "Las plantillas de contratos (`/admin/plantillas-contratos`) permiten subir, editar y gestionar templates de contratos en formato DOCX con variables dinámicas.",
          },
        ],
      },
      {
        id: "variables-contrato-manual",
        blocks: [
          {
            type: "text",
            content:
              "Las variables de contrato se insertan en el template DOCX usando la sintaxis `{nombre_variable}`. El sistema reemplaza automáticamente estas variables con los datos del estudiante al generar el contrato.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 13. GESTIÓN DE SEGUIMIENTO
  // ============================================================
  {
    id: "seguimiento",
    subsections: [
      {
        id: "mensajes-seguimiento",
        blocks: [
          {
            type: "text",
            content:
              "La gestión de mensajes de seguimiento (`/admin/mensajes-seguimiento`) permite crear y administrar templates de mensajes para dar seguimiento a estudiantes.",
          },
        ],
      },
      {
        id: "templates-ia",
        blocks: [
          {
            type: "text",
            content:
              "Los templates de seguimiento se generan con ayuda de IA. El sistema analiza el contexto del estudiante y sugiere mensajes personalizados según su situación (activo, inactivo, con pagos pendientes, etc.).",
          },
        ],
      },
      {
        id: "campanas-rescate",
        blocks: [
          {
            type: "text",
            content:
              "Las campañas de rescate (`/admin/mensajes-seguimiento`) envían emails automatizados a estudiantes inactivos para re-engancharlos. El sistema detecta automáticamente estudiantes que no han tenido actividad reciente y les envía mensajes personalizados.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 14. ALMACENAMIENTO
  // ============================================================
  {
    id: "almacenamiento",
    subsections: [
      {
        id: "bunny-uso",
        blocks: [
          {
            type: "text",
            content:
              "Bunny CDN se usa como almacén principal de archivos de la plataforma. La página de test (`/admin/storage-test`) permite probar la conexión y gestionar archivos.",
          },
        ],
      },
      {
        id: "subida-archivos",
        blocks: [
          {
            type: "text",
            content:
              "Los archivos se organizan por tipo en carpetas específicas de Bunny CDN. La subida se realiza directamente desde la interfaz de la plataforma.",
          },
          {
            type: "table",
            headers: ["Carpeta", "Tipo de archivo"],
            rows: [
              ["contracts/", "Contratos generados en DOCX"],
              ["recordings/", "Grabaciones de Zoom"],
              ["uploads/", "Archivos subidos por usuarios"],
              ["icons/", "Iconos de la app PWA"],
            ],
          },
        ],
      },
      {
        id: "grabaciones-zoom",
        blocks: [
          {
            type: "text",
            content:
              "Las grabaciones de Zoom se almacenan en Bunny CDN y se pueden descargar, previsualizar, y reproducir directamente desde la plataforma. Las transcripciones se convierten automáticamente de VTT a TXT.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 15. SISTEMA DE OKR
  // ============================================================
  {
    id: "okr",
    subsections: [
      {
        id: "que-es-okr",
        blocks: [
          {
            type: "text",
            content:
              "OKR (Objectives and Key Results) es un marco de trabajo para definir y medir objetivos. La plataforma incluye un sistema completo de OKR que permite a los administradores definir objetivos estratégicos, asignar resultados clave, y hacer seguimiento del progreso.",
          },
          {
            type: "text",
            content:
              "El sistema se encuentra en `/admin/rendimiento-areas` y está disponible solo para roles admin y equipo.",
          },
        ],
      },
      {
        id: "crear-okr",
        blocks: [
          {
            type: "step",
            steps: [
              "Ve a 'Rendimiento de Áreas' en el sidebar",
              "Haz clic en el botón 'Crear OKR' o '+ Nuevo Objetivo'",
              "Escribe un título claro y descriptivo para el objetivo",
              "Opcionalmente agrega una descripción con más contexto",
              "Selecciona el área o equipo responsable",
              "Guarda el objetivo",
            ],
          },
          {
            type: "note",
            content:
              "Un buen objetivo es ambicioso pero alcanzable. Debe inspirar al equipo y ser claro sobre qué se quiere lograr.",
          },
        ],
      },
      {
        id: "key-results",
        blocks: [
          {
            type: "text",
            content:
              "Los Key Results son resultados medibles que indican si se está logrando el objetivo. Cada objetivo puede tener múltiples Key Results.",
          },
          {
            type: "step",
            steps: [
              "Dentro de un OKR, haz clic en 'Agregar Key Result'",
              "Escribe un resultado específico y medible",
              "Define la métrica de éxito (porcentaje, número, etc.)",
              "Establece el valor inicial y el valor objetivo",
              "Repite para cada Key Result",
            ],
          },
          {
            type: "text",
            content: "Ejemplos de Key Results:",
          },
          {
            type: "list",
            items: [
              "Reducir el churn del 15% al 8% en 3 meses",
              "Aumentar la satisfacción del estudiante de 7.5 a 9.0",
              "Completar 100 revisiones de copy esta semana",
              "Lograr un NPS de 60 o superior",
            ],
          },
        ],
      },
      {
        id: "asignar-usuarios",
        blocks: [
          {
            type: "text",
            content:
              "Los OKRs se pueden asignar a usuarios específicos con un porcentaje de responsabilidad. Esto permite distribute la responsabilidad entre miembros del equipo.",
          },
          {
            type: "step",
            steps: [
              "Dentro de un OKR, haz clic en 'Asignar'",
              "Busca y selecciona el usuario responsable",
              "Define el porcentaje de responsabilidad (ej: 60%)",
              "El sistema calcula automáticamente la carga de trabajo",
            ],
          },
        ],
      },
      {
        id: "seguimiento-progreso",
        blocks: [
          {
            type: "text",
            content:
              "El progreso de cada Key Result se actualiza periódicamente. El sistema calcula automáticamente el porcentaje general del OKR basado en el avance de sus Key Results.",
          },
          {
            type: "step",
            steps: [
              "Revisa el dashboard de OKRs regularmente",
              "Actualiza el progreso de cada Key Result",
              "El sistema muestra el porcentaje de avance con colores:",
              "  Verde: > 70% de avance",
              "  Amarillo: 40-70% de avance",
              "  Rojo: < 40% de avance",
              "Revisa los OKRs que están en rojo para identificar bloqueos",
            ],
          },
        ],
      },
      {
        id: "sugerencias-ia",
        blocks: [
          {
            type: "text",
            content:
              "La plataforma integra un asistente de IA que sugiere Key Results basados en la descripción del objetivo. Esto ayuda a definir resultados medibles y relevantes.",
          },
          {
            type: "step",
            steps: [
              "Al crear un OKR, escribe una descripción clara del objetivo",
              "Haz clic en 'Sugerir Key Results con IA'",
              "El sistema analiza tu objetivo y sugiere 3-5 Key Results relevantes",
              "Selecciona los que apliquen o edítalos según tus necesidades",
              "Los Key Results sugeridos se agregan automáticamente al OKR",
            ],
          },
          {
            type: "note",
            content:
              "Las sugerencias de IA están basadas en el contexto de la academia y mejores prácticas de OKR. Úsalas como punto de partida y ajústalas a tu realidad.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 16. PWA Y NOTIFICACIONES
  // ============================================================
  {
    id: "pwa",
    subsections: [
      {
        id: "instalar-app",
        blocks: [
          {
            type: "text",
            content:
              "La plataforma se puede instalar como una Progressive Web App (PWA) en tu dispositivo. Esto permite acceder más rápido, usarla en pantalla completa, y recibir notificaciones push.",
          },
          {
            type: "step",
            steps: [
              "Abre la plataforma en Chrome, Edge, o Safari",
              "Haz clic en el ícono de instalar (generalmente en la barra de direcciones)",
              "Confirma la instalación",
              "La app aparecerá en tu escritorio o pantalla de inicio",
              "Alternativa: Busca 'Instalar App' en el sidebar de la plataforma",
            ],
          },
          {
            type: "note",
            content:
              "En iOS (Safari), toca el botón de compartir y selecciona 'Añadir a pantalla de inicio'. En Android (Chrome), toca 'Instalar app' en el menú.",
          },
        ],
      },
      {
        id: "notificaciones-push",
        blocks: [
          {
            type: "text",
            content:
              "Las notificaciones push te permiten recibir alertas importantes incluso cuando no tienes la app abierta. Incluyen mensajes de chat, recordatorios de pago, y notificaciones del sistema.",
          },
          {
            type: "step",
            steps: [
              "Cuando abres la plataforma por primera vez, el navegador te pide permiso para notificaciones",
              "Haz clic en 'Permitir' para activar las notificaciones",
              "Si declinaste, puedes activarlas desde la configuración del navegador",
              "Las notificaciones aparecen como alertas del sistema en tu dispositivo",
              "Haz clic en una notificación para ir directamente al contenido relevante",
            ],
          },
          {
            type: "list",
            items: [
              "Mensajes de chat: Notificación cuando un coach o admin te envía un mensaje",
              "Recordatorios de pago: Alerta antes del vencimiento de una cuota",
              "Actualizaciones de curso: Nuevo contenido disponible",
              "Tareas pendientes: Recordatorio de tareas por completar",
            ],
          },
        ],
      },
      {
        id: "modo-offline",
        blocks: [
          {
            type: "text",
            content:
              "La PWA funciona parcialmente sin conexión a internet. Las páginas que ya visitaste se cachan automáticamente y están disponibles sin conexión.",
          },
          {
            type: "list",
            items: [
              "Disponible sin conexión: Páginas ya visitadas, perfil del estudiante, información del curso",
              "Requiere conexión: Chat en tiempo real, envío de mensajes, descargas nuevas",
              "Indicador: Si estás sin conexión, verás un indicador en la interfaz",
            ],
          },
          {
            type: "note",
            content:
              "El modo offline es limitado. Para la experiencia completa, se recomienda mantener conexión a internet.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 17. PRUEBA DE LOGIN
  // ============================================================
  {
    id: "login-test",
    subsections: [
      {
        id: "que-es-login-test",
        blocks: [
          {
            type: "text",
            content:
              "La herramienta de Prueba de Login (`/login-test`) es una utilidad administrativa que permite verificar credenciales de múltiples usuarios de forma masiva. Es útil para validar que todas las cuentas funcionan correctamente después de cambios de configuración.",
          },
          {
            type: "warning",
            content:
              "Esta herramienta es solo para administradores. Los datos de login se procesan de forma segura y no se almacenan permanentemente.",
          },
        ],
      },
      {
        id: "como-usar",
        blocks: [
          {
            type: "step",
            steps: [
              "Navega a `/login-test` desde la barra de direcciones",
              "Prepara una lista de credenciales (email + contraseña)",
              "Ingresa las credenciales en el formulario",
              "Haz clic en 'Probar Login'",
              "El sistema verificará cada credencial contra la API de autenticación",
              "Los resultados se muestran en tiempo real: éxito o error",
            ],
          },
        ],
      },
      {
        id: "exportar-resultado",
        blocks: [
          {
            type: "text",
            content:
              "Después de probar las credenciales, puedes exportar los resultados a un archivo Excel o CSV para documentación o análisis posterior.",
          },
          {
            type: "step",
            steps: [
              "Completa la prueba de login",
              "Haz clic en 'Exportar resultados'",
              "Selecciona el formato (Excel o CSV)",
              "Descarga el archivo",
              "El archivo incluye: email, estado (éxito/error), mensaje de error (si aplica)",
            ],
          },
          {
            type: "note",
            content:
              "El endpoint `/api/login-test/export` genera el archivo de exportación. Los datos se procesan server-side y no se exponen al navegador.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 18. PILOTO IA
  // ============================================================
  {
    id: "piloto",
    subsections: [
      {
        id: "que-es-piloto",
        blocks: [
          {
            type: "text",
            content:
              "El Piloto IA es un programa de prueba donde un grupo seleccionado de estudiantes prueba las funcionalidades de inteligencia artificial de la plataforma antes de que se lance al público general.",
          },
          {
            type: "text",
            content: "Beneficios del piloto:",
          },
          {
            type: "list",
            items: [
              "Acceso anticipado a agentes IA (Emma Super-ATC, Copy Agent)",
              "Soporte prioritario durante el periodo de prueba",
              "Influencia en el desarrollo de nuevas funcionalidades",
              "Certificado de participante del piloto",
            ],
          },
        ],
      },
      {
        id: "flujo-consentimiento",
        blocks: [
          {
            type: "text",
            content:
              "Los estudiantes elegidos reciben una invitación por email. Para participar, deben completar el formulario de consentimiento.",
          },
          {
            type: "flow",
            content: `
1. Admin envía invitaciones desde Plantillas Mails
   │
   ▼
2. Estudiante recibe email de invitación
   │
   ▼
3. Estudiante hace clic en el enlace del email
   │
   ▼
4. Se abre /consentimiento-piloto
   │
   ▼
5. Estudiante lee los términos y condiciones
   │
   ▼
6. Marca la casilla de consentimiento
   │
   ▼
7. Haz clic en 'Aceptar y Unirme al Piloto'
   │
   ▼
8. POST /api/piloto-ia/consent
   → Guarda el consentimiento en metadata
   │
   ▼
9. Estudiante recibe acceso a los agentes IA
   │
   ▼
10. Puede usar /alumno/agentes para acceder a Emma y Copy`,
          },
        ],
      },
      {
        id: "envio-invitaciones",
        blocks: [
          {
            type: "text",
            content:
              "Las invitaciones se envían desde la sección de Plantillas de Email, categoría 'Piloto IA ATC'.",
          },
          {
            type: "step",
            steps: [
              "Ve a 'Plantillas Mails' en el sidebar",
              "Selecciona la categoría 'Piloto IA ATC'",
              "Revisa la lista de estudiantes aceptados al piloto",
              "Usa los filtros para segmentar (estado, fase, tag)",
              "Escribe un email de prueba para verificar",
              "Selecciona los estudiantes a invitar",
              "Haz clic en 'Enviar invitaciones'",
              "Las invitaciones se envían por email vía Brevo",
            ],
          },
          {
            type: "note",
            content:
              "El sistema envía emails personalizados con el nombre del estudiante y un enlace único de consentimiento.",
          },
        ],
      },
      {
        id: "estudiantes-piloto",
        blocks: [
          {
            type: "text",
            content:
              "La gestión de estudiantes del piloto se realiza desde la misma sección de plantillas. El sistema muestra:",
          },
          {
            type: "list",
            items: [
              "Lista completa de estudiantes aceptados al piloto",
              "Agrupación por estado de aceptación (pendiente, aceptado, rechazado)",
              "Información de cada estudiante: nombre, código, estado, fase, tag",
              "Filtros combinados para encontrar estudiantes específicos",
              "Envío de invitaciones masivas o individuales",
            ],
          },
        ],
      },
    ],
  },
]
