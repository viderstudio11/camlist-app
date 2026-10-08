// node scripts/make-tool-apps.js — writes apps/<tool>/ for each tool that can stand on its own: a page,
// a manifest, an offline cache and its icons (the tool's glyph in amber on the dark tile, as the Lens
// app's). All of them run apps/app.js, so a tool is fixed once and every copy has the fix.
// The lens tool already has its own app (lens/) and is left as it is. Icons need @resvg/resvg-js (dev).
import { writeFileSync, mkdirSync } from 'node:fs';
import { TOOL_ICON } from '../js/ui/icons.js';
import { L } from '../js/ui/tools/strings.js';

const APPS = ['slate', 'iso', 'sun', 'media', 'shutter', 'hours', 'offload', 'downloads', 'units'];
// short names for the home screen (one word after Vid2List, so the icon label stays whole)
const SHORT = { slate: 'Slate', iso: 'ISO', sun: 'Sun', media: 'Media', shutter: 'Shutter', hours: 'Hours', offload: 'Offload', downloads: 'Downloads', units: 'Units' };
const BG = '#16171A', AMBER = '#F2A33A';

let Resvg = null;
try { ({ Resvg } = await import('@resvg/resvg-js')); } catch { console.warn('no @resvg/resvg-js — icons skipped (npm i -D @resvg/resvg-js)'); }

const iconSvg = (id, size) => {
  const m = /viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/.exec(TOOL_ICON[id]);
  const [x, y, w, h] = m[1].split(/\s+/).map(Number);
  const box = size * 0.5, k = box / Math.max(w, h);
  const tx = (size - w * k) / 2 - x * k, ty = (size - h * k) / 2 - y * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${BG}"/><g fill="${AMBER}" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)})">${m[2]}</g></svg>`;
};

for (const id of APPS) {
  const dir = `apps/${id}`;
  mkdirSync(dir, { recursive: true });
  const he = L[id].he, en = L[id].en, desc = L[`${id}_sub`]?.en || en;
  writeFileSync(`${dir}/index.html`, `<!DOCTYPE html>
<html lang="he" dir="rtl" data-tool="${id}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${BG}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Vid2List ${SHORT[id]}">
<meta name="description" content="${desc}">
<title>Vid2List ${SHORT[id]} — ${he}</title>
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="stylesheet" href="../../css/style.css">
<link rel="stylesheet" href="../../css/skins.css">
</head>
<body>
<header class="topbar" id="topbar"></header>
<main id="view" class="view"></main>
<div id="toasts" class="toasts" aria-live="polite"></div>
<dialog id="sheet" class="sheet"></dialog>
<script type="module" src="../app.js"></script>
</body>
</html>
`);
  writeFileSync(`${dir}/manifest.json`, `${JSON.stringify({
    name: `Vid2List ${SHORT[id]} — ${en}`,
    short_name: `Vid2List ${SHORT[id]}`,
    description: desc,
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BG,
    theme_color: BG,
    lang: 'he',
    dir: 'rtl',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2)}\n`);
  writeFileSync(`${dir}/sw.js`, `// Vid2List ${SHORT[id]} works offline after the first visit: every same-origin file is fetched fresh when
// the network is there and kept, and served from the cache when it is not (on set, signal comes and goes).
const VERSION = '${id}-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('${id}-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
`);
  if (Resvg) for (const s of [180, 192, 512]) writeFileSync(`${dir}/icon-${s}.png`, new Resvg(iconSvg(id, s)).render().asPng());
  console.log(`apps/${id}/  Vid2List ${SHORT[id]}`);
}
