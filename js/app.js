import { feel, setSound } from './feel.js';
import { createStore } from './store.js';
import { createCatalog, loadCatalog } from './catalog.js';
import { createCompat, loadCompat } from './compat.js';
import { createRecency } from './recency.js';
import { createPower, loadPower } from './power.js';
import { t, setLang, getLang, dirFor } from './i18n.js';
import { esc, el, toast, icons, download } from './ui/dom.js';
import { fallbackHTML, setLogoIndex } from './brands.js';
import * as Projects from './ui/projects.js';
import * as List from './ui/list.js';
import * as Catalog from './ui/catalog.js';
import * as Export from './ui/export.js';
import * as Tools from './ui/tools.js';
import { loadCodecs } from './tools/media.js';
import { isSplitRoute, splitProjectId, panesToRefresh } from './layout.js';
import { SKINS, GROUPS, DEFAULT_SKIN, isSkin, loadSkinFonts, skin, nextTheme, migrateSettings } from './skins.js';

const store = createStore();
{
  const m = migrateSettings(store.state.settings);
  if (m.skin !== store.state.settings.skin || m.theme !== store.state.settings.theme) store.setSettings(m);
}
setLang(store.state.settings.lang);
let extraData = null;
let catalog = createCatalog({ departments: [], brands: [], products: [] }, store.state.manualProducts);
let catalogError = null;
let compatData = { cameras: [], adapters: {}, kits: {} };
let compat = createCompat(compatData, catalog);
let recency = createRecency({});
let powerData = {};
let power = createPower(powerData, catalog, compat);

// Called by the inline onerror in brands.logoHTML if a listed logo file fails to load.
window.__logoFallback = (slug, size) => fallbackHTML(slug, catalog.brandName(slug), size);

const ctx = {
  store, t, get catalog() { return catalog; }, get compat() { return compat; }, get recency() { return recency; }, get power() { return power; },
  lang: getLang,
  setLang(l) { setLang(l); store.setSettings({ lang: l }); applyDir(); render(); },
  theme: () => store.state.settings.theme || 'light',
  toggleTheme() { store.setSettings({ theme: nextTheme(ctx.theme()) }); applyTheme(); },
  skin: () => (isSkin(store.state.settings.skin) ? store.state.settings.skin : DEFAULT_SKIN),
  setSkin(id) { if (!isSkin(id)) return; store.setSettings({ skin: id }); applySkin(); },
  navigate(hash) { if (location.hash === hash) render(); else location.hash = hash; },
  render,
  deptOrder: () => catalog.departments.map(d => ({ id: d.id, key: d.slug })),
  resolve: (id) => catalog.byId(id),
  setTopbar({ title = '', back = null, right = [] }) {
    const bar = document.getElementById('topbar');
    bar.innerHTML = `${back ? `<button class="iconbtn mirror" data-back aria-label="${esc(t('back'))}">${icons.back}</button>` : ''}<div class="title" dir="auto">${title}</div>${right.map((r, i) => `<button class="iconbtn" data-r="${i}" aria-label="${esc(r.label || '')}">${r.icon || esc(r.text ?? '')}</button>`).join('')}<button class="iconbtn" data-theme-btn aria-label="${esc(t('theme'))}" title="${esc(t('theme'))}">${{ light: icons.sun, sun: icons.sunFill, dark: icons.moon }[ctx.theme()] || icons.sun}</button><button class="langpill" data-lang aria-label="${esc(t('language'))}">${t('lang_switch')}</button>`;
    bar.querySelector('[data-lang]').onclick = () => ctx.setLang(getLang() === 'he' ? 'en' : 'he');
    bar.querySelector('[data-theme-btn]').onclick = () => ctx.toggleTheme();
    if (back) bar.querySelector('[data-back]').onclick = () => (typeof back === 'string' ? ctx.navigate(back) : back());
    right.forEach((r, i) => { bar.querySelector(`[data-r="${i}"]`).onclick = r.onClick; });
  },
};

function applyDir() {
  document.documentElement.lang = getLang();
  document.documentElement.dir = dirFor(getLang());
}

