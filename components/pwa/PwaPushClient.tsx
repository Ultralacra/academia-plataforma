"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function pickTopic(user: any): string | null {
  const role = String(user?.role ?? "").toLowerCase();
  const code = String(user?.codigo ?? "").trim();

  // Admin/coach/equipo: recibir global (chat:all)
  if (["admin", "coach", "equipo"].includes(role)) return "chat:all";

  // Student: recibir por su código (room)
  if (code) return code.toLowerCase();

  return null;
}

export function PwaPushClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const askedRef = React.useRef(false);

  React.useEffect(() => {
    // Registrar SW siempre (PWA + push)
    registerServiceWorker();
  }, []);

  const ensureSubscribed = React.useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      try {
        console.debug("[PWA] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      } catch {}
      return;
    }

    const topic = pickTopic(user);
    if (!topic) return;

    const reg = await registerServiceWorker();
    if (!reg) return;

    if (!("PushManager" in window)) return;

    try {
      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subscription }),
      });
    } catch (e) {
      try {
        console.debug("[PWA] No se pudo suscribir a push", e);
      } catch {}
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    // Si ya está concedido, intentar suscribir silenciosamente.
    if (Notification.permission === "granted") {
      ensureSubscribed();
      return;
    }

    // Si fue denegado, no insistir.
    if (Notification.permission === "denied") return;

    // Pedimos permiso una sola vez por sesión, vía toast con acción.
    if (askedRef.current) return;
    askedRef.current = true;

    toast({
      title: "Activar notificaciones",
      description:
        "Para recibir mensajes del chat en el móvil, permite notificaciones.",
      action: (
        <ToastAction
          altText="Permitir"
          onClick={async () => {
            try {
              const perm = await Notification.requestPermission();
              if (perm === "granted") {
                await ensureSubscribed();
              }
            } catch {}
          }}
        >
          Permitir
        </ToastAction>
      ),
    });
  }, [user, toast, ensureSubscribed]);

  return null;
}
