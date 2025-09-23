"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CoachManagement } from "@/components/admin/coach-management"

export default function CoachesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <CoachManagement />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
