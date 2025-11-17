"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService, type AuthState } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Load auth state from localStorage on mount
    const currentAuthState = authService.getAuthState()
    setAuthState(currentAuthState)

    // Si hay token, refrescar datos del usuario desde /auth/me
    const hasToken = !!currentAuthState.token
    if (hasToken) {
      ;(async () => {
        try {
          const me = await authService.me()
          setAuthState({ user: me, isAuthenticated: true, token: currentAuthState.token })
        } catch (e) {
          // Token inválido o expirado: limpiar sesión
          authService.logout()
          setAuthState({ user: null, isAuthenticated: false, token: null })
        } finally {
          setIsLoading(false)
        }
      })()
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    try {
      const user = await authService.login(email, password)
      setAuthState({ user, isAuthenticated: true })

      switch (user.role) {
        case "admin":
          router.push("/admin/students")
          break
        case "coach":
          // Ruta existente y útil para coaches
          router.push("/admin/teamsv2")
          break
        case "equipo": {
          const code = (user as any)?.codigo || "";
          router.push(code ? `/admin/teamsv2/${code}` : "/admin/teamsv2");
          break
        }
        case "student": {
          const code = (user as any)?.codigo || "RvA_5Qxoezfxlxxj"
          router.push(`/admin/alumnos/${code}`)
          break
        }
        default:
          router.push("/")
      }
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = (): void => {
    // Show a short toast + loading while we clear session and redirect
    setIsLoading(true)
    const t = toast({ title: "Cerrando sesión", description: "Saliendo..." })
    try {
      authService.logout()
      setAuthState({ user: null, isAuthenticated: false })
      router.push("/login")
      // Actualizar toast a confirmación
  t.update({ id: t.id, title: "Sesión cerrada", description: "Has salido correctamente" })
    } catch (e) {
  t.update({ id: t.id, title: "Error", description: "No se pudo cerrar sesión" })
    } finally {
      // Pequeño retraso para que el usuario vea el cambio antes de quitar loader
      setTimeout(() => setIsLoading(false), 300)
    }
  }

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService),
  }
}
