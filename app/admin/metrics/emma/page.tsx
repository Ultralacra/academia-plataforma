"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import TicketsContent from "@/app/admin/tickets/components/tickets-content";
import type { Ticket } from "@/lib/data-service";

function isGeneratedByAgent(t: Ticket): boolean {
  const informante = String(t.informante ?? "").trim();
  const idAlumno = String(t.id_alumno ?? "").trim();
  return !!(informante && idAlumno && informante === idAlumno);
}

export default function EmmaMetricsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <TicketsContent preFilter={isGeneratedByAgent} title="Métricas Emma" />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
