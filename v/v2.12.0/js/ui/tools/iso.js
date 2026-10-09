// Base ISO: what each camera's sensor is built around (one, two or three bases), from the maker's own
// page — never guessed. A card per camera, an ISO scale to see how far a chosen ISO is from the nearest
// base, and a comparison for multi-camera shoots: where all the cameras sit at base together.
import { esc } from '../dom.js';
import { feel } from '../../feel.js';
import { D } from './shared.js';
import { camFull, camModel } from './fov.js';

const KEY = 'camlist.iso';
const S = (() => { const base = { brand: '', cam: '', iso: 800, cmp: [], cmpOpen: false }; try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; } })();
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private window */ } };
const fmt = (n) => Number(n).toLocaleString('en-US');
// the scale: ISO 100 to 25,600, one mark per stop
const MARKS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
const xOf = (iso, w) => 18 + (Math.log2(iso / 100) / 8) * (w - 36);
const MAKER_ORDER = ['arri', 'sony', 'canon', 'red', 'blackmagic-design', 'panasonic', 'dji'];

// the base ISO row of a camera, for this tool and for the lens tool's camera card
export const isoOf = (id) => D.iso?.cameras?.[String(id)] || null;
export const isoLine = (id) => { const r = isoOf(id); return r && !r.pending ? r.base.map(fmt).join(' / ') : ''; };

function isoTool(T, lang, ctx) {
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const cams = (ctx?.compat?.profiles || []).filter(p => p.sensor)
    .map(p => ({ id: String(p.id), year: p.year || 0, product: ctx.catalog.byId(p.id) })).filter(c => c.product)
    .sort((a, b) => b.year - a.year);
  const brands = [...new Map(cams.map(c => [c.product.brand, c.product.brandName || c.product.brand])).entries()]
    .sort((a, b) => { const r = (x) => { const i = MAKER_ORDER.indexOf(x); return i < 0 ? 99 : i; }; return r(a[0]) - r(b[0]); });
  if (!cams.some(c => c.id === S.cam)) S.cam = cams.find(c => c.id === '16514')?.id || cams[0]?.id || '';
  const cur = cams.find(c => c.id === S.cam);
  if (!brands.some(([b]) => b === S.brand)) S.brand = cur?.product.brand || brands[0]?.[0] || '';
  const note = (r) => (r?.note ? r.note[lang] || r.note.en : '');
  const labels = (n) => (n === 1 ? [T('iso_one')] : n === 2 ? [T('iso_low'), T('iso_high')] : [T('iso_low'), T('iso_high'), T('iso_third')]);

  const rows = cams.filter(c => c.product.brand === S.brand).map(c => {
    const r = isoOf(c.id);
    return `<button class="model-row ${c.id === S.cam ? 'on' : ''}" data-iso-cam="${c.id}"><b>${esc(camModel(c.product))}</b><small dir="ltr">${r && !r.pending ? esc(r.base.map(fmt).join(' / ')) : '—'}</small></button>`;
  }).join('');

  const r = cur ? isoOf(cur.id) : null;
  let cardBody;
  if (!cur) cardBody = '';
  else if (!r || r.pending) {
    cardBody = `<div class="iso-name">${esc(camFull(cur.product))}</div><p class="iso-pend">${esc(T('iso_pending'))}</p>${note(r) ? `<p class="tnote">${esc(note(r))}</p>` : ''}`;
  } else {
    const W = 330;
    const near = r.base.reduce((b, x) => (Math.abs(Math.log2(S.iso / x)) < Math.abs(Math.log2(S.iso / b)) ? x : b));
    const d = Math.log2(S.iso / near);
    const verdict = Math.abs(d) < 0.05 ? Tp('iso_at', { b: fmt(near) }) : Tp('iso_off', { d: `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`, b: fmt(near) });
    cardBody = `<div class="iso-name">${esc(camFull(cur.product))}</div>
      <div class="iso-big" dir="ltr">${r.base.map((b, i) => `${i ? '<i>·</i>' : ''}<b>${fmt(b)}</b>`).join('')}</div>
      <div class="iso-lbls" dir="ltr">${labels(r.base.length).map(l => `<span>${esc(l)}</span>`).join('')}</div>
      <div class="iso-meta">${r.log ? `<span>${esc(r.log)}</span>` : ''}${r.range ? `<span dir="ltr">${esc(r.range)}</span>` : ''}</div>
      ${note(r) ? `<p class="tnote" style="text-align:center">${esc(note(r))}</p>` : ''}
      <div class="tsub" style="margin-top:12px">${esc(T('iso_yours'))}</div>
      <svg viewBox="0 0 ${W} 74" class="iso-scale" direction="ltr" aria-hidden="true">
        <line x1="18" x2="${W - 18}" y1="34" y2="34" class="iso-axis"/>
        ${MARKS.map(m => `<line x1="${xOf(m, W)}" x2="${xOf(m, W)}" y1="28" y2="40" class="iso-tick"/><text x="${xOf(m, W)}" y="58" class="iso-num" text-anchor="middle">${m >= 1000 ? `${m / 1000}k` : m}</text>`).join('')}
        ${r.base.map(b => `<rect x="${xOf(b, W) - 6}" y="23" width="12" height="22" rx="3" class="iso-base"/><text x="${xOf(b, W)}" y="15" class="iso-basetxt" text-anchor="middle">${fmt(b)}</text>`).join('')}
        <path d="M${xOf(S.iso, W)} 45 l-7 12 h14 z" class="iso-you"/>
      </svg>
      <input type="range" class="iso-range" min="0" max="800" step="10" value="${Math.round(Math.log2(S.iso / 100) * 100)}" data-iso-range aria-label="${esc(T('iso_yours'))}" dir="ltr">
      <div class="iso-verdict" data-iso-verdict><b dir="ltr">ISO ${fmt(S.iso)}</b> · ${esc(verdict)}</div>
      <p class="tnote iso-src">${esc(T('iso_src'))}: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.src)}</a></p>`;
  }

  // comparison: the cameras on the shoot, and the ISO where they all sit at (or nearest) base
  const cmpIds = [...new Set([S.cam, ...S.cmp])].filter(id => cams.some(c => c.id === id));
  const cmpCams = cmpIds.map(id => cams.find(c => c.id === id));
  const known = cmpCams.map(c => isoOf(c.id)).filter(x => x && !x.pending);
  const shared = known.length > 1 ? known[0].base.filter(b => known.every(k => k.base.includes(b))) : [];
  const CANDS = [400, 500, 640, 800, 850, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 12800];
  const best = known.length > 1 && !shared.length ? CANDS.map(i => [i, known.reduce((s, k) => s + Math.min(...k.base.map(b => Math.abs(Math.log2(i / b)))), 0)]).sort((a, b) => a[1] - b[1])[0][0] : null;
  const cmp = S.cmpOpen ? `<div class="card sh-sec iso-cmp">
      <div class="tsub">${esc(T('iso_cmp'))}</div>
      ${cmpCams.map(c => { const k = isoOf(c.id); return `<div class="iso-cmprow"><b>${esc(camFull(c.product))}</b><span class="iso-chips" dir="ltr">${k && !k.pending ? k.base.map(b => `<i>${fmt(b)}</i>`).join('') : '<i class="pend">?</i>'}</span>${c.id !== S.cam ? `<button class="iso-x" data-iso-rm="${c.id}" aria-label="✕">✕</button>` : ''}</div>`; }).join('')}
      ${shared.length ? `<p class="iso-meet">${esc(Tp('iso_meet', { b: shared.map(fmt).join(' / ') }))}</p>` : best ? `<p class="iso-meet">${esc(Tp('iso_near', { b: fmt(best) }))}</p>` : ''}
      <select class="iso-add" data-iso-add aria-label="${esc(T('iso_add'))}"><option value="">${esc(T('iso_add'))}</option>${brands.map(([b, n]) => `<optgroup label="${esc(n)}">${cams.filter(c => c.product.brand === b && !cmpIds.includes(c.id)).map(c => `<option value="${c.id}">${esc(camFull(c.product))}</option>`).join('')}</optgroup>`).join('')}</select>
    </div>` : '';

  return `<div class="card sh-sec">
      <div class="fov-makers" role="tablist">${brands.map(([b, n]) => `<button class="fov-maker ${b === S.brand ? 'on' : ''}" role="tab" aria-selected="${b === S.brand}" data-iso-brand="${b}">${esc(n)}</button>`).join('')}</div>
      <div class="model-list fov-modellist">${rows}</div>
    </div>
    <div class="card iso-card">${cardBody}
      <button class="btn sm iso-cmpbtn" data-iso-cmp>${esc(T(S.cmpOpen ? 'iso_cmp_close' : 'iso_cmp_open'))}</button>
    </div>
    ${cmp}
    <p class="tnote">${esc(T('iso_note'))}</p>`;
}

