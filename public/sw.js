// public/sw.js — Service Worker Push Notifications
// ProSportConcept / Le Spot Training

const CACHE_NAME = 'prosport-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── Réception d'une notification push ────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try { payload = event.data.json() }
  catch { payload = { title: 'ProSportConcept', body: event.data.text() } }

  const { title, body, icon, badge, tag, data } = payload

  const options = {
    body:    body    || '',
    icon:    icon    || '/icons/icon-192.png',
    badge:   badge   || '/icons/badge-72.png',
    tag:     tag     || 'prosport-notif',
    vibrate: [100, 50, 100],
    data:    data    || {},
    actions: payload.actions || [],
    requireInteraction: payload.requireInteraction || false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── Clic sur une notification ────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si l'app est déjà ouverte, focus et navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Sinon ouvrir
      return self.clients.openWindow(url)
    })
  )
})
