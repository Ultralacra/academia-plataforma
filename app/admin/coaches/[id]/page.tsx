"use client"

import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CoachDetailView } from "@/components/admin/coach-detail-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

function CoachDetailPage() {
  const params = useParams()
  const router = useRouter()
  const coachId = params.id as string

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Detalle del Coach</h1>
            <p className="text-muted-foreground">Información completa y métricas del coach</p>
          </div>
        </div>

        <CoachDetailView coachId={coachId} />
      </div>
    </DashboardLayout>
  )
}

export default function CoachDetailPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <CoachDetailPage />
    </ProtectedRoute>
  )
}
