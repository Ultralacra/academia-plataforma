"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getPaymentCuotas,
  type PaymentCuotaRow,
} from "@/app/admin/payments/api";
import { AlertTriangle } from "lucide-react";

export type PaymentDueItem = {
  key: string;
  cliente_codigo: string | null;
  cliente_nombre: string | null;
  cuota_codigo: string | null;
  payment_codigo: string | null;
  estatus: string | null;
  fecha_pago: string | null;
  daysLeft: number;
  monto: number | null;
  moneda: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getWindowRange(
  now: Date,
  pastDaysWindow: number,
  futureDaysWindow: number,
) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - pastDaysWindow);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + futureDaysWindow);
  return { fechaDesde: toIsoDate(start), fechaHasta: toIsoDate(end) };
}

function parseDateSmart(raw: string): Date | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, y, mm, dd] = m;
    const d = new Date(Number(y), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateShort(raw: string | null) {
  if (!raw) return "";
  const d = parseDateSmart(raw);
  if (!d) return String(raw);
  try {
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(from: Date, to: Date) {
  const ms = dateOnly(to).getTime() - dateOnly(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function isPaidStatus(raw: unknown) {
  const s = String(raw ?? "").toLowerCase();
  if (!s) return false;
  return (
    s.includes("pagad") ||
    s.includes("listo") ||
    s.includes("reembol") ||
    s.includes("no_aplica") ||
    s.includes("fallid")
  );
}

function makeClientKey(r: PaymentCuotaRow) {
  const cc = String(r?.cliente_codigo ?? "").trim();
  if (cc) return `cliente:${cc}`;
  const cn = String(r?.cliente_nombre ?? "").trim();
  if (cn) return `nombre:${cn}`;
  const pc = String(r?.payment_codigo ?? "").trim();
  if (pc) return `payment:${pc}`;
  const id = String(r?.id ?? "").trim();
  return id ? `id:${id}` : "unknown";
}

function storageKeyForToday(todayIso: string) {
  return `payments:cuotas:due:shown:${todayIso}`;
}

function autoShownKeyForToday(todayIso: string) {
  return `payments:cuotas:due:autoShown:${todayIso}`;
}

function loadShownSet(todayIso: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKeyForToday(todayIso));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x ?? "").trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveShownSet(todayIso: string, set: Set<string>) {
  try {
    window.localStorage.setItem(
      storageKeyForToday(todayIso),
      JSON.stringify(Array.from(set)),
    );
  } catch {
    // ignore
  }
}

function getAutoShownToday(todayIso: string): boolean {
  try {
    return window.localStorage.getItem(autoShownKeyForToday(todayIso)) === "1";
  } catch {
    return false;
  }
}

function setAutoShownToday(todayIso: string) {
  try {
    window.localStorage.setItem(autoShownKeyForToday(todayIso), "1");
  } catch {
    // ignore
  }
}

export function usePaymentDueNotifications(opts: {
  enabled: boolean;
  daysWindow?: number;
  pastDaysWindow?: number;
  futureDaysWindow?: number;
}) {
  const { toast } = useToast();
  const futureDaysWindow =
    typeof opts.futureDaysWindow === "number"
      ? opts.futureDaysWindow
      : typeof opts.daysWindow === "number"
        ? opts.daysWindow
        : 5;
  const pastDaysWindow =
    typeof opts.pastDaysWindow === "number" ? opts.pastDaysWindow : 10;

  const [items, setItems] = useState<PaymentDueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef<PaymentDueItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const lastFetchRef = useRef<number>(0);
  const inflightRef = useRef(false);

  const computeDueItems = useCallback(
    (rows: PaymentCuotaRow[], now: Date) => {
      const today = dateOnly(now);
      const byClient = new Map<string, PaymentDueItem>();

      for (const r of rows) {
        if (isPaidStatus(r?.estatus)) continue;
        const fecha = r?.fecha_pago ? String(r.fecha_pago) : "";
        const due = fecha ? parseDateSmart(fecha) : null;
        if (!due) continue;

        const daysLeft = diffDays(today, due);
        if (daysLeft < -pastDaysWindow || daysLeft > futureDaysWindow) continue;

        const key = makeClientKey(r);
        const cand: PaymentDueItem = {
          key,
          cliente_codigo: r?.cliente_codigo ?? null,
          cliente_nombre: r?.cliente_nombre ?? null,
          cuota_codigo: r?.cuota_codigo ?? null,
          payment_codigo: r?.payment_codigo ?? null,
          estatus: r?.estatus ?? null,
          fecha_pago: r?.fecha_pago ?? null,
          daysLeft,
          monto: r?.monto ?? null,
          moneda: r?.moneda ?? null,
        };

        const prev = byClient.get(key);
        if (!prev || cand.daysLeft < prev.daysLeft) byClient.set(key, cand);
      }

      return Array.from(byClient.values()).sort(
        (a, b) => a.daysLeft - b.daysLeft,
      );
    },
    [futureDaysWindow, pastDaysWindow],
  );

  const fetchDue = useCallback(async () => {
    if (!opts.enabled) return;
    if (inflightRef.current) return;

    inflightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const range = getWindowRange(now, pastDaysWindow, futureDaysWindow);

      const pageSize = 200;
      const first = await getPaymentCuotas({
        fechaDesde: range.fechaDesde,
        fechaHasta: range.fechaHasta,
        page: 1,
        pageSize,
      });

      const all: PaymentCuotaRow[] = Array.isArray(first?.data)
        ? [...first.data]
        : [];
      const totalPages = Number(first?.totalPages ?? 1) || 1;

      // safety: evitar loops infinitos
      for (let page = 2; page <= totalPages && page <= 50; page += 1) {
        const next = await getPaymentCuotas({
          fechaDesde: range.fechaDesde,
          fechaHasta: range.fechaHasta,
          page,
          pageSize,
        });
        const rows = Array.isArray(next?.data) ? next.data : [];
        all.push(...rows);
      }

      const due = computeDueItems(all, now);
      itemsRef.current = due;
      setItems(due);
      lastFetchRef.current = Date.now();
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las cuotas");
      itemsRef.current = [];
      setItems([]);
    } finally {
      inflightRef.current = false;
      setLoading(false);
    }
  }, [computeDueItems, futureDaysWindow, opts.enabled, pastDaysWindow]);

  const showSnackbars = useCallback(
    async (mode: "new" | "all") => {
      if (!opts.enabled) return;
      const now = new Date();
      const todayIso = toIsoDate(now);
      const shown = loadShownSet(todayIso);

      const list = (itemsRef.current || []).filter((it) => {
        if (mode === "all") return true;
        return !shown.has(it.key);
      });

      if (list.length === 0) return;

      // Mostrar 1 por 1 (en esta app el TOAST_LIMIT es 1), con un tope para no spamear.
      const maxToasts = 8;
      const slice = list.slice(0, maxToasts);

      for (let i = 0; i < slice.length; i += 1) {
        const it = slice[i];
        const nombre = String(it.cliente_nombre ?? "").trim();
        const codigo = String(it.cliente_codigo ?? "").trim();
        const who = nombre || codigo || "Usuario";

        const when =
          it.daysLeft < 0
            ? `hace ${Math.abs(it.daysLeft)} día(s)`
            : it.daysLeft === 0
              ? "hoy"
              : `en ${it.daysLeft} día(s)`;
        const fecha = it.fecha_pago
          ? formatDateShort(String(it.fecha_pago))
          : "";

        toast({
          description: (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug opacity-100">
                  Cuota pendiente
                </div>
                <div className="text-sm text-foreground/80">
                  {it.daysLeft < 0 ? `${who} venció` : `${who} vence`} {when}
                  {fecha ? ` (${fecha})` : ""}
                </div>
              </div>
            </div>
          ),
          variant: "default",
          className: "border-l-4 border-l-primary",
        });

        shown.add(it.key);
        saveShownSet(todayIso, shown);

        // esperar un poco antes del siguiente para que se alcance a leer
        // (el toast se auto-remueve a los ~4s por config global)
        await new Promise((r) => setTimeout(r, 4200));
      }

      const remaining = list.length - slice.length;
      if (remaining > 0) {
        toast({
          description: (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug opacity-100">
                  Más cuotas pendientes
                </div>
                <div className="text-sm text-foreground/80">
                  Hay {remaining} usuario(s) más con cuotas por vencer o ya
                  vencidas.
                </div>
              </div>
            </div>
          ),
          variant: "default",
          className: "border-l-4 border-l-primary",
        });
      }
    },
    [opts.enabled, toast],
  );

  // Auto-load + auto-snackbars (solo una vez por sesión/día gracias al storage)
  const bootRef = useRef(false);
  useEffect(() => {
    if (!opts.enabled) return;
    if (bootRef.current) return;
    bootRef.current = true;

    (async () => {
      await fetchDue();
    })();
  }, [fetchDue, opts.enabled]);

  useEffect(() => {
    if (!opts.enabled) return;
    if (loading) return;

    if (!items.length) return;
    if (typeof window === "undefined") return;

    const todayIso = toIsoDate(new Date());
    if (getAutoShownToday(todayIso)) return;

    // Solo 1 vez por día al iniciar sesión.
    setAutoShownToday(todayIso);
    showSnackbars("new");
  }, [items, loading, opts.enabled, showSnackbars]);

  const dueCount = items.length;

  const refresh = useCallback(async () => {
    // throttle: si refrescas muy seguido, no volver a pegarle al backend
    const ageMs = Date.now() - lastFetchRef.current;
    if (ageMs < 30_000) return;
    await fetchDue();
  }, [fetchDue]);

  const unreadCount = useMemo(() => {
    if (!opts.enabled) return 0;
    const todayIso = toIsoDate(new Date());
    const shown =
      typeof window !== "undefined"
        ? loadShownSet(todayIso)
        : new Set<string>();
    return items.filter((it) => !shown.has(it.key)).length;
  }, [items, opts.enabled]);

  return {
    items,
    dueCount,
    unreadCount,
    loading,
    error,
    refresh,
    showAllSnackbars: () => showSnackbars("all"),
  };
}
