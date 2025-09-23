"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoachMetrics } from "@/components/coach/coach-metrics"
import { StudentList } from "@/components/coach/student-list"
import { TicketManagement } from "@/components/coach/ticket-management"
import { AssignmentGrading } from "@/components/coach/assignment-grading"
import { Users, MessageSquare, BarChart3, FileText } from "lucide-react"

function CoachDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Coach</h1>
          <p className="text-muted-foreground">
            Gestiona tus estudiantes, califica tareas y responde tickets de soporte.
          </p>
        </div>

        {/* Metrics */}
        <CoachMetrics />

        {/* Main Content Tabs */}
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Mis Estudiantes</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Calificar Tareas</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Tickets de Soporte</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Análisis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentList />
          </TabsContent>

          <TabsContent value="assignments">
            <AssignmentGrading />
          </TabsContent>

          <TabsContent value="tickets">
            <TicketManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Análisis Detallado</h3>
              <p className="text-muted-foreground">
                Próximamente: reportes detallados de rendimiento y progreso de estudiantes.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default function CoachPage() {
  return (
    <ProtectedRoute allowedRoles={["coach"]}>
      <CoachDashboard />
    </ProtectedRoute>
  )
}
