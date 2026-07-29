const CACHE_NAME = 'faraz-store-v4';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/profile.html',
    '/friends.html',
    '/topup.html',
    '/css/global.css',
    '/favicon.ico'
];

// INSTALL EVENT
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
        })
    );
});

// ACTIVATE EVENT
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// SAFE CACHE-FIRST FETCH EVENT
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Completely bypass non-GET, Firebase, Firestore, Vercel & Chrome extensions
    if (
        request.method !== 'GET' ||
        url.protocol.startsWith('chrome-extension') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('vercel')
    ) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cache and update in background silently
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                if (request.mode === 'navigate') {
                    return caches.match('/friends.html') || caches.match('/index.html');
                }
            });
        })
    );
});