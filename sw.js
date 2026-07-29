const CACHE_NAME = 'faraz-store-v3';

// Static assets to pre-cache
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/profile.html',
    '/friends.html',
    '/topup.html',
    '/css/global.css',
    '/favicon.ico'
];

// 1. INSTALL EVENT
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(() => {
                console.log("Pre-cache complete with minor fallbacks");
            });
        })
    );
});

// 2. ACTIVATE EVENT (Clear Old Caches)
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

// 3. SAFE FETCH EVENT WITH NETWORK FALLBACK
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Bypass Non-GET, Chrome extensions, Firebase API & Firestore streams
    if (
        event.request.method !== 'GET' ||
        requestUrl.protocol.startsWith('chrome-extension') ||
        requestUrl.hostname.includes('firestore.googleapis.com') ||
        requestUrl.hostname.includes('identitytoolkit.googleapis.com') ||
        requestUrl.hostname.includes('firebase')
    ) {
        return; // Let standard browser fetch handle dynamic Firebase traffic
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Return cached version if network fails instead of throwing unhandled rejection
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});