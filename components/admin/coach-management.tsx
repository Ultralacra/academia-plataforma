"use client"

import { useState, useEffect } from "react"
import { dataService, type Coach, type Student, type Ticket } from "@/lib/data-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { UserPlus, Search, Eye, Users, MessageSquare } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface CoachWithMetrics extends Coach {
  studentCount: number
  activeTickets: number
  resolvedTickets: number
  averageResolutionTime: number
  studentProgress: number
}

export function CoachManagement() {
  const [coaches, setCoaches] = useState<CoachWithMetrics[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCoach, setNewCoach] = useState({
    name: "",
    email: "",
    specialization: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const coachesData = dataService.getCoaches()
    const studentsData = dataService.getStudents()
    const ticketsData = dataService.getTickets()

    setStudents(studentsData)
    setTickets(ticketsData)

    // Calculate metrics for each coach
    const coachesWithMetrics: CoachWithMetrics[] = coachesData.map((coach) => {
      const coachStudents = studentsData.filter((s) => s.coachId === coach.id)
      const coachTickets = ticketsData.filter((t) => t.coachId === coach.id)
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

      return {
        ...coach,
        studentCount: coachStudents.length,
        activeTickets: activeTickets.length,
        resolvedTickets: resolvedTickets.length,
        averageResolutionTime: avgResolutionTime,
        studentProgress: avgProgress,
      }
    })

    setCoaches(coachesWithMetrics)
  }

  const filteredCoaches = coaches.filter(
    (coach) =>
      coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.specialization.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddCoach = () => {
    if (!newCoach.name || !newCoach.email || !newCoach.specialization) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }

    const coach: Coach = {
      id: Date.now().toString(),
      name: newCoach.name,
      email: newCoach.email,
      specialization: newCoach.specialization,
      studentsAssigned: [],
      isActive: true,
      joinDate: new Date().toISOString().split("T")[0],
    }

    const currentCoaches = dataService.getCoaches()
    dataService.setCoaches([...currentCoaches, coach])

    setNewCoach({ name: "", email: "", specialization: "" })
    setIsAddDialogOpen(false)
    loadData()

    toast({
      title: "Coach agregado",
      description: `${coach.name} ha sido agregado exitosamente`,
    })
  }

  const handleToggleCoachStatus = (coachId: string) => {
    const currentCoaches = dataService.getCoaches()
    const updatedCoaches = currentCoaches.map((coach) =>
      coach.id === coachId ? { ...coach, isActive: !coach.isActive } : coach,
    )
    dataService.setCoaches(updatedCoaches)
    loadData()

    toast({
      title: "Estado actualizado",
      description: "El estado del coach ha sido actualizado",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Coaches</h2>
          <p className="text-muted-foreground">Administra coaches y sus métricas de rendimiento</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Coach
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Coach</DialogTitle>
              <DialogDescription>Completa la información del nuevo coach</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={newCoach.name}
                  onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                  placeholder="Ej: Dr. María González"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCoach.email}
                  onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                  placeholder="maria@academy.com"
                />
              </div>
              <div>
                <Label htmlFor="specialization">Especialización</Label>
                <Input
                  id="specialization"
                  value={newCoach.specialization}
                  onChange={(e) => setNewCoach({ ...newCoach, specialization: e.target.value })}
                  placeholder="Ej: Marketing Digital, Desarrollo Web"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCoach}>Agregar Coach</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar coaches por nombre, email o especialización..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Coaches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCoaches.map((coach) => (
          <Card key={coach.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{coach.name}</CardTitle>
                  <CardDescription>{coach.email}</CardDescription>
                </div>
                <Badge variant={coach.isActive ? "default" : "secondary"}>
                  {coach.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Especialización</p>
                <p className="text-sm text-muted-foreground">{coach.specialization}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{coach.studentCount} estudiantes</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>{coach.activeTickets} tickets</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso promedio</span>
                  <span className="font-medium">{coach.studentProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${coach.studentProgress}%` }}></div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                  <Link href={`/admin/coaches/${coach.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver detalles
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleToggleCoachStatus(coach.id)}>
                  {coach.isActive ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
