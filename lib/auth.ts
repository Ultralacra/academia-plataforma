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

      const json = (await res.json()) as {
        id: number | string;
        email: string;
        name: string;
        role: UserRole;
        token: string;
      };

      const user: User = {
        id: json.id,
        email: json.email,
        name: json.name,
        role: json.role,
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
        // 401/403: token inválido/expirado
        throw new Error(res.status === 401 ? "No autorizado" : "Error consultando usuario");
      }
      const json = (await res.json()) as {
        id: number | string;
        name: string;
        email: string;
        role: UserRole;
        created_at?: string;
        updated_at?: string;
      };
      return {
        id: json.id,
        email: json.email,
        name: json.name,
        role: json.role,
      };
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("No se pudo obtener el usuario");
    }
  }

  logout(): void {
    this.setAuthState({ user: null, isAuthenticated: false, token: null });
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
