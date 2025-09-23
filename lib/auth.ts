export type UserRole = "admin" | "coach" | "student"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  isActive: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

class AuthService {
  private storageKey = "academy_auth"

  getAuthState(): AuthState {
    if (typeof window === "undefined") {
      return { user: null, isAuthenticated: false }
    }

    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const authState = JSON.parse(stored)
        return authState
      }
    } catch (error) {
      console.error("Error reading auth state:", error)
    }

    return { user: null, isAuthenticated: false }
  }

  setAuthState(authState: AuthState): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(authState))
    } catch (error) {
      console.error("Error saving auth state:", error)
    }
  }

  login(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      // Simulate API call
      setTimeout(() => {
        // Demo users for testing
        const demoUsers: Record<string, User> = {
          "admin@academy.com": {
            id: "1",
            email: "admin@academy.com",
            name: "Admin Usuario",
            role: "admin",
            createdAt: new Date().toISOString(),
            isActive: true,
          },
          "coach@academy.com": {
            id: "2",
            email: "coach@academy.com",
            name: "Coach Mentor",
            role: "coach",
            createdAt: new Date().toISOString(),
            isActive: true,
          },
          "student@academy.com": {
            id: "3",
            email: "student@academy.com",
            name: "Estudiante Ejemplo",
            role: "student",
            createdAt: new Date().toISOString(),
            isActive: true,
          },
        }

        const user = demoUsers[email]
        if (user && password === "password123") {
          this.setAuthState({ user, isAuthenticated: true })
          resolve(user)
        } else {
          reject(new Error("Credenciales inválidas"))
        }
      }, 1000)
    })
  }

  logout(): void {
    this.setAuthState({ user: null, isAuthenticated: false })
  }

  hasRole(role: UserRole): boolean {
    const authState = this.getAuthState()
    return authState.user?.role === role
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const authState = this.getAuthState()
    return roles.includes(authState.user?.role as UserRole)
  }
}

export const authService = new AuthService()
