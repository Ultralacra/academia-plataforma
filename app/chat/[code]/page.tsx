"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import StudentChatInline from "@/components/chat/StudentChatInline";
import ChatRealtime from "@/components/chat/ChatRealtime";
import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { dataService, type StudentItem } from "@/lib/data-service";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export default function ChatByCodePage({
  params,
}: {
  params: { code: string };
}) {
  const { code } = params;
  const [student, setStudent] = useState<StudentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const search = useSearchParams();
  const transport = (search?.get("transport") === "local" ? "local" : "ws") as
    | "local"
    | "ws";
  const debug = search?.get("debug") === "1";
  const legacy = search?.get("legacy") === "1";

  const senderRole = useMemo(() => {
    const role = user?.role;
    if (role === "student") return "alumno" as const;
    if (role === "coach") return "coach" as const;
    return "admin" as const;
  }, [user?.role]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await dataService.getStudents({ search: code });
        if (!alive) return;
        const list = res.items ?? [];
        const s =
          list.find(
            (x) => (x.code ?? "").toLowerCase() === code.toLowerCase()
          ) ||
          list[0] ||
          null;
        setStudent(s);
      } catch {
        if (alive) setStudent(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  const title =
    senderRole === "alumno" ? "Chat con administración" : "Chat con alumno";
  const subtitle = student ? `${student.name} • ${student.code ?? code}` : code;
  const roomCode = (student?.code || code).toLowerCase();

  return (
    <ProtectedRoute allowedRoles={["admin", "student", "coach"]}>
      <DashboardLayout>
        <div className="flex flex-col h-full min-h-0">
          {senderRole !== "alumno" && (
            <div className="flex items-center justify-between pb-2 px-1">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate">{title}</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              </div>
              {user?.role === "admin" && (
                <Link
                  href={`/admin/alumnos/${encodeURIComponent(code)}`}
                  className="text-xs text-primary hover:underline whitespace-nowrap ml-2"
                >
                  Volver
                </Link>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            {senderRole === "alumno" ? (
              <StudentChatInline
                code={roomCode}
                title={title}
                subtitle={subtitle}
                className="h-full"
              />
            ) : senderRole === "admin" && !legacy ? (
              <CoachChatInline
                room={roomCode}
                role="admin"
                title={title}
                subtitle={subtitle}
                variant="card"
                className="h-full"
                precreateOnParticipants
                socketio={{
                  idCliente: roomCode,
                  // idAdmin para identificar el participante propio en join/send
                  idAdmin: String(user?.id ?? ""),
                  participants: [
                    { participante_tipo: "cliente", id_cliente: roomCode },
                  ],
                  autoCreate: true,
                  autoJoin: true,
                }}
                listParams={{
                  participante_tipo: "cliente",
                  id_cliente: roomCode,
                }}
              />
            ) : (
              <ChatRealtime
                room={roomCode}
                role={senderRole}
                title={title}
                subtitle={subtitle}
                variant="fullscreen"
                className="h-full"
                transport={transport}
                showRoleSwitch={debug}
              />
            )}
          </div>

          {loading && (
            <div className="text-xs text-muted-foreground py-1 px-1">
              Cargando datos del alumno…
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
