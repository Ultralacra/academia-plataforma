"use client"

import { useAuth } from "@/hooks/use-auth"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

function DashboardContent() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const getDashboardByRole = () => {
    switch (user?.role) {
      case "admin":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Panel de Administración</h1>
              <div className="flex space-x-2">
                <Button onClick={() => router.push("/admin")} variant="default">
                  Dashboard Completo
                </Button>
                <Button onClick={logout} variant="outline">
                  Cerrar Sesión
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estudiantes Activos</CardTitle>
                  <CardDescription>Total de estudiantes registrados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">156</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Coaches</CardTitle>
                  <CardDescription>Coaches disponibles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">12</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos del Mes</CardTitle>
                  <CardDescription>Facturación mensual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">€45,230</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      case "coach":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Panel de Coach</h1>
              <div className="flex space-x-2">
                <Button onClick={() => router.push("/coach")} variant="default">
                  Dashboard Completo
                </Button>
                <Button onClick={logout} variant="outline">
                  Cerrar Sesión
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mis Estudiantes</CardTitle>
                  <CardDescription>Estudiantes asignados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">3</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tickets Pendientes</CardTitle>
                  <CardDescription>Consultas por resolver</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">2</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      case "student":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Mi Portal de Estudiante</h1>
              <div className="flex space-x-2">
                <Button onClick={() => router.push("/student")} variant="default">
                  Mi Curso
                </Button>
                <Button onClick={logout} variant="outline">
                  Cerrar Sesión
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mi Progreso</CardTitle>
                  <CardDescription>Avance en el curso</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">75%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Próximo Pago</CardTitle>
                  <CardDescription>Fecha del siguiente cobro</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">15 Dic</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      default:
        return <div>Rol no reconocido</div>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Bienvenido, <span className="font-medium">{user?.name}</span> ({user?.role})
          </p>
        </div>
        {getDashboardByRole()}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
