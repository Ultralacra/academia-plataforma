"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import { CHAT_HOST } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";

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

function formatMsgTimestamp(ts: any) {
  const t = ts ? Date.parse(String(ts)) : NaN;
  if (!isFinite(t)) return "-";
  return new Date(t).toLocaleString();
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

export default function ChatViewPage({
  params,
}: {
  params: { codigo: string; chat: string };
}) {
  const { codigo, chat } = params;
  const [loading, setLoading] = useState(true);
  const [conv, setConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      let s: any = null;
      try {
        // Intentar cargar conv desde sessionStorage como fallback si la navegación pasó datos
        try {
          const stored =
            typeof window !== "undefined"
              ? sessionStorage.getItem(`admin_chat_conv_${String(chat)}`)
              : null;
          if (stored) {
            const parsed = JSON.parse(stored);
            if (mounted && parsed) {
              setConv(parsed);
              setMessages(
                Array.isArray(parsed.messages || parsed.mensajes)
                  ? parsed.messages || parsed.mensajes
                  : [],
              );
            }
          }
        } catch (e) {}
        const token = getAuthToken();
        s = io(CHAT_HOST, {
          auth: token ? { token } : undefined,
          transports: ["websocket", "polling"],
          reconnection: false,
        });
        const res: any = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 8000);
          s.on("connect", () => {
            try {
              s.emit("chat.join", { id_chat: String(chat) }, (ack: any) => {
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
        if (!mounted) return;
        if (!res) {
          // si no hay respuesta del socket, mantener lo que haya en sessionStorage (si existía)
          if (!conv) {
            setConv(null);
            setMessages([]);
          }
        } else {
          setConv(res);
          setMessages(
            Array.isArray(res.messages || res.mensajes)
              ? res.messages || res.mensajes
              : [],
          );
        }
      } catch (e) {
        if (mounted) {
          setConv(null);
          setMessages([]);
        }
      } finally {
        try {
          if (s) s.disconnect();
        } catch {}
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [chat]);

  // Construir mapa de participantes y conteos a partir de conv y messages
  const participantsList = (() => {
    try {
      const map: Record<string, any> = {};

      const push = (key: string, data: any) => {
        if (!key) return;
        if (!map[key]) map[key] = { count: 0, key, ...data };
        else map[key] = { ...map[key], ...data };
      };

      // Helper para extraer nombre/tipo/id de un objeto participante
      const normalizeFromObj = (p: any) => {
        if (!p) return null;
        const id =
          p.id ??
          p.participante_id ??
          p.usuario_id ??
          p.uid ??
          p.email ??
          p.nick ??
          p.username;
        const name =
          p.nombre_participante ||
          p.participante_emisor_nombre ||
          p.participante_nombre ||
          p.nombre ||
          p.name ||
          p.displayName ||
          p.usuario ||
          p.email ||
          p.nick ||
          p.username ||
          (id ? String(id) : undefined);
        const tipo = String(
          p.participante_tipo || p.tipo || p.type || "",
        ).toLowerCase();
        return { id: id ? String(id) : undefined, name, tipo };
      };

      // Extraer participantes desde conv (varias formas posibles)
      const rawParts: any[] = Array.isArray(conv?.otros_participantes)
        ? conv.otros_participantes
        : Array.isArray(conv?.participants)
          ? conv.participants
          : conv?.participants && typeof conv.participants === "object"
            ? Object.values(conv.participants)
            : [];

      for (const p of rawParts) {
        const n = normalizeFromObj(p);
        const key = n?.id ?? n?.name ?? JSON.stringify(p);
        push(key, { name: n?.name, tipo: n?.tipo, id: n?.id });
      }

      // Contar y completar participantes a partir de los mensajes
      for (const m of messages || []) {
        const possibleIds = [
          m.participante_id,
          m.participante_emisor_id,
          m.emisor_id,
          m.from_id,
          m.usuario_id,
          m.id_participante,
          m.sender_id,
        ];
        const possibleNames = [
          m.participante_nombre,
          m.participante_emisor_nombre,
          m.nombre_participante,
          m.sender,
          m.nombre,
          m.name,
        ];
        const id = possibleIds.find((x) => x !== undefined && x !== null);
        const name = possibleNames.find((x) => x !== undefined && x !== null);
        const tipo = m.participante_tipo || m.tipo || m.type || "";
        const key = id
          ? String(id)
          : name
            ? String(name)
            : JSON.stringify(m?.emisor || m?.sender || m?.usuario || {});
        push(key, {
          name: name ?? undefined,
          tipo: String(tipo).toLowerCase(),
          id: id ? String(id) : undefined,
        });
        if (map[key]) map[key].count = (map[key].count || 0) + 1;
      }

      // Si no hay participantes y hay mensajes, crear entradas por mensaje remitente
      if (Object.keys(map).length === 0 && (messages || []).length > 0) {
        for (const m of messages) {
          const key =
            m.participante_nombre ||
            m.sender ||
            m.nombre ||
            m.participante_emisor_nombre ||
            m.participante_id ||
            m.participante_emisor_id ||
            JSON.stringify(m);
          const k = key
            ? String(key)
            : `msg-${Math.random().toString(36).slice(2, 8)}`;
          push(k, { name: String(key || k) });
          map[k].count = (map[k].count || 0) + 1;
        }
      }

      // Convertir a lista ordenada por conteo descendente
      return Object.keys(map)
        .map((k) => ({ key: k, ...map[k] }))
        .sort((a, b) => (b.count || 0) - (a.count || 0));
    } catch (e) {
      return [];
    }
  })();

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Conversación: {chat}</h2>
              <div className="text-sm text-muted-foreground">
                Usuario: {codigo}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/metrics/chat/user/${encodeURIComponent(String(codigo))}`}
              >
                <Button variant="ghost">Volver</Button>
              </Link>
            </div>
          </div>

          {loading && (
            <div className="text-sm text-gray-500">
              Cargando conversación...
            </div>
          )}
          {!loading && !conv && (
            <div className="text-sm text-gray-500">
              No se encontró la conversación.
            </div>
          )}

          {conv && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">Participantes</div>
                      <div className="text-sm text-muted-foreground">
                        {Array.isArray(conv.otros_participantes)
                          ? conv.otros_participantes.length
                          : Array.isArray(conv.participants)
                            ? conv.participants.length
                            : conv.participants &&
                                typeof conv.participants === "object"
                              ? Object.keys(conv.participants).length
                              : 0}{" "}
                        participantes
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Creado: {conv.fecha_creacion || conv.created_at || "-"}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[60vh] overflow-auto p-2">
                    {messages.map((m: any, idx: number) => {
                      const senderTipo =
                        m.participante_tipo || m.tipo || m.type || "";
                      const senderName =
                        m.participante_nombre ||
                        m.participante_emisor_nombre ||
                        m.nombre_participante ||
                        m.sender ||
                        "-";
                      const isMe =
                        String(senderTipo).toLowerCase() === "equipo";
                      return (
                        <div
                          key={m.id_mensaje ?? m.id ?? idx}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] p-3 rounded-lg shadow ${isMe ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-900"}`}
                          >
                            <div className="text-xs text-muted-foreground mb-1">
                              {!isMe && <strong>{senderName}</strong>}{" "}
                              <span className="ml-2 text-[11px]">
                                {formatMsgTimestamp(
                                  m.fecha_envio ||
                                    m.fecha_envio_local ||
                                    m.created_at ||
                                    m.fecha,
                                )}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap">
                              {getMessageText(m.contenido ?? m)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="col-span-1">
                <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                  <h3 className="text-lg font-medium">Resumen</h3>
                  <div className="mt-2 text-sm text-muted-foreground">
                    ID: {conv.id_chat ?? conv.id}
                  </div>
                  <div className="mt-2 text-sm">
                    Mensajes: {messages.length}
                  </div>
                  <div className="mt-2 text-sm">
                    Sin leer: {conv.unread ?? 0}
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium">Participantes</div>
                    <div className="mt-2 space-y-2">
                      {participantsList.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No hay participantes registrados.
                        </div>
                      )}
                      {participantsList.map((p: any) => (
                        <div key={p.key} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                            {initials(
                              p.name || String(p.id || p.key).slice(0, 2),
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {p.name || "-"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.tipo || "-"}
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            {p.count ?? 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
