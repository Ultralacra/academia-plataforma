import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BrevoEventsClientPage } from "@/app/admin/brevo/events/ui";

export default function BrevoEventsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <BrevoEventsClientPage />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
