const CACHE_NAME = "raintree-v2";

const APP_FILES = [
    "/",
    "/index.html",
    "/src/output.css",
    "/script.js"
];

// ==============================
// Install
// ==============================

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
    );

    // Activate the new worker immediately
    self.skipWaiting();
});

// ==============================
// Activate
// ==============================

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => {
            // Take control of existing pages
            return self.clients.claim();
        })
    );
});

// ==============================
// Fetch
// ==============================

self.addEventListener("fetch", event => {
    const request = event.request;

    // Only handle GET requests
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // Only cache our own static app files.
    // API requests go directly to the network.
    const isAppFile =
        url.origin === self.location.origin &&
        APP_FILES.includes(url.pathname);

    if (!isAppFile) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const responseClone = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseClone);
                        });
                }

                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});