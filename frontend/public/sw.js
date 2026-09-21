// RecallHub Service Worker
const CACHE_NAME = "recallhub-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
];

// Install event: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE).catch((err) => console.warn("Caching failed:", err)))
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Push Event Listener: Real reminder notifications naming the due concept/topic
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "⏰ RecallHub Reminder";
  const body = data.body || "You have spaced recall items due for review!";
  const targetUrl = data.url || (data.data && data.data.url) || "/reviews";

  const options = {
    body: body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    image: data.image || undefined,
    tag: data.tag || `recall-reminder-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    vibrate: [150, 50, 150],
    data: {
      url: targetUrl,
      timestamp: Date.now(),
      ...data.data,
    },
    actions: [
      {
        action: "review_now",
        title: "Review Now",
      },
      {
        action: "dismiss",
        title: "Later",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event Listener: Deep link and focus window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/reviews";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an open window already exists, focus it and navigate to targetUrl
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // If no window is open, open a new window pointing directly to the target URL
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
