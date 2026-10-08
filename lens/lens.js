// Vid2List Lens: the lens-choice tool on its own. It runs the very same tool as the full app
// (js/ui/tools.js → the lens tool), with a small shell around it: the catalog and camera data, the
// language and the light/dark switch — no projects, lists or other tools.
import * as Tools from '../js/ui/tools.js';
import { createCatalog, loadCatalog } from '../js/catalog.js';
import { createCompat, loadCompat } from '../js/compat.js';
import { t, getLang, setLang } from '../js/i18n.js';
import { icons, esc, openSheet } from '../js/ui/dom.js';
import { canInstall, install } from '../js/install.js';

const KEY = 'camlist.lens';
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
  navigate() { render(); },
  render: () => render(),
  // The shell's bar: the name, light/dark and the language — there is nowhere to go back to.
  setTopbar({ title = '' }) {
    const bar = document.getElementById('topbar');
    bar.innerHTML = `<div class="title" dir="auto">${title}<small>Vid2List Lens</small></div>${canInstall() ? `<button class="langpill install-btn" data-install aria-label="${esc(getLang() === 'he' ? 'התקן במסך הבית' : 'Install on the home screen')}">${getLang() === 'he' ? 'התקן' : 'Install'}</button>` : ''}<button class="iconbtn" data-theme-btn aria-label="${esc(t('theme'))}">${prefs.theme === 'dark' ? icons.moon : icons.sun}</button><button class="langpill" data-lang aria-label="${esc(t('language'))}">${t('lang_switch')}</button>`;
    bar.querySelector('[data-lang]').onclick = () => { prefs.lang = getLang() === 'he' ? 'en' : 'he'; setLang(prefs.lang); keep(); applyLook(); render(); };
    bar.querySelector('[data-install]')?.addEventListener('click', () => install(getLang(), (title, text) => openSheet({ title, bodyHTML: `<p style="font-size:16px;line-height:1.6">${esc(text)}</p>`, actions: [{ label: getLang() === 'he' ? 'הבנתי' : 'Got it', kind: 'primary' }] })));
    bar.querySelector('[data-theme-btn]').onclick = () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; keep(); applyLook(); render(); };
  },
};

addEventListener('camlist-installable', () => render());
function render() { Tools.render(ctx, { tool: 'fov' }, root); }

applyLook();
render();
Promise.all([
  loadCatalog('../data/catalog.json'),
  loadCompat('../data/compat.json'),
  fetch('../data/extra.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
  fetch('../data/iso.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
]).then(([data, compatData, extra, isoData]) => {
  if (isoData) Tools.setIso(isoData);
  catalog = createCatalog(data, [], extra);
  compat = createCompat(compatData, catalog);
  render();
}).catch(() => { root.innerHTML = `<div class="card"><p>${esc(t('load_failed') || 'Could not load the camera data. Check the connection and reopen.')}</p></div>`; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
