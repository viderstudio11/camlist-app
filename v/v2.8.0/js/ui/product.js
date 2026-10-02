// The product card: tap a product's picture (in the catalog or the gear list) to see it larger, with
// the maker's official site and where to buy it. One delegated listener serves every list.
import { esc, openSheet } from './dom.js';
import { productLinks } from '../stores.js';

export function installProductCard(ctx) {
  document.addEventListener('click', (e) => {
    const thumb = e.target.closest?.('.row[data-pid] > .thumb');
    if (!thumb) return;
    const row = thumb.closest('.row[data-pid]');
    const p = ctx.resolve(isNaN(Number(row.dataset.pid)) ? row.dataset.pid : Number(row.dataset.pid));
    if (!p) return;
    e.preventDefault(); e.stopPropagation();
    open(ctx, p);
  }, true);
}

function open(ctx, p) {
  const t = ctx.t;
  const prof = ctx.compat?.isCamera?.(p) ? ctx.compat.profileFor(p) : null;
  // a camera with a checked official page goes straight there; anything else searches the maker's site
  const { maker, stores } = productLinks(p, { official: prof?.firmware || '' });
  const link = (href, label, cls = '') => `<a class="btn ${cls}" href="${esc(href)}" target="_blank" rel="noopener">${label} ↗</a>`;
  openSheet({
    title: '',
    bodyHTML: `<div class="pcard">
      ${p.image ? `<div class="pcard-img"><img src="${esc(p.image)}" alt="" onerror="this.parentNode.remove()"></div>` : ''}
      <div class="pcard-name"><small>${esc(p.brandName || '')}</small><b dir="auto">${esc(p.name)}</b></div>
      ${maker ? link(maker, esc(t('pc_maker')), 'primary pcard-maker') : ''}
      <div class="pcard-sub">${esc(t('pc_buy'))}</div>
      <div class="pcard-stores">${stores.map(s => link(s.url, esc(s.name))).join('')}</div>
      ${p.url ? `<a class="pcard-src" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t('pc_rental'))} ↗</a>` : ''}
      <p class="tnote">${esc(t('pc_note'))}</p>
    </div>`,
    actions: [{ label: t('close') || 'Close', kind: 'ghost' }],
  });
}
