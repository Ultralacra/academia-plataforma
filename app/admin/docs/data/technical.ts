export interface ContentBlock {
  type: "text" | "code" | "list" | "table" | "note" | "warning" | "architecture" | "flow"
  content?: string
  language?: string
  items?: string[]
  headers?: string[]
  rows?: string[][]
  title?: string
}

export interface SubsectionContent {
  id: string
  blocks: ContentBlock[]
}

export interface SectionContent {
  id: string
  subsections: SubsectionContent[]
}

export const technicalContent: SectionContent[] = [
  // ============================================================
  // 1. ARQUITECTURA GENERAL
  // ============================================================
  {
    id: "arquitectura",
    subsections: [
      {
        id: "stack",
        blocks: [
          {
            type: "text",
            content:
              "La plataforma Academia X (HotSelling) está construida con un stack moderno orientado a rendimiento, escalabilidad y experiencia de usuario.",
          },
          {
            type: "table",
            headers: ["Capa", "Tecnología", "Versión"],
            rows: [
              ["Frontend Framework", "Next.js (App Router)", "14.2.16"],
              ["UI Library", "React", "18.x"],
              ["Lenguaje", "TypeScript", "Strict mode"],
              ["Estilos", "Tailwind CSS", "v4"],
              ["Componentes UI", "Radix UI (shadcn/ui)", "latest"],
              ["Real-time", "Socket.IO", "client + server"],
              ["AI - OpenAI", "openai SDK", "ATC Agent"],
              ["AI - Anthropic", "@anthropic-ai/sdk", "Copy, Super-ATC, Support-ATC"],
              ["Video", "Remotion", "Player de grabaciones"],
              ["Almacenamiento", "Bunny CDN", "Archivos y media"],
              ["Email", "Brevo (Sendinblue)", "Transaccional"],
              ["Contratos", "docxtemplater + docx", "Generación DOCX"],
              ["Backend API", "REST externo", "api-ax.valinkgroup.com"],
              ["Auth", "Bearer Token (JWT)", " localStorage + cookies"],
            ],
          },
        ],
      },
      {
        id: "diagrama",
        blocks: [
          {
            type: "text",
            content: "La plataforma sigue una arquitectura de frontend delgado que se comunica con un backend REST externo. El servidor Next.js actúa como BFF (Backend for Frontend) para operaciones que requieren credenciales del servidor (OAuth, webhooks).",
          },
          {
            type: "architecture",
            content: `
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (Browser)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  React   │  │ Socket.IO│  │  Auth    │  │ Metadata │   │
│  │Components│  │  Client  │  │ Service  │  │  Client  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │ apiFetch()                       │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│              Next.js Server (BFF)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ API      │  │ OAuth    │  │ Brevo    │  │ Bunny    │   │
│  │ Routes   │  │ Callback │  │ Webhooks │  │ Proxy    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
└───────┼──────────────┼──────────────┼──────────────┼─────────┘
        │              │              │              │
┌───────┼──────────────┼──────────────┼──────────────┼─────────┐
│       ▼              ▼              ▼              ▼         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Backend REST API (api-ax.valinkgroup.com)   │    │
│  │  /v1/auth/*  /v1/users  /v1/clients  /v1/tickets   │    │
│  │  /v1/metadata  /v1/teams  /v1/metrics               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Zoom    │  │  Brevo   │  │  Bunny   │  │  OpenAI  │   │
│  │  OAuth   │  │  API     │  │  CDN     │  │  Claude  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────────────────────┘
`,
          },
        ],
      },
      {
        id: "flujo-requests",
        blocks: [
          {
            type: "text",
            content:
              "Todos los requests del frontend pasan por la función apiFetch() que automáticamente maneja autenticación, refresh de tokens y manejo de errores.",
          },
          {
            type: "flow",
            content: `
Frontend (React)
    │
    ▼
apiFetch(endpoint, options)          ← lib/api-config.ts
    │
    ├─ Agrega Authorization: Bearer <token>
    │
    ├─ Prepende API_HOST: https://api-ax.valinkgroup.com/v1
    │
    ▼
Backend REST API
    │
    ├─ 200 OK →返回 JSON data
    │
    ├─ 401 Unauthorized
    │   │
    │   ├─ Intenta /auth/refresh o /auth/refresh-token
    │   │   │
    │   │   ├─ 200 → Reintenta request original con nuevo token
    │   │   │
    │   │   └─ Falla → logout(), redirige a /login
    │   │
    │   └─ AuthService.logout()
    │
    ├─ 403 Forbidden → Sin permisos
    │
    └─ 500 Error → Muestra toast de error
`,
          },
        ],
      },
      {
        id: "roles-sistema",
        blocks: [
          {
            type: "text",
            content: "El sistema maneja 6 roles principales que determinan qué vistas y acciones están disponibles para cada usuario.",
          },
          {
            type: "table",
            headers: ["Rol", "Acceso", "Descripción"],
            rows: [
              ["admin", "Total", "Acceso completo a todas las funcionalidades"],
              ["equipo", "Total (como admin)", "Miembro del equipo interno. Se mapea a 'admin' para permisos"],
              ["coach", "Parcial", "Ve sus estudiantes asignados, chat, métricas propias"],
              ["student", "Limitado", "Ve su propio perfil, chat, agentes IA, pagos"],
              ["atc", "Parcial", "Atención al cliente. Ve tickets y chat"],
              ["sales", "CRM", "Ventas, pipeline, contratos, bookings"],
            ],
          },
        ],
      },
      {
        id: "env-vars",
        blocks: [
          {
            type: "text",
            content: "Variables de entorno necesarias para el funcionamiento de la plataforma. Se configuran en `.env.local`.",
          },
          {
            type: "code",
            language: "bash",
            content: `# Backend API
NEXT_PUBLIC_API_HOST=https://api-ax.valinkgroup.com/v1
NEXT_PUBLIC_CHAT_HOST=https://api-ax.valinkgroup.com

# Brevo (Email)
BREVO_API_KEY=votre_clé_api_brevo

# Zoom OAuth
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
ZOOM_REDIRECT_URI=https://yourdomain.com/api/zoom/callback

# OpenAI (ATC Agent)
OPENAI_API_KEY=sk-...

# Anthropic Claude (Copy, Super-ATC, Support-ATC)
ANTHROPIC_API_KEY=sk-ant-...

# Bunny CDN
BUNNY_STORAGE_ZONE=your_zone
BUNNY_API_KEY=your_api_key
BUNNY_CDN_HOST=your_cdn.b-cdn.net`,
          },
        ],
      },
    ],
  },

  // ============================================================
  // 2. SISTEMA DE AUTENTICACIÓN
  // ============================================================
  {
    id: "auth",
    subsections: [
      {
        id: "auth-service",
        blocks: [
          {
            type: "text",
            content:
              "AuthService es una clase singleton que maneja toda la autenticación de la aplicación. Está definida en `lib/auth.ts` y gestiona login, logout, refresh de tokens y persistencia de sesión.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// lib/auth.ts - Estructura simplificada
class AuthService {
  private user: User | null = null
  private token: string | null = null
  private refreshPromise: Promise<string | null> | null = null

  // Login: POST /v1/auth/login
  async login(email: string, password: string): Promise<LoginResult>

  // Validar sesión: GET /v1/auth/me (con cache de 30s)
  async me(): Promise<User | null>

  // Refresh automático de token
  async refreshToken(): Promise<string | null>

  // Logout: limpia localStorage y dispatch event
  logout(): void

  // Helpers
  getToken(): string | null
  getUser(): User | null
  isAuthenticated(): boolean
  hasRole(roles: UserRole[]): boolean
}`,
          },
        ],
      },
      {
        id: "flujo-login",
        blocks: [
          {
            type: "flow",
            content: `
Usuario ingresa email + password
    │
    ▼
AuthService.login(email, password)
    │
    ├─ POST /v1/auth/login { email, password }
    │
    ├─ Respuesta: { user: {...}, token: "jwt_token" }
    │
    ├─ Guarda en localStorage("academy_auth")
    │   { user, token, timestamp }
    │
    ├─ Normaliza el rol del usuario
    │   (admin, equipo→admin, coach, student, atc, sales)
    │
    ├─ Dispatch CustomEvent("auth:changed")
    │   (sincroniza entre pestañas)
    │
    └─ Redirige según rol:
        admin/equipo → /admin
        coach → /admin/teamsv2/[code]
        student → /chat
        sales → /admin/crm`,
          },
        ],
      },
      {
        id: "persistencia",
        blocks: [
          {
            type: "text",
            content:
              "La sesión se persiste en `localStorage` bajo la key `academy_auth`. El formato es:",
          },
          {
            type: "code",
            language: "json",
            content: `{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "nombre": "Juan Pérez",
    "role": "admin",
    "tipo": "admin",
    "code": "USR001"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "timestamp": 1718640000000
}`,
          },
          {
            type: "note",
            content:
              "El timestamp se usa para detectar sesiones expiradas. Si el token tiene más de 24 horas, se intenta un refresh automático.",
          },
        ],
      },
      {
        id: "refresh-token",
        blocks: [
          {
            type: "text",
            content:
              "Cuando un request retorna 401, el sistema intenta automáticamente refrescar el token antes de hacer logout. Usa un patrón de promesa deduplicada para evitar múltiples refresh simultáneos.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Flujo de refresh en apiFetch()
async function apiFetch(endpoint, options) {
  const token = AuthService.getToken()
  const res = await fetch(url, { ...options, token })

  if (res.status === 401) {
    // Deduplicación: si ya hay un refresh en curso, reusarlo
    if (!authService.refreshPromise) {
      authService.refreshPromise = authService.refreshToken()
    }
    const newToken = await authService.refreshPromise
    authService.refreshPromise = null

    if (newToken) {
      // Reintenta el request original con el nuevo token
      return fetch(url, { ...options, token: newToken })
    } else {
      // Refresh falló → logout
      AuthService.logout()
      window.location.href = "/login"
    }
  }
  return res
}`,
          },
        ],
      },
      {
        id: "normalizacion-roles",
        blocks: [
          {
            type: "text",
            content:
              "El backend retorna roles en diferentes formatos. AuthService normaliza todo a un tipo union consistente.",
          },
          {
            type: "code",
            language: "typescript",
            content: `type UserRole = "admin" | "coach" | "student" | "equipo" | "atc" | "sales"

function normalizeRole(user: any): UserRole {
  const role = user.role || user.tipo || "student"

  // "equipo" se mapea a "admin" para permisos
  if (role === "equipo") return "admin"

  // Roles válidos
  const validRoles: UserRole[] = ["admin", "coach", "student", "atc", "sales"]
  return validRoles.includes(role) ? role : "student"
}`,
          },
        ],
      },
      {
        id: "sync-pestanas",
        blocks: [
          {
            type: "text",
            content:
              "Cuando un usuario hace login o logout en una pestaña, las demás pestañas se enteran mediante un CustomEvent en el window.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Al hacer login
window.dispatchEvent(new CustomEvent("auth:changed", { detail: { type: "login" } }))

// Al hacer logout
window.dispatchEvent(new CustomEvent("auth:changed", { detail: { type: "logout" } }))

// En cualquier componente que necesite reaccionar
useEffect(() => {
  const handler = () => { checkAuth() }
  window.addEventListener("auth:changed", handler)
  return () => window.removeEventListener("auth:changed", handler)
}, [])`,
          },
        ],
      },
      {
        id: "protected-route",
        blocks: [
          {
            type: "text",
            content:
              "El componente ProtectedRoute envuelve las rutas que requieren autenticación. Verifica el token, el rol del usuario, y redirige si no cumple.",
          },
          {
            type: "code",
            language: "tsx",
            content: `// components/auth/protected-route.tsx
<ProtectedRoute allowedRoles={["admin", "equipo"]}>
  <AdminDashboard />
</ProtectedRoute>

// Comportamiento:
// 1. Si no hay token → redirige a /login?next=/admin
// 2. Si hay token pero el rol no está permitido → redirige a su panel
// 3. Si el usuario es student y accede a /admin → redirige a /chat
// 4. Si todo OK → renderiza children`,
          },
        ],
      },
      {
        id: "use-auth-hook",
        blocks: [
          {
            type: "text",
            content:
              "El hook useAuth() provee acceso al estado de autenticación desde cualquier componente. Incluye cache de 30 segundos para evitar requests innecesarios a /auth/me.",
          },
          {
            type: "code",
            language: "typescript",
            content: `const { user, token, isLoading, login, logout, me } = useAuth()

// user: Usuario actual o null
// token: JWT token o null
// isLoading: true mientras se valida la sesión
// login(email, password): Función de login
// logout(): Función de logout
// me(): Revalidar sesión manualmente`,
          },
        ],
      },
    ],
  },

  // ============================================================
  // 3. CAPA DE DATOS
  // ============================================================
  {
    id: "datos",
    subsections: [
      {
        id: "data-service",
        blocks: [
          {
            type: "text",
            content:
              "DataService es un singleton que centraliza todas las llamadas a la API del backend. Maneja múltiples formatos de respuesta y paginación.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// lib/data-service.ts
class DataService {
  // Equipos/Coaches
  async getTeams(): Promise<Team[]>
  async getCoaches(): Promise<Coach[]>

  // Estudiantes/Clientes
  async getClients(params?: ClientParams): Promise<Client[]>
  async getClientByCode(code: string): Promise<Client>

  // Tickets
  async getTickets(params?: TicketParams): Promise<Ticket[]>

  // Métricas
  async getMetrics(): Promise<Metrics>
}

export const dataService = new DataService()`,
          },
        ],
      },
      {
        id: "multi-formato",
        blocks: [
          {
            type: "text",
            content:
              "El backend retorna datos en dos formatos diferentes dependiendo del endpoint. DataService maneja ambos gracefulmente.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Formato legacy (algunos endpoints):
{ getTeam: { data: [...] } }

// Formato nuevo (la mayoría):
{ code: 200, status: "success", data: [...] }

// DataService detecta y extrae el array de datos
function extractData(response: any): any[] {
  if (response?.data) return response.data           // Formato nuevo
  if (response?.getTeam?.data) return response.getTeam.data  // Legacy
  if (Array.isArray(response)) return response        // Array directo
  return []
}`,
          },
        ],
      },
      {
        id: "paginacion",
        blocks: [
          {
            type: "text",
            content:
              "La paginación se maneja de dos formas según el caso de uso.",
          },
          {
            type: "table",
            headers: ["Estrategia", "Cuándo se usa", "Detalle"],
            rows: [
              [
                "Client-side",
                "La mayoría de los filtros",
                "Se traen hasta 1000 registros, se filtran en memoria",
              ],
              [
                "Server-side",
                "Tickets (puede haber miles)",
                "Se pagina server-side hasta 10,000, se combinan",
              ],
            ],
          },
        ],
      },
      {
        id: "endpoints-principales",
        blocks: [
          {
            type: "table",
            headers: ["Endpoint", "Método", "Descripción"],
            rows: [
              ["/v1/auth/login", "POST", "Login de usuario"],
              ["/v1/auth/me", "GET", "Validar sesión actual"],
              ["/v1/auth/refresh", "POST", "Refrescar token"],
              ["/v1/users", "GET", "Lista de usuarios"],
              ["/v1/clients", "GET", "Lista de clientes/estudiantes"],
              ["/v1/teams", "GET", "Lista de equipos/coaches"],
              ["/v1/tickets", "GET", "Lista de tickets"],
              ["/v1/metrics", "GET", "Métricas generales"],
              ["/v1/metadata", "GET/POST", "CRUD de metadata"],
            ],
          },
        ],
      },
      {
        id: "modulos-api",
        blocks: [
          {
            type: "text",
            content:
              "Cada módulo del admin tiene su propio archivo `api.ts` que encapsula las llamadas específicas. Esto mantiene el código organizado y reutilizable.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Ejemplos de archivos api.ts por módulo:
app/admin/users/api.ts           → CRUD de usuarios
app/admin/tickets-board/api.ts   → Tickets, comentarios, notas
app/admin/crm/api.ts             → Leads, metadata CRM, reservas
app/admin/payments/api.ts        → Cronogramas, cuotas, facturas
app/admin/alumnos/api.ts         → Datos de clientes, contratos
app/admin/solicitud-bonos/api.ts → Solicitudes de bonos
app/admin/teamsv2/api.ts         → Coaches y equipos
app/admin/opciones/api.ts        → Opciones del sistema`,
          },
        ],
      },
    ],
  },

  // ============================================================
  // 4. SISTEMA DE METADATA
  // ============================================================
  {
    id: "metadata",
    subsections: [
      {
        id: "esquema",
        blocks: [
          {
            type: "text",
            content:
              "El sistema de metadata es un almacén de pares clave-valor genérico en el backend. Permite almacenar datos personalizados sin modificar la esquema de la base de datos.",
          },
          {
            type: "code",
            language: "typescript",
            content: `interface MetadataRecord {
  id: string           // ID único del registro
  entity: string       // Tipo de entidad (ej: "sale", "ads_metrics")
  entity_id: string    // ID de la entidad relacionada
  payload: object      // Datos personalizados (JSON)
  created_at?: string
  updated_at?: string
}`,
          },
        ],
      },
      {
        id: "crud",
        blocks: [
          {
            type: "code",
            language: "typescript",
            content: `// lib/metadata.ts
import { apiFetch } from "@/lib/api-config"

// Crear
await createMetadata("ads_metrics", "student_123", { spend: 500, roas: 3.2 })

// Listar por entidad
const records = await listMetadata("ads_metrics")

// Obtener uno
const record = await getMetadata("ads_metrics", "student_123")

// Actualizar
await updateMetadata(recordId, { spend: 600, roas: 3.5 })`,
          },
        ],
      },
      {
        id: "entidades",
        blocks: [
          {
            type: "text",
            content: "Entidades de metadata conocidas en el sistema:",
          },
          {
            type: "table",
            headers: ["Entidad", "Módulo", "Contenido"],
            rows: [
              ["sale", "CRM", "Datos de venta y seguimiento"],
              ["ads_metrics", "Alumnos/ADS", "Métricas de publicidad por estudiante"],
              ["agente_uso_*", "Agentes IA", "Uso de agentes por estudiante"],
              ["followup_messages", "Seguimiento", "Templates de mensajes de seguimiento"],
              ["faq", "Configuración", "Preguntas frecuentes"],
              ["internal_notes", "Tickets", "Notas internas de tickets"],
              ["emma_pause_outcomes", "Agentes IA", "Resultados de pausas de Emma"],
              ["pilot_meta", "Plantillas", "Metadatos del piloto IA"],
              ["crm_prospect", "CRM", "Datos de prospectos"],
              ["bonos_solicitud", "Bonos", "Solicitudes de bonos"],
            ],
          },
        ],
      },
      {
        id: "v1-vs-v2",
        blocks: [
          {
            type: "text",
            content:
              "Existen dos versiones del endpoint de metadata: V1 (original) y V2 (mejorado con filtros y paginación). La mayoría del código usa V1 por retrocompatibilidad.",
          },
          {
            type: "table",
            headers: ["Versión", "Endpoint", "Características"],
            rows: [
              ["V1", "/api/metadata", "CRUD básico, sin filtros avanzados"],
              ["V2", "/api/metadata-v2", "Filtros por entity, paginación, búsqueda"],
            ],
          },
        ],
      },
      {
        id: "monitor",
        blocks: [
          {
            type: "text",
            content:
              "El dashboard de Metadata Analytics (`/admin/metadata-analytics`) permite explorar todos los registros de metadata agrupados por tipo de entidad, con enlaces cruzados a los módulos de origen.",
          },
          {
            type: "text",
            content: "Funcionalidades del monitor:",
          },
          {
            type: "list",
            items: [
              "Vista agrupada: Todos los registros organizados por tipo de entidad",
              "Conteo: Cantidad de registros por entidad",
              "Búsqueda: Filtrar registros por contenido del payload",
              "Navegación: Enlaces directos al módulo de origen de cada registro",
              "Detalle: Vista expandida del payload de cada registro",
              "Creación: Crear nuevos registros de metadata directamente desde el monitor",
            ],
          },
          {
            type: "note",
            content:
              "El monitor es una herramienta de debugging y administración. Úsala para investigar datos de metadata cuando algo no funciona correctamente en otros módulos.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 5. INTEGRACIÓN ZOOM
  // ============================================================
  {
    id: "zoom",
    subsections: [
      {
        id: "oauth-flow",
        blocks: [
          {
            type: "text",
            content:
              "La integración con Zoom usa OAuth 2.0 para acceder a grabaciones y transcripciones del usuario autenticado.",
          },
          {
            type: "flow",
            content: `
1. Usuario clickea "Conectar con Zoom"
   │
   ▼
2. GET /api/zoom/auth
   → Redirige a Zoom OAuth consent screen
   │
   ▼
3. Zoom redirige a /api/zoom/callback?code=...
   │
   ▼
4. POST https://zoom.us/oauth/token
   → Intercambia code por access_token + refresh_token
   │
   ▼
5. Guarda tokens en cookies HttpOnly:
   - zoom_access_token (expira en 1 hora)
   - zoom_refresh_token (expira en 30 días)
   │
   ▼
6. Set-Cookie header en la respuesta actualiza automáticamente
   las cookies del navegador`,
          },
        ],
      },
      {
        id: "gestion-tokens",
        blocks: [
          {
            type: "text",
            content:
              "La función `getAccessToken()` en `lib/zoom.ts` maneja la obtención del token con prioridad OAuth > S2S (Server-to-Server).",
          },
          {
            type: "code",
            language: "typescript",
            content: `// lib/zoom.ts
async function getAccessToken(request: NextRequest): Promise<string> {
  // 1. Intentar OAuth cookie primero (tiene scopes de usuario)
  const oauthToken = getZoomOAuthAccessToken(request)
  if (oauthToken) {
    // Verificar si expiró y refrescar
    const refreshed = await refreshZoomTokenIfExpired(request)
    if (refreshed) return refreshed
  }

  // 2. Fallback a S2S (Server-to-Server)
  const s2sToken = await getZoomS2SAccessToken()
  return s2sToken
}`,
          },
        ],
      },
      {
        id: "endpoints-zoom",
        blocks: [
          {
            type: "table",
            headers: ["Endpoint", "Método", "Descripción"],
            rows: [
              ["/api/zoom/auth", "GET", "Inicia flujo OAuth"],
              ["/api/zoom/callback", "GET", "Callback de OAuth"],
              ["/api/zoom/recordings", "GET", "Grabaciones del usuario"],
              ["/api/zoom/global-recordings", "GET", "Grabaciones de todos los usuarios"],
              ["/api/zoom/users", "GET", "Lista de usuarios Zoom"],
              ["/api/zoom/transcribe", "POST", "Solicitar transcripción cloud"],
              ["/api/zoom/download", "GET", "Proxy de descarga autenticado"],
              ["/api/zoom/disconnect", "POST", "Desconectar OAuth tokens"],
            ],
          },
        ],
      },
      {
        id: "vtt-txt",
        blocks: [
          {
            type: "text",
            content:
              "Las transcripciones de Zoom vienen en formato WebVTT. La función `vttToTxt()` convierte este formato a texto plano limpio.",
          },
          {
            type: "code",
            language: "typescript",
            content: `function vttToTxt(vttContent: string): string {
  return vttContent
    .split("\\n")
    .filter((line) => {
      // Eliminar timestamps (00:00:00.000 --> 00:00:02.000)
      if (/^\\d{2}:\\d{2}:\\d{2}/.test(line)) return false
      // Eliminar cabecera WEBVTT
      if (line.startsWith("WEBVTT")) return false
      // Eliminar líneas vacías
      if (line.trim() === "") return false
      return true
    })
    .join("\\n")
}`,
          },
        ],
      },
      {
        id: "proxy-descarga",
        blocks: [
          {
            type: "text",
            content:
              "El endpoint `/api/zoom/download` actúa como proxy autenticado para descargar grabaciones. El frontend no necesita manejar tokens de Zoom directamente.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 6. AGENTES IA
  // ============================================================
  {
    id: "agentes",
    subsections: [
      {
        id: "arquitectura-ia",
        blocks: [
          {
            type: "text",
            content:
              "La plataforma integra 4 agentes IAspecializados, cada uno con un proveedor de IA y caso de uso específico. Todos ejecutan server-side con un timeout de 300 segundos.",
          },
          {
            type: "table",
            headers: ["Agente", "Proveedor", "Uso", "Runtime"],
            rows: [
              ["ATC Admin", "OpenAI GPT", "Recomendación de asignación de coaches", "Node.js, 300s"],
              ["Copy Agent", "Anthropic Claude", "Revisión de copy, guiones VSL, copywriting", "Node.js, 300s"],
              ["Super-ATC", "Anthropic Claude", "Clasificación de riesgo, escalamiento, multi-ticket", "Node.js, 300s"],
              ["Support-ATC", "Anthropic Claude", "Copilot para equipo de soporte con knowledge base", "Node.js, 300s"],
            ],
          },
        ],
      },
      {
        id: "atc-agent",
        blocks: [
          {
            type: "text",
            content:
              "El ATC Agent analiza datos de estudiantes y coaches para recomendar la mejor asignación de equipo. Usa OpenAI con tool-calling para analizar datos reales.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// POST /api/agentes/atc
// Request: { message: string }
// Response: { reply: string, data?: any }

// El system prompt incluye:
// - Datos de todos los coaches (nombre, estudiantes asignados, tickets, carga)
// - Datos de todos los estudiantes (nombre, fase, coach actual)
// - Instrucciones para analizar compatibilidad y recommendar`,
          },
        ],
      },
      {
        id: "copy-agent",
        blocks: [
          {
            type: "text",
            content:
              "El Copy Agent usa Claude y tiene un sistema de sub-agentes especializados. Puede revisar documentos DOCX/PDF y generar revisiones detalladas.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Sub-agentes del Copy Agent:
// 1. Phase 1 HotSelling Reviewer - Revisa la fase 1 del curso
// 2. VSL Scripter - Genera guiones de video de ventas
// 3. Copywriter General - Revisión de copy y textos

// POST /api/agentes/copy
// Request: { message: string, subAgent?: string }

// POST /api/agentes/copy/parse-file
// Request: FormData con archivo DOCX/PDF
// Response: { text: string }

// POST /api/agentes/copy/export-docx
// Request: { content: string, title: string }
// Response: ArrayBuffer (DOCX file)`,
          },
        ],
      },
      {
        id: "super-atc",
        blocks: [
          {
            type: "text",
            content:
              "El Super-ATC Agent es el agente más avanzado. Clasifica riesgo de conversaciones, gestiona escalamientos obligatorios, y puede crear múltiples tickets por interacción.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// POST /api/agentes/super-atc
// Request: { message: string, context?: {...} }
// Response: { reply: string, action?: ActionBlock[] }

// Clasificación de riesgo:
// ALTO → Escalamiento obligatorio a especialista
// MEDIO → Propón ticket si requiere especialista
// BAJO → Responde directamente

// Sistema multi-ticket:
// [ACCION:CREAR_TICKET]
// titulo: "Problema con plataforma"
//rioridad: ALTO
// estudiante: "USR001"
// [FIN_ACCION]

// [ACCION:CREAR_TICKET]
// titulo: "Solicitud de reembolso"
// prioridad: MEDIO
// estudiante: "USR001"
// [FIN_ACCION]`,
          },
        ],
      },
      {
        id: "soporte-atc",
        blocks: [
          {
            type: "text",
            content:
              "El Support-ATC Agent sirve como copilot para el equipo de soporte. Tiene acceso a una knowledge base con información de la plataforma.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// POST /api/agentes/soporte-atc
// Request: { message: string }
// Response: { reply: string }

// GET /api/agentes/soporte-atc/knowledge
// Response: { articles: KnowledgeArticle[] }`,
          },
        ],
      },
      {
        id: "multi-ticket",
        blocks: [
          {
            type: "text",
            content:
              "El sistema multi-ticket permite que el agente Super-ATC cree múltiples tickets en una sola respuesta. Frontend parsea todos los bloques de acción.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Regex para detectar múltiples bloques (global flag)
const ACTION_REGEX = /\\[ACCION:([A-Z_]+)\\]([\\s\\S]*?)\\[FIN_ACCION\\]/g

// Parsea todos los bloques de acción
function parseActionBlocks(text: string): ActionBlock[] {
  const matches = [...text.matchAll(ACTION_REGEX)]
  return matches.map((match) => ({
    type: match[1],                    // CREAR_TICKET, ESCALAR, etc.
    params: parseParams(match[2]),     // Parámetros del bloque
  }))
}

// Frontend muestra modal de confirmación por cada ticket
const [pendingTickets, setPendingTickets] = useState<ActionBlock[]>([])
const [ticketModalIndex, setTicketModalIndex] = useState(0)`,
          },
        ],
      },
      {
        id: "tracking-uso",
        blocks: [
          {
            type: "text",
            content:
              "Cada interacción con un agente se registra en metadata para tracking de uso y costos. Los dashboards muestran tokens de entrada/salida, tokens cacheados, y costos estimados.",
          },
        ],
      },
      {
        id: "pause-outcomes",
        blocks: [
          {
            type: "text",
            content:
              "Emma (Super-ATC) registra resultados de pausas en la entidad `emma_pause_outcomes`. Trackea: confirmadas, canceladas, fallidas, y pendientes.",
          },
          {
            type: "code",
            language: "typescript",
            content: `interface PauseOutcome {
  alumnoCode: string
  tipo: string              // Tipo de pausa
  motivo: string            // Razón de la pausa
  start: string             // Hora de inicio
  end: string               // Hora de fin
  proposedAt: string        // Cuándo se propuso
  decidedAt: string         // Cuándo se decidió
  outcome: "confirmed" | "cancelled" | "failed" | "pending"
  errorMsg?: string         // Error si falló
}`,
          },
        ],
      },
      {
        id: "knowledge-base",
        blocks: [
          {
            type: "text",
            content:
              "El Support-ATC Agent tiene acceso a una knowledge base que se carga desde el endpoint `/api/agentes/soporte-atc/knowledge`. Contiene artículos sobre funcionamiento de la plataforma, troubleshooting, y procedimientos.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 7. CHAT EN TIEMPO REAL
  // ============================================================
  {
    id: "chat",
    subsections: [
      {
        id: "socket-io",
        blocks: [
          {
            type: "text",
            content:
              "El chat principal usa Socket.IO como transport para comunicación bidireccional en tiempo real. El servidor Next.js actúa como broker con almacenamiento en memoria.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Cliente Socket.IO
import { io } from "socket.io-client"
const socket = io(CHAT_HOST)  // https://api-ax.valinkgroup.com

// Eventos principales:
socket.on("message", (msg) => { /* nuevo mensaje */ })
socket.on("typing", (data) => { /* usuario escribiendo */ })
socket.on("read", (data) => { /* mensaje leído */ })
socket.emit("join-room", { roomId: string })
socket.emit("send-message", { roomId: string, text: string })`,
          },
        ],
      },
      {
        id: "sse-fallback",
        blocks: [
          {
            type: "text",
            content:
              "El endpoint `/api/realtime` provee Server-Sent Events como fallback para notificaciones más simples que no requieren bidireccionalidad.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// GET /api/realtime (Edge Runtime)
// Retorna un ReadableStream como SSE

// Cliente:
const eventSource = new EventSource("/api/realtime")
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Manejar notificación
}`,
          },
        ],
      },
      {
        id: "salas-chat",
        blocks: [
          {
            type: "text",
            content:
              "Las salas de chat se organizan por código de estudiante. Cada sala tiene un ID único basado en el código del estudiante.",
          },
          {
            type: "table",
            headers: ["Sala", "Participantes", "Descripción"],
            rows: [
              ["chat:{studentCode}", "Estudiante + Coach/Admin", "Chat de soporte del estudiante"],
              ["coach:{coachCode}", "Coach + Admin", "Chat interno del coach"],
              ["global", "Todos los admin", "Chat general del equipo"],
            ],
          },
        ],
      },
      {
        id: "persistencia-local",
        blocks: [
          {
            type: "text",
            content:
              "Los mensajes se persisten localmente en `localStorage` como fallback. La función `local-chat.ts` maneja esta persistencia.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// lib/local-chat.ts
saveMessages(roomId: string, messages: Message[]): void
loadMessages(roomId: string): Message[]
saveReadReceipts(roomId: string, receipts: ReadReceipt[]): void
loadReadReceipts(roomId: string): ReadReceipt[]`,
          },
        ],
      },
      {
        id: "notificaciones",
        blocks: [
          {
            type: "text",
            content:
              "El sistema de notificaciones tiene múltiples capas para asegurar que los usuarios se enteren de nuevos mensajes.",
          },
          {
            type: "table",
            headers: ["Capa", "Componente", "Descripción"],
            rows: [
              ["Visual", "ChatSnackbar", "Popup flotante con preview del mensaje"],
              ["Badge", "Sidebar badge", "Contador de mensajes no leídos en el sidebar"],
              ["Sonido", "playNotificationSound()", "Sonido de notificación al recibir mensaje"],
              ["Push", "PwaPushClient", "Notificación push del sistema operativo"],
              ["SSE", "useSseNotifications", "Notificaciones en tiempo real vía SSE"],
            ],
          },
        ],
      },
      {
        id: "chat-alumno-coach",
        blocks: [
          {
            type: "text",
            content:
              "Existen interfaces de chat separadas para estudiantes y coaches, cada una optimizada para su caso de uso.",
          },
          {
            type: "table",
            headers: ["Componente", "Para quién", "Características"],
            rows: [
              ["StudentChatWidget", "Estudiantes", "Widget flotante, disclaimer de pago"],
              ["StudentChatInline", "Estudiantes", "Chat inline en la página"],
              ["StudentChatFriendly", "Estudiantes", "Interfaz amigable simplificada"],
              ["ChatRealtime", "Coaches/Admin", "Chat completo con funcionalidades admin"],
              ["CoachChatSnackbar", "Coaches", "Notificaciones de chat para coaches"],
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // 8. SISTEMA DE EMAIL (BREVO)
  // ============================================================
  {
    id: "brevo",
    subsections: [
      {
        id: "configuracion-brevo",
        blocks: [
          {
            type: "text",
            content:
              "Brevo (antes Sendinblue) es el proveedor de email transaccional. La API key se configura en las variables de entorno.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Envío genérico vía Brevo
const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "api-key": process.env.BREVO_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sender: { email: "noreply@academia.com", name: "Academia X" },
    to: [{ email: toEmail }],
    subject: subject,
    htmlContent: htmlBody,
    textContent: textBody,
  }),
})`,
          },
        ],
      },
      {
        id: "templates-email",
        blocks: [
          {
            type: "text",
            content:
              "Existen 10+ generadores de templates de email en `lib/email-templates/`:",
          },
          {
            type: "table",
            headers: ["Template", "Archivo", "Uso"],
            rows: [
              ["Welcome", "welcome.ts", "Bienvenida a nuevos estudiantes"],
              ["Starter Workflow", "starter-workflow.ts", "Flujo de inicio del curso"],
              ["Rescate", "rescate-estudiante.ts", "Re-engagement de estudiantes inactivos"],
              ["Reminder", "reminder.ts", "Recordatorios generales"],
              ["Payment Reminder", "payment-reminder.ts", "Recordatorio de pago"],
              ["Payment Follow-up", "payment-followup.ts", "Seguimiento de pagos"],
              ["Password Changed", "password-changed.ts", "Notificación de cambio de contraseña"],
              ["Onboarding", "onboarding-workflow.ts", "Flujo de onboarding"],
              ["Contract Expiry", "contract-expiry.ts", "Notificación de vencimiento de contrato"],
              ["Piloto IA", "send-piloto-ia", "Invitaciones del piloto IA"],
            ],
          },
        ],
      },
      {
        id: "endpoints-envio",
        blocks: [
          {
            type: "table",
            headers: ["Endpoint", "Método", "Descripción"],
            rows: [
              ["/api/brevo/send-test", "POST", "Email de prueba genérico"],
              ["/api/brevo/send-preview", "POST", "Preview de template"],
              ["/api/brevo/send-workflow", "POST", "Trigger de workflow Brevo"],
              ["/api/brevo/send-rescate", "POST", "Email de re-engagement"],
              ["/api/brevo/send-contract-expiry", "POST", "Notificación de vencimiento"],
              ["/api/brevo/send-piloto-ia", "POST", "Invitaciones piloto (bulk)"],
              ["/api/brevo/send-piloto-ia-preview", "POST", "Preview de invitación piloto"],
              ["/api/brevo/password-changed", "POST", "Notificación de cambio de contraseña"],
              ["/api/brevo/events", "GET", "Eventos de entrega de Brevo"],
            ],
          },
        ],
      },
      {
        id: "tracking-eventos",
        blocks: [
          {
            type: "text",
            content:
              "La página `/admin/brevo/events` muestra el estado de entrega de emails enviados desde la plataforma, incluyendo: enviado, entregado, abierto, clickeado, rebotado.",
          },
        ],
      },
      {
        id: "automatizacion",
        blocks: [
          {
            type: "text",
            content:
              "Brevo soporta workflows de automatización que se activan desde la plataforma. Ejemplos: workflow de rescate para estudiantes inactivos, workflow de onboarding, workflow de recordatorios de pago.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 9. ALMACENAMIENTO (BUNNY CDN)
  // ============================================================
  {
    id: "storage",
    subsections: [
      {
        id: "config-bunny",
        blocks: [
          {
            type: "text",
            content:
              "Bunny CDN se usa como almacén principal de archivos: contratos, grabaciones de Zoom, uploads de usuarios, y assets estáticos.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// lib/bunny-storage.ts
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE
const BUNNY_API_KEY = process.env.BUNNY_API_KEY
const BUNNY_CDN_HOST = process.env.BUNNY_CDN_HOST`,
          },
        ],
      },
      {
        id: "operaciones",
        blocks: [
          {
            type: "code",
            language: "typescript",
            content: `// Upload
await uploadFile(path, fileBuffer, contentType)

// Download
const file = await downloadFile(path)

// Delete
await deleteFile(path)

// List
const files = await listFiles(directory)`,
          },
        ],
      },
      {
        id: "archivos-alcance",
        blocks: [
          {
            type: "table",
            headers: ["Tipo", "Carpeta", "Descripción"],
            rows: [
              ["Contratos", "contracts/", "Contratos generados en DOCX"],
              ["Grabaciones", "recordings/", "Archivos de grabaciones Zoom"],
              ["Uploads", "uploads/", "Archivos subidos por usuarios"],
              ["PWA Icons", "icons/", "Iconos de la app PWA"],
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // 10. GENERACIÓN DE CONTRATOS
  // ============================================================
  {
    id: "contratos",
    subsections: [
      {
        id: "docxtemplater",
        blocks: [
          {
            type: "text",
            content:
              "Los contratos se generan en formato DOCX usando docxtemplater. Permite crear documentos Word a partir de templates con variables dinámicas.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// lib/contract-generator.ts
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import { saveAs } from "file-saver"

async function generateContract(templateUrl: string, data: ContractData) {
  // 1. Descargar template DOCX
  const response = await fetch(templateUrl)
  const buffer = await response.arrayBuffer()

  // 2. Parsear con PizZip
  const zip = new PizZip(buffer)

  // 3. Crear instancia de docxtemplater
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  // 4. Insertar datos
  doc.render(data)

  // 5. Generar DOCX final
  const output = doc.getZip().generate({ type: "blob" })
  saveAs(output, "contrato.docx")
}`,
          },
        ],
      },
      {
        id: "variables-contrato",
        blocks: [
          {
            type: "text",
            content: "Variables disponibles para templates de contrato:",
          },
          {
            type: "code",
            language: "typescript",
            content: `interface ContractData {
  // Datos del estudiante
  nombre_completo: string
  numero_identificacion: string
  email: string
  telefono: string
  direccion: string

  // Datos del contrato
  numero_contrato: string
  fecha_inicio: string
  fecha_fin: string
  valor_total: number
  valor_cuota: number
  numero_cuotas: number

  // Bonos
  bonos: BonoContrato[]

  // Firma
  fecha_firma: string
}`,
          },
        ],
      },
      {
        id: "flujo-generacion",
        blocks: [
          {
            type: "flow",
            content: `
1. Admin selecciona estudiante y template
   │
   ▼
2. Sistema carga datos del estudiante desde API
   │
   ▼
3. Se calculan bonos aplicables
   │
   ▼
4. Se genera el DOCX con docxtemplater
   │
   ▼
5. Se sube a Bunny CDN
   │
   ▼
6. Se retorna URL de descarga
   │
   ▼
7. Opcionalmente se envía por email vía Brevo`,
          },
        ],
      },
      {
        id: "template-structure",
        blocks: [
          {
            type: "text",
            content:
              "Los templates de contrato son archivos .docx con placeholders como `{nombre_completo}`, `{fecha_inicio}`, etc. La carpeta de templates está en Bunny CDN o se carga desde `/admin/plantillas-contratos`.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 11. ROLES Y PERMISOS (RBAC)
  // ============================================================
  {
    id: "rbac",
    subsections: [
      {
        id: "roles-disponibles",
        blocks: [
          {
            type: "table",
            headers: ["Rol", "Descripción", "Ejemplo de uso"],
            rows: [
              ["admin", "Acceso total a la plataforma", "Dueño/administrador del sistema"],
              ["equipo", "Miembro del equipo (acceso como admin)", "Staff interno de la academia"],
              ["coach", "Coach/mentor de estudiantes", "Coach asignado a un grupo de alumnos"],
              ["student", "Estudiante de la academia", "Alumno inscrito en un curso"],
              ["atc", "Agente de atención al cliente", "Equipo de soporte y ventas"],
              ["sales", "Equipo de ventas/CRM", "Closers y vendedores"],
            ],
          },
        ],
      },
      {
        id: "permisos-granular",
        blocks: [
          {
            type: "text",
            content:
              "El sistema de permisos granular (`/admin/access/roles`) permite crear roles personalizados con permisos específicos. Cada permiso controla el acceso a una funcionalidad particular.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Ejemplo de verificación de permisos
if (user.role === "admin" || user.role === "equipo") {
  // Acceso total
}

if (user.role === "coach") {
  // Solo ve sus estudiantes asignados
}

// Feature flags específicas
if (canAccessBusinessMetrics(user)) {
  // Solo el admin ID 926 puede ver métricas de negocio
}

if (canAccessTeamPerformance(user)) {
  // Solo admin/equipo pueden ver rendimiento de áreas
}`,
          },
        ],
      },
      {
        id: "mapeo-areas",
        blocks: [
          {
            type: "text",
            content:
              "Los miembros del equipo tienen un campo 'area' que filtra qué menús ven en el sidebar. Las áreas son: ADS, COPY, TECNICO, VSL, ATENCION_AL_CLIENTE.",
          },
        ],
      },
      {
        id: "feature-flags",
        blocks: [
          {
            type: "code",
            language: "typescript",
            content: `// Flags de acceso basados en rol
function canAccessBusinessMetrics(user: User): boolean {
  return user.id === 926  // Solo el admin principal
}

function canAccessTeamPerformance(user: User): boolean {
  return ["admin", "equipo"].includes(user.role)
}

function canManageUsers(user: User): boolean {
  return ["admin", "equipo"].includes(user.role)
}`,
          },
        ],
      },
    ],
  },

  // ============================================================
  // 12. PUSH NOTIFICATIONS & PWA
  // ============================================================
  {
    id: "push-pwa",
    subsections: [
      {
        id: "push-arquitectura",
        blocks: [
          {
            type: "text",
            content:
              "El sistema de notificaciones push permite enviar alertas a los dispositivos de los usuarios incluso cuando no tienen la pestaña abierta. Usa la Web Push API del navegador con un Service Worker.",
          },
          {
            type: "architecture",
            content: `
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │     │  Next.js API │     │   Backend    │
│              │     │   (BFF)      │     │   REST API   │
│ PwaPushClient│     │              │     │              │
│     │        │     │ /api/push/*  │     │              │
│     ▼        │     │     │        │     │              │
│ Service Worker│    │     ▼        │     │              │
│     │        │     │ Register    │     │              │
│     ▼        │     │ subscription│     │              │
│ Push API     │────▶│ Store in    │────▶│ Persist      │
│ (Browser)    │     │ memory/DB   │     │ subscription │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    POST /api/push/send
                    { title, body, url }
                           │
                           ▼
                    Web Push Protocol
                    → Envía a todos los suscritos
`,
          },
        ],
      },
      {
        id: "service-worker",
        blocks: [
          {
            type: "text",
            content:
              "El Service Worker se registra automáticamente cuando el usuario carga la aplicación. Escucha eventos de push y muestra notificaciones del sistema.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Registro del Service Worker (en el cliente)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
}

// En el Service Worker (sw.js):
self.addEventListener("push", (event) => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/api/pwa/icon/192",
    badge: "/api/pwa/icon/32",
    data: { url: data.url },
  })
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data.url || "/"
  clients.openWindow(url)
})`,
          },
        ],
      },
      {
        id: "push-api",
        blocks: [
          {
            type: "table",
            headers: ["Endpoint", "Método", "Descripción"],
            rows: [
              ["/api/push/subscribe", "POST", "Registrar suscripción push del navegador"],
              ["/api/push/send", "POST", "Enviar notificación push a todos los suscritos"],
            ],
          },
          {
            type: "code",
            language: "typescript",
            content: `// POST /api/push/subscribe
// Request: { subscription: PushSubscription, userId?: string }
// Response: { success: boolean }

// POST /api/push/send
// Request: { title: string, body: string, url?: string }
// Response: { success: boolean, sent: number }`,
          },
        ],
      },
      {
        id: "suscripcion-flow",
        blocks: [
          {
            type: "flow",
            content: `
1. PwaPushClient se monta en el layout raíz
   │
   ▼
2. Verifica soporte de Push API
   │
   ├─ No soportado → No muestra nada
   │
   ▼
3. Registra Service Worker
   │
   ▼
4. Pide permiso al usuario (notification permission)
   │
   ├─ Denegado → No muestra nada
   │
   ▼
5. Obtiene PushSubscription del navegador
   │
   ▼
6. POST /api/push/subscribe
   → Guarda la suscripción en el servidor
   │
   ▼
7. Ahora el usuario recibirá notificaciones push
   cuando el servidor envíe via /api/push/send`,
          },
        ],
      },
      {
        id: "pwa-manifest",
        blocks: [
          {
            type: "text",
            content:
              "El manifiesto PWA (`/manifest.webmanifest`) define cómo se comporta la app cuando se instala en el dispositivo. Incluye nombre, iconos, colores, y modo de display.",
          },
          {
            type: "code",
            language: "json",
            content: `{
  "name": "Academia X",
  "short_name": "AcademiaX",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#7c3aed",
  "icons": [
    { "src": "/api/pwa/icon/192", "sizes": "192x192", "type": "image/png" },
    { "src": "/api/pwa/icon/512", "sizes": "512x512", "type": "image/png" }
  ]
}`,
          },
          {
            type: "note",
            content:
              "Los iconos se generan dinámicamente vía `/api/pwa/icon/[size]` usando SVG. No es necesario subir archivos estáticos.",
          },
        ],
      },
    ],
  },

  // ============================================================
  // 13. BUILD Y DEPLOY
  // ============================================================
  {
    id: "build",
    subsections: [
      {
        id: "nextjs-config",
        blocks: [
          {
            type: "text",
            content:
              "Next.js 14 con App Router. Todos los componentes usan React Server Components por defecto, con 'use client' explícito donde se necesita interactividad.",
          },
          {
            type: "code",
            language: "typescript",
            content: `// Estructura de directorios:
app/
├── layout.tsx           # Layout raíz (providers, theme)
├── page.tsx             # Home dashboard
├── login/               # Página de login
├── chat/                # Chat principal
├── admin/               # Panel de administración
│   ├── layout.tsx       # Layout del admin (sidebar)
│   ├── alumnos/         # Gestión de estudiantes
│   ├── teamsv2/         # Gestión de coaches
│   ├── tickets/         # Métricas de tickets
│   ├── tickets-board/   # Tablero kanban
│   ├── crm/             # CRM y ventas
│   ├── payments/        # Pagos
│   ├── bonos/           # Bonos
│   ├── users/           # Usuarios
│   ├── agentes/         # Agentes IA
│   ├── plantillas-mails/# Plantillas de email
│   ├── metrics/         # Dashboards de métricas
│   ├── docs/            # Documentación (NUEVO)
│   └── ...
├── api/                 # API routes (BFF)
│   ├── zoom/            # Integración Zoom
│   ├── brevo/           # Email Brevo
│   ├── agentes/         # Endpoints de agentes IA
│   ├── metadata/        # CRUD de metadata
│   └── ...
└── alumno/              # Vistas del estudiante`,
          },
        ],
      },
      {
        id: "typescript",
        blocks: [
          {
            type: "text",
            content:
              "TypeScript en modo strict. Todos los archivos usan tipado fuerte. Se recomienda no usar `any` y preferir tipos específicos.",
          },
        ],
      },
      {
        id: "tailwind",
        blocks: [
          {
            type: "text",
            content:
              "Tailwind CSS v4 con utility-first approach. Componentes UI de shadcn/ui (basados en Radix UI). Tema claro/oscuro soportado.",
          },
        ],
      },
      {
        id: "scripts",
        blocks: [
          {
            type: "code",
            language: "json",
            content: `{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}`,
          },
        ],
      },
      {
        id: "env-necesarias",
        blocks: [
          {
            type: "text",
            content:
              "Todas las variables de entorno necesarias están documentadas en la sección de Arquitectura General → Variables de Entorno.",
          },
        ],
      },
    ],
  },
]
