"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import StudentChatInline from "@/components/chat/StudentChatInline";
import ChatRealtime from "@/components/chat/ChatRealtime";
import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { dataService, type StudentItem } from "@/lib/data-service";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle } from "lucide-react";

function getChatTimestamp(chat: any): number {
  const fields = [
    chat?.last_message?.fecha_envio_local,
    chat?.last_message?.fecha_envio,
    chat?.last_message_at,
    chat?.fecha_ultimo_mensaje,
    chat?.updated_at,
    chat?.fecha_actualizacion,
    chat?.fecha_creacion_local,
    chat?.fecha_creacion,
    chat?.created_at,
  ];

  for (const field of fields) {
    const timestamp = Date.parse(String(field || ""));
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  return 0;
}

function formatChatDate(raw: unknown): string | null {
  const timestamp = Date.parse(String(raw || ""));
  if (Number.isNaN(timestamp)) return null;

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function ChatByCodePageContent({ params }: { params: { code: string } }) {
  const { code } = params;
  const [student, setStudent] = useState<StudentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [contactChats, setContactChats] = useState<any[]>([]);
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
            (x) => (x.code ?? "").toLowerCase() === code.toLowerCase(),
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
  const duplicateChats = useMemo(() => {
    const uniqueChats = new Map<string, any>();

    for (const chat of contactChats) {
      const chatId = String(chat?.id_chat ?? chat?.id ?? "").trim();
      if (!chatId || uniqueChats.has(chatId)) continue;
      uniqueChats.set(chatId, chat);
    }

    return Array.from(uniqueChats.values()).sort(
      (left, right) => getChatTimestamp(right) - getChatTimestamp(left),
    );
  }, [contactChats]);
  const hasDuplicateChats = duplicateChats.length > 1;

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

          {hasDuplicateChats && (
            <div className="px-1 pb-2">
              <Alert className="border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  Este contacto tiene {duplicateChats.length} conversaciones
                  abiertas
                </AlertTitle>
                <AlertDescription>
                  <p>
                    Antes de responder, revisa que estés escribiendo en el chat
                    correcto para evitar partir el historial.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-amber-900/90 dark:text-amber-100/90">
                    {duplicateChats.map((chat) => {
                      const chatId = String(chat?.id_chat ?? chat?.id ?? "");
                      const createdAt = formatChatDate(
                        chat?.fecha_creacion_local ??
                          chat?.fecha_creacion ??
                          chat?.created_at,
                      );
                      const lastMessageAt = formatChatDate(
                        chat?.last_message?.fecha_envio_local ??
                          chat?.last_message?.fecha_envio ??
                          chat?.last_message_at ??
                          chat?.fecha_ultimo_mensaje,
                      );

                      return (
                        <span
                          key={chatId}
                          className="rounded-md border border-amber-500/30 bg-amber-100/70 px-2 py-1 dark:bg-amber-900/30"
                        >
                          {chatId}
                          {createdAt ? ` · creado ${createdAt}` : ""}
                          {lastMessageAt ? ` · último ${lastMessageAt}` : ""}
                        </span>
                      );
                    })}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            {senderRole === "alumno" ? (
              <StudentChatInline
                code={roomCode}
                title={title}
                subtitle={subtitle}
                onChatsList={setContactChats}
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
                onChatsList={setContactChats}
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
                onChatsList={setContactChats}
                listParams={{
                  participante_tipo: "cliente",
                  id_cliente: roomCode,
                }}
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

export default function ChatByCodePage(props: { params: { code: string } }) {
  return (
    <Suspense fallback={null}>
      <ChatByCodePageContent {...props} />
    </Suspense>
  );
}
