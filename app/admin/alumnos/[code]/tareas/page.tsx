"use client";

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { ClipboardList } from "lucide-react";
import TareasCard from "../_parts/TareasCard";

export default function StudentTareasPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");
  const { user } = useAuth();
  const canEdit = (user?.role ?? "").toLowerCase() !== "student";

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Mis tareas
          </h1>
        </div>

        <div className="mt-4">
          <TareasCard alumnoId={code} canEdit={canEdit} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
