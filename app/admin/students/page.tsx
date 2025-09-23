"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StudentManagement } from "@/components/admin/student-management"

function StudentsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Estudiantes</h1>
          <p className="text-muted-foreground">Administra todos los estudiantes de la academia</p>
        </div>

        <StudentManagement />
      </div>
    </DashboardLayout>
  )
}

export default function StudentsPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <StudentsPage />
    </ProtectedRoute>
  )
}
