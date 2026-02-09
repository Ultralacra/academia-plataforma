# Funcionalidades del aplicativo (resumen no técnico)

Este documento describe, en lenguaje simple, las funcionalidades que ofrece la plataforma para alumnos y el equipo interno (coaches, soporte, ventas y administradores). Está pensado como material de entrega: qué se puede hacer, para quién y con qué objetivo.

## Perfiles de usuario (roles)

- **Alumno**: usuario final que recibe el servicio.
- **Coach**: responsable de dar seguimiento al alumno y responder tickets.
- **ATC / Soporte (Equipo)**: atención al cliente y soporte operativo.
- **Sales / Ventas**: gestión comercial (seguimiento de ventas y procesos asociados).
- **Admin / Equipo**: administración general, control y supervisión.

## Matriz de acceso (alto nivel)

> Nota: el acceso exacto puede variar según permisos internos, pero en términos generales el aplicativo está pensado así.

| Módulo/Área                            |  Alumno |         Coach | ATC/Soporte (Equipo) | Sales/Ventas |         Admin |
| -------------------------------------- | ------: | ------------: | -------------------: | -----------: | ------------: |
| Perfil y progreso del alumno           |       ✓ |             ✓ |                    ✓ |            — |             ✓ |
| Chat soporte                           |       ✓ |             ✓ |                    ✓ |            — |             ✓ |
| Feedback/Tickets (del alumno)          |       ✓ |             ✓ |                    ✓ |            — |             ✓ |
| Tablero global de tickets (operación)  |       — |             — |                    ✓ |            — |             ✓ |
| Tareas (del alumno)                    | ✓ (ver) | ✓ (gestionar) |        ✓ (gestionar) |            — | ✓ (gestionar) |
| Sesiones (solicitud y seguimiento)     |       ✓ |             ✓ |                    ✓ |            — |             ✓ |
| Bonos del alumno (ver/solicitar)       |       ✓ |             ✓ |                    ✓ |            — |             ✓ |
| Catálogo de bonos (administración)     |       — |             ✓ |                    ✓ |            — |             ✓ |
| Solicitudes de bonos (listado/detalle) |       — |             — |                    ✓ |            — |             ✓ |
| Pagos (seguimiento interno)            |       — |             ✓ |                    ✓ |            — |             ✓ |
| Métricas ADS (operación)               |       — |             ✓ |                    ✓ |            — |             ✓ |
| Equipos y productividad (operación)    |       — |             ✓ |                    ✓ |            — |             ✓ |
| CRM/Ventas                             |       — |             — |        ✓ (si aplica) |            ✓ |             ✓ |
| Configuración de opciones/catálogos    |       — |             — |                    ✓ |            — |             ✓ |
| Roles y permisos (administración)      |       — |             — |                    — |            — |             ✓ |
| Usuarios del sistema                   |       — |             — |                    — |            — |             ✓ |
| Comunicaciones (Brevo)                 |       — |             — |                    — |            — |             ✓ |

## Funcionalidades por rol

### Alumno

- **Inicio del alumno (accesos rápidos)**: acceso a sus apartados principales sin depender del equipo.
- **Mi perfil y progreso**: ver su información, etapa/estado y evolución dentro del programa.
- **Chat de soporte**: escribir a Atención al Cliente y dar seguimiento a conversaciones.
- **Feedback / Tickets**:
  - **Crear solicitudes de feedback/ayuda** y dar seguimiento al estado.
  - **Ver respuestas y comentarios del equipo** (lo público).
  - **Acceso restringido a información interna**: no ve notas internas del equipo.
- **Mis tareas**: ver tareas asignadas y si están resueltas.
- **Sesiones (cuando aplica)**:
  - Ver el estado de sus solicitudes.
  - Solicitar/coordinar sesiones dentro del flujo definido por la operación.
- **Bonos (ver y solicitar)**:
  - **Ver bonos asignados** y su información.
  - **Solicitar bonos específicos cuando corresponda** mediante formularios guiados (por ejemplo: _Implementación técnica_, _Implementación técnica contractual_, _Edición de VSL_). En la solicitud el alumno completa requisitos, links y datos para que el equipo ejecute el bono.
- **Limitaciones típicas del alumno**:
  - No administra pagos ni ve paneles internos de “seguimiento de pagos”.
  - No edita estado/etapa, ni gestiona pausas, ni asigna coaches.
  - No accede a métricas internas (p. ej. ADS) cuando son operativas.

