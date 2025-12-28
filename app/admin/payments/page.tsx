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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  getPaymentByCodigo,
  getPayments,
  syncPaymentCliente,
  type PaymentRow,
} from "./api";
import { fetchUsers, type SysUser } from "../users/api";
import { toast } from "@/components/ui/use-toast";

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

function fixMojibake(value: string | null | undefined) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Heurística: típico mojibake UTF-8 interpretado como Latin-1 (Ã¡, Ã©, etc.)
  if (!/[ÃÂ�]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, (ch) => ch.charCodeAt(0));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const badBefore = (s.match(/[ÃÂ�]/g) || []).length;
    const badAfter = (decoded.match(/[ÃÂ�]/g) || []).length;
    if (decoded && decoded !== s && badAfter < badBefore) {
      // Si el backend ya entregó caracteres de reemplazo (�), no siempre es
      // reversible; aplicamos un fallback de correcciones comunes más abajo.
      if (!decoded.includes("�")) return decoded;
      return fixReplacementCharNames(decoded);
    }
  } catch {
    // noop
  }

  if (s.includes("�")) return fixReplacementCharNames(s);
  return s;
}

function fixReplacementCharNames(input: string) {
  // Cuando aparece "�" (U+FFFD), el byte original se perdió. Esto aplica un
  // set pequeño de arreglos comunes en nombres ES para mejorar la lectura.
  if (!input.includes("�")) return input;

  const rules: Array<[RegExp, string]> = [
    [/Encarnaci�n/gi, "Encarnación"],
    [/Mart�n\b/gi, "Martín"],
    [/Mart�nez\b/gi, "Martínez"],
    [/D�az\b/gi, "Díaz"],
    [/S�nchez\b/gi, "Sánchez"],
    [/Ram�rez\b/gi, "Ramírez"],
    [/Rodr�guez\b/gi, "Rodríguez"],
    [/Garc�a\b/gi, "García"],
    [/Hern�ndez\b/gi, "Hernández"],
    [/L�pez\b/gi, "López"],
    [/G�mez\b/gi, "Gómez"],
    [/Mu�oz\b/gi, "Muñoz"],
    [/Pe�a\b/gi, "Peña"],
    [/Nu�ez\b/gi, "Núñez"],
    [/Iba�ez\b/gi, "Ibáñez"],
  ];

  let out = input;
  for (const [re, rep] of rules) out = out.replace(re, rep);
  return out;
}

function getStatusVariant(
  status?: string | null
): "default" | "secondary" | "muted" | "outline" | "destructive" {
  const s = String(status || "").toLowerCase();
  if (!s) return "muted";
  // Colores tipo "semáforo" como en otras vistas
  if (s.includes("moro") || s.includes("venc")) return "destructive";
  if (
    s.includes("en_proceso") ||
    s.includes("en proceso") ||
    s.includes("progres") ||
    s.includes("pendien")
  )
    return "secondary";
  if (s.includes("listo") || s.includes("pagad") || s.includes("aprob"))
    return "default";
  if (s.includes("reembol") || s.includes("devuel") || s.includes("anul"))
    return "muted";
  if (s.includes("no_aplico") || s.includes("no aplico")) return "outline";
  return "outline";
}

