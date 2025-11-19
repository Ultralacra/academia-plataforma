"use client";

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import AdsMetricsForm from "../_parts/AdsMetricsForm";

export default function StudentAdsPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="mt-2">
          <AdsMetricsForm studentCode={code} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
