"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { dataService, type Ticket, type TicketResponse } from "@/lib/data-service"
import { useAuth } from "@/hooks/use-auth"
import { MessageSquare, Plus, Clock, Send, AlertCircle } from "lucide-react"

export function TicketSupport() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "general" as Ticket["category"],
    priority: "medium" as Ticket["priority"],
  })

  useEffect(() => {
    if (user?.id) {
      loadTickets()
    }
  }, [user])

  const loadTickets = () => {
    const allTickets = dataService.getTickets()
    // Filter tickets created by this student
    const myTickets = allTickets.filter((ticket) => ticket.studentId === user?.id)
    setTickets(myTickets)
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

  const getCategoryIcon = (category: Ticket["category"]) => {
    switch (category) {
      case "technical":
        return <AlertCircle className="h-4 w-4" />
      case "academic":
        return <MessageSquare className="h-4 w-4" />
      case "payment":
        return <Clock className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const handleCreateTicket = () => {
    if (!newTicket.title.trim() || !newTicket.description.trim() || !user?.id) return

    // Find a coach to assign (simplified - in real app this would be more sophisticated)
    const coaches = dataService.getCoaches()
    const assignedCoach = coaches.find((coach) => coach.isActive) || coaches[0]

    const ticket: Ticket = {
      id: Date.now().toString(),
      studentId: user.id,
      coachId: assignedCoach?.id || "2", // Fallback to demo coach
      title: newTicket.title,
      description: newTicket.description,
      status: "open",
      priority: newTicket.priority,
      category: newTicket.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
    }

    const allTickets = dataService.getTickets()
    dataService.setTickets([...allTickets, ticket])

    // Reset form
    setNewTicket({
      title: "",
      description: "",
      category: "general",
      priority: "medium",
    })
    setIsCreatingTicket(false)
    loadTickets()
  }

  const handleSendResponse = () => {
    if (!selectedTicket || !responseMessage.trim()) return

    const newResponse: TicketResponse = {
      id: Date.now().toString(),
      authorId: user?.id || "",
      authorRole: "student",
      message: responseMessage,
      createdAt: new Date().toISOString(),
    }

    const updatedTicket: Ticket = {
      ...selectedTicket,
      responses: [...selectedTicket.responses, newResponse],
      updatedAt: new Date().toISOString(),
    }

    // Update ticket in storage
    const allTickets = dataService.getTickets()
    const updatedTickets = allTickets.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
    dataService.setTickets(updatedTickets)

    setResponseMessage("")
    setSelectedTicket(null)
    loadTickets()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Centro de Soporte</h2>
          <p className="text-muted-foreground">Crea tickets y consulta con tu coach</p>
        </div>
        <Dialog open={isCreatingTicket} onOpenChange={setIsCreatingTicket}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Ticket de Soporte</DialogTitle>
              <DialogDescription>Describe tu consulta o problema para que tu coach pueda ayudarte</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Describe brevemente tu consulta"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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

                <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Explica detalladamente tu consulta o problema"
                  rows={4}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreatingTicket(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={!newTicket.title.trim() || !newTicket.description.trim()}
                >
                  Crear Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(ticket.category)}
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                  </div>
                  <CardDescription className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {ticket.responses.length} respuestas
                    </span>
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
                <Badge variant="outline" className="text-xs">
                  {ticket.category === "technical" && "Técnico"}
                  {ticket.category === "academic" && "Académico"}
                  {ticket.category === "payment" && "Pago"}
                  {ticket.category === "general" && "General"}
                </Badge>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Ver Conversación
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{ticket.title}</DialogTitle>
                      <DialogDescription>
                        Ticket #{ticket.id} - {ticket.category}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm">{ticket.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Creado el {new Date(ticket.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {ticket.responses.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium">Conversación</h4>
                          {ticket.responses.map((response) => (
                            <div key={response.id} className="bg-card p-3 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {response.authorRole === "coach" ? "Coach" : "Tú"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(response.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm">{response.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {ticket.status !== "closed" && (
                        <div className="space-y-3">
                          <h4 className="font-medium">Tu respuesta</h4>
                          <Textarea
                            placeholder="Escribe tu respuesta aquí..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            rows={4}
                          />
                          <div className="flex justify-end">
                            <Button onClick={handleSendResponse} disabled={!responseMessage.trim()}>
                              <Send className="h-3 w-3 mr-1" />
                              Enviar Respuesta
                            </Button>
                          </div>
                        </div>
                      )}

                      {ticket.status === "closed" && (
                        <div className="bg-muted p-4 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Este ticket ha sido cerrado.</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
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
              <p className="mb-4">¿Tienes alguna consulta o problema? Crea tu primer ticket de soporte.</p>
              <Button onClick={() => setIsCreatingTicket(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
