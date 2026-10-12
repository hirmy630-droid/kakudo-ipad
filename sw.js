'use strict';
const VERSION = '20261010-1630';
const PREFIX = 'angle-pwa:' + self.registration.scope + ':';
const CACHE_NAME = PREFIX + VERSION;
const APP_BASE_PATH = new URL('./', self.registration.scope).pathname;
const INDEX_URL = new URL('./index.html', self.registration.scope).href;
const INDEX_PATH = new URL(INDEX_URL).pathname;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(INDEX_URL, { cache: 'reload' });
    if (!response.ok) throw new Error(`index.html fetch failed: ${response.status}`);
    await cache.put(INDEX_URL, response.clone());
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const requested = new URL(request.url);
  if (requested.origin !== self.location.origin) return;
  if (requested.pathname !== APP_BASE_PATH && requested.pathname !== INDEX_PATH) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(INDEX_URL, response.clone());
      }
      return response;
    } catch (error) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(INDEX_URL);
      if (cached) return cached;
      return new Response('オフラインです。通信できる場所でもう一度開いてください。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
