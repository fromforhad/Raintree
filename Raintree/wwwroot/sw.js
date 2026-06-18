// service worker 
const CACHE_NAME = 'scheduler-v1';
const ASSETS = [
    '/',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './Assets/Icons/leaf192.png',
    './Assets/Icons/leaf512.png',
];

// Install Service Worker and cache core structural assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker Activated');
});

// Fetch network strategy: Serve from cache first, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});

// Listen for the skipWaiting message from script.js
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});