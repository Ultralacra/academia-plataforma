"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import TicketsContent from "./components/tickets-content";

export default function TicketsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <TicketsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
