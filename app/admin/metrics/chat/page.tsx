"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { CHAT_HOST } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  MessageSquare,
  Send,
  Activity,
  Timer,
  Clock,
  Users,
  ExternalLink,
  Search,
  AlertCircle,
} from "lucide-react";
import { fetchUsers, type SysUser } from "@/app/admin/users/api";

// ─── Concurrencia ──────────────────────────────────────────────────────────

const USER_CONCURRENCY = 3; // usuarios procesados a la vez
const JOIN_CONCURRENCY = 3; // chats por usuario en paralelo

// ─── Usuarios objetivo ─────────────────────────────────────────────────────
// Solo se muestran las métricas de estos códigos de equipo.
const TARGET_CODES = new Set<string>([
  "18SA4S1_J4B-MPEU", // Alejandro
  "mQ2dwRX3xMzV99e3nh9eb", // Pedro
  "PKBT2jVtzKzN7TpnLZkPj", // Lizeth Tocaria
]);

const TARGET_LABELS: Record<string, string> = {
  "18SA4S1_J4B-MPEU": "Alejandro",
  mQ2dwRX3xMzV99e3nh9eb: "Pedro",
  PKBT2jVtzKzN7TpnLZkPj: "Lizeth Tocaria",
};

// ─── Tipos ──────────────────────────────────────────────────────────────────

type RawConv = Record<string, any>;
type RawMsg = Record<string, any>;

type ChatStats = {
  chatId: string;
  totalMessages: number;
  teamMessages: number;
  clientMessages: number;
  responses: number[]; // segundos (siempre > 0)
  unanswered: number;
  lastAt: string | null;
  firstAt: string | null;
};

type UserMetrics = {
  user: SysUser;
  status: "pending" | "loading" | "ok" | "error";
  error: string | null;
  chats: ChatStats[];
  totalChats: number;
  totalMessages: number;
  teamMessages: number;
  clientMessages: number;
  totalResponses: number;
  unansweredTotal: number;
  avgResponseSec: number | null;
  avgCappedSec: number | null; // promedio truncado ≤ 24h
  medianResponseSec: number | null;
  p90Sec: number | null;
  p95Sec: number | null;
  fastestResponseSec: number | null;
  slowestResponseSec: number | null;
  lastActivityAt: string | null;
};

