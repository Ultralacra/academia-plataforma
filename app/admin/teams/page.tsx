"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import TeamsMetricsContent from "./TeamsMetricsContent";

export default function TeamsMetricsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <TeamsMetricsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