### Coach

- **Seguimiento del alumno (visión 360)**:
  - Ver **perfil del alumno**, progreso, etapa/estado, historial relevante y actividad.
  - **Actualizar datos operativos** (por ejemplo: nombre del alumno cuando aplica), y registrar “última tarea” para control de seguimiento.
  - **Tareas**: crear/gestionar tareas internas del alumno (no aplica para cuentas alumno).
- **Gestión de coaches del alumno**:
  - Ver coaches asignados.
  - Asignar/quitar/ajustar coaches cuando corresponde a la operación.
- **Gestión de pausas del alumno**:
  - Registrar **períodos de pausa** con **fechas** (desde/hasta), **tipo** (p. ej. contractual o extraordinaria) y **motivo**.
  - Agregar **pausas adicionales** si el alumno ya está en pausa.
  - Editar el rango de fechas de una pausa existente cuando se requiere corrección.
- **Contratos del alumno (operativo)**:
  - Subir/actualizar el contrato asociado al alumno.
  - Descargar/consultar el contrato cuando se necesita validación.
- **Sesiones del alumno (cuando aplica)**:
  - Ver y dar seguimiento al flujo de sesiones (solicitadas/ofrecidas/aprobadas/aceptadas/completadas).
- **Tickets / Feedback**:
  - Ver y atender tickets/feedback, actualizar estados y registrar seguimiento.
  - Comentarios públicos (visibles al alumno) y notas internas (solo equipo), además de archivos/adjuntos.
- **Pagos (seguimiento)**:
  - Acceso al módulo de seguimiento de pagos para revisar estados, cuotas y trazabilidad cuando el proceso lo requiere.

### ATC / Soporte

- **Atención al alumno (operación diaria)**:
  - Atender conversaciones en **chat de soporte**.
  - Dar seguimiento a **tickets/feedback**, pedir información faltante y coordinar respuestas.
- **Gestión operativa del alumno** (según permisos del equipo):
  - Consultar perfil, etapa/estado y registrar información operativa.
  - **Crear/gestionar pausas** (con fechas, tipo y motivo) y corregir rangos cuando haga falta.
  - Apoyar en **contratos** (subida/consulta) cuando el proceso lo requiere.
- **Bonos y solicitudes**:
  - Ver el listado de **solicitudes de bonos** registradas por alumnos.
  - Apoyar el procesamiento interno de solicitudes (revisión de datos, validación de requisitos, coordinación).
- **Pagos**:
  - Revisar estado de pagos y cuotas, y apoyar en la coordinación con el alumno.
- **Sesiones (cuando aplica)**:
  - Apoyar la coordinación y el seguimiento de sesiones (según el flujo definido).

### Sales / Ventas

- **Gestión comercial (CRM)**: seguimiento de oportunidades/procesos comerciales y registro de información de ventas.
- **Organización de campañas y procesos**: herramientas relacionadas con campañas, booking/agendamientos y gestión de datos comerciales.
- **Registro/creación de leads**: creación y actualización de prospectos, etapas de pipeline y asignaciones.
- **Documentos comerciales**: apoyo en generación de documentos/contratos desde plantillas cuando aplica al flujo comercial.

### Admin / Equipo

- **Control total del tablero de tickets**: visibilidad global, filtros, supervisión, reasignaciones y gestión de casos.
- **Administración de usuarios**: gestión de usuarios internos y accesos.
- **Roles y permisos**: creación/edición de roles del sistema.
- **Administración de alumnos**: visión general y detalle del alumno (progreso, información asociada, formularios internos, etc.).
- **Configuración de catálogos/opciones**: administración de opciones usadas por la operación (por ejemplo “etapas” u opciones configurables).
- **Métricas y reportes**: paneles para ver rendimiento, productividad y seguimiento por equipos/coaches.
- **Comunicaciones (Brevo)**: herramientas de comunicación/marketing (según configuración interna).
- **Procesos operativos**: módulos de pagos, bonos, contratos, pausas y solicitudes relacionadas.
- **Acciones de control**:
  - Acceso a vistas de gestión masiva (por ejemplo: listado de alumnos, equipos, métricas).
  - En algunos casos, capacidad de eliminar registros operativos (según módulo).

## Módulos y funcionalidades (por área)

### 1) Tickets (soporte y ejecución)

**Roles que lo usan**:

- Alumno (en modo feedback, para crear y seguir solicitudes)
- Coach
- ATC/Soporte (Equipo)
- Admin/Equipo

