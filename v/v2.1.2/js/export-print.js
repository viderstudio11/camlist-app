import { esc } from './ui/dom.js';
import { displayName, formatDateRange, fmtDate, todayStr } from './export-text.js';

// The printed list reads like a list: a thin clapper stripe on top, the production name, one line of
// details, then each department with the quantity first. No rules between rows and no brand column —
// the brand is already in the item's name. Bold is kept for two things only: departments and quantities.
export function renderPrint(ctx, project, groups, root, { includeNotes = true, includeImages = false, lang = ctx.lang() } = {}) {
  // The sheet follows the export's document language, not the screen's.
  const t = (k, prm) => ctx.t(k, prm, lang);
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  document.body.classList.add('print-mode');
  ctx.setTopbar({ title: esc(ctx.t('pdf')), back: `#/p/${project.id}/export` });
  // "Save as PDF" names the file after the page title.
  document.title = `${project.name || t('untitled')} – ${t('gear_list')}`;
  const total = groups.reduce((n, g) => n + g.entries.reduce((m, e) => m + e.item.qty, 0), 0);

  const sections = groups.map(g => {
    const qty = g.entries.reduce((m, e) => m + e.item.qty, 0);
    return `<section class="pdept">
      <h2><span>${esc(t(`dept_${g.key}`))}</span><span class="n">${qty}</span></h2>
      ${g.entries.map(({ item, product }) => `<div class="pline">
        <span class="q">${item.qty}×</span>
        ${includeImages ? `<span class="im">${product.image ? `<img src="${esc(product.image)}" alt="" onerror="this.remove()">` : ''}</span>` : ''}
        <span class="nm" dir="auto">${esc(displayName(product))}${includeNotes && item.note ? `<small dir="auto">${esc(item.note)}</small>` : ''}</span>
      </div>`).join('')}
    </section>`;
  }).join('');

  const dates = formatDateRange(project.dateFrom, project.dateTo);
  // Each detail is isolated, so a Hebrew name next to an English label (or a date range) never reorders.
  const meta = [project.productionCo && `<bdi>${esc(project.productionCo)}</bdi>`, project.techManager && `${esc(t('tech_manager'))}: <bdi>${esc(project.techManager)}</bdi>`, dates && `<bdi dir="ltr">${esc(dates)}</bdi>`].filter(Boolean);
  const contact = [project.phone, project.email].filter(Boolean).join(' · ');
  root.innerHTML = `<div class="print" dir="${dir}" lang="${lang}">
    <div class="screen-only card"><b>${ctx.t('pdf_hint')}</b><button class="btn sm primary" data-print>${ctx.t('pdf')}</button></div>
    <div class="pstripe"><span class="mark">CAM<b>LIST</b></span></div>
    <header class="phead-print">
      <h1 dir="auto">${esc(project.name || t('untitled'))}</h1>
      ${meta.length ? `<p>${meta.join('  ·  ')}</p>` : ''}
      ${contact ? `<p class="dim"><bdi dir="ltr">${esc(contact)}</bdi></p>` : ''}
      ${project.notes ? `<p class="dim" dir="auto">${esc(project.notes)}</p>` : ''}
    </header>
    ${sections}
    <footer class="pfoot">${esc(t('items_count', { n: total }))} · <bdi dir="ltr">${esc(fmtDate(todayStr()))}</bdi></footer>
  </div>`;

  const go = () => window.print();
  root.querySelector('[data-print]').onclick = go;
  const imgs = [...root.querySelectorAll('img')];
  Promise.race([
    Promise.all(imgs.map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })))),
    new Promise(r => setTimeout(r, 1500)),
  ]).then(() => setTimeout(go, 100));
}
