const CACHE_NAME = "coachpass-v5";
const urlsToCache = ["/", "/icon/icon-192.png", "/icon/icon-512.png", "/offline.html"];

// Install event - cache core assets and skip waiting
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()),
  );
});

// Fetch event - network first for static assets, strictly bypass cache for API/Convex
self.addEventListener("fetch", (event) => {
  // Only handle GET requests - POST/PUT/DELETE cannot and must not be cached
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Bypass cache completely for dynamic APIs, Convex Cloud, Convex Site, WebSockets, and non-HTTP
  if (
    url.hostname.includes("convex.cloud") ||
    url.hostname.includes("convex.site") ||
    url.pathname.startsWith("/api") ||
    url.searchParams.has("_convex") ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  // Handle navigation requests (SPA routing fallback)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((cachedResponse) => cachedResponse || caches.match("/offline.html"))
      ),
    );
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

  // Network-first for static assets with cache fallback (only cache valid 200 responses)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

// Activate event - clean up old caches immediately
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

// Support manual skipWaiting from client messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
