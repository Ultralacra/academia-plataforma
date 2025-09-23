"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PaymentManagement } from "@/components/admin/payment-management"

function PaymentsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Pagos</h1>
          <p className="text-muted-foreground">Administra pagos, facturación y contratos</p>
        </div>

        <PaymentManagement />
      </div>
    </DashboardLayout>
  )
}

export default function PaymentsPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PaymentsPage />
    </ProtectedRoute>
  )
}
