"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type CoachChatSnackbarDetail = {
  title?: string;
  studentName?: string;
  preview?: string;
  chatUrl?: string;
  chatId?: string | number;
};

type SnackbarItem = {
  id: string;
  title: string;
  studentName?: string;
  preview: string;
  chatUrl?: string;
  chatId?: string | number;
};

function safeText(v: any): string {
  const s = String(v ?? "").trim();
  return s;
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

function getCachedContactName(chatId: any): string | null {
  try {
    const id = chatId == null ? "" : String(chatId);
    if (!id) return null;
    const v = localStorage.getItem(`chatContactName:${id}`);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function CoachChatSnackbar() {
  const router = useRouter();
  const [item, setItem] = useState<SnackbarItem | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function clearTimer() {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function show(next: SnackbarItem) {
      clearTimer();
      setItem(next);
      timeoutRef.current = window.setTimeout(() => {
        setItem(null);
        timeoutRef.current = null;
      }, 5000);
    }

    function onEvent(ev: Event) {
      const e = ev as CustomEvent<CoachChatSnackbarDetail>;
      const d = e?.detail || {};
      const cached = d.chatId != null ? getCachedContactName(d.chatId) : null;
      const studentName =
        safeText(d.studentName) || safeText(d.title) || cached;
      const title = studentName || "Nuevo mensaje";
      const preview = safeText(d.preview) || "(Adjunto)";
      const chatUrl = safeText(d.chatUrl) || undefined;
      const chatId = d.chatId;

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      show({
        id,
        title,
        studentName: studentName || undefined,
        preview,
        chatUrl,
        chatId,
      });
    }

    window.addEventListener("coach-chat:snackbar", onEvent);
    return () => {
      clearTimer();
      window.removeEventListener("coach-chat:snackbar", onEvent);
    };
  }, []);

  if (!item) return null;

  const displayName = item.studentName || item.title;
  const initials = getInitials(displayName);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[320px] max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto rounded-md border bg-background text-foreground shadow-lg">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground grid place-items-center text-sm font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold truncate">
                    {displayName}
                  </div>
                  <Badge variant="muted" className="text-[10px] px-1.5">
                    Chat
                  </Badge>
                </div>
                <div className="mt-1 text-sm opacity-90 line-clamp-2">
                  {item.preview}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setItem(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 pb-3">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              try {
                if (item.chatUrl) router.push(item.chatUrl);
              } catch {}
              setItem(null);
            }}
            disabled={!item.chatUrl}
          >
            Abrir chat
          </Button>
        </div>
      </div>
    </div>
  );
}
