"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { CHAT_HOST } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  MessageSquare,
  Clock,
  Send,
  Users,
  Activity,
  Timer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Constantes ────────────────────────────────────────────────────────────

const TARGET_CODES = [
  "18SA4S1_J4B-MPEU",
  "PKBT2jVtzKzN7TpnLZkPj",
  "mQ2dwRX3xMzV99e3nh9eb",
] as const;

// Concurrencia para el join de chats (uno por uno por chat para no saturar)
const JOIN_CONCURRENCY = 3;

// ─── Tipos ──────────────────────────────────────────────────────────────────

type RawConv = Record<string, any>;
type RawMsg = Record<string, any>;

type ResponseSample = {
  chatId: string;
  fromAt: string; // mensaje del cliente (ISO)
  toAt: string; // respuesta del equipo (ISO)
  diffSec: number;
};

type ChatMetrics = {
  chatId: string;
  title: string;
  totalMessages: number;
  teamMessages: number;
  clientMessages: number;
  firstAt: string | null;
  lastAt: string | null;
  responses: ResponseSample[];
  avgResponseSec: number | null;
  medianResponseSec: number | null;
  unanswered: number; // mensajes del cliente sin respuesta posterior del equipo
  participants: { name: string; tipo: string }[];
};

type UserMetrics = {
  code: string;
  loading: boolean;
  error: string | null;
  totalChats: number;
  totalMessages: number;
  teamMessages: number;
  clientMessages: number;
  totalResponses: number;
  avgResponseSec: number | null;
  medianResponseSec: number | null;
  fastestResponseSec: number | null;
  slowestResponseSec: number | null;
  unansweredTotal: number;
  chats: ChatMetrics[];
};

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

