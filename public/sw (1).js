// public/sw.js — Atlyo Service Worker
// Push notifications + cache offline PWA

const CACHE_NAME = 'atlyo-v1'

// Fichiers à mettre en cache pour le mode offline
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Installation : précache les assets essentiels ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activation : nettoie les anciens caches ────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch : Network first, fallback cache ─────────────────────────────────────
// Les requêtes API Supabase passent toujours par le réseau
// Les assets statiques sont servis depuis le cache si le réseau échoue
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Ignore les requêtes non-GET et les API externes
  if (event.request.method !== 'GET') return
  if (url.origin !== location.origin) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mise en cache des assets statiques
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Fallback cache si offline
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // Si la page n'est pas en cache, retourner index.html (SPA)
          if (event.request.destination === 'document') {
            return caches.match('/index.html')
          }
        })
      })
  )
})

// ── Réception d'une notification push ────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try { payload = event.data.json() }
  catch { payload = { title: 'Atlyo', body: event.data.text() } }

  const { title, body, icon, badge, tag, data } = payload

  const options = {
    body:    body    || '',
    icon:    icon    || '/icons/icon-192.png',
    badge:   badge   || '/icons/icon-72.png',
    tag:     tag     || 'atlyo-notif',
    vibrate: [100, 50, 100],
    data:    data    || {},
    actions: payload.actions || [],
    requireInteraction: payload.requireInteraction || false,
  }

  event.waitUntil(
    self.registration.showNotification(title || 'Atlyo', options)
  )
})

// ── Clic sur une notification ─────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si une fenêtre est déjà ouverte, la focus et naviguer
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