- **Tablero de tickets** con dos formas de ver la información:
  - **Vista tipo tablero (kanban)** para mover tickets por estado.
  - **Vista tipo tabla** para listados y revisión rápida.
- **Filtros y búsqueda**: por rango de fechas, estado, tipo y responsable.
- **Detalle del ticket**:
  - información general del caso (título/tema, fechas, estado, vencimientos)
  - **comentarios públicos** (los que ve el alumno)
  - **notas internas** (solo equipo)
  - **archivos adjuntos** (imágenes, audio, video, documentos)
  - **links/recursos** asociados al ticket
- **Reasignación**: posibilidad de reasignar un ticket a otro responsable/equipo cuando aplica.
- **Historial**: acceso a tickets anteriores del mismo alumno para tener contexto.
- **Uso del estado “Pausado”**: se utiliza para indicar que el caso requiere una acción concreta (del alumno o del equipo) antes de continuar.

### 2) Observaciones y tareas internas (por ticket)

**Roles que lo usan**:

- Coach
- ATC/Soporte (Equipo)
- Admin/Equipo

- **Registro de observaciones** asociadas al ticket y al alumno.
- **Clasificación por área** (ej.: COPY, VSL, Técnico, Ads, etc.).
- **Marcado de realizada/completada**: permite hacer seguimiento sin “borrar” el registro.
- **Adjuntar evidencias** (constancias) y texto explicativo.

### 3) Alumnos (gestión y seguimiento)

**Roles que lo usan**:

- Alumno (su propio perfil y accesos de alumno)
- Coach
- ATC/Soporte (Equipo)
- Admin/Equipo

- **Listado de alumnos** y acceso al **perfil/detalle**.
- **Información operativa del alumno** (por ejemplo, etapa o estado dentro del proceso), actualizable por el equipo.
- **Componentes y formularios internos** para gestión (incluye formularios relacionados con métricas/seguimiento de Ads cuando aplica).

Incluye capacidades operativas importantes:

- **Asignación de coaches**: ver, asignar y quitar coaches para un alumno.
- **Tareas**: registro y seguimiento de tareas internas del alumno.
- **Historial**: evolución del alumno (etapas/estatus) y trazabilidad.
- **Pausas**:
  - Registrar pausas con rango de fechas, tipo y motivo.
  - Agregar múltiples periodos de pausa y corregir fechas si es necesario.
- **Contratos**:
  - Subir/descargar el contrato del alumno.
  - Generar documentos de soporte desde plantillas cuando aplica al proceso.

### 4) Métricas y reportes (operación y productividad)

**Roles que lo usan** (según panel):

- Admin/Equipo
- ATC/Soporte (Equipo)
- Coach
- Sales/Ventas (métricas CRM, cuando aplica)

El aplicativo incluye paneles de métricas para entender **volumen de operación, tendencia y desempeño**. En términos funcionales, permite:

- **Métricas de alumnos (visión general)**:
  - **Distribución por Estado** (por ejemplo: activo, inactivo, en pausa).
  - **Distribución por Etapa/Fase** (por ejemplo: onboarding, F1–F5), para ver dónde se concentra la cartera.
  - **Ingresos por día** (tendencia de nuevos alumnos).
  - **Tiempos promedio por fase**: promedio de días que los alumnos demoran en avanzar entre fases (cuando existen registros suficientes).
  - **Retención y permanencia (sintético)**:
    - Cantidad de **completados** (casos de éxito).
    - Cantidad de **abandonos**.
    - **% de retención** (completados sobre completados+abandonos).
    - **Permanencia promedio** (días dentro del programa).

- **Actividad y tareas (seguimiento de constancia)**:
  - **Alumnos “sin enviar tareas”** según la **última entrega registrada**, con rangos típicos (p. ej. 7 días, 2 semanas, 1 mes, 3 meses o un rango personalizado).
  - **Listados de alumnos** por cada rango, para accionar seguimiento.
  - **Segmentación por “buckets” de inactividad** (por ejemplo: 3–6 días, 7–14 días, 15–29 días y ≥ 30 días).

- **Transiciones de fase (flujo del programa)**:
  - Cantidad de **transiciones por fase** en ventanas recientes (p. ej. últimos 7 días / 1 mes / 4 meses).
  - Acceso a **listados por fase** con fecha y datos de apoyo para análisis y control.

