"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────── */
/*  Types                                                        */
/* ────────────────────────────────────────────────────────────── */

type EventType =
  | "all"
  | "requested"
  | "delivered"
  | "deferred"
  | "hard_bounce"
  | "soft_bounce"
  | "blocked"
  | "invalid"
  | "spam"
  | "opened"
  | "click"
  | "unsubscribed"
  | "error";

type BrevoEventRow = {
  timestamp: string | number | null;
  event: string;
  email: string;
  subject: string;
  messageId: string;
  reason: string;
};

type EventMeta = {
  label: string;
  tone: "delivery" | "engagement" | "issue" | "other";
};

/* ────────────────────────────────────────────────────────────── */
/*  Constants                                                    */
/* ────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 20;

const EVENT_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "requested", label: "Solicitado" },
  { value: "delivered", label: "Entregado" },
  { value: "deferred", label: "Diferido" },
  { value: "hard_bounce", label: "Hard bounce" },
  { value: "soft_bounce", label: "Soft bounce" },
  { value: "blocked", label: "Bloqueado" },
  { value: "invalid", label: "Inválido" },
  { value: "spam", label: "Spam" },
  { value: "opened", label: "Abierto" },
  { value: "click", label: "Click" },
  { value: "unsubscribed", label: "Desuscrito" },
  { value: "error", label: "Error" },
];

const DAYS_OPTIONS = [
  { value: "7", label: "7 días" },
  { value: "14", label: "14 días" },
  { value: "30", label: "30 días" },
  { value: "60", label: "60 días" },
  { value: "90", label: "90 días" },
];

/* ────────────────────────────────────────────────────────────── */
/*  Helpers                                                      */
/* ────────────────────────────────────────────────────────────── */

function getEventMeta(event: string): EventMeta {
  switch (
    String(event ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "requested":
      return { label: "Solicitado", tone: "delivery" };
    case "delivered":
      return { label: "Entregado", tone: "delivery" };
    case "deferred":
      return { label: "Diferido", tone: "delivery" };
    case "opened":
      return { label: "Abierto", tone: "engagement" };
    case "click":
      return { label: "Clic", tone: "engagement" };
    case "hard_bounce":
      return { label: "Rebote duro", tone: "issue" };
    case "soft_bounce":
      return { label: "Rebote suave", tone: "issue" };
    case "blocked":
      return { label: "Bloqueado", tone: "issue" };
    case "invalid":
      return { label: "Inválido", tone: "issue" };
    case "spam":
      return { label: "Spam", tone: "issue" };
    case "unsubscribed":
      return { label: "Desuscrito", tone: "issue" };
    case "error":
      return { label: "Error", tone: "issue" };
    default:
      return {
        label: event ? event.replace(/_/g, " ") : "—",
        tone: "other",
      };
  }
}

function toneClasses(tone: EventMeta["tone"]) {
  switch (tone) {
    case "delivery":
      return "border-transparent bg-[hsl(var(--chart-2)/0.18)] text-foreground";
    case "engagement":
      return "border-transparent bg-[hsl(var(--chart-1)/0.16)] text-foreground";
    case "issue":
      return "border-transparent bg-[hsl(var(--chart-5)/0.18)] text-foreground";
    default:
      return "border-transparent bg-[hsl(var(--chart-4)/0.16)] text-foreground";
  }
}

function formatDate(value: string | number | null) {
  if (value == null) return "—";
  const d =
    typeof value === "number"
      ? new Date(value > 1_000_000_000_000 ? value : value * 1000)
      : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ────────────────────────────────────────────────────────────── */
/*  Group events by messageId for "per-email" view               */
/* ────────────────────────────────────────────────────────────── */

type GroupedEmail = {
  messageId: string;
  subject: string;
  firstTimestamp: string | number | null;
  events: BrevoEventRow[];
  /** Highest-level event reached */
  maxEvent: string;
};

function groupByMessage(rows: BrevoEventRow[]): GroupedEmail[] {
  const map = new Map<string, BrevoEventRow[]>();
  for (const row of rows) {
    const key = row.messageId || `anon-${row.subject}-${row.timestamp}`;
    const arr = map.get(key) ?? [];
    arr.push(row);
    map.set(key, arr);
  }

  const priority: Record<string, number> = {
    click: 6,
    opened: 5,
    delivered: 4,
    deferred: 3,
    requested: 2,
    hard_bounce: 1,
    soft_bounce: 1,
    blocked: 1,
    spam: 1,
    invalid: 1,
    unsubscribed: 1,
    error: 0,
  };

  const groups: GroupedEmail[] = [];
  for (const [messageId, evts] of map) {
    // Sort events oldest→newest within group
    evts.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp as string).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp as string).getTime() : 0;
      return ta - tb;
    });

    let maxEvent = "requested";
    let maxPriority = 0;
    for (const e of evts) {
      const p = priority[e.event] ?? 0;
      if (p > maxPriority) {
        maxPriority = p;
        maxEvent = e.event;
      }
    }

    groups.push({
      messageId,
      subject: evts[0]?.subject ?? "",
      firstTimestamp: evts[0]?.timestamp ?? null,
      events: evts,
      maxEvent,
    });
  }

  // Sort groups newest first
  groups.sort((a, b) => {
    const ta = a.firstTimestamp
      ? new Date(a.firstTimestamp as string).getTime()
      : 0;
    const tb = b.firstTimestamp
      ? new Date(b.firstTimestamp as string).getTime()
      : 0;
    return tb - ta;
  });

  return groups;
}

