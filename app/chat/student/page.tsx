"use client";

import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import ChatRealtime from "@/components/chat/ChatRealtime";

export default function StudentChatPage() {
  const [code, setCode] = React.useState("");
  const [room, setRoom] = React.useState<string | null>(null);

  function join(e?: React.FormEvent) {
    e?.preventDefault();
    const v = code.toLowerCase().trim();
    if (!v) return;
    setRoom(v);
  }
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <DashboardLayout>
        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div>
            <h1 className="text-xl font-semibold">Chat con administración</h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tu código de alumno para iniciar el chat en tiempo real.
            </p>
          </div>

          {!room ? (
            <form
              onSubmit={join}
              className="rounded-xl border bg-white p-4 flex items-center gap-2"
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Tu código de alumno (p. ej. CXA-574)"
                className="flex-1 border rounded-md px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm"
              >
                Entrar
              </button>
            </form>
          ) : (
            <div className="rounded-xl border bg-white p-2 flex-1 min-h-0">
              <ChatRealtime
                room={room}
                role="alumno"
                title="Chat"
                subtitle={`Código: ${room}`}
                variant="fullscreen"
                className="h-full"
                transport="socketio"
                socketio={{
                  // Usa misma origin por defecto; cambia NEXT_PUBLIC_SOCKET_URL si hace falta
                  url: process.env.NEXT_PUBLIC_SOCKET_URL,
                  tokenEndpoint:
                    process.env.NEXT_PUBLIC_CHAT_TOKEN_ENDPOINT ||
                    "https://v001.vercel.app/v1/auth/token",
                  tokenId: room || undefined,
                  // Config por defecto segun el ejemplo provisto; ajusta via env si es necesario
                  idCliente:
                    Number(process.env.NEXT_PUBLIC_CHAT_ID_CLIENTE) || 456,
                  idEquipo:
                    Number(process.env.NEXT_PUBLIC_CHAT_ID_EQUIPO) || 789,
                  participants: [
                    {
                      participante_tipo: "cliente",
                      id_cliente:
                        Number(process.env.NEXT_PUBLIC_CHAT_ID_CLIENTE) || 456,
                      id_equipo:
                        Number(process.env.NEXT_PUBLIC_CHAT_ID_EQUIPO) || 789,
                    },
                    {
                      participante_tipo: "equipo",
                      id_equipo:
                        Number(process.env.NEXT_PUBLIC_CHAT_ID_EQUIPO) || 789,
                    },
                  ],
                  autoCreate: true,
                  autoJoin: true,
                }}
              />
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
