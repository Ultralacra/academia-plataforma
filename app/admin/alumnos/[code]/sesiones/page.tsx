"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import SessionsStudentPanel from "../_parts/SessionsStudentPanel";
import { apiFetch } from "@/lib/api-config";

export default function StudentSesionesPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  const [studentName, setStudentName] = useState<string | undefined>(undefined);
  const [studentStage, setStudentStage] = useState<string | null>(null);
  const [assignedCoaches, setAssignedCoaches] = useState<
    Array<{
      id: string | number | null;
      code?: string | null;
      name: string;
      area?: string | null;
    }>
  >([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients?page=1&search=${encodeURIComponent(
          code
        )}`;
        const json = await apiFetch<any>(url);
        const rows: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.clients?.data)
          ? json.clients.data
          : Array.isArray(json?.getClients?.data)
          ? json.getClients.data
          : [];
        const s =
          rows.find(
            (r) =>
              String(r.codigo ?? r.code ?? "").toLowerCase() ===
              code.toLowerCase()
          ) ||
          rows[0] ||
          null;
        if (!alive) return;
        if (s) {
          setStudentName(s.nombre ?? s.name ?? undefined);
          setStudentStage((s.etapa ?? s.stage ?? null) as any);
        }
      } catch {}
      try {
        const j = await apiFetch<any>(
          `/client/get/clients-coaches?alumno=${encodeURIComponent(code)}`
        );
        const rows: any[] = Array.isArray(j?.data) ? j.data : [];
        if (!alive) return;
        setAssignedCoaches(
          rows.map((r) => ({
            id: r.id_coach ?? r.id ?? r.id_relacion ?? null,
            code: r.codigo_coach ?? r.codigo_equipo ?? r.codigo ?? r.id ?? null,
            name: r.coach_nombre ?? r.name ?? "",
            area: r.area ?? null,
          }))
        );
      } catch {
        if (!alive) return;
        setAssignedCoaches([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="mt-2">
          <SessionsStudentPanel
            studentCode={code}
            studentName={studentName}
            studentStage={studentStage}
            assignedCoaches={assignedCoaches}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
