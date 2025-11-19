"use client";

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import ChatPanel from "../_parts/ChatPanel";

export default function StudentChatFullPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="mt-2 h-[calc(100vh-140px)]">
          <ChatPanel code={code} fullHeight />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