/* ────────────────────────────────────────────────────────────── */
/*  Progress pipeline component                                  */
/* ────────────────────────────────────────────────────────────── */

const PIPELINE_STEPS = ["requested", "delivered", "opened", "click"] as const;
const PIPELINE_LABELS: Record<string, string> = {
  requested: "Enviado",
  delivered: "Entregado",
  opened: "Abierto",
  click: "Clic",
};

function EventPipeline({ events }: { events: BrevoEventRow[] }) {
  const reached = new Set(events.map((e) => e.event));
  const hasIssue = events.some((e) =>
    [
      "hard_bounce",
      "soft_bounce",
      "blocked",
      "invalid",
      "spam",
      "error",
    ].includes(e.event),
  );

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STEPS.map((step, idx) => {
        const active = reached.has(step);
        return (
          <div key={step} className="flex items-center gap-1">
            {idx > 0 && (
              <div
                className={`h-px w-3 ${
                  active ? "bg-green-500" : "bg-muted-foreground/30"
                }`}
              />
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                active
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
              title={PIPELINE_LABELS[step]}
            >
              {PIPELINE_LABELS[step]}
            </span>
          </div>
        );
      })}
      {hasIssue && (
        <Badge
          variant="outline"
          className="ml-1 text-[10px] border-destructive/50 text-destructive"
        >
          Error
        </Badge>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Main component                                               */
/* ────────────────────────────────────────────────────────────── */

export default function StudentBrevoEvents({
  email,
  studentCode,
}: {
  email: string;
  studentCode?: string;
}) {
  const [rows, setRows] = useState<BrevoEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);

  const [days, setDays] = useState("30");
  const [eventFilter, setEventFilter] = useState<EventType>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  const canGoPrev = offset > 0;
  const canGoNext = offset + PAGE_SIZE < count;

  /* ── Fetch events ── */
  const loadEvents = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const token = getAuthToken();
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        days,
        email: email.toLowerCase().trim(),
      });
      if (eventFilter !== "all") params.set("event", eventFilter);

      const res = await fetch(`/api/brevo/events?${params.toString()}`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(String(json?.message ?? "No se pudo consultar Brevo"));
      }

      const events = Array.isArray(json?.events) ? json.events : [];
      setRows(events);
      setCount(Number(json?.count ?? events.length ?? 0));
    } catch (e) {
      setRows([]);
      setCount(0);
      setError(e instanceof Error ? e.message : "Error consultando eventos");
    } finally {
      setLoading(false);
    }
  }, [email, offset, days, eventFilter]);

  // Auto-load when the card is opened
  useEffect(() => {
    if (isOpen && email) {
      void loadEvents();
    }
  }, [isOpen, loadEvents, email]);

  /* ── Summary counts ── */
  const summary = useMemo(() => {
    const bucket: Record<string, number> = {};
    for (const row of rows) {
      const key = String(row.event || "unknown").toLowerCase();
      bucket[key] = (bucket[key] ?? 0) + 1;
    }
    return bucket;
  }, [rows]);

  /* ── Grouped view ── */
  const grouped = useMemo(() => groupByMessage(rows), [rows]);

  if (!email) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-muted/40 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Historial de emails
                {count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0 px-4 pb-4">
            {/* ── Filters row ── */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Periodo</span>
                <Select
                  value={days}
                  onValueChange={(v) => {
                    setDays(v);
                    setOffset(0);
                  }}
                >
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Evento</span>
                <Select
                  value={eventFilter}
                  onValueChange={(v) => {
                    setEventFilter(v as EventType);
                    setOffset(0);
                  }}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  setOffset(0);
                  void loadEvents();
                }}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Cargando…" : "Actualizar"}
              </Button>

              {studentCode && (
                <a
                  href={`/admin/brevo/events?email=${encodeURIComponent(email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ver completo <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* ── Summary badges ── */}
            {rows.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary)
                  .sort((a, b) => b[1] - a[1])
                  .map(([evt, qty]) => {
                    const meta = getEventMeta(evt);
                    return (
                      <Badge
                        key={evt}
                        variant="outline"
                        className={`text-[10px] ${toneClasses(meta.tone)}`}
                      >
                        {meta.label}: {qty}
                      </Badge>
                    );
                  })}
              </div>
            )}

            {/* ── Error ── */}
            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* ── Grouped email view ── */}
            {grouped.length === 0 && !loading && !error && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No se encontraron emails en los últimos {days} días.
              </p>
            )}

            {grouped.length > 0 && (
              <div className="space-y-2">
                {grouped.map((group) => (
                  <div
                    key={group.messageId}
                    className="rounded-md border text-xs"
                  >
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors"
                      onClick={() =>
                        setExpandedMsg(
                          expandedMsg === group.messageId
                            ? null
                            : group.messageId,
                        )
                      }
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {group.subject || "(sin asunto)"}
                          </p>
                          <p className="text-muted-foreground mt-0.5">
                            {formatDate(group.firstTimestamp)}
                          </p>
                        </div>
                        <EventPipeline events={group.events} />
                      </div>
                    </button>

                    {expandedMsg === group.messageId && (
                      <div className="border-t px-3 py-2 bg-muted/20">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-[10px]">
                              <TableHead className="py-1">Fecha</TableHead>
                              <TableHead className="py-1">Estado</TableHead>
                              <TableHead className="py-1">Detalle</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.events.map((evt, idx) => {
                              const meta = getEventMeta(evt.event);
                              return (
                                <TableRow
                                  key={`${evt.messageId}-${idx}`}
                                  className="text-[11px]"
                                >
                                  <TableCell className="py-1">
                                    {formatDate(evt.timestamp)}
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${toneClasses(meta.tone)}`}
                                    >
                                      {meta.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-1 max-w-[200px] truncate text-muted-foreground">
                                    {evt.reason || "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Pagination ── */}
            {(canGoPrev || canGoNext) && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-muted-foreground">
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, count)} de {count}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!canGoPrev || loading}
                    onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!canGoNext || loading}
                    onClick={() => setOffset((p) => p + PAGE_SIZE)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
