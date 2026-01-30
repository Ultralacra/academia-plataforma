"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchUsers, type SysUser } from "@/app/admin/users/api";
import { Button } from "@/components/ui/button";
import { io } from "socket.io-client";
import { CHAT_HOST } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { getCoaches } from "@/app/admin/teamsv2/api";
import { getClients } from "@/lib/data-service";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MetricsChatPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SysUser[]>([]);
  const [search, setSearch] = useState("");
  const [coachMap, setCoachMap] = useState<Record<string, string>>({});
  const [clientMap, setClientMap] = useState<Record<string, string>>({});

  async function loadUsers(q = "") {
    try {
      setLoading(true);
      const res = await fetchUsers({ page: 1, pageSize: 200, search: q });
      // Filtrar solo tipo === 'equipo'
      const equipos = (res.data || []).filter(
        (u) => String(u.tipo || "").toLowerCase() === "equipo",
      );
      setUsers(equipos);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    (async () => {
      try {
        const coaches = await getCoaches({ page: 1, pageSize: 10000 });
        const cMap: Record<string, string> = {};
        coaches.forEach((c) => {
          try {
            if (c.codigo) cMap[String(c.codigo)] = c.nombre || String(c.codigo);
            else if (c.id != null)
              cMap[String(c.id)] = c.nombre || String(c.id);
          } catch {}
        });
        setCoachMap(cMap);
      } catch (e) {
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
      } catch (e) {
        setClientMap({});
      }
    })();
  }, []);

  const resolveName = (tipo: string | undefined, id: any) => {
    try {
      const t = String(tipo || "").toLowerCase();
      const sid = String(id ?? "").trim();
      if (!sid) return "-";
      if (t === "equipo" || t === "coach") return coachMap[sid] ?? sid;
      if (t === "cliente" || t === "alumno") return clientMap[sid] ?? sid;
      // fallback: try users list
      const u = users.find(
        (x) => String(x.codigo) === sid || String(x.id) === sid,
      );
      if (u) return u.name || sid;
      return sid;
    } catch {
      return String(id ?? "");
    }
  };

  async function fetchConversationsForUser(codigo: string | null) {
    if (!codigo) return [];
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
      return list;
    } catch (e) {
      return [];
    } finally {
      try {
        if (socket) socket.disconnect();
      } catch {}
    }
  }

  async function probeJoinTemp(idChat: string, token: string | null) {
    let s: any = null;
    try {
      s = io(CHAT_HOST, {
        auth: token ? { token } : undefined,
        transports: ["websocket", "polling"],
        reconnection: false,
      });
      const res: any = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 7000);
        s.on("connect", () => {
          try {
            s.emit("chat.join", { id_chat: idChat }, (ack: any) => {
              clearTimeout(timer);
              try {
                resolve(ack?.data ?? null);
              } catch {
                resolve(null);
              }
            });
          } catch {
            clearTimeout(timer);
            resolve(null);
          }
        });
        s.on("connect_error", () => {
          clearTimeout(timer);
          resolve(null);
        });
      });
      return res;
    } catch {
      return null;
    } finally {
      try {
        if (s) s.disconnect();
      } catch {}
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Métricas Chat</h1>
            <p className="text-sm text-muted-foreground">
              Consulta de usuarios (solo tipo <strong>equipo</strong>). Solo
              lectura.
            </p>
          </div>

          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <Input
                className="flex-1"
                placeholder="Buscar por nombre, email o código"
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
              />
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button onClick={() => loadUsers(search)} disabled={loading}>
                  {loading ? "Cargando..." : "Buscar"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  resolveName={resolveName}
                  onView={fetchConversationsForUser}
                />
              ))}
              {!loading && users.length === 0 && (
                <div className="col-span-full text-center py-12 text-sm text-gray-500">
                  No se encontraron usuarios tipo equipo.
                </div>
              )}
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function UserRow({
  user,
  resolveName,
  onView,
}: {
  user: SysUser;
  resolveName: (tipo: string | undefined, id: any) => string;
  onView: (codigo: string | null) => Promise<any[]>;
}) {
  const router = useRouter();

  const handleView = async () => {
    try {
      const list = await onView(user.codigo ?? null);
      console.log("Conversaciones de:", user.codigo ?? user.id, list);
    } catch (e) {
      console.error("Error fetching conversations", e);
    }
    router.push(
      `/admin/metrics/chat/user/${encodeURIComponent(String(user.codigo ?? user.id ?? ""))}`,
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{user.name ?? "-"}</div>
          <div className="text-xs text-muted-foreground">
            {user.email ?? "-"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-xs">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary/10 text-primary">
              {user.role ?? user.tipo ?? "-"}
            </span>
          </div>
          <Button size="sm" variant="default" onClick={handleView}>
            Ver conversaciones
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConversationRow({
  conv,
  probeJoinTemp,
  resolveName,
}: {
  conv: any;
  probeJoinTemp: (id: string, token: string | null) => Promise<any>;
  resolveName: (tipo: string | undefined, id: any) => string;
}) {
  const [open, setOpen] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState<any[] | null>(null);

  const token = getAuthToken();

  const ensureMessages = async () => {
    if (messages != null) return;
    setLoadingMsgs(true);
    try {
      if (Array.isArray(conv.messages) && conv.messages.length > 0) {
        setMessages(conv.messages);
        return;
      }
      // Intentar obtener mensajes vía probeJoinTemp
      const data = await probeJoinTemp(String(conv.id_chat ?? conv.id), token);
      const msgs = data ? data.messages || data.mensajes || [] : [];
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e) {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const onToggle = async () => {
    if (!open) await ensureMessages();
    setOpen((s) => !s);
  };

  return (
    <div className="mb-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium">
            {getMessageText(conv.last_message)}
          </div>
          <div className="text-xs text-muted-foreground">
            {String(
              conv.last_message_at ||
                conv.fecha_ultimo_mensaje ||
                conv.updated_at ||
                conv.created_at ||
                "-",
            )}
          </div>
          <div className="mt-2 text-sm">
            {Array.isArray(conv.participants || conv.participantes) ? (
              <div className="flex flex-wrap gap-2">
                {(conv.participants || conv.participantes).map(
                  (p: any, i: number) => {
                    const tipo = p.participante_tipo || p.tipo || p.type || "";
                    const id =
                      p.id_equipo ??
                      p.id_cliente ??
                      p.id_admin ??
                      p.id_usuario ??
                      p.id_participante ??
                      "";
                    const name = resolveName(tipo, id);
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 px-2 py-1 bg-white/60 rounded text-xs"
                      >
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium">
                          {initials(name)}
                        </span>
                        <span className="font-medium">{name}</span>
                      </span>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {String(conv.otros_participantes || "-")}
              </div>
            )}
          </div>
        </div>
        <div>
          <Button size="sm" onClick={onToggle} disabled={loadingMsgs}>
            {loadingMsgs
              ? "Cargando..."
              : open
                ? "Ocultar mensajes"
                : "Ver mensajes"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3">
          <h4 className="text-sm font-medium">
            Mensajes ({messages?.length ?? 0})
          </h4>
          {loadingMsgs && (
            <div className="text-sm text-gray-500">Cargando mensajes...</div>
          )}
          {!loadingMsgs && messages && messages.length === 0 && (
            <div className="text-sm text-gray-500">
              No hay mensajes disponibles.
            </div>
          )}
          {!loadingMsgs && messages && messages.length > 0 && (
            <div className="mt-2">
              <ul className="text-sm space-y-3 max-h-64 overflow-auto">
                {messages.map((m: any, idx: number) => {
                  const senderTipo =
                    m.participante_tipo || m.tipo || m.type || "";
                  const senderId =
                    m.id_equipo ??
                    m.id_cliente ??
                    m.id_admin ??
                    m.id_usuario ??
                    m.id_participante_emisor ??
                    m.id_chat_participante_emisor ??
                    null;
                  const senderName = resolveName(senderTipo, senderId);
                  const content = getMessageText(m);
                  return (
                    <li
                      key={m.id_mensaje ?? m.id ?? idx}
                      className="flex gap-3 items-start"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {initials(senderName)}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">
                          {senderName} · {formatMsgTimestamp(m)}
                        </div>
                        <div className="mt-1 p-3 bg-white rounded-lg shadow-sm text-sm whitespace-pre-wrap">
                          {content}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    m?.created_at_chat ||
    m?.created_at_message ||
    null;
  const t = ts ? Date.parse(String(ts)) : NaN;
  if (!isFinite(t)) return "-";
  const d = new Date(t);
  return d.toLocaleString();
}

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
      for (const k of keys) {
        if (src[k]) return String(src[k]);
      }
      // nested message
      if (src?.contenido?.contenido) return String(src.contenido.contenido);
      // fallback: try to stringify small
      try {
        const s = JSON.stringify(src);
        return s.length > 200 ? s.slice(0, 200) + "..." : s;
      } catch {
        return String(src);
      }
    }
    return String(src);
  } catch {
    return String(src ?? "-");
  }
}

function formatMsgPreview(m: any) {
  try {
    const txt = getMessageText(
      m.mensaje ? { mensaje: m.mensaje } : m.last_message || m,
    );
    return txt.length > 120 ? txt.slice(0, 120) + "..." : txt;
  } catch {
    return "-";
  }
}
