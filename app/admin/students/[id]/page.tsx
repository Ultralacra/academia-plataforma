"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StudentDetailView } from "@/components/admin/student-detail-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface StudentDetailPageProps {
  params: {
    id: string
  }
}

function StudentDetailPage({ params }: StudentDetailPageProps) {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/students")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Estudiantes
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Detalle del Estudiante</h1>
            <p className="text-muted-foreground">Información completa y gestión del estudiante</p>
          </div>
        </div>

        <StudentDetailView studentId={params.id} />
      </div>
    </DashboardLayout>
  )
}

export default function StudentDetailPageWrapper({ params }: StudentDetailPageProps) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <StudentDetailPage params={params} />
    </ProtectedRoute>
  )
}
