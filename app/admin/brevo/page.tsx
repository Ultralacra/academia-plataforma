"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BrevoClientPage } from "@/app/admin/brevo/ui";

export default function BrevoPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <BrevoClientPage />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
