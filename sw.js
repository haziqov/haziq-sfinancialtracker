const CACHE_NAME = 'mft-sw-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  // Only intercept POST requests (share target)
  if (event.request.method !== 'POST') return;

  event.respondWith((async () => {
    try {
      const formData = await event.request.formData();
      const file = formData.get('receipt');

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

        if (allClients.length > 0) {
          // App is already open — send file directly
          allClients[0].postMessage(
            { type: 'RECEIPT_SHARED', fileType: file.type, buffer: arrayBuffer },
            [arrayBuffer]
          );
        } else {
          // App is closed — store file so it's picked up on next load
          const cache = await caches.open(CACHE_NAME);
          await cache.put(
            'pending-receipt',
            new Response(new Blob([arrayBuffer], { type: file.type }))
          );
        }
      }
    } catch (err) {
      console.error('[SW] Share handling error:', err);
    }

    // Redirect back to the app
    return Response.redirect('./index.html', 303);
  })());
});
