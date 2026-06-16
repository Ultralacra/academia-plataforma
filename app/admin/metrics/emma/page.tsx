"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface HistoryEntry {
  code: string;
  name: string;
  messages: ChatMessage[];
}

interface TopicCount {
  topic: string;
  count: number;
  percentage: number;
  keywords: string[];
}

interface DailyCount {
  date: string;
  count: number;
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Pausas: ["pausa", "pausar", "suspender", "suspension", "retomar", "reanudar"],
  Contratos: [
    "contrato",
    "clausula",
    "terminos",
    "condiciones",
    "firma",
    "firmar",
    "vigencia",
    "vencimiento",
  ],
  Membresias: [
    "membresia",
    "plan",
    "suscripcion",
    "renovacion",
    "renovar",
    "activo",
    "inactivo",
    "estado",
  ],
  Pagos: [
    "pago",
    "pagar",
    "factura",
    "cobro",
    "cargo",
    "tarjeta",
    "transferencia",
    "deposito",
    "adeudo",
    "deuda",
  ],
  Extensiones: [
    "extension",
    "extender",
    "ampliar",
    "prorrogar",
    "prorroga",
    "tiempo",
    "dias",
  ],
  Bonos: [
    "bono",
    "bonos",
    "descuento",
    "promocion",
    "oferta",
    "beneficio",
    "regalo",
  ],
  Garantias: [
    "garantia",
    "garantizar",
    "reembolso",
    "devolver",
    "devolucion",
    "reclamo",
  ],
  Tareas: [
    "tarea",
    "tareas",
    "fase",
    "fases",
    "entrega",
    "entregar",
    "proyecto",
    "proyectos",
    "actividad",
    "actividades",
  ],
  Soporte: [
    "soporte",
    "ayuda",
    "problema",
    "error",
    "falla",
    "no funciona",
    "asistencia",
    "servicio",
  ],
  Quejas: [
    "queja",
    "reclamacion",
    "insatisfecho",
    "molesto",
    "decepcion",
    "furioso",
    "indignado",
  ],
  Informacion: [
    "informacion",
    "como",
    "que es",
    "cuando",
    "donde",
    "cuanto",
    "cual",
    "duda",
    "pregunta",
    "quiero saber",
    "necesito saber",
  ],
};

const TOPIC_COLORS: Record<string, string> = {
  Pausas: "#3b82f6",
  Contratos: "#8b5cf6",
  Membresias: "#10b981",
  Pagos: "#f59e0b",
  Extensiones: "#ec4899",
  Bonos: "#06b6d4",
  Garantias: "#6366f1",
  Tareas: "#14b8a6",
  Soporte: "#f97316",
  Quejas: "#ef4444",
  Informacion: "#64748b",
  Otro: "#9ca3af",
};

