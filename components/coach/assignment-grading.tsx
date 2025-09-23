"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { dataService, type Assignment, type StudentAssignment, type Student } from "@/lib/data-service"
import { useAuth } from "@/hooks/use-auth"
import { FileText, Clock, User, Calendar, CheckCircle } from "lucide-react"

export function AssignmentGrading() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null)
  const [score, setScore] = useState("")
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    if (user?.role === "coach") {
      loadData()
    }
  }, [user])

  const loadData = () => {
    setAssignments(dataService.getAssignments())
    setStudents(dataService.getStudents())

    // Filter student assignments for this coach's students
    const allStudentAssignments = dataService.getStudentAssignments()
    const myStudentAssignments = allStudentAssignments.filter((sa) => sa.coachId === user?.id)
    setStudentAssignments(myStudentAssignments)
  }

  const getAssignmentDetails = (assignmentId: string) => {
    return assignments.find((a) => a.id === assignmentId)
  }

  const getStudentName = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    return student?.name || "Estudiante desconocido"
  }

  const getStatusBadge = (status: StudentAssignment["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pendiente</Badge>
      case "submitted":
        return <Badge variant="default">Entregado</Badge>
      case "graded":
        return <Badge variant="secondary">Calificado</Badge>
      case "needs_revision":
        return <Badge variant="destructive">Necesita Revisión</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleGradeAssignment = () => {
    if (!selectedAssignment || !score || !feedback) return

    const updates: Partial<StudentAssignment> = {
      score: Number.parseInt(score),
      feedback,
      status: "graded",
    }

    dataService.updateStudentAssignment(selectedAssignment.id, updates)
    setSelectedAssignment(null)
    setScore("")
    setFeedback("")
    loadData()
  }

  const submittedAssignments = studentAssignments.filter((sa) => sa.status === "submitted")
  const gradedAssignments = studentAssignments.filter((sa) => sa.status === "graded")

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Calificación de Tareas</h2>
          <p className="text-muted-foreground">Revisa y califica las entregas de tus estudiantes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-bold">{submittedAssignments.length}</div>
                <div className="text-sm text-muted-foreground">Por calificar</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-bold">{gradedAssignments.length}</div>
                <div className="text-sm text-muted-foreground">Calificadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-bold">{studentAssignments.length}</div>
                <div className="text-sm text-muted-foreground">Total entregas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments to Grade */}
      <Card>
        <CardHeader>
          <CardTitle>Tareas por Calificar</CardTitle>
          <CardDescription>Entregas pendientes de revisión</CardDescription>
        </CardHeader>
        <CardContent>
          {submittedAssignments.length > 0 ? (
            <div className="space-y-4">
              {submittedAssignments.map((studentAssignment) => {
                const assignment = getAssignmentDetails(studentAssignment.assignmentId)
                if (!assignment) return null

                return (
                  <div key={studentAssignment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{assignment.title}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {getStudentName(studentAssignment.studentId)}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Entregado: {new Date(studentAssignment.submissionDate!).toLocaleDateString()}
                          </span>
                          <span>Puntos máximos: {assignment.maxScore}</span>
                        </div>
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm">{studentAssignment.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {getStatusBadge(studentAssignment.status)}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAssignment(studentAssignment)}
                            >
                              Calificar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Calificar Tarea</DialogTitle>
                              <DialogDescription>
                                {assignment.title} - {getStudentName(studentAssignment.studentId)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-muted p-4 rounded-lg">
                                <h4 className="font-medium mb-2">Instrucciones de la tarea</h4>
                                <p className="text-sm whitespace-pre-line">{assignment.instructions}</p>
                              </div>

                              <div className="bg-card p-4 rounded-lg border">
                                <h4 className="font-medium mb-2">Entrega del estudiante</h4>
                                <p className="text-sm">{studentAssignment.content}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Entregado el {new Date(studentAssignment.submissionDate!).toLocaleString()}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="score">Puntuación</Label>
                                  <Input
                                    id="score"
                                    type="number"
                                    min="0"
                                    max={assignment.maxScore}
                                    value={score}
                                    onChange={(e) => setScore(e.target.value)}
                                    placeholder={`0 - ${assignment.maxScore}`}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <span className="text-sm text-muted-foreground">de {assignment.maxScore} puntos</span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="feedback">Retroalimentación</Label>
                                <Textarea
                                  id="feedback"
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                  placeholder="Proporciona comentarios constructivos sobre la entrega..."
                                  rows={4}
                                />
                              </div>

                              <Button onClick={handleGradeAssignment} className="w-full" disabled={!score || !feedback}>
                                Guardar Calificación
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay tareas por calificar</h3>
              <p className="text-muted-foreground">Todas las entregas han sido revisadas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Graded */}
      {gradedAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tareas Calificadas Recientemente</CardTitle>
            <CardDescription>Últimas calificaciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gradedAssignments.slice(0, 5).map((studentAssignment) => {
                const assignment = getAssignmentDetails(studentAssignment.assignmentId)
                if (!assignment) return null

                return (
                  <div key={studentAssignment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium">{assignment.title}</h4>
                      <p className="text-sm text-muted-foreground">{getStudentName(studentAssignment.studentId)}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {studentAssignment.score}/{assignment.maxScore}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((studentAssignment.score! / assignment.maxScore) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
