/* eslint-disable no-restricted-globals */

const CACHE_VERSION = "v1.1.0";

self.addEventListener("install", (event) => {
  // console.log("[SW] Installing service worker...", CACHE_VERSION);
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // console.log("[SW] Activating service worker...", CACHE_VERSION);
  event.waitUntil(self.clients.claim());
});

// Para instalabilidad (Chrome/Lighthouse): tener handler de fetch.
// Passthrough: no cachea, solo delega a la red.
self.addEventListener("fetch", (event) => {
  try {
    event.respondWith(fetch(event.request));
  } catch {
    // no-op
  }
});

// ============================================================
// PUSH NOTIFICATIONS - Para mensajes de chat en móviles
// ============================================================
self.addEventListener("push", (event) => {
  // console.log("[SW] Push event received");
  if (!event) return;

  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    try {
      data = event.data ? { body: event.data.text() } : null;
    } catch {
      data = null;
    }
  }

  const title = (data && data.title) || "Academia X";
  const body = (data && data.body) || "Tienes un mensaje nuevo";
  const url = (data && data.url) || "/chat";
  const chatId = (data && data.chatId) || null;
  const senderName = (data && data.senderName) || "";

  const options = {
    body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    image: data && data.image ? data.image : undefined,
    data: { url, chatId, senderName },
    tag: (data && data.tag) || "chat-notification",
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200], // Patrón de vibración para móviles
    actions: [
      { action: "open", title: "Abrir chat" },
      { action: "dismiss", title: "Descartar" },
    ],
  };

  // console.log("[SW] Showing notification:", title, body);
  event.waitUntil(self.registration.showNotification(title, options));
});

// ============================================================
// Manejar click en notificación
// ============================================================
self.addEventListener("notificationclick", (event) => {
  // console.log("[SW] Notification clicked:", event.action);
  event.notification.close();

  // Si el usuario clickeó "descartar", no hacer nada
  if (event.action === "dismiss") {
    return;
  }

  const url = (event.notification && event.notification.data && event.notification.data.url) || "/chat";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Buscar si ya hay una ventana abierta de la app
        for (const client of clientList) {
          try {
            // Si la URL ya coincide, solo enfocar
            if (client.url && client.url.includes(url.split("?")[0])) {
              return client.focus();
            }
            // Si hay cualquier ventana de la app, navegar a la URL
            if (client && "focus" in client) {
              client.focus();
              if ("navigate" in client) {
                return client.navigate(url);
              }
              return;
            }
          } catch {}
        }
        // Si no hay ventana abierta, abrir una nueva
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// ============================================================
// Manejar cierre de notificación (sin click)
// ============================================================
self.addEventListener("notificationclose", (event) => {
  // console.log("[SW] Notification closed without interaction");
});

// ============================================================
// Mensajes desde la página principal (para mostrar notificaciones locales)
// ============================================================
self.addEventListener("message", (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  // La página puede enviar un mensaje para mostrar una notificación
  // cuando detecta un mensaje de chat y la app está en background
  if (type === "SHOW_NOTIFICATION") {
    const { title, body, url, tag, chatId, senderName } = payload || {};
    
    const options = {
      body: body || "Tienes un mensaje nuevo",
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: { url: url || "/chat", chatId, senderName },
      tag: tag || "chat-local",
      renotify: true,
      vibrate: [200, 100, 200],
    };

    self.registration.showNotification(
      title || "Academia X",
      options
    );
  }

  // Responder para confirmar que el SW está activo
  if (type === "PING") {
    event.ports[0]?.postMessage({ type: "PONG", version: CACHE_VERSION });
  }
});
