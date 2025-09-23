"use client"

import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TicketDetailView } from "@/components/admin/ticket-detail-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Detalle del Ticket</h1>
            <p className="text-muted-foreground">Información completa del ticket de soporte</p>
          </div>
        </div>

        <TicketDetailView ticketId={ticketId} />
      </div>
    </DashboardLayout>
  )
}

export default function TicketDetailPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={["admin", "coach"]}>
      <TicketDetailPage />
    </ProtectedRoute>
  )
}