type SortKey =
  | "name"
  | "chats"
  | "messages"
  | "responses"
  | "avg"
  | "median"
  | "lastActivity"
  | "unanswered";

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickTimestamp(m: RawMsg): string | null {
  const ts =
    m?.fecha_envio ??
    m?.fecha_envio_local ??
    m?.created_at ??
    m?.createdAt ??
    m?.fecha_creacion ??
    m?.fecha ??
    m?.timestamp ??
    null;
  if (!ts) return null;
  const t = Date.parse(String(ts));
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function pickTipo(m: RawMsg): string {
  return String(
    m?.participante_tipo ?? m?.tipo ?? m?.type ?? m?.emisor_tipo ?? "",
  ).toLowerCase();
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

const DAY = 24 * 60 * 60;
const CAP_SEC = DAY; // tope para promedio truncado: 24h

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = seconds / 60;
  if (m < 60) {
    const mins = Math.floor(m);
    const secs = Math.round((m - mins) * 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const h = m / 60;
  if (h < 24) {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  const d = h / 24;
  const days = Math.floor(d);
  const hrs = Math.round((d - days) * 24);
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diffMs = Date.now() - t;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "hace <1m";
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 30) return `hace ${day}d`;
  return new Date(t).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Socket helpers ────────────────────────────────────────────────────────

function withSocket<T>(
  token: string | null,
  task: (socket: any, resolve: (val: T) => void) => void,
  timeoutMs: number,
  defaultValue: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    let socket: any = null;
    const finish = (val: T) => {
      if (done) return;
      done = true;
      try {
        socket?.disconnect();
      } catch {}
      resolve(val);
    };
    try {
      socket = io(CHAT_HOST, {
        auth: token ? { token } : undefined,
        transports: ["websocket", "polling"],
        reconnection: false,
        timeout: timeoutMs,
      });
      const timer = setTimeout(() => finish(defaultValue), timeoutMs);
      socket.on("connect", () => {
        try {
          task(socket, (val: T) => {
            clearTimeout(timer);
            finish(val);
          });
        } catch {
          clearTimeout(timer);
          finish(defaultValue);
        }
      });
      socket.on("connect_error", () => {
        clearTimeout(timer);
        finish(defaultValue);
      });
    } catch {
      finish(defaultValue);
    }
  });
}

async function listConversations(
  token: string | null,
  code: string,
): Promise<RawConv[]> {
  return withSocket<RawConv[]>(
    token,
    (socket, resolve) => {
      socket.emit(
        "chat.list",
        {
          participante_tipo: "equipo",
          id_equipo: String(code),
          include_participants: true,
          with_participants: true,
          limit: 200,
          page_size: 200,
          pageSize: 200,
        },
        (ack: any) => {
          const list = Array.isArray(ack?.data) ? ack.data : [];
          // eslint-disable-next-line no-console
          console.log(
            `[metrics/chat] chat.list code=${code} →`,
            list.length,
            "convs",
          );
          resolve(list);
        },
      );
    },
    10000,
    [],
  );
}

async function joinChat(
  token: string | null,
  chatId: string,
): Promise<RawConv | null> {
  return withSocket<RawConv | null>(
    token,
    (socket, resolve) => {
      socket.emit("chat.join", { id_chat: chatId }, (ack: any) => {
        resolve(ack?.data ?? null);
      });
    },
    10000,
    null,
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(Math.max(1, limit), items.length || 1) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx], idx);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

// ─── Cálculo de métricas ───────────────────────────────────────────────────

function computeChatStats(chatId: string, messagesRaw: RawMsg[]): ChatStats {
  const messages = (messagesRaw || [])
    .map((m) => ({ _ts: pickTimestamp(m), _tipo: pickTipo(m) }))
    .filter((m) => m._ts)
    .sort((a, b) => Date.parse(a._ts!) - Date.parse(b._ts!));

  let teamMessages = 0;
  let clientMessages = 0;
  for (const m of messages) {
    if (m._tipo === "equipo") teamMessages++;
    else clientMessages++;
  }

  // Tiempo de respuesta = ts(equipo) - ts(ÚLTIMO cliente sin responder).
  // Si el último mensaje del chat fue del cliente sin respuesta posterior, suma 1 a "sin responder".
  const responses: number[] = [];
  let lastClientTs: string | null = null;
  let unanswered = 0;

  for (const m of messages) {
    const isTeam = m._tipo === "equipo";
    if (!isTeam) {
      lastClientTs = m._ts!; // siempre actualiza al más reciente
    } else if (lastClientTs !== null) {
      const diffSec = (Date.parse(m._ts!) - Date.parse(lastClientTs)) / 1000;
      if (Number.isFinite(diffSec) && diffSec > 0) responses.push(diffSec);
      lastClientTs = null;
    }
  }
  if (lastClientTs !== null) unanswered = 1;

  return {
    chatId,
    totalMessages: messages.length,
    teamMessages,
    clientMessages,
    responses,
    unanswered,
    lastAt: messages[messages.length - 1]?._ts ?? null,
    firstAt: messages[0]?._ts ?? null,
  };
}

function aggregateUser(user: SysUser, chats: ChatStats[]) {
  const totalChats = chats.length;
  const totalMessages = chats.reduce((a, c) => a + c.totalMessages, 0);
  const teamMessages = chats.reduce((a, c) => a + c.teamMessages, 0);
  const clientMessages = chats.reduce((a, c) => a + c.clientMessages, 0);
  const allDiffs = chats.flatMap((c) => c.responses);
  const totalResponses = allDiffs.length;
  const unansweredTotal = chats.reduce((a, c) => a + c.unanswered, 0);
  const avg =
    totalResponses > 0
      ? allDiffs.reduce((a, b) => a + b, 0) / totalResponses
      : null;
  const capped = allDiffs.filter((v) => v <= CAP_SEC);
  const avgCapped =
    capped.length > 0
      ? capped.reduce((a, b) => a + b, 0) / capped.length
      : null;
  const med = median(allDiffs);
  const p90 = percentile(allDiffs, 90);
  const p95 = percentile(allDiffs, 95);
  const fastest = totalResponses > 0 ? Math.min(...allDiffs) : null;
  const slowest = totalResponses > 0 ? Math.max(...allDiffs) : null;
  const lastActivityAt = chats.reduce<string | null>((acc, c) => {
    if (!c.lastAt) return acc;
    if (!acc) return c.lastAt;
    return Date.parse(c.lastAt) > Date.parse(acc) ? c.lastAt : acc;
  }, null);

  return {
    user,
    status: "ok" as const,
    error: null,
    chats,
    totalChats,
    totalMessages,
    teamMessages,
    clientMessages,
    totalResponses,
    unansweredTotal,
    avgResponseSec: avg,
    avgCappedSec: avgCapped,
    medianResponseSec: med,
    p90Sec: p90,
    p95Sec: p95,
    fastestResponseSec: fastest,
    slowestResponseSec: slowest,
    lastActivityAt,
  };
}

// ─── UI components ─────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-50 text-slate-700 border-slate-200",
    primary: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] opacity-70">{sub}</div>}
    </div>
  );
}

