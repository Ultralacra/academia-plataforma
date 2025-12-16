"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { usePathname } from "next/navigation";
import { playNotificationSound } from "@/lib/utils";

type Sender = "admin" | "alumno" | "coach";

export type ChatNewEvent = {
  id: string;
  room: string;
  sender: Sender;
  text: string;
  at: string; // ISO
};

type PerRoom = Record<string, number>; // unread count per room

export function useChatNotifications(opts?: {
  role?: Sender; // actual user role, default 'admin'
  enableToast?: boolean; // default true
}) {
  const role: Sender = opts?.role ?? "admin";
  const enableToast = opts?.enableToast ?? true;
  const pathname = usePathname();
  const [unreadByRoom, setUnreadByRoom] = useState<PerRoom>({});
  const [lastEvent, setLastEvent] = useState<ChatNewEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const unreadTotal = useMemo(
    () => Object.values(unreadByRoom).reduce((a, b) => a + b, 0),
    [unreadByRoom]
  );

  // Helpers
  function lastReadKey(room: string) {
    return `chatLastRead:${room}:${role}`;
  }
  function getLastRead(room: string): number {
    try {
      const raw = localStorage.getItem(lastReadKey(room));
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  function setLastRead(room: string, ts: number) {
    try {
      localStorage.setItem(lastReadKey(room), String(ts));
    } catch {}
  }

  // Subscribe to global chat notifications via WebSocket
  useEffect(() => {
    if (typeof window === "undefined") return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${
      window.location.host
    }/api/socket?room=${encodeURIComponent("chat:all")}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data));
        if (payload?.type === "chat:new" && payload.data) {
          const d = payload.data as ChatNewEvent;
          setLastEvent(d);
          // count unread only if message is from another role
          const fromOther = d.sender !== role;
          if (!fromOther) return;
          const lr = getLastRead(d.room);
          const at = Date.parse(d.at || "") || Date.now();
          if (at > lr) {
            setUnreadByRoom((prev) => ({
              ...prev,
              [d.room]: (prev[d.room] ?? 0) + 1,
            }));

            const isChatView =
              pathname?.includes("/chat") || pathname?.includes("/teamsv2");
            if (!isChatView) {
              playNotificationSound();
            }

            if (enableToast && !isChatView) {
              try {
                toast({
                  title: "Nuevo mensaje en chat",
                  description: `${d.sender}: ${
                    d.text?.slice(0, 80) || "(adjunto)"
                  }`,
                });
              } catch {}
            }
          }
        }
      } catch {
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
  }, [role, enableToast]);

  // React to mark-as-read pings from ChatRealtime (localStorage event)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "chatLastReadPing" && e.newValue) {
        const [room, who, ts] = String(e.newValue).split(":");
        if (!room || who !== role) return;
        // reset counter for that room
        setUnreadByRoom((prev) => {
          if (!(room in prev)) return prev;
          const next = { ...prev };
          delete next[room];
          return next;
        });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [role]);

  // Public API
  function markRoomRead(room: string) {
    const ts = Date.now();
    setLastRead(room, ts);
    setUnreadByRoom((prev) => {
      if (!(room in prev)) return prev;
      const next = { ...prev };
      delete next[room];
      return next;
    });
    try {
      localStorage.setItem("chatLastReadPing", `${room}:${role}:${ts}`);
    } catch {}
  }

  return {
    unreadTotal,
    unreadByRoom,
    lastEvent,
    markRoomRead,
  } as const;
}
