const CACHE_NAME = "coachpass-v4";
const urlsToCache = ["/", "/icon/icon-192.png", "/icon/icon-512.png", "/offline.html"];

// Install event - cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()),
  );
});

// Fetch event - network first for static assets, bypass cache for API/Convex
self.addEventListener("fetch", (event) => {
  // Only handle GET requests - POST/PUT/DELETE cannot be cached
  if (event.request.method !== "GET") {
    return;
  }

  // Handle navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((cachedResponse) => cachedResponse || caches.match("/offline.html"))
      ),
    );
    return;
  }

  const url = new URL(event.request.url);

  // Bypass cache completely for dynamic APIs, Convex Cloud, and non-HTTP
  if (
    url.hostname.includes("convex.cloud") ||
    url.pathname.startsWith("/api") ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  // Only cache same-origin static assets
  const isStaticAsset =
    url.origin === self.location.origin &&
    (/\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/i.test(url.pathname) ||
      url.pathname.startsWith("/assets/"));

  if (!isStaticAsset) {
    return;
  }

  // Network-first for static assets with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Handle push notifications - only show if app is not in focus
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const isAppInFocus = clientList.some((client) => client.focused);

      // Only show notification if app is not in focus
      if (!isAppInFocus) {
        return self.registration.showNotification(data.title, data.options);
      }
    }),
  );
});

// Handle notification clicks - opens/focuses the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing window if found
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      // Open new window if none exists
      if (clients.openWindow) return clients.openWindow("/");
    }),
  );
});