const PIE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#ef4444",
  "#64748b",
  "#9ca3af",
];

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyMessage(content: string): string {
  const normalized = normalizeText(content);
  let bestTopic = "Otro";
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        score += 1;
        if (normalized.split(" ").length < 20) {
          score += 0.5;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES").format(n);
}

export default function EmmaMetricsPage() {
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const loadHistories = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const url = `/api/metadata?entity=super_atc_chat_history&pageSize=500`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        setError("No se pudieron cargar los historiales");
        setLoading(false);
        return;
      }

      const json = await res.json().catch(() => null);
      const items: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.items)
            ? json.items
            : json
              ? [json]
              : [];

      const parsed: HistoryEntry[] = items
        .filter((item: any) => item?.entity === "super_atc_chat_history")
        .map((item: any) => {
          const payload = item.payload ?? {};
          return {
            code: String(payload.alumnoCode ?? item.entity_id ?? ""),
            name: String(payload.alumnoName ?? payload.alumnoCode ?? ""),
            messages: Array.isArray(payload.messages) ? payload.messages : [],
          };
        })
        .filter((h: HistoryEntry) => h.code && h.messages.length > 0);

      console.log("[emma-metrics][loadHistories]", {
        totalItems: items.length,
        historiesLoaded: parsed.length,
        totalMessages: parsed.reduce((acc, h) => acc + h.messages.length, 0),
        sampleHistory: parsed[0]
          ? {
              code: parsed[0].code,
              name: parsed[0].name,
              msgCount: parsed[0].messages.length,
              sampleMessages: parsed[0].messages.slice(0, 3).map((m) => ({
                role: m.role,
                contentPreview: m.content.slice(0, 100),
                hasAccion: m.content.includes("[ACCION:"),
              })),
            }
          : null,
      });

      setHistories(parsed);
    } catch (err) {
      console.error("[emma-metrics] load failed", err);
      setError("Error al cargar los historiales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistories();
  }, []);

  const allMessages = useMemo(() => {
    return histories.flatMap((h) =>
      h.messages.map((m) => ({
        ...m,
        studentCode: h.code,
        studentName: h.name,
      })),
    );
  }, [histories]);

  const userMessages = useMemo(() => {
    return allMessages.filter((m) => m.role === "user");
  }, [allMessages]);

  const assistantMessages = useMemo(() => {
    return allMessages.filter((m) => m.role === "assistant");
  }, [allMessages]);

  const topicStats = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const msg of userMessages) {
      const topic = classifyMessage(msg.content);
      counts[topic] = (counts[topic] || 0) + 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    const topics: TopicCount[] = Object.entries(counts)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: Math.round((count / total) * 100),
        keywords: TOPIC_KEYWORDS[topic] || [],
      }))
      .sort((a, b) => b.count - a.count);

    return topics;
  }, [userMessages]);

  const dailyStats = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const msg of userMessages) {
      try {
        const date = new Date(msg.timestamp);
        const key = date.toISOString().slice(0, 10);
        counts[key] = (counts[key] || 0) + 1;
      } catch {}
    }

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [userMessages]);

  const studentStats = useMemo(() => {
    const map: Record<
      string,
      { code: string; name: string; messageCount: number; topics: Record<string, number> }
    > = {};

    for (const msg of allMessages) {
      const key = msg.studentCode;
      if (!map[key]) {
        map[key] = {
          code: msg.studentCode,
          name: msg.studentName,
          messageCount: 0,
          topics: {},
        };
      }
      map[key].messageCount += 1;

      if (msg.role === "user") {
        const topic = classifyMessage(msg.content);
        map[key].topics[topic] = (map[key].topics[topic] || 0) + 1;
      }
    }

    return Object.values(map)
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 20);
  }, [allMessages]);

  const pauseStats = useMemo(() => {
    const pauses: Array<{
      alumnoCode: string;
      alumnoName: string;
      tipo: string;
      motivo: string;
      start: string;
      end: string;
      timestamp: string;
    }> = [];

    const debugData: any[] = [];

    function extractActions(text: string): any[] {
      const results: any[] = [];
      let searchFrom = 0;
      while (true) {
        const startIdx = text.indexOf('[ACCION:', searchFrom);
        if (startIdx === -1) break;
        const jsonStart = startIdx + '[ACCION:'.length;

        let depth = 0;
        let endIdx = -1;
        for (let i = jsonStart; i < text.length; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') {
            depth--;
            if (depth === 0) {
              endIdx = i + 1;
              break;
            }
          }
        }

        if (endIdx > jsonStart) {
          const jsonStr = text.substring(jsonStart, endIdx);
          try {
            results.push(JSON.parse(jsonStr));
          } catch {}
        }

        searchFrom = endIdx > 0 ? endIdx : jsonStart + 1;
      }
      return results;
    }

    for (const msg of allMessages) {
      if (msg.role !== "assistant") continue;
      if (!msg.content.includes("[ACCION:")) continue;

      const actions = extractActions(msg.content);

      for (const action of actions) {
        debugData.push({
          alumno: msg.studentName,
          code: msg.studentCode,
          contentPreview: msg.content.slice(0, 200),
          parsed: action,
        });

        if (action.tipo === "pausa") {
          pauses.push({
            alumnoCode: msg.studentCode,
            alumnoName: msg.studentName,
            tipo: action.tipo_pausa || "CONTRACTUAL",
            motivo: action.motivo || "",
            start: action.start || "",
            end: action.end || "",
            timestamp: msg.timestamp,
          });
        }
      }
    }

    console.log("[emma-metrics][pauseStats]", {
      totalAssistantWithActions: debugData.length,
      pausesFound: pauses.length,
      allActions: debugData,
    });

    const byType: Record<string, number> = {};
    const byStudent: Record<string, { name: string; count: number }> = {};
    for (const p of pauses) {
      byType[p.tipo] = (byType[p.tipo] || 0) + 1;
      if (!byStudent[p.alumnoCode]) {
        byStudent[p.alumnoCode] = { name: p.alumnoName, count: 0 };
      }
      byStudent[p.alumnoCode].count += 1;
    }

    return {
      total: pauses.length,
      byType,
      byStudent: Object.entries(byStudent)
        .map(([code, data]) => ({ code, ...data }))
        .sort((a, b) => b.count - a.count),
      pauses: pauses.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
      debugData,
    };
  }, [allMessages]);

  const barChartData = useMemo(() => {
    return topicStats.slice(0, 10).map((t) => ({
      name: t.topic,
      value: t.count,
    }));
  }, [topicStats]);

  const pieChartData = useMemo(() => {
    return topicStats.slice(0, 8).map((t) => ({
      name: t.topic,
      value: t.count,
    }));
  }, [topicStats]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin", "equipo"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-[#2d9eea]" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["admin", "equipo"]}>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-red-500">{error}</p>
            <button
              onClick={loadHistories}
              className="px-4 py-2 bg-[#2d9eea] text-white rounded-lg hover:bg-[#2589d1]"
            >
              Reintentar
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bot className="h-6 w-6 text-[#2d9eea]" />
                Métricas de Emma IA
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Análisis de temas más hablados en conversaciones con el agente
                IA.
              </p>
            </div>
            <button
              onClick={loadHistories}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4" />
              Actualizar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Alumnos con IA
                </p>
                <Users className="h-5 w-5 text-[#2d9eea]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(histories.length)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                han conversado con Emma
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Mensajes totales
                </p>
                <MessageSquare className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(allMessages.length)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatNumber(userMessages.length)} del alumno ·{" "}
                {formatNumber(assistantMessages.length)} de Emma
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Tema principal
                </p>
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {topicStats.length > 0 ? topicStats[0].topic : "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {topicStats.length > 0
                  ? `${topicStats[0].percentage}% de los mensajes`
                  : "Sin datos"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Promedio msgs/alumno
                </p>
                <CalendarDays className="h-5 w-5 text-violet-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {histories.length > 0
                  ? Math.round(allMessages.length / histories.length)
                  : 0}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                mensajes por conversación
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Top 10 Temas por Frecuencia
              </h2>
              {barChartData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No hay datos para mostrar
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={barChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${value} mensajes`,
                        "Frecuencia",
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Distribución por Tema
              </h2>
              {pieChartData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No hay datos para mostrar
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} mensajes`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="mt-2 space-y-1.5">
                {topicStats.slice(0, 6).map((t, i) => (
                  <div key={t.topic} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-slate-600 flex-1">{t.topic}</span>
                    <span className="font-medium text-slate-800">
                      {t.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Actividad Diaria (Últimos 30 días)
            </h2>
            {dailyStats.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No hay datos para mostrar
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value} mensajes`,
                      "Mensajes del alumno",
                    ]}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Bar dataKey="count" fill="#2d9eea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Desglose por Alumno
            </h2>
            {studentStats.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No hay datos para mostrar
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium w-8"></th>
                      <th className="px-4 py-3 text-left font-medium">
                        Alumno
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Código
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Mensajes
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Tema principal
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Top Temas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentStats.map((s) => {
                      const topTopics = Object.entries(s.topics)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3);
                      const mainTopic = topTopics[0];
                      const isExpanded = expandedStudent === s.code;
                      const studentMessages =
                        histories.find((h) => h.code === s.code)?.messages ||
                        [];
                      const userMsgs = studentMessages
                        .filter((m) => m.role === "user")
                        .reverse()
                        .slice(0, 50);
                      return (
                        <>
                          <tr
                            key={s.code}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() =>
                              setExpandedStudent(isExpanded ? null : s.code)
                            }
                          >
                            <td className="px-4 py-3 text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {s.name}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                              {s.code}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">
                              {s.messageCount}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                className="text-[11px] px-2 py-0.5"
                                style={{
                                  backgroundColor: mainTopic
                                    ? `${TOPIC_COLORS[mainTopic[0]]}20`
                                    : undefined,
                                  color: mainTopic
                                    ? TOPIC_COLORS[mainTopic[0]]
                                    : undefined,
                                  borderColor: mainTopic
                                    ? `${TOPIC_COLORS[mainTopic[0]]}40`
                                    : undefined,
                                }}
                              >
                                {mainTopic ? mainTopic[0] : "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {topTopics.map(([topic, count]) => (
                                  <span
                                    key={topic}
                                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
                                  >
                                    {topic} ({count})
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${s.code}-messages`}>
                              <td
                                colSpan={6}
                                className="px-4 py-3 bg-slate-50/50"
                              >
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="h-4 w-4 text-[#2d9eea]" />
                                      <span className="text-xs font-semibold text-slate-700">
                                        Mensajes de {s.name}
                                      </span>
                                      <Badge className="text-[10px] px-1.5 py-0">
                                        {userMsgs.length} msgs del alumno
                                      </Badge>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedStudent(null);
                                      }}
                                      className="text-slate-400 hover:text-slate-600 text-xs"
                                    >
                                      Cerrar
                                    </button>
                                  </div>
                                  {userMsgs.length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-4">
                                      Sin mensajes
                                    </p>
                                  ) : (
                                    <div className="max-h-80 overflow-y-auto">
                                      {userMsgs.map((msg, idx) => {
                                        const topic = classifyMessage(
                                          msg.content,
                                        );
                                        return (
                                          <div
                                            key={msg.id || idx}
                                            className="px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <p className="text-sm text-slate-700 leading-relaxed flex-1">
                                                {msg.content.length > 200
                                                  ? msg.content.slice(0, 200) +
                                                    "..."
                                                  : msg.content}
                                              </p>
                                              <div className="shrink-0 flex items-center gap-1.5">
                                                <span
                                                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                                  style={{
                                                    backgroundColor: `${TOPIC_COLORS[topic]}15`,
                                                    color: TOPIC_COLORS[topic],
                                                  }}
                                                >
                                                  {topic}
                                                </span>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                  {(() => {
                                                    try {
                                                      return new Date(
                                                        msg.timestamp,
                                                      ).toLocaleTimeString(
                                                        "es-ES",
                                                        {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                        },
                                                      );
                                                    } catch {
                                                      return "";
                                                    }
                                                  })()}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                Pausas Propuestas por Emma
              </h2>
              <button
                onClick={() => {
                  console.log("[emma-metrics][DEBUG] === PAUSAS ===");
                  console.log("[emma-metrics][DEBUG] Pausas:", pauseStats.pauses);
                  console.log("[emma-metrics][DEBUG] Todas las acciones:", pauseStats.debugData);
                  console.log("[emma-metrics][DEBUG] Stats:", {
                    total: pauseStats.total,
                    byType: pauseStats.byType,
                    byStudent: pauseStats.byStudent,
                  });
                  console.log("[emma-metrics][DEBUG] === ALL MESSAGES ===");
                  console.log("[emma-metrics][DEBUG] Total mensajes:", allMessages.length);
                  console.log("[emma-metrics][DEBUG] Mensajes assistant:", allMessages.filter(m => m.role === "assistant").length);
                  const assistantWithAccion = allMessages.filter(m => m.role === "assistant" && m.content.includes("[ACCION:"));
                  console.log("[emma-metrics][DEBUG] Assistant con [ACCION:]:", assistantWithAccion.length);
                  assistantWithAccion.forEach((m, i) => {
                    console.log(`[emma-metrics][DEBUG] Accion ${i}:`, {
                      alumno: m.studentName,
                      content: m.content.slice(0, 300),
                    });
                  });
                  alert(
                    `DEBUG: Revisa la consola del navegador (F12)\n\n` +
                    `Acciones encontradas: ${pauseStats.debugData.length}\n` +
                    `Pausas encontradas: ${pauseStats.total}\n` +
                    `Mensajes totales: ${allMessages.length}\n` +
                    `Assistant con [ACCION:]: ${assistantWithAccion.length}\n\n` +
                    `Busca en consola: [emma-metrics][DEBUG]`,
                  );
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
              >
                Debug: Imprimir acciones en consola
              </button>
            </div>
            {pauseStats.total === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 mb-3">
                  No se han propuesto pausas aún
                </p>
                {pauseStats.debugData.length > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 inline-block">
                    Se encontraron {pauseStats.debugData.length} acciones, pero ninguna es de tipo "pausa".
                    Haz clic en "Debug" arriba para ver qué acciones existen.
                  </p>
                )}
                {pauseStats.debugData.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No se encontraron bloques [ACCION:...] en los mensajes de Emma.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3 mb-5">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                      Total propuestas
                    </p>
                    <p className="mt-1 text-2xl font-bold text-blue-900">
                      {pauseStats.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                      Contractuales
                    </p>
                    <p className="mt-1 text-2xl font-bold text-purple-900">
                      {pauseStats.byType["CONTRACTUAL"] || 0}
                    </p>
                    <p className="text-[11px] text-purple-500 mt-0.5">
                      {(pauseStats.byType["CONTRACTUAL"] || 0) + (pauseStats.byType["EXTRAORDINARIA"] || 0) > 0
                        ? Math.round(
                            ((pauseStats.byType["CONTRACTUAL"] || 0) /
                              ((pauseStats.byType["CONTRACTUAL"] || 0) + (pauseStats.byType["EXTRAORDINARIA"] || 0))) *
                              100,
                          )
                        : 0}
                      % del total
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                      Extraordinarias
                    </p>
                    <p className="mt-1 text-2xl font-bold text-amber-900">
                      {pauseStats.byType["EXTRAORDINARIA"] || 0}
                    </p>
                    <p className="text-[11px] text-amber-500 mt-0.5">
                      {(pauseStats.byType["CONTRACTUAL"] || 0) + (pauseStats.byType["EXTRAORDINARIA"] || 0) > 0
                        ? Math.round(
                            ((pauseStats.byType["EXTRAORDINARIA"] || 0) /
                              ((pauseStats.byType["CONTRACTUAL"] || 0) + (pauseStats.byType["EXTRAORDINARIA"] || 0))) *
                              100,
                          )
                        : 0}
                      % del total
                    </p>
                  </div>
                </div>

                {pauseStats.byStudent.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      Pausas por Alumno
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium">
                              Alumno
                            </th>
                            <th className="px-4 py-2.5 text-left font-medium">
                              Código
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium">
                              Pausas
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pauseStats.byStudent.map((s) => (
                            <tr key={s.code} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-medium text-slate-800">
                                {s.name}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">
                                {s.code}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                  {s.count}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Historial de Pausas Propuestas
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-medium">
                            Alumno
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium">
                            Tipo
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium">
                            Desde
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium">
                            Hasta
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium">
                            Motivo
                          </th>
                          <th className="px-4 py-2.5 text-left font-medium">
                            Fecha propuesta
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pauseStats.pauses.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              {p.alumnoName}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                className={`text-[10px] px-2 py-0.5 ${
                                  p.tipo === "CONTRACTUAL"
                                    ? "bg-purple-100 text-purple-700 border-purple-200"
                                    : "bg-amber-100 text-amber-700 border-amber-200"
                                }`}
                              >
                                {p.tipo}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 text-xs">
                              {p.start}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 text-xs">
                              {p.end}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 max-w-[250px] truncate text-xs">
                              {p.motivo}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                              {(() => {
                                try {
                                  return new Date(p.timestamp).toLocaleDateString(
                                    "es-ES",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  );
                                } catch {
                                  return p.timestamp;
                                }
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Tabla Completa de Temas
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Tema</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Frecuencia
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Porcentaje
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Barra
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Keywords detectadas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topicStats.map((t, i) => (
                    <tr key={t.topic} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          {t.topic}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {t.count}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {t.percentage}%
                      </td>
                      <td className="px-4 py-3 w-48">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${t.percentage}%`,
                              backgroundColor:
                                PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {t.keywords.slice(0, 4).map((kw) => (
                            <span
                              key={kw}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
                            >
                              {kw}
                            </span>
                          ))}
                          {t.keywords.length > 4 && (
                            <span className="text-[10px] text-slate-400">
                              +{t.keywords.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
