"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { dataService, type Coach, type Student, type Ticket } from "@/lib/data-service"
import { Users, MessageSquare, TrendingUp, Mail, Calendar, User, Eye } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface CoachDetailViewProps {
  coachId: string
}

interface CoachWithMetrics extends Coach {
  studentCount: number
  activeTickets: number
  resolvedTickets: number
  averageResolutionTime: number
  studentProgress: number
}

export function CoachDetailView({ coachId }: CoachDetailViewProps) {
  const [coach, setCoach] = useState<CoachWithMetrics | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    loadCoachData()
  }, [coachId])

  const loadCoachData = () => {
    const coachData = dataService.getCoaches().find((c) => c.id === coachId)
    if (!coachData) return

    const studentsData = dataService.getStudents()
    const ticketsData = dataService.getTickets()

    const coachStudents = studentsData.filter((s) => s.coachId === coachId)
    const coachTickets = ticketsData.filter((t) => t.coachId === coachId)
    const activeTickets = coachTickets.filter((t) => t.status === "open" || t.status === "in-progress")
    const resolvedTickets = coachTickets.filter((t) => t.status === "resolved" || t.status === "closed")

    // Calculate average resolution time
    const avgResolutionTime =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.createdAt).getTime()
            const updated = new Date(ticket.updatedAt).getTime()
            return sum + (updated - created) / (1000 * 60 * 60) // hours
          }, 0) / resolvedTickets.length
        : 0

    // Calculate average student progress
    const avgProgress =
      coachStudents.length > 0
        ? coachStudents.reduce((sum, student) => sum + student.progress, 0) / coachStudents.length
        : 0

    const coachWithMetrics: CoachWithMetrics = {
      ...coachData,
      studentCount: coachStudents.length,
      activeTickets: activeTickets.length,
      resolvedTickets: resolvedTickets.length,
      averageResolutionTime: avgResolutionTime,
      studentProgress: avgProgress,
    }

    setCoach(coachWithMetrics)
    setStudents(coachStudents)
    setTickets(coachTickets)
  }

  const handleToggleCoachStatus = () => {
    if (!coach) return

    const currentCoaches = dataService.getCoaches()
    const updatedCoaches = currentCoaches.map((c) => (c.id === coachId ? { ...c, isActive: !c.isActive } : c))
    dataService.setCoaches(updatedCoaches)
    loadCoachData()

    toast({
      title: "Estado actualizado",
      description: "El estado del coach ha sido actualizado",
    })
  }

  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Activo</Badge>
      case "suspended":
        return <Badge variant="destructive">Suspendido</Badge>
      case "completed":
        return <Badge variant="secondary">Completado</Badge>
      case "dropped":
        return <Badge variant="outline">Abandonado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTicketStatusBadge = (status: Ticket["status"]) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Abierto</Badge>
      case "in-progress":
        return <Badge variant="default">En Progreso</Badge>
      case "resolved":
        return <Badge variant="secondary">Resuelto</Badge>
      case "closed":
        return <Badge variant="outline">Cerrado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!coach) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Coach no encontrado</h3>
        <p className="text-muted-foreground">El coach solicitado no existe en el sistema.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coach Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Información Personal</CardTitle>
            <User className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">{coach.name}</p>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Mail className="h-3 w-3 mr-1" />
                  {coach.email}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado:</span>
                <Badge variant={coach.isActive ? "default" : "secondary"}>
                  {coach.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                Miembro desde: {new Date(coach.joinDate).toLocaleDateString()}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Especialización:</p>
                <p className="font-medium">{coach.specialization}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Métricas de Rendimiento</CardTitle>
            <TrendingUp className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estudiantes:</span>
                <span className="text-lg font-bold">{coach.studentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tickets activos:</span>
                <span className="text-lg font-bold text-orange-600">{coach.activeTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tickets resueltos:</span>
                <span className="text-lg font-bold text-green-600">{coach.resolvedTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tiempo promedio:</span>
                <span className="text-sm font-medium">{coach.averageResolutionTime.toFixed(1)}h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso de Estudiantes</CardTitle>
            <Users className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Progreso promedio:</span>
                <span className="text-lg font-bold">{coach.studentProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${coach.studentProgress}%` }}></div>
              </div>
              <Button
                variant={coach.isActive ? "destructive" : "default"}
                size="sm"
                className="w-full"
                onClick={handleToggleCoachStatus}
              >
                {coach.isActive ? "Desactivar Coach" : "Activar Coach"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Estudiantes Asignados</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Tickets de Soporte</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Estudiantes Asignados ({coach.studentCount})</CardTitle>
              <CardDescription>Lista completa de estudiantes bajo la supervisión de este coach</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Inscripción</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${student.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{student.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(student.enrollmentDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/students/${student.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              Ver detalle
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay estudiantes asignados a este coach
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Tickets de Soporte</CardTitle>
              <CardDescription>Historial de tickets asignados a este coach</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Respuestas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell>
                          {students.find((s) => s.id === ticket.studentId)?.name || "Estudiante no encontrado"}
                        </TableCell>
                        <TableCell>{getTicketStatusBadge(ticket.status)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ticket.priority === "high"
                                ? "destructive"
                                : ticket.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {ticket.priority === "high" ? "Alta" : ticket.priority === "medium" ? "Media" : "Baja"}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.responses.length}</TableCell>
                      </TableRow>
                    ))}
                    {tickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay tickets asignados a este coach
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
