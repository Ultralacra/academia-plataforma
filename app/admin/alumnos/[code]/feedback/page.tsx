"use client";

import TicketsBoard from "@/app/admin/tickets-board/TicketsBoard";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ThumbsUp } from "lucide-react";

export default function StudentFeedbackPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ThumbsUp className="w-5 h-5" /> Feedback
          </h1>
        </div>
        <div className="h-[calc(100vh-140px)]">
          <TicketsBoard studentCode={code} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
