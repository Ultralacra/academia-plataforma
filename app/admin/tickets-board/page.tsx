"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import TicketsBoard from "./TicketsBoard";

export default function TicketsBoardPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <TicketsBoard />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
