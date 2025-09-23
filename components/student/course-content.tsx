"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { dataService, type Course, type Student, type Assignment, type StudentAssignment } from "@/lib/data-service"
import { useAuth } from "@/hooks/use-auth"
import { BookOpen, Clock, CheckCircle, AlertCircle, FileText, Calendar } from "lucide-react"

export function CourseContent() {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([])

  useEffect(() => {
    if (user?.role === "student") {
      loadStudentData()
    }
  }, [user])

  const loadStudentData = () => {
    const students = dataService.getStudents()
    const currentStudent = students.find((s) => s.email === user?.email)

    if (currentStudent) {
      setStudent(currentStudent)

      const courses = dataService.getCourses()
      const studentCourse = courses.find((c) => c.id === currentStudent.courseId)
      setCourse(studentCourse || null)

      // Load assignments for this course
      const allAssignments = dataService.getAssignments()
      const courseAssignments = allAssignments.filter((assignment) => {
        return studentCourse?.modules.some((module) =>
          module.lessons.some((lesson) => lesson.id === assignment.lessonId),
        )
      })
      setAssignments(courseAssignments)

      // Load student's assignment submissions
      const allStudentAssignments = dataService.getStudentAssignments()
      const myAssignments = allStudentAssignments.filter((sa) => sa.studentId === currentStudent.id)
      setStudentAssignments(myAssignments)
    }
  }

  const getAssignmentStatus = (assignmentId: string) => {
    const submission = studentAssignments.find((sa) => sa.assignmentId === assignmentId)
    return submission?.status || "pending"
  }

  const getAssignmentScore = (assignmentId: string) => {
    const submission = studentAssignments.find((sa) => sa.assignmentId === assignmentId)
    return submission?.score
  }

  const getStatusBadge = (status: string) => {
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

  const getLessonAssignments = (lessonId: string) => {
    return assignments.filter((assignment) => assignment.lessonId === lessonId)
  }

  if (!student || !course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No hay curso asignado</h3>
        <p className="text-muted-foreground">Contacta con tu coach para obtener acceso al contenido del curso.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{course.title}</h2>
          <p className="text-muted-foreground mt-1">{course.description}</p>
          <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {course.duration}
            </span>
            <span className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              {course.modules.length} módulos
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{student.progress}%</div>
          <p className="text-sm text-muted-foreground">Progreso completado</p>
          <Progress value={student.progress} className="w-32 mt-2" />
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">Contenido del Curso</TabsTrigger>
          <TabsTrigger value="assignments">Mis Tareas</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <div className="space-y-4">
            {course.modules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>
                      Módulo {module.order}: {module.title}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {module.lessons.map((lesson) => {
                      const lessonAssignments = getLessonAssignments(lesson.id)
                      return (
                        <AccordionItem key={lesson.id} value={lesson.id}>
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span>
                                Lección {lesson.order}: {lesson.title}
                              </span>
                              {lessonAssignments.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {lessonAssignments.length} tarea{lessonAssignments.length > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="prose prose-sm max-w-none">
                                <p>{lesson.content}</p>
                              </div>

                              {lessonAssignments.length > 0 && (
                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3 flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Tareas de esta lección
                                  </h4>
                                  <div className="space-y-3">
                                    {lessonAssignments.map((assignment) => {
                                      const status = getAssignmentStatus(assignment.id)
                                      const score = getAssignmentScore(assignment.id)
                                      return (
                                        <div
                                          key={assignment.id}
                                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                        >
                                          <div className="flex-1">
                                            <h5 className="font-medium">{assignment.title}</h5>
                                            <p className="text-sm text-muted-foreground">{assignment.description}</p>
                                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                                              <span className="flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                Vence: {new Date(assignment.dueDate).toLocaleDateString()}
                                              </span>
                                              <span>Puntos: {assignment.maxScore}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-3">
                                            {score && (
                                              <div className="text-right">
                                                <div className="font-bold text-primary">
                                                  {score}/{assignment.maxScore}
                                                </div>
                                                <div className="text-xs text-muted-foreground">puntos</div>
                                              </div>
                                            )}
                                            {getStatusBadge(status)}
                                            <Button variant="outline" size="sm">
                                              {status === "pending" ? "Comenzar" : "Ver Detalles"}
                                            </Button>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <div>
                      <div className="font-bold">
                        {studentAssignments.filter((sa) => sa.status === "pending").length}
                      </div>
                      <div className="text-sm text-muted-foreground">Pendientes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-bold">
                        {studentAssignments.filter((sa) => sa.status === "submitted").length}
                      </div>
                      <div className="text-sm text-muted-foreground">Entregadas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-bold">
                        {studentAssignments.filter((sa) => sa.status === "graded").length}
                      </div>
                      <div className="text-sm text-muted-foreground">Calificadas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {assignments.map((assignment) => {
                const submission = studentAssignments.find((sa) => sa.assignmentId === assignment.id)
                const status = submission?.status || "pending"
                const score = submission?.score

                return (
                  <Card key={assignment.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <CardDescription>{assignment.description}</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {score && (
                            <div className="text-right mr-3">
                              <div className="font-bold text-primary">
                                {score}/{assignment.maxScore}
                              </div>
                              <div className="text-xs text-muted-foreground">puntos</div>
                            </div>
                          )}
                          {getStatusBadge(status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Vence: {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                          <span>Puntos máximos: {assignment.maxScore}</span>
                        </div>

                        {submission?.feedback && (
                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Retroalimentación del Coach</h4>
                            <p className="text-sm">{submission.feedback}</p>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button variant="outline">{status === "pending" ? "Comenzar Tarea" : "Ver Detalles"}</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
