"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import { CHAT_HOST } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { getCoaches } from "@/app/admin/teamsv2/api";
import { getClients } from "@/lib/data-service";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

function initials(name: string) {
  try {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || "")).toUpperCase();
  } catch {
    return "?";
  }
}

function getMessageText(src: any) {
  try {
    if (!src) return "-";
    if (typeof src === "string") return src;
    if (typeof src === "object") {
      const keys = ["contenido", "texto", "message", "body", "mensaje", "text"];
      for (const k of keys) if (src[k]) return String(src[k]);
      if (src?.contenido?.contenido) return String(src.contenido.contenido);
      try {
        const s = JSON.stringify(src);
        return s.length > 300 ? s.slice(0, 300) + "..." : s;
      } catch {
        return String(src);
      }
    }
    return String(src);
  } catch {
    return String(src ?? "-");
  }
}

function formatMsgTimestamp(m: any) {
  const ts =
    m?.created_at ||
    m?.createdAt ||
    m?.fecha_creacion ||
    m?.fecha ||
    m?.fecha_envio ||
    m?.created ||
    m?.timestamp ||
    null;
  const t = ts ? Date.parse(String(ts)) : NaN;
  if (!isFinite(t)) return "-";
  const d = new Date(t);
  return d.toLocaleString();
}

