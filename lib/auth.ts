export type UserRole = "admin" | "coach" | "student";

export interface User {
  id: string | number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token?: string | null;
}

class AuthService {
  private storageKey = "academy_auth";

  /**
   * Normaliza el rol proveniente del backend a los roles internos de la app.
   * Regla solicitada: "equipo" debe ver las vistas de admin, por lo que se mapea a "admin".
   * También mapeamos variantes comunes para evitar "Acceso Denegado" por desalineación de nomenclaturas.
   */
  private normalizeRole(rawRole?: unknown, rawTipo?: unknown): UserRole {
    const v = String(rawRole ?? "").trim().toLowerCase();
    const t = String(rawTipo ?? "").trim().toLowerCase();

    const isAdmin = (s: string) => ["admin", "administrator", "superadmin"].includes(s);
    const isCoachAsAdmin = (s: string) => ["equipo", "team", "manager"].includes(s);
    const isStudent = (s: string) => ["alumno", "student", "cliente", "usuario", "user"].includes(s);

    if (isAdmin(v) || isCoachAsAdmin(v)) return "admin"; // equipo => admin
    if (isStudent(v)) return "student";
    if (v === "coach") return "coach";

    if (isAdmin(t) || isCoachAsAdmin(t)) return "admin"; // equipo => admin
    if (isStudent(t)) return "student";
    if (t === "coach") return "coach";

    // Fallback temporal: dar acceso total para evitar bloqueos mientras se alinea backend
    return "admin";
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

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(authState));
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

      const user: User = {
        id: json.id,
        email: json.email,
        name: json.name,
        role: this.normalizeRole(json.role, json.tipo),
      };

      this.setAuthState({ user, isAuthenticated: true, token: json.token });
      return user;
    } catch (e: any) {
      // Re-throw with readable message
      if (e instanceof Error) throw e;
      throw new Error("No se pudo iniciar sesión");
    }
  }

  /** Obtiene información del usuario autenticado desde /auth/me */
  async me(): Promise<User> {
    try {
      const { buildUrl } = await import("./api-config");
      const res = await fetch(buildUrl("/auth/me"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: (() => {
            const st = this.getAuthState();
            return st.token ? `Bearer ${st.token}` : "";
          })(),
        },
      });
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
      return {
        id: json.id,
        email: json.email,
        name: json.name,
        role: this.normalizeRole(json.role, json.tipo),
      };
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("No se pudo obtener el usuario");
    }
  }

  logout(): void {
    // Remove stored auth state completely when logging out
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(this.storageKey);
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
