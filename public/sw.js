// NutriLens AI - Web Push Service Worker
// Handles background notifications from Supabase/FCM

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'NutriLens AI Alert';
    const options = {
      body: payload.body || 'Check your nutrition status.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag || 'nutrilens-generic',
      data: payload.data || {},
      actions: payload.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('Push payload parse error:', e);
    // Fallback for non-JSON push
    event.waitUntil(
      self.registration.showNotification('NutriLens AI Alert', {
        body: event.data.text(),
        icon: '/pwa-192x192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