- **Métricas de tickets (soporte y ejecución)**:
  - **Totales y distribución por estado** (por ejemplo: resuelto, pendiente, en progreso, pendiente de envío, pausado).
  - **Tendencia de tickets por día** con **media móvil de 7 días** para ver la curva sin ruido.
  - **Actividad reciente**: tickets de hoy, últimos 7 días y últimos 30 días.
  - **Promedio por día**, **día más activo** (pico) y **días sin actividad** dentro del rango.
  - **Resumen operativo adicional**:
    - Top alumnos con más tickets en el rango.
    - Top tipos de ticket.
    - Top informantes (cuando aplica) y distribución.
  - **Tiempos (cuando hay información disponible)**:
    - Tiempo medio a **resolución** (desde creación hasta cierre).
    - Tiempo medio/mediana de **primera respuesta registrada** (y % de tickets donde existe esa primera respuesta).

- **Métricas por coach (cartera + tickets)**:
  - Selección de **coach** y **rango de fechas** para análisis.
  - **Cartera del coach**: total de alumnos, activos, en pausa e inactivos.
  - **Alumnos por fase actual** (distribución por etapa).
  - **Tickets del coach** (tickets de los alumnos de su cartera) en el rango, con curva diaria + media móvil.
  - **Listado de alumnos del coach** (código, nombre, estado, etapa e ingreso) para gestión.
  - Nota: algunos indicadores más finos (p. ej. tiempos de respuesta por persona) pueden requerir datos adicionales para medirse con precisión.

- **Métricas de chat (auditoría / revisión)**:
  - Vista de **usuarios internos** (equipo) con búsqueda.
  - **Listado de conversaciones** por usuario: participantes, último mensaje y no leídos (si aplica).
  - **Vista de mensajes** por conversación y resumen de participación (quién habló más, conteos por participante).

- **Métricas ADS por alumno (operativas)**:
  - Registro y seguimiento de métricas de Ads asociadas al alumno (por ejemplo: **inversión** y **facturación**) y **fecha de última actualización**.
  - Resumen de “último registro por alumno” para control de actualización y seguimiento.

- **Métricas de equipos y productividad (operación global)**:
  - **Totales generales** (equipos, alumnos, tickets) y promedios de **tiempo de respuesta** / **tiempo de resolución** cuando existen datos.
  - **Tickets por período** (tendencia diaria, y agregados por semana/mes) para entender la carga de trabajo.
  - **Distribución de alumnos** por **fase** y por **estado** (vista agregada y, cuando aplica, con listados para acción).
  - **Comparativos por coach y por equipo**:
    - Volumen de tickets.
    - Promedios de respuesta y resolución.
  - **Productividad por coach** (según el panel): volumen de tickets y otros indicadores operativos disponibles.
  - **Detalle de tickets** para análisis:
    - Tickets por alumno (ranking) y visualizaciones asociadas.
    - Tickets por informante (distribución y tendencia por día).
    - Identificación de casos extremos (por ejemplo, el ticket con respuesta más lenta en el rango).
  - **Bloque “equipos conformados”** (cuando aplica): resumen y distribución de métricas asociadas a conformación/estructura operativa.

- **Métricas ADS (visión global)**:
  - KPIs de Ads disponibles para operación (por ejemplo: inversión, facturación, ROAS y métricas de efectividad cuando existen datos).
  - Listados para revisión y seguimiento (por ejemplo por alumno y/o por fase, según el panel).

- **Métricas de sesiones (cuando aplica)**:
  - **KPIs de flujo**: total de sesiones y estados típicos (solicitadas, ofrecidas, aprobadas, aceptadas, completadas).
  - **Conversión del flujo**: porcentaje que avanza hasta aprobación/aceptación/completadas.
  - **Tendencia por día** de sesiones para ver alzas/bajas del período.
  - **Desglose por coach** y **por alumno** (con conteos y, cuando existe información, promedios de tiempo).
  - **Mejores coaches** (ranking) según sesiones aceptadas/completadas en el rango.

### 5) Chat y comunicación

**Roles que lo usan**:

- Alumno
- Coach
- ATC/Soporte (Equipo)
- Admin/Equipo

- **Chat en tiempo real**: comunicación y soporte mediante chat.
- **Notificaciones del chat**: avisos para nuevos mensajes y seguimiento.
- **Soporte de multimedia**: reproducción/visualización de contenido (por ejemplo, video) dentro de la experiencia.

### 6) CRM / Ventas

**Roles que lo usan**:

