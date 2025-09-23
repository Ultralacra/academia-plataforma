"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminTicketManagement } from "@/components/admin/admin-ticket-management"

export default function AdminTicketsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Tickets</h1>
            <p className="text-muted-foreground">Supervisa y gestiona todos los tickets de soporte</p>
          </div>

          <AdminTicketManagement />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
