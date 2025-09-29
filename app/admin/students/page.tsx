"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import StudentManagement from "./components/student-management";

function StudentsPage() {
  return (
    <DashboardLayout>
      <StudentManagement />
    </DashboardLayout>
  );
}

export default function StudentsPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <StudentsPage />
    </ProtectedRoute>
  );
}
