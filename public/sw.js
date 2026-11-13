// public/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: '🚨 HONKSAFE CAR ALERT!',
    body: 'Someone scanned your vehicle QR sticker!',
    url: '/dashboard',
  };

  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: '/api/pwa-icon/192',
    badge: '/api/pwa-icon/192',
    vibrate: [400, 150, 400, 150, 600],
    requireInteraction: true,
    tag: 'whopark-alert',
    renotify: true,
    data: { url: payload.url || '/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});