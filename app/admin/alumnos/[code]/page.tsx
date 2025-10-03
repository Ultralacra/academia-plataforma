"use client";

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import StudentDetailContent from "./StudentDetailContent";

export default function StudentDetailPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <StudentDetailContent code={code} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
