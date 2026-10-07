// One CamList tool as its own installable app (apps/<tool>/). It runs the very same tool code as the
// full app (js/ui/tools/), with a small shell around it: the data that tool reads, the language and the
// light/dark switch — no projects, lists or other tools. The page names its tool: <html data-tool="sun">.
import * as Tools from '../js/ui/tools.js';
import { createCatalog, loadCatalog } from '../js/catalog.js';
import { createCompat, loadCompat } from '../js/compat.js';
import { t, getLang, setLang } from '../js/i18n.js';
import { icons, esc } from '../js/ui/dom.js';

const TOOL = document.documentElement.dataset.tool;
const KEY = `camlist.app.${TOOL}`;
const prefs = (() => { try { return { lang: 'he', theme: 'dark', ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { lang: 'he', theme: 'dark' }; } })();
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private window */ } };
setLang(prefs.lang);

const root = document.getElementById('view');
let catalog = createCatalog({ departments: [], brands: [], products: [] }, []);
let compat = createCompat({ cameras: [] }, catalog);

const applyLook = () => {
  const html = document.documentElement;
  html.lang = getLang(); html.dir = getLang() === 'he' ? 'rtl' : 'ltr';
  html.dataset.theme = prefs.theme; html.dataset.skin = 'clean';
};

const ctx = {
  t,
  get catalog() { return catalog; },
  get compat() { return compat; },
  lang: getLang,
  store: { state: { projects: [], settings: {} } },
  // another tool (the media tool's "to offload", a link to Downloads) opens in the full app
  navigate(hash) {
    const other = /^#\/tools\/(\w+)/.exec(hash || '');
    if (other && other[1] !== TOOL) { location.href = new URL(`../index.html${hash}`, import.meta.url).href; return; }
    render();
  },
  render: () => render(),
  setTopbar({ title = '' }) {
    const bar = document.getElementById('topbar');
    bar.innerHTML = `<div class="title" dir="auto">${title}<small>CamList</small></div><button class="iconbtn" data-theme-btn aria-label="${esc(t('theme'))}">${prefs.theme === 'dark' ? icons.moon : icons.sun}</button><button class="langpill" data-lang aria-label="${esc(t('language'))}">${t('lang_switch')}</button>`;
    bar.querySelector('[data-lang]').onclick = () => { prefs.lang = getLang() === 'he' ? 'en' : 'he'; setLang(prefs.lang); keep(); applyLook(); render(); };
    bar.querySelector('[data-theme-btn]').onclick = () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; keep(); applyLook(); render(); };
  },
};

function render() { Tools.render(ctx, { tool: TOOL }, root); }

// What each tool reads besides its own form. The camera data (catalog + compat) is the heaviest, so
// only the tools that list cameras load it.
const json = (file) => fetch(new URL(`../data/${file}`, import.meta.url), { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
const NEEDS = {
  media: () => json('codecs.json').then(d => { if (d) Tools.setCodecs(d); }),
  sun: () => json('places.json').then(d => { if (d) Tools.setPlaces(d); }),
  downloads: () => Promise.all([json('downloads.json'), json('downloads-watch.json'), json('luts.json'), cameras()])
    .then(([d, w, l]) => { if (d) Tools.setDownloads(d); if (w) Tools.setWatch(w); if (l) Tools.setLuts(l); }),
};
function cameras() {
  return Promise.all([loadCatalog(new URL('../data/catalog.json', import.meta.url).href), loadCompat(new URL('../data/compat.json', import.meta.url).href), json('extra.json')])
    .then(([data, compatData, extra]) => { catalog = createCatalog(data, [], extra); compat = createCompat(compatData, catalog); });
}

applyLook();
render();
(NEEDS[TOOL] || (() => Promise.resolve()))().then(render).catch(() => { root.innerHTML = `<div class="card"><p>${esc(t('load_failed') || 'Could not load the data. Check the connection and reopen.')}</p></div>`; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
