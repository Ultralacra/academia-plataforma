"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { dataService } from "@/lib/data-service"
import { useAuth } from "@/hooks/use-auth"
import { Users, MessageSquare, Clock, TrendingUp } from "lucide-react"

export function CoachMetrics() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    activeStudents: 0,
    averageProgress: 0,
    openTickets: 0,
    resolvedTickets: 0,
    averageResponseTime: 0,
  })

  useEffect(() => {
    if (user?.role === "coach") {
      calculateMetrics()
    }
  }, [user])

  const calculateMetrics = () => {
    const allStudents = dataService.getStudents()
    const allTickets = dataService.getTickets()

    // Filter data for this coach
    const myStudents = allStudents.filter((student) => student.coachId === user?.id)
    const myTickets = allTickets.filter((ticket) => ticket.coachId === user?.id)

    const activeStudents = myStudents.filter((s) => s.status === "active").length
    const averageProgress = myStudents.reduce((sum, s) => sum + s.progress, 0) / myStudents.length || 0

    const openTickets = myTickets.filter((t) => t.status === "open" || t.status === "in-progress").length
    const resolvedTickets = myTickets.filter((t) => t.status === "resolved" || t.status === "closed").length

    // Calculate average response time (simplified)
    const ticketsWithResponses = myTickets.filter((t) => t.responses.length > 0)
    const averageResponseTime =
      ticketsWithResponses.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime()
        const firstResponse = new Date(t.responses[0]?.createdAt || t.createdAt).getTime()
        return sum + (firstResponse - created) / (1000 * 60 * 60) // hours
      }, 0) / ticketsWithResponses.length || 0

    setMetrics({
      totalStudents: myStudents.length,
      activeStudents,
      averageProgress,
      openTickets,
      resolvedTickets,
      averageResponseTime,
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mis Estudiantes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{metrics.totalStudents}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <Badge variant="default">{metrics.activeStudents} activos</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{metrics.averageProgress.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">Rendimiento de tus estudiantes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets Pendientes</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{metrics.openTickets}</div>
          <p className="text-xs text-muted-foreground mt-1">{metrics.resolvedTickets} resueltos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tiempo de Respuesta</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{metrics.averageResponseTime.toFixed(1)}h</div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
            <Badge variant={metrics.averageResponseTime <= 4 ? "default" : "destructive"}>
              {metrics.averageResponseTime <= 4 ? "Excelente" : "Mejorar"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