function StatusDot({ status }: { status: UserMetrics["status"] }) {
  if (status === "loading")
    return (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
    );
  if (status === "ok")
    return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />;
  if (status === "error")
    return <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  return <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />;
}

function ChatDetailTable({
  chats,
  code,
}: {
  chats: ChatStats[];
  code: string;
}) {
  const sorted = useMemo(() => {
    return [...chats].sort((a, b) => {
      const am =
        a.responses.length > 0
          ? a.responses.reduce((x, y) => x + y, 0) / a.responses.length
          : -1;
      const bm =
        b.responses.length > 0
          ? b.responses.reduce((x, y) => x + y, 0) / b.responses.length
          : -1;
      return bm - am; // peores arriba para detectar problemas
    });
  }, [chats]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-600">
        Detalle por chat ({chats.length} chats) — ordenado por promedio
        descendente
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-white border-b border-slate-200 text-slate-500">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium">Chat ID</th>
              <th className="text-right px-2 py-1.5 font-medium">Msgs</th>
              <th className="text-right px-2 py-1.5 font-medium">
                Equipo / Cliente
              </th>
              <th className="text-right px-2 py-1.5 font-medium">Resp.</th>
              <th className="text-right px-2 py-1.5 font-medium">Promedio</th>
              <th className="text-right px-2 py-1.5 font-medium">Mediana</th>
              <th className="text-right px-2 py-1.5 font-medium">Más lenta</th>
              <th className="text-right px-2 py-1.5 font-medium">Sin resp.</th>
              <th className="text-right px-2 py-1.5 font-medium">Última</th>
              <th className="text-right px-2 py-1.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const avg =
                c.responses.length > 0
                  ? c.responses.reduce((a, b) => a + b, 0) / c.responses.length
                  : null;
              const med = median(c.responses);
              const slowest =
                c.responses.length > 0 ? Math.max(...c.responses) : null;
              const isOutlier = slowest !== null && slowest > 24 * 3600;
              return (
                <tr
                  key={c.chatId}
                  className={`border-b border-slate-100 ${
                    isOutlier ? "bg-amber-50/40" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 font-mono text-[11px] text-slate-700 truncate max-w-[180px]">
                    {c.chatId}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {c.totalMessages}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">
                    {c.teamMessages} / {c.clientMessages}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {c.responses.length}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatDuration(avg)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-emerald-700">
                    {formatDuration(med)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums ${
                      isOutlier ? "text-amber-700 font-semibold" : ""
                    }`}
                  >
                    {formatDuration(slowest)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {c.unanswered > 0 ? (
                      <span className="text-amber-600">1</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-500">
                    {formatRelative(c.lastAt)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {code && c.chatId ? (
                      <Link
                        href={`/admin/metrics/chat/user/${encodeURIComponent(code)}/chat/${encodeURIComponent(c.chatId)}`}
                        className="text-blue-600 hover:underline"
                      >
                        ver
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-slate-500">
        Las filas resaltadas en ámbar tienen al menos una respuesta {">"} 24h
        que infla el promedio.
      </div>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────

export default function MetricsChatPage() {
  const [usersState, setUsersState] = useState<UserMetrics[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("avg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [windowDays, setWindowDays] = useState<string>("all"); // all | 7 | 10 | 15 | 30
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("all");

  // Cargar lista de usuarios equipo
  const loadUsers = useCallback(async (q = "") => {
    setLoadingUsers(true);
    try {
      const res = await fetchUsers({ page: 1, pageSize: 500, search: q });
      const all = res.data || [];
      const equipos = all.filter((u) => {
        const code = String(u.codigo ?? u.id ?? "").trim();
        return TARGET_CODES.has(code);
      });
      // eslint-disable-next-line no-console
      console.log(
        `[metrics/chat] fetchUsers → total=${all.length} target=${equipos.length}`,
      );
      setUsersState(
        equipos.map((u) => ({
          user: u,
          status: "pending",
          error: null,
          chats: [],
          totalChats: 0,
          totalMessages: 0,
          teamMessages: 0,
          clientMessages: 0,
          totalResponses: 0,
          unansweredTotal: 0,
          avgResponseSec: null,
          avgCappedSec: null,
          medianResponseSec: null,
          p90Sec: null,
          p95Sec: null,
          fastestResponseSec: null,
          slowestResponseSec: null,
          lastActivityAt: null,
        })),
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[metrics/chat] fetchUsers error", e);
      setUsersState([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Procesar métricas para todos los usuarios
  const analyzeAll = useCallback(async () => {
    setAnalyzing(true);
    const token = getAuthToken();
    const targets = usersState.map((u) => u.user);
    setProgress({ done: 0, total: targets.length });

    // Marcar todos como loading
    setUsersState((prev) =>
      prev.map((u) => ({ ...u, status: "loading", error: null })),
    );

    let completed = 0;
    await mapWithConcurrency(targets, USER_CONCURRENCY, async (user) => {
      const code = String(user.codigo ?? user.id ?? "").trim();
      if (!code) {
        setUsersState((prev) =>
          prev.map((u) =>
            u.user.id === user.id
              ? { ...u, status: "error", error: "Sin código" }
              : u,
          ),
        );
        completed++;
        setProgress({ done: completed, total: targets.length });
        return;
      }

      try {
        const convs = await listConversations(token, code);
        const chatItems = convs
          .map((c) => String(c?.id_chat ?? c?.id ?? "").trim())
          .filter(Boolean);

        const stats = await mapWithConcurrency(
          chatItems,
          JOIN_CONCURRENCY,
          async (chatId) => {
            const joined = await joinChat(token, chatId);
            const messages: RawMsg[] = Array.isArray(
              joined?.messages ?? joined?.mensajes,
            )
              ? (joined?.messages ?? joined?.mensajes)
              : [];
            return computeChatStats(chatId, messages);
          },
        );

        const agg = aggregateUser(user, stats);
        setUsersState((prev) =>
          prev.map((u) => (u.user.id === user.id ? { ...u, ...agg } : u)),
        );
      } catch (e: any) {
        setUsersState((prev) =>
          prev.map((u) =>
            u.user.id === user.id
              ? { ...u, status: "error", error: "Error de carga" }
              : u,
          ),
        );
      } finally {
        completed++;
        setProgress({ done: completed, total: targets.length });
      }
    });

    setAnalyzing(false);
  }, [usersState]);

  // Carga inicial
  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Cuando se cargan los usuarios y aún no hemos analizado, lanzar análisis
  const usersStateLength = usersState.length;
  useEffect(() => {
    if (usersStateLength === 0) return;
    const allPending = usersState.every((u) => u.status === "pending");
    if (allPending && !analyzing) {
      void analyzeAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersStateLength]);

  // Aplicar ventana temporal (filtra los chats con actividad en la ventana
  // y recalcula métricas por usuario sólo con esos chats).
  const filteredUsers = useMemo<UserMetrics[]>(() => {
    // 1) Filtrar usuarios por selector
    const byUser =
      selectedCode === "all"
        ? usersState
        : usersState.filter(
            (u) =>
              String(u.user.codigo ?? u.user.id ?? "").trim() === selectedCode,
          );

    // 2) Aplicar ventana temporal (recalcula métricas con sólo los chats que entran)
    const days = windowDays === "all" ? null : Number(windowDays);
    if (!days) return byUser;
    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
    return byUser.map((u) => {
      if (u.status !== "ok") return u;
      const filtered = u.chats.filter((c) => {
        if (!c.lastAt) return false;
        const t = Date.parse(c.lastAt);
        return Number.isFinite(t) && t >= cutoffMs;
      });
      const agg = aggregateUser(u.user, filtered);
      return { ...u, ...agg };
    });
  }, [usersState, windowDays, selectedCode]);

  // Métricas globales
  const global = useMemo(() => {
    const ready = filteredUsers.filter((u) => u.status === "ok");
    const totalUsers = filteredUsers.length;
    const usersWithChats = ready.filter((u) => u.totalChats > 0).length;
    const totalChats = ready.reduce((a, u) => a + u.totalChats, 0);
    const totalMessages = ready.reduce((a, u) => a + u.totalMessages, 0);
    const totalResponses = ready.reduce((a, u) => a + u.totalResponses, 0);
    const unansweredTotal = ready.reduce((a, u) => a + u.unansweredTotal, 0);

    // Para evitar dobles ponderaciones y outliers, calculamos sobre TODAS las
    // diferencias individuales de TODOS los chats de los usuarios.
    const allDiffs = ready.flatMap((u) => u.chats.flatMap((c) => c.responses));
    const avg =
      allDiffs.length > 0
        ? allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length
        : null;
    const capped = allDiffs.filter((v) => v <= CAP_SEC);
    const avgCapped =
      capped.length > 0
        ? capped.reduce((a, b) => a + b, 0) / capped.length
        : null;
    const med = median(allDiffs);
    const p90 = percentile(allDiffs, 90);
    const p95 = percentile(allDiffs, 95);
    const fastest = allDiffs.length > 0 ? Math.min(...allDiffs) : null;
    const slowest = allDiffs.length > 0 ? Math.max(...allDiffs) : null;

    return {
      totalUsers,
      usersWithChats,
      totalChats,
      totalMessages,
      totalResponses,
      unansweredTotal,
      avg,
      avgCapped,
      med,
      p90,
      p95,
      fastest,
      slowest,
      cappedShare: allDiffs.length > 0 ? capped.length / allDiffs.length : null,
    };
  }, [filteredUsers]);

  // Filtrar y ordenar
  const visibleUsers = useMemo(() => {
    const f = filterText.trim().toLowerCase();
    let arr = filteredUsers.filter((u) => {
      if (activeOnly && u.totalChats === 0) return false;
      if (!f) return true;
      return [u.user.name, u.user.email, u.user.codigo, u.user.area]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(f));
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const cmpNum = (a: number | null, b: number | null) => {
      const av = a ?? Number.POSITIVE_INFINITY;
      const bv = b ?? Number.POSITIVE_INFINITY;
      return (av - bv) * dir;
    };
    const cmpStr = (a: string, b: string) => a.localeCompare(b) * dir;

    arr = [...arr].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return cmpStr(a.user.name ?? "", b.user.name ?? "");
        case "chats":
          return (a.totalChats - b.totalChats) * dir;
        case "messages":
          return (a.totalMessages - b.totalMessages) * dir;
        case "responses":
          return (a.totalResponses - b.totalResponses) * dir;
        case "unanswered":
          return (a.unansweredTotal - b.unansweredTotal) * dir;
        case "avg":
          return cmpNum(a.avgCappedSec, b.avgCappedSec);
        case "median":
          return cmpNum(a.medianResponseSec, b.medianResponseSec);
        case "lastActivity": {
          const av = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
          const bv = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
          return (av - bv) * dir;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredUsers, filterText, sortKey, sortDir, activeOnly]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Métricas Chat
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Métricas agregadas por usuario de equipo. Tiempos de respuesta
                calculados desde el primer mensaje del cliente hasta la primera
                respuesta del equipo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {loadingUsers
                  ? "Cargando usuarios…"
                  : `${usersState.length} usuarios equipo`}
              </span>
              {analyzing && (
                <span className="text-xs text-blue-600 font-medium">
                  · Analizando {progress.done}/{progress.total}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void analyzeAll()}
                disabled={analyzing || loadingUsers || usersState.length === 0}
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Analizar todos
              </Button>
            </div>
          </div>

          {/* Resumen global */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-semibold">Resumen general</div>
              {selectedCode !== "all" && (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px]"
                >
                  Usuario: {TARGET_LABELS[selectedCode] ?? selectedCode}
                </Badge>
              )}
              {windowDays !== "all" && (
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-50 text-blue-700 text-[11px]"
                >
                  Ventana: últimos {windowDays} días
                </Badge>
              )}
              <span className="text-[11px] text-slate-500">
                · Tiempo = ts(equipo) − ts(último mensaje cliente sin responder)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <StatTile
                label="Usuarios equipo"
                value={String(global.totalUsers)}
                sub={`${global.usersWithChats} con chats`}
                icon={Users}
                tone="primary"
              />
              <StatTile
                label="Chats / Mensajes"
                value={`${global.totalChats} / ${global.totalMessages}`}
                icon={MessageSquare}
              />
              <StatTile
                label="Respuestas"
                value={String(global.totalResponses)}
                sub={
                  global.unansweredTotal > 0
                    ? `${global.unansweredTotal} sin responder`
                    : "todas respondidas"
                }
                icon={Send}
                tone={global.unansweredTotal > 0 ? "warning" : "success"}
              />
              <StatTile
                label="Mediana (p50)"
                value={formatDuration(global.med)}
                sub="referencia recomendada"
                icon={Clock}
                tone="success"
              />
              <StatTile
                label="Promedio ≤ 24h"
                value={formatDuration(global.avgCapped)}
                sub={
                  global.cappedShare !== null
                    ? `${(global.cappedShare * 100).toFixed(0)}% de respuestas`
                    : undefined
                }
                icon={Timer}
                tone="success"
              />
              <StatTile
                label="Promedio bruto"
                value={formatDuration(global.avg)}
                sub="incluye outliers"
                icon={Timer}
                tone="warning"
              />
              <StatTile
                label="p90 / p95"
                value={`${formatDuration(global.p90)} / ${formatDuration(global.p95)}`}
                sub="90% y 95% de respuestas dentro de"
                icon={Timer}
              />
              <StatTile
                label="Más rápida / lenta"
                value={`${formatDuration(global.fastest)} / ${formatDuration(global.slowest)}`}
                icon={Activity}
                tone={
                  global.slowest !== null && global.slowest > 7 * DAY
                    ? "danger"
                    : "default"
                }
              />
            </div>
          </Card>

          {/* Buscador / filtros / orden */}
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  className="pl-8"
                  placeholder="Filtrar usuarios cargados (nombre, email, código, área)…"
                  value={filterText}
                  onChange={(e: any) => setFilterText(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={selectedCode} onValueChange={setSelectedCode}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {Array.from(TARGET_CODES).map((c) => (
                      <SelectItem key={c} value={c}>
                        {TARGET_LABELS[c] ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={windowDays} onValueChange={setWindowDays}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Ventana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el histórico</SelectItem>
                    <SelectItem value="7">Últimos 7 días</SelectItem>
                    <SelectItem value="10">Últimos 10 días</SelectItem>
                    <SelectItem value="15">Últimos 15 días</SelectItem>
                    <SelectItem value="30">Últimos 30 días</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={activeOnly}
                    onChange={(e) => setActiveOnly(e.target.checked)}
                  />
                  Solo activos
                </label>
                <Input
                  className="w-56"
                  placeholder="Buscar más usuarios"
                  value={search}
                  onChange={(e: any) => setSearch(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") void loadUsers(search);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadUsers(search)}
                  disabled={loadingUsers}
                >
                  {loadingUsers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Buscar"
                  )}
                </Button>
                <Select
                  value={sortKey}
                  onValueChange={(v) => setSortKey(v as SortKey)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avg">Promedio (≤ 24h)</SelectItem>
                    <SelectItem value="median">Tiempo mediana</SelectItem>
                    <SelectItem value="responses">Respuestas</SelectItem>
                    <SelectItem value="unanswered">Sin responder</SelectItem>
                    <SelectItem value="messages">Mensajes</SelectItem>
                    <SelectItem value="chats">Chats</SelectItem>
                    <SelectItem value="lastActivity">
                      Última actividad
                    </SelectItem>
                    <SelectItem value="name">Nombre</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                  }
                >
                  {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Tabla de usuarios */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-8"></th>
                    <th className="text-left px-3 py-2 font-medium">Usuario</th>
                    <th className="text-right px-3 py-2 font-medium">Chats</th>
                    <th className="text-right px-3 py-2 font-medium">
                      Mensajes
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Respuestas
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Mediana
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Prom ≤ 24h
                    </th>
                    <th
                      className="text-right px-3 py-2 font-medium"
                      title="90% de respuestas dentro de"
                    >
                      p90
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Más lenta
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Sin resp.
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Última act.
                    </th>
                    <th className="text-right px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => {
                    const code = u.user.codigo ?? u.user.id;
                    const expanded = expandedUserId === u.user.id;
                    return (
                      <Fragment key={u.user.id}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/60">
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              disabled={
                                u.status !== "ok" || u.chats.length === 0
                              }
                              onClick={() =>
                                setExpandedUserId((prev) =>
                                  prev === u.user.id ? null : u.user.id,
                                )
                              }
                              title="Ver detalle por chat"
                            >
                              {expanded ? "▾" : "▸"}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-start gap-2">
                              <div className="pt-1">
                                <StatusDot status={u.status} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-800 truncate">
                                  {u.user.name ?? "—"}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {u.user.email ?? "—"}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">
                                  {u.user.codigo ?? u.user.id}
                                  {u.user.area ? ` · ${u.user.area}` : ""}
                                </div>
                                {u.error && (
                                  <div className="text-[11px] text-red-500 mt-0.5">
                                    {u.error}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {u.status === "ok" ? u.totalChats : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {u.status === "ok" ? (
                              <div>
                                <div>{u.totalMessages}</div>
                                <div className="text-[11px] text-slate-400">
                                  {u.teamMessages}↗ / {u.clientMessages}↘
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {u.status === "ok" ? u.totalResponses : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                            {formatDuration(u.medianResponseSec)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatDuration(u.avgCappedSec)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                            {formatDuration(u.p90Sec)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs text-amber-600">
                            {formatDuration(u.slowestResponseSec)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {u.status === "ok" ? (
                              u.unansweredTotal > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 text-amber-700 bg-amber-50"
                                >
                                  {u.unansweredTotal}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                            {formatRelative(u.lastActivityAt)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Link
                              href={`/admin/metrics/chat/user/${encodeURIComponent(String(code ?? ""))}`}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              Ver
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-slate-50/60 border-b border-slate-200">
                            <td colSpan={12} className="px-4 py-3">
                              <ChatDetailTable
                                chats={u.chats}
                                code={String(code ?? "")}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {visibleUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center text-sm text-slate-500 py-10"
                      >
                        {loadingUsers
                          ? "Cargando usuarios…"
                          : "No hay usuarios para mostrar."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Cómo se calculan los tiempos:</strong> se itera cada chat
              en orden cronológico. Cuando llega un mensaje del equipo, se mide
              la diferencia contra el <em>último</em> mensaje del cliente sin
              responder. Si entre medias el cliente escribió varios mensajes, se
              usa siempre el más reciente para reflejar el tiempo real de
              reacción del equipo.
            </p>
            <p>
              <strong>Métricas disponibles:</strong> la <em>mediana</em> es la
              referencia recomendada porque ignora outliers. El{" "}
              <em>promedio ≤ 24h</em> excluye respuestas tardías (chats
              abandonados, vacaciones, etc.). El <em>promedio bruto</em> incluye
              todos los datos —si difiere mucho del truncado significa que
              existen outliers extremos: expandí cada usuario para verlos.
            </p>
            <p>
              <strong>Sin responder:</strong> chats donde el último mensaje es
              del cliente y el equipo aún no respondió.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
