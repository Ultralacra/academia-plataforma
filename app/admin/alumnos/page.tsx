"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import StudentsContent from "./StudentsContent";

export default function AlumnosPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <StudentsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