export { isoTool as view };

export function bind(root, ctx, { T, lang }) {
  const redraw = () => { keep(); ctx.render(); };
  root.querySelectorAll('[data-iso-brand]').forEach(b => { b.onclick = () => { S.brand = b.dataset.isoBrand; feel.detent(); redraw(); }; });
  root.querySelectorAll('[data-iso-cam]').forEach(b => { b.onclick = () => { S.cam = b.dataset.isoCam; feel.detent(); redraw(); }; });
  // dragging the scale repaints the arrow and the verdict only, so the drag is never cut off
  const range = root.querySelector('[data-iso-range]');
  if (range) range.oninput = () => {
    S.iso = Math.round((100 * 2 ** (Number(range.value) / 100)) / 10) * 10;
    const tpl = document.createElement('template'); tpl.innerHTML = isoTool(T, lang, ctx);
    const fresh = tpl.content; const svg = fresh.querySelector('.iso-scale'), v = fresh.querySelector('[data-iso-verdict]');
    if (svg) root.querySelector('.iso-scale')?.replaceWith(svg);
    if (v) root.querySelector('[data-iso-verdict]')?.replaceWith(v);
  };
  if (range) range.onchange = () => { keep(); feel.detent(); };
  root.querySelector('[data-iso-cmp]')?.addEventListener('click', () => { S.cmpOpen = !S.cmpOpen; redraw(); });
  root.querySelector('[data-iso-add]')?.addEventListener('change', (e) => { if (e.target.value) { S.cmp = [...new Set([...S.cmp, e.target.value])]; feel.add(); redraw(); } });
  root.querySelectorAll('[data-iso-rm]').forEach(b => { b.onclick = () => { S.cmp = S.cmp.filter(x => x !== b.dataset.isoRm); redraw(); }; });
}
