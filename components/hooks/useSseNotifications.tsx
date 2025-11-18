"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { buildUrl } from "@/lib/api-config";

export interface SseNotificationItem {
  id: string;
  title: string;
  at?: string;
  unread?: boolean;
  raw?: any;
}

interface SseNotificationsContextValue {
  items: SseNotificationItem[];
  unread: number;
  connected: boolean; // estado actual de la conexión SSE
  disabled: boolean; // si está deshabilitado (ej. en /login)
  markAllRead: () => void;
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
  const controllerRef = useRef<AbortController | null>(null);
  const retryRef = useRef<number>(0);
  const connectedRef = useRef<boolean>(false);
  const bufferRef = useRef<string>("");
  const pathname = usePathname();
  const disabled = pathname?.startsWith("/login");
  const bootstrappedRef = useRef<boolean>(false);

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
        const id = String(
          json.id ??
            json.uuid ??
            json.code ??
            Date.now() + "-" + Math.random().toString(36).slice(2, 8)
        );
        const title = String(
          json.title ??
            json.message ??
            json.descripcion ??
            json.event ??
            "Notificación"
        );
        const at =
          json.at || json.fecha || json.timestamp || new Date().toISOString();
        setItems((prev) => {
          if (prev.some((it) => it.id === id)) return prev; // evitar duplicados
          const next = [
            { id, title, at, unread: true, raw: json },
            ...prev,
          ].slice(0, 200);
          return next;
        });
        setUnread((u) => u + 1);
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
    const url = buildUrl("/notifications/sse");
    connectedRef.current = false;
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
        const backoff = Math.min(30000, attempt * 1500);
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
    (async () => {
      try {
        const url = buildUrl(`/notifications?limit=50&offset=0`);
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
        const mapped: SseNotificationItem[] = arr.map((r: any) => {
          const id = String(r.id ?? r.uuid ?? r.code ?? Math.random());
          const title = String(
            r.title ?? r.message ?? r.descripcion ?? r.subject ?? "Notificación"
          );
          const at =
            r.at ||
            r.created_at ||
            r.fecha ||
            r.timestamp ||
            new Date().toISOString();
          const read = Boolean(r.read ?? r.readed ?? r.leida ?? r.visto);
          return {
            id,
            title,
            at,
            unread: !read,
            raw: r,
          } as SseNotificationItem;
        });
        setItems((prev) => {
          const byId = new Map(prev.map((x) => [x.id, x] as const));
          mapped.forEach((m) => {
            if (!byId.has(m.id)) byId.set(m.id, m);
          });
          // Ordenar por fecha desc, limitar a 200
          const list = Array.from(byId.values()).sort((a, b) => {
            const ta = Date.parse(String(a.at || "")) || 0;
            const tb = Date.parse(String(b.at || "")) || 0;
            return tb - ta;
          });
          return list.slice(0, 200);
        });
        setUnread((prev) => {
          const extra = mapped.reduce(
            (acc, it) => acc + (it.unread ? 1 : 0),
            0
          );
          return Math.max(0, prev + extra);
        });
      } catch (e) {
        try {
          console.warn("[SSE] fallo al cargar notificaciones REST", e);
        } catch {}
      }
    })();
  }, [disabled]);

  // Auto iniciar cuando hay token y aún no estamos conectados
  useEffect(() => {
    if (disabled) return; // no conectar en login
    const token = getAuthToken();
    if (token && !connectedRef.current) start();
  }, [start, disabled]);

  // Reintentar cuando token cambie (login/logout)
  useEffect(() => {
    const iv = setInterval(() => {
      if (disabled) return; // ignora reconexión periódica en login
      const token = getAuthToken();
      if (token && !connectedRef.current) start();
      if (!token && connectedRef.current) {
        try {
          controllerRef.current?.abort();
        } catch {}
        connectedRef.current = false;
        setConnected(false);
        setItems([]);
        setUnread(0);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [start, disabled]);

  const markAllRead = useCallback(() => {
    // Disparar petición al backend y actualizar localmente
    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const url = buildUrl(`/notifications/mark-read`);
          await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ all: true }),
          }).catch(() => undefined);
        }
      } catch {}
    })();
    setItems((prev) => prev.map((it) => ({ ...it, unread: false })));
    setUnread(0);
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setUnread(0);
  }, []);

  return { items, unread, connected, disabled: !!disabled, markAllRead, clear };
}
