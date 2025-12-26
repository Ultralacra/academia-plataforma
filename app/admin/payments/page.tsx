"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { getPaymentByCodigo, getPayments, type PaymentRow } from "./api";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

function formatMoney(
  amount: number | null | undefined,
  currency?: string | null
) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return "—";
  const curr = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${amount} ${curr}`;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getStatusVariant(
  status?: string | null
): "default" | "secondary" | "muted" | "outline" {
  const s = String(status || "").toLowerCase();
  if (!s) return "muted";
  // Colores neutrales: evitar rojo/alto contraste
  if (s.includes("moro")) return "outline";
  if (s.includes("en_proceso") || s.includes("en proceso")) return "secondary";
  if (s.includes("listo") || s.includes("pagad")) return "default";
  if (s.includes("reembol")) return "muted";
  if (s.includes("no_aplico") || s.includes("no aplico")) return "outline";
  return "outline";
}

type PaymentMetrics = {
  totalPayments: number;
  withReserva: number;
  withoutReserva: number;
  refunds: number;
  totalCuotas: number;
  avgCuotas: number;
};

function computePaymentMetrics(rows: PaymentRow[]): PaymentMetrics {
  const totalPayments = Array.isArray(rows) ? rows.length : 0;
  let withReserva = 0;
  let withoutReserva = 0;
  let refunds = 0;
  let totalCuotas = 0;
  let countCuotas = 0;

  for (const r of rows) {
    const reserva = r?.monto_reserva;
    const reservaNum = reserva === null || reserva === undefined ? null : Number(reserva);
    const hasReserva = reservaNum !== null && !Number.isNaN(reservaNum) && reservaNum > 0;
    if (hasReserva) withReserva += 1;
    else withoutReserva += 1;

    const est = String(r?.estatus ?? "").toLowerCase();
    if (est.includes("reembol")) refunds += 1;

    const cuotas = r?.nro_cuotas;
    const cuotasNum = cuotas === null || cuotas === undefined ? null : Number(cuotas);
    if (cuotasNum !== null && !Number.isNaN(cuotasNum) && cuotasNum > 0) {
      totalCuotas += cuotasNum;
      countCuotas += 1;
    }
  }

  const avgCuotas = countCuotas ? totalCuotas / countCuotas : 0;
  return { totalPayments, withReserva, withoutReserva, refunds, totalCuotas, avgCuotas };
}

function PaymentsContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [search, setSearch] = useState<string>("");
  const [clienteCodigo, setClienteCodigo] = useState<string>("");
  const [estatus, setEstatus] = useState<string>("");
  const [metodo, setMetodo] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [montoMin, setMontoMin] = useState<string>("");
  const [montoMax, setMontoMax] = useState<string>("");
  // Reserva no está en los query params indicados; lo filtramos localmente.
  const [reservaMin, setReservaMin] = useState<string>("");
  const [reservaMax, setReservaMax] = useState<string>("");

  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedClienteCodigo = useDebouncedValue(clienteCodigo, 350);
  const debouncedMetodo = useDebouncedValue(metodo, 350);
  const debouncedMontoMin = useDebouncedValue(montoMin, 350);
  const debouncedMontoMax = useDebouncedValue(montoMax, 350);
  const debouncedReservaMin = useDebouncedValue(reservaMin, 250);
  const debouncedReservaMax = useDebouncedValue(reservaMax, 250);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCodigo, setDetailCodigo] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const metricsReqIdRef = useRef(0);

  async function loadList(next?: { page?: number; pageSize?: number }) {
    setIsLoading(true);
    setError(null);
    try {
      const p = next?.page ?? page;
      const ps = next?.pageSize ?? pageSize;
      const json = await getPayments({
        page: p,
        pageSize: ps,
        search: debouncedSearch.trim() || undefined,
        cliente_codigo: debouncedClienteCodigo.trim() || undefined,
        estatus: estatus || undefined,
        metodo: debouncedMetodo.trim() || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        montoMin: debouncedMontoMin.trim()
          ? Number(debouncedMontoMin)
          : undefined,
        montoMax: debouncedMontoMax.trim()
          ? Number(debouncedMontoMax)
          : undefined,
      });
      setRows(Array.isArray(json?.data) ? json.data : []);
      setTotal(Number(json?.total ?? 0));
      setPage(Number(json?.page ?? p));
      setPageSize(Number(json?.pageSize ?? ps));
      setTotalPages(Number(json?.totalPages ?? 1));
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar pagos");
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMetrics() {
    const reqId = ++metricsReqIdRef.current;
    setMetricsLoading(true);
    setMetricsError(null);

    try {
      const metricsPageSize = 200;
      const common = {
        search: debouncedSearch.trim() || undefined,
        cliente_codigo: debouncedClienteCodigo.trim() || undefined,
        estatus: estatus || undefined,
        metodo: debouncedMetodo.trim() || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        montoMin: debouncedMontoMin.trim() ? Number(debouncedMontoMin) : undefined,
        montoMax: debouncedMontoMax.trim() ? Number(debouncedMontoMax) : undefined,
      } as const;

      const first = await getPayments({ page: 1, pageSize: metricsPageSize, ...common });
      if (metricsReqIdRef.current !== reqId) return;

      const totalPagesFromApi = Number(first?.totalPages ?? 1);
      const all: PaymentRow[] = Array.isArray(first?.data) ? [...first.data] : [];

      for (let p = 2; p <= totalPagesFromApi; p++) {
        const next = await getPayments({ page: p, pageSize: metricsPageSize, ...common });
        if (metricsReqIdRef.current !== reqId) return;
        if (Array.isArray(next?.data) && next.data.length) {
          all.push(...next.data);
        }
      }

      const min = debouncedReservaMin.trim() ? Number(debouncedReservaMin) : null;
      const max = debouncedReservaMax.trim() ? Number(debouncedReservaMax) : null;
      const allWithReservaFilter = all.filter((r) => {
        if (min === null && max === null) return true;
        const amount = r.monto_reserva ?? null;
        if (amount === null || Number.isNaN(Number(amount))) return false;
        if (min !== null && Number(amount) < min) return false;
        if (max !== null && Number(amount) > max) return false;
        return true;
      });

      setMetrics(computePaymentMetrics(allWithReservaFilter));
    } catch (e: any) {
      setMetrics(null);
      setMetricsError(e?.message || "No se pudieron calcular las métricas");
    } finally {
      if (metricsReqIdRef.current === reqId) setMetricsLoading(false);
    }
  }

  async function openDetail(codigo: string) {
    const safe = String(codigo || "").trim();
    if (!safe) return;
    setDetailCodigo(safe);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const json = await getPaymentByCodigo(safe);
      setDetail(json?.data ?? null);
    } catch (e: any) {
      setDetailError(e?.message || "No se pudo cargar el detalle");
    } finally {
      setDetailLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const base = Array.isArray(rows) ? rows.slice() : [];
    const min = debouncedReservaMin.trim() ? Number(debouncedReservaMin) : null;
    const max = debouncedReservaMax.trim() ? Number(debouncedReservaMax) : null;

    const withReserva = base.filter((r) => {
      if (min === null && max === null) return true;
      const amount = r.monto_reserva ?? null;
      if (amount === null || Number.isNaN(Number(amount))) return false;
      if (min !== null && Number(amount) < min) return false;
      if (max !== null && Number(amount) > max) return false;
      return true;
    });

    withReserva.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return withReserva;
  }, [rows, debouncedReservaMin, debouncedReservaMax]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const v = String(r?.estatus ?? "").trim();
      if (v) set.add(v);
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    if (estatus && !arr.includes(estatus)) arr.unshift(estatus);
    return arr;
  }, [rows, estatus]);

  useEffect(() => {
    // Carga inicial
    void loadList({ page: 1, pageSize: 25 });
    void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto aplicar filtros (sin botón)
  useEffect(() => {
    // Cuando cambian los filtros, volvemos a página 1
    void loadList({ page: 1, pageSize });
    void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageSize,
    estatus,
    fechaDesde,
    fechaHasta,
    debouncedSearch,
    debouncedMetodo,
    debouncedMontoMin,
    debouncedMontoMax,
    debouncedReservaMin,
    debouncedReservaMax,
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de pagos (lista + detalle)
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Métricas</div>
            <div className="text-xs text-muted-foreground">
              Calculadas sobre todos los pagos que coinciden con los filtros actuales.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={metricsLoading}
            onClick={() => loadMetrics()}
          >
            {metricsLoading ? "Calculando…" : "Recalcular"}
          </Button>
        </div>

        {metricsError ? (
          <div className="mt-3">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{metricsError}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Con reserva</div>
            <div className="text-sm font-semibold">
              {metricsLoading ? "…" : metrics?.withReserva ?? "—"}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Sin reserva</div>
            <div className="text-sm font-semibold">
              {metricsLoading ? "…" : metrics?.withoutReserva ?? "—"}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Reembolsos</div>
            <div className="text-sm font-semibold">
              {metricsLoading ? "…" : metrics?.refunds ?? "—"}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Cuotas (total)</div>
            <div className="text-sm font-semibold">
              {metricsLoading ? "…" : metrics?.totalCuotas ?? "—"}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Cuotas (promedio)</div>
            <div className="text-sm font-semibold">
              {metricsLoading
                ? "…"
                : metrics
                  ? metrics.avgCuotas.toFixed(2)
                  : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="grid gap-1">
              <Label>Buscar</Label>
              <Input
                placeholder="Nombre, código, estatus, moneda…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label>Cliente código</Label>
              <Input
                placeholder="KrTVx8TnoVSUcFZn"
                value={clienteCodigo}
                onChange={(e) => setClienteCodigo(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label>Estatus</Label>
              <Select
                value={estatus || "__ALL__"}
                onValueChange={(v) => {
                  setEstatus(v === "__ALL__" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Todos</SelectItem>
                  {statusOptions.length ? (
                    statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="LISTO">LISTO</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Método</Label>
              <Input
                placeholder="Transferencia / Tarjeta…"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => loadList({ page: 1, pageSize })}
              disabled={isLoading}
            >
              {isLoading ? "Cargando…" : "Aplicar"}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="grid gap-1 md:col-span-1">
            <Label>Fecha desde</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="grid gap-1 md:col-span-1">
            <Label>Fecha hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <div className="grid gap-1 md:col-span-1">
            <Label>Monto min</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={montoMin}
              onChange={(e) => setMontoMin(e.target.value)}
            />
          </div>
          <div className="grid gap-1 md:col-span-1">
            <Label>Monto max</Label>
            <Input
              inputMode="numeric"
              placeholder="5000"
              value={montoMax}
              onChange={(e) => setMontoMax(e.target.value)}
            />
          </div>
          <div className="grid gap-1 md:col-span-1">
            <Label>Reserva min</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={reservaMin}
              onChange={(e) => setReservaMin(e.target.value)}
            />
          </div>
          <div className="grid gap-1 md:col-span-1">
            <Label>Reserva max</Label>
            <Input
              inputMode="numeric"
              placeholder="2000"
              value={reservaMax}
              onChange={(e) => setReservaMax(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div>
            Total: <span className="text-foreground">{total}</span> · Página:{" "}
            <span className="text-foreground">
              {page}/{totalPages}
            </span>
            {rows.length ? (
              <>
                {" "}
                · Cargados:{" "}
                <span className="text-foreground">{rows.length}</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || page <= 1}
              onClick={() =>
                loadList({ page: Math.max(1, page - 1), pageSize })
              }
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || page >= totalPages}
              onClick={() =>
                loadList({ page: Math.min(totalPages, page + 1), pageSize })
              }
            >
              Siguiente
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="whitespace-nowrap">Monto</TableHead>
                <TableHead className="whitespace-nowrap">Reserva</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="whitespace-nowrap">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-sm text-muted-foreground"
                  >
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-sm text-muted-foreground"
                  >
                    Sin resultados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const clientName = r.cliente_nombre || r.cliente_codigo || "—";
                  return (
                    <TableRow
                      key={r.codigo}
                      className="cursor-pointer"
                      onClick={() => openDetail(r.codigo)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{clientName}</span>
                          {r.cliente_nombre && r.cliente_codigo ? (
                            <span className="text-xs text-muted-foreground">
                              {r.cliente_codigo}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMoney(r.monto, r.moneda)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMoney(r.monto_reserva, r.moneda)}
                      </TableCell>
                      <TableCell>{r.moneda || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(r.estatus)}>
                          {r.estatus || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailCodigo(null);
            setDetail(null);
            setDetailError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalle de pago</DialogTitle>
            <DialogDescription>
              {detailCodigo ? `Código: ${detailCodigo}` : ""}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 pr-2">
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">
                Cargando detalle…
              </div>
            ) : detailError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{detailError}</AlertDescription>
              </Alert>
            ) : !detail ? (
              <div className="text-sm text-muted-foreground">Sin detalle.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Cliente</div>
                    <div className="text-sm font-medium">
                      {detail.cliente_nombre || detail.cliente_codigo || "—"}
                    </div>
                    {detail.cliente_nombre && detail.cliente_codigo ? (
                      <div className="text-xs text-muted-foreground">
                        {detail.cliente_codigo}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Monto</div>
                    <div className="text-sm font-medium">
                      {formatMoney(detail.monto, detail.moneda)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Reserva:{" "}
                      {formatMoney(detail.monto_reserva, detail.moneda)}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Estatus</div>
                    <div className="mt-1">
                      <Badge variant={getStatusVariant(detail.estatus)}>
                        {detail.estatus || "—"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Creado: {formatDateTime(detail.created_at)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">
                      Nro. cuotas
                    </div>
                    <div className="text-sm font-medium">
                      {detail.nro_cuotas ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Método</div>
                    <div className="text-sm font-medium">
                      {detail.metodo || "—"}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">
                      Referencia
                    </div>
                    <div className="text-sm font-medium">
                      {detail.referencia || "—"}
                    </div>
                  </div>
                </div>

                {detail.notas ? (
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Notas</div>
                    <div className="text-sm">{detail.notas}</div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Detalles</div>
                    <div className="text-xs text-muted-foreground">
                      {Array.isArray(detail.detalles)
                        ? detail.detalles.length
                        : 0}{" "}
                      items
                    </div>
                  </div>
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuota</TableHead>
                          <TableHead className="whitespace-nowrap">
                            Monto
                          </TableHead>
                          <TableHead>Estatus</TableHead>
                          <TableHead className="whitespace-nowrap">
                            Fecha pago
                          </TableHead>
                          <TableHead>Concepto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(detail.detalles) &&
                        detail.detalles.length ? (
                          detail.detalles.map((d: any) => (
                            <TableRow key={d.codigo || d.id}>
                              <TableCell className="font-medium">
                                {d.cuota_codigo || "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatMoney(
                                  d.monto,
                                  d.moneda || detail.moneda
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(d.estatus)}>
                                  {d.estatus || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDateTime(d.fecha_pago)}
                              </TableCell>
                              <TableCell>{d.concepto || "—"}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-sm text-muted-foreground"
                            >
                              Sin detalles.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "equipo"]}>
      <DashboardLayout>
        <PaymentsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
