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
          const message = String((e as any)?.message ?? "")
          // Solo cerrar sesión si realmente es no autorizado.
          if (message.toLowerCase().includes("no autorizado")) {
            // authService.logout() ya fue llamado dentro de me() al recibir 401.
            // Solo actualizamos el state de React para que ProtectedRoute redirija.
            setAuthState({ user: null, isAuthenticated: false, token: null })
          }
          // Si el error es de red (fetch failed, timeout, etc.) NO cerramos sesión.
          // El usuario conserva su sesión y puede reintentar al navegar.
        } finally {
          setIsLoading(false)
        }
      })()
    } else {
      setIsLoading(false)
    }

    // Listener: cuando otra pestaña o apiFetch cierra sesión, sincronizar estado React.
    const onAuthChanged = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail
      if (!detail?.token && !detail?.user) {
        setAuthState({ user: null, isAuthenticated: false, token: null })
        setIsLoading(false)
      }
    }
    window.addEventListener("auth:changed", onAuthChanged)

    // Listener: al volver a la pestaña, verificar que el token siga vigente.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      const st = authService.getAuthState()
      if (!st.token) {
        // Alguien (otra pestaña) borró la sesión
        setAuthState({ user: null, isAuthenticated: false, token: null })
        setIsLoading(false)
        return
      }
      // Re-validar con el backend en segundo plano (sin forzar logout en fallo de red)
      authService.me().then((me) => {
        setAuthState({ user: me, isAuthenticated: true, token: st.token })
      }).catch(() => {
        // Si falla por red, no expulsamos; si fue 401 → me() ya hizo logout
        const fresh = authService.getAuthState()
        if (!fresh.token) {
          setAuthState({ user: null, isAuthenticated: false, token: null })
        }
      })
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("auth:changed", onAuthChanged)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  const login = async (
    email: string,
    password: string,
    redirectTo?: string,
  ): Promise<void> => {
    setIsLoading(true)
    try {
      const user = await authService.login(email, password)
      setAuthState({ user, isAuthenticated: true })

      if (redirectTo && redirectTo.trim()) {
        router.push(redirectTo)
        return
      }

      switch (user.role) {
        case "admin":
          router.push("/admin/tickets-board")
          break
        case "coach":
          // Ruta existente y útil para coaches
          router.push("/admin/teamsv2")
          break
        case "atc":
          router.push("/admin/alumnos")
          break
        case "equipo": {
          router.push("/admin/tickets-board");
          break
        }
        case "sales": {
          router.push("/admin/crm");
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
    hasRole: (role: string) => authState.user?.role === role,
    hasAnyRole: (roles: string[]) => !!authState.user?.role && roles.includes(authState.user.role),
  }
}
