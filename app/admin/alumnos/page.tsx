// app/(dashboard)/students/page.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import StudentsContent from "./StudentsContent";

export default function StudentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <StudentsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
