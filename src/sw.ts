/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { createHandlerBoundToURL, precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

// Injected by vite-plugin-pwa injectManifest
declare const __WB_MANIFEST: (string | { url: string; revision: string | null })[];

cleanupOutdatedCaches();
clientsClaim();

self.addEventListener("push", (event: PushEvent) => {
  let payload: { title?: string; body?: string; data?: { url?: string } } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Thor Romplas", body: event.data?.text() ?? "" };
  }
  const title = payload.title ?? "Thor Romplas";
  const body = payload.body ?? "Nova atualização de ticket";
  const url = typeof payload.data?.url === "string" ? payload.data.url : "/historico";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const raw = event.notification.data as { url?: string } | undefined;
  const path = raw?.url ?? "/historico";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const fullUrl = new URL(path, self.location.origin).href;
      for (const client of clientList) {
        if (client.url === fullUrl && "focus" in client) {
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    }),
  );
});

precacheAndRoute(self.__WB_MANIFEST);

const navigationHandler = createHandlerBoundToURL("/index.html");
registerRoute(new NavigationRoute(navigationHandler, { denylist: [/^\/~oauth/] }));

registerRoute(
  ({ url }) => url.hostname.includes("supabase.co"),
  new NetworkFirst({
    cacheName: "supabase-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5,
      }),
    ],
  }),
);
