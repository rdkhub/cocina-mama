// public/sw.js
// Service worker de Cocina de Mamá:
//  - muestra las notificaciones de pedidos nuevos (push)
//  - al tocar la notificación abre la app en ese pedido
//  - guarda la última versión de la página para que abra aunque la señal esté mala
const CACHE = "cocina-mama-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Solo navegaciones (la página en sí), primero red y si no hay, la copia guardada.
// Los datos de Supabase nunca se guardan aquí: siempre van en vivo.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("/", res.clone());
        return res;
      } catch {
        const guardada = await caches.match("/");
        return guardada || Response.error();
      }
    })()
  );
});

self.addEventListener("push", (event) => {
  let datos;
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { title: "Cocina de Mamá", body: event.data ? event.data.text() : "" };
  }
  const titulo = datos.title || "🛎️ Pedido nuevo";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.body || "",
      tag: datos.tag || "pedido",
      renotify: true,
      requireInteraction: true,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      vibrate: [200, 100, 200, 100, 300],
      data: { url: datos.url || "/?admin=1" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/?admin=1", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((c) => new URL(c.url).origin === self.location.origin);
      if (abierta) {
        await abierta.focus();
        abierta.postMessage({ tipo: "abrir", url });
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});
