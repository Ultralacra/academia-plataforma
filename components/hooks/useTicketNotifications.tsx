"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { authService } from "@/lib/auth";

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

          // Alumno: no mostrar notificaciones de borrado / estado eliminado
          try {
            const st = authService.getAuthState();
            const isStudent = st?.user?.role === "student";
            const current = String(d.current || "").toUpperCase();
            if (isStudent && current.includes("ELIMINAD")) return;
          } catch {}

          const at = d.at ?? new Date().toISOString();
          const note: TicketNotif = {
            id:
              String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
            ticketId: d.ticketId,
            previous: d.previous,
            current: d.current,
            title: (() => {
              const base =
                d.title ?? `Ticket ${d.ticketId} cambió a ${d.current}`;
              try {
                const st = authService.getAuthState();
                const isStudent = st?.user?.role === "student";
                return isStudent
                  ? base.replace(/\bTicket\b/gi, "Feedback")
                  : base;
              } catch {
                return base;
              }
            })(),
            at,
          };
          setItems((s) => [note, ...s].slice(0, 50));
          setUnread((u) => u + 1);
          try {
            const st = authService.getAuthState();
            const isStudent = st?.user?.role === "student";
            toast({
              title: isStudent ? "Feedback actualizado" : "Ticket actualizado",
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

  // Notificación local: permite que cualquier parte del app dispare un evento
  // window.dispatchEvent(new CustomEvent('ticket:notify', { detail: { title, ticketId, previous, current, at } }))
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (ev: Event) => {
      try {
        const anyEv = ev as CustomEvent<any>;
        const d = anyEv.detail || {};

        // Alumno: no mostrar notificaciones de borrado / estado eliminado
        try {
          const st = authService.getAuthState();
          const isStudent = st?.user?.role === "student";
          const current = String(d.current || "").toUpperCase();
          if (isStudent && current.includes("ELIMINAD")) return;
        } catch {}

        const at = d.at ?? new Date().toISOString();
        const isStudent = (() => {
          try {
            const st = authService.getAuthState();
            return st?.user?.role === "student";
          } catch {
            return false;
          }
        })();
        const note: TicketNotif = {
          id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
          ticketId: d.ticketId,
          previous: d.previous,
          current: d.current,
          title: (() => {
            const base =
              d.title ||
              (d.current && d.ticketId
                ? `Ticket ${d.ticketId} → ${d.current}`
                : `Nuevo evento de ticket`);
            return isStudent ? base.replace(/\bTicket\b/gi, "Feedback") : base;
          })(),
          at,
        };
        setItems((s) => [note, ...s].slice(0, 50));
        setUnread((u) => u + 1);
        try {
          toast({
            title: isStudent ? "Notificación" : "Notificación",
            description: note.title,
          });
        } catch {}
      } catch {}
    };
    window.addEventListener("ticket:notify", handler as any);
    return () => window.removeEventListener("ticket:notify", handler as any);
  }, []);

  function markAllRead() {
    setUnread(0);
  }

  return {
    items,
    unread,
    markAllRead,
  } as const;
}
