"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { dataService, type Student, type Coach, type Course } from "@/lib/data-service"
import { Search, Plus, Edit, UserCheck, UserX, Mail, Calendar, CreditCard, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    coachId: "",
    courseId: "",
    paymentPlan: "monthly" as const,
  })

  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, statusFilter])

  const loadData = () => {
    setStudents(dataService.getStudents())
    setCoaches(dataService.getCoaches())
    setCourses(dataService.getCourses())
  }

  const filterStudents = () => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((student) => student.status === statusFilter)
    }

    setFilteredStudents(filtered)
  }

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.email || !newStudent.coachId || !newStudent.courseId) {
      return
    }

    const student: Student = {
      id: Date.now().toString(),
      name: newStudent.name,
      email: newStudent.email,
      coachId: newStudent.coachId,
      courseId: newStudent.courseId,
      enrollmentDate: new Date().toISOString().split("T")[0],
      status: "active",
      paymentPlan: newStudent.paymentPlan,
      nextPaymentDate: getNextPaymentDate(newStudent.paymentPlan),
      progress: 0,
      contractSigned: false,
    }

    dataService.addStudent(student)
    loadData()
    setIsAddDialogOpen(false)
    setNewStudent({ name: "", email: "", coachId: "", courseId: "", paymentPlan: "monthly" })
  }

  const handleUpdateStudent = (id: string, updates: Partial<Student>) => {
    dataService.updateStudent(id, updates)
    loadData()
    setEditingStudent(null)
  }

  const getNextPaymentDate = (plan: "monthly" | "quarterly" | "full") => {
    const now = new Date()
    switch (plan) {
      case "monthly":
        now.setMonth(now.getMonth() + 1)
        break
      case "quarterly":
        now.setMonth(now.getMonth() + 3)
        break
      case "full":
        now.setFullYear(now.getFullYear() + 1)
        break
    }
    return now.toISOString().split("T")[0]
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

  const getCoachName = (coachId: string) => {
    const coach = coaches.find((c) => c.id === coachId)
    return coach?.name || "Sin asignar"
  }

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    return course?.title || "Sin curso"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Estudiantes</h2>
          <p className="text-muted-foreground">Administra estudiantes, asignaciones y progreso</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Estudiante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Estudiante</DialogTitle>
              <DialogDescription>
                Completa la información del estudiante para registrarlo en la plataforma
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Nombre del estudiante"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach">Coach asignado</Label>
                <Select
                  value={newStudent.coachId}
                  onValueChange={(value) => setNewStudent({ ...newStudent, coachId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name} - {coach.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Curso</Label>
                <Select
                  value={newStudent.courseId}
                  onValueChange={(value) => setNewStudent({ ...newStudent, courseId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title} - €{course.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentPlan">Plan de pago</Label>
                <Select
                  value={newStudent.paymentPlan}
                  onValueChange={(value: "monthly" | "quarterly" | "full") =>
                    setNewStudent({ ...newStudent, paymentPlan: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="full">Pago completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddStudent} className="w-full">
                Registrar Estudiante
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="suspended">Suspendidos</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="dropped">Abandonados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Estudiantes ({filteredStudents.length})</CardTitle>
          <CardDescription>Lista de todos los estudiantes registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Plan de Pago</TableHead>
                  <TableHead>Próximo Pago</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {student.email}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Inscrito: {new Date(student.enrollmentDate).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getCoachName(student.coachId)}</TableCell>
                    <TableCell>{getCourseName(student.courseId)}</TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={student.progress} className="w-16" />
                        <span className="text-xs text-muted-foreground">{student.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {student.paymentPlan === "monthly" && "Mensual"}
                        {student.paymentPlan === "quarterly" && "Trimestral"}
                        {student.paymentPlan === "full" && "Completo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <CreditCard className="h-3 w-3 mr-1" />
                        {new Date(student.nextPaymentDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/students/${student.id}`)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        {student.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStudent(student.id, { status: "suspended" })}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStudent(student.id, { status: "active" })}
                          >
                            <UserCheck className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Estudiante</DialogTitle>
              <DialogDescription>Actualiza la información del estudiante</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Coach</Label>
                <Select
                  value={editingStudent.coachId}
                  onValueChange={(value) => setEditingStudent({ ...editingStudent, coachId: value })}
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
                <Label>Estado</Label>
                <Select
                  value={editingStudent.status}
                  onValueChange={(value: Student["status"]) => setEditingStudent({ ...editingStudent, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="dropped">Abandonado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Progreso (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingStudent.progress}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, progress: Number.parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <Button onClick={() => handleUpdateStudent(editingStudent.id, editingStudent)} className="w-full">
                Guardar Cambios
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
