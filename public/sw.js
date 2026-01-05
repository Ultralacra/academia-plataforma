/* eslint-disable no-restricted-globals */

self.addEventListener("install", (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
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

  const title = (data && data.title) || "Nuevo mensaje";
  const body = (data && data.body) || "Tienes un mensaje nuevo";
  const url = (data && data.url) || "/chat";

  const options = {
    body,
    data: { url },
    tag: (data && data.tag) || "chat-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          try {
            if (client && "focus" in client) {
              // If already open, focus and navigate
              client.focus();
              if ("navigate" in client) {
                return client.navigate(url);
              }
              return;
            }
          } catch {}
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
