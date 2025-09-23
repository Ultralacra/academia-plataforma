"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { dataService, type Ticket, type Course } from "@/lib/data-service"
import { MessageSquare, Plus, Upload, FileText, ImageIcon, Video, Mic } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

export function StudentTicketSystem() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    courseId: "defaultCourseId", // Updated default value
    priority: "medium" as Ticket["priority"],
    category: "general" as Ticket["category"],
  })
  const [attachments, setAttachments] = useState<File[]>([])

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = () => {
    if (!user) return

    const allTickets = dataService.getTickets()
    const studentTickets = allTickets.filter((t) => t.studentId === user.id)
    setTickets(studentTickets)

    const allCourses = dataService.getCourses()
    setCourses(allCourses)
  }

  const handleCreateTicket = () => {
    if (!user || !newTicket.title || !newTicket.description) {
      toast({
        title: "Error",
        description: "Título y descripción son obligatorios",
        variant: "destructive",
      })
      return
    }

    const ticket: Ticket = {
      id: Date.now().toString(),
      studentId: user.id,
      coachId: user.coachId || "2", // Default coach if not assigned
      courseId: newTicket.courseId,
      title: newTicket.title,
      description: newTicket.description,
      status: "open",
      priority: newTicket.priority,
      category: newTicket.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
    }

    const currentTickets = dataService.getTickets()
    dataService.setTickets([...currentTickets, ticket])

    setNewTicket({
      title: "",
      description: "",
      courseId: "defaultCourseId", // Updated default value
      priority: "medium",
      category: "general",
    })
    setAttachments([])
    setIsCreateDialogOpen(false)
    loadData()

    toast({
      title: "Ticket creado",
      description: "Tu ticket ha sido creado exitosamente",
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments([...attachments, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon className="h-4 w-4" />
      case "mp4":
      case "avi":
      case "mov":
        return <Video className="h-4 w-4" />
      case "mp3":
      case "wav":
      case "ogg":
        return <Mic className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    return course?.title || "Sin curso específico"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mis Tickets de Soporte</h2>
          <p className="text-muted-foreground">Gestiona tus consultas y problemas técnicos</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Ticket de Soporte</DialogTitle>
              <DialogDescription>
                Describe tu problema o consulta. Puedes adjuntar archivos multimedia para ayudarnos a entender mejor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título del ticket</Label>
                <Input
                  id="title"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  placeholder="Ej: Problema con acceso al módulo 3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course">Curso relacionado</Label>
                  <Select
                    value={newTicket.courseId}
                    onValueChange={(value) => setNewTicket({ ...newTicket, courseId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defaultCourseId">Sin curso específico</SelectItem> {/* Updated value */}
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(value: Ticket["priority"]) => setNewTicket({ ...newTicket, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value: Ticket["category"]) => setNewTicket({ ...newTicket, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="academic">Académico</SelectItem>
                    <SelectItem value="payment">Pago</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descripción detallada</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Describe tu problema o consulta con el mayor detalle posible..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Archivos adjuntos</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Subir archivos
                      </label>
                    </Button>
                    <span className="text-sm text-muted-foreground">Imágenes, videos, audios, documentos</span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.name)}
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTicket}>Crear Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{ticket.title}</CardTitle>
                  <CardDescription className="flex items-center space-x-4">
                    <span>#{ticket.id}</span>
                    <span>Curso: {getCourseName(ticket.courseId)}</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  {getStatusBadge(ticket.status)}
                  {getPriorityBadge(ticket.priority)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{ticket.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {ticket.category === "technical" && "Técnico"}
                    {ticket.category === "academic" && "Académico"}
                    {ticket.category === "payment" && "Pago"}
                    {ticket.category === "general" && "General"}
                  </Badge>
                  <span>{ticket.responses.length} respuestas</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/student/support/${ticket.id}`}>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Ver detalles
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No tienes tickets de soporte</h3>
              <p>Cuando tengas alguna consulta o problema, puedes crear un ticket aquí.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
