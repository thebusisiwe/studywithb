// ─── Cache version ────────────────────────────────────────────────────────────
// Bump CACHE_VERSION whenever you deploy updated app files so users
// receive fresh assets instead of stale cached ones.
const CACHE_VERSION = "v4";
const CACHE_NAME = `studywithb-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icons/icon.svg",
];

// ─── Install: precache core assets ───────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ─── Activate: delete stale caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// ─── Fetch: cache-first for same-origin, network-only for external ────────────
self.addEventListener("fetch", (event) => {
    // Skip non-GET and cross-origin requests (e.g. Google Fonts)
    if (
        event.request.method !== "GET" ||
        !event.request.url.startsWith(self.location.origin)
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(event.request).then((response) => {
                if (
                    response &&
                    response.status === 200 &&
                    response.type === "basic"
                ) {
                    const toCache = response.clone();
                    caches
                        .open(CACHE_NAME)
                        .then((cache) => cache.put(event.request, toCache));
                }

                return response;
            });
        })
    );
});
