"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import ChatPanel from "../_parts/ChatPanel";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
import { MessageSquare } from "lucide-react";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send?phone=573117280418&text=%F0%9F%91%8B%20Hola%2C%20soy%20estudiante%20de%20Hotselling%20Lite.%20Mi%20nombre%20es%20____%20y%20tengo%20una%20duda%3A%0A%0A";

export default function StudentChatFullPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");
  const { user } = useAuth();
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const userRole = (user?.role || "").toLowerCase();
    if (userRole !== "student") {
      setIsCompleted(false);
      return;
    }
    const studentCode = (user as any)?.codigo;
    if (!studentCode) {
      setIsCompleted(false);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setIsCompleted(false);
      return;
    }

    fetch(`/client/get/clients?pageSize=5&search=${encodeURIComponent(studentCode)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => {
        const items = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        const student = items.find(
          (s: any) => String(s.code || s.codigo || "").toLowerCase() === studentCode.toLowerCase(),
        );
        const stage = String(student?.stage || "").toUpperCase();
        setIsCompleted(stage === "F5");
      })
      .catch(() => setIsCompleted(false));
  }, [user]);

  // Loading state while checking status
  if (isCompleted === null) {
    return (
      <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
        <DashboardLayout contentClassName="p-0 overflow-x-hidden overflow-y-auto">
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // COMPLETADO student: show WhatsApp modal
  if (isCompleted) {
    return (
      <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full mx-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-100 grid place-items-center mx-auto mb-5">
                <MessageSquare className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Programa completado
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Has finalizado tu programa. Para cualquier consulta o soporte, comunícate directamente con nuestro equipo de atención al cliente.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                Contactar por WhatsApp
              </a>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout contentClassName="p-0 overflow-x-hidden overflow-y-auto">
        <div className="h-full">
          <ChatPanel code={code} fullHeight />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
