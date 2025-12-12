"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";

// Kill switch temporal para desactivar SSE por completo
const SSE_TEMP_DISABLED = false;

export interface SseNotificationItem {
  id: string;
  title: string;
  at?: string;
  unread?: boolean;
  raw?: any;
  type?: string;
}

interface SseNotificationsContextValue {
  items: SseNotificationItem[];
  unread: number;
  connected: boolean; // estado actual de la conexión SSE
  disabled: boolean; // si está deshabilitado (ej. en /login)
  lastReceived: SseNotificationItem | null;
  markAllRead: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  clear: () => void;
}

const SseNotificationsContext =
  createContext<SseNotificationsContextValue | null>(null);

export function SseNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hookValue = useProvideSseNotifications();
  return (
    <SseNotificationsContext.Provider value={hookValue}>
      {children}
    </SseNotificationsContext.Provider>
  );
}

export function useSseNotifications() {
  const ctx = useContext(SseNotificationsContext);
  if (!ctx) throw new Error("useSseNotifications must be used within provider");
  return ctx;
}

function useProvideSseNotifications(): SseNotificationsContextValue {
  const [items, setItems] = useState<SseNotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastReceived, setLastReceived] = useState<SseNotificationItem | null>(
    null
  );
  const [hasMore, setHasMore] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);
  const retryRef = useRef<number>(0);
  const failuresRef = useRef<number>(0); // fallos consecutivos (para backoff)
  const connectedRef = useRef<boolean>(false);
  const bufferRef = useRef<string>("");
  const startedRef = useRef<boolean>(false);
  // Permitir conexión también en /login según nuevo requerimiento
  const disabled = SSE_TEMP_DISABLED;
  const bootstrappedRef = useRef<boolean>(false);
  const refreshInFlightRef = useRef<boolean>(false);
  const pagingOffsetRef = useRef<number>(0);

  const mapNotif = useCallback((src: any): SseNotificationItem => {
    const id = String(src?.id ?? src?.uuid ?? src?.code ?? Math.random());
    const type = String(src?.type ?? src?.event ?? "notification");
    const nombre = src?.payload?.ticket?.nombre ?? src?.ticket?.nombre;
    const action = src?.payload?.action ?? src?.action;
    const title =
      type === "ticket.updated"
        ? "Ticket actualizado"
        : type === "ticket.created" && nombre
        ? `Ticket creado · ${nombre}`
        : type === "ticket.created"
        ? "Ticket creado"
        : action
        ? String(type)
        : String(
            src?.title ?? src?.message ?? src?.descripcion ?? "Notificación"
          );
    const at =
      src?.at ||
      src?.created_at ||
      src?.fecha ||
      src?.timestamp ||
      new Date().toISOString();
    const isReadRaw =
      src?.is_read ?? src?.read ?? src?.readed ?? src?.leida ?? src?.visto;
    const isRead = Boolean(isReadRaw);
    return { id, title, at, unread: !isRead, raw: src, type };
  }, []);

  const refresh = useCallback(async () => {
    if (disabled) return;
    const token = getAuthToken();
    if (!token) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const limit = 10;
      const offset = 0;
      const url = buildUrl(`/notifications?limit=${limit}&offset=${offset}`);
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => ({}));
      const arr: any[] = Array.isArray((json as any)?.data)
        ? (json as any).data
        : Array.isArray(json)
        ? (json as any)
        : [];
      const mapped: SseNotificationItem[] = arr.map(mapNotif);
      pagingOffsetRef.current = mapped.length;
      setHasMore(mapped.length === limit);
      setItems((prev) => {
        const byId = new Map(prev.map((x) => [x.id, x] as const));
        mapped.forEach((m) => byId.set(m.id, m));
        const list = Array.from(byId.values()).sort((a, b) => {
          const ta = Date.parse(String(a.at || "")) || 0;
          const tb = Date.parse(String(b.at || "")) || 0;
          return tb - ta;
        });
        return list.slice(0, 200);
      });
      setUnread(mapped.reduce((acc, it) => acc + (it.unread ? 1 : 0), 0));
    } catch (e) {
      try {
        console.warn("[SSE] fallo al refrescar notificaciones REST", e);
      } catch {}
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [disabled, mapNotif]);

  const loadMore = useCallback(async () => {
    if (disabled) return;
    if (!hasMore) return;
    const token = getAuthToken();
    if (!token) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const limit = 15;
      const offset = pagingOffsetRef.current || 0;
      const url = buildUrl(`/notifications?limit=${limit}&offset=${offset}`);
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => ({}));
      const arr: any[] = Array.isArray((json as any)?.data)
        ? (json as any).data
        : Array.isArray(json)
        ? (json as any)
        : [];
      const mapped: SseNotificationItem[] = arr.map(mapNotif);
      pagingOffsetRef.current = offset + mapped.length;
      setHasMore(mapped.length === limit);

      setItems((prev) => {
        const byId = new Map(prev.map((x) => [x.id, x] as const));
        mapped.forEach((m) => byId.set(m.id, m));
        const list = Array.from(byId.values()).sort((a, b) => {
          const ta = Date.parse(String(a.at || "")) || 0;
          const tb = Date.parse(String(b.at || "")) || 0;
          return tb - ta;
        });
        return list.slice(0, 200);
      });
      setUnread((prevUnread) => {
        const addedUnread = mapped.reduce(
          (acc, it) => acc + (it.unread ? 1 : 0),
          0
        );
        return Math.max(0, prevUnread + addedUnread);
      });
    } catch (e) {
      try {
        console.warn("[SSE] fallo al cargar más notificaciones", e);
      } catch {}
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [disabled, hasMore, mapNotif]);

  const parseEventBlocks = useCallback((chunk: string) => {
    bufferRef.current += chunk;
    let sepIndex: number;
    // Procesar eventos separados por doble salto de línea
    while ((sepIndex = bufferRef.current.indexOf("\n\n")) !== -1) {
      const block = bufferRef.current.slice(0, sepIndex).trim();
      bufferRef.current = bufferRef.current.slice(sepIndex + 2);
      if (!block) continue;
      let dataLines: string[] = [];
      const lines = block.split(/\n/);
      for (const ln of lines) {
        if (ln.startsWith("data:")) dataLines.push(ln.slice(5).trim());
      }
      if (!dataLines.length) continue;
      const dataStr = dataLines.join("\n");
      try {
        const json = JSON.parse(dataStr);
        const base = mapNotif(json);
        const id = String(
          base.id ||
            json.id ||
            Date.now() + "-" + Math.random().toString(36).slice(2, 8)
        );
        const title = base.title;
        const at = base.at;
        const type = base.type;
        setItems((prev) => {
          if (prev.some((it) => it.id === id)) return prev; // evitar duplicados
          const next = [
            { id, title, at, unread: true, raw: json, type },
            ...prev,
          ].slice(0, 200);
          return next;
        });
        setUnread((u) => u + 1);
        // Exponer el último evento recibido vía SSE (para snacks/toasts)
        setLastReceived({ id, title, at, unread: true, raw: json, type });
        try {
          console.log("[SSE] evento recibido", { id, title, at, raw: json });
        } catch {}
      } catch (e) {
        try {
          console.warn("[SSE] error parseando evento", e, dataStr);
        } catch {}
      }
    }
  }, []);

  const start = useCallback(() => {
    // Evitar múltiples inicios: solo una conexión activa
    if (startedRef.current && connectedRef.current) return;
    if (disabled) {
      // Si está deshabilitado (login), aseguramos desconexión
      try {
        controllerRef.current?.abort();
      } catch {}
      connectedRef.current = false;
      setConnected(false);
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    // Abortar conexión previa
    try {
      controllerRef.current?.abort();
    } catch {}
    controllerRef.current = new AbortController();
    const signal = controllerRef.current.signal;
    // buildUrl ya aplica el prefijo /v1; aquí va la ruta sin duplicarlo
    const url = buildUrl("/notifications/sse");
    connectedRef.current = false;
    startedRef.current = true;
    retryRef.current += 1;
    const attempt = retryRef.current;
    try {
      console.log("[SSE] iniciando conexión", { attempt, url });
    } catch {}

    (async () => {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }
        connectedRef.current = true;
        setConnected(true);
        // Conexión exitosa: resetear fallos consecutivos para evitar backoff largo tras un corte aislado.
        failuresRef.current = 0;
        try {
          console.log("[SSE] conectado", { attempt });
        } catch {}
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          parseEventBlocks(text);
        }
        // Si terminamos el stream sin abort manual, reconectar
        if (!signal.aborted) {
          connectedRef.current = false;
          setConnected(false);
          try {
            console.log("[SSE] stream finalizado, reconectando...");
          } catch {}
          setTimeout(() => start(), 1500);
        }
      } catch (e: any) {
        if (signal.aborted) return; // cerrado manual
        connectedRef.current = false;
        setConnected(false);
        // Backoff basado en fallos consecutivos (no en el total histórico de intentos)
        failuresRef.current += 1;
        const consecutive = failuresRef.current;
        const msg = String(e?.message || e || "");
        // Si es auth, no reintentar agresivamente
        const isAuth = msg.includes("HTTP 401") || msg.includes("HTTP 403");
        const backoff = isAuth
          ? 15000
          : Math.min(8000, 500 + consecutive * 750);
        try {
          console.warn("[SSE] error de conexión", e?.message || e);
        } catch {}
        setTimeout(() => start(), backoff);
      }
    })();
  }, [parseEventBlocks, disabled]);

  // Cargar notificaciones iniciales del usuario (REST) una sola vez
  useEffect(() => {
    if (disabled) return;
    if (bootstrappedRef.current) return;
    const token = getAuthToken();
    if (!token) return;
    bootstrappedRef.current = true;
    refresh();
  }, [disabled]);

  // Auto iniciar una sola vez cuando hay token
  useEffect(() => {
    if (disabled) return;
    const token = getAuthToken();
    if (token && !connectedRef.current) start();
  }, [start, disabled]);

  const markAllRead = useCallback(() => {
    // Disparar petición al backend y actualizar localmente
    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const ids = items
            .filter((it) => it.unread)
            .map((it) => Number.parseInt(String(it.id), 10))
            .filter((n) => Number.isFinite(n));
          if (!ids.length) return;
          const url = buildUrl(`/notifications/mark-read`);
          await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
          }).catch(() => undefined);
        }
      } catch {}
    })();
    setItems((prev) => prev.map((it) => ({ ...it, unread: false })));
    setUnread(0);
  }, [items]);

  const clear = useCallback(() => {
    setItems([]);
    setUnread(0);
    setLastReceived(null);
    setHasMore(true);
    pagingOffsetRef.current = 0;
  }, []);

  return {
    items,
    unread,
    connected,
    disabled: !!disabled,
    lastReceived,
    markAllRead,
    refresh,
    loadMore,
    hasMore,
    clear,
  };
}
