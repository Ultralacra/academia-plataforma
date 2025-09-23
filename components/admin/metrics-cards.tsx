"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users, DollarSign, BookOpen, AlertCircle } from "lucide-react"
import type { PlatformMetrics } from "@/lib/data-service"
import { useRouter } from "next/navigation"

interface MetricsCardsProps {
  metrics: PlatformMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const router = useRouter()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/admin/students")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estudiantes Totales</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{metrics.totalStudents}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <Badge variant={metrics.activeStudents > metrics.suspendedStudents ? "default" : "secondary"}>
              {metrics.activeStudents} activos
            </Badge>
            {metrics.suspendedStudents > 0 && (
              <Badge variant="destructive">{metrics.suspendedStudents} suspendidos</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(metrics.monthlyRevenue)}</div>
          <p className="text-xs text-muted-foreground mt-1">Total: {formatCurrency(metrics.totalRevenue)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatPercentage(metrics.averageProgress)}</div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
            {metrics.averageProgress >= 70 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span>Rendimiento académico</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets de Soporte</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{metrics.ticketsOpen}</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>{metrics.ticketsResolved} resueltos</span>
            <Badge variant={metrics.averageResolutionTime <= 24 ? "default" : "destructive"}>
              {metrics.averageResolutionTime.toFixed(1)}h promedio
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
