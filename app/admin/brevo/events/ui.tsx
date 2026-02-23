"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type SubjectFilter =
  | "all"
  | "payment_reminder"
  | "password_updated"
  | "new_support_portal"
  | "access_due_reminder";

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
  group: "delivery" | "engagement" | "issue" | "other";
  tone: "delivery" | "engagement" | "issue" | "other";
};

const PAGE_SIZE = 50;

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

const SUBJECT_OPTIONS: Array<{ value: SubjectFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "payment_reminder", label: "Contiene: Recordatorio de pago" },
  {
    value: "password_updated",
    label: "Contiene: Tu contraseña fue actualizada",
  },
  {
    value: "new_support_portal",
    label: "Contiene: Tu nuevo Portal de soporte de Hotselling",
  },
  {
    value: "access_due_reminder",
    label: "Contiene: Recordatorio de vencimiento de accesos",
  },
];

const EVENT_LEGEND: Array<{ key: EventType; meaning: string }> = [
  { key: "requested", meaning: "Brevo recibió la solicitud de envío." },
  {
    key: "delivered",
    meaning: "El correo se entregó al servidor del destinatario.",
  },
  { key: "deferred", meaning: "Entrega retrasada; Brevo reintentará." },
  { key: "opened", meaning: "El destinatario abrió el correo." },
  { key: "click", meaning: "El destinatario hizo clic en un enlace." },
  {
    key: "hard_bounce",
    meaning: "Rebote permanente (correo inválido o inexistente).",
  },
  {
    key: "soft_bounce",
    meaning: "Rebote temporal (buzón lleno o servidor ocupado).",
  },
  { key: "blocked", meaning: "Entrega bloqueada por políticas del receptor." },
  { key: "invalid", meaning: "Dirección inválida." },
  { key: "spam", meaning: "Marcado como spam por el destinatario/proveedor." },
  { key: "unsubscribed", meaning: "El destinatario se dio de baja." },
  { key: "error", meaning: "Error en el proceso de envío." },
];

