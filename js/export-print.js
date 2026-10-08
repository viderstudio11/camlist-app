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
      <div class="pslate-sticks"><span class="mark" role="img" aria-label="VidTooList">VIDT<b><svg class="inf" viewBox="0 0.4 24 11.2" aria-hidden="true"><path d="M23.00 6.00 L22.88 7.18 L22.52 8.28 L21.96 9.22 L21.25 9.96 L20.46 10.47 L19.62 10.76 L18.78 10.86 L17.96 10.79 L17.19 10.58 L16.46 10.27 L15.78 9.87 L15.14 9.40 L14.55 8.89 L14.00 8.35 L13.47 7.78 L12.97 7.19 L12.48 6.60 L12.00 6.00 L11.52 5.40 L11.03 4.81 L10.53 4.22 L10.00 3.65 L9.45 3.11 L8.86 2.60 L8.22 2.13 L7.54 1.73 L6.81 1.42 L6.04 1.21 L5.22 1.14 L4.38 1.24 L3.54 1.53 L2.75 2.04 L2.04 2.78 L1.48 3.72 L1.12 4.82 L1.00 6.00 L1.12 7.18 L1.48 8.28 L2.04 9.22 L2.75 9.96 L3.54 10.47 L4.38 10.76 L5.22 10.86 L6.04 10.79 L6.81 10.58 L7.54 10.27 L8.22 9.87 L8.86 9.40 L9.45 8.89 L10.00 8.35 L10.53 7.78 L11.03 7.19 L11.52 6.60 L12.00 6.00 L12.48 5.40 L12.97 4.81 L13.47 4.22 L14.00 3.65 L14.55 3.11 L15.14 2.60 L15.78 2.13 L16.46 1.73 L17.19 1.42 L17.96 1.21 L18.78 1.14 L19.62 1.24 L20.46 1.53 L21.25 2.04 L21.96 2.78 L22.52 3.72 L22.88 4.82 L23.00 6.00Z"/></svg></b>LIST</span></div>
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