function pickSenderName(m: RawMsg): string {
  return (
    m?.participante_nombre ??
    m?.participante_emisor_nombre ??
    m?.nombre_participante ??
    m?.sender ??
    m?.nombre ??
    m?.name ??
    "-"
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getChatTitle(conv: RawConv): string {
  return (
    conv?.titulo ??
    conv?.title ??
    conv?.nombre ??
    conv?.name ??
    `Chat ${String(conv?.id_chat ?? conv?.id ?? "").slice(0, 8)}`
  );
}

// ─── Socket helpers ────────────────────────────────────────────────────────

function withSocket<T>(
  token: string | null,
  task: (socket: any, resolve: (val: T) => void) => void,
  timeoutMs = 12000,
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
      } catch {
        // ignore
      }
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
        },
        (ack: any) => {
          resolve(Array.isArray(ack?.data) ? ack.data : []);
        },
      );
    },
    12000,
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
    12000,
    null,
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
  onItemDone?: (idx: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  const runners = Array.from(
    { length: Math.min(Math.max(1, limit), items.length || 1) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx], idx);
        completed++;
        onItemDone?.(completed, items.length);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

// ─── Cálculo de métricas ───────────────────────────────────────────────────

function computeChatMetrics(
  chatId: string,
  conv: RawConv | null,
  messagesRaw: RawMsg[],
): ChatMetrics {
  // Ordenar mensajes por timestamp ascendente
  const messages = [...(messagesRaw || [])]
    .map((m) => ({ ...m, _ts: pickTimestamp(m), _tipo: pickTipo(m) }))
    .filter((m) => m._ts)
    .sort((a, b) => Date.parse(a._ts!) - Date.parse(b._ts!));

  const totalMessages = messages.length;
  let teamMessages = 0;
  let clientMessages = 0;
  for (const m of messages) {
    if (m._tipo === "equipo") teamMessages++;
    else clientMessages++;
  }

  // Calcular tiempos de respuesta:
  // Cada vez que un mensaje del cliente es seguido (más adelante, no inmediato)
  // por un mensaje del equipo, registramos el delta entre el PRIMER mensaje
  // del cliente de esa "ráfaga" y el PRIMER mensaje del equipo posterior.
  const responses: ResponseSample[] = [];
  let pendingClientStart: string | null = null;
  let unanswered = 0;

  for (const m of messages) {
    const isTeam = m._tipo === "equipo";
    if (!isTeam) {
      if (pendingClientStart === null) pendingClientStart = m._ts!;
    } else {
      if (pendingClientStart !== null) {
        const diffSec =
          (Date.parse(m._ts!) - Date.parse(pendingClientStart)) / 1000;
        if (Number.isFinite(diffSec) && diffSec >= 0) {
          responses.push({
            chatId,
            fromAt: pendingClientStart,
            toAt: m._ts!,
            diffSec,
          });
        }
        pendingClientStart = null;
      }
    }
  }
  // Si quedó un mensaje del cliente sin respuesta posterior del equipo
  if (pendingClientStart !== null) unanswered = 1;

  const diffs = responses.map((r) => r.diffSec);
  const avg =
    diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
  const med = median(diffs);

  // Participantes (de conv si están)
  const participants: { name: string; tipo: string }[] = [];
  const seen = new Set<string>();
  const rawParts: any[] = Array.isArray(conv?.otros_participantes)
    ? conv?.otros_participantes
    : Array.isArray(conv?.participants)
      ? conv?.participants
      : conv?.participants && typeof conv?.participants === "object"
        ? Object.values(conv?.participants ?? {})
        : [];
  for (const p of rawParts) {
    const name =
      p?.nombre_participante ??
      p?.participante_emisor_nombre ??
      p?.participante_nombre ??
      p?.nombre ??
      p?.name ??
      "-";
    const tipo = String(p?.participante_tipo ?? p?.tipo ?? "").toLowerCase();
    const key = `${name}::${tipo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    participants.push({ name: String(name), tipo });
  }

  return {
    chatId,
    title: getChatTitle(conv ?? {}),
    totalMessages,
    teamMessages,
    clientMessages,
    firstAt: messages[0]?._ts ?? null,
    lastAt: messages[messages.length - 1]?._ts ?? null,
    responses,
    avgResponseSec: avg,
    medianResponseSec: med,
    unanswered,
    participants,
  };
}

function aggregateUserMetrics(
  code: string,
  chats: ChatMetrics[],
): Omit<UserMetrics, "loading" | "error"> {
  const totalChats = chats.length;
  const totalMessages = chats.reduce((acc, c) => acc + c.totalMessages, 0);
  const teamMessages = chats.reduce((acc, c) => acc + c.teamMessages, 0);
  const clientMessages = chats.reduce((acc, c) => acc + c.clientMessages, 0);
  const allDiffs = chats.flatMap((c) => c.responses.map((r) => r.diffSec));
  const totalResponses = allDiffs.length;
  const avg =
    totalResponses > 0
      ? allDiffs.reduce((a, b) => a + b, 0) / totalResponses
      : null;
  const med = median(allDiffs);
  const fastest = totalResponses > 0 ? Math.min(...allDiffs) : null;
  const slowest = totalResponses > 0 ? Math.max(...allDiffs) : null;
  const unansweredTotal = chats.reduce((acc, c) => acc + c.unanswered, 0);

  return {
    code,
    totalChats,
    totalMessages,
    teamMessages,
    clientMessages,
    totalResponses,
    avgResponseSec: avg,
    medianResponseSec: med,
    fastestResponseSec: fastest,
    slowestResponseSec: slowest,
    unansweredTotal,
    chats,
  };
}

// ─── UI ─────────────────────────────────────────────────────────────────────

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

function ChatRow({ chat }: { chat: ChatMetrics }) {
  const [open, setOpen] = useState(false);
  const responseRate =
    chat.clientMessages > 0
      ? Math.round((chat.responses.length / chat.clientMessages) * 100)
      : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{chat.title}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>{chat.totalMessages} msgs</span>
            <span className="text-blue-600">↗ {chat.teamMessages} equipo</span>
            <span className="text-emerald-600">
              ↘ {chat.clientMessages} cliente
            </span>
            <span className="text-violet-600">
              {chat.responses.length} respuestas
            </span>
            <span className="text-slate-600">
              ⏱ prom {formatDuration(chat.avgResponseSec)}
            </span>
            <span className="text-slate-500">
              med {formatDuration(chat.medianResponseSec)}
            </span>
            {chat.unanswered > 0 && (
              <span className="text-amber-600 font-medium">
                ⚠ pendiente sin responder
              </span>
            )}
          </div>
        </div>
        <div className="ml-2 flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {responseRate}% resp.
          </Badge>
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-3 bg-slate-50/50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <div className="text-slate-500">Primer mensaje</div>
              <div className="font-medium">{formatDate(chat.firstAt)}</div>
            </div>
            <div>
              <div className="text-slate-500">Último mensaje</div>
              <div className="font-medium">{formatDate(chat.lastAt)}</div>
            </div>
            <div>
              <div className="text-slate-500">Más rápida</div>
              <div className="font-medium">
                {formatDuration(
                  chat.responses.length > 0
                    ? Math.min(...chat.responses.map((r) => r.diffSec))
                    : null,
                )}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Más lenta</div>
              <div className="font-medium">
                {formatDuration(
                  chat.responses.length > 0
                    ? Math.max(...chat.responses.map((r) => r.diffSec))
                    : null,
                )}
              </div>
            </div>
          </div>

          {chat.participants.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Participantes</div>
              <div className="flex flex-wrap gap-1.5">
                {chat.participants.map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {p.name}
                    {p.tipo ? ` · ${p.tipo}` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {chat.responses.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-600 font-medium">
                Ver detalle de respuestas ({chat.responses.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-60 overflow-auto pr-1">
                {chat.responses.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded bg-white border border-slate-100 px-2 py-1"
                  >
                    <div className="text-slate-600">
                      <span className="text-emerald-600">cliente</span>{" "}
                      {formatDate(r.fromAt)} →{" "}
                      <span className="text-blue-600">equipo</span>{" "}
                      {formatDate(r.toAt)}
                    </div>
                    <Badge variant="outline" className="tabular-nums">
                      {formatDuration(r.diffSec)}
                    </Badge>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: UserMetrics }) {
  const [showAll, setShowAll] = useState(false);
  const sortedChats = useMemo(() => {
    return [...user.chats].sort((a, b) => {
      const ta = a.lastAt ? Date.parse(a.lastAt) : 0;
      const tb = b.lastAt ? Date.parse(b.lastAt) : 0;
      return tb - ta;
    });
  }, [user.chats]);

  const visibleChats = showAll ? sortedChats : sortedChats.slice(0, 5);

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            Usuario equipo
          </div>
          <div className="font-mono text-sm font-semibold text-slate-800">
            {user.code}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.loading && (
            <Badge
              variant="outline"
              className="text-xs gap-1 border-blue-300 text-blue-700"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando…
            </Badge>
          )}
          {!user.loading && !user.error && (
            <Badge
              variant="outline"
              className="text-xs gap-1 border-emerald-300 text-emerald-700"
            >
              <CheckCircle2 className="h-3 w-3" />
              Listo
            </Badge>
          )}
          {user.error && (
            <Badge
              variant="outline"
              className="text-xs gap-1 border-red-300 text-red-700"
            >
              <AlertCircle className="h-3 w-3" />
              {user.error}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile
          label="Conversaciones"
          value={String(user.totalChats)}
          icon={MessageSquare}
          tone="primary"
        />
        <StatTile
          label="Mensajes totales"
          value={String(user.totalMessages)}
          sub={`${user.teamMessages} equipo · ${user.clientMessages} cliente`}
          icon={Activity}
          tone="default"
        />
        <StatTile
          label="Respuestas analizadas"
          value={String(user.totalResponses)}
          sub={
            user.unansweredTotal > 0
              ? `${user.unansweredTotal} sin responder`
              : "todas respondidas"
          }
          icon={Send}
          tone={user.unansweredTotal > 0 ? "warning" : "success"}
        />
        <StatTile
          label="Tiempo promedio"
          value={formatDuration(user.avgResponseSec)}
          sub={`mediana ${formatDuration(user.medianResponseSec)}`}
          icon={Timer}
          tone="success"
        />
      </div>

      {user.totalResponses > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Respuesta más rápida"
            value={formatDuration(user.fastestResponseSec)}
            icon={Clock}
            tone="success"
          />
          <StatTile
            label="Respuesta más lenta"
            value={formatDuration(user.slowestResponseSec)}
            icon={Clock}
            tone="warning"
          />
        </div>
      )}

      {user.chats.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Detalle por conversación
          </div>
          <div className="space-y-2">
            {visibleChats.map((c) => (
              <ChatRow key={c.chatId} chat={c} />
            ))}
          </div>
          {sortedChats.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll
                ? "Mostrar menos"
                : `Mostrar las ${sortedChats.length - 5} restantes`}
            </Button>
          )}
        </div>
      ) : (
        !user.loading &&
        !user.error && (
          <div className="text-sm text-slate-500 text-center py-4">
            Sin conversaciones encontradas.
          </div>
        )
      )}
    </Card>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function ChatMetricsReportePage() {
  const [users, setUsers] = useState<UserMetrics[]>(() =>
    TARGET_CODES.map((code) => ({
      code,
      loading: false,
      error: null,
      totalChats: 0,
      totalMessages: 0,
      teamMessages: 0,
      clientMessages: 0,
      totalResponses: 0,
      avgResponseSec: null,
      medianResponseSec: null,
      fastestResponseSec: null,
      slowestResponseSec: null,
      unansweredTotal: 0,
      chats: [],
    })),
  );
  const [globalLoading, setGlobalLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("");

  const updateUser = useCallback(
    (code: string, patch: Partial<UserMetrics>) => {
      setUsers((prev) =>
        prev.map((u) => (u.code === code ? { ...u, ...patch } : u)),
      );
    },
    [],
  );

  const loadAll = useCallback(async () => {
    setGlobalLoading(true);
    setProgressMsg("Conectando…");
    const token = getAuthToken();

    for (const code of TARGET_CODES) {
      updateUser(code, {
        loading: true,
        error: null,
        chats: [],
        totalChats: 0,
        totalMessages: 0,
        teamMessages: 0,
        clientMessages: 0,
        totalResponses: 0,
        avgResponseSec: null,
        medianResponseSec: null,
        fastestResponseSec: null,
        slowestResponseSec: null,
        unansweredTotal: 0,
      });

      setProgressMsg(`Listando conversaciones de ${code}…`);
      let convs: RawConv[] = [];
      try {
        convs = await listConversations(token, code);
      } catch (e: any) {
        updateUser(code, { loading: false, error: "No se pudo listar chats" });
        continue;
      }

      const chatItems = convs
        .map((c) => ({
          chatId: String(c?.id_chat ?? c?.id ?? "").trim(),
          conv: c,
        }))
        .filter((x) => x.chatId);

      if (chatItems.length === 0) {
        updateUser(code, { loading: false, totalChats: 0 });
        continue;
      }

      setProgressMsg(
        `Obteniendo mensajes (${chatItems.length} chats) de ${code}…`,
      );

      const chatMetrics = await mapWithConcurrency(
        chatItems,
        JOIN_CONCURRENCY,
        async ({ chatId, conv }) => {
          const joined = await joinChat(token, chatId);
          const messages: RawMsg[] = Array.isArray(
            joined?.messages ?? joined?.mensajes,
          )
            ? (joined?.messages ?? joined?.mensajes)
            : [];
          return computeChatMetrics(chatId, joined ?? conv, messages);
        },
        (completed, total) => {
          setProgressMsg(
            `Procesando ${code}: ${completed}/${total} conversaciones`,
          );
        },
      );

      const agg = aggregateUserMetrics(code, chatMetrics);
      updateUser(code, { ...agg, loading: false, error: null });
    }

    setProgressMsg("");
    setGlobalLoading(false);
  }, [updateUser]);

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grandTotal = useMemo(() => {
    const totalChats = users.reduce((a, u) => a + u.totalChats, 0);
    const totalMessages = users.reduce((a, u) => a + u.totalMessages, 0);
    const allDiffs = users.flatMap((u) =>
      u.chats.flatMap((c) => c.responses.map((r) => r.diffSec)),
    );
    const avg =
      allDiffs.length > 0
        ? allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length
        : null;
    return {
      totalChats,
      totalMessages,
      totalResponses: allDiffs.length,
      avgResponseSec: avg,
      medianResponseSec: median(allDiffs),
    };
  }, [users]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Reporte de Métricas de Chat
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tiempos de respuesta y actividad por conversación para usuarios
                de equipo seleccionados. Solo lectura — no se crean ni modifican
                conversaciones.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {TARGET_CODES.map((c) => (
                  <Badge key={c} variant="secondary" className="font-mono">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {globalLoading && progressMsg && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {progressMsg}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadAll}
                disabled={globalLoading}
              >
                {globalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Recargar
              </Button>
            </div>
          </div>

          {/* Resumen global */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-semibold">Resumen consolidado</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <StatTile
                label="Total chats"
                value={String(grandTotal.totalChats)}
                icon={MessageSquare}
                tone="primary"
              />
              <StatTile
                label="Total mensajes"
                value={String(grandTotal.totalMessages)}
                icon={Activity}
              />
              <StatTile
                label="Respuestas"
                value={String(grandTotal.totalResponses)}
                icon={Send}
                tone="default"
              />
              <StatTile
                label="Promedio respuesta"
                value={formatDuration(grandTotal.avgResponseSec)}
                icon={Timer}
                tone="success"
              />
              <StatTile
                label="Mediana respuesta"
                value={formatDuration(grandTotal.medianResponseSec)}
                icon={Clock}
                tone="success"
              />
            </div>
            {globalLoading && progressMsg && (
              <div className="mt-3 text-xs text-muted-foreground sm:hidden">
                {progressMsg}
              </div>
            )}
          </Card>

          {/* Tarjetas por usuario */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            {users.map((u) => (
              <UserCard key={u.code} user={u} />
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>Cómo se calcula:</strong> el tiempo de respuesta se mide
            desde el primer mensaje del cliente en una atención hasta la primera
            respuesta del equipo. Si el cliente envía varios mensajes seguidos,
            se cuenta desde el primero. Si el último mensaje del chat es del
            cliente sin respuesta, se marca como pendiente.
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
