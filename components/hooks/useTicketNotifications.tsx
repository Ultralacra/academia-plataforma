"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/use-toast";

type TicketNotif = {
  id: string;
  ticketId?: string;
  previous?: string;
  current?: string;
  title?: string;
  at?: string;
};

export function useTicketNotifications(opts?: { room?: string }) {
  const room = opts?.room ?? "tickets";
  const [items, setItems] = useState<TicketNotif[]>([]);
  const [unread, setUnread] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${
      window.location.host
    }/api/socket?room=${encodeURIComponent(room)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data));
        if (payload?.type === "ticket:status_changed" && payload.data) {
          const d = payload.data as TicketNotif;
          const at = d.at ?? new Date().toISOString();
          const note: TicketNotif = {
            id:
              String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
            ticketId: d.ticketId,
            previous: d.previous,
            current: d.current,
            title: d.title ?? `Ticket ${d.ticketId} cambió a ${d.current}`,
            at,
          };
          setItems((s) => [note, ...s].slice(0, 50));
          setUnread((u) => u + 1);
          try {
            toast({
              title: "Ticket actualizado",
              description: note.title,
              variant: "default",
            });
          } catch {}
        }
      } catch (err) {
        // ignore
      }
    };

    ws.onopen = () => {};
    ws.onerror = () => {};
    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      try {
        ws.close();
      } catch {}
      wsRef.current = null;
    };
  }, [room]);

  function markAllRead() {
    setUnread(0);
  }

  return {
    items,
    unread,
    markAllRead,
  } as const;
}