function parseDate(value: string | number | null) {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    const dt = new Date(ms);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDate(value: string | number | null) {
  const dt = parseDate(value);
  if (!dt) return "-";
  return dt.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventMeta(event: string): EventMeta {
  const normalized = String(event ?? "")
    .trim()
    .toLowerCase();
  switch (normalized) {
    case "requested":
      return { label: "Solicitado", group: "delivery", tone: "delivery" };
    case "delivered":
      return { label: "Entregado", group: "delivery", tone: "delivery" };
    case "deferred":
      return { label: "Diferido", group: "delivery", tone: "delivery" };
    case "opened":
      return { label: "Abierto", group: "engagement", tone: "engagement" };
    case "click":
      return { label: "Clic", group: "engagement", tone: "engagement" };
    case "hard_bounce":
      return { label: "Rebote duro", group: "issue", tone: "issue" };
    case "soft_bounce":
      return { label: "Rebote suave", group: "issue", tone: "issue" };
    case "blocked":
      return { label: "Bloqueado", group: "issue", tone: "issue" };
    case "invalid":
      return { label: "Inválido", group: "issue", tone: "issue" };
    case "spam":
      return { label: "Marcado como spam", group: "issue", tone: "issue" };
    case "unsubscribed":
      return { label: "Desuscrito", group: "issue", tone: "issue" };
    case "error":
      return { label: "Error", group: "issue", tone: "issue" };
    default:
      return {
        label: normalized ? normalized.replace(/_/g, " ") : "Sin estado",
        group: "other",
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

export function BrevoEventsClientPage() {
  const [rows, setRows] = useState<BrevoEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [emailInput, setEmailInput] = useState("");
  const [daysInput, setDaysInput] = useState("7");
  const [eventInput, setEventInput] = useState<EventType>("all");
  const [subjectInput, setSubjectInput] = useState<SubjectFilter>("all");

  const [emailFilter, setEmailFilter] = useState("");
  const [daysFilter, setDaysFilter] = useState(7);
  const [eventFilter, setEventFilter] = useState<EventType>("all");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(0);

  const canGoPrev = offset > 0;
  const canGoNext = offset + PAGE_SIZE < count;

  const summary = useMemo(() => {
    const bucket: Record<string, number> = {};
    for (const row of rows) {
      const key = String(row.event || "unknown").toLowerCase();
      bucket[key] = (bucket[key] ?? 0) + 1;
    }
    return Object.entries(bucket)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [rows]);

  const groupedSummary = useMemo(() => {
    const grouped = {
      delivery: 0,
      engagement: 0,
      issue: 0,
      other: 0,
    };

    for (const row of rows) {
      const meta = getEventMeta(row.event);
      grouped[meta.group] += 1;
    }

    return grouped;
  }, [rows]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getAuthToken();
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        days: String(daysFilter),
      });
      if (emailFilter.trim()) params.set("email", emailFilter.trim());
      if (eventFilter !== "all") params.set("event", eventFilter);
      if (subjectFilter !== "all") params.set("subjectType", subjectFilter);

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
  }, [daysFilter, emailFilter, eventFilter, subjectFilter, offset]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const applyFilters = () => {
    const d = Number(daysInput);
    const normalizedDays = Number.isFinite(d)
      ? Math.min(90, Math.max(1, Math.trunc(d)))
      : 7;
    setDaysInput(String(normalizedDays));
    setDaysFilter(normalizedDays);
    setEmailFilter(emailInput.trim());
    setEventFilter(eventInput);
    setSubjectFilter(subjectInput);
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estado de correos (Brevo)</h1>
        <p className="text-muted-foreground">
          Consulta si un email fue solicitado, entregado, abierto, rebotado o
          bloqueado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brevo-email-filter">Email destino</Label>
            <Input
              id="brevo-email-filter"
              placeholder="ejemplo@correo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brevo-days-filter">Últimos días</Label>
            <Input
              id="brevo-days-filter"
              type="number"
              min={1}
              max={90}
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Evento</Label>
            <Select
              value={eventInput}
              onValueChange={(v) => {
                const next = v as EventType;
                setEventInput(next);
                setEventFilter(next);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Evento" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              El filtro de evento se aplica automáticamente al seleccionarlo.
            </div>
          </div>

          <div className="space-y-2">
            <Label>Asunto</Label>
            <Select
              value={subjectInput}
              onValueChange={(v) => {
                const next = v as SubjectFilter;
                setSubjectInput(next);
                setSubjectFilter(next);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Asunto" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-5 flex flex-wrap items-center gap-2">
            <Button onClick={applyFilters} disabled={loading}>
              {loading ? "Consultando..." : "Aplicar filtros"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void loadEvents()}
              disabled={loading}
            >
              Recargar
            </Button>
            <Badge variant="outline">Total: {count}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen (página actual)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border bg-[hsl(var(--chart-2)/0.14)] p-3">
              <p className="text-xs text-muted-foreground">Entregabilidad</p>
              <p className="text-2xl font-semibold">
                {groupedSummary.delivery}
              </p>
            </div>
            <div className="rounded-md border bg-[hsl(var(--chart-1)/0.14)] p-3">
              <p className="text-xs text-muted-foreground">Interacción</p>
              <p className="text-2xl font-semibold">
                {groupedSummary.engagement}
              </p>
            </div>
            <div className="rounded-md border bg-[hsl(var(--chart-5)/0.14)] p-3">
              <p className="text-xs text-muted-foreground">Incidencias</p>
              <p className="text-2xl font-semibold">{groupedSummary.issue}</p>
            </div>
            <div className="rounded-md border bg-[hsl(var(--chart-4)/0.14)] p-3">
              <p className="text-xs text-muted-foreground">Otros</p>
              <p className="text-2xl font-semibold">{groupedSummary.other}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {summary.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Sin eventos para mostrar.
              </span>
            ) : (
              summary.map(([event, qty]) => {
                const meta = getEventMeta(event);
                return (
                  <Badge
                    key={event}
                    variant="outline"
                    className={toneClasses(meta.tone)}
                  >
                    {meta.label}: {qty}
                  </Badge>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leyenda de estados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {EVENT_LEGEND.map((item) => {
            const meta = getEventMeta(item.key);
            return (
              <div
                key={item.key}
                className="flex items-start gap-2 rounded-md border p-2"
              >
                <Badge variant="outline" className={toneClasses(meta.tone)}>
                  {meta.label}
                </Badge>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.meaning}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>ID mensaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      {loading
                        ? "Cargando eventos..."
                        : "No hay datos en este rango/filtro."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow key={`${row.messageId || "no-id"}-${idx}`}>
                      <TableCell>{formatDate(row.timestamp)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={toneClasses(getEventMeta(row.event).tone)}
                        >
                          {getEventMeta(row.event).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {row.email || "-"}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {row.subject || "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {row.messageId || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={!canGoPrev || loading}
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={!canGoNext || loading}
              onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
