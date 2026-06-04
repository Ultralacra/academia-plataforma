"use client";

import { useEffect, useRef } from "react";

/**
 * Suscribe al usuario a Web Push notifications bajo el topic indicado.
 * Solo opera si la VAPID public key está configurada en el entorno.
 *
 * @param topic  Topic de suscripción, e.g. "atc-coaches" o "atc-coach:<id>"
 * @param enabled Si es false, no se suscribe (útil para condicionar por rol)
 */
export function usePushSubscription(topic: string, enabled = true) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (subscribedRef.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return; // Sin clave VAPID no podemos suscribir

    const subscribe = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, subscription: sub.toJSON() }),
        });

        if (res.ok) {
          subscribedRef.current = true;
        }
      } catch {
        // Push no disponible o permisos denegados — silencioso
      }
    };

    subscribe();
  }, [topic, enabled]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