function getStatusChipClass(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (!s)
    return "border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-900/60";

  // Pasteles (similar a tickets-board)
  if (s.includes("moro") || s.includes("venc"))
    return "border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/35 dark:text-red-200 dark:border-red-900/60";

  if (s.includes("reembol") || s.includes("devuel") || s.includes("anul"))
    return "border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/35 dark:text-purple-200 dark:border-purple-900/60";

  if (
    s.includes("en_proceso") ||
    s.includes("en proceso") ||
    s.includes("progres") ||
    s.includes("pendien")
  )
    return "border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/60";

  if (s.includes("listo") || s.includes("pagad") || s.includes("aprob"))
    return "border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60";

  if (s.includes("no_aplico") || s.includes("no aplico"))
    return "border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/35 dark:text-sky-200 dark:border-sky-900/60";

  return "border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-900/60";
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
    const reservaNum =
      reserva === null || reserva === undefined ? null : Number(reserva);
    const hasReserva =
      reservaNum !== null && !Number.isNaN(reservaNum) && reservaNum > 0;
    if (hasReserva) withReserva += 1;
    else withoutReserva += 1;

    const est = String(r?.estatus ?? "").toLowerCase();
    if (est.includes("reembol")) refunds += 1;

    const cuotas = r?.nro_cuotas;
    const cuotasNum =
      cuotas === null || cuotas === undefined ? null : Number(cuotas);
    if (cuotasNum !== null && !Number.isNaN(cuotasNum) && cuotasNum > 0) {
      totalCuotas += cuotasNum;
      countCuotas += 1;
    }
  }

  const avgCuotas = countCuotas ? totalCuotas / countCuotas : 0;
  return {
    totalPayments,
    withReserva,
    withoutReserva,
    refunds,
    totalCuotas,
    avgCuotas,
  };
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

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncPayment, setSyncPayment] = useState<PaymentRow | null>(null);
  const [syncUserSearch, setSyncUserSearch] = useState("");
  const debouncedSyncUserSearch = useDebouncedValue(syncUserSearch, 300);
  const [syncUsers, setSyncUsers] = useState<SysUser[]>([]);
  const [syncUsersLoading, setSyncUsersLoading] = useState(false);
  const [syncUsersError, setSyncUsersError] = useState<string | null>(null);
  const [syncUsersPage, setSyncUsersPage] = useState(1);
  const [syncUsersTotalPages, setSyncUsersTotalPages] = useState(1);

  const [syncSelectedUser, setSyncSelectedUser] = useState<SysUser | null>(
    null
  );
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncSaveError, setSyncSaveError] = useState<string | null>(null);

  const [onlyUnlinked, setOnlyUnlinked] = useState(false);

  const isPaymentSynced = (r: PaymentRow) => {
    const name = String(r?.cliente_nombre ?? "").trim();
    const code = String(r?.cliente_codigo ?? "").trim();
    // Regla: para considerar sincronizado, deben venir completos:
    // - cliente_nombre (no vacío)
    // - cliente_codigo que parezca un ID/código real (no un nombre)
    const looksLikeId = /[A-Za-z0-9_-]{6,}/.test(code);
    return !!name && !!code && looksLikeId;
  };

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
        montoMin: debouncedMontoMin.trim()
          ? Number(debouncedMontoMin)
          : undefined,
        montoMax: debouncedMontoMax.trim()
          ? Number(debouncedMontoMax)
          : undefined,
      } as const;

      const first = await getPayments({
        page: 1,
        pageSize: metricsPageSize,
        ...common,
      });
      if (metricsReqIdRef.current !== reqId) return;

      const totalPagesFromApi = Number(first?.totalPages ?? 1);
      const all: PaymentRow[] = Array.isArray(first?.data)
        ? [...first.data]
        : [];

      for (let p = 2; p <= totalPagesFromApi; p++) {
        const next = await getPayments({
          page: p,
          pageSize: metricsPageSize,
          ...common,
        });
        if (metricsReqIdRef.current !== reqId) return;
        if (Array.isArray(next?.data) && next.data.length) {
          all.push(...next.data);
        }
      }

      const min = debouncedReservaMin.trim()
        ? Number(debouncedReservaMin)
        : null;
      const max = debouncedReservaMax.trim()
        ? Number(debouncedReservaMax)
        : null;
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

    const withLinkFilter = onlyUnlinked
      ? withReserva.filter((r) => {
          return !isPaymentSynced(r);
        })
      : withReserva;

    return withLinkFilter;
  }, [rows, debouncedReservaMin, debouncedReservaMax, onlyUnlinked]);

  const unlinkedCount = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    let c = 0;
    for (const r of list) {
      if (!isPaymentSynced(r)) c += 1;
    }
    return c;
  }, [rows]);

  async function loadUsersList(next?: { page?: number }) {
    setSyncUsersLoading(true);
    setSyncUsersError(null);
    try {
      const p = next?.page ?? syncUsersPage;
      const res = await fetchUsers({
        page: p,
        pageSize: 25,
        search: debouncedSyncUserSearch.trim(),
      });
      const raw = Array.isArray(res?.data) ? res.data : [];
      const onlyAlumnos = raw.filter((u) => {
        const role = String(u?.role ?? "").toLowerCase();
        // Mostrar solo alumnos (excluir admin/equipo)
        return role === "alumno" || role === "student";
      });
      setSyncUsers(onlyAlumnos);
      setSyncUsersPage(Number(res?.page ?? p) || p);
      setSyncUsersTotalPages(Number(res?.totalPages ?? 1) || 1);
    } catch (e: any) {
      setSyncUsersError(e?.message || "No se pudieron cargar usuarios");
      setSyncUsers([]);
      setSyncUsersTotalPages(1);
    } finally {
      setSyncUsersLoading(false);
    }
  }

  function openSync(payment: PaymentRow) {
    if (isPaymentSynced(payment)) {
      toast({
        title: "Ya está sincronizado",
        description: `El pago ${payment.codigo} ya tiene usuario asociado.`,
      });
      return;
    }
    setSyncPayment(payment);
    setSyncSelectedUser(null);
    setSyncSaveError(null);
    setSyncUsersPage(1);
    setSyncOpen(true);
  }

  async function doSync() {
    if (!syncPayment || !syncSelectedUser) return;
    if (isPaymentSynced(syncPayment)) {
      toast({
        title: "Ya está sincronizado",
        description: `El pago ${syncPayment.codigo} ya tiene usuario asociado.`,
      });
      setSyncConfirmOpen(false);
      setSyncOpen(false);
      setSyncPayment(null);
      setSyncSelectedUser(null);
      return;
    }
    setSyncSaving(true);
    setSyncSaveError(null);
    try {
      const clienteCodigo = String(syncSelectedUser.codigo || "").trim();
      if (!clienteCodigo)
        throw new Error("El usuario seleccionado no tiene código");

      await syncPaymentCliente(syncPayment.codigo, clienteCodigo);

      // Optimistic update: reflejar en tabla inmediatamente
      setRows((prev) =>
        prev.map((r) => {
          if (r.codigo !== syncPayment.codigo) return r;
          return {
            ...r,
            cliente_codigo: clienteCodigo,
            cliente_nombre: fixMojibake(
              syncSelectedUser.name || syncSelectedUser.email || clienteCodigo
            ),
          };
        })
      );

      setSyncConfirmOpen(false);
      setSyncOpen(false);
      setSyncPayment(null);
      setSyncSelectedUser(null);

      toast({
        title: "Sincronización exitosa",
        description: `Pago ${syncPayment.codigo} → ${clienteCodigo}`,
      });
    } catch (e: any) {
      setSyncSaveError(e?.message || "No se pudo sincronizar");
      toast({
        title: "Error al sincronizar",
        description: e?.message || "No se pudo sincronizar",
        variant: "destructive",
      });
    } finally {
      setSyncSaving(false);
    }
  }

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

  useEffect(() => {
    if (!syncOpen) return;
    void loadUsersList({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncOpen, debouncedSyncUserSearch]);

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
              Calculadas sobre todos los pagos que coinciden con los filtros
              actuales.
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
            <div className="text-xs text-muted-foreground">
              Cuotas (promedio)
            </div>
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
            {unlinkedCount ? (
              <>
                {" "}
                · Sin sincronizar:{" "}
                <span className="text-foreground">{unlinkedCount}</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={onlyUnlinked ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyUnlinked((v) => !v)}
            >
              {onlyUnlinked ? "Viendo: sin sincronizar" : "Ver sin sincronizar"}
            </Button>
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
                <TableHead className="whitespace-nowrap">Acciones</TableHead>
                <TableHead className="whitespace-nowrap">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-sm text-muted-foreground"
                  >
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-sm text-muted-foreground"
                  >
                    Sin resultados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const clientName = fixMojibake(
                    r.cliente_nombre || r.cliente_codigo || "—"
                  );
                  const synced = isPaymentSynced(r);

                  return (
                    <TableRow
                      key={r.codigo}
                      className="cursor-pointer"
                      onClick={() => {
                        try {
                          console.debug("[payments] row selected", {
                            codigo: r.codigo,
                            synced,
                            cliente_codigo: fixMojibake(r.cliente_codigo),
                            cliente_nombre: fixMojibake(r.cliente_nombre),
                          });
                        } catch {}
                        openDetail(r.codigo);
                      }}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{clientName}</span>
                            {!synced ? (
                              <Badge variant="destructive">Sin usuario</Badge>
                            ) : null}
                          </div>
                          {r.cliente_nombre && r.cliente_codigo ? (
                            <span className="text-xs text-muted-foreground">
                              {fixMojibake(r.cliente_codigo)}
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
                        <Badge
                          variant="outline"
                          className={getStatusChipClass(r.estatus)}
                        >
                          {r.estatus || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {synced ? (
                          <Badge
                            variant="outline"
                            className="border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/60"
                          >
                            Sincronizado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/60 dark:hover:bg-amber-950/55"
                            onClick={() => openSync(r)}
                          >
                            Sincronizar
                          </Button>
                        )}
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
        open={syncOpen}
        onOpenChange={(open) => {
          setSyncOpen(open);
          if (!open) {
            setSyncPayment(null);
            setSyncSelectedUser(null);
            setSyncUserSearch("");
            setSyncUsers([]);
            setSyncUsersError(null);
            setSyncSaveError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Sincronizar pago con usuario</DialogTitle>
            <DialogDescription>
              {syncPayment
                ? `Pago: ${syncPayment.codigo}`
                : "Selecciona un pago para sincronizar."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Buscar usuario</Label>
              <Input
                placeholder="Nombre, email o código…"
                value={syncUserSearch}
                onChange={(e) => setSyncUserSearch(e.target.value)}
              />
            </div>

            {syncUsersError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{syncUsersError}</AlertDescription>
              </Alert>
            ) : null}

            {syncSaveError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{syncSaveError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-md border overflow-hidden">
              <ScrollArea className="h-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Código
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncUsersLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-sm text-muted-foreground"
                        >
                          Cargando usuarios…
                        </TableCell>
                      </TableRow>
                    ) : syncUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-sm text-muted-foreground"
                        >
                          Sin resultados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncUsers.map((u) => {
                        const isSelected = syncSelectedUser?.id === u.id;
                        const label =
                          u.name || u.email || u.codigo || "(sin nombre)";
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="text-sm font-medium">
                                  {fixMojibake(label)}
                                </div>
                                {u.email ? (
                                  <div className="text-xs text-muted-foreground">
                                    {u.email}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{u.role || "—"}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {fixMojibake(u.codigo || "—")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button
                                size="sm"
                                variant={isSelected ? "secondary" : "outline"}
                                onClick={() => setSyncSelectedUser(u)}
                              >
                                {isSelected ? "Seleccionado" : "Seleccionar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <div>
                Página <span className="text-foreground">{syncUsersPage}</span>/{" "}
                <span className="text-foreground">{syncUsersTotalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncUsersLoading || syncUsersPage <= 1}
                  onClick={() =>
                    loadUsersList({ page: Math.max(1, syncUsersPage - 1) })
                  }
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    syncUsersLoading || syncUsersPage >= syncUsersTotalPages
                  }
                  onClick={() =>
                    loadUsersList({
                      page: Math.min(syncUsersTotalPages, syncUsersPage + 1),
                    })
                  }
                >
                  Siguiente
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSyncOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!syncPayment || !syncSelectedUser}
                onClick={() => setSyncConfirmOpen(true)}
              >
                Confirmar sincronización
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar sincronización</AlertDialogTitle>
            <AlertDialogDescription>
              {syncPayment && syncSelectedUser
                ? `Esto asociará el pago ${
                    syncPayment.codigo
                  } al usuario ${fixMojibake(
                    syncSelectedUser.name ||
                      syncSelectedUser.email ||
                      syncSelectedUser.codigo
                  )}.`
                : "Selecciona un usuario para continuar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncSaving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={syncSaving || !syncPayment || !syncSelectedUser}
              onClick={(e) => {
                e.preventDefault();
                void doSync();
              }}
            >
              {syncSaving ? "Sincronizando…" : "Sí, sincronizar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      {fixMojibake(
                        detail.cliente_nombre || detail.cliente_codigo || "—"
                      )}
                    </div>
                    {detail.cliente_nombre && detail.cliente_codigo ? (
                      <div className="text-xs text-muted-foreground">
                        {fixMojibake(detail.cliente_codigo)}
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
                      <Badge
                        variant="outline"
                        className={getStatusChipClass(detail.estatus)}
                      >
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
                                <Badge
                                  variant="outline"
                                  className={getStatusChipClass(d.estatus)}
                                >
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
