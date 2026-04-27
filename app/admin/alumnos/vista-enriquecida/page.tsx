"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import VistaEnriquecidaContent from "./VistaEnriquecidaContent";

export default function VistaEnriquecidaPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <VistaEnriquecidaContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
