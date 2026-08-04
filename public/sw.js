// Intentionally minimal: this app needs a live connection to Supabase to
// function, so there's no offline cache to maintain here. The empty fetch
// handler exists only to satisfy PWA installability checks (Chrome's
// "Add to Home Screen" prompt requires a registered service worker with a
// fetch listener).
self.addEventListener("fetch", () => {});