function renderSkins(ctx, _p, root) {
  ctx.setTopbar({ title: t('design'), back: '#/settings' });
  root.innerHTML = GROUPS.map(g => {
    const list = SKINS.filter(s => s.group === g.id);
    if (!list.length) return '';
    return `<div class="skin-group">${esc(getLang() === 'he' ? g.he : g.en)}</div><div class="skin-list">${list.map(s => `<button class="skin-opt ${ctx.skin() === s.id ? 'on' : ''}" data-skin="${esc(s.id)}"><span class="skin-swatch">${s.swatch.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</span><span class="skin-main"><b>${esc(getLang() === 'he' ? s.he : s.en)}</b><small>${esc(getLang() === 'he' ? s.descHe : s.descEn)}</small></span><span class="skin-check">${ctx.skin() === s.id ? '\u2713' : ''}</span></button>`).join('')}</div>`;
  }).join('');
  root.querySelectorAll('[data-skin]').forEach(b => { b.onclick = () => ctx.setSkin(b.dataset.skin); });
}

function applySkin() {
  const id = ctx.skin();
  loadSkinFonts(id);
  document.documentElement.dataset.skin = id;
  render();
}

const THEME_COLOR = { light: '#F4F3EF', sun: '#FFFFFF', dark: '#0F1012' };
function applyTheme() {
  const theme = ctx.theme();
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', THEME_COLOR[theme] || THEME_COLOR.light));
  render();
}

let lastRoute = null;
function route() {
  const h = location.hash || '#/';
  let m;
  if ((m = h.match(/^#\/p\/([^/]+)\/add$/))) return { screen: Catalog, params: { id: m[1] } };
  if ((m = h.match(/^#\/p\/([^/]+)\/export$/))) return { screen: Export, params: { id: m[1] } };
  if ((m = h.match(/^#\/p\/([^/]+)\/print$/))) return { screen: Export, params: { id: m[1], print: true } };
  if ((m = h.match(/^#\/p\/([^/]+)$/))) return { screen: List, params: { id: m[1] } };
  if (h === '#/tools') return { screen: Tools, params: {} };
  if ((m = h.match(/^#\/tools\/([a-z]+)$/))) return { screen: Tools, params: { tool: m[1] } };
  if (h === '#/skins') return { screen: { render: renderSkins }, params: {} };
  if (h === '#/settings') return { screen: { render: renderSettings }, params: {} };
  return { screen: Projects, params: {} };
}

function render() {
  const root = document.getElementById('view');
  document.title = 'CamList';
  root.classList.remove('has-rail');
  document.body.classList.remove('print-mode');
  const sheet = document.getElementById('sheet');
  if (sheet.open) { sheet.close(); sheet.innerHTML = ''; }
  const { screen, params } = route();
  document.body.classList.toggle('home', screen === Projects);
  if (params.id && !store.getProject(params.id)) { location.hash = '#/'; return; }
  window.scrollTo(0, 0);
  ctx.split = isSplitRoute(location.hash || '#/', window.innerWidth);
  document.body.classList.toggle('split', ctx.split);
  if (ctx.split) renderSplit(root, splitProjectId(location.hash));
  else screen.render(ctx, params, root);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && lastRoute !== location.hash.split('?')[0]) root.animate?.([{ filter: 'blur(5px)', opacity: 0.55 }, { filter: 'blur(0)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  lastRoute = location.hash.split('?')[0];
  if (catalogError && !document.getElementById('catalog-error')) {
    root.insertAdjacentHTML('afterbegin', `<div class="card" id="catalog-error" style="border-color:var(--accent);margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:12px"><b>${t('catalog_error')}</b><button class="btn sm" data-retry>${t('retry')}</button></div>`);
    root.querySelector('[data-retry]').onclick = boot;
  }
}

// Desktop: the list and the catalog side by side. The catalog renders first so the list owns the
// top bar. Each pane scrolls on its own.
// The catalog pane gets a ctx whose setTopbar does nothing, so its own redraws (every search
// keystroke) never take the top bar away from the list.
const catCtx = Object.create(ctx, { setTopbar: { value: () => {} } });
function renderSplit(root, id) {
  root.innerHTML = '<div class="split-panes"><section class="pane pane-list" data-pane="list"></section><section class="pane pane-cat" data-pane="cat"></section></div>';
  Catalog.render(catCtx, { id }, root.querySelector('[data-pane="cat"]'));
  List.render(ctx, { id }, root.querySelector('[data-pane="list"]'));
}

// A change made in one pane shows up in the other.
let splitQueued = false;
function refreshSplit() {
  if (!ctx.split || splitQueued) return;
  splitQueued = true;
  queueMicrotask(() => {
    splitQueued = false;
    const id = splitProjectId(location.hash);
    const list = document.querySelector('[data-pane="list"]');
    const cat = document.querySelector('[data-pane="cat"]');
    if (!ctx.split || !id || !list || !cat || !store.getProject(id)) return;
    const go = panesToRefresh({ inList: list.contains(document.activeElement), inCat: cat.contains(document.activeElement) });
    if (go.cat) { const top = cat.scrollTop; Catalog.render(catCtx, { id }, cat); cat.scrollTop = top; }
    if (go.list) { const top = list.scrollTop; List.render(ctx, { id }, list); list.scrollTop = top; }
  });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (isSplitRoute(location.hash || '#/', window.innerWidth) !== !!ctx.split) render(); }, 150);
});

const BUILD_DATE = '28.09.2026';

function renderSettings(ctx, _p, root) {
  ctx.setTopbar({ title: t('settings'), back: '#/' });
  const s = store.state.settings;
  const locale = getLang() === 'he' ? 'he-IL' : 'en-GB';
  root.innerHTML = `
    <div class="card form">
      ${Projects.roleSwitch(t, s.role, 'defaultRole')}
      <label>${t('default_tech_manager')}<input name="techManager" value="${esc(s.techManager)}" autocomplete="off"></label>
    </div>
    <div class="section-title">${t('appearance')}</div>
    <div class="card"><button class="kv linkrow" data-open-skins><span>${t('design')}</span><b>${esc(getLang() === 'he' ? skin(ctx.skin()).he : skin(ctx.skin()).en)} \u203A</b></button>
      <label class="kv cbar-toggle set-toggle"><span>${t('sounds')}<small>${t('sounds_hint')}</small></span><input type="checkbox" data-sounds ${s.sounds ? 'checked' : ''}></label>
      <div class="kv set-toggle"><span>${t('vib_test')}<small>${t('vib_test_hint')}</small></span><button class="btn sm" data-vibtest>${t('vib_test_btn')}</button></div></div>
    <div class="section-title">${t('backup')}</div>
    <div class="card" style="display:grid;gap:10px">
      <button class="btn" data-export>${t('export_backup')}</button>
      <button class="btn" data-import>${t('import_backup')}</button>
      <input type="file" accept="application/json,.json" hidden data-file>
    </div>
    <div class="section-title">${t('versions_past')}</div>
    <div class="card"><a class="kv linkrow" href="v/" target="_blank" rel="noopener"><span>${t('versions_past_hint')}</span><b>›</b></a></div>
    <div class="section-title">${t('about')}</div>
    <div class="card">
      <div class="kv"><span>${t('catalog_date')}</span><b>${catalog.generatedAt ? new Date(catalog.generatedAt).toLocaleDateString(locale) : '—'}</b></div>
      <div class="kv"><span>${t('products')}</span><b>${catalog.products.length}</b></div>
      <div class="kv"><span>${t('brands')}</span><b>${catalog.brands.length}</b></div>
      <div class="kv"><span>${t('logos_hint')}</span></div>
      <div class="kv"><span>utopiacam.com</span><b>${esc(BUILD_DATE)}</b></div>
    </div>`;
  root.querySelector('[name=techManager]').onchange = (e) => store.setSettings({ techManager: e.target.value.trim() });
  root.querySelector('[name=defaultRole]').addEventListener('change', (e) => store.setSettings({ role: e.target.value }));
  root.querySelector('[data-open-skins]').onclick = () => ctx.navigate('#/skins');
  // What this phone allows: the browser may have no Vibration API (iPhone) or refuse the call.
  root.querySelector('[data-vibtest]').onclick = () => {
    const api = typeof navigator.vibrate === 'function';
    let ok = false;
    try { ok = api && navigator.vibrate([200, 100, 200]); } catch { ok = false; }
    if (!api) feel.end();
    toast(t(!api ? 'vib_none' : ok ? 'vib_sent' : 'vib_refused'), { kind: ok ? 'ok' : 'err', ms: 7000 });
  };
  root.querySelector('[data-sounds]').onchange = (e) => { store.setSettings({ sounds: e.target.checked }); setSound(e.target.checked); if (e.target.checked) feel.detent(); };
  root.querySelector('[data-export]').onclick = () => download(`camlist-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(store.exportBackup(), null, 1)], { type: 'application/json' }));
  const file = root.querySelector('[data-file]');
  root.querySelector('[data-import]').onclick = () => file.click();
  file.onchange = async () => {
    try { const r = store.importBackup(JSON.parse(await file.files[0].text())); catalog.setManual(store.state.manualProducts); toast(t('import_ok', r), { kind: 'ok' }); }
    catch { toast(t('import_failed'), { kind: 'err' }); }
    file.value = '';
  };
}

async function boot() {
  fetch('logos/index.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(idx => { if (idx) { setLogoIndex(idx); render(); } }).catch(() => {});
  try {
    const [data, cdata, xdata, rdata, pdata, kdata, ldata, gdata] = await Promise.all([
      loadCatalog(),
      loadCompat().catch(() => compatData),
      fetch('data/extra.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('data/releases.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      loadPower().catch(() => powerData),
      loadCodecs().catch(() => null),
      fetch('data/luts.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('data/places.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    recency = createRecency(rdata || {});
    extraData = xdata;
    catalog = createCatalog(data, store.state.manualProducts, extraData);
    compatData = cdata;
    compat = createCompat(compatData, catalog);
    powerData = pdata || powerData;
    power = createPower(powerData, catalog, compat);
    if (kdata) Tools.setCodecs(kdata);
    if (ldata) Tools.setLuts(ldata);
    if (gdata) Tools.setPlaces(gdata);
    catalogError = null;
  } catch (e) { catalogError = e; }
  render();
}

let warned = false;
store.subscribe(() => {
  catalog.setManual(store.state.manualProducts);
  refreshSplit();
  if (!store.storageOk && !warned) { warned = true; toast(t('storage_warning'), { kind: 'err', ms: 4000 }); }
});
window.addEventListener('hashchange', render);
// The same list open in two windows (the installed app and a browser tab): take in what the other one saved.
window.addEventListener('storage', (e) => { if (e.key === 'camlist.v1' && e.newValue) { store.reloadFrom(e.newValue); render(); } });
if (store.recovered) setTimeout(() => toast(t('save_recovered'), { kind: 'err', ms: 8000 }), 600);
// An app, not a web page: a long press opens no browser menu ("copy", "search with Google", Google Lens
// on a product photo). Android Chrome ignores -webkit-touch-callout, so the menu is stopped here —
// except in fields and the export preview, where copying is the point.
// Cards that open something (departments, shelves, brands, accessory shelves) are <div>s: give them the
// button role and a tab stop after every render, and let Enter / Space press them.
const CLICKABLE = 'div[data-dept], div[data-sub], div[data-brand], div[data-af], div[data-tool], article[data-id]';
new MutationObserver(() => {
  for (const el of document.querySelectorAll(CLICKABLE)) if (!el.hasAttribute('role')) { el.setAttribute('role', 'button'); el.tabIndex = 0; }
}).observe(document.body, { childList: true, subtree: true });
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role="button"][tabindex="0"]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest?.('input, textarea, [contenteditable], .preview, .print')) e.preventDefault();
});
applyDir();
document.documentElement.dataset.theme = store.state.settings.theme || 'light';
setSound(store.state.settings.sounds);
document.documentElement.dataset.skin = isSkin(store.state.settings.skin) ? store.state.settings.skin : DEFAULT_SKIN;
loadSkinFonts(document.documentElement.dataset.skin);
render();
boot();

// On localhost the SW is skipped (unless ?sw=1) so edits show up on plain reload; production always registers it.
const devNoSW = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
if ('serviceWorker' in navigator && !devNoSW) {
  // A new worker that skipped waiting takes control straight away: reload once so the running
  // page is not left on the previous version. The guard keeps it from looping.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !sessionStorage.getItem('camlist.updating')) return;
    reloading = true;
    sessionStorage.removeItem('camlist.updating');
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          sessionStorage.setItem('camlist.updating', '1');
          const n = el(`<div class="toast" style="pointer-events:auto;cursor:pointer">${esc(t('new_version'))} · ${esc(t('refresh'))}</div>`);
          n.onclick = () => location.reload();
          document.getElementById('toasts').appendChild(n);
        }
      });
    });
  }).catch(() => {});
}