export default function UserConversationsPage({
  params,
}: {
  params: { codigo: string };
}) {
  const codigo = params?.codigo ?? null;
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<any[]>([]);
  const [coachMap, setCoachMap] = useState<Record<string, string>>({});
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const coaches = await getCoaches({ page: 1, pageSize: 10000 });
        const cMap: Record<string, string> = {};
        coaches.forEach((c: any) => {
          try {
            if (c.codigo) cMap[String(c.codigo)] = c.nombre || String(c.codigo);
            else if (c.id != null)
              cMap[String(c.id)] = c.nombre || String(c.id);
          } catch {}
        });
        setCoachMap(cMap);
      } catch {
        setCoachMap({});
      }
      try {
        const clientsResp = await getClients({ pageSize: 1000 });
        const items = Array.isArray((clientsResp as any)?.items)
          ? (clientsResp as any).items
          : [];
        const clMap: Record<string, string> = {};
        items.forEach((it: any) => {
          try {
            if (it.code) clMap[String(it.code)] = it.name || String(it.code);
          } catch {}
        });
        setClientMap(clMap);
      } catch {
        setClientMap({});
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!codigo) {
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);
      let socket: any = null;
      try {
        const token = getAuthToken();
        socket = io(CHAT_HOST, {
          auth: token ? { token } : undefined,
          transports: ["websocket", "polling"],
          reconnection: false,
        });
        const list: any[] = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve([]), 8000);
          socket.on("connect", () => {
            try {
              socket.emit(
                "chat.list",
                {
                  participante_tipo: "equipo",
                  id_equipo: String(codigo),
                  include_participants: true,
                  with_participants: true,
                },
                (ack: any) => {
                  clearTimeout(timer);
                  try {
                    resolve(Array.isArray(ack?.data) ? ack.data : []);
                  } catch {
                    resolve([]);
                  }
                },
              );
            } catch {
              clearTimeout(timer);
              resolve([]);
            }
          });
          socket.on("connect_error", () => {
            clearTimeout(timer);
            resolve([]);
          });
        });

        // if some items lack participants, try to probe join for the recent ones
        const needEnrich = list.some(
          (it) => !Array.isArray(it?.participants || it?.participantes),
        );
        if (!needEnrich) {
          if (mounted) {
            setConvs(list);
            setLoading(false);
          }
          try {
            if (socket) socket.disconnect();
          } catch {}
          return;
        }

        const sorted = [...list]
          .sort((a, b) => {
            const ta = Number(
              new Date(
                a.last_message_at ||
                  a.fecha_ultimo_mensaje ||
                  a.updated_at ||
                  a.created_at ||
                  0,
              ),
            );
            const tb = Number(
              new Date(
                b.last_message_at ||
                  b.fecha_ultimo_mensaje ||
                  b.updated_at ||
                  b.created_at ||
                  0,
              ),
            );
            return tb - ta;
          })
          .slice(0, 10);
        const enriched = new Map<string, any>();
        for (const it of sorted) {
          const id = it?.id_chat ?? it?.id;
          if (!id) continue;
          try {
            const data = await new Promise((resolve) => {
              const s = io(CHAT_HOST, {
                auth: token ? { token } : undefined,
                transports: ["websocket", "polling"],
                reconnection: false,
              });
              const tmr = setTimeout(() => {
                try {
                  s.disconnect();
                } catch {}
                resolve(null);
              }, 7000);
              s.on("connect", () => {
                try {
                  s.emit("chat.join", { id_chat: String(id) }, (ack: any) => {
                    clearTimeout(tmr);
                    try {
                      resolve(ack?.data ?? null);
                    } catch {
                      resolve(null);
                    }
                    try {
                      s.disconnect();
                    } catch {}
                  });
                } catch {
                  clearTimeout(tmr);
                  try {
                    s.disconnect();
                  } catch {}
                  resolve(null);
                }
              });
              s.on("connect_error", () => {
                clearTimeout(tmr);
                try {
                  s.disconnect();
                } catch {}
                resolve(null);
              });
            });
            if (data) enriched.set(String(id), data);
          } catch {}
        }
        const merged = list.map((it) => {
          const id = String(it?.id_chat ?? it?.id ?? "");
          const e = enriched.get(id);
          if (!e) return it;
          return {
            ...it,
            participants:
              e.participants ||
              e.participantes ||
              it.participants ||
              it.participantes,
            messages: e.messages || e.mensajes || it.messages || it.mensajes,
            last_message_at:
              it.last_message_at ||
              e.last_message_at ||
              e.fecha_ultimo_mensaje ||
              it.last_message_at,
            last_message: it.last_message || e.last_message || it.last_message,
          };
        });
        if (mounted) setConvs(merged);
      } catch (e) {
        if (mounted) setConvs([]);
      } finally {
        try {
          if (socket) socket.disconnect();
        } catch {}
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [codigo]);

  const resolveName = (tipo: string | undefined, id: any) => {
    try {
      const t = String(tipo || "").toLowerCase();
      const sid = String(id ?? "").trim();
      if (!sid) return "-";
      if (t === "equipo" || t === "coach") return coachMap[sid] ?? sid;
      if (t === "cliente" || t === "alumno") return clientMap[sid] ?? sid;
      return sid;
    } catch {
      return String(id ?? "");
    }
  };

  function renderParticipants(conv: any) {
    const list = Array.isArray(conv.otros_participantes)
      ? conv.otros_participantes
      : Array.isArray(conv.participants || conv.participantes)
        ? conv.participants || conv.participantes
        : [];
    if (!Array.isArray(list) || list.length === 0)
      return (
        <div className="text-sm text-muted-foreground">Sin participantes</div>
      );
    return (
      <div className="flex flex-wrap gap-2">
        {list.map((p: any, i: number) => {
          const tipo =
            p.participante_tipo || p.tipo || p.type || p.participanteTipo || "";
          const name =
            p.nombre_participante ||
            p.participante_emisor_nombre ||
            p.nombre ||
            resolveName(
              tipo,
              p.id_equipo ??
                p.id_cliente ??
                p.id_usuario ??
                p.id_participante ??
                p.id,
            );
          return (
            <div
              key={i}
              className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-50 border border-gray-100 text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-medium">
                {initials(name)}
              </div>
              <div className="flex flex-col leading-none">
                <div className="font-medium text-sm">{name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {String(tipo || "").toLowerCase()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Conversaciones</h2>
              <div className="text-sm text-muted-foreground">
                Usuario: {codigo}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/metrics/chat">
                <Button variant="ghost">Volver</Button>
              </Link>
            </div>
          </div>

          {loading && (
            <div className="text-sm text-gray-500">
              Cargando conversaciones...
            </div>
          )}
          {!loading && convs.length === 0 && (
            <div className="text-sm text-gray-500">
              No se encontraron conversaciones.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {convs.map((c: any) => (
              <div
                key={c.id_chat ?? c.id}
                className="bg-white rounded-lg border border-gray-100 hover:shadow-md p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="text-sm font-medium">
                      {getMessageText(c.last_message)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {String(
                        c.last_message_at ||
                          c.fecha_ultimo_mensaje ||
                          c.updated_at ||
                          c.created_at ||
                          "-",
                      )}
                    </div>
                    <div className="mt-3 text-sm">{renderParticipants(c)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-muted-foreground">
                      {c.unread ? `${c.unread} sin leer` : ""}
                    </div>
                    <Link
                      href={`/admin/metrics/chat/user/${encodeURIComponent(String(codigo))}/chat/${encodeURIComponent(String(c.id_chat ?? c.id ?? ""))}`}
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          try {
                            const id = String(c.id_chat ?? c.id ?? "");
                            if (id)
                              sessionStorage.setItem(
                                `admin_chat_conv_${id}`,
                                JSON.stringify(c),
                              );
                          } catch {}
                        }}
                      >
                        Ver mensajes
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Drawer
            open={drawerOpen}
            onOpenChange={(v) => {
              if (!v) setSelectedConv(null);
              setDrawerOpen(v);
            }}
          >
            <DrawerContent
              data-vaul-drawer-direction="right"
              className="bg-white"
            >
              <DrawerHeader className="flex items-center justify-between">
                <DrawerTitle>Mensajes</DrawerTitle>
                <div className="flex items-center gap-2">
                  <DrawerClose asChild>
                    <Button variant="ghost">Cerrar</Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <div className="p-4 h-[80vh] overflow-auto">
                {!selectedConv && (
                  <div className="text-sm text-muted-foreground">
                    Selecciona una conversación.
                  </div>
                )}
                {selectedConv && (
                  <div className="flex flex-col gap-4">
                    {Array.isArray(
                      selectedConv.messages || selectedConv.mensajes,
                    ) &&
                    (selectedConv.messages || selectedConv.mensajes).length >
                      0 ? (
                      (selectedConv.messages || selectedConv.mensajes).map(
                        (m: any, idx: number) => {
                          const senderTipo =
                            m.participante_tipo || m.tipo || m.type || "";
                          const senderId =
                            m.id_equipo ??
                            m.id_cliente ??
                            m.id_admin ??
                            m.id_usuario ??
                            m.id_participante_emisor ??
                            null;
                          const senderName = resolveName(senderTipo, senderId);
                          const isMe =
                            String(senderTipo || "").toLowerCase() ===
                              "equipo" || String(senderId) === String(codigo);
                          return (
                            <div
                              key={m.id_mensaje ?? m.id ?? idx}
                              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[75%] p-3 rounded-lg shadow-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-900"}`}
                              >
                                <div className="text-xs text-muted-foreground mb-1">
                                  {!isMe && <strong>{senderName}</strong>}{" "}
                                  <span className="ml-2 text-[11px]">
                                    {formatMsgTimestamp(m)}
                                  </span>
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {getMessageText(m)}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No hay mensajes disponibles.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
