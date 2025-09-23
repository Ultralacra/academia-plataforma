"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dataService, type Ticket, type Student, type Coach, type Course } from "@/lib/data-service"
import { MessageSquare, User, Calendar, FileText, Send, Paperclip } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface TicketDetailViewProps {
  ticketId: string
}

export function TicketDetailView({ ticketId }: TicketDetailViewProps) {
  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [coach, setCoach] = useState<Coach | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [newResponse, setNewResponse] = useState("")

  useEffect(() => {
    loadTicketData()
  }, [ticketId])

  const loadTicketData = () => {
    const ticketData = dataService.getTickets().find((t) => t.id === ticketId)
    if (!ticketData) return

    setTicket(ticketData)

    const studentData = dataService.getStudents().find((s) => s.id === ticketData.studentId)
    setStudent(studentData || null)

    const coachData = dataService.getCoaches().find((c) => c.id === ticketData.coachId)
    setCoach(coachData || null)

    const courseData = dataService.getCourses().find((c) => c.id === ticketData.courseId)
    setCourse(courseData || null)

    setCoaches(dataService.getCoaches())
  }

  const handleStatusUpdate = (newStatus: Ticket["status"]) => {
    if (!ticket) return

    const updatedTickets = dataService
      .getTickets()
      .map((t) => (t.id === ticketId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
    dataService.setTickets(updatedTickets)
    loadTicketData()

    toast({
      title: "Estado actualizado",
      description: "El estado del ticket ha sido actualizado",
    })
  }

  const handleCoachReassign = (newCoachId: string) => {
    if (!ticket) return

    const updatedTickets = dataService
      .getTickets()
      .map((t) => (t.id === ticketId ? { ...t, coachId: newCoachId, updatedAt: new Date().toISOString() } : t))
    dataService.setTickets(updatedTickets)
    loadTicketData()

    toast({
      title: "Coach reasignado",
      description: "El ticket ha sido reasignado exitosamente",
    })
  }

  const handleAddResponse = () => {
    if (!ticket || !newResponse.trim()) return

    const response = {
      id: Date.now().toString(),
      message: newResponse,
      authorId: user?.id || "",
      authorRole: user?.role || "admin",
      createdAt: new Date().toISOString(),
      attachments: [],
    }

    const updatedTickets = dataService.getTickets().map((t) =>
      t.id === ticketId
        ? {
            ...t,
            responses: [...t.responses, response],
            updatedAt: new Date().toISOString(),
          }
        : t,
    )
    dataService.setTickets(updatedTickets)
    setNewResponse("")
    loadTicketData()

    toast({
      title: "Respuesta agregada",
      description: "Tu respuesta ha sido agregada al ticket",
    })
  }

  const getStatusBadge = (status: Ticket["status"]) => {
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

  const getPriorityBadge = (priority: Ticket["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Alta</Badge>
      case "medium":
        return <Badge variant="default">Media</Badge>
      case "low":
        return <Badge variant="secondary">Baja</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Ticket no encontrado</h3>
        <p className="text-muted-foreground">El ticket solicitado no existe en el sistema.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ticket Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Información del Ticket</CardTitle>
            <MessageSquare className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-bold">{ticket.title}</p>
                <p className="text-sm text-muted-foreground">#{ticket.id}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado:</span>
                {getStatusBadge(ticket.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prioridad:</span>
                {getPriorityBadge(ticket.priority)}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                Creado: {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiante y Curso</CardTitle>
            <User className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{student?.name || "Estudiante no encontrado"}</p>
                <p className="text-sm text-muted-foreground">{student?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Curso relacionado:</p>
                <p className="font-medium">{course?.title || "Sin curso específico"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coach asignado:</p>
                <p className="font-medium">{coach?.name || "Sin asignar"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gestión del Ticket</CardTitle>
            <FileText className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.role === "admin" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Cambiar Estado</label>
                    <Select
                      value={ticket.status}
                      onValueChange={(value: Ticket["status"]) => handleStatusUpdate(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Abierto</SelectItem>
                        <SelectItem value="in-progress">En Progreso</SelectItem>
                        <SelectItem value="resolved">Resuelto</SelectItem>
                        <SelectItem value="closed">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reasignar Coach</label>
                    <Select value={ticket.coachId} onValueChange={handleCoachReassign}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coaches.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {user?.role === "coach" && (
                <div>
                  <label className="text-sm font-medium">Actualizar Estado</label>
                  <Select value={ticket.status} onValueChange={(value: Ticket["status"]) => handleStatusUpdate(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-progress">En Progreso</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Description */}
      <Card>
        <CardHeader>
          <CardTitle>Descripción del Problema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{ticket.description}</p>
        </CardContent>
      </Card>

      {/* Conversation */}
      <Card>
        <CardHeader>
          <CardTitle>Conversación ({ticket.responses.length} respuestas)</CardTitle>
          <CardDescription>Historial de comunicación sobre este ticket</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.responses.map((response) => (
            <div key={response.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {response.authorRole === "admin" && "Administrador"}
                    {response.authorRole === "coach" && "Coach"}
                    {response.authorRole === "student" && "Estudiante"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{new Date(response.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed">{response.message}</p>
              {response.attachments && response.attachments.length > 0 && (
                <div className="mt-2 flex items-center space-x-2">
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {response.attachments.length} archivo(s) adjunto(s)
                  </span>
                </div>
              )}
            </div>
          ))}

          {ticket.responses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay respuestas aún. Sé el primero en responder.</p>
            </div>
          )}

          {/* Add Response */}
          <div className="border-t pt-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Agregar Respuesta</label>
              <Textarea
                placeholder="Escribe tu respuesta aquí..."
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                rows={4}
              />
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Adjuntar archivo
                </Button>
                <Button onClick={handleAddResponse} disabled={!newResponse.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar respuesta
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
