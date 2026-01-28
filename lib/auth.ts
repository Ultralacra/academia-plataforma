export type UserRole = "admin" | "coach" | "student" | "equipo" | "atc" | "sales";

export interface User {
  id: string | number;
  email: string;
  name: string;
  role: UserRole;
  codigo?: string;
  tipo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token?: string | null;
}

class AuthService {
  private storageKey = "academy_auth";

  // Evitar múltiples requests simultáneas a /auth/me (muchos componentes llaman useAuth())
  private meInFlight: Promise<User> | null = null;
  private meCache:
    | { token: string | null; user: User; at: number }
    | null = null;
  // TTL corto para evitar spameo sin dejar el usuario obsoleto
  private meCacheTtlMs = 30_000;

  /**
   * Normaliza el rol proveniente del backend a los roles internos de la app.
   * Regla solicitada: "equipo" debe ver las vistas de admin, por lo que se mapea a "admin".
   * También mapeamos variantes comunes para evitar "Acceso Denegado" por desalineación de nomenclaturas.
   */
  private normalizeRole(rawRole?: unknown, rawTipo?: unknown): UserRole {
    const v = String(rawRole ?? "").trim().toLowerCase();
    const t = String(rawTipo ?? "").trim().toLowerCase();

    const isAdmin = (s: string) => ["admin", "administrator", "superadmin"].includes(s);
    const isEquipo = (s: string) => ["equipo", "team"].includes(s);
    const isStudent = (s: string) => ["alumno", "student", "cliente", "usuario", "user"].includes(s);
    const isAtc = (s: string) =>
      ["atc", "support", "soporte", "atencion", "atención", "customer_support"].includes(s);
    const isSales = (s: string) => ["sales", "ventas", "venta"].includes(s);

    // Priorizar rol específico sobre tipo genérico
    if (isAdmin(v)) return "admin";
    if (isSales(v)) return "sales";
    if (isEquipo(v)) return "equipo";
    if (isAtc(v)) return "atc";
    if (isStudent(v)) return "student";
    if (v === "coach") return "coach";

    // Solo si no hay rol válido, revisar el tipo
    if (isAdmin(t)) return "admin";
    if (isSales(t)) return "sales";
    if (isEquipo(t)) return "equipo";
    if (isAtc(t)) return "atc";
    if (isStudent(t)) return "student";
    if (t === "coach") return "coach";

    // Fallback seguro: tratar como equipo para minimizar privilegios
    return "equipo";
  }

  getAuthState(): AuthState {
    if (typeof window === "undefined") {
      return { user: null, isAuthenticated: false, token: null };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const authState = JSON.parse(stored);
        return authState;
      }
    } catch (error) {
      console.error("Error reading auth state:", error);
    }

    return { user: null, isAuthenticated: false, token: null };
  }

  setAuthState(authState: AuthState): void {
    if (typeof window === "undefined") return;

    // Si el usuario cambia (p. ej. actualiza email), invalidar cache de /auth/me
    this.meCache = null;
    this.meInFlight = null;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(authState));
      try {
        window.dispatchEvent(
          new CustomEvent("auth:changed", {
            detail: { token: authState.token ?? null, user: authState.user },
          })
        );
      } catch {}
    } catch (error) {
      console.error("Error saving auth state:", error);
    }
  }

  async login(email: string, password: string): Promise<User> {
    // Real API call to /v1/auth/login
    try {
      const { buildUrl } = await import("./api-config");
      const res = await fetch(buildUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let message = "Error al iniciar sesión";
        try {
          const errJson = await res.json();
          const serverMsg = String(errJson?.error || errJson?.message || "").toLowerCase();
          if (serverMsg.includes("invalid credentials")) message = "Credenciales inválidas";
          else if (serverMsg) message = errJson.error || errJson.message;
        } catch {}
        throw new Error(message);
      }

      const json: any = await res.json();

      // Algunos endpoints devuelven { data: {...}, token } o { code/status/data }
      const payload: any = json?.data ?? json;

      const user: User = {
        id: payload?.id,
        email: payload?.email,
        name: payload?.name,
        role: this.normalizeRole(payload?.role, payload?.tipo),
        codigo: payload?.codigo,
        tipo: payload?.tipo,
        created_at: payload?.created_at,
        updated_at: payload?.updated_at,
      };

      const token = json?.token ?? payload?.token;
      this.setAuthState({ user, isAuthenticated: true, token });
      return user;
    } catch (e: any) {
      // Re-throw with readable message
      if (e instanceof Error) throw e;
      throw new Error("No se pudo iniciar sesión");
    }
  }

  /** Obtiene información del usuario autenticado desde /auth/me */
  async me(): Promise<User> {
    const now = Date.now();
    const st = this.getAuthState();
    const token = st.token ?? null;

    // Si ya tenemos usuario reciente para este token, reutilizar
    if (
      this.meCache &&
      this.meCache.token === token &&
      now - this.meCache.at < this.meCacheTtlMs
    ) {
      return this.meCache.user;
    }

    // Si hay una request en vuelo, esperar esa misma
    if (this.meInFlight) return this.meInFlight;

    try {
      const { buildUrl } = await import("./api-config");
      this.meInFlight = fetch(buildUrl("/auth/me"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: (() => {
            return token ? `Bearer ${token}` : "";
          })(),
        },
      })
        .then(async (res) => {
          if (!res.ok) {
            // 401: token inválido/expirado -> limpiar sesión y enviar a login
            if (res.status === 401) {
              try {
                this.logout();
              } catch {}
              if (typeof window !== "undefined") {
                try {
                  const here = window.location?.pathname || "";
                  if (!here.startsWith("/login")) {
                    window.location.replace("/login");
                  }
                } catch {}
              }
              throw new Error("No autorizado");
            }
            // En 403 no redirigimos; devolvemos error genérico
            throw new Error("Error consultando usuario");
          }

          const json: any = await res.json();
          const payload: any = json?.data ?? json;
          const user: User = {
            id: payload?.id,
            email: payload?.email,
            name: payload?.name,
            role: this.normalizeRole(payload?.role, payload?.tipo),
            codigo: payload?.codigo,
            tipo: payload?.tipo,
            created_at: payload?.created_at,
            updated_at: payload?.updated_at,
          };
          this.meCache = { token, user, at: Date.now() };
          return user;
        })
        .finally(() => {
          this.meInFlight = null;
        });

      return await this.meInFlight;
    } catch (e) {
      this.meInFlight = null;
      // si hubo error, no dejar cache inconsistente
      if (this.meCache?.token === token) {
        this.meCache = null;
      }
      if (e instanceof Error) throw e;
      throw new Error("No se pudo obtener el usuario");
    }
  }

  logout(): void {
    // Remove stored auth state completely when logging out
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(this.storageKey);
        try {
          window.dispatchEvent(
            new CustomEvent("auth:changed", {
              detail: { token: null, user: null },
            })
          );
        } catch {}
      } catch (error) {
        console.error("Error removing auth state:", error);
      }
    }
  }

  hasRole(role: UserRole): boolean {
    const authState = this.getAuthState();
    return authState.user?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const authState = this.getAuthState();
    return roles.includes(authState.user?.role as UserRole);
  }

  getToken(): string | null {
    const st = this.getAuthState();
    return st.token ?? null;
  }
}

export const authService = new AuthService();

export function getAuthToken(): string | null {
  return authService.getToken();
}
