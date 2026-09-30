const VERSION = 'v2.4.1';
const SHELL = `camlist-shell-${VERSION}`;
const IMAGES = 'camlist-images';
const ASSETS = [
  './', './index.html', './css/style.css', './css/skins.css', './js/skins.js', './manifest.json', './data/catalog.json',
  './js/app.js', './js/store.js', './js/catalog.js', './js/list.js', './js/i18n.js', './js/brands.js',
  './js/export-text.js', './js/export-xlsx.js', './js/export-docx.js', './js/export-print.js',
  './js/ui/dom.js', './js/ui/projects.js', './js/ui/list.js', './js/ui/catalog.js', './js/ui/export.js', './logos/index.json', './js/compat.js', './js/lens.js', './js/recency.js', './data/releases.json', './js/ui/icons-dept.js', './js/ui/icons.js', './data/compat.json', './data/extra.json', './js/power.js', './data/power.json', './js/format.js', './data/codecs.json', './data/luts.json', './data/places.json',
  './js/ui/tools.js', './js/home.js', './js/layout.js', './js/tools/media.js', './js/tools/shutter.js', './js/tools/fov.js', './js/tools/solar.js', './js/tools/convert.js', './js/accessory.js', './js/companions.js', './js/gearkits.js', './js/kitalloc.js',
  './vendor/xlsx.full.min.js', './vendor/docx.umd.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('camlist-shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimImages(max = 500) {
  const c = await caches.open(IMAGES);
  const keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await c.delete(k);
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // The version archive (v/…) is always fetched fresh and never cached: a preview that was opened once
  // must still show its latest build, and an archived page must never replace the live app's shell.
  if (url.origin === location.origin && url.pathname.includes('/v/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request)
      .then(res => { if (res.ok) caches.open(SHELL).then(c => c.put('./index.html', res.clone())); return res; })
      .catch(() => caches.match('./index.html', { ignoreSearch: true }).then(hit => hit || caches.match('./'))));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(SHELL).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
        if (res.ok) c.put(e.request, res.clone());
        return res;
      }))),
    );
    return;
  }
  // Google Fonts (stylesheet + woff2): cache-first so the typeface works offline after first load.
  if (/fonts.(googleapis|gstatic).com$/.test(url.hostname)) {
    e.respondWith(caches.open(SHELL).then(async c => (await c.match(e.request)) || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; })));
    return;
  }
  if (e.request.destination === 'image') {
    e.respondWith(caches.open(IMAGES).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(res => { if (res.ok) { c.put(e.request, res.clone()); trimImages(); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