- Sales/Ventas
- Admin/Equipo
- ATC/Soporte (Equipo) (cuando participa del proceso)

- **Gestión de pipeline comercial**: registrar y dar seguimiento a ventas.
- **Campañas y procesos**: módulos relacionados con campañas, booking/agendamiento y manejo de información comercial.
- **Booking público**: formulario de registro/captación (para leads), con soporte de campañas/eventos.
- **Generación de contratos/documentos**: herramientas para generar documentos desde plantillas para formalización/seguimiento.

### 7) Pagos, bonos y solicitudes

**Roles que lo usan**:

- Coach (seguimiento)
- ATC/Soporte (Equipo)
- Admin/Equipo

- **Pagos (seguimiento)**:
  - Consultar pagos, cuotas, estados (por ejemplo: pendiente, pagado, en proceso, moroso, etc.).
  - Actualizar información operativa cuando se requiere (por ejemplo: detalles, sincronización y correcciones).
- **Bonos (catálogo)**:
  - Crear/editar/eliminar bonos disponibles (catálogo interno).
  - Activar/inactivar bonos y mantener su información (descripción, valor, reglas internas).
- **Ejemplos de bonos que maneja la operación** (pueden variar por contrato/plan):
  - **Kit Corporativo** (herramientas/contactos para escalar).
  - **Trafficker** (montaje de campañas al llegar a cierta fase).
  - **Auditoría de Ofertas** (asesoría y agendamiento).
  - **Mes(es) extra** (extensión del programa).
  - **Sesiones en vivo** (cuando aplica).
  - **Edición de VSL** (servicio adicional bajo condiciones).
  - **Implementación técnica** (servicio adicional bajo condiciones).
- **Bonos del alumno (asignación)**:
  - Asignar bonos a un alumno.
  - Quitar bonos asignados cuando corresponde.
- **Solicitudes de bonos (del alumno hacia el equipo)**:
  - El alumno genera una solicitud guiada (con requisitos y datos).
  - El equipo ve el listado de solicitudes, revisa el detalle y coordina su ejecución.

### 8) PWA, notificaciones y experiencia móvil

- **Instalación como app (PWA)**: permite usar la plataforma con experiencia tipo aplicación.
- **Diagnóstico PWA**: utilidades para revisar disponibilidad/estado de la PWA.
- **Notificaciones**: soporte para notificaciones (incluye push cuando el entorno lo permite).

### 9) Equipos (operación interna)

**Roles que lo usan**:

- Coach (según permisos)
- ATC/Soporte (Equipo)
- Admin/Equipo

- **Gestión por equipos/coaches**: vista de operación agrupada por coach/equipo.
- **Paneles de seguimiento**: indicadores de tickets, alumnos y productividad para supervisión y control.
- **Vista personal de métricas** (cuando aplica): un coach puede revisar sus propios indicadores con rango de fechas.

### 10) Sesiones (solicitud y seguimiento)

**Roles que lo usan**:

- Alumno
- Coach
- ATC/Soporte (Equipo)
- Admin/Equipo

- **Panel de sesiones del alumno**: seguimiento del flujo de sesiones según el proceso definido (solicitudes, aprobaciones, aceptación y completadas).
- **Contexto operativo**: el equipo puede ver información de apoyo (por ejemplo fase/etapa y coaches asignados) para gestionar correctamente.

### 11) Administración del sistema (usuarios, roles y opciones)

**Roles que lo usan**:

- Admin/Equipo
- ATC/Soporte (Equipo) (opciones/catálogos, cuando aplica)

- **Usuarios del sistema**: búsqueda, paginado y gestión de usuarios internos/alumnos según permisos.
- **Roles y permisos**: creación/edición de roles y su información para control de acceso.
- **Opciones/catálogos operativos**: administración de listas usadas por la operación (por ejemplo: estado de cliente, etapas, estado/tipo de ticket, puesto, área, etc.).

## Alcance del documento

- Este resumen describe las funcionalidades disponibles a nivel general y puede actualizarse conforme evolucione la operación.
- **Duración del proyecto**: **3 meses de implementación + 2 meses de marcha blanca**. Actualmente estamos en el **2º mes de marcha blanca**, afinando detalles para una entrega completa.
- **Estado actual**: la **gestión de Contratos** y el módulo de **CRM/Ventas** están en **modo de testeo** para validar casos reales; es posible que se ajusten flujos, textos o validaciones antes de considerarse definitivos.
