"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { dataService, type Student, type Coach, type Course, type Payment, type Ticket } from "@/lib/data-service"
import { User, Mail, Calendar, CreditCard, BookOpen, MessageSquare, FileText, CheckCircle, XCircle } from "lucide-react"

interface StudentDetailViewProps {
  studentId: string
}

export function StudentDetailView({ studentId }: StudentDetailViewProps) {
  const [student, setStudent] = useState<Student | null>(null)
  const [coach, setCoach] = useState<Coach | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    loadStudentData()
  }, [studentId])

  const loadStudentData = () => {
    const studentData = dataService.getStudents().find((s) => s.id === studentId)
    if (!studentData) return

    setStudent(studentData)

    const coachData = dataService.getCoaches().find((c) => c.id === studentData.coachId)
    setCoach(coachData || null)

    const courseData = dataService.getCourses().find((c) => c.id === studentData.courseId)
    setCourse(courseData || null)

    const studentPayments = dataService.getPayments().filter((p) => p.studentId === studentId)
    setPayments(studentPayments)

    const studentTickets = dataService.getTickets().filter((t) => t.studentId === studentId)
    setTickets(studentTickets)
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Estudiante no encontrado</h3>
        <p className="text-muted-foreground">El estudiante solicitado no existe en el sistema.</p>
      </div>
    )
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

  const getPaymentStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Pagado</Badge>
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>
      case "refunded":
        return <Badge variant="outline">Reembolsado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTicketStatusBadge = (status: Ticket["status"]) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Abierto</Badge>
      case "in_progress":
        return <Badge variant="secondary">En Progreso</Badge>
      case "resolved":
        return <Badge variant="default">Resuelto</Badge>
      case "closed":
        return <Badge variant="outline">Cerrado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const totalPaid = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)

  const pendingPayments = payments.filter((p) => p.status === "pending").length
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length

  return (
    <div className="space-y-6">
      {/* Student Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Información Personal</CardTitle>
            <User className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">{student.name}</p>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Mail className="h-3 w-3 mr-1" />
                  {student.email}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado:</span>
                {getStatusBadge(student.status)}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                Inscrito: {new Date(student.enrollmentDate).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso del Curso</CardTitle>
            <BookOpen className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold">{course?.title || "Sin curso asignado"}</p>
                <p className="text-sm text-muted-foreground">Coach: {coach?.name || "Sin asignar"}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Progreso:</span>
                  <span className="text-sm font-medium">{student.progress}%</span>
                </div>
                <Progress value={student.progress} className="w-full" />
              </div>
              <div className="flex items-center text-sm">
                {student.contractSigned ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Contrato firmado
                  </div>
                ) : (
                  <div className="flex items-center text-orange-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Contrato pendiente
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resumen de Actividad</CardTitle>
            <MessageSquare className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total pagado:</span>
                <span className="text-lg font-bold text-green-600">€{totalPaid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pagos pendientes:</span>
                <Badge variant={pendingPayments > 0 ? "destructive" : "default"}>{pendingPayments}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tickets abiertos:</span>
                <Badge variant={openTickets > 0 ? "secondary" : "default"}>{openTickets}</Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                Próximo pago: {new Date(student.nextPaymentDate).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Historial de Pagos</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Tickets de Soporte</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Actividad del Curso</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Todos los pagos realizados por el estudiante</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Método</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell className="font-medium">€{payment.amount}</TableCell>
                        <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay pagos registrados
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
              <CardDescription>Historial de consultas y problemas reportados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Coach Asignado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{ticket.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ticket.courseId
                            ? dataService.getCourses().find((c) => c.id === ticket.courseId)?.title || "Curso eliminado"
                            : "General"}
                        </TableCell>
                        <TableCell>{getTicketStatusBadge(ticket.status)}</TableCell>
                        <TableCell>
                          {ticket.assignedCoachId
                            ? dataService.getCoaches().find((c) => c.id === ticket.assignedCoachId)?.name ||
                              "Sin asignar"
                            : "Sin asignar"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {tickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay tickets registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Actividad del Curso</CardTitle>
              <CardDescription>Progreso y actividades completadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Actividad del Curso</h3>
                <p className="text-muted-foreground">
                  Próximamente: seguimiento detallado de lecciones completadas, tareas entregadas y calificaciones.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
