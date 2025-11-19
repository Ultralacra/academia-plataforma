"use client";

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import BonosPanel from "../_parts/BonosPanel";

export default function StudentBonosPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="mt-2">
          <BonosPanel studentCode={code} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
