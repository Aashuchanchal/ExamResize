/**
 * Service Worker — ExamResize PWA
 * Provides offline caching and app-like install experience.
 */

const CACHE_NAME = 'examresize-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/resume-builder.html',
  '/resume-score.html',
  '/jobs.html',
  '/marketplace.html',
  '/css/styles.css',
  '/css/resume-builder.css',
  '/css/resume-score.css',
  '/css/jobs.css',
  '/css/marketplace.css',
  '/js/presets.js',
  '/js/processor.js',
  '/js/app.js',
  '/js/resume-builder.js',
  '/js/resume-score.js',
  '/js/jobs.js',
  '/js/marketplace.js',
  '/js/ad-renderer.js',
  '/js/firebase-config.js',
  '/manifest.json'
];

// Install — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebasejs') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('rapidapi.com') ||
      event.request.url.includes('remoteok.com') ||
      event.request.url.includes('firestore')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
