"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { dataService, type Student, type Course } from "@/lib/data-service";
import { useAuth } from "@/hooks/use-auth";
import {
  Mail,
  Calendar,
  BookOpen,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

export function StudentList() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (user?.role === "coach") {
      loadStudents();
      setCourses(dataService.getCourses());
    }
  }, [user]);

  const loadStudents = () => {
    const allStudents = dataService.getStudents();
    // Filter students assigned to this coach
    const myStudents = allStudents.filter(
      (student) => student.coachId === user?.id
    );
    setStudents(myStudents);
  };

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.title || "Sin curso";
  };

  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Activo</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspendido</Badge>;
      case "completed":
        return <Badge variant="secondary">Completado</Badge>;
      case "dropped":
        return <Badge variant="outline">Abandonado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mis Estudiantes</h2>
          <p className="text-muted-foreground">
            Estudiantes asignados a tu mentoría ({students.length})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student) => (
          <Card key={student.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <CardDescription className="flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {student.email}
                  </CardDescription>
                </div>
                {getStatusBadge(student.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Progreso del curso
                  </span>
                  <span className="font-medium">{student.progress}%</span>
                </div>
                <Progress value={student.progress} className="h-2" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Curso
                  </span>
                  <span className="font-medium">
                    {getCourseName(student.courseId)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Inscrito
                  </span>
                  <span className="font-medium">
                    {new Date(student.enrollmentDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between"></div>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Ver Progreso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Contactar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {students.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No tienes estudiantes asignados
              </h3>
              <p>
                Los estudiantes aparecerán aquí cuando sean asignados a tu
                mentoría.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
