import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'La Mia Spesa', body: 'Hai notifiche in attesa', icon: '/app/sp3s4/icon.png' }

  if (event.data) {
    try { data = { ...data, ...event.data.json() } } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/app/sp3s4/icon.png',
      badge: data.icon || '/app/sp3s4/icon.png',
      tag: data.tag || 'spesa-notification',
      data: data.url || '/app/sp3s4/',
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data || '/app/sp3s4/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/app/sp3s4/') && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
