"use client";

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { ClipboardList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TareasCard from "../_parts/TareasCard";
import TareasMetadataSection from "../_parts/TareasMetadataSection";

export default function StudentTareasPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");
  const { user } = useAuth();
  const role = (user?.role ?? "").toLowerCase();
  const canEdit = role === "student" || role === "admin";
  const canDelete = role === "student" || role === "admin";

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Mis tareas
          </h1>
        </div>

        <div className="mt-4">
          <Tabs defaultValue="tareas" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tareas">Tareas</TabsTrigger>
              <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
            </TabsList>

            <TabsContent value="tareas">
              <TareasMetadataSection
                alumnoCode={code}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            </TabsContent>

            <TabsContent value="observaciones">
              <TareasCard alumnoId={code} canEdit={canEdit} />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
