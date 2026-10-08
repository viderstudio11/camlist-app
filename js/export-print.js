import { esc } from './ui/dom.js';
import { displayName, formatDateRange, fmtDate, todayStr, roleKey } from './export-text.js';

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

  const sections = groups.map(g => {
    return `<section class="pdept">
      <h2><span>${esc(t(`dept_${g.key}`))}</span></h2>
      ${g.entries.map(({ item, product, accessory }) => `<div class="pline ${accessory ? 'acc' : ''}">
        <span class="q">${item.qty}×</span>
        ${includeImages ? `<span class="im">${product.image ? `<img src="${esc(product.image)}" alt="" onerror="this.remove()">` : ''}</span>` : ''}
        <span class="nm"><bdi>${esc(displayName(product))}</bdi>${includeNotes && item.note ? `<small><bdi>${esc(item.note)}</bdi></small>` : ''}</span>
      </div>`).join('')}
    </section>`;
  }).join('');

  const dates = formatDateRange(project.dateFrom, project.dateTo);
  // Each detail is isolated, so a Hebrew name next to an English label (or a date range) never reorders.
  const meta = [project.productionCo && `<bdi>${esc(project.productionCo)}</bdi>`, project.techManager && `${esc(t(roleKey(project.role)))}: <bdi>${esc(project.techManager)}</bdi>`, dates && `<bdi dir="ltr">${esc(dates)}</bdi>`].filter(Boolean);
  const contact = [project.phone, project.email].filter(Boolean).join(' · ');
  // The slate's boxes, as on a clapperboard: production company, shoot days, 1st AC, contact.
  const slateCells = [
    [t('production_co'), project.productionCo && `<bdi>${esc(project.productionCo)}</bdi>`],
    [t('dates'), dates && `<bdi dir="ltr">${esc(dates)}</bdi>`],
    [t(roleKey(project.role)), project.techManager && `<bdi>${esc(project.techManager)}</bdi>`],
    [t('contact'), contact && `<bdi dir="ltr">${esc(contact)}</bdi>`],
  ].filter(([, v]) => v);
  root.innerHTML = `<div class="print" dir="${dir}" lang="${lang}">
    <div class="screen-only card"><b>${ctx.t('pdf_hint')}</b><button class="btn sm primary" data-print>${ctx.t('pdf')}</button></div>
    <header class="pslate">
      <div class="pslate-sticks"><span class="mark" role="img" aria-label="VidTooList">VIDT<b><svg class="inf" viewBox="7.5 3.5 25 13" aria-hidden="true"><path d="M20 10C17 4 9 4 9 10s8 6 11 0 11-6 11 0-8 6-11 0"/></svg></b>LIST</span></div>
      <div class="pslate-board">
        <div class="pslate-cell wide"><small>${esc(t('project_name'))}</small><h1><bdi>${esc(project.name || t('untitled'))}</bdi></h1></div>
        ${slateCells.map(([k, v]) => `<div class="pslate-cell"><small>${esc(k)}</small><b>${v}</b></div>`).join('')}
      </div>
      ${project.notes ? `<p class="pslate-notes"><bdi>${esc(project.notes)}</bdi></p>` : ''}
    </header>
    ${sections}
    <footer class="pfoot">VidTooList · <bdi dir="ltr">${esc(fmtDate(todayStr()))}</bdi></footer>
  </div>`;

  const go = () => window.print();
  root.querySelector('[data-print]').onclick = go;
  const imgs = [...root.querySelectorAll('img')];
  Promise.race([
    Promise.all(imgs.map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })))),
    new Promise(r => setTimeout(r, 1500)),
  ]).then(() => setTimeout(go, 100));
}
