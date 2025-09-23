"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { dataService, type Ticket, type Student, type Coach } from "@/lib/data-service"
import { MessageSquare, Clock, User, AlertCircle, Search, TrendingUp } from "lucide-react"

export function AdminTicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setTickets(dataService.getTickets())
    setStudents(dataService.getStudents())
    setCoaches(dataService.getCoaches())
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getStudentName(ticket.studentId).toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  const getStudentName = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    return student?.name || "Estudiante desconocido"
  }

  const getCoachName = (coachId: string) => {
    const coach = coaches.find((c) => c.id === coachId)
    return coach?.name || "Coach no asignado"
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

  const handleReassignTicket = (ticketId: string, newCoachId: string) => {
    const updatedTickets = tickets.map((t) =>
      t.id === ticketId ? { ...t, coachId: newCoachId, updatedAt: new Date().toISOString() } : t,
    )
    dataService.setTickets(updatedTickets)
    loadData()
  }

  const handleUpdateStatus = (ticketId: string, newStatus: Ticket["status"]) => {
    const updatedTickets = tickets.map((t) =>
      t.id === ticketId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t,
    )
    dataService.setTickets(updatedTickets)
    loadData()
  }

  // Calculate metrics
  const metrics = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    highPriority: tickets.filter((t) => t.priority === "high").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Tickets de Soporte</h2>
          <p className="text-muted-foreground">Supervisa y gestiona todos los tickets de la plataforma</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium">Abiertos</p>
                <p className="text-2xl font-bold text-destructive">{metrics.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">En Progreso</p>
                <p className="text-2xl font-bold text-primary">{metrics.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Resueltos</p>
                <p className="text-2xl font-bold text-green-600">{metrics.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Alta Prioridad</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.highPriority}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="open">Abiertos</SelectItem>
            <SelectItem value="in-progress">En Progreso</SelectItem>
            <SelectItem value="resolved">Resueltos</SelectItem>
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="technical">Técnico</SelectItem>
            <SelectItem value="academic">Académico</SelectItem>
            <SelectItem value="payment">Pago</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map((ticket) => (
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
                      <User className="h-3 w-3 mr-1" />
                      {getStudentName(ticket.studentId)}
                    </span>
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      Coach: {getCoachName(ticket.coachId)}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
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
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {ticket.category === "technical" && "Técnico"}
                    {ticket.category === "academic" && "Académico"}
                    {ticket.category === "payment" && "Pago"}
                    {ticket.category === "general" && "General"}
                  </Badge>
                  <span>{ticket.responses.length} respuestas</span>
                </div>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>{ticket.title}</DialogTitle>
                        <DialogDescription>
                          Ticket #{ticket.id} - {getStudentName(ticket.studentId)} - {ticket.category}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm">{ticket.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Creado el {new Date(ticket.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {/* Admin Controls */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg border">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Reasignar Coach</label>
                            <Select
                              value={ticket.coachId}
                              onValueChange={(value) => handleReassignTicket(ticket.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {coaches.map((coach) => (
                                  <SelectItem key={coach.id} value={coach.id}>
                                    {coach.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Cambiar Estado</label>
                            <Select
                              value={ticket.status}
                              onValueChange={(value: Ticket["status"]) => handleUpdateStatus(ticket.id, value)}
                            >
                              <SelectTrigger>
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
                        </div>

                        {ticket.responses.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium">Conversación</h4>
                            {ticket.responses.map((response) => (
                              <div key={response.id} className="bg-card p-3 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {response.authorRole === "coach" && "Coach"}
                                    {response.authorRole === "student" && "Estudiante"}
                                    {response.authorRole === "admin" && "Admin"}
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
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No se encontraron tickets</h3>
              <p>No hay tickets que coincidan con los filtros seleccionados.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
