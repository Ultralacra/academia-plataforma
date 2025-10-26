"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService, type AuthState } from "@/lib/auth"

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
          router.push("/coach")
          break
        case "student":
          router.push("/student")
          break
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
    authService.logout()
    setAuthState({ user: null, isAuthenticated: false })
    router.push("/")
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
