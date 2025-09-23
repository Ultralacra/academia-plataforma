"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StudentTicketSystem } from "@/components/student/student-ticket-system"

function StudentSupportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Soporte Técnico</h1>
          <p className="text-muted-foreground">Crea tickets de soporte y sube archivos multimedia</p>
        </div>

        <StudentTicketSystem />
      </div>
    </DashboardLayout>
  )
}

export default function StudentSupportPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <StudentSupportPage />
    </ProtectedRoute>
  )
}
