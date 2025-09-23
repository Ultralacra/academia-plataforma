"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseContent } from "@/components/student/course-content"
import { PaymentHistory } from "@/components/student/payment-history"
import { TicketSupport } from "@/components/student/ticket-support"
import { BookOpen, CreditCard, MessageSquare, User } from "lucide-react"

function StudentDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Portal de Estudiante</h1>
          <p className="text-muted-foreground">
            Accede a tu curso, revisa tus pagos y obtén soporte cuando lo necesites.
          </p>
        </div>

        <Tabs defaultValue="course" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="course" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Mi Curso</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Mi Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Soporte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="course">
            <CourseContent />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentHistory />
          </TabsContent>

          <TabsContent value="profile">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Perfil de Usuario</h3>
              <p className="text-muted-foreground">
                Próximamente: gestión de perfil, configuración de cuenta y preferencias.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="support">
            <TicketSupport />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default function StudentPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <StudentDashboard />
    </ProtectedRoute>
  )
}
