/* Service worker push handlers, imported into the generated workbox SW via
 * `workbox.importScripts`. Kept as plain JS so it runs as a classic worker. */
/* eslint-disable no-undef */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Minha Leitura'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Hora de ler!',
      icon: '/pwa-192x192.png',
      badge: '/badge.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return undefined
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined
    }),
  )
})
