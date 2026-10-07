// Downloads: firmware, manuals, software, apps and LUTs, each from the maker's own page.
import { esc } from '../dom.js';
import { S, D, isNew, bindMore } from './shared.js';

// Official download pages in one place: camera firmware (from the camera data), the makers' LUTs (from the
// LUT bank), and firmware / software for monitors, wireless, gimbals, lens control, media and offload.
function downloadsTool(T, lang, ctx) {
  const s = S.downloads;
  const fromRoute = D.route.get('q');
  if (fromRoute != null) { Object.assign(s, { q: fromRoute, dept: 'cameras' }); D.route = new URLSearchParams(''); }
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const name = (o) => (lang === 'he' ? o.he : o.en);
  const short = (n) => String(n || '').replace(/\s+(\d+K\s+)?(Digital Motion Picture|Digital Cinema|Mirrorless|Cinema|Full[- ]Frame)?\s*Camera\b.*$/i, '').trim() || n;
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // cameras: firmware from the camera data, the log's LUT page matched by model name
  const logs = D.lut.logs || [];
  const cams = (ctx?.compat?.profiles || []).map(p => ({ p, product: ctx.catalog.byId(p.id) })).filter(x => x.product)
    .sort((a, b) => (b.p.year || 0) - (a.p.year || 0) || a.product.name.localeCompare(b.product.name))
    .map(({ p, product }) => {
      const nm = short(product.name);
      const lut = logs.find(g => g.cameras.some(c => { const a = norm(c.name), b = norm(nm); return a && b && (a === b || a.includes(b) || b.includes(a)); }));
      return { name: nm, brand: product.brandName || '', firmware: p.firmware || '', lut: lut ? (lut.cameras.find(c => norm(c.name) === norm(nm))?.url || lut.url) : '', log: lut?.name || '' };
    })
    .filter(c => c.firmware || c.lut);
  const items = D.dl.items || [];
  const term = (s.q || '').trim().toLowerCase();
  const hit = (txt) => !term || String(txt).toLowerCase().includes(term);
  const TYPE = { firmware: T('dl_firmware'), software: T('dl_software'), app: T('dl_app'), lut: 'LUT' };
  const link = (url, label) => `<a class="dl-link ${isNew(url) ? 'is-new' : ''}" href="${esc(url)}" target="_blank" rel="noopener">${isNew(url) ? `<i class="dl-new">${esc(T('dl_new'))}</i>` : ''}${esc(label)} ↗</a>`;
  const camRow = (c) => `<div class="dl-row"><div class="dl-main"><b dir="auto">${esc(c.name)}</b><small>${esc([c.brand, c.log].filter(Boolean).join(' · '))}</small></div><div class="dl-links">${c.firmware ? link(c.firmware, c.firmware.includes('/download/ff/dl/') ? T('dl_firmware') : T('dl_fw_manual')) : ''}${c.lut ? link(c.lut, 'LUT') : ''}</div></div>`;
  const itemRow = (it) => `<div class="dl-row"><div class="dl-main"><b dir="auto">${esc(it.name)}</b><small><i class="dl-type">${esc(TYPE[it.type] || it.type)}</i>${it.note ? ' ' + esc(name(it.note)) : ''}</small></div><div class="dl-links">${link(it.url, T('dl_open'))}</div></div>`;
  const lutRow = (g) => `<div class="dl-row"><div class="dl-main"><b dir="auto">${esc(g.brand)} — ${esc(g.name)}</b><small>${esc(g.source || '')}</small></div><div class="dl-links">${link(g.url, 'LUT')}</div></div>`;
  const depts = D.dl.departments || [];
  const count = (d) => (d === 'cameras' ? cams.length : d === 'luts' ? logs.length : items.filter(i => i.dept === d).length);
  let list;
  if (term) {
    const cHits = cams.filter(c => hit(c.name + ' ' + c.brand));
    const iHits = items.filter(i => hit(i.name + ' ' + i.brand));
    const lHits = logs.filter(g => hit(g.brand + ' ' + g.name));
    list = (cHits.map(camRow).join('') + lHits.map(lutRow).join('') + iHits.map(itemRow).join('')) || `<p class="tnote">${esc(T('dl_none'))}</p>`;
  } else if (s.dept === 'cameras') list = cams.map(camRow).join('');
  else if (s.dept === 'luts') list = logs.map(lutRow).join('') + `<button class="btn sm dl-lutfinder" data-tool-go="luts">${esc(T('dl_lut_finder'))}</button>`;
  else list = items.filter(i => i.dept === s.dept).map(itemRow).join('');
  return `<div class="card sh-sec dl-card" data-part="dlhead">
      <input class="fov-q" type="search" data-dlq value="${esc(s.q || '')}" placeholder="${esc(T('dl_search_ph'))}" autocomplete="off" enterkeyhint="search" aria-label="${esc(T('dl_search_ph'))}">
      <div class="chips dl-depts">${depts.map(d => chip('data-dldept', d.id, `${esc(name(d))} <i class="n">${count(d.id)}</i>`, !term && s.dept === d.id)).join('')}</div>
    </div>
    <div class="card dl-list" data-part="dllist">${list}</div>
    <p class="tnote">${esc(T('dl_note'))}</p>`;
}

export { downloadsTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  root.querySelectorAll('[data-dldept]').forEach(b => { b.onclick = () => { Object.assign(S.downloads, { dept: b.dataset.dldept, q: '' }); ctx.render(); }; });
  const dlq = root.querySelector('[data-dlq]');
  if (dlq) dlq.oninput = () => {
    S.downloads.q = dlq.value;
    const tpl = document.createElement('template');
    tpl.innerHTML = downloadsTool(T, lang, ctx);
    for (const part of ['dllist']) { const fresh = tpl.content.querySelector(`[data-part="${part}"]`); root.querySelector(`[data-part="${part}"]`)?.replaceWith(fresh); }
    bindMore(root);
  root.querySelectorAll('[data-dldept]').forEach(b => b.classList.toggle('on', !S.downloads.q.trim() && b.dataset.dldept === S.downloads.dept));
  };
}
