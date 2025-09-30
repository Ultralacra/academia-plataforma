"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { CreditCard, MessageSquare, Hammer } from "lucide-react";

function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestión centralizada — módulos principales
          </p>
        </div>
      </div>

      {/* Acciones rápidas (solo admin) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-20 flex-col space-y-2 bg-transparent"
          onClick={() => router.push("/admin/payments")}
        >
          <CreditCard className="h-6 w-6" />
          <span>Pagos y Facturación</span>
        </Button>

        <Button
          variant="outline"
          className="h-20 flex-col space-y-2 bg-transparent"
          onClick={() => router.push("/admin/tickets")}
        >
          <MessageSquare className="h-6 w-6" />
          <span>Tickets de Soporte</span>
        </Button>
      </div>

      {/* Información en desarrollo */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Hammer className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Información en desarrollo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta sección del panel está en construcción. Aquí podrás ver
              indicadores, reportes y configuraciones avanzadas del sistema
              próximamente.
            </p>
            <ul className="list-disc ml-5 mt-3 text-sm text-muted-foreground space-y-1">
              <li>Reportes ejecutivos y análisis.</li>
              <li>Configuraciones avanzadas de la plataforma.</li>
              <li>Auditoría y registro de actividad.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <AdminDashboard />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
